// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "./interfaces/ICoreConfig.sol";
import "./interfaces/IUserRegistry.sol";
import "./interfaces/IPortfolioManager.sol";
import "./interfaces/ISlabManager.sol";

import "./interfaces/ISafeWallet.sol";
import "./interfaces/IPriceOracleDaily.sol";
import "./interfaces/IRamaOracle.sol";
// Note: Avoid importing implementation contracts for types; use interfaces only.

/* ========================================================================== */
/*                                 INTERFACES                                 */
/* ========================================================================== */

interface ICappingIncomeManagerView {
    function totalIncomeEarnedUSD6(
        address user
    ) external view returns (uint256);
}

// interface ISlabManagerView is ISlabManager {
//     function getAchievedSlabsWithTimes(
//         address user
//     ) external view returns (uint8[] memory idxs, uint64[] memory times);
//     function getAchievedRewardsWithTimes(
//         address user
//     ) external view returns (uint8[] memory idxs, uint64[] memory times);
// }

interface ISlabManagerView is ISlabManager {
    // already had:
    function getAchievedSlabsWithTimes(
        address user
    ) external view returns (uint8[] memory idxs, uint64[] memory times);
    function getAchievedRewardsWithTimes(
        address user
    ) external view returns (uint8[] memory idxs, uint64[] memory times);

    // NEW: expose top-3 legs and total (sumAll).
    // (Your SlabManager has _currentTop3AndSum internally — add a public view wrapper there.)
    function getTop3AndSum(
        address user
    )
        external
        view
        returns (
            uint256 L1,
            uint256 L2,
            uint256 L3,
            uint256 Lrest,
            uint256 sumAll
        );

    // NEW: expose full legs list with volumes (address + vol).
    // (Your SlabManager has getLegsDetailed(...) already — reuse it.)
    struct LegBusiness {
        address leg;
        uint256 volume;
    }
    function getLegsDetailed(
        address user
    ) external view returns (LegBusiness[] memory);
}

interface IROIDistributorView {
    function perPeriodPreview(
        address user,
        uint32 fromPeriod,
        uint32 toPeriod
    )
        external
        view
        returns (
            uint32[] memory periodIds,
            uint256[] memory usdPerPeriod,
            uint256[] memory ramaPerPeriod
        );

    function previewClaimPerPortfolio(
        address user
    )
        external
        view
        returns (
            uint256[] memory pids,
            uint256[] memory usdTotals,
            uint256[] memory ramaTotals,
            uint32 fromPeriod,
            uint32 lastPeriod
        );
    function getClaimHistorySlice(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (ClaimRec[] memory);

    struct ClaimRec {
        uint32 fromPeriod;
        uint32 toPeriod;
        uint256 usdTotal;
        uint256 ramaTotal;
        uint64 claimedAt;
        uint32 epoch;
    }
}

interface IIncomeDistributorView {
    struct DirectIncomeRec {
        address receiver;
        address receivedFrom;
        uint256 amountUsd;
        uint256 amountRama;
        uint256 portfolioId;
        uint64 timestamp;
        uint32 dayId;
    }

    function getDirectIncomeSummary(
        address user
    )
        external
        view
        returns (
            uint256 entries,
            uint256 lifetimeUsd,
            uint256 lifetimeRama,
            uint256 claimableRama
        );

