// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "./interfaces/ICoreConfig.sol";
import "./interfaces/ISafeWallet.sol";

interface IRoyaltyManagerCore {
    // Core pointers
    function cfg() external view returns (address);

    // Basic state helpers
    function currentTierIndexForT(uint256 T) external view returns (uint8);
    function thresholdUSD(uint256 idx) external view returns (uint256);

    // Compatibility view
    function royalty(address user) external view returns (uint8, uint64, bool);

    // State caches
    function tNowCache(address user) external view returns (uint256);
    function t60dAgoCache(address user) external view returns (uint256);

    // Royalty receipts and months
    function getRoyaltyMonths(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (uint64[] memory);
    function getRoyaltyReceipt(
        address user,
        uint64 monthId
    )
        external
        view
        returns (
            // struct RoyaltyReceipt { uint64 monthId; uint8 tierIdx; uint256 amountUSD6; uint256 amountRamaWei; uint64 timestamp; }
            // Return as a tuple
            uint64 monthId_,
            uint8 tierIdx_,
            uint256 amountUSD6_,
            uint256 amountRamaWei_,
            uint64 timestamp_,
            bool exists
        );

    // Pending entitlements
    function pendingRoyalty(
        address user,
        uint64 monthId
    ) external view returns (uint64, uint256, uint256, uint8, bool);
    function getPendingMonths(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (uint64[] memory months);
}

interface ISlabManagerRoyaltyViewMinimal {
    enum AchKind {
        Slab,
        Reward,
        Royalty
    }
    function getQualifiedBusinessUSD(
        address user
    ) external view returns (uint256);
    function getAchievedWithTimes(
        address user,
        AchKind kind
    )
        external
        view
        returns (
            uint8[] memory idxs,
            uint64[] memory times,
            uint256[] memory L1s,
            uint256[] memory L2s,
            uint256[] memory Lrests
        );
}

contract RoyaltyManagerView is
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    IRoyaltyManagerCore public rm;

    function initialize(address royaltyManager) external initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        rm = IRoyaltyManagerCore(royaltyManager);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    struct RoyaltyOverview {
        uint256 qualifiedTUSD6;
        uint8 currentTierIdx;
        uint8 lastPaidTier; // not available directly; can be inferred via receipt history or omitted
        uint64 lastPaidMonth;
        bool paused;
        uint256 nextThresholdUSD6;
        uint256 neededUSD6;
        uint8[] achievedStages;
        uint64[] achievedAt;
        uint256 tNowCacheUSD6;
        uint256 t60dAgoCacheUSD6;
        // lastPaidBusinessUSD6 not exposed; omit here to avoid reaching into private state
    }

    function getUserRoyaltyOverview(
        address user
    ) external view returns (RoyaltyOverview memory ov) {
        ICoreConfig cfg = ICoreConfig(rm.cfg());
        ISlabManagerRoyaltyViewMinimal sm = ISlabManagerRoyaltyViewMinimal(
            cfg.slabManager()
        );

        ov.qualifiedTUSD6 = sm.getQualifiedBusinessUSD(user);
        ov.currentTierIdx = rm.currentTierIndexForT(ov.qualifiedTUSD6);
        (ov.achievedStages, ov.achievedAt, , , ) = sm.getAchievedWithTimes(
            user,
            ISlabManagerRoyaltyViewMinimal.AchKind.Royalty
        );

        (, uint64 lastPaidMonth, bool paused) = rm.royalty(user);
        ov.lastPaidMonth = lastPaidMonth;
        ov.paused = paused;

        ov.tNowCacheUSD6 = rm.tNowCache(user);
        ov.t60dAgoCacheUSD6 = rm.t60dAgoCache(user);

        uint8 nextIdx = ov.currentTierIdx + 1;
        uint256 nextThreshold;
        // guard against out of range by trying and catching
        // Caller can decide bounds; if out of bounds, keep zeros
        try this._threshold(rm, nextIdx) returns (uint256 th) {
            nextThreshold = th;
        } catch {}

        if (nextThreshold > 0) {
            ov.nextThresholdUSD6 = nextThreshold;
            ov.neededUSD6 = ov.qualifiedTUSD6 >= nextThreshold
                ? 0
                : (nextThreshold - ov.qualifiedTUSD6);
        }
    }

    function _threshold(
        IRoyaltyManagerCore r,
        uint256 idx
    ) external view returns (uint256) {
        return r.thresholdUSD(idx);
    }

    struct MonthStatus {
        uint64 monthId;
        bool rootPresent; // entitlement exists
        bool hasClaimed; // creditedUSD > 0
        bool hasPending; // creditedUSD < amountUSD
        uint8 pendingTierIdx;
        uint256 pendingUSD6;
    }

    function getMonthStatuses(
        address user,
        uint64[] calldata monthIds
    ) external view returns (MonthStatus[] memory out) {
        out = new MonthStatus[](monthIds.length);
        for (uint256 i = 0; i < monthIds.length; i++) {
            uint64 m = monthIds[i];
            (
                ,
                uint256 amountUSD,
                uint256 creditedUSD,
                uint8 tierIdx,
                bool exists
            ) = rm.pendingRoyalty(user, m);
            out[i] = MonthStatus({
                monthId: m,
                rootPresent: exists,
                hasClaimed: exists && creditedUSD > 0,
                hasPending: exists && (creditedUSD < amountUSD),
                pendingTierIdx: tierIdx,
                pendingUSD6: amountUSD > creditedUSD
                    ? (amountUSD - creditedUSD)
                    : 0
            });
        }
    }

    struct RoyaltyMonthlyView {
        uint64 monthId;
        bool rootPresent;
        bool hasClaimed;
        bool hasPending;
        uint8 pendingTierIdx;
        uint256 pendingUSD6;
        // Claimed snapshot
        uint8 claimedTierIdx;
        uint256 claimedUSD6;
        uint256 claimedRamaWei;
        uint64 claimedAt;
    }

    function getRoyaltyMonthlyView(
        address user,
        uint64[] calldata monthIds
    ) external view returns (RoyaltyMonthlyView[] memory out) {
        out = new RoyaltyMonthlyView[](monthIds.length);
        for (uint256 i = 0; i < monthIds.length; i++) {
            uint64 m = monthIds[i];
            (
                ,
                uint256 amountUSD,
                uint256 creditedUSD,
                uint8 tierIdx,
                bool exists
            ) = rm.pendingRoyalty(user, m);
            (
                uint64 rid,
                uint8 ctier,
                uint256 cUSD,
                uint256 cRama,
                uint64 cAt,
                bool _exists
            ) = rm.getRoyaltyReceipt(user, m);

            out[i] = RoyaltyMonthlyView({
                monthId: m,
                rootPresent: exists,
                hasClaimed: (rid == m && cUSD > 0),
                hasPending: exists && (creditedUSD < amountUSD),
                pendingTierIdx: tierIdx,
                pendingUSD6: amountUSD > creditedUSD
                    ? (amountUSD - creditedUSD)
                    : 0,
                claimedTierIdx: ctier,
                claimedUSD6: cUSD,
                claimedRamaWei: cRama,
                claimedAt: cAt
            });
        }
    }

    struct RoyaltyMonthRow {
        uint64 monthId;
        uint8 tierIdx;
        uint256 amountUSD6;
        uint256 amountRamaWei;
        uint64 timestamp;
        bool claimedOnChain;
        bool rootPresent;
    }

    function getRoyaltyHistorySlice(
        address user,
        uint256 offset,
        uint256 limit
    )
        external
        view
        returns (
            RoyaltyMonthRow[] memory rows,
            uint256 totalMonths,
            uint256 usdGrandTotal6,
            uint256 ramaGrandTotalWei
        )
    {
        uint64[] memory arr = rm.getRoyaltyMonths(user, offset, limit);
        totalMonths = offset + arr.length; // approximate; caller can page further as needed
        rows = new RoyaltyMonthRow[](arr.length);
        for (uint256 i = 0; i < arr.length; i++) {
            uint64 m = arr[i];
            (
                ,
                uint8 tier,
                uint256 usd6,
                uint256 ramaWei,
                uint64 ts,
                bool _exists2
            ) = rm.getRoyaltyReceipt(user, m);
            rows[i] = RoyaltyMonthRow({
                monthId: m,
                tierIdx: tier,
                amountUSD6: usd6,
                amountRamaWei: ramaWei,
                timestamp: ts,
                claimedOnChain: usd6 > 0,
                rootPresent: _hasEntitlement(user, m)
            });
            usdGrandTotal6 += usd6;
            ramaGrandTotalWei += ramaWei;
        }
    }

    function _hasEntitlement(
        address user,
        uint64 m
    ) internal view returns (bool) {
        (, , , , bool exists) = rm.pendingRoyalty(user, m);
        return exists;
    }

    // Totals passthrough
    function getRoyaltyTotals(
        address user
    )
        external
        view
        returns (uint256 usdTotal6, uint256 ramaTotalWei, uint256 entries)
    {
        ISafeWallet sw = ISafeWallet(ICoreConfig(rm.cfg()).safeWallet());
        return sw.getTotalsByKind(user, 2, true);
    }

    struct RoyaltyKPIs {
        uint256 totalEarnedUSD6;
        uint256 totalEarnedRamaWei;
        uint256 claimedUSD6;
        uint256 claimedRamaWei;
        uint256 unclaimedCount;
        uint64[] unclaimedMonths;
        uint256 holdUSD6;
        uint256 holdRamaWei;
        uint8 currentLevel;
        uint256 payoutsReceived;
        uint64 nextClaimMonthId;
        bool nextClaimRootPresent;
        bool nextClaimHasClaimed;
        bool nextClaimHasPending;
        uint8 nextClaimPendingTierIdx;
        uint256 nextClaimPendingUSD6;
        uint256 nextClaimPendingRamaWei;
    }

    function getRoyaltyKPIs(
        address user,
        uint64[] calldata monthUniverse,
        uint64 nextClaimMonth
    ) external view returns (RoyaltyKPIs memory kpi) {
        // current level
        ICoreConfig cfg = ICoreConfig(rm.cfg());
        ISlabManagerRoyaltyViewMinimal sm = ISlabManagerRoyaltyViewMinimal(
            cfg.slabManager()
        );
        uint256 qT = sm.getQualifiedBusinessUSD(user);
        kpi.currentLevel = rm.currentTierIndexForT(qT);

        // claimed totals & entries
        (
            kpi.claimedUSD6,
            kpi.claimedRamaWei,
            kpi.payoutsReceived
        ) = ISafeWallet(cfg.safeWallet()).getTotalsByKind(user, 2, true);

        // hold (sum remaining across provided months or pending list)
        {
            // If caller passes a broad monthUniverse, this sums over it.
            uint256 usdSum;
            for (uint256 i = 0; i < monthUniverse.length; i++) {
                (, uint256 amountUSD, uint256 creditedUSD, , bool exists) = rm
                    .pendingRoyalty(user, monthUniverse[i]);
                if (exists && amountUSD > creditedUSD) {
                    usdSum += (amountUSD - creditedUSD);
                }
            }
            kpi.holdUSD6 = usdSum;
            kpi.holdRamaWei = 0;
        }

        // unclaimed months set
        {
            uint256 n = monthUniverse.length;
            uint64[] memory tmp = new uint64[](n);
            uint256 w;
            for (uint256 i = 0; i < n; i++) {
                uint64 m = monthUniverse[i];
                (, uint256 amountUSD, uint256 creditedUSD, , bool exists) = rm
                    .pendingRoyalty(user, m);
                bool fullyClaimed = exists && (creditedUSD >= amountUSD);
                if (exists && !fullyClaimed) tmp[w++] = m;
            }
            kpi.unclaimedCount = w;
            kpi.unclaimedMonths = new uint64[](w);
            for (uint256 j = 0; j < w; j++) kpi.unclaimedMonths[j] = tmp[j];
        }

        // totals
        kpi.totalEarnedUSD6 = kpi.claimedUSD6 + kpi.holdUSD6;
        kpi.totalEarnedRamaWei = kpi.claimedRamaWei + kpi.holdRamaWei;

        // next-claim probe
        {
            (
                ,
                uint256 amountUSD,
                uint256 creditedUSD,
                uint8 tierIdx,
                bool exists
            ) = rm.pendingRoyalty(user, nextClaimMonth);
            kpi.nextClaimMonthId = nextClaimMonth;
            kpi.nextClaimRootPresent = exists;
            (, , uint256 cUSD, , , ) = rm.getRoyaltyReceipt(
                user,
                nextClaimMonth
            );
            kpi.nextClaimHasClaimed = (cUSD > 0);
            kpi.nextClaimHasPending = exists && (creditedUSD < amountUSD);
            kpi.nextClaimPendingTierIdx = tierIdx;
            kpi.nextClaimPendingUSD6 = amountUSD > creditedUSD
                ? (amountUSD - creditedUSD)
                : 0;
            kpi.nextClaimPendingRamaWei = 0;
        }
    }
}
