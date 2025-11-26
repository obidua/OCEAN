// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "./interfaces/ICoreConfig.sol";
import "./interfaces/IUserRegistry.sol";
import "./interfaces/IPortfolioManager.sol";
import "./interfaces/IPriceOracleDaily.sol";

interface IROIDistributorLike {
    // Core pointers and config
    function cfg() external view returns (address);
    function users() external view returns (address);
    function pm() external view returns (address);
    function oracle() external view returns (address);
    function epochSeconds() external view returns (uint32);

    // Rates
    function dailyRateTier0() external view returns (uint256);
    function dailyRateTier1() external view returns (uint256);
    function dailyRateBoosterTier0() external view returns (uint256);
    function dailyRateBoosterTier1() external view returns (uint256);

    // Per-user/public state
    function lastClaimPeriod(address user) external view returns (uint32);
    function totalClaimedUsd(address user) external view returns (uint256);
    function totalClaimedRama(address user) external view returns (uint256);
    function lastDistributionTs() external view returns (uint64);

    // Per-pid ledgers
    function paidUsdByPid(uint256 pid) external view returns (uint256);

    // History interfaces
    struct ClaimRec {
        uint32 fromPeriod;
        uint32 toPeriod;
        uint256 usdTotal;
        uint256 ramaTotal;
        uint64 claimedAt;
        uint32 epoch;
    }
    function getClaimHistoryCount(address user) external view returns (uint256);
    function getClaimHistorySlice(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (ClaimRec[] memory out);
    function getPidClaimsCount(address user, uint32 epoch) external view returns (uint256);
}

interface ICappingIncomeManagerViewOnly {
    function next4xThresholdUSD6(address user)
        external
        view
        returns (uint256 nextThresholdUSD6, uint256 cumPrincipalUSD6, uint256 earnedUSD6);

    function remainingToCapUSD(uint256 pid) external view returns (uint256);
}

contract ROIDistributorView is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    IROIDistributorLike public dist;

    function initialize(address _dist) external initializer {
        require(_dist != address(0), "ZERO_DIST");
        __Ownable_init();
        __UUPSUpgradeable_init();
        dist = IROIDistributorLike(_dist);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function setDistributor(address _dist) external onlyOwner {
        require(_dist != address(0), "ZERO_DIST");
        dist = IROIDistributorLike(_dist);
    }

    uint256[50] private __gap;

    // ---------------- Convenience getters ----------------
    function getTotalsClaimed(address user) external view returns (uint256, uint256) {
        return (dist.totalClaimedUsd(user), dist.totalClaimedRama(user));
    }

    function nextDistributionTs() external view returns (uint64) {
        uint64 lastTs = dist.lastDistributionTs();
        if (lastTs == 0) return 0;
        return uint64(uint256(lastTs) + uint256(dist.epochSeconds()));
    }

    function getClaimHistoryCount(address user) external view returns (uint256) {
        return dist.getClaimHistoryCount(user);
    }

    function getClaimHistorySlice(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (IROIDistributorLike.ClaimRec[] memory out) {
        return dist.getClaimHistorySlice(user, offset, limit);
    }

    function getPidClaimsCount(address user, uint32 epoch) external view returns (uint256) {
        return dist.getPidClaimsCount(user, epoch);
    }

    // ---------------- Unclaimed ROI (freeze + cap aware) ----------------
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
        )
    {
        (fromPeriod, lastPeriod) = _autoWindow(user);
        if (lastPeriod < fromPeriod) {
            return (0, 0, fromPeriod, lastPeriod, 0);
        }

        IPortfolioManager pm_ = _pm();
        uint256[] memory userPids = pm_.portfoliosOf(user);
        // Simulate per-pid remaining cap in USD6 across the loop
        uint256[] memory remByPid = new uint256[](userPids.length);
        for (uint256 i = 0; i < userPids.length; i++) {
            uint256 pid = userPids[i];
            IPortfolioManager.Portfolio memory p0 = pm_.getPortfolio(pid);
            if (p0.owner != user) continue;
            uint256 capUsdMicro = (pm_.getUSDPrincipal(pid) * p0.capPct) / 100;
            uint256 paid = dist.paidUsdByPid(pid);
            remByPid[i] = paid >= capUsdMicro ? 0 : (capUsdMicro - paid);
        }

        for (uint32 pr = fromPeriod; pr <= lastPeriod; pr++) {
            uint256 usdPrMicro;
            for (uint256 i = 0; i < userPids.length; i++) {
                uint256 pid = userPids[i];
                IPortfolioManager.Portfolio memory p = pm_.getPortfolio(pid);
                if (p.owner != user) continue;
                uint256 rawUsd = _portfolioUsdForPeriodRaw(p, pid, pr);
                if (rawUsd == 0) continue;
                uint256 take = rawUsd > remByPid[i] ? remByPid[i] : rawUsd;
                if (take == 0) continue;
                usdPrMicro += take;
                remByPid[i] -= take;
            }
            if (usdPrMicro == 0) continue;

            uint256 price6 = _price6Latest();
            usdTotalMicro += usdPrMicro;
            ramaTotalWei += (usdPrMicro * 1e18) / price6;
            epochsCount += 1;
        }
    }

    // ---------------- Per-portfolio preview (freeze + cap aware) ----------------
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
        )
    {
        require(IUserRegistry(_users()).isRegistered(user), "NOT_REGISTERED");
        require(!IUserRegistry(_users()).isTempDeactive(user), "DEACTIVE");

        (fromPeriod, lastPeriod) = _autoWindow(user);
        if (lastPeriod < fromPeriod) {
            return (
                new uint256[](0),
                new uint256[](0),
                new uint256[](0),
                new uint32[](0),
                fromPeriod,
                lastPeriod
            );
        }

        IPortfolioManager pm_ = _pm();
        uint256[] memory userPids = pm_.portfoliosOf(user);
        pids = new uint256[](userPids.length);
        usdTotals = new uint256[](userPids.length);
        ramaTotals = new uint256[](userPids.length);
        epochCounts = new uint32[](userPids.length);

        for (uint256 i = 0; i < userPids.length; i++) {
            uint256 pid = userPids[i];
            IPortfolioManager.Portfolio memory p = pm_.getPortfolio(pid);
            if (p.owner != user) continue;

            uint256 usdSum;
            uint256 ramaSum;
            uint32 epochs;
            // Compute per-pid remaining cap for this view pass
            uint256 capUsdMicro = (pm_.getUSDPrincipal(pid) * p.capPct) / 100;
            uint256 paid = dist.paidUsdByPid(pid);
            uint256 remPid = paid >= capUsdMicro ? 0 : (capUsdMicro - paid);
            for (uint32 pr = fromPeriod; pr <= lastPeriod; pr++) {
                if (remPid == 0) break;
                uint256 usdRaw = _portfolioUsdForPeriodRaw(p, pid, pr);
                if (usdRaw == 0) continue;
                uint256 usdMicro = usdRaw > remPid ? remPid : usdRaw;
                uint256 price6 = _price6Latest();
                if (price6 == 0) continue;
                usdSum += usdMicro;
                ramaSum += (usdMicro * 1e18) / price6;
                epochs += 1;
                remPid -= usdMicro;
            }
            pids[i] = pid;
            usdTotals[i] = usdSum;
            ramaTotals[i] = ramaSum;
            epochCounts[i] = epochs;
        }
    }

    // ---------------- Extra Views ----------------
    function ROIForAPortfolio(
        uint256 pid,
        uint32 fromPeriod,
        uint32 toPeriod
    ) external view returns (uint256 usdTotal, uint256 ramaTotal, uint32 epochsCount) {
        IPortfolioManager pm_ = _pm();
        IPortfolioManager.Portfolio memory p = pm_.getPortfolio(pid);
        address user = p.owner;
        require(user != address(0), "INVALID_PID");

        uint32 latestFin = _latestFinalizedPeriodId();
        if (toPeriod > latestFin) toPeriod = latestFin;
        require(toPeriod >= fromPeriod, "RANGE");

        uint256 capUsdMicro_ = (pm_.getUSDPrincipal(pid) * p.capPct) / 100;
        uint256 paid_ = dist.paidUsdByPid(pid);
        uint256 remPid_ = paid_ >= capUsdMicro_ ? 0 : (capUsdMicro_ - paid_);
        for (uint32 pr = fromPeriod; pr <= toPeriod; pr++) {
            if (remPid_ == 0) break;
            uint256 usdRaw = _portfolioUsdForPeriodRaw(p, pid, pr);
            if (usdRaw == 0) continue;
            uint256 usdMicro = usdRaw > remPid_ ? remPid_ : usdRaw;
            uint256 price6 = _price6ForDayRelaxed(_dayIdFromPeriod(pr));
            usdTotal += usdMicro;
            ramaTotal += (usdMicro * 1e18) / price6;
            epochsCount += 1;
            remPid_ -= usdMicro;
        }
    }

