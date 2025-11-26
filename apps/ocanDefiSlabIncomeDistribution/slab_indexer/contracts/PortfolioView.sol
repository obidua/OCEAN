// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "./interfaces/ICoreConfig.sol";
import "./interfaces/IPortfolioManager.sol";
import "./interfaces/IRamaOracle.sol";

// Interfaces moved from OceanViewV2
interface IOceanQueryUpgradeable {
    function getLifetimeCapProgress(
        address user
    ) external view returns (uint256 bps);
    function getDailyGrowthRate(
        uint256 pid
    ) external view returns (uint256 dailyRateWad);
    function getPortfolioCapProgress(
        uint256 pid
    ) external view returns (uint256 bps);
}

interface IOceanViewLegacy {
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
    function getPortfolioSummaries(
        address user
    ) external view returns (PortfolioSummary[] memory);
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
        uint8 capPct; // e.g. 200 for 200%
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

interface IROIDistributorView {
    function paidUsdByPid(uint256 pid) external view returns (uint256);
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
}

contract PortfolioView is Initializable, OwnableUpgradeable {
    ICoreConfig public cfg;
    IOceanQueryUpgradeable public query;
    IOceanViewLegacy public legacy;

    // Structs moved from OceanViewV2
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

    struct PortfolioROISummary {
        uint256 portfolioId;
        uint256 claimedROI;
        uint256 unclaimedROI;
        uint256 totalROI;
    }

    function initialize(address _cfg) external initializer {
        __Ownable_init();
        cfg = ICoreConfig(_cfg);
        query = IOceanQueryUpgradeable(cfg.oceanQueryUpgradeable());
        legacy = IOceanViewLegacy(cfg.oceanViewUpgradeable());
    }

    // Functions moved from OceanViewV2
    function getPortfolioCards(
        address user
    )
        external
        view
        returns (PortfolioCard[] memory cards, uint256 lifetimeCapBps)
    {
        require(user != address(0), "PV: user zero");
        cards = _buildPortfolioCards(user);
        lifetimeCapBps = query.getLifetimeCapProgress(user);
    }

    function _buildPortfolioCards(
        address user
    ) internal view returns (PortfolioCard[] memory cards) {
        IOceanViewLegacy.PortfolioSummary[] memory base = legacy
            .getPortfolioSummaries(user);
        cards = new PortfolioCard[](base.length);
        for (uint256 i = 0; i < base.length; i++) {
            uint256 pid = base[i].pid;
            cards[i] = PortfolioCard({
                pid: pid,
                principalRamaWei: base[i].principalRama,
                principalUsdMicro: base[i].principalUSD,
                capRamaWei: base[i].capRama,
                capUsdMicro: _ramaToUsd(base[i].capRama),
                creditedRamaWei: base[i].creditedRama,
                creditedUsdMicro: _ramaToUsd(base[i].creditedRama),
                capPct: base[i].capPct,
                booster: base[i].booster,
                tier: base[i].tier,
                dailyRateWad: query.getDailyGrowthRate(pid),
                active: base[i].active,
                createdAt: base[i].createdAt,
                frozenUntil: base[i].frozenUntil,
                capProgressBps: query.getPortfolioCapProgress(pid)
            });
        }
    }

    function getAllPortfolioROISummaries(
        address user
    ) external view returns (PortfolioROISummary[] memory out) {
        require(user != address(0), "PV: user zero");

        uint256[] memory pids = IPortfolioManagerForROI(cfg.portfolioManager())
            .portfoliosOf(user);
        out = new PortfolioROISummary[](pids.length);

        uint256[] memory previewPids;
        uint256[] memory previewUsd;
        address roiDist = cfg.roiDistributorView();
        if (roiDist != address(0)) {
            (previewPids, previewUsd, , , ) = IROIDistributorView(roiDist)
                .previewClaimPerPortfolio(user);
        }

        for (uint256 i = 0; i < pids.length; i++) {
            uint256 pid = pids[i];
            IPortfolioManagerForROI.Portfolio
                memory p = IPortfolioManagerForROI(cfg.portfolioManager())
                    .getPortfolio(pid);

            uint256 claimed = 0;
            uint256 unclaimed = 0;

            if (roiDist != address(0)) {
                claimed = IROIDistributorView(roiDist).paidUsdByPid(pid);
                for (uint256 j = 0; j < previewPids.length; j++) {
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

    function _ramaToUsd(uint256 ramaWei) internal view returns (uint256) {
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
