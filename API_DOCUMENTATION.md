# Ocean DeFi API Documentation

## Base URL
```
https://testapi.oceandefi.uk
```

## Key Concepts

- **day_id**: Day ID (0-based from contract start), calculated as `Unix timestamp / 86400`
- **price_micro_usd**: Token price in micro USD (e.g., 50000000 = $0.05)
- **All amounts in microUSD** unless noted (divide by 1e6 to get USD)
- **All RAMA amounts in wei** (wei = RAMA × 1e18)

---

## Slab Income Endpoints

### 1. Get Slab Level & Percentage
```
GET /api/slab/{user_address}/{day_id}
```

**Parameters:**
- `user_address`: Ethereum wallet address
- `day_id`: Day ID (integer)

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

### 2. Get Slab Income (Differential)
```
GET /api/slab-income/{user_address}/{day_id}?price_micro_usd={price}
```

**Parameters:**
- `user_address`: Ethereum wallet address
- `day_id`: Day ID
- `price_micro_usd`: Token price in micro USD (required)

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
    "legs_detail": [...]
}
```

---

### 3. Get Override Income (Same-Slab Achievement Bonus)
```
GET /api/override-income/{user_address}/{day_id}?price_micro_usd={price}
```

**Parameters:**
- `user_address`: Ethereum wallet address
- `day_id`: Day ID
- `price_micro_usd`: Token price in micro USD (required)

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
    "achievers_detail": [...]
}
```

**When paid:**
- 10% when downline reaches your slab (1st occurrence)
- 5% for 2nd achievement (2nd occurrence)
- 5% for 3rd+ achievements (3rd+ occurrences)

---

### 4. Get Combined Income (RECOMMENDED)
```
GET /api/combined/{user_address}/{day_id}?price_micro_usd={price}
```

**Best endpoint for getting complete breakdown in one call.**

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
    "override_income_micro_usd": 1000000000,
    "override_income_usd": 1000.00,
    "override_income_rama_wei": "20000000000000000000",
    "total_income_micro_usd": 6000000000,
    "total_income_usd": 6000.00,
    "total_income_rama_wei": "120000000000000000000",
    "slab_details": [...],
    "override_details": [...]
}
```

---

### 5. Get Period Income
```
GET /api/period/{user_address}?from_day={from}&to_day={to}&price_micro_usd={price}
```

**Aggregates income for a range of days.**

**Parameters:**
- `user_address`: Ethereum wallet address
- `from_day`: Start day ID (inclusive)
- `to_day`: End day ID (inclusive)
- `price_micro_usd`: Token price in micro USD

**Response:**
```json
{
    "user_address": "0x...",
    "from_day": 100,
    "to_day": 150,
    "days_count": 51,
    "total_slab_income_usd": 250000.00,
    "total_slab_income_rama_wei": "5000000000000000000000",
    "total_override_income_usd": 50000.00,
    "total_override_income_rama_wei": "1000000000000000000000",
    "grand_total_income_usd": 300000.00,
    "grand_total_income_rama_wei": "6000000000000000000000",
    "daily_breakdown": [...]
}
```

---

### 6. Get Claimable Income
```
GET /api/claimable/{user_address}?price_micro_usd={price}&current_day={day}
```

**Get claimable slab income up to current day.**

**Parameters:**
- `user_address`: Ethereum wallet address
- `price_micro_usd`: Token price in micro USD
- `current_day`: Current day ID

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

## Team Endpoints

### 1. Get Complete Team
```
GET /api/team/{user_address}
```

**Returns complete team structure with all downlines (recursive).**

**Response:**
```json
{
    "user_address": "0x...",
    "total_team_count": 500,
    "max_depth": 8,
    "directs": [...],
    "leg_breakdown": {...}
}
```

---

### 2. Get Team Summary (Fast)
```
GET /api/team/{user_address}/summary
```

**Returns counts and depths only (no member data).**

---

### 3. Get Legs Breakdown
```
GET /api/team/{user_address}/legs
```

**Get leg-wise team breakdown (each direct + their downlines).**

---

### 4. Get Team as Flat List
```
GET /api/team/{user_address}/flat
```

**Returns all team members as flat list with depth levels.**

---

### 5. Get Direct Referrals Only
```
GET /api/team/{user_address}/directs
```

**Returns only first-level directs (fastest endpoint).**

---

### 6. Get Team Stats
```
GET /api/team/{user_address}/stats
```

**Ultra-fast: just counts and depth, no member data.**

---

### 7. Get Portfolio Volume by Leg
```
GET /api/team/{user_address}/portfolio-volume
```

**Returns leg-wise portfolio count and USD volume.**

**Response:**
```json
{
    "user_address": "0x...",
    "legs": [
        {
            "leg_index": 1,
            "direct_address": "0x...",
            "portfolio_count": 150,
            "total_volume_micro_usd": 500000000000,
            "total_volume_usd": 500000.00
        }
    ]
}
```

---

### 8. Get Total Portfolio Volume
```
GET /api/team/{user_address}/portfolio-volume/total
```

**Ultra-fast: aggregated portfolio stats only.**

---

## Slab Achievers Endpoints

### 1. Get User Achievement
```
GET /api/slab-achievers/user/{user_address}?day_id={day_id}
```

**Get SLAB achievement for a specific user on a given day.**

**Response:**
```json
{
    "user_address": "0x...",
    "day_id": 150,
    "slab_level": 3,
    "slab_percentage": 10.00,
    "achieved_at": "2024-01-15T10:30:00"
}
```

---

### 2. Get Achievers for Level
```
GET /api/slab-achievers/level/{slab_level}?day_id={day_id}
```

**Get all users who achieved a specific SLAB level on a given day.**

**Parameters:**
- `slab_level`: 0-10 (corresponding to 5%-60%)
- `day_id`: Day ID

---

## Merkle Proof Endpoints (For On-Chain Claims)

### 1. Get Merkle Proof
```
GET /api/slab-merkle/proof/{user_address}/{day_id}
```

**Returns Merkle proof for on-chain claim submission.**

**Response:**
```json
{
    "user_address": "0x...",
    "day_id": 150,
    "usd_amount": "5000000000",
    "rama_amount": "100000000000000000000000",
    "merkle_proof": ["0xabc...", "0xdef..."],
    "merkle_root": "0x123...",
    "leaf_hash": "0x456..."
}
```

---

### 2. Get Slab Proof Only
```
GET /api/slab-merkle/proof-slab/{user_address}/{day_id}
```

**Returns proof for slab differential income only.**

---

### 3. Get Override Proof Only
```
GET /api/slab-merkle/proof-override/{user_address}/{day_id}
```

**Returns proof for override income only.**

---

### 4. Get Both Proofs
```
GET /api/slab-merkle/proof-both/{user_address}/{day_id}
```

**Returns both slab and override proofs in one call.**

---

## Slab Claim Endpoints (For Signed Claims)

### 1. Calculate & Sign Claim
```
GET /api/slab-claim/calculate/{user_address}/{from_day}/{to_day}?price_micro_usd={price}
```

**Calculate slab income and return signed claim.**

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
    }
}
```

