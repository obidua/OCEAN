// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "./interfaces/ICoreConfig.sol";
import "./interfaces/IUserRegistry.sol";
import "./interfaces/IPriceOracleDaily.sol";

interface ISlabTopology {
    // Return the first-hop leg ID (implementation detail up to you: 0/1/2 or a uint key)
    function firstHopLeg(
        address upline,
        address member
    ) external view returns (uint32);

    // Return the list of leg IDs that upline currently has (small, e.g., 2-3)
    function legsOf(address upline) external view returns (uint32[] memory);
}

interface ISlabIncomeCoreLike {
    // ----- core pointers -----
    function cfg() external view returns (ICoreConfig);
    function users() external view returns (address);
    function oracle() external view returns (address);
    function epochSeconds() external view returns (uint32);

    // ----- topology (upline legs, routes) -----
    function topo() external view returns (ISlabTopology);

    // ----- epoch mapping -----
    // choose “periodId = floor(ts/epochSeconds)”; dayId = floor(periodStart/1 days)
    function lastSlabClaimPeriod(address user) external view returns (uint32);

    // ----- team-ROI accrual bucket -----
    // Sum of downline ROI (USD6) accrued toward (upline, leg, dayId)
    function teamRoiUSD6(
        address upline,
        uint32 legId,
        uint32 dayId
    ) external view returns (uint256);

    // ----- ladder baseline -----
    // How many percentage points (0..60) from the 60% leg cap are already consumed for this leg/day
    function paidPercent(
        address upline,
        uint32 legId,
        uint32 dayId
    ) external view returns (uint8);

    // ----- achiever slab% resolver -----
    // Your SlabManager logic: returns 0..60 (the *target* they’re entitled to)
    function slabPercentForDay(
        address user,
        uint32 dayId
    ) external view returns (uint8);

    // ----- realized slab journal (for override) -----
    function slabIncomeUSD6Claimed(
        address user,
        uint32 dayId
    ) external view returns (uint256);

    // ----- history (for claims made) -----
    struct SlabClaimRec {
        uint32 dayId;
        uint32[] legIds; // legs involved in this claim batch (or single)
        uint8[] deltaPercents; // per-leg delta consumed in this tx
        uint256 usdTotal; // total credited after 4x clamp
        uint256 ramaTotal; // RAMA wei credited
        uint64 claimedAt; // block.timestamp
        uint32 epoch; // current periodId
    }
    function getSlabClaimHistoryCount(
        address user
    ) external view returns (uint256);
    function getSlabClaimHistorySlice(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (SlabClaimRec[] memory);

    // ----- helpers your view needs -----
    function latestFinalizedDayId() external view returns (uint32); // proxy to oracle.latestFinalizedDayId()
}

interface ISlabIncomeCoreLikeMinimal is ISlabIncomeCoreLike {} // aliasing

interface ICappingIncome4xView {
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

contract SlabIncomeView is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    ISlabIncomeCoreLikeMinimal public core;

