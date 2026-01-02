# Slab Income Page - Quick Reference Guide

## Tab Navigation at `/dashboard/slab`

```
┌─────────────────────────────────────────────────────────────────┐
│  🏆 Slab Income System                                          │
│  Earn difference income from your team's growth                 │
│                                                                  │
│  [Contract Data] 📊   [API Dashboard] 📈                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Tab 1: Contract Data (Real-time Blockchain)

### What You See:
```
┌──────────────────────────────────────────────────────────┐
│ ℹ️  Contract Data: Real-time data directly from         │
│    blockchain smart contracts. Shows your current        │
│    slab level, qualified business, and earnings.         │
└──────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Current Slab: Diamond (Level 5)                         │
│ Qualified Business: $45,231.50 USD                      │
│ Direct Referrals: 12                                    │
│ Status: Ready to Claim ✅                                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Slab Income                                             │
│ Total: $1,234.56 USD / 24,691.20 RAMA                   │
│ Available: $987.65 USD / 19,753.00 RAMA                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Override Income Breakdown                               │
│ L1 (Top Leg):     $500.00 USD                           │
│ L2 (2nd Leg):     $300.00 USD                           │
│ L3+ (Other Legs): $200.00 USD                           │
│ Total Override:   $1,000.00 USD                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Progress to Next Slab                                   │
│ Current: $45,231.50                                     │
│ Target:  $50,000.00                                     │
│ Progress: ████████░░ 90.5%                              │
│ Remaining: $4,768.50                                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Achievement Milestones                                  │
│ ✅ Bronze    ✅ Silver    ✅ Gold                        │
│ ✅ Platinum  ⏳ Diamond   ⬜ Crown Diamond              │
└─────────────────────────────────────────────────────────┘
```

### Data Source:
- ✅ Smart Contracts (SlabManager, SlabQualificationEngine)
- ✅ Real-time blockchain queries
- ✅ Updated immediately after transactions

### Best For:
- Checking current slab level
- Viewing available claim amount
- Verifying on-chain balances
- Real-time achievement tracking

---

## 📈 Tab 2: API Dashboard (Historical Analytics)

### What You See:
```
┌──────────────────────────────────────────────────────────┐
│ ℹ️  API Dashboard: Historical data from our API server  │
│    (testapi.oceandefi.uk). View detailed analytics,     │
│    income history, team statistics, and reports.         │
└──────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Income Summary (Last 30 Days)                           │
│ Slab Income:     $5,432.10 USD                          │
│ Override Income: $3,210.50 USD                          │
│ Total Earned:    $8,642.60 USD                          │
│ Total Claims:    $7,500.00 USD                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Income Chart (Last 90 Days)                             │
│                                                          │
│  $500 │           ███                                   │
│  $400 │       ███ ███                                   │
│  $300 │   ███ ███ ███ ███                               │
│  $200 │ █ ███ ███ ███ ███ ███                           │
│  $100 │ █ ███ ███ ███ ███ ███ █                         │
│       └─────────────────────────────                    │
│         Nov   Dec   Jan   Feb   Mar                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Team Statistics                                         │
│ Total Team Size:     245 members                        │
│ Active This Month:   187 members                        │
│ Team Volume:         $1,234,567.89 USD                  │
│ Top Performer:       0x1234...5678 ($45,231 volume)     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Claim History                                           │
│ Dec 28, 2025  $500.00 USD   ✅ Claimed                  │
│ Dec 21, 2025  $450.00 USD   ✅ Claimed                  │
│ Dec 14, 2025  $520.00 USD   ✅ Claimed                  │
│ Dec 07, 2025  $480.00 USD   ✅ Claimed                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Level Achievers (Diamond Level)                         │
│ 1. 0x1a2b...3c4d - Jan 15, 2026                         │
│ 2. 0x5e6f...7g8h - Jan 12, 2026                         │
│ 3. 0x9i0j...1k2l - Jan 10, 2026                         │
│ (15 total achievers at this level)                      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Portfolio Volume Analytics                              │
│ Today:       $1,234.56 USD                              │
│ This Week:   $8,765.43 USD                              │
│ This Month:  $34,567.89 USD                             │
│ All Time:    $456,789.01 USD                            │
└─────────────────────────────────────────────────────────┘
```

### Data Source:
- ✅ API Server (`https://testapi.oceandefi.uk/`)
- ✅ Indexed database with historical records
- ✅ Cached for 30 minutes (faster loading)

