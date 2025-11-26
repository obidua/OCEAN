// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import "./interfaces/ICoreConfig.sol";
import "./interfaces/IUserRegistry.sol";
import "./interfaces/ISlabManager.sol";
import "./interfaces/IPriceOracleDaily.sol";

contract SlabIncomeDistributor is 
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    ICoreConfig public cfg;
    
    // Compressed storage for daily ROI (1 slot)
    struct DailyROI {
        uint128 usdMicro;   // Micro-USD (1e6)
        uint128 ramaWei;    // RAMA wei (compressed: divide by 1e10)
    }
    
    // User's daily accrued ROI (populated by ROIDistributor)
    mapping(address => mapping(uint32 => DailyROI)) public userDailyAccruedROI;
    
    // Leg ROI cache: keccak256(legRoot, directChild, dayId) => totalROI
    mapping(bytes32 => uint256) public legROICache;
    
    // Distribution tracking per leg: keccak256(legRoot, directChild, dayId) => distributed BPS
    mapping(bytes32 => uint16) public legDistributedBPS; // basis points (0-6000 = 0-60%)
    
    // User claim checkpoint
    mapping(address => uint32) public lastClaimedDay;
    
    // Settled income (Method 2)
    mapping(address => mapping(uint32 => DailyROI)) public settledSlabIncome;
    mapping(address => mapping(uint32 => bool)) public isSettled;
    
    // Slab Override tracking
    mapping(address => mapping(uint32 => DailyROI)) public slabOverrideIncome;
    
    // Configuration
    uint8 public constant MAX_DAYS_PER_CLAIM = 30;
    uint8 public constant MAX_DEPTH = 50;
    uint256 public constant KEEPER_REWARD_BPS = 10; // 0.1%
    
    // Events
    event SlabIncomeClaimed(address indexed user, uint32 fromDay, uint32 toDay, uint256 usdAmount, uint256 ramaAmount);
    event DaySettled(address indexed user, uint32 day, uint256 usdAmount, uint256 ramaAmount, address keeper);
    event SlabOverridePaid(address indexed recipient, address indexed achiever, uint32 day, uint256 usdAmount, uint256 ramaAmount);
    
    function initialize(address _cfg) external initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        
        cfg = ICoreConfig(_cfg);
    }
    
    function _authorizeUpgrade(address) internal override onlyOwner {}
    
    // Your implementation methods go here...
    // (The detailed implementation from our previous discussion)
}