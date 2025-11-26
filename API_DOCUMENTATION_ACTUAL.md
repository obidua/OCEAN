# Ocean DeFi API - Complete Reference (from OpenAPI 3.1.0 spec)

**Base URL:** `https://testapi.oceandefi.uk/`  
**Current Version:** 0.1.0

---

## Core Concepts

### Day ID Calculation
- Unix timestamp divided by 86400 (seconds per day)
- Example: `Math.floor(Date.now() / 1000 / 86400)`

### Price Format
- RAMA token price in **micro USD** (1e6 = $1)
- Example: `50000000` = $0.05 per RAMA token
- To convert to USD: divide by 1,000,000

### Amount Formats
- **microUSD**: Token prices and totals in micro USD (divide by 1e6 for USD)
- **RAMA wei**: Token amounts in wei (divide by 1e18 for RAMA)
- **USD amounts**: Already formatted in USD

---

## Slab Income Endpoints

### 1. Get Slab Level
**GET** `/api/slab/{user_address}/{day_id}`

Get user's slab level and percentage for a specific day.

**Parameters:**
- `user_address` (path): Ethereum wallet address
- `day_id` (path): Day ID (0-based from contract start)

**Response:**
```json
{
  "user_address": "0x...",
  "day_id": 150,
  "slab_level": 3,
  "slab_percentage": 10.00
}
```

---

### 2. Get Considerable ROI
**GET** `/api/considerable-roi/{user_address}/{day_id}`

Calculate considerable ROI (sum of all legs ROI × 36%) for a user for a specific day.

**Parameters:**
- `user_address` (path): Ethereum wallet address
- `day_id` (path): Day ID
- `price_micro_usd` (query, required): RAMA token price in micro USD (e.g., 50000000 = $0.05)

**Response:**
```json
{
  "user_address": "0x...",
  "day_id": 150,
  "total_legs_roi_micro_usd": 10000000000,
  "considerable_roi_micro_usd": 3600000000,
  "considerable_roi_usd": 3600.00
}
```

---

### 3. Get Slab Income (Differential Only)
**GET** `/api/slab-income/{user_address}/{day_id}`

Calculate slab differential income for a user for a specific day.

**Implements:**
- Slab differential calculation (your slab % - their slab %)
- Applied to considerable ROI of each downline member
- 60% cap per leg
- Detailed leg-wise breakdown

**Parameters:**
- `user_address` (path): Ethereum wallet address
- `day_id` (path): Day ID
- `price_micro_usd` (query, required): RAMA token price in micro USD

**Response:**
```json
{
  "user_address": "0x...",
  "day_id": 150,
  "user_slab_level": 3,
  "user_slab_percentage": 10.00,
  "total_slab_income_micro_usd": 5000000000,
  "total_slab_income_usd": 5000.00,
  "total_slab_income_rama_wei": "100000000000000000000",
  "legs_count": 5,
  "legs_detail": [
    {
      "downline_address": "0x...",
      "downline_slab_level": 2,
      "downline_slab_percentage": 5.00,
      "slab_differential": 5.00,
      "considerable_roi_micro_usd": 1000000000,
      "income_micro_usd": 50000000,
      "income_usd": 50.00,
      "income_rama_wei": "1000000000000000000"
    }
  ]
}
```

---

### 4. Get Override Income (Same-Slab Bonuses)
**GET** `/api/override-income/{user_address}/{day_id}`

Calculate slab override income for achievers who reached/exceeded user's slab.

**Implements:**
- 10% to direct upline when downline reaches their slab
- 5% to second upline
- 5% to third upline

**Parameters:**
- `user_address` (path): Ethereum wallet address
- `day_id` (path): Day ID
- `price_micro_usd` (query, required): RAMA token price in micro USD

**Response:**
```json
{
  "user_address": "0x...",
  "day_id": 150,
  "user_slab_level": 3,
  "total_override_income_micro_usd": 1000000000,
  "total_override_income_usd": 1000.00,
  "total_override_income_rama_wei": "20000000000000000000",
  "achievers_count": 3,
  "achievers_detail": [
    {
      "achiever_address": "0x...",
      "achiever_slab_level": 3,
      "upline_depth": 1,
      "override_percentage": 10.00,
      "achiever_income_micro_usd": 100000000,
      "your_income_micro_usd": 10000000,
      "your_income_usd": 10.00,
      "your_income_rama_wei": "200000000000000000"
    }
  ]
}
```

---

### 5. Get Combined Income (RECOMMENDED)
**GET** `/api/combined/{user_address}/{day_id}`

Calculate both slab income and override income in a single call. **Most efficient endpoint for getting complete slab income breakdown.**

**Parameters:**
- `user_address` (path): Ethereum wallet address
- `day_id` (path): Day ID
- `price_micro_usd` (query, required): RAMA token price in micro USD

**Response:**
```json
{
  "user_address": "0x...",
  "day_id": 150,
  "user_slab_level": 3,
  "user_slab_percentage": 10.00,
  "slab_income_micro_usd": 5000000000,
  "slab_income_usd": 5000.00,
  "slab_income_rama_wei": "100000000000000000000",
  "legs_count": 5,
  "override_income_micro_usd": 1000000000,
  "override_income_usd": 1000.00,
  "override_income_rama_wei": "20000000000000000000",
  "achievers_count": 3,
  "total_income_micro_usd": 6000000000,
  "total_income_usd": 6000.00,
  "total_income_rama_wei": "120000000000000000000",
  "slab_details": [...],
  "override_details": [...]
}
```

---

### 6. Get Period Income (Date Range)
**GET** `/api/period/{user_address}`

Calculate slab income for a range of days. Aggregates daily calculations and provides both totals and daily breakdown.

**Parameters:**
- `user_address` (path): Ethereum wallet address
- `from_day` (query, required): Start day ID (inclusive)
- `to_day` (query, required): End day ID (inclusive)
- `price_micro_usd` (query, required): RAMA token price in micro USD

**Example:** `/api/period/0x.../100/150?price_micro_usd=50000000`

**Response:**
```json
{
  "user_address": "0x...",
  "from_day": 100,
  "to_day": 150,
  "days_count": 51,
  "total_slab_income_micro_usd": 250000000000,
  "total_slab_income_usd": 250000.00,
  "total_slab_income_rama_wei": "5000000000000000000000",
  "total_override_income_micro_usd": 50000000000,
  "total_override_income_usd": 50000.00,
  "total_override_income_rama_wei": "1000000000000000000000",
  "grand_total_income_micro_usd": 300000000000,
  "grand_total_income_usd": 300000.00,
  "grand_total_income_rama_wei": "6000000000000000000000",
  "daily_breakdown": [
    {
      "day_id": 100,
      "slab_income_usd": 4901.96,
      "override_income_usd": 980.39,
      "total_usd": 5882.35
    }
  ]
}
```

---

### 7. Get Claimable Income
**GET** `/api/claimable/{user_address}`

Get claimable slab income for a user up to current day. Returns the most recent claimable period and total amounts.

**Parameters:**
- `user_address` (path): Ethereum wallet address
- `price_micro_usd` (query, required): RAMA token price in micro USD
- `current_day` (query, required): Current day ID

**Response:**
```json
{
  "user_address": "0x...",
  "current_day": 150,
  "claimable_from_day": 100,
  "claimable_to_day": 150,
  "days_count": 51,
  "total_claimable_usd": 300000.00,
  "total_claimable_rama_wei": "6000000000000000000000",
  "breakdown": {
    "slab_income_usd": 250000.00,
    "override_income_usd": 50000.00
  }
}
```

---

### 8. Health Check
**GET** `/api/health`

Health check endpoint.

**Response:**
```json
{
  "status": "healthy"
}
```

---

## Team Endpoints

### 1. Get Complete Team
**GET** `/api/team/{user_address}`

Get complete team structure for a user. Returns all directs and their downlines (recursive), total team count, max depth, and leg-wise breakdown.