    function getDirectIncomeSlice(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (DirectIncomeRec[] memory out);
}

interface IRewardVaultView {
    struct RewardClaim {
        uint8 milestoneIdx;
        uint256 usdReward;
        uint256 ramaAmount;
        uint256 qualifiedUsdAt;
        uint64 timestamp;
    }
    function getUserClaimsSlice(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (RewardClaim[] memory);
}

interface IRoyaltyManagerView {
    function royalty(address user) external view returns (uint8, uint64, bool);
    function claimed(uint64 monthId, address user) external view returns (bool);
}

interface ISafeWalletView is ISafeWallet {
    function getWithdrawalHistorySlice(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (ISafeWallet.Withdrawals[] memory);

    function getLedgerSlice(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (LedgerEntry[] memory out);

    function getTransactionsByKind(
        address user,
        uint8 kind,
        bool isCredit,
        uint256 offset,
        uint256 limit
    ) external view returns (LedgerEntry[] memory slice, uint256 totalMatched);
}

/* ========================================================================== */
/*                              MAIN CONTRACT                                 */
/* ========================================================================== */

contract ComprehensiveView is
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    ICoreConfig public cfg;

    function initialize(address _cfg) external initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        cfg = ICoreConfig(_cfg);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    /* ========================================================================== */
    /*                                 DATA STRUCTS                               */
    /* ========================================================================== */

    struct AchievedInfo {
        uint8 index;
        uint64 timestamp;
    }

    struct PortfolioDetails {
        uint256 pid;
        uint128 principal;
        uint128 principalUsd;
        uint128 credited;
        uint64 createdAt;
        uint64 frozenUntil;
        bool booster;
        uint8 tier;
        uint8 capPct;
        address owner;
        address activatedBy;
        bool isCapped;
        bool isClosed;
        bool isActive;
    }

    struct OverallCapStatus {
        uint256 totalPortfolioValueUSD6;
        uint256 cap4xUSD6;
        uint256 totalIncomeEarnedUSD6;
        uint256 remainingCapUSD6;
    }

    struct AchievementStatus {
        AchievedInfo[] slabAchievements;
        AchievedInfo[] rewardAchievements;
    }

    struct DownlineMemberRoi {
        address member;
        uint256 totalPortfolioValueUSD;
        uint256 totalRoiEarnedUSD;
        uint256 totalRoiEarnedRama;
    }

    struct LegDiagnostic {
        address leg;
        uint256 businessVolumeUSD;
        bool hasActiveMin50Portfolio;
        bool meetsDirectsRequirementForSlab;
    }

    struct IncomeTotals {
        uint256 roiUsd;
        uint256 roiRama;
        uint256 directUsd;
        uint256 directRama;
        uint256 slabUsd;
        uint256 slabRama;
        uint256 royaltyUsd;
        uint256 royaltyRama;
        uint256 rewardUsd;
        uint256 rewardRama;
    }

    struct RoiPortfolioClaim {
        uint256 pid;
        uint256 usdTotalMicro;
        uint256 ramaTotalWei;
    }

    struct DirectIncomeDetails {
        IIncomeDistributorView.DirectIncomeRec[] records;
        uint256 totalEntries;
        uint256 lifetimeUsd;
        uint256 lifetimeRama;
    }

    struct TransactionHistory {
        ISafeWallet.LedgerEntry[] ledgerEntries;
        ISafeWallet.Withdrawals[] withdrawals;
    }

    struct TeamSummary {
        uint32 totalDirects;
        uint256 totalTeamSize;
        uint256 qualifiedBusinessUSD;
        uint256 rawTeamBusinessUSD;
    }

    struct LegBusinessDetails {
        uint256 L1_USD;
        uint256 L2_USD;
        uint256 Lrest_USD;
        uint256 qualifiedT_USD;
        uint256 requiredForL1_USD;
        uint256 requiredForL2_USD;
        uint256 requiredForLrest_USD;
        bool meets403030;
    }

    struct TeamMemberDetails {
        address member;
        uint256 totalPortfolioValueUSD;
        uint256 totalEarningsUSD;
        uint256 teamBusinessUSD;
        uint8 slabLevel;
        uint8 royaltyLevel;
        bool isSlabEligible;
    }

    /* ========================================================================== */
    /*                               PORTFOLIO & CAP                              */
    /* ========================================================================== */

    function getPortfolioDetails(
        address user
    ) external view returns (PortfolioDetails[] memory) {
        IPortfolioManager pm = IPortfolioManager(cfg.portfolioManager());
        uint256[] memory pids = pm.portfoliosOf(user);
        PortfolioDetails[] memory details = new PortfolioDetails[](pids.length);

        for (uint i = 0; i < pids.length; i++) {
            IPortfolioManager.Portfolio memory p = pm.getPortfolio(pids[i]);
            uint256 cap = (uint256(p.principal) * p.capPct) / 100;
            bool isCapped = uint256(p.credited) >= cap;
            bool isFrozen = p.frozenUntil != 0 &&
                block.timestamp <= p.frozenUntil;

            details[i] = PortfolioDetails({
                pid: pids[i],
                principal: p.principal,
                principalUsd: p.principalUsd,
                credited: p.credited,
                createdAt: p.createdAt,
                frozenUntil: p.frozenUntil,
                booster: p.booster,
                tier: p.tier,
                capPct: p.capPct,
                owner: p.owner,
                activatedBy: address(0), // This info is in PM but not in the struct, would need a new getter
                isCapped: isCapped,
                isClosed: isCapped || isFrozen, // Simplified logic, PM has `isClosed` flag
                isActive: !isCapped && !isFrozen
            });
        }
        return details;
    }

    function getActivePortfoliosCount(
        address user
    ) external view returns (uint256) {
        IPortfolioManager pm = IPortfolioManager(cfg.portfolioManager());
        uint256[] memory pids = pm.portfoliosOf(user);
        uint256 activeCount = 0;
        for (uint i = 0; i < pids.length; i++) {
            IPortfolioManager.Portfolio memory p = pm.getPortfolio(pids[i]);
            uint256 cap = (uint256(p.principal) * p.capPct) / 100;
            bool isCapped = uint256(p.credited) >= cap;
            bool isFrozen = p.frozenUntil != 0 &&
                block.timestamp <= p.frozenUntil;
            if (!isCapped && !isFrozen) {
                activeCount++;
            }
        }
        return activeCount;
    }

    function getOverallCapStatus(
        address user
    ) external view returns (OverallCapStatus memory status) {
        IPortfolioManager pm = IPortfolioManager(cfg.portfolioManager());
        ICappingIncomeManagerView cim = ICappingIncomeManagerView(
            cfg.cappingIncomeManager()
        );

        uint256[] memory pids = pm.portfoliosOf(user);
        for (uint i = 0; i < pids.length; i++) {
            status.totalPortfolioValueUSD6 += pm.getUSDPrincipal(pids[i]);
        }

        status.cap4xUSD6 = status.totalPortfolioValueUSD6 * 4;
        status.totalIncomeEarnedUSD6 = cim.totalIncomeEarnedUSD6(user);

        if (status.cap4xUSD6 > status.totalIncomeEarnedUSD6) {
            status.remainingCapUSD6 =
                status.cap4xUSD6 -
                status.totalIncomeEarnedUSD6;
        } else {
            status.remainingCapUSD6 = 0;
        }
    }

    /* ========================================================================== */
    /*                                     ROI                                    */
    /* ========================================================================== */

    function getRoiClaimHistory(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (IROIDistributorView.ClaimRec[] memory) {
        // IROIDistributorView roiDist = IROIDistributorView(cfg.roiDistributor());

        address roiDistAddr = cfg.roiDistributorView();
        if (roiDistAddr == address(0)) {
            return new IROIDistributorView.ClaimRec[](0);
        }
        IROIDistributorView roiDist = IROIDistributorView(roiDistAddr);
        return roiDist.getClaimHistorySlice(user, offset, limit);
    }

    function getUnclaimedRoi(
        address user
    )
        external
        view
        returns (
            RoiPortfolioClaim[] memory claims,
            uint32 fromPeriod,
            uint32 toPeriod
        )
    {
        address roiDistAddr = cfg.roiDistributorView();
        if (roiDistAddr == address(0)) {
            // If ROI distributor is not set, return empty arrays and zero periods
            return (new RoiPortfolioClaim[](0), 0, 0);
        }
        IROIDistributorView roiDist = IROIDistributorView(roiDistAddr);

        (
            uint256[] memory pids,
            uint256[] memory usdTotals,
            uint256[] memory ramaTotals,
            uint32 from,
            uint32 to
        ) = roiDist.previewClaimPerPortfolio(user); // solhint-disable-line no-empty-blocks

        claims = new RoiPortfolioClaim[](pids.length); // Correct: Initialize array with length
        for (uint i = 0; i < pids.length; i++) {
            claims[i] = RoiPortfolioClaim({
                pid: pids[i],
                usdTotalMicro: usdTotals[i],
                ramaTotalWei: ramaTotals[i]
            });
        }
        fromPeriod = from;
        toPeriod = to;
    }

    function getTodayRoi(
        address user
    ) external view returns (uint256 usdSum, uint256 ramaSum) {
        ISafeWallet sw = ISafeWallet(cfg.safeWallet());
        IPriceOracleDaily oracle = IPriceOracleDaily(cfg.dailyPriceOracle());
        uint32 today = oracle.todayId();
        return sw.getUserRoiForDay(user, today);
    }

    function getTotalRoi(
        address user
    ) external view returns (uint256 usdSum, uint256 ramaSum, uint256 count) {
        ISafeWallet sw = ISafeWallet(cfg.safeWallet());
        // TxKind.ROI is 0
        return sw.getTotalsByKind(user, 0, true);
    }

    /* ========================================================================== */
    /*                                DIRECT INCOME                               */
    /* ========================================================================== */

    function getDirectIncomeDetails(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (DirectIncomeDetails memory details) {
        IIncomeDistributorView id = IIncomeDistributorView(
            cfg.incomeDistributor()
        );
        (details.totalEntries, details.lifetimeUsd, details.lifetimeRama, ) = id
            .getDirectIncomeSummary(user);
        details.records = id.getDirectIncomeSlice(user, offset, limit);
    }

    /* ========================================================================== */
    /*                            TRANSACTION HISTORY                             */
    /* ========================================================================== */

    function getTransactionHistory(
        address user,
        uint256 ledgerOffset,
        uint256 ledgerLimit,
        uint256 withdrawalOffset,
        uint256 withdrawalLimit
    ) external view returns (TransactionHistory memory) {
        TransactionHistory memory history; // Initialize the return struct
        ISafeWalletView sw = ISafeWalletView(cfg.safeWallet());

        history.ledgerEntries = sw.getLedgerSlice(
            user,
            ledgerOffset,
            ledgerLimit
        );
        history.withdrawals = sw.getWithdrawalHistorySlice(
            user,
            withdrawalOffset,
            withdrawalLimit
        );
        return history;
    }

    function getIncomeHistoryByKind(
        address user,
        uint8 kind,
        uint256 offset,
        uint256 limit
    )
        external
        view
        returns (ISafeWallet.LedgerEntry[] memory slice, uint256 total)
    {
        ISafeWalletView sw = ISafeWalletView(cfg.safeWallet());
        return sw.getTransactionsByKind(user, kind, true, offset, limit);
    }

    function getRewardIncomeHistory(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (IRewardVaultView.RewardClaim[] memory) {
        IRewardVaultView rv = IRewardVaultView(cfg.rewardVault());
        return rv.getUserClaimsSlice(user, offset, limit);
    }

    /* ========================================================================== */
    /*                                TEAM / NETWORK                               */
    /* ========================================================================== */

    function getTeamSummary(
        address user,
        uint8 maxDepth
    ) external view returns (TeamSummary memory summary) {
        (ISlabManagerView smv, IUserRegistry ur) = (
            ISlabManagerView(cfg.slabManager()),
            IUserRegistry(cfg.userRegistry())
        );

        summary.totalDirects = ur.getUser(user).directsCount;
        summary.qualifiedBusinessUSD = smv.getQualifiedBusinessUSD(user);

        // team size stays the same
        uint256[] memory counts = ur.getLevelTeamCounts(user, maxDepth);
        for (uint i = 0; i < counts.length; i++)
            summary.totalTeamSize += counts[i];

        // RAW team business under the hood (uncapped total across all legs)
        (, , , , uint256 sumAll) = smv.getTop3AndSum(user);
        summary.rawTeamBusinessUSD = sumAll;
    }

    // function getLegBusinessDetails(
    //     address user
    // ) external view returns (LegBusinessDetails memory details) {
    //     ISlabManager sm = ISlabManager(cfg.slabManager());
    //     (details.L1_USD, details.L2_USD, details.Lrest_USD) = sm
    //         .getLegsTop2AndRest(user);

    //     if (details.L1_USD > 0) {
    //         uint256 t1 = (details.L1_USD * 10) / 4; // L1 / 0.4
    //         uint256 t2 = (details.L2_USD * 10) / 3; // L2 / 0.3
    //         uint256 t3 = (details.Lrest_USD * 10) / 3; // Lrest / 0.3

    //         details.qualifiedT_USD = t1;
    //         if (t2 < details.qualifiedT_USD) details.qualifiedT_USD = t2;
    //         if (t3 < details.qualifiedT_USD) details.qualifiedT_USD = t3;

    //         details.requiredForL1_USD = (details.qualifiedT_USD * 4) / 10;
    //         details.requiredForL2_USD = (details.qualifiedT_USD * 3) / 10;
    //         details.requiredForLrest_USD = (details.qualifiedT_USD * 3) / 10;

    //         details.meets403030 =
    //             details.L1_USD >= details.requiredForL1_USD &&
    //             details.L2_USD >= details.requiredForL2_USD &&
    //             details.Lrest_USD >= details.requiredForLrest_USD;
    //     }
    // }

    function getLegBusinessDetails(
        address user
    ) external view returns (LegBusinessDetails memory details) {
        ISlabManagerView sm = ISlabManagerView(cfg.slabManager());
        IUserRegistry ur = IUserRegistry(cfg.userRegistry());
        uint32 directs = ur.getUser(user).directsCount;

        (uint256 L1, uint256 L2, uint256 L3, uint256 Lrest, ) = sm
            .getTop3AndSum(user);
        details.L1_USD = L1;
        details.L2_USD = L2;
        // keep naming: Lrest is “everything beyond top-2”
        details.Lrest_USD = Lrest;

        // T is the highest threshold satisfied under the TWO-PATH rule in SlabManager
        uint256 T = sm.getQualifiedBusinessUSD(user);
        details.qualifiedT_USD = T;

        // Show 40/30/30 minima against the achieved T for diagnostics.
        // For >3 directs, these minima are just informative; user may have qualified via the capped-sum path.
        uint256 req40 = (T * 40) / 100;
        uint256 req30 = (T * 30) / 100;

        details.requiredForL1_USD = req40;
        details.requiredForL2_USD = req30;
        details.requiredForLrest_USD = req30; // this is effectively the L3 requirement

        // “Strict 40/30/30” satisfied?
        // Note: for >3 directs, this can be false even when user qualifies via the capped-sum path in SlabManager.
        details.meets403030 = (L1 >= req40 && L2 >= req30 && L3 >= req30);

        // Nothing else to do here — the capped-sum path is already handled in SlabManager.getQualifiedBusinessUSD
    }

    // function getLegBusinessDetails(
    //     address user
    // ) external view returns (LegBusinessDetails memory details) {
    //     ISlabManagerView sm = ISlabManagerView(cfg.slabManager());
    //     IUserRegistry ur = IUserRegistry(cfg.userRegistry());

    //     (uint256 L1, uint256 L2, uint256 L3, uint256 Lrest, uint256 sumAll) = sm
    //         .getTop3AndSum(user);
    //     details.L1_USD = L1;
    //     details.L2_USD = L2;
    //     // For backward-compat field naming, keep Lrest as “everything beyond top-2”
    //     details.Lrest_USD = Lrest;

    //     // Compute T per-new-rules:
    //     // - ≤3 directs: strict 40/30/30 on top-3 only
    //     // - >3 directs: T = max( T40(top-3), sumAll )
    //     uint32 directs = ur.getUser(user).directsCount;

    //     // T40 over top-3
    //     uint256 t1 = (L1 * 5) / 2; // L1 / 0.40
    //     uint256 t2 = (L2 * 10) / 3; // L2 / 0.30
    //     uint256 t3 = (L3 * 10) / 3; // L3 / 0.30
    //     uint256 T40 = t1;
    //     if (t2 < T40) T40 = t2;
    //     if (t3 < T40) T40 = t3;

    //     if (directs <= 3) {
    //         details.qualifiedT_USD = T40;
    //         // required minima for the achieved T (for diagnostics)
    //         details.requiredForL1_USD = (details.qualifiedT_USD * 40) / 100;
    //         details.requiredForL2_USD = (details.qualifiedT_USD * 30) / 100;
    //         // reuse “Lrest” field to show the **third leg** requirement under the new rule
    //         details.requiredForLrest_USD = (details.qualifiedT_USD * 30) / 100;
    //         details.meets403030 =
    //             (L1 >= details.requiredForL1_USD) &&
    //             (L2 >= details.requiredForL2_USD) &&
    //             (L3 >= details.requiredForLrest_USD);
    //     } else {
    //         // >3 directs: fallback allowed to total
    //         details.qualifiedT_USD = (T40 > sumAll) ? T40 : sumAll;
    //         // When total path is used, per-bucket minima do not apply.
    //         // Still, expose the 40/30/30 minima for UI if someone wants to see top-3 status.
    //         details.requiredForL1_USD = (details.qualifiedT_USD * 40) / 100;
    //         details.requiredForL2_USD = (details.qualifiedT_USD * 30) / 100;
    //         details.requiredForLrest_USD = (details.qualifiedT_USD * 30) / 100;
    //         // Mark whether the STRICT top-3 rule is satisfied right now:
    //         details.meets403030 =
    //             (L1 >= (details.qualifiedT_USD * 40) / 100) &&
    //             (L2 >= (details.qualifiedT_USD * 30) / 100) &&
    //             (L3 >= (details.qualifiedT_USD * 30) / 100);
    //         // NOTE: Even if meets403030 == false, user may still qualify via sumAll path.
    //     }
    // }

    function getLegWiseTeamDetails(
        address user,
        address leg,
        uint8 maxDepth
    ) external view returns (TeamMemberDetails[] memory memberDetails) {
        IUserRegistry ur = IUserRegistry(cfg.userRegistry());
        require(ur.isDirectLeg(user, leg), "NOT_DIRECT_LEG");

        address[] memory teamMembers = ur.getLegSubtreeFlat(
            user,
            leg,
            maxDepth
        );
        memberDetails = new TeamMemberDetails[](teamMembers.length);

        for (uint i = 0; i < teamMembers.length; i++) {
            address member = teamMembers[i];
            memberDetails[i] = getTeamMemberDetails(member);
        }
    }

    function getTeamMemberDetails(
        address member
    ) public view returns (TeamMemberDetails memory details) {
        IPortfolioManager pm = IPortfolioManager(cfg.portfolioManager());
        ISlabManager sm = ISlabManager(cfg.slabManager());
        IRoyaltyManagerView rm = IRoyaltyManagerView(cfg.royaltyManager());
        ISafeWallet sw = ISafeWallet(cfg.safeWallet());

        details.member = member;

        uint256[] memory pids = pm.portfoliosOf(member);
        for (uint j = 0; j < pids.length; j++) {
            details.totalPortfolioValueUSD += pm.getUSDPrincipal(pids[j]);
        }

        // Summing up different income kinds from SafeWallet
        uint256 totalRama;
        (uint256 u0, uint256 r0, ) = sw.getTotalsByKind(member, 0, true); // ROI
        (uint256 u1, uint256 r1, ) = sw.getTotalsByKind(member, 1, true); // Growth
        (uint256 u2, uint256 r2, ) = sw.getTotalsByKind(member, 2, true); // Royalty
        (uint256 u3, uint256 r3, ) = sw.getTotalsByKind(member, 3, true); // Slab
        (uint256 u4, uint256 r4, ) = sw.getTotalsByKind(member, 4, true); // Reward
        (uint256 u5, uint256 r5, ) = sw.getTotalsByKind(member, 5, true); // Direct
        details.totalEarningsUSD = u0 + u1 + u2 + u3 + u4 + u5;
        totalRama = r0 + r1 + r2 + r3 + r4 + r5;

        // If USD is 0, approximate from RAMA
        if (details.totalEarningsUSD == 0 && totalRama > 0) {
            IRamaOracle oracle = IRamaOracle(cfg.priceOracle());
            details.totalEarningsUSD = oracle.ramaToUSD(totalRama);
        }

        details.teamBusinessUSD = sm.getQualifiedBusinessUSD(member);
        details.slabLevel = sm.getSlabIndex(member);
        (details.royaltyLevel, , ) = rm.royalty(member);
        details.isSlabEligible = sm.canClaim(member);
        // details.isSlabEligible = false;
        // details.isSlabEligible = sm.canClaim(member);
    }

    // function getTopLegsWithBusiness(
    //     address user
    // ) external view returns (address[] memory legs, uint256[] memory volumes) {
    //     IUserRegistry ur = IUserRegistry(cfg.userRegistry());
    //     ISlabManager sm = ISlabManager(cfg.slabManager());

    //     legs = ur.getTopLegs(user);
    //     volumes = new uint256[](legs.length);

    //     (uint256 L1, uint256 L2, uint256 Lrest) = sm.getLegsTop2AndRest(user);

    //     // This is a simplification. SlabManager doesn't expose per-leg volume directly.
    //     // To get this accurately, SlabManager would need a new view function.
    //     // For now, we can only return the sorted L1, L2, Lrest, not which leg corresponds to which.
    //     // A more advanced implementation would require changes to SlabManager.
    //     if (legs.length > 0) volumes[0] = L1;
    //     if (legs.length > 1) volumes[1] = L2;
    //     // The rest are combined in Lrest.
    // }

    function getTopLegsWithBusiness(
        address user
    ) external view returns (address[] memory legs, uint256[] memory volumes) {
        ISlabManagerView sm = ISlabManagerView(cfg.slabManager());
        ISlabManagerView.LegBusiness[] memory arr = sm.getLegsDetailed(user);

        // Optional: sort desc by volume (simple insertion sort to avoid extra code)
        for (uint i = 1; i < arr.length; i++) {
            ISlabManagerView.LegBusiness memory key = arr[i];
            uint j = i;
            while (j > 0 && arr[j - 1].volume < key.volume) {
                arr[j] = arr[j - 1];
                j--;
            }
            arr[j] = key;
        }

        legs = new address[](arr.length);
        volumes = new uint256[](arr.length);
        for (uint i = 0; i < arr.length; i++) {
            legs[i] = arr[i].leg;
            volumes[i] = arr[i].volume;
        }
    }

    /* ========================================================================== */
    /*                                 TOTAL VOLUME                               */
    /* ========================================================================== */

    function getUserTotalVolume(
        address user
    ) external view returns (uint256 totalVolumeUSD) {
        IPortfolioManager pm = IPortfolioManager(cfg.portfolioManager());
        ISlabManager sm = ISlabManager(cfg.slabManager());

        uint256 selfVolume;
        uint256[] memory pids = pm.portfoliosOf(user);
        for (uint i = 0; i < pids.length; i++) {
            selfVolume += pm.getUSDPrincipal(pids[i]);
        }

        (uint256 L1, uint256 L2, uint256 Lrest) = sm.getLegsTop2AndRest(user);
        uint256 teamVolume = L1 + L2 + Lrest;

        return selfVolume + teamVolume;
    }

    /* ========================================================================== */
    /*                            DOWNLINE & DIAGNOSTICS                          */
    /* ========================================================================== */

    function getDownlineRoiView(
        address user
    ) external view returns (DownlineMemberRoi[] memory) {
        IUserRegistry ur = IUserRegistry(cfg.userRegistry());
        address[] memory directs = ur.getDirects(user);
        DownlineMemberRoi[] memory results = new DownlineMemberRoi[](
            directs.length
        );

        for (uint i = 0; i < directs.length; i++) {
            address member = directs[i];
            TeamMemberDetails memory details = getTeamMemberDetails(member);
            (uint256 roiUsd, uint256 roiRama, ) = ISafeWallet(cfg.safeWallet())
                .getTotalsByKind(member, 0, true);
            results[i] = DownlineMemberRoi({
                member: member,
                totalPortfolioValueUSD: details.totalPortfolioValueUSD,
                totalRoiEarnedUSD: roiUsd,
                totalRoiEarnedRama: roiRama
            });
        }
        return results;
    }

    function getLegDiagnostic(
        address user,
        address leg
    ) external view returns (LegDiagnostic memory diagnostic) {
        IUserRegistry ur = IUserRegistry(cfg.userRegistry());
        ISlabManager sm = ISlabManager(cfg.slabManager());
        IPortfolioManager pm = IPortfolioManager(cfg.portfolioManager());

        require(ur.isDirectLeg(user, leg), "NOT_DIRECT_LEG");

        diagnostic.leg = leg;
        // SlabManager does not expose per-leg business directly in the current interface.
        // Set to 0 or extend ISlabManager with a dedicated view to compute this accurately.
        diagnostic.businessVolumeUSD = 0;
        diagnostic.hasActiveMin50Portfolio = pm.hasActiveMin50(leg);

        uint8 slabIdx = sm.getSlabIndex(leg);
        diagnostic.meetsDirectsRequirementForSlab =
            ur.getUser(leg).directsCount >= slabIdx + 1;
    }

    function getFilteredPortfolios(
        address user,
        bool getClosed,
        bool getFrozen,
        bool getCapped
    ) external view returns (PortfolioDetails[] memory) {
        IPortfolioManager pm = IPortfolioManager(cfg.portfolioManager());
        uint256[] memory pids = pm.portfoliosOf(user);
        PortfolioDetails[] memory allDetails = new PortfolioDetails[](
            pids.length
        );
        uint256 count = 0;

        for (uint i = 0; i < pids.length; i++) {
            IPortfolioManager.Portfolio memory p = pm.getPortfolio(pids[i]);
            uint256 cap = (uint256(p.principal) * p.capPct) / 100;
            bool isCapped = uint256(p.credited) >= cap;
            bool isFrozen = p.frozenUntil != 0 &&
                block.timestamp <= p.frozenUntil;
            bool isClosed = p.isClosed;

            if (
                (getClosed && isClosed) ||
                (getFrozen && isFrozen) ||
                (getCapped && isCapped)
            ) {
                allDetails[count++] = PortfolioDetails({
                    pid: pids[i],
                    principal: p.principal,
                    principalUsd: p.principalUsd,
                    credited: p.credited,
                    createdAt: p.createdAt,
                    frozenUntil: p.frozenUntil,
                    booster: p.booster,
                    tier: p.tier,
                    capPct: p.capPct,
                    owner: p.owner,
                    activatedBy: p.activatedBy,
                    isCapped: isCapped,
                    isClosed: isClosed,
                    isActive: !isClosed && !isFrozen && !isCapped
                });
            }
        }

        PortfolioDetails[] memory result = new PortfolioDetails[](count);
        for (uint i = 0; i < count; i++) {
            result[i] = allDetails[i];
        }
        return result;
    }

    /* ========================================================================== */
    /*                           INCOME & ACHIEVEMENTS                            */
    /* ========================================================================== */

    function getIncomeTotals(
        address user
    ) external view returns (IncomeTotals memory totals) {
        ISafeWallet sw = ISafeWallet(cfg.safeWallet());
        // TxKind: ROI=0, Growth=1, Royalty=2, Slab=3, Reward=4, Direct=5
        (totals.roiUsd, totals.roiRama, ) = sw.getTotalsByKind(user, 0, true);
        (uint256 growthUsd, uint256 growthRama, ) = sw.getTotalsByKind(
            user,
            1,
            true
        );
        totals.roiUsd += growthUsd; // Combine ROI and Growth
        totals.roiRama += growthRama;

        (totals.royaltyUsd, totals.royaltyRama, ) = sw.getTotalsByKind(
            user,
            2,
            true
        );
        (totals.slabUsd, totals.slabRama, ) = sw.getTotalsByKind(user, 3, true);
        (totals.rewardUsd, totals.rewardRama, ) = sw.getTotalsByKind(
            user,
            4,
            true
        );
        (totals.directUsd, totals.directRama, ) = sw.getTotalsByKind(
            user,
            5,
            true
        );
    }

    function getAchievementStatus(
        address user
    ) external view returns (AchievementStatus memory status) {
        ISlabManagerView sm = ISlabManagerView(cfg.slabManager());

        (uint8[] memory slabIdxs, uint64[] memory slabTimes) = sm
            .getAchievedSlabsWithTimes(user);
        status.slabAchievements = new AchievedInfo[](slabIdxs.length);
        for (uint i = 0; i < slabIdxs.length; i++) {
            status.slabAchievements[i] = AchievedInfo({
                index: slabIdxs[i],
                timestamp: slabTimes[i]
            });
        }

        (uint8[] memory rewardIdxs, uint64[] memory rewardTimes) = sm
            .getAchievedRewardsWithTimes(user);
        status.rewardAchievements = new AchievedInfo[](rewardIdxs.length);
        for (uint i = 0; i < rewardIdxs.length; i++) {
            status.rewardAchievements[i] = AchievedInfo({
                index: rewardIdxs[i],
                timestamp: rewardTimes[i]
            });
        }

        // Note: Royalty achievements are also tracked in SlabManager, but the getter was not in the provided interface.
        // If `getAchievedRoyaltiesWithTimes` exists on SlabManager, it can be added here.
    }

    function getSlabIncomeTotal(
        address user
    ) external view returns (uint256 usd, uint256 rama, uint256 count) {
        // TxKind.Slab is 3
        return ISafeWallet(cfg.safeWallet()).getTotalsByKind(user, 3, true);
    }
}
