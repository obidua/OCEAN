# Slab Income Distribution with Merkle Trees

Complete guide for Method 3: Merkle proof-based claiming - the most gas-efficient approach.

## Overview

Instead of EIP-712 signatures, this implementation uses **Merkle trees** for verification. This is significantly more efficient for the admin:

- **Old approach (EIP-712)**: Admin signs each user's claim individually
- **New approach (Merkle)**: Admin creates ONE Merkle root per day for ALL users

### Gas Savings

| Method | Admin Cost | User Claim Cost |
|--------|-----------|-----------------|
| Method 1 (Direct) | $0 | 500K-2M gas |
| Method 2 (Settlement) | ~100K gas/user | 80K-150K gas |
| Method 3 (Merkle) | **~50K gas for ALL users** | 60K-80K gas |

**Admin savings: 1 transaction per day vs 1 transaction per user!**

## How It Works

### Daily Flow

```
Day Ends
   ↓
1. Admin calculates slab income for ALL achievers (off-chain)
   ↓
2. Admin creates Merkle tree from all achievers
   ↓
3. Admin stores ONE Merkle root on-chain (1 transaction for everyone)
   ↓
4. Admin saves tree data (for proof generation)
   ↓
Users can now claim anytime!
   ↓
5. User requests Merkle proof (off-chain)
   ↓
6. User submits claim with proof to smart contract
   ↓
7. Contract verifies proof against root
   ↓
8. Contract transfers tokens
```

### Merkle Tree Structure

```
                    ROOT (stored on-chain)
                   /                    \
              HASH_AB                  HASH_CD
              /      \                /        \
          HASH_A   HASH_B         HASH_C    HASH_D
            |        |               |          |
         User_1   User_2          User_3     User_4
       $5000      $2000           $3000      $1000
```

**Each leaf contains:**
- User address
- Day ID
- USD amount
- RAMA amount

**Proof:** To verify User_1 earned $5000, they provide:
- Their leaf data
- Sibling hashes: [HASH_B, HASH_CD]
- Contract reconstructs ROOT and verifies!

## Installation

### 1. Install Dependencies

```bash
cd backend
pip install web3 eth-abi
```

### 2. Configure Environment

Add to `.env`:

```bash
# Database
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/ocean_defi

# Blockchain
RPC_URL=https://polygon-rpc.com
CONTRACT_ADDRESS=0x...  # SlabIncomeDistributorWithProof address
ADMIN_PRIVATE_KEY=0x...  # Admin private key for setting roots

# RAMA Price (micro USD)
RAMA_PRICE_MICRO_USD=50000000  # $0.05
```

### 3. Ensure Slab Achievements Table Exists

```sql
CREATE TABLE IF NOT EXISTS slab_achievements (
    id SERIAL PRIMARY KEY,
    user_address TEXT NOT NULL,
    day_id INTEGER NOT NULL,
    slab_level INTEGER NOT NULL,
    slab_percentage DECIMAL(5,2) NOT NULL,
    achieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_address, day_id)
);

CREATE INDEX idx_slab_achievements_user_day ON slab_achievements(user_address, day_id);
```

## Admin Workflow

### Daily Task: Generate and Publish Merkle Tree

**Step 1: Generate Tree for Today**

```bash
# Generate tree for day 150
python backend/admin_generate_merkle_tree.py --day 150 --price 50000000

# Output:
# ================================================================================
# Generating Merkle tree for day 150
# ================================================================================
#
# Calculating slab income for all achievers on day 150...
# Found 1000 users with slab achievements on day 150
# Total achievers with income: 875
#
# Summary:
#   Total Achievers: 875
#   Total USD to distribute: $425,000.00
#   Total RAMA to distribute: 8,500,000.00 RAMA
#
# ✅ Merkle Tree Generated Successfully!
#    Root: 0x1234567890abcdef...
#    Saved to: ./merkle_trees/day_150.json
```

**Step 2: Publish Root to Blockchain**

```bash
# Generate AND publish in one command
python backend/admin_generate_merkle_tree.py --day 150 --price 50000000 --publish

# Output:
# 📤 Publishing Merkle root to blockchain...
#    Day: 150
#    Root: 0x1234567890abcdef...
#    Transaction: 0xabc123...
#    Waiting for confirmation...
# ✅ Merkle root published successfully!
#    Block: 12345678
#    Gas used: 52,341
```