    function ROIForBoosterPortfolios(
        address user,
        uint32 fromPeriod,
        uint32 toPeriod
    ) external view returns (uint256 usdTotal, uint256 ramaTotal, uint32 epochsCount) {
        IPortfolioManager pm_ = _pm();
        uint256[] memory pids = pm_.portfoliosOf(user);
        uint32 latestFin = _latestFinalizedPeriodId();
        if (toPeriod > latestFin) toPeriod = latestFin;
        require(toPeriod >= fromPeriod, "RANGE");

        for (uint256 i = 0; i < pids.length; i++) {
            IPortfolioManager.Portfolio memory p = pm_.getPortfolio(pids[i]);
            if (p.owner != user) continue;
            if (!p.booster) continue;
            uint256 capUsdMicro2 = (pm_.getUSDPrincipal(pids[i]) * p.capPct) / 100;
            uint256 paid2 = dist.paidUsdByPid(pids[i]);
            uint256 remPid2 = paid2 >= capUsdMicro2 ? 0 : (capUsdMicro2 - paid2);
            for (uint32 pr = fromPeriod; pr <= toPeriod; pr++) {
                if (remPid2 == 0) break;
                uint256 usdRaw = _portfolioUsdForPeriodRaw(p, pids[i], pr);
                if (usdRaw == 0) continue;
                uint256 usdMicro = usdRaw > remPid2 ? remPid2 : usdRaw;
                uint256 price6 = _price6ForDayRelaxed(_dayIdFromPeriod(pr));
                usdTotal += usdMicro;
                ramaTotal += (usdMicro * 1e18) / price6;
                epochsCount += 1;
                remPid2 -= usdMicro;
            }
        }
    }

