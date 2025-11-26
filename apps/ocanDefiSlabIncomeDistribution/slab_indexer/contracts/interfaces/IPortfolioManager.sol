// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPortfolioManager {
    struct Portfolio {
        uint128 principal; // RAMA amount staked (wei)
        uint128 principalUsd; // USD value at creation (1e18 WAD)  <-- NEW
        uint128 credited; // RAMA growth credited so far (wei) (legacy; keep if used elsewhere)
        uint64 createdAt;
        uint64 lastAccrual;
        uint64 frozenUntil;
        bool booster;
        uint8 tier; // 0: $10–$5000 ; 1: $5010+
        uint8 capPct; // 200 or 250
        address owner;
        address activatedBy; // NEW
        uint64 boosterActivationDate;
        bool isCapped;
        bool isClosed;
        uint256 cappedAt;
        uint256 closedAt;
        uint256 totalReceivedBoosterROI;
        bool isActivatedFromSafeWallet; // NEW
    }

    event PortfolioCreated(
        address indexed user,
        uint256 indexed pid,
        uint256 principal,
        uint8 tier
    );
    event BoosterActivated(address indexed user);
    event Accrued(address indexed user, uint256 indexed pid, uint256 amount);
    event ExitApplied(
        address indexed user,
        uint256 indexed pid,
        uint256 exitAt
    );
    event ExitCancelled(address indexed user, uint256 indexed pid);

    // function accrue(uint256 pid) external returns (uint256 creditedNow);
    function applyExit(uint256 pid) external;
    function cancelExit(uint256 pid) external;
    function getPortfolio(uint256 pid) external view returns (Portfolio memory);
    /// NEW: USD principal fixed at creation time (1e18 WAD)
    function getUSDPrincipal(uint256 pid) external view returns (uint256);
    /// Used by SlabManager claim gate

    function hasActiveMin50(address user) external view returns (bool);
    function portfoliosOf(
        address user
    ) external view returns (uint256[] memory);

    struct FreezeInterval {
        uint32 startDay;
        uint32 endDay;
    } // endDay inclusive; 0 = open

    function getFreezeIntervalsCount(
        uint256 pid
    ) external view returns (uint256);
    function getFreezeIntervalsSlice(
        uint256 pid,
        uint256 offset,
        uint256 limit
    ) external view returns (FreezeInterval[] memory);
}
