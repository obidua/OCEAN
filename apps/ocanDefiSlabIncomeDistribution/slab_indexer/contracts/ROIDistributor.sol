// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "./interfaces/ICoreConfig.sol";
import "./interfaces/IUserRegistry.sol";
import "./interfaces/IPortfolioManager.sol";
import "./interfaces/IPriceOracleDaily.sol";

interface ISafeWallet {
    function creditROIUSDBatch(
        address user,
        uint32[] calldata periodIds,
        uint256[] calldata usdAmounts, // NOTE: micro-USD (1e6)
        uint256[] calldata ramaAmounts // RAMA wei
    ) external;
}

interface ICappingIncomeManager {
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

    function totalIncomeEarnedUSD6(
        address user
    ) external view returns (uint256);

    function remainingToCapUSD(uint256 pid) external view returns (uint256);
    function creditROIFor(
        address user,
        uint256 pid,
        uint256 amountWei,
        uint256 amountUSD6
    ) external returns (uint256 creditedWei);

    function noteROIEarnedOnly(
        address user,
        uint256 pid,
        uint256 amountUSD6
    ) external;
}

/**
 * @title ROIDistributor
 * @notice Period-based ROI distributor with configurable epoch length.
 *         - `epochSeconds` sets the period length. Default: 1 day. For tests: 60 seconds.
 *         - All ROI math in this contract uses micro-USD (1e6) to match PortfolioManager.
 *         - Daily WAD rates are applied per-epoch as a full "day" (no time pro-rating).
 *         - Price oracle returns micro-USD per RAMA; conversion: ramaWei = (usdMicro * 1e18) / price6.
 *         - All state related to claims is tracked by `periodId`.
 * Storage note:
 *   `lastClaimDay` stores the last claimed *periodId* (inclusive).
 */
