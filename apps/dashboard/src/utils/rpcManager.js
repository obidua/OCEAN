/**
 * RPC Manager - Centralized RPC Failover & Health Management
 * 
 * Handles all types of RPC-related issues during data fetching:
 * - Automatic failover when primary RPC is down
 * - Health checks with caching
 * - Retry logic with exponential backoff
 * - Request timeout handling
 * - Rate limiting protection
 * - Network error recovery
 */

import Web3 from 'web3';

// RPC Endpoints configuration
const RPC_ENDPOINTS = [
    {
        name: 'RPC1',
        url: import.meta.env.VITE_RPC_URL || 'https://blockchain.ramestta.com',
        priority: 1,
    },
    {
        name: 'RPC2',
        url: import.meta.env.VITE_RPC_URL_2 || 'https://blockchain2.ramestta.com',
        priority: 2,
    },
];

// Configuration
const CONFIG = {
    HEALTH_CHECK_INTERVAL: 30000, // 30 seconds
    HEALTH_CHECK_TIMEOUT: 5000,   // 5 seconds
    REQUEST_TIMEOUT: 15000,       // 15 seconds for regular requests
    MAX_RETRIES: 3,
    RETRY_DELAY_BASE: 1000,       // Base delay for exponential backoff
    CACHE_DURATION: 60000,        // 1 minute cache for health status
    CONSECUTIVE_FAILURES_THRESHOLD: 3, // Mark unhealthy after 3 failures
};

// State management
class RpcManagerState {
    constructor() {
        this.healthStatus = new Map();
        this.currentRpcIndex = 0;
        this.web3Instances = new Map();
        this.lastHealthCheck = 0;
        this.consecutiveFailures = new Map();
        this.isInitialized = false;
        this.initPromise = null;
    }

    // Initialize all web3 instances
    initializeInstances() {
        RPC_ENDPOINTS.forEach((rpc) => {
            if (!this.web3Instances.has(rpc.url)) {
                this.web3Instances.set(rpc.url, new Web3(rpc.url));
            }
            this.healthStatus.set(rpc.url, { isHealthy: true, lastCheck: 0, responseTime: 0 });
            this.consecutiveFailures.set(rpc.url, 0);
        });
    }
}

const state = new RpcManagerState();

/**
 * Check health of a single RPC endpoint
 * @param {Object} rpc - RPC endpoint object
 * @param {number} timeout - Request timeout
 * @returns {Promise<Object>} Health check result
 */
async function checkRpcHealth(rpc, timeout = CONFIG.HEALTH_CHECK_TIMEOUT) {
    const startTime = Date.now();

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(rpc.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_blockNumber',
                params: [],
                id: Date.now(),
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const responseTime = Date.now() - startTime;

        if (data.error) {
            throw new Error(data.error.message || 'RPC Error');
        }

        if (!data.result) {
            throw new Error('Invalid response');
        }

        return {
            isHealthy: true,
            responseTime,
            blockNumber: parseInt(data.result, 16),
            error: null,
        };
    } catch (error) {
        return {
            isHealthy: false,
            responseTime: Date.now() - startTime,
            blockNumber: null,
            error: error.name === 'AbortError' ? 'Timeout' : error.message,
        };
    }
}

/**
 * Update health status for an RPC
 * @param {string} url - RPC URL
 * @param {boolean} isHealthy - Health status
 */
function updateHealthStatus(url, isHealthy) {
    const currentFailures = state.consecutiveFailures.get(url) || 0;

    if (isHealthy) {
        state.consecutiveFailures.set(url, 0);
        state.healthStatus.set(url, {
            ...state.healthStatus.get(url),
            isHealthy: true,
            lastCheck: Date.now(),
        });
    } else {
        const newFailures = currentFailures + 1;
        state.consecutiveFailures.set(url, newFailures);

        if (newFailures >= CONFIG.CONSECUTIVE_FAILURES_THRESHOLD) {
            state.healthStatus.set(url, {
                ...state.healthStatus.get(url),
                isHealthy: false,
                lastCheck: Date.now(),
            });
        }
    }
}

/**
 * Get all healthy RPCs sorted by priority and response time
 * @returns {Array} Sorted array of healthy RPCs
 */
function getHealthyRpcs() {
    const healthyRpcs = [];

    for (const rpc of RPC_ENDPOINTS) {
        const status = state.healthStatus.get(rpc.url);
        if (status?.isHealthy !== false) {
            healthyRpcs.push({
                ...rpc,
                responseTime: status?.responseTime || Infinity,
            });
        }
    }

    // Sort by priority first, then by response time
    return healthyRpcs.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.responseTime - b.responseTime;
    });
}

/**
 * Get the best available RPC endpoint
 * @param {boolean} forceHealthCheck - Force a fresh health check
 * @returns {Promise<Object>} Best available RPC endpoint
 */
