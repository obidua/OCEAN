# Royalty Claim Implementation Notes

## Overview
The royalty claim functionality has been implemented in the Ocean DeFi dashboard with the following components:

### Store Methods (useUserInfoStore.js)

1. **`getRoyaltyClaimHistory(userAddress, limit)`**
   - Fetches claim history from `RoyaltyPaid` events emitted by the RoyaltyManager contract
   - Scans the last ~100,000 blocks for user-specific events
   - Returns array of history items with: monthEpoch, tier, tierName, amountUsd, amountRama, claimedAt, txHash
   - Falls back to empty array if events cannot be fetched

2. **`claimRoyaltyReward(fromAddress, monthId, amountRama, amountInUSD, tierIdx, proof)`**
   - Builds an unsigned transaction for `RoyaltyManager.claimRoyalty()`
   - Performs gas estimation and validation
   - **Important:** Requires Merkle proof parameter (see below)

### UI Integration (RoyaltyProgram.jsx)

- Replaced mocked claim history with real event-based data
- Wired `handleClaimRoyalty` to build actual claim transactions
- Integrated with `ProgressiveTransactionModal` for transaction flow
- Added proper loading states and error handling

## ⚠️ Merkle Proof Requirement

### The Challenge
The `RoyaltyManager.claimRoyalty()` function requires a Merkle proof parameter:

```solidity
function claimRoyalty(
    uint64 monthId,
    uint256 amountRama,
    uint256 amountInUSD,
    uint8 tierIdx,
    bytes32[] memory proof  // <-- Required Merkle proof
) external;
```

### Current Implementation
The current implementation passes an **empty proof array** as a placeholder:

```javascript
const proof = []; // Placeholder: replace with actual Merkle proof from backend
```

**This will cause the transaction to fail** unless:
1. The contract allows empty proofs (unlikely for security reasons)
2. A backend API is integrated to generate valid proofs

### Recommended Solutions

#### Option 1: Backend API Integration (Recommended)
Create a backend endpoint that:
1. Receives user address and monthId
2. Fetches user's claim data from contract/database
3. Generates Merkle proof using the monthly Merkle tree
4. Returns proof array to frontend

Example integration:
```javascript
// In handleClaimRoyalty:
const response = await fetch(`/api/royalty/proof?user=${connectedAddress}&month=${monthId}`);
const { proof } = await response.json();

const tx = await claimRoyaltyReward(
    connectedAddress,
    monthId,
    amountRama,
    amountInUSD,
    tierIdx,
    proof  // <-- Real proof from backend
);
```

#### Option 2: Off-chain Script
- Create a script that generates proofs locally
- Store proofs in a JSON file or database
- Load proofs at runtime from static data

#### Option 3: Contract Modification (Not Recommended)
- Modify RoyaltyManager to allow direct claims without proofs
- Less secure, requires contract redeployment

### Merkle Tree Structure
The RoyaltyManager uses a Merkle tree approach where:
- Each month has a unique Merkle root (set by admin via `setRoyaltyRoot()`)
- Each eligible user's claim is a leaf node
- Users must provide a valid proof path from their leaf to the root
- This prevents unauthorized claims and reduces gas costs

### Event: RoyaltyRootSet
Monitor this event to know when new monthly roots are published:
```solidity
event RoyaltyRootSet(uint64 indexed monthId, bytes32 root);
```

## Testing Without Proofs

For development/testing purposes, you can:

1. **Check if claim is ready**: Use `getRoyaltyOverview` to see if `canClaim` is true
2. **Simulate gas estimation failure**: The current code will catch gas estimation errors and show: "Gas estimation failed. The claim may not be valid or proof may be incorrect."
3. **Test history display**: The history fetching works independently of claims

## Next Steps

To make royalty claims fully functional:

1. **Set up proof generation**:
   - Backend API (recommended)
   - Or off-chain script with static data

2. **Update handleClaimRoyalty**:
   - Replace `const proof = []` with actual proof fetch
   - Add error handling for proof generation failures

3. **Test with valid proofs**:
   - Verify gas estimation succeeds
   - Complete full transaction flow
   - Confirm new RoyaltyPaid events are emitted

## Files Modified

- `apps/dashboard/store/useUserInfoStore.js`: Added getRoyaltyClaimHistory, claimRoyaltyReward, ROYALTY_TIER_NAMES
- `apps/dashboard/src/pages/RoyaltyProgram.jsx`: Replaced mocked history with real data, implemented claim button

## Contract Details

- **RoyaltyManager**: `0xd52Ae0c81ED2bb4A91b62686d8A8426E6Dd686C5`
- **Network**: Ramestta (RPC: https://blockchain.ramestta.com)
- **Key Methods**:
  - `claimRoyalty()`: Claim pending royalty (requires proof)
  - `royalty(address)`: Get user's royalty state
  - `pendingRoyalty(address, uint64)`: Check pending claim for specific month
  - `getTier(uint8)`: Get tier metadata
- **Events**:
  - `RoyaltyPaid(address indexed user, uint64 indexed monthId, uint8 tierIdx, uint256 ramaAmount)`
  - `RoyaltyRootSet(uint64 indexed monthId, bytes32 root)`