    function previewUnclaimedForPortfolio_UsingCapMgr(
        uint256 pid,
        uint256 offset,
        uint256 value
    )
        external
        view
        returns (
            uint32 fromPeriod,
            uint32 toPeriod,
            uint32 pageStartPeriod,
            uint32 pageEndPeriod,
            uint256 totalEpochs,
            uint32[] memory periodIds,
            uint256[] memory usdPerPeriod,
            uint256[] memory ramaPerPeriod,
            uint32 epochsCount,
            uint256 usdTotal,
            uint256 ramaTotal,
            uint256 principalUsd6,
            uint256 capPct,
            uint256 remPidCapBeforeUSD6,
            uint256 remPidCapAfterUSD6,
            uint256 remUser4xBeforeUSD6,
            uint256 remUser4xAfterUSD6
        )
    {
        IPortfolioManager pm_ = _pm();
        IPortfolioManager.Portfolio memory p = pm_.getPortfolio(pid);
        address user = p.owner;
        require(user != address(0), "INVALID_PID");

        uint32 latestClaimable = _latestClaimablePeriodId();
        if (latestClaimable == 0) {
            return (
                1,
                0,
                0,
                0,
                0,
                new uint32[](0),
                new uint256[](0),
                new uint256[](0),
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0
            );
        }

        uint32 prev = dist.lastClaimPeriod(user);
        fromPeriod = prev == 0 ? (uint32(p.createdAt / dist.epochSeconds()) + 1) : (prev + 1);
        if (fromPeriod == 0) fromPeriod = 1;
        toPeriod = latestClaimable;

        if (toPeriod < fromPeriod) {
            principalUsd6 = pm_.getUSDPrincipal(pid);
            capPct = p.capPct;
            uint256 remUSD6 = ICappingIncomeManagerViewOnly(_cfg().cappingIncomeManager()).remainingToCapUSD(pid);
            remPidCapBeforeUSD6 = remUSD6;

            (uint256 th, , uint256 earned) = ICappingIncomeManagerViewOnly(_cfg().cappingIncomeManager()).next4xThresholdUSD6(user);
            remUser4xBeforeUSD6 = th > earned ? (th - earned) : 0;

            return (
                fromPeriod,
                toPeriod,
                0,
                0,
                0,
                new uint32[](0),
                new uint256[](0),
                new uint256[](0),
                0,
                0,
                0,
                principalUsd6,
                capPct,
                remPidCapBeforeUSD6,
                remPidCapBeforeUSD6,
                remUser4xBeforeUSD6,
                remUser4xBeforeUSD6
            );
        }

        totalEpochs = uint256(toPeriod) - uint256(fromPeriod) + 1;
        if (offset >= totalEpochs || value == 0) {
            principalUsd6 = pm_.getUSDPrincipal(pid);
            capPct = p.capPct;
            uint256 remUSD6Empty = ICappingIncomeManagerViewOnly(_cfg().cappingIncomeManager()).remainingToCapUSD(pid);
            remPidCapBeforeUSD6 = remUSD6Empty;
            (uint256 thEmpty, , uint256 earnedEmpty) = ICappingIncomeManagerViewOnly(_cfg().cappingIncomeManager()).next4xThresholdUSD6(user);
            remUser4xBeforeUSD6 = thEmpty > earnedEmpty ? (thEmpty - earnedEmpty) : 0;
            return (
                fromPeriod,
                toPeriod,
                0,
                0,
                totalEpochs,
                new uint32[](0),
                new uint256[](0),
                new uint256[](0),
                0,
                0,
                0,
                principalUsd6,
                capPct,
                remPidCapBeforeUSD6,
                remPidCapBeforeUSD6,
                remUser4xBeforeUSD6,
                remUser4xBeforeUSD6
            );
        }

        uint256 remPidCapUSD6 = ICappingIncomeManagerViewOnly(_cfg().cappingIncomeManager()).remainingToCapUSD(pid);
        remPidCapBeforeUSD6 = remPidCapUSD6;

        (uint256 threshold4x, , uint256 earned4x) = ICappingIncomeManagerViewOnly(_cfg().cappingIncomeManager()).next4xThresholdUSD6(user);
        uint256 remUser4xUSD6 = threshold4x > earned4x ? (threshold4x - earned4x) : 0;
        remUser4xBeforeUSD6 = remUser4xUSD6;

        principalUsd6 = pm_.getUSDPrincipal(pid);
        capPct = p.capPct;

        uint32 prescanEnd = uint32(uint256(fromPeriod) + offset - 1);
        if (prescanEnd > toPeriod) prescanEnd = toPeriod;
        for (uint32 pr = fromPeriod; pr <= prescanEnd; pr++) {
            if (remPidCapUSD6 == 0 || remUser4xUSD6 == 0) break;
            uint256 usdMicro = _portfolioUsdForPeriod(p, pid, pr);
            if (usdMicro == 0) continue;
            if (usdMicro > remPidCapUSD6) usdMicro = remPidCapUSD6;
            if (usdMicro > remUser4xUSD6) usdMicro = remUser4xUSD6;
            if (usdMicro == 0) continue;
            remPidCapUSD6 -= usdMicro;
            remUser4xUSD6 = (remUser4xUSD6 == 0) ? 0 : (remUser4xUSD6 - usdMicro);
        }

        pageStartPeriod = uint32(uint256(fromPeriod) + offset);
        pageEndPeriod = pageStartPeriod + uint32(value) - 1;
        if (pageEndPeriod > toPeriod) pageEndPeriod = toPeriod;

        uint256 pageLen = uint256(pageEndPeriod) - uint256(pageStartPeriod) + 1;
        periodIds = new uint32[](pageLen);
        usdPerPeriod = new uint256[](pageLen);
        ramaPerPeriod = new uint256[](pageLen);

        for (uint32 pr2 = pageStartPeriod; pr2 <= pageEndPeriod; pr2++) {
            uint256 idx = uint256(pr2 - pageStartPeriod);
            periodIds[idx] = pr2;
            if (remPidCapUSD6 == 0 || remUser4xUSD6 == 0) continue;
            uint256 usdMicro2 = _portfolioUsdForPeriod(p, pid, pr2);
            if (usdMicro2 == 0) continue;
            if (usdMicro2 > remPidCapUSD6) usdMicro2 = remPidCapUSD6;
            if (usdMicro2 > remUser4xUSD6) usdMicro2 = remUser4xUSD6;
            if (usdMicro2 == 0) continue;
            uint256 px6Day = _price6ForDayRelaxed(_dayIdFromPeriod(pr2));
            if (px6Day == 0) continue;
            uint256 ramaWei = (usdMicro2 * 1e18) / px6Day;
            usdPerPeriod[idx] = usdMicro2;
            ramaPerPeriod[idx] = ramaWei;
            usdTotal += usdMicro2;
            ramaTotal += ramaWei;
            epochsCount += 1;
            remPidCapUSD6 -= usdMicro2;
            if (remUser4xUSD6 != 0) remUser4xUSD6 -= usdMicro2;
        }

        remPidCapAfterUSD6 = remPidCapUSD6;
        remUser4xAfterUSD6 = remUser4xUSD6;
    }

