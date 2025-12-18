/**
 * Synchronous RPC checker for app initialization
 * This allows us to check RPC status before wagmi initializes
 * Now integrated with RPC Manager for consistent handling
 */

const RPC_ENDPOINTS = [
  {
    name: 'RPC1',
    url: import.meta.env.VITE_RPC_URL || 'https://blockchain.ramestta.com',
    priority: 1
  },
  {
    name: 'RPC2',
    url: import.meta.env.VITE_RPC_URL_2 || 'https://blockchain2.ramestta.com',
    priority: 2
  }
];

const RPC_CACHE_KEY = 'ramestta_working_rpc';
const RPC_CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached working RPC from localStorage
 * @returns {string|null} Cached RPC URL or null
 */
export function getCachedWorkingRPC() {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(RPC_CACHE_KEY);
    if (!cached) return null;

    const { url, timestamp } = JSON.parse(cached);

    // Check if cache is still valid (within 5 minutes)
    if (Date.now() - timestamp < RPC_CACHE_EXPIRY) {
      return url;
    }

    // Cache expired, remove it
    localStorage.removeItem(RPC_CACHE_KEY);
    return null;
  } catch {
    return null;
  }
}

/**
 * Cache working RPC in localStorage
 * @param {string} url - RPC URL to cache
 */
export function cacheWorkingRPC(url) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(RPC_CACHE_KEY, JSON.stringify({
      url,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.warn('Failed to cache working RPC:', error);
  }
}

/**
 * Get working RPC URL - tries cache first, then checks health
 * @param {boolean} forceCheck - Force fresh check, bypass cache
 * @returns {Promise<string>} Working RPC URL
 */
export async function getWorkingRPCUrl(forceCheck = false) {
  // Try cache first for fast initialization (unless force check)
  if (!forceCheck) {
    const cached = getCachedWorkingRPC();
    if (cached) {
      console.log('📦 Using cached working RPC:', cached);
      return cached;
    }
  } else {
    console.log('🔄 Force checking RPC health (bypassing cache)...');
  }

  // No cache or force check, check RPC health
  console.log('🔍 Checking RPC health...');

  for (const rpc of RPC_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(rpc.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.result) {
          console.log(`✅ ${rpc.name} is working`);
          cacheWorkingRPC(rpc.url);
          return rpc.url;
        }
      }
    } catch (error) {
      console.warn(`❌ ${rpc.name} failed:`, error.message);
    }
  }

  // If all fail, handle based on whether this is a force check
  if (forceCheck) {
    // During force check (transaction time), throw error instead of using broken RPC
    console.error('❌ All RPCs are down!');
    throw new Error('All RPC endpoints are currently unavailable. Please try again in a few minutes.');
  } else {
    // During app initialization, use fallback
    console.warn('⚠️ All RPCs failed, using fallback for initialization');
    return RPC_ENDPOINTS[0].url;
  }
}

/**
 * Get all RPC URLs with working one first
 * @returns {Promise<string[]>} Array of RPC URLs with working one prioritized
 */
export async function getRPCUrlsPrioritized() {
  const workingRPC = await getWorkingRPCUrl();

  // Put working RPC first, others second
  const allRPCs = RPC_ENDPOINTS.map(rpc => rpc.url);
  const otherRPCs = allRPCs.filter(url => url !== workingRPC);

  return [workingRPC, ...otherRPCs];
}

/**
 * Get the working RPC endpoint info (not just URL)
 * @param {boolean} forceCheck - Force fresh check, bypass cache
 * @returns {Promise<Object>} Working RPC endpoint object with name, url, priority
 */
export async function getWorkingRPCEndpoint(forceCheck = false) {
  const workingUrl = await getWorkingRPCUrl(forceCheck);
  return RPC_ENDPOINTS.find(rpc => rpc.url === workingUrl) || RPC_ENDPOINTS[0];
}

export default {
  getCachedWorkingRPC,
  cacheWorkingRPC,
  getWorkingRPCUrl,
  getRPCUrlsPrioritized,
  getWorkingRPCEndpoint,
};