### Best For:
- Viewing income history and trends
- Analyzing team performance
- Checking claim history
- Comparing periods (30/60/90 days)
- Detailed analytics and charts
- Portfolio volume tracking

---

## 🔄 When to Use Each Tab

### Use Tab 1 (Contract Data) When:
- ✅ You want to verify your **current** on-chain balance
- ✅ You need to check if you can **claim** now
- ✅ You want **real-time** accuracy (just made a transaction)
- ✅ You're troubleshooting or verifying blockchain data
- ✅ You need to see your **exact** slab level right now

### Use Tab 2 (API Dashboard) When:
- ✅ You want to see **historical** income trends
- ✅ You need **analytics** and **charts**
- ✅ You want to view **past claims** and their dates
- ✅ You need **team statistics** and **performance data**
- ✅ You want **faster loading** (uses cached data)
- ✅ You need **period comparisons** (this week vs last week)

---

## 🎯 Quick Comparison

| Feature | Contract Data | API Dashboard |
|---------|--------------|---------------|
| **Speed** | 2-5 seconds | <1 second (cached) |
| **Accuracy** | 100% real-time | Updates hourly |
| **Historical Data** | ❌ No | ✅ Yes (90+ days) |
| **Charts** | ❌ Limited | ✅ Extensive |
| **Team Stats** | ✅ Basic | ✅ Detailed |
| **Claim History** | ❌ No | ✅ Yes |
| **Offline** | ❌ Requires blockchain | ⚠️ Shows cached |
| **Best Use** | Current status | Trends & analytics |

---

## 💡 Pro Tips

### Maximizing Both Tabs:
1. **Start with Tab 1** to see your current real-time status
2. **Switch to Tab 2** to understand trends and patterns
3. **Use Tab 1** before claiming to verify available amount
4. **Use Tab 2** after claiming to see it in your history
5. **Bookmark both** for quick access to different data views

### Performance Tips:
- Tab 2 caches data for 30 minutes - refresh manually if needed
- Tab 1 makes live blockchain calls - wait for loading to complete
- Switch between tabs without reloading the entire page
- Data persists when switching tabs (no re-fetch needed)

### Mobile Usage:
- Swipe between tabs easily
- Compact labels save screen space
- All features available on mobile
- Charts are touch-responsive

---

## 📱 Access Information

**URL:** `http://localhost:8786/dashboard/slab` (development)
**Production:** `https://your-domain.com/dashboard/slab`

**Navigation:**
- Sidebar → "Slab Income"
- Dashboard → Slab Income card
- Direct URL entry

---

## 🔧 Technical Details

**Environment Variables:**
```bash
VITE_SLAB_API=https://testapi.oceandefi.uk/
```

**API Proxy (Development):**
```javascript
// In vite.config.js
proxy: {
  '/api': {
    target: 'https://testapi.oceandefi.uk',
    changeOrigin: true,
  }
}
```

**Components:**
- `SlabIncome.jsx` - Main page with tab logic
- `SlabIncomeScreen.jsx` - Contract data display
- `SlabDashboard.jsx` - API dashboard display

**State Management:**
- Tab 1: Zustand store (`useUserInfoStore`)
- Tab 2: Local state with session cache

---

## 📚 Related Documentation

- [SLABMANAGERREADER_NEW_FUNCTIONS.md](SLABMANAGERREADER_NEW_FUNCTIONS.md) - New contract functions
- [SLAB_PAGE_TWO_TABS_IMPLEMENTATION.md](SLAB_PAGE_TWO_TABS_IMPLEMENTATION.md) - Detailed implementation guide
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) - API endpoint reference

---

**Last Updated:** January 2, 2026  
**Version:** 2.0 (Two-Tab System)
