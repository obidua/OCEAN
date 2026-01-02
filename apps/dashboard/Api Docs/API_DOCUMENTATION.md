# Ocean DeFi Slab Income API Documentation

**Base URL:** `https://testapi.oceandefi.uk`  
**Version:** 1.0.0  
**Description:** FastAPI backend for Ocean DeFi Slab Income Distribution System

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Key Concepts](#key-concepts)
4. [Dashboard Endpoints](#dashboard-endpoints)
5. [Slab Income Endpoints](#slab-income-endpoints)
6. [Team Endpoints](#team-endpoints)
7. [Claims Endpoints](#claims-endpoints)
8. [Merkle Proof Endpoints](#merkle-proof-endpoints)
9. [Admin Endpoints](#admin-endpoints)
10. [Data Types & Units](#data-types--units)

---

## Overview

This API provides endpoints for:
- **Dashboard**: Complete dashboard data for UI display
- **Slab Income**: Calculate slab differential and override income
- **Team**: Team structure, ROI calculations, portfolio volumes
- **Claims**: Claiming slab income on-chain
- **Merkle Proofs**: Generate and verify Merkle proofs for claims
- **Admin**: User management, voucher distribution

---

## Authentication

### Public Endpoints
Most data endpoints are public and don't require authentication.

### Admin Endpoints
Admin endpoints require JWT authentication:

```javascript
// Login to get tokens
const response = await fetch('https://testapi.oceandefi.uk/api/admin/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: 'username=admin&password=yourpassword'
});
const { access_token, refresh_token } = await response.json();

// Use access_token in subsequent requests
headers: { 'Authorization': `Bearer ${access_token}` }
```

---

## Key Concepts

### Day ID
- Day ID is a Unix timestamp divided by 86400 (seconds per day)
- Example: `day_id = Math.floor(Date.now() / 1000 / 86400)`
- Used for tracking daily income calculations

### Price in Micro USD
- All USD values are stored as micro USD (1e6 = $1.00)
- Example: `50000000` = $0.05 (5 cents)
- Convert to USD: `amount_micro_usd / 1_000_000`

### RAMA Amount in Wei
- RAMA token amounts are in wei (1e18 wei = 1 RAMA)
- Always returned as strings to preserve precision

### Slab Levels
| Level | Percentage | Threshold USD |
|-------|------------|---------------|
| 0 | 5% | $500 |
| 1 | 10% | $2,500 |
| 2 | 15% | $10,000 |
| 3 | 20% | $25,000 |
| 4 | 25% | $50,000 |
| 5 | 30% | $100,000 |
| 6 | 35% | $500,000 |
| 7 | 40% | $1,000,000 |
| 8 | 45% | $2,500,000 |
| 9 | 50% | $5,000,000 |
| 10 | 60% | $20,000,000 |

---

## Dashboard Endpoints

### 1. Get Complete Dashboard (RECOMMENDED)
**THE MOST EFFICIENT ENDPOINT - Use this for the main dashboard!**

```
GET /api/dashboard/complete/{user_address}
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| user_address | string | Yes | Ethereum wallet address |
| day_id | integer | No | Specific day (defaults to current) |
| price_micro_usd | integer | No | RAMA price (default: 50000000) |
| include_achievers | boolean | No | Include level achievers (default: false) |

**Example Request:**
```javascript
const response = await fetch(
  'https://testapi.oceandefi.uk/api/dashboard/complete/0x123...?price_micro_usd=50000000&include_achievers=true'
);
const data = await response.json();
```

**Response:**
```json
{
  "user_address": "0x123...",
  "day_id": 20423,
  "today": {
    "slab_income_micro_usd": 5000000000,
    "slab_income_usd": 5000.00,
    "override_income_micro_usd": 1000000000,
    "override_income_usd": 1000.00,
    "total_income_micro_usd": 6000000000,
    "total_income_usd": 6000.00
  },
  "all_time": {
    "total_slab_income_usd": 250000.00,
    "total_override_income_usd": 50000.00,
    "grand_total_usd": 300000.00
  },
  "last_30_days": {
    "total_income_usd": 45000.00
  },
  "claimable": {
    "total_unclaimed_usd": 15000.00,
    "unclaimed_days_count": 30
  },
  "team": {
    "total_team_count": 150,
    "direct_count": 10,
    "total_team_roi_usd": 50000.00
  },
  "user_achievement": {
    "slab_level": 5,
    "slab_percentage": 30.0
  },
  "historical_data": [
    {
      "day_id": 20423,
      "date": "2026-01-02",
      "slab_income_usd": 5000.00,
      "override_income_usd": 1000.00,
      "total_income_usd": 6000.00
    }
  ],
  "level_achievers": {
    "level_1": { "count": 50, "users": [] },
    "level_2": { "count": 30, "users": [] }
  }
}
```

**UI Implementation Notes:**
- Use `today` object for "Today's Income" card
- Use `all_time.total_slab_income_usd` for "Total Slab Differential" card
- Use `all_time.total_override_income_usd` for "Total Override Income" card
- Use `last_30_days.total_income_usd` for "Last 30 Days" card
- Use `claimable.total_unclaimed_usd` for "Total Claimable" card
- Use `team.total_team_count` for "Total Team" card
- Use `historical_data` for charts

---

### 2. Get Enhanced Dashboard
**Alternative dashboard with additional metrics**

```
GET /api/dashboard/enhanced/{user_address}
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| user_address | string | Yes | Ethereum wallet address |
| day_id | integer | No | Specific day (defaults to current) |

**Response:**
```json
{
  "user_address": "0x123...",
  "today_slab_income_usd": 5000.00,
  "total_claimed_usd": 200000.00,
  "total_unclaimed_usd": 100000.00,
  "total_slab_income_usd": 250000.00,
  "total_override_income_usd": 50000.00,
  "total_team_roi_usd": 500000.00,
  "total_team_count": 150,
  "total_direct_count": 10,
  "level_breakdown": {
    "level_1": 50,
    "level_2": 30,
    "level_3": 20
  },
  "claimed_count": 45,
  "vouchers_count": 5
}
```

---

### 3. Get Dashboard History
**For historical charts**

```
GET /api/dashboard/history/{user_address}
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| user_address | string | Yes | Ethereum wallet address |
| from_day | integer | Yes | Start day ID |
| to_day | integer | Yes | End day ID |
| price_micro_usd | integer | No | RAMA price (default: 50000000) |

**Response:**
```json
{
  "user_address": "0x123...",
  "from_day": 20390,
  "to_day": 20423,
  "daily_data": [
    {
      "day_id": 20390,
      "date": "2025-12-01",
      "slab_income_usd": 150.50,
      "override_income_usd": 25.00,
      "total_income_usd": 175.50
    }
  ]
}
```

---

### 4. Get Level-Wise Team
**For team breakdown by slab level**

```
GET /api/dashboard/level-team/{user_address}
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| user_address | string | Yes | Ethereum wallet address |
| page | integer | No | Page number (default: 1) |
| limit | integer | No | Items per page (default: 50, max: 500) |
| level | integer | No | Filter by specific level |

**Response:**
```json
{
  "user_address": "0x123...",
  "total_count": 150,
  "page": 1,
  "limit": 50,
  "levels": {
    "1": [
      { "address": "0xabc...", "user_id": 123, "volume_usd": 5000.00 }
    ],
    "2": [],
    "3": []
  }
}
```

---

### 5. Get Level-Wise ROI
**ROI received from each level**

```
GET /api/dashboard/level-roi/{user_address}
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| user_address | string | Yes | Ethereum wallet address |
| page | integer | No | Page number (default: 1) |
| limit | integer | No | Items per page (default: 50) |
| sort_by | string | No | Sort by: 'level', 'roi', or 'claimed' |

**Response:**
```json
{
  "user_address": "0x123...",
  "levels": [
    { "level": 1, "total_roi_usd": 10000.00, "claimed_usd": 8000.00 },
    { "level": 2, "total_roi_usd": 5000.00, "claimed_usd": 4000.00 }
  ]
}
```

---

### 6. Get Leg Contributions
**Portfolio volume by leg**

```
GET /api/dashboard/leg-contributions/{user_address}
```

**Response:**
```json
{
  "user_address": "0x123...",
  "leg1_volume_usd": 100000.00,
  "leg2_volume_usd": 75000.00,
  "leg_rest_volume_usd": 25000.00,
  "total_volume_usd": 200000.00
}
```

---

### 7. Get Price Trend
**Historical RAMA price data**

```
GET /api/dashboard/price-trend
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| days | integer | No | Number of days (default: 30, max: 365) |

**Response:**
```json
{
  "prices": [
    { "day_id": 20423, "date": "2026-01-02", "price_micro_usd": 50000000, "price_usd": 0.05 }
  ]
}
```

---

### 8. Get Override Details
**Slab override income details**

```
GET /api/dashboard/override-details/{user_address}
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| user_address | string | Yes | Ethereum wallet address |
| page | integer | No | Page number (default: 1) |
| limit | integer | No | Items per page (default: 50) |

**Response:**
```json
{
  "total_override_income_usd": 50000.00,
  "override_history": [
    {
      "day_id": 20423,
      "achiever_address": "0xabc...",
      "achiever_slab_level": 3,
      "override_percentage": 10,
      "amount_usd": 500.00
    }
  ]
}
```

---

## Slab Income Endpoints

### 1. Get Slab Level
**Get user's slab level for a day**

```
GET /api/slab/{user_address}/{day_id}
```

**Response:**
```json
{
  "user_address": "0x123...",
  "day_id": 150,
  "slab_level": 3,
  "slab_percentage": 20.00
}
```

---

### 2. Get Considerable ROI
**Calculate team ROI × 36% (considerable ROI)**

```
GET /api/considerable-roi/{user_address}/{day_id}
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| price_micro_usd | integer | No | RAMA price (auto-fetches if not provided) |

**Response:**
```json
{
  "user_address": "0x123...",
  "day_id": 150,
  "total_legs_roi_micro_usd": 10000000000,
  "considerable_roi_micro_usd": 3600000000,
  "considerable_roi_usd": 3600.00
}
```

---

### 3. Get Slab Income
**Calculate slab differential income for a day**

```
GET /api/slab-income/{user_address}/{day_id}
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| price_micro_usd | integer | No | RAMA price (auto-fetches if not provided) |

**Response:**
```json
{
  "user_address": "0x123...",
  "day_id": 150,
  "user_slab_level": 3,
  "user_slab_percentage": 20.00,
  "total_slab_income_micro_usd": 5000000000,
  "total_slab_income_usd": 5000.00,
  "total_slab_income_rama_wei": "100000000000000000000",
  "legs_count": 5,
  "legs_detail": [
    {
      "direct_address": "0xabc...",
      "leg_index": 1,
      "members_count": 50,
      "leg_slab_income_usd": 2000.00,
      "cap_applied": false
    }
  ],
  "price_used_micro_usd": 50000000,
  "price_auto_fetched": true
}
```

---

### 4. Get Override Income
**Calculate slab override income (10%/5%/5% to uplines)**

```
GET /api/override-income/{user_address}/{day_id}
```

**Response:**
```json
{
  "user_address": "0x123...",
  "day_id": 150,
  "user_slab_level": 3,
  "total_override_income_micro_usd": 1000000000,
  "total_override_income_usd": 1000.00,
  "total_override_income_rama_wei": "20000000000000000000",
  "achievers_count": 3,
  "achievers_detail": [
    {
      "achiever_address": "0xabc...",
      "achiever_slab_level": 3,
      "relationship": "direct",
      "override_percentage": 10,
      "amount_usd": 500.00
    }
  ]
}
```

---

### 5. Get Combined Income (RECOMMENDED)
**Both slab and override in one call**

```
GET /api/combined/{user_address}/{day_id}
```

**Response:**
```json
{
  "user_address": "0x123...",
  "day_id": 150,
  "user_slab_level": 3,
  "user_slab_percentage": 20.00,
  "slab_income_micro_usd": 5000000000,
  "slab_income_usd": 5000.00,
  "slab_income_rama_wei": "100000000000000000000",
  "override_income_micro_usd": 1000000000,
  "override_income_usd": 1000.00,
  "override_income_rama_wei": "20000000000000000000",
  "total_income_micro_usd": 6000000000,
  "total_income_usd": 6000.00,
  "total_income_rama_wei": "120000000000000000000",
  "legs_count": 5,
  "achievers_count": 3
}
```

---

### 6. Get Period Income
**Income for a date range**

```
GET /api/period/{user_address}
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| from_day | integer | Yes | Start day (inclusive) |
| to_day | integer | Yes | End day (inclusive) |
| price_micro_usd | integer | No | RAMA price (auto-fetches daily if not provided) |

**Response:**
```json
{
  "user_address": "0x123...",
  "from_day": 100,
  "to_day": 150,
  "days_count": 51,
  "total_slab_income_usd": 250000.00,
  "total_override_income_usd": 50000.00,
  "grand_total_income_usd": 300000.00,
  "daily_breakdown": []
}
```

---

### 7. Get Claimable Income
**Get claimable income up to current day**

```
GET /api/claimable/{user_address}
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| current_day | integer | Yes | Current day ID |
| price_micro_usd | integer | No | RAMA price |

**Response:**
```json
{
  "user_address": "0x123...",
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

### 1. Get Team Structure
**Complete hierarchical team structure**

```
GET /api/team/{user_address}
```

**Response:**
```json
{
  "user_address": "0x123...",
  "total_team_count": 150,
  "max_depth": 5,
  "legs_count": 3,
  "team": [
    {
      "address": "0xabc...",
      "user_id": 123,
      "depth": 1,
      "downlines": []
    }
  ]
}
```

---

### 2. Get Team Summary
**Quick counts without full tree**

```
GET /api/team/{user_address}/summary
```

**Response:**
```json
{
  "user_address": "0x123...",
  "total_team_count": 150,
  "direct_count": 10,
  "max_depth": 5
}
```

---

### 3. Get Team Stats
**Ultra-fast statistics only**

```
GET /api/team/{user_address}/stats
```

**Response:**
```json
{
  "total_count": 150,
  "direct_count": 10,
  "max_depth": 5
}
```

---

### 4. Get Directs Only
**First level referrals**

```
GET /api/team/{user_address}/directs
```

**Response:**
```json
{
  "directs": [
    { "address": "0xabc...", "user_id": 123 }
  ]
}
```

---

### 5. Get Flat Team List
**All team members as flat list**

```
GET /api/team/{user_address}/flat
```

**Response:**
```json
{
  "members": [
    { "address": "0xabc...", "user_id": 123, "depth": 1 },
    { "address": "0xdef...", "user_id": 124, "depth": 2 }
  ]
}
```

---

### 6. Get Legs Breakdown
**Team breakdown by direct**

```
GET /api/team/{user_address}/legs
```

**Response:**
```json
{
  "legs": [
    {
      "direct_address": "0xabc...",
      "leg_index": 1,
      "total_members": 50,
      "max_depth": 4
    }
  ]
}
```

---

### 7. Get Portfolio Volume
**Leg-wise portfolio volume**

```
GET /api/team/{user_address}/portfolio-volume
```

**Response:**
```json
{
  "user_address": "0x123...",
  "total_portfolios": 150,
  "total_volume_usd": 500000.00,
  "legs": [
    {
      "direct_address": "0xabc...",
      "leg_index": 1,
      "portfolio_count": 50,
      "volume_usd": 200000.00
    }
  ]
}
```

---

### 8. Get Team ROI for Day
**Team ROI for dashboard**

```
GET /api/team/{user_address}/roi/dashboard/day
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| day_id | integer | No | Day ID (defaults to current) |

**Response:**
```json
{
  "user_address": "0x123...",
  "day_id": 20423,
  "total_team_portfolios": 150,
  "total_team_roi_micro_usd": 50000000000,
  "total_team_roi_usd": 50000.00
}
```

---

### 9. Get Team ROI History
**Historical team ROI for charts**

```
GET /api/team/{user_address}/roi/dashboard/history
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| from_day | integer | No | Start day (defaults to 30 days ago) |
| to_day | integer | No | End day (defaults to current) |

**Response:**
```json
{
  "history": [
    {
      "day_id": 20423,
      "total_team_portfolios": 150,
      "total_team_roi_usd": 50000.00,
      "user_slab_income_usd": 5000.00,
      "slab_percentage": 10.0
    }
  ]
}
```

---

### 10. Get Team ROI Summary
**Dashboard KPIs**

```
GET /api/team/{user_address}/roi/dashboard/summary
```

**Response:**
```json
{
  "today_team_roi_usd": 50000.00,
  "today_slab_income_usd": 5000.00,
  "today_slab_percentage": 10.0,
  "last_7_days_avg_roi_usd": 45000.00,
  "last_30_days_avg_roi_usd": 42000.00,
  "total_team_portfolios": 150
}
```

---

## Claims Endpoints

### 1. Get Unclaimed Income
**Paginated list of unclaimed income**

```
GET /api/claims/unclaimed/{user_address}
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| page | integer | No | Page number (default: 1) |
| limit | integer | No | Items per page (default: 50, max: 500) |

**Response:**
```json
{
  "user_address": "0x123...",
  "total_count": 30,
  "page": 1,
  "limit": 50,
  "unclaimed": [
    {
      "day_id": 150,
      "slab_income_usd": 5000.00,
      "override_income_usd": 1000.00,
      "total_usd": 6000.00
    }
  ]
}
```

---

### 2. Claim All Income
**Claim all unclaimed income**

```
POST /api/claims/claim-all/{user_address}
```

**Response:**
```json
{
  "user_address": "0x123...",
  "days_claimed": 30,
  "total_claimed_usd": 180000.00,
  "claim_ready": true
}
```

---

### 3. Claim Specific Day
**Claim one day's income**

```
POST /api/claims/claim-specific/{user_address}?day_id=150
```

---

### 4. Get Claims Summary
**Quick claims overview**

```
GET /api/claims/summary/{user_address}
```

**Response:**
```json
{
  "total_claimed_usd": 500000.00,
  "total_unclaimed_usd": 100000.00,
  "unclaimed_days": 30,
  "last_claim_day": 120
}
```

---

## Merkle Proof Endpoints

### 1. Get Merkle Proof
**Get proof for claiming on-chain**

```
GET /api/merkle/proof/{user_address}/{day_id}/{income_type}
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| income_type | string | 'slab' or 'override' |

**Response:**
```json
{
  "user_address": "0x123...",
  "day_id": 150,
  "income_type": "slab",
  "amount": "5000000000",
  "amount_usd": 5000.00,
  "merkle_root": "0x1234...",
  "leaf_hash": "0x5678...",
  "leaf_index": 42,
  "merkle_proof": ["0xabcd...", "0xef12..."],
  "is_claimed": false,
  "is_published": true
}
```

**Smart Contract Usage:**
```javascript
const proof = await fetch(`/api/merkle/proof/${address}/${dayId}/slab`).then(r => r.json());

await contract.claimSlabWithProof(
  proof.day_id,
  proof.amount,
  proof.merkle_proof
);
```

---

### 2. Get Unclaimed Proofs
**All unclaimed income with proofs**

```
GET /api/merkle/unclaimed/{user_address}
```

**Response:**
```json
{
  "user_address": "0x123...",
  "unclaimed_count": 5,
  "total_unclaimed_usd": 1250.50,
  "claims": [
    {
      "day_id": 150,
      "income_type": "slab",
      "amount_usd": 250.00,
      "merkle_root": "0x1234...",
      "merkle_proof": ["0xabcd...", "0xef12..."]
    }
  ]
}
```

---

### 3. Get Both Proofs
**Slab and override proofs together**

```
GET /api/slab-merkle/proof-both/{user_address}/{day_id}
```

**Response:**
```json
{
  "user_address": "0x123...",
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

**Smart Contract Usage:**
```javascript
await contract.claimBothWithProof(
  data.day_id,
  data.slab.amount,
  data.override.amount,
  data.slab.merkle_proof,
  data.override.merkle_proof
);
```

---

## Slab Income Extended Endpoints

### 1. Get Total Received Income
**All-time income totals**

```
GET /api/slab-income-extended/total/{user_address}
```

**Response:**
```json
{
  "user_address": "0x123...",
  "from_day": 0,
  "to_day": 365,
  "total_days": 366,
  "total_slab_income_usd": 50000.00,
  "total_override_income_usd": 10000.00,
  "grand_total_income_usd": 60000.00
}
```

---

### 2. Get Income History
**Paginated income history**

```
GET /api/slab-income-extended/history/{user_address}
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| page | integer | No | Page number (default: 1) |
| limit | integer | No | Items per page (max: 365) |
| from_day | integer | No | Filter start day |
| to_day | integer | No | Filter end day |
| sort_order | string | No | 'asc' or 'desc' (default: 'desc') |

**Response:**
```json
{
  "user_address": "0x123...",
  "page": 1,
  "limit": 50,
  "total_records": 365,
  "total_pages": 8,
  "has_next": true,
  "records": [
    {
      "day_id": 365,
      "date": "2024-11-30",
      "slab_level": 5,
      "slab_percentage": 30,
      "slab_income_usd": 150.50,
      "override_income_usd": 25.00,
      "total_income_usd": 175.50
    }
  ]
}
```

---

### 3. Get Chart Data
**Data for charts**

```
GET /api/slab-income-extended/chart-data/{user_address}
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| days | integer | No | Days of history (default: 30, max: 365) |

**Response:**
```json
{
  "labels": ["Day 335", "Day 336", "Day 365"],
  "dates": ["2024-11-01", "2024-11-02", "2024-11-30"],
  "slab_income": [100.50, 150.75, 200.00],
  "override_income": [20.00, 30.50, 40.00],
  "total_income": [120.50, 181.25, 240.00],
  "cumulative_total": [120.50, 301.75, 7440.00]
}
```

---

### 4. Get User Achievements
**All slab achievements with T+1 eligibility**

```
GET /api/slab-income-extended/achievements/{user_address}
```

**Response:**
```json
{
  "user_address": "0x123...",
  "total_achievements": 3,
  "highest_slab_level": 5,
  "achievements": [
    {
      "slab_level": 1,
      "slab_percentage": 10.0,
      "achievement_day": 50,
      "achievement_date": "2024-10-01",
      "first_eligible_day": 51,
      "qualified_total_usd": 2500.00
    }
  ]
}
```

---

## Admin Endpoints

### Authentication

#### Login
```
POST /api/admin/auth/login
Content-Type: application/x-www-form-urlencoded

username=admin&password=yourpassword
```

**Response:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

---

### Voucher Management

#### Create Voucher
```
POST /api/admin/vouchers/create
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "user_address": "0x123...",
  "from_day_id": 100,
  "to_day_id": 150,
  "notes": "Manual distribution",
  "expiry_days": 30
}
```

#### Get User Vouchers
```
GET /api/admin/vouchers/user/{user_address}
Authorization: Bearer {access_token}
```

#### Get Voucher Stats
```
GET /api/admin/vouchers/stats
Authorization: Bearer {access_token}
```

---

### Merkle Tree Administration

#### Generate Merkle Trees
```
POST /api/merkle/admin/generate
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "day_id": 150
}
```

**Response:**
```json
{
  "success": true,
  "day_id": 150,
  "price_used_usd": 0.05,
  "slab_tree": {
    "merkle_root": "0x123...",
    "total_leaves": 100,
    "total_amount_usd": 50000.00
  },
  "override_tree": {
    "merkle_root": "0x456...",
    "total_leaves": 50,
    "total_amount_usd": 10000.00
  }
}
```

#### Mark as Published
```
POST /api/merkle/admin/mark-published
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "day_id": 150,
  "income_type": "slab",
  "tx_hash": "0x1234...",
  "block_number": 12345678
}
```

---

## Data Types & Units

### Amount Conversions

| Type | Unit | Example | Conversion |
|------|------|---------|------------|
| Micro USD | 1e-6 USD | 5000000000 | / 1,000,000 = $5,000.00 |
| RAMA Wei | 1e-18 RAMA | "100000000000000000000" | / 1e18 = 100 RAMA |
| Day ID | Unix days | 20423 | × 86400 = Unix timestamp |

### JavaScript Helpers

```javascript
// Convert micro USD to USD
const toUSD = (microUsd) => microUsd / 1_000_000;

// Convert wei to RAMA
const toRAMA = (wei) => Number(BigInt(wei) / BigInt(1e18));

// Get current day ID
const getCurrentDayId = () => Math.floor(Date.now() / 1000 / 86400);

// Convert day ID to date
const dayIdToDate = (dayId) => new Date(dayId * 86400 * 1000);
```

---

## Error Responses

All endpoints return standard HTTP error codes:

```json
{
  "detail": "Error message here"
}
```

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid or missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 422 | Validation Error - Invalid input format |
| 500 | Server Error - Internal error |

---

## Health Check

```
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2026-01-02T10:30:00Z"
}
```

---

## WebSocket / SSE

### Real-time Dashboard Updates

```
GET /dashboard/stream/{user_address}
```

**JavaScript Usage:**
```javascript
const es = new EventSource('/dashboard/stream/0x123...');

es.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Income update:', data);
  // Update dashboard UI
};

es.onerror = (error) => {
  console.error('SSE Error:', error);
  es.close();
};
```

---

## Rate Limits

- **Public endpoints**: 100 requests/minute
- **Admin endpoints**: 30 requests/minute
- **Heavy computation endpoints**: 10 requests/minute

---

## Recommended UI Implementation Flow

### Dashboard Page
1. Call `/api/dashboard/complete/{address}?include_achievers=true` on load
2. Use response for all dashboard cards
3. Use `historical_data` for charts
4. Set up SSE for real-time updates

### Claims Page
1. Call `/api/claims/summary/{address}` for overview
2. Call `/api/claims/unclaimed/{address}` for list
3. Use `/api/merkle/proof/{address}/{day}/{type}` for claiming

### Team Page
1. Call `/api/team/{address}/summary` for counts
2. Call `/api/team/{address}/legs` for breakdown
3. Call `/api/team/{address}/roi/dashboard/summary` for ROI KPIs

---

## Support

- **API Documentation UI**: https://testapi.oceandefi.uk/docs
- **OpenAPI JSON**: https://testapi.oceandefi.uk/openapi.json
