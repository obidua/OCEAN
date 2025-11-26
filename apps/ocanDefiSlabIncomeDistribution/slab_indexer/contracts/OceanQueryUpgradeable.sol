// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
pragma abicoder v2; // <-- add this line

/**
 * OceanQueryUpgradeable
 * Read-only facade implementing a comprehensive set of view endpoints for OCEAN DeFi.
 *
 * Notes:
 * - This contract does not write any state except for UUPS/Ownable internals.
 * - Where underlying modules don't expose a value, we "best-effort" staticcall
 *   and return zero/empty to keep UX resilient.
 */

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/* ========= Minimal interfaces ========= */

interface ICoreConfig {
    function rama() external view returns (address);
    function priceOracle() external view returns (address);
    function userRegistry() external view returns (address);
    function portfolioManager() external view returns (address);
    function slabManager() external view returns (address);
    function royaltyManager() external view returns (address);
    function rewardVault() external view returns (address);
    function safeWallet() external view returns (address);
    // function mainWallet() external view returns (address);
    function getUSDMinStake() external view returns (uint256);
    function claimFeeBps() external view returns (uint16);
    function exitFeeBps() external view returns (uint16);
    function capX() external view returns (uint256);
}

interface IUserRegistry {
    struct UserInfo {
        bool registered;
        uint32 id;
        address referrer;
        uint32 directsCount;
        uint64 createdAt;
    }
    function getUser(address) external view returns (UserInfo memory);
    function getReferrer(address) external view returns (address);
    function directsOf(address who) external view returns (address[] memory);
    function getLevelTeam(
        address user,
        uint8 level
    ) external view returns (address[] memory);
    function getLevelTeamCounts(
        address user,
        uint8 maxDepth
    ) external view returns (uint256[] memory);
}

interface IPortfolioManager {
    struct Portfolio {
        uint128 principal; // RAMA wei
        uint128 principalUsd; // USD 1e18 (fixed at creation)
        uint128 credited; // RAMA wei (legacy/internal accrue)
        uint64 createdAt;
        uint64 lastAccrual;
        uint64 frozenUntil;
        bool booster;
        uint8 tier; // 0 or 1
        uint8 capPct; // 200 or 250
        address owner;
    }
    function createPortfolio(
        uint256 ramaAmount,
        address referrer
    ) external returns (uint256);
    function portfoliosOf(
        address user
    ) external view returns (uint256[] memory);
    function getPortfolio(uint256 pid) external view returns (Portfolio memory);
    function getUSDPrincipal(uint256 pid) external view returns (uint256);
    function hasActiveMin50(address user) external view returns (bool);

    function dailyRateTier0() external view returns (uint256);
    function dailyRateTier1() external view returns (uint256);
    function dailyRateBoosterTier0() external view returns (uint256);
    function dailyRateBoosterTier1() external view returns (uint256);

    // Sum of a user's portfolio principals in RAMA wei and USD (micro-USD, 1e6)
    function getTotalPortfolioValue(
        address user
    ) external view returns (uint256 totalRamaWei, uint256 totalUsdMicro);
}

interface ISlabManager {
    function getSlabIndex(address user) external view returns (uint8);
    function getQualifiedBusinessUSD(
        address user
    ) external view returns (uint256);
    function canClaim(address user) external view returns (bool);
    // Optional helper you added:
    // function getLegsTop2AndRest(address user) external view returns (uint256 L1, uint256 L2, uint256 Lrest);
}

interface IRoyaltyManager {
    // royalty(user) -> (lastPaidTier, lastPaidMonthEpoch, paused)
    function royalty(address user) external view returns (uint8, uint64, bool);
}

interface IRewardVault {
    // claimed(user, milestoneIdx) -> bool
    function claimed(address user, uint8 idx) external view returns (bool);
    function milestoneThresholdsUSD(uint256) external view returns (uint256);
    function milestoneRewardsUSD(uint256) external view returns (uint256);
}

interface ISafeWallet {
    function ramaBalance(address user) external view returns (uint256);
    function roiUsdPaid(address user) external view returns (uint256);
    // OPTIONAL best-effort:
    // function userDayUsd(address user, uint32 dayId) external view returns (uint256);
    // function getUserTxHistory(address user, uint256 limit) external view returns (bytes[] memory);
}

/* ========= Contract ========= */

