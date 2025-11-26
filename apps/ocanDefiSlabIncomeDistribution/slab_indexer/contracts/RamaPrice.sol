// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

contract ROPDYPrice is
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    // ============ Storage ============
    uint256 public ramaPriceInUSD; // price of 1 RAMA in micro-USD (1e6)
    uint256 private constant USD_DECIMALS = 1e6;
    uint256 private constant TOKEN_DECIMALS = 1e18;

    event RamaPriceUpdated(uint256 newPrice);

    // ============ Init ============
    function initialize(uint256 _initialRamaPriceUSD) public initializer {
        __Ownable_init(); // if using OZ v5 with initialOwner: use __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        // __PausableUpgradeable_init();
        __ReentrancyGuard_init();

        require(
            _initialRamaPriceUSD > 0,
            "Initial price must be greater than 0"
        );
        ramaPriceInUSD = _initialRamaPriceUSD;
    }

    // ============ Admin ============
    function setRamaPrice(uint256 _price) external onlyOwner {
        require(_price > 0, "Price must be greater than zero");
        ramaPriceInUSD = _price;
        emit RamaPriceUpdated(_price);
    }

    // ============ Views ============
    function usdToRama(uint256 usdAmount) public view returns (uint256) {
        require(ramaPriceInUSD > 0, "RAMA price not set");
        // usdAmount is in micro-USD (1e6). Convert to RAMA (1e18)
        return (usdAmount * TOKEN_DECIMALS) / ramaPriceInUSD;
    }

    function ramaToUSD(uint256 ramaAmount) public view returns (uint256) {
        require(ramaPriceInUSD > 0, "RAMA price not set");
        // ramaAmount is in 1e18. Result is micro-USD (1e6)
        return (ramaAmount * ramaPriceInUSD) / TOKEN_DECIMALS;
    }

    function getReadableRamaPrice()
        external
        view
        returns (uint256 dollars, uint256 microCents)
    {
        dollars = ramaPriceInUSD / USD_DECIMALS;
        microCents = ramaPriceInUSD % USD_DECIMALS;
    }

    // ============ UUPS auth ============
    function _authorizeUpgrade(address) internal override onlyOwner {}

    // ============ Storage gap ============
    uint256[50] private __gap;
}
