// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/*
 * SlabQualificationPolicyV2
 * External, lightweight policy that:
 *  - Honors AdminControl's forced 40% leg per user
 *  - Computes max-qualified target across slabs/rewards/royalties
 *  - Respects the <=3 directs rule
 *  - Returns (T, slabIdx, L1, L2, Lrest) for SlabManager to consume
 *
 * You can point SlabManager to this policy via AdminControl.slabPolicy().
 */

interface ICoreConfig {
    function userRegistry() external view returns (address);
    function adminControl() external view returns (address);
}

interface IAdminControlExt {
    function forcedFortyLegOf(address user) external view returns (address);
}

interface IUserRegistry {
    struct User {
        // only 'directsCount' is used here; other fields (if any) will be ignored by the compiler
        uint32 directsCount;
    }
    // NOTE: If your real IUserRegistry.User has more fields, that's fine as long as 'directsCount'
    // is in the same order/position as declared in the registry contract's ABI.
    function getUser(address user) external view returns (User memory);
}

interface ISlabManagerView {
    // Legs & volumes
    function getLegKeysOf(
        address user
    ) external view returns (address[] memory);
    function getLegVolOf(
        address user,
        address leg
    ) external view returns (uint256);

    // Ladders
    function getSlabThresholds() external view returns (uint256[] memory);
    function getRewardMilestonesAll() external view returns (uint256[] memory);

    struct RoyaltyTier {
        uint256 thresholdUSD;
        uint256 rewardUSD;
    }
    function getRoyaltyTiers() external view returns (RoyaltyTier[] memory);
}