**Step 3: Batch Generation (for historical data)**

```bash
# Generate trees for days 100-150
python backend/admin_generate_merkle_tree.py \
    --from-day 100 \
    --to-day 150 \
    --price 50000000 \
    --publish

# Generates 51 trees and publishes all roots in ONE transaction
```

### Automated Daily Job

Set up a cron job to run daily:

```cron
# Run at 00:30 every day (after day ends)
30 0 * * * cd /path/to/project && python backend/admin_generate_merkle_tree.py --day $(date +\%j) --publish
```

Or use systemd timer:

```ini
# /etc/systemd/system/slab-merkle-daily.timer
[Unit]
Description=Daily Slab Income Merkle Tree Generation

[Timer]
OnCalendar=*-*-* 00:30:00
Persistent=true

[Install]
WantedBy=timers.target
```

```ini
# /etc/systemd/system/slab-merkle-daily.service
[Unit]
Description=Generate Slab Income Merkle Tree

[Service]
Type=oneshot
WorkingDirectory=/opt/ocean-defi
ExecStart=/opt/ocean-defi/venv/bin/python backend/admin_generate_merkle_tree.py --day $(date +\%j) --publish
User=ocean
```

## User Claiming Workflow

### Method A: Web UI (Recommended)

**Frontend Integration:**

```javascript
// 1. Get user's claimable days
const response = await fetch(
    `/api/slab-merkle/claimable/${userAddress}?current_day=150&last_claimed_day=0`
);
const claimable = await response.json();

console.log(`Claimable: $${claimable.total_claimable_usd / 1e6}`);
console.log(`Days: ${claimable.claimable_days.join(', ')}`);

// 2. Get proof for specific day
const proofResponse = await fetch(`/api/slab-merkle/proof/${userAddress}/150`);
const proof = await proofResponse.json();

// 3. Submit to contract
const tx = await contract.claimWithProof(
    proof.day_id,
    proof.usd_amount,
    proof.rama_amount,
    proof.merkle_proof  // Array of bytes32
);

await tx.wait();
console.log('Claimed!');
```

**React Component Example:**

```jsx
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

function SlabIncomeClaim({ userAddress, contract }) {
    const [claimable, setClaimable] = useState(null);
    const [claiming, setClaiming] = useState(false);

    useEffect(() => {
        loadClaimable();
    }, [userAddress]);

    const loadClaimable = async () => {
        const response = await fetch(
            `/api/slab-merkle/claimable/${userAddress}?current_day=150`
        );
        const data = await response.json();
        setClaimable(data);
    };

    const claim Day = async (dayId) => {
        setClaiming(true);
        try {
            // Get proof
            const proofResponse = await fetch(`/api/slab-merkle/proof/${userAddress}/${dayId}`);
            const proof = await proofResponse.json();

            // Submit claim
            const tx = await contract.claimWithProof(
                proof.day_id,
                proof.usd_amount,
                proof.rama_amount,
                proof.merkle_proof
            );

            await tx.wait();
            alert('Claim successful!');
            loadClaimable(); // Refresh
        } catch (error) {
            console.error('Claim failed:', error);
            alert('Claim failed: ' + error.message);
        } finally {
            setClaiming(false);
        }
    };

    const claimAll = async () => {
        setClaiming(true);
        try {
            // Get batch proof
            const response = await fetch(
                `/api/slab-merkle/proof-batch/${userAddress}?from_day=0&to_day=150`
            );
            const batch = await response.json();

            // Extract arrays
            const dayIds = batch.proofs.map(p => p.day_id);
            const usdAmounts = batch.proofs.map(p => p.usd_amount);
            const ramaAmounts = batch.proofs.map(p => p.rama_amount);
            const merkleProofs = batch.proofs.map(p => p.merkle_proof);

            // Submit batch claim
            const tx = await contract.claimBatchWithProof(
                dayIds,
                usdAmounts,
                ramaAmounts,
                merkleProofs
            );

            await tx.wait();
            alert(`Claimed ${batch.proofs.length} days successfully!`);
            loadClaimable();
        } catch (error) {
            console.error('Batch claim failed:', error);
            alert('Batch claim failed: ' + error.message);
        } finally {
            setClaiming(false);
        }
    };

    if (!claimable) return <div>Loading...</div>;

    return (
        <div className="slab-income-claim">
            <h2>Slab Income</h2>

            <div className="summary">
                <p>Claimable: ${(claimable.total_claimable_usd / 1e6).toFixed(2)}</p>
                <p>Days: {claimable.days_with_income}</p>
            </div>

            {claimable.days_with_income > 0 && (
                <>
                    <button onClick={claimAll} disabled={claiming}>
                        {claiming ? 'Claiming...' : `Claim All (${claimable.days_with_income} days)`}
                    </button>

                    <div className="daily-claims">
                        {claimable.claimable_days.map(dayId => (
                            <button
                                key={dayId}
                                onClick={() => claimDay(dayId)}
                                disabled={claiming}
                            >
                                Claim Day {dayId}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
```

