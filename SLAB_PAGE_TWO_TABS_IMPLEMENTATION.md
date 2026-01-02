# Slab Income Page - Two Tabs Implementation

## Overview
The Slab Income page (`/dashboard/slab`) now features two distinct tabs that provide different views of slab income data:

1. **Contract Data Tab** - Real-time blockchain data
2. **API Dashboard Tab** - Historical analytics and reports

## Implementation Details

### Page Location
**File:** [apps/dashboard/src/pages/SlabIncome.jsx](apps/dashboard/src/pages/SlabIncome.jsx)

### Tab Structure

#### Tab 1: Contract Data (Slab Overview)
- **Label:** "Contract Data" (desktop) / "Contract" (mobile)
- **Icon:** `LayoutGrid`
- **Component:** `SlabIncomeScreen`
- **Data Source:** Blockchain smart contracts (real-time)
- **Functions Used:**
  - `getSlabIncomeOverview(userAddress)` - Main overview data
  - `getSlabManagerDetails(userAddress)` - Manager details (percents, milestones, tiers)
  - `getNextAchievementProgress(userAddress)` - Next achievement targets
  - `getIncomeTotals(userAddress)` - Total income calculations

**Data Displayed:**
- Current slab level (1-11)
- Qualified business volume (USD)
- Direct referrals count
- Slab income (USD & RAMA)
- Available income to claim
- Override income breakdown (L1, L2, L3+)
- Royalty income
- Claim status (Ready/Cooldown)
- Progress to next slab
- Achievement milestones
- Same-slab partners

**Benefits:**
- ✅ Real-time accuracy
- ✅ On-chain verification
- ✅ Immediate updates after transactions
- ✅ No server dependency

---

#### Tab 2: API Dashboard (Analytics & Reports)
- **Label:** "API Dashboard" (desktop) / "API" (mobile)
- **Icon:** `BarChart3`
- **Component:** `SlabDashboard`
- **Data Source:** API Server (`https://testapi.oceandefi.uk/`)
- **Environment Variable:** `VITE_SLAB_API=https://testapi.oceandefi.uk/`

**API Functions Used:**
```javascript
import {
  getCombinedIncome,
  getUserAchievement,
  getTeamSummary,
  getTeamLegs,
  getPortfolioVolume,
  getTotalPortfolioVolume,
  getPeriodIncome,
  getClaimableIncome,
  getLevelAchievers,
  getUserIncomeHistory,
  getRamaPrice
} from '../services/slabIncomeApi';
```

**Data Displayed:**
- Income history (30/60/90 days)
- Claim history
- Team statistics and legs
- Portfolio volume analytics
- Period-based income reports
- Level achievers
- RAMA price tracking
- Same-slab partner details
- Detailed charts and graphs

**Benefits:**
- ✅ Historical data analysis
- ✅ Advanced analytics
- ✅ Faster queries (indexed data)
- ✅ Complex aggregations
- ✅ Period-based reports
- ✅ Caching support (30-minute cache)

---

## Technical Architecture

### API Configuration

**Development Mode (Proxy):**
```javascript
// vite.config.js
server: {
  port: 8786,
  proxy: {
    '/api': {
      target: 'https://testapi.oceandefi.uk',
      changeOrigin: true,
      secure: false,
    }
  }
}
```

**Production Mode (Direct):**
```javascript
// slabIncomeApi.js
const API_BASE_URL = import.meta.env.DEV 
  ? '/api' 
  : 'https://testapi.oceandefi.uk/api';
```

### Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                    Slab Income Page                     │
│                 (/dashboard/slab)                       │
└─────────────────┬────────────────────┬──────────────────┘
                  │                    │
        ┌─────────▼─────────┐  ┌──────▼──────────┐
        │  Tab 1: Contract  │  │  Tab 2: API     │
        │      Data         │  │   Dashboard     │
        └─────────┬─────────┘  └──────┬──────────┘
                  │                    │
        ┌─────────▼─────────┐  ┌──────▼──────────┐
        │ SlabIncomeScreen  │  │  SlabDashboard  │
        │   Component       │  │   Component     │
        └─────────┬─────────┘  └──────┬──────────┘
                  │                    │
        ┌─────────▼─────────┐  ┌──────▼──────────┐
        │  useUserInfoStore │  │ slabIncomeApi   │
        │   (Zustand)       │  │   Service       │
        └─────────┬─────────┘  └──────┬──────────┘
                  │                    │
        ┌─────────▼─────────┐  ┌──────▼──────────┐
        │   Smart Contracts │  │   API Server    │
        │   (Blockchain)    │  │ testapi.ocean   │
        │                   │  │   defi.uk       │
        └───────────────────┘  └─────────────────┘
