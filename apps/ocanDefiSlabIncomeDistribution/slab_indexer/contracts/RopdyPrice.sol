// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

contract ROPDYPrice is
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable
{
    uint256 public ramaPriceInUSD;
    uint256 public lastUpdatedPrice;
    uint256 private constant USD_DECIMALS = 1e6;
    uint256 private constant TOKEN_DECIMALS = 1e18;

    // Mapping to store daily random prices: day number => price
    mapping(uint256 => uint256) public dailyRandomPrice;

    event RamaPriceUpdated(uint256 newPrice);
    event DailyRandomPriceSet(uint256 day, uint256 price);

    function initialize(uint256 _initialRamaPriceUSD) public initializer {
        __Ownable_init();
        __ReentrancyGuard_init();
        __Pausable_init();

        require(
            _initialRamaPriceUSD > 0,
            "Initial price must be greater than 0"
        );
        ramaPriceInUSD = _initialRamaPriceUSD;
        lastUpdatedPrice = _initialRamaPriceUSD;
    }

    function setRamaPrice(uint256 _price) external onlyOwner {
        require(_price > 0, "Price must be greater than zero");
        ramaPriceInUSD = _price;
        emit RamaPriceUpdated(_price);
    }

    function setRamaPriceWithRandom(
        uint256 _price,
        bool _setAsRandomDaily
    ) external onlyOwner {
        require(_price > 0, "Price must be greater than zero");

        lastUpdatedPrice = ramaPriceInUSD;
        ramaPriceInUSD = _price;

        // if (_setAsRandomDaily) {
        //     uint256 currentDay = block.timestamp / 1 days;
        //     dailyRandomPrice[currentDay] = _price;

        //     emit DailyRandomPriceSet(currentDay, _price);
        // }

        if (_setAsRandomDaily) {
            uint256 currentDay = block.timestamp / 1 days;
            // enforce only once per day

            if ((dailyRandomPrice[currentDay] == 0)) {
                dailyRandomPrice[currentDay] = _price;
                emit DailyRandomPriceSet(currentDay, _price);
            }
            // require(dailyRandomPrice[currentDay] == 0, "Daily random price already set");
        }

        emit RamaPriceUpdated(_price);
    }

    function usdToRama(uint256 usdAmount) public view returns (uint256) {
        require(ramaPriceInUSD > 0, "RAMA price not set");
        return (usdAmount * TOKEN_DECIMALS) / ramaPriceInUSD;
    }

    function ramaToUSD(uint256 ramaAmount) public view returns (uint256) {
        require(ramaPriceInUSD > 0, "RAMA price not set");
        return (ramaAmount * ramaPriceInUSD) / TOKEN_DECIMALS; //10e18 * 1000000/1e18
    }

    function getReadableRamaPrice()
        external
        view
        returns (uint256 dollars, uint256 microCents)
    {
        dollars = ramaPriceInUSD / USD_DECIMALS;
        microCents = ramaPriceInUSD % USD_DECIMALS;
    }

    function getLastUpdatedPrice() external view returns (uint256) {
        return lastUpdatedPrice;
    }

    function getDailyRandomPrice(uint256 _day) external view returns (uint256) {
        return dailyRandomPrice[_day];
    }

    function getTodayRandomPrice() external view returns (uint256) {
        uint256 currentDay = block.timestamp / 1 days;
        return dailyRandomPrice[currentDay];
    }

    function getCurrentDayNumber() external view returns (uint256) {
        return block.timestamp / 1 days;
    }
}
