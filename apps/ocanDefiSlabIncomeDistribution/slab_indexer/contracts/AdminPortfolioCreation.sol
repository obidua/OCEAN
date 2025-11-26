// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

/* ---------- Oracle interface (same surface as your ROIDistributor) ---------- */
interface IPriceOracleDaily {
    function getLatestPrice6() external view returns (uint256); // 1e6 price
    function latestFinalizedDayId() external view returns (uint32);
    function getPrice6ForDay(uint32 dayId) external view returns (uint256);
    function getRaw(
        uint32 dayId
    ) external view returns (uint256 priceWad, bool isSet, uint256 updatedAt);
}

/**
 * @title AdminOnlyROIWithOracleAndWallet
 * @notice Admin-only user/portfolio registry with ROI accrual & claim using PriceOracleDaily.
 *         - Only admin can register users, create portfolios, and close portfolios.
 *         - Principals in micro-USD (USD6). No directs/slab/royalty/booster/freeze.
 *         - Claim converts USD6 -> RAMA-wei via oracle.getLatestPrice6() and credits an internal wallet.
 *         - Users can deposit RAMA into the contract and withdraw their wallet balance.
 *         - Reentrancy protected for all state-changing money paths.
 */
contract AdminSpecialPortfoliosCreator is
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    /* ===================== Users ===================== */
    struct UserInfo {
        bool registered;
        uint32 id;
        address referrer; // stored for reference; not used for incomes
        uint64 createdAt;
    }

    mapping(address => UserInfo) private users;
    mapping(uint32 => address) public idToAddress;
    uint32 public lastUserId;
    address public root;

    event UserRegistered(
        address indexed user,
        address indexed referrer,
        uint32 id
    );

    /* ===================== Portfolios ===================== */
    struct Portfolio {
        uint128 principalUsd6; // micro-USD (1e6)
        uint64 createdAt;
        uint16 capPct; // e.g. 200 => 2x
        uint128 paidUsd6; // cumulative paid
        bool isClosed; // true = inactive; no ROI
        address owner;
    }

    Portfolio[] internal portfolios; // pid -> Portfolio (pid starts at 1)
    mapping(address => uint256[]) private _portfoliosOf;

    event PortfolioCreated(
        address indexed user,
        uint256 indexed pid,
        uint256 principalUsd6,
        uint16 capPct
    );
    event PortfolioClosed(uint256 indexed pid, address indexed user);

    /* ===================== Oracle + Epochs ===================== */
    IPriceOracleDaily public oracle; // external price oracle

    uint32 public epochSeconds; // default: 1 day
    uint256 public dailyRateWad; // e.g., 33e14 = 0.33% per epoch
    uint32 public maxPeriodsPerClaim; // gas guard

    // per-user ROI state
    mapping(address => uint32) public lastClaimPeriod; // inclusive periodId
    mapping(address => uint256) public totalClaimedUsd6; // lifetime USD6
    mapping(address => uint256) public totalClaimedRama; // lifetime RAMA wei
    mapping(address => uint32) public userClaimEpoch;

    struct ClaimRec {
        uint32 fromPeriod;
        uint32 toPeriod;
        uint256 usdTotal; // USD6
        uint256 ramaTotal; // wei
        uint64 claimedAt;
        uint32 epoch;
    }
    mapping(address => ClaimRec[]) internal _history;

    event ClaimedROI(
        address indexed user,
        uint32 indexed fromPeriod,
        uint32 indexed toPeriod,
        uint256 usdTotal, // USD6
        uint256 ramaTotal, // wei
        uint32 epoch
    );

    /* ===================== Wallet (deposits/withdrawals) ===================== */
    mapping(address => uint256) public walletBalance; // RAMA-wei

    event Deposited(address indexed user, uint256 amountWei);
    event Withdrawn(address indexed user, uint256 amountWei);

    receive() external payable {
        // accept plain transfers; don’t credit automatically
    }

    fallback() external payable {
        // accept fallback
    }

    /// @notice Add funds to user's wallet balance.
    function deposit() external payable nonReentrant {
        require(msg.value > 0, "ZERO_VALUE");
        walletBalance[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    /// @notice Withdraw RAMA from user's wallet balance.
    function withdraw(uint256 amountWei) external nonReentrant {
        require(amountWei > 0, "ZERO_VALUE");
        uint256 bal = walletBalance[msg.sender];
        require(bal >= amountWei, "INSUFFICIENT_BAL");
        walletBalance[msg.sender] = bal - amountWei;

        (bool ok, ) = msg.sender.call{value: amountWei}("");
        require(ok, "WITHDRAW_FAIL");
        emit Withdrawn(msg.sender, amountWei);
    }

    /// @notice Owner can top up the contract without crediting any user.
    function ownerFund() external payable onlyOwner {
        require(msg.value > 0, "ZERO_VALUE");
    }

    /* ===================== Init / Upgrade ===================== */
    function initialize(address _oracle) external initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        require(_oracle != address(0), "ZERO_ORACLE");
        oracle = IPriceOracleDaily(_oracle);

        root = msg.sender;
        require(root != address(0), "ZERO_ROOT");

        // bootstrap root as ID=1
        users[root] = UserInfo({
            registered: true,
            id: 1,
            referrer: address(0),
            createdAt: uint64(block.timestamp)
        });
        idToAddress[1] = root;
        lastUserId = 1;
        emit UserRegistered(root, address(0), 1);

        // pid 0 dummy
        portfolios.push();

        // defaults
        epochSeconds = 1 days;
        dailyRateWad = 33e14; // 0.33% per epoch
        maxPeriodsPerClaim = 90; // cap epochs per tx
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    /* ===================== Admin Setters ===================== */
    function setOracle(address a) external onlyOwner {
        require(a != address(0), "ZERO_ORACLE");
        oracle = IPriceOracleDaily(a);
    }

    function setEpochSeconds(uint32 secs) external onlyOwner {
        require(secs >= 60 && secs <= 7 days, "EPOCH_RANGE");
        epochSeconds = secs;
    }

    function setDailyRateWad(uint256 rateWad) external onlyOwner {
        require(rateWad > 0, "BAD_RATE");
        dailyRateWad = rateWad;
    }

    function setMaxPeriodsPerClaim(uint32 maxPeriods) external onlyOwner {
        require(maxPeriods >= 1 && maxPeriods <= 3650, "MAX_RANGE");
        maxPeriodsPerClaim = maxPeriods;
    }

    /* ===================== Admin Actions ===================== */

    /// @notice Admin registers a user (stores optional referrer but unused for incomes).
    function adminRegisterUser(
        address user,
        address referrer
    ) public onlyOwner returns (uint32 newId) {
        require(user != address(0), "ZERO_USER");
        require(!users[user].registered, "ALREADY_REGISTERED");
        if (referrer != address(0)) {
            require(users[referrer].registered, "INVALID_REFERRER");
            require(referrer != user, "SELF_REFERRAL");
        }

        newId = ++lastUserId;
        users[user] = UserInfo({
            registered: true,
            id: newId,
            referrer: referrer,
            createdAt: uint64(block.timestamp)
        });
        idToAddress[newId] = user;
        emit UserRegistered(user, referrer, newId);
    }

    /**
     * @param user Registered user (auto-registers if not registered).
     * @param principalUsd6 Principal in micro-USD (1e6).
     * @param capPct Portfolio cap percent (0 -> default 200).
     */
    function adminCreatePortfolio(
        address user,
        uint256 principalUsd6,
        uint16 capPct
    ) external onlyOwner returns (uint256 pid) {
        require(user != address(0), "ZERO_USER");
        if (!users[user].registered) {
            adminRegisterUser(user, address(0));
        }
        require(principalUsd6 > 0, "ZERO_PRINCIPAL");
        uint16 cap = capPct == 0 ? 200 : capPct;

        Portfolio memory p = Portfolio({
            principalUsd6: uint128(principalUsd6),
            createdAt: uint64(block.timestamp),
            capPct: cap,
            paidUsd6: 0,
            isClosed: false,
            owner: user
        });

        portfolios.push(p);
        pid = portfolios.length - 1;
        _portfoliosOf[user].push(pid);

        emit PortfolioCreated(user, pid, principalUsd6, cap);
    }

    /// @notice Admin can close (deactivate) a portfolio immediately: no further ROI.
    function adminClosePortfolio(uint256 pid) external onlyOwner {
        require(pid > 0 && pid < portfolios.length, "BAD_PID");
        Portfolio storage p = portfolios[pid];
        require(!p.isClosed, "ALREADY_CLOSED");
        p.isClosed = true;
        emit PortfolioClosed(pid, p.owner);
    }

    /* ===================== Basic Views ===================== */
    function getUser(address user) external view returns (UserInfo memory) {
        return users[user];
    }
    function isRegistered(address user) external view returns (bool) {
        return users[user].registered;
    }
    function portfoliosOf(
        address user
    ) external view returns (uint256[] memory) {
        return _portfoliosOf[user];
    }
    function getPortfolio(
        uint256 pid
    ) external view returns (Portfolio memory) {
        return portfolios[pid];
    }

    /* ===================== Epoch Helpers ===================== */
    function _nowPeriod() internal view returns (uint32) {
        return uint32(block.timestamp / epochSeconds);
    }
    function _latestClaimablePeriod() internal view returns (uint32) {
        uint32 cur = _nowPeriod();
        if (cur == 0) return 0;
        return cur - 1;
    }
    function _firstEligiblePeriod(address user) internal view returns (uint32) {
        uint256[] memory pids = _portfoliosOf[user];
        if (pids.length == 0) return _latestClaimablePeriod();
        uint256 tmin = type(uint256).max;
        for (uint256 i = 0; i < pids.length; i++) {
            Portfolio memory p = portfolios[pids[i]];
            if (p.owner != user) continue;
            if (p.createdAt < tmin) tmin = p.createdAt;
        }
        if (tmin == type(uint256).max) return _latestClaimablePeriod();
        return uint32(tmin / epochSeconds) + 1; // first full epoch after creation
    }
    function _autoWindow(
        address user
    ) internal view returns (uint32 fromPeriod, uint32 toPeriod) {
        uint32 latest = _latestClaimablePeriod();
        if (latest == 0) return (1, 0);
        uint32 prev = lastClaimPeriod[user];
        fromPeriod = (prev == 0) ? _firstEligiblePeriod(user) : (prev + 1);
        toPeriod = latest;
    }

    /* ===================== ROI Math ===================== */
    function _portfolioEpochUsdRaw(
        Portfolio memory p
    ) internal view returns (uint256) {
        if (p.principalUsd6 == 0) return 0;
        return (uint256(p.principalUsd6) * dailyRateWad) / 1e18; // USD6
    }
    function _remainingCapUsd6(uint256 pid) internal view returns (uint256) {
        Portfolio memory p = portfolios[pid];
        uint256 cap = (uint256(p.principalUsd6) * uint256(p.capPct)) / 100;
        if (p.paidUsd6 >= cap) return 0;
        return cap - p.paidUsd6;
    }

    /* ---------- Oracle helpers (matching ROIDistributor usage) ---------- */
    function _price6Latest() internal view returns (uint256) {
        return oracle.getLatestPrice6(); // 1e6
    }
    function _dayIdFromPeriod(uint32 periodId) internal view returns (uint32) {
        uint256 periodStartTs = uint256(periodId) * uint256(epochSeconds);
        return uint32(periodStartTs / 1 days);
    }
    function _price6ForDayRelaxed(
        uint32 dayId
    ) internal view returns (uint256) {
        uint32 latestFin = oracle.latestFinalizedDayId();
        if (dayId <= latestFin) return oracle.getPrice6ForDay(dayId);
        (uint256 pWad, bool isSet, ) = oracle.getRaw(dayId);
        if (isSet && pWad > 0) return pWad / 1e12; // 1e18 -> 1e6
        for (uint32 d = dayId; d > 0; d--) {
            (pWad, isSet, ) = oracle.getRaw(d - 1);
            if (isSet && pWad > 0) return pWad / 1e12;
        }
        return 0;
    }

    /* ===================== Previews ===================== */
    function getUnclaimedROI(
        address user
    )
        external
        view
        returns (
            uint256 usdTotal, // USD6
            uint256 ramaTotal, // wei (using latest price, like claim())
            uint32 fromPeriod,
            uint32 toPeriod,
            uint32 epochsCount
        )
    {
        require(users[user].registered, "NOT_REGISTERED");
        (fromPeriod, toPeriod) = _autoWindow(user);
        if (toPeriod < fromPeriod) return (0, 0, fromPeriod, toPeriod, 0);

        uint256[] memory pids = _portfoliosOf[user];
        uint256 px6 = _price6Latest();
        if (px6 == 0) return (0, 0, fromPeriod, toPeriod, 0);

        for (uint32 pr = fromPeriod; pr <= toPeriod; pr++) {
            uint256 epochUsd;
            uint256 epochStartTs = uint256(pr) * uint256(epochSeconds);

            for (uint256 i = 0; i < pids.length; i++) {
                Portfolio memory p = portfolios[pids[i]];
                if (p.owner != user) continue;
                if (p.isClosed) continue;
                if (p.createdAt >= epochStartTs) continue;

                uint256 raw = _portfolioEpochUsdRaw(p);
                if (raw == 0) continue;

                uint256 rem = _remainingCapUsd6(pids[i]);
                if (rem == 0) continue;

                uint256 take = raw > rem ? rem : raw;
                epochUsd += take;
            }

            if (epochUsd > 0) {
                usdTotal += epochUsd;
                ramaTotal += (epochUsd * 1e18) / px6;
                epochsCount += 1;
            }
        }
    }

    // Optional relaxed preview (per day price)
    function getUnclaimedROI_RelaxedByDay(
        address user
    )
        external
        view
        returns (
            uint256 usdTotal,
            uint256 ramaTotal,
            uint32 fromPeriod,
            uint32 toPeriod,
            uint32 epochsCount
        )
    {
        require(users[user].registered, "NOT_REGISTERED");
        (fromPeriod, toPeriod) = _autoWindow(user);
        if (toPeriod < fromPeriod) return (0, 0, fromPeriod, toPeriod, 0);

        uint256[] memory pids = _portfoliosOf[user];

        for (uint32 pr = fromPeriod; pr <= toPeriod; pr++) {
            uint256 epochUsd;
            uint256 epochStartTs = uint256(pr) * uint256(epochSeconds);
            uint32 dayId = _dayIdFromPeriod(pr);
            uint256 px6 = _price6ForDayRelaxed(dayId);
            if (px6 == 0) continue;

            for (uint256 i = 0; i < pids.length; i++) {
                Portfolio memory p = portfolios[pids[i]];
                if (p.owner != user) continue;
                if (p.isClosed) continue;
                if (p.createdAt >= epochStartTs) continue;

                uint256 raw = _portfolioEpochUsdRaw(p);
                if (raw == 0) continue;

                uint256 rem = _remainingCapUsd6(pids[i]);
                if (rem == 0) continue;

                uint256 take = raw > rem ? rem : raw;
                epochUsd += take;
            }

            if (epochUsd > 0) {
                usdTotal += epochUsd;
                ramaTotal += (epochUsd * 1e18) / px6;
                epochsCount += 1;
            }
        }
    }

    /* ===================== Claim & Payout ===================== */

    /// @notice Claim ROI for msg.sender; credits their walletBalance with RAMA-wei.
    function claimROI() public nonReentrant {
        address user = msg.sender;
        require(users[user].registered, "NOT_REGISTERED");

        (uint32 fromPeriod, uint32 toPeriod) = _autoWindow(user);
        require(toPeriod >= fromPeriod, "NOTHING_TO_CLAIM");

        uint32 span = toPeriod - fromPeriod + 1;
        if (span > maxPeriodsPerClaim) {
            toPeriod = fromPeriod + maxPeriodsPerClaim - 1;
            span = maxPeriodsPerClaim;
        }

        uint256[] memory pids = _portfoliosOf[user];
        uint256 usdTotal;
        uint256 ramaTotal;

        uint256 px6 = _price6Latest(); // same strict latest as ROIDistributor
        require(px6 > 0, "PRICE_NOT_SET");

        for (uint32 pr = fromPeriod; pr <= toPeriod; pr++) {
            uint256 epochStartTs = uint256(pr) * uint256(epochSeconds);

            for (uint256 i = 0; i < pids.length; i++) {
                uint256 pid = pids[i];
                Portfolio storage ps = portfolios[pid];
                if (ps.owner != user) continue;
                if (ps.isClosed) continue;
                if (ps.createdAt >= epochStartTs) continue;

                uint256 raw = _portfolioEpochUsdRaw(ps); // USD6
                if (raw == 0) continue;

                // clamp to remaining cap
                uint256 cap = (uint256(ps.principalUsd6) * uint256(ps.capPct)) /
                    100;
                if (ps.paidUsd6 >= cap) {
                    ps.isClosed = true;
                    continue;
                }
                uint256 rem = cap - ps.paidUsd6;
                uint256 take = raw > rem ? rem : raw;
                if (take == 0) continue;

                // effects
                ps.paidUsd6 += uint128(take);
                usdTotal += take;
                uint256 ramaWei = (take * 1e18) / px6;
                ramaTotal += ramaWei;

                if (ps.paidUsd6 >= cap) {
                    ps.isClosed = true;
                }
            }
        }

        // update ledgers
        lastClaimPeriod[user] = toPeriod;
        totalClaimedUsd6[user] += usdTotal;
        totalClaimedRama[user] += ramaTotal;

        // credit internal wallet; user may withdraw anytime
        if (ramaTotal > 0) {
            walletBalance[user] += ramaTotal;
        }

        uint32 epoch = ++userClaimEpoch[user];
        _history[user].push(
            ClaimRec({
                fromPeriod: fromPeriod,
                toPeriod: toPeriod,
                usdTotal: usdTotal,
                ramaTotal: ramaTotal,
                claimedAt: uint64(block.timestamp),
                epoch: epoch
            })
        );

        emit ClaimedROI(user, fromPeriod, toPeriod, usdTotal, ramaTotal, epoch);
    }

    /// @notice Convenience: claim and immediately withdraw the newly credited amount.
    function claimROIAndWithdraw() external nonReentrant {
        uint256 balBefore = walletBalance[msg.sender];
        claimROI(); // credits walletBalance
        uint256 delta = walletBalance[msg.sender] - balBefore;
        if (delta == 0) return;

        walletBalance[msg.sender] = balBefore; // leave previous balance, pay only the new delta
        (bool ok, ) = msg.sender.call{value: delta}("");
        require(ok, "WITHDRAW_FAIL");
        emit Withdrawn(msg.sender, delta);
    }

    /* ===================== History views ===================== */
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
        for (uint256 i = offset; i < end; i++) {
            out[i - offset] = arr[i];
        }
    }
}