### Method B: Direct API Access

**1. Check Claimable:**

```bash
curl "http://api/slab-merkle/claimable/0x742d35Cc.../150?current_day=150"

# Response:
{
  "user_address": "0x742d35Cc...",
  "claimable_days": [100, 101, 105, 110, ...],
  "total_claimable_usd": "50000000000",
  "days_with_income": 45
}
```

**2. Get Proof for Single Day:**

```bash
curl "http://api/slab-merkle/proof/0x742d35Cc.../150"

# Response:
{
  "user_address": "0x742d35Cc...",
  "day_id": 150,
  "usd_amount": "5000000000",
  "rama_amount": "100000000000000000000000",
  "merkle_proof": [
    "0xabc123...",
    "0xdef456...",
    "0x789012..."
  ]
}
```

**3. Get Batch Proof:**

```bash
curl "http://api/slab-merkle/proof-batch/0x742d35Cc...?from_day=100&to_day=150"

# Response:
{
  "user_address": "0x742d35Cc...",
  "proofs": [
    {
      "day_id": 100,
      "usd_amount": "1000000000",
      "rama_amount": "20000000000000000000000",
      "merkle_proof": [...]
    },
    ...
  ],
  "total_usd": "50000000000",
  "achiever_days": 45
}
```

## API Endpoints

### For Users

- `GET /api/slab-merkle/proof/{address}/{day_id}` - Get proof for single day
- `GET /api/slab-merkle/proof-batch/{address}?from_day=X&to_day=Y` - Get batch proofs
- `GET /api/slab-merkle/claimable/{address}?current_day=X` - Get all claimable days
- `GET /api/slab-merkle/verify-proof/{address}/{day_id}` - Verify proof locally

### For Admin

- `GET /api/slab-merkle/merkle-root/{day_id}` - Get Merkle root for a day

## Smart Contract Functions

### User Functions

**Single Day Claim:**
```solidity
function claimWithProof(
    uint32 dayId,
    uint256 usdAmount,
    uint256 ramaAmount,
    bytes32[] calldata merkleProof
) external
```

**Batch Claim:**
```solidity
function claimBatchWithProof(
    uint32[] calldata dayIds,
    uint256[] calldata usdAmounts,
    uint256[] calldata ramaAmounts,
    bytes32[][] calldata merkleProofs
) external
```

### Admin Functions

**Set Single Root:**
```solidity
function setDailyMerkleRoot(uint32 dayId, bytes32 merkleRoot) external onlyOwner
```

**Set Multiple Roots (Batch):**
```solidity
function setBatchMerkleRoots(
    uint32[] calldata dayIds,
    bytes32[] calldata merkleRoots
) external onlyOwner
```

### View Functions

```solidity
function getMerkleRoot(uint32 dayId) external view returns (bytes32)
function hasMerkleRoot(uint32 dayId) external view returns (bool)
function isDayClaimed(address user, uint32 dayId) external view returns (bool)
function verifyProof(address user, uint32 dayId, uint256 usdAmount, uint256 ramaAmount, bytes32[] calldata merkleProof) external view returns (bool)
function generateLeaf(address user, uint32 dayId, uint256 usdAmount, uint256 ramaAmount) external pure returns (bytes32)
```

## File Structure

