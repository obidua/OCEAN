// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPriceOracleDaily {
    /// @notice RAMA/USD price with 1e18 decimals for a given dayId (UTC day number).
    /// @dev Reverts if the day is not finalized yet (i.e., before next UTC midnight).
    function getPriceWadForDay(uint32 dayId) external view returns (uint256);
    function getPrice6ForDay(uint32 dayId) external view returns (uint256);

    /// @notice Returns (priceWad, isSet, setAt).
    function getRaw(
        uint32 dayId
    ) external view returns (uint256 priceWad, bool isSet, uint64 setAt);

    /// @notice True if the day is finalized (current time >= startOf(next day)).
    function isFinalized(uint32 dayId) external view returns (bool);

    /// @notice Returns the current UTC dayId = uint32(block.timestamp / 1 days).
    function todayId() external view returns (uint32);

    /// @notice Returns the latest finalized UTC dayId (i.e., todayId()-1 if today has started).
    function latestFinalizedDayId() external view returns (uint32);

    /// @notice Most recently set price (6 decimals), regardless of day/finalization.
    /// @dev Reverts if no price has ever been set.
    function getLatestPrice6() external view returns (uint256);
    /// @notice Details of the most recent set: (dayId, price6, setAt). Reverts if none.
    function latestSet()
        external
        view
        returns (uint32 dayId, uint256 price6, uint64 setAt);
}
