# Offline Slab Income Management & Distribution Architecture

## System Overview

The Ocean DeFi platform uses a **dual-track system** for slab income management:

1. **Offline Calculation** (Python/PostgreSQL) - `apps/ocanDefiSlabIncomeDistribution/`
   - Calculates slab income and override income daily
   - Generates Merkle trees for efficient proof generation
   - Stores data for users to claim later

2. **On-Chain Claiming** (Solidity) - `apps/SlabIncomeDistributorWithProof.sol`
   - Verifies Merkle proofs submitted by users
   - Distributes RAMA/USD tokens to users
   - Maintains transparent claim history

---

## Part 1: Offline Calculation System

### Location
`/apps/ocanDefiSlabIncomeDistribution/slab_indexer/`

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│             PostgreSQL Database with Procedures              │
│  (Stores user portfolios, ROI, team structure, slabs)       │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
┌───────▼────────────────┐  ┌────────▼──────────────────┐
│   Slab Income Service  │  │  Slab Achiever Service    │
│ (slab_income_service   │  │ (slab_achiever_service    │
│     .py)               │  │      .py)                 │
│                        │  │                           │
│ • Calculate slab       │  │ • Identify achievers      │
│   differential income  │  │ • Track slab levels       │
│ • Calculate override   │  │ • Store achievement data  │
│   income (10%, 5%, 5%) │  │                           │
│ • Leg-wise breakdown   │  │                           │
│ • 60% cap per leg      │  │                           │
└───────┬────────────────┘  └────────┬──────────────────┘
        │                             │
        └──────────────┬──────────────┘
                       │
        ┌──────────────▼──────────────┐
        │   Merkle Tree Service        │
        │ (merkle_tree_service.py)     │
        │                              │
        │ • Create dual trees:         │
        │   - SLAB tree (slab income)  │
        │   - OVERRIDE tree (bonuses)  │
        │ • Generate proofs per user   │
        │ • Save tree data locally     │
        │ • Verify proofs              │
        └──────────────┬───────────────┘
                       │
        ┌──────────────▼──────────────┐
        │   Admin Merkle Generator     │
        │ (admin_generate_merkle_tree  │
        │      .py)                    │
        │                              │
        │ • Generate trees for day(s)  │
        │ • Set roots on-chain         │
        │ • Save tree JSON files       │
        │ • Verify on-chain setup      │
        └──────────────┬───────────────┘
                       │
        ┌──────────────▼──────────────┐
        │    Merkle Tree JSON Files    │
        │  (/merkle_trees/{day_id}/)   │
        │                              │
        │ • slab_tree.json             │
        │ • override_tree.json         │
        │ • combined_tree.json         │
        │ • roots.json                 │
        └──────────────────────────────┘
```

### Key Services

#### 1. Slab Income Service (`slab_income_service.py`)

**Calculates income for all achievers using PostgreSQL stored procedures:**

```python
# Calculate slab differential income
calculate_slab_income_for_day(
    db,
    user_address,      # User earning the slab income
    day_id,            # Day to calculate for
    price_micro_usd    # RAMA price (50000000 = $0.05)
)

# Returns:
{
    "user_address": str,
    "day_id": int,
    "user_slab_level": int,           # User's slab (0-10)
    "user_slab_percentage": decimal,  # User's slab % (5%-60%)
    "total_slab_income_micro_usd": int,
    "total_slab_income_usd": decimal,
    "total_slab_income_rama_wei": int,
    "legs_count": int,
    "legs_detail": [                  # Per-leg breakdown
        {
            "direct_address": str,
            "leg_total_income_micro_usd": int,
            "leg_capped_income_micro_usd": int,
            "cap_applied": bool,      # Was 60% cap applied?
            "members": [...]          # Detailed per-member income
        }
    ]
}
```

**Slab Income Calculation Formula:**
```
For each downline member (leg):
  1. Calculate "considerable ROI" = sum_of_member_ROI × 36%
  2. Calculate "slab differential" = your_slab_% - member_slab_%
  3. Calculate "slab income" = considerable_ROI × slab_differential
  4. Cap per leg at 60% of considerable ROI
  5. Sum all legs = total slab income
```

**Override Income Calculation:**
```python
calculate_override_income_for_day(
    db,
    user_address,      # User earning override (upline)
    day_id,
    price_micro_usd
)

# Returns achievers who reached user's slab level + their bonuses:
{
    "achievers_count": int,
    "achievers_detail": [
        {
            "achiever_address": str,
            "achiever_slab_level": int,
            "upline_depth": int,           # 1 = direct, 2 = second, 3+ = third
            "override_percentage": int,    # 10%, 5%, or 5%
            "your_income_micro_usd": int,
            "your_income_rama_wei": int
        }
    ]
}
```

**Override Bonus Distribution:**
- **1st Achiever (upline_depth=1):** 10% of their income
- **2nd Achiever (upline_depth=2):** 5% of their income  
- **3rd+ Achievers (upline_depth>=3):** 5% of their income

#### 2. Merkle Tree Service (`merkle_tree_service.py`)

**Generates efficient Merkle trees for proof-based claiming:**

```python
# Create slab income Merkle tree
create_slab_income_tree(
    achievers_list=[
        {
            "user_address": "0x...",
            "slab_income_micro_usd": 5000000000,
            "slab_income_rama_wei": "100000000000000000000"
        },
        ...
    ]
)

# Returns:
{
    "root": "0x123...",              # Root hash
    "leaves": [...],                 # All leaf nodes
    "tree_data": {...}               # Proof generation data
}
```

**Dual Merkle Tree System:**

```
Day 150 Merkle Trees:
├── dailySlabMerkleRoots[150]
│   └── Tree contains: all slab differential income
│       • User A: 5000 USD
│       • User B: 3000 USD
│       • User C: 2000 USD
│
├── dailyOverrideMerkleRoots[150]
│   └── Tree contains: all override income
│       • User X: 1000 USD (10%)
│       • User Y: 500 USD (5%)
│       • User Z: 500 USD (5%)
│
└── dailyMerkleRoots[150]  (backward compatibility)
    └── Combined tree with both types
```

**Leaf Node Structure:**
```python
# For slab/override separate trees:
leaf = keccak256(
    user_address,
    day_id,
    amount_micro_usd,   # Only one amount per tree
    income_type         # "slab" or "override"
)

# For combined tree:
leaf = keccak256(
    user_address,
    day_id,
    slab_amount_usd,
    slab_amount_rama,
    override_amount_usd,
    override_amount_rama
)
```

**Proof Generation:**
```python
# Get proof for a specific user for a specific day
get_merkle_proof(
    user_address="0x...",
    day_id=150,
    proof_type="slab"  # "slab", "override", or "both"
)

# Returns:
{
    "user_address": "0x...",
    "day_id": 150,
    "proof": ["0xabc...", "0xdef...", ...],  # Siblings up to root
    "root": "0x123...",
    "leaf": "0x456..."
}

# User can then submit this proof to smart contract:
# contract.claimSlabWithProof(150, 5000000000, proof)
```

#### 3. Admin Merkle Generator (`admin_generate_merkle_tree.py`)

**Command-line tool to generate trees and publish roots on-chain:**

```bash
# Generate tree for single day
python admin_generate_merkle_tree.py --day 150

# Generate and publish to blockchain
python admin_generate_merkle_tree.py --day 150 --publish

# Generate batch for multiple days
python admin_generate_merkle_tree.py --from-day 100 --to-day 150 --publish

# Regenerate existing day
python admin_generate_merkle_tree.py --day 150 --overwrite --publish
```

**Flow:**
```
┌─────────────────────────┐
│ Specify day(s) to       │
│ generate trees for      │
└────────────┬────────────┘
             │
┌────────────▼────────────┐
│ Query PostgreSQL for    │
│ all slab + override     │
│ income for that day     │
└────────────┬────────────┘
             │
┌────────────▼────────────┐
│ Create two Merkle trees │
│ (slab + override)       │
└────────────┬────────────┘
             │
