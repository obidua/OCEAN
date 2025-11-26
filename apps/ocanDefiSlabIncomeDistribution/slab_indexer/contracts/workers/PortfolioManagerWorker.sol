// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IPortfolioManagerWorker.sol";

contract PortfolioManagerWorker is IPortfolioManagerWorker {
    function selectBooster(
        uint256[] calldata directSums,
        uint256[] calldata eligiblePids,
        uint256[] calldata eligibleUsd,
        bool[] calldata alreadyBoosted
    )
        external
        pure
        returns (
            uint256[] memory selectedPids,
            uint256 capacityUSD,
            uint256 sumSelectedUSD
        )
    {
        uint256 n = eligibleUsd.length;
        require(
            eligiblePids.length == n && alreadyBoosted.length == n,
            "LEN_MISMATCH"
        );

        if (n == 0) {
            return (new uint256[](0), 0, 0);
        }

        // Make mutable copies for in-place sort (ascending by USD)
        uint256[] memory usd = new uint256[](n);
        uint256[] memory pid = new uint256[](n);
        bool[] memory boosted = new bool[](n);
        for (uint256 i = 0; i < n; i++) {
            usd[i] = eligibleUsd[i];
            pid[i] = eligiblePids[i];
            boosted[i] = alreadyBoosted[i];
        }

        // Insertion sort ASC by usd
        for (uint256 i = 1; i < n; i++) {
            uint256 ku = usd[i];
            uint256 kp = pid[i];
            bool kb = boosted[i];
            uint256 j = i;
            while (j > 0 && usd[j - 1] > ku) {
                usd[j] = usd[j - 1];
                pid[j] = pid[j - 1];
                boosted[j] = boosted[j - 1];
                j--;
            }
            usd[j] = ku;
            pid[j] = kp;
            boosted[j] = kb;
        }

        // Cumulative thresholds Tw[k] = sum_{0..k} usd[i]
        uint256[] memory T = new uint256[](n);
        for (uint256 i = 0; i < n; i++) {
            T[i] = (i == 0) ? usd[0] : (T[i - 1] + usd[i]);
        }

        // Check each candidate k (ascending). Pick if ALL directs meet Tw[k] and not already boosted.
        uint256[] memory sel = new uint256[](n);
        uint256 selN = 0;

        for (uint256 k = 0; k < n; k++) {
            if (boosted[k]) continue; // skip ones already boosted
            uint256 need = T[k];
            bool ok = true;
            for (uint256 d = 0; d < directSums.length; d++) {
                if (directSums[d] < need) {
                    ok = false;
                    break;
                }
            }
            if (ok) {
                sel[selN++] = pid[k];
            }
        }

        // Trim
        assembly {
            mstore(sel, selN)
        }

        // Compute sumSelectedUSD and capacityUSD (last Tw for which selected pid exists).
        if (selN > 0) {
            // sumSelectedUSD
            for (uint256 x = 0; x < selN; x++) {
                uint256 spid = sel[x];
                for (uint256 y = 0; y < n; y++) {
                    if (pid[y] == spid) {
                        sumSelectedUSD += usd[y];
                    }
                }
            }

            // capacityUSD = last T[y] where pid[y] is selected
            for (uint256 y = 0; y < n; y++) {
                // running cumulative T[y] already in T
                bool picked = false;
                for (uint256 x = 0; x < selN; x++) {
                    if (sel[x] == pid[y]) {
                        picked = true;
                        break;
                    }
                }
                if (picked) capacityUSD = T[y];
            }
        }

        return (sel, capacityUSD, sumSelectedUSD);
    }
}
