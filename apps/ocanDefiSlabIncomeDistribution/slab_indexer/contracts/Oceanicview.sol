// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title OceanViewCentralized (UUPS)
 * @notice Corrected façade wired to the **actual** function names in your project contracts.
 *         It aggregates: income totals (type-wise), ROI (total/today/booster), claim stats,
 *         SafeWallet balance + history, direct income, rewards + milestones, slab/team volumes
 *         with 40:30:30 check, portfolios overview, and a grand total.
 *
 *         Notes
 *         - Uses CoreConfig getters that really exist (priceOracle, userRegistry, portfolioManager,
 *           slabManager, incomeDistributor, rewardVault, royaltyManager, safeWallet). There is **no**
 *           roiDistributor address in CoreConfig, so this contract has an optional `setRoiDistributor`.
 *         - Where a downstream endpoint is absent, returns zero/empty (best-effort staticcall).
 *         - USD amounts = WAD (1e18); RAMA amounts = wei; day/period = uint32.
 */

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/* ─────────────────────────────── Interfaces ─────────────────────────────── */
interface ICoreConfig {
    function rama() external view returns (address);
    function priceOracle() external view returns (address);
    function userRegistry() external view returns (address);
    function portfolioManager() external view returns (address);
    function slabManager() external view returns (address);
    function incomeDistributor() external view returns (address);
    function rewardVault() external view returns (address);
    function royaltyManager() external view returns (address);
    function safeWallet() external view returns (address);
    function roiDistributor() external view returns (address);
    function roiDistributorView() external view returns (address);
}

// Extended PortfolioManager view for richer metadata decoding
interface IPMExt {
    struct Portfolio {
        uint128 principal;
        uint128 principalUsd;
        uint128 credited;
        uint64 createdAt;
        uint64 lastAccrual;
        uint64 frozenUntil;
        bool booster;
        uint8 tier;
        uint8 capPct;
        address owner;
        address activatedBy;
        uint64 boosterActivationDate;
        bool isCapped;
        bool isClosed;
        uint256 cappedAt;
        uint256 closedAt;
        uint256 totalReceivedBoosterROI;
        bool isActivatedFromSafeWallet;
    }
    function getPortfolio(uint256 pid) external view returns (Portfolio memory);
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
    function getDirects(address user) external view returns (address[] memory);
    function getLevelTeam(
        address user,
        uint8 level
    ) external view returns (address[] memory);
    function getLevelTeamCounts(
        address user,
        uint8 maxDepth
    ) external view returns (uint256[] memory);

    function getLegSubtreeFlat(
        address user,
        address leg,
        uint8 maxDepth
    ) external view returns (address[] memory);
}

interface IPriceOracleDaily {
    function todayId() external view returns (uint32);
}

interface IPortfolioManager {
    struct Portfolio {
        uint128 principal; // RAMA wei
        uint128 principalUsd; // USD WAD recorded at creation
        uint128 credited; // RAMA wei credited (legacy)
        uint64 createdAt;
        uint64 lastAccrual;
        uint64 frozenUntil;
        bool booster;
        uint8 tier; // 0 or 1
        uint8 capPct; // 200 or 250
        address owner;
    }
    function portfoliosOf(
        address user
    ) external view returns (uint256[] memory);
    function getPortfolio(uint256 pid) external view returns (Portfolio memory);
    function getUSDPrincipal(
        uint256 pid
    ) external view returns (uint256 usdWad);
    function getTotalPortfolioValue(
        address user
    ) external view returns (uint256 usdWad);
}

interface IROIDistributorView {
    struct ClaimRec {
        uint32 fromPeriod;
        uint32 toPeriod;
        uint256 usdTotal; // micro-USD (1e6)
        uint256 ramaTotal; // wei
        uint64 claimedAt;
        uint32 epoch;
    }
    struct PidClaim {
        uint256 pid;
        uint256 usdTotal; // micro-USD (1e6)
        uint256 ramaTotal; // wei
    }
    function getTotalsClaimed(
        address user
    ) external view returns (uint256 usdWad, uint256 ramaWei);
    function getUnclaimedROI(
        address user
    )
        external
        view
        returns (
            uint256 usdTotalMicro,
            uint256 ramaTotalWei,
            uint32 fromPeriod,
            uint32 lastPeriod,
            uint32 epochsCount
        );
    function getClaimHistoryCount(address user) external view returns (uint256);
    function getClaimHistorySlice(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (ClaimRec[] memory out);
    function getPidClaimsCount(
        address user,
        uint32 epoch
    ) external view returns (uint256);
    function getPidClaimsSlice(
        address user,
        uint32 epoch,
        uint256 offset,
        uint256 limit
    ) external view returns (PidClaim[] memory out);
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
    // Booster-only aggregation over a day/period range; the impl clamps `toDay` to finalized.
    function ROIForBoosterPortfolios(
        address user,
        uint32 fromDay,
        uint32 toDay
    ) external view returns (uint256 usdTotal, uint256 ramaTotal);
    function previewClaimPerPortfolio(
        address user
    )
        external
        view
        returns (
            uint256[] memory pids,
            uint256[] memory usdTotals,
            uint256[] memory ramaTotals,
            uint32[] memory epochCounts,
            uint32 fromPeriod,
            uint32 lastPeriod
        );
    function previewClaimPerPortfolioSlice(
        address user,
        uint256 offset,
        uint256 limit
    )
        external
        view
        returns (
            uint256[] memory pids,
            uint256[] memory usdTotals,
            uint256[] memory ramaTotals,
            uint32[] memory epochCounts,
            uint32 fromPeriod,
            uint32 lastPeriod,
            uint256 totalCount
        );
}

interface IIncomeDistributor {
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
    function getDirectIncomeCount(address user) external view returns (uint256);
    function getDirectIncomeSlice(
        address user,
        uint256 offset,
        uint256 limit
    )
        external
        view
        returns (
            uint32[] memory dayIds,
            uint256[] memory usdWad,
            uint256[] memory ramaWei,
            uint256[] memory pids
        );
}

interface ISlabManagerView {
    function getSlabIndex(address user) external view returns (uint8);
    function getQualifiedBusinessUSD(
        address user
    ) external view returns (uint256);
    function getLegsTop2AndRest(
        address user
    ) external view returns (uint256 L1, uint256 L2, uint256 Lrest);
}

interface IRewardVaultView {
    function getUserTotals(
        address user
    ) external view returns (uint256 usdTotalWad, uint256 ramaTotalWei);
    function getAllMilestones()
        external
        view
        returns (
            uint256[] memory thresholdsUsdWad,
            uint256[] memory rewardsUsdWad
        );
    function getUserMilestoneStatus(
        address user
    ) external view returns (bool[] memory achieved);
}

interface IRoyaltyManagerView {
    function thresholdUSD(uint8 tier) external view returns (uint256);
    function salaryUSD(uint8 tier) external view returns (uint256);
}

interface ISafeWallet {
    // balances & typed ledger
    function balanceOf(address user) external view returns (uint256);
    function getTotalsByKind(
        address user,
        uint8 kind,
        bool isCredit
    ) external view returns (uint256 usdSum, uint256 ramaSum, uint256 count);
    function getUserRoiForDay(
        address user,
        uint32 dayId
    ) external view returns (uint256 usdSum, uint256 ramaSum);
    function getLedgerCount(address user) external view returns (uint256);
    function getLedgerSlice(
        address user,
        uint256 offset,
        uint256 limit
    )
        external
        view
        returns (
            uint8[] memory kinds,
            bool[] memory isCredit,
            uint32[] memory dayIds,
            uint256[] memory usdWad,
            uint256[] memory ramaWei
        );
}

/* ─────────────────────────────── Contract ─────────────────────────────── */
contract Oceanicview is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    ICoreConfig public cfg;
    address public roiDistributorOpt; // optional wiring for ROIDistributor

