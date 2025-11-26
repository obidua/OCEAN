// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "./interfaces/ICoreConfig.sol";
import "./interfaces/IPortfolioManager.sol";

// Optional: only used locally; not heavy
interface ICappingIncomeManagerView {
    function hasOpenPortfolio(address user) external view returns (bool);
}

contract OceanViewV2 is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    // ---------------- Storage ----------------
    uint8 internal constant TEAM_DEPTH = 10;

    ICoreConfig public cfg;

    address public worker; // OceanViewWorker address

    event WorkerUpdated(address indexed worker);

    // ---------------- Structs (exactly as before) ----------------
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
        uint256 overrideUsdMicro;
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

    // ---------------- Init / Upgrade ----------------
    function initialize(address _cfg) external initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        require(_cfg != address(0), "OV2: cfg=0");
        cfg = ICoreConfig(_cfg);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function setInit(address w, address _cfg) external onlyOwner {
        require(w != address(0), "OV2: worker=0");

        require(_cfg != address(0), "OV2: worker=0");
        worker = w;
        cfg = ICoreConfig(_cfg);
        emit WorkerUpdated(w);
    }

    // ---------------- Internal staticcall helpers ----------------
    // We staticcall the worker to avoid type coupling; decode into local structs.

    function _call1(
        bytes4 sel,
        bytes memory args
    ) internal view returns (bytes memory out) {
        (bool ok, bytes memory ret) = worker.staticcall(
            abi.encodePacked(sel, args)
        );
        require(ok, "OV2: worker call failed");
        return ret;
    }

    // ---------------- Public / external views (forwarded) ----------------

    // === Income + Wallet ===
    function getIncomeStreams(
        address user
    ) external view returns (IncomeSummary memory income) {
        require(user != address(0), "OV2: user zero");
        bytes memory ret = _call1(
            bytes4(keccak256("buildIncomeSummary(address,address)")),
            abi.encode(address(cfg), user)
        );
        income = abi.decode(ret, (IncomeSummary));
    }

    function getWalletSnapshot(
        address user
    ) external view returns (WalletSummary memory wallet) {
        require(user != address(0), "OV2: user zero");
        bytes memory ret = _call1(
            bytes4(keccak256("buildWalletSummary(address,address)")),
            abi.encode(address(cfg), user)
        );
        wallet = abi.decode(ret, (WalletSummary));
    }

    function getIncomeRollup(
        address user
    ) external view returns (IncomeRollup memory r) {
        require(user != address(0), "OV2: user zero");
        bytes memory ret = _call1(
            bytes4(keccak256("getIncomeRollup(address,address)")),
            abi.encode(address(cfg), user)
        );
        r = abi.decode(ret, (IncomeRollup));
    }

    function getIncomeDashboardCompact(
        address user
    ) external view returns (IncomeDashboardCompact memory d) {
        require(user != address(0), "OV2: user zero");
        bytes memory ret = _call1(
            bytes4(keccak256("getIncomeDashboardCompact(address,address)")),
            abi.encode(address(cfg), user)
        );
        d = abi.decode(ret, (IncomeDashboardCompact));
    }

    // === Weekly / Team / Tx ===
    function getWeeklyEarnings(
        address user
    ) external view returns (WeeklyEarnings memory weekly) {
        require(user != address(0), "OV2: user zero");
        bytes memory ret = _call1(
            bytes4(keccak256("getWeeklyEarnings(address,address)")),
            abi.encode(address(cfg), user)
        );
        weekly = abi.decode(ret, (WeeklyEarnings));
    }

    function getTeamSummary(
        address user,
        uint8 depth
    ) external view returns (TeamSummary memory team) {
        require(user != address(0), "OV2: user zero");
        bytes memory ret = _call1(
            bytes4(keccak256("getTeamSummary(address,address,uint8)")),
            abi.encode(address(cfg), user, depth)
        );
        team = abi.decode(ret, (TeamSummary));
    }

    function getRecentTransactions(
        address user,
        uint256 limit
    ) external view returns (bytes[] memory entries) {
        require(user != address(0), "OV2: user zero");
        bytes memory ret = _call1(
            bytes4(keccak256("getRecentTransactions(address,address,uint256)")),
            abi.encode(address(cfg), user, limit)
        );
        entries = abi.decode(ret, (bytes[]));
    }

    // === Portfolios (cards/ROI/history) ===

    // Internal builder used by getDashboardData; still forwarded.
    function _buildPortfolioCards(
        address user
    ) internal view returns (PortfolioCard[] memory cards) {
        bytes memory ret = _call1(
            bytes4(keccak256("buildPortfolioCards(address,address)")),
            abi.encode(address(cfg), user)
        );
        cards = abi.decode(ret, (PortfolioCard[]));
    }

    function getPortfolioROISummary(
        uint256 _pid
    ) external view returns (PortfolioROISummary memory summary) {
        require(_pid > 0, "OV2: bad pid");
        bytes memory ret = _call1(
            bytes4(keccak256("getPortfolioROISummary(address,uint256)")),
            abi.encode(address(cfg), _pid)
        );
        summary = abi.decode(ret, (PortfolioROISummary));
    }

    function getPortfolioIncomeToDate(
        uint256 pid
    ) external view returns (PidIncomeToDate memory r) {
        require(pid > 0, "OV2: bad pid");
        bytes memory ret = _call1(
            bytes4(keccak256("getPortfolioIncomeToDate(address,uint256)")),
            abi.encode(address(cfg), pid)
        );
        r = abi.decode(ret, (PidIncomeToDate));
    }

    function getAllPortfolioClaimHistory(
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
        require(user != address(0), "OV2: user zero");
        bytes memory ret = _call1(
            bytes4(keccak256("getAllPortfolioClaimHistory(address,address)")),
            abi.encode(address(cfg), user)
        );
        (pids, epochs, pidClaims) = abi.decode(
            ret,
            (uint256[], ClaimEpochView[], PidClaimViewFlat[])
        );
    }

    function getAllPortfolioROISummaries(
        address user
    ) external view returns (PortfolioROISummary[] memory out) {
        require(user != address(0), "OV2: user zero");
        bytes memory ret = _call1(
            bytes4(keccak256("getAllPortfolioROISummaries(address,address)")),
            abi.encode(address(cfg), user)
        );
        out = abi.decode(ret, (PortfolioROISummary[]));
    }

    // === Main Dashboard (packs multiple worker results) ===
    function getDashboardData(
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
        require(user != address(0), "OV2: user zero");
        bytes memory ret = _call1(
            bytes4(keccak256("getDashboardData(address,address)")),
            abi.encode(address(cfg), user)
        );
        (summary, income, wallet, portfolios, weekly, lifetimeCapBps) = abi
            .decode(
                ret,
                (
                    DashboardSummary,
                    IncomeSummary,
                    WalletSummary,
                    PortfolioCard[],
                    WeeklyEarnings,
                    uint256
                )
            );
    }

    // === Light local view that’s cheap enough to keep ===
    function hasActivePortfolio(address user) external view returns (bool) {
        require(user != address(0), "OV2: user zero");
        return
            ICappingIncomeManagerView(cfg.cappingIncomeManager())
                .hasOpenPortfolio(user);
    }
}
