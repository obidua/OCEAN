// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title IRamaOracle
/// @notice Interface for Ramestta native price oracle (e.g., ROPDYPrice)
interface IRamaOracle {
    /// @notice Returns the readable breakdown of the current RAMA price in USD
    /// @return dollars Whole USD component
    /// @return microCents Fractional part in micro-cents (1e-6)
    function getReadableRamaPrice()
        external
        view
        returns (uint256 dollars, uint256 microCents);

    /// @notice Returns the current RAMA price in USD (1e6 precision)
    function ramaPriceInUSD() external view returns (uint256);

    /// @notice Converts RAMA amount to USD value
    /// @param ramaAmount RAMA amount (1e18)
    /// @return USD amount (1e6)
    function ramaToUSD(uint256 ramaAmount) external view returns (uint256);

    /// @notice Converts USD amount to RAMA amount
    /// @param usdAmount USD amount (1e6)
    /// @return RAMA amount (1e18)
    function usdToRama(uint256 usdAmount) external view returns (uint256);

    /// @notice Allows owner to update the RAMA price (onlyOwner)
    /// @param _price New price in USD (1e6)
    function setRamaPrice(uint256 _price) external;
}