    // ---------------- Internal helpers (replicate ROIDistributor logic) ----------------
    function _autoWindow(address user) internal view returns (uint32 fromPeriod, uint32 lastPeriod) {
        uint32 latestFinPeriod = _latestClaimablePeriodId();
        if (latestFinPeriod == 0) return (1, 0);
        uint32 prev = dist.lastClaimPeriod(user);
        fromPeriod = prev == 0 ? _firstEligiblePeriod(user) : (prev + 1);
        lastPeriod = latestFinPeriod;
    }

    function _firstEligiblePeriod(address user) internal view returns (uint32) {
        IPortfolioManager pm_ = _pm();
        uint256[] memory pids = pm_.portfoliosOf(user);
        if (pids.length == 0) return _latestClaimablePeriodId();
        uint256 tmin = type(uint256).max;
        for (uint256 i = 0; i < pids.length; i++) {
            IPortfolioManager.Portfolio memory p = pm_.getPortfolio(pids[i]);
            if (p.owner != user) continue;
            if (p.createdAt < tmin) tmin = p.createdAt;
        }
        if (tmin == type(uint256).max) return _latestClaimablePeriodId();
        // Start from the first full epoch AFTER creation (next midnight UTC for 1-day epochs)
        return uint32(tmin / dist.epochSeconds()) + 1;
    }

    function _portfolioUsdForPeriod(
        IPortfolioManager.Portfolio memory p,
        uint256 pid,
        uint32 periodId
    ) internal view returns (uint256 usdMicro) {
        uint256 periodStartTs = uint256(periodId) * uint256(dist.epochSeconds());
        uint256 periodEndTs = (uint256(periodId) + 1) * uint256(dist.epochSeconds()) - 1;
        // Portfolio must exist BEFORE the epoch starts to earn this epoch
        if (p.createdAt >= periodStartTs) return 0;
        uint256 cutoffTs = 0;
        if (p.isClosed && p.closedAt > 0) cutoffTs = p.closedAt;
        if (p.isCapped && p.cappedAt > 0) {
            if (cutoffTs == 0 || p.cappedAt < cutoffTs) cutoffTs = p.cappedAt;
        }
        if (cutoffTs != 0 && periodStartTs >= cutoffTs) return 0;
        if (_isFrozenOnPeriod(pid, periodId)) return 0;

        IPortfolioManager pm_ = _pm();
        uint256 principalUsdMicro = pm_.getUSDPrincipal(pid);
        if (principalUsdMicro == 0) return 0;

        bool boosterForEpoch = false;
        if (p.booster) {
            if (p.boosterActivationDate == 0) boosterForEpoch = true;
            else boosterForEpoch = (periodStartTs >= p.boosterActivationDate);
        }
        uint256 rate = _rateWad(boosterForEpoch, p.tier);
        usdMicro = (principalUsdMicro * rate) / 1e18;

        uint256 rem = _remainingUsdCap(pid);
        if (usdMicro > rem) usdMicro = rem;
    }

    // Same as _portfolioUsdForPeriod but without applying the remaining-cap clamp
    function _portfolioUsdForPeriodRaw(
        IPortfolioManager.Portfolio memory p,
        uint256 pid,
        uint32 periodId
    ) internal view returns (uint256 usdMicro) {
        uint256 periodStartTs = uint256(periodId) * uint256(dist.epochSeconds());
        uint256 periodEndTs = (uint256(periodId) + 1) * uint256(dist.epochSeconds()) - 1;
        // Same midnight rule as _portfolioUsdForPeriod
        if (p.createdAt >= periodStartTs) return 0;
        uint256 cutoffTs = 0;
        if (p.isClosed && p.closedAt > 0) cutoffTs = p.closedAt;
        if (p.isCapped && p.cappedAt > 0) {
            if (cutoffTs == 0 || p.cappedAt < cutoffTs) cutoffTs = p.cappedAt;
        }
        if (cutoffTs != 0 && periodStartTs >= cutoffTs) return 0;
        if (_isFrozenOnPeriod(pid, periodId)) return 0;

        IPortfolioManager pm_ = _pm();
        uint256 principalUsdMicro = pm_.getUSDPrincipal(pid);
        if (principalUsdMicro == 0) return 0;

        bool boosterForEpoch = false;
        if (p.booster) {
            if (p.boosterActivationDate == 0) boosterForEpoch = true;
            else boosterForEpoch = (periodStartTs >= p.boosterActivationDate);
        }
        uint256 rate = _rateWad(boosterForEpoch, p.tier);
        usdMicro = (principalUsdMicro * rate) / 1e18;
    }