┌────────────▼────────────┐
│ Save tree JSON files    │
│ to ./merkle_trees/      │
└────────────┬────────────┘
             │
┌────────────▼────────────┐
│ Optional: Set roots     │
│ on-chain via smart      │
│ contract (1 tx per day) │
└─────────────────────────┘
```

**Output Files Structure:**
```
merkle_trees/
├── 150/
│   ├── slab_tree.json           # Slab tree data
│   ├── override_tree.json        # Override tree data
│   ├── combined_tree.json        # Combined tree (if used)
│   ├── roots.json                # All roots for this day
│   ├── slab_root.txt             # Just slab root (quick ref)
│   └── override_root.txt         # Just override root
├── 151/
│   ├── slab_tree.json
│   ├── override_tree.json
│   └── roots.json
└── ...
```

---

## Part 2: On-Chain Claiming System

### Location
`/apps/SlabIncomeDistributorWithProof.sol`

### Smart Contract Architecture

```solidity
SlabIncomeDistributorWithProof (UUPS Upgradeable)
│
├── State Variables
│   ├── mapping dailySlabMerkleRoots[day] → bytes32
│   ├── mapping dailyOverrideMerkleRoots[day] → bytes32
│   ├── mapping dailyMerkleRoots[day] → bytes32 (combined)
│   ├── mapping claimedSlabProofs[proofId] → bool
│   ├── mapping claimedOverrideProofs[proofId] → bool
│   ├── mapping lastClaimedDay[user] → uint32
│   └── mapping settledUSD/RAMA[user][day] → uint128
│
├── Three Claiming Methods
│   ├── Method 1: Direct On-Chain Calculation (500K-2M gas)
│   │   └── calculateClaimableSlabIncome() [NOT RECOMMENDED]
│   │
│   ├── Method 2: Keeper Settlement (80K-150K gas)
│   │   └── settleIncome() [Admin only]
│   │
│   └── Method 3: Merkle Proof Verification (60K-80K gas) ⭐
│       ├── claimSlabWithProof(dayId, amount, proof)
│       ├── claimOverrideWithProof(dayId, amount, proof)
│       ├── claimBothWithProof(dayId, slabAmt, overrideAmt, slabProof, overrideProof)
│       └── batchClaimWithProof(days[], amounts[], proofs[])
│
├── Verification Logic
│   ├── Parse Merkle root for day
│   ├── Create leaf from (user, dayId, amount)
│   ├── Verify proof against root (MerkleProof.verify)
│   ├── Check proof not already used
│   ├── Update lastClaimedDay checkpoint
│   └── Transfer tokens (RAMA + USD)
│
└── Events
    ├── ClaimedWithProof(user, dayId, usd, rama, proofId, incomeType)
    ├── BatchClaimedWithProof(user, fromDay, toDay, totalUSD, totalRAMA)
    ├── MerkleRootSet(dayId, root, timestamp, incomeType)
    └── AmountTransferred(user, timestamp, totalUSD, totalRAMA)
```

### Key Functions

#### Setting Merkle Roots (Admin Only)

```solidity
/**
 * @notice Set Merkle roots for a day
 * @param dayId Day to set roots for
 * @param slabRoot Root of slab differential income tree
 * @param overrideRoot Root of override income tree
 */
function setMerkleRoots(
    uint32 dayId,
    bytes32 slabRoot,
    bytes32 overrideRoot
) external onlyOwner {
    // Validate inputs
    require(dayId > 0, "Invalid day");
    require(slabRoot != bytes32(0), "Invalid slab root");
    require(overrideRoot != bytes32(0), "Invalid override root");
    
    // Store roots
    dailySlabMerkleRoots[dayId] = slabRoot;
    dailyOverrideMerkleRoots[dayId] = overrideRoot;
    
    // Emit events
    emit MerkleRootSet(dayId, slabRoot, block.timestamp, "slab");
    emit MerkleRootSet(dayId, overrideRoot, block.timestamp, "override");
}
```

#### Claiming Slab Income Only

```solidity
/**
 * @notice Claim slab differential income for a specific day
 * @param dayId Day to claim
 * @param usdAmount Amount in micro USD
 * @param ramaAmount Amount in RAMA wei
 * @param merkleProof Proof showing user is in slab tree
 */
