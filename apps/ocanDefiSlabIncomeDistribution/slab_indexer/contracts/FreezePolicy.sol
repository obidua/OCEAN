// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/ICoreConfig.sol";

contract FreezePolicy is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    ICoreConfig public cfg;

    event Frozen(address indexed user, uint256 indexed pid);
    event Unfrozen(address indexed user, uint256 indexed pid);

    function initialize(address _cfg) external initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        cfg = ICoreConfig(_cfg);
    }

    function onFreeze(address user, uint256 pid) external {
        require(msg.sender == cfg.portfolioManager(), "NOT_PM");
        emit Frozen(user, pid);

        // Here: exclude portfolio from upline business calculations

        

    }

    function onUnfreeze(address user, uint256 pid) external {
        require(msg.sender == cfg.portfolioManager(), "NOT_PM");
        emit Unfrozen(user, pid);
        // Here: restore business counting from the moment of unfreeze
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
