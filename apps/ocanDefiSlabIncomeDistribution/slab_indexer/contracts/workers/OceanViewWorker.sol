// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/*
 * OceanViewWorker
 * ---------------
 * Stateless, read-only worker that assembles all the heavy view data.
 * OceanViewV2 forwards to these functions to stay under EIP-170 code size limits.
 */

import "../interfaces/ICoreConfig.sol";
import "../interfaces/IRamaOracle.sol";

/// ===== Minimal external views used by the worker =====
interface IRewardVaultView {
    function getUserTotals(
        address user
    ) external view returns (uint256 usdTotalWad, uint256 ramaTotalWei);
}
interface IIncomeDistributorView {
    function getDirectIncomeSummary(
        address user
    )
        external
        view
        returns (
            uint256 entries,
            uint256 lifetimeUsdWad,
            uint256 lifetimeRamaWei,
            uint256 claimableRamaWei
        );
}
interface ISafeWalletViewKinds {
    // SafeWallet.TxKind: ROI=0, Growth=1, Royalty=2, Slab=3, Reward=4, DirectIncome=5
    function getTotalsByKind(
        address user,
        uint8 kind,
        bool isCredit
    )
        external
        view
        returns (uint256 usdSumWad, uint256 ramaSumWei, uint256 count);
}
interface IROIDistributorView {
    function epochSeconds() external view returns (uint32);
    function lastClaimPeriod(address user) external view returns (uint32);
    function ROIForAPortfolio(
        uint256 pid,
        uint32 fromPeriod,
        uint32 toPeriod
    )
        external
        view
        returns (uint256 usdTotal, uint256 ramaTotal, uint32 epochsCount);
    function previewClaimPerPortfolio(
        address user
    )
        external
        view
        returns (
            uint256[] memory pids,
            uint256[] memory usdTotalsMicro,
            uint256[] memory ramaTotalsWei,
            uint32 fromPeriod,
            uint32 lastPeriod
        );
    function paidUsdByPid(uint256 pid) external view returns (uint256);
    function _autoWindow(
        address user
    ) external view returns (uint32 fromPeriod, uint32 lastPeriod);
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
            uint256[] memory ramaPerPeriod,
            uint32 epochsCount
        );

    struct ClaimRec {
        uint32 fromPeriod;
        uint32 toPeriod;
        uint256 usdTotal;
        uint256 ramaTotal;
        uint64 claimedAt;
        uint32 epoch;
    }
    struct PidClaim {
        uint256 pid;
        uint256 usdTotal;
        uint256 ramaTotal;
    }

    function getClaimHistoryCount(address user) external view returns (uint256);
    function getClaimHistorySlice(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (ClaimRec[] memory);
    function getPidClaimsSlice(
        address user,
        uint32 epoch,
        uint256 offset,
        uint256 limit
    ) external view returns (PidClaim[] memory);
}
interface IOceanQueryUpgradeable {
    function getIncomeStreamTotals(
        address user
    ) external view returns (uint256, uint256, uint256, uint256, uint256);
    function getTotalClaimableIncome(
        address user
    ) external view returns (uint256);
    function getPortfolioGrowthIncome(
        address user
    ) external view returns (uint256);
    function getSlabIncome(address user) external view returns (uint256);
    function getSlabIncomeAvailable(
        address user
    ) external view returns (uint256);
    function getRoyaltyIncome(address user) external view returns (uint256);
    function getSameSlabOverrideIncome(
        address user
    ) external view returns (uint256);
    function getSameSlabOverrideEarnings(
        address user
    ) external view returns (uint256, uint256, uint256);
    function getOneTimeRewardIncome(
        address user
    ) external view returns (uint256);
    function getSafeWalletBalance(address user) external view returns (uint256);
    function getAccruedGrowth(address user) external view returns (uint256);
    function getPortfolioCapProgress(
        uint256 pid
    ) external view returns (uint256);
    function getLifetimeCapProgress(
        address user
    ) external view returns (uint256);
    function getDailyGrowthRate(uint256 pid) external view returns (uint256);
    function canClaimRoyalty(address user) external view returns (bool);
    function getRoyaltyRenewalRequirement(
        address user
    ) external view returns (bool paused, uint256 lastT, uint256 nowT);
    function getNextRoyaltyClaimDate(
        address user
    ) external view returns (uint64 lastMonthEpoch, uint64 nextMonthEpoch);
}
interface IOceanViewLegacy {
    struct UserOverview {
        uint256 totalStakedRama;
        uint256 totalStakedUSD;
        uint256 totalSafeWalletRama;
        uint256 totalRoiUsdPaid;
        uint32 directCount;
        uint256 teamCount;
        address uplineSponsor;
        uint8 slabIndex;
        uint256 qualifiedVolumeUSD;
        bool slabCanClaim;
        uint8 royaltyTier;
        uint64 royaltyLastMonthEpoch;
        bool royaltyPaused;
    }