contract OceanQueryUpgradeable is
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    ICoreConfig public cfg;

    struct UserPortfolio {
        uint256 pid;
        uint256 principalRama;
        uint256 principalUSD;
        uint256 creditedRama;
        uint64 createdAt;
        uint64 frozenUntil;
        bool booster;
        uint8 tier;
        uint8 capPct;
        bool active; // not frozen & not capped
        uint256 capRama;
        uint256 dailyRateWad; // current daily rate based on tier+booster
        uint256 capProgressBps; // 0..10000 (credited / cap)
    }

    /* ---------- Init / Upgrade ---------- */
    function initialize(address _cfg) external initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        require(_cfg != address(0), "CFG_ZERO");
        cfg = ICoreConfig(_cfg);
    }
    function _authorizeUpgrade(address) internal override onlyOwner {}

    uint256[50] private __gap;

    /* ---------- Shortcuts ---------- */

    function _pm() internal view returns (IPortfolioManager) {
        return IPortfolioManager(cfg.portfolioManager());
    }
    function _reg() internal view returns (IUserRegistry) {
        return IUserRegistry(cfg.userRegistry());
    }
    function _slab() internal view returns (ISlabManager) {
        return ISlabManager(cfg.slabManager());
    }
    function _roy() internal view returns (IRoyaltyManager) {
        return IRoyaltyManager(cfg.royaltyManager());
    }
    function _safe() internal view returns (ISafeWallet) {
        return ISafeWallet(cfg.safeWallet());
    }

    function getPidsOf(address user) external view returns (uint256[] memory) {
        return IPortfolioManager(cfg.portfolioManager()).portfoliosOf(user);
    }

    function _rv() internal view returns (IRewardVault) {
        return IRewardVault(cfg.rewardVault());
    }

    function _tryAddressArray(
        address target,
        bytes memory data
    ) internal view returns (address[] memory out) {
        (bool ok, bytes memory ret) = target.staticcall(data);
        if (ok && ret.length > 0) {
            out = abi.decode(ret, (address[]));
        } else {
            out = new address[](0);
        }
    }

    function setRates(address _config) external onlyOwner {
        cfg = ICoreConfig(_config);
    }

    /* -------------------------------------------------------
       1) Portfolio & User Status
       ------------------------------------------------------- */

    function getUserPortfolio(
        address user
    ) external view returns (UserPortfolio[] memory list) {
        IPortfolioManager pm = _pm();
        uint256[] memory pids = pm.portfoliosOf(user);
        list = new UserPortfolio[](pids.length);

        (uint256 r0, uint256 r1, uint256 rb0, uint256 rb1) = (
            pm.dailyRateTier0(),
            pm.dailyRateTier1(),
            pm.dailyRateBoosterTier0(),
            pm.dailyRateBoosterTier1()
        );

        for (uint256 i = 0; i < pids.length; i++) {
            IPortfolioManager.Portfolio memory p = pm.getPortfolio(pids[i]);
            uint256 cap = (uint256(p.principal) * p.capPct) / 100;
            bool capped = uint256(p.credited) >= cap;
            bool frozen = (p.frozenUntil != 0 &&
                block.timestamp <= p.frozenUntil);

            uint256 rate = (p.tier == 1)
                ? (p.booster ? rb1 : r1)
                : (p.booster ? rb0 : r0);
            uint256 progressBps = cap == 0
                ? 0
                : (uint256(p.credited) * 10000) / cap;

            list[i] = UserPortfolio({
                pid: pids[i],
                principalRama: p.principal,
                principalUSD: p.principalUsd,
                creditedRama: p.credited,
                createdAt: p.createdAt,
                frozenUntil: p.frozenUntil,
                booster: p.booster,
                tier: p.tier,
                capPct: p.capPct,
                active: (!frozen && !capped),
                capRama: cap,
                dailyRateWad: rate,
                capProgressBps: progressBps
            });
        }
    }

    function getUserStatus(
        address user
    )
        external
        view
        returns (
            uint8 slabLevel,
            uint8 royaltyLevel,
            uint32 directs,
            uint256 qualifiedVolumeUSD
        )
    {
        slabLevel = _slab().getSlabIndex(user);
        (royaltyLevel, , ) = _roy().royalty(user);
        directs = _reg().getUser(user).directsCount;
        qualifiedVolumeUSD = _slab().getQualifiedBusinessUSD(user);
    }

    /// @notice Total staked amounts for a user across all portfolios.
    /// Returns RAMA wei and USD micro (1e6) as stored by PortfolioManager.
    function getTotalStakedAmount(
        address user
    ) external view returns (uint256 totalRamaWei, uint256 totalUsdMicro) {
        return _pm().getTotalPortfolioValue(user);
    }

    /// @notice Total earnings received: ROI + DirectIncome + Reward + Royalty + Slab.
    /// Sums SafeWallet ledger credits for these kinds.
    /// Returns tuple (totalUsdWad, totalRamaWei).
    function getTotalEarnings(
        address user
    ) external view returns (uint256 totalUsdWad, uint256 totalRamaWei) {
        // SafeWallet.TxKind: ROI=0, Growth=1, Royalty=2, Slab=3, Reward=4, DirectIncome=5
        (uint256 u0, uint256 r0) = _totalsByKind(user, 0); // ROI
        (uint256 u5, uint256 r5) = _totalsByKind(user, 5); // DirectIncome
        (uint256 u4, uint256 r4) = _totalsByKind(user, 4); // Reward
        (uint256 u2, uint256 r2) = _totalsByKind(user, 2); // Royalty
        (uint256 u3, uint256 r3) = _totalsByKind(user, 3); // Slab

        totalUsdWad = u0 + u5 + u4 + u2 + u3;
        totalRamaWei = r0 + r5 + r4 + r2 + r3;
    }

    function getPortfolioDetails(
        uint256 pid
    ) external view returns (UserPortfolio memory up) {
        IPortfolioManager pm = _pm();
        IPortfolioManager.Portfolio memory p = pm.getPortfolio(pid);
        (uint256 r0, uint256 r1, uint256 rb0, uint256 rb1) = (
            pm.dailyRateTier0(),
            pm.dailyRateTier1(),
            pm.dailyRateBoosterTier0(),
            pm.dailyRateBoosterTier1()
        );
        uint256 cap = (uint256(p.principal) * p.capPct) / 100;
        bool capped = uint256(p.credited) >= cap;
        bool frozen = (p.frozenUntil != 0 && block.timestamp <= p.frozenUntil);
        uint256 rate = (p.tier == 1)
            ? (p.booster ? rb1 : r1)
            : (p.booster ? rb0 : r0);
        uint256 progressBps = cap == 0
            ? 0
            : (uint256(p.credited) * 10000) / cap;

        up = UserPortfolio({
            pid: pid,
            principalRama: p.principal,
            principalUSD: p.principalUsd,
            creditedRama: p.credited,
            createdAt: p.createdAt,
            frozenUntil: p.frozenUntil,
            booster: p.booster,
            tier: p.tier,
            capPct: p.capPct,
            active: (!frozen && !capped),
            capRama: cap,
            dailyRateWad: rate,
            capProgressBps: progressBps
        });
    }

    function isPortfolioActive(uint256 pid) external view returns (bool) {
        IPortfolioManager.Portfolio memory p = _pm().getPortfolio(pid);
        uint256 cap = (uint256(p.principal) * p.capPct) / 100;
        bool capped = uint256(p.credited) >= cap;
        bool frozen = (p.frozenUntil != 0 && block.timestamp <= p.frozenUntil);
        return (!frozen && !capped);
    }

    function getUplineAddress(address user) external view returns (address) {
        return _reg().getReferrer(user);
    }

    function getSafeWalletBalance(
        address user
    ) external view returns (uint256 ramaBalance) {
        ramaBalance = _safe().ramaBalance(user);
    }

    /// @notice Accrued growth “ready to claim”: depends on wallet/bookkeeping.
    /// If MainWallet tracks pending balances, we try reading them. Fallback = 0.
    function getAccruedGrowth(
        address user
    ) external view returns (uint256 growthRama) {
        // growthRama = _trySingleUint(
        //     cfg.mainWallet(),
        //     abi.encodeWithSignature("pendingGrowth(address)", user)
        // );

        growthRama = 0;
    }

    function getPortfolioCapProgress(
        uint256 pid
    ) external view returns (uint256 bps) {
        IPortfolioManager.Portfolio memory p = _pm().getPortfolio(pid);
        uint256 cap = (uint256(p.principal) * p.capPct) / 100;
        bps = cap == 0 ? 0 : (uint256(p.credited) * 10000) / cap;
    }

    /// Lifetime 4x cap progress (if you define platform cap as X; using CoreConfig.capX() for reference)
    function getLifetimeCapProgress(
        address user
    ) external view returns (uint256 bps) {
        // Option A (simplified): sum portfolio credited vs sum principal * (capPct/100)
        IPortfolioManager pm = _pm();
        uint256[] memory pids = pm.portfoliosOf(user);
        uint256 sumCred;
        uint256 sumCap;
        for (uint256 i = 0; i < pids.length; i++) {
            IPortfolioManager.Portfolio memory p = pm.getPortfolio(pids[i]);
            sumCred += p.credited;
            sumCap += (uint256(p.principal) * p.capPct) / 100;
        }
        bps = (sumCap == 0) ? 0 : (sumCred * 10000) / sumCap;
    }

    function getDailyGrowthRate(
        uint256 pid
    ) external view returns (uint256 dailyRateWad) {
        IPortfolioManager pm = _pm();
        IPortfolioManager.Portfolio memory p = pm.getPortfolio(pid);
        dailyRateWad = (p.tier == 1)
            ? (p.booster ? pm.dailyRateBoosterTier1() : pm.dailyRateTier1())
            : (p.booster ? pm.dailyRateBoosterTier0() : pm.dailyRateTier0());
    }

    /* -------------------------------------------------------
       2) Team Network
       ------------------------------------------------------- */

    function getDirectReferrals(
        address user
    ) external view returns (address[] memory) {
        return _reg().directsOf(user);
    }

    function getDirectReferralCount(
        address user
    ) external view returns (uint32) {
        return _reg().getUser(user).directsCount;
    }

    function getTeamMembersByLevel(
        address user,
        uint8 level
    ) external view returns (address[] memory addrs) {
        addrs = _reg().getLevelTeam(user, level);
    }

    function getTotalTeamSize(
        address user,
        uint8 maxDepth
    ) external view returns (uint256 total) {
        uint256[] memory counts = _reg().getLevelTeamCounts(user, maxDepth);
        for (uint256 i = 0; i < counts.length; i++) total += counts[i];
    }

    /// @notice Team Volume: sum of qualified volume proxy or (optionally) all leg volumes.
    /// We return the "qualified" (40:30:30 T) and also the raw top-2+rest if available.
    function getTeamVolume(
        address user
    )
        external
        view
        returns (uint256 qualifiedUSD, uint256 L1, uint256 L2, uint256 Lrest)
    {
        qualifiedUSD = _slab().getQualifiedBusinessUSD(user);
        // Best-effort read of legs split if your SlabManager exposes it
        (bool ok, bytes memory ret) = address(_slab()).staticcall(
            abi.encodeWithSignature("getLegsTop2AndRest(address)", user)
        );
        if (ok && ret.length == 96) {
            (L1, L2, Lrest) = abi.decode(ret, (uint256, uint256, uint256));
        }
    }

    function getQualifiedVolume(
        address user
    ) external view returns (uint256 usdQualified) {
        usdQualified = _slab().getQualifiedBusinessUSD(user);
    }

    function getLegVolumes(
        address user
    ) external view returns (uint256 L1, uint256 L2, uint256 Lrest) {
        (bool ok, bytes memory ret) = address(_slab()).staticcall(
            abi.encodeWithSignature("getLegsTop2AndRest(address)", user)
        );
        if (ok && ret.length == 96) {
            (L1, L2, Lrest) = abi.decode(ret, (uint256, uint256, uint256));
        } else {
            L1 = 0;
            L2 = 0;
            Lrest = 0;
        }
    }

    /// @dev narrow helper: one member’s quick status
    struct TeamMemberBrief {
        address member;
        uint8 slabLevel;
        uint8 royaltyLevel;
        uint32 directs;
        bool hasActive50;
    }
    function getTeamMemberDetails(
        address member
    ) external view returns (TeamMemberBrief memory tmb) {
        tmb.member = member;
        tmb.slabLevel = _slab().getSlabIndex(member);
        (tmb.royaltyLevel, , ) = _roy().royalty(member);
        tmb.directs = _reg().getUser(member).directsCount;
        tmb.hasActive50 = _pm().hasActiveMin50(member);
    }

    /* -------------------------------------------------------
       3) Slab Income
       ------------------------------------------------------- */

    function getCurrentSlabLevel(address user) external view returns (uint8) {
        return _slab().getSlabIndex(user);
    }

    struct SlabLevelInfo {
        uint256 thresholdUSD;
        uint8 percent;
    }
    function getSlabLevelDetails(
        uint8 idx
    ) external view returns (SlabLevelInfo memory info) {
        // Best-effort read from SlabManager public array slabThresholds + slabPercents
        info.thresholdUSD = _tryArrayUint(
            address(_slab()),
            "slabThresholds(uint256)",
            idx
        );
        info.percent = uint8(
            _tryArrayUint(address(_slab()), "slabPercents(uint256)", idx)
        );
    }

    function getAllSlabLevels()
        external
        view
        returns (SlabLevelInfo[] memory levels)
    {
        // Slab ladder is 11 levels (0..10)
        levels = new SlabLevelInfo[](11);
        for (uint8 i = 0; i < 11; i++) {
            levels[i].thresholdUSD = _tryArrayUint(
                address(_slab()),
                "slabThresholds(uint256)",
                i
            );
            levels[i].percent = uint8(
                _tryArrayUint(address(_slab()), "slabPercents(uint256)", i)
            );
        }
    }

    function getSlabIncomeAvailable(
        address user
    ) external view returns (uint256 amount) {
        amount = 0;
        // amount = _trySingleUint(
        //     cfg.mainWallet(),
        //     abi.encodeWithSignature("pendingSlab(address)", user)
        // );
    }

    function getSlabClaimStatus(
        address user
    ) external view returns (uint64 lastClaimAtEpoch, uint64 currentEpoch) {
        bool canclaim = _slab().canClaim(user);
        if (!canclaim) return (0, 0);

        currentEpoch = uint64(
            _trySingleUint(
                address(_slab()),
                abi.encodeWithSignature("currentEpoch()")
            )
        );
        lastClaimAtEpoch = uint64(
            _trySingleUint(
                address(_slab()),
                abi.encodeWithSignature("claimedAtEpoch(address)", user)
            )
        );
    }

    // function getSameSlabOverrideEarnings(
    //     address user
    // ) external view returns (uint256 l1, uint256 l2, uint256 l3) {
    //     // If MainWallet tracks per-wave overrides:
    //     l1 = _trySingleUint(
    //         cfg.mainWallet(),
    //         abi.encodeWithSignature(
    //             "pendingOverrideWave(address,uint8)",
    //             user,
    //             1
    //         )
    //     );
    //     l2 = _trySingleUint(
    //         cfg.mainWallet(),
    //         abi.encodeWithSignature(
    //             "pendingOverrideWave(address,uint8)",
    //             user,
    //             2
    //         )
    //     );
    //     l3 = _trySingleUint(
    //         cfg.mainWallet(),
    //         abi.encodeWithSignature(
    //             "pendingOverrideWave(address,uint8)",
    //             user,
    //             3
    //         )
    //     );
    // }

    function getSameSlabPartners(
        address user
    )
        external
        view
        returns (
            address[] memory firstWave,
            address[] memory secondWave,
            address[] memory thirdWave
        )
    {
        // Optional analytics endpoint in SlabManager (if implemented)
        firstWave = _tryAddressArray(
            address(_slab()),
            abi.encodeWithSignature("getSameSlabWave(address,uint8)", user, 1)
        );
        secondWave = _tryAddressArray(
            address(_slab()),
            abi.encodeWithSignature("getSameSlabWave(address,uint8)", user, 2)
        );
        thirdWave = _tryAddressArray(
            address(_slab()),
            abi.encodeWithSignature("getSameSlabWave(address,uint8)", user, 3)
        );
    }

    /* -------------------------------------------------------
       4) Royalty Program
       ------------------------------------------------------- */

    function getCurrentRoyaltyLevel(
        address user
    ) external view returns (uint8) {
        (uint8 tier, , ) = _roy().royalty(user);
        return tier;
    }

    struct RoyaltyLevelInfo {
        uint256 thresholdUSD;
        uint256 monthlyUSD;
    }
    function getRoyaltyLevelDetails(
        uint8 idx
    ) external view returns (RoyaltyLevelInfo memory info) {
        // If RoyaltyManager exposes arrays thresholdsUSD/salaryUSD:
        info.thresholdUSD = _tryArrayUint(
            address(_roy()),
            "thresholdsUSD(uint256)",
            idx
        );
        info.monthlyUSD = _tryArrayUint(
            address(_roy()),
            "salaryUSD(uint256)",
            idx
        );
    }

    function getAllRoyaltyLevels(
        uint8 count
    ) external view returns (RoyaltyLevelInfo[] memory list) {
        list = new RoyaltyLevelInfo[](count);
        for (uint8 i = 0; i < count; i++) {
            list[i].thresholdUSD = _tryArrayUint(
                address(_roy()),
                "thresholdsUSD(uint256)",
                i
            );
            list[i].monthlyUSD = _tryArrayUint(
                address(_roy()),
                "salaryUSD(uint256)",
                i
            );
        }
    }

    // function getRoyaltyPayoutsReceived(
    //     address user
    // ) external view returns (uint256 totalPaidMonths) {
    //     // If MainWallet tracks totals, try it:
    //     totalPaidMonths = _trySingleUint(
    //         cfg.mainWallet(),
    //         abi.encodeWithSignature("royaltyPaidCount(address)", user)
    //     );
    // }

    function canClaimRoyalty(address user) external view returns (bool) {
        // If RoyaltyManager exposes a pure check; otherwise infer from paused + month:
        (, , bool paused) = _roy().royalty(user);
        return !paused;
    }

    function getRoyaltyRenewalRequirement(
        address user
    ) external view returns (bool paused, uint256 lastT, uint256 nowT) {
        // If RoyaltyManager stores t60dAgoCache / tNowCache, try reading:
        (bool ok1, bytes memory r1) = address(_roy()).staticcall(
            abi.encodeWithSignature("t60dAgoCache(address)", user)
        );
        (bool ok2, bytes memory r2) = address(_roy()).staticcall(
            abi.encodeWithSignature("tNowCache(address)", user)
        );
        if (ok1 && r1.length >= 32) lastT = abi.decode(r1, (uint256));
        if (ok2 && r2.length >= 32) nowT = abi.decode(r2, (uint256));
        (, , paused) = _roy().royalty(user);
    }

    function getNextRoyaltyClaimDate(
        address user
    ) external view returns (uint64 lastPaidMonthEpoch, uint64 nextMonthEpoch) {
        (, lastPaidMonthEpoch, ) = _roy().royalty(user);
        nextMonthEpoch = lastPaidMonthEpoch == 0 ? 0 : lastPaidMonthEpoch + 1; // epoch notion (e.g., YYYYMM) if you store it like that
    }

    // /* -------------------------------------------------------
    //    5) One-Time Rewards
    //    ------------------------------------------------------- */

    struct RewardMilestoneStatus {
        uint8 idx;
        uint256 thresholdUSD;
        uint256 rewardUSD;
        bool claimed;
    }

    // function getOneTimeRewardStatus(
    //     address user,
    //     uint8 milestones
    // ) external view returns (RewardMilestoneStatus[] memory list) {
    //     list = new RewardMilestoneStatus[](milestones);
    //     for (uint8 i = 0; i < milestones; i++) {
    //         list[i].idx = i;
    //         list[i].thresholdUSD = _rv().milestoneThresholdsUSD(i);
    //         list[i].rewardUSD = _rv().milestoneRewardsUSD(i);
    //         list[i].claimed = _rv().claimed(user, i);
    //     }
    // }

    // function getAvailableRewards(
    //     address user,
    //     uint8 milestones
    // ) external view returns (uint8[] memory unlockable) {
    //     // If SlabManager exposes qualified T, compare against thresholds and filter unclaimed:
    //     uint256 T = _slab().getQualifiedBusinessUSD(user);
    //     uint8 count;
    //     for (uint8 i = 0; i < milestones; i++) {
    //         if (!_rv().claimed(user, i) && T >= _rv().milestoneThresholdsUSD(i))
    //             count++;
    //     }
    //     unlockable = new uint8[](count);
    //     if (count == 0) return unlockable;
    //     uint8 k = 0;
    //     for (uint8 i = 0; i < milestones; i++) {
    //         if (!_rv().claimed(user, i) && T >= _rv().milestoneThresholdsUSD(i))
    //             unlockable[k++] = i;
    //     }
    // }

    function getTotalRewardsClaimed(
        address user
    ) external view returns (uint256 count) {
        //    /
        // If MainWallet tracks totals, try it:
        // count = _trySingleUint(
        //     cfg.mainWallet(),
        //     abi.encodeWithSignature("rewardClaimCount(address)", user)
        // );

        return 0;
    }

    function getRewardMilestoneDetails(
        uint8 idx
    ) external view returns (uint256 thresholdUSD, uint256 rewardUSD) {
        thresholdUSD = _rv().milestoneThresholdsUSD(idx);
        rewardUSD = _rv().milestoneRewardsUSD(idx);
    }

    function getAllRewardMilestones(
        uint8 milestones
    ) external view returns (RewardMilestoneStatus[] memory list) {
        list = new RewardMilestoneStatus[](milestones);
        for (uint8 i = 0; i < milestones; i++) {
            list[i] = RewardMilestoneStatus({
                idx: i,
                thresholdUSD: _rv().milestoneThresholdsUSD(i),
                rewardUSD: _rv().milestoneRewardsUSD(i),
                claimed: false // claimed is per-user; use getOneTimeRewardStatus for user-specific
            });
        }
    }

    /* -------------------------------------------------------
       6) Income Streams (available/pending)
       ------------------------------------------------------- */

    function getPortfolioGrowthIncome(
        address user
    ) public view returns (uint256) {
        return 0;
        // _trySingleUint(
        //     cfg.mainWallet(),
        //     abi.encodeWithSignature("pendingGrowth(address)", user)
        // );
    }
    function getSlabIncome(address user) public view returns (uint256) {
        return 0;
        // _trySingleUint(
        //     cfg.mainWallet(),
        //     abi.encodeWithSignature("pendingSlab(address)", user)
        // );
    }
    function getRoyaltyIncome(address user) public pure returns (uint256) {
        return 0;
        // _trySingleUint(
        //     cfg.mainWallet(),
        //     abi.encodeWithSignature("pendingRoyalty(address)", user)
        // );
    }
    function getSameSlabOverrideIncome(
        address user
    ) public pure returns (uint256) {
        return 0;
        // _trySingleUint(
        //     cfg.mainWallet(),
        //     abi.encodeWithSignature("pendingOverride(address)", user)
        // );
    }
    function getOneTimeRewardIncome(
        address user
    ) public pure returns (uint256) {
        return 0;
        // _trySingleUint(
        //     cfg.mainWallet(),
        //     abi.encodeWithSignature("pendingReward(address)", user)
        // );
    }

    function getTotalClaimableIncome(
        address user
    ) external view returns (uint256 sum) {
        sum += getPortfolioGrowthIncome(user);
        sum += getSlabIncome(user);
        sum += getRoyaltyIncome(user);
        sum += getSameSlabOverrideIncome(user);
        sum += getOneTimeRewardIncome(user);
    }

    /* -------------------------------------------------------
       7) Transaction History (best-effort)
       ------------------------------------------------------- */

    function getUserTransactions(
        address user,
        uint256 limit
    ) external view returns (bytes[] memory entries) {
        if (limit == 0) return new bytes[](0);
        if (limit > 50) limit = 50;
        entries = _tryGetTxHistory(cfg.safeWallet(), user, limit);

        // if (entries.length == 0) {
        //     entries = _tryGetTxHistory(cfg.mainWallet(), user, limit);
        // }
    }

    function getTransactionDetails(
        bytes32 txHash
    ) external view returns (bytes memory opaque) {
        // If MainWallet/SafeWallet implements a details mapping, try both:
        // opaque = _tryBytes(
        //     cfg.mainWallet(),
        //     abi.encodeWithSignature("txDetails(bytes32)", txHash)
        // );

        opaque = _tryBytes(
            cfg.safeWallet(),
            abi.encodeWithSignature("txDetails(bytes32)", txHash)
        );
        // if (opaque.length == 0) {
        // }
    }

    function getTransactionsByType(
        address user,
        bytes32 t,
        uint256 limit
    ) external view returns (bytes[] memory entries) {
        // Optional filter endpoint in wallets:
        // entries = _tryBytesArray(
        //     cfg.mainWallet(),
        //     abi.encodeWithSignature(
        //         "getUserTxByType(address,bytes32,uint256)",
        //         user,
        //         t,
        //         limit
        //     )
        // );
        entries = _tryBytesArray(
            cfg.safeWallet(),
            abi.encodeWithSignature(
                "getUserTxByType(address,bytes32,uint256)",
                user,
                t,
                limit
            )
        );
        // if (entries.length == 0) {
        // }
    }

    function getIncomeStreamTotals(
        address user
    )
        external
        pure
        returns (
            uint256 growth,
            uint256 slab,
            uint256 royalty,
            uint256 overrideB,
            uint256 rewards
        )
    {
        growth = 0;
        slab = 0;
        royalty = 0;
        overrideB = 0;
        rewards = 0;
        // (bool ok, bytes memory ret) = cfg.mainWallet().staticcall(
        //     abi.encodeWithSignature("incomeTotals(address)", user)
        // );
        // if (ok && ret.length == 160) {
        //     (growth, slab, royalty, overrideB, rewards) = abi.decode(
        //         ret,
        //         (uint256, uint256, uint256, uint256, uint256)
        //     );
        // }
    }

    /* -------------------------------------------------------
       8) Settings & Configuration
       ------------------------------------------------------- */

    function getContractAddress() external view returns (address) {
        return address(this);
    }

    function getChainDetails()
        external
        view
        returns (
            uint256 chainId,
            address cfgAddr,
            address oracle,
            address ramaToken
        )
    {
        chainId = block.chainid;
        cfgAddr = address(cfg);
        oracle = cfg.priceOracle();
        ramaToken = cfg.rama();
    }

    function getMinimumStake() external view returns (uint256) {
        return cfg.getUSDMinStake();
    }

    function getFreezeEndTime(uint256 pid) external view returns (uint64) {
        return _pm().getPortfolio(pid).frozenUntil;
    }

    /* -------------------------------------------------------
       9) Supporting/Validation (read helpers)
       ------------------------------------------------------- */

    function canStake(
        address user,
        uint256 usdAmount
    ) external view returns (bool) {
        return
            (usdAmount >= cfg.getUSDMinStake()) &&
            _reg().getUser(user).registered;
    }

    function canClaim(address user) external view returns (bool) {
        return _slab().canClaim(user);
    }

    function hasMinimumDirects(
        address user,
        uint8 slabIdx
    ) external view returns (bool) {
        return _reg().getUser(user).directsCount >= uint32(slabIdx) + 1;
    }

    function isInCooldown(address user) external view returns (bool) {
        // Slab cooldown 24h: if SlabManager exposes lastClaimAt:
        uint256 last = _trySingleUint(
            address(_slab()),
            abi.encodeWithSignature("lastClaimAt(address)", user)
        );
        if (last == 0) return false;
        return block.timestamp < last + 24 hours;
    }

    function hasReachedCap(uint256 pid) external view returns (bool) {
        IPortfolioManager.Portfolio memory p = _pm().getPortfolio(pid);
        uint256 cap = (uint256(p.principal) * p.capPct) / 100;
        return uint256(p.credited) >= cap;
    }

    /// Simple projection: daily = principalUSD * dailyRate; monthly ~= daily * 30
    function calculateProjectedEarnings(
        uint256 principalUSD,
        uint256 dailyRateWad
    ) external pure returns (uint256 dailyUSD, uint256 monthlyUSD) {
        dailyUSD = (principalUSD * dailyRateWad) / 1e18;
        monthlyUSD = dailyUSD * 30;
    }

    /// Booster eligibility (UI hint): 5 directs each >= thresholdUSD within 10 days from first stake (implementation-specific)
    function calculateBoosterEligibility(
        uint256[] calldata directUSDs,
        uint256 thresholdUSD
    ) external pure returns (bool) {
        uint256 count;
        for (uint256 i = 0; i < directUSDs.length; i++)
            if (directUSDs[i] >= thresholdUSD) count++;
        return count >= 5;
    }

    function calculateClaimFee(uint256 amount) public view returns (uint256) {
        return (amount * cfg.claimFeeBps()) / 10_000;
    }
    function calculateExitFee(uint256 amount) external view returns (uint256) {
        return (amount * cfg.exitFeeBps()) / 10_000;
    }
    function calculateCommission(
        uint256 amount
    ) external pure returns (uint256) {
        // 5% direct commission
        return (amount * 500) / 10_000;
    }
    function getNetClaimAmount(uint256 amount) external view returns (uint256) {
        return amount - calculateClaimFee(amount);
    }

    /* -------------------------------------------------------
       Internal best-effort helpers
       ------------------------------------------------------- */

    function _trySingleUint(
        address target,
        bytes memory callData
    ) internal view returns (uint256 out) {
        (bool ok, bytes memory ret) = target.staticcall(callData);
        if (ok && ret.length >= 32) out = abi.decode(ret, (uint256));
    }

    function _tryArrayUint(
        address target,
        string memory sig,
        uint256 idx
    ) internal view returns (uint256 out) {
        (bool ok, bytes memory ret) = target.staticcall(
            abi.encodeWithSignature(sig, idx)
        );
        if (ok && ret.length >= 32) out = abi.decode(ret, (uint256));
    }

    function _tryGetTxHistory(
        address target,
        address user,
        uint256 limit
    ) internal view returns (bytes[] memory entries) {
        (bool ok, bytes memory ret) = target.staticcall(
            abi.encodeWithSignature(
                "getUserTxHistory(address,uint256)",
                user,
                limit
            )
        );
        if (ok && ret.length > 0) {
            entries = abi.decode(ret, (bytes[]));
        } else {
            entries = new bytes[](0);
        }
    }

    function _tryBytes(
        address target,
        bytes memory callData
    ) internal view returns (bytes memory out) {
        (bool ok, bytes memory ret) = target.staticcall(callData);
        if (ok) out = ret;
    }

    function _tryBytesArray(
        address target,
        bytes memory callData
    ) internal view returns (bytes[] memory out) {
        (bool ok, bytes memory ret) = target.staticcall(callData);
        if (ok && ret.length > 0) {
            out = abi.decode(ret, (bytes[]));
        } else {
            out = new bytes[](0);
        }
    }

    /// Best-effort call into SafeWallet.getTotalsByKind(user, kind, true)
    /// Returns (usdWad, ramaWei), zero if method missing.
    function _totalsByKind(
        address user,
        uint8 kind
    ) internal view returns (uint256 usdWad, uint256 ramaWei) {
        (bool ok, bytes memory ret) = cfg.safeWallet().staticcall(
            abi.encodeWithSignature(
                "getTotalsByKind(address,uint8,bool)",
                user,
                kind,
                true // credits side
            )
        );
        if (ok && ret.length >= 96) {
            (usdWad, ramaWei, ) = abi.decode(ret, (uint256, uint256, uint256));
        }
    }
}