```

---

## Code Implementation

### Tab Switching UI
```jsx
<div className="flex gap-2">
  <button
    onClick={() => setViewMode("overview")}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
      viewMode === "overview"
        ? "bg-gradient-to-r from-cyan-500 to-neon-green text-dark-950"
        : "cyber-glass text-cyan-400 border border-cyan-500/30 hover:border-cyan-500/50"
    }`}
  >
    <LayoutGrid size={18} />
    <span className="hidden sm:inline">Contract Data</span>
    <span className="inline sm:hidden">Contract</span>
  </button>
  
  <button
    onClick={() => setViewMode("dashboard")}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
      viewMode === "dashboard"
        ? "bg-gradient-to-r from-cyan-500 to-neon-green text-dark-950"
        : "cyber-glass text-cyan-400 border border-cyan-500/30 hover:border-cyan-500/50"
    }`}
  >
    <BarChart3 size={18} />
    <span className="hidden sm:inline">API Dashboard</span>
    <span className="inline sm:hidden">API</span>
  </button>
</div>
```

### Information Banners
```jsx
{viewMode === "overview" && (
  <div>
    <div className="cyber-glass border border-cyan-500/30 rounded-lg p-3 mb-4">
      <div className="flex items-start gap-2">
        <Info size={16} className="text-cyan-400 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-cyan-300/80">
          <strong className="text-cyan-400">Contract Data:</strong> Real-time data directly from blockchain smart contracts. 
          Shows your current slab level, qualified business, and earnings calculated on-chain.
        </p>
      </div>
    </div>
    <SlabIncomeScreen SlabIncomeData={SlabIncomeData} />
  </div>
)}

{viewMode === "dashboard" && (
  <div>
    <div className="cyber-glass border border-cyan-500/30 rounded-lg p-3 mb-4">
      <div className="flex items-start gap-2">
        <Info size={16} className="text-cyan-400 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-cyan-300/80">
          <strong className="text-cyan-400">API Dashboard:</strong> Historical data from our API server (<code className="text-neon-green">testapi.oceandefi.uk</code>). 
          View detailed analytics, income history, team statistics, and period-based reports.
        </p>
      </div>
    </div>
    <SlabDashboard />
  </div>
)}
```

---

## API Endpoints Used

The API Dashboard tab uses the following endpoints from `https://testapi.oceandefi.uk/api`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/combined-income/{address}` | GET | Combined income data |
| `/user-achievement/{address}` | GET | User achievement status |
| `/team-summary/{address}` | GET | Team summary statistics |
| `/team-legs/{address}` | GET | Detailed team leg data |
| `/portfolio-volume/{address}/{day_id}` | GET | Portfolio volume for specific day |
| `/total-portfolio-volume/{address}` | GET | Total portfolio volume |
| `/period-income/{address}` | GET | Income for specific period |
| `/claimable-income/{address}` | GET | Claimable income amount |
| `/level-achievers/{level}` | GET | List of achievers at level |
| `/user-income-history/{address}` | GET | Historical income data |
| `/rama-price` | GET | Current RAMA token price |

**Note:** All amounts in API responses are in **microUSD** (divide by 1,000,000 to get USD)

---

## State Management

### Contract Data (Tab 1)
```javascript
// State variables
const [slabDetails, setSlabDetails] = useState(null);
const [slabManagerDetails, setSlabManagerDetails] = useState(null);
const [nextAchievements, setNextAchievements] = useState(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

// Load from Zustand store
const {
  getSlabIncomeOverview,
  getSlabManagerDetails,
  getNextAchievementProgress,
  getIncomeTotals,
} = useStore();
```

