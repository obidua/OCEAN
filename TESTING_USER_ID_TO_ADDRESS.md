# Testing Guide - Getting Addresses for User IDs 78 and 152

## Overview
This guide explains how to obtain wallet addresses for test users with IDs 78 and 152, then use them to test the Slab Income API endpoints.

## Method 1: Using Smart Contract (Recommended)

### Prerequisites
- Web3.js or Ethers.js library
- Access to the UserRegistry contract
- RPC endpoint (e.g., https://blockchain.ramestta.com)

### Code Example

```javascript
// Using Web3.js
const Web3 = require('web3');
const web3 = new Web3('https://blockchain.ramestta.com');

// UserRegistry contract ABI (simplified)
const USER_REGISTRY_ABI = [
  {
    "inputs": [{"internalType": "uint32", "name": "id", "type": "uint32"}],
    "name": "idToAddress",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  }
];

const USER_REGISTRY_ADDRESS = "0x246c7317F4093065B96c2b0DC65A63De395444ed";

async function getAddressFromId(userId) {
  try {
    const contract = new web3.eth.Contract(USER_REGISTRY_ABI, USER_REGISTRY_ADDRESS);
    const address = await contract.methods.idToAddress(userId).call();
    return address;
  } catch (error) {
    console.error('Error fetching address:', error);
    return null;
  }
}

// Usage
(async () => {
  const addr78 = await getAddressFromId(78);
  const addr152 = await getAddressFromId(152);
  
  console.log('User 78 Address:', addr78);
  console.log('User 152 Address:', addr152);
})();
```

### Using Ethers.js
```javascript
const ethers = require('ethers');

const USER_REGISTRY_ABI = [
  "function idToAddress(uint32) view returns (address)"
];

const USER_REGISTRY_ADDRESS = "0x246c7317F4093065B96c2b0DC65A63De395444ed";
const RPC_URL = 'https://blockchain.ramestta.com';

async function getAddressFromId(userId) {
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(USER_REGISTRY_ADDRESS, USER_REGISTRY_ABI, provider);
  
  const address = await contract.idToAddress(userId);
  return address;
}

// Usage
(async () => {
  const addr78 = await getAddressFromId(78);
  const addr152 = await getAddressFromId(152);
  
  console.log('User 78 Address:', addr78);
  console.log('User 152 Address:', addr152);
})();
```

## Method 2: Using Dashboard's Store

If testing from the dashboard itself, use the existing store methods:

```javascript
// In browser console (dashboard must be loaded)
const { useStore } = await import('./store/useUserInfoStore.js');

const store = useStore.getState();

// Get address from ID using the dashboard's method
const address = await store.getAddressFromId(78);
console.log('User 78:', address);

const address152 = await store.getAddressFromId(152);
console.log('User 152:', address152);
```

## Method 3: Using API Endpoint (If Available)

If the API has a user lookup endpoint:

```javascript
const userId = 78;

fetch(`https://testapi.oceandefi.uk/api/user/${userId}`)
  .then(r => r.json())
  .then(data => {
    console.log('User 78 Address:', data.address);
  });
```

## Method 4: Browser Developer Tools

### Step 1: Open Dashboard Page
1. Go to dashboard URL
2. Open DevTools (F12 or right-click → Inspect)
3. Go to Console tab

### Step 2: Run in Console

```javascript
// Method A: Using existing store if user is logged in
const userAddr = localStorage.getItem('userAddress');
console.log('Current logged-in user:', userAddr);

// Method B: Find address in localStorage
const storage = Object.entries(localStorage);
storage.forEach(([key, value]) => {
  if (value.includes('0x')) {
    console.log(key, value);
  }
});

// Method C: Check all user-related data
console.log('Stored user data:', localStorage);
```

### Step 3: Use Retrieved Addresses

Once you have the addresses:

```javascript
// Import the test utility
import { testAllEndpoints, testEndpoint } from './src/services/slabIncomeApiTest.js';

// Test endpoint 1: Get slab data
const addr78 = '0x...'; // Replace with actual address
testEndpoint('slabData', addr78);

// Test all endpoints
testAllEndpoints(addr78);
```

## Direct Testing Without Addresses

If you have any existing addresses from the dashboard, you can test directly:

```javascript
// These are example addresses - replace with real ones
const TEST_ADDRESSES = [
  '0x8599bd2e3db143012901410d2d0785e9c1ccefba42', // Example
  '0x...' // Add more test addresses
];

import { testAllEndpoints } from './src/services/slabIncomeApiTest.js';

for (const addr of TEST_ADDRESSES) {
  console.log(`\nTesting address: ${addr}`);
  await testAllEndpoints(addr);
}
```

## Step-by-Step Testing Process

### 1. Get User Addresses
```javascript
// Run one of the methods above to get:
const user78Address = '0x...';
const user152Address = '0x...';
```

### 2. Test Individual Endpoints
```javascript
import {
  getSlabData,
  getSameSlabPartners,
  getSlabIncomeHistory,
  getSlabAnalytics,
  getIncomeTotals,
  getSlabProgression,
  getOverrideBreakdown,
  getSlabHistoryCombined
} from './src/services/slabIncomeApi.js';

// Test 1: Slab Data
const slabData = await getSlabData(user78Address);
console.log('Slab Data:', slabData.data);

// Test 2: Same-Slab Partners
const partners = await getSameSlabPartners(user78Address);
console.log('Partners:', partners.data);

// Test 3: Income History
const history = await getSlabIncomeHistory(user78Address, 1, 50);
console.log('History:', history.data);

// Test 4: Analytics
const analytics = await getSlabAnalytics(user78Address);
console.log('Analytics:', analytics.data);

// Test 5: Income Totals
const totals = await getIncomeTotals(user78Address);
console.log('Totals:', totals.data);

// Test 6: Progression
const progression = await getSlabProgression(user78Address);
console.log('Progression:', progression.data);

// Test 7: Override Breakdown
const override = await getOverrideBreakdown(user78Address);
console.log('Override:', override.data);

// Test 8: Combined History
const combined = await getSlabHistoryCombined(user78Address, 1, 50);
console.log('Combined History:', combined.data);
```

### 3. Verify Data Display

Navigate to the Slab Income page with the test user and verify:

**Slab Overview Tab:**
- ✅ Slab level displays correctly
- ✅ Qualified volume shows
- ✅ Directs count visible
- ✅ Income amounts show

**Same-Slab Override Tab:**
- ✅ Total override RAMA/USD display
- ✅ Three wave cards appear
- ✅ Partner details display (if any)
- ✅ Loading state appears initially

**History Tab:**
- ✅ Combined events display
- ✅ Pagination controls work
- ✅ Summary statistics show
- ✅ Different event types color-coded

## Troubleshooting

### Address Not Found
- Verify user ID exists (78 and 152 should exist)
- Check contract address is correct
- Verify RPC endpoint is responding

### API Returns Empty Data
- User might not have slab income data
- Check if user has claimed any rewards
- Verify address format (0x followed by 40 hex chars)

### Pagination Not Working
- Ensure total events > 50 (the page limit)
- Check `hasMore` flag before next page
- Verify page starts at 1, not 0

### No Partner Data
- User might not have same-slab partners
- Check if user has reached a slab level
- Verify firstWave/secondWave/thirdWave arrays

## Sample Console Script

Copy and paste this into browser console to test everything:

```javascript
(async () => {
  // Step 1: Get addresses (replace with actual method)
  const user78 = '0x...'; // Get from contract or UI
  const user152 = '0x...'; // Get from contract or UI
  
  if (!user78 || !user152) {
    console.error('Please set valid addresses first');
    return;
  }
  
  // Step 2: Import API
  const api = await import('./src/services/slabIncomeApi.js');
  
  // Step 3: Test all endpoints
  console.log('Testing User 78 Endpoints...\n');
  
  const results = {
    slabData: await api.getSlabData(user78),
    partners: await api.getSameSlabPartners(user78),
    history: await api.getSlabIncomeHistory(user78),
    analytics: await api.getSlabAnalytics(user78),
    totals: await api.getIncomeTotals(user78),
    progression: await api.getSlabProgression(user78),
    override: await api.getOverrideBreakdown(user78),
    combined: await api.getSlabHistoryCombined(user78)
  };
  
  // Step 4: Check results
  Object.entries(results).forEach(([name, result]) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${name}: ${result.success ? 'SUCCESS' : result.error}`);
  });
  
  console.log('\nDetailed Results:', results);
})();
```

## Notes

- User IDs 78 and 152 are test accounts
- Addresses are 42-character strings starting with '0x'
- All endpoints require valid addresses
- API responds quickly (usually < 500ms)
- Addresses are case-insensitive but keep checksummed format

## Next Steps

1. Get addresses for users 78 and 152
2. Run the test script above
3. Verify all 8 endpoints return success
4. Check data accuracy in dashboard UI
5. Report any issues with endpoint responses

---

For more information, see:
- `SLAB_INCOME_API_IMPLEMENTATION.md`
- `SLAB_INCOME_API_QUICK_REFERENCE.md`
