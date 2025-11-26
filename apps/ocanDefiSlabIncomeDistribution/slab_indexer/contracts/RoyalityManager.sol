// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
// import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol"; // no Merkle: fully on-chain entitlements

import "./interfaces/ICoreConfig.sol";
import "./interfaces/IUserRegistry.sol";
// import "./libraries/OceanErrors.sol";
import "./interfaces/ISafeWallet.sol";
import "./interfaces/IPortfolioManager.sol";
import "./interfaces/IRamaOracle.sol";

/* ---------------------- SlabManager royalty-facing view --------------------- */

// Minimal interfaces to CappingIncomeManager used for cap-aware claims
interface ICappingIncomeManagerViewOnly {
    function next4xThresholdUSD6(
        address user
    )
        external
        view
        returns (
            uint256 nextThresholdUSD6,
            uint256 cumPrincipalUSD6,
            uint256 earnedUSD6
        );
}
interface ICappingIncomeManagerOnly {
    function tryNoteIncomeUSD6(
        address user,
        uint256 pid,
        uint256 amountUSD6,
        bytes32 kind
    ) external returns (bool);
}

interface ISlabManagerRoyaltyView {
    enum AchKind {
        Slab,
        Reward,
        Royalty
    }

    // New-rule qualified T (≤3 => 40/30/30 on top-3; >3 => max(T40, sumAll))
    function getQualifiedBusinessUSD(
        address user
    ) external view returns (uint256);

    // Snapshot of achieved royalty stages with timestamps (+leg snapshots if available)
    function getAchievedRoyaltiesWithTimes(
        address user
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

    // Top-3 legs and totals for diagnostics
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

    // Progress helper from SlabManager (reuses same rule + thresholds)
    struct NextAchievementProgress {
        uint256 targetUSD;
        uint256 totalNeeded;
        uint256 L1_needed; // for strict path (≤3) or when strict path chosen as "easier"
        uint256 L2_needed;
        uint256 Lrest_needed; // NOTE: used as L3_needed under new rule
        bool isAchieved;
    }
    function getRemainingForNextRoyalty(
        address user
    ) external view returns (NextAchievementProgress memory);

    // (Optional) unified achiever indexers – pass-through convenience
    // kind: 0=Slab, 1=Reward, 2=Royalty
    function getAchievers(
        uint8 kind,
        uint8 stage,
        uint256 offset,
        uint256 limit
    ) external view returns (address[] memory out);
    function getGlobalAchieversWithStages(
        uint8 kind,
        uint256 offset,
        uint256 limit
    ) external view returns (address[] memory users, uint8[][] memory stages);
}

interface ISafeWalletRoyaltyView is ISafeWallet {
    function getTransactionsByKind(
        address user,
        uint8 kind,
        bool isCredit,
        uint256 offset,
        uint256 limit
    ) external view returns (LedgerEntry[] memory slice, uint256 totalMatched);
}

/* ================================ CONTRACT ================================= */
contract RoyaltyManager is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    // Custom errors to reduce bytecode size
    error NotAuthorized();
    error EpochConfigInvalid();
    error NoEntitlement();
    error AlreadyDone();
    error NoOpenPortfolio();
    error NoCapRoom();
    error ZeroAmount();
    error IndexOOB();
    error BadStage();
    ICoreConfig public cfg;
    IUserRegistry public users;

    // --- Reference table (USD 1e6) ---
    struct RoyaltyTier {
        uint256 teamBusiness;
        uint256 monthlyUSD;
    }

    RoyaltyTier[] public tiers;

    // --- Epoch config (admin defines what a "month" is) ---
    uint64 public epochZeroTs; // unix seconds that defines the start of epoch 1
    uint64 public epochLenSec; // duration of 1 epoch in seconds

    // --- On-chain entitlements per epoch ---
    // No Merkle: amounts are stored per user per monthId

    // --- Lean per-user state (informational) ---
    struct RoyaltyState {
        uint8 lastPaidTier; // 0..14
        uint64 lastPaidMonthEpoch; // integer epoch id starting at 1
        bool paused; // UI info; set by publisher
        uint256 lastPaidBusinessUSD6; // qualified business at time of last successful claim
    }
    mapping(address => RoyaltyState) public royaltyState;

    // Optional caches for transparency (not required for payout correctness)
    mapping(address => uint256) public tNowCache; // USD 1e6
    mapping(address => uint256) public t60dAgoCache; // USD 1e6

    // Optional: indexed pending royalties (so we can list them on-chain)
    struct PendingRoyalty {
        uint64 monthId;
        uint256 amountUSD; // entitlement in USD(1e6)
        uint256 creditedUSD; // how much has been claimed so far in USD(1e6)
        uint8 tierIdx;
        bool exists;
    }