```
backend/
├── merkle_tree_service.py          # Core Merkle tree logic
├── admin_generate_merkle_tree.py   # Admin script for tree generation
├── api/
│   └── slab_merkle_routes.py       # API endpoints for proofs
└── merkle_trees/                   # Generated tree data
    ├── day_100.json
    ├── day_101.json
    └── ...
```

## Tree Data Format

Each `day_X.json` file contains:

```json
{
  "day_id": 150,
  "merkle_root": "0x1234567890abcdef...",
  "total_achievers": 875,
  "leaves": [
    {
      "user_address": "0x742d35Cc...",
      "day_id": 150,
      "usd_amount": 5000000000,
      "rama_amount": 100000000000000000000000,
      "leaf_hash": "0xabc123..."
    },
    ...
  ]
}
```

## Security Considerations

### Merkle Tree Security

✅ **What's Secure:**
- Contract verifies proofs cryptographically
- Users can't fake amounts (proof won't match)
- Admin can't change tree after root is published
- Double-claim prevention (tracked on-chain)

⚠️ **What You Trust:**
- Admin calculates amounts correctly off-chain
- Admin publishes correct Merkle root
- Tree data is backed up (for proof generation)

### Best Practices

1. **Backup Tree Data:** Store `merkle_trees/` directory in multiple locations
2. **Verify Roots:** Before publishing, verify tree locally
3. **Monitor Events:** Watch `MerkleRootSet` events on-chain
4. **Audit Calculations:** Periodically verify calculation logic matches contract

## Troubleshooting

### "Merkle tree not found for day X"

**Cause:** Admin hasn't generated tree for that day yet.

**Fix:**
```bash
python backend/admin_generate_merkle_tree.py --day X --publish
```

### "User not found in Merkle tree"

**Cause:** User didn't have slab income on that day.

**Fix:** User should check other days or wait for next achievement.

### "InvalidProof" error on-chain

**Causes:**
1. Merkle root not set on-chain yet
2. Wrong amounts provided
3. Tree data corrupted

**Debugging:**
```bash
# Verify proof locally
curl "http://api/slab-merkle/verify-proof/0x.../150"

# Check if root is set
curl "http://api/slab-merkle/merkle-root/150"
```

### "ProofAlreadyUsed" error

**Cause:** User already claimed this day.

**Fix:** Expected behavior - user can only claim each day once.

## Performance

### Admin Costs

| Operation | Gas Cost | Cost (100 gwei) |
|-----------|----------|-----------------|
| Set single root | ~50K | ~$10 |
| Set 30 roots (batch) | ~1.5M | ~$300 |
| Per user (EIP-712 old) | ~100K | ~$20 |

**For 1000 users/day:**
- Merkle: ~$10/day
- EIP-712: ~$20,000/day
- **Savings: 99.95%!**

### User Costs

| Method | Gas Cost |
|--------|----------|
| Single day claim | 60K-80K |
| Batch (30 days) | ~1.8M |
| Method 1 (Direct) | 500K-2M |

## Migration from EIP-712

If you've already deployed with EIP-712 signatures:

1. Deploy new contract with Merkle support
2. Migrate tree generation workflow
3. Update frontend to use Merkle proofs
4. Keep both methods available during transition
5. Eventually deprecate EIP-712 method

## Advantages Over EIP-712

| Feature | EIP-712 | Merkle Tree |
|---------|---------|-------------|
| Admin tx per day | 1 per user | 1 total |
| Admin gas cost | High | Very low |
| User claim cost | 80K-120K | 60K-80K |
| Scalability | Poor | Excellent |
| Backend signing | Required | Not required |
| Trust model | Trust signer | Trust calculation |

## Conclusion

Merkle tree-based claiming provides:
- ✅ Minimal admin costs (1 tx/day for ALL users)
- ✅ Low user claim costs (60K-80K gas)
- ✅ Scalable to millions of users
- ✅ Transparent and auditable
- ✅ Production-ready implementation

Perfect for daily income distribution at scale!

## Support

For issues:
1. Check logs: `tail -f backend/logs/*.log`
2. Verify tree data: `ls -la merkle_trees/`
3. Test locally: `python backend/merkle_tree_service.py`
4. Check contract events: Filter `MerkleRootSet` events