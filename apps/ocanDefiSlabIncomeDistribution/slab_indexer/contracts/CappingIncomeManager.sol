// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IRamaOracle.sol";

interface IROIDistributorLike {
    function getUnclaimedROI(
        address user
    )
        external
        view
        returns (
            uint256 usdTotalMicro,
            uint256 ramaTotalWei,
            uint32 fromPeriod,
            uint32 lastPeriod,
            uint32 epochsCount
        );
}

interface IPortfolioManagerView {
    struct Portfolio {
        uint128 principal;
        uint128 principalUsd; // micro-USD (1e6)
        uint128 credited; // wei
        uint64 createdAt;
        uint64 lastAccrual;
        uint64 frozenUntil;
        bool booster;
        uint8 tier;
        uint8 capPct; // 200 or 250
        address owner;
        address activatedBy;
        uint64 boosterActivationDate;
        bool isCapped;
        bool isClosed;
        uint256 cappedAt;
        uint256 closedAt;
        uint256 totalReceivedBoosterROI;
        bool isActivatedFromSafeWallet;
    }

    function portfoliosOf(
        address user
    ) external view returns (uint256[] memory);
    function getPortfolio(uint256 pid) external view returns (Portfolio memory);
}

interface IPortfolioManagerAdmin is IPortfolioManagerView {
    function pmIncreaseCredited(
        address user,
        uint256 pid,
        uint256 amountWei
    ) external returns (bool);
    function pmCloseByCap(uint256 pid) external;
    function pmCloseBy4x(uint256 pid) external;
}

interface ICoreConfigLike {
    function incomeDistributor() external view returns (address);
    function slabManager() external view returns (address);
    function rewardVault() external view returns (address); // remove if not present
    function safeWallet() external view returns (address); // optional
    function priceOracle() external view returns (address);
    function cappingIncomeManager() external view returns (address);
    function roiDistributor() external view returns (address);
    function royaltyManager() external view returns (address);
    function userRegistry() external view returns (address);
}

interface IUserRegistry {
    function isTempDeactive(address user) external view returns (bool);
}

