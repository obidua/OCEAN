// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * OceanViewUpgradeable
 * --------------------
 * Read-only facade over OCEAN DeFi modules (upgradeable via UUPS).
 * Aggregates per-user stats for UI / analytics without duplicating state.
 *
 * Notes:
 * - This contract is VIEW-ONLY (no state writes beyond upgradeability).
 * - For "history"/day-wise data we try OPTIONAL getters on wallets. If missing, we return zeros/empty arrays.
 */

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "./interfaces/IUserRegistry.sol";

/* ========= Minimal interfaces (same as before) ========= */

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
        uint8 tier; // 0: $10–$5k ; 1: $5010+
        uint8 capPct; // 200 / 250
        address owner;
    }
    function portfoliosOf(
        address user
    ) external view returns (uint256[] memory);
    function getPortfolio(uint256 pid) external view returns (Portfolio memory);
    function getUSDPrincipal(uint256 pid) external view returns (uint256);

    function dailyRateTier0() external view returns (uint256);
    function dailyRateTier1() external view returns (uint256);
    function dailyRateBoosterTier0() external view returns (uint256);
    function dailyRateBoosterTier1() external view returns (uint256);

    function hasActiveMin50(address user) external view returns (bool);
}

interface ISlabManager {
    function getSlabIndex(address user) external view returns (uint8);
    function getQualifiedBusinessUSD(
        address user
    ) external view returns (uint256);
    function canClaim(address user) external view returns (bool);
}

interface IRoyaltyManager {
    function royalty(address user) external view returns (uint8, uint64, bool);
}

interface ISafeWallet {
    function ramaBalance(address user) external view returns (uint256);
    function roiUsdPaid(address user) external view returns (uint256);
    // OPTIONAL (queried via staticcall if present):
    // function userDayUsd(address user, uint32 dayId) external view returns (uint256);
    // function getUserTxHistory(address user, uint256 limit) external view returns (bytes[] memory);
}

// interface IMainWallet {
//     // OPTIONAL buckets (queried via staticcall if present)
//     // function slabBalance(address user) external view returns (uint256);
//     // function royaltyBalance(address user) external view returns (uint256);
//     // function rewardBalance(address user) external view returns (uint256);
// }

/* ========= UUPS Upgradeable View Facade ========= */

