import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { getRPCUrls, getNetworkConfig } from '../src/utils/rpcConfig.js'
import { getRPCUrlsPrioritized } from '../src/utils/getWorkingRPCSync.js'

export const projectId = "5f2fd12d0417edef168ae25f9ec697ad"

if (!projectId) {
    throw new Error('Project ID is not defined')
}

export const metadata = {
    name: 'OCEAN DeFi',
    description: 'OCEAN DeFi Dashboard',
    url: typeof window !== 'undefined' ? window.location.origin : 'https://oceandefi.uk',
    icons: ['https://avatars.githubusercontent.com/u/179229932']
}

// Get network configuration from environment
const networkConfig = getNetworkConfig()

// Store wagmi adapter and config - will be initialized later
let _wagmiAdapter = null
let _networks = null
let _ramesttaNetwork = null

/**
 * Create network configuration with given RPC URLs
 * @param {string[]} rpcUrls - Array of RPC URLs
 * @returns {Object} Network configuration
 */
function createNetworkConfig(rpcUrls) {
    return {
        id: parseInt(networkConfig.chainId),
        name: networkConfig.networkName,
        nativeCurrency: {
            name: 'Rama',
            symbol: 'RAMA',
            decimals: 18,
        },
        rpcUrls: {
            default: {
                http: rpcUrls,
            },
            public: {
                http: rpcUrls,
            },
        },
        blockExplorers: {
            default: {
                name: 'Ramascan',
                url: 'https://ramascan.com/',
            },
        },
        testnet: false,
    }
}

/**
 * Initialize wagmi with working RPC
 * Call this before app renders to ensure wagmi uses the working RPC
 * @returns {Promise<void>}
 */
export async function initializeWithWorkingRPC() {
  try {
    console.log('🔍 Checking for working RPC before initializing wagmi...')

    // Get prioritized RPC URLs (working one first)
    const prioritizedRPCs = await getRPCUrlsPrioritized()
    const workingRPC = prioritizedRPCs[0]

    console.log('✅ Working RPC detected:', workingRPC)
    console.log('📋 All available RPCs:', prioritizedRPCs)

    // CRITICAL FIX: Only use the single working RPC, not an array
    // This ensures wagmi ONLY sends transactions to the working endpoint
    _ramesttaNetwork = createNetworkConfig([workingRPC])
    _networks = [_ramesttaNetwork]

    // Create wagmi adapter with ONLY the working RPC
    _wagmiAdapter = new WagmiAdapter({
        projectId,
        networks: _networks
    })

    console.log('✅ Wagmi adapter initialized with ONLY working RPC:', workingRPC)
  } catch (error) {
    console.warn('⚠️ Failed to detect working RPC, using defaults:', error)

    // Fallback to default RPCs
    const defaultRPCs = getRPCUrls()
    _ramesttaNetwork = createNetworkConfig(defaultRPCs)
    _networks = [_ramesttaNetwork]

    _wagmiAdapter = new WagmiAdapter({
        projectId,
        networks: _networks
    })
  }
}

// Getters for the lazily-initialized values
export const wagmiAdapter = {
  get value() {
    if (!_wagmiAdapter) {
      throw new Error('wagmiAdapter not initialized. Call initializeWithWorkingRPC() first.')
    }
    return _wagmiAdapter
  },
  get wagmiConfig() {
    if (!_wagmiAdapter) {
      throw new Error('wagmiAdapter not initialized. Call initializeWithWorkingRPC() first.')
    }
    return _wagmiAdapter.wagmiConfig
  }
}

export const networks = {
  get value() {
    if (!_networks) {
      throw new Error('networks not initialized. Call initializeWithWorkingRPC() first.')
    }
    return _networks
  }
}

// For backward compatibility - export networks array directly
export function getNetworks() {
  if (!_networks) {
    throw new Error('networks not initialized. Call initializeWithWorkingRPC() first.')
  }
  return _networks
}

export function getWagmiAdapter() {
  if (!_wagmiAdapter) {
    throw new Error('wagmiAdapter not initialized. Call initializeWithWorkingRPC() first.')
  }
  return _wagmiAdapter
}

export const config = {
  get value() {
    if (!_wagmiAdapter) {
      throw new Error('config not initialized. Call initializeWithWorkingRPC() first.')
    }
    return _wagmiAdapter.wagmiConfig
  }
}
