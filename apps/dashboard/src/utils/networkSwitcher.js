/**
 * MetaMask Network Switcher Utility
 * Automatically switches to the working RPC and adds it if not present
 * Now integrated with RPC Manager for consistent failover
 */

import { rpcManager } from './rpcManager';

const CHAIN_ID = '0x55a'; // 1370 in hex
const CHAIN_ID_DECIMAL = 1370;
const NETWORK_NAME = 'Ramestta Mainnet';
const CURRENCY_NAME = 'Rama';
const CURRENCY_SYMBOL = 'RAMA';
const CURRENCY_DECIMALS = 18;
const BLOCK_EXPLORER_URL = 'https://ramascan.com/';

/**
 * Check if MetaMask is installed
 * @returns {boolean} True if MetaMask is installed
 */
export function isMetaMaskInstalled() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.ethereum && window.ethereum.isMetaMask);
}

/**
 * Get the current chain ID from MetaMask
 * @returns {Promise<string>} Current chain ID in hex
 */
export async function getCurrentChainId() {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }
  return await window.ethereum.request({ method: 'eth_chainId' });
}

/**
 * Add a network to MetaMask
 * @param {string} rpcUrl - RPC URL to add
 * @returns {Promise<boolean>} True if network was added successfully
 */
export async function addNetworkToMetaMask(rpcUrl) {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: CHAIN_ID,
          chainName: NETWORK_NAME,
          nativeCurrency: {
            name: CURRENCY_NAME,
            symbol: CURRENCY_SYMBOL,
            decimals: CURRENCY_DECIMALS,
          },
          rpcUrls: [rpcUrl],
          blockExplorerUrls: [BLOCK_EXPLORER_URL],
        },
      ],
    });
    return true;
  } catch (error) {
    console.error('Failed to add network to MetaMask:', error);
    throw error;
  }
}

/**
 * Switch to the Ramestta network in MetaMask
 * @param {string} rpcUrl - Optional RPC URL to use when adding network
 * @param {boolean} forceAdd - Force trying to add network first (triggers MetaMask popup)
 * @returns {Promise<boolean>} True if switched successfully
 */
export async function switchToRamesttaNetwork(rpcUrl = null, forceAdd = false) {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  const urlToUse = rpcUrl || 'https://blockchain.ramestta.com';

  // If forceAdd is true, try adding the network first (triggers MetaMask popup)
  // This allows user to update RPC if network already exists
  if (forceAdd) {
    try {
      console.log('🔄 Requesting to add/update network with RPC:', urlToUse);
      await addNetworkToMetaMask(urlToUse);
      console.log('✅ Network added/updated successfully');
      return true;
    } catch (addError) {
      // If adding fails (e.g., user rejects), try switching
      console.log('⚠️ Add failed, trying switch instead:', addError.message);
      if (addError.code === 4001) {
        // User rejected the request
        throw new Error('Please approve the network change in MetaMask');
      }
    }
  }

  try {
    // Try to switch to the network
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: CHAIN_ID }],
    });
    return true;
  } catch (switchError) {
    // This error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      try {
        // Add the network - this will trigger MetaMask popup
        console.log('🔄 Network not found, adding with RPC:', urlToUse);
        await addNetworkToMetaMask(urlToUse);
        return true;
      } catch (addError) {
        console.error('Failed to add network:', addError);
        throw addError;
      }
    } else if (switchError.code === 4001) {
      throw new Error('Please approve the network change in MetaMask');
    } else {
      console.error('Failed to switch network:', switchError);
      throw switchError;
    }
  }
}

/**
 * Switch to the working RPC automatically
 * Checks RPC status and switches/adds the working one
 * Uses RPC Manager for optimal RPC selection
 * @param {boolean} forceAdd - Force adding network (triggers MetaMask popup)
 * @returns {Promise<Object>} Object with success status and RPC info
 */
export async function switchToWorkingRPC(forceAdd = false) {
  if (!isMetaMaskInstalled()) {
    return {
      success: false,
      error: 'MetaMask is not installed',
    };
  }

  try {
    // Use RPC Manager to get the best working RPC
    let workingRPC;
    try {
      workingRPC = await rpcManager.getBestRpc(true); // Force health check
    } catch {
      workingRPC = null;
    }

    if (!workingRPC) {
      // No RPC is working, try with RPC Manager's endpoints
      const rpcs = rpcManager.endpoints;
      let lastError = null;

      for (const rpc of rpcs) {
        try {
          console.log(`🔄 Trying to connect to ${rpc.name}...`);
          await switchToRamesttaNetwork(rpc.url, forceAdd);
          return {
            success: true,
            rpc: rpc,
            message: `Connected to ${rpc.name}`,
          };
        } catch (error) {
          console.warn(`Failed to connect to ${rpc.name}:`, error.message);
          lastError = error;
        }
      }

      return {
        success: false,
        error: lastError?.message || 'No working RPC found. All endpoints are down.',
      };
    }

    // Check if already on the correct network
    const currentChainId = await getCurrentChainId();

    // If we're already on Ramestta but forceAdd is true, still trigger the add
    // This allows updating the RPC if it's broken
    if (currentChainId === CHAIN_ID && !forceAdd) {
      return {
        success: true,
        rpc: workingRPC,
        message: `Already connected to Ramestta Mainnet`,
        alreadyConnected: true,
      };
    }

    // Use forceAdd to trigger MetaMask popup for RPC update
    console.log(`🔄 Switching to ${workingRPC.name} (${workingRPC.url})...`);
    await switchToRamesttaNetwork(workingRPC.url, forceAdd);

    return {
      success: true,
      rpc: workingRPC,
      message: `Successfully connected to ${workingRPC.name}`,
    };
  } catch (error) {
    console.error('Error switching to working RPC:', error);
    return {
      success: false,
      error: error.message || 'Failed to switch network',
    };
  }
}

/**
 * Auto-switch on wallet connect with user notification
 * @returns {Promise<void>}
 */
export async function autoSwitchOnConnect() {
  if (!isMetaMaskInstalled()) {
    console.warn('MetaMask not detected');
    return;
  }

  try {
    const result = await switchToWorkingRPC();

    if (result.success) {
      if (!result.alreadyConnected) {
        console.log(`✅ ${result.message}`);
      }
    } else {
      console.error(`❌ Network switch failed: ${result.error}`);
    }
  } catch (error) {
    console.error('Auto-switch failed:', error);
  }
}

export default {
  isMetaMaskInstalled,
  getCurrentChainId,
  addNetworkToMetaMask,
  switchToRamesttaNetwork,
  switchToWorkingRPC,
  autoSwitchOnConnect,
};
