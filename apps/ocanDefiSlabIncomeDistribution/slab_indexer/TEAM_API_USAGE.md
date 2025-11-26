# Team API Usage Guide

The Team API provides endpoints to fetch and analyze referral team structures.

## 🚀 Performance
**Optimized with PostgreSQL database procedures** - Uses recursive CTEs for ultra-fast queries even on large team trees (10,000+ members).

## Base URL
```
http://localhost:7000/api
```

## 📋 Quick Setup

1. **Apply database procedures** (one-time setup):
   ```bash
   cd f:\ocanDefiSlabIncomeDistribution\slab_indexer
   python apply_team_procedures.py
   ```

2. **Start the server**:
   ```bash
   uvicorn app.main:app --port 7000
   ```

## Endpoints

### 1. Get Complete Team Structure

**Endpoint:** `GET /api/team/{user_address}`

**Description:** Returns the complete hierarchical team structure including all directs and their downlines recursively.

**Example Request:**
```bash
curl http://localhost:7000/api/team/0x171884c5aE2C623097bcDf844dFf93cFBCB50aF4
```

**Example Response:**
```json
{
  "user_address": "0x171884c5ae2c623097bcdf844dff93cfbcb50af4",
  "user_id": 123,
  "total_team_count": 150,
  "max_depth": 5,
  "directs_count": 10,
  "legs": [
    {
      "direct_address": "0xabc...",
      "direct_user_id": 124,
      "direct_created_at": "2024-01-15T10:30:00",
      "leg_count": 45,
      "leg_depth": 4,
      "team": [
        {
          "address": "0xdef...",
          "user_id": 125,
          "referrer": "0xabc...",
          "tier": 1,
          "total_directs": 3,
          "created_at": "2024-01-16T12:00:00",
          "depth": 1,
          "downline_count": 12,
          "downlines": [...]
        }
      ]
    }
  ]
}
```

**Response Fields:**
- `total_team_count`: Total number of people in the entire team
- `max_depth`: Maximum depth of the tree (how many levels deep)
- `directs_count`: Number of direct referrals
- `legs`: Array of legs, where each leg represents one direct's team
  - `leg_count`: Total count of people in this leg (direct + their downlines)
  - `leg_depth`: Maximum depth of this specific leg
  - `team`: Hierarchical array of all members in this leg

---

### 2. Get Team Summary (Fast)

**Endpoint:** `GET /api/team/{user_address}/summary`

**Description:** Returns counts and depths only, without the full hierarchical tree. Much faster for large teams.

**Example Request:**
```bash
curl http://localhost:7000/api/team/0x171884c5aE2C623097bcDf844dFf93cFBCB50aF4/summary
```

**Example Response:**
```json
{
  "user_address": "0x171884c5ae2c623097bcdf844dff93cfbcb50af4",
  "directs_count": 10,
  "total_team_count": 150,
  "legs": [
    {
      "direct_address": "0xabc...",
      "direct_user_id": 124,
      "leg_total_count": 45,
      "leg_max_depth": 4
    },
    {
      "direct_address": "0xdef...",
      "direct_user_id": 130,
      "leg_total_count": 30,
      "leg_max_depth": 3
    }
  ]
}
```

---

### 3. Get Legs Breakdown

**Endpoint:** `GET /api/team/{user_address}/legs`

**Description:** Returns detailed breakdown of each leg with counts, but without the nested team data.

**Example Request:**
```bash
curl http://localhost:7000/api/team/0x171884c5aE2C623097bcDf844dFf93cFBCB50aF4/legs
```

**Example Response:**
```json
{
  "user_address": "0x171884c5ae2c623097bcdf844dff93cfbcb50af4",
  "user_id": 123,
  "directs_count": 10,
  "total_team_count": 150,
  "max_depth": 5,
  "legs": [
    {
      "direct_address": "0xabc...",
      "direct_user_id": 124,
      "leg_count": 45,
      "leg_depth": 4
    },
    {
      "direct_address": "0xdef...",
      "direct_user_id": 130,
      "leg_count": 30,
      "leg_depth": 3
    }
  ]
}
```

---

### 4. Get Team as Flat List

**Endpoint:** `GET /api/team/{user_address}/flat`

**Description:** Returns the complete team as a flat list (not hierarchical). Each member includes their depth level and path.

**Example Request:**
```bash
curl http://localhost:7000/api/team/0x171884c5aE2C623097bcDf844dFf93cFBCB50aF4/flat
```

