// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/ICoreConfig.sol";
import "./interfaces/IUserRegistry.sol";
import "./interfaces/IPortfolioManager.sol";

import "./libraries/OceanErrors.sol";
import "./libraries/FixedPoint.sol";
import "./interfaces/IRamaOracle.sol";

interface ISafeWalletForPM {
    function fundContract() external payable;
}

contract PortfolioManager is
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    IPortfolioManager
{
    using Address for address;
    using FixedPoint for uint256;
    // using IPortfolioManager.Portfolio;

    ICoreConfig public cfg;
    // IERC20 public RAMA;
    IUserRegistry public users;

    address public cappingManager;

    uint256 public constant WAD = 1e18;

    IPortfolioManager.Portfolio[] internal portfolios; // pid => data (pid starts at 1 with a dummy)
    mapping(address => uint256[]) public _portfoliosOf; // owner => pids

    // Booster tracking (window keyed off firstStakeAt)
    struct BoosterTrack {
        uint256 firstStakeAt; // when the user created their first portfolio
        uint256 directBusiness; // (legacy field, not used in new booster calc)
        uint32 directsCount; // (legacy field, not used in new booster calc)
    }
    mapping(address => BoosterTrack) public booster;

    // rates expressed per day in WAD

    uint256 public dailyRateTier0; // 0.33% normal
    uint256 public dailyRateTier1; // 0.40% normal
    uint256 public dailyRateBoosterTier0; // 0.66%
    uint256 public dailyRateBoosterTier1; // 0.80%

    event NoteNew50Direct(
        address indexed referrer,
        address indexed direct,
        uint256 amountUSD
    );
    event BoosterRecomputed(
        address indexed user,
        uint256 capacityUSD,
        uint256 sumSelectedUSD,
        uint256[] selectedPids
    );

    // // day-based freeze intervals per pid
    mapping(uint256 => FreezeInterval[]) internal _freezeByPid;

    // pid => creation metadata (only for portfolios funded via SafeWallet entrypoints)
    struct SafeCreateInfo {
        uint256 pid;
        uint256 ramaAmount; // wei
        uint256 usdMicro; // 1e6
        address caller; // who paid in SafeWallet (self == beneficiary for createPortfolioFromSafe)
        address beneficiary; // portfolio owner
        uint64 createdAt; // block.timestamp
    }
    mapping(uint256 => SafeCreateInfo) public safeCreateByPid;
    mapping(address => uint256[]) public PortfoliosCreatedForOthers;

    // Indexes (for fast per-address queries)
    mapping(address => uint256[]) private _safeSelfPids; // user -> pids created by user for self (createPortfolioFromSafe)
    mapping(address => uint256[]) private _safeCallerPids; // caller -> pids created for others (createPortfolioForOthersFromSafe)
    mapping(address => uint256[]) private _safeReceivedPids; // beneficiary -> pids received from a caller (others)

    // mapping(address => uint256) public totalIncomeEarned;
    mapping(address => uint256) public totalIncomeEarnedUSD6;

    // Events
    event PortfolioCreatedFromSafe(
        address indexed user,
        uint256 indexed pid,
        uint256 ramaAmount,
        uint256 usdMicro
    );

    event PortfolioCreatedForOthersFromSafe(
        address indexed caller,
        address indexed beneficiary,
        uint256 indexed pid,
        uint256 ramaAmount,
        uint256 usdMicro
    );

    event FreezeIntervalOpened(uint256 indexed pid, uint32 startDay);
    event FreezeIntervalClosed(
        uint256 indexed pid,
        uint32 startDay,
        uint32 endDay
    );
    event BoosterActivated(
        address indexed activated_for,
        uint256 portfolioAmount,
        uint256 boosterPercentage,
        uint256 activatedAt
    );

    function initialize(address _cfg) external initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        cfg = ICoreConfig(_cfg);
        users = IUserRegistry(cfg.userRegistry());

        dailyRateTier0 = 33e14; // 0.33%
        dailyRateTier1 = 40e14; // 0.40%
        dailyRateBoosterTier0 = 66e14; // 0.66%
        dailyRateBoosterTier1 = 80e14; // 0.80%

        // push dummy so pids start at 1
        portfolios.push();
    }

    function _todayId() internal view returns (uint32) {
        return uint32(block.timestamp / 1 days);
    }

    modifier onlyRegistered() {
        require(users.isRegistered(msg.sender), OceanErrors.NotRegistered);
        _;
    }

    modifier onlyIncomeSource() {
        address s = msg.sender;

        require(
            s == cfg.incomeDistributor() ||
                s == cfg.slabManager() ||
                s == cfg.rewardVault() || // remove if not present in CoreConfig
                s == cfg.safeWallet(), // keep only if SafeWallet credits incomes
            "NOT_INCOME_SOURCE"
        );
        _;
    }

    // function checkWhetherUserIsRegistered() external view returns (bool) {
    //     return users.isRegistered(msg.sender);
    // }

    function setContracts(address _cfg) external onlyOwner {
        cfg = ICoreConfig(_cfg);
        users = IUserRegistry(cfg.userRegistry());
        cappingManager = cfg.cappingIncomeManager();
    }

    function _ramaOfUsd(uint256 ramaAmount) internal view returns (uint256) {
        uint256 priceMicroUSD = IRamaOracle(cfg.priceOracle()).ramaToUSD(
            ramaAmount
        ); // 1e6 = $1.000000
        require(priceMicroUSD > 0, "Invalid oracle price");
        return priceMicroUSD;
    }

    function _usdOfRama(uint256 usdAmount) internal view returns (uint256) {
        uint256 finalAmount = IRamaOracle(cfg.priceOracle()).usdToRama(
            usdAmount
        );

        require(finalAmount > 0, "Invalid oracle price");

        return finalAmount;
    }

    function _readRamaPriceMicroUSD() internal view returns (uint256) {
        uint256 priceMicroUSD = IRamaOracle(cfg.priceOracle()).ramaPriceInUSD(); // e.g., 2_000_000 = $2.000000
        require(priceMicroUSD > 0, "Invalid oracle price");
        // convert micro-USD (1e6) -> 18-decimals

        return priceMicroUSD;
    }

    function getPackageValueInRAMA(
        uint256 usdAmount
    ) external view returns (uint256) {
        return _usdOfRama(usdAmount);
    }

    function getPackageValueInUSD(
        uint256 ramaAmount
    ) external view returns (uint256) {
        return _ramaOfUsd(ramaAmount);
    }

    function _tier(uint256 usdAmount) internal pure returns (uint8) {
        return usdAmount >= 5000e18 ? 1 : 0;
    }

    function _rate(bool booster_, uint8 tier_) internal view returns (uint256) {
        if (tier_ == 1)
            return booster_ ? dailyRateBoosterTier1 : dailyRateTier1;
        return booster_ ? dailyRateBoosterTier0 : dailyRateTier0;
    }

    function RegisterAndActivate(
        address referrer
    ) external payable returns (uint256 pid) {
        // require user to not be registered yet
        require(!users.isRegistered(msg.sender), OceanErrors.AlreadyRegistered);
        uint256 ramaWei = msg.value;
        // require(usdAmount > 0, OceanErrors.Insufficient);
        require(ramaWei > 0, "insufficient RAMA sent");

        // Convert sent RAMA → USD (micro-USD, 1e6)
        uint256 usdMicro = _ramaOfUsd(ramaWei);

        // Min stake check: cfg.getUSDMinStake() must be micro-USD (1e6)
        require(usdMicro >= cfg.getUSDMinStake(), "below min stake");

        // if not registered, register first
        if (!users.isRegistered(msg.sender)) {
            (bool okReg, ) = cfg.userRegistry().call(
                abi.encodeWithSignature(
                    "registerUser(address,address)",
                    referrer,
                    msg.sender
                )
            );
            require(okReg, "USER_REG_FAIL");
        }

        // Move native RAMA to Treasury (70%) and SafeWallet (30%) via fundContract
        uint256 safeWalletAmount = (ramaWei * 30) / 100;
        uint256 treasuryAmount = ramaWei - safeWalletAmount;

        address payable treasury = payable(cfg.treasury());
        (bool sentToTreasury, ) = treasury.call{value: treasuryAmount}("");
        require(sentToTreasury, "TREASURY_DEPOSIT_FAIL");

        // Call SafeWallet's fundContract function to deposit the 30%
        // The fundContract function itself will handle the require for success
        ISafeWalletForPM(payable(cfg.safeWallet())).fundContract{
            value: safeWalletAmount
        }();

        // determine tier

        uint8 tr = _tierUSD6(usdMicro);
        // uint8 tr = 1;

        Portfolio memory p = Portfolio({
            principal: uint128(ramaWei),
            principalUsd: uint128(usdMicro), // <--- NEW: store USD principal once
            credited: 0,
            createdAt: uint64(block.timestamp),
            lastAccrual: uint64(block.timestamp),
            frozenUntil: 0,
            booster: false, // recomputed later (per your booster knapsack) _recomputeBoosterFor(msg.sender)
            tier: tr,
            capPct: 200, // default; may turn 250 if booster-selected
            owner: msg.sender,
            activatedBy: msg.sender,
            boosterActivationDate: 0,
            isCapped: false,
            isClosed: false,
            cappedAt: 0,
            closedAt: 0,
            totalReceivedBoosterROI: 0,
            isActivatedFromSafeWallet: false
        });

        portfolios.push(p);
        _maybeRollBoosterWindowOnNewSelfPortfolio(
            msg.sender,
            uint64(block.timestamp)
        );

        pid = portfolios.length - 1;
        _portfoliosOf[msg.sender].push(pid);

        // start 10-day window if this is the first stake
        if (booster[msg.sender].firstStakeAt == 0) {
            booster[msg.sender].firstStakeAt = block.timestamp;
        }

        emit PortfolioCreated(msg.sender, pid, ramaWei, tr);

        // // Direct 5% income
        (bool ok, ) = cfg.incomeDistributor().call(
            abi.encodeWithSignature(
                "recordDirectIncome(address,address,uint256,uint256,uint256)",
                users.getReferrer(msg.sender),
                msg.sender,
                p.principal,
                p.principalUsd,
                pid
            )
        );

        require(ok, "DIRECT_INCOME_FAIL");

        // // $50 new direct note hook (for slab gate)
        // // $50 micro-USD check
        address upline = users.getReferrer(msg.sender);
        if (usdMicro >= 50e6 && upline != address(0)) {
            (bool ok2, ) = cfg.slabManager().call(
                abi.encodeWithSignature(
                    "noteNew50Direct(address)",
                    users.getReferrer(msg.sender)
                )
            );
            require(ok2, "SLAB_NOTE_FAIL");
            emit NoteNew50Direct(
                users.getReferrer(msg.sender),
                msg.sender,
                usdMicro
            );
        }

        // ===========================>

        // // Bubble business for slab qual (positive delta)
        (bool ok3, ) = cfg.slabManager().call(
            abi.encodeWithSignature(
                "onBusinessDelta(address,uint256,int256)",
                msg.sender,
                pid,
                uint256(usdMicro)
            )
        );
        require(ok3, "SLAB_BUS_ADD_FAIL");

        // ==============================================>
        // // --- Booster recompute ---
        // // 1) recompute for self (new item may be included in knapsack)
        _recomputeBoosterFor(msg.sender);

        // 2) recompute for referrer (this user is their direct; may improve their capacity T)
        // address upline = users.getReferrer(msg.sender);
        if (upline != address(0)) {
            _recomputeBoosterFor(upline);
        }
    }

    // --- external ---
    function createPortfolio()
        external
        payable
        onlyRegistered
        returns (uint256 pid)
    {
        // require user to be registered
        require(users.isRegistered(msg.sender), OceanErrors.NotRegistered);
        // add condition to check this portfolio is greater than previous one

        uint256 ramaWei = msg.value;
        // require(usdAmount > 0, OceanErrors.Insufficient);
        require(ramaWei > 0, "insufficient RAMA sent");

        // Convert sent RAMA → USD (micro-USD, 1e6)
        uint256 usdMicro = _ramaOfUsd(ramaWei);

        // Min stake check: cfg.getUSDMinStake() must be micro-USD (1e6)
        require(usdMicro >= cfg.getUSDMinStake(), "below min stake");

        // Add condition to check this portfolio is greater than the previous one
        uint256[] storage userPids = _portfoliosOf[msg.sender];
        if (userPids.length > 0) {
            uint256 lastPid = userPids[userPids.length - 1];
            Portfolio storage lastPortfolio = portfolios[lastPid];
            require(
                usdMicro >= lastPortfolio.principalUsd,
                "NEW_PORTFOLIO_MUST_BE_GREATER"
            );
        }

        // if not registered, register first

        // Move native RAMA to Treasury (70%) and SafeWallet (30%) via fundContract
        uint256 safeWalletAmount = (ramaWei * 30) / 100;
        uint256 treasuryAmount = ramaWei - safeWalletAmount;

        address payable treasury = payable(cfg.treasury());
        (bool sentToTreasury, ) = treasury.call{value: treasuryAmount}("");
        require(sentToTreasury, "TREASURY_DEPOSIT_FAIL");

        // Call SafeWallet's fundContract function to deposit the 30%
        // The fundContract function itself will handle the require for success
        ISafeWalletForPM(payable(cfg.safeWallet())).fundContract{
            value: safeWalletAmount
        }();

        // determine tier

        uint8 tr = _tierUSD6(usdMicro);
        // uint8 tr = 1;

        Portfolio memory p = Portfolio({
            principal: uint128(ramaWei),
            principalUsd: uint128(usdMicro), // <--- NEW: store USD principal once
            credited: 0,
            createdAt: uint64(block.timestamp),
            lastAccrual: uint64(block.timestamp),
            frozenUntil: 0,
            booster: false, // recomputed later (per your booster knapsack) _recomputeBoosterFor(msg.sender)
            tier: tr,
            capPct: 200, // default; may turn 250 if booster-selected
            owner: msg.sender,
            activatedBy: msg.sender,
            boosterActivationDate: 0,
            isCapped: false,
            isClosed: false,
            cappedAt: 0,
            closedAt: 0,
            totalReceivedBoosterROI: 0,
            isActivatedFromSafeWallet: false
        });

        portfolios.push(p);
        _maybeRollBoosterWindowOnNewSelfPortfolio(
            msg.sender,
            uint64(block.timestamp)
        );

        pid = portfolios.length - 1;
        _portfoliosOf[msg.sender].push(pid);

        // start 10-day window if this is the first stake
        if (booster[msg.sender].firstStakeAt == 0) {
            booster[msg.sender].firstStakeAt = block.timestamp;
        }

        emit PortfolioCreated(msg.sender, pid, ramaWei, tr);

        // // Direct 5% income
        (bool ok, ) = cfg.incomeDistributor().call(
            abi.encodeWithSignature(
                "recordDirectIncome(address,address,uint256,uint256,uint256)",
                users.getReferrer(msg.sender),
                msg.sender,
                p.principal,
                p.principalUsd,
                pid
            )
        );

        require(ok, "DIRECT_INCOME_FAIL");

        // // $50 new direct note hook (for slab gate)
        // // $50 micro-USD check
        address upline = users.getReferrer(msg.sender);
        if (usdMicro >= 50e6 && upline != address(0)) {
            (bool ok2, ) = cfg.slabManager().call(
                abi.encodeWithSignature(
                    "noteNew50Direct(address)",
                    users.getReferrer(msg.sender)
                )
            );
            require(ok2, "SLAB_NOTE_FAIL");
            emit NoteNew50Direct(
                users.getReferrer(msg.sender),
                msg.sender,
                usdMicro
            );
        }

        // ===========================>

        // // Bubble business for slab qual (positive delta)
        (bool ok3, ) = cfg.slabManager().call(
            abi.encodeWithSignature(
                "onBusinessDelta(address,uint256,int256)",
                msg.sender,
                pid,
                uint256(usdMicro)
            )
        );
        require(ok3, "SLAB_BUS_ADD_FAIL");

        // ==============================================>
        // // --- Booster recompute ---
        // // 1) recompute for self (new item may be included in knapsack)
        _recomputeBoosterFor(msg.sender);

        // 2) recompute for referrer (this user is their direct; may improve their capacity T)
        // address upline = users.getReferrer(msg.sender);
        if (upline != address(0)) {
            _recomputeBoosterFor(upline);
        }
    }

    function createPortfolioForOthers(
        address toBeActivatedUSer,
        address referrer
    ) external payable onlyRegistered returns (uint256 pid) {
        // require user to be registered
        require(users.isRegistered(msg.sender), OceanErrors.NotRegistered);
        // require(
        //     users.isRegistered(toBeActivatedUSer),
        //     OceanErrors.ToBeActivatedUserAlreadyRegistered
        // );
        uint256 ramaWei = msg.value;
        // require(usdAmount > 0, OceanErrors.Insufficient);
        require(ramaWei > 0, "insufficient RAMA sent");

        // Convert sent RAMA → USD (micro-USD, 1e6)
        uint256 usdMicro = _ramaOfUsd(ramaWei);

        // Min stake check: cfg.getUSDMinStake() must be micro-USD (1e6)
        require(usdMicro >= cfg.getUSDMinStake(), "below min stake");

        // if not registered, register first

        if (!users.isRegistered(toBeActivatedUSer)) {
            (bool okReg, ) = cfg.userRegistry().call(
                abi.encodeWithSignature(
                    "registerUser(address,address)",
                    referrer,
                    toBeActivatedUSer
                )
            );
            require(okReg, "USER_REG_FAIL");
        }

        uint256[] storage userPids = _portfoliosOf[toBeActivatedUSer];
        if (userPids.length > 0) {
            uint256 lastPid = userPids[userPids.length - 1];
            Portfolio storage lastPortfolio = portfolios[lastPid];
            require(
                usdMicro >= lastPortfolio.principalUsd,
                "NEW_PORTFOLIO_MUST_BE_GREATER"
            );
        }

        // Move native RAMA to Treasury (70%) and SafeWallet (30%) via fundContract
        uint256 safeWalletAmount = (ramaWei * 30) / 100;
        uint256 treasuryAmount = ramaWei - safeWalletAmount;

        address payable treasury = payable(cfg.treasury());
        (bool sentToTreasury, ) = treasury.call{value: treasuryAmount}("");
        require(sentToTreasury, "TREASURY_DEPOSIT_FAIL");

        // Call SafeWallet's fundContract function to deposit the 30%
        // The fundContract function itself will handle the require for success
        ISafeWalletForPM(payable(cfg.safeWallet())).fundContract{
            value: safeWalletAmount
        }();

        // determine tier

        uint8 tr = _tierUSD6(usdMicro);
        // uint8 tr = 1;

        Portfolio memory p = Portfolio({
            principal: uint128(ramaWei),
            principalUsd: uint128(usdMicro), // <--- NEW: store USD principal once
            credited: 0,
            createdAt: uint64(block.timestamp),
            lastAccrual: uint64(block.timestamp),
            frozenUntil: 0,
            booster: false, // recomputed later (per your booster knapsack) _recomputeBoosterFor(msg.sender)
            tier: tr,
            capPct: 200, // default; may turn 250 if booster-selected
            owner: toBeActivatedUSer,
            boosterActivationDate: 0,
            isCapped: false,
            isClosed: false,
            cappedAt: 0,
            closedAt: 0,
            totalReceivedBoosterROI: 0,
            activatedBy: msg.sender,
            isActivatedFromSafeWallet: false
        });

        portfolios.push(p);
        // _maybeRollBoosterWindowOnNewSelfPortfolio(
        //     user,
        //     uint64(block.timestamp)
        // );

        _maybeRollBoosterWindowOnNewSelfPortfolio(
            toBeActivatedUSer,
            uint64(block.timestamp)
        );

        pid = portfolios.length - 1;
        _portfoliosOf[toBeActivatedUSer].push(pid);

        // start 10-day window if this is the first stake
        if (booster[toBeActivatedUSer].firstStakeAt == 0) {
            booster[toBeActivatedUSer].firstStakeAt = block.timestamp;
        }

        emit PortfolioCreated(toBeActivatedUSer, pid, ramaWei, tr);
        PortfoliosCreatedForOthers[msg.sender].push(pid);
        // // Direct 5% income
        (bool ok, ) = cfg.incomeDistributor().call(
            abi.encodeWithSignature(
                "recordDirectIncome(address,address,uint256,uint256,uint256)",
                users.getReferrer(toBeActivatedUSer),
                toBeActivatedUSer,
                p.principal,
                p.principalUsd,
                pid
            )
        );

        // ISafeWallet(cfg.safeWallet()).creditGeneral(
        //     users.getReferrer(msg.sender),
        //     ISafeWallet.TxKind.DirectIncome,
        //     usdAmount, // if computed from oracle; else 0
        //     ramaAmount, // RAMA wei commission
        //     bytes32(portfolioId) // memo: pid encoded in 32 bytes
        // );

        require(ok, "DIRECT_INCOME_FAIL");

        // // $50 new direct note hook (for slab gate)
        // // $50 micro-USD check
        address upline = users.getReferrer(toBeActivatedUSer);
        if (usdMicro >= 50e6 && upline != address(0)) {
            (bool ok2, ) = cfg.slabManager().call(
                abi.encodeWithSignature(
                    "noteNew50Direct(address)",
                    users.getReferrer(toBeActivatedUSer)
                )
            );
            require(ok2, "SLAB_NOTE_FAIL");
            emit NoteNew50Direct(
                users.getReferrer(toBeActivatedUSer),
                toBeActivatedUSer,
                usdMicro
            );
        }

        // ===========================>

        // // Bubble business for slab qual (positive delta)
        (bool ok3, ) = cfg.slabManager().call(
            abi.encodeWithSignature(
                "onBusinessDelta(address,uint256,int256)",
                toBeActivatedUSer,
                pid,
                uint256(usdMicro)
            )
        );
        require(ok3, "SLAB_BUS_ADD_FAIL");

        // ==============================================>
        // // --- Booster recompute ---
        // // 1) recompute for self (new item may be included in knapsack)
        _recomputeBoosterFor(toBeActivatedUSer);

        // 2) recompute for referrer (this user is their direct; may improve their capacity T)
        // address upline = users.getReferrer(msg.sender);
        if (upline != address(0)) {
            _recomputeBoosterFor(upline);
        }
    }

    // safe portfolio creation

    // Add this near your other modifiers
    modifier onlySafeWallet() {
        require(msg.sender == cfg.safeWallet(), "NOT_SAFEWALLET");
        _;
    }

    function createPortfolioFromSafe(
        address user,
        uint256 ramaAmount
    ) external onlySafeWallet returns (uint256 pid) {
        // require(msg.sender == cfg.safeWallet(), "NOT_SAFEWALLET");
        require(user != address(0), OceanErrors.ZeroAddress);
        require(ramaAmount > 0, OceanErrors.Insufficient);

        require(users.isRegistered(user), "USER_NOT_REGISTERED");

        // Convert RAMA→USD (micro-USD, 1e6)
        uint256 usdMicro = _ramaOfUsd(ramaAmount);
        require(usdMicro >= cfg.getUSDMinStake(), "below min stake");

        uint256[] storage userPids = _portfoliosOf[user];
        if (userPids.length > 0) {
            uint256 lastPid = userPids[userPids.length - 1];
            Portfolio storage lastPortfolio = portfolios[lastPid];
            require(
                usdMicro >= lastPortfolio.principalUsd,
                "NEW_PORTFOLIO_MUST_BE_GREATER"
            );
        }

        // Create portfolio
        Portfolio memory p = Portfolio({
            principal: uint128(ramaAmount),
            principalUsd: uint128(usdMicro),
            credited: 0,
            createdAt: uint64(block.timestamp),
            lastAccrual: uint64(block.timestamp),
            frozenUntil: 0,
            booster: false,
            tier: _tierUSD6(usdMicro), // 0 or 1
            capPct: 200, // default; booster may lift to 250 after recompute
            owner: user,
            activatedBy: user,
            boosterActivationDate: 0,
            isCapped: false,
            isClosed: false,
            cappedAt: 0,
            closedAt: 0,
            totalReceivedBoosterROI: 0,
            isActivatedFromSafeWallet: true
        });

        portfolios.push(p);
        _maybeRollBoosterWindowOnNewSelfPortfolio(
            user,
            uint64(block.timestamp)
        );

        pid = portfolios.length - 1;
        _portfoliosOf[user].push(pid);

        // Start booster window if first-ever portfolio for this user
        if (booster[user].firstStakeAt == 0) {
            booster[user].firstStakeAt = block.timestamp;
        }

        emit PortfolioCreated(user, pid, ramaAmount, p.tier);

        // --- TRACK SAFE SELF ---
        safeCreateByPid[pid] = SafeCreateInfo({
            pid: pid,
            ramaAmount: ramaAmount,
            usdMicro: usdMicro,
            caller: user, // self == beneficiary
            beneficiary: user,
            createdAt: uint64(block.timestamp)
        });
        _safeSelfPids[user].push(pid);
        _safeReceivedPids[user].push(pid);

        emit PortfolioCreatedFromSafe(user, pid, ramaAmount, usdMicro);

        // Direct income (5%) record to IncomeDistributor (uses USD+RAMA+pid)
        (bool ok, ) = cfg.incomeDistributor().call(
            abi.encodeWithSignature(
                "recordDirectIncome(address,address,uint256,uint256,uint256)",
                users.getReferrer(user),
                user,
                p.principal,
                p.principalUsd,
                pid
            )
        );
        require(ok, "DIRECT_INCOME_FAIL");

        // $50 new-direct note (for Slab gates)
        address upline = users.getReferrer(user);
        if (usdMicro >= 50e6 && upline != address(0)) {
            (bool ok2, ) = cfg.slabManager().call(
                abi.encodeWithSignature("noteNew50Direct(address)", upline)
            );
            require(ok2, "SLAB_NOTE_FAIL");
            emit NoteNew50Direct(upline, user, usdMicro);
        }

        // Bubble business up the tree (positive delta, micro-USD)
        (bool ok3, ) = cfg.slabManager().call(
            abi.encodeWithSignature(
                "onBusinessDelta(address,uint256,int256)",
                user,
                pid,
                int256(uint256(usdMicro))
            )
        );
        require(ok3, "SLAB_BUS_ADD_FAIL");

        // Booster recompute for user + upline
        _recomputeBoosterFor(user);
        if (upline != address(0)) {
            _recomputeBoosterFor(upline);
        }
    }

    function createPortfolioForOthersFromSafe(
        address caller, // <--- NEW: real sponsor
        address beneficiary,
        uint256 ramaAmount,
        address referrer
    ) external onlySafeWallet returns (uint256 pid) {
        // require(msg.sender == cfg.safeWallet(), "NOT_SAFEWALLET");
        require(beneficiary != address(0), OceanErrors.ZeroAddress);
        require(ramaAmount > 0, OceanErrors.Insufficient);

        // Ensure beneficiary registered (with provided referrer)
        if (!users.isRegistered(beneficiary)) {
            (bool okReg, ) = cfg.userRegistry().call(
                abi.encodeWithSignature(
                    "registerUser(address,address)",
                    referrer,
                    beneficiary
                )
            );
            require(okReg, "USER_REG_FAIL");
        }

        // Convert RAMA→USD (micro-USD)
        uint256 usdMicro = _ramaOfUsd(ramaAmount);
        require(usdMicro >= cfg.getUSDMinStake(), "below min stake");

        uint256[] storage userPids = _portfoliosOf[beneficiary];
        if (userPids.length > 0) {
            uint256 lastPid = userPids[userPids.length - 1];
            Portfolio storage lastPortfolio = portfolios[lastPid];
            require(
                usdMicro >= lastPortfolio.principalUsd,
                "NEW_PORTFOLIO_MUST_BE_GREATER"
            );
        }

        // Create portfolio owned by beneficiary; record sponsor in `activatedBy`
        Portfolio memory p = Portfolio({
            principal: uint128(ramaAmount),
            principalUsd: uint128(usdMicro),
            credited: 0,
            createdAt: uint64(block.timestamp),
            lastAccrual: uint64(block.timestamp),
            frozenUntil: 0,
            booster: false,
            tier: _tierUSD6(usdMicro),
            capPct: 200,
            owner: beneficiary,
            activatedBy: caller, // <--- store real sponsor
            boosterActivationDate: 0,
            isCapped: false,
            isClosed: false,
            cappedAt: 0,
            closedAt: 0,
            totalReceivedBoosterROI: 0,
            isActivatedFromSafeWallet: true
        });

        portfolios.push(p);
        _maybeRollBoosterWindowOnNewSelfPortfolio(
            beneficiary,
            uint64(block.timestamp)
        );
        pid = portfolios.length - 1;
        _portfoliosOf[beneficiary].push(pid);

        if (booster[beneficiary].firstStakeAt == 0) {
            booster[beneficiary].firstStakeAt = block.timestamp;
        }

        emit PortfolioCreated(beneficiary, pid, ramaAmount, p.tier);

        // --- SAFE OTHERS TRACKING ---
        safeCreateByPid[pid] = SafeCreateInfo({
            pid: pid,
            ramaAmount: ramaAmount,
            usdMicro: usdMicro,
            caller: caller, // <--- sponsor persisted in audit record
            beneficiary: beneficiary,
            createdAt: uint64(block.timestamp)
        });
        _safeCallerPids[caller].push(pid);
        _safeReceivedPids[beneficiary].push(pid);
        PortfoliosCreatedForOthers[caller].push(pid);

        emit PortfolioCreatedForOthersFromSafe(
            caller,
            beneficiary,
            pid,
            ramaAmount,
            usdMicro
        );

        // Direct income for beneficiary’s upline
        (bool ok, ) = cfg.incomeDistributor().call(
            abi.encodeWithSignature(
                "recordDirectIncome(address,address,uint256,uint256,uint256)",
                users.getReferrer(beneficiary),
                beneficiary,
                p.principal,
                p.principalUsd,
                pid
            )
        );
        require(ok, "DIRECT_INCOME_FAIL");

        // $50 new-direct gate
        address upline = users.getReferrer(beneficiary);
        if (usdMicro >= 50e6 && upline != address(0)) {
            (bool ok2, ) = cfg.slabManager().call(
                abi.encodeWithSignature("noteNew50Direct(address)", upline)
            );
            require(ok2, "SLAB_NOTE_FAIL");
            emit NoteNew50Direct(upline, beneficiary, usdMicro);
        }

        // Bubble team business
        (bool ok3, ) = cfg.slabManager().call(
            abi.encodeWithSignature(
                "onBusinessDelta(address,uint256,int256)",
                beneficiary,
                pid,
                int256(uint256(usdMicro))
            )
        );
        require(ok3, "SLAB_BUS_ADD_FAIL");

        // Booster recompute for beneficiary + upline
        _recomputeBoosterFor(beneficiary);
        if (upline != address(0)) {
            _recomputeBoosterFor(upline);
        }
    }

    function applyExit(uint256 pid) external {
        Portfolio storage p = portfolios[pid];

        require(p.owner == msg.sender, OceanErrors.NotAuthorized);
        require(p.frozenUntil == 0, OceanErrors.Frozen);

        p.frozenUntil = uint64(block.timestamp + 72 hours);
        emit ExitApplied(msg.sender, pid, p.frozenUntil);

        // record freeze interval start (day-based)
        _freezeByPid[pid].push(
            FreezeInterval({startDay: _todayId(), endDay: 0})
        );
        emit FreezeIntervalOpened(pid, _todayId());

        // notify FreezePolicy (unchanged)
        (bool ok, ) = cfg.freezePolicy().call(
            abi.encodeWithSignature(
                "onFreeze(address,uint256)",
                msg.sender,
                pid
            )
        );
        require(ok, "FREEZE_NOTE_FAIL");
    }

    function cancelExit(uint256 pid) external {
        Portfolio storage p = portfolios[pid];
        require(p.owner == msg.sender, OceanErrors.NotAuthorized);
        require(
            p.frozenUntil != 0 && block.timestamp < p.frozenUntil,
            "NO_ACTIVE_FREEZE"
        );

        p.frozenUntil = 0;
        p.lastAccrual = uint64(block.timestamp);
        emit ExitCancelled(msg.sender, pid);

        // close the last open interval
        FreezeInterval[] storage arr = _freezeByPid[pid];
        if (arr.length > 0 && arr[arr.length - 1].endDay == 0) {
            arr[arr.length - 1].endDay = _todayId(); // inclusive end at cancel day
            emit FreezeIntervalClosed(
                pid,
                arr[arr.length - 1].startDay,
                arr[arr.length - 1].endDay
            );
        }

        (bool ok, ) = cfg.freezePolicy().call(
            abi.encodeWithSignature(
                "onUnfreeze(address,uint256)",
                msg.sender,
                pid
            )
        );
        require(ok, "UNFREEZE_NOTE_FAIL");
    }

    function getPortfolio(
        uint256 pid
    ) external view override returns (Portfolio memory) {
        return portfolios[pid];
    }

    function hasActiveMin50(
        address user
    ) external view override returns (bool) {
        uint256[] memory pids = _portfoliosOf[user];
        if (pids.length == 0) return false;

        // uint256 priceMicro = _readRamaPriceWad(); // micro-USD per RAMA
        uint256 priceMicro = _readRamaPriceMicroUSD(); // micro-USD per RAMA
        if (priceMicro == 0) return false;

        // uint256 priceWad = _readRamaPriceWad();
        // if (priceWad == 0) return false;

        for (uint256 i = 0; i < pids.length; i++) {
            Portfolio memory p = portfolios[pids[i]];
            if (p.owner != user) continue;
            if (p.frozenUntil != 0 && block.timestamp <= p.frozenUntil)
                continue;

            uint256 cap = (uint256(p.principal) * uint256(p.capPct)) / 100;
            if (uint256(p.credited) >= cap) continue;

            // uint256 principalUsd = (uint256(p.principal) * priceWad) / 1e18;
            // if (principalUsd >= 50e18) return true;

            // principalUsd in micro-USD = principal (wei) * priceMicro / 1e18
            uint256 principalUsdMicro = (uint256(p.principal) * priceMicro) /
                1e18;
            if (principalUsdMicro >= 50e6) return true; // $50.000000
        }
        return false;
    }

    // =========================
    // Booster core (private)
    // =========================

    function _maybeRollBoosterWindowOnNewSelfPortfolio(
        address u,
        uint64 createdAt
    ) internal {
        uint256 start = booster[u].firstStakeAt;
        if (start == 0) {
            booster[u].firstStakeAt = createdAt;
            return;
        }
        if (createdAt > start + 10 days) {
            // previous window is closed; start a brand new rolling window at this activation
            booster[u].firstStakeAt = createdAt;
        }
    }

    function _isUserBoosterActive(address u) internal view returns (bool) {
        uint256[] memory pids = _portfoliosOf[u];
        for (uint256 i = 0; i < pids.length; i++) {
            if (portfolios[pids[i]].owner == u && portfolios[pids[i]].booster) {
                return true;
            }
        }
        return false;
    }

    function _recomputeBoosterFor(address u) internal {
        uint256 start = booster[u].firstStakeAt;
        if (start == 0) return; // no active window yet
        uint256 end = start + 10 days;

        // Must have at least 5 directs (do not de-boost if fewer)
        address[] memory directs = users.getDirects(u);
        if (directs.length < 5) return;

        // --- Per-direct SUM inside the window (micro-USD) ---
        uint256 m = directs.length;
        uint256[] memory sumDirect = new uint256[](m);
        for (uint256 i = 0; i < m; i++) {
            address d = directs[i];
            uint256[] memory dpids = _portfoliosOf[d];
            uint256 s = 0;
            for (uint256 j = 0; j < dpids.length; j++) {
                Portfolio memory pd = portfolios[dpids[j]];
                if (pd.createdAt >= start && pd.createdAt <= end) {
                    s += uint256(pd.principalUsd);
                }
            }
            sumDirect[i] = s; // can be 0
        }

        // --- Collect ONLY u's portfolios created inside the window (eligible set) ---
        uint256[] memory upidsAll = _portfoliosOf[u];
        uint256 nAlloc = upidsAll.length;
        uint256[] memory pidBuf = new uint256[](nAlloc);
        uint256[] memory usdBuf = new uint256[](nAlloc);
        bool[] memory boostedBuf = new bool[](nAlloc);

        uint256 n = 0;
        for (uint256 i = 0; i < upidsAll.length; i++) {
            uint256 pid = upidsAll[i];
            Portfolio memory pU = portfolios[pid];
            if (pU.createdAt >= start && pU.createdAt <= end) {
                pidBuf[n] = pid;
                usdBuf[n] = uint256(pU.principalUsd); // micro-USD at creation
                boostedBuf[n] = pU.booster; // could already be boosted in this window
                n++;
            }
        }
        if (n == 0) return;

        assembly {
            mstore(pidBuf, n)
        }
        assembly {
            mstore(usdBuf, n)
        }
        assembly {
            mstore(boostedBuf, n)
        }

        // --- Sort eligible by USD ascending (stable enough for small n) ---
        for (uint256 i = 1; i < n; i++) {
            uint256 ku = usdBuf[i];
            uint256 kp = pidBuf[i];
            bool kb = boostedBuf[i];
            uint256 j = i;
            while (j > 0 && usdBuf[j - 1] > ku) {
                usdBuf[j] = usdBuf[j - 1];
                pidBuf[j] = pidBuf[j - 1];
                boostedBuf[j] = boostedBuf[j - 1];
                j--;
            }
            usdBuf[j] = ku;
            pidBuf[j] = kp;
            boostedBuf[j] = kb;
        }

        // --- Cumulative thresholds Tw[k] ---
        uint256[] memory T = new uint256[](n);
        for (uint256 i = 0; i < n; i++) {
            T[i] = (i == 0) ? usdBuf[0] : (T[i - 1] + usdBuf[i]);
        }

        // --- Precompute the 5th-largest direct sum (min of top-5) ---
        // Invariant after loop: top5 is ascending; top5[0] = 5th-largest (minimum among top-5).
        uint256[5] memory top5; // zeros are fine; we already ensured directs.length >= 5
        for (uint256 i = 0; i < m; i++) {
            uint256 v = sumDirect[i];
            if (v > top5[0]) {
                top5[0] = v;
                // bubble up to keep ascending order (small fixed loop = cheap)
                for (uint256 t = 0; t < 4; t++) {
                    if (top5[t] > top5[t + 1]) {
                        (top5[t], top5[t + 1]) = (top5[t + 1], top5[t]);
                    } else {
                        break;
                    }
                }
            }
        }
        uint256 fifthLargest = top5[0];

        // --- Determine which eligible pids can be boosted now (ascending scan) ---
        uint256[] memory selected = new uint256[](n);
        uint256 sel = 0;

        for (uint256 k = 0; k < n; k++) {
            if (boostedBuf[k]) continue; // already boosted in this window
            uint256 need = T[k];

            // NEW RULE: booster applies if ANY 5 directs each have sum >= need
            if (fifthLargest >= need) {
                selected[sel++] = pidBuf[k];
            }
        }
        assembly {
            mstore(selected, sel)
        }

        // --- Apply booster ONLY to selected pids (window-scoped; never turn others off) ---
        _applyBoosterSelection(u, 0, selected);

        // Emit summary info (capacity = highest satisfied Tw; sumSelected = sum of selected usd)
        uint256 sumSelectedUSD = 0;
        uint256 capacityUSD = 0;
        if (sel > 0) {
            // sum of selected usd
            for (uint256 x = 0; x < sel; x++) {
                uint256 spid = selected[x];
                for (uint256 y = 0; y < n; y++) {
                    if (pidBuf[y] == spid) {
                        sumSelectedUSD += usdBuf[y];
                    }
                }
            }
            // capacity = last threshold among picked
            uint256 running = 0;
            for (uint256 y = 0; y < n; y++) {
                running += usdBuf[y];
                bool picked = false;
                for (uint256 x = 0; x < sel; x++) {
                    if (selected[x] == pidBuf[y]) {
                        picked = true;
                        break;
                    }
                }
                if (picked) capacityUSD = running;
            }
        }

        emit BoosterRecomputed(u, capacityUSD, sumSelectedUSD, selected);
    }

    function _applyBoosterSelection(
        address u,
        uint256 /*unused*/,
        uint256[] memory selectedPids
    ) internal {
        if (selectedPids.length == 0) return;

        uint256 start = booster[u].firstStakeAt;
        uint256 end = start + 10 days;

        for (uint256 i = 0; i < selectedPids.length; i++) {
            uint256 pid = selectedPids[i];
            Portfolio storage p = portfolios[pid];

            // safety checks: correct owner + in active window
            if (p.owner != u) continue;
            if (!(p.createdAt >= start && p.createdAt <= end)) continue;

            if (p.booster && p.capPct == 250) continue; // already boosted

            p.booster = true;
            p.capPct = 250;
            p.boosterActivationDate = uint64(block.timestamp);

            emit BoosterActivated(p.owner, p.principal, 250, block.timestamp);
        }
    }

    function getUSDPrincipal(
        uint256 pid
    ) external view override returns (uint256) {
        return uint256(portfolios[pid].principalUsd);
    }

    function portfoliosOf(
        address user
    ) external view override returns (uint256[] memory) {
        return _portfoliosOf[user];
    }

    function _tierUSD6(uint256 usdMicro) internal pure returns (uint8) {
        // 5010e6 micro-USD = $5,010.00
        return usdMicro >= 5000e6 ? 1 : 0;
    }

    function getFreezeIntervalsCount(
        uint256 pid
    ) external view returns (uint256) {
        return _freezeByPid[pid].length;
    }

    function getFreezeIntervalsSlice(
        uint256 pid,
        uint256 offset,
        uint256 limit
    ) external view returns (FreezeInterval[] memory out) {
        FreezeInterval[] storage arr = _freezeByPid[pid];
        uint256 n = arr.length;
        if (offset >= n) return new FreezeInterval[](0);
        uint256 end = offset + limit;
        if (end > n) end = n;
        out = new FreezeInterval[](end - offset);
        for (uint256 i = offset; i < end; i++) out[i - offset] = arr[i];
    }

    // Paginated variant to keep responses light on-chain
    function getPortfoliosCreatedForOthersSlice(
        address caller,
        uint256 offset,
        uint256 limit
    ) external view returns (uint256[] memory slice) {
        uint256[] storage arr = PortfoliosCreatedForOthers[caller];
        uint256 n = arr.length;
        if (offset >= n) return new uint256[](0);

        uint256 end = offset + limit;
        if (end > n) end = n;

        slice = new uint256[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            slice[i - offset] = arr[i];
        }
    }

    // get total portfolio value of user in rama and usd

    function getTotalPortfolioValue(
        address user
    ) external view returns (uint256 totalRamaWei, uint256 totalUsdMicro) {
        uint256[] memory pids = _portfoliosOf[user];
        totalRamaWei = 0;
        totalUsdMicro = 0;
        for (uint256 i = 0; i < pids.length; i++) {
            Portfolio memory p = portfolios[pids[i]];
            if (p.owner == user) {
                totalRamaWei += uint256(p.principal);
                totalUsdMicro += uint256(p.principalUsd);
            }
        }
    }

    modifier onlyCappingManager() {
        require(msg.sender == cfg.cappingIncomeManager(), "NOT_CAP_MANAGER");

        _;
    }

    function pmIncreaseCredited(
        address user,
        uint256 pid,
        uint256 amountWei
    ) external onlyCappingManager returns (bool) {
        if (amountWei == 0) return false;
        Portfolio storage p = portfolios[pid];
        if (p.owner != user || p.isClosed) return false;

        p.credited += uint128(amountWei);
        p.lastAccrual = uint64(block.timestamp);
        emit Accrued(user, pid, amountWei);
        // (Optionally also SafeWallet credit here if you centralize it in PM)
        return true;
    }

    /// @notice Close a pid immediately due to per-portfolio cap (2x/2.5x).
    function pmCloseByCap(uint256 pid) external onlyCappingManager {
        Portfolio storage p = portfolios[pid];
        if (p.isClosed) return;
        p.isCapped = true;
        p.cappedAt = block.timestamp;
        p.isClosed = true;
        p.closedAt = block.timestamp;
        emit ExitApplied(p.owner, pid, p.closedAt); // or add a PortfolioClosed event
    }

    /// @notice Close a pid immediately due to sequential 4x rule.
    function pmCloseBy4x(uint256 pid) external onlyCappingManager {
        Portfolio storage p = portfolios[pid];
        if (p.isClosed) return;
        p.isClosed = true;
        p.closedAt = block.timestamp;
        emit ExitApplied(p.owner, pid, p.closedAt); // or a PortfolioClosed("SEQ_4X")
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