async function getBestRpc(forceHealthCheck = false) {
    // Initialize if needed
    if (!state.isInitialized) {
        await initialize();
    }

    // Check if we need to refresh health status
    const shouldRefresh = forceHealthCheck ||
        (Date.now() - state.lastHealthCheck > CONFIG.HEALTH_CHECK_INTERVAL);

    if (shouldRefresh) {
        await refreshHealthStatus();
    }

    const healthyRpcs = getHealthyRpcs();

    if (healthyRpcs.length === 0) {
        // All RPCs appear unhealthy, do a fresh check
        await refreshHealthStatus();
        const recheckedRpcs = getHealthyRpcs();

        if (recheckedRpcs.length === 0) {
            // Still no healthy RPCs, return the first one anyway (best effort)
            console.warn('⚠️ All RPCs appear unhealthy, using first endpoint');
            return RPC_ENDPOINTS[0];
        }

        return recheckedRpcs[0];
    }

    return healthyRpcs[0];
}

/**
 * Refresh health status for all RPCs
 */
async function refreshHealthStatus() {
    state.lastHealthCheck = Date.now();

    const healthChecks = RPC_ENDPOINTS.map(async (rpc) => {
        const result = await checkRpcHealth(rpc);
        state.healthStatus.set(rpc.url, {
            isHealthy: result.isHealthy,
            responseTime: result.responseTime,
            lastCheck: Date.now(),
            blockNumber: result.blockNumber,
            error: result.error,
        });

        if (!result.isHealthy) {
            state.consecutiveFailures.set(rpc.url,
                (state.consecutiveFailures.get(rpc.url) || 0) + 1);
        } else {
            state.consecutiveFailures.set(rpc.url, 0);
        }

        return { rpc, result };
    });

    await Promise.all(healthChecks);
}

/**
 * Initialize the RPC Manager
 * @returns {Promise<void>}
 */
async function initialize() {
    if (state.initPromise) {
        return state.initPromise;
    }

    state.initPromise = (async () => {
        state.initializeInstances();
        await refreshHealthStatus();
        state.isInitialized = true;

        // Log initial status
        const healthyCount = getHealthyRpcs().length;
        console.log(`🌐 RPC Manager initialized: ${healthyCount}/${RPC_ENDPOINTS.length} endpoints healthy`);
    })();

    return state.initPromise;
}

/**
 * Get Web3 instance for the best available RPC
 * @param {boolean} forceHealthCheck - Force a fresh health check
 * @returns {Promise<Web3>} Web3 instance
 */
async function getWeb3Instance(forceHealthCheck = false) {
    const bestRpc = await getBestRpc(forceHealthCheck);

    if (!state.web3Instances.has(bestRpc.url)) {
        state.web3Instances.set(bestRpc.url, new Web3(bestRpc.url));
    }

    return state.web3Instances.get(bestRpc.url);
}

/**
 * Execute a Web3 call with automatic failover
 * @param {Function} callFn - Function that receives web3 instance and returns a promise
 * @param {Object} options - Options for the call
 * @returns {Promise<any>} Result of the call
 */
