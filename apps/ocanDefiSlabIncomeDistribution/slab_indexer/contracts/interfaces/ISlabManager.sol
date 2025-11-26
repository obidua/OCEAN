// SPDX-License-Identifier: MIT

pragma solidity ^0.8.26;

interface ISlabManager {
    // --- PM hooks ---
    function onBusinessDelta(
        address user,
        uint256 pid,
        int256 usdDelta
    ) external;
    function noteNew50Direct(address referrer) external;

    // --- Query ---
    function getSlabIndex(address user) external view returns (uint8);
    function canClaim(address user) external view returns (bool);

    // --- Merkle epochs ---
    function currentEpoch() external view returns (uint64);
    // function currentRoot() external view returns (bytes32);
    

    // --- Claim ---
    // function claimSlab(uint256 amount, bytes32[] calldata proof) external;

    function getQualifiedBusinessUSD(
        address user
    ) external view returns (uint256);

    // Extended views used by ComprehensiveView
    function getLegsTop2AndRest(
        address user
    ) external view returns (uint256 L1, uint256 L2, uint256 Lrest);
}