    function _remainingUsdCap(uint256 pid) internal view returns (uint256) {
        IPortfolioManager pm_ = _pm();
        IPortfolioManager.Portfolio memory p = pm_.getPortfolio(pid);
        uint256 principalUsdMicro = pm_.getUSDPrincipal(pid);
        uint256 capUsdMicro = (principalUsdMicro * p.capPct) / 100;
        uint256 paid = dist.paidUsdByPid(pid);
        return paid >= capUsdMicro ? 0 : (capUsdMicro - paid);
    }

    function _isFrozenOnPeriod(uint256 pid, uint32 periodId) internal view returns (bool) {
        uint32 dayId = _dayIdFromPeriod(periodId);
        IPortfolioManager pm_ = _pm();
        uint256 total = pm_.getFreezeIntervalsCount(pid);
        if (total == 0) return false;
        uint32 latestFinDay = IPriceOracleDaily(_oracle()).latestFinalizedDayId();
        uint256 cursor = 0;
        while (cursor < total) {
            uint256 chunk = total - cursor;
            if (chunk > 200) chunk = 200;
            IPortfolioManager.FreezeInterval[] memory slice = pm_.getFreezeIntervalsSlice(pid, cursor, chunk);
            for (uint256 i = 0; i < slice.length; i++) {
                uint32 s = slice[i].startDay;
                uint32 e = slice[i].endDay;
                if (e == 0) {
                    uint32 tentativeEnd = s + 3;
                    if (tentativeEnd > latestFinDay) tentativeEnd = latestFinDay;
                    e = tentativeEnd;
                }
                if (dayId >= s && dayId <= e) return true;
            }
            cursor += chunk;
        }
        return false;
    }

    function _rateWad(bool booster, uint8 tier) internal view returns (uint256) {
        if (tier == 1) return booster ? dist.dailyRateBoosterTier1() : dist.dailyRateTier1();
        return booster ? dist.dailyRateBoosterTier0() : dist.dailyRateTier0();
    }

    function _dayIdFromPeriod(uint32 periodId) internal view returns (uint32) {
        uint256 periodStartTs = uint256(periodId) * uint256(dist.epochSeconds());
        return uint32(periodStartTs / 1 days);
    }

    function _price6ForDayRelaxed(uint32 dayId) internal view returns (uint256) {
        IPriceOracleDaily o = _oracle();
        uint32 latestFin = o.latestFinalizedDayId();
        if (dayId <= latestFin) return o.getPrice6ForDay(dayId);
        (uint256 pWad, bool isSet, ) = o.getRaw(dayId);
        if (isSet && pWad > 0) return pWad / 1e12;
        for (uint32 d = dayId; d > 0; d--) {
            (pWad, isSet, ) = o.getRaw(d - 1);
            if (isSet && pWad > 0) return pWad / 1e12;
        }
        return 0;
    }

    function _latestFinalizedPeriodId() internal view returns (uint32) {
        IPriceOracleDaily o = _oracle();
        uint32 latestFinDay = o.latestFinalizedDayId();
        if (latestFinDay == 0) return 0;
        uint32 latestPossiblePeriod = uint32(block.timestamp / dist.epochSeconds());
        if (latestPossiblePeriod == 0) return 0;
        uint32 dayOfLatestPeriod = _dayIdFromPeriod(latestPossiblePeriod);
        if (dayOfLatestPeriod > latestFinDay) {
            uint256 endOfFinalizedDayTs = (uint256(latestFinDay) + 1) * 1 days - 1;
            return uint32(endOfFinalizedDayTs / dist.epochSeconds());
        }
        return latestPossiblePeriod;
    }

    function _latestClaimablePeriodId() internal view returns (uint32) {
        uint32 currentPeriod = uint32(block.timestamp / dist.epochSeconds());
        if (currentPeriod == 0) return 0;
        return currentPeriod - 1;
    }

    function _price6Latest() internal view returns (uint256) {
        return _oracle().getLatestPrice6();
    }

    // ---------------- TEAM ROI CALCULATION (paginated, gas-safe) ----------------

