// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title IRamaOracle
/// @notice Interface for Ramestta native price oracle (0xA7EC…F6C)
interface IRamaOracle {
    function getReadableRamaPrice() external view returns (uint256 dollars, uint256 microCents);
    function ramaPriceInUSD() external view returns (uint256);
    function ramaToUSD(uint256 ramaAmount) external view returns (uint256);
    function usdToRama(uint256 usdAmount) external view returns (uint256);
}