contract ROIDistributor is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    ICoreConfig public cfg;
    IUserRegistry public users;
    IPortfolioManager public pm;
    IPriceOracleDaily public oracle;

    // ======= CONFIGURABLE PERIOD LENGTH (epoch) =======
    uint32 public epochSeconds; // default 86400; for tests set to 60

    // daily/booster rates (WAD per day, pro-rated to period in calculations)
    uint256 public dailyRateTier0; // 0.33% = 33e14
    uint256 public dailyRateTier1; // 0.40% = 40e14
    uint256 public dailyRateBoosterTier0; // 0.66% = 66e14
    uint256 public dailyRateBoosterTier1; // 0.80% = 80e14

    // Last fully-claimed period (inclusive). 0 => never claimed.
    mapping(address => uint32) public lastClaimPeriod;

    // Lifetime totals (micro-USD and wei)
    mapping(address => uint256) public totalClaimedUsd; // micro-USD (1e6)
    mapping(address => uint256) public totalClaimedRama; // RAMA wei
    mapping(address => uint32) public userClaimEpoch; // increments each claim

    // Per-portfolio USD paid ledger (micro-USD) used to enforce 200%/250% caps
    mapping(uint256 => uint256) public paidUsdByPid; // micro-USD

    // Tracks the end timestamp of the last distributed epoch (global marker)

    struct ClaimRec {
        uint32 fromPeriod; // periodId (inclusive)
        uint32 toPeriod; // periodId (inclusive)
        uint256 usdTotal; // micro-USD
        uint256 ramaTotal; // wei
        uint64 claimedAt;
        uint32 epoch;
    }
    mapping(address => ClaimRec[]) internal _history;

    struct PidClaim {
        uint256 pid;
        uint256 usdTotal; // micro-USD
        uint256 ramaTotal; // wei
    }
    mapping(address => mapping(uint32 => PidClaim[])) internal _epochPidClaims;

    uint32 public maxPeriodsPerClaim;

    uint64 public lastDistributionTs;

    // Latest period that is safe to claim up to.
    // - Prefers the last fully ended period (block.timestamp/epoch - 1)
    // - If that period’s day is finalized, it’s claimable.
    // - If unfinalized (today), allow if today’s price is already set in the oracle (getRaw).
    // - Otherwise clamp to the last period that belongs to the latest finalized day.
    function _latestClaimablePeriodId() internal view returns (uint32) {
        uint32 currentPeriod = uint32(block.timestamp / epochSeconds);
        if (currentPeriod == 0) return 0;
        // Latest fully-ended epoch. No dependence on day finalization.
        return currentPeriod - 1;
    }

    // Price source: always use the most recently set price from the oracle (6 decimals).
    function _price6Latest() public view returns (uint256) {
        return oracle.getLatestPrice6();
    }

    event ClaimedROI(
        address indexed user,
        uint32 indexed fromPeriod,
        uint32 indexed toPeriod,
        uint256 usdTotal, // micro-USD
        uint256 ramaTotal, // wei
        uint32 epoch
    );

    event ClaimedROIByPortfolio(
        address indexed user,
        uint32 indexed epoch,
        uint256 pid,
        uint256 usdTotal, // micro-USD
        uint256 ramaTotal // wei
    );

    // ---------------- Init / Upgrade ----------------
    function initialize(address _cfg) external initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();

        cfg = ICoreConfig(_cfg);
        users = IUserRegistry(cfg.userRegistry());
        pm = IPortfolioManager(cfg.portfolioManager());
        oracle = IPriceOracleDaily(cfg.dailyPriceOracle());

        // default epoch = 1 day; for testing set to 60 via admin
        epochSeconds = 1 days;

        dailyRateTier0 = 33e14;
        dailyRateTier1 = 40e14;
        dailyRateBoosterTier0 = 66e14;
        dailyRateBoosterTier1 = 80e14;

        maxPeriodsPerClaim = 90;
    }

    function initConfig(address _cfg) external onlyOwner {
        cfg = ICoreConfig(_cfg);
        users = IUserRegistry(cfg.userRegistry());
        pm = IPortfolioManager(cfg.portfolioManager());
        oracle = IPriceOracleDaily(cfg.dailyPriceOracle());
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    // ---------------- Admin ----------------
    function setOracle(address a) external onlyOwner {
        require(a != address(0), "ZERO_ORACLE");
        oracle = IPriceOracleDaily(a);
    }

    function setRates(
        uint256 t0,
        uint256 t1,
        uint256 b0,
        uint256 b1
    ) external onlyOwner {
        require(t0 > 0 && t1 > 0 && b0 > 0 && b1 > 0, "BAD_RATE");
        dailyRateTier0 = t0;
        dailyRateTier1 = t1;
        dailyRateBoosterTier0 = b0;
        dailyRateBoosterTier1 = b1;
    }

    /// @notice Set the generic period length using common time units.
    /// @param unit The number of seconds for the unit (e.g., 1 for seconds, 60 for minutes, 3600 for hours, 86400 for days).
    /// @param value The number of units for the epoch length (e.g., unit=60, value=30 for a 30-minute epoch).
    /// NOTE: Changing this affects *future* claims; user state is kept in period IDs, not timestamps.
    function setEpochSeconds(uint32 unit, uint32 value) external onlyOwner {
        require(unit > 0 && value > 0, "ZERO_VALUE");
        uint256 secs = uint256(unit) * uint256(value);
        require(secs >= 60 && secs <= 7 days, "RANGE");
        epochSeconds = uint32(secs);
    }

    /// @notice Set the generic period length directly in seconds.
    function setEpochSecondsDirect(uint32 secs) external onlyOwner {
        require(secs >= 60 && secs <= 7 days, "RANGE");
        epochSeconds = secs;
    }

    /// @notice Gas-safety guard (max periods per claim).
    function setMaxPeriodsPerClaim(uint32 maxPeriods) external onlyOwner {
        require(maxPeriods >= 1 && maxPeriods <= 3650, "RANGE");
        maxPeriodsPerClaim = maxPeriods;
    }

    // ---------------- Views ----------------

    function getTotalsClaimed(
        address user
    ) external view returns (uint256, uint256) {
        return (totalClaimedUsd[user], totalClaimedRama[user]);
    }

    /// @notice Total unclaimed ROI for a user using claimable window (finalized days).
    /// @dev Uses day-finalized window via _autoWindow, matching claimROI behavior.
    ///      Returns totals in micro-USD and wei, plus the [from..last] period window.
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

        uint256[] memory userPids = pm.portfoliosOf(user);
        // Track per-pid remaining cap for this view simulation (micro-USD)
        uint256[] memory remByPid = new uint256[](userPids.length);
        for (uint256 i = 0; i < userPids.length; i++) {
            uint256 pid = userPids[i];
            IPortfolioManager.Portfolio memory p0 = pm.getPortfolio(pid);
            if (p0.owner != user) continue;
            uint256 capUsdMicro = (pm.getUSDPrincipal(pid) * p0.capPct) / 100;
            uint256 paid = paidUsdByPid[pid];
            remByPid[i] = paid >= capUsdMicro ? 0 : (capUsdMicro - paid);
        }

        for (uint32 pr = fromPeriod; pr <= lastPeriod; pr++) {
            uint256 usdPrMicro;
            for (uint256 i = 0; i < userPids.length; i++) {
                uint256 pid = userPids[i];
                IPortfolioManager.Portfolio memory p = pm.getPortfolio(pid);
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
            epochsCount += 1; // count only epochs that contribute non-zero USD
        }
    }

    function getClaimHistoryCount(
        address user
    ) external view returns (uint256) {
        return _history[user].length;
    }

    function getClaimHistorySlice(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (ClaimRec[] memory out) {
        ClaimRec[] storage arr = _history[user];
        uint256 n = arr.length;
        if (offset >= n) return new ClaimRec[](0);
        uint256 end = offset + limit;
        if (end > n) end = n;
        out = new ClaimRec[](end - offset);
        for (uint256 i = offset; i < end; i++) out[i - offset] = arr[i];
    }

    function getPidClaimsCount(
        address user,
        uint32 epoch
    ) external view returns (uint256) {
        return _epochPidClaims[user][epoch].length;
    }

    function getPidClaimsSlice(
        address user,
        uint32 epoch,
        uint256 offset,
        uint256 limit
    ) external view returns (PidClaim[] memory out) {
        PidClaim[] storage arr = _epochPidClaims[user][epoch];
        uint256 n = arr.length;
        if (offset >= n) return new PidClaim[](0);

        uint256 end = offset + limit;
        if (end > n) end = n;
        out = new PidClaim[](end - offset);
        for (uint256 i = offset; i < end; i++) out[i - offset] = arr[i];
    }

    /// Next distribution timestamp hint: lastDistributionTs + epochSeconds (0 if none yet)
    function nextDistributionTs() external view returns (uint64) {
        if (lastDistributionTs == 0) return 0;
        return uint64(uint256(lastDistributionTs) + uint256(epochSeconds));
    }

    // ---------------- Window helpers (period-based) ----------------

    function _autoWindow(
        address user
    ) public view returns (uint32 fromPeriod, uint32 lastPeriod) {
        uint32 latestFinPeriod = _latestClaimablePeriodId();
        if (latestFinPeriod == 0) return (1, 0); // empty

        uint32 prev = lastClaimPeriod[user];
        fromPeriod = prev == 0 ? _firstEligiblePeriod(user) : (prev + 1);
        lastPeriod = latestFinPeriod;
    }

    function _firstEligiblePeriod(address user) internal view returns (uint32) {
        uint256[] memory pids = pm.portfoliosOf(user);
        if (pids.length == 0) return _latestClaimablePeriodId();
        uint256 tmin = type(uint256).max;
        for (uint256 i = 0; i < pids.length; i++) {
            IPortfolioManager.Portfolio memory p = pm.getPortfolio(pids[i]);
            if (p.owner != user) continue;
            if (p.createdAt < tmin) tmin = p.createdAt;
        }
        if (tmin == type(uint256).max) return _latestClaimablePeriodId();
        // Start from the first full epoch AFTER creation (next midnight UTC for 1-day epochs)
        return uint32(tmin / epochSeconds) + 1;
    }

    // ---------------- Math (freeze + cap aware; micro-USD) ----------------
    function _userUsdForPeriod_FreezeCap(
        address user,
        uint32 periodId
    ) internal view returns (uint256 usdMicro) {
        uint256[] memory pids = pm.portfoliosOf(user);
        for (uint256 i = 0; i < pids.length; i++) {
            IPortfolioManager.Portfolio memory p = pm.getPortfolio(pids[i]);
            if (p.owner != user) continue;
            usdMicro += _portfolioUsdForPeriod(p, pids[i], periodId);
        }
    }

    /// @dev Returns per-period ROI in micro-USD; each epoch pays full daily rate.
    function _portfolioUsdForPeriod(
        IPortfolioManager.Portfolio memory p,
        uint256 pid,
        uint32 periodId
    ) internal view returns (uint256 usdMicro) {
        // Epoch boundaries
        uint256 periodStartTs = uint256(periodId) * uint256(epochSeconds);
        uint256 periodEndTs = (uint256(periodId) + 1) *
            uint256(epochSeconds) -
            1;

        // Portfolio must exist BEFORE the epoch starts to earn this epoch
        // This enforces accrual beginning at the next midnight after creation time
        if (p.createdAt >= periodStartTs) return 0;

        // Stop accrual after earliest cap/closure time; epochs starting on/after cutoff earn 0
        uint256 cutoffTs = 0;
        if (p.isClosed && p.closedAt > 0) {
            cutoffTs = p.closedAt;
        }
        if (p.isCapped && p.cappedAt > 0) {
            if (cutoffTs == 0 || p.cappedAt < cutoffTs) cutoffTs = p.cappedAt;
        }
        if (cutoffTs != 0 && periodStartTs >= cutoffTs) return 0;
        if (_isFrozenOnPeriod(pid, periodId)) return 0;

        // principal USD is micro-USD (1e6)
        uint256 principalUsdMicro = pm.getUSDPrincipal(pid);
        if (principalUsdMicro == 0) return 0;

        // Each epoch pays the full daily rate (no seconds-based pro-rating)
        // Booster application semantics:
        // - Normal rate applies for epochs that start before boosterActivationDate
        // - Booster rate applies for epochs that start on/after boosterActivationDate
        // - If boosterActivationDate is 0 but booster flag is true, treat as booster-active (backwards compatibility)
        bool boosterForEpoch = false;
        if (p.booster) {
            if (p.boosterActivationDate == 0) {
                boosterForEpoch = true;
            } else {
                boosterForEpoch = (periodStartTs >= p.boosterActivationDate);
            }
        }
        uint256 rate = _rateWad(boosterForEpoch, p.tier);
        usdMicro = (principalUsdMicro * rate) / 1e18;

        // enforce remaining cap (micro-USD)
        uint256 rem = _remainingUsdCap(pid);
        if (usdMicro > rem) usdMicro = rem;
    }

    /// @dev Same as _portfolioUsdForPeriod but does NOT clamp to remaining cap; used by view aggregation to simulate per-pid remaining across periods.
    function _portfolioUsdForPeriodRaw(
        IPortfolioManager.Portfolio memory p,
        uint256 pid,
        uint32 periodId
    ) internal view returns (uint256 usdMicro) {
        // Epoch boundaries
        uint256 periodStartTs = uint256(periodId) * uint256(epochSeconds);
        uint256 periodEndTs = (uint256(periodId) + 1) *
            uint256(epochSeconds) -
            1;

        // Same midnight rule as _portfolioUsdForPeriod
        if (p.createdAt >= periodStartTs) return 0;

        uint256 cutoffTs = 0;
        if (p.isClosed && p.closedAt > 0) {
            cutoffTs = p.closedAt;
        }
        if (p.isCapped && p.cappedAt > 0) {
            if (cutoffTs == 0 || p.cappedAt < cutoffTs) cutoffTs = p.cappedAt;
        }
        if (cutoffTs != 0 && periodStartTs >= cutoffTs) return 0;
        if (_isFrozenOnPeriod(pid, periodId)) return 0;

        uint256 principalUsdMicro = pm.getUSDPrincipal(pid);
        if (principalUsdMicro == 0) return 0;

        bool boosterForEpoch = false;
        if (p.booster) {
            if (p.boosterActivationDate == 0) {
                boosterForEpoch = true;
            } else {
                boosterForEpoch = (periodStartTs >= p.boosterActivationDate);
            }
        }
        uint256 rate = _rateWad(boosterForEpoch, p.tier);
        usdMicro = (principalUsdMicro * rate) / 1e18;
    }

    /// @dev Remaining cap (micro-USD) for a portfolio.
    function _remainingUsdCap(uint256 pid) internal view returns (uint256) {
        IPortfolioManager.Portfolio memory p = pm.getPortfolio(pid);
        uint256 principalUsdMicro = pm.getUSDPrincipal(pid); // micro-USD (1e6)
        uint256 capUsdMicro = (principalUsdMicro * p.capPct) / 100; // 200%/250%
        uint256 paid = paidUsdByPid[pid]; // micro-USD
        return paid >= capUsdMicro ? 0 : (capUsdMicro - paid);
    }

    function _isFrozenOnPeriod(
        uint256 pid,
        uint32 periodId
    ) internal view returns (bool) {
        // map period -> UTC dayId and reuse day-based freeze intervals
        uint32 dayId = _dayIdFromPeriod(periodId);

        uint256 total = pm.getFreezeIntervalsCount(pid);
        if (total == 0) return false;

        uint32 latestFinDay = oracle.latestFinalizedDayId();
        uint256 cursor = 0;
        while (cursor < total) {
            uint256 chunk = total - cursor;
            if (chunk > 200) chunk = 200;
            IPortfolioManager.FreezeInterval[] memory slice = pm
                .getFreezeIntervalsSlice(pid, cursor, chunk);

            for (uint256 i = 0; i < slice.length; i++) {
                uint32 s = slice[i].startDay;
                uint32 e = slice[i].endDay;
                if (e == 0) {
                    uint32 tentativeEnd = s + 3; // ~72h = 3 days
                    if (tentativeEnd > latestFinDay)
                        tentativeEnd = latestFinDay;
                    e = tentativeEnd;
                }
                if (dayId >= s && dayId <= e) return true;
            }
            cursor += chunk;
        }
        return false;
    }

    function _rateWad(
        bool booster,
        uint8 tier
    ) internal view returns (uint256) {
        if (tier == 1) return booster ? dailyRateBoosterTier1 : dailyRateTier1;
        return booster ? dailyRateBoosterTier0 : dailyRateTier0;
    }

    // -------- Helpers: map between periods and days / oracle finality --------
    function _dayIdFromPeriod(uint32 periodId) internal view returns (uint32) {
        uint256 periodStartTs = uint256(periodId) * uint256(epochSeconds);
        return uint32(periodStartTs / 1 days);
    }

    function _price6ForDayRelaxed(
        uint32 dayId
    ) internal view returns (uint256) {
        uint32 latestFin = oracle.latestFinalizedDayId();
        if (dayId <= latestFin) {
            return oracle.getPrice6ForDay(dayId);
        }

        // Try today's direct price (unfinalized) via raw accessor.
        (uint256 pWad, bool isSet, ) = oracle.getRaw(dayId);
        if (isSet && pWad > 0) {
            return pWad / 1e12; // convert 1e18 -> 1e6
        }

        // Fallback: scan backward for the most recent set day price.
        // Bound to dayId iterations in worst case; view-only.
        for (uint32 d = dayId; d > 0; d--) {
            (pWad, isSet, ) = oracle.getRaw(d - 1);
            if (isSet && pWad > 0) {
                return pWad / 1e12;
            }
        }
        return 0;
    }

    function _latestFinalizedPeriodId() internal view returns (uint32) {
        // latest finalized day = oracle.yesterday
        uint32 latestFinDay = oracle.latestFinalizedDayId();
        // if (latestFinDay == 0) {
        //     return 0;
        // }

        // // The latest possible period is the one that just passed.
        // uint32 latestPossiblePeriod = uint32(block.timestamp / epochSeconds);
        // if (latestPossiblePeriod == 0) {
        //     return 0;
        // }

        // // What day does this period belong to?
        // uint32 dayOfLatestPeriod = _dayIdFromPeriod(latestPossiblePeriod);

        // // If we don't have a price for that day yet, cap at the end of the last finalized day.
        // if (dayOfLatestPeriod > latestFinDay) {
        //     uint256 endOfFinalizedDayTs = (uint256(latestFinDay) + 1) *
        //         1 days -
        //         1;
        //     return uint32(endOfFinalizedDayTs / epochSeconds);

        if (latestFinDay == 0) {
            return 0;
        }

        // The latest possible period is the one that just passed.
        uint32 latestPossiblePeriod = uint32(block.timestamp / epochSeconds);
        if (latestPossiblePeriod == 0) {
            return 0;
        }

        // What day does this period belong to?
        uint32 dayOfLatestPeriod = _dayIdFromPeriod(latestPossiblePeriod);

        // If we don't have a price for that day yet, cap at the end of the last finalized day.
        if (dayOfLatestPeriod > latestFinDay) {
            uint256 endOfFinalizedDayTs = (uint256(latestFinDay) + 1) *
                1 days -
                1;
            return uint32(endOfFinalizedDayTs / epochSeconds);
        }

        // // Otherwise, we can claim up to the period that just passed.
        // return latestPossiblePeriod;
        // }

        // Otherwise, we can claim up to the period that just passed.
        return latestPossiblePeriod;
    }

    // -------- CLAIM (no inputs; auto up to latest finalized period) --------
    function claimROI() external {
        require(
            IUserRegistry(cfg.userRegistry()).isRegistered(msg.sender),
            "NOT_REGISTERED"
        );

        if (IUserRegistry(cfg.userRegistry()).isTempDeactive(msg.sender)) {
            return;
        }

        (uint32 fromPeriod, uint32 lastPeriod) = _autoWindow(msg.sender);
        require(lastPeriod >= fromPeriod, "NOTHING");

        uint32 span = lastPeriod - fromPeriod + 1;
        if (span > maxPeriodsPerClaim) {
            lastPeriod = fromPeriod + maxPeriodsPerClaim - 1;
            span = maxPeriodsPerClaim;
        }
        // require(span <= maxPeriodsPerClaim, "TOO_MANY_PERIODS");

        uint256[] memory userPids = pm.portfoliosOf(msg.sender);
        uint256[] memory perPidUsd = new uint256[](userPids.length); // micro-USD
        uint256[] memory perPidRama = new uint256[](userPids.length); // wei

        uint32[] memory periodIds = new uint32[](span);
        uint256[] memory usdAmounts = new uint256[](span); // micro-USD
        uint256[] memory ramaAmounts = new uint256[](span); // wei

        uint256 usdTotal; // micro-USD
        uint256 ramaTotal; // wei

        ICappingIncomeManager cim = ICappingIncomeManager(
            cfg.cappingIncomeManager()
        );
        for (uint32 pr = fromPeriod; pr <= lastPeriod; pr++) {
            uint256 idx = uint256(pr - fromPeriod);
            periodIds[idx] = pr;

            // uint32 dayId = _dayIdFromPeriod(pr);
            uint256 price6 = _price6Latest();
            // uint256 price6 = _price6Latest();
            require(price6 > 0, "PRICE_NOT_SET");

            uint256 usdPrCredited;
            uint256 ramaPrCredited;

            // Per-portfolio credit via CappingIncomeManager to enforce cap/closure
            for (uint256 i = 0; i < userPids.length; i++) {
                uint256 pid = userPids[i];
                IPortfolioManager.Portfolio memory p = pm.getPortfolio(pid);
                if (p.owner != msg.sender) continue;

                uint256 usdPidMicro = _portfolioUsdForPeriod(p, pid, pr);
                // uint256 usdPidMicro = 100000000;

                if (usdPidMicro == 0) continue;

                uint256 ramaWei = (usdPidMicro * 1e18) / price6;
                uint256 creditedUsd6;

                if (p.isClosed) {
                    cim.noteROIEarnedOnly(msg.sender, pid, usdPidMicro);
                    creditedUsd6 = usdPidMicro;
                } else {
                    try
                        cim.creditROIFor(msg.sender, pid, ramaWei, usdPidMicro)
                    returns (uint256 cw) {
                        creditedUsd6 = cw;
                    } catch {
                        // Fallback: treat as fully credited in USD6 terms (should be rare)
                        creditedUsd6 = usdPidMicro;
                    }
                    if (creditedUsd6 == 0) continue;
                }

                // // cahaamaamamam❌
                // creditedWei = ramaWei;
                // uint256 creditedUsd6 = (creditedWei * price6) / 1e18;
                // uint256 creditedUsd6 = creditedWei 8;
                // uint256 creditedRAMA = creditedWei;

                uint256 creditedRAMA = (creditedUsd6 * 1e18) / price6;

                // // Update per-period totals
                usdPrCredited += creditedUsd6;
                ramaPrCredited += creditedRAMA;

                // Update per-pid ledgers and epoch breakdown
                paidUsdByPid[pid] += creditedUsd6; // micro-USD
                perPidUsd[i] += creditedUsd6; // micro-USD
                perPidRama[i] += creditedRAMA; // wei
            }

            // Store per-period amounts
            usdAmounts[idx] = usdPrCredited;
            ramaAmounts[idx] = ramaPrCredited;
            usdTotal += usdPrCredited;
            ramaTotal += ramaPrCredited;
        }

        ISafeWallet(cfg.safeWallet()).creditROIUSDBatch(
            msg.sender,
            periodIds,
            usdAmounts, // micro-USD
            ramaAmounts // wei
        );

        lastClaimPeriod[msg.sender] = lastPeriod; // store last claimed period
        totalClaimedUsd[msg.sender] += usdTotal; // micro-USD
        totalClaimedRama[msg.sender] += ramaTotal; // wei

        uint32 epoch = ++userClaimEpoch[msg.sender];

        _history[msg.sender].push(
            ClaimRec({
                fromPeriod: fromPeriod,
                toPeriod: lastPeriod,
                usdTotal: usdTotal,
                ramaTotal: ramaTotal,
                claimedAt: uint64(block.timestamp),
                epoch: epoch
            })
        );

        for (uint256 i = 0; i < userPids.length; i++) {
            if (perPidUsd[i] == 0 && perPidRama[i] == 0) continue;
            _epochPidClaims[msg.sender][epoch].push(
                PidClaim({
                    pid: userPids[i],
                    usdTotal: perPidUsd[i], // micro-USD
                    ramaTotal: perPidRama[i] // wei
                })
            );
            emit ClaimedROIByPortfolio(
                msg.sender,
                epoch,
                userPids[i],
                perPidUsd[i],
                perPidRama[i]
            );
        }

        emit ClaimedROI(
            msg.sender,
            fromPeriod,
            lastPeriod,
            usdTotal,
            ramaTotal,
            epoch
        );

        // Update global last distribution timestamp to the end of the last processed epoch
        if (lastPeriod >= fromPeriod) {
            uint256 endTs = (uint256(lastPeriod) + 1) *
                uint256(epochSeconds) -
                1;
            lastDistributionTs = uint64(endTs);
        }
    }
}
