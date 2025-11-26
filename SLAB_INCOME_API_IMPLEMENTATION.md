# Slab Income API Implementation Guide

## Overview

This document outlines the implementation of all 8 Slab Income API endpoints for the Ocean DeFi dashboard. The API is hosted at `https://testapi.oceandefi.uk/api`.

## API Endpoints Implemented

### 1. Get Slab Data
**Endpoint:** `GET /api/slab/:address`

**Response Structure:**
```json
{
  "address": "0x...",
  "slabLevel": 1,
  "contractSlabIndex": 0,
  "qualifiedVolumeUsd": 1000,
  "directs": 5,
  "canClaim": true,
  "newDirects": 2,
  "slabIncomeUsd": 500,
  "slabIncomeAvailableUsd": 450,
  "slabIncomeRama": 25000,
  "overrideIncomeUsd": 100,
  "overrideIncomeRama": 5000,
  "legBreakdown": {
    "L1": 50,
    "L2": 30,
    "Lrest": 20
  },
  "sameSlabPartners": {
    "firstWave": ["0x..."],
    "secondWave": ["0x..."],
    "thirdWave": ["0x..."]
  },
  "lastUpdated": "2025-11-25T10:00:00Z"
}
```

**Service Method:** `getSlabData(address)`

### 2. Same-Slab Partners
**Endpoint:** `GET /api/slab/:address/same-slab-partners`

**Response Structure:**
```json
{
  "firstWave": [
    {
      "address": "0x...",
      "slabLevel": 5,
      "volumeUsd": 10000,
      "joinedAt": "2025-01-15T10:00:00Z"
    }
  ],
  "secondWave": [...],
  "thirdWave": [...],
  "totalOverrideUsd": 1000
}
```

**Service Method:** `getSameSlabPartners(address)`

### 3. Slab Income History
**Endpoint:** `GET /api/slab/:address/history?page=1&limit=50`

**Response Structure:**
```json
{
  "transactions": [
    {
      "id": "tx_123",
      "timestamp": "2025-11-25T10:00:00Z",
      "type": "slab_income|same_slab_override",
      "amountUsd": 50,
      "amountRama": 2500,
      "fromAddress": "0x...",
      "slabLevel": 5,
      "txHash": "0x..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 250,
    "hasMore": true
  }
}
```

**Service Method:** `getSlabIncomeHistory(address, page = 1, limit = 50)`

### 4. Slab Analytics
**Endpoint:** `GET /api/slab/:address/analytics`

**Response Structure:**
```json
{
  "totalSlabIncomeUsd": 5000,
  "totalOverrideIncomeUsd": 1000,
  "totalTransactions": 250,
  "averageIncomePerDay": 50,
  "topPartners": [
    {
      "address": "0x...",
      "totalContribution": 500
    }
  ],
  "incomeByMonth": {
    "2025-11": 1500,
    "2025-10": 1200
  }
}
```

**Service Method:** `getSlabAnalytics(address)`

### 5. Income Totals
**Endpoint:** `GET /api/income/:address/totals`

**Response Structure:**
```json
{
  "slabIncomeUsd": 5000,
  "overrideUsd": 1000,
  "royaltyUsd": 2000,
  "spotIncomeUsd": 500,
  "totalUsd": 8500,
  "lastUpdated": "2025-11-25T10:00:00Z"
}
```

**Service Method:** `getIncomeTotals(address)`

### 6. Slab Progression
**Endpoint:** `GET /api/slab/:address/progression`

**Response Structure:**
```json
{
  "currentSlabIndex": 4,
  "nextSlabIndex": 5,
  "requiredVolumeUsd": 50000,
  "currentVolumeUsd": 35000,
  "requiredDirects": 10,
  "currentDirects": 8,
  "progressPercentage": 70,
  "estimatedDaysToNextLevel": 15
}
```

**Service Method:** `getSlabProgression(address)`

### 7. Override Breakdown
**Endpoint:** `GET /api/slab/:address/override-breakdown`

**Response Structure:**
```json
{
  "totalOverrideUsd": 1000,
  "totalOverrideRama": 50000,
  "waves": {
    "firstWave": {
      "percentage": 10,
      "totalUsd": 500,
      "totalRama": 25000,
      "partners": [
        {
          "address": "0x123...",
          "name": "USR-0078",
          "slabLevel": 5,
          "volumeUsd": 12000,
          "contributionUsd": 250,
          "contributionRama": 12500,
          "joinedAt": "2025-10-15T10:00:00Z",
          "lastActiveAt": "2025-11-24T18:30:00Z"
        }
      ]
    },
    "secondWave": {
      "percentage": 5,
      "totalUsd": 300,
      "totalRama": 15000,
      "partners": [...]
    },
    "thirdWave": {
      "percentage": 5,
      "totalUsd": 200,
      "totalRama": 10000,
      "partners": [...]
    }
  }
}
```

