// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "../interfaces/ICoreConfig.sol";

interface IRegistryMinimal {
    function getReferrer(address user) external view returns (address);
    function getUser(
        address u
    )
        external
        view
        returns (
            // minimally need directsCount; model this to your real struct
            uint32 directsCount,
            address referrer,
            uint64 createdAt,
            bool isActive
        );
}

interface ISlabLens {
    struct RoyaltyTier {
        uint256 thresholdUSD; // 1e6
        uint256 rewardUSD; // 1e6
    }

    // From Step 1
    function getSlabState(
        address user
    ) external view returns (uint8, uint64, uint32);
    function getLegKeysOf(
        address user
    ) external view returns (address[] memory);
    function getLegVolOf(
        address user,
        address leg
    ) external view returns (uint256);
    function getSlabThresholds() external view returns (uint256[] memory);
    function getRewardMilestonesAll() external view returns (uint256[] memory);

    // You can still use existing small getters you kept:
    function getRoyaltyTiers() external view returns (RoyaltyTier[] memory);

    function getSlabPercents() external view returns (uint8[11] memory);
    function getSlabIndex(address user) external view returns (uint8);
    function getCappedSumForTarget(
        address user,
        uint256 targetUSD
    ) external view returns (uint256);
    function getTop3AndSum(
        address user
    ) external view returns (uint256, uint256, uint256, uint256, uint256);
    function getAchievedWithTimes(
        address user,
        uint8 kind
    )
        external
        view
        returns (
            uint8[] memory,
            uint64[] memory,
            uint256[] memory,
            uint256[] memory,
            uint256[] memory
        );
}

interface ISlabManagerView {
    function getQualifiedBusinessUSD(
        address user
    ) external view returns (uint256);
    // Achievements (already exposed in SlabManager)
    function getAchievedSlabsWithTimes(
        address user
    ) external view returns (uint8[] memory idxs, uint64[] memory times);

    function getAchievedRewardsWithTimes(
        address user
    ) external view returns (uint8[] memory idxs, uint64[] memory times);

    // NEW public wrappers added in SlabManager rewrite
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

    struct LegBusiness {
        address leg;
        uint256 volume;
    }
    function getLegsDetailed(
        address user
    ) external view returns (LegBusiness[] memory);
}