function claimSlabWithProof(
    uint32 dayId,
    uint256 usdAmount,
    uint256 ramaAmount,
    bytes32[] calldata merkleProof
) external nonReentrant {
    // Verify day hasn't been claimed
    require(dayId >= lastClaimedDay[msg.sender], "Already claimed");
    require(dayId < _getCurrentDay(), "Cannot claim future day");
    
    // Get Merkle root
    bytes32 merkleRoot = dailySlabMerkleRoots[dayId];
    require(merkleRoot != bytes32(0), "No Merkle root");
    
    // Create proof ID (prevent double-claiming same proof)
    bytes32 proofId = keccak256(abi.encodePacked(msg.sender, dayId, "slab"));
    require(!claimedSlabProofs[proofId], "Proof already used");
    
    // Verify proof
    bytes32 leaf = keccak256(
        bytes.concat(
            keccak256(abi.encode(msg.sender, dayId, usdAmount, ramaAmount, "slab"))
        )
    );
    require(MerkleProof.verify(merkleProof, merkleRoot, leaf), "Invalid proof");
    
    // Mark as claimed
    claimedSlabProofs[proofId] = true;
    if (dayId + 1 > lastClaimedDay[msg.sender]) {
        lastClaimedDay[msg.sender] = dayId + 1;
    }
    
    // Transfer tokens
    _transferIncome(msg.sender, usdAmount, ramaAmount);
    
    // Emit event
    emit ClaimedWithProof(msg.sender, dayId, usdAmount, ramaAmount, proofId, "slab");
}
```

#### Claiming Both Types (Recommended)

```solidity
/**
 * @notice Claim both slab and override income in one transaction
 * @dev Most gas-efficient when user has both types of income
 */
function claimBothWithProof(
    uint32 dayId,
    uint256 slabUsd,
    uint256 slabRama,
    uint256 overrideUsd,
    uint256 overrideRama,
    bytes32[] calldata slabProof,
    bytes32[] calldata overrideProof
) external nonReentrant {
    // Verify both proofs
    bytes32 slabRoot = dailySlabMerkleRoots[dayId];
    bytes32 overrideRoot = dailyOverrideMerkleRoots[dayId];
    
    require(slabRoot != bytes32(0) && overrideRoot != bytes32(0), "Missing roots");
    
    // Verify slab proof
    bytes32 slabLeaf = keccak256(
        bytes.concat(
            keccak256(abi.encode(msg.sender, dayId, slabUsd, slabRama, "slab"))
        )
    );
    require(MerkleProof.verify(slabProof, slabRoot, slabLeaf), "Invalid slab proof");
    
    // Verify override proof
    bytes32 overrideLeaf = keccak256(
        bytes.concat(
            keccak256(abi.encode(msg.sender, dayId, overrideUsd, overrideRama, "override"))
        )
    );
    require(MerkleProof.verify(overrideProof, overrideRoot, overrideLeaf), "Invalid override proof");
    
    // Mark both as claimed
    bytes32 slabProofId = keccak256(abi.encodePacked(msg.sender, dayId, "slab"));
    bytes32 overrideProofId = keccak256(abi.encodePacked(msg.sender, dayId, "override"));
    
    require(!claimedSlabProofs[slabProofId], "Slab already claimed");
    require(!claimedOverrideProofs[overrideProofId], "Override already claimed");
    
    claimedSlabProofs[slabProofId] = true;
    claimedOverrideProofs[overrideProofId] = true;
    
    // Update checkpoint
    if (dayId + 1 > lastClaimedDay[msg.sender]) {
        lastClaimedDay[msg.sender] = dayId + 1;
    }
    
    // Transfer combined amount
    uint256 totalUsd = slabUsd + overrideUsd;
    uint256 totalRama = slabRama + overrideRama;
    _transferIncome(msg.sender, totalUsd, totalRama);
    
    // Emit events
    emit ClaimedWithProof(msg.sender, dayId, slabUsd, slabRama, slabProofId, "slab");
    emit ClaimedWithProof(msg.sender, dayId, overrideUsd, overrideRama, overrideProofId, "override");
}
```

#### Batch Claiming (Multiple Days)

```solidity
/**
 * @notice Claim income for multiple days in batch
 * @param dayIds Array of day IDs to claim
 * @param amounts Array of amounts (usdAmount, ramaAmount pairs)
 * @param proofs Array of merkle proofs
 */
