# SLAB Achievers Sync Service

This service fetches SLAB achievers from the blockchain and stores them in the database for efficient querying.

## Overview

The system consists of:

1. **Contract Wrapper** (`app/contracts/slab_manager.py`) - Interacts with the SlabManager smart contract
2. **Service Layer** (`app/services/slab_achiever_service.py`) - Business logic for syncing and querying
3. **API Routes** (`app/api/routes_slab_achievers.py`) - REST endpoints
4. **Database Model** (`app/models/slab_achiever.py`) - `SlabAchievement` table

## SLAB Levels

SLAB achievements are tracked across 11 levels (0-10):

| Level | Percentage |
|-------|------------|
| 0     | 5%         |
| 1     | 10%        |
| 2     | 15%        |
| 3     | 20%        |
| 4     | 25%        |
| 5     | 30%        |
| 6     | 35%        |
| 7     | 45%        |
| 8     | 50%        |
| 9     | 55%        |
| 10    | 60%        |

## Database Schema

```sql
CREATE TABLE slab_achievements (
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

## API Endpoints

### 1. Sync SLAB Achievers from Blockchain

**POST** `/api/slab-achievers/sync?day_id={day_id}`

Fetches all SLAB achievers from the smart contract and stores them in the database.

**Request:**
```bash
curl -X POST "http://localhost:8000/api/slab-achievers/sync?day_id=20405"
```

**Response:**
```json
{
  "success": true,
  "message": "SLAB achievers synced successfully",
  "data": {
    "day_id": 20405,
    "total_synced": 1250,
    "new_records": 1200,
    "updated_records": 50,
    "stages_synced": 11,
    "synced_at": "2025-01-15T12:00:00"
  }
}
```

### 2. Get User's SLAB Achievement

**GET** `/api/slab-achievers/user/{user_address}?day_id={day_id}`

Get the SLAB achievement for a specific user on a given day.

**Request:**
```bash
curl "http://localhost:8000/api/slab-achievers/user/0x85991c88b5a49e37b1037d06d845dc1d9029b2de?day_id=20405"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user_address": "0x85991c88b5a49e37b1037d06d845dc1d9029b2de",
    "day_id": 20405,
    "has_achievement": true,
    "slab_level": 7,
    "slab_percentage": 45.0,
    "achieved_at": "2025-01-15T10:30:00"
  }
}
```

### 3. Get All Achievers for a Specific Level

**GET** `/api/slab-achievers/level/{slab_level}?day_id={day_id}`

Get all users who achieved a specific SLAB level on a given day.

**Request:**
```bash
curl "http://localhost:8000/api/slab-achievers/level/7?day_id=20405"
```

**Response:**
```json
{
  "success": true,
  "day_id": 20405,
  "slab_level": 7,
  "slab_percentage": 45,
  "total_achievers": 150,
  "achievers": [
    {
      "user_address": "0x85991c88b5a49e37b1037d06d845dc1d9029b2de",
      "slab_level": 7,
      "slab_percentage": 45.0,
      "achieved_at": "2025-01-15T10:30:00"
    },
    ...
  ]
}
```

### 4. Clear Day Data (Admin)

**DELETE** `/api/slab-achievers/day/{day_id}`

Clear all SLAB achievements for a specific day. Useful for resyncing.

**Request:**
```bash
curl -X DELETE "http://localhost:8000/api/slab-achievers/day/20405"
```

**Response:**
```json
{
  "success": true,
  "message": "Cleared achievements for day 20405",
  "deleted_records": 1250
}
```

## Direct Service Usage

You can also use the service functions directly in your code:

```python
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.slab_achiever_service import (
    sync_slab_achievers,
    get_user_slab_achievement,
    get_achievers_by_level
)

# Sync achievers
async def sync_today_achievers(db: AsyncSession):
    day_id = 20405  # Current day ID
    result = await sync_slab_achievers(db, day_id)
    print(f"Synced {result['total_synced']} achievers")

# Get user achievement
async def check_user_slab(db: AsyncSession, address: str):
    achievement = await get_user_slab_achievement(db, address, 20405)
    if achievement['has_achievement']:
        print(f"User has SLAB level {achievement['slab_level']}")
    else:
        print("User has no SLAB achievement")

