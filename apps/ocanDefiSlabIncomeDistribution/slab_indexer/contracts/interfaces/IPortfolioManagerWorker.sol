// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPortfolioManagerWorker {
    /// @notice Select which eligible pids should receive booster in the window.
    /// @param directSums       Per-direct business inside the window (micro-USD).
    /// @param eligiblePids     Candidate pids (already filtered to the window & owner).
    /// @param eligibleUsd      Micro-USD principal for each candidate pid (same order as eligiblePids).
    /// @param alreadyBoosted   Whether each candidate is already boosted in this window.
    /// @return selectedPids    PIDs that should be boosted now (subset of eligiblePids).
    /// @return capacityUSD     Last satisfied cumulative threshold Tw (micro-USD).
    /// @return sumSelectedUSD  Sum of micro-USD for selectedPids within the window.
    function selectBooster(
        uint256[] calldata directSums,
        uint256[] calldata eligiblePids,
        uint256[] calldata eligibleUsd,
        bool[] calldata alreadyBoosted
    )
        external
        pure
        returns (
            uint256[] memory selectedPids,
            uint256 capacityUSD,
            uint256 sumSelectedUSD
        );
}
