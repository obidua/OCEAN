# Dual Merkle Tree System for Slab Income Distribution

## Table of Contents
- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Why Separate Trees?](#why-separate-trees)
- [Admin Workflow](#admin-workflow)
- [User Claiming Workflow](#user-claiming-workflow)
- [API Endpoints](#api-endpoints)
- [Smart Contract Functions](#smart-contract-functions)
- [Frontend Integration](#frontend-integration)
- [Gas Comparison](#gas-comparison)
- [Technical Details](#technical-details)

---

## Overview

The **Dual Merkle Tree System** separates slab income into two distinct types:

1. **Slab Differential Income** - Earnings from (Your Slab % - Member's Slab %) × Member's Considerable ROI
2. **Override Income** - Bonus earnings (10%, 5%, 5%) when downline reaches your slab level

### Key Benefits

✅ **Transparent Breakdown** - Users can see exactly how much they earn from each income type
✅ **Flexible Claiming** - Claim slab only, override only, or both in one transaction
✅ **Gas Efficient** - Separate trees maintain the same 99.95% gas savings
✅ **Independent Tracking** - Track and verify each income source separately on-chain
✅ **Backward Compatible** - Old combined tree system still supported

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       ADMIN (Daily)                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Calculate Slab Income      2. Calculate Override Income│
│     (Differential only)            (10%, 5%, 5% only)      │
│           │                              │                 │
│           ▼                              ▼                 │
│     ┌──────────┐                   ┌──────────┐           │
│     │ SLAB TREE│                   │OVERRIDE  │           │
│     │  (1000   │                   │ TREE     │           │
│     │achievers)│                   │ (500     │           │
│     └──────────┘                   │achievers)│           │
│           │                         └──────────┘           │
│           │                              │                 │
│           ▼                              ▼                 │
│     0x123abc...                    0x789def...            │
│    (Slab Root)                   (Override Root)          │
│           │                              │                 │
│           └──────────────┬───────────────┘                │
│                          ▼                                 │
│              setBothMerkleRoots(day, slabRoot, overRoot)  │
│                    (ONE transaction)                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      USERS (Claiming)                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Option 1: Claim Slab Only                                 │
│    GET /api/slab-merkle/proof-slab/{address}/{day}        │
│    → claimSlabWithProof(day, amount, proof)                │
│    Gas: ~60K-80K                                            │
│                                                             │
│  Option 2: Claim Override Only                             │
│    GET /api/slab-merkle/proof-override/{address}/{day}    │
│    → claimOverrideWithProof(day, amount, proof)            │
│    Gas: ~60K-80K                                            │
│                                                             │
│  Option 3: Claim Both (RECOMMENDED) ⭐                     │
│    GET /api/slab-merkle/proof-both/{address}/{day}        │
│    → claimBothWithProof(day, slab, override, proof1, proof2)│
│    Gas: ~80K-120K                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Why Separate Trees?

### Before: Combined System
```solidity
// Single tree, single amount
claimWithProof(dayId, totalAmount, ramaAmount, proof)
```

**Problem**: Users couldn't see breakdown of slab vs override income

### After: Dual Tree System
```solidity
// Separate trees, separate amounts, transparent breakdown
claimSlabWithProof(dayId, slabAmount, slabProof)
claimOverrideWithProof(dayId, overrideAmount, overrideProof)
claimBothWithProof(dayId, slabAmount, overrideAmount, slabProof, overrideProof) // ⭐ Recommended
```

**Benefits**:
- ✅ See exact slab differential income
- ✅ See exact override income (10%, 5%, 5%)
- ✅ Verify calculations independently
- ✅ Claim them separately if needed
- ✅ Transparent on-chain tracking

---

## Admin Workflow

### Daily Tasks

#### 1. Generate Dual Merkle Trees

```bash
# Generate trees for a single day
python backend/admin_generate_merkle_tree.py --day 150 --price 50000000

# Output:
# ┌─────────────────────────────────────────┐
# │ Creating SLAB Merkle tree...            │
# │   Slab Root: 0x123abc...                │
# │   Saved to: ./merkle_trees/day_150_slab.json │
# │                                         │
# │ Creating OVERRIDE Merkle tree...        │
# │   Override Root: 0x789def...            │
# │   Saved to: ./merkle_trees/day_150_override.json │
# └─────────────────────────────────────────┘
```

#### 2. Publish to Blockchain

```bash
# Generate and publish both roots in ONE transaction
python backend/admin_generate_merkle_tree.py --day 150 --publish

# Batch processing (multiple days)
python backend/admin_generate_merkle_tree.py --from-day 100 --to-day 150 --publish
```

#### 3. Verify Published Roots

```bash
# Check if roots are set on-chain
cast call $CONTRACT_ADDRESS "getSlabMerkleRoot(uint32)" 150
cast call $CONTRACT_ADDRESS "getOverrideMerkleRoot(uint32)" 150
cast call $CONTRACT_ADDRESS "getBothMerkleRoots(uint32)" 150
```

### Generated Files Structure

```
merkle_trees/
├── day_150_slab.json         # Slab differential income tree
├── day_150_override.json     # Override income tree
├── day_151_slab.json
├── day_151_override.json
└── ...
```

**Example `day_150_slab.json`:**
```json
{
  "day_id": 150,
  "income_type": "slab",
  "merkle_root": "0x123abc...",
  "total_achievers": 1000,
  "leaves": [
    {
      "user_address": "0x742d35Cc...",
      "day_id": 150,
      "amount": 5000000000,  // $5000 in micro USD
      "leaf_hash": "0xdef456..."
    },
    ...
  ]
}
```

---

## User Claiming Workflow

### Option 1: Claim Slab Income Only

**Use Case**: User only wants to claim slab differential income

```javascript
// Frontend: Fetch slab proof
const response = await fetch(`/api/slab-merkle/proof-slab/${userAddress}/150`);
const proof = await response.json();

console.log(proof);
// {
//   "user_address": "0x742d35Cc...",
//   "day_id": 150,
//   "amount": "5000000000",  // $5000
//   "income_type": "slab",
//   "merkle_proof": ["0xabc...", "0xdef..."],
//   "merkle_root": "0x123abc..."
// }

// Smart Contract: Claim
await contract.claimSlabWithProof(
  proof.day_id,
  proof.amount,
  proof.merkle_proof
);

// Gas: ~60K-80K
```

### Option 2: Claim Override Income Only

**Use Case**: User only wants to claim override income

```javascript
// Frontend: Fetch override proof
const response = await fetch(`/api/slab-merkle/proof-override/${userAddress}/150`);
const proof = await response.json();

console.log(proof);
// {
//   "user_address": "0x742d35Cc...",
//   "day_id": 150,
//   "amount": "1000000000",  // $1000
//   "income_type": "override",
//   "merkle_proof": ["0x789...", "0x012..."],
//   "merkle_root": "0x789def..."
// }

// Smart Contract: Claim
await contract.claimOverrideWithProof(
  proof.day_id,
  proof.amount,
  proof.merkle_proof
);

// Gas: ~60K-80K
```

### Option 3: Claim Both (RECOMMENDED) ⭐

**Use Case**: User wants to claim both types in one transaction (most gas efficient)

```javascript
// Frontend: Fetch both proofs
const response = await fetch(`/api/slab-merkle/proof-both/${userAddress}/150`);
const data = await response.json();

console.log(data);
// {
//   "user_address": "0x742d35Cc...",
//   "day_id": 150,
//   "slab": {
//     "amount": "5000000000",
//     "merkle_proof": ["0xabc...", "0xdef..."],
//     "merkle_root": "0x123abc..."
//   },
//   "override": {
//     "amount": "1000000000",
//     "merkle_proof": ["0x789...", "0x012..."],
//     "merkle_root": "0x789def..."
//   },
//   "total_amount": "6000000000"  // $6000 total
// }

// Smart Contract: Claim both in ONE transaction
await contract.claimBothWithProof(
  data.day_id,
  data.slab.amount,           // Slab amount
  data.override.amount,        // Override amount
  data.slab.merkle_proof,     // Slab proof
  data.override.merkle_proof  // Override proof
);

// Gas: ~80K-120K (cheaper than 2 separate transactions!)
```

---

## API Endpoints

### Get Slab Proof
```
GET /api/slab-merkle/proof-slab/{user_address}/{day_id}
```

**Response:**
```json
{
  "user_address": "0x...",
  "day_id": 150,
  "amount": "5000000000",
  "income_type": "slab",
  "merkle_proof": ["0xabc...", "0xdef..."],
  "merkle_root": "0x123..."
}
```

### Get Override Proof
```
GET /api/slab-merkle/proof-override/{user_address}/{day_id}
```

**Response:**
```json
{
  "user_address": "0x...",
  "day_id": 150,
  "amount": "1000000000",
  "income_type": "override",
  "merkle_proof": ["0x789...", "0x012..."],
  "merkle_root": "0x789..."
}
```

### Get Both Proofs (Recommended)
```
GET /api/slab-merkle/proof-both/{user_address}/{day_id}
```

**Response:**
```json
{
  "user_address": "0x...",
  "day_id": 150,
  "slab": {
    "amount": "5000000000",
    "merkle_proof": [...],
    "merkle_root": "0x123..."
  },
  "override": {
    "amount": "1000000000",
    "merkle_proof": [...],
    "merkle_root": "0x789..."
  },
  "total_amount": "6000000000"
}
```

### Check Merkle Roots
```
GET /api/slab-merkle/merkle-root/{day_id}
```

---

## Smart Contract Functions

### User Functions

#### 1. `claimSlabWithProof()`
```solidity
function claimSlabWithProof(
    uint32 dayId,
    uint256 slabAmount,
    bytes32[] calldata merkleProof
) external nonReentrant
```

**Gas**: ~60K-80K
**Use**: Claim slab differential income only

#### 2. `claimOverrideWithProof()`
```solidity
function claimOverrideWithProof(
    uint32 dayId,
    uint256 overrideAmount,
    bytes32[] calldata merkleProof
) external nonReentrant
```

**Gas**: ~60K-80K
**Use**: Claim override income only

#### 3. `claimBothWithProof()` ⭐ RECOMMENDED
```solidity
function claimBothWithProof(
    uint32 dayId,
    uint256 slabAmount,
    uint256 overrideAmount,
    bytes32[] calldata slabMerkleProof,
    bytes32[] calldata overrideMerkleProof
) external nonReentrant
```

**Gas**: ~80K-120K
**Use**: Claim both types in one transaction (most efficient)

### Admin Functions

#### 1. `setSlabMerkleRoot()`
```solidity
function setSlabMerkleRoot(uint32 dayId, bytes32 merkleRoot) external onlyOwner
```

#### 2. `setOverrideMerkleRoot()`
```solidity
function setOverrideMerkleRoot(uint32 dayId, bytes32 merkleRoot) external onlyOwner
```

#### 3. `setBothMerkleRoots()` ⭐ RECOMMENDED
```solidity
function setBothMerkleRoots(
    uint32 dayId,
    bytes32 slabMerkleRoot,
    bytes32 overrideMerkleRoot
) external onlyOwner
```

**Use**: Set both roots in ONE transaction (saves gas)

#### 4. `setBatchBothMerkleRoots()`
```solidity
function setBatchBothMerkleRoots(
    uint32[] calldata dayIds,
    bytes32[] calldata slabMerkleRoots,
    bytes32[] calldata overrideMerkleRoots
) external onlyOwner
```

**Use**: Set multiple days at once (batch processing)

### View Functions

```solidity
function getSlabMerkleRoot(uint32 dayId) external view returns (bytes32)
function getOverrideMerkleRoot(uint32 dayId) external view returns (bytes32)
function getBothMerkleRoots(uint32 dayId) external view returns (bytes32 slabRoot, bytes32 overrideRoot)
function hasSlabMerkleRoot(uint32 dayId) external view returns (bool)
function hasOverrideMerkleRoot(uint32 dayId) external view returns (bool)
function hasBothMerkleRoots(uint32 dayId) external view returns (bool)
```

---

## Frontend Integration

### React Component Example

```typescript
import { ethers } from 'ethers';
import { useState } from 'react';

interface ClaimData {
  day_id: number;
  slab?: { amount: string; merkle_proof: string[]; merkle_root: string };
  override?: { amount: string; merkle_proof: string[]; merkle_root: string };
  total_amount: string;
}

export function SlabIncomeClaimer({ userAddress, dayId, contract }: Props) {
  const [loading, setLoading] = useState(false);
  const [claimData, setClaimData] = useState<ClaimData | null>(null);

  // Fetch proof data
  const fetchProofs = async () => {
    const response = await fetch(
      `/api/slab-merkle/proof-both/${userAddress}/${dayId}`
    );
    const data = await response.json();
    setClaimData(data);
  };

  // Claim both types
  const claimBoth = async () => {
    if (!claimData) return;

    setLoading(true);
    try {
      const tx = await contract.claimBothWithProof(
        claimData.day_id,
        claimData.slab?.amount || 0,
        claimData.override?.amount || 0,
        claimData.slab?.merkle_proof || [],
        claimData.override?.merkle_proof || []
      );

      await tx.wait();
      alert('Claimed successfully!');
    } catch (error) {
      console.error('Claim failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Day {dayId} Income</h2>
      {claimData && (
        <>
          <div>
            <strong>Slab Income:</strong> $
            {parseFloat(claimData.slab?.amount || '0') / 1e6}
          </div>
          <div>
            <strong>Override Income:</strong> $
            {parseFloat(claimData.override?.amount || '0') / 1e6}
          </div>
          <div>
            <strong>Total:</strong> $
            {parseFloat(claimData.total_amount) / 1e6}
          </div>
          <button onClick={claimBoth} disabled={loading}>
            {loading ? 'Claiming...' : 'Claim Both (Most Efficient)'}
          </button>
        </>
      )}
      <button onClick={fetchProofs}>Load Claimable Income</button>
    </div>
  );
}
```

---

## Gas Comparison

### Admin Costs

| Method | Daily Cost (1000 users) | Annual Cost |
|--------|------------------------|-------------|
| Old: EIP-712 Signatures | $20,000 | $7.3M |
| Old: Combined Merkle Tree | $10 | $3,650 |
| **New: Dual Merkle Trees** | **$12** | **$4,380** |

**Note**: Dual trees add ~$2/day but provide transparent income breakdown

### User Claiming Costs

| Claiming Method | Gas Used | Cost @ 50 gwei |
|-----------------|----------|----------------|
| Claim Slab Only | 60K-80K | $2-3 |
| Claim Override Only | 60K-80K | $2-3 |
| **Claim Both (Recommended)** | **80K-120K** | **$3-4** |
| Claim Separately (2 txs) | 120K-160K | $4-6 |

**Savings**: Claiming both together saves ~$1-2 per day vs separate transactions

---

## Technical Details

### Leaf Hash Format

**Slab Tree:**
```solidity
bytes32 leaf = keccak256(bytes.concat(
    keccak256(abi.encode(user, dayId, slabAmount))
));
```

**Override Tree:**
```solidity
bytes32 leaf = keccak256(bytes.concat(
    keccak256(abi.encode(user, dayId, overrideAmount))
));
```

**Combined Tree (Old):**
```solidity
bytes32 leaf = keccak256(bytes.concat(
    keccak256(abi.encode(user, dayId, usdAmount, ramaAmount))
));
```

### Double-Claim Prevention

Each income type tracks claims separately:

```solidity
mapping(bytes32 => bool) public claimedSlabProofs;     // keccak256(user, dayId, "slab")
mapping(bytes32 => bool) public claimedOverrideProofs; // keccak256(user, dayId, "override")
```

This prevents:
- ❌ Claiming slab twice
- ❌ Claiming override twice
- ✅ Allows claiming slab and override independently

---

## FAQ

### Q: Can I still use the old combined tree system?
**A:** Yes! The old `claimWithProof()`, `setDailyMerkleRoot()`, and `setBatchMerkleRoots()` functions are still supported for backward compatibility.

### Q: Which claiming method should I use?
**A:** Use `claimBothWithProof()` - it's the most gas efficient when you have both types of income.

### Q: What if I only have slab income (no override)?
**A:** Use `claimSlabWithProof()` or `claimBothWithProof()` with `overrideAmount = 0`.

### Q: Can I claim slab one day and override another day?
**A:** Yes! Each income type can be claimed independently.

### Q: How do I verify my income breakdown?
**A:** Call `/api/slab-merkle/proof-both/{address}/{day}` to see exact slab vs override amounts.

### Q: What if admin only publishes slab root (not override)?
**A:** Users can still claim slab income using `claimSlabWithProof()`. Override claiming will fail until admin publishes override root.

---

## Support

- **Documentation**: `/backend/DUAL_MERKLE_TREE_SYSTEM_README.md` (this file)
- **Override Income Guide**: `/backend/SLAB_OVERRIDE_INCOME_GUIDE.md`
- **Original Merkle Tree Guide**: `/backend/MERKLE_TREE_CLAIMING_README.md`
- **Smart Contract**: `/contracts/SlabIncomeDistributorWithProof.sol`
- **Admin Script**: `/backend/admin_generate_merkle_tree.py`
- **API Routes**: `/backend/api/slab_merkle_routes.py`

---

**Created**: 2025-01-15
**Version**: 1.0.0
**System**: Ocean DeFi - Dual Merkle Tree Slab Income Distribution