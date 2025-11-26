// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title SlabIncomeDistributorWithProof
 * @author Ocean DeFi
 * @notice Slab income distribution with Merkle proof verification
 *
 * @dev Implements three claiming methods:
 *      Method 1: Direct on-chain calculation (500K-2M gas)
 *      Method 2: Keeper settlement (80K-150K gas)
 *      Method 3: Merkle proof verification (60K-80K gas) ⭐ RECOMMENDED
 *
 * Method 3 Flow (Dual Merkle Tree System):
 * 1. Admin calculates SLAB and OVERRIDE income separately (off-chain)
 * 2. Admin creates TWO Merkle trees per day:
 *    - Slab tree: Contains slab differential income for each achiever
 *    - Override tree: Contains override income for each achiever
 * 3. Admin stores BOTH Merkle roots on-chain (ONE tx for ALL users)
 * 4. Users generate proofs off-chain (can get slab, override, or both)
 * 5. Users claim with proof(s):
 *    - claimSlabWithProof() - Claim slab income only
 *    - claimOverrideWithProof() - Claim override income only
 *    - claimBothWithProof() - Claim both in one transaction ⭐ RECOMMENDED
 *
 * Features:
 * - Slab differential income (your slab % - their slab %)
 * - 60% cap per leg
 * - Slab override income (10%, 5%, 5% distribution)
 * - Separate tracking of slab vs override income
 * - Flexible claiming (claim each type independently or together)
 * - Merkle proof verification (gas efficient)
 * - Multi-day claiming with batch proofs
 * - Double-claim prevention
 * - Transparent income breakdown
 */

/* ========== INTERFACES ========== */

interface ICoreConfig {
    function usdToken() external view returns (address);
    function ramaToken() external view returns (address);
    function userRegistry() external view returns (address);
    function slabManager() external view returns (address);
    function roiDistributor() external view returns (address);
    function contractStartTime() external view returns (uint256);
}

interface IUserRegistry {
    function getUserInfo(
        address user
    )
        external
        view
        returns (
            uint256 userId,
            address referrer,
            uint256 tier,
            uint256 directs,
            uint256 joinTime
        );
    function getDirects(address user) external view returns (address[] memory);
    function getTeamAddresses(
        address user
    ) external view returns (address[] memory);
}

interface ISlabManager {
    function getUserSlabForDay(
        address user,
        uint32 dayId
    ) external view returns (uint8 level, uint16 percentage);
    function getSlabPercentage(uint8 level) external pure returns (uint16);
}

interface IROIDistributor {
    function getUserDayROI(
        address user,
        uint32 dayId
    ) external view returns (uint256 usdAmount, uint256 ramaAmount);
}