**Service Method:** `getOverrideBreakdown(address)`

### 8. Combined History
**Endpoint:** `GET /api/slab/:address/history-combined?page=1&limit=50`

**Response Structure:**
```json
{
  "events": [
    {
      "type": "claim",
      "date": "2025-11-20T10:00:00Z",
      "epoch": 12345,
      "slab": 5,
      "amountUsd": 125.50,
      "amountRama": 6275,
      "txHash": "0xabc..."
    },
    {
      "type": "achievement",
      "date": "2025-11-15T08:00:00Z",
      "slab": 5,
      "l1Qualified": 12000,
      "l2Qualified": 9000,
      "restQualified": 8000
    },
    {
      "type": "override",
      "date": "2025-11-18T14:30:00Z",
      "wave": "firstWave",
      "amountUsd": 45.20,
      "amountRama": 2260,
      "fromPartner": "0x456...",
      "partnerSlab": 5
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 125,
    "hasMore": true
  },
  "summary": {
    "totalClaims": 12,
    "totalAchievements": 5,
    "totalOverrideEvents": 45,
    "totalClaimedUsd": 1505.60
  }
}
```

**Service Method:** `getSlabHistoryCombined(address, page = 1, limit = 50)`

## Files Created/Updated

### New Files:
1. **`src/services/slabIncomeApi.js`** - Main API service with all 8 endpoint methods
2. **`src/services/slabIncomeApiTest.js`** - Testing utility for verifying endpoints

### Updated Files:
1. **`src/components/SameSlabScreen.jsx`** - Enhanced with API data loading and real-time partner updates
2. **`src/components/SlabIncomeHistory.jsx`** - Added combined history display with pagination
3. **`src/pages/SlabIncome.jsx`** - Integrated API service for data fetching

## Integration Points

### SameSlabScreen Component
- Fetches override breakdown and same-slab partners data
- Displays partner details with contribution amounts
- Shows three wave tiers (10%, 5%, 5% earnings)
- Includes loading states and error handling

### SlabIncomeHistory Component
- Fetches combined history with claims, achievements, and overrides
- Implements pagination with previous/next controls
- Displays summary statistics
- Shows detailed event information with dates and amounts

### SlabIncome Page
- Uses API data when available, falls back to contract data
- Passes structured data to both overview and same-slab screens
- Maintains backward compatibility with existing contract data

## Testing

### Test Users (from requirements):
- User ID: 78
- User ID: 152

### Testing Steps:

1. **Open Browser Console** (F12 or right-click → Inspect)

2. **Import and test the API:**
```javascript
// In browser console:
import { testAllEndpoints } from './src/services/slabIncomeApiTest.js';

// Replace with actual address of test user
const testAddress = '0x...'; // Get from user ID 78 or 152

testAllEndpoints(testAddress);
```

3. **Test specific endpoint:**
```javascript
import { testEndpoint } from './src/services/slabIncomeApiTest.js';

testEndpoint('slabData', '0x...');
testEndpoint('partners', '0x...');
testEndpoint('history', '0x...');
testEndpoint('analytics', '0x...');
testEndpoint('totals', '0x...');
testEndpoint('progression', '0x...');
testEndpoint('override', '0x...');
testEndpoint('combined', '0x...');
```

4. **Verify Component Data:**
   - Navigate to Slab Income page
   - Select test user (ID 78 or 152)
   - Check "Slab Overview" tab for main data
   - Check "Same-Slab Override Earnings" tab for partner data
   - Check "History" tab for combined history

## Environment Configuration

Add to your `.env` file:
```env
VITE_SLAB_API_URL=https://testapi.oceandefi.uk/api
```

If not set, the service uses the default URL.

## Error Handling

All service methods return a structured response:
```json
{
  "success": true/false,
  "data": {...},
  "error": "error message if any"
}
```

Components handle errors gracefully with:
- Loading states during data fetch
- Error messages displayed to user
- Fallback to contract data when API unavailable
- Automatic retry on timeout

## Features Implemented

✅ All 8 API endpoints integrated
✅ Real-time partner data with contribution details
✅ Pagination support for history
✅ Combined event history with filtering
✅ Loading states and error handling
✅ Fallback to contract data
✅ Responsive design
✅ Mobile-friendly pagination controls
✅ Summary statistics display
✅ Wave-based earnings breakdown (10%, 5%, 5%)

## Next Steps

1. Test all endpoints with users 78 and 152
2. Verify data accuracy and completeness
3. Monitor API performance and response times
4. Collect user feedback on UI/UX
5. Adjust data presentation based on feedback
6. Deploy to production
