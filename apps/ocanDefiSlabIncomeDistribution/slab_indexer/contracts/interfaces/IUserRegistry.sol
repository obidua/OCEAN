// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

interface IUserRegistry {
    struct UserInfo {
        bool registered;
        uint32 id;
        address referrer;
        uint32 directsCount;
        uint64 createdAt;
        bool isTempDeactive;
    }

    function getUser(address user) external view returns (UserInfo memory);
    function getId(address user) external view returns (uint32);
    function getReferrer(address user) external view returns (address);
    function registerUser(
        address referrer,
        address toBeRegisterdUser
    ) external returns (uint32);
    function isRegistered(address user) external view returns (bool);
    function getDirects(address user) external view returns (address[] memory);

    // Extended team/leg views used by ComprehensiveView
    function getLevelTeam(
        address user,
        uint8 level
    ) external view returns (address[] memory);

    function getLevelTeamCounts(
        address user,
        uint8 maxDepth
    ) external view returns (uint256[] memory counts);

    function isDirectLeg(
        address user,
        address leg
    ) external view returns (bool);

    function getLegSubtreeFlat(
        address user,
        address leg,
        uint8 maxDepth
    ) external view returns (address[] memory);

    function isTempDeactive(address user) external view returns (bool);

    function getTopLegs(address user) external view returns (address[] memory);

    // function getDirectsWithMinTotalPortfolio50(
    //     address user
    // ) external view returns (uint256);

    function getDirectsWithMinTotalPortfolio50(
        address user
    ) external view returns (uint32);
    // function directsOf(address who) external view returns (address[] memory);
}