function batchClaimWithProof(
    uint32[] calldata dayIds,
    uint256[][] calldata amounts,
    bytes32[][] calldata proofs
) external nonReentrant {
    require(dayIds.length == amounts.length, "Length mismatch");
    
    uint256 totalUsd = 0;
    uint256 totalRama = 0;
    
    for (uint i = 0; i < dayIds.length; i++) {
        uint32 dayId = dayIds[i];
        uint256 usdAmount = amounts[i][0];
        uint256 ramaAmount = amounts[i][1];
        
        // Verify and claim each day
        bytes32 merkleRoot = dailyMerkleRoots[dayId];
        require(merkleRoot != bytes32(0), "No root");
        
        bytes32 leaf = keccak256(
            bytes.concat(
                keccak256(abi.encode(
                    msg.sender, dayId, usdAmount, ramaAmount
                ))
            )
        );
        
        require(
            MerkleProof.verify(proofs[i], merkleRoot, leaf),
            "Invalid proof"
        );
        
        bytes32 proofId = keccak256(abi.encodePacked(msg.sender, dayId));
        require(!claimedProofs[proofId], "Already claimed");
        
        claimedProofs[proofId] = true;
        totalUsd += usdAmount;
        totalRama += ramaAmount;
    }
    
    // Update checkpoint
    uint32 maxDay = dayIds[dayIds.length - 1];
    if (maxDay + 1 > lastClaimedDay[msg.sender]) {
        lastClaimedDay[msg.sender] = maxDay + 1;
    }
    
    // Transfer all at once
    _transferIncome(msg.sender, totalUsd, totalRama);
    
    // Emit batch event
    emit BatchClaimedWithProof(
        msg.sender,
        dayIds[0],
        maxDay,
        totalUsd,
        totalRama
    );
}
```

---

## Complete Claiming Flow

### User's Perspective

```
┌─────────────────────────────────────┐
│ 1. User visits dashboard             │
│    (/SlabIncome page)                │
└────────────────┬────────────────────┘
                 │
┌────────────────▼────────────────────┐
│ 2. Frontend queries:                 │
│    - /api/claimable/{address}        │
│    - /api/slab-merkle/claimable/...  │
│    Returns claimable_days and proofs │
└────────────────┬────────────────────┘
                 │
┌────────────────▼────────────────────┐
│ 3. User reviews income breakdown:    │
│    - Slab income: $5,000             │
│    - Override income: $1,000         │
│    Total: $6,000                     │
└────────────────┬────────────────────┘
                 │
┌────────────────▼────────────────────┐
│ 4. User chooses claim method:        │
│    a) Claim slab only                │
│    b) Claim override only            │
│    c) Claim both (RECOMMENDED)       │
└────────────────┬────────────────────┘
                 │
         ┌───────┴───────┐
         │               │
    ┌────▼────┐     ┌────▼────┐
    │ Slab    │     │ Override │
    │ Proof   │     │ Proof    │
    └────┬────┘     └────┬────┘
         │               │
    ┌────▼───────────────▼────┐
    │ 5. Generate signatures    │
    │    (if EIP-712 required)  │
    └────┬────────────────────┘
         │
┌────────▼──────────────────────┐
│ 6. Submit to blockchain:       │
│    - claimSlabWithProof() or   │
│    - claimOverrideWithProof()  │
│    - claimBothWithProof()      │
└────────┬───────────────────────┘
         │
