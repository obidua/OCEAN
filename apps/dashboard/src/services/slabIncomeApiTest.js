/**
 * API Testing Utility
 * Quick testing of all Slab Income API endpoints
 * 
 * Usage in browser console:
 * 1. Copy this file content
 * 2. Run in browser console to test endpoints
 * 3. Check console for detailed results
 */

import {
  getSlabData,
  getSameSlabPartners,
  getSlabIncomeHistory,
  getSlabAnalytics,
  getIncomeTotals,
  getSlabProgression,
  getOverrideBreakdown,
  getSlabHistoryCombined,
} from './slabIncomeApi.js';

// Test users - update these with your test user addresses
const TEST_USER_IDS = ['78', '152'];
const API_BASE = 'https://testapi.oceandefi.uk/api';

/**
 * Convert user ID to address (you'll need to implement this)
 * For now, these are example addresses
 */
const getAddressFromId = async (userId) => {
  // In real implementation, call your backend to get address from ID
  // For testing, you might hardcode test addresses
  console.log(`Getting address for user ID: ${userId}`);
  return null; // Placeholder
};

/**
 * Run all API tests
 */
export const testAllEndpoints = async (userAddress) => {
  console.log('🧪 Starting Slab Income API Tests...\n');
  console.log(`📍 Testing with address: ${userAddress}\n`);

  const results = {};

  // Test 1: Get Slab Data
  console.log('1️⃣ Testing GET /api/slab/:address');
  try {
    const result = await getSlabData(userAddress);
    results.slabData = result;
    console.log('✅ Success:', result.data);
    console.log(`   Current Slab: ${result.data?.slabLevel}`);
    console.log(`   Qualified Volume: $${result.data?.qualifiedVolumeUsd}`);
  } catch (error) {
    console.error('❌ Failed:', error.message);
    results.slabData = { error: error.message };
  }
  console.log('\n');

  // Test 2: Get Same-Slab Partners
  console.log('2️⃣ Testing GET /api/slab/:address/same-slab-partners');
  try {
    const result = await getSameSlabPartners(userAddress);
    results.partners = result;
    console.log('✅ Success:', result.data);
    console.log(`   First Wave: ${result.data?.firstWave?.length} partners`);
    console.log(`   Second Wave: ${result.data?.secondWave?.length} partners`);
    console.log(`   Third Wave: ${result.data?.thirdWave?.length} partners`);
  } catch (error) {
    console.error('❌ Failed:', error.message);
    results.partners = { error: error.message };
  }
  console.log('\n');

  // Test 3: Get Income History
  console.log('3️⃣ Testing GET /api/slab/:address/history?page=1&limit=50');
  try {
    const result = await getSlabIncomeHistory(userAddress, 1, 50);
    results.history = result;
    console.log('✅ Success:', result.data);
    console.log(`   Total transactions: ${result.data?.pagination?.total}`);
    console.log(`   Current page: ${result.data?.pagination?.page}`);
    console.log(`   Has more: ${result.data?.pagination?.hasMore}`);
  } catch (error) {
    console.error('❌ Failed:', error.message);
    results.history = { error: error.message };
  }
  console.log('\n');

  // Test 4: Get Analytics
  console.log('4️⃣ Testing GET /api/slab/:address/analytics');
  try {
    const result = await getSlabAnalytics(userAddress);
    results.analytics = result;
    console.log('✅ Success:', result.data);
    console.log(`   Total Slab Income: $${result.data?.totalSlabIncomeUsd}`);
    console.log(`   Total Override Income: $${result.data?.totalOverrideIncomeUsd}`);
    console.log(`   Total Transactions: ${result.data?.totalTransactions}`);
  } catch (error) {
    console.error('❌ Failed:', error.message);
    results.analytics = { error: error.message };
  }
  console.log('\n');

  // Test 5: Get Income Totals
  console.log('5️⃣ Testing GET /api/income/:address/totals');
  try {
    const result = await getIncomeTotals(userAddress);
    results.totals = result;
    console.log('✅ Success:', result.data);
    console.log(`   Slab Income: $${result.data?.slabIncomeUsd}`);
    console.log(`   Override: $${result.data?.overrideUsd}`);
    console.log(`   Royalty: $${result.data?.royaltyUsd}`);
    console.log(`   Total: $${result.data?.totalUsd}`);
  } catch (error) {
    console.error('❌ Failed:', error.message);
    results.totals = { error: error.message };
  }
  console.log('\n');

  // Test 6: Get Slab Progression
  console.log('6️⃣ Testing GET /api/slab/:address/progression');
  try {
    const result = await getSlabProgression(userAddress);
    results.progression = result;
    console.log('✅ Success:', result.data);
    console.log(`   Current Slab: ${result.data?.currentSlabIndex}`);
    console.log(`   Next Slab: ${result.data?.nextSlabIndex}`);
    console.log(`   Progress: ${result.data?.progressPercentage}%`);
    console.log(`   Est. Days to Next: ${result.data?.estimatedDaysToNextLevel}`);
  } catch (error) {
    console.error('❌ Failed:', error.message);
    results.progression = { error: error.message };
  }
  console.log('\n');

  // Test 7: Get Override Breakdown
  console.log('7️⃣ Testing GET /api/slab/:address/override-breakdown');
  try {
    const result = await getOverrideBreakdown(userAddress);
    results.override = result;
    console.log('✅ Success:', result.data);
    console.log(`   Total Override (USD): $${result.data?.totalOverrideUsd}`);
    console.log(`   Total Override (RAMA): ${result.data?.totalOverrideRama}`);
    console.log(`   First Wave: ${result.data?.waves?.firstWave?.partners?.length} partners`);
    console.log(`   Second Wave: ${result.data?.waves?.secondWave?.partners?.length} partners`);
    console.log(`   Third Wave: ${result.data?.waves?.thirdWave?.partners?.length} partners`);
  } catch (error) {
    console.error('❌ Failed:', error.message);
    results.override = { error: error.message };
  }
  console.log('\n');

  // Test 8: Get Combined History
  console.log('8️⃣ Testing GET /api/slab/:address/history-combined?page=1&limit=50');
  try {
    const result = await getSlabHistoryCombined(userAddress, 1, 50);
    results.combined = result;
    console.log('✅ Success:', result.data);
    console.log(`   Total Events: ${result.data?.pagination?.total}`);
    console.log(`   Total Claims: ${result.data?.summary?.totalClaims}`);
    console.log(`   Total Achievements: ${result.data?.summary?.totalAchievements}`);
    console.log(`   Total Override Events: ${result.data?.summary?.totalOverrideEvents}`);
  } catch (error) {
    console.error('❌ Failed:', error.message);
    results.combined = { error: error.message };
  }
  console.log('\n');

  console.log('🎉 Test Complete!\n');
  console.log('📊 Summary:');
  const successCount = Object.values(results).filter(r => !r.error).length;
  console.log(`   Successful: ${successCount}/8`);
  console.log(`   Failed: ${8 - successCount}/8`);

  return results;
};

/**
 * Quick test for a specific endpoint
 */
export const testEndpoint = async (endpoint, userAddress) => {
  console.log(`\n🧪 Testing: ${endpoint}`);
  console.log(`📍 Address: ${userAddress}\n`);

  try {
    let result;
    switch (endpoint) {
      case 'slabData':
        result = await getSlabData(userAddress);
        break;
      case 'partners':
        result = await getSameSlabPartners(userAddress);
        break;
      case 'history':
        result = await getSlabIncomeHistory(userAddress);
        break;
      case 'analytics':
        result = await getSlabAnalytics(userAddress);
        break;
      case 'totals':
        result = await getIncomeTotals(userAddress);
        break;
      case 'progression':
        result = await getSlabProgression(userAddress);
        break;
      case 'override':
        result = await getOverrideBreakdown(userAddress);
        break;
      case 'combined':
        result = await getSlabHistoryCombined(userAddress);
        break;
      default:
        throw new Error(`Unknown endpoint: ${endpoint}`);
    }

    if (result.success) {
      console.log('✅ Success!');
      console.log(result.data);
    } else {
      console.error('❌ Failed:', result.error);
    }

    return result;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
};

export default {
  testAllEndpoints,
  testEndpoint,
};
