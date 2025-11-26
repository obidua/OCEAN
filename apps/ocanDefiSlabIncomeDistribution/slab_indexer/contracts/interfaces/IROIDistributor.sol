// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IROIDistributor {
    struct ClaimRec {
        uint32 fromDay; // inclusive
        uint32 toDay; // inclusive
        uint256 usdTotal; // 1e18 WAD
        uint256 ramaTotal; // wei
        uint64 claimedAt; // ts
        uint32 epoch; // claim index for this user
    }

    function previewClaim(
        address user,
        uint32 toDay
    )
        external
        view
        returns (
            uint32 fromDay,
            uint32 lastDay,
            uint256 usdTotal,
            uint256 ramaTotal,
            uint256 daysCount
        );

    function claimROI(uint32 toDay, uint32 maxDays) external;

    function getLastClaimedDay(address user) external view returns (uint32);
    function getTotalsClaimed(
        address user
    ) external view returns (uint256 usdTotal, uint256 ramaTotal);
    function getClaimHistoryCount(address user) external view returns (uint256);
    function getClaimHistorySlice(
        address user,
        uint256 offset,
        uint256 limit
    ) external view returns (ClaimRec[] memory);

    // Dynamic per-day rows (computed from portfolios + price oracle)
    function perDayPreview(
        address user,
        uint32 fromDay,
        uint32 toDay
    )
        external
        view
        returns (
            uint32[] memory dayIds,
            uint256[] memory usdPerDay,
            uint256[] memory ramaPerDay
        );
}
