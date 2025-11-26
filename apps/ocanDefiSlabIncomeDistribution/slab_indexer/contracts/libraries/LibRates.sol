// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title LibRates
/// @notice Daily ROI rates (parts per million per day)
library LibRates {
    // Per-day rates
    uint256 internal constant RATE_NORMAL_TIER0_PPM = 3300; // 0.33%/day
    uint256 internal constant RATE_BOOST_TIER0_PPM  = 6600; // 0.66%/day
    uint256 internal constant RATE_NORMAL_TIER1_PPM = 4000; // 0.40%/day
    uint256 internal constant RATE_BOOST_TIER1_PPM  = 8000; // 0.80%/day

    /// @notice Convert a per-day rate (ppm/day) into per-second (ppm/second * 1e6 scale)
    function perSecond(uint256 ppmPerDay) internal pure returns (uint256) {
        // 1 day = 86400 seconds
        return (ppmPerDay * 1e6) / 86400;
    }
}
