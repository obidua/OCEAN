// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "./interfaces/ICoreConfig.sol";
import "./interfaces/ISafeWallet.sol";
import "./interfaces/IPortfolioManager.sol";
import "./interfaces/IRamaOracle.sol";

interface IUserRegistry {
    function isTempDeactive(address user) external view returns (bool);
}

/// @title RewardVault
/// @notice One-time (lifetime) milestone rewards with full tracking and views.
contract RewardVault is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    ICoreConfig public cfg;

    // user => milestoneIdx => claimed
    mapping(address => mapping(uint8 => bool)) public claimed;

    // Milestone tables (USD values are 1e18 WAD)
    uint256[] public milestoneThresholdsUSD; // e.g., 6k, 15k, 40k, ...
    uint256[] public milestoneRewardsUSD; // e.g., 100, 250, 500, ...

    // Lifetime totals per user (for fast dashboards)
    mapping(address => uint256) public totalRewardUsd; // 1e18 WAD
    mapping(address => uint256) public totalRewardRama; // wei

    // Detailed claim ledger
    struct RewardClaim {
        uint8 milestoneIdx;
        uint256 usdReward; // 1e18 WAD (from table at time of grant)
        uint256 ramaAmount; // wei (converted using oracle price at grant)
        uint256 qualifiedUsdAt; // 1e18 WAD (the T used to qualify at grant time)
        uint64 timestamp; // block.timestamp
    }
    mapping(address => RewardClaim[]) private _claims;
    // Pending rewards for users without an eligible open (not capped) portfolio
    struct PendingReward {
        uint256 usdReward;
        uint256 ramaAmount;
        uint256 qualifiedUsdAt;
        bool exists;
    }
    mapping(address => mapping(uint8 => PendingReward)) public pendingRewards; // user => milestone => pending

    event RewardPending(
        address indexed user,
        uint8 indexed milestone,
        uint256 usdReward,
        uint256 qualifiedUsdAt
    );

    event RewardGranted(
        address indexed user,
        uint8 indexed milestone,
        uint256 ramaAmount
    );
    event RewardGrantedDetailed(
        address indexed user,
        uint8 indexed milestone,
        uint256 usdReward,
        uint256 ramaAmount,
        uint256 qualifiedUsdAt,
        uint64 timestamp
    );

    /* ----------------------------- Init / Upgrade ----------------------------- */

    function initialize(address _cfg) external initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        cfg = ICoreConfig(_cfg);

        // 14 milestones (USD 1e18 units)
        milestoneThresholdsUSD = new uint256[](15);
        milestoneRewardsUSD = new uint256[](15);

        // Team Volume  -> Reward (USD)
        milestoneThresholdsUSD[0] = 6_000e6;
        milestoneRewardsUSD[0] = 100e6;

        milestoneThresholdsUSD[1] = 15_000e6;
        milestoneRewardsUSD[1] = 250e6;

        milestoneThresholdsUSD[2] = 40_000e6;
        milestoneRewardsUSD[2] = 500e6;

        milestoneThresholdsUSD[3] = 60_000e6;
        milestoneRewardsUSD[3] = 750e6;

        milestoneThresholdsUSD[4] = 120_000e6;
        milestoneRewardsUSD[4] = 1000e6;

        milestoneThresholdsUSD[5] = 300_000e6;
        milestoneRewardsUSD[5] = 2500e6;

        milestoneThresholdsUSD[6] = 600_000e6;
        milestoneRewardsUSD[6] = 5000e6;

        milestoneThresholdsUSD[7] = 1_500_000e6;
        milestoneRewardsUSD[7] = 8000e6;

        milestoneThresholdsUSD[8] = 3_000_000e6;
        milestoneRewardsUSD[8] = 12000e6;

        milestoneThresholdsUSD[9] = 6_000_000e6;
        milestoneRewardsUSD[9] = 30000e6;

        milestoneThresholdsUSD[10] = 15_000_000e6;
        milestoneRewardsUSD[10] = 50000e6;

        milestoneThresholdsUSD[11] = 30_000_000e6;
        milestoneRewardsUSD[11] = 85000e6;

        milestoneThresholdsUSD[12] = 60_000_000e6;
        milestoneRewardsUSD[12] = 150000e6;

        milestoneThresholdsUSD[13] = 200_000_000e6;
        milestoneRewardsUSD[13] = 500000e6;

        milestoneThresholdsUSD[14] = 500_000_000e6;
        milestoneRewardsUSD[14] = 1500000e6;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    /* --------------------------------- Admin --------------------------------- */

    /// @notice Owner can update a milestone table entry (optional admin hook).
    function setMilestone(
        uint8 idx,
        uint256 thresholdUsd,
        uint256 rewardUsd
    ) external onlyOwner {
        require(idx < milestoneThresholdsUSD.length, "IDX_OOB");
        milestoneThresholdsUSD[idx] = thresholdUsd;
        milestoneRewardsUSD[idx] = rewardUsd;
    }

    /// @notice Owner replace entire tables (must be same length for both arrays).
    function setMilestones(
        uint256[] calldata thresholdsUsd,
        uint256[] calldata rewardsUsd
    ) external onlyOwner {
        require(thresholdsUsd.length == rewardsUsd.length, "LEN_MISMATCH");
        milestoneThresholdsUSD = thresholdsUsd;
        milestoneRewardsUSD = rewardsUsd;
    }

    /* ------------------------------ Manual Grant ----------------------------- */

    /// @notice Admin/manual grant a specific milestone in RAMA.
    function grant(
        address user,
        uint8 milestoneIdx,
        uint256 ramaAmount
    ) external {
        require(
            msg.sender == cfg.adminControl() || msg.sender == owner(),
            "NOT_AUTH"
        );
        require(!claimed[user][milestoneIdx], "ALREADY");
        claimed[user][milestoneIdx] = true;

        // credit RAMA
        // (bool ok, ) = cfg.mainWallet().call(
        //     abi.encodeWithSignature(
        //         "creditReward(address,uint256)",
        //         user,
        //         ramaAmount
        //     )
        // );
        // require(ok, "MAIN_CREDIT_FAIL");

        // record (USD unknown in manual grant; store 0)
        _claims[user].push(
            RewardClaim({
                milestoneIdx: milestoneIdx,
                usdReward: 0,
                ramaAmount: ramaAmount,
                qualifiedUsdAt: 0,
                timestamp: uint64(block.timestamp)
            })
        );
        totalRewardRama[user] += ramaAmount;

        emit RewardGranted(user, milestoneIdx, ramaAmount);
        emit RewardGrantedDetailed(
            user,
            milestoneIdx,
            0,
            ramaAmount,
            0,
            uint64(block.timestamp)
        );
    }

    function checkAndCredit(
        address user,
        uint256 pid,
        uint256 qualifiedUsd
    ) external {
        require(
            msg.sender == cfg.slabManager() ||
                msg.sender == cfg.adminControl() ||
                msg.sender == cfg.cappingIncomeManager() ||
                msg.sender == owner(),
            "NOT_AUTH"
        );

        if (IUserRegistry(cfg.userRegistry()).isTempDeactive(user)) return;

        if (qualifiedUsd == 0) return;

        bool canTransfer = _hasOpenNotCapped(user);

        // Pull USD/RAMA price from oracle (micro-USD 1e6 per 1 RAMA)
        (bool okP, bytes memory data) = cfg.priceOracle().staticcall(
            abi.encodeWithSignature("ramaPriceInUSD()")
        );

        // require(okP && data.length >= 32, "ORACLE_FAIL");
        uint256 priceMicroUSD = abi.decode(data, (uint256));
        require(priceMicroUSD > 0, "BAD_PRICE");

        if (!canTransfer) {
            uint256 lennew = milestoneThresholdsUSD.length;

            for (uint8 i = 0; i < lennew; i++) {
                if (
                    !claimed[user][i] &&
                    qualifiedUsd >= milestoneThresholdsUSD[i]
                ) {
                    if (!pendingRewards[user][i].exists) {
                        uint256 usdReward = milestoneRewardsUSD[i]; // 1e18 WAD
                        // Price is micro-USD per RAMA (1e6). Convert USD(1e18) -> RAMA wei:
                        // uint256 ramaAmount = (usdReward * 1e6) / priceMicroUSD;

                        uint256 ramaAmount = IRamaOracle(cfg.priceOracle())
                            .usdToRama(usdReward);
                        pendingRewards[user][i] = PendingReward({
                            usdReward: milestoneRewardsUSD[i],
                            ramaAmount: ramaAmount,
                            qualifiedUsdAt: qualifiedUsd,
                            exists: true
                        });
                        emit RewardPending(
                            user,
                            i,
                            milestoneRewardsUSD[i],
                            qualifiedUsd
                        );
                    }
                }
            }
            return;
        }

        uint256 len = milestoneThresholdsUSD.length;
        for (uint8 i = 0; i < len; i++) {
            if (
                !claimed[user][i] && qualifiedUsd >= milestoneThresholdsUSD[i]
            ) {
                if (canTransfer) {
                    uint256 usdReward = milestoneRewardsUSD[i]; // 1e18 WAD
                    // Price is micro-USD per RAMA (1e6). Convert USD(1e18) -> RAMA wei:
                    // uint256 ramaAmount = (usdReward * 1e6) / priceMicroUSD;

                    uint256 ramaAmount = IRamaOracle(cfg.priceOracle())
                        .usdToRama(usdReward);

                    claimed[user][i] = true;

                    ISafeWallet(cfg.safeWallet()).creditGeneral(
                        user,
                        ISafeWallet.TxKind.Reward,
                        milestoneRewardsUSD[i], // 1e18 USD, if you want to log it
                        ramaAmount, // RAMA wei
                        bytes32(uint256(i)) // memo: milestone index
                    );

                    // ledger
                    _claims[user].push(
                        RewardClaim({
                            milestoneIdx: i,
                            usdReward: usdReward,
                            ramaAmount: ramaAmount,
                            qualifiedUsdAt: qualifiedUsd,
                            timestamp: uint64(block.timestamp)
                        })
                    );
                    totalRewardUsd[user] += usdReward;
                    totalRewardRama[user] += ramaAmount;

                    emit RewardGranted(user, i, ramaAmount);
                    emit RewardGrantedDetailed(
                        user,
                        i,
                        usdReward,
                        ramaAmount,
                        qualifiedUsd,
                        uint64(block.timestamp)
                    );
                }
            }
        }
    }

    function releaseHeldRewards() external {
        address user = msg.sender;
        require(getPendingRewardTotalUSD(user) > 0, "NO_PENDING");

        require(_hasOpenNotCapped(user), "NO_OPEN");

        // requi

        (bool okP, bytes memory data) = cfg.priceOracle().staticcall(
            abi.encodeWithSignature("ramaPriceInUSD()")
        );
        require(okP && data.length >= 32, "ORACLE_FAIL");
        uint256 priceMicroUSD = abi.decode(data, (uint256));
        require(priceMicroUSD > 0, "BAD_PRICE");

        uint256 len = milestoneThresholdsUSD.length;
        for (uint8 i = 0; i < len; i++) {
            PendingReward storage pr = pendingRewards[user][i];
            if (pr.exists && !claimed[user][i]) {
                uint256 usdReward = pr.usdReward;
                // uint256 ramaAmount = (usdReward * 1e6) / priceMicroUSD;
                uint256 ramaAmount = IRamaOracle(cfg.priceOracle()).usdToRama(
                    usdReward
                );
                claimed[user][i] = true;
                ISafeWallet(cfg.safeWallet()).creditGeneral(
                    user,
                    ISafeWallet.TxKind.Reward,
                    usdReward,
                    ramaAmount,
                    bytes32(uint256(i))
                );
                _claims[user].push(
                    RewardClaim({
                        milestoneIdx: i,
                        usdReward: usdReward,
                        ramaAmount: ramaAmount,
                        qualifiedUsdAt: pr.qualifiedUsdAt,
                        timestamp: uint64(block.timestamp)
                    })
                );
                totalRewardUsd[user] += usdReward;
                totalRewardRama[user] += ramaAmount;
                delete pendingRewards[user][i];
                emit RewardGranted(user, i, ramaAmount);
                emit RewardGrantedDetailed(
                    user,
                    i,
                    usdReward,
                    ramaAmount,
                    pr.qualifiedUsdAt,
                    uint64(block.timestamp)
                );
            }
        }
    }

    function _hasOpenNotCapped(address user) internal view returns (bool) {
        IPortfolioManager pm = IPortfolioManager(cfg.portfolioManager());

        uint256[] memory pids = pm.portfoliosOf(user);
        for (uint256 i = 0; i < pids.length; i++) {
            IPortfolioManager.Portfolio memory p = pm.getPortfolio(pids[i]);
            if (!p.isClosed && !p.isCapped) return true;
        }
        return false;
    }
    /* --------------------------------- Views --------------------------------- */

    /// @notice Milestone table size.
    function milestonesCount() external view returns (uint256) {
        return milestoneThresholdsUSD.length;
    }

    /// @notice Get one milestone (thresholdUSD, rewardUSD).
    function getMilestone(
        uint8 idx
    ) external view returns (uint256 thresholdUsd, uint256 rewardUsd) {
        require(idx < milestoneThresholdsUSD.length, "IDX_OOB");
        return (milestoneThresholdsUSD[idx], milestoneRewardsUSD[idx]);
    }

    /// @notice Full tables (return copies).
    function getAllMilestones()
        external
        view
        returns (uint256[] memory thresholdsUsd, uint256[] memory rewardsUsd)
    {
        return (milestoneThresholdsUSD, milestoneRewardsUSD);
    }

    /// @notice Has the user already claimed this milestone?
    function isMilestoneClaimed(
        address user,
        uint8 idx
    ) external view returns (bool) {
        return claimed[user][idx];
    }

    /// @notice For UI: full claimed/unclaimed status array for a user.
    function getUserMilestoneStatus(
        address user
    ) external view returns (bool[] memory status) {
        uint256 n = milestoneThresholdsUSD.length;
        status = new bool[](n);
        for (uint256 i = 0; i < n; i++) status[i] = claimed[user][uint8(i)];
    }

    /// @notice User lifetime totals (USD WAD, RAMA wei).
    function getUserTotals(
        address user
    ) external view returns (uint256 usdTotal, uint256 ramaTotal) {
        return (totalRewardUsd[user], totalRewardRama[user]);
    }

    /// @notice # of detailed claims for user.
    function getUserClaimsCount(address user) external view returns (uint256) {
        return _claims[user].length;
    }

    /// @notice Get one claim record by index.
    function getUserClaimByIndex(
        address user,
        uint256 idx
    ) external view returns (RewardClaim memory rec) {
        require(idx < _claims[user].length, "OOB");
        return _claims[user][idx];
    }
    /// @notice Sum of all pending reward USD amounts for a user.
    /// @dev Returns the raw USD unit used in milestoneRewardsUSD/pendingRewards (same units as stored).
    function getPendingRewardTotalUSD(
        address user
    ) public view returns (uint256 usdTotal) {
        uint256 len = milestoneThresholdsUSD.length;
        for (uint8 i = 0; i < len; i++) {
            PendingReward storage pr = pendingRewards[user][i];
            if (pr.exists && !claimed[user][i]) {
                usdTotal += pr.usdReward;
            }
        }
    }

    /// @notice Paginated claims slice [offset, offset+limit).
    function getUserClaimsSlice(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (RewardClaim[] memory out) {
        RewardClaim[] storage arr = _claims[user];
        uint256 n = arr.length;
        if (offset >= n) return new RewardClaim[](0);

        uint256 end = offset + limit;
        if (end > n) end = n;

        out = new RewardClaim[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            out[i - offset] = arr[i];
        }
    }

    /// @notice Preview which milestones would be credited at a given qualifiedUsd (without changing state).
    /// @dev Returns indexes and the USD reward for each unclaimed-but-eligible milestone.
    function previewEligible(
        address user,
        uint256 qualifiedUsd
    ) external view returns (uint8[] memory idxs, uint256[] memory usdRewards) {
        uint256 len = milestoneThresholdsUSD.length;
        // first pass: count
        uint256 c;
        for (uint8 i = 0; i < len; i++) {
            if (!claimed[user][i] && qualifiedUsd >= milestoneThresholdsUSD[i])
                c++;
        }
        idxs = new uint8[](c);
        usdRewards = new uint256[](c);

        // second pass: fill
        uint256 k;
        for (uint8 i = 0; i < len; i++) {
            if (
                !claimed[user][i] && qualifiedUsd >= milestoneThresholdsUSD[i]
            ) {
                idxs[k] = i;
                usdRewards[k] = milestoneRewardsUSD[i];
                k++;
            }
        }
    }

    /// @notice Sum of all pending reward RAMA amounts for a user (wei).
    /// @dev Mirrors getPendingRewardTotalUSD but sums `ramaAmount`.
    function getPendingRewardTotalRAMA(
        address user
    ) public view returns (uint256 ramaTotal) {
        uint256 len = milestoneThresholdsUSD.length;
        for (uint8 i = 0; i < len; i++) {
            PendingReward storage pr = pendingRewards[user][i];
            if (pr.exists && !claimed[user][i]) {
                ramaTotal += pr.ramaAmount;
            }
        }
    }

    /// @notice Totals of rewards currently held due to cap/no open portfolio.
    /// @dev Returns both USD (same units as table) and RAMA (wei) aggregates.
    function getHeldFundsDueToCap(
        address user
    ) external view returns (uint256 usdTotal, uint256 ramaTotal) {
        usdTotal = getPendingRewardTotalUSD(user);
        ramaTotal = getPendingRewardTotalRAMA(user);
    }
}