---

### 2. Get Claimable with Signature
```
GET /api/slab-claim/claimable/{user_address}?price_micro_usd={price}&current_day={day}
```

**Get claimable income and signed claim automatically.**

---

### 3. Get Claim History
```
GET /api/slab-claim/claim-history/{user_address}
```

**Get all past claims for a user.**

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

### 4. Get Current Nonce
```
GET /api/slab-claim/nonce/{user_address}
```

**Get current nonce for replay attack prevention.**

---

## Health Checks

```
GET /api/health
GET /api/slab-merkle/health
GET /api/slab-claim/health
```

---

## Usage Examples

### Get Today's Slab Income
```javascript
const userAddress = "0x...";
const today = Math.floor(Date.now() / 86400000);
const ramaPrice = 50000000; // $0.05

const response = await fetch(
  `https://testapi.oceandefi.uk/api/combined/${userAddress}/${today}?price_micro_usd=${ramaPrice}`
);
const data = await response.json();

console.log(`Slab Income: $${data.slab_income_usd}`);
console.log(`Override Income: $${data.override_income_usd}`);
console.log(`Total: $${data.total_income_usd}`);
```

### Get Period Income
```javascript
const from_day = 100;
const to_day = 150;

const response = await fetch(
  `https://testapi.oceandefi.uk/api/period/${userAddress}?from_day=${from_day}&to_day=${to_day}&price_micro_usd=50000000`
);
const data = await response.json();

console.log(`Total Income: $${data.grand_total_income_usd}`);
console.log(`Slab: $${data.total_slab_income_usd}`);
console.log(`Override: $${data.total_override_income_usd}`);
```

### Get Claimable Income
```javascript
const current_day = Math.floor(Date.now() / 86400000);

const response = await fetch(
  `https://testapi.oceandefi.uk/api/claimable/${userAddress}?price_micro_usd=50000000&current_day=${current_day}`
);
const data = await response.json();

console.log(`Claimable: $${data.total_claimable_usd}`);
```

### Get Team Portfolio Volume
```javascript
const response = await fetch(`https://testapi.oceandefi.uk/api/team/${userAddress}/portfolio-volume`);
const data = await response.json();

data.legs.forEach(leg => {
  console.log(`Leg ${leg.leg_index}: ${leg.portfolio_count} portfolios, $${leg.total_volume_usd}`);
});
```

---

## Notes

1. **Day ID Calculation**: `day_id = Math.floor(timestamp / 86400)`
2. **Price Format**: Always in micro USD (1e6), so $0.05 = 50000000
3. **Amounts**: All USD in microUSD (divide by 1e6), RAMA in wei (divide by 1e18)
4. **Real-time data**: API calculates on demand from blockchain data
5. **Errors**: Check HTTP status code and error message in response