    mapping(address => mapping(uint64 => PendingRoyalty)) public pendingRoyalty; // user => monthId => pending
    mapping(address => uint64[]) private _pendingMonths; // user => list of monthIds (for views)
    mapping(address => mapping(uint64 => bool)) private _pendingMonthSeen; // dedup

    mapping(uint64 => uint64) public monthLastDistributionAt; // monthId => last block.timestamp a distribution ran
    uint64 public globalLastDistributionAt; // last time ANY distribution function ran
    uint64 public globalLastDistributionMonth;

    // --- Claimed receipts index (for user-facing history) ---
    struct RoyaltyReceipt {
        uint64 monthId; // epoch id
        uint8 tierIdx; // tier at claim time
        uint256 amountUSD6; // USD(1e6) credited (cumulative for that month)
        uint256 amountRamaWei; // RAMA wei credited (cumulative)
        uint64 timestamp; // block.timestamp at claim
    }

    struct RoyaltyMonthRow {
        uint64 monthId;
        uint8 tierIdx;
        uint256 amountUSD6;
        uint256 amountRamaWei;
        uint64 timestamp;
        bool claimedOnChain; // true if any credit recorded for that month
        bool rootPresent; // monthRoot[monthId] != 0
    }

    struct RoyaltyMonthlyViewDetailed {
        uint64 monthId;
        bool rootPresent;
        bool hasClaimed;
        bool hasPending;
        uint8 pendingTierIdx;
        uint256 pendingUSD6;
        uint256 pendingRamaWei;
        // If claimed, include receipt snapshot:
        uint8 claimedTierIdx;
        uint256 claimedUSD6;
        uint256 claimedRamaWei;
        uint64 claimedAt;
    }

    mapping(address => mapping(uint64 => RoyaltyReceipt))
        private _royaltyReceipt; // (user,month)->receipt
    mapping(address => uint64[]) private _claimedMonths; // user -> months (ordered append)
    mapping(address => mapping(uint64 => bool)) private _claimedMonthSeen; // dedup guard

    // Per-epoch business snapshots used for gating and audit
    struct RoyaltyBusinessSnap {
        uint256 lastTUSD6; // business at last successful claim
        uint256 currTUSD6; // business at distribution snapshot
        uint256 gainUSD6; // curr - last (0 if negative)
    }
    mapping(address => mapping(uint64 => RoyaltyBusinessSnap)) public bizSnap;

    // ---------- Add near your other view structs ----------
    struct PendingItem {
        uint64 monthId;
        uint8 tierIdx;
        uint256 amountUSD6;
        uint256 amountRamaWei;
        bool exists;
    }

    // =============== Add with your other structs ===============
    struct RoyaltyKPIs {
        // Money figures (USD 1e6, RAMA wei)
        uint256 totalEarnedUSD6; // claimed + hold (pending). (Unclaimed Merkle amounts aren't on-chain.)
        uint256 totalEarnedRamaWei;
        uint256 claimedUSD6; // lifetime claimed (from SafeWallet ledger)
        uint256 claimedRamaWei;
        uint256 unclaimedCount; // number of months in `monthUniverse` with rootPresent && !claimed
        uint64[] unclaimedMonths; // which months (amounts are off-chain in Merkle leaf)
        uint256 holdUSD6; // sum of ALL pending months (queued because user had no open/not-capped pid)
        uint256 holdRamaWei;
        uint8 currentLevel; // current royalty tier index (derived from qualified T)
        uint256 payoutsReceived; // total Royalty credit entries in SafeWallet
        // Next-claim probe (for a specific month)
        uint64 nextClaimMonthId;
        bool nextClaimRootPresent;
        bool nextClaimHasClaimed;
        bool nextClaimHasPending;
        uint8 nextClaimPendingTierIdx; // if pending exists
        uint256 nextClaimPendingUSD6; // if pending exists
        uint256 nextClaimPendingRamaWei; // if pending exists
    }

    // --- Events ---
    // Merkle is not used anymore; event removed to reduce size
    // Emitted on each successful claim (can happen multiple times per month if partial)
    event RoyaltyPaid(
        address indexed user,
        uint64 indexed monthId,
        uint8 tierIdx,
        uint256 creditedUSD6,
        uint256 creditedRamaWei
    );
    event RoyaltyMetaSet(
        address indexed user,
        uint64 monthId,
        bool paused,
        uint256 tNow,
        uint256 t60dAgo
    );
    // Entitlement stored for a user/month (no payment yet)
    event RoyaltyPendingSet(
        address indexed user,
        uint64 indexed monthId,
        uint8 tierIdx,
        uint256 amountUSD
    );
    event RoyaltyPendingCleared(address indexed user, uint64 indexed monthId);