    struct TeamROIResult {
        uint256 totalUsdMicro;      // Total unclaimed USD across processed members
        uint256 totalRamaWei;       // Total unclaimed RAMA across processed members
        uint32 membersProcessed;    // Number of members successfully processed
        uint32 membersWithROI;      // Number of members with non-zero ROI
        uint32 membersFailed;       // Number of members that failed processing
        uint256 nextOffset;         // Next cursor for pagination
        bool hasMore;               // True if more members remain to process
        uint256 totalTeamSize;      // Total team size up to maxDepth
    }

    /// @notice Calculate unclaimed ROI for a user's team in a paginated, gas-safe manner.
    /// @dev This function processes team members in BFS order with pagination.
    ///      For large teams, call multiple times with increasing offset until hasMore = false.
    ///      Uses try-catch to prevent reverts from individual member failures.
    /// @param user The team leader address
    /// @param maxDepth Maximum depth to traverse (1 = directs only, 2+ = deeper levels)
    /// @param offset Starting index in the flattened BFS team array
    /// @param limit Maximum number of members to process in this call (recommend 50-200)
    /// @return result TeamROIResult struct with aggregated data and pagination info
    function getTeamUnclaimedROIPaginated(
        address user,
        uint8 maxDepth,
        uint256 offset,
        uint256 limit
    ) external view returns (TeamROIResult memory result) {
        require(maxDepth >= 1 && maxDepth <= 50, "DEPTH_RANGE");
        require(limit > 0 && limit <= 500, "LIMIT_RANGE");
        require(IUserRegistry(_users()).isRegistered(user), "NOT_REGISTERED");

        // Get flattened team up to maxDepth
        address[] memory teamFlat;
        try this.getTeamFlattenedSafe(user, maxDepth) returns (address[] memory team) {
            teamFlat = team;
        } catch {
            // If team is too large even to fetch, use level-by-level fallback
            result.membersFailed = 1;
            result.hasMore = false;
            return result;
        }

        uint256 teamSize = teamFlat.length;
        result.totalTeamSize = teamSize;

        if (teamSize == 0 || offset >= teamSize) {
            result.hasMore = false;
            result.nextOffset = teamSize;
            return result;
        }

        // Calculate end index for this batch
        uint256 endIdx = offset + limit;
        if (endIdx > teamSize) {
            endIdx = teamSize;
            result.hasMore = false;
        } else {
            result.hasMore = true;
        }
        result.nextOffset = endIdx;

        // Process each member in the batch
        for (uint256 i = offset; i < endIdx; i++) {
            address member = teamFlat[i];

            // Skip if not registered or deactivated
            try IUserRegistry(_users()).isRegistered(member) returns (bool isReg) {
                if (!isReg) {
                    result.membersFailed++;
                    continue;
                }
            } catch {
                result.membersFailed++;
                continue;
            }

            try IUserRegistry(_users()).isTempDeactive(member) returns (bool isDeactive) {
                if (isDeactive) {
                    result.membersFailed++;
                    continue;
                }
            } catch {
                result.membersFailed++;
                continue;
            }

            // Get unclaimed ROI for this member with try-catch
            try this.getUnclaimedROI(member) returns (
                uint256 usdMicro,
                uint256 ramaWei,
                uint32,
                uint32,
                uint32
            ) {
                if (usdMicro > 0 || ramaWei > 0) {
                    result.totalUsdMicro += usdMicro;
                    result.totalRamaWei += ramaWei;
                    result.membersWithROI++;
                }
                result.membersProcessed++;
            } catch {
                // Member ROI calculation failed, skip
                result.membersFailed++;
            }
        }
    }

    /// @notice Internal helper to get flattened team with safety checks
    /// @dev This is an external function callable via try-catch for safety
    function getTeamFlattenedSafe(
        address user,
        uint8 maxDepth
    ) external view returns (address[] memory) {
        return _getTeamFlattened(user, maxDepth);
    }