    struct PortfolioSummary {
        uint256 pid;
        uint256 principalRama;
        uint256 principalUSD;
        uint256 capRama;
        uint256 creditedRama;
        uint8 capPct;
        bool booster;
        uint8 tier;
        uint256 dailyRateWad;
        bool active;
        uint64 createdAt;
        uint64 frozenUntil;
    }

    struct SlabPanel {
        uint8 slabIndex;
        uint256 qualifiedVolumeUSD;
        uint32 directMembers;
        bool canClaim;
    }

    struct RoyaltyPanel {
        uint8 currentLevel;
        uint64 lastPaidMonthEpoch;
        bool paused;
    }

    struct WalletPanel {
        uint256 safeRama;
        uint256 lifetimeRoiUsd;
    }

    function getPortfolioSummaries(
        address user
    ) external view returns (PortfolioSummary[] memory);
    function getPortfolioTotals(
        address user
    )
        external
        view
        returns (
            uint256 totalValueUSD,
            uint256 totalEarnedRama,
            uint32 directRefs,
            uint256 qualifiedVolumeUSD,
            uint8 royaltyLevel
        );
    function getSlabPanel(
        address user
    ) external view returns (SlabPanel memory);
    function getRoyaltyPanel(
        address user
    ) external view returns (RoyaltyPanel memory);
    function getWalletPanel(
        address user
    ) external view returns (WalletPanel memory);
    function getUserOverview(
        address user,
        uint8 teamDepthMax
    ) external view returns (UserOverview memory);
    function getLast7DaysEarningsUSD(
        address user,
        uint32 todayDayId
    )
        external
        view
        returns (uint32[7] memory dayIds, uint256[7] memory usdAmounts);
    function getTeamNetwork(
        address user,
        uint8 maxDepth
    )
        external
        view
        returns (
            address[] memory directs,
            uint32 directCount,
            uint256 teamCount
        );
    function getLastTransactions(
        address user,
        uint256 limit
    ) external view returns (bytes[] memory);
}
interface IPortfolioManagerForROI {
    struct Portfolio {
        uint256 pid;
        address owner;
        uint64 createdAt;
        uint64 frozenUntil;
        uint64 cappedAt;
        uint64 closedAt;
        uint256 principalUsd; // micro-USD (1e6)
        uint256 principalRama; // wei
        uint256 capRama; // wei
        uint8 capPct;
        uint8 tier;
        bool booster;
        bool active;
        bool isCapped;
        bool isClosed;
    }
    function getPortfolio(uint256 pid) external view returns (Portfolio memory);
    function portfoliosOf(
        address user
    ) external view returns (uint256[] memory);
}

interface ICappingIncomeManagerView {
    function hasOpenPortfolio(address user) external view returns (bool);
}

