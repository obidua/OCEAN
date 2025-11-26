// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title LibUnits
/// @notice Global constants for currency precision used across OCEAN DeFi.
library LibUnits {
    /// @dev Protocol USD unit (1e6 = $1.00)
    uint256 internal constant USD_MICRO = 1e6;

    /// @dev Native RAMA precision (1e18)
    uint256 internal constant RAMA_DECIMALS = 1e18;
}