┌────────▼───────────────────────┐
│ 7. Smart contract:             │
│    - Verifies Merkle proofs    │
│    - Checks not already claimed│
│    - Transfers RAMA + USD      │
│    - Emits events              │
└────────┬───────────────────────┘
         │
┌────────▼───────────────────────┐
│ 8. Frontend shows confirmation:│
│    - Tx hash                   │
│    - New wallet balances       │
│    - Updated claim history     │
└────────────────────────────────┘
```

### Admin's Perspective (Daily)

```
Day N → Calculation
├─ Morning (UTC):
│  ├─ PostgreSQL calculates slab income for all users
│  ├─ PostgreSQL calculates override income for all users
│  └─ Results stored in achievement tables
│
├─ Afternoon:
│  ├─ Run: python admin_generate_merkle_tree.py --day N
│  ├─ Generates dual Merkle trees (slab + override)
│  ├─ Saves JSON files to ./merkle_trees/N/
│  └─ Creates proof data for users
│
└─ Evening:
   ├─ Run: python admin_generate_merkle_tree.py --day N --publish
   ├─ Calls setMerkleRoots(N, slabRoot, overrideRoot)
   ├─ Stores roots on-chain
   └─ Users can now claim day N
```

---

## Data Flow Comparison

### Method 1: On-Chain Calculation (NOT RECOMMENDED)
```
User → Smart Contract
  ├─ Query user slab
  ├─ Query all downlines
  ├─ Calculate ROI for each downline
  ├─ Calculate slab differential
  ├─ Apply 60% cap
  ├─ Transfer tokens
  └─ Gas: 500K-2M ❌ TOO EXPENSIVE
```

### Method 2: Keeper Settlement
```
Admin → Smart Contract
  ├─ Calculate off-chain
  ├─ Call settleIncome(user, day, usdAmount, ramaAmount)
  ├─ Smart contract stores amount
  └─ Gas: 80K-150K per user
  
User → Smart Contract
  ├─ Call claimSettled()
  ├─ Contract transfers pre-calculated amount
  └─ Gas: 50K ✓ CHEAP (but requires admin to settle first)
```

### Method 3: Merkle Proof (RECOMMENDED) ✅
```
Admin → PostgreSQL
  ├─ Calculate all income for day N
  └─ Results in database
  
Admin → Python Script
  ├─ Generate Merkle trees
  ├─ Save tree JSON
  └─ Get roots
  
Admin → Smart Contract
  ├─ Call setMerkleRoots(N, slabRoot, overrideRoot)
  └─ Gas: ~40K per day (1 tx for ALL users)
  
User → Generate Proof (Off-chain)
  ├─ Request from API: /api/slab-merkle/proof/{address}/{day}
  ├─ Returns Merkle proof JSON
  └─ No gas needed
  
User → Smart Contract
  ├─ Call claimSlabWithProof() or claimBothWithProof()
  ├─ Submit Merkle proof
  ├─ Contract verifies proof
  ├─ Transfer tokens
  └─ Gas: 60K-80K ✓ CHEAP & IMMEDIATE
```

---

## Key Design Features

### 1. Dual Merkle Trees
- **Slab Tree:** Only slab differential income
- **Override Tree:** Only override bonuses
- **Benefit:** Users can claim each independently or together

### 2. Double-Claim Prevention
```solidity
// Separate tracking per income type
mapping(bytes32 => bool) claimedSlabProofs;      // Prevents duplicate slab claims
mapping(bytes32 => bool) claimedOverrideProofs;  // Prevents duplicate override claims