    modifier onlyDistributor() {
        if (msg.sender != cfg.adminControl() && msg.sender != owner()) revert NotAuthorized();
        _;
    }

    function initialize(address _cfg) external initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        cfg = ICoreConfig(_cfg);
        users = IUserRegistry(cfg.userRegistry());

        // default epoch config: start now, 30 days (can be changed by admin)
        epochZeroTs = uint64(block.timestamp);
        epochLenSec = 30 days;

        // Tiers to be set later by initTiers()
    }

    // ============= Epoch controls =============
    function setEpochConfig(
        uint64 zeroTs,
        uint64 lenSec
    ) external onlyDistributor {
        if (zeroTs == 0 || lenSec == 0) revert EpochConfigInvalid();
        epochZeroTs = zeroTs;
        epochLenSec = lenSec;
    }
    function currentMonthId() public view returns (uint64) {
        if (epochLenSec == 0) return 1;
        if (block.timestamp <= epochZeroTs) return 1;
        uint256 d = (block.timestamp - epochZeroTs) / epochLenSec;
        return uint64(1 + d);
    }
    function monthIdAt(uint64 ts) public view returns (uint64) {
        if (epochLenSec == 0) return 1;
        if (ts <= epochZeroTs) return 1;
        uint256 d = (ts - epochZeroTs) / epochLenSec;
        return uint64(1 + d);
    }

    /* ============================== ADMIN (Setup) ============================== */
    /// One-time tiers initialization to avoid code bloat in initialize
    function initTiers(uint256[] calldata teamBusiness, uint256[] calldata monthlyUSD) external onlyDistributor {
        if (tiers.length != 0) revert AlreadyDone();
        if (teamBusiness.length == 0 || teamBusiness.length != monthlyUSD.length) revert EpochConfigInvalid();
        tiers = new RoyaltyTier[](teamBusiness.length);
        for (uint256 i = 0; i < teamBusiness.length; i++) {
            tiers[i] = RoyaltyTier(teamBusiness[i], monthlyUSD[i]);
        }
    }

    /// Record meta for a user used in this month's decision (UI/audit).
    function setUserRoyaltyMeta(
        address user,
        uint64 monthId,
        bool paused_,
        uint256 tNowUsd6,
        uint256 t60dAgoUsd6
    ) external onlyDistributor {
        RoyaltyState storage st = royaltyState[user];
        st.paused = paused_;
        tNowCache[user] = tNowUsd6;
        t60dAgoCache[user] = t60dAgoUsd6;
        emit RoyaltyMetaSet(user, monthId, paused_, tNowUsd6, t60dAgoUsd6);
    }

    /// Set or update an on-chain entitlement for a given month (no payment yet)
    function setPendingRoyalty(
        address user,
        uint64 monthId,
        uint8 tierIdx,
        uint256 amountUSD6
    ) external onlyDistributor {
        PendingRoyalty storage pr = pendingRoyalty[user][monthId];
        pr.monthId = monthId;
        pr.tierIdx = tierIdx;
        pr.amountUSD = amountUSD6;
        // creditedUSD remains (in case of top-up entitlement), does not reset
        pr.exists = true;

        if (!_pendingMonthSeen[user][monthId]) {
            _pendingMonthSeen[user][monthId] = true;
            _pendingMonths[user].push(monthId);
        }

        emit RoyaltyPendingSet(user, monthId, tierIdx, amountUSD6);
    }

    /// Clear a pending royalty entry (e.g., if paid via another route)
    function clearPendingRoyalty(
        address user,
        uint64 monthId
    ) external onlyDistributor {
        if (pendingRoyalty[user][monthId].exists) {
            delete pendingRoyalty[user][monthId];
            emit RoyaltyPendingCleared(user, monthId);
        }
    }

    /// Attempt to release multiple months (partial claims per cap). User-triggered.
    function releasePendingRoyalties(uint64[] calldata monthIds) external {
        for (uint256 i = 0; i < monthIds.length; i++) {
            _claimFor(msg.sender, monthIds[i], type(uint256).max);
        }
    }

    /* ================================ CLAIM ================================== */

    /// Claim up to `maxUSD6` for a given month, respecting remaining 4x cap.
    function claimRoyalty(uint64 monthId, uint256 maxUSD6) external {
        _claimFor(msg.sender, monthId, maxUSD6);
    }

    function _claimFor(address user, uint64 monthId, uint256 maxUSD6) internal {
        PendingRoyalty storage pr = pendingRoyalty[user][monthId];
        if (!pr.exists) revert NoEntitlement();
        uint256 remainingUSD6 = pr.amountUSD > pr.creditedUSD
            ? (pr.amountUSD - pr.creditedUSD)
            : 0;
        if (remainingUSD6 == 0) revert AlreadyDone();

        // must have open portfolio
        if (!_hasOpenNotCapped(user)) revert NoOpenPortfolio();

        // remaining to sequential 4x
        (uint256 th, , uint256 earned) = ICappingIncomeManagerViewOnly(
            cfg.cappingIncomeManager()
        ).next4xThresholdUSD6(user);
        uint256 rem4x = th > earned ? (th - earned) : 0;
        if (rem4x == 0) revert NoCapRoom();

        uint256 payUSD6 = remainingUSD6;
        if (payUSD6 > rem4x) payUSD6 = rem4x;
        if (maxUSD6 != 0 && payUSD6 > maxUSD6) payUSD6 = maxUSD6;
        if (payUSD6 == 0) revert ZeroAmount();

        uint256 ramaWei = IRamaOracle(cfg.priceOracle()).usdToRama(payUSD6);

        // credit wallet
        ISafeWallet(cfg.safeWallet()).creditGeneral(
            user,
            ISafeWallet.TxKind.Royalty,
            payUSD6,
            ramaWei,
            bytes32(uint256(monthId))
        );

        // count toward 4x tracker
        ICappingIncomeManagerOnly(cfg.cappingIncomeManager()).tryNoteIncomeUSD6(
            user,
            0,
            payUSD6,
            bytes32("ROYALTY")
        );

        // update entitlement & receipt
        pr.creditedUSD += payUSD6;

        RoyaltyReceipt storage rec = _royaltyReceipt[user][monthId];
        rec.monthId = monthId;
        rec.tierIdx = pr.tierIdx;
        rec.amountUSD6 += payUSD6;
        rec.amountRamaWei += ramaWei;
        rec.timestamp = uint64(block.timestamp);
        if (!_claimedMonthSeen[user][monthId]) {
            _claimedMonthSeen[user][monthId] = true;
            _claimedMonths[user].push(monthId);
        }

        // advance user state (gating anchor): use distributed snapshot if exists
        RoyaltyState storage st = royaltyState[user];
        st.lastPaidTier = pr.tierIdx;
        st.lastPaidMonthEpoch = monthId;
        st.paused = false;
        RoyaltyBusinessSnap memory snap = bizSnap[user][monthId];
        if (snap.currTUSD6 > 0) st.lastPaidBusinessUSD6 = snap.currTUSD6;

        emit RoyaltyPaid(user, monthId, pr.tierIdx, payUSD6, ramaWei);
    }

    /* ================================ VIEWS ================================== */

    function _hasOpenNotCapped(address user) internal view returns (bool) {
        IPortfolioManager pm = IPortfolioManager(cfg.portfolioManager());
        uint256[] memory pids = pm.portfoliosOf(user);
        for (uint256 i = 0; i < pids.length; i++) {
            IPortfolioManager.Portfolio memory p = pm.getPortfolio(pids[i]);
            if (!p.isClosed && !p.isCapped) return true;
        }
        return false;
    }

    function getTierCount() external view returns (uint256) {
        return tiers.length;
    }
    function getTier(uint256 idx) external view returns (RoyaltyTier memory) {
        return tiers[idx];
    }
    function thresholdUSD(uint256 idx) external view returns (uint256) {
        if (idx >= tiers.length) revert IndexOOB();
        return tiers[idx].teamBusiness;
    }
    function salaryUSD(uint256 idx) external view returns (uint256) {
        if (idx >= tiers.length) revert IndexOOB();
        return tiers[idx].monthlyUSD;
    }

    // Compatibility view: returns (currentLevel, lastPaidMonth, paused)

    function royalty(address user) external view returns (uint8, uint64, bool) {
        RoyaltyState memory st = royaltyState[user];
        uint256 qT = ISlabManagerRoyaltyView(cfg.slabManager())
            .getQualifiedBusinessUSD(user);
        uint8 level = currentTierIndexForT(qT);
        return (level, st.lastPaidMonthEpoch, st.paused);
    }

    /// Helper: compute current tier index for a given T (USD 1e6)
    function currentTierIndexForT(uint256 T) public view returns (uint8 idx) {
        uint256 n = tiers.length;
        if (n == 0) return 0;
        // safe reverse loop without underflow
        for (uint256 i = n; i > 0; i--) {
            uint256 k = i - 1;
            if (T >= tiers[k].teamBusiness) {
                return uint8(k);
            }
        }
        return 0;
    }

    /// Oracle helpers (optional)
    // function usdToRama(uint256 usd6) public view returns (uint256) {
    //     IRamaOracle oracle = IRamaOracle(cfg.priceOracle());
    //     return oracle.usdToRama(usd6);
    // // }
    // function ramaToUsd(uint256 ramaWei) public view returns (uint256) {
    //     IRamaOracle oracle = IRamaOracle(cfg.priceOracle());
    //     return oracle.ramaToUSD(ramaWei);
    // }

    /* ----------------------- Royalty diagnostics & summary ---------------------- */

    struct RoyaltyOverview {
        uint256 qualifiedTUSD6; // new-rule qualified T
        uint8 currentTierIdx; // derived from tiers[]
        uint8 lastPaidTier;
        uint64 lastPaidMonth;
        bool paused;
        uint256 nextThresholdUSD6; // 0 if at top
        uint256 neededUSD6; // gap to next tier (0 if achieved or top)
        uint8[] achievedStages; // from SlabManager
        uint64[] achievedAt; // timestamps
        uint256 L1_atLast; // optional: from latest snapshot arrays if present (0 if none)
        uint256 L2_atLast;
        uint256 Lrest_atLast;
        uint256 tNowCacheUSD6;
        uint256 t60dAgoCacheUSD6;
        uint256 lastPaidBusinessUSD6;
    }

    function getUserRoyaltyOverview(
        address user
    ) external view returns (RoyaltyOverview memory ov) {
        ISlabManagerRoyaltyView sm = ISlabManagerRoyaltyView(cfg.slabManager());

        ov.qualifiedTUSD6 = sm.getQualifiedBusinessUSD(user);
        ov.currentTierIdx = currentTierIndexForT(ov.qualifiedTUSD6);
        (ov.achievedStages, ov.achievedAt, , , ) = sm.getAchievedWithTimes(
            user,
            ISlabManagerRoyaltyView.AchKind.Royalty
        );

        RoyaltyState memory st = royaltyState[user];
        ov.lastPaidTier = st.lastPaidTier;
        ov.lastPaidMonth = st.lastPaidMonthEpoch;
        ov.paused = st.paused;
        ov.lastPaidBusinessUSD6 = st.lastPaidBusinessUSD6;

        ov.tNowCacheUSD6 = tNowCache[user];
        ov.t60dAgoCacheUSD6 = t60dAgoCache[user];

        // Next tier gap
        if (ov.currentTierIdx + 1 < tiers.length) {
            ov.nextThresholdUSD6 = tiers[ov.currentTierIdx + 1].teamBusiness;
            ov.neededUSD6 = (ov.qualifiedTUSD6 >= ov.nextThresholdUSD6)
                ? 0
                : (ov.nextThresholdUSD6 - ov.qualifiedTUSD6);
        } else {
            ov.nextThresholdUSD6 = 0;
            ov.neededUSD6 = 0;
        }

        // // Optional: pick last snapshot legs if arrays returned (avoid bounds checks if none)
        // // We only set single last values if you need a quick glance; full history lives in SlabManager.
        // // (not strictly necessary; can be removed if not wanted)
        // // NOTE: we don't have direct access to arrays here; left zero by default.
    }

    /// Progress using SlabManager's unified calculator (handles ≤3 vs >3 internally)
    function getRoyaltyProgress(
        address user
    )
        external
        view
        returns (ISlabManagerRoyaltyView.NextAchievementProgress memory)
    {
        ISlabManagerRoyaltyView sm = ISlabManagerRoyaltyView(cfg.slabManager());
        return sm.getRemainingForNextRoyalty(user);
    }

    /// Merkle/claim status for given months
    struct MonthStatus {
        uint64 monthId;
        bool rootPresent;
        bool hasClaimed;
        bool hasPending;
        uint8 pendingTierIdx;
        uint256 pendingUSD6;
        uint256 pendingRamaWei;
    }
    function getMonthStatuses(
        address user,
        uint64[] calldata monthIds
    ) external view returns (MonthStatus[] memory out) {
        out = new MonthStatus[](monthIds.length);
        for (uint256 i = 0; i < monthIds.length; i++) {
            uint64 m = monthIds[i];
            PendingRoyalty memory pr = pendingRoyalty[user][m];
            out[i] = MonthStatus({
                monthId: m,
                rootPresent: pr.exists, // entitlement exists
                hasClaimed: pr.exists && pr.creditedUSD > 0,
                hasPending: pr.exists && (pr.creditedUSD < pr.amountUSD),
                pendingTierIdx: pr.tierIdx,
                pendingUSD6: pr.amountUSD > pr.creditedUSD
                    ? (pr.amountUSD - pr.creditedUSD)
                    : 0,
                pendingRamaWei: 0
            });
        }
    }

    /// List pending months for a user (paged)
    function getPendingMonths(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (uint64[] memory months) {
        uint64[] storage arr = _pendingMonths[user];
        uint256 n = arr.length;
        if (offset >= n) return new uint64[](0);
        uint256 end = offset + limit;
        if (end > n) end = n;
        months = new uint64[](end - offset);
        for (uint256 i = 0; i < months.length; i++) months[i] = arr[offset + i];
    }

    /// @notice Lifetime royalty totals as recorded in SafeWallet (faster than summing receipts)
    function getRoyaltyTotals(
        address user
    )
        external
        view
        returns (uint256 usdTotal6, uint256 ramaTotalWei, uint256 entries)
    {
        // TxKind: ROI=0, Growth=1, Royalty=2, Slab=3, Reward=4, Direct=5
        return ISafeWallet(cfg.safeWallet()).getTotalsByKind(user, 2, true);
    }

    /// @notice Returns a page of month IDs the user has claimed (ordered by first-claim append)
    function getRoyaltyMonths(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (uint64[] memory months) {
        uint64[] storage arr = _claimedMonths[user];
        uint256 n = arr.length;

        if (offset >= n) return new uint64[](0);

        uint256 end = offset + limit;
        if (end > n) end = n;
        months = new uint64[](end - offset);
        for (uint256 i = 0; i < months.length; i++) months[i] = arr[offset + i];
    }

    /// @notice Detailed receipt for a specific month; `exists` true if any credit was recorded.
    function getRoyaltyReceipt(
        address user,
        uint64 monthId
    ) external view returns (RoyaltyReceipt memory rec, bool exists) {
        rec = _royaltyReceipt[user][monthId];
        exists = (rec.monthId == monthId && rec.amountUSD6 > 0);
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
        uint64[] storage arr = _claimedMonths[user];
        totalMonths = arr.length;
        if (offset >= totalMonths) {
            return (new RoyaltyMonthRow[](0), totalMonths, 0, 0);
        }

        uint256 end = offset + limit;
        if (end > totalMonths) end = totalMonths;
        uint256 len = end - offset;

        rows = new RoyaltyMonthRow[](len);
        for (uint256 i = 0; i < len; i++) {
            uint64 m = arr[offset + i];
            RoyaltyReceipt storage r = _royaltyReceipt[user][m];

            rows[i] = RoyaltyMonthRow({
                monthId: m,
                tierIdx: r.tierIdx,
                amountUSD6: r.amountUSD6,
                amountRamaWei: r.amountRamaWei,
                timestamp: r.timestamp,
                claimedOnChain: (r.amountUSD6 > 0),
                rootPresent: pendingRoyalty[user][m].exists
            });

            usdGrandTotal6 += r.amountUSD6;
            ramaGrandTotalWei += r.amountRamaWei;
        }
    }

    struct RoyaltyMonthlyView {
        uint64 monthId;
        bool rootPresent;
        bool hasClaimed;
        bool hasPending;
        uint8 pendingTierIdx;
        uint256 pendingUSD6;
        uint256 pendingRamaWei;
        // If claimed, include receipt snapshot:
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
            PendingRoyalty memory pr = pendingRoyalty[user][m];
            RoyaltyReceipt memory rc = _royaltyReceipt[user][m];

            out[i] = RoyaltyMonthlyView({
                monthId: m,
                rootPresent: pr.exists,
                hasClaimed: (rc.amountUSD6 > 0),
                hasPending: pr.exists && (pr.creditedUSD < pr.amountUSD),
                pendingTierIdx: pr.tierIdx,
                pendingUSD6: pr.amountUSD > pr.creditedUSD
                    ? (pr.amountUSD - pr.creditedUSD)
                    : 0,
                pendingRamaWei: 0,
                claimedTierIdx: rc.tierIdx,
                claimedUSD6: rc.amountUSD6,
                claimedRamaWei: rc.amountRamaWei,
                claimedAt: rc.timestamp
            });
        }
    }

    /// @notice Raw wallet ledger slice for Royalty credits (for auditors)
    function getRoyaltyLedgerSlice(
        address user,
        uint256 offset,
        uint256 limit
    )
        external
        view
        returns (ISafeWallet.LedgerEntry[] memory slice, uint256 totalMatched)
    {
        return
            ISafeWalletRoyaltyView(cfg.safeWallet()).getTransactionsByKind(
                user,
                2,
                true,
                offset,
                limit
            );
    }

    /* ============================= ADMIN DISTRIBUTION ============================= */

    /// @dev Gating rule: 2 epochs grace after last claim; beyond that require +10% growth in qualified T
    function _eligibleForMonth(
        address user,
        uint64 monthId,
        uint256 currTUSD6
    ) internal view returns (bool ok, uint8 tierToPay, uint256 lastT) {
        RoyaltyState memory st = royaltyState[user];
        lastT = st.lastPaidBusinessUSD6;
        tierToPay = currentTierIndexForT(currTUSD6);
        if (st.lastPaidMonthEpoch == 0) return (true, tierToPay, lastT);
        if (monthId <= st.lastPaidMonthEpoch) return (false, tierToPay, lastT);
        uint64 diff = monthId - st.lastPaidMonthEpoch;
        if (diff <= 2) return (true, tierToPay, lastT);
        // require at least +10%
        if (lastT == 0) return (true, tierToPay, lastT);
        uint256 req = (lastT * 110) / 100; // +10%
        if (currTUSD6 >= req) return (true, tierToPay, lastT);
        return (false, tierToPay, lastT);
    }

    /// @dev Create/update entitlement and store business snapshot
    function _recordEntitlement(
        address user,
        uint64 monthId,
        uint8 tierIdx,
        uint256 amountUSD6,
        uint256 lastTUSD6,
        uint256 currTUSD6
    ) internal {
        PendingRoyalty storage pr = pendingRoyalty[user][monthId];
        pr.monthId = monthId;
        pr.tierIdx = tierIdx;
        pr.amountUSD = amountUSD6;
        pr.exists = true;
        if (!_pendingMonthSeen[user][monthId]) {
            _pendingMonthSeen[user][monthId] = true;
            _pendingMonths[user].push(monthId);
        }
        uint256 gain = currTUSD6 > lastTUSD6 ? (currTUSD6 - lastTUSD6) : 0;
        bizSnap[user][monthId] = RoyaltyBusinessSnap({
            lastTUSD6: lastTUSD6,
            currTUSD6: currTUSD6,
            gainUSD6: gain
        });
        emit RoyaltyPendingSet(user, monthId, tierIdx, amountUSD6);
    }

    /// @notice External entry for helpers: compute tier and record entitlement with gating checks.
    function recordEntitlementFromDistributor(
        address user,
        uint64 monthId,
        uint8 minStageIdx
    ) external onlyDistributor {
        uint256 currT = ISlabManagerRoyaltyView(cfg.slabManager()).getQualifiedBusinessUSD(user);
        (bool ok, uint8 tierToPay, uint256 lastT) = _eligibleForMonth(user, monthId, currT);
        if (!ok) return;
        uint8 useTier = tierToPay;
        if (useTier < minStageIdx) useTier = minStageIdx;
        if (useTier >= tiers.length) return;
        uint256 usd6 = tiers[useTier].monthlyUSD;
        _recordEntitlement(user, monthId, useTier, usd6, lastT, currT);
        _noteDistribution(monthId);
    }

    function distributeRoyaltyForStage(
        uint64 monthId,
        uint8 stageIdx,
        uint256 offset,
        uint256 limit
    ) public onlyDistributor {
        // moved to external helper to reduce code size
        revert NotAuthorized();
    }

    /// @notice Distribute royalty entitlements for ALL stages to a PAGE of achievers per stage (no auto-credit).
    /// @dev Loops tiers and applies the same (offset, limit) per stage. Call multiple times to paginate.
    ///      Useful when you want a single admin action to sweep all tiers for a month.
    /// @param monthId Epoch id (starts at 1)
    /// @param offset  Start index within each stage’s achiever list
    /// @param limit   Max to process for each stage in this call
    function distributeRoyaltyAllStages(
        uint64 monthId,
        uint256 offset,
        uint256 limit
    ) external onlyDistributor { revert NotAuthorized(); }

    /// @notice Manual distributor: provide explicit users array for a given stage (entitlements only).
    /// @dev Handy when backend pre-filters or needs to retry specific addresses.
    /// @param monthId  Month epoch
    /// @param stageIdx Royalty tier index
    /// @param users_   List of users to pay (or queue pending if they cannot receive now)
    function distributeRoyaltyManual(
        uint64 monthId,
        uint8 stageIdx,
        address[] calldata users_
    ) external onlyDistributor { revert NotAuthorized(); }

    // =============== Single-call KPIs fetch ===============
    /**
     * @param user            target user
     * @param monthUniverse   months you want checked for "unclaimed" (e.g., last 6–12 months)
     * @param nextClaimMonth  the specific month you want to show as "Next Claim" on the UI
     */
    function getRoyaltyKPIs(
        address user,
        uint64[] calldata monthUniverse,
        uint64 nextClaimMonth
    ) external view returns (RoyaltyKPIs memory kpi) {
        // ---- Current level (tier) via overview ----
        RoyaltyOverview memory ov = this.getUserRoyaltyOverview(user);
        kpi.currentLevel = ov.currentTierIdx;

        // ---- Claimed totals & payouts received (from SafeWallet) ----
        (
            kpi.claimedUSD6,
            kpi.claimedRamaWei,
            kpi.payoutsReceived
        ) = ISafeWallet(cfg.safeWallet()).getTotalsByKind(user, 2, true);

        // ---- Hold / Next Month (sum ALL pending for user) ----
        // NOTE: We iterate the stored list `_pendingMonths[user]` (on-chain).
        {
            uint64[] storage pm = _pendingMonths[user];
            uint256 len = pm.length;
            uint256 usdSum;
            uint256 ramaSum;
            for (uint256 i = 0; i < len; i++) {
                PendingRoyalty storage pr = pendingRoyalty[user][pm[i]];
                if (pr.exists && pr.amountUSD > pr.creditedUSD) {
                    usdSum += (pr.amountUSD - pr.creditedUSD);
                    // rama unknown until claim; keep 0
                }
            }
            kpi.holdUSD6 = usdSum;
            kpi.holdRamaWei = ramaSum;
        }

        // ---- Unclaimed royalty (by month presence; amount is not stored on-chain) ----
        // We flag months that have a Merkle root but user hasn't claimed and isn't pending.
        // Frontend can show "$0.0000" and use these months for a claim modal (supply Merkle leaf off-chain).
        {
            uint256 n = monthUniverse.length;
            // worst case allocate n (we'll trim by writing actuals then copying)
            uint64[] memory tmp = new uint64[](n);
            uint256 w = 0;
            for (uint256 i = 0; i < n; i++) {
                uint64 m = monthUniverse[i];
                PendingRoyalty storage pr = pendingRoyalty[user][m];
                bool hasEntitlement = pr.exists;
                bool fullyClaimed = hasEntitlement &&
                    (pr.creditedUSD >= pr.amountUSD);
                if (hasEntitlement && !fullyClaimed) tmp[w++] = m;
            }
            kpi.unclaimedCount = w;
            kpi.unclaimedMonths = new uint64[](w);
            for (uint256 j = 0; j < w; j++) kpi.unclaimedMonths[j] = tmp[j];
        }

        // ---- Totals: "earned" = claimed + hold (pending).
        // (Unclaimed Merkle amounts are unknown on-chain, so not included.)
        kpi.totalEarnedUSD6 = kpi.claimedUSD6 + kpi.holdUSD6;
        kpi.totalEarnedRamaWei = kpi.claimedRamaWei + kpi.holdRamaWei;

        // ---- Next-claim section for a specific month ----
        {
            PendingRoyalty memory pr = pendingRoyalty[user][nextClaimMonth];
            kpi.nextClaimMonthId = nextClaimMonth;
            kpi.nextClaimRootPresent = pr.exists;
            kpi.nextClaimHasClaimed = (_royaltyReceipt[user][nextClaimMonth]
                .amountUSD6 > 0);
            kpi.nextClaimHasPending =
                pr.exists &&
                (pr.creditedUSD < pr.amountUSD);
            kpi.nextClaimPendingTierIdx = pr.tierIdx;
            kpi.nextClaimPendingUSD6 = pr.amountUSD > pr.creditedUSD
                ? (pr.amountUSD - pr.creditedUSD)
                : 0;
            kpi.nextClaimPendingRamaWei = 0;
        }
    }

    function _noteDistribution(uint64 monthId) internal {
        uint64 nowTs = uint64(block.timestamp);
        monthLastDistributionAt[monthId] = nowTs;
        globalLastDistributionAt = nowTs;
        globalLastDistributionMonth = monthId;
    }

    /// Cap-aware expected payout for a month: what can be claimed now vs held.
    function getExpectedRoyaltyForMonth(
        address user,
        uint64 monthId
    )
        external
        view
        returns (
            uint8 tierIdx,
            uint256 entitledUSD6,
            uint256 creditedUSD6,
            uint256 expectedCreditUSD6,
            uint256 holdUSD6
        )
    {
        PendingRoyalty memory pr = pendingRoyalty[user][monthId];
        tierIdx = pr.tierIdx;
        entitledUSD6 = pr.amountUSD;
        creditedUSD6 = pr.creditedUSD;
        uint256 remain = pr.amountUSD > pr.creditedUSD
            ? (pr.amountUSD - pr.creditedUSD)
            : 0;
        if (remain == 0) {
            return (tierIdx, entitledUSD6, creditedUSD6, 0, 0);
        }
        (uint256 th, , uint256 earned) = ICappingIncomeManagerViewOnly(
            cfg.cappingIncomeManager()
        ).next4xThresholdUSD6(user);
        uint256 rem4x = th > earned ? (th - earned) : 0;
        expectedCreditUSD6 = remain > rem4x ? rem4x : remain;
        holdUSD6 = remain > expectedCreditUSD6
            ? (remain - expectedCreditUSD6)
            : 0;
    }

    /* --------------------------------- Upgrade -------------------------------- */
    function _authorizeUpgrade(address) internal override onlyOwner {}
}
