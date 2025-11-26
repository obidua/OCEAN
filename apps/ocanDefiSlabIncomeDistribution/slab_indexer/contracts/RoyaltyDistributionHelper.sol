// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/ICoreConfig.sol";

interface IRoyaltyManagerLite {
    function recordEntitlementFromDistributor(address user, uint64 monthId, uint8 minStageIdx) external;
}
interface ISlabManagerRoyaltyViewLite {
    function getAchievers(uint8 kind, uint8 stage, uint256 offset, uint256 limit) external view returns (address[] memory out);
}

contract RoyaltyDistributionHelper {
    ICoreConfig public cfg;

    constructor(address _cfg) {
        cfg = ICoreConfig(_cfg);
    }

    modifier onlyAdmin() {
        require(msg.sender == cfg.adminControl(), "NOT_ADMIN");
        _;
    }

    function distributeRoyaltyForStage(
        address royaltyManager,
        uint64 monthId,
        uint8 stageIdx,
        uint256 offset,
        uint256 limit
    ) external onlyAdmin {
        address[] memory achievers = ISlabManagerRoyaltyViewLite(cfg.slabManager()).getAchievers(2, stageIdx, offset, limit);
        for (uint256 i = 0; i < achievers.length; i++) {
            address u = achievers[i];
            if (u == address(0)) continue;
            IRoyaltyManagerLite(royaltyManager).recordEntitlementFromDistributor(u, monthId, stageIdx);
        }
    }

    function distributeRoyaltyAllStages(
        address royaltyManager,
        uint64 monthId,
        uint256 offset,
        uint256 limit
    ) external onlyAdmin {
        // caller should know tier count; loop a safe upper bound on client side
        for (uint8 s = 0; s < 32; s++) {
            // attempt per stage; if no achievers returned, continue
            address[] memory achievers = ISlabManagerRoyaltyViewLite(cfg.slabManager()).getAchievers(2, s, offset, limit);
            if (achievers.length == 0) continue;
            for (uint256 i = 0; i < achievers.length; i++) {
                address u = achievers[i];
                if (u == address(0)) continue;
                IRoyaltyManagerLite(royaltyManager).recordEntitlementFromDistributor(u, monthId, s);
            }
        }
    }

    function distributeRoyaltyManual(
        address royaltyManager,
        uint64 monthId,
        uint8 stageIdx,
        address[] calldata users_
    ) external onlyAdmin {
        for (uint256 i = 0; i < users_.length; i++) {
            address u = users_[i];
            if (u == address(0)) continue;
            IRoyaltyManagerLite(royaltyManager).recordEntitlementFromDistributor(u, monthId, stageIdx);
        }
    }
}