### API Data (Tab 2)
```javascript
// Uses internal state within SlabDashboard component
// Implements 30-minute session cache for performance
const CACHE_KEY = `slab_dashboard_cache_${userAddress}`;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
```

---

## Performance Optimizations

### Contract Data Tab
- ✅ Parallel Promise.all() calls for multiple contract reads
- ✅ Error handling with fallbacks
- ✅ Loading states for better UX
- ✅ Memoization of computed values

### API Dashboard Tab
- ✅ SessionStorage caching (30 minutes)
- ✅ Lazy loading of components
- ✅ Skeleton loaders during data fetch
- ✅ Batched API requests where possible
- ✅ Error recovery with retry logic

---

## User Experience Features

### Visual Indicators
- **Active Tab:** Gradient background (cyan to neon-green)
- **Inactive Tab:** Glass morphism style with border
- **Info Banners:** Explain data source for each tab
- **Icons:** Visual distinction between tabs
- **Responsive:** Mobile-friendly labels

### Loading States
- **Tab 1:** Loading spinner with "Loading slab income data..."
- **Tab 2:** Skeleton cards for each data section
- **Error States:** Clear error messages with retry options

### Mobile Optimization
- **Tab Labels:** Short labels on mobile ("Contract" / "API")
- **Full Labels:** Descriptive on desktop ("Contract Data" / "API Dashboard")
- **Responsive Grid:** Adapts to screen size
- **Touch-Friendly:** Large tap targets

---

## Testing Checklist

### Tab 1: Contract Data
- [ ] Loads current slab level correctly
- [ ] Shows qualified business volume
- [ ] Displays slab income (USD & RAMA)
- [ ] Shows claim status
- [ ] Achievement progress accurate
- [ ] Error handling works
- [ ] Loading state displays
- [ ] Data updates after claims

### Tab 2: API Dashboard
- [ ] Fetches historical data
- [ ] Charts render correctly
- [ ] Team statistics accurate
- [ ] Income history displays
- [ ] Claim history shows
- [ ] Cache works (30-min)
- [ ] Error recovery works
- [ ] RAMA price updates

---

## Troubleshooting

### Issue: API not loading
**Solution:** Check if dev server is running and proxy is configured:
```bash
# Check vite.config.js proxy settings
# Verify VITE_SLAB_API in .env
# Test API directly: curl https://testapi.oceandefi.uk/api/rama-price
```

### Issue: Contract data not loading
**Solution:** Verify wallet connection and contract addresses:
```javascript
// Check userAddress in localStorage
console.log(localStorage.getItem('userAddress'));

// Verify contract addresses in .env
// Test contract calls in browser console
```

### Issue: Tabs not switching
**Solution:** Check React state and component rendering:
```javascript
// Verify viewMode state
console.log('Current view:', viewMode);

// Check component imports
// Verify button onClick handlers
```

---

## Future Enhancements

### Planned Features
- [ ] Add third tab for "Predictions" (AI-based forecasting)
- [ ] Export data to CSV/PDF from both tabs
- [ ] Real-time notifications when data updates
- [ ] Comparison mode (Contract vs API side-by-side)
- [ ] Advanced filters for API dashboard
- [ ] Custom date range selection
- [ ] Favorites/bookmarks for specific views

### Performance Improvements
- [ ] Service Worker for offline API cache
- [ ] WebSocket for real-time contract events
- [ ] IndexedDB for long-term local storage
- [ ] Virtualized lists for large datasets

---

## API Documentation Reference

For complete API documentation, visit:
- **Development:** http://localhost:8786/api/docs
- **Production:** https://testapi.oceandefi.uk/docs

---

## Summary

✅ **Implemented:** Two-tab system for Slab Income page
✅ **Tab 1:** Real-time contract data with blockchain accuracy
✅ **Tab 2:** Historical API data with advanced analytics
✅ **Benefits:** Users can choose between real-time accuracy and historical insights
✅ **Performance:** Optimized with caching, lazy loading, and parallel requests
✅ **UX:** Clear visual indicators, loading states, and informative banners

**Access:** Navigate to `/dashboard/slab` or click "Slab Income" in sidebar

**Last Updated:** January 2, 2026