/// ===== Shared structs mirrored with OceanViewV2 (same field order/types) =====
contract OceanViewWorker {
    uint8 internal constant TEAM_DEPTH = 10;

    struct IncomeDashboardCompact {
        uint256 todayRoiUSD6;
        uint256 totalRoiUSD6;
        uint256 directUSD6;
        uint256 royaltyUSD6;
        uint256 slabUSD6;
        uint256 rewardUSD6;
    }

    struct PidIncomeToDate {
        uint256 pid;
        uint256 claimedUSD6;
        uint256 unclaimedUSD6;
        uint256 totalUSD6;
    }

    struct ClaimEpochView {
        uint32 fromPeriod;
        uint32 toPeriod;
        uint256 usdTotal;
        uint256 ramaTotal;
        uint64 claimedAt;
        uint32 epoch;
    }

    struct PidClaimViewFlat {
        uint32 epoch;
        uint256 pid;
        uint256 usdTotalUSD6;
        uint256 ramaTotalWei;
    }

    struct IncomeRollup {
        uint256 todayRoiUsdMicro;
        uint256 totalRoiClaimableUsdMicro;
        uint256 directIncomeUsdMicro;
        uint256 royaltyIncomeUsdMicro;
        uint256 slabIncomeUsdMicro;
        uint256 rewardsIncomeUsdMicro;
    }

    struct DashboardSummary {
        uint256 totalStakedUsdMicro;
        uint256 totalEarnedRamaWei;
        uint256 totalClaimableUsdMicro;
        uint256 accruedGrowthUsdMicro;
        uint256 accruedGrowthRamaWei;
        uint256 qualifiedVolumeUsdMicro;
        uint32 directRefs;
        uint256 teamCount;
        address upline;
        uint8 slabLevel;
        bool slabCanClaim;
        uint8 royaltyLevel;
        bool royaltyPaused;
        bool royaltyCanClaim;
        uint64 royaltyLastMonthEpoch;
        uint64 royaltyNextMonthEpoch;
        uint256 royaltyPaidMonths;
        uint256 royaltyRenewalSnapshotUsd;
        uint256 royaltyRecentSnapshotUsd;
    }

    struct IncomeSummary {
        uint256 totalUsdMicro;
        uint256 growthUsdMicro;
        uint256 slabUsdMicro;
        uint256 slabAvailableUsdMicro;
        uint256 royaltyUsdMicro;
        uint256 overrideUsdMicro; // <- direct income lane
        uint256 rewardsUsdMicro;
        uint256[3] overrideWaveUsdMicro;
    }

    struct WalletSummary {
        uint256 safeWalletRamaWei;
        uint256 safeWalletUsdMicro;
        uint256 lifetimeRoiUsdMicro;
        uint256 pendingGrowthRamaWei;
        uint256 pendingGrowthUsdMicro;
    }

    struct PortfolioCard {
        uint256 pid;
        uint256 principalRamaWei;
        uint256 principalUsdMicro;
        uint256 capRamaWei;
        uint256 capUsdMicro;
        uint256 creditedRamaWei;
        uint256 creditedUsdMicro;
        uint256 capProgressBps;
        uint256 dailyRateWad;
        uint8 capPct;
        uint8 tier;
        bool booster;
        bool active;
        uint64 createdAt;
        uint64 frozenUntil;
    }

    struct WeeklyEarnings {
        uint32[7] dayIds;
        uint256[7] usdAmounts;
    }

    struct TeamSummary {
        address[] directs;
        uint32 directCount;
        uint256 teamCount;
    }

    struct PortfolioROISummary {
        uint256 portfolioId;
        uint256 claimedROI;
        uint256 unclaimedROI;
        uint256 totalROI;
    }

    // -------- public worker methods (called by OceanViewV2) --------

    function buildIncomeSummary(
        ICoreConfig cfg,
        address user
    ) external view returns (IncomeSummary memory income) {
        // ROI (growth)
        address roiDistributorNew = cfg.roiDistributorView();
        if (roiDistributorNew != address(0)) {
            (, uint256[] memory usdTotals, , , ) = IROIDistributorView(
                roiDistributorNew
            ).previewClaimPerPortfolio(user);
            uint256 sum;
            for (uint256 i; i < usdTotals.length; ++i) sum += usdTotals[i];
            income.growthUsdMicro = sum;
        } else {
            income.growthUsdMicro = IOceanQueryUpgradeable(
                cfg.oceanQueryUpgradeable()
            ).getPortfolioGrowthIncome(user);
        }

        // Direct (lifetime, WAD->micro)
        {
            address dist = cfg.incomeDistributor();
            if (dist != address(0)) {
                (, uint256 lifetimeUsdWad, , ) = IIncomeDistributorView(dist)
                    .getDirectIncomeSummary(user);
                income.overrideUsdMicro = lifetimeUsdWad / 1e12;
            } else {
                (uint256 usdWad, , ) = ISafeWalletViewKinds(cfg.safeWallet())
                    .getTotalsByKind(user, 5, true);
                income.overrideUsdMicro = usdWad / 1e12;
            }
        }

        // Rewards
        {
            address rv = cfg.rewardVault();
            if (rv != address(0)) {
                (uint256 usdWad, ) = IRewardVaultView(rv).getUserTotals(user);
                income.rewardsUsdMicro = usdWad / 1e12;
            } else {
                (uint256 usdWad, , ) = ISafeWalletViewKinds(cfg.safeWallet())
                    .getTotalsByKind(user, 4, true);
                income.rewardsUsdMicro = usdWad / 1e12;
            }
        }

        // Slab
        {
            (uint256 usdWad, uint256 ramaWei, ) = ISafeWalletViewKinds(
                cfg.safeWallet()
            ).getTotalsByKind(user, 3, true);
            income.slabUsdMicro = usdWad > 0
                ? usdWad / 1e12
                : (ramaWei > 0 ? _ramaToUsd(cfg, ramaWei) : 0);
        }

        // Royalty
        {
            (uint256 usdWad, uint256 ramaWei, ) = ISafeWalletViewKinds(
                cfg.safeWallet()
            ).getTotalsByKind(user, 2, true);
            income.royaltyUsdMicro = usdWad > 0
                ? usdWad / 1e12
                : (ramaWei > 0 ? _ramaToUsd(cfg, ramaWei) : 0);
        }

        // Slab pending available
        income.slabAvailableUsdMicro = IOceanQueryUpgradeable(
            cfg.oceanQueryUpgradeable()
        ).getSlabIncomeAvailable(user);

        // Waves off
        income.overrideWaveUsdMicro = [uint256(0), uint256(0), uint256(0)];

        // Total
        income.totalUsdMicro =
            income.growthUsdMicro +
            income.slabUsdMicro +
            income.royaltyUsdMicro +
            income.overrideUsdMicro +
            income.rewardsUsdMicro;
    }

    function buildWalletSummary(
        ICoreConfig cfg,
        address user
    ) external view returns (WalletSummary memory w) {
        IOceanViewLegacy.WalletPanel memory panel = IOceanViewLegacy(
            cfg.oceanViewUpgradeable()
        ).getWalletPanel(user);
        uint256 safeRama = IOceanQueryUpgradeable(cfg.oceanQueryUpgradeable())
            .getSafeWalletBalance(user);
        if (safeRama == 0) safeRama = panel.safeRama;

        w.safeWalletRamaWei = safeRama;
        w.safeWalletUsdMicro = _ramaToUsd(cfg, safeRama);
        w.lifetimeRoiUsdMicro = panel.lifetimeRoiUsd;

        uint256 pendingGrowth = IOceanQueryUpgradeable(
            cfg.oceanQueryUpgradeable()
        ).getAccruedGrowth(user);
        w.pendingGrowthRamaWei = pendingGrowth;
        w.pendingGrowthUsdMicro = _ramaToUsd(cfg, pendingGrowth);
    }

    function buildPortfolioCards(
        ICoreConfig cfg,
        address user
    ) external view returns (PortfolioCard[] memory cards) {
        IOceanViewLegacy.PortfolioSummary[] memory base = IOceanViewLegacy(
            cfg.oceanViewUpgradeable()
        ).getPortfolioSummaries(user);
        cards = new PortfolioCard[](base.length);
        for (uint256 i; i < base.length; ++i) {
            uint256 pid = base[i].pid;
            cards[i].pid = pid;
            cards[i].principalRamaWei = base[i].principalRama;
            cards[i].principalUsdMicro = base[i].principalUSD;
            cards[i].capRamaWei = base[i].capRama;
            cards[i].capUsdMicro = _ramaToUsd(cfg, base[i].capRama);
            cards[i].creditedRamaWei = base[i].creditedRama;
            cards[i].creditedUsdMicro = _ramaToUsd(cfg, base[i].creditedRama);
            cards[i].capPct = base[i].capPct;
            cards[i].booster = base[i].booster;
            cards[i].tier = base[i].tier;
            cards[i].dailyRateWad = IOceanQueryUpgradeable(
                cfg.oceanQueryUpgradeable()
            ).getDailyGrowthRate(pid);
            cards[i].active = base[i].active;
            cards[i].createdAt = base[i].createdAt;
            cards[i].frozenUntil = base[i].frozenUntil;
            cards[i].capProgressBps = IOceanQueryUpgradeable(
                cfg.oceanQueryUpgradeable()
            ).getPortfolioCapProgress(pid);
        }
    }

    function getIncomeRollup(
        ICoreConfig cfg,
        address user
    ) external view returns (IncomeRollup memory r) {
        address rdAddr = cfg.roiDistributorView();
        if (rdAddr != address(0)) {
            (, uint256[] memory usdTotals, , , ) = IROIDistributorView(rdAddr)
                .previewClaimPerPortfolio(user);
            uint256 sum;
            for (uint256 i; i < usdTotals.length; ++i) sum += usdTotals[i];
            r.totalRoiClaimableUsdMicro = sum;

            (uint32 fromP, uint32 lastP) = IROIDistributorView(rdAddr)
                ._autoWindow(user);
            if (lastP >= fromP) {
                (, uint256[] memory usdPer, , ) = IROIDistributorView(rdAddr)
                    .perPeriodPreview(user, lastP, lastP);
                if (usdPer.length > 0) r.todayRoiUsdMicro = usdPer[0];
            }
        } else {
            r.totalRoiClaimableUsdMicro = IOceanQueryUpgradeable(
                cfg.oceanQueryUpgradeable()
            ).getPortfolioGrowthIncome(user);
            r.todayRoiUsdMicro = 0;
        }

        // direct
        {
            address dist = cfg.incomeDistributor();
            if (dist != address(0)) {
                (, uint256 wad, , ) = IIncomeDistributorView(dist)
                    .getDirectIncomeSummary(user);
                r.directIncomeUsdMicro = wad / 1e12;
            } else {
                (uint256 wad, , ) = ISafeWalletViewKinds(cfg.safeWallet())
                    .getTotalsByKind(user, 5, true);
                r.directIncomeUsdMicro = wad / 1e12;
            }
        }
        // royalty
        {
            (uint256 wad, uint256 rama, ) = ISafeWalletViewKinds(
                cfg.safeWallet()
            ).getTotalsByKind(user, 2, true);
            r.royaltyIncomeUsdMicro = wad > 0
                ? wad / 1e12
                : _ramaToUsd(cfg, rama);
        }
        // slab
        {
            (uint256 wad, uint256 rama, ) = ISafeWalletViewKinds(
                cfg.safeWallet()
            ).getTotalsByKind(user, 3, true);
            r.slabIncomeUsdMicro = wad > 0 ? wad / 1e12 : _ramaToUsd(cfg, rama);
        }
        // rewards
        {
            address rv = cfg.rewardVault();
            if (rv != address(0)) {
                (uint256 wad, ) = IRewardVaultView(rv).getUserTotals(user);
                r.rewardsIncomeUsdMicro = wad / 1e12;
            } else {
                (uint256 wad, , ) = ISafeWalletViewKinds(cfg.safeWallet())
                    .getTotalsByKind(user, 4, true);
                r.rewardsIncomeUsdMicro = wad / 1e12;
            }
        }
    }

    function getIncomeDashboardCompact(
        ICoreConfig cfg,
        address user
    ) external view returns (IncomeDashboardCompact memory d) {
        // lifetime paid ROI
        IOceanViewLegacy.WalletPanel memory panel = IOceanViewLegacy(
            cfg.oceanViewUpgradeable()
        ).getWalletPanel(user);
        uint256 lifetimePaidUSD6 = panel.lifetimeRoiUsd;

        // unclaimed ROI preview
        uint256 unclaimedUSD6;
        address roiDistributorNew = cfg.roiDistributorView();
        if (roiDistributorNew != address(0)) {
            (, uint256[] memory usdTotals, , , ) = IROIDistributorView(
                roiDistributorNew
            ).previewClaimPerPortfolio(user);
            for (uint256 i; i < usdTotals.length; ++i)
                unclaimedUSD6 += usdTotals[i];
        } else {
            unclaimedUSD6 = IOceanQueryUpgradeable(cfg.oceanQueryUpgradeable())
                .getPortfolioGrowthIncome(user);
        }

        // today ROI
        uint256 todayUSD6;
        if (roiDistributorNew != address(0)) {
            IROIDistributorView rd = IROIDistributorView(roiDistributorNew);
            uint32 epSecs = rd.epochSeconds();
            if (epSecs != 0) {
                uint32 latestCompleted = uint32(block.timestamp / epSecs);
                if (latestCompleted > 0) {
                    latestCompleted -= 1;
                    uint32 lastClaimed = rd.lastClaimPeriod(user);
                    if (latestCompleted > lastClaimed) {
                        uint256[] memory pids = IPortfolioManagerForROI(
                            cfg.portfolioManager()
                        ).portfoliosOf(user);
                        uint256 sum;
                        for (uint256 i; i < pids.length; ++i) {
                            (uint256 usd, , ) = rd.ROIForAPortfolio(
                                pids[i],
                                latestCompleted,
                                latestCompleted
                            );
                            sum += usd;
                        }
                        todayUSD6 = sum;
                    }
                }
            }
        }

        d.todayRoiUSD6 = todayUSD6;
        d.totalRoiUSD6 = lifetimePaidUSD6 + unclaimedUSD6;

        // Direct
        uint256 directUSD6;
        address dist = cfg.incomeDistributor();
        if (dist != address(0)) {
            (, uint256 lifetimeUsdWad, , ) = IIncomeDistributorView(dist)
                .getDirectIncomeSummary(user);
            directUSD6 = lifetimeUsdWad / 1e12;
        } else {
            (uint256 usdWad, , ) = ISafeWalletViewKinds(cfg.safeWallet())
                .getTotalsByKind(user, 5, true);
            directUSD6 = usdWad / 1e12;
        }

        // Rewards
        uint256 rewardUSD6;
        address rv = cfg.rewardVault();
        if (rv != address(0)) {
            (uint256 usdWad, ) = IRewardVaultView(rv).getUserTotals(user);
            rewardUSD6 = usdWad / 1e12;
        } else {
            (uint256 usdWad, , ) = ISafeWalletViewKinds(cfg.safeWallet())
                .getTotalsByKind(user, 4, true);
            rewardUSD6 = usdWad / 1e12;
        }

        // Slab & Royalty via SafeWallet kinds
        (uint256 slabUsdWad, uint256 slabRama, ) = ISafeWalletViewKinds(
            cfg.safeWallet()
        ).getTotalsByKind(user, 3, true);
        uint256 slabUSD6 = slabUsdWad > 0
            ? slabUsdWad / 1e12
            : (slabRama > 0 ? _ramaToUsd(cfg, slabRama) : 0);

        (uint256 royUsdWad, uint256 royRama, ) = ISafeWalletViewKinds(
            cfg.safeWallet()
        ).getTotalsByKind(user, 2, true);
        uint256 royaltyUSD6 = royUsdWad > 0
            ? royUsdWad / 1e12
            : (royRama > 0 ? _ramaToUsd(cfg, royRama) : 0);

        d.directUSD6 = directUSD6;
        d.royaltyUSD6 = royaltyUSD6;
        d.slabUSD6 = slabUSD6;
        d.rewardUSD6 = rewardUSD6;
    }

    function getWeeklyEarnings(
        ICoreConfig cfg,
        address user
    ) external view returns (WeeklyEarnings memory weekly) {
        uint32 todayDayId = _currentDayId();
        (weekly.dayIds, weekly.usdAmounts) = IOceanViewLegacy(
            cfg.oceanViewUpgradeable()
        ).getLast7DaysEarningsUSD(user, todayDayId);
    }

    function getTeamSummary(
        ICoreConfig cfg,
        address user,
        uint8 depth
    ) external view returns (TeamSummary memory team) {
        (team.directs, team.directCount, team.teamCount) = IOceanViewLegacy(
            cfg.oceanViewUpgradeable()
        ).getTeamNetwork(user, depth);
    }

    function getRecentTransactions(
        ICoreConfig cfg,
        address user,
        uint256 limit
    ) external view returns (bytes[] memory entries) {
        entries = IOceanViewLegacy(cfg.oceanViewUpgradeable())
            .getLastTransactions(user, limit);
    }

    function getPortfolioROISummary(
        ICoreConfig cfg,
        uint256 _pid
    ) external view returns (PortfolioROISummary memory summary) {
        require(_pid > 0, "OVW: bad pid");
        IPortfolioManagerForROI pm = IPortfolioManagerForROI(
            cfg.portfolioManager()
        );
        IPortfolioManagerForROI.Portfolio memory p = pm.getPortfolio(_pid);
        require(p.owner != address(0), "OVW: pid not found");

        IROIDistributorView rd = IROIDistributorView(cfg.roiDistributorView());
        uint256 claimed = rd.paidUsdByPid(_pid);

        uint256 unclaimed;
        (uint256[] memory pids, uint256[] memory usdTotals, , , ) = rd
            .previewClaimPerPortfolio(p.owner);
        for (uint256 i; i < pids.length; ++i) {
            if (pids[i] == _pid) {
                unclaimed = usdTotals[i];
                break;
            }
        }

        uint256 totalCap = (p.principalUsd * p.capPct) / 100;

        summary = PortfolioROISummary({
            portfolioId: _pid,
            claimedROI: claimed,
            unclaimedROI: unclaimed,
            totalROI: totalCap
        });
    }

    function getPortfolioIncomeToDate(
        ICoreConfig cfg,
        uint256 pid
    ) external view returns (PidIncomeToDate memory r) {
        require(pid > 0, "OVW: bad pid");

        uint256 claimed;
        address rdAddr = cfg.roiDistributorView();
        if (rdAddr != address(0)) {
            claimed = IROIDistributorView(rdAddr).paidUsdByPid(pid);
        }

        uint256 theoreticalUSD6;
        if (rdAddr != address(0)) {
            IPortfolioManagerForROI pmR = IPortfolioManagerForROI(
                cfg.portfolioManager()
            );
            IPortfolioManagerForROI.Portfolio memory p = pmR.getPortfolio(pid);
            require(p.owner != address(0), "OVW: pid not found");

            IROIDistributorView rd = IROIDistributorView(rdAddr);
            uint32 epSecs = rd.epochSeconds();
            if (epSecs != 0) {
                uint32 fromP = uint32(p.createdAt / epSecs);
                uint32 lastCompleted = uint32(block.timestamp / epSecs);
                if (lastCompleted > 0) lastCompleted -= 1;
                if (lastCompleted >= fromP) {
                    (uint256 usd, , ) = rd.ROIForAPortfolio(
                        pid,
                        fromP,
                        lastCompleted
                    );
                    theoreticalUSD6 = usd;
                }
            }
        }

        uint256 unclaimed = theoreticalUSD6 > claimed
            ? (theoreticalUSD6 - claimed)
            : 0;
        r = PidIncomeToDate({
            pid: pid,
            claimedUSD6: claimed,
            unclaimedUSD6: unclaimed,
            totalUSD6: claimed + unclaimed
        });
    }

    function getAllPortfolioClaimHistory(
        ICoreConfig cfg,
        address user
    )
        external
        view
        returns (
            uint256[] memory pids,
            ClaimEpochView[] memory epochs,
            PidClaimViewFlat[] memory pidClaims
        )
    {
        pids = IPortfolioManagerForROI(cfg.portfolioManager()).portfoliosOf(
            user
        );

        address rdAddr = cfg.roiDistributorView();
        if (rdAddr == address(0)) {
            epochs = new ClaimEpochView[](0);
            pidClaims = new PidClaimViewFlat[](0);
            return (pids, epochs, pidClaims);
        }

        IROIDistributorView hist = IROIDistributorView(rdAddr);

        uint256 epCount = hist.getClaimHistoryCount(user);
        if (epCount == 0) {
            epochs = new ClaimEpochView[](0);
            pidClaims = new PidClaimViewFlat[](0);
            return (pids, epochs, pidClaims);
        }

        // copy epochs
        {
            IROIDistributorView.ClaimRec[] memory raw = hist
                .getClaimHistorySlice(user, 0, epCount);
            epochs = new ClaimEpochView[](raw.length);
            for (uint256 i; i < raw.length; ++i) {
                epochs[i] = ClaimEpochView({
                    fromPeriod: raw[i].fromPeriod,
                    toPeriod: raw[i].toPeriod,
                    usdTotal: raw[i].usdTotal,
                    ramaTotal: raw[i].ramaTotal,
                    claimedAt: raw[i].claimedAt,
                    epoch: raw[i].epoch
                });
            }
        }

        // count total pid-claims (paged fetch)
        uint256 totalPidClaims;
        for (uint256 i; i < epochs.length; ++i) {
            uint256 cursor = 0;
            while (true) {
                IROIDistributorView.PidClaim[] memory page = hist
                    .getPidClaimsSlice(user, epochs[i].epoch, cursor, 256);
                if (page.length == 0) break;
                totalPidClaims += page.length;
                cursor += page.length;
            }
        }

        pidClaims = new PidClaimViewFlat[](totalPidClaims);
        uint256 w = 0;
        for (uint256 i; i < epochs.length; ++i) {
            uint32 ep = epochs[i].epoch;
            uint256 cursor = 0;
            while (true) {
                IROIDistributorView.PidClaim[] memory page = hist
                    .getPidClaimsSlice(user, ep, cursor, 256);
                if (page.length == 0) break;
                for (uint256 j; j < page.length; ++j) {
                    pidClaims[w++] = PidClaimViewFlat({
                        epoch: ep,
                        pid: page[j].pid,
                        usdTotalUSD6: page[j].usdTotal,
                        ramaTotalWei: page[j].ramaTotal
                    });
                }
                cursor += page.length;
            }
        }
    }

    function getAllPortfolioROISummaries(
        ICoreConfig cfg,
        address user
    ) external view returns (PortfolioROISummary[] memory out) {
        uint256[] memory pids = IPortfolioManagerForROI(cfg.portfolioManager())
            .portfoliosOf(user);
        out = new PortfolioROISummary[](pids.length);

        // pull preview once
        uint256[] memory previewPids;
        uint256[] memory previewUsd;
        address rdAddr = cfg.roiDistributorView();
        if (rdAddr != address(0)) {
            (previewPids, previewUsd, , , ) = IROIDistributorView(rdAddr)
                .previewClaimPerPortfolio(user);
        }

        for (uint256 i; i < pids.length; ++i) {
            uint256 pid = pids[i];
            IPortfolioManagerForROI.Portfolio
                memory p = IPortfolioManagerForROI(cfg.portfolioManager())
                    .getPortfolio(pid);

            uint256 claimed;
            uint256 unclaimed;

            if (rdAddr != address(0)) {
                claimed = IROIDistributorView(rdAddr).paidUsdByPid(pid);
                for (uint256 j; j < previewPids.length; ++j) {
                    if (previewPids[j] == pid) {
                        unclaimed = previewUsd[j];
                        break;
                    }
                }
            }

            uint256 totalCap = (p.principalUsd * p.capPct) / 100;

            out[i] = PortfolioROISummary({
                portfolioId: pid,
                claimedROI: claimed,
                unclaimedROI: unclaimed,
                totalROI: totalCap
            });
        }
    }

    function getDashboardData(
        ICoreConfig cfg,
        address user
    )
        external
        view
        returns (
            DashboardSummary memory summary,
            IncomeSummary memory income,
            WalletSummary memory wallet,
            PortfolioCard[] memory portfolios,
            WeeklyEarnings memory weekly,
            uint256 lifetimeCapBps
        )
    {
        // summary (mix of legacy + query rollups)
        (
            uint256 totalValueUSD,
            uint256 totalEarnedRama,
            uint32 directRefs,
            uint256 qualifiedVolumeUSD,
            uint8 royaltyLevel
        ) = IOceanViewLegacy(cfg.oceanViewUpgradeable()).getPortfolioTotals(
                user
            );

        summary.totalStakedUsdMicro = totalValueUSD;
        summary.totalEarnedRamaWei = totalEarnedRama;
        summary.qualifiedVolumeUsdMicro = qualifiedVolumeUSD;
        summary.directRefs = directRefs;
        summary.royaltyLevel = royaltyLevel;

        IOceanViewLegacy.SlabPanel memory slab = IOceanViewLegacy(
            cfg.oceanViewUpgradeable()
        ).getSlabPanel(user);
        summary.slabLevel = slab.slabIndex;
        summary.slabCanClaim = slab.canClaim;
        summary.directRefs = slab.directMembers;

        IOceanViewLegacy.RoyaltyPanel memory roy = IOceanViewLegacy(
            cfg.oceanViewUpgradeable()
        ).getRoyaltyPanel(user);
        summary.royaltyLevel = roy.currentLevel;
        summary.royaltyLastMonthEpoch = roy.lastPaidMonthEpoch;
        summary.royaltyPaused = roy.paused;

        IOceanViewLegacy.UserOverview memory overview = IOceanViewLegacy(
            cfg.oceanViewUpgradeable()
        ).getUserOverview(user, TEAM_DEPTH);
        summary.teamCount = overview.teamCount;
        summary.upline = overview.uplineSponsor;

        // paid months snapshot
        summary.royaltyPaidMonths = _tryQueryUint(
            cfg.oceanQueryUpgradeable(),
            abi.encodeWithSignature("getRoyaltyPayoutsReceived(address)", user)
        );
        summary.royaltyCanClaim = IOceanQueryUpgradeable(
            cfg.oceanQueryUpgradeable()
        ).canClaimRoyalty(user);

        (
            bool renewalPaused,
            uint256 lastSnap,
            uint256 nowSnap
        ) = IOceanQueryUpgradeable(cfg.oceanQueryUpgradeable())
                .getRoyaltyRenewalRequirement(user);
        summary.royaltyRenewalSnapshotUsd = lastSnap;
        summary.royaltyRecentSnapshotUsd = nowSnap;
        if (renewalPaused) summary.royaltyPaused = true;

        (uint64 lastMonth, uint64 nextMonth) = IOceanQueryUpgradeable(
            cfg.oceanQueryUpgradeable()
        ).getNextRoyaltyClaimDate(user);
        if (lastMonth != 0) summary.royaltyLastMonthEpoch = lastMonth;
        summary.royaltyNextMonthEpoch = nextMonth;

        // income / wallet / portfolios
        income = this.buildIncomeSummary(cfg, user);
        wallet = this.buildWalletSummary(cfg, user);
        portfolios = this.buildPortfolioCards(cfg, user);

        lifetimeCapBps = IOceanQueryUpgradeable(cfg.oceanQueryUpgradeable())
            .getLifetimeCapProgress(user);

        summary.totalClaimableUsdMicro = income.totalUsdMicro;
        summary.accruedGrowthUsdMicro = income.growthUsdMicro;
        summary.accruedGrowthRamaWei = wallet.pendingGrowthRamaWei;

        weekly = this.getWeeklyEarnings(cfg, user);
    }

    // -------- helpers --------
    function _currentDayId() internal view returns (uint32) {
        return uint32(block.timestamp / 1 days);
    }

    function _tryQueryUint(
        address queryAddr,
        bytes memory payload
    ) internal view returns (uint256 value) {
        (bool ok, bytes memory data) = queryAddr.staticcall(payload);
        if (ok && data.length >= 32) {
            value = abi.decode(data, (uint256));
        }
    }

    function _ramaToUsd(
        ICoreConfig cfg,
        uint256 ramaWei
    ) internal view returns (uint256) {
        if (ramaWei == 0) return 0;
        address oracle = cfg.priceOracle();
        if (oracle == address(0)) return 0;
        (bool ok, bytes memory data) = oracle.staticcall(
            abi.encodeWithSelector(IRamaOracle.ramaToUSD.selector, ramaWei)
        );
        if (!ok || data.length == 0) return 0;
        return abi.decode(data, (uint256));
    }
}