    /// @notice Get team members in flattened BFS order up to maxDepth
    /// @dev Builds team level by level to avoid deep recursion
    function _getTeamFlattened(
        address user,
        uint8 maxDepth
    ) internal view returns (address[] memory) {
        require(maxDepth >= 1, "MIN_DEPTH_1");

        IUserRegistry userReg = IUserRegistry(_users());

        // First pass: count total size
        uint256 totalSize = 0;
        address[] memory currentLevel = userReg.getDirects(user);
        totalSize += currentLevel.length;

        // Store all levels for second pass
        address[][] memory allLevels = new address[][](maxDepth);
        allLevels[0] = currentLevel;

        for (uint8 level = 2; level <= maxDepth; level++) {
            uint256 nextLevelSize = 0;

            // Count next level size
            for (uint256 i = 0; i < currentLevel.length; i++) {
                address[] memory directs = userReg.getDirects(currentLevel[i]);
                nextLevelSize += directs.length;
            }

            if (nextLevelSize == 0) break; // No more levels

            // Build next level
            address[] memory nextLevel = new address[](nextLevelSize);
            uint256 idx = 0;
            for (uint256 i = 0; i < currentLevel.length; i++) {
                address[] memory directs = userReg.getDirects(currentLevel[i]);
                for (uint256 j = 0; j < directs.length; j++) {
                    nextLevel[idx++] = directs[j];
                }
            }

            allLevels[level - 1] = nextLevel;
            totalSize += nextLevelSize;
            currentLevel = nextLevel;
        }

        // Second pass: flatten into single array
        address[] memory flattened = new address[](totalSize);
        uint256 writeIdx = 0;
        for (uint8 level = 0; level < maxDepth; level++) {
            if (allLevels[level].length == 0) break;
            for (uint256 i = 0; i < allLevels[level].length; i++) {
                flattened[writeIdx++] = allLevels[level][i];
            }
        }

        return flattened;
    }

    /// @notice Calculate team ROI by level (alternative chunking strategy)
    /// @dev Process one level at a time with member pagination within that level
    /// @param user The team leader
    /// @param level The specific level to process (1 = directs, 2+ = deeper)
    /// @param memberOffset Offset within the level's members
    /// @param memberLimit Max members to process from this level
    function getTeamROIByLevel(
        address user,
        uint8 level,
        uint256 memberOffset,
        uint256 memberLimit
    ) external view returns (
        uint256 totalUsdMicro,
        uint256 totalRamaWei,
        uint32 membersProcessed,
        uint32 membersWithROI,
        uint32 membersFailed,
        uint256 nextOffset,
        bool hasMore,
        uint256 totalLevelSize
    ) {
        require(level >= 1 && level <= 50, "LEVEL_RANGE");
        require(memberLimit > 0 && memberLimit <= 500, "LIMIT_RANGE");
        require(IUserRegistry(_users()).isRegistered(user), "NOT_REGISTERED");

        // Get members at this level
        address[] memory levelMembers;
        try IUserRegistry(_users()).getLevelTeam(user, level) returns (address[] memory members) {
            levelMembers = members;
        } catch {
            membersFailed = 1;
            return (0, 0, 0, 0, 1, 0, false, 0);
        }

        totalLevelSize = levelMembers.length;

        if (totalLevelSize == 0 || memberOffset >= totalLevelSize) {
            return (0, 0, 0, 0, 0, totalLevelSize, false, totalLevelSize);
        }

        uint256 endIdx = memberOffset + memberLimit;
        if (endIdx > totalLevelSize) {
            endIdx = totalLevelSize;
            hasMore = false;
        } else {
            hasMore = true;
        }
        nextOffset = endIdx;

        // Process members in this batch
        for (uint256 i = memberOffset; i < endIdx; i++) {
            address member = levelMembers[i];

            try IUserRegistry(_users()).isRegistered(member) returns (bool isReg) {
                if (!isReg) {
                    membersFailed++;
                    continue;
                }
            } catch {
                membersFailed++;
                continue;
            }

            try IUserRegistry(_users()).isTempDeactive(member) returns (bool isDeactive) {
                if (isDeactive) {
                    membersFailed++;
                    continue;
                }
            } catch {
                membersFailed++;
                continue;
            }

            try this.getUnclaimedROI(member) returns (
                uint256 usdMicro,
                uint256 ramaWei,
                uint32,
                uint32,
                uint32
            ) {
                if (usdMicro > 0 || ramaWei > 0) {
                    totalUsdMicro += usdMicro;
                    totalRamaWei += ramaWei;
                    membersWithROI++;
                }
                membersProcessed++;
            } catch {
                membersFailed++;
            }
        }
    }

    // ---------------- Aliases to core pointers ----------------
    function _cfg() internal view returns (ICoreConfig) {
        return ICoreConfig(dist.cfg());
    }
    function _users() internal view returns (address) {
        return dist.users();
    }
    function _pm() internal view returns (IPortfolioManager) {
        return IPortfolioManager(dist.pm());
    }
    function _oracle() internal view returns (IPriceOracleDaily) {
        return IPriceOracleDaily(dist.oracle());
    }
}