async function executeWithFailover(callFn, options = {}) {
    const {
        operationName = 'Web3 Call',
        maxRetries = CONFIG.MAX_RETRIES,
        timeout = CONFIG.REQUEST_TIMEOUT,
        retryOnRateLimit = true,
    } = options;

    // Initialize if needed
    if (!state.isInitialized) {
        await initialize();
    }

    let lastError = null;
    const triedRpcs = new Set();

    // Try each RPC endpoint
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        // Get healthy RPCs that haven't been tried
        const healthyRpcs = getHealthyRpcs().filter(rpc => !triedRpcs.has(rpc.url));

        // If all healthy RPCs tried, include unhealthy ones
        const availableRpcs = healthyRpcs.length > 0
            ? healthyRpcs
            : RPC_ENDPOINTS.filter(rpc => !triedRpcs.has(rpc.url));

        if (availableRpcs.length === 0) {
            // All RPCs tried, reset and retry with delay
            if (attempt < maxRetries - 1) {
                triedRpcs.clear();
                const delay = CONFIG.RETRY_DELAY_BASE * Math.pow(2, attempt);
                console.warn(`${operationName}: All RPCs failed, retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            break;
        }

        const rpc = availableRpcs[0];
        triedRpcs.add(rpc.url);

        try {
            const web3 = state.web3Instances.get(rpc.url) || new Web3(rpc.url);

            // Create a timeout promise
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Request timeout')), timeout);
            });

            // Race between the call and timeout
            const result = await Promise.race([
                callFn(web3),
                timeoutPromise,
            ]);

            // Success! Update health status
            updateHealthStatus(rpc.url, true);
            return result;

        } catch (error) {
            lastError = error;
            const errorMessage = error.message || String(error);

            // Log the failure
            console.warn(`${operationName}: ${rpc.name} failed - ${errorMessage}`);

            // Update health status
            updateHealthStatus(rpc.url, false);

            // Check for rate limiting
            if (retryOnRateLimit && isRateLimitError(error)) {
                const delay = CONFIG.RETRY_DELAY_BASE * Math.pow(2, attempt);
                console.warn(`${operationName}: Rate limited, waiting ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            // Check for non-retryable errors
            if (isNonRetryableError(error)) {
                throw error;
            }
        }
    }

    // All attempts failed
    console.error(`${operationName}: All RPC attempts failed`);
    throw lastError || new Error('All RPC endpoints failed');
}

/**
 * Check if error is a rate limit error
 * @param {Error} error - The error to check
 * @returns {boolean}
 */
function isRateLimitError(error) {
    const message = error.message?.toLowerCase() || '';
    return (
        message.includes('rate limit') ||
        message.includes('too many requests') ||
        message.includes('429') ||
        error.code === 429
    );
}

/**
 * Check if error is non-retryable
 * @param {Error} error - The error to check
 * @returns {boolean}
 */
function isNonRetryableError(error) {
    const message = error.message?.toLowerCase() || '';
    return (
        message.includes('invalid address') ||
        message.includes('invalid params') ||
        message.includes('execution reverted') ||
        message.includes('insufficient funds') ||
        message.includes('nonce too low')
    );
}

/**
 * Execute a contract method call with failover
 * @param {Object} contract - Web3 contract instance
 * @param {string} methodName - Method name to call
 * @param {Array} args - Arguments for the method
 * @param {Object} options - Options for the call
 * @returns {Promise<any>} Result of the call
 */
async function callContractMethod(contract, methodName, args = [], options = {}) {
    const { abi, address } = contract.options ?
        { abi: contract.options.jsonInterface, address: contract.options.address } :
        { abi: contract._jsonInterface, address: contract._address };

    return executeWithFailover(
        async (web3) => {
            const contractInstance = new web3.eth.Contract(abi, address);
            return contractInstance.methods[methodName](...args).call();
        },
        { operationName: `${methodName}()`, ...options }
    );
}

/**
 * Get native balance with failover
 * @param {string} address - Address to check balance
 * @param {Object} options - Options for the call
 * @returns {Promise<string>} Balance in wei
 */
async function getBalance(address, options = {}) {
    return executeWithFailover(
        async (web3) => web3.eth.getBalance(address),
        { operationName: 'getBalance', ...options }
    );
}

/**
 * Get current block number with failover
 * @param {Object} options - Options for the call
 * @returns {Promise<number>} Block number
 */
async function getBlockNumber(options = {}) {
    return executeWithFailover(
        async (web3) => web3.eth.getBlockNumber(),
        { operationName: 'getBlockNumber', ...options }
    );
}

/**
 * Get all RPC status for display
 * @returns {Promise<Array>} Array of RPC status objects
 */
async function getAllRpcStatus() {
    if (!state.isInitialized) {
        await initialize();
    }

    return RPC_ENDPOINTS.map(rpc => {
        const status = state.healthStatus.get(rpc.url) || {};
        const failures = state.consecutiveFailures.get(rpc.url) || 0;

        return {
            name: rpc.name,
            url: rpc.url,
            priority: rpc.priority,
            isHealthy: status.isHealthy !== false,
            responseTime: status.responseTime || 0,
            blockNumber: status.blockNumber || null,
            lastCheck: status.lastCheck || 0,
            consecutiveFailures: failures,
            error: status.error || null,
        };
    });
}

/**
 * Force refresh health status and get current best RPC
 * @returns {Promise<Object>} Best RPC after refresh
 */
async function forceRefreshAndGetBest() {
    await refreshHealthStatus();
    return getBestRpc();
}

/**
 * Create a resilient contract instance
 * @param {Array} abi - Contract ABI
 * @param {string} address - Contract address
 * @returns {Object} Proxy object with resilient method calls
 */
function createResilientContract(abi, address) {
    if (!address || address === '0x0000000000000000000000000000000000000000') {
        return null;
    }

    // Return a proxy that wraps all method calls with failover
    return {
        methods: new Proxy({}, {
            get(_, methodName) {
                return (...args) => ({
                    call: async (callOptions = {}) => {
                        return executeWithFailover(
                            async (web3) => {
                                const contract = new web3.eth.Contract(abi, address);
                                return contract.methods[methodName](...args).call(callOptions);
                            },
                            { operationName: `${methodName}()` }
                        );
                    },
                    // For transactions, return the encoded data
                    encodeABI: () => {
                        const web3 = new Web3();
                        const contract = new web3.eth.Contract(abi, address);
                        return contract.methods[methodName](...args).encodeABI();
                    },
                });
            },
        }),
        options: { address, jsonInterface: abi },
        _address: address,
        _jsonInterface: abi,
    };
}

// Export the RPC Manager API
export const rpcManager = {
    initialize,
    getWeb3Instance,
    getBestRpc,
    executeWithFailover,
    callContractMethod,
    getBalance,
    getBlockNumber,
    getAllRpcStatus,
    forceRefreshAndGetBest,
    createResilientContract,
    refreshHealthStatus,

    // Expose config for reference
    config: CONFIG,
    endpoints: RPC_ENDPOINTS,
};

// Named exports for convenience
export {
    initialize as initializeRpcManager,
    getWeb3Instance,
    getBestRpc,
    executeWithFailover,
    callContractMethod,
    getBalance as getResilientBalance,
    getBlockNumber as getResilientBlockNumber,
    getAllRpcStatus,
    forceRefreshAndGetBest,
    createResilientContract,
};

export default rpcManager;
