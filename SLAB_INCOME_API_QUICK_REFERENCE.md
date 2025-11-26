# Slab Income API - Quick Reference

## 🚀 Quick Start

### 1. All Endpoints Available
All 8 slab income endpoints are now integrated and ready to use:

```javascript
import slabIncomeApi from './services/slabIncomeApi';

// Or import specific methods
import {
  getSlabData,
  getSameSlabPartners,
  getSlabIncomeHistory,
  getSlabAnalytics,
  getIncomeTotals,
  getSlabProgression,
  getOverrideBreakdown,
  getSlabHistoryCombined,
  loadCompleteSlabData
} from './services/slabIncomeApi';
```

### 2. Component Integration

**SameSlabScreen Component:**
- Automatically fetches override breakdown and partner data
- Shows 3 waves of earnings (10%, 5%, 5%)
- Displays partner details with volume and contribution info
- Handles loading and error states

**SlabIncomeHistory Component:**
- Fetches combined history with pagination
- Shows claims, achievements, and override events
- Displays summary statistics
- Supports page navigation

**SlabIncome Page:**
- Integrates all data sources
- Falls back to contract data if API unavailable
- Passes structured data to child components

### 3. Data Structure

#### Slab Overview Tab
```javascript
{
  slabLevel: 5,
  qualifiedVolumeUsd: 50000,
  slabIncomeUsd: 500,
  overrideIncomeUsd: 100,
  legBreakdown: { L1: 50, L2: 30, Lrest: 20 },
  sameSlabPartners: { firstWave: [], secondWave: [], thirdWave: [] }
}
```

#### Same-Slab Override Tab
```javascript
{
  totalOverrideRama: 50000,
  totalOverrideUsd: 1000,
  waves: {
    firstWave: { percentage: 10, totalUsd: 500, partners: [...] },
    secondWave: { percentage: 5, totalUsd: 300, partners: [...] },
    thirdWave: { percentage: 5, totalUsd: 200, partners: [...] }
  }
}
```

#### History Tab
```javascript
{
  events: [
    { type: 'claim', date, slab, amountUsd, amountRama, txHash },
    { type: 'achievement', date, slab, l1Qualified, l2Qualified, restQualified },
    { type: 'override', date, wave, amountUsd, fromPartner, partnerSlab }
  ],
  pagination: { page, limit, total, hasMore },
  summary: { totalClaims, totalAchievements, totalOverrideEvents, totalClaimedUsd }
}
```

## 📊 Endpoint Summary

| # | Endpoint | Method | Purpose |
|---|----------|--------|---------|
| 1 | `/slab/:address` | GET | Complete slab data |
| 2 | `/slab/:address/same-slab-partners` | GET | Partner details |
| 3 | `/slab/:address/history` | GET | Transaction history |
| 4 | `/slab/:address/analytics` | GET | Aggregated analytics |
| 5 | `/income/:address/totals` | GET | All income streams |
| 6 | `/slab/:address/progression` | GET | Next level progress |
| 7 | `/slab/:address/override-breakdown` | GET | Override earnings detail |
| 8 | `/slab/:address/history-combined` | GET | All events combined |

## ✅ Testing Checklist

- [ ] API endpoints respond correctly
- [ ] Partner data displays in override tab
- [ ] History pagination works
- [ ] Combined events show all types
- [ ] Loading states appear during fetch
- [ ] Error states display gracefully
- [ ] Fallback to contract data works
- [ ] Mobile responsive design intact
- [ ] Test with user ID 78
- [ ] Test with user ID 152

## 🔧 Configuration

Add to `.env`:
```env
VITE_SLAB_API_URL=https://testapi.oceandefi.uk/api
```

Default: `https://testapi.oceandefi.uk/api` (automatically used if env var not set)

## 📁 Files Changed

### New Files
- `src/services/slabIncomeApi.js` - API service
- `src/services/slabIncomeApiTest.js` - Testing utility

### Modified Files
- `src/components/SameSlabScreen.jsx` - API integration + loading states
- `src/components/SlabIncomeHistory.jsx` - Combined history view
- `src/pages/SlabIncome.jsx` - API service import

## 🎯 Key Features

✅ **Complete API Coverage** - All 8 endpoints integrated
✅ **Real-time Data** - Partner details with volumes
✅ **Pagination** - 50 items per page with nav controls
✅ **Error Handling** - Graceful fallbacks and error messages
✅ **Loading States** - Shows loading spinners during fetch
✅ **Responsive Design** - Mobile and desktop friendly
✅ **Backward Compatible** - Falls back to contract data
✅ **Type Safety** - Structured response objects
✅ **Wave-based Earnings** - 10%, 5%, 5% breakdown
✅ **Summary Stats** - Total claims, achievements, overrides

## 🧪 Quick Test in Console

```javascript
// Test single endpoint
import { getSlabData } from './services/slabIncomeApi';
getSlabData('0x...address...').then(r => console.log(r));

// Test all endpoints
import { testAllEndpoints } from './services/slabIncomeApiTest';
testAllEndpoints('0x...address...').then(results => {
  console.log('Results:', results);
});
```

## 🐛 Troubleshooting

**API returns 404:**
- Verify address format (0x followed by 40 hex characters)
- Check if user has slab data
- Verify API URL in .env or code

**Empty partner list:**
- User may not have same-slab partners yet
- Check if user has reached a slab level
- Verify data exists on API

**Pagination not working:**
- Ensure `hasMore` flag is checked before next page
- Total items < limit means single page
- Page starts at 1, not 0

## 📞 Support

For issues or questions:
1. Check browser console for errors
2. Verify API endpoint responses
3. Test with known user ID (78 or 152)
4. Check network tab for request/response

## 📝 Notes

- All responses wrapped in `{ success, data, error }` format
- Timestamps in ISO 8601 format
- USD values in decimal (no conversion needed)
- RAMA values as integers
- Percentages as whole numbers (0-100)
