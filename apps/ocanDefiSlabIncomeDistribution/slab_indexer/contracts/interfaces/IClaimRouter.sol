// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title IClaimRouter
/// @notice Interface for unified claim crediting across all income streams.
interface IClaimRouter {
    enum Bucket { SELF, DIRECT, SLAB, SAME_SLAB, ROYALTY, REWARD }

    /// @notice Credit a user’s claimable balance in a specific bucket.
    function credit(address user, Bucket bucket, uint256 usdMicro) external;
}