// Proof ID format
bytes32 proofId = keccak256(abi.encodePacked(user, dayId, incomeType));
```

### 3. Flexible Claiming Options

| Scenario | Method | Gas | Best For |
|----------|--------|-----|----------|
| Only slab income | `claimSlabWithProof()` | 65K | Partial income |
| Only override income | `claimOverrideWithProof()` | 65K | Partial income |
| Both types for same day | `claimBothWithProof()` | 80K | Complete income |
| Multiple days | `batchClaimWithProof()` | 100K-200K | Catching up |

### 4. Transparent Income Breakdown
- Smart contract emits events with income type breakdown
- Users can see exactly how much is slab vs override
- Historical record on-chain forever

### 5. PostgreSQL Procedure Efficiency
- All calculations use stored procedures
- Optimized for daily batch processing
- Single root update per day for ALL users
- No per-user on-chain computation

---

## Security Considerations

### Off-Chain (Python/PostgreSQL)
✅ Deterministic calculations (same inputs = same results)
✅ Backup and recovery procedures
✅ Historical data preservation
✅ Admin verification of merkle roots before publishing

### On-Chain (Solidity)
✅ Merkle proof verification (OpenZeppelin library)
✅ Double-claim prevention per income type
✅ Reentrancy guard on all claim functions
✅ UUPS upgradeable for bug fixes
✅ Owner-gated Merkle root setting
✅ Comprehensive event logging

### Potential Risks & Mitigations
| Risk | Mitigation |
|------|-----------|
| Wrong Merkle root published | Verify tree before publishing, batch verification |
| User claims twice | Proof ID tracking prevents double-claims |
| Merkle proof generation error | Off-chain proofs verified before submission |
| Token transfer failure | NonReentrant guard + checks-effects-interactions |
| Slab/override miscalculation | PostgreSQL procedure testing + test data validation |

---

## Integration with Dashboard

### Frontend Components

**SlabIncomeScreen.jsx** - Shows slab overview
```javascript
// Uses API endpoints:
// GET /api/combined/{address}/{day_id}?price_micro_usd=50000000
// Shows total slab + override for today
```

**SameSlabScreen.jsx** - Shows override details
```javascript
// Uses API endpoints:
// GET /api/override-income/{address}/{day_id}?price_micro_usd=50000000
// Shows who is earning override income and why
```

**SlabIncomeHistory.jsx** - Shows historical claims
```javascript
// Uses API endpoints:
// GET /api/period/{address}?from_day=X&to_day=Y&price_micro_usd=50000000
// GET /api/slab-claim/claim-history/{address}
// Shows all past claims
```

**Claiming Flow**
```javascript
// 1. Get claimable amounts
const claimable = await fetch('/api/claimable/{address}?...');

// 2. Get proofs
const proof = await fetch('/api/slab-merkle/proof/{address}/{day_id}');

// 3. Submit to contract
await contract.claimBothWithProof(
    dayId,
    proof.slab.amount,
    proof.override.amount,
    proof.slab.merkle_proof,
    proof.override.merkle_proof
);
```

---

## Debugging & Verification

### Admin Commands

```bash
# Check what was calculated for a user on a day
curl https://testapi.oceandefi.uk/api/combined/0x.../150?price_micro_usd=50000000

# Verify Merkle root is set correctly
curl https://testapi.oceandefi.uk/api/slab-merkle/merkle-root/150

# Generate fresh trees for a range of days
python admin_generate_merkle_tree.py --from-day 140 --to-day 150 --publish

# Check if a specific proof is valid
curl https://testapi.oceandefi.uk/api/slab-merkle/verify-proof/0x.../150
```

### User Debugging

```bash
# Check what's claimable
curl https://testapi.oceandefi.uk/api/claimable/0x...?price_micro_usd=50000000

# Get merkle proof for claiming
curl https://testapi.oceandefi.uk/api/slab-merkle/proof/0x.../150

# Check claim history
curl https://testapi.oceandefi.uk/api/slab-claim/claim-history/0x...
```

---

## Summary

The offline slab income system consists of:

1. **PostgreSQL Database** - Authoritative source of all calculations
2. **Python Services** - Calculate income using stored procedures
3. **Merkle Trees** - Create efficient proof system
4. **Smart Contract** - Verify proofs and distribute tokens
5. **API Server** - Provide proofs and data to frontend
6. **Dashboard** - User-facing interface for claiming

The system is **gas-efficient**, **transparent**, **flexible**, and **secure**.

