// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

import "./interfaces/ICoreConfig.sol";
import "./interfaces/IUserRegistry.sol";
import "./interfaces/ISlabManager.sol";
import "./interfaces/IPortfolioManager.sol";
import "./libraries/OceanErrors.sol";
import "./interfaces/ISafeWallet.sol";

interface ICappingIncomeManager {
    function safeRewardCheckAndCredit(
        address user,
        uint256 pid,
        uint256 amountUSD6,
        uint256 rewardUSD6
    ) external returns (bool);
}

interface IRewardVault {
    function milestonesCount() external view returns (uint256);
    function getMilestone(
        uint8 idx
    ) external view returns (uint256 thresholdUsd, uint256 rewardUsd);
    function isMilestoneClaimed(
        address user,
        uint8 idx
    ) external view returns (bool);
}

interface ISlabManagerView is ISlabManager {
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

interface IAdminControlExt {
    function forcedFortyLegOf(address user) external view returns (address);
    function slabPolicy() external view returns (address);
}

interface ISlabQualificationPolicy {
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
        );
}

contract SlabManager is
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    ISlabManager
{
    ICoreConfig public cfg;
    IUserRegistry public registry;
    IPortfolioManager public pm;
    ICappingIncomeManager public capRouter;
    IRewardVault public rewardVault;

    enum AchKind {
        Slab,
        Reward,
        Royalty
    }

    struct LegVol {
        uint256 vol; // USD (1e6)
    }

    struct SlabQ {
        mapping(address => LegVol) legs; // top-first-hop child => volume
        address[] legKeys;
        uint8 slabIdx;
        uint64 lastClaimAt;
        uint32 new50SinceLastClaim;
    }

    mapping(address => SlabQ) internal s;

    // descendant => (upline => top-first-hop-child-of-upline-towards-descendant)
    mapping(address => mapping(address => address)) public topLegOf;

    // USD micro (1e6)
    uint256[] public slabThresholds;
    uint8[11] public slabPercents; // [5,10,15,20,25,30,35,45,50,55,60]

    // ---------- Static ladders ----------
    uint256[] public rewardMilestonesUSD; // USD(1e6)

    struct RoyaltyTier {
        uint256 thresholdUSD; // 1e6
        uint256 rewardUSD; // 1e6
    }
    RoyaltyTier[] public royaltyTiers;

    mapping(address => Ach) internal ach;

    // --- Structs for Detailed Views ---
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
        uint256 totalNeeded; // remaining by the easier path
        uint256 L1_needed; // for 40/30/30 presentation (≤3 directs or when that path is easier)
        uint256 L2_needed;
        uint256 Lrest_needed; // used as L3 gap
        bool isAchieved;
    }

    // Compact persistent snapshot (fixed-sized arrays = cheaper)
    struct AchievementSnapshot {
        uint64 at; // block.timestamp of achievement
        uint8 topN; // number of filled entries in {legs,shares}
        PathKind path; // path used to qualify (403030 or capped)
        uint256 targetUSD; // target threshold (USD 1e6) this snapshot is for
        uint256 totalCountedUSD; // sum of counted shares (==targetUSD when ok)
        address[5] legs; // top-5 legs by countedUSD
        uint96[5] sharesUSD; // counted amounts (USD 1e6). uint96 is plenty
        bool exists; // sentinel
    }

    // ---------- Merkle epoch (slab pool) ----------
    bytes32 public _currentRoot;
    uint64 public _currentEpoch;
    mapping(address => uint64) public claimedAtEpoch;

    // --- Achiever indexes (for on-chain discovery) ---
    mapping(uint8 => address[]) private _slabAchieversByStage;
    mapping(uint8 => address[]) private _rewardAchieversByStage;
    mapping(uint8 => address[]) private _royaltyAchieversByStage;

    address[] private _allSlabAchievers;
    address[] private _allRewardAchievers;
    address[] private _allRoyaltyAchievers;

    mapping(address => bool) private _isGlobalSlabAchiever;
    mapping(address => bool) private _isGlobalRewardAchiever;
    mapping(address => bool) private _isGlobalRoyaltyAchiever;

    enum PathKind {
        Strict403030,
        CappedSum
    }

    struct Ach {
        uint8 highestSlab;
        mapping(uint8 => bool) slabAchieved;
        uint8[] slabList;
        mapping(uint8 => uint64) slabAt;
        mapping(uint8 => uint256) slabL1;
        mapping(uint8 => uint256) slabL2;
        mapping(uint8 => uint256) slabLrest;
        mapping(uint8 => bool) rewardAchieved;
        uint8[] rewardList;
        mapping(uint8 => uint64) rewardAt;
        mapping(uint8 => uint256) rewardL1;
        mapping(uint8 => uint256) rewardL2;
        mapping(uint8 => uint256) rewardLrest;
        mapping(uint8 => bool) royaltyAchieved;
        uint8[] royaltyList;
        mapping(uint8 => uint64) royaltyAt;
        mapping(uint8 => uint256) royaltyL1;
        mapping(uint8 => uint256) royaltyL2;
        mapping(uint8 => uint256) royaltyLrest;
        // NEW: compact leg-share snapshots for each achievement
        mapping(uint8 => AchievementSnapshot) slabSnap; // stage => snapshot
        mapping(uint8 => AchievementSnapshot) rewardSnap; // stage => snapshot
        mapping(uint8 => AchievementSnapshot) royaltySnap; // stage => snapshot
    }

    struct AllocationShare {
        address leg;
        uint256 countedUSD; // how much of this leg is counted toward R
    }

    struct QualificationPreview {
        bool ok; // true if chosen path reaches target R
        PathKind path; // which path was used
        uint256 targetUSD; // R
        uint256 totalCountedUSD; // == R when ok (trimmed); else < R
        AllocationShare[] shares; // per-leg counted amounts (trimmed so sum<=R)
    }

    // ---------- Events ----------
    event BusinessDelta(
        address indexed upline,
        address indexed leg,
        int256 usdDelta,
        uint8 newSlab
    );
    event New50Direct(address indexed user, uint32 newCount);
    event RootSet(uint64 indexed epoch, bytes32 root);
    event Claimed(
        address indexed user,
        uint256 amount,
        uint8 slabIdx,
        uint64 epoch
    );
    event QualifiedUpdated(
        address indexed user,
        uint256 qualifiedT,
        uint8 slabIdx,
        uint256 L1,
        uint256 L2,
        uint256 Lrest
    );
    event SlabAchieved(
        address indexed user,
        uint8 slabIdx,
        uint256 qualifiedT,
        uint64 at
    );
    event RewardStageAchieved(
        address indexed user,
        uint8 milestoneIdx,
        uint256 qualifiedT,
        uint64 at
    );
    event RoyaltyStageAchieved(
        address indexed user,
        uint8 stageIdx,
        uint256 qualifiedT,
        uint256 rewardUSD,
        uint64 at
    );

    modifier onlyPM() {
        require(
            msg.sender == cfg.portfolioManager(),
            OceanErrors.NotAuthorized
        );
        _;
    }
    modifier onlyDistributor() {
        require(
            msg.sender == cfg.adminControl() || msg.sender == owner(),
            OceanErrors.NotAuthorized
        );
        _;
    }

    function initialize(address _cfg) external initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        cfg = ICoreConfig(_cfg);
        registry = IUserRegistry(cfg.userRegistry());
        pm = IPortfolioManager(cfg.portfolioManager());
        capRouter = ICappingIncomeManager(cfg.cappingIncomeManager());

        slabPercents = [5, 10, 15, 20, 25, 30, 35, 45, 50, 55, 60];

        // Slab thresholds (USD 1e6)
        slabThresholds = new uint256[](11);
        slabThresholds[0] = 500e6;
        slabThresholds[1] = 2500e6;
        slabThresholds[2] = 10000e6;
        slabThresholds[3] = 25000e6;
        slabThresholds[4] = 50000e6;
        slabThresholds[5] = 100000e6;
        slabThresholds[6] = 500000e6;
        slabThresholds[7] = 1000000e6;
        slabThresholds[8] = 2500000e6;
        slabThresholds[9] = 5000000e6;
        slabThresholds[10] = 20000000e6;

        // Reward milestones (USD 1e6) — 15 stages
        rewardMilestonesUSD = new uint256[](15);
        rewardMilestonesUSD[0] = 6000e6;
        rewardMilestonesUSD[1] = 15000e6;
        rewardMilestonesUSD[2] = 40000e6;
        rewardMilestonesUSD[3] = 60000e6;
        rewardMilestonesUSD[4] = 120000e6;
        rewardMilestonesUSD[5] = 300000e6;
        rewardMilestonesUSD[6] = 600000e6;
        rewardMilestonesUSD[7] = 1500000e6;
        rewardMilestonesUSD[8] = 3000000e6;
        rewardMilestonesUSD[9] = 6000000e6;
        rewardMilestonesUSD[10] = 15000000e6;
        rewardMilestonesUSD[11] = 30000000e6;
        rewardMilestonesUSD[12] = 60000000e6;
        rewardMilestonesUSD[13] = 200000000e6;
        rewardMilestonesUSD[14] = 500000000e6;

        // Royalty tiers — (thresholdUSD, rewardUSD), all 1e6
        royaltyTiers.push(RoyaltyTier(5000e6, 30e6));
        royaltyTiers.push(RoyaltyTier(10000e6, 80e6));
        royaltyTiers.push(RoyaltyTier(20000e6, 200e6));
        royaltyTiers.push(RoyaltyTier(60000e6, 500e6));
        royaltyTiers.push(RoyaltyTier(120000e6, 1000e6));
        royaltyTiers.push(RoyaltyTier(300000e6, 1500e6));
        royaltyTiers.push(RoyaltyTier(600000e6, 2500e6));
        royaltyTiers.push(RoyaltyTier(1500000e6, 5000e6));
        royaltyTiers.push(RoyaltyTier(3000000e6, 8000e6));
        royaltyTiers.push(RoyaltyTier(5000000e6, 12000e6));
        royaltyTiers.push(RoyaltyTier(10000000e6, 20000e6));
        royaltyTiers.push(RoyaltyTier(30000000e6, 40000e6));
        royaltyTiers.push(RoyaltyTier(50000000e6, 50000e6));
        royaltyTiers.push(RoyaltyTier(100000000e6, 100000e6));
    }

    // wiring
    function setCoreConfig(address _cfg) external onlyOwner {
        cfg = ICoreConfig(_cfg);
        registry = IUserRegistry(cfg.userRegistry());
        pm = IPortfolioManager(cfg.portfolioManager());
        capRouter = ICappingIncomeManager(cfg.cappingIncomeManager());
        rewardVault = IRewardVault(ICoreConfig(_cfg).rewardVault());
    }

    // --- PM hook ---
    function onBusinessDelta(
        address user,
        uint256 pid,
        int256 usdDelta
    ) external onlyPM {
        address cur = user;
        address parent = IUserRegistry(cfg.userRegistry()).getReferrer(cur);
        while (parent != address(0)) {
            address legKey = topLegOf[parent][user];
            if (legKey == address(0)) {
                legKey = _firstHopChild(parent, user);
                topLegOf[parent][user] = legKey;
                if (_isNewLeg(parent, legKey)) s[parent].legKeys.push(legKey);
            }

            address forced = IAdminControlExt(cfg.adminControl())
                .forcedFortyLegOf(parent);
            bool isForcedLeg = (forced != address(0) && forced == legKey);

            if (!isForcedLeg) {
                if (usdDelta >= 0) {
                    s[parent].legs[legKey].vol += uint256(usdDelta);
                } else {
                    uint256 dec = uint256(-usdDelta);
                    uint256 old = s[parent].legs[legKey].vol;
                    s[parent].legs[legKey].vol = dec > old ? 0 : (old - dec);
                }
            }

            (
                uint256 qualifiedT,
                uint8 newSlabIdx,
                uint256 L1,
                uint256 L2,
                uint256 Lrest
            ) = _qualifiedTAndSlabWithLegs(parent);
            s[parent].slabIdx = newSlabIdx;

            emit BusinessDelta(parent, legKey, usdDelta, newSlabIdx);
            emit QualifiedUpdated(
                parent,
                qualifiedT,
                newSlabIdx,
                L1,
                L2,
                Lrest
            );

            uint256 newRewardUSD6 = _checkAndMarkAchievements(
                parent,
                qualifiedT,
                newSlabIdx,
                L1,
                L2,
                Lrest
            );

            if (
                qualifiedT > 0 &&
                address(ICappingIncomeManager(cfg.cappingIncomeManager())) !=
                address(0)
            ) {
                // get reward from qualified volume

                ICappingIncomeManager(cfg.cappingIncomeManager())
                    .safeRewardCheckAndCredit(
                        parent,
                        pid,
                        qualifiedT,
                        newRewardUSD6
                    );
            }

            cur = parent;
            parent = IUserRegistry(cfg.userRegistry()).getReferrer(parent);
        }
    }

    function noteNew50Direct(address referrer) external onlyPM {
        s[referrer].new50SinceLastClaim += 1;
        emit New50Direct(referrer, s[referrer].new50SinceLastClaim);
    }

    // --- Views / gates ---
    function getSlabIndex(address user) external view returns (uint8) {
        return s[user].slabIdx;
    }
    function currentEpoch() external view returns (uint64) {
        return _currentEpoch;
    }
    // function currentRoot() external view returns (bytes32) {
    //     return _currentRoot;
    // }

    function getQualifiedBusinessUSD(
        address user
    ) external view returns (uint256) {
        (uint256 T, , , , ) = _qualifiedTAndSlabWithLegs(user);
        return T;
    }

    // (legacy) top2+rest view (still useful for analytics)
    function getLegsTop2AndRest(
        address user
    ) external view returns (uint256 L1, uint256 L2, uint256 Lrest) {
        (L1, L2, Lrest) = _currentLegs(user);
    }

    function canClaim(address user) public view returns (bool) {
        if (!IPortfolioManager(cfg.portfolioManager()).hasActiveMin50(user))
            return false;
        if (s[user].new50SinceLastClaim < 1) return false;
        uint8 slabIdx_ = s[user].slabIdx;
        if (
            IUserRegistry(cfg.userRegistry()).getDirectsWithMinTotalPortfolio50(
                user
            ) < uint32(slabIdx_) + 1
        ) return false;
        if (block.timestamp < uint256(s[user].lastClaimAt) + 24 hours)
            return false;
        return true;
    }

    // Helper: top-3 and sumAll (Lrest = sum beyond top-2 for analytics/back-compat)
    function _currentTop3AndSum(
        address u
    )
        internal
        view
        returns (
            uint256 L1,
            uint256 L2,
            uint256 L3,
            uint256 Lrest,
            uint256 sumAll
        )
    {
        address[] storage ks = s[u].legKeys;
        uint256 len = ks.length;
        if (len == 0) return (0, 0, 0, 0, 0);

        uint256[] memory vols = new uint256[](len);
        for (uint256 i = 0; i < len; i++) {
            uint256 v = s[u].legs[ks[i]].vol;
            vols[i] = v;
            sumAll += v;
        }
        _sortDesc(vols);

        L1 = vols[0];
        L2 = (len > 1) ? vols[1] : 0;
        L3 = (len > 2) ? vols[2] : 0;

        if (len > 2) {
            for (uint256 i = 2; i < len; i++) Lrest += vols[i];
        }
    }

    /// @dev path-A: strict 40/30/30 using top-3 only for a given target R.
    function _passes403030(
        uint256 L1,
        uint256 L2,
        uint256 L3,
        uint256 R
    ) internal pure returns (bool) {
        if (L3 == 0) return false;
        uint256 r40 = (R * 40) / 100;
        uint256 r30 = (R * 30) / 100;
        return (L1 >= r40 && L2 >= r30 && L3 >= r30);
    }

    /// @dev path-B: capped-sum for target R: one leg can contribute up to 40%R, all others up to 30%R.
    function _cappedSumForTarget(
        address u,
        uint256 R
    ) internal view returns (uint256 total) {
        SlabQ storage q = s[u];
        uint256 n = q.legKeys.length;
        if (n == 0) return 0;

        uint256 cap30 = (R * 30) / 100;
        uint256 cap40 = (R * 40) / 100;

        uint256 maxLeg = 0;

        // baseline: every leg capped at 30%
        for (uint256 i = 0; i < n; i++) {
            uint256 v = q.legs[q.legKeys[i]].vol;
            total += (v < cap30) ? v : cap30;
            if (v > maxLeg) maxLeg = v;
        }

        // promote exactly one leg from 30% -> 40% (add up to +10%R)
        uint256 promoted = (maxLeg < cap40) ? maxLeg : cap40;
        uint256 baseline = (maxLeg < cap30) ? maxLeg : cap30;
        total += (promoted - baseline);
    }

    /// @dev Highest stage threshold across slabs/rewards/royalties satisfied by user under the two-path rule.
    function _maxQualifiedTarget(
        address u,
        uint256 L1,
        uint256 L2,
        uint256 L3
    ) internal view returns (uint256 T) {
        uint32 directs = IUserRegistry(cfg.userRegistry())
            .getUser(u)
            .directsCount;

        // Slabs
        for (uint256 i = 0; i < slabThresholds.length; i++) {
            uint256 R = slabThresholds[i];
            bool ok = (directs <= 3)
                ? _passes403030(L1, L2, L3, R)
                : (_passes403030(L1, L2, L3, R) ||
                    _cappedSumForTarget(u, R) >= R);
            if (ok) T = R;
        }

        // Rewards
        for (uint256 i = 0; i < rewardMilestonesUSD.length; i++) {
            uint256 R = rewardMilestonesUSD[i];
            bool ok = (directs <= 3)
                ? _passes403030(L1, L2, L3, R)
                : (_passes403030(L1, L2, L3, R) ||
                    _cappedSumForTarget(u, R) >= R);
            if (ok && R > T) T = R;
        }

        // Royalties
        for (uint256 i = 0; i < royaltyTiers.length; i++) {
            uint256 R = royaltyTiers[i].thresholdUSD;
            bool ok = (directs <= 3)
                ? _passes403030(L1, L2, L3, R)
                : (_passes403030(L1, L2, L3, R) ||
                    _cappedSumForTarget(u, R) >= R);
            if (ok && R > T) T = R;
        }
    }

    // Main calculator returning (qualified target T, slabIdx, L1, L2, Lrest)
    function _qualifiedTAndSlabWithLegs(
        address u
    )
        internal
        view
        returns (
            uint256 T,
            uint8 slabIdx_,
            uint256 L1,
            uint256 L2,
            uint256 Lrest
        )
    {
        uint256 L3;
        uint256 sumAll;
        (L1, L2, L3, Lrest, sumAll) = _currentTop3AndSum(u);
        if (L1 == 0) return (0, 0, 0, 0, 0);

        // NEW: delegate to external policy if configured
        address policy = IAdminControlExt(cfg.adminControl()).slabPolicy();
        if (policy != address(0)) {
            (
                uint256 T2,
                uint8 slab2,
                uint256 _L1,
                uint256 _L2,
                uint256 _Lrest
            ) = ISlabQualificationPolicy(policy).maxQualifiedTarget(u);
            return (T2, slab2, _L1, _L2, _Lrest);
        }

        // NEW: find highest threshold satisfied under two-path rule
        T = _maxQualifiedTarget(u, L1, L2, L3);
        if (T == 0) return (0, 0, L1, L2, Lrest);

        // derive slabIdx from slab thresholds (highest i with slabThresholds[i] <= T)
        for (int256 i = int256(slabThresholds.length) - 1; i >= 0; i--) {
            if (T >= slabThresholds[uint256(i)]) {
                slabIdx_ = uint8(uint256(i));
                break;
            }
        }

        slabIdx_ = _capSlabIdxByDirects(u, slabIdx_);
    }

    // Legacy helper kept for existing external views
    function _currentLegs(
        address u
    ) internal view returns (uint256 L1, uint256 L2, uint256 Lrest) {
        address[] storage ks = s[u].legKeys;
        uint256 len = ks.length;
        if (len == 0) return (0, 0, 0);
        uint256[] memory vols = new uint256[](len);
        for (uint256 i = 0; i < len; i++) vols[i] = s[u].legs[ks[i]].vol;
        _sortDesc(vols);
        L1 = vols[0];
        L2 = vols.length > 1 ? vols[1] : 0;
        for (uint256 i = 2; i < vols.length; i++) Lrest += vols[i];
    }

    function _slabIdxFromT(uint256 T) internal view returns (uint8 idx) {
        for (int i = int(slabThresholds.length) - 1; i >= 0; i--) {
            if (T >= slabThresholds[uint(i)]) return uint8(uint(i));
        }
        return 0;
    }

    function _capSlabIdxByDirects(
        address user,
        uint8 idx
    ) internal view returns (uint8) {
        // uint32 d = IUserRegistry(cfg.userRegistry()).getUser(user).directsCount;
        // uint32 d = IUserRegistry(cfg.userRegistry()).getUser(user).directsCount;
        uint32 d = IUserRegistry(cfg.userRegistry())
            .getDirectsWithMinTotalPortfolio50(user);
        if (d == 0) return 0; // with 0 directs, only stage 0 is eligible
        uint32 maxIdx = d - 1; // stage k requires k+1 directs (0-based)
        return idx > maxIdx ? uint8(maxIdx) : idx;
    }

    function _min3(
        uint256 a,
        uint256 b,
        uint256 c
    ) internal pure returns (uint256) {
        uint256 m = a < b ? a : b;
        return m < c ? m : c;
    }

    function _isNewLeg(
        address upline,
        address leg
    ) internal view returns (bool) {
        address[] storage ks = s[upline].legKeys;
        for (uint i = 0; i < ks.length; i++) if (ks[i] == leg) return false;
        return true;
    }

    function _firstHopChild(
        address ancestor,
        address descendant
    ) internal view returns (address) {
        address cur = descendant;
        address parent = IUserRegistry(cfg.userRegistry()).getReferrer(cur);
        address prev = descendant;
        while (parent != address(0)) {
            if (parent == ancestor) return prev;
            prev = parent;
            parent = IUserRegistry(cfg.userRegistry()).getReferrer(parent);
        }
        return address(0);
    }

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

    // --- Achievements (storage unchanged; works with new T) ---
    function _checkAndMarkAchievements(
        address user,
        uint256 qualifiedT,
        uint8 curSlabIdx,
        uint256 L1,
        uint256 L2,
        uint256 Lrest
    ) internal returns (uint256 newlyEarnedRewardUSD6) {
        Ach storage A = ach[user];
        uint64 nowTs = uint64(block.timestamp);

        // ----- NEW: compute max slab index allowed by directs -----
        // uint32 d = IUserRegistry(cfg.userRegistry()).getUser(user).directsCount;
        uint32 d = IUserRegistry(cfg.userRegistry())
            .getDirectsWithMinTotalPortfolio50(user);
        // uint256 directsWith50 = IUserRegistry(cfg.userRegistry())
        //     .getDirectsWithMinTotalPortfolio50(u);
        uint8 maxAllowedIdx = (d == 0) ? 0 : uint8(d - 1);
        uint8 gatedCurSlabIdx = curSlabIdx > maxAllowedIdx
            ? maxAllowedIdx
            : curSlabIdx;

        // Slabs
        if (gatedCurSlabIdx > A.highestSlab) {
            for (uint8 i = A.highestSlab; i <= gatedCurSlabIdx; i++) {
                if (!A.slabAchieved[i]) {
                    A.slabAchieved[i] = true;
                    A.slabAt[i] = nowTs;
                    A.slabList.push(i);
                    A.slabL1[i] = L1;
                    A.slabL2[i] = L2;
                    A.slabLrest[i] = Lrest;

                    // NEW: snapshot top-5 at achieve time
                    if (!A.slabSnap[i].exists) {
                        uint256 targetUSD = slabThresholds[i];
                        AchievementSnapshot memory snap = _buildSnapshot(
                            user,
                            targetUSD
                        );
                        // overwrite in storage
                        A.slabSnap[i] = snap;
                    }

                    emit SlabAchieved(user, i, qualifiedT, nowTs);
                    _slabAchieversByStage[i].push(user);
                    if (!_isGlobalSlabAchiever[user]) {
                        _isGlobalSlabAchiever[user] = true;
                        _allSlabAchievers.push(user);
                    }
                }
                if (i == gatedCurSlabIdx) break;
            }
            A.highestSlab = gatedCurSlabIdx;
        }

        for (uint8 r = 0; r < rewardMilestonesUSD.length; r++) {
            if (qualifiedT >= rewardMilestonesUSD[r] && !A.rewardAchieved[r]) {
                A.rewardAchieved[r] = true;
                A.rewardAt[r] = nowTs;
                A.rewardList.push(r);
                A.rewardL1[r] = L1;
                A.rewardL2[r] = L2;
                A.rewardLrest[r] = Lrest;

                // NEW: snapshot at achieve time
                if (!A.rewardSnap[r].exists) {
                    AchievementSnapshot memory snap = _buildSnapshot(
                        user,
                        rewardMilestonesUSD[r]
                    );
                    A.rewardSnap[r] = snap;
                }

                emit RewardStageAchieved(user, r, qualifiedT, nowTs);
                if (address(rewardVault) != address(0)) {
                    (, uint256 rewardUsd) = rewardVault.getMilestone(r);
                    newlyEarnedRewardUSD6 += rewardUsd;
                }
                _rewardAchieversByStage[r].push(user);
                if (!_isGlobalRewardAchiever[user]) {
                    _isGlobalRewardAchiever[user] = true;
                    _allRewardAchievers.push(user);
                }
            }
        }

        // --- Royalties ---
        for (uint8 y = 0; y < royaltyTiers.length; y++) {
            RoyaltyTier memory t = royaltyTiers[y];
            if (qualifiedT >= t.thresholdUSD && !A.royaltyAchieved[y]) {
                A.royaltyAchieved[y] = true;
                A.royaltyAt[y] = nowTs;
                A.royaltyList.push(y);
                A.royaltyL1[y] = L1;
                A.royaltyL2[y] = L2;
                A.royaltyLrest[y] = Lrest;

                // NEW: snapshot at achieve time
                if (!A.royaltySnap[y].exists) {
                    AchievementSnapshot memory snap = _buildSnapshot(
                        user,
                        t.thresholdUSD
                    );
                    A.royaltySnap[y] = snap;
                }

                emit RoyaltyStageAchieved(
                    user,
                    y,
                    qualifiedT,
                    t.rewardUSD,
                    nowTs
                );
                _royaltyAchieversByStage[y].push(user);
                if (!_isGlobalRoyaltyAchiever[user]) {
                    _isGlobalRoyaltyAchiever[user] = true;
                    _allRoyaltyAchievers.push(user);
                }
            }
        }
    }

    /// @notice Unified achievements-with-times getter for Slab / Reward / Royalty.
    /// @param user The user to query
    /// @param kind 0=Slab, 1=Reward, 2=Royalty (AchKind)
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
        )
    {
        Ach storage A = ach[user];

        // Pick the list for the requested kind
        uint8[] storage list;
        if (kind == AchKind.Slab) {
            list = A.slabList;
        } else if (kind == AchKind.Reward) {
            list = A.rewardList;
        } else {
            // AchKind.Royalty
            list = A.royaltyList;
        }

        uint256 n = list.length;
        idxs = new uint8[](n);
        times = new uint64[](n);
        L1s = new uint256[](n);
        L2s = new uint256[](n);
        Lrests = new uint256[](n);

        for (uint256 i = 0; i < n; i++) {
            uint8 k = list[i];
            idxs[i] = k;

            if (kind == AchKind.Slab) {
                times[i] = A.slabAt[k];
                L1s[i] = A.slabL1[k];
                L2s[i] = A.slabL2[k];
                Lrests[i] = A.slabLrest[k];
            } else if (kind == AchKind.Reward) {
                times[i] = A.rewardAt[k];
                L1s[i] = A.rewardL1[k];
                L2s[i] = A.rewardL2[k];
                Lrests[i] = A.rewardLrest[k];
            } else {
                // AchKind.Royalty
                times[i] = A.royaltyAt[k];
                L1s[i] = A.royaltyL1[k];
                L2s[i] = A.royaltyL2[k];
                Lrests[i] = A.royaltyLrest[k];
            }
        }
    }

    // Optional: read static ladders
    function getRewardMilestones() external view returns (uint256[] memory) {
        return rewardMilestonesUSD;
    }
    function getRoyaltyTiers() external view returns (RoyaltyTier[] memory) {
        return royaltyTiers;
    }

    // --- Detailed Overview ---
    function getLegsDetailed(
        address user
    ) external view returns (LegBusiness[] memory) {
        SlabQ storage slabQ = s[user];
        LegBusiness[] memory legs = new LegBusiness[](slabQ.legKeys.length);
        for (uint i = 0; i < slabQ.legKeys.length; i++) {
            address legKey = slabQ.legKeys[i];
            legs[i] = LegBusiness({
                leg: legKey,
                volume: slabQ.legs[legKey].vol
            });
        }
        return legs;
    }

    // --- Handy views for dashboards/tools ---
    function getSlabPercents() external view returns (uint8[11] memory) {
        return slabPercents;
    }

    function slabPercentOf(address user) external view returns (uint8) {
        return slabPercents[s[user].slabIdx];
    }

    /// Walks the upline of `downline` and returns ONLY those members who earn a positive differential override.
    // function getOverrideParticipants(
    //     address downline,
    //     uint256 maxHops
    // )
    //     external
    //     view
    //     returns (
    //         address[] memory addrs,
    //         uint8[] memory slabIdxs,
    //         uint8[] memory slabPercs,
    //         uint8[] memory deltaPercs
    //     )
    // {
    //     address[] memory path = new address[](maxHops);
    //     uint256 pathLen = 0;
    //     {
    //         address cur = downline;
    //         for (uint256 i = 0; i < maxHops; i++) {
    //             address parent = IUserRegistry(cfg.userRegistry()).getReferrer(
    //                 cur
    //             );
    //             if (parent == address(0)) break;
    //             path[pathLen++] = parent;
    //             cur = parent;
    //         }
    //     }

    //     if (pathLen == 0) {
    //         return (
    //             new address[](0),
    //             new uint8[](0),
    //             new uint8[](0),
    //             new uint8[](0)
    //         );
    //     }

    //     uint8[11] memory ladder = slabPercents;
    //     uint8[] memory idxsAll = new uint8[](pathLen);
    //     uint8[] memory pctsAll = new uint8[](pathLen);
    //     for (uint256 i = 0; i < pathLen; i++) {
    //         uint8 idx = s[path[i]].slabIdx;
    //         idxsAll[i] = idx;
    //         pctsAll[i] = ladder[idx];
    //     }

    //     uint8 paidUpToPct = 0;
    //     uint256 earners = 0;
    //     uint8[] memory deltasAll = new uint8[](pathLen);
    //     for (uint256 i = 0; i < pathLen; i++) {
    //         uint8 pct = pctsAll[i];
    //         uint8 delta = pct > paidUpToPct ? (pct - paidUpToPct) : 0;
    //         deltasAll[i] = delta;
    //         if (delta > 0) {
    //             earners++;
    //             paidUpToPct = pct;
    //         }
    //     }

    //     addrs = new address[](earners);
    //     slabIdxs = new uint8[](earners);
    //     slabPercs = new uint8[](earners);
    //     deltaPercs = new uint8[](earners);

    //     if (earners == 0) return (addrs, slabIdxs, slabPercs, deltaPercs);

    //     uint256 w = 0;
    //     paidUpToPct = 0;
    //     for (uint256 i = 0; i < pathLen; i++) {
    //         uint8 pct = pctsAll[i];
    //         uint8 delta = pct > paidUpToPct ? (pct - paidUpToPct) : 0;
    //         if (delta > 0) {
    //             addrs[w] = path[i];
    //             slabIdxs[w] = idxsAll[i];
    //             slabPercs[w] = pct;
    //             deltaPercs[w] = delta;
    //             paidUpToPct = pct;
    //             w++;
    //             if (w == earners) break;
    //         }
    //     }
    // }

    // Pagination helpers for achievers (unchanged)
    function getAchievers(
        uint8 kind,
        uint8 stage,
        uint256 offset,
        uint256 limit
    ) external view returns (address[] memory out) {
        address[] storage arr;
        if (kind == uint8(AchKind.Slab)) {
            arr = _slabAchieversByStage[stage];
        } else if (kind == uint8(AchKind.Reward)) {
            arr = _rewardAchieversByStage[stage];
        } else if (kind == uint8(AchKind.Royalty)) {
            arr = _royaltyAchieversByStage[stage];
        } else {
            return new address[](0);
        }

        uint256 n = arr.length;
        if (offset >= n) return new address[](0);

        uint256 end = offset + limit;
        if (end > n) end = n;
        uint256 len = end - offset;

        out = new address[](len);
        for (uint256 i = 0; i < len; i++) {
            out[i] = arr[offset + i];
        }
    }

    // function getAchieversCount(
    //     uint8 kind,
    //     uint8 stage
    // ) external view returns (uint256) {
    //     if (kind == uint8(AchKind.Slab))
    //         return _slabAchieversByStage[stage].length;
    //     if (kind == uint8(AchKind.Reward))
    //         return _rewardAchieversByStage[stage].length;
    //     if (kind == uint8(AchKind.Royalty))
    //         return _royaltyAchieversByStage[stage].length;
    //     return 0;
    // }

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
        )
    {
        return _currentTop3AndSum(user);
    }

    function getCappedSumForTarget(
        address user,
        uint256 targetUSD
    ) external view returns (uint256) {
        return _cappedSumForTarget(user, targetUSD);
    }

    /// @dev Strict 40/30/30 using top-3 only; writes into `out` (same length as legs).
    function _allocateStrict403030(
        uint256 R,
        address[] memory legs,
        uint256[] memory vols,
        AllocationShare[] memory out
    ) internal pure returns (bool ok, uint256 total) {
        uint256 n = legs.length;
        for (uint256 i = 0; i < n; i++) {
            out[i] = AllocationShare({leg: legs[i], countedUSD: 0});
        }
        if (R == 0 || n < 3) return (false, 0);

        uint256 r40 = (R * 40) / 100;
        uint256 r30 = (R * 30) / 100;

        uint256 add = vols[0] < r40 ? vols[0] : r40;
        out[0].countedUSD = add;
        total += add;

        if (total < R) {
            add = vols[1] < r30 ? vols[1] : r30;
            if (total + add > R) add = R - total;
            out[1].countedUSD = add;
            total += add;
        }
        if (total < R) {
            add = vols[2] < r30 ? vols[2] : r30;
            if (total + add > R) add = R - total;
            out[2].countedUSD = add;
            total += add;
        }

        ok = (out[0].countedUSD >= r40 &&
            out[1].countedUSD >= r30 &&
            out[2].countedUSD >= r30);
        return (ok, total);
    }

    /// @dev Capped-sum: one leg ≤40%R, all others ≤30%R (best effort fill to R).
    function _allocCappedCopy(
        uint256 R,
        address[] memory legs,
        uint256[] memory vols
    )
        internal
        pure
        returns (bool ok, uint256 total, AllocationShare[] memory shares)
    {
        uint256 n = legs.length;
        shares = new AllocationShare[](n);
        if (R == 0 || n == 0) return (false, 0, shares);

        uint256 cap30 = (R * 30) / 100;
        uint256 cap40 = (R * 40) / 100;

        // Baseline: cap every leg at 30%
        for (uint256 i = 0; i < n; i++) {
            uint256 add = vols[i] < cap30 ? vols[i] : cap30;
            if (total + add > R) add = R - total;
            shares[i] = AllocationShare({leg: legs[i], countedUSD: add});
            total += add;
            if (total == R) return (true, total, shares);
        }

        // Promote the biggest leg (legs are already sorted desc: index 0)
        uint256 baseline = shares[0].countedUSD;
        uint256 room40 = cap40 > baseline ? cap40 - baseline : 0;
        if (room40 > 0) {
            uint256 extra = vols[0] > baseline ? vols[0] - baseline : 0;
            if (extra > room40) extra = room40;
            if (total + extra > R) extra = R - total;
            shares[0].countedUSD = baseline + extra;
            total += extra;
        }

        ok = (total >= R);
        return (ok, total, shares);
    }

    /// @dev Sort by countedUSD desc in-place (simple insertion sort).
    function _sortSharesDesc(AllocationShare[] memory a) internal pure {
        for (uint256 i = 1; i < a.length; i++) {
            AllocationShare memory key = a[i];
            uint256 j = i;
            while (j > 0 && a[j - 1].countedUSD < key.countedUSD) {
                a[j] = a[j - 1];
                j--;
            }
            a[j] = key;
        }
    }

    /// @dev Build a compact snapshot for (user,targetUSD), deciding best path per directs rule.
    function _buildSnapshot(
        address user,
        uint256 targetUSD
    ) internal view returns (AchievementSnapshot memory snap) {
        snap.targetUSD = targetUSD;
        snap.at = uint64(block.timestamp);

        // Collect legs+vols sorted desc
        SlabQ storage q = s[user];
        uint256 n = q.legKeys.length;
        address[] memory legs = new address[](n);
        uint256[] memory vols = new uint256[](n);
        for (uint256 i = 0; i < n; i++) {
            legs[i] = q.legKeys[i];
            vols[i] = q.legs[legs[i]].vol;
        }
        // sort vols & legs together (reuse your existing _sortDesc then remap, or inline)
        // We'll reuse a local insertion sort to keep code self-contained:
        for (uint256 i = 1; i < n; i++) {
            address la = legs[i];
            uint256 va = vols[i];
            uint256 j = i;
            while (j > 0 && vols[j - 1] < va) {
                legs[j] = legs[j - 1];
                vols[j] = vols[j - 1];
                j--;
            }
            legs[j] = la;
            vols[j] = va;
        }

        AllocationShare[] memory alloc;

        uint32 directs = registry.getUser(user).directsCount;
        if (directs <= 3) {
            alloc = new AllocationShare[](n);
            (, /*ok*/ snap.totalCountedUSD) = _allocateStrict403030(
                targetUSD,
                legs,
                vols,
                alloc
            );
            snap.path = PathKind.Strict403030;
        } else {
            bool okB;
            (okB, snap.totalCountedUSD, alloc) = _allocCappedCopy(
                targetUSD,
                legs,
                vols
            );
            if (!okB) {
                // fallback to strict
                alloc = new AllocationShare[](n);
                (, /*okA*/ snap.totalCountedUSD) = _allocateStrict403030(
                    targetUSD,
                    legs,
                    vols,
                    alloc
                );
                snap.path = PathKind.Strict403030;
            } else {
                snap.path = PathKind.CappedSum;
            }
        }

        // Order by counted desc and pack top-5
        _sortSharesDesc(alloc);
        uint256 m = alloc.length > 5 ? 5 : alloc.length;
        snap.topN = uint8(m);
        for (uint256 i = 0; i < m; i++) {
            snap.legs[i] = alloc[i].leg;
            // safe to cast to uint96 (USD 1e6 volumes are far below 2^96)
            snap.sharesUSD[i] = uint96(alloc[i].countedUSD);
        }
        snap.exists = true;
    }

    // function getAchievementSnapshot(
    //     address user,
    //     AchKind kind,
    //     uint8 stage
    // ) external view returns (AchievementSnapshot memory snap) {
    //     Ach storage A = ach[user];
    //     if (kind == AchKind.Slab) return A.slabSnap[stage];
    //     if (kind == AchKind.Reward) return A.rewardSnap[stage];
    //     return A.royaltySnap[stage];
    // }

    // /// @notice Get all snapshots of a kind for a user (ordered by achieve list).
    // function getAchievementSnapshotsAll(
    //     address user,
    //     AchKind kind
    // ) external view returns (AchievementSnapshot[] memory out) {
    //     Ach storage A = ach[user];
    //     uint8[] storage list = (
    //         kind == AchKind.Slab
    //             ? A.slabList
    //             : kind == AchKind.Reward
    //                 ? A.rewardList
    //                 : A.royaltyList
    //     );

    //     uint256 n = list.length;
    //     out = new AchievementSnapshot[](n);
    //     for (uint256 i = 0; i < n; i++) {
    //         uint8 k = list[i];
    //         if (kind == AchKind.Slab) out[i] = A.slabSnap[k];
    //         else if (kind == AchKind.Reward) out[i] = A.rewardSnap[k];
    //         else out[i] = A.royaltySnap[k];
    //     }
    // }

    // --- Lens helpers for SlabManagerReader ---

    function getSlabState(
        address user
    )
        external
        view
        returns (uint8 slabIdx, uint64 lastClaimAt, uint32 new50SinceLastClaim)
    {
        SlabQ storage q = s[user];
        return (q.slabIdx, q.lastClaimAt, q.new50SinceLastClaim);
    }

    function getLegKeysOf(
        address user
    ) external view returns (address[] memory) {
        return s[user].legKeys;
    }

    function getLegVolOf(
        address user,
        address leg
    ) external view returns (uint256) {
        return s[user].legs[leg].vol;
    }

    function getSlabThresholds() external view returns (uint256[] memory out) {
        uint256 n = slabThresholds.length;
        out = new uint256[](n);
        for (uint256 i = 0; i < n; i++) out[i] = slabThresholds[i];
    }

    function getRewardMilestonesAll()
        external
        view
        returns (uint256[] memory out)
    {
        uint256 n = rewardMilestonesUSD.length;
        out = new uint256[](n);
        for (uint256 i = 0; i < n; i++) out[i] = rewardMilestonesUSD[i];
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