**Example Response:**
```json
{
  "user_address": "0x171884c5ae2c623097bcdf844dff93cfbcb50af4",
  "team_count": 150,
  "team": [
    {
      "address": "0xabc...",
      "user_id": 124,
      "referrer_address": "0x171884...",
      "tier": 1,
      "total_directs": 3,
      "created_at": "2024-01-15T10:30:00",
      "depth": 1,
      "path": "0xabc..."
    },
    {
      "address": "0xdef...",
      "user_id": 125,
      "referrer_address": "0xabc...",
      "tier": 1,
      "total_directs": 2,
      "created_at": "2024-01-16T12:00:00",
      "depth": 2,
      "path": "0xabc... -> 0xdef..."
    }
  ]
}
```

---

### 5. Get Direct Referrals Only

**Endpoint:** `GET /api/team/{user_address}/directs`

**Description:** Returns only the first level (direct referrals), no downlines. Fastest endpoint.

**Example Request:**
```bash
curl http://localhost:7000/api/team/0x171884c5aE2C623097bcDf844dFf93cFBCB50aF4/directs
```

**Example Response:**
```json
{
  "user_address": "0x171884c5ae2c623097bcdf844dff93cfbcb50af4",
  "directs_count": 10,
  "directs": [
    {
      "address": "0xabc...",
      "user_id": 124,
      "tier": 1,
      "total_directs": 3,
      "created_at": "2024-01-15T10:30:00"
    },
    {
      "address": "0xdef...",
      "user_id": 130,
      "tier": 1,
      "total_directs": 5,
      "created_at": "2024-01-16T14:20:00"
    }
  ]
}
```

---

### 6. Get Team Statistics Only

**Endpoint:** `GET /api/team/{user_address}/stats`

**Description:** Ultra-fast endpoint returning only counts and depth. No member data.

**Example Request:**
```bash
curl http://localhost:7000/api/team/0x171884c5aE2C623097bcDf844dFf93cFBCB50aF4/stats
```

**Example Response:**
```json
{
  "user_address": "0x171884c5ae2c623097bcdf844dff93cfbcb50af4",
  "user_id": 123,
  "total_team_count": 150,
  "max_depth": 5,
  "directs_count": 10
}
```

---

## Use Cases

### Calculate Team Statistics
Use `/summary` endpoint for quick statistics without loading the entire tree.

### Display Team Tree
Use the main `/team/{address}` endpoint to display the full hierarchical team structure.

### Leg-wise Analysis
Use `/legs` endpoint to analyze how the team is distributed across different legs (directs).

---

## Performance Notes

All endpoints use **PostgreSQL recursive CTEs** for optimal performance:

| Endpoint | Speed | Use Case | Team Size Limit |
|----------|-------|----------|-----------------|
| `/stats` | ⚡⚡⚡ Ultra-fast | Quick numbers only | Unlimited |
| `/directs` | ⚡⚡⚡ Ultra-fast | First level only | Unlimited |
| `/summary` | ⚡⚡ Very fast | Counts per leg | Unlimited |
| `/flat` | ⚡⚡ Very fast | All members, flat list | 10,000+ |
| `/legs` | ⚡ Fast | Leg breakdown | 10,000+ |
| `/team` | ⚡ Fast | Full hierarchical tree | 10,000+ |

**Database Procedures Advantages:**
- ✅ 100-1000x faster than Python recursion for large trees
- ✅ Single database query (no N+1 issues)
- ✅ Native PostgreSQL recursive CTEs
- ✅ Indexed for optimal performance
- ✅ No circular reference issues

---

## Error Responses

**User Not Found:**
```json
{
  "error": "User not found",
  "user_address": "0x...",
  "total_team_count": 0,
  "max_depth": 0,
  "directs_count": 0,
  "legs": []
}
```

**Server Error:**
```json
{
  "detail": "Error message here"
}
```

---

## Python Client Example

```python
import requests

# Get full team
response = requests.get(
    "http://localhost:7000/api/team/0x171884c5aE2C623097bcDf844dFf93cFBCB50aF4"
)
team_data = response.json()

print(f"Total team: {team_data['total_team_count']}")
print(f"Max depth: {team_data['max_depth']}")
print(f"Number of legs: {team_data['directs_count']}")

# Print each leg
for leg in team_data['legs']:
    print(f"Leg {leg['direct_address']}: {leg['leg_count']} members, depth {leg['leg_depth']}")
```

---

## JavaScript/Node.js Client Example

```javascript
// Get team summary
fetch('http://localhost:7000/api/team/0x171884c5aE2C623097bcDf844dFf93cFBCB50aF4/summary')
  .then(response => response.json())
  .then(data => {
    console.log(`Total team: ${data.total_team_count}`);
    console.log(`Directs: ${data.directs_count}`);

    data.legs.forEach(leg => {
      console.log(`Leg ${leg.direct_address}: ${leg.leg_total_count} members`);
    });
  });
```
