// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "./interfaces/ICoreConfig.sol";

// New interface to expose forced leg (kept tiny)
interface IAdminControlExt {
    function forcedFortyLegOf(address user) external view returns (address);
    function slabPolicy() external view returns (address); // optional
}

contract AdminControl is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    ICoreConfig public cfg;

    struct Bypass {
        bool full;
        bool legA;
        bool legB;
        bool legC;
        bool slab;
        bool royalty;
        bool rewards;
    }
    mapping(address => Bypass) public bypasses;

    mapping(address => bool) public superUser;
    mapping(address => uint8) public superUserSlab;

    // ========== NEW: Admin-designated 40% leg per user ==========
    // For a given user (upline), admin can mark ONE first-hop child as the "forced 40% leg".
    //  - Qualif logic treats this as ACHIEVED 40% for all thresholds
    //  - Its volume is EXCLUDED from that user's upline hierarchy accounting
    // mapping(address => address) private _forcedFortyLegOf; // user => leg (first-hop child)

    // In AdminControl (append-only storage)
    mapping(address => address) private _forcedFortyLegOf; // user => first-hop child
    address private _slabPolicy; // optional external policy module

    // event ForcedFortyLegSet(address indexed user, address indexed leg);
    // event ForcedFortyLegCleared(address indexed user);

    event BypassSet(address indexed user, Bypass bp);
    event SuperUserSet(address indexed user, bool enabled, uint8 slab);

    // NEW events
    event ForcedFortyLegSet(address indexed user, address indexed leg);
    event ForcedFortyLegCleared(address indexed user);
    event SlabPolicySet(address indexed policy);

    function initialize(address _cfg) external initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        cfg = ICoreConfig(_cfg);
    }

    function setBypass(address user, Bypass calldata bp) external onlyOwner {
        bypasses[user] = bp;
        emit BypassSet(user, bp);
    }

    function setSuperUser(
        address user,
        bool enabled,
        uint8 slab
    ) external onlyOwner {
        superUser[user] = enabled;
        superUserSlab[user] = slab;
        emit SuperUserSet(user, enabled, slab);
    }

    // ========== NEW: setters/getters for forced 40% leg ==========
    function setForcedFortyLeg(address user, address leg) external onlyOwner {
        // 'leg' must be a *first-hop child* of 'user' for the effect to make sense;
        // we don't enforce that here to stay generic — SlabManager will only honor
        // it when the leg is indeed a first-hop child.
        _forcedFortyLegOf[user] = leg;
        emit ForcedFortyLegSet(user, leg);
    }

    function clearForcedFortyLeg(address user) external onlyOwner {
        delete _forcedFortyLegOf[user];
        emit ForcedFortyLegCleared(user);
    }

    function forcedFortyLegOf(address user) external view returns (address) {
        return _forcedFortyLegOf[user];
    }

    function setSlabPolicy(address policy) external onlyOwner {
        _slabPolicy = policy;
        emit SlabPolicySet(policy);
    }
    function slabPolicy() external view returns (address) {
        return _slabPolicy;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
