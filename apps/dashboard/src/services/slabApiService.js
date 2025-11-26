/**
 * Slab Income API Service
 * Handles all API calls to testapi.oceandefi.uk for slab income management
 */

const API_BASE_URL = 'https://testapi.oceandefi.uk';

// Default RAMA price in micro USD (can be overridden)
const DEFAULT_PRICE_MICRO_USD = 50000000; // $0.05

/**
 * Get current day ID (Unix timestamp / 86400)
 */
export const getCurrentDayId = () => {
  return Math.floor(Date.now() / 1000 / 86400);
};

/**
 * Centralized fetch wrapper with error handling
 */
const fetchAPI = async (endpoint, options = {}) => {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error(`API Call Failed: ${endpoint}`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Convert micro USD to formatted USD string
 */
export const microUsdToUsd = (microUsd) => {
  if (!microUsd) return '0.00';
  return (Number(microUsd) / 1e6).toFixed(2);
};

/**
 * Convert wei RAMA to formatted RAMA string
 */
export const weiRamaToRama = (weiRama) => {
  if (!weiRama) return '0.00';
  return (Number(weiRama) / 1e18).toFixed(2);
};

// ============================================
// SLAB INCOME ENDPOINTS
// ============================================

/**
 * Get slab income for a specific day
 * GET /api/slab-income/{user_address}/{day_id}
 */
export const getSlabIncomeForDay = async (userAddress, dayId, priceMicroUsd = DEFAULT_PRICE_MICRO_USD) => {
  const endpoint = `/api/slab-income/${userAddress}/${dayId}?price_micro_usd=${priceMicroUsd}`;
  return fetchAPI(endpoint);
};

/**
 * Get override (same-slab) income for a specific day
 * GET /api/override-income/{user_address}/{day_id}
 */
export const getOverrideIncomeForDay = async (userAddress, dayId, priceMicroUsd = DEFAULT_PRICE_MICRO_USD) => {
  const endpoint = `/api/override-income/${userAddress}/${dayId}?price_micro_usd=${priceMicroUsd}`;
  return fetchAPI(endpoint);
};

/**
 * Get combined slab + override income for a specific day
 * GET /api/combined/{user_address}/{day_id}
 * This is the most efficient endpoint when you need both
 */
export const getCombinedIncomeForDay = async (userAddress, dayId, priceMicroUsd = DEFAULT_PRICE_MICRO_USD) => {
  const endpoint = `/api/combined/${userAddress}/${dayId}?price_micro_usd=${priceMicroUsd}`;
  return fetchAPI(endpoint);
};

/**
 * Get slab income for a period (date range)
 * GET /api/period/{user_address}?from_day=X&to_day=Y
 * Used for History tab to show aggregated data
 */
export const getSlabIncomePeriod = async (userAddress, fromDay, toDay, priceMicroUsd = DEFAULT_PRICE_MICRO_USD) => {
  const endpoint = `/api/period/${userAddress}?from_day=${fromDay}&to_day=${toDay}&price_micro_usd=${priceMicroUsd}`;
  return fetchAPI(endpoint);
};

/**
 * Get claimable slab income up to current day
 * GET /api/claimable/{user_address}?price_micro_usd=X&current_day=Y
 */
export const getClaimableIncome = async (userAddress, priceMicroUsd = DEFAULT_PRICE_MICRO_USD, currentDay = getCurrentDayId()) => {
  const endpoint = `/api/claimable/${userAddress}?price_micro_usd=${priceMicroUsd}&current_day=${currentDay}`;
  return fetchAPI(endpoint);
};

/**
 * Get slab level and percentage for a specific day
 * GET /api/slab/{user_address}/{day_id}
 */
export const getSlabLevelForDay = async (userAddress, dayId) => {
  const endpoint = `/api/slab/${userAddress}/${dayId}`;
  return fetchAPI(endpoint);
};

/**
 * Calculate user's ROI for a specific day
 * GET /api/team/{user_address}/roi/user?day_id=X&price_micro_usd=Y
 */
export const getUserRoiForDay = async (userAddress, dayId, priceMicroUsd = DEFAULT_PRICE_MICRO_USD) => {
  const endpoint = `/api/team/${userAddress}/roi/user?day_id=${dayId}&price_micro_usd=${priceMicroUsd}`;
  return fetchAPI(endpoint);
};

/**
 * Get considerable ROI for a specific day
 * GET /api/considerable-roi/{user_address}/{day_id}
 */
export const getConsiderableRoiForDay = async (userAddress, dayId, priceMicroUsd = DEFAULT_PRICE_MICRO_USD) => {
  const endpoint = `/api/considerable-roi/${userAddress}/${dayId}?price_micro_usd=${priceMicroUsd}`;
  return fetchAPI(endpoint);
};

// ============================================
// TEAM ENDPOINTS (For Same-Slab Partners)
// ============================================

/**
 * Get complete team structure
 * GET /api/team/{user_address}
 */
export const getTeamStructure = async (userAddress) => {
  const endpoint = `/api/team/${userAddress}`;
  return fetchAPI(endpoint);
};

/**
 * Get team as flat list
 * GET /api/team/{user_address}/flat
 */
export const getTeamFlat = async (userAddress) => {
  const endpoint = `/api/team/${userAddress}/flat`;
  return fetchAPI(endpoint);
};

/**
 * Get only direct referrals
 * GET /api/team/{user_address}/directs
 */
export const getDirects = async (userAddress) => {
  const endpoint = `/api/team/${userAddress}/directs`;
  return fetchAPI(endpoint);
};

/**
 * Get leg-wise team breakdown (L1, L2, L3)
 * GET /api/team/{user_address}/legs
 * Perfect for Same-Slab Override tab
 */
export const getLegsBreakdown = async (userAddress) => {
  const endpoint = `/api/team/${userAddress}/legs`;
  return fetchAPI(endpoint);
};

/**
 * Get team summary (counts and depths only)
 * GET /api/team/{user_address}/summary
 */
export const getTeamSummary = async (userAddress) => {
  const endpoint = `/api/team/${userAddress}/summary`;
  return fetchAPI(endpoint);
};

/**
 * Get team statistics
 * GET /api/team/{user_address}/stats
 */
export const getTeamStats = async (userAddress) => {
  const endpoint = `/api/team/${userAddress}/stats`;
  return fetchAPI(endpoint);
};

/**
 * Get portfolio volume breakdown by leg
 * GET /api/team/{user_address}/portfolio-volume
 */
export const getPortfolioVolume = async (userAddress) => {
  const endpoint = `/api/team/${userAddress}/portfolio-volume`;
  return fetchAPI(endpoint);
};

/**
 * Get total portfolio volume
 * GET /api/team/{user_address}/portfolio-volume/total
 */
export const getTotalPortfolioVolume = async (userAddress) => {
  const endpoint = `/api/team/${userAddress}/portfolio-volume/total`;
  return fetchAPI(endpoint);
};

/**
 * Calculate team ROI for a specific day
 * GET /api/team/{user_address}/roi/team?day_id=X&price_micro_usd=Y
 */
export const getTeamRoiForDay = async (userAddress, dayId, priceMicroUsd = DEFAULT_PRICE_MICRO_USD) => {
  const endpoint = `/api/team/${userAddress}/roi/team?day_id=${dayId}&price_micro_usd=${priceMicroUsd}`;
  return fetchAPI(endpoint);
};

/**
 * Get leg-wise ROI breakdown
 * GET /api/team/{user_address}/roi/legs?day_id=X&price_micro_usd=Y
 */
export const getLegsRoiBreakdown = async (userAddress, dayId, priceMicroUsd = DEFAULT_PRICE_MICRO_USD) => {
  const endpoint = `/api/team/${userAddress}/roi/legs?day_id=${dayId}&price_micro_usd=${priceMicroUsd}`;
  return fetchAPI(endpoint);
};

// ============================================
// SLAB ACHIEVERS ENDPOINTS
// ============================================

/**
 * Get user's slab achievement for a specific day
 * GET /api/slab-achievers/user/{user_address}?day_id=X
 */
export const getUserAchievement = async (userAddress, dayId = getCurrentDayId()) => {
  const endpoint = `/api/slab-achievers/user/${userAddress}?day_id=${dayId}`;
  return fetchAPI(endpoint);
};

/**
 * Get all users who achieved a specific slab level
 * GET /api/slab-achievers/level/{slab_level}?day_id=X
 */
export const getLevelAchievers = async (slabLevel, dayId = getCurrentDayId()) => {
  const endpoint = `/api/slab-achievers/level/${slabLevel}?day_id=${dayId}`;
  return fetchAPI(endpoint);
};

// ============================================
// SLAB CLAIM ENDPOINTS
// ============================================

/**
 * Calculate and sign a claim for a period
 * GET /api/slab-claim/calculate/{user_address}/{from_day}/{to_day}
 */
export const calculateAndSignClaim = async (userAddress, fromDay, toDay, priceMicroUsd = DEFAULT_PRICE_MICRO_USD) => {
  const endpoint = `/api/slab-claim/calculate/${userAddress}/${fromDay}/${toDay}?price_micro_usd=${priceMicroUsd}`;
  return fetchAPI(endpoint);
};

/**
 * Get claimable slab income with signature
 * GET /api/slab-claim/claimable/{user_address}
 */
export const getClaimableSigned = async (userAddress, priceMicroUsd = DEFAULT_PRICE_MICRO_USD, currentDay = getCurrentDayId(), lastClaimedDay = -1) => {
  const endpoint = `/api/slab-claim/claimable/${userAddress}?price_micro_usd=${priceMicroUsd}&current_day=${currentDay}&last_claimed_day=${lastClaimedDay}`;
  return fetchAPI(endpoint);
};

/**
 * Get claim history for a user
 * GET /api/slab-claim/claim-history/{user_address}
 * Perfect for History tab
 */
export const getClaimHistory = async (userAddress) => {
  const endpoint = `/api/slab-claim/claim-history/${userAddress}`;
  return fetchAPI(endpoint);
};

/**
 * Get current nonce for a user
 * GET /api/slab-claim/nonce/{user_address}
 */
export const getNonce = async (userAddress) => {
  const endpoint = `/api/slab-claim/nonce/${userAddress}`;
  return fetchAPI(endpoint);
};

/**
 * Get signer information
 * GET /api/slab-claim/signer-info
 */
export const getSignerInfo = async () => {
  const endpoint = `/api/slab-claim/signer-info`;
  return fetchAPI(endpoint);
};

// ============================================
// SLAB MERKLE ENDPOINTS
// ============================================

/**
 * Get Merkle proof for a user for a specific day
 * GET /api/slab-merkle/proof/{user_address}/{day_id}
 */
export const getMerkleProof = async (userAddress, dayId) => {
  const endpoint = `/api/slab-merkle/proof/${userAddress}/${dayId}`;
  return fetchAPI(endpoint);
};

/**
 * Get claimable days with proofs
 * GET /api/slab-merkle/claimable/{user_address}
 */
export const getMerkleClaimable = async (userAddress, currentDay = getCurrentDayId(), lastClaimedDay = 0) => {
  const endpoint = `/api/slab-merkle/claimable/${userAddress}?current_day=${currentDay}&last_claimed_day=${lastClaimedDay}`;
  return fetchAPI(endpoint);
};

/**
 * Get Merkle root for a specific day
 * GET /api/slab-merkle/merkle-root/{day_id}
 */
export const getMerkleRoot = async (dayId) => {
  const endpoint = `/api/slab-merkle/merkle-root/${dayId}`;
  return fetchAPI(endpoint);
};

// ============================================
// HEALTH CHECK
// ============================================

/**
 * Health check endpoints
 */
export const healthCheck = async () => {
  const endpoint = `/api/health`;
  return fetchAPI(endpoint);
};

export const slabHealthCheck = async () => {
  const endpoint = `/api/slab-claim/health`;
  return fetchAPI(endpoint);
};

export const merkleHealthCheck = async () => {
  const endpoint = `/api/slab-merkle/health`;
  return fetchAPI(endpoint);
};

/**
 * Test API with a specific user address
 * Returns results of key endpoints for debugging
 */
export const testApiForUser = async (userAddress, dayId = getCurrentDayId()) => {
  console.log(`\n🧪 Testing API for user: ${userAddress} on day ${dayId}\n`);

  const tests = [
    { name: 'Health Check', fn: () => healthCheck() },
    { name: 'Get Slab Level', fn: () => getSlabLevelForDay(userAddress, dayId) },
    { name: 'Get Slab Income', fn: () => getSlabIncomeForDay(userAddress, dayId) },
    { name: 'Get Override Income', fn: () => getOverrideIncomeForDay(userAddress, dayId) },
    { name: 'Get Combined Income', fn: () => getCombinedIncomeForDay(userAddress, dayId) },
    { name: 'Get Team Legs', fn: () => getLegsBreakdown(userAddress) },
    { name: 'Get User Achievement', fn: () => getUserAchievement(userAddress, dayId) },
    { name: 'Get Claim History', fn: () => getClaimHistory(userAddress) },
    { name: 'Get Claimable Signed', fn: () => getClaimableSigned(userAddress) },
  ];

  const results = [];
  for (const test of tests) {
    try {
      const result = await test.fn();
      results.push({
        name: test.name,
        success: result.success,
        error: result.error,
      });
      console.log(`✓ ${test.name}: ${result.success ? '✅' : '❌'}`);
    } catch (error) {
      console.error(`✗ ${test.name}: ${error.message}`);
      results.push({
        name: test.name,
        success: false,
        error: error.message,
      });
    }
  }

  console.log('\n📊 Test Summary:', results.filter(r => r.success).length, 'passed');
  return results;
};

export default {
  // Slab Income
  getSlabIncomeForDay,
  getOverrideIncomeForDay,
  getCombinedIncomeForDay,
  getSlabIncomePeriod,
  getClaimableIncome,
  getSlabLevelForDay,
  getUserRoiForDay,
  getConsiderableRoiForDay,
  // Team
  getTeamStructure,
  getTeamFlat,
  getDirects,
  getLegsBreakdown,
  getTeamSummary,
  getTeamStats,
  getPortfolioVolume,
  getTotalPortfolioVolume,
  getTeamRoiForDay,
  getLegsRoiBreakdown,
  // Achievers
  getUserAchievement,
  getLevelAchievers,
  // Claim
  calculateAndSignClaim,
  getClaimableSigned,
  getClaimHistory,
  getNonce,
  getSignerInfo,
  // Merkle
  getMerkleProof,
  getMerkleClaimable,
  getMerkleRoot,
  // Health
  healthCheck,
  slabHealthCheck,
  merkleHealthCheck,
  testApiForUser,
  // Utilities
  getCurrentDayId,
  microUsdToUsd,
  weiRamaToRama,
};
