// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title ISlabManager
/// @notice Minimal interface for PortfolioManager to signal a new $50 direct.
interface ISlabManager {
    /// @dev Marks that `user` (the sponsor/referrer) has a new direct
    ///      with ≥ $50 portfolio since their last claim window.
    function noteNew50Direct(address user) external;
}