contract SlabQualificationPolicyV2 {
    ICoreConfig public immutable cfg;
    ISlabManagerView public immutable slab;

    constructor(address _cfg, address _slabManager) {
        require(_cfg != address(0) && _slabManager != address(0), "bad init");
        cfg = ICoreConfig(_cfg);
        slab = ISlabManagerView(_slabManager);
    }

    /* ---------- External API ---------- */

    /// @notice Compute the max-qualified target for `user` across slabs, rewards, and royalties,
    ///         honoring AdminControl's forced 40% leg if present.
    /// @return T          Highest threshold (USD 1e6) satisfied
    /// @return slabIdx    Derived slab index capped by directs rule
    /// @return L1         Current top leg volume (raw, USD 1e6)
    /// @return L2         Current 2nd leg volume (raw, USD 1e6)
    /// @return Lrest      Sum of other legs beyond top-2 (raw, USD 1e6)
    function maxQualifiedTarget(
        address user
    )
        external
        view
        returns (
            uint256 T,
            uint8 slabIdx,
            uint256 L1,
            uint256 L2,
            uint256 Lrest
        )
    {
        // Gather legs/vols
        (
            address[] memory legs,
            uint256[] memory vols,
            uint256 sumAll
        ) = _collectLegsAndVols(user);
        (L1, L2, , Lrest) = _top2AndRestFromSorted(vols, sumAll);

        // Resolve directs & forced leg
        uint32 directs = IUserRegistry(cfg.userRegistry())
            .getUser(user)
            .directsCount;
        address forced = IAdminControlExt(cfg.adminControl()).forcedFortyLegOf(
            user
        );
        bool hasForced = (forced != address(0));

        // Evaluate ladders
        uint256 Tslab = _bestOver(
            slab.getSlabThresholds(),
            user,
            legs,
            vols,
            hasForced,
            forced,
            directs
        );
        uint256 Treward = _bestOver(
            slab.getRewardMilestonesAll(),
            user,
            legs,
            vols,
            hasForced,
            forced,
            directs
        );
        uint256 Troyalty = _bestOverRoyalty(
            user,
            legs,
            vols,
            hasForced,
            forced,
            directs
        );

        // Pick the maximum
        T = Tslab;
        if (Treward > T) T = Treward;
        if (Troyalty > T) T = Troyalty;

        // Derive slabIdx from slab thresholds and cap by directs
        slabIdx = _slabIdxFromT(T, directs, slab.getSlabThresholds());
    }

    /* ---------- Core logic ---------- */

    function _bestOver(
        uint256[] memory thresholds,
        address user,
        address[] memory legs,
        uint256[] memory vols,
        bool hasForced,
        address forcedLeg,
        uint32 directs
    ) private view returns (uint256 best) {
        for (uint256 i = 0; i < thresholds.length; i++) {
            uint256 R = thresholds[i];
            bool ok;
            if (hasForced) {
                ok = _okWithForced(user, legs, vols, forcedLeg, R, directs);
            } else {
                ok = _okStandard(vols, R, directs);
            }
            if (ok) best = R;
        }
    }

    function _bestOverRoyalty(
        address user,
        address[] memory legs,
        uint256[] memory vols,
        bool hasForced,
        address forcedLeg,
        uint32 directs
    ) private view returns (uint256 best) {
        ISlabManagerView.RoyaltyTier[] memory tiers = slab.getRoyaltyTiers();
        for (uint256 i = 0; i < tiers.length; i++) {
            uint256 R = tiers[i].thresholdUSD;
            bool ok;
            if (hasForced) {
                ok = _okWithForced(user, legs, vols, forcedLeg, R, directs);
            } else {
                ok = _okStandard(vols, R, directs);
            }
            if (ok && R > best) best = R;
        }
    }

    function _okStandard(
        uint256[] memory volsSortedDesc,
        uint256 R,
        uint32 directs
    ) private pure returns (bool) {
        // compute L1,L2,L3 from sorted vols
        uint256 n = volsSortedDesc.length;
        uint256 L1 = n > 0 ? volsSortedDesc[0] : 0;
        uint256 L2 = n > 1 ? volsSortedDesc[1] : 0;
        uint256 L3 = n > 2 ? volsSortedDesc[2] : 0;

        bool ok403030 = _passes403030(L1, L2, L3, R);
        if (directs <= 3) return ok403030;

        // directs > 3 → allow capped-sum alternative
        if (ok403030) return true;
        return _cappedSum(volsSortedDesc, R) >= R;
    }

    function _okWithForced(
        address user,
        address[] memory legsSortedDesc,
        uint256[] memory volsSortedDesc,
        address forcedLeg,
        uint256 R,
        uint32 directs
    ) private view returns (bool) {
        // Check 40/30/30 with forced = 40% satisfied, need two other legs to meet 30% each
        bool ok403030 = _passes403030WithForced(
            user,
            legsSortedDesc,
            volsSortedDesc,
            forcedLeg,
            R
        );
        if (ok403030) return true;

        // If directs > 3, also allow "forced capped-sum": prefill 40%, then fill 60% from other legs with 30% caps
        if (directs > 3) {
            return
                _cappedSumWithForced(
                    user,
                    legsSortedDesc,
                    volsSortedDesc,
                    forcedLeg,
                    R
                ) >= R;
        }
        return false;
    }

    /* ---------- Helpers: legs & sorting ---------- */

    function _collectLegsAndVols(
        address user
    )
        private
        view
        returns (address[] memory legs, uint256[] memory vols, uint256 sumAll)
    {
        legs = slab.getLegKeysOf(user);
        uint256 n = legs.length;
        vols = new uint256[](n);
        for (uint256 i = 0; i < n; i++) {
            vols[i] = slab.getLegVolOf(user, legs[i]);
            sumAll += vols[i];
        }
        _sortDescPair(legs, vols);
    }

    function _sortDescPair(
        address[] memory addrs,
        uint256[] memory vals
    ) private pure {
        for (uint256 i = 1; i < vals.length; i++) {
            uint256 v = vals[i];
            address a = addrs[i];
            uint256 j = i;
            while (j > 0 && vals[j - 1] < v) {
                vals[j] = vals[j - 1];
                addrs[j] = addrs[j - 1];
                j--;
            }
            vals[j] = v;
            addrs[j] = a;
        }
    }

    function _top2AndRestFromSorted(
        uint256[] memory volsSortedDesc,
        uint256 sumAll
    ) private pure returns (uint256 L1, uint256 L2, uint256 L3, uint256 Lrest) {
        uint256 n = volsSortedDesc.length;
        if (n == 0) return (0, 0, 0, 0);
        L1 = volsSortedDesc[0];
        L2 = n > 1 ? volsSortedDesc[1] : 0;
        L3 = n > 2 ? volsSortedDesc[2] : 0;

        if (n > 2) {
            uint256 sumTop2 = L1 + L2;
            Lrest = sumAll > sumTop2 ? (sumAll - sumTop2) : 0;
        } else {
            Lrest = 0;
        }
    }

    /* ---------- Helpers: qualification math ---------- */

    function _passes403030(
        uint256 L1,
        uint256 L2,
        uint256 L3,
        uint256 R
    ) private pure returns (bool) {
        if (L3 == 0) return false;
        uint256 r40 = (R * 40) / 100;
        uint256 r30 = (R * 30) / 100;
        return (L1 >= r40 && L2 >= r30 && L3 >= r30);
    }

    function _passes403030WithForced(
        address user,
        address[] memory legsSortedDesc,
        uint256[] memory volsSortedDesc,
        address forcedLeg,
        uint256 R
    ) private pure returns (bool) {
        // Need two best NON-forced legs ≥ 30% each
        uint256 need30 = (R * 30) / 100;
        uint256 found = 0;
        for (uint256 i = 0; i < legsSortedDesc.length; i++) {
            if (legsSortedDesc[i] == forcedLeg) continue;
            if (volsSortedDesc[i] >= need30) {
                found++;
                if (found == 2) return true;
            }
        }
        return false;
    }

    function _cappedSum(
        uint256[] memory volsSortedDesc,
        uint256 R
    ) private pure returns (uint256 total) {
        if (R == 0 || volsSortedDesc.length == 0) return 0;
        uint256 cap30 = (R * 30) / 100;
        uint256 cap40 = (R * 40) / 100;

        // Baseline: cap everyone at 30%
        for (uint256 i = 0; i < volsSortedDesc.length; i++) {
            uint256 add = volsSortedDesc[i] < cap30 ? volsSortedDesc[i] : cap30;
            total += add;
            if (total >= R) return R;
        }
        // Promote the largest leg from 30% to 40% (add up to +10%R)
        uint256 baseline = volsSortedDesc[0] < cap30
            ? volsSortedDesc[0]
            : cap30;
        uint256 promote = volsSortedDesc[0] < cap40 ? volsSortedDesc[0] : cap40;
        total += (promote - baseline);
        if (total > R) total = R;
    }

    function _cappedSumWithForced(
        address user,
        address[] memory legsSortedDesc,
        uint256[] memory volsSortedDesc,
        address forcedLeg,
        uint256 R
    ) private pure returns (uint256 total) {
        if (R == 0) return 0;
        uint256 cap30 = (R * 30) / 100;
        uint256 cap40 = (R * 40) / 100;

        // Pre-fill the forced 40%
        total = cap40;

        // Fill remaining with non-forced legs up to 30% each
        for (uint256 i = 0; i < legsSortedDesc.length && total < R; i++) {
            if (legsSortedDesc[i] == forcedLeg) continue;
            uint256 add = volsSortedDesc[i] < cap30 ? volsSortedDesc[i] : cap30;
            uint256 room = R - total;
            if (add > room) add = room;
            total += add;
        }
        if (total > R) total = R;
    }

    function _slabIdxFromT(
        uint256 T,
        uint32 directs,
        uint256[] memory slabThresholds
    ) private pure returns (uint8 idx) {
        // Find highest i with slabThresholds[i] <= T
        for (uint256 i = slabThresholds.length; i > 0; i--) {
            if (T >= slabThresholds[i - 1]) {
                idx = uint8(i - 1);
                break;
            }
        }
        // Cap by directs rule: stage k requires k+1 directs (0-based)
        if (directs == 0) return 0;
        uint32 maxIdx = directs - 1;
        if (idx > maxIdx) idx = uint8(maxIdx);
    }
}