    function initialize(address _core) external initializer {
        require(_core != address(0), "ZERO_CORE");
        __Ownable_init();
        __UUPSUpgradeable_init();
        core = ISlabIncomeCoreLikeMinimal(_core);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function setCore(address _core) external onlyOwner {
        require(_core != address(0), "ZERO_CORE");
        core = ISlabIncomeCoreLikeMinimal(_core);
    }

    uint256[50] private __gap;

    // ----------- MAIN: preview since last claim, with pagination -----------
    /// @notice Precompute unclaimed slab income across periods since last claim.
    /// @dev Paginates periods with (offset, value). Legs are auto-fetched.
    function previewUnclaimedSlab_UsingCap(
        address user,
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
            uint32[] memory epochsCountByLeg, // length = legs.length
            uint32 latestDayIdUsed,
            uint256 usdTotal,
            uint256 ramaTotal,
            uint256 user4xBeforeUSD6,
            uint256 user4xAfterUSD6
        )
    {
        IUserRegistry U = IUserRegistry(address(core.users()));
        require(U.isRegistered(user), "NOT_REGISTERED");
        require(!U.isTempDeactive(user), "DEACTIVE");

        uint32 curr = uint32(block.timestamp / core.epochSeconds());
        if (curr == 0) {
            return (
                1,
                0,
                0,
                0,
                0,
                new uint32[](0),
                new uint256[](0),
                new uint256[](0),
                new uint32[](0),
                0,
                0,
                0,
                0,
                0
            );
        }
        fromPeriod = _firstEligiblePeriod(user);
        uint32 prev = core.lastSlabClaimPeriod(user);
        if (prev != 0 && prev + 1 > fromPeriod) fromPeriod = prev + 1;

        toPeriod = curr - 1;
        if (toPeriod < fromPeriod) {
            (user4xBeforeUSD6, , ) = _user4xRoom(user);
            user4xAfterUSD6 = user4xBeforeUSD6;
            return (
                fromPeriod,
                toPeriod,
                0,
                0,
                0,
                new uint32[](0),
                new uint256[](0),
                new uint256[](0),
                new uint32[](0),
                0,
                0,
                0,
                user4xBeforeUSD6,
                user4xAfterUSD6
            );
        }

        totalEpochs = uint256(toPeriod) - uint256(fromPeriod) + 1;
        if (offset >= totalEpochs || value == 0) {
            (user4xBeforeUSD6, , ) = _user4xRoom(user);
            user4xAfterUSD6 = user4xBeforeUSD6;
            return (
                fromPeriod,
                toPeriod,
                0,
                0,
                totalEpochs,
                new uint32[](0),
                new uint256[](0),
                new uint256[](0),
                new uint32[](0),
                
                0,
                0,
                0,
                user4xBeforeUSD6,
                user4xAfterUSD6
            );
        }

        uint32[] memory legs = core.topo().legsOf(user);
        epochsCountByLeg = new uint32[](legs.length);

        // prescan 4x room
        (user4xBeforeUSD6, , ) = _user4xRoom(user);
        uint256 room4x = user4xBeforeUSD6;

        pageStartPeriod = uint32(uint256(fromPeriod) + offset);
        pageEndPeriod = pageStartPeriod + uint32(value) - 1;
        if (pageEndPeriod > toPeriod) pageEndPeriod = toPeriod;

        uint256 pageLen = uint256(pageEndPeriod) - uint256(pageStartPeriod) + 1;
        periodIds = new uint32[](pageLen);
        usdPerPeriod = new uint256[](pageLen);
        ramaPerPeriod = new uint256[](pageLen);

        uint32 latestFinDay = IPriceOracleDaily(address(core.oracle()))
            .latestFinalizedDayId();

        for (uint32 pr = pageStartPeriod; pr <= pageEndPeriod; pr++) {
            uint256 idx = uint256(pr - pageStartPeriod);
            periodIds[idx] = pr;

            // map period -> day
            uint32 dayId = _dayIdFromPeriod(pr);
            if (dayId > latestFinDay) {
                // use relaxed pricing fallback; accrual is per-day so we can still preview
            }
            latestDayIdUsed = dayId;

            // resolve user's slab for this day
            uint8 targetPct = core.slabPercentForDay(user, dayId);
            if (targetPct == 0) continue;

            // sum over legs
            uint256 usdSumDay;
            for (uint256 L = 0; L < legs.length; L++) {
                uint32 legId = legs[L];

                uint256 baseUSD6 = core.teamRoiUSD6(user, legId, dayId);
                if (baseUSD6 == 0) continue;

                // 36% leg pool
                uint256 pool36 = (baseUSD6 * 36) / 100;

                // ladder baseline
                uint8 paid = core.paidPercent(user, legId, dayId); // 0..60
                if (paid >= 60) continue;

                // delta we can consume today for this achiever
                uint8 capRem = uint8(60 - paid);
                uint8 wanted = (targetPct > paid)
                    ? uint8(targetPct - paid)
                    : uint8(0);
                if (wanted == 0) continue;

                uint8 delta = wanted > capRem ? capRem : wanted;

                // proportional amount out of pool36 by delta%
                uint256 grossUSD6 = (pool36 * delta) / 100;

                if (grossUSD6 == 0) continue;

                // check remaining 4x room (view-simulated)
                if (room4x == 0) break;
                uint256 take = grossUSD6 > room4x ? room4x : grossUSD6;

                // price for day
                uint256 px6 = _price6ForDayRelaxed(dayId);
                if (px6 == 0) continue;

                uint256 ramaWei = (take * 1e18) / px6;

                usdSumDay += take;
                ramaPerPeriod[idx] += ramaWei;
                epochsCountByLeg[L] += 1;

                room4x -= take;
                if (room4x == 0) break;
            }

            usdPerPeriod[idx] = usdSumDay;
            usdTotal += usdSumDay;
        }

        // final price-sum is already tallied in ramaPerPeriod
        for (uint256 i = 0; i < ramaPerPeriod.length; i++) {
            ramaTotal += ramaPerPeriod[i];
        }
        user4xAfterUSD6 = room4x;
    }

    // ----------- helpers -----------
    function _firstEligiblePeriod(address user) internal view returns (uint32) {
        // For slabs we start from the day the user had at least one leg (or registration time).
        // To keep parity with ROI view, we can simply allow from = currentPeriod - 1 by default.
        uint32 currentPeriod = uint32(block.timestamp / core.epochSeconds());
        if (currentPeriod == 0) return 0;
        return currentPeriod - 1;
    }

    function _dayIdFromPeriod(uint32 periodId) internal view returns (uint32) {
        uint256 periodStartTs = uint256(periodId) *
            uint256(core.epochSeconds());
        return uint32(periodStartTs / 1 days);
    }

    function _price6ForDayRelaxed(
        uint32 dayId
    ) internal view returns (uint256) {
        IPriceOracleDaily o = IPriceOracleDaily(address(core.oracle()));
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

    function _user4xRoom(
        address user
    ) internal view returns (uint256 room, uint256 th, uint256 earned) {
        ICappingIncome4xView C = ICappingIncome4xView(
            core.cfg().cappingIncomeManager()
        );
        (th, , earned) = C.next4xThresholdUSD6(user);
        room = th > earned ? (th - earned) : 0;
    }
}