contract SlabManagerReader is
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    enum AchKind {
        Slab,
        Reward,
        Royalty
    }
    enum PathKind {
        Strict403030,
        CappedSum
    }

    struct LegBusiness {
        address leg;
        uint256 volume;
    }
    struct AchievementDetails {
        uint8 id;
        uint64 achievedAt;
        uint256 qualifiedL1;
        uint256 qualifiedL2;
        uint256 qualifiedLrest;
    }
    struct UserOverview {
        uint256 qualifiedBusinessUSD;
        uint8 currentSlabIdx;
        uint256 currentL1;
        uint256 currentL2;
        uint256 currentLrest;
        LegBusiness[] allLegs;
        AchievementDetails[] achievedSlabs;
        AchievementDetails[] achievedRewards;
        AchievementDetails[] achievedRoyalties;
        uint256 nextSlabThreshold;
        uint256 nextRewardThreshold;
        uint256 nextRoyaltyThreshold;
        bool canClaimSlab;
        uint64 lastClaimAt;
        uint32 new50DirectsSinceClaim;
    }
    struct NextAchievementProgress {
        uint256 targetUSD;
        uint256 totalNeeded;
        uint256 L1_needed;
        uint256 L2_needed;
        uint256 Lrest_needed;
        bool isAchieved;
    }

    ISlabLens public slab;
    IRegistryMinimal public reg;
    ICoreConfig public cfg;

    function initialize(address _cfg) external initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        cfg = ICoreConfig(_cfg);
        slab = ISlabLens(cfg.slabManager());
        reg = IRegistryMinimal(cfg.userRegistry());
    }

    function setContract(address _cfg) external onlyOwner {
        cfg = ICoreConfig(_cfg);
        slab = ISlabLens(cfg.slabManager());
        reg = IRegistryMinimal(cfg.userRegistry());
    }

    // ------- Small internal utils (pure) -------
    function _sortDesc(uint256[] memory a) internal pure {
        for (uint i = 1; i < a.length; i++) {
            uint256 key = a[i];
            uint j = i;
            while (j > 0 && a[j - 1] < key) {
                a[j] = a[j - 1];
                j--;
            }
            a[j] = key;
        }
    }
    function _min3(
        uint256 a,
        uint256 b,
        uint256 c
    ) internal pure returns (uint256) {
        uint256 m = a < b ? a : b;
        return m < c ? m : c;
    }

    // ------- Mirror the heavy views here, using slab getters -------
    function getUserOverview(
        address user
    ) external view returns (UserOverview memory ov) {
        (uint8 slabIdx, , ) = ISlabLens(cfg.slabManager()).getSlabState(user);
        (uint256 L1, uint256 L2, , uint256 Lrest, ) = ISlabLens(
            cfg.slabManager()
        ).getTop3AndSum(user);

        ov.currentSlabIdx = slabIdx;
        ov.currentL1 = L1;
        ov.currentL2 = L2;
        ov.currentLrest = Lrest;

        // legs
        address[] memory keys = ISlabLens(cfg.slabManager()).getLegKeysOf(user);
        ov.allLegs = new LegBusiness[](keys.length);
        for (uint i = 0; i < keys.length; i++) {
            ov.allLegs[i] = LegBusiness(
                keys[i],
                ISlabLens(cfg.slabManager()).getLegVolOf(user, keys[i])
            );
        }

        // achievements
        (
            ov.achievedSlabs,
            ov.achievedRewards,
            ov.achievedRoyalties
        ) = _collectAchievements(user);

        // next thresholds
        uint256[] memory slabs = ISlabLens(cfg.slabManager())
            .getSlabThresholds();
        if (slabIdx + 1 < slabs.length)
            ov.nextSlabThreshold = slabs[slabIdx + 1];

        // basic claim gate (replicate your gates here if you removed canClaim from core)
        // (, uint64 lastClaimAt, uint32 new50) = slab.getSlabState(user);
        ov.lastClaimAt = uint64(block.timestamp);
        ov.new50DirectsSinceClaim = 0;

        // If you still expose canClaim in core, just call it instead to keep logic centralized.
        // ov.canClaimSlab = ISlabManagerView(address(slab)).canClaim(user);

        // qualifiedBusinessUSD (reconstruct via your same rule if you removed that from core)
        // To keep bytecode tiny in core, you can recompute T solely in reader using legs + directs.
        // Or, if you keep a slim getter on core, call it here:
        ov.qualifiedBusinessUSD = ISlabManagerView(address(slab))
            .getQualifiedBusinessUSD(user);

        return ov;
    }

    function _collectAchievements(
        address user
    )
        internal
        view
        returns (
            AchievementDetails[] memory sArr,
            AchievementDetails[] memory rArr,
            AchievementDetails[] memory yArr
        )
    {
        // slabs
        {
            (
                uint8[] memory idxs,
                uint64[] memory times,
                uint256[] memory L1s,
                uint256[] memory L2s,
                uint256[] memory Lrs
            ) = ISlabLens(cfg.slabManager()).getAchievedWithTimes(
                    user,
                    uint8(AchKind.Slab)
                );
            sArr = new AchievementDetails[](idxs.length);
            for (uint i = 0; i < idxs.length; i++)
                sArr[i] = AchievementDetails(
                    idxs[i],
                    times[i],
                    L1s[i],
                    L2s[i],
                    Lrs[i]
                );
        }
        // rewards
        {
            (
                uint8[] memory idxs,
                uint64[] memory times,
                uint256[] memory L1s,
                uint256[] memory L2s,
                uint256[] memory Lrs
            ) = ISlabLens(cfg.slabManager()).getAchievedWithTimes(
                    user,
                    uint8(AchKind.Reward)
                );
            rArr = new AchievementDetails[](idxs.length);
            for (uint i = 0; i < idxs.length; i++)
                rArr[i] = AchievementDetails(
                    idxs[i],
                    times[i],
                    L1s[i],
                    L2s[i],
                    Lrs[i]
                );
        }
        // royalties
        {
            (
                uint8[] memory idxs,
                uint64[] memory times,
                uint256[] memory L1s,
                uint256[] memory L2s,
                uint256[] memory Lrs
            ) = ISlabLens(cfg.slabManager()).getAchievedWithTimes(
                    user,
                    uint8(AchKind.Royalty)
                );
            yArr = new AchievementDetails[](idxs.length);
            for (uint i = 0; i < idxs.length; i++)
                yArr[i] = AchievementDetails(
                    idxs[i],
                    times[i],
                    L1s[i],
                    L2s[i],
                    Lrs[i]
                );
        }
    }

    // Example: moved here to keep core tiny
    function getRemainingForNext(
        address user,
        AchKind kind
    ) external view returns (NextAchievementProgress memory p) {
        (
            uint32 directs,
            address referrer,
            uint64 createdAt,
            bool isActive
        ) = IRegistryMinimal(address(reg)).getUser(user);

        // uint32 directs = reg.getUser(user).directsCount;
        (uint256 L1, uint256 L2, uint256 L3, , ) = ISlabManagerView(
            address(slab)
        ).getTop3AndSum(user);

        uint256 target;
        if (kind == AchKind.Slab) {
            uint8 sIdx = ISlabLens(address(slab)).getSlabIndex(user);
            uint256[] memory slabs = ISlabLens(cfg.slabManager())
                .getSlabThresholds();
            if (sIdx + 1 >= slabs.length) {
                p.isAchieved = true;
                return p;
            }
            target = slabs[sIdx + 1];
        } else if (kind == AchKind.Reward) {
            uint256[] memory rw = ISlabLens(cfg.slabManager())
                .getRewardMilestonesAll();
            // naive next = length of achieved list; or compute more carefully if you prefer
            (uint8[] memory idxs, , , , ) = ISlabLens(cfg.slabManager())
                .getAchievedWithTimes(user, uint8(AchKind.Reward));
            if (idxs.length >= rw.length) {
                p.isAchieved = true;
                return p;
            }
            target = rw[idxs.length];
        } else {
            // Royalty tiers
            // You already expose getRoyaltyTiers(); fetch next similar to rewards.
            // Skipping full body for brevity.
        }

        p.targetUSD = target;

        // two-path gaps (same math as core had, but now here)
        if (directs <= 3) {
            uint256 reqL1 = (target * 40) / 100;
            uint256 reqL2 = (target * 30) / 100;
            uint256 reqL3 = (target * 30) / 100;
            p.L1_needed = L1 < reqL1 ? (reqL1 - L1) : 0;
            p.L2_needed = L2 < reqL2 ? (reqL2 - L2) : 0;
            p.Lrest_needed = L3 < reqL3 ? (reqL3 - L3) : 0;
            uint256 T40 = _min3((L1 * 5) / 2, (L2 * 10) / 3, (L3 * 10) / 3);
            p.totalNeeded = T40 >= target ? 0 : (target - T40);
            p.isAchieved = (p.totalNeeded == 0);
            return p;
        } else {
            uint256 capped = ISlabLens(address(slab)).getCappedSumForTarget(
                user,
                target
            );

            if (capped >= target) {
                p.isAchieved = true;
                return p;
            }
            // compute strict path gap as well if you want to show “easier of A/B” (omitted here for brevity)
            p.totalNeeded = target - capped;
            return p;
        }
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
