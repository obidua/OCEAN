// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
// reentratncy upgradable
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/ICoreConfig.sol";

/// Minimal interface your PM should expose for SafeWallet-driven staking.
/// Implement these in PortfolioManager and restrict them with `onlySafeWallet`.
interface IPortfolioManagerSafe {
    function createPortfolioFromSafe(
        address user,
        uint256 ramaAmount
    ) external returns (uint256 pid);

    function getPackageValueInUSD(
        uint256 ramaAmount
    ) external view returns (uint256);

    /// NEW: persists the real sponsor (caller) inside PM
    function createPortfolioForOthersFromSafe(
        address caller,
        address beneficiary,
        uint256 ramaAmount,
        address referrer
    ) external returns (uint256 pid);

    function topUpFromSafe(
        address user,
        uint256 pid,
        uint256 ramaAmount
    ) external;
}

/// @title SafeWallet (ledger + staking helpers)
/// @notice Tracks all credits/debits with typed purposes; can spend balance to create/top-up portfolios;
///         can withdraw to user’s external wallet. Still supports ROI USD+RAMA credits (single/batch).
contract SafeWallet is
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    ICoreConfig public cfg;
    // IERC20 public RAMA;

    // ---------------- Core balances / aggregates ----------------
    mapping(address => uint256) public ramaBalance; // RAMA wei available
    mapping(address => uint256) public usdBalance; // RAMA wei available

    mapping(address => uint256) public roiUsdPaid; // lifetime USD ROI (WAD 1e18)
    mapping(uint32 => uint256) public dayUsdTotal; // per-day ROI USD aggregate
    mapping(uint32 => uint256) public dayRamaTotal; // per-day ROI RAMA aggregate
    address private _roiDist;
    // ---------------- Access control ----------------
    modifier onlyAuthorized() {
        address s = msg.sender;
        require(
            s == cfg.incomeDistributor() ||
                s == cfg.portfolioManager() ||
                s == cfg.slabManager() ||
                s == cfg.royaltyManager() ||
                s == cfg.rewardVault() ||
                s == cfg.adminControl() ||
                s == cfg.treasury() ||
                s == cfg.cappingIncomeManager() ||
                s == cfg.roiDistributor(),
            "NOT_AUTH"
        );
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == cfg.adminControl(), "NOT_ADMIN");
        _;
    }

    modifier onlyAuthorizedSender() {
        require(
            msg.sender == cfg.deployerAdd() ||
                msg.sender == cfg.portfolioManager(),
            "NOT_AUTHROZIED"
        );
        _;
    }

    // --- ROIDistributor explicit allow-list slot (optional) ---

    function setContracts(address _cfg) external onlyOwner {
        cfg = ICoreConfig(_cfg);
        _roiDist = cfg.roiDistributor();

        // require(a != address(0), "ZERO");
        // _roiDist = a;
    }

    function _roiDistributor() internal view returns (address) {
        return _roiDist;
    }

    // ----------------- Typed Ledger -----------------
    enum TxKind {
        // credits
        ROI,
        Growth,
        Royalty,
        Slab,
        Reward,
        DirectIncome,
        ManualCredit,
        // debits
        StakeSpend,
        PortfolioCreate,
        PortfolioTopUp,
        ExternalWithdraw
    }

    struct LedgerEntry {
        uint8 kind; // TxKind
        bool isCredit;
        uint256 usdAmount; // 1e18 WAD (0 if N/A)
        uint256 ramaAmount; // wei
        uint32 dayId; // ROI day, if applicable (0 otherwise)
        uint64 timestamp;
        address related; // referrer/upline/recipient/PM/etc
        uint256 pid; // portfolio id (create/top-up), else 0
        bytes32 memo; // optional tag
    }

    struct Withdrawals {
        address withdrawanBy;
        uint256 amountInRAMA;
        uint256 amountInUSD;
        uint256 platformFeeInUSd;
        uint256 platformFeeInRAMA;
        uint256 netTransferredAmountRAMA;
        uint256 netTransferredAmountUSD;
        uint256 withdrawanAt;
    }
    // mapping(address => Withdrawals) public

    mapping(address => Withdrawals[]) public withdrawals;
    mapping(address => LedgerEntry[]) private _ledger;
    mapping(address => uint256) public totalCreditsUSD;
    mapping(address => uint256) public totalCreditsRAMA;
    mapping(address => uint256) public totalDebitsUSD;
    mapping(address => uint256) public totalDebitsRAMA;

    uint256 public totalPlatformFeeCollected;

    // mapping(address => )

    uint256 public platformFee;

    // ---------------- Events ----------------
    event ROIUSDRecorded(
        address indexed user,
        uint32 indexed dayId,
        uint256 usdAmount,
        uint256 ramaAmount
    );
    event GrowthCredited(address indexed user, uint256 ramaAmount);
    event Debited(address indexed user, uint256 amount, address to);
    event LedgerRecorded(
        address indexed user,
        uint8 kind,
        bool isCredit,
        uint256 usdAmount,
        uint256 ramaAmount,
        uint32 dayId,
        address indexed related,
        uint256 pid,
        bytes32 memo
    );

    event ContractFunded(address indexed funder, uint256 amount);
    /* ------------------------- Init / Upgrade ------------------------- */
    function initialize(address _cfg) external initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        cfg = ICoreConfig(_cfg);
        platformFee = 500;

        // RAMA = IERC20(cfg.rama());
    }
    function _authorizeUpgrade(address) internal override onlyOwner {}

    /// @notice Allows an admin to deposit native currency into this contract.
    /// @dev This function increases the contract's own balance, which is used to fund user withdrawals.
    /// It can only be called by the admin address specified in the core configuration.
    function fundContract() external payable onlyAuthorizedSender {
        require(msg.value > 0, "AMOUNT_0");
        // The contract's balance is automatically increased by msg.value.
        // Emitting an event is good practice for off-chain tracking.
        emit ContractFunded(msg.sender, msg.value);
    }

    /* ========================= CREDIT HOOKS ========================== */
    function creditROIUSD(
        address user,
        uint256 usdAmount, // 1e18 WAD
        uint256 ramaAmount, // wei
        uint32 dayId
    ) external onlyAuthorized {
        ramaBalance[user] += ramaAmount;
        roiUsdPaid[user] += usdAmount;
        dayUsdTotal[dayId] += usdAmount;
        dayRamaTotal[dayId] += ramaAmount;

        _recordCredit(
            user,
            TxKind.ROI,
            usdAmount,
            ramaAmount,
            dayId,
            address(0),
            0,
            bytes32(0)
        );
        emit ROIUSDRecorded(user, dayId, usdAmount, ramaAmount);
    }

    function creditROIUSDBatch(
        address user,
        uint32[] calldata dayIds,
        uint256[] calldata usdAmounts,
        uint256[] calldata ramaAmounts
    ) external onlyAuthorized {
        require(
            dayIds.length == usdAmounts.length &&
                dayIds.length == ramaAmounts.length,
            "ARRAY_LEN"
        );

        uint256 usdSum;
        uint256 ramaSum;
        for (uint256 i = 0; i < dayIds.length; i++) {
            if (ramaAmounts[i] == 0) {
                continue;
            }
            roiUsdPaid[user] += usdAmounts[i];
            dayUsdTotal[dayIds[i]] += usdAmounts[i];
            dayRamaTotal[dayIds[i]] += ramaAmounts[i];
            usdSum += usdAmounts[i];
            ramaSum += ramaAmounts[i];

            _recordCredit(
                user,
                TxKind.ROI,
                usdAmounts[i],
                ramaAmounts[i],
                dayIds[i],
                address(0),
                0,
                bytes32(0)
            );
            emit ROIUSDRecorded(user, dayIds[i], usdAmounts[i], ramaAmounts[i]);
        }
        ramaBalance[user] += ramaSum;
    }

    function creditGrowth(
        address user,
        uint256 ramaAmount
    ) external onlyAuthorized {
        ramaBalance[user] += ramaAmount;
        _recordCredit(
            user,
            TxKind.Growth,
            0,
            ramaAmount,
            0,
            msg.sender,
            0,
            bytes32("growth")
        );
        emit GrowthCredited(user, ramaAmount);
    }

    function creditGeneral(
        address user,
        TxKind kind,
        uint256 usdAmount,
        uint256 ramaAmount,
        bytes32 memo
    ) external onlyAuthorized {
        require(uint8(kind) <= uint8(TxKind.ManualCredit), "BAD_KIND");
        ramaBalance[user] += ramaAmount;
        _recordCredit(
            user,
            kind,
            usdAmount,
            ramaAmount,
            0,
            msg.sender,
            0,
            memo
        );
    }

    function getRAMABalance(
        address user,
        uint256 ramaAmount
    )
        external
        view
        returns (uint256 amount, bool isAvailable, uint256 isAboveStake)
    {
        uint256 usdMicro = IPortfolioManagerSafe(cfg.portfolioManager())
            .getPackageValueInUSD(ramaAmount);
        if (ramaBalance[user] >= ramaAmount) {
            return (ramaBalance[user], true, usdMicro);
        } else {
            return (ramaBalance[user], false, usdMicro);
        }
        // return (ramaBalance[user], (ramaBalance[msg.sender] >= ramaAmount));
    }

    /// @notice Create a new portfolio for msg.sender using their SafeWallet balance (self-activation).
    /// @param ramaAmount RAMA (wei) to stake — must be <= ramaBalance[msg.sender]

    function createPortfolioFromSafe(
        uint256 ramaAmount
    ) external returns (uint256 pid) {
        require(ramaAmount > 0, "AMOUNT_0");
        require(ramaBalance[msg.sender] >= ramaAmount, "INSUFFICIENT");

        uint256 usdMicro = IPortfolioManagerSafe(cfg.portfolioManager())
            .getPackageValueInUSD(ramaAmount);

        // uint256 usdMicro = _ramaOfUsd(ramaAmount);

        require(usdMicro >= cfg.getUSDMinStake(), "below min stake");

        address payable safe = payable(cfg.treasury());
        // <-- now this is a real wallet address
        (bool sent, ) = safe.call{value: ramaAmount}(""); // sends native RAMA to wallet
        require(sent, "SAFE_DEPOSIT_FAIL");

        // 2) call PM's self-activation entry (the one you posted)
        pid = IPortfolioManagerSafe(cfg.portfolioManager())
            .createPortfolioFromSafe(msg.sender, ramaAmount);

        // 3) ledger debits (StakeSpend + PortfolioCreate)
        _recordDebit(
            msg.sender,
            TxKind.StakeSpend,
            0,
            ramaAmount,
            0,
            cfg.treasury(),
            pid,
            bytes32("stake_spend")
        );
        _recordDebit(
            msg.sender,
            TxKind.PortfolioCreate,
            0,
            0,
            0,
            cfg.portfolioManager(),
            pid,
            bytes32("pm_record")
        );

        emit Debited(msg.sender, ramaAmount, cfg.treasury());
    }

    /// NEW: Recommended sponsor flow that persists real sponsor in PM
    function sponsorCreatePortfolioFor(
        address beneficiary,
        uint256 ramaAmount,
        address referrer
    ) external returns (uint256 pid) {
        require(beneficiary != address(0), "ZERO_BENEFICIARY");
        require(ramaAmount > 0, "AMOUNT_0");
        require(ramaBalance[msg.sender] >= ramaAmount, "INSUFFICIENT");

        // Deduct sponsor balance and move tokens
        ramaBalance[msg.sender] -= ramaAmount;
        address payable safe = payable(cfg.treasury());

        // <-- now this is a real wallet address
        (bool sent, ) = safe.call{value: ramaAmount}(""); // sends native RAMA to wallet
        require(sent, "AMOUNT TRANSFER FAILED");
        // require(RAMA.transfer(cfg.treasury(), ramaAmount), "TRANSFER_FAIL");

        // PM call that records sponsor (caller)
        pid = IPortfolioManagerSafe(cfg.portfolioManager())
            .createPortfolioForOthersFromSafe(
                msg.sender,
                beneficiary,
                ramaAmount,
                referrer
            );

        // Ledger debits
        _recordDebit(
            msg.sender,
            TxKind.StakeSpend,
            0,
            ramaAmount,
            0,
            cfg.treasury(),
            pid,
            bytes32("stake_for_other")
        );
        _recordDebit(
            msg.sender,
            TxKind.PortfolioCreate,
            0,
            0,
            0,
            cfg.portfolioManager(),
            pid,
            bytes32("pm_record_for_other")
        );
        emit Debited(msg.sender, ramaAmount, cfg.treasury());
    }

    /// Top-up own portfolio from SafeWallet funds
    function topUpPortfolioFromSafe(uint256 pid, uint256 ramaAmount) external {
        require(ramaAmount > 0, "AMOUNT_0");
        require(ramaBalance[msg.sender] >= ramaAmount, "INSUFFICIENT");

        ramaBalance[msg.sender] -= ramaAmount;

        address payable safe = payable(cfg.treasury());
        // <-- now this is a real wallet address
        (bool sent, ) = safe.call{value: ramaAmount}(""); // sends native RAMA to wallet
        require(sent, "TRANSFER_FAIL");
        // require(RAMA.transfer(cfg.treasury(), ramaAmount), "TRANSFER_FAIL");

        IPortfolioManagerSafe(cfg.portfolioManager()).topUpFromSafe(
            msg.sender,
            pid,
            ramaAmount
        );

        _recordDebit(
            msg.sender,
            TxKind.StakeSpend,
            0,
            ramaAmount,
            0,
            cfg.treasury(),
            pid,
            bytes32("topup_spend")
        );
        _recordDebit(
            msg.sender,
            TxKind.PortfolioTopUp,
            0,
            0,
            0,
            cfg.portfolioManager(),
            pid,
            bytes32("pm_topup")
        );
        emit Debited(msg.sender, ramaAmount, cfg.treasury());
    }

    /// Top-up someone else’s portfolio using the caller’s SafeWallet funds
    function topUpPortfolioFor(
        address beneficiary,
        uint256 pid,
        uint256 ramaAmount
    ) external {
        require(beneficiary != address(0), "ZERO_BENEFICIARY");
        require(ramaAmount > 0, "AMOUNT_0");
        require(ramaBalance[msg.sender] >= ramaAmount, "INSUFFICIENT");

        ramaBalance[msg.sender] -= ramaAmount;
        address payable safe = payable(cfg.treasury());

        // <-- now this is a real wallet address
        (bool sent, ) = safe.call{value: ramaAmount}(""); // sends native RAMA to wallet
        require(sent, "TREASURY TRANSFER FAILED");
        // require(RAMA.transfer(cfg.treasury(), ramaAmount), "TRANSFER_FAIL");

        IPortfolioManagerSafe(cfg.portfolioManager()).topUpFromSafe(
            beneficiary,
            pid,
            ramaAmount
        );

        _recordDebit(
            msg.sender,
            TxKind.StakeSpend,
            0,
            ramaAmount,
            0,
            cfg.treasury(),
            pid,
            bytes32("topup_for_other")
        );
        _recordDebit(
            msg.sender,
            TxKind.PortfolioTopUp,
            0,
            0,
            0,
            cfg.portfolioManager(),
            pid,
            bytes32("pm_topup_for_other")
        );
        emit Debited(msg.sender, ramaAmount, cfg.treasury());
    }

    /// Withdraw RAMA from SafeWallet to an external address
    function claimToExternal(uint256 amount, address to) external nonReentrant {
        require(to != address(0), "ZERO_TO");
        require(amount > 0, "AMOUNT_0");
        require(ramaBalance[msg.sender] >= amount, "INSUFFICIENT");

        uint256 amountInUSD = usdBalance[msg.sender];
        uint256 platformFeeAmount = (amount * platformFee) / 10000; // platformFee is in BPS
        uint256 platformFeeAmountUSD = (amountInUSD * platformFee) / 10000; // platformFee is in BPS
        uint256 amountAfterFee = amount - platformFeeAmount;
        uint256 amountAfterFeeUSD = amountInUSD - platformFeeAmountUSD;

        address payable treasury = payable(cfg.treasury());
        if (platformFeeAmount > 0) {
            (bool sentFee, ) = treasury.call{value: platformFeeAmount}("");
            require(sentFee, "TREASURY_FEE_TRANSFER_FAILED");
            totalPlatformFeeCollected += platformFeeAmount;
        }

        // Transfer remaining amount to recipient
        if (amountAfterFee > 0) {
            (bool sentToRecipient, ) = payable(to).call{value: amountAfterFee}(
                ""
            );
            require(sentToRecipient, "WITHDRAWAL_TO_RECIPIENT_FAILED");
        }

        ramaBalance[msg.sender] -= amount;
        usdBalance[msg.sender] -= amountInUSD;
        // totalPlatformFeeCollected += platformFeeAmount;

        withdrawals[msg.sender].push(
            Withdrawals({
                withdrawanBy: msg.sender,
                amountInRAMA: amount,
                amountInUSD: amountInUSD, // USD equivalent not tracked here
                platformFeeInUSd: platformFeeAmountUSD, // USD equivalent not tracked here
                platformFeeInRAMA: platformFeeAmount,
                netTransferredAmountRAMA: amountAfterFee,
                netTransferredAmountUSD: amountAfterFeeUSD,
                withdrawanAt: block.timestamp
            })
        );

        _recordDebit(
            msg.sender,
            TxKind.ExternalWithdraw,
            0,
            amount,
            0,
            to,
            0,
            bytes32("external_withdraw")
        );
        emit Debited(msg.sender, amount, to);
    }

    // make this function nonreentrant

    function claimAllTo(address to) external nonReentrant {
        require(to != address(0), "ZERO_TO");
        uint256 amt = ramaBalance[msg.sender];
        uint256 amtUSD = usdBalance[msg.sender];

        require(amt > 0, "NOTHING");
        // ramaBalance[msg.sender] = 0;

        // deduct platform fees

        uint256 platformFeeAmount = (amt * platformFee) / 10000; // platformFee is in BPS
        uint256 platformFeeAmountUSD = (amtUSD * platformFee) / 10000; // platformFee is in BPS
        uint256 amountAfterFee = amt - platformFeeAmount;
        uint256 amountAfterFeeUSD = amtUSD - platformFeeAmountUSD;

        require(amountAfterFee >= 0, "FEE_EXCEEDS_AMOUNT"); // Should not happen with proper fee calculation

        address payable treasury = payable(cfg.treasury());
        if (platformFeeAmount > 0) {
            (bool sentFee, ) = treasury.call{value: platformFeeAmount}("");
            require(sentFee, "TREASURY_FEE_TRANSFER_FAILED");
            totalPlatformFeeCollected += platformFeeAmount;
        }

        // Transfer remaining amount to recipient
        if (amountAfterFee > 0) {
            (bool sentToRecipient, ) = payable(to).call{value: amountAfterFee}(
                ""
            );
            require(sentToRecipient, "WITHDRAWAL_TO_RECIPIENT_FAILED");
        }

        ramaBalance[msg.sender] = 0;
        usdBalance[msg.sender] = 0;
        // totalPlatformFeeCollected += platformFeeAmount;

        withdrawals[msg.sender].push(
            Withdrawals({
                withdrawanBy: msg.sender,
                amountInRAMA: amountAfterFee,
                amountInUSD: 0, // USD equivalent not tracked here
                platformFeeInUSd: platformFeeAmountUSD, // USD equivalent not tracked here
                platformFeeInRAMA: platformFeeAmount,
                netTransferredAmountRAMA: amountAfterFee,
                netTransferredAmountUSD: amountAfterFeeUSD,
                withdrawanAt: block.timestamp
            })
        );

        _recordDebit(
            msg.sender,
            TxKind.ExternalWithdraw,
            0,
            amt,
            0,
            to,
            0,
            bytes32("external_withdraw_all")
        );
        emit Debited(msg.sender, amt, to);
    }

    /* ========================= Ledger Views ========================== */

    function getLedgerCount(address user) external view returns (uint256) {
        return _ledger[user].length;
    }

    function getLedgerSlice(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (LedgerEntry[] memory out) {
        LedgerEntry[] storage arr = _ledger[user];
        uint256 n = arr.length;
        if (offset >= n) return new LedgerEntry[](0);

        uint256 end = offset + limit;
        if (end > n) end = n;

        out = new LedgerEntry[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            out[i - offset] = arr[i];
        }
    }

    /* ========================= Internal: Ledger ====================== */

    function _recordCredit(
        address user,
        TxKind kind,
        uint256 usdAmount,
        uint256 ramaAmount,
        uint32 dayId,
        address related,
        uint256 pid,
        bytes32 memo
    ) internal {
        _ledger[user].push(
            LedgerEntry({
                kind: uint8(kind),
                isCredit: true,
                usdAmount: usdAmount,
                ramaAmount: ramaAmount,
                dayId: dayId,
                timestamp: uint64(block.timestamp),
                related: related,
                pid: pid,
                memo: memo
            })
        );
        totalCreditsUSD[user] += usdAmount;
        totalCreditsRAMA[user] += ramaAmount;

        emit LedgerRecorded(
            user,
            uint8(kind),
            true,
            usdAmount,
            ramaAmount,
            dayId,
            related,
            pid,
            memo
        );
    }

    function _recordDebit(
        address user,
        TxKind kind,
        uint256 usdAmount,
        uint256 ramaAmount,
        uint32 dayId,
        address related,
        uint256 pid,
        bytes32 memo
    ) internal {
        _ledger[user].push(
            LedgerEntry({
                kind: uint8(kind),
                isCredit: false,
                usdAmount: usdAmount,
                ramaAmount: ramaAmount,
                dayId: dayId,
                timestamp: uint64(block.timestamp),
                related: related,
                pid: pid,
                memo: memo
            })
        );
        totalDebitsUSD[user] += usdAmount;
        totalDebitsRAMA[user] += ramaAmount;

        emit LedgerRecorded(
            user,
            uint8(kind),
            false,
            usdAmount,
            ramaAmount,
            dayId,
            related,
            pid,
            memo
        );
    }

    // ========= Simple getters =========
    function balanceOf(address user) external view returns (uint256) {
        return ramaBalance[user];
    }

    function getDayTotals(
        uint32 dayId
    ) external view returns (uint256 usdTotal_, uint256 ramaTotal_) {
        return (dayUsdTotal[dayId], dayRamaTotal[dayId]);
    }

    function getTotals(
        address user
    )
        external
        view
        returns (
            uint256 _ramaBalance,
            uint256 _roiUsdPaid,
            uint256 _totalCreditsUSD,
            uint256 _totalCreditsRAMA,
            uint256 _totalDebitsUSD,
            uint256 _totalDebitsRAMA
        )
    {
        return (
            ramaBalance[user],
            roiUsdPaid[user],
            totalCreditsUSD[user],
            totalCreditsRAMA[user],
            totalDebitsUSD[user],
            totalDebitsRAMA[user]
        );
    }

    function getUserRoiForDay(
        address user,
        uint32 dayId
    ) external view returns (uint256 usdSum, uint256 ramaSum) {
        LedgerEntry[] storage arr = _ledger[user];
        uint256 n = arr.length;
        for (uint256 i = 0; i < n; i++) {
            LedgerEntry storage e = arr[i];
            if (e.isCredit && e.kind == uint8(TxKind.ROI) && e.dayId == dayId) {
                usdSum += e.usdAmount;
                ramaSum += e.ramaAmount;
            }
        }
    }

    function getLastTransactions(
        address user,
        uint256 limit
    ) external view returns (LedgerEntry[] memory out) {
        LedgerEntry[] storage arr = _ledger[user];
        uint256 n = arr.length;
        if (limit > n) limit = n;
        out = new LedgerEntry[](limit);
        for (uint256 i = 0; i < limit; i++) {
            out[i] = arr[n - 1 - i];
        }
    }

    function getTransactionsByKind(
        address user,
        uint8 kind,
        bool isCredit,
        uint256 offset,
        uint256 limit
    ) external view returns (LedgerEntry[] memory slice, uint256 totalMatched) {
        LedgerEntry[] storage arr = _ledger[user];
        uint256 n = arr.length;

        for (uint256 i = 0; i < n; i++) {
            if (arr[i].kind == kind && arr[i].isCredit == isCredit)
                totalMatched++;
        }
        if (offset >= totalMatched) return (new LedgerEntry[](0), totalMatched);

        LedgerEntry[] memory tmp = new LedgerEntry[](totalMatched);
        uint256 k = 0;
        for (uint256 i = 0; i < n; i++) {
            if (arr[i].kind == kind && arr[i].isCredit == isCredit) {
                tmp[k++] = arr[i];
            }
        }

        uint256 end = offset + limit;
        if (end > totalMatched) end = totalMatched;
        slice = new LedgerEntry[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            slice[i - offset] = tmp[i];
        }
    }

    function getTotalsByKind(
        address user,
        uint8 kind,
        bool isCredit
    ) external view returns (uint256 usdSum, uint256 ramaSum, uint256 count) {
        LedgerEntry[] storage arr = _ledger[user];
        for (uint256 i = 0; i < arr.length; i++) {
            if (arr[i].kind == kind && arr[i].isCredit == isCredit) {
                usdSum += arr[i].usdAmount;
                ramaSum += arr[i].ramaAmount;
                count++;
            }
        }
    }

    function getTotalsSince(
        address user,
        uint64 sinceTs,
        bool creditSide
    ) external view returns (uint256 usdSum, uint256 ramaSum, uint256 count) {
        LedgerEntry[] storage arr = _ledger[user];
        for (uint256 i = 0; i < arr.length; i++) {
            LedgerEntry storage e = arr[i];
            if (e.isCredit == creditSide && e.timestamp >= sinceTs) {
                usdSum += e.usdAmount;
                ramaSum += e.ramaAmount;
                count++;
            }
        }
    }

    // add this fucntion getWithdrawalHistorySlice
    function getWithdrawalHistorySlice(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (Withdrawals[] memory out) {
        Withdrawals[] storage arr = withdrawals[user];
        uint256 n = arr.length;
        if (offset >= n) return new Withdrawals[](0);

        uint256 end = offset + limit;
        if (end > n) end = n;

        out = new Withdrawals[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            out[i - offset] = arr[i];
        }
    }
}
