/**
 * Slab Income API Service
 * Handles all API calls for slab income, override earnings, and related data
 * 
 * API Base: https://testapi.oceandefi.uk/api (via proxy in development)
 * 
 * Key Notes:
 * - day_id: Day ID (0-based), calculated as Math.floor(timestamp / 86400)
 * - price_micro_usd: Token price in micro USD (e.g., 50000000 = $0.05)
 * - All amounts in microUSD unless noted (divide by 1e6 to get USD)
 * - All RAMA amounts in wei (wei = RAMA × 1e18)
 */

const API_BASE_URL = import.meta.env.DEV ? '/api' : 'https://testapi.oceandefi.uk/api';

// Helper function to calculate day_id from timestamp (Unix seconds / 86400)
// NOTE: day_id is 0-based and represents days since contract start
export const calculateDayId = (timestamp = Date.now()) => {
  // Convert milliseconds to seconds, then divide by seconds per day (86400)
  return Math.floor(timestamp / 1000 / 86400);
};

// Helper function to convert day_id to Date object
export const dayIdToDate = (dayId) => {
  return new Date(dayId * 86400 * 1000);
};

// Helper function to format day_id as human-readable date
export const formatDayId = (dayId, format = 'full') => {
  const date = dayIdToDate(dayId);
  
  if (format === 'short') {
    // e.g., "Nov 26"
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else if (format === 'medium') {
    // e.g., "Nov 26, 2025"
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } else if (format === 'long') {
    // e.g., "November 26, 2025"
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  } else {
    // full: e.g., "Tuesday, November 26, 2025"
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }
};

// Helper function to get relative time (e.g., "2 days ago", "Today")
export const getRelativeDay = (dayId) => {
  const currentDayId = calculateDayId();
  const diff = currentDayId - dayId;
  
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff === -1) return 'Tomorrow';
  if (diff > 1) return `${diff} days ago`;
  if (diff < -1) return `In ${Math.abs(diff)} days`;
  return formatDayId(dayId, 'medium');
};

// Helper function to convert microUSD to USD (1e6 = 1 USD)
export const microUsdToUsd = (microUsd) => {
  return Number(microUsd || 0) / 1_000_000;
};

// Helper function to convert Wei RAMA to RAMA (1e18 wei = 1 RAMA)
export const weiToRama = (wei) => {
  return Number(wei || 0) / 1e18;
};

// Get RAMA price in micro USD (default: $0.05 = 50000000)
export const getRamaPrice = () => {
  const stored = localStorage.getItem('ramaPrice');
  return stored ? Number(stored) : 50000000;
};

// Helper function to make API calls with error handling
const makeRequest = async (endpoint, params = {}) => {
  try {
    // Build the full URL - handle both relative (/api) and absolute URLs
    let fullUrl;
    if (API_BASE_URL.startsWith('http')) {
      // Absolute URL (production)
      fullUrl = `${API_BASE_URL}${endpoint}`;
    } else {
      // Relative URL (development with proxy)
      fullUrl = `${window.location.origin}${API_BASE_URL}${endpoint}`;
    }

    const url = new URL(fullUrl);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });

    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || errorData.message || `API Error: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    // Suppress errors for claim history endpoint (table may not exist yet)
    if (!endpoint.includes('/slab-claim/claim-history/')) {
      console.error(`API Request Failed [${endpoint}]:`, error);
    }
    throw error;
  }
};

/**
 * Get slab level and percentage for a specific day
 * GET /api/slab/{user_address}/{day_id}
 */
export const getSlabLevel = async (userAddress, dayId = null) => {
  if (!userAddress) throw new Error('Address is required');
  const day = dayId ?? calculateDayId();
  try {
    const data = await makeRequest(`/slab/${userAddress}/${day}`);
    return {
      success: true,
      data,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error.message,
    };
  }
};

/**
 * Get slab differential income for a specific day
 * GET /api/slab-income/{user_address}/{day_id}
 */
export const getSlabIncome = async (userAddress, dayId = null, priceInMicroUsd = null) => {
  if (!userAddress) throw new Error('Address is required');
  const day = dayId ?? calculateDayId();
  const price = priceInMicroUsd ?? getRamaPrice();
  
  try {
    const data = await makeRequest(`/slab-income/${userAddress}/${day}`, {
      price_micro_usd: price,
    });
    return {
      success: true,
      data,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error.message,
    };
  }
};

/**
 * Get override income (same-slab achievement bonus) for a specific day
 * GET /api/override-income/{user_address}/{day_id}
 */
export const getOverrideIncome = async (userAddress, dayId = null, priceInMicroUsd = null) => {
  if (!userAddress) throw new Error('Address is required');
  const day = dayId ?? calculateDayId();
  const price = priceInMicroUsd ?? getRamaPrice();
  
  try {
    const data = await makeRequest(`/override-income/${userAddress}/${day}`, {
      price_micro_usd: price,
    });
    return {
      success: true,
      data,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error.message,
    };
  }
};

/**
 * Get combined slab + override income (RECOMMENDED)
 * GET /api/combined/{user_address}/{day_id}
 * 
 * Returns both slab income and override income in one efficient call
 */
export const getCombinedIncome = async (userAddress, dayId = null, priceInMicroUsd = null) => {
  if (!userAddress) throw new Error('Address is required');
  const day = dayId ?? calculateDayId();
  const price = priceInMicroUsd ?? getRamaPrice();
  
  try {
    const data = await makeRequest(`/combined/${userAddress}/${day}`, {
      price_micro_usd: price,
    });
    return {
      success: true,
      data,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error.message,
    };
  }
};

/**
 * Get period income (aggregated for range of days)
 * GET /api/period/{user_address}
 */
export const getPeriodIncome = async (userAddress, fromDay, toDay, priceInMicroUsd = null) => {
  if (!userAddress) throw new Error('Address is required');
  if (fromDay === undefined || toDay === undefined) {
    throw new Error('fromDay and toDay are required');
  }
  const price = priceInMicroUsd ?? getRamaPrice();
  
  try {
    const data = await makeRequest(`/period/${userAddress}`, {
      from_day: fromDay,
      to_day: toDay,
      price_micro_usd: price,
    });
    return {
      success: true,
      data,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error.message,
    };
  }
};

/**
 * Get claimable income up to current day
 * GET /api/claimable/{user_address}
 */
export const getClaimableIncome = async (userAddress, currentDay = null, priceInMicroUsd = null) => {
  if (!userAddress) throw new Error('Address is required');
  const day = currentDay ?? calculateDayId();
  const price = priceInMicroUsd ?? getRamaPrice();
  
  try {
    const data = await makeRequest(`/claimable/${userAddress}`, {
      price_micro_usd: price,
      current_day: day,
    });
    return {
      success: true,
      data,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error.message,
    };
  }
};

/**
 * Get user's complete income history from registration to current day
 * Fetches daily income data in batches to avoid overwhelming the API
 * @param {string} userAddress - User wallet address
 * @param {number} priceInMicroUsd - RAMA price in micro USD
 * @param {function} onProgress - Optional callback for progress updates (current, total)
 * @param {number} maxDays - Maximum days to fetch (default 90)
 */
export const getUserIncomeHistory = async (userAddress, priceInMicroUsd = null, onProgress = null, maxDays = 90) => {
  if (!userAddress) throw new Error('Address is required');
  const price = priceInMicroUsd ?? getRamaPrice();
  const currentDay = calculateDayId();
  
  try {
    // Fetch only recent history (last 90 days by default)
    const startDay = Math.max(0, currentDay - maxDays);
    const totalDays = currentDay - startDay + 1;
    const batchSize = 10; // Fetch 10 days at a time
    const historyData = [];
    let processed = 0;
    
    // Fetch in batches to avoid overwhelming the API
    for (let i = startDay; i <= currentDay; i += batchSize) {
      const batchEnd = Math.min(i + batchSize - 1, currentDay);
      const batchPromises = [];
      
      for (let dayId = i; dayId <= batchEnd; dayId++) {
        batchPromises.push(
          getCombinedIncome(userAddress, dayId, price)
            .then(result => ({
              dayId,
              data: result.success ? result.data : null
            }))
            .catch(err => {
              console.warn(`Failed to fetch day ${dayId}:`, err);
              return { dayId, data: null };
            })
        );
      }
      
      const batchResults = await Promise.all(batchPromises);
      
      // Filter and add to history
      batchResults.forEach(r => {
        if (r.data && (
          r.data.total_income_usd > 0 || 
          r.data.slab_income_usd > 0 || 
          r.data.override_income_usd > 0
        )) {
          historyData.push(r);
        }
      });
      
      processed += batchPromises.length;
      if (onProgress) {
        onProgress(processed, totalDays);
      }
      
      // Small delay between batches to avoid rate limiting
      if (batchEnd < currentDay) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Sort most recent first
    historyData.sort((a, b) => b.dayId - a.dayId);

    return {
      success: true,
      data: historyData,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      error: error.message,
    };
  }
};

/**
 * Get complete team structure
 * GET /api/team/{user_address}
 */
export const getTeam = async (userAddress) => {
  if (!userAddress) throw new Error('Address is required');
  try {
    const data = await makeRequest(`/team/${userAddress}`);
    return {
      success: true,
      data,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error.message,
    };
  }
};

/**
 * Get team summary (counts and depths only)
 * GET /api/team/{user_address}/summary
 */
export const getTeamSummary = async (userAddress) => {
  if (!userAddress) throw new Error('Address is required');
  try {
    const data = await makeRequest(`/team/${userAddress}/summary`);
    return {
      success: true,
      data,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error.message,
    };
  }
};

/**
 * Get leg-wise team breakdown
 * GET /api/team/{user_address}/legs
 */
export const getTeamLegs = async (userAddress) => {
  if (!userAddress) throw new Error('Address is required');
  try {
    const data = await makeRequest(`/team/${userAddress}/legs`);
    return {
      success: true,
      data,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error.message,
    };
  }
};

/**
 * Get direct referrals only (fastest)
 * GET /api/team/{user_address}/directs
 */
export const getDirects = async (userAddress) => {
  if (!userAddress) throw new Error('Address is required');
  try {
    const data = await makeRequest(`/team/${userAddress}/directs`);
    return {
      success: true,
      data,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error.message,
    };
  }
};

/**
 * Get portfolio volume breakdown by leg
 * GET /api/team/{user_address}/portfolio-volume
 */
export const getPortfolioVolume = async (userAddress) => {
  if (!userAddress) throw new Error('Address is required');
  try {
    const data = await makeRequest(`/team/${userAddress}/portfolio-volume`);
    return {
      success: true,
      data,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error.message,
    };
  }
};

/**
 * Get total portfolio volume across entire team
 * GET /api/team/{user_address}/portfolio-volume/total
 */
export const getTotalPortfolioVolume = async (userAddress) => {
  if (!userAddress) throw new Error('Address is required');
  try {
    const data = await makeRequest(`/team/${userAddress}/portfolio-volume/total`);
    return {
      success: true,
      data,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error.message,
    };
  }
};

/**
 * Get user's SLAB achievement for a specific day
 * GET /api/slab-achievers/user/{user_address}
 */
export const getUserAchievement = async (userAddress, dayId = null) => {
  if (!userAddress) throw new Error('Address is required');
  const day = dayId ?? calculateDayId();
  try {
    const data = await makeRequest(`/slab-achievers/user/${userAddress}`, {
      day_id: day,
    });
    return {
      success: true,
      data,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error.message,
    };
  }
};

/**
 * Get all achievers for a specific SLAB level on a given day
 * GET /api/slab-achievers/level/{slab_level}
 */
export const getLevelAchievers = async (slabLevel, dayId = null) => {
  if (slabLevel === undefined) throw new Error('Slab level is required');
  const day = dayId ?? calculateDayId();
  try {
    const data = await makeRequest(`/slab-achievers/level/${slabLevel}`, {
      day_id: day,
    });
    return {
      success: true,
      data,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error.message,
    };
  }
};

/**
 * Get Merkle proof for on-chain claim
 * GET /api/slab-merkle/proof/{user_address}/{day_id}
 */
export const getMerkleProof = async (userAddress, dayId) => {
  if (!userAddress || dayId === undefined) {
    throw new Error('Address and day_id are required');
  }
  try {
    const data = await makeRequest(`/slab-merkle/proof/${userAddress}/${dayId}`);
    return {
      success: true,
      data,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error.message,
    };
  }
};

/**
 * Get Merkle proof for slab income only
 * GET /api/slab-merkle/proof-slab/{user_address}/{day_id}
 */
export const getSlabMerkleProof = async (userAddress, dayId) => {
  if (!userAddress || dayId === undefined) {
    throw new Error('Address and day_id are required');
  }
  try {
    const data = await makeRequest(`/slab-merkle/proof-slab/${userAddress}/${dayId}`);
    return {
      success: true,
      data,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error.message,
    };
  }
};

/**
 * Get Merkle proof for override income only
 * GET /api/slab-merkle/proof-override/{user_address}/{day_id}
 */
export const getOverrideMerkleProof = async (userAddress, dayId) => {
  if (!userAddress || dayId === undefined) {
    throw new Error('Address and day_id are required');
  }
  try {
    const data = await makeRequest(`/slab-merkle/proof-override/${userAddress}/${dayId}`);
    return {
      success: true,
      data,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error.message,
    };
  }
};

/**
 * Get both slab and override Merkle proofs (most efficient)
 * GET /api/slab-merkle/proof-both/{user_address}/{day_id}
 */
export const getBothMerkleProofs = async (userAddress, dayId) => {
  if (!userAddress || dayId === undefined) {
    throw new Error('Address and day_id are required');
  }
  try {
    const data = await makeRequest(`/slab-merkle/proof-both/${userAddress}/${dayId}`);
    return {
      success: true,
      data,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error.message,
    };
  }
};

/**
 * Calculate slab income and return signed claim
 * GET /api/slab-claim/calculate/{user_address}/{from_day}/{to_day}
 */
export const calculateAndSignClaim = async (userAddress, fromDay, toDay, priceInMicroUsd = null) => {
  if (!userAddress || fromDay === undefined || toDay === undefined) {
    throw new Error('Address, fromDay, and toDay are required');
  }
  const price = priceInMicroUsd ?? getRamaPrice();
  
  try {
    const data = await makeRequest(
      `/slab-claim/calculate/${userAddress}/${fromDay}/${toDay}`,
      { price_micro_usd: price }
    );
    return {
      success: true,
      data,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error.message,
    };
  }
};

/**
 * Get claimable income with signature ready to claim
 * GET /api/slab-claim/claimable/{user_address}
 */
export const getClaimableWithSignature = async (
  userAddress,
  currentDay = null,
  priceInMicroUsd = null,
  lastClaimedDay = -1
) => {
  if (!userAddress) throw new Error('Address is required');
  const day = currentDay ?? calculateDayId();
  const price = priceInMicroUsd ?? getRamaPrice();
  
  try {
    const data = await makeRequest(`/slab-claim/claimable/${userAddress}`, {
      price_micro_usd: price,
      current_day: day,
      last_claimed_day: lastClaimedDay,
    });
    return {
      success: true,
      data,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error.message,
    };
  }
};

/**
 * Get claim history for a user
 * GET /api/slab-claim/claim-history/{user_address}
 */
export const getClaimHistory = async (userAddress) => {
  if (!userAddress) throw new Error('Address is required');
  try {
    const data = await makeRequest(`/slab-claim/claim-history/${userAddress}`);
    return {
      success: true,
      data,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error.message,
    };
  }
};

/**
 * Get current nonce for a user
 * GET /api/slab-claim/nonce/{user_address}
 */
export const getCurrentNonce = async (userAddress) => {
  if (!userAddress) throw new Error('Address is required');
  try {
    const data = await makeRequest(`/slab-claim/nonce/${userAddress}`);
    return {
      success: true,
      data,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error.message,
    };
  }
};

/**
 * Health check
 * GET /api/health
 */
export const healthCheck = async () => {
  try {
    const data = await makeRequest('/health');
    return {
      success: true,
      data,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error.message,
    };
  }
};

export default {
  // Slab income
  getSlabLevel,
  getSlabIncome,
  getOverrideIncome,
  getCombinedIncome,
  getPeriodIncome,
  getClaimableIncome,
  getUserIncomeHistory,
  
  // Team data
  getTeam,
  getTeamSummary,
  getTeamLegs,
  getDirects,
  getPortfolioVolume,
  getTotalPortfolioVolume,
  
  // Achievements
  getUserAchievement,
  getLevelAchievers,
  
  // Merkle proofs
  getMerkleProof,
  getSlabMerkleProof,
  getOverrideMerkleProof,
  getBothMerkleProofs,
  
  // Signed claims
  calculateAndSignClaim,
  getClaimableWithSignature,
  getClaimHistory,
  getCurrentNonce,
  
  // Utilities
  healthCheck,
  calculateDayId,
  dayIdToDate,
  formatDayId,
  getRelativeDay,
  microUsdToUsd,
  weiToRama,
  getRamaPrice,
};