**Parameters:**
- `user_address` (path): Ethereum wallet address

---

### 2. Get Team Summary (Fast)
**GET** `/api/team/{user_address}/summary`

Get team summary (counts and depths only, no full tree). Faster than full team endpoint.

**Parameters:**
- `user_address` (path): Ethereum wallet address

---

### 3. Get Legs Breakdown
**GET** `/api/team/{user_address}/legs`

Get leg-wise team breakdown. Returns detailed breakdown of each leg (direct's team).

**Parameters:**
- `user_address` (path): Ethereum wallet address

---

### 4. Get Team Flat
**GET** `/api/team/{user_address}/flat`

Get complete team as a flat list (not hierarchical). Returns all team members with their depth level. Faster than hierarchical view for large teams.

**Parameters:**
- `user_address` (path): Ethereum wallet address

---

### 5. Get Directs Only
**GET** `/api/team/{user_address}/directs`

Get only direct referrals (no downlines). Fastest endpoint - returns just the first level.

**Parameters:**
- `user_address` (path): Ethereum wallet address

---

### 6. Get Team Stats (Ultra-Fast)
**GET** `/api/team/{user_address}/stats`

Get quick team statistics only (no member data). Ultra-fast endpoint returning just counts and depth.

**Parameters:**
- `user_address` (path): Ethereum wallet address

---

### 7. Get Portfolio Volume (Leg-wise)
**GET** `/api/team/{user_address}/portfolio-volume`

Get leg-wise portfolio volume breakdown. Returns total portfolio count and USD volume for each leg (direct + their downlines).

**Parameters:**
- `user_address` (path): Ethereum wallet address

**Response includes:**
- Total number of portfolios in each leg
- Sum of all principal_usd values
- Volume in both micro USD and actual USD

---

### 8. Get Total Portfolio Volume
**GET** `/api/team/{user_address}/portfolio-volume/total`

Get total portfolio volume across entire team. Ultra-fast endpoint returning aggregated portfolio stats only:
- Total team member count
- Total portfolio count across all team
- Total USD volume across all portfolios

**Parameters:**
- `user_address` (path): Ethereum wallet address

---

### 9-12. ROI Calculation Endpoints

#### Calculate User ROI
**GET** `/api/team/{user_address}/roi/user`

Calculate ROI for a single user for a specific day.

**Parameters:**
- `user_address` (path): Ethereum wallet address
- `day_id` (query, required): Day ID (Unix timestamp / 86400)
- `price_micro_usd` (query, required): Price in micro USD (1e6)

---

#### Calculate Team ROI
**GET** `/api/team/{user_address}/roi/team`

Calculate ROI for entire team (all downlines) for a specific day.

**Parameters:**
- `user_address` (path): Ethereum wallet address
- `day_id` (query, required): Day ID
- `price_micro_usd` (query, required): Price in micro USD

---

#### Calculate Legs ROI
**GET** `/api/team/{user_address}/roi/legs`

Calculate leg-wise ROI breakdown for a specific day. Returns one row per leg with aggregated ROI.

**Parameters:**
- `user_address` (path): Ethereum wallet address
- `day_id` (query, required): Day ID
- `price_micro_usd` (query, required): Price in micro USD

---

#### Get Leg ROI Details
**GET** `/api/team/{user_address}/roi/leg/{direct_address}`

Get detailed ROI for each member in a specific leg for a specific day.

**Parameters:**
- `user_address` (path): Ethereum wallet address
- `direct_address` (path): The direct's wallet address
- `day_id` (query, required): Day ID
- `price_micro_usd` (query, required): Price in micro USD

---

## SLAB Achievers Endpoints

### 1. Sync Achievers
**POST** `/api/slab-achievers/sync`

Sync all SLAB achievers from blockchain to database. Fetches all users who have achieved SLAB levels from smart contract and stores them in database.

**Parameters:**
- `day_id` (query, required): Day ID to associate with achievements

---

### 2. Get User Achievement
**GET** `/api/slab-achievers/user/{user_address}`

Get SLAB achievement for a specific user on a given day. Returns the SLAB level and percentage achieved.

**Parameters:**
- `user_address` (path): Ethereum wallet address
- `day_id` (query, required): Day ID

---

### 3. Get Level Achievers
**GET** `/api/slab-achievers/level/{slab_level}`

Get all users who achieved a specific SLAB level on a given day.

**Parameters:**
- `slab_level` (path): SLAB level (0-10, corresponding to 5%-60%)
- `day_id` (query, required): Day ID

---

### 4. Clear Day Data
**DELETE** `/api/slab-achievers/day/{day_id}`

Clear all SLAB achievement records for a specific day. Useful for resyncing data. **Use with caution!**

**Parameters:**
- `day_id` (path): Day ID

---

## Slab Merkle Proof Endpoints

### 1. Get Merkle Proof
**GET** `/api/slab-merkle/proof/{user_address}/{day_id}`

Get Merkle proof for a user for a specific day. Returns proof that can be submitted to smart contract.

**Parameters:**
- `user_address` (path): User's wallet address
- `day_id` (path): Day ID to claim
- `tree_dir` (query, optional): Directory containing Merkle tree data

**Response:**
```json
{
  "user_address": "0x...",
  "day_id": 150,
  "usd_amount": "5000000000",
  "rama_amount": "100000000000000000000000",
  "merkle_proof": ["0xabc...", "0xdef..."],
  "merkle_root": "0x123...",
  "leaf_hash": "0x456...",
  "instructions": {
    "contract_method": "claimWithProof(...)",
    "gas_estimate": "60000-80000"
  }
}
```

---

### 2. Get Slab Proof
**GET** `/api/slab-merkle/proof-slab/{user_address}/{day_id}`

Get SLAB Merkle proof for a user (slab differential income only). Returns proof for `claimSlabWithProof()`.

**Parameters:**
- `user_address` (path): User's wallet address
- `day_id` (path): Day ID
- `tree_dir` (query, optional): Directory containing Merkle tree data

**Response:**
```json
{
  "user_address": "0x...",
  "day_id": 150,
  "amount": "5000000000",
  "income_type": "slab",
  "merkle_proof": ["0xabc...", "0xdef..."],
  "merkle_root": "0x123...",
  "leaf_hash": "0x456..."
}
```

---

### 3. Get Override Proof
**GET** `/api/slab-merkle/proof-override/{user_address}/{day_id}`

Get OVERRIDE Merkle proof for a user (override income only). Returns proof for `claimOverrideWithProof()`.

**Parameters:**
- `user_address` (path): User's wallet address
- `day_id` (path): Day ID
- `tree_dir` (query, optional): Directory containing Merkle tree data

---

### 4. Get Both Proofs
**GET** `/api/slab-merkle/proof-both/{user_address}/{day_id}`

Get BOTH slab and override Merkle proofs for a user. Most gas-efficient way to claim when user has both types of income.

**Parameters:**
- `user_address` (path): User's wallet address
- `day_id` (path): Day ID
- `tree_dir` (query, optional): Directory containing Merkle tree data

**Response:**
```json
{
  "user_address": "0x...",
  "day_id": 150,
  "slab": {
    "amount": "5000000000",
    "merkle_proof": ["0xabc...", "0xdef..."],
    "merkle_root": "0x123..."
  },
  "override": {
    "amount": "1000000000",
    "merkle_proof": ["0x789...", "0x012..."],
    "merkle_root": "0x345..."
  },
  "total_amount": "6000000000"
}
```

---

### 5. Get Proof Batch (Multiple Days)
**GET** `/api/slab-merkle/proof-batch/{user_address}`

Get Merkle proofs for multiple days (batch). Returns proofs for all days in range where user is an achiever.

**Parameters:**
- `user_address` (path): User's wallet address
- `from_day` (query, required): Start day (inclusive)
- `to_day` (query, required): End day (inclusive)
- `tree_dir` (query, optional): Tree data directory

---

### 6. Verify Proof
**GET** `/api/slab-merkle/verify-proof/{user_address}/{day_id}`

Verify a Merkle proof locally (before submitting on-chain). Useful for testing and debugging.

**Parameters:**
- `user_address` (path): User's wallet address
- `day_id` (path): Day ID
- `tree_dir` (query, optional): Tree data directory

**Response:**
```json
{
  "valid": true,
  "user_address": "0x...",
  "day_id": 150,
  "merkle_root": "0x...",
  "message": "Proof is valid"
}
```

---

### 7. Get Merkle Root
**GET** `/api/slab-merkle/merkle-root/{day_id}`

Get Merkle root for a specific day. Used by admin to set root on-chain.

**Parameters:**
- `day_id` (path): Day ID
- `tree_dir` (query, optional): Tree data directory

**Response:**
```json
{
  "day_id": 150,
  "merkle_root": "0x123...",
  "total_achievers": 1000
}
```

---

### 8. Get Claimable with Merkle
**GET** `/api/slab-merkle/claimable/{user_address}`

Get all claimable days with proofs for a user. Returns all days from last_claimed_day to current_day where user is achiever.

**Parameters:**
- `user_address` (path): User's wallet address
- `current_day` (query, required): Current day ID
- `last_claimed_day` (query, optional, default=-1): Last day claimed
- `tree_dir` (query, optional): Tree data directory

**Response:**
```json
{
  "user_address": "0x...",
  "claimable_days": [100, 101, 105, 110, ...],
  "total_claimable_usd": "50000000000",
  "total_claimable_rama": "1000000000000000000000000",
  "days_with_income": 45,
  "proofs_ready": true
}
```

---

### 9. Merkle Health Check
**GET** `/api/slab-merkle/health`

Health check for Merkle proof service.

---

## Slab Claim Endpoints (Signed Claims)

### 1. Calculate and Sign
**GET** `/api/slab-claim/calculate/{user_address}/{from_day}/{to_day}`

Calculate slab income and return signed claim. **Main endpoint for off-chain calculation with signature verification.**

**Flow:**
1. Calculate slab income for the period using PostgreSQL
2. Get user's current nonce
3. Create EIP-712 signature
4. Return signed claim ready for on-chain submission

**Parameters:**
- `user_address` (path): User's wallet address
- `from_day` (path): Start day (inclusive)
- `to_day` (path): End day (inclusive)
- `price_micro_usd` (query, required): RAMA token price in micro USD

**Response:**
```json
{
  "user_address": "0x...",
  "from_day": 100,
  "to_day": 150,
  "usd_amount": "6000000000",
  "rama_amount": "120000000000000000000000",
  "nonce": 5,
  "signature": "0xabc123...",
  "breakdown": {
    "slab_income_usd": "5000.00",
    "override_income_usd": "1000.00",
    "total_income_usd": "6000.00"
  },
  "instructions": {
    "contract_method": "claimWithProof",
    "gas_estimate": "100000-120000"
  }
}
```

---

### 2. Get Claimable Signed
**GET** `/api/slab-claim/claimable/{user_address}`

Get claimable slab income with signature ready to claim. Automatically determines claimable period and returns signed claim.

**Parameters:**
- `user_address` (path): User's wallet address
- `price_micro_usd` (query, required): RAMA token price in micro USD
- `current_day` (query, required): Current day ID
- `last_claimed_day` (query, optional, default=-1): Last day claimed

**Response:**
```json
{
  "user_address": "0x...",
  "claimable": true,
  "from_day": 0,
  "to_day": 150,
  "usd_amount": "300000000000",
  "rama_amount": "6000000000000000000000",
  "nonce": 5,
  "signature": "0xabc...",
  "breakdown": {...}
}
```

---

### 3. Verify Signature
**POST** `/api/slab-claim/verify-signature`

Verify an EIP-712 signature (for testing/debugging). Checks if a signature is valid for given claim parameters.

**Query Parameters:**
- `user_address` (query, required): User address
- `from_day` (query, required): From day
- `to_day` (query, required): To day
- `usd_amount` (query, required): USD amount in micro USD
- `rama_amount` (query, required): RAMA amount in wei
- `nonce` (query, required): Nonce
- `signature` (query, required): Signature to verify

**Response:**
```json
{
  "valid": true,
  "signer_address": "0x...",
  "message": "Signature is valid"
}
```

---

### 4. Get Nonce
**GET** `/api/slab-claim/nonce/{user_address}`

Get current nonce for a user. Used for replay attack prevention. Increments with each successful claim.

**Parameters:**
- `user_address` (path): User's wallet address

**Response:**
```json
{
  "user_address": "0x...",
  "nonce": 5
}
```

---

### 5. Get Claim History
**GET** `/api/slab-claim/claim-history/{user_address}`

Get claim history for a user. Returns all past claims with amounts and dates.

**Parameters:**
- `user_address` (path): User's wallet address

**Response:**
```json
{
  "user_address": "0x...",
  "total_claims": 3,
  "claims": [
    {
      "from_day": 100,
      "to_day": 150,
      "usd_amount": "5000000000",
      "rama_amount": "100000000000000000000",
      "claimed_at": "2024-01-15T10:30:00"
    }
  ]
}
```

---

### 6. Get Signer Info
**GET** `/api/slab-claim/signer-info`

Get information about the trusted signer. Returns signer address, contract address, and chain ID.

**Response:**
```json
{
  "signer_address": "0x...",
  "contract_address": "0x...",
  "chain_id": 137,
  "network": "Polygon Mainnet"
}
```

---

### 7. Claim Health Check
**GET** `/api/slab-claim/health`

Health check for slab claim service. Verifies signature service is initialized and database is accessible.

**Response:**
```json
{
  "status": "healthy",
  "signature_service": "operational",
  "database": "connected"
}
```

---

## Data/Sync Endpoints

### Sync Routes
- **POST** `/sync/users` - Sync Users Route
- **POST** `/sync/portfolios` - Sync Portfolios Route
- **POST** `/sync/slabs` - Sync Slabs Route
- **POST** `/sync/all` - Sync All Route
- **POST** `/sync/apply-team-procedures` - Apply/update team database procedures. Run once after setup or when procedures are updated.

### Data Routes
- **GET** `/data/users` - List Users (with skip/limit pagination)
- **GET** `/data/users/{address}/portfolios` - User Portfolios
- **GET** `/data/slab-achievers` - List Slab Achievers (with skip/limit pagination)

---

## Key Implementation Details

### For SameSlabScreen Component

**Use this endpoint:**
```
GET /api/combined/{user_address}/{day_id}?price_micro_usd={price}
```

**Today's day_id:**
```javascript
const calculateDayId = () => Math.floor(Date.now() / 1000 / 86400);
```

**Response contains:**
- `slab_income_usd`, `slab_income_rama_wei`
- `override_income_usd`, `override_income_rama_wei`
- `slab_details[]` - Array of slab differential details
- `override_details[]` - Array of override achiever details
- `total_income_usd`, `total_income_rama_wei`

### For History Tabs

**Use endpoint:**
```
GET /api/period/{user_address}?from_day={from}&to_day={to}&price_micro_usd={price}
```

**Response includes:**
- `daily_breakdown[]` - Array with day_id and daily amounts

---

## Response Codes

- **200** - Successful response
- **422** - Validation error (see HTTPValidationError for details)

---

## Common Patterns

### Convert Amounts
```javascript
// microUSD to USD
const usd = microUsd / 1_000_000;

// wei RAMA to RAMA  
const rama = weiRama / 1e18;
```

### Build Query Parameters
```javascript
const params = new URLSearchParams({
  price_micro_usd: '50000000',
  day_id: '150'
});

const url = `/api/combined/0x.../150?${params}`;
```

---

Last Updated: From OpenAPI 3.1.0 spec (https://testapi.oceandefi.uk/openapi.json)