    // SafeWallet TxKind numeric mapping (must match SafeWallet enum order)
    uint8 private constant KIND_ROI = 0;
    uint8 private constant KIND_GROWTH = 1;
    uint8 private constant KIND_ROYALTY = 2;
    uint8 private constant KIND_SLAB = 3;
    uint8 private constant KIND_REWARD = 4;
    uint8 private constant KIND_DIRECT = 5;

    function initialize(address _cfg) external initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        require(_cfg != address(0), "CFG");
        cfg = ICoreConfig(_cfg);
        roiDistributorOpt = cfg.roiDistributorView();
    }
    function _authorizeUpgrade(address) internal override onlyOwner {}

    function setRoiDistributor(address a) external onlyOwner {
        roiDistributorOpt = a;
    }

    /*────────────────────── Helpers ─────────────────────*/
    function _tryStatic(
        address target,
        bytes memory payload
    ) internal view returns (bool ok, bytes memory data) {
        if (target == address(0)) return (false, bytes(""));
        (ok, data) = target.staticcall(payload);
    }

    /*────────────────────── Data Shapes ─────────────────────*/
    struct IncomeTotals {
        uint256 totalROI_USD; // from SafeWallet credits (ROI)
        uint256 todayROI_USD; // SafeWallet ROI filtered by todayId
        uint256 boosterROI_USD; // from ROIDistributor (optional); 0 if not wired
        uint256 directIncome_USD; // IncomeDistributor summary
        uint256 slabIncome_USD; // SafeWallet credits (Slab)
        uint256 royalty_USD; // SafeWallet credits (Royalty)
        uint256 reward_USD; // RewardVault totals (USD component) or SafeWallet credits
        uint256 growth_USD; // SafeWallet credits (Growth)
        uint256 allIncomes_USD; // sum of all above
    }

    struct ClaimStats {
        uint256 roiClaimed_USD; // from ROIDistributor.getTotalsClaimed (optional)
        uint256 directClaimable_RAMA; // IncomeDistributor summary
        uint256 safeWalletBalance_RAMA; // SafeWallet.balanceOf
    }

    struct TeamStats {
        uint32 directTeam; // count of directs
        uint256 totalTeamVolume_USD; // from SlabManager.getQualifiedBusinessUSD
        uint256 leg1PctBps; // top leg % in bps (0..10000)
        uint256 leg2PctBps;
        uint256 restPctBps;
        bool matches403030;
        uint8 currentSlabIdx;
    }

    struct PortfolioCard {
        uint256 pid;
        uint256 principal_RAMA;
        uint256 principal_USD;
        uint64 createdAt;
        uint64 frozenUntil;
        bool booster;
        uint8 tier;
        uint8 capPct;
    }

    struct PortfolioOverview {
        uint256 totalValue_USD; // PM.getTotalPortfolioValue(user)
        uint256 boosterEligibleCount; // count of portfolios with booster==true
        PortfolioCard[] cards;
    }

    /* ROI Intense Views (paged, safe) */
    struct ROITotals {
        uint256 claimedUsdMicro;
        uint256 claimedRamaWei;
        uint256 unclaimedUsdMicro;
        uint256 unclaimedRamaWei;
        uint32 unclaimedFromPeriod;
        uint32 unclaimedLastPeriod;
        uint32 unclaimedEpochsCount;
    }

    struct PortfolioMeta {
        uint256 pid;
        uint128 principal_RAMA;
        uint128 principal_USD_WAD;
        uint64 createdAt;
        uint64 frozenUntil;
        bool booster;
        uint8 tier;
        uint8 capPct;
        bool isCapped;
        bool isClosed;
        uint256 cappedAt;
        uint256 closedAt;
        uint256 totalReceivedBoosterROI;
        address activatedBy;
        uint64 boosterActivationDate;
        bool isActivatedFromSafeWallet;
    }

    struct ROIDashboardPaged {
        ROITotals totals;
        uint32[] periodIds;
        uint256[] periodUsdMicro;
        uint256[] periodRamaWei;
        uint32 periodEpochsCount;
        uint32[] histFromPeriod;
        uint32[] histToPeriod;
        uint256[] histUsdMicro;
        uint256[] histRamaWei;
        uint64[] histClaimedAt;
        uint32[] histEpoch;
        uint256 histTotalCount;
        uint256[] pidClaimsPid;
        uint256[] pidClaimsUsdMicro;
        uint256[] pidClaimsRamaWei;
        uint256 pidClaimsTotalCount;
        uint256[] previewPids;
        uint256[] previewUsdMicro;
        uint256[] previewRamaWei;
        uint32[] previewEpochCounts;
        uint32 previewFromPeriod;
        uint32 previewLastPeriod;
        uint256 previewTotalCount;
        PortfolioMeta[] previewMeta;
    }

    /*────────────────────── Aggregates ─────────────────────*/
    function getIncomeTotals(
        address user
    ) external view returns (IncomeTotals memory t) {
        address sw = cfg.safeWallet();
        address inc = cfg.incomeDistributor();
        address rv = cfg.rewardVault();
        address po = cfg.priceOracle();

        // ROI total via SafeWallet credits
        if (sw != address(0)) {
            (bool ok, bytes memory d) = _tryStatic(
                sw,
                abi.encodeWithSelector(
                    ISafeWallet.getTotalsByKind.selector,
                    user,
                    KIND_ROI,
                    true
                )
            );
            if (ok && d.length > 0) {
                (t.totalROI_USD, , ) = abi.decode(
                    d,
                    (uint256, uint256, uint256)
                );
            }
        }
        // Today ROI
        if (sw != address(0) && po != address(0)) {
            (bool ok1, bytes memory d1) = _tryStatic(
                po,
                abi.encodeWithSelector(IPriceOracleDaily.todayId.selector)
            );
            if (ok1 && d1.length > 0) {
                uint32 today = abi.decode(d1, (uint32));
                (bool ok2, bytes memory d2) = _tryStatic(
                    sw,
                    abi.encodeWithSelector(
                        ISafeWallet.getUserRoiForDay.selector,
                        user,
                        today
                    )
                );
                if (ok2 && d2.length > 0) {
                    (t.todayROI_USD, ) = abi.decode(d2, (uint256, uint256));
                }
            }
        }
        // Booster ROI (optional via ROI distributor)
        if ( cfg.roiDistributorView() != address(0)) {
            (bool ok, bytes memory d) = _tryStatic(
                 cfg.roiDistributorView(),
                abi.encodeWithSelector(
                    IROIDistributorView.ROIForBoosterPortfolios.selector,
                    user,
                    uint32(0),
                    type(uint32).max
                )
            );
            if (ok && d.length > 0) {
                (t.boosterROI_USD, ) = abi.decode(d, (uint256, uint256));
            }
        }
        // Direct income lifetime USD
        if (inc != address(0)) {
            (bool ok, bytes memory d) = _tryStatic(
                inc,
                abi.encodeWithSelector(
                    IIncomeDistributor.getDirectIncomeSummary.selector,
                    user
                )
            );
            if (ok && d.length > 0) {
                (, t.directIncome_USD, , ) = abi.decode(
                    d,
                    (uint256, uint256, uint256, uint256)
                );
            }
        }
        // Slab / Royalty / Growth via SafeWallet credits
        if (sw != address(0)) {
            (bool okS, bytes memory dS) = _tryStatic(
                sw,
                abi.encodeWithSelector(
                    ISafeWallet.getTotalsByKind.selector,
                    user,
                    KIND_SLAB,
                    true
                )
            );
            if (okS && dS.length > 0) {
                (t.slabIncome_USD, , ) = abi.decode(
                    dS,
                    (uint256, uint256, uint256)
                );
            }
            (bool okR, bytes memory dR) = _tryStatic(
                sw,
                abi.encodeWithSelector(
                    ISafeWallet.getTotalsByKind.selector,
                    user,
                    KIND_ROYALTY,
                    true
                )
            );
            if (okR && dR.length > 0) {
                (t.royalty_USD, , ) = abi.decode(
                    dR,
                    (uint256, uint256, uint256)
                );
            }
            (bool okG, bytes memory dG) = _tryStatic(
                sw,
                abi.encodeWithSelector(
                    ISafeWallet.getTotalsByKind.selector,
                    user,
                    KIND_GROWTH,
                    true
                )
            );
            if (okG && dG.length > 0) {
                (t.growth_USD, , ) = abi.decode(
                    dG,
                    (uint256, uint256, uint256)
                );
            }
        }
        // Rewards lifetime via RewardVault (USD
        if (rv != address(0)) {
            (bool ok, bytes memory d) = _tryStatic(
                rv,
                abi.encodeWithSelector(
                    IRewardVaultView.getUserTotals.selector,
                    user
                )
            );
            if (ok && d.length > 0) {
                (t.reward_USD, ) = abi.decode(d, (uint256, uint256));
            }
        }
        t.allIncomes_USD =
            t.totalROI_USD +
            t.todayROI_USD +
            t.boosterROI_USD +
            t.directIncome_USD +
            t.slabIncome_USD +
            t.royalty_USD +
            t.reward_USD +
            t.growth_USD;
    }

    function getClaimStats(
        address user
    ) external view returns (ClaimStats memory c) {
        address sw = cfg.safeWallet();
        address inc = cfg.incomeDistributor();
        if (sw != address(0)) {
            (bool ok, bytes memory d) = _tryStatic(
                sw,
                abi.encodeWithSelector(ISafeWallet.balanceOf.selector, user)
            );
            if (ok && d.length > 0)
                c.safeWalletBalance_RAMA = abi.decode(d, (uint256));
        }
        if (inc != address(0)) {
            (bool ok, bytes memory d) = _tryStatic(
                inc,
                abi.encodeWithSelector(
                    IIncomeDistributor.getDirectIncomeSummary.selector,
                    user
                )
            );
            if (ok && d.length > 0) {
                (, , , c.directClaimable_RAMA) = abi.decode(
                    d,
                    (uint256, uint256, uint256, uint256)
                );
            }
        }
        if ( cfg.roiDistributorView() != address(0)) {
            (bool ok, bytes memory d) = _tryStatic(
                 cfg.roiDistributorView(),
                abi.encodeWithSelector(
                    IROIDistributorView.getTotalsClaimed.selector,
                    user
                )
            );
            if (ok && d.length > 0) {
                (c.roiClaimed_USD, ) = abi.decode(d, (uint256, uint256));
            }
        }
    }

    /* ROI claim history (paged, optional via ROIDistributor) */
    function getRoiClaimHistory(
        address user,
        uint256 offset,
        uint256 limit
    )
        external
        view
        returns (
            uint32[] memory dayIds,
            uint256[] memory usdWad,
            uint256[] memory ramaWei
        )
    {
        if ( cfg.roiDistributorView() == address(0)) {
            return (new uint32[](0), new uint256[](0), new uint256[](0));
        }
        (bool ok, bytes memory data) = _tryStatic(
             cfg.roiDistributorView(),
            abi.encodeWithSelector(
                IROIDistributorView.getClaimHistorySlice.selector,
                user,
                offset,
                limit
            )
        );
        if (!ok || data.length == 0) {
            return (new uint32[](0), new uint256[](0), new uint256[](0));
        }
        return abi.decode(data, (uint32[], uint256[], uint256[]));
    }

    /* SafeWallet history */
    function getSafeWalletHistory(
        address user,
        uint256 offset,
        uint256 limit
    )
        external
        view
        returns (
            uint8[] memory kinds,
            bool[] memory isCredit,
            uint32[] memory dayIds,
            uint256[] memory usdWad,
            uint256[] memory ramaWei
        )
    {
        address sw = cfg.safeWallet();
        if (sw == address(0))
            return (
                new uint8[](0),
                new bool[](0),
                new uint32[](0),
                new uint256[](0),
                new uint256[](0)
            );
        (bool ok, bytes memory data) = _tryStatic(
            sw,
            abi.encodeWithSelector(
                ISafeWallet.getLedgerSlice.selector,
                user,
                offset,
                limit
            )
        );
        if (!ok || data.length == 0) {
            return (
                new uint8[](0),
                new bool[](0),
                new uint32[](0),
                new uint256[](0),
                new uint256[](0)
            );
        }
        return
            abi.decode(data, (uint8[], bool[], uint32[], uint256[], uint256[]));
    }

    /* Direct income */
    function getDirectIncome(
        address user
    )
        external
        view
        returns (uint256 totalUsdWad, uint256 claimableRamaWei, uint256 entries)
    {
        address inc = cfg.incomeDistributor();
        if (inc == address(0)) return (0, 0, 0);
        (bool ok, bytes memory d) = _tryStatic(
            inc,
            abi.encodeWithSelector(
                IIncomeDistributor.getDirectIncomeSummary.selector,
                user
            )
        );
        if (ok && d.length > 0) {
            (entries, totalUsdWad, , claimableRamaWei) = abi.decode(
                d,
                (uint256, uint256, uint256, uint256)
            );
        }
    }

    /* Rewards & milestones */
    function getRewards(
        address user
    )
        external
        view
        returns (
            uint256 lifetimeUsdWad,
            uint256 ramaWei,
            uint256[] memory thresholdsUsdWad,
            uint256[] memory rewardsUsdWad,
            bool[] memory achieved
        )
    {
        address rv = cfg.rewardVault();
        if (rv == address(0))
            return (0, 0, new uint256[](0), new uint256[](0), new bool[](0));
        (bool ok1, bytes memory d1) = _tryStatic(
            rv,
            abi.encodeWithSelector(
                IRewardVaultView.getUserTotals.selector,
                user
            )
        );
        if (ok1 && d1.length > 0) {
            (lifetimeUsdWad, ramaWei) = abi.decode(d1, (uint256, uint256));
        }
        (bool ok2, bytes memory d2) = _tryStatic(
            rv,
            abi.encodeWithSelector(IRewardVaultView.getAllMilestones.selector)
        );
        if (ok2 && d2.length > 0) {
            (thresholdsUsdWad, rewardsUsdWad) = abi.decode(
                d2,
                (uint256[], uint256[])
            );
        }
        (bool ok3, bytes memory d3) = _tryStatic(
            rv,
            abi.encodeWithSelector(
                IRewardVaultView.getUserMilestoneStatus.selector,
                user
            )
        );
        if (ok3 && d3.length > 0) {
            achieved = abi.decode(d3, (bool[]));
        }
    }

    /* Slab + team */
    function getTeamStats(
        address user
    ) external view returns (TeamStats memory s) {
        address ur = cfg.userRegistry();
        address sm = cfg.slabManager();
        if (ur != address(0)) {
            (bool okD, bytes memory dD) = _tryStatic(
                ur,
                abi.encodeWithSelector(IUserRegistry.getDirects.selector, user)
            );
            if (okD && dD.length > 0)
                s.directTeam = uint32(abi.decode(dD, (address[])).length);
        }
        if (sm != address(0)) {
            (bool okT, bytes memory dT) = _tryStatic(
                sm,
                abi.encodeWithSelector(
                    ISlabManagerView.getQualifiedBusinessUSD.selector,
                    user
                )
            );
            if (okT && dT.length > 0)
                s.totalTeamVolume_USD = abi.decode(dT, (uint256));
            (bool okL, bytes memory dL) = _tryStatic(
                sm,
                abi.encodeWithSelector(
                    ISlabManagerView.getLegsTop2AndRest.selector,
                    user
                )
            );
            if (okL && dL.length > 0) {
                (uint256 L1, uint256 L2, uint256 Lrest) = abi.decode(
                    dL,
                    (uint256, uint256, uint256)
                );
                if (s.totalTeamVolume_USD == 0)
                    s.totalTeamVolume_USD = L1 + L2 + Lrest;
                if (s.totalTeamVolume_USD > 0) {
                    s.leg1PctBps = (L1 * 10000) / s.totalTeamVolume_USD;
                    s.leg2PctBps = (L2 * 10000) / s.totalTeamVolume_USD;
                    s.restPctBps = (Lrest * 10000) / s.totalTeamVolume_USD;
                    s.matches403030 = (s.leg1PctBps <= 4000 &&
                        s.leg2PctBps <= 3000 &&
                        s.restPctBps <= 3000);
                }
            }
            // current slab index
            (bool okS, bytes memory dS) = _tryStatic(
                sm,
                abi.encodeWithSelector(
                    ISlabManagerView.getSlabIndex.selector,
                    user
                )
            );
            if (okS && dS.length > 0)
                s.currentSlabIdx = abi.decode(dS, (uint8));
        }
    }

    /* Portfolios */
    function getPortfolios(
        address user
    ) external view returns (PortfolioOverview memory p) {
        address pm = cfg.portfolioManager();
        if (pm == address(0)) return p;
        (bool okIds, bytes memory dIds) = _tryStatic(
            pm,
            abi.encodeWithSelector(
                IPortfolioManager.portfoliosOf.selector,
                user
            )
        );
        if (!okIds || dIds.length == 0) return p;
        uint256[] memory ids = abi.decode(dIds, (uint256[]));
        p.cards = new PortfolioCard[](ids.length);
        // total value (USD) direct
        (bool okTV, bytes memory dTV) = _tryStatic(
            pm,
            abi.encodeWithSelector(
                IPortfolioManager.getTotalPortfolioValue.selector,
                user
            )
        );
        if (okTV && dTV.length > 0)
            p.totalValue_USD = abi.decode(dTV, (uint256));
        for (uint256 i; i < ids.length; i++) {
            (bool okP, bytes memory dP) = _tryStatic(
                pm,
                abi.encodeWithSelector(
                    IPortfolioManager.getPortfolio.selector,
                    ids[i]
                )
            );
            if (!okP || dP.length == 0) continue;
            IPortfolioManager.Portfolio memory base = abi.decode(
                dP,
                (IPortfolioManager.Portfolio)
            );
            PortfolioCard memory card;
            card.pid = ids[i];
            card.principal_RAMA = uint256(base.principal);
            card.principal_USD = uint256(base.principalUsd);
            card.createdAt = base.createdAt;
            card.frozenUntil = base.frozenUntil;
            card.booster = base.booster;
            card.tier = base.tier;
            card.capPct = base.capPct;
            if (card.booster) p.boosterEligibleCount++;
            p.cards[i] = card;
        }
    }

    /* Convenience grand total */
    function getGrandTotalEarned(
        address user
    ) external view returns (uint256 usdWad) {
        IncomeTotals memory t = this.getIncomeTotals(user);
        usdWad = t.allIncomes_USD;
    }

    /* Directs utility */
    function getDirectsList(
        address user
    ) external view returns (address[] memory directs) {
        address ur = cfg.userRegistry();
        if (ur == address(0)) return new address[](0);
        (bool ok, bytes memory d) = _tryStatic(
            ur,
            abi.encodeWithSelector(IUserRegistry.getDirects.selector, user)
        );
        if (!ok || d.length == 0) return new address[](0);
        return abi.decode(d, (address[]));
    }

    /**
     * @notice For each direct of `user`, returns their self portfolio USD value, their team volume USD
     *         (qualified business), and the sum (self + team). Also includes column totals.
     * @dev    Self USD via PortfolioManager.getTotalPortfolioValue(addr).
     *         Team USD via SlabManager.getQualifiedBusinessUSD(addr).
     */
    // function getDirectsPortfolioBreakdown(
    //     address user
    // )
    //     external
    //     view
    //     returns (
    //         address[] memory directs,
    //         uint256[] memory selfUsd,
    //         uint256[] memory teamUsd,
    //         uint256[] memory sumUsd,
    //         uint256 totalSelfUsd,
    //         uint256 totalTeamUsd,
    //         uint256 totalSumUsd
    //     )
    // {
    //     address ur = cfg.userRegistry();
    //     address pm = cfg.portfolioManager();
    //     address sm = cfg.slabManager();
    //     if (ur == address(0)) {
    //         directs = new address[](0);
    //         selfUsd = new uint256[](0);
    //         teamUsd = new uint256[](0);
    //         sumUsd = new uint256[](0);
    //         return (directs, selfUsd, teamUsd, sumUsd, 0, 0, 0);
    //     }
    //     (bool okD, bytes memory dD) = _tryStatic(
    //         ur,
    //         abi.encodeWithSelector(IUserRegistry.getDirects.selector, user)
    //     );
    //     if (!okD || dD.length == 0) {
    //         directs = new address[](0);
    //         selfUsd = new uint256[](0);
    //         teamUsd = new uint256[](0);
    //         sumUsd = new uint256[](0);
    //         return (directs, selfUsd, teamUsd, sumUsd, 0, 0, 0);
    //     }
    //     directs = abi.decode(dD, (address[]));
    //     uint256 n = directs.length;
    //     selfUsd = new uint256[](n);
    //     teamUsd = new uint256[](n);
    //     sumUsd = new uint256[](n);
    //     for (uint256 i; i < n; i++) {
    //         address d = directs[i];
    //         uint256 s = 0;
    //         uint256 t = 0;
    //         if (pm != address(0)) {
    //             (bool okS, bytes memory dS) = _tryStatic(
    //                 pm,
    //                 abi.encodeWithSelector(
    //                     IPortfolioManager.getTotalPortfolioValue.selector,
    //                     d
    //                 )
    //             );
    //             if (okS && dS.length > 0) s = abi.decode(dS, (uint256));
    //         }
    //         if (sm != address(0)) {
    //             (bool okT, bytes memory dT) = _tryStatic(
    //                 sm,
    //                 abi.encodeWithSelector(
    //                     ISlabManagerView.getQualifiedBusinessUSD.selector,
    //                     d
    //                 )
    //             );
    //             if (okT && dT.length > 0) t = abi.decode(dT, (uint256));
    //         }
    //         selfUsd[i] = s;
    //         teamUsd[i] = t;
    //         sumUsd[i] = s + t;
    //         totalSelfUsd += s;
    //         totalTeamUsd += t;
    //         totalSumUsd += (s + t);
    //     }
    // }

    function getDirectsPortfolioBreakdown(
        address user
    )
        external
        view
        returns (
            address[] memory directs,
            uint256[] memory selfUsd,
            uint256[] memory teamUsd,
            uint256[] memory sumUsd,
            uint256 totalSelfUsd,
            uint256 totalTeamUsd,
            uint256 totalSumUsd
        )
    {
        address urAddr = cfg.userRegistry();
        address pmAddr = cfg.portfolioManager();

        if (urAddr == address(0) || pmAddr == address(0)) {
            return (
                new address[](0),
                new uint256[](0),
                new uint256[](0),
                new uint256[](0),
                0,
                0,
                0
            );
        }

        // 1) Load directs
        (bool okD, bytes memory dD) = _tryStatic(
            urAddr,
            abi.encodeWithSelector(IUserRegistry.getDirects.selector, user)
        );
        if (!okD || dD.length == 0) {
            return (
                new address[](0),
                new uint256[](0),
                new uint256[](0),
                new uint256[](0),
                0,
                0,
                0
            );
        }

        directs = abi.decode(dD, (address[]));
        uint256 n = directs.length;
        selfUsd = new uint256[](n);
        teamUsd = new uint256[](n);
        sumUsd = new uint256[](n);

        // Choose a sane max depth for BFS flatten to avoid gas blowups on-chain.
        // Adjust if your trees are deeper.
        uint8 MAX_DEPTH = 50;

        for (uint256 i = 0; i < n; i++) {
            address d = directs[i];

            // 2) SELF USD of the direct (decode the SECOND value from (ramaWei, usdMicro))
            {
                (bool okS, bytes memory dS) = _tryStatic(
                    pmAddr,
                    abi.encodeWithSelector(
                        IPortfolioManager.getTotalPortfolioValue.selector,
                        d
                    )
                );
                if (okS && dS.length > 0) {
                    (, /*uint256 selfRamaWei*/ uint256 selfUsdMicro) = abi
                        .decode(dS, (uint256, uint256));
                    selfUsd[i] = selfUsdMicro;
                } else {
                    selfUsd[i] = 0;
                }
            }

            // 3) TEAM USD under this direct (exclude the direct; sum descendants’ portfolio USD)
            uint256 t = 0;
            {
                (bool okFlat, bytes memory flatData) = _tryStatic(
                    urAddr,
                    abi.encodeWithSelector(
                        IUserRegistry.getLegSubtreeFlat.selector,
                        user,
                        d,
                        MAX_DEPTH
                    )
                );
                if (okFlat && flatData.length > 0) {
                    address[] memory subtree = abi.decode(
                        flatData,
                        (address[])
                    );

                    // Sum USD for everyone in the subtree
                    for (uint256 j = 0; j < subtree.length; j++) {
                        address member = subtree[j];
                        (bool okM, bytes memory mData) = _tryStatic(
                            pmAddr,
                            abi.encodeWithSelector(
                                IPortfolioManager
                                    .getTotalPortfolioValue
                                    .selector,
                                member
                            )
                        );
                        if (okM && mData.length > 0) {
                            (, /*uint256 ramaWei*/ uint256 usdMicro) = abi
                                .decode(mData, (uint256, uint256));
                            t += usdMicro;
                        }
                    }
                }
            }

            teamUsd[i] = t;
            uint256 sPlusT = selfUsd[i] + t;
            sumUsd[i] = sPlusT;

            totalSelfUsd += selfUsd[i];
            totalTeamUsd += t;
            totalSumUsd += sPlusT;
        }
    }

    /// @notice Sum portfolio USD (micro) level-by-level in the user's tree (excludes the user).
    /// @dev Uses UserRegistry.getLevelTeam and PortfolioManager.getTotalPortfolioValue.
    ///      Returns arrays sized maxDepth: levelUsd[i] is total USD at level i+1.
    /// @param user The root user.
    /// @param maxDepth How many levels to aggregate (>=1).
    /// @return levelUsd  Total USD(1e6) per level (index 0 => level 1, etc.)
    /// @return levelCounts Number of members found at each level
    /// @return grandTotalUsd Sum of all levelUsd entries
    function getLevelWisePortfolioVolume(
        address user,
        uint8 maxDepth
    )
        external
        view
        returns (
            uint256[] memory levelUsd,
            uint256[] memory levelCounts,
            uint256 grandTotalUsd
        )
    {
        address urAddr = cfg.userRegistry();
        address pmAddr = cfg.portfolioManager();

        if (urAddr == address(0) || pmAddr == address(0) || maxDepth == 0) {
            return (new uint256[](0), new uint256[](0), 0);
        }

        levelUsd = new uint256[](maxDepth);
        levelCounts = new uint256[](maxDepth);

        for (uint8 lvl = 1; lvl <= maxDepth; lvl++) {
            // 1) Fetch addresses at this level
            (bool okL, bytes memory dataL) = _tryStatic(
                urAddr,
                abi.encodeWithSelector(
                    IUserRegistry.getLevelTeam.selector,
                    user,
                    lvl
                )
            );
            if (!okL || dataL.length == 0) {
                // no nodes at this level (or call failed) – keep zeros and continue
                continue;
            }

            address[] memory addrs = abi.decode(dataL, (address[]));
            levelCounts[lvl - 1] = addrs.length;

            // 2) Sum USD(1e6) of all members at this level
            uint256 sumUsdLevel = 0;
            for (uint256 i = 0; i < addrs.length; i++) {
                (bool okP, bytes memory dataP) = _tryStatic(
                    pmAddr,
                    abi.encodeWithSelector(
                        IPortfolioManager.getTotalPortfolioValue.selector,
                        addrs[i]
                    )
                );
                if (okP && dataP.length > 0) {
                    // getTotalPortfolioValue returns (totalRamaWei, totalUsdMicro)
                    (, uint256 usdMicro) = abi.decode(
                        dataP,
                        (uint256, uint256)
                    );
                    sumUsdLevel += usdMicro;
                }
            }

            levelUsd[lvl - 1] = sumUsdLevel;
            grandTotalUsd += sumUsdLevel;
        }
    }

    function _decodeClaimHistory(
        bytes memory data
    ) internal pure returns (IROIDistributorView.ClaimRec[] memory arr) {
        if (data.length == 0) return new IROIDistributorView.ClaimRec[](0);
        arr = abi.decode(data, (IROIDistributorView.ClaimRec[]));
    }

    function _decodePidClaims(
        bytes memory data
    ) internal pure returns (IROIDistributorView.PidClaim[] memory arr) {
        if (data.length == 0) return new IROIDistributorView.PidClaim[](0);
        arr = abi.decode(data, (IROIDistributorView.PidClaim[]));
    }

    function _getPM() internal view returns (address) {
        return cfg.portfolioManager();
    }

    function _getROI() internal view returns (address) {
        return  cfg.roiDistributorView();
    }

    function getROIDashboardPaged(
        address user,
        uint32 periodFrom,
        uint32 periodTo,
        uint256 historyOffset,
        uint256 historyLimit,
        uint32 pidClaimsEpoch,
        uint256 pidClaimsOffset,
        uint256 pidClaimsLimit,
        uint256 previewOffset,
        uint256 previewLimit
    ) external view returns (ROIDashboardPaged memory out) {
        address roi = _getROI();
        if (roi == address(0)) {
            return out;
        }
        {
            (bool okC, bytes memory dC) = _tryStatic(
                roi,
                abi.encodeWithSelector(
                    IROIDistributorView.getTotalsClaimed.selector,
                    user
                )
            );
            if (okC && dC.length > 0) {
                (out.totals.claimedUsdMicro, out.totals.claimedRamaWei) = abi
                    .decode(dC, (uint256, uint256));
            }
            (bool okU, bytes memory dU) = _tryStatic(
                roi,
                abi.encodeWithSelector(
                    IROIDistributorView.getUnclaimedROI.selector,
                    user
                )
            );
            if (okU && dU.length > 0) {
                (
                    out.totals.unclaimedUsdMicro,
                    out.totals.unclaimedRamaWei,
                    out.totals.unclaimedFromPeriod,
                    out.totals.unclaimedLastPeriod,
                    out.totals.unclaimedEpochsCount
                ) = abi.decode(dU, (uint256, uint256, uint32, uint32, uint32));
            }
        }
        if (periodTo >= periodFrom) {
            (bool okP, bytes memory dP) = _tryStatic(
                roi,
                abi.encodeWithSelector(
                    IROIDistributorView.perPeriodPreview.selector,
                    user,
                    periodFrom,
                    periodTo
                )
            );
            if (okP && dP.length > 0) {
                (
                    out.periodIds,
                    out.periodUsdMicro,
                    out.periodRamaWei,
                    out.periodEpochsCount
                ) = abi.decode(dP, (uint32[], uint256[], uint256[], uint32));
            }
        }
        {
            uint256 totalCount = 0;
            (bool okCnt, bytes memory dCnt) = _tryStatic(
                roi,
                abi.encodeWithSelector(
                    IROIDistributorView.getClaimHistoryCount.selector,
                    user
                )
            );
            if (okCnt && dCnt.length > 0)
                totalCount = abi.decode(dCnt, (uint256));
            out.histTotalCount = totalCount;
            if (historyLimit > 0 && historyOffset < totalCount) {
                (bool okH, bytes memory dH) = _tryStatic(
                    roi,
                    abi.encodeWithSelector(
                        IROIDistributorView.getClaimHistorySlice.selector,
                        user,
                        historyOffset,
                        historyLimit
                    )
                );
                if (okH && dH.length > 0) {
                    IROIDistributorView.ClaimRec[]
                        memory recs = _decodeClaimHistory(dH);
                    uint256 n = recs.length;
                    out.histFromPeriod = new uint32[](n);
                    out.histToPeriod = new uint32[](n);
                    out.histUsdMicro = new uint256[](n);
                    out.histRamaWei = new uint256[](n);
                    out.histClaimedAt = new uint64[](n);
                    out.histEpoch = new uint32[](n);
                    for (uint256 i = 0; i < n; i++) {
                        IROIDistributorView.ClaimRec memory r = recs[i];
                        out.histFromPeriod[i] = r.fromPeriod;
                        out.histToPeriod[i] = r.toPeriod;
                        out.histUsdMicro[i] = r.usdTotal;
                        out.histRamaWei[i] = r.ramaTotal;
                        out.histClaimedAt[i] = r.claimedAt;
                        out.histEpoch[i] = r.epoch;
                    }
                }
            }
        }
        {
            uint256 totalCount = 0;
            (bool okCnt, bytes memory dCnt) = _tryStatic(
                roi,
                abi.encodeWithSelector(
                    IROIDistributorView.getPidClaimsCount.selector,
                    user,
                    pidClaimsEpoch
                )
            );
            if (okCnt && dCnt.length > 0)
                totalCount = abi.decode(dCnt, (uint256));
            out.pidClaimsTotalCount = totalCount;
            if (pidClaimsLimit > 0 && pidClaimsOffset < totalCount) {
                (bool okS, bytes memory dS) = _tryStatic(
                    roi,
                    abi.encodeWithSelector(
                        IROIDistributorView.getPidClaimsSlice.selector,
                        user,
                        pidClaimsEpoch,
                        pidClaimsOffset,
                        pidClaimsLimit
                    )
                );
                if (okS && dS.length > 0) {
                    IROIDistributorView.PidClaim[]
                        memory arr = _decodePidClaims(dS);
                    uint256 n = arr.length;
                    out.pidClaimsPid = new uint256[](n);
                    out.pidClaimsUsdMicro = new uint256[](n);
                    out.pidClaimsRamaWei = new uint256[](n);
                    for (uint256 i = 0; i < n; i++) {
                        out.pidClaimsPid[i] = arr[i].pid;
                        out.pidClaimsUsdMicro[i] = arr[i].usdTotal;
                        out.pidClaimsRamaWei[i] = arr[i].ramaTotal;
                    }
                }
            }
        }
        {
            (bool okPrev, bytes memory dPrev) = _tryStatic(
                roi,
                abi.encodeWithSelector(
                    IROIDistributorView.previewClaimPerPortfolioSlice.selector,
                    user,
                    previewOffset,
                    previewLimit
                )
            );
            if (okPrev && dPrev.length > 0) {
                (
                    out.previewPids,
                    out.previewUsdMicro,
                    out.previewRamaWei,
                    out.previewEpochCounts,
                    out.previewFromPeriod,
                    out.previewLastPeriod,
                    out.previewTotalCount
                ) = abi.decode(
                    dPrev,
                    (
                        uint256[],
                        uint256[],
                        uint256[],
                        uint32[],
                        uint32,
                        uint32,
                        uint256
                    )
                );
                address pm = _getPM();
                uint256 m = out.previewPids.length;
                out.previewMeta = new PortfolioMeta[](m);
                if (pm != address(0)) {
                    for (uint256 i = 0; i < m; i++) {
                        uint256 pid = out.previewPids[i];
                        (bool okP, bytes memory dP) = _tryStatic(
                            pm,
                            abi.encodeWithSelector(
                                IPMExt.getPortfolio.selector,
                                pid
                            )
                        );
                        if (okP && dP.length > 0) {
                            IPMExt.Portfolio memory p = abi.decode(
                                dP,
                                (IPMExt.Portfolio)
                            );
                            PortfolioMeta memory meta;
                            meta.pid = pid;
                            meta.principal_RAMA = p.principal;
                            meta.principal_USD_WAD = p.principalUsd;
                            meta.createdAt = p.createdAt;
                            meta.frozenUntil = p.frozenUntil;
                            meta.booster = p.booster;
                            meta.tier = p.tier;
                            meta.capPct = p.capPct;
                            meta.isCapped = p.isCapped;
                            meta.isClosed = p.isClosed;
                            meta.cappedAt = p.cappedAt;
                            meta.closedAt = p.closedAt;
                            meta.totalReceivedBoosterROI = p
                                .totalReceivedBoosterROI;
                            meta.activatedBy = p.activatedBy;
                            meta.boosterActivationDate = p
                                .boosterActivationDate;
                            meta.isActivatedFromSafeWallet = p
                                .isActivatedFromSafeWallet;
                            out.previewMeta[i] = meta;
                        }
                    }
                }
            }
        }
    }

    function getROITotals(
        address user
    ) external view returns (ROITotals memory t) {
        address roi = _getROI();
        if (roi == address(0)) return t;
        (bool okC, bytes memory dC) = _tryStatic(
            roi,
            abi.encodeWithSelector(
                IROIDistributorView.getTotalsClaimed.selector,
                user
            )
        );
        if (okC && dC.length > 0) {
            (t.claimedUsdMicro, t.claimedRamaWei) = abi.decode(
                dC,
                (uint256, uint256)
            );
        }
        (bool okU, bytes memory dU) = _tryStatic(
            roi,
            abi.encodeWithSelector(
                IROIDistributorView.getUnclaimedROI.selector,
                user
            )
        );
        if (okU && dU.length > 0) {
            (
                t.unclaimedUsdMicro,
                t.unclaimedRamaWei,
                t.unclaimedFromPeriod,
                t.unclaimedLastPeriod,
                t.unclaimedEpochsCount
            ) = abi.decode(dU, (uint256, uint256, uint32, uint32, uint32));
        }
    }

    function getROIUnclaimedPerPeriod(
        address user,
        uint32 periodFrom,
        uint32 periodTo
    )
        external
        view
        returns (
            uint32[] memory periodIds,
            uint256[] memory usdPerPeriod,
            uint256[] memory ramaPerPeriod,
            uint32 epochsCount
        )
    {
        address roi = _getROI();
        if (roi == address(0) || periodTo < periodFrom) {
            return (new uint32[](0), new uint256[](0), new uint256[](0), 0);
        }
        (bool ok, bytes memory d) = _tryStatic(
            roi,
            abi.encodeWithSelector(
                IROIDistributorView.perPeriodPreview.selector,
                user,
                periodFrom,
                periodTo
            )
        );
        if (!ok || d.length == 0)
            return (new uint32[](0), new uint256[](0), new uint256[](0), 0);
        return abi.decode(d, (uint32[], uint256[], uint256[], uint32));
    }

    function getROIClaimHistoryPaged(
        address user,
        uint256 offset,
        uint256 limit
    )
        external
        view
        returns (
            uint32[] memory fromPeriod,
            uint32[] memory toPeriod,
            uint256[] memory usdMicro,
            uint256[] memory ramaWei,
            uint64[] memory claimedAt,
            uint32[] memory epoch,
            uint256 totalCount
        )
    {
        address roi = _getROI();
        if (roi == address(0)) {
            return (
                new uint32[](0),
                new uint32[](0),
                new uint256[](0),
                new uint256[](0),
                new uint64[](0),
                new uint32[](0),
                0
            );
        }
        (bool okCnt, bytes memory dCnt) = _tryStatic(
            roi,
            abi.encodeWithSelector(
                IROIDistributorView.getClaimHistoryCount.selector,
                user
            )
        );
        if (okCnt && dCnt.length > 0) totalCount = abi.decode(dCnt, (uint256));
        if (limit == 0 || offset >= totalCount) {
            return (
                new uint32[](0),
                new uint32[](0),
                new uint256[](0),
                new uint256[](0),
                new uint64[](0),
                new uint32[](0),
                totalCount
            );
        }
        (bool ok, bytes memory d) = _tryStatic(
            roi,
            abi.encodeWithSelector(
                IROIDistributorView.getClaimHistorySlice.selector,
                user,
                offset,
                limit
            )
        );
        if (!ok || d.length == 0)
            return (
                new uint32[](0),
                new uint32[](0),
                new uint256[](0),
                new uint256[](0),
                new uint64[](0),
                new uint32[](0),
                totalCount
            );
        IROIDistributorView.ClaimRec[] memory recs = _decodeClaimHistory(d);
        uint256 n = recs.length;
        fromPeriod = new uint32[](n);
        toPeriod = new uint32[](n);
        usdMicro = new uint256[](n);
        ramaWei = new uint256[](n);
        claimedAt = new uint64[](n);
        epoch = new uint32[](n);
        for (uint256 i = 0; i < n; i++) {
            IROIDistributorView.ClaimRec memory r = recs[i];
            fromPeriod[i] = r.fromPeriod;
            toPeriod[i] = r.toPeriod;
            usdMicro[i] = r.usdTotal;
            ramaWei[i] = r.ramaTotal;
            claimedAt[i] = r.claimedAt;
            epoch[i] = r.epoch;
        }
    }

    function getROIPreviewPerPortfolioPaged(
        address user,
        uint256 offset,
        uint256 limit
    )
        external
        view
        returns (
            uint256[] memory pids,
            uint256[] memory usdMicro,
            uint256[] memory ramaWei,
            uint32[] memory epochCounts,
            uint32 fromPeriod,
            uint32 lastPeriod,
            uint256 totalCount,
            PortfolioMeta[] memory meta
        )
    {
        address roi = _getROI();
        if (roi == address(0)) {
            return (
                new uint256[](0),
                new uint256[](0),
                new uint256[](0),
                new uint32[](0),
                0,
                0,
                0,
                new PortfolioMeta[](0)
            );
        }
        (bool ok, bytes memory d) = _tryStatic(
            roi,
            abi.encodeWithSelector(
                IROIDistributorView.previewClaimPerPortfolioSlice.selector,
                user,
                offset,
                limit
            )
        );
        if (!ok || d.length == 0) {
            return (
                new uint256[](0),
                new uint256[](0),
                new uint256[](0),
                new uint32[](0),
                0,
                0,
                0,
                new PortfolioMeta[](0)
            );
        }
        (
            pids,
            usdMicro,
            ramaWei,
            epochCounts,
            fromPeriod,
            lastPeriod,
            totalCount
        ) = abi.decode(
            d,
            (uint256[], uint256[], uint256[], uint32[], uint32, uint32, uint256)
        );
        address pm = _getPM();
        meta = new PortfolioMeta[](pids.length);
        if (pm != address(0)) {
            for (uint256 i = 0; i < pids.length; i++) {
                (bool okP, bytes memory dP) = _tryStatic(
                    pm,
                    abi.encodeWithSelector(
                        IPMExt.getPortfolio.selector,
                        pids[i]
                    )
                );
                if (okP && dP.length > 0) {
                    IPMExt.Portfolio memory p = abi.decode(
                        dP,
                        (IPMExt.Portfolio)
                    );
                    PortfolioMeta memory m;
                    m.pid = pids[i];
                    m.principal_RAMA = p.principal;
                    m.principal_USD_WAD = p.principalUsd;
                    m.createdAt = p.createdAt;
                    m.frozenUntil = p.frozenUntil;
                    m.booster = p.booster;
                    m.tier = p.tier;
                    m.capPct = p.capPct;
                    m.isCapped = p.isCapped;
                    m.isClosed = p.isClosed;
                    m.cappedAt = p.cappedAt;
                    m.closedAt = p.closedAt;
                    m.totalReceivedBoosterROI = p.totalReceivedBoosterROI;
                    m.activatedBy = p.activatedBy;
                    m.boosterActivationDate = p.boosterActivationDate;
                    m.isActivatedFromSafeWallet = p.isActivatedFromSafeWallet;
                    meta[i] = m;
                }
            }
        }
    }
}