contract OceanViewUpgradeable is
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    ICoreConfig public cfg; // was immutable in non-upgradeable version

    /* --------- Init / Upgrade --------- */

    function initialize(address _cfg) external initializer {
        __Ownable_init();

        __UUPSUpgradeable_init();
        require(_cfg != address(0), "CFG_ZERO");
        cfg = ICoreConfig(_cfg);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    // storage gap for future variables
    uint256[50] private __gap;

    /* --------- Structs returned to UI --------- */

    struct UserOverview {
        // Money
        uint256 totalStakedRama;
        uint256 totalStakedUSD;
        uint256 totalSafeWalletRama;
        uint256 totalRoiUsdPaid;
        // Team
        uint32 directCount;
        uint256 teamCount;
        address uplineSponsor;
        // Slab / Royalty
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
        uint8 tier; // 0/1
        uint256 dailyRateWad; // e.g. 0.0033e18
        bool active; // not frozen & not capped
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

    /* --------- Shortcuts --------- */

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
    // function _main() internal view returns (IMainWallet) {
    //     return IMainWallet(cfg.mainWallet());
    // }

    function getAddresses() external view returns (address[8] memory addrs) {
        addrs[0] = cfg.rama();
        addrs[1] = cfg.priceOracle();
        addrs[2] = cfg.userRegistry();

        addrs[3] = cfg.portfolioManager();
        addrs[4] = cfg.slabManager();
        addrs[5] = cfg.royaltyManager();
        addrs[6] = cfg.rewardVault();
        addrs[7] = cfg.safeWallet();
    }
    /* ================= USER OVERVIEW ================= */

    /// @notice Aggregate per-user overview. For teamCount, pass a sensible maxDepth (e.g., 10) to cap gas.
    function getUserOverview(
        address user,
        uint8 teamDepthMax
    ) external view returns (UserOverview memory ov) {
        (uint256 sumRama, uint256 sumUsd) = _sumUserStake(user);
        ov.totalStakedRama = sumRama;
        ov.totalStakedUSD = sumUsd;

        ov.totalSafeWalletRama = _safe().ramaBalance(user);
        ov.totalRoiUsdPaid = _safe().roiUsdPaid(user);

        IUserRegistry.UserInfo memory ui = _reg().getUser(user);
        ov.directCount = ui.directsCount;
        ov.uplineSponsor = ui.referrer;
        ov.teamCount = _teamCountBfs(user, teamDepthMax);

        ov.slabIndex = _slab().getSlabIndex(user);
        ov.qualifiedVolumeUSD = _slab().getQualifiedBusinessUSD(user);
        ov.slabCanClaim = _slab().canClaim(user);

        (ov.royaltyTier, ov.royaltyLastMonthEpoch, ov.royaltyPaused) = _roy()
            .royalty(user);
    }

    /* ================= PORTFOLIO PANELS ================= */

    function getPortfolioSummaries(
        address user
    ) external view returns (PortfolioSummary[] memory out) {
        IPortfolioManager pm = _pm();
        uint256[] memory pids = pm.portfoliosOf(user);
        out = new PortfolioSummary[](pids.length);

        uint256 r0 = pm.dailyRateTier0();
        uint256 r1 = pm.dailyRateTier1();
        uint256 rb0 = pm.dailyRateBoosterTier0();
        uint256 rb1 = pm.dailyRateBoosterTier1();

        for (uint256 i = 0; i < pids.length; i++) {
            IPortfolioManager.Portfolio memory p = pm.getPortfolio(pids[i]);

            uint256 cap = (uint256(p.principal) * p.capPct) / 100;
            bool capped = uint256(p.credited) >= cap;
            bool frozen = (p.frozenUntil != 0 &&
                block.timestamp <= p.frozenUntil);

            uint256 rate = (p.tier == 1)
                ? (p.booster ? rb1 : r1)
                : (p.booster ? rb0 : r0);

            out[i] = PortfolioSummary({
                pid: pids[i],
                principalRama: p.principal,
                principalUSD: p.principalUsd,
                capRama: cap,
                creditedRama: p.credited,
                capPct: p.capPct,
                booster: p.booster,
                tier: p.tier,
                dailyRateWad: rate,
                active: (!frozen && !capped),
                createdAt: p.createdAt,
                frozenUntil: p.frozenUntil
            });
        }
    }

    /* ================= SLAB / ROYALTY / WALLET PANELS ================= */

    function getSlabPanel(
        address user
    ) external view returns (SlabPanel memory sp) {
        IUserRegistry.UserInfo memory ui = _reg().getUser(user);
        sp.slabIndex = _slab().getSlabIndex(user);
        sp.qualifiedVolumeUSD = _slab().getQualifiedBusinessUSD(user);
        sp.directMembers = ui.directsCount;
        sp.canClaim = _slab().canClaim(user);
    }

    function getRoyaltyPanel(
        address user
    ) external view returns (RoyaltyPanel memory rp) {
        (rp.currentLevel, rp.lastPaidMonthEpoch, rp.paused) = _roy().royalty(
            user
        );
    }

    function getWalletPanel(
        address user
    ) external view returns (WalletPanel memory wp) {
        wp.safeRama = _safe().ramaBalance(user);
        wp.lifetimeRoiUsd = _safe().roiUsdPaid(user);
    }

    /* ================= TEAM NETWORK ================= */

    /// @notice Returns (directs array, directCount, teamCount up to maxDepth).
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
        )
    {
        directs = _reg().getDirects(user);

        IUserRegistry.UserInfo memory ui = _reg().getUser(user);
        directCount = ui.directsCount;
        teamCount = _teamCountBfs(user, maxDepth);
    }

    /* ================= TREND / HISTORY (best-effort) ================= */

    /// @notice Last 7 days earning USD for user using OPTIONAL wallet getter userDayUsd(user, dayId).
    /// If not implemented in wallet, returns zeros.
    function getLast7DaysEarningsUSD(
        address user,
        uint32 todayDayId
    )
        external
        view
        returns (uint32[7] memory dayIds, uint256[7] memory usdAmounts)
    {
        address wallet = cfg.safeWallet(); // ROI credited here in your design
        for (uint256 i = 0; i < 7; i++) {
            uint32 d = todayDayId - uint32(i);
            dayIds[i] = d;
            usdAmounts[i] = _tryUserDayUsd(wallet, user, d);
        }
    }

    /// @notice Last N (<=10) transactions/earning history via OPTIONAL wallet getter.
    /// Returns opaque bytes entries or empty array if not implemented.
    function getLastTransactions(
        address user,
        uint256 limit
    ) external view returns (bytes[] memory entries) {
        if (limit == 0) {
            return new bytes[](0);
        }
        if (limit > 10) limit = 10;

        entries = _tryGetTxHistory(cfg.safeWallet(), user, limit);
        // if (entries.length == 0) {
        //     entries = _tryGetTxHistory(cfg.mainWallet(), user, limit);
        // }
    }

    /* ================= PORTFOLIO TOTALS (page helpers) ================= */

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
        )
    {
        (, totalValueUSD) = _sumUserStake(user);
        totalEarnedRama = _sumCreditedRama(user);
        directRefs = _reg().getUser(user).directsCount;
        qualifiedVolumeUSD = _slab().getQualifiedBusinessUSD(user);
        (royaltyLevel, , ) = _roy().royalty(user);
    }

    /* ================= INTERNAL SUMMERS ================= */

    function _sumUserStake(
        address user
    ) internal view returns (uint256 sumRama, uint256 sumUsd) {
        IPortfolioManager pm = _pm();
        uint256[] memory pids = pm.portfoliosOf(user);
        for (uint256 i = 0; i < pids.length; i++) {
            IPortfolioManager.Portfolio memory p = pm.getPortfolio(pids[i]);
            sumRama += p.principal;
            sumUsd += p.principalUsd;
        }
    }

    function getSumOfUserStakes(
        address user
    ) external view returns (uint256 amount) {
        return _sumCreditedRama(user);
    }

    function _sumCreditedRama(
        address user
    ) internal view returns (uint256 sumCredited) {
        IPortfolioManager pm = _pm();
        uint256[] memory pids = pm.portfoliosOf(user);
        for (uint256 i = 0; i < pids.length; i++) {
            IPortfolioManager.Portfolio memory p = pm.getPortfolio(pids[i]);
            sumCredited += p.credited;
        }
    }

    /// BFS count up to depth; frontends should cap depth to avoid heavy calls on giant trees.
    function _teamCountBfs(
        address root,
        uint8 maxDepth
    ) internal view returns (uint256) {
        if (maxDepth == 0) return 0;
        IUserRegistry reg = _reg();
        address[] memory frontier = reg.getDirects(root);
        uint256 count = frontier.length;

        for (uint8 depth = 2; depth <= maxDepth; depth++) {
            uint256 nextCount = 0;
            for (uint256 i = 0; i < frontier.length; i++) {
                nextCount += reg.getDirects(frontier[i]).length;
            }
            if (nextCount == 0) break;

            address[] memory next = new address[](nextCount);
            uint256 k = 0;
            for (uint256 i = 0; i < frontier.length; i++) {
                address[] memory kids = reg.getDirects(frontier[i]);
                for (uint256 j = 0; j < kids.length; j++) next[k++] = kids[j];
            }
            count += nextCount;
            frontier = next;
        }
        return count;
    }

    // check _teamCountBfs function for usage
    // function teamCountBfs(
    //     address root,
    //     uint8 maxDepth
    // ) external view returns (uint256) {
    //     return _teamCountBfs(root, maxDepth);
    // }

    /* ================= OPTIONAL-CALL HELPERS ================= */

    function _tryUserDayUsd(
        address wallet,
        address user,
        uint32 dayId
    ) internal view returns (uint256 usd) {
        (bool ok, bytes memory ret) = wallet.staticcall(
            abi.encodeWithSignature("userDayUsd(address,uint32)", user, dayId)
        );
        if (ok && ret.length >= 32) {
            usd = abi.decode(ret, (uint256));
        } else {
            usd = 0;
        }
    }

    function _tryGetTxHistory(
        address wallet,
        address user,
        uint256 limit
    ) internal view returns (bytes[] memory out) {
        (bool ok, bytes memory ret) = wallet.staticcall(
            abi.encodeWithSignature(
                "getUserTxHistory(address,uint256)",
                user,
                limit
            )
        );
        if (ok && ret.length > 0) {
            out = abi.decode(ret, (bytes[]));
        } else {
            out = new bytes[](0);
        }
    }
}