contract CappingIncomeManager is
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    ICoreConfigLike public cfg;
    IPortfolioManagerAdmin public pm;

    struct IncomeOverview {
        // earned (counted toward 4x)
        uint256 earnedUSD6_total;
        uint256 earnedUSD6_roi;
        uint256 earnedUSD6_direct;
        uint256 earnedUSD6_slab;
        uint256 earnedUSD6_slabOverride;
        // missed (not counted)
        uint256 missedUSD6_total;
        uint256 missedUSD6_roi;
        uint256 missedUSD6_direct;
        uint256 missedUSD6_slab;
        uint256 missedUSD6_slabOverride;
        // percentages on earned (x100 basis points of earned total)
        uint16 pctEarned_roi_bp;
        uint16 pctEarned_direct_bp;
        uint16 pctEarned_slab_bp;
        uint16 pctEarned_slabOverride_bp;
        // 4x progress
        uint256 nextThresholdUSD6;
        uint256 cumPrincipalUSD6;
        uint256 earnedSoFarUSD6;
        uint256 remainingToNextUSD6; // 0 if already >= next threshold or no open portfolios
    }

    struct PortfolioCapRow {
        uint256 pid;
        bool isClosed;
        bool isCapped;
        uint256 principalUSD6;
        uint8 capPct;
        uint256 capUSD6;
        uint256 creditedWei;
        uint256 creditedUSD6; // via oracle
        int256 remainingToCapUSD6; // capUSD6 - creditedUSD6 (can be negative if drift)
    }

    struct MissedIncomeRec {
        uint64 at;
        uint256 amountUSD6;
        bytes32 kind; // ROI, DIRECT, SLAB, SLAB_OVERRIDE
        uint256 pid; // portfolio id if applicable (0 for non-ROI)
        uint8 reason; // NO-OPEN-1//  CAP-2//  MISSED-3  //  TRIMMED-4//  NO-OPEN-5//  NO-OPEN-OR-TEMP-DEACTIVE-6//  UNKNOWN-7
    }

    struct Seq4xView {
        uint256 earnedUSD6;
        uint256[] pidsOrderedByCreatedAt;
        uint256[] prefixPrincipalUSD6;
        uint256[] thresholds4xUSD6;
        bool[] canCloseNow; // based on earnedUSD6 vs threshold
    }

    // All income counted for the 4x capping rule, in micro-USD (1e6)
    mapping(address => uint256) public totalIncomeEarnedUSD6;

    // ===== New: Per-kind earned and missed tracking =====
    // Kinds used in this contract. External callers pass `bytes32` kinds for non-ROI paths.
    bytes32 private constant KIND_ROI = bytes32("ROI");
    bytes32 private constant KIND_DIRECT = bytes32("DIRECT");
    bytes32 private constant KIND_SLAB = bytes32("SLAB");
    bytes32 private constant KIND_SLAB_OVERRIDE = bytes32("SLAB_OVERRIDE");
    bytes32 private constant KIND_ROYALTY = bytes32("ROYALTY");
    bytes32 private constant KIND_REWARD = bytes32("REWARD");

    // Per-kind earned sums (counted toward 4x) in micro-USD (1e6)
    mapping(address => mapping(bytes32 => uint256)) public earnedByKindUSD6;

    // Per-kind missed sums (not counted due to cap/4x) in micro-USD (1e6)
    mapping(address => uint256) public totalMissedUSD6;
    mapping(address => mapping(bytes32 => uint256)) public missedByKindUSD6;

    // Per-user missed income records (for audit)

    mapping(address => MissedIncomeRec[]) private _missed;

    event IncomeSourceSet(address indexed src, bool allowed);

    event RoiCredited(
        address indexed user,
        uint256 indexed pid,
        uint256 creditedWei
    );
    event ExternalIncomeNoted(
        address indexed user,
        uint256 amountUSD6,
        bytes32 kind
    );
    event MissedIncomeNoted(
        address indexed user,
        uint256 amountUSD6,
        bytes32 kind,
        uint256 pid,
        uint8 reason
    );
    event CapClosed(address indexed user, uint256 indexed pid, uint256 at);
    event Seq4xClosed(address indexed user, uint256 indexed pid, uint256 at);
    event RewardSent(
        address indexed user,
        uint256 amount1e18,
        uint256 amountUSD6
    );

    function initialize(address _cfg) external initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();

        require(_cfg != address(0), "CONFG:REQUIRED");
        cfg = ICoreConfigLike(_cfg);
        pm = IPortfolioManagerAdmin(cfg.cappingIncomeManager());
    }

    // ---------- Access control for who can push income ----------
    modifier onlyIncomeSource() {
        address s = msg.sender;
        require(
            s == cfg.incomeDistributor() ||
                s == cfg.roiDistributor() ||
                s == cfg.slabManager() ||
                s == cfg.rewardVault() ||
                s == cfg.safeWallet() ||
                s == cfg.royaltyManager(),
            "NOT_INCOME_SOURCE"
        );
        _;
    }

    // ---------- Views (pre-flight checks for payers) ----------

    function hasOpenPortfolio(address user) public view returns (bool) {
        uint256[] memory pids = pm.portfoliosOf(user);
        for (uint256 i = 0; i < pids.length; i++) {
            IPortfolioManagerView.Portfolio memory p = pm.getPortfolio(pids[i]);
            if (!p.isClosed) return true;
        }
        return false;
    }

    function getOpenAndNotCappedPids(
        address user
    ) external view returns (uint256[] memory out) {
        uint256[] memory pids = pm.portfoliosOf(user);
        uint256 n = 0;
        for (uint256 i = 0; i < pids.length; i++) {
            IPortfolioManagerView.Portfolio memory p = pm.getPortfolio(pids[i]);
            if (!p.isClosed && !p.isCapped) n++;
        }
        out = new uint256[](n);
        uint256 w = 0;
        for (uint256 i = 0; i < pids.length; i++) {
            IPortfolioManagerView.Portfolio memory p = pm.getPortfolio(pids[i]);
            if (!p.isClosed && !p.isCapped) out[w++] = pids[i];
        }
    }

    function remainingToCapUSD(uint256 pid) public view returns (uint256) {
        if (pid == 0) return 0;
        IPortfolioManagerView.Portfolio memory p = pm.getPortfolio(pid);
        if (p.isClosed) return 0;
        uint256 capUSD = (uint256(p.principalUsd) * uint256(p.capPct)) / 100;
        if (uint256(p.credited) >= capUSD) return 0;
        return capUSD - uint256(p.credited);
    }

    /// @return nextThresholdUSD6  4 * SUM(principalUsd up to first not-closed, oldest→newest)
    /// @return cumPrincipalUSD6   SUM(principalUsd up to that index)
    /// @return earnedUSD6         totalIncomeEarnedUSD6[user]
    function next4xThresholdUSD6(
        address user
    )
        external
        view
        returns (
            uint256 nextThresholdUSD6,
            uint256 cumPrincipalUSD6,
            uint256 earnedUSD6
        )
    {
        (nextThresholdUSD6, cumPrincipalUSD6) = _computeNext4xThreshold(user);
        earnedUSD6 = _earnedIncludingUnclaimedROI(user);
    }

    // ---------- Income push helpers (to be called by distributors) ----------

    /// @notice Credit ROI to a specific pid, clamped to remaining cap; updates 4x, runs closures.
    /// @return creditedWei the actual credited amount (0 if no room or closed)
    function creditROIFor(
        address user,
        uint256 pid,
        uint256 amountWei,
        uint256 amountUSD6
    ) external onlyIncomeSource returns (uint256 creditedWei) {
        if (pid == 0) return 0;

        // make it call by only roi distibutor
        require(msg.sender == cfg.roiDistributor(), "ONLY_ROI_DISTRIBUTOR");

        IPortfolioManagerView.Portfolio memory p = pm.getPortfolio(pid);
        if (amountUSD6 == 0) return 0;
        if (p.owner != user) return 0;
        if (p.isClosed) {
            // Entire ROI is missed because portfolio is closed
            // uint256 price0 = IRamaOracleLike(cfg.priceOracle())
            //     .ramaPriceInUSD();
            // uint256 missedUSD6_0 = (amountWei * price0) / 1e18;
            _noteMissed(user, amountUSD6, KIND_ROI, pid, 2);
            _closeBySequential4x(user);
            return 0;
        }

        uint256 room = remainingToCapUSD(pid);
        if (room == 0) {
            // No room left on this portfolio (already at cap) ⇒ all missed
            // uint256 price1 = IRamaOracleLike(cfg.priceOracle())
            //     .ramaPriceInUSD();
            // uint256 missedUSD6_1 = (amountWei * price1) / 1e18;
            _noteMissed(user, amountUSD6, KIND_ROI, pid, 2);
            _closeIfCapReached(pid); // defensive
            _closeBySequential4x(user); // defensive
            return 0;
        }
        // uint256 creditedUSD6 = amountUSD6 > room ? room : amountUSD6;

        creditedWei = amountUSD6 > room ? room : amountUSD6;

        // 1) increase credited in PM (emits Accrued there)
        bool ok = pm.pmIncreaseCredited(user, pid, creditedWei);
        if (!ok) return 0;

        emit RoiCredited(user, pid, creditedWei);

        // 2) update USD(1e6) tracker for 4x
        // uint256 price = IRamaOracleLike(cfg.priceOracle()).ramaPriceInUSD(); // micro-USD per RAMA
        uint256 asUSD6 = creditedWei;
        _noteEarned(user, asUSD6, KIND_ROI);

        // If some portion was trimmed because of cap, record it as missed
        if (amountUSD6 > creditedWei) {
            // uint256 trimmedWei = amountWei - creditedWei;
            uint256 trimmedWei = amountUSD6 - creditedWei;
            // uint256 missedUSD6 = (trimmedWei * price) / 1e18;
            uint256 missedUSD6 = trimmedWei;
            _noteMissed(user, missedUSD6, KIND_ROI, pid, 3);
        }

        // 3) closures
        if (_closeIfCapReached(pid)) {
            emit CapClosed(user, pid, block.timestamp);
        }
        _closeBySequential4x(user);
    }

    function safeRewardCheckAndCredit(
        address user,
        uint256 pid,
        uint256 amountUSD6,
        uint256 rewardUSD6
    ) external onlyIncomeSource returns (bool invoked) {
        // if (!hasOpenPortfolio(user)) return false;
        address rv = cfg.rewardVault();
        if (rv == address(0) || amountUSD6 == 0) return false;

        // amount in rama
        uint256 amountRAMA = IRamaOracle(cfg.priceOracle()).usdToRama(
            rewardUSD6
        );

        (bool okRV, ) = rv.call(
            abi.encodeWithSignature(
                "checkAndCredit(address,uint256,uint256)",
                user,
                pid,
                amountUSD6
            )
        );

        require(okRV, "REWARD_CHECK_FAIL");

        if (okRV) {
            // _noteEarned(user, rewardUSD6, KIND_REWARD);
            emit RewardSent(user, amountRAMA, rewardUSD6);
            // return true;
        }

        // Treat reward vault credits as SLAB-typed incomes into the 4x tracker
        if (
            !hasOpenPortfolio(user) ||
            IUserRegistry(cfg.userRegistry()).isTempDeactive(user)
        ) {
            _noteMissed(user, rewardUSD6, KIND_REWARD, pid, 1);
            _closeBySequential4x(user);
            return false;
        }

        return true;
    }

    /// @notice Count non-ROI incomes (Direct/Slab/Override) in USD(1e6); clamp to remaining 4x room; skip if user has no open pids.
    function tryNoteIncomeUSD6(
        address user,
        uint256 pid,
        uint256 amountUSD6,
        bytes32 kind
    ) external onlyIncomeSource returns (bool accepted, uint256 credited) {
        if (user == address(0) || amountUSD6 == 0) return (false, 0);

        if (
            !hasOpenPortfolio(user) ||
            IUserRegistry(cfg.userRegistry()).isTempDeactive(user)
        ) {
            _noteMissed(user, amountUSD6, _normalizeKind(kind), pid, 6);

            _closeBySequential4x(user);
            return (false, 0);
        }

        // Clamp to remaining room until next sequential 4x threshold
        (uint256 nextTh, ) = _computeNext4xThreshold(user);
        // uint256 earned = totalIncomeEarnedUSD6[user];
        uint256 earned = _earnedIncludingUnclaimedROI(user);        
        uint256 room = nextTh > earned ? (nextTh - earned) : 0;

        bytes32 nkind = _normalizeKind(kind);

        if (room == 0) {
            // No room left under 4x; entire amount is missed
            _noteMissed(user, amountUSD6, nkind, pid, 2);
            _closeBySequential4x(user);
            return (false, 0);
        }

        uint256 credit = amountUSD6 <= room ? amountUSD6 : room;
        uint256 trimmed = amountUSD6 - credit;

        if (credit > 0) {
            _noteEarned(user, credit, nkind);
            emit ExternalIncomeNoted(user, credit, nkind);
        }
        if (trimmed > 0) {
            // Record trimmed portion as missed (TRIMMED)
            _noteMissed(user, trimmed, nkind, pid, 4);
        }

        _closeBySequential4x(user);
        return (true, credit);
    }

    /// @notice Same as above, but sends wei and converts to USD(1e6) on the fly.
    function tryNoteIncomeWei(
        address user,
        uint256 amountWei,
        bytes32 kind
    ) external onlyIncomeSource returns (bool accepted) {
        if (user == address(0) || amountWei == 0) return false;
        uint256 price = IRamaOracle(cfg.priceOracle()).ramaPriceInUSD();
        uint256 asUSD6 = (amountWei * price) / 1e18;
        if (!hasOpenPortfolio(user)) {
            _noteMissed(user, asUSD6, _normalizeKind(kind), 0, 1);
            _closeBySequential4x(user);
            return false;
        }

        _noteEarned(user, asUSD6, _normalizeKind(kind));
        emit ExternalIncomeNoted(user, asUSD6, kind);

        _closeBySequential4x(user);
        return true;
    }

    // ---------- Internal: closures ----------

    /// @dev Close-by-cap if credited >= 2x/2.5x. Returns true if closed now.
    function _closeIfCapReached(uint256 pid) internal returns (bool) {
        IPortfolioManagerView.Portfolio memory p = pm.getPortfolio(pid);
        if (p.isClosed) return false;
        uint256 capWei = (uint256(p.principal) * uint256(p.capPct)) / 100;
        if (uint256(p.credited) >= capWei) {
            pm.pmCloseByCap(pid);
            return true;
        }
        return false;
    }

    /// @dev Sequential 4x: oldest→newest; close as long as totalIncomeEarnedUSD6[user] >= 4 * prefix principalUsd.
    function _closeBySequential4x(address user) internal {
        uint256[] memory pids = pm.portfoliosOf(user);
        if (pids.length == 0) return;

        // Build arrays
        uint256 n = pids.length;
        uint256[] memory pidBuf = new uint256[](n);
        uint64[] memory tsBuf = new uint64[](n);
        uint256[] memory usdBuf = new uint256[](n);
        bool[] memory closedBuf = new bool[](n);

        for (uint256 i = 0; i < n; i++) {
            uint256 pid = pids[i];
            IPortfolioManagerView.Portfolio memory p = pm.getPortfolio(pid);
            pidBuf[i] = pid;
            tsBuf[i] = p.createdAt;
            usdBuf[i] = uint256(p.principalUsd); // micro-USD
            closedBuf[i] = p.isClosed;
        }

        // Sort by createdAt asc
        for (uint256 i = 1; i < n; i++) {
            uint256 kPid = pidBuf[i];
            uint64 kTs = tsBuf[i];
            uint256 kUsd = usdBuf[i];
            bool kCl = closedBuf[i];
            uint256 j = i;
            while (j > 0 && tsBuf[j - 1] > kTs) {
                pidBuf[j] = pidBuf[j - 1];
                tsBuf[j] = tsBuf[j - 1];
                usdBuf[j] = usdBuf[j - 1];
                closedBuf[j] = closedBuf[j - 1];
                j--;
            }
            pidBuf[j] = kPid;
            tsBuf[j] = kTs;
            usdBuf[j] = kUsd;
            closedBuf[j] = kCl;
        }

        // Walk and close while thresholds satisfied
        uint256 earned = _earnedIncludingUnclaimedROI(user);
        uint256 prefix = 0;
        for (uint256 i = 0; i < n; i++) {
            prefix += usdBuf[i];
            uint256 threshold = 4 * prefix; // micro-USD
            uint256 pid = pidBuf[i];

            IPortfolioManagerView.Portfolio memory pNow = pm.getPortfolio(pid);
            if (pNow.isClosed) continue;

            if (earned >= threshold) {
                pm.pmCloseBy4x(pid);
                emit Seq4xClosed(user, pid, block.timestamp);
            } else {
                break; // further (newer) cannot be closed yet
            }
        }
    }

    // ---------- Internal: next 4x threshold computation ----------
    function _computeNext4xThreshold(
        address user
    )
        public
        view
        returns (
            // internal
            uint256 nextThresholdUSD6,
            uint256 cumPrincipalUSD6
        )
    {
        uint256[] memory pids = pm.portfoliosOf(user);
        if (pids.length == 0) return (0, 0);

        uint256 n = pids.length;
        uint64[] memory ts = new uint64[](n);
        uint256[] memory usd = new uint256[](n);
        bool[] memory closed = new bool[](n);

        for (uint256 i = 0; i < n; i++) {
            IPortfolioManagerView.Portfolio memory p = pm.getPortfolio(pids[i]);
            ts[i] = p.createdAt;
            usd[i] = uint256(p.principalUsd);
            closed[i] = p.isClosed;
        }
        // sort by ts asc (in-place)
        for (uint256 i = 1; i < n; i++) {
            uint64 kTs = ts[i];
            uint256 kUsd = usd[i];
            bool kCl = closed[i];
            uint256 j = i;
            while (j > 0 && ts[j - 1] > kTs) {
                ts[j] = ts[j - 1];
                usd[j] = usd[j - 1];
                closed[j] = closed[j - 1];
                j--;
            }
            ts[j] = kTs;
            usd[j] = kUsd;
            closed[j] = kCl;
        }

        cumPrincipalUSD6 = 0;
        for (uint256 i = 0; i < n; i++) {
            cumPrincipalUSD6 += usd[i];
            if (!closed[i]) {
                nextThresholdUSD6 = 4 * cumPrincipalUSD6;
                break;
            }
        }
    }

    // ---------- Internal: earned including unclaimed ROI (claimable window) ----------
    function _earnedIncludingUnclaimedROI(
        address user
    ) internal view returns (uint256 total) {
        total = totalIncomeEarnedUSD6[user];
        address rd = cfg.roiDistributor();
        if (rd != address(0)) {
            // Best-effort: include claimable unclaimed ROI in micro-USD
            try IROIDistributorLike(rd).getUnclaimedROI(user) returns (
                uint256 usdTotalMicro,
                uint256 /* ramaTotalWei */,
                uint32 /* fromPeriod */,
                uint32 /* lastPeriod */,
                uint32 /* epochsCount */
            ) {
                total += usdTotalMicro;
            } catch {
                // ignore if distributor not available or call fails
            }
        }
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function setCoreConfig(address _cfg) external onlyOwner {
        require(_cfg != address(0), "ZERO");
        cfg = ICoreConfigLike(_cfg);
    }

    function setPortfolioManager(address _pm) external onlyOwner {
        require(_pm != address(0), "ZERO");
        pm = IPortfolioManagerAdmin(_pm);
    }

    /// @notice Note ROI as earned for 4x purposes without touching PM state (used for closed portfolios).
    /// @dev Callable only by ROI distributor. Use when claiming historical pre-close ROI after a pid is closed.
    function noteROIEarnedOnly(
        address user,
        uint256 pid,
        uint256 amountUSD6
    ) external onlyIncomeSource {
        require(msg.sender == cfg.roiDistributor(), "ONLY_ROI_DISTRIBUTOR");
        if (user == address(0) || pid == 0 || amountUSD6 == 0) return;
        _noteEarned(user, amountUSD6, KIND_ROI);
        _closeBySequential4x(user);
    }

    // ===== Internal helpers =====
    function _noteEarned(
        address user,
        uint256 amountUSD6,
        bytes32 kind
    ) internal {
        totalIncomeEarnedUSD6[user] += amountUSD6;
        earnedByKindUSD6[user][kind] += amountUSD6;
    }

    function _noteMissed(
        address user,
        uint256 amountUSD6,
        bytes32 kind,
        uint256 pid,
        uint8 reason
    ) internal {
        totalMissedUSD6[user] += amountUSD6;
        missedByKindUSD6[user][kind] += amountUSD6;
        _missed[user].push(
            MissedIncomeRec({
                at: uint64(block.timestamp),
                amountUSD6: amountUSD6,
                kind: kind,
                pid: pid,
                reason: reason
            })
        );
        emit MissedIncomeNoted(user, amountUSD6, kind, pid, reason);
    }

    function _normalizeKind(bytes32 kind) internal pure returns (bytes32) {
        if (
            kind == KIND_DIRECT ||
            kind == bytes32("Direct") ||
            kind == bytes32("direct")
        ) return KIND_DIRECT;
        if (
            kind == KIND_SLAB ||
            kind == bytes32("Slab") ||
            kind == bytes32("slab")
        ) return KIND_SLAB;
        if (
            kind == KIND_SLAB_OVERRIDE ||
            kind == bytes32("OVERRIDE") ||
            kind == bytes32("SlabOverride") ||
            kind == bytes32("SLAB-OVERRIDE")
        ) return KIND_SLAB_OVERRIDE;
        if (kind == KIND_ROI) return KIND_ROI;
        return kind; // passthrough other variants
    }

    function getTotalsByKind(
        address user
    )
        external
        view
        returns (
            uint256 earnedROI,
            uint256 earnedDirect,
            uint256 earnedSlab,
            uint256 earnedSlabOverride,
            uint256 missedROI,
            uint256 missedDirect,
            uint256 missedSlab,
            uint256 missedSlabOverride
        )
    {
        earnedROI = earnedByKindUSD6[user][KIND_ROI];
        earnedDirect = earnedByKindUSD6[user][KIND_DIRECT];
        earnedSlab = earnedByKindUSD6[user][KIND_SLAB];
        earnedSlabOverride = earnedByKindUSD6[user][KIND_SLAB_OVERRIDE];

        missedROI = missedByKindUSD6[user][KIND_ROI];
        missedDirect = missedByKindUSD6[user][KIND_DIRECT];
        missedSlab = missedByKindUSD6[user][KIND_SLAB];
        missedSlabOverride = missedByKindUSD6[user][KIND_SLAB_OVERRIDE];
    }

    function getMissedIncomeCount(
        address user
    ) external view returns (uint256) {
        return _missed[user].length;
    }

    function getMissedIncomeSlice(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (MissedIncomeRec[] memory out) {
        MissedIncomeRec[] storage arr = _missed[user];
        uint256 n = arr.length;
        if (offset >= n) return new MissedIncomeRec[](0);
        uint256 end = offset + limit;
        if (end > n) end = n;
        out = new MissedIncomeRec[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            out[i - offset] = arr[i];
        }
    }

    /* ============================== High-level Overviews ============================== */

    function getIncomeOverview(
        address user
    ) external view returns (IncomeOverview memory v) {
        (
            uint256 earnedROI,
            uint256 earnedDirect,
            uint256 earnedSlab,
            uint256 earnedSlabOverride,
            uint256 missedROI,
            uint256 missedDirect,
            uint256 missedSlab,
            uint256 missedSlabOverride
        ) = this.getTotalsByKind(user);

        v.earnedUSD6_roi = earnedROI;
        v.earnedUSD6_direct = earnedDirect;
        v.earnedUSD6_slab = earnedSlab;
        v.earnedUSD6_slabOverride = earnedSlabOverride;
        v.earnedUSD6_total = totalIncomeEarnedUSD6[user];

        v.missedUSD6_roi = missedROI;
        v.missedUSD6_direct = missedDirect;
        v.missedUSD6_slab = missedSlab;
        v.missedUSD6_slabOverride = missedSlabOverride;
        v.missedUSD6_total = totalMissedUSD6[user];

        if (v.earnedUSD6_total > 0) {
            v.pctEarned_roi_bp = uint16(
                (earnedROI * 10000) / v.earnedUSD6_total
            );
            v.pctEarned_direct_bp = uint16(
                (earnedDirect * 10000) / v.earnedUSD6_total
            );
            v.pctEarned_slab_bp = uint16(
                (earnedSlab * 10000) / v.earnedUSD6_total
            );
            v.pctEarned_slabOverride_bp = uint16(
                (earnedSlabOverride * 10000) / v.earnedUSD6_total
            );
        }

        (v.nextThresholdUSD6, v.cumPrincipalUSD6) = _computeNext4xThreshold(
            user
        );
        // For 4x progress, include claimable unclaimed ROI in the earned-so-far view
        v.earnedSoFarUSD6 = _earnedIncludingUnclaimedROI(user);
        v.remainingToNextUSD6 = (v.nextThresholdUSD6 > v.earnedSoFarUSD6)
            ? (v.nextThresholdUSD6 - v.earnedSoFarUSD6)
            : 0;
    }

    /* ============================== Missed Income Helpers ============================== */

    /// @notice Unified missed-income slice with optional filters.
    /// @param user         Account to inspect
    /// @param filterByKind Set true to filter by `kind`
    /// @param kind         KIND filter (e.g. "ROI","DIRECT","SLAB","SLAB_OVERRIDE"); normalized internally
    /// @param filterByReason Set true to filter by `reason` (e.g. "CAP","NO_OPEN","TRIMMED")
    /// @param reason       Reason filter (exact match)
    /// @param offset       Start index within matched results
    /// @param limit        Max items to return
    /// @return out         Page of records
    /// @return totalMatched Total number of matched records (for pagination UIs)
    function getMissedIncomeSliceFiltered(
        address user,
        bool filterByKind,
        bytes32 kind,
        bool filterByReason,
        uint8 reason,
        uint256 offset,
        uint256 limit
    )
        external
        view
        returns (MissedIncomeRec[] memory out, uint256 totalMatched)
    {
        MissedIncomeRec[] storage arr = _missed[user];
        bytes32 normKind = _normalizeKind(kind);

        // 1) Count matches
        if (filterByKind || filterByReason) {
            for (uint256 i = 0; i < arr.length; i++) {
                bool ok = true;
                if (filterByKind) ok = ok && (arr[i].kind == normKind);
                if (filterByReason) ok = ok && (arr[i].reason == reason);
                if (ok) totalMatched++;
            }
        } else {
            // no filters → everything matches
            totalMatched = arr.length;
        }

        if (offset >= totalMatched || limit == 0) {
            return (new MissedIncomeRec[](0), totalMatched);
        }

        // 2) Collect matched into a temporary buffer (in order)
        MissedIncomeRec[] memory tmp = new MissedIncomeRec[](totalMatched);
        uint256 w;
        if (filterByKind || filterByReason) {
            for (uint256 i = 0; i < arr.length; i++) {
                bool ok = true;
                if (filterByKind) ok = ok && (arr[i].kind == normKind);
                if (filterByReason) ok = ok && (arr[i].reason == reason);
                if (ok) tmp[w++] = arr[i];
            }
        } else {
            // no filters → copy all
            for (uint256 i = 0; i < arr.length; i++) tmp[w++] = arr[i];
        }

        // 3) Page/slice
        uint256 end = offset + limit;
        if (end > totalMatched) end = totalMatched;

        out = new MissedIncomeRec[](end - offset);
        for (uint256 i = offset; i < end; i++) out[i - offset] = tmp[i];
    }

    // Summarize totals by REASON for a user (dynamic reasons)
    function getMissedTotalsByReason(
        address user
    )
        external
        view
        returns (uint8[] memory reasons, uint256[] memory totalsUSD6)
    {
        MissedIncomeRec[] storage arr = _missed[user];
        if (arr.length == 0) return (new uint8[](0), new uint256[](0));

        // collect unique reasons (O(n^2) but fine for view/UI lists)
        uint8[] memory uniq = new uint8[](arr.length);

        uint256 uniqN;
        for (uint256 i = 0; i < arr.length; i++) {
            uint8 r = arr[i].reason;

            bool seen;
            for (uint256 j = 0; j < uniqN; j++)
                if (uniq[j] == r) {
                    seen = true;
                    break;
                }
            if (!seen) uniq[uniqN++] = r;
        }

        reasons = new uint8[](uniqN);
        totalsUSD6 = new uint256[](uniqN);
        for (uint256 i = 0; i < uniqN; i++) reasons[i] = uniq[i];

        for (uint256 i = 0; i < arr.length; i++) {
            uint8 r = arr[i].reason;
            for (uint256 j = 0; j < uniqN; j++) {
                if (reasons[j] == r) {
                    totalsUSD6[j] += arr[i].amountUSD6;
                    break;
                }
            }
        }
    }

    // Open + closed portfolios with USD conversions
    function getPortfolioCapTable(
        address user
    ) external view returns (PortfolioCapRow[] memory rows) {
        uint256[] memory pids = pm.portfoliosOf(user);
        rows = new PortfolioCapRow[](pids.length);
        uint256 px = IRamaOracle(cfg.priceOracle()).ramaPriceInUSD(); // micro-USD per RAMA
        require(px > 0, "BAD_ORACLE");

        for (uint256 i = 0; i < pids.length; i++) {
            IPortfolioManagerView.Portfolio memory p = pm.getPortfolio(pids[i]);

            uint256 capUSD6 = (uint256(p.principalUsd) * uint256(p.capPct)) /
                100;
            uint256 creditedUSD6 = (uint256(p.credited) * px) / 1e18;
            int256 rem = int256(capUSD6) - int256(creditedUSD6);

            rows[i] = PortfolioCapRow({
                pid: pids[i],
                isClosed: p.isClosed,
                isCapped: p.isCapped,
                principalUSD6: uint256(p.principalUsd),
                capPct: p.capPct,
                capUSD6: capUSD6,
                creditedWei: uint256(p.credited),
                creditedUSD6: creditedUSD6,
                remainingToCapUSD6: rem
            });
        }
    }

    /* ============================== 4x Sequential View ============================== */

    function getSequential4xView(
        address user
    ) external view returns (Seq4xView memory v) {
        uint256[] memory pids = pm.portfoliosOf(user);
        uint256 n = pids.length;
        // Include claimable unclaimed ROI for 4x readiness view
        v.earnedUSD6 = _earnedIncludingUnclaimedROI(user);

        // Build sortable buffers
        uint64[] memory ts = new uint64[](n);
        uint256[] memory usd = new uint256[](n);
        for (uint256 i = 0; i < n; i++) {
            IPortfolioManagerView.Portfolio memory p = pm.getPortfolio(pids[i]);
            ts[i] = p.createdAt;
            usd[i] = uint256(p.principalUsd);
        }

        // insertion sort by ts asc (stable for small n)
        for (uint256 i = 1; i < n; i++) {
            uint64 kTs = ts[i];
            uint256 kUsd = usd[i];
            uint256 kPid = pids[i];
            uint256 j = i;
            while (j > 0 && ts[j - 1] > kTs) {
                ts[j] = ts[j - 1];
                usd[j] = usd[j - 1];
                pids[j] = pids[j - 1];
                j--;
            }
            ts[j] = kTs;
            usd[j] = kUsd;
            pids[j] = kPid;
        }

        v.pidsOrderedByCreatedAt = new uint256[](n);
        v.prefixPrincipalUSD6 = new uint256[](n);
        v.thresholds4xUSD6 = new uint256[](n);
        v.canCloseNow = new bool[](n);

        uint256 prefix = 0;
        for (uint256 i = 0; i < n; i++) {
            prefix += usd[i];
            v.pidsOrderedByCreatedAt[i] = pids[i];
            v.prefixPrincipalUSD6[i] = prefix;
            v.thresholds4xUSD6[i] = 4 * prefix;
            v.canCloseNow[i] = (v.earnedUSD6 >= v.thresholds4xUSD6[i]);
        }
    }

    /* ============================== QoL Getters ============================== */

    function getEarnedByKind(
        address user
    )
        external
        view
        returns (
            uint256 roiUSD6,
            uint256 directUSD6,
            uint256 slabUSD6,
            uint256 slabOverrideUSD6
        )
    {
        roiUSD6 = earnedByKindUSD6[user][KIND_ROI];
        directUSD6 = earnedByKindUSD6[user][KIND_DIRECT];
        slabUSD6 = earnedByKindUSD6[user][KIND_SLAB];
        slabOverrideUSD6 = earnedByKindUSD6[user][KIND_SLAB_OVERRIDE];
    }

    function getMissedByKind(
        address user
    )
        external
        view
        returns (
            uint256 roiUSD6,
            uint256 directUSD6,
            uint256 slabUSD6,
            uint256 slabOverrideUSD6
        )
    {
        roiUSD6 = missedByKindUSD6[user][KIND_ROI];
        directUSD6 = missedByKindUSD6[user][KIND_DIRECT];
        slabUSD6 = missedByKindUSD6[user][KIND_SLAB];
        slabOverrideUSD6 = missedByKindUSD6[user][KIND_SLAB_OVERRIDE];
    }

    // /// @notice Safe-credit monthly Royalty. Counts toward 4x; missed if no open portfolio.
    // /// @dev Callable by RoyaltyManager only (enforced by onlyIncomeSource + require).
    // function safeCreditRoyalty(
    //     address user,
    //     uint256 amountUSD6
    // ) external onlyIncomeSource returns (bool accepted) {
    //     require(msg.sender == cfg.royaltyManager(), "ONLY_ROYALTY_MANAGER");
    //     if (user == address(0) || amountUSD6 == 0) return false;

    //     if (!hasOpenPortfolio(user)) {
    //         _noteMissed(user, amountUSD6, KIND_ROYALTY, 0, bytes32("NO_OPEN"));
    //         _closeBySequential4x(user);
    //         return false;
    //     }

    //     _noteEarned(user, amountUSD6, KIND_ROYALTY);
    //     // optional: emit a dedicated event (reuse ExternalIncomeNoted is fine)
    //     emit ExternalIncomeNoted(user, amountUSD6, KIND_ROYALTY);

    //     _closeBySequential4x(user);
    //     return true;
    // }

    // /// @notice Safe-credit Slab income (pool distribution). Responsible for 4x capping.
    // /// @dev Callable by SlabManager only. If no open portfolio => missed. Triggers 4x closer.
    // function safeCreditSlabIncome(
    //     address user,
    //     uint256 amountUSD6
    // ) external onlyIncomeSource returns (bool accepted) {
    //     require(msg.sender == cfg.slabManager(), "ONLY_SLAB_MANAGER");
    //     if (user == address(0) || amountUSD6 == 0) return false;

    //     if (!hasOpenPortfolio(user)) {
    //         _noteMissed(user, amountUSD6, KIND_SLAB, 0, bytes32("NO_OPEN"));
    //         _closeBySequential4x(user);
    //         return false;
    //     }

    //     _noteEarned(user, amountUSD6, KIND_SLAB);
    //     emit ExternalIncomeNoted(user, amountUSD6, KIND_SLAB);

    //     _closeBySequential4x(user);
    //     return true;
    // }

    /// @notice Safe-credit Slab Override income (if you distribute override separately).
    /// @dev Callable by SlabManager (or another approved source) depending on how you route it.
    // function safeCreditSlabOverrideIncome(
    //     address user,
    //     uint256 amountUSD6
    // ) external onlyIncomeSource returns (bool accepted) {
    //     // let SlabManager (or whichever service generates overrides) call this
    //     // you can tighten this to `require(msg.sender == cfg.slabManager(), ...)` if desired
    //     if (user == address(0) || amountUSD6 == 0) return false;

    //     if (!hasOpenPortfolio(user)) {
    //         _noteMissed(
    //             user,
    //             amountUSD6,
    //             KIND_SLAB_OVERRIDE,
    //             0,
    //             bytes32("NO_OPEN")
    //         );
    //         _closeBySequential4x(user);
    //         return false;
    //     }

    //     _noteEarned(user, amountUSD6, KIND_SLAB_OVERRIDE);
    //     emit ExternalIncomeNoted(user, amountUSD6, KIND_SLAB_OVERRIDE);

    //     _closeBySequential4x(user);
    //     return true;
    // }

    // Adjusted gap to preserve storage layout after adding 4 new slots
    uint256[46] private __gap;
}