# Get all level 10 achievers (60%)
async def get_top_achievers(db: AsyncSession):
    achievers = await get_achievers_by_level(db, 20405, 10)
    print(f"Found {len(achievers)} users with 60% SLAB")
```

## How It Works

### 1. Contract Interaction

The `SlabManagerContract` class wraps the smart contract's `getAchievers()` function:

```solidity
function getAchievers(
    uint8 kind,      // 0=Slab, 1=Reward, 2=Royalty
    uint8 stage,     // SLAB level (0-10)
    uint256 offset,  // Pagination offset
    uint256 limit    // Number of results
) external view returns (address[] memory);
```

### 2. Syncing Process

The sync process:

1. Fetches achievers for each SLAB level (0-10) using pagination
2. For each achiever address:
   - Checks if a record exists for this user and day
   - Updates existing record if SLAB level changed
   - Creates new record if none exists
3. Commits all changes to the database

### 3. Data Storage

Each achievement record stores:
- `user_address`: Lowercased wallet address
- `day_id`: Day identifier for this achievement
- `slab_level`: Level achieved (0-10)
- `slab_percentage`: Corresponding percentage (5-60%)
- `achieved_at`: Timestamp when synced

The `UNIQUE(user_address, day_id)` constraint ensures one achievement per user per day.

## Environment Variables

Make sure your `.env` file has:

```env
SLAB_MANAGER_ADDRESS=0x...  # SlabManager contract address
RPC_URL=https://...         # Ethereum RPC endpoint
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/db
```

## Daily Sync Workflow

Recommended workflow for daily syncing:

```bash
# 1. Get current day_id
DAY_ID=$(date +%s)
DAY_ID=$((DAY_ID / 86400))

# 2. Clear previous data (optional, if resyncing)
curl -X DELETE "http://localhost:8000/api/slab-achievers/day/${DAY_ID}"

# 3. Sync new data
curl -X POST "http://localhost:8000/api/slab-achievers/sync?day_id=${DAY_ID}"

# 4. Verify sync
curl "http://localhost:8000/api/slab-achievers/level/10?day_id=${DAY_ID}" | jq '.total_achievers'
```

## Performance Considerations

- **Pagination**: The sync uses batches of 100 addresses per call to avoid RPC timeouts
- **Upsert Logic**: Uses UPDATE if exists, INSERT if new (prevents duplicates)
- **Indexes**: Database indexes on `user_address` and `day_id` for fast queries
- **Caching**: Consider caching achiever data for frequently accessed days

## Error Handling

The service handles:
- RPC connection failures (returns empty list)
- Database conflicts (unique constraint)
- Invalid SLAB levels (validated in API)
- Missing data (returns `has_achievement: false`)

## Integration with ROI Calculations

SLAB achievements can be combined with ROI data:

```python
# Get user's ROI and SLAB achievement together
async def get_user_income_summary(db: AsyncSession, address: str, day_id: int):
    from app.services.team_service_db import calculate_user_roi_for_day
    from app.services.slab_achiever_service import get_user_slab_achievement

    roi_data = await calculate_user_roi_for_day(db, address, day_id, price_micro_usd)
    slab_data = await get_user_slab_achievement(db, address, day_id)

    return {
        "roi": roi_data,
        "slab": slab_data,
        # SLAB income = ROI * SLAB percentage
        "slab_income_usd": roi_data['total_roi_usd'] * (slab_data['slab_percentage'] / 100)
    }
```

## Troubleshooting

### Issue: No achievers returned

**Cause**: Contract address may be incorrect or no achievers exist for that stage

**Solution**:
```python
# Check contract connection
from app.contracts.slab_manager import slab_manager_contract
addresses = slab_manager_contract.get_slab_achievers(stage=0, offset=0, limit=10)
print(f"Found {len(addresses)} achievers for stage 0")
```

### Issue: Database constraint violation

**Cause**: Trying to insert duplicate (user_address, day_id)

**Solution**: The service handles this automatically with upsert logic. If you're inserting manually, use ON CONFLICT.

### Issue: Slow sync

**Cause**: Too many achievers or slow RPC

**Solution**:
- Increase batch size: `get_all_slab_achievers(batch_size=500)`
- Use a faster RPC endpoint
- Run sync during off-peak hours