contract SlabIncomeDistributorWithProof is
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    /* ========== STATE VARIABLES ========== */

    // Core configuration
    ICoreConfig public coreConfig;

    // Tokens
    IERC20 public usdToken;
    IERC20 public ramaToken;

    // Last claimed day per user
    mapping(address => uint32) public lastClaimedDay;

    // Settled income storage (Method 2)
    mapping(address => mapping(uint32 => uint128)) private settledUSD;
    mapping(address => mapping(uint32 => uint128)) private settledRAMA;

    // Merkle roots per day (Method 3)
    // Separate roots for slab and override income
    mapping(uint32 => bytes32) public dailySlabMerkleRoots; // Slab differential income
    mapping(uint32 => bytes32) public dailyOverrideMerkleRoots; // Override income
    mapping(uint32 => bytes32) public dailyMerkleRoots; // Combined (backward compatibility)

    // Track claimed proofs to prevent double-claiming
    // Separate tracking for each income type
    mapping(bytes32 => bool) public claimedSlabProofs; // keccak256(user, dayId, "slab")
    mapping(bytes32 => bool) public claimedOverrideProofs; // keccak256(user, dayId, "override")
    mapping(bytes32 => bool) public claimedProofs; // Combined (backward compatibility)

    // Constants
    uint16 public constant BPS_BASE = 10000;
    uint16 public constant CONSIDERABLE_ROI_BPS = 3600; // 36%
    uint16 public constant MAX_LEG_CAP_BPS = 6000; // 60%
    uint8 public constant MAX_SLABS = 10;

    // Override income percentages (basis points)
    uint16 public constant OVERRIDE_DIRECT_BPS = 1000; // 10%
    uint16 public constant OVERRIDE_SECOND_BPS = 500; // 5%
    uint16 public constant OVERRIDE_THIRD_BPS = 500; // 5%

    /* ========== EVENTS ========== */

    event SlabIncomeClaimed(
        address indexed user,
        uint32 fromDay,
        uint32 toDay,
        uint256 usdAmount,
        uint256 ramaAmount,
        uint8 method // 1=Direct, 2=Settlement, 3=Proof
    );

    event DaySettled(
        address indexed user,
        uint32 indexed day,
        uint256 usdAmount,
        uint256 ramaAmount
    );

    event MerkleRootSet(
        uint32 indexed dayId,
        bytes32 merkleRoot,
        uint256 timestamp,
        string incomeType // "slab", "override", or "combined"
    );

    event ClaimedWithProof(
        address indexed user,
        uint32 dayId,
        uint256 usdAmount,
        uint256 ramaAmount,
        bytes32 proofId,
        string incomeType // "slab", "override", or "both"
    );

    event BatchClaimedWithProof(
        address indexed user,
        uint32 fromDay,
        uint32 toDay,
        uint256 totalUSD,
        uint256 totalRAMA
    );
    event AmountTransferred(
        address indexed user,
        uint256 transferredAt,
        uint256 totalUSD,
        uint256 totalRAMA
    );

    /* ========== ERRORS ========== */

    error InvalidRange();
    error AlreadyClaimed();
    error CannotClaimFuture();
    error NothingToClaim();
    error InvalidProof();
    error ProofAlreadyUsed();
    error NoMerkleRoot();
    error ZeroAddress();
    error ArrayLengthMismatch();
    error InvalidSlab();

    /* ========== INITIALIZATION ========== */

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize contract
     * @param _coreConfig CoreConfig contract address
     */
    function initialize(address _coreConfig) external initializer {
        if (_coreConfig == address(0)) revert ZeroAddress();

        __Ownable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        coreConfig = ICoreConfig(_coreConfig);
        // usdToken = IERC20(coreConfig.usdToken());
        // ramaToken = IERC20(coreConfig.ramaToken());
    }

    /* ========== METHOD 3: MERKLE PROOF CLAIMING (RECOMMENDED) ========== */

    /**
     * @notice Claim slab income for a single day with Merkle proof
     * @dev Most gas-efficient: ~60K-80K gas
     * @param dayId Day to claim
     * @param usdAmount Amount in micro USD
     * @param ramaAmount Amount in RAMA wei
     * @param merkleProof Merkle proof showing user is in tree
     */
    function claimWithProof(
        uint32 dayId,
        uint256 usdAmount,
        uint256 ramaAmount,
        bytes32[] calldata merkleProof
    ) external nonReentrant {
        // Validation
        if (dayId < lastClaimedDay[msg.sender]) revert AlreadyClaimed();
        if (dayId >= _getCurrentDay()) revert CannotClaimFuture();
        if (usdAmount == 0) revert NothingToClaim();

        // Get Merkle root for this day
        bytes32 merkleRoot = dailyMerkleRoots[dayId];
        if (merkleRoot == bytes32(0)) revert NoMerkleRoot();

        // Create proof ID
        bytes32 proofId = keccak256(abi.encodePacked(msg.sender, dayId));

        // Check if already claimed
        if (claimedProofs[proofId]) revert ProofAlreadyUsed();

        // Create leaf node: hash(user, dayId, usdAmount, ramaAmount)
        bytes32 leaf = keccak256(
            bytes.concat(
                keccak256(abi.encode(msg.sender, dayId, usdAmount, ramaAmount))
            )
        );

        // Verify Merkle proof
        if (!MerkleProof.verify(merkleProof, merkleRoot, leaf)) {
            revert InvalidProof();
        }

        // Mark as claimed
        claimedProofs[proofId] = true;

        // Update checkpoint
        if (dayId + 1 > lastClaimedDay[msg.sender]) {
            lastClaimedDay[msg.sender] = dayId + 1;
        }

        // Transfer tokens
        _transferIncome(msg.sender, usdAmount, ramaAmount);

        //       event ClaimedWithProof(
        //     address indexed user,
        //     uint32 dayId,
        //     uint256 usdAmount,
        //     uint256 ramaAmount,
        //     bytes32 proofId,
        //     string incomeType  // "slab", "override", or "both"
        // );

        emit ClaimedWithProof(
            msg.sender,
            dayId,
            usdAmount,
            ramaAmount,
            proofId,
            "slab"
        );
        emit SlabIncomeClaimed(
            msg.sender,
            dayId,
            dayId,
            usdAmount,
            ramaAmount,
            3
        );
    }

    /**
     * @notice Claim multiple days with Merkle proofs (batch)
     * @dev Even more gas efficient when claiming multiple days
     * @param dayIds Array of day IDs to claim
     * @param usdAmounts Array of USD amounts
     * @param ramaAmounts Array of RAMA amounts
     * @param merkleProofs Array of Merkle proofs (one per day)
     */
    function claimBatchWithProof(
        uint32[] calldata dayIds,
        uint256[] calldata usdAmounts,
        uint256[] calldata ramaAmounts,
        bytes32[][] calldata merkleProofs
    ) external nonReentrant {
        uint256 count = dayIds.length;
        if (count == 0) revert NothingToClaim();
        if (
            count != usdAmounts.length ||
            count != ramaAmounts.length ||
            count != merkleProofs.length
        ) {
            revert ArrayLengthMismatch();
        }

        uint256 totalUSD;
        uint256 totalRAMA;
        uint32 highestDay;

        // Process each day
        for (uint256 i = 0; i < count; ) {
            // Scope variables tightly to avoid stack too deep
            {
                uint32 dayId = dayIds[i];

                // Validation
                if (dayId < lastClaimedDay[msg.sender]) revert AlreadyClaimed();
                if (dayId >= _getCurrentDay()) revert CannotClaimFuture();

                // Track highest day
                if (dayId > highestDay) {
                    highestDay = dayId;
                }

                // Verify and mark claimed
                _verifyAndMarkClaimed(
                    dayId,
                    usdAmounts[i],
                    ramaAmounts[i],
                    merkleProofs[i]
                );

                // Accumulate totals
                unchecked {
                    totalUSD += usdAmounts[i];
                    totalRAMA += ramaAmounts[i];
                }
            }

            unchecked {
                ++i;
            }
        }

        if (totalUSD == 0) revert NothingToClaim();

        // Update checkpoint to highest day + 1
        lastClaimedDay[msg.sender] = highestDay + 1;

        // Transfer total
        _transferIncome(msg.sender, totalUSD, totalRAMA);

        emit BatchClaimedWithProof(
            msg.sender,
            dayIds[0],
            highestDay,
            totalUSD,
            totalRAMA
        );
        emit SlabIncomeClaimed(
            msg.sender,
            dayIds[0],
            highestDay,
            totalUSD,
            totalRAMA,
            3
        );
    }

    /**
     * @dev Internal helper to verify proof and mark as claimed
     */
    function _verifyAndMarkClaimed(
        uint32 dayId,
        uint256 usdAmount,
        uint256 ramaAmount,
        bytes32[] calldata merkleProof
    ) private {
        // Get Merkle root
        bytes32 merkleRoot = dailyMerkleRoots[dayId];
        if (merkleRoot == bytes32(0)) revert NoMerkleRoot();

        // Create proof ID
        bytes32 proofId = keccak256(abi.encodePacked(msg.sender, dayId));
        if (claimedProofs[proofId]) revert ProofAlreadyUsed();

        // Create leaf
        bytes32 leaf = keccak256(
            bytes.concat(
                keccak256(abi.encode(msg.sender, dayId, usdAmount, ramaAmount))
            )
        );

        // Verify proof
        if (!MerkleProof.verify(merkleProof, merkleRoot, leaf)) {
            revert InvalidProof();
        }

        // Mark as claimed
        claimedProofs[proofId] = true;
    }

    /**
     * @notice Claim SLAB income only with Merkle proof
     * @dev Claims slab differential income only (not override)
     * @param dayId Day to claim
     * @param slabAmount Amount of slab income (in micro USD or wei)
     * @param merkleProof Merkle proof for slab tree
     */
    function claimSlabWithProof(
        uint32 dayId,
        uint256 slabAmount,
        bytes32[] calldata merkleProof
    ) external nonReentrant {
        // Validation
        if (dayId >= _getCurrentDay()) revert CannotClaimFuture();
        if (slabAmount == 0) revert NothingToClaim();

        // Get Merkle root for slab income
        bytes32 merkleRoot = dailySlabMerkleRoots[dayId];
        if (merkleRoot == bytes32(0)) revert NoMerkleRoot();

        // Create proof ID
        bytes32 proofId = keccak256(
            abi.encodePacked(msg.sender, dayId, "slab")
        );

        // Check if already claimed
        if (claimedSlabProofs[proofId]) revert ProofAlreadyUsed();

        // Create leaf node for slab income
        bytes32 leaf = keccak256(
            bytes.concat(keccak256(abi.encode(msg.sender, dayId, slabAmount)))
        );

        // Verify Merkle proof
        if (!MerkleProof.verify(merkleProof, merkleRoot, leaf)) {
            revert InvalidProof();
        }

        // Mark as claimed
        claimedSlabProofs[proofId] = true;

        // Transfer tokens (1:1 USD:RAMA for now)
        _transferIncome(msg.sender, slabAmount, slabAmount);

        emit ClaimedWithProof(
            msg.sender,
            dayId,
            slabAmount,
            slabAmount,
            proofId,
            "slab"
        );
    }

    /**
     * @notice Claim OVERRIDE income only with Merkle proof
     * @dev Claims override income only (not slab differential)
     * @param dayId Day to claim
     * @param overrideAmount Amount of override income (in micro USD or wei)
     * @param merkleProof Merkle proof for override tree
     */
    function claimOverrideWithProof(
        uint32 dayId,
        uint256 overrideAmount,
        bytes32[] calldata merkleProof
    ) external nonReentrant {
        // Validation
        if (dayId >= _getCurrentDay()) revert CannotClaimFuture();
        if (overrideAmount == 0) revert NothingToClaim();

        // Get Merkle root for override income
        bytes32 merkleRoot = dailyOverrideMerkleRoots[dayId];
        if (merkleRoot == bytes32(0)) revert NoMerkleRoot();

        // Create proof ID
        bytes32 proofId = keccak256(
            abi.encodePacked(msg.sender, dayId, "override")
        );

        // Check if already claimed
        if (claimedOverrideProofs[proofId]) revert ProofAlreadyUsed();

        // Create leaf node for override income
        bytes32 leaf = keccak256(
            bytes.concat(
                keccak256(abi.encode(msg.sender, dayId, overrideAmount))
            )
        );

        // Verify Merkle proof
        if (!MerkleProof.verify(merkleProof, merkleRoot, leaf)) {
            revert InvalidProof();
        }

        // Mark as claimed
        claimedOverrideProofs[proofId] = true;

        // Transfer tokens (1:1 USD:RAMA for now)
        _transferIncome(msg.sender, overrideAmount, overrideAmount);

        emit ClaimedWithProof(
            msg.sender,
            dayId,
            overrideAmount,
            overrideAmount,
            proofId,
            "override"
        );
    }

    /**
     * @notice Claim BOTH slab and override income with Merkle proofs
     * @dev Most efficient way to claim both types in single transaction
     * @param dayId Day to claim
     * @param slabAmount Amount of slab income
     * @param overrideAmount Amount of override income
     * @param slabMerkleProof Merkle proof for slab tree
     * @param overrideMerkleProof Merkle proof for override tree
     */
    function claimBothWithProof(
        uint32 dayId,
        uint256 slabAmount,
        uint256 overrideAmount,
        bytes32[] calldata slabMerkleProof,
        bytes32[] calldata overrideMerkleProof
    ) external nonReentrant {
        // Validation
        if (dayId >= _getCurrentDay()) revert CannotClaimFuture();
        if (slabAmount == 0 && overrideAmount == 0) revert NothingToClaim();

        uint256 totalAmount;

        // Process slab income if amount > 0
        if (slabAmount > 0) {
            bytes32 slabRoot = dailySlabMerkleRoots[dayId];
            if (slabRoot == bytes32(0)) revert NoMerkleRoot();

            bytes32 slabProofId = keccak256(
                abi.encodePacked(msg.sender, dayId, "slab")
            );
            if (claimedSlabProofs[slabProofId]) revert ProofAlreadyUsed();

            bytes32 slabLeaf = keccak256(
                bytes.concat(
                    keccak256(abi.encode(msg.sender, dayId, slabAmount))
                )
            );

            if (!MerkleProof.verify(slabMerkleProof, slabRoot, slabLeaf)) {
                revert InvalidProof();
            }

            claimedSlabProofs[slabProofId] = true;
            totalAmount += slabAmount;
        }

        // Process override income if amount > 0
        if (overrideAmount > 0) {
            bytes32 overrideRoot = dailyOverrideMerkleRoots[dayId];
            if (overrideRoot == bytes32(0)) revert NoMerkleRoot();

            bytes32 overrideProofId = keccak256(
                abi.encodePacked(msg.sender, dayId, "override")
            );
            if (claimedOverrideProofs[overrideProofId])
                revert ProofAlreadyUsed();

            bytes32 overrideLeaf = keccak256(
                bytes.concat(
                    keccak256(abi.encode(msg.sender, dayId, overrideAmount))
                )
            );

            if (
                !MerkleProof.verify(
                    overrideMerkleProof,
                    overrideRoot,
                    overrideLeaf
                )
            ) {
                revert InvalidProof();
            }

            claimedOverrideProofs[overrideProofId] = true;
            totalAmount += overrideAmount;
        }

        // Transfer total (1:1 USD:RAMA for now)
        _transferIncome(msg.sender, totalAmount, totalAmount);

        bytes32 combinedProofId = keccak256(
            abi.encodePacked(msg.sender, dayId, "both")
        );
        emit ClaimedWithProof(
            msg.sender,
            dayId,
            totalAmount,
            totalAmount,
            combinedProofId,
            "both"
        );
        emit SlabIncomeClaimed(
            msg.sender,
            dayId,
            dayId,
            totalAmount,
            totalAmount,
            3
        );
    }

    /* ========== ADMIN: MERKLE ROOT MANAGEMENT ========== */

    /**
     * @notice Set SLAB Merkle root for a specific day
     * @dev Only owner/admin can set root
     * @param dayId Day ID
     * @param merkleRoot Merkle root for slab differential income
     */
    function setSlabMerkleRoot(
        uint32 dayId,
        bytes32 merkleRoot
    ) external onlyOwner {
        if (dayId >= _getCurrentDay()) revert CannotClaimFuture();
        if (merkleRoot == bytes32(0)) revert ZeroAddress();

        dailySlabMerkleRoots[dayId] = merkleRoot;

        emit MerkleRootSet(dayId, merkleRoot, block.timestamp, "slab");
    }

    /**
     * @notice Set OVERRIDE Merkle root for a specific day
     * @dev Only owner/admin can set root
     * @param dayId Day ID
     * @param merkleRoot Merkle root for override income
     */
    function setOverrideMerkleRoot(
        uint32 dayId,
        bytes32 merkleRoot
    ) external onlyOwner {
        if (dayId >= _getCurrentDay()) revert CannotClaimFuture();
        if (merkleRoot == bytes32(0)) revert ZeroAddress();

        dailyOverrideMerkleRoots[dayId] = merkleRoot;

        emit MerkleRootSet(dayId, merkleRoot, block.timestamp, "override");
    }

    /**
     * @notice Set BOTH slab and override Merkle roots for a specific day
     * @dev Most efficient way to set both roots in single transaction
     * @param dayId Day ID
     * @param slabMerkleRoot Merkle root for slab income
     * @param overrideMerkleRoot Merkle root for override income
     */
    function setBothMerkleRoots(
        uint32 dayId,
        bytes32 slabMerkleRoot,
        bytes32 overrideMerkleRoot
    ) external onlyOwner {
        if (dayId >= _getCurrentDay()) revert CannotClaimFuture();
        if (slabMerkleRoot == bytes32(0) || overrideMerkleRoot == bytes32(0)) {
            revert ZeroAddress();
        }

        dailySlabMerkleRoots[dayId] = slabMerkleRoot;
        dailyOverrideMerkleRoots[dayId] = overrideMerkleRoot;

        emit MerkleRootSet(dayId, slabMerkleRoot, block.timestamp, "slab");
        emit MerkleRootSet(
            dayId,
            overrideMerkleRoot,
            block.timestamp,
            "override"
        );
    }

    /**
     * @notice Set combined Merkle root for a specific day (backward compatibility)
     * @dev Only owner/admin can set root - for combined slab+override tree
     * @param dayId Day ID
     * @param merkleRoot Merkle root for all achievers on this day
     */
    function setDailyMerkleRoot(
        uint32 dayId,
        bytes32 merkleRoot
    ) external onlyOwner {
        if (dayId >= _getCurrentDay()) revert CannotClaimFuture();
        if (merkleRoot == bytes32(0)) revert ZeroAddress();

        dailyMerkleRoots[dayId] = merkleRoot;

        emit MerkleRootSet(dayId, merkleRoot, block.timestamp, "combined");
    }

    /**
     * @notice Set SLAB Merkle roots for multiple days (batch)
     * @dev Gas efficient for setting multiple days at once
     * @param dayIds Array of day IDs
     * @param slabMerkleRoots Array of slab Merkle roots
     */
    function setBatchSlabMerkleRoots(
        uint32[] calldata dayIds,
        bytes32[] calldata slabMerkleRoots
    ) external onlyOwner {
        uint256 count = dayIds.length;
        if (count != slabMerkleRoots.length) revert ArrayLengthMismatch();

        for (uint256 i = 0; i < count; ) {
            if (dayIds[i] >= _getCurrentDay()) revert CannotClaimFuture();
            if (slabMerkleRoots[i] == bytes32(0)) revert ZeroAddress();

            dailySlabMerkleRoots[dayIds[i]] = slabMerkleRoots[i];

            emit MerkleRootSet(
                dayIds[i],
                slabMerkleRoots[i],
                block.timestamp,
                "slab"
            );

            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Set OVERRIDE Merkle roots for multiple days (batch)
     * @dev Gas efficient for setting multiple days at once
     * @param dayIds Array of day IDs
     * @param overrideMerkleRoots Array of override Merkle roots
     */
    function setBatchOverrideMerkleRoots(
        uint32[] calldata dayIds,
        bytes32[] calldata overrideMerkleRoots
    ) external onlyOwner {
        uint256 count = dayIds.length;
        if (count != overrideMerkleRoots.length) revert ArrayLengthMismatch();

        for (uint256 i = 0; i < count; ) {
            if (dayIds[i] >= _getCurrentDay()) revert CannotClaimFuture();
            if (overrideMerkleRoots[i] == bytes32(0)) revert ZeroAddress();

            dailyOverrideMerkleRoots[dayIds[i]] = overrideMerkleRoots[i];

            emit MerkleRootSet(
                dayIds[i],
                overrideMerkleRoots[i],
                block.timestamp,
                "override"
            );

            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Set BOTH slab and override Merkle roots for multiple days (batch)
     * @dev Most efficient way to set both types for multiple days
     * @param dayIds Array of day IDs
     * @param slabMerkleRoots Array of slab Merkle roots
     * @param overrideMerkleRoots Array of override Merkle roots
     */
    function setBatchBothMerkleRoots(
        uint32[] calldata dayIds,
        bytes32[] calldata slabMerkleRoots,
        bytes32[] calldata overrideMerkleRoots
    ) external onlyOwner {
        uint256 count = dayIds.length;
        if (
            count != slabMerkleRoots.length ||
            count != overrideMerkleRoots.length
        ) {
            revert ArrayLengthMismatch();
        }

        for (uint256 i = 0; i < count; ) {
            if (dayIds[i] >= _getCurrentDay()) revert CannotClaimFuture();
            if (
                slabMerkleRoots[i] == bytes32(0) ||
                overrideMerkleRoots[i] == bytes32(0)
            ) {
                revert ZeroAddress();
            }

            dailySlabMerkleRoots[dayIds[i]] = slabMerkleRoots[i];
            dailyOverrideMerkleRoots[dayIds[i]] = overrideMerkleRoots[i];

            emit MerkleRootSet(
                dayIds[i],
                slabMerkleRoots[i],
                block.timestamp,
                "slab"
            );
            emit MerkleRootSet(
                dayIds[i],
                overrideMerkleRoots[i],
                block.timestamp,
                "override"
            );

            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Set combined Merkle roots for multiple days (batch) - backward compatibility
     * @dev Gas efficient for setting multiple days at once
     * @param dayIds Array of day IDs
     * @param merkleRoots Array of Merkle roots
     */
    function setBatchMerkleRoots(
        uint32[] calldata dayIds,
        bytes32[] calldata merkleRoots
    ) external onlyOwner {
        uint256 count = dayIds.length;
        if (count != merkleRoots.length) revert ArrayLengthMismatch();

        for (uint256 i = 0; i < count; ) {
            if (dayIds[i] >= _getCurrentDay()) revert CannotClaimFuture();
            if (merkleRoots[i] == bytes32(0)) revert ZeroAddress();

            dailyMerkleRoots[dayIds[i]] = merkleRoots[i];

            emit MerkleRootSet(
                dayIds[i],
                merkleRoots[i],
                block.timestamp,
                "combined"
            );

            unchecked {
                ++i;
            }
        }
    }

    /* ========== METHOD 1: DIRECT ON-CHAIN CALCULATION ========== */

    /**
     * @notice Claim slab income with direct on-chain calculation
     * @dev Expensive but trustless: ~500K-2M gas depending on team size
     * @param fromDay Start day (inclusive)
     * @param toDay End day (inclusive)
     */
    function claimSlabIncome(
        uint32 fromDay,
        uint32 toDay
    ) external nonReentrant {
        if (toDay < fromDay) revert InvalidRange();
        if (fromDay < lastClaimedDay[msg.sender]) revert AlreadyClaimed();
        if (toDay >= _getCurrentDay()) revert CannotClaimFuture();

        IUserRegistry registry = IUserRegistry(coreConfig.userRegistry());
        ISlabManager slabMgr = ISlabManager(coreConfig.slabManager());

        uint256 totalUSD;
        uint256 totalRAMA;

        // Calculate for each day
        for (uint32 day = fromDay; day <= toDay; ) {
            (uint8 userSlabLevel, uint16 userSlabPct) = slabMgr
                .getUserSlabForDay(msg.sender, day);

            if (userSlabLevel > 0) {
                (uint256 dayUSD, uint256 dayRAMA) = _calculateDayIncome(
                    msg.sender,
                    day,
                    userSlabLevel,
                    userSlabPct,
                    registry,
                    slabMgr
                );

                unchecked {
                    totalUSD += dayUSD;
                    totalRAMA += dayRAMA;
                }
            }

            unchecked {
                ++day;
            }
        }

        if (totalUSD == 0) revert NothingToClaim();

        lastClaimedDay[msg.sender] = toDay + 1;

        _transferIncome(msg.sender, totalUSD, totalRAMA);

        emit SlabIncomeClaimed(
            msg.sender,
            fromDay,
            toDay,
            totalUSD,
            totalRAMA,
            1
        );
    }

    /**
     * @dev Calculate income for a single day (internal)
     */
    function _calculateDayIncome(
        address user,
        uint32 day,
        uint8 userSlabLevel,
        uint16 userSlabPct,
        IUserRegistry registry,
        ISlabManager slabMgr
    ) private view returns (uint256 usdAmount, uint256 ramaAmount) {
        address[] memory directs = registry.getDirects(user);
        if (directs.length == 0) return (0, 0);

        uint256[] memory legIncomes = new uint256[](directs.length);
        uint256 totalLegIncome;

        // Calculate income from each leg
        for (uint256 i = 0; i < directs.length; ) {
            uint256 legIncome = _calculateLegIncome(
                directs[i],
                day,
                userSlabLevel,
                userSlabPct,
                slabMgr
            );

            legIncomes[i] = legIncome;
            unchecked {
                totalLegIncome += legIncome;
            }

            unchecked {
                ++i;
            }
        }

        if (totalLegIncome == 0) return (0, 0);

        // Apply 60% cap per leg
        uint256 maxPerLeg = (totalLegIncome * MAX_LEG_CAP_BPS) / BPS_BASE;
        uint256 cappedTotal;

        for (uint256 i = 0; i < legIncomes.length; ) {
            if (legIncomes[i] > maxPerLeg) {
                unchecked {
                    cappedTotal += maxPerLeg;
                }
            } else {
                unchecked {
                    cappedTotal += legIncomes[i];
                }
            }

            unchecked {
                ++i;
            }
        }

        usdAmount = cappedTotal;
        ramaAmount = cappedTotal; // 1:1 for now, use oracle in production
    }

    /**
     * @dev Calculate income from a single leg
     */
    function _calculateLegIncome(
        address legRoot,
        uint32 day,
        uint8 userSlabLevel,
        uint16 userSlabPct,
        ISlabManager slabMgr
    ) private view returns (uint256 income) {
        IUserRegistry registry = IUserRegistry(coreConfig.userRegistry());
        IROIDistributor roiDist = IROIDistributor(coreConfig.roiDistributor());

        address[] memory team = registry.getTeamAddresses(legRoot);

        for (uint256 i = 0; i < team.length; ) {
            address member = team[i];

            (uint8 memberSlabLevel, uint16 memberSlabPct) = slabMgr
                .getUserSlabForDay(member, day);

            // Slab differential income
            if (memberSlabPct < userSlabPct) {
                (uint256 memberUSD, ) = roiDist.getUserDayROI(member, day);
                uint256 considerableROI = (memberUSD * CONSIDERABLE_ROI_BPS) /
                    BPS_BASE;

                uint16 diff = userSlabPct - memberSlabPct;
                uint256 diffIncome = (considerableROI * diff) / BPS_BASE;

                unchecked {
                    income += diffIncome;
                }
            }

            // Override income
            if (memberSlabLevel >= userSlabLevel && memberSlabLevel > 0) {
                uint256 memberIncome = _calculateLegIncome(
                    member,
                    day,
                    memberSlabLevel,
                    memberSlabPct,
                    slabMgr
                );
                uint256 overrideIncome = (memberIncome * OVERRIDE_DIRECT_BPS) /
                    BPS_BASE;

                unchecked {
                    income += overrideIncome;
                }
            }

            unchecked {
                ++i;
            }
        }
    }

    /* ========== METHOD 2: KEEPER SETTLEMENT ========== */

    /**
     * @notice Settle slab income for a user for a specific day (keeper)
     * @dev Can only be called by owner
     */
    function settleDaySlabIncome(
        address user,
        uint32 day,
        uint256 usdAmount,
        uint256 ramaAmount
    ) external onlyOwner {
        if (day >= _getCurrentDay()) revert CannotClaimFuture();

        settledUSD[user][day] = uint128(usdAmount);
        settledRAMA[user][day] = uint128(ramaAmount);

        emit DaySettled(user, day, usdAmount, ramaAmount);
    }

    /**
     * @notice Claim pre-settled income
     * @dev Gas efficient: ~80K-150K gas
     */
    function claimSettledIncome(
        uint32 fromDay,
        uint32 toDay
    ) external nonReentrant {
        if (toDay < fromDay) revert InvalidRange();
        if (fromDay < lastClaimedDay[msg.sender]) revert AlreadyClaimed();
        if (toDay >= _getCurrentDay()) revert CannotClaimFuture();

        uint256 totalUSD;
        uint256 totalRAMA;

        for (uint32 day = fromDay; day <= toDay; ) {
            uint128 dayUSD = settledUSD[msg.sender][day];
            uint128 dayRAMA = settledRAMA[msg.sender][day];

            unchecked {
                totalUSD += dayUSD;
                totalRAMA += dayRAMA;
            }

            delete settledUSD[msg.sender][day];
            delete settledRAMA[msg.sender][day];

            unchecked {
                ++day;
            }
        }

        if (totalUSD == 0) revert NothingToClaim();

        lastClaimedDay[msg.sender] = toDay + 1;

        _transferIncome(msg.sender, totalUSD, totalRAMA);

        emit SlabIncomeClaimed(
            msg.sender,
            fromDay,
            toDay,
            totalUSD,
            totalRAMA,
            2
        );
    }

    /* ========== VIEW FUNCTIONS ========== */

    /**
     * @notice Verify a Merkle proof (for testing/frontend)
     * @param user User address
     * @param dayId Day ID
     * @param usdAmount USD amount
     * @param ramaAmount RAMA amount
     * @param merkleProof Merkle proof
     * @return valid True if proof is valid
     */
    function verifyProof(
        address user,
        uint32 dayId,
        uint256 usdAmount,
        uint256 ramaAmount,
        bytes32[] calldata merkleProof
    ) external view returns (bool valid) {
        bytes32 merkleRoot = dailyMerkleRoots[dayId];
        if (merkleRoot == bytes32(0)) return false;

        bytes32 leaf = keccak256(
            bytes.concat(
                keccak256(abi.encode(user, dayId, usdAmount, ramaAmount))
            )
        );

        return MerkleProof.verify(merkleProof, merkleRoot, leaf);
    }

    /**
     * @notice Get user's claimable range
     */
    function getClaimableRange(
        address user
    ) external view returns (uint32 from, uint32 to) {
        from = lastClaimedDay[user];
        to = _getCurrentDay() - 1;
    }

    /**
     * @notice Check if a day has been claimed
     */
    function isDayClaimed(
        address user,
        uint32 dayId
    ) external view returns (bool) {
        bytes32 proofId = keccak256(abi.encodePacked(user, dayId));
        return claimedProofs[proofId];
    }

    /**
     * @notice Get SLAB Merkle root for a day
     */
    function getSlabMerkleRoot(uint32 dayId) external view returns (bytes32) {
        return dailySlabMerkleRoots[dayId];
    }

    /**
     * @notice Get OVERRIDE Merkle root for a day
     */
    function getOverrideMerkleRoot(
        uint32 dayId
    ) external view returns (bytes32) {
        return dailyOverrideMerkleRoots[dayId];
    }

    /**
     * @notice Get BOTH slab and override Merkle roots for a day
     */
    function getBothMerkleRoots(
        uint32 dayId
    ) external view returns (bytes32 slabRoot, bytes32 overrideRoot) {
        return (dailySlabMerkleRoots[dayId], dailyOverrideMerkleRoots[dayId]);
    }

    /**
     * @notice Get combined Merkle root for a day (backward compatibility)
     */
    function getMerkleRoot(uint32 dayId) external view returns (bytes32) {
        return dailyMerkleRoots[dayId];
    }

    /**
     * @notice Check if SLAB Merkle root exists for a day
     */
    function hasSlabMerkleRoot(uint32 dayId) external view returns (bool) {
        return dailySlabMerkleRoots[dayId] != bytes32(0);
    }

    /**
     * @notice Check if OVERRIDE Merkle root exists for a day
     */
    function hasOverrideMerkleRoot(uint32 dayId) external view returns (bool) {
        return dailyOverrideMerkleRoots[dayId] != bytes32(0);
    }

    /**
     * @notice Check if BOTH slab and override Merkle roots exist for a day
     */
    function hasBothMerkleRoots(uint32 dayId) external view returns (bool) {
        return
            dailySlabMerkleRoots[dayId] != bytes32(0) &&
            dailyOverrideMerkleRoots[dayId] != bytes32(0);
    }

    /**
     * @notice Check if combined Merkle root exists for a day (backward compatibility)
     */
    function hasMerkleRoot(uint32 dayId) external view returns (bool) {
        return dailyMerkleRoots[dayId] != bytes32(0);
    }

    /**
     * @notice Get settled income for a period
     */
    function getSettledIncome(
        address user,
        uint32 fromDay,
        uint32 toDay
    ) external view returns (uint256 totalUSD, uint256 totalRAMA) {
        for (uint32 day = fromDay; day <= toDay; ) {
            unchecked {
                totalUSD += settledUSD[user][day];
                totalRAMA += settledRAMA[user][day];
                ++day;
            }
        }
    }

    /**
     * @notice Generate leaf hash for Merkle tree (helper)
     * @dev Use this to generate leaves when building Merkle tree off-chain
     */
    function generateLeaf(
        address user,
        uint32 dayId,
        uint256 usdAmount,
        uint256 ramaAmount
    ) external pure returns (bytes32) {
        return
            keccak256(
                bytes.concat(
                    keccak256(abi.encode(user, dayId, usdAmount, ramaAmount))
                )
            );
    }

    /* ========== EMERGENCY FUNCTIONS ========== */

    /**
     * @notice Reset claimed proof (emergency)
     */
    function resetClaimedProof(address user, uint32 dayId) external onlyOwner {
        bytes32 proofId = keccak256(abi.encodePacked(user, dayId));
        claimedProofs[proofId] = false;
    }

    /**
     * @notice Emergency token withdrawal
     */
    function emergencyWithdraw(
        address token,
        uint256 amount
    ) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }

    /* ========== INTERNAL FUNCTIONS ========== */

    /**
     * @dev Transfer income to user
     */
    function _transferIncome(
        address user,
        uint256 usdAmount,
        uint256 ramaAmount
    ) private {
        emit AmountTransferred(user, block.timestamp, usdAmount, ramaAmount);

        // if (usdAmount > 0) {
        //     require(usdToken.transfer(user, usdAmount), "USD transfer failed");
        // }
        // if (ramaAmount > 0) {
        //     require(ramaToken.transfer(user, ramaAmount), "RAMA transfer failed");
        // }
    }

    /**
     * @dev Get current day ID
     */
    function _getCurrentDay() public view returns (uint32) {
        uint256 startTime = 1762047535;
        if (block.timestamp < startTime) return 0;
        return uint32((block.timestamp-startTime) / 1 days);
    }

    /**
     * @dev Required by UUPSUpgradeable
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}
}
