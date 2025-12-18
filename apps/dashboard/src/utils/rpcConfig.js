/**
 * Centralized RPC Configuration Utility
 * 
 * This utility provides all RPC endpoints from environment variables
 * and manages failover logic for network connectivity.
 * 
 * Usage:
 * - Frontend: import { getRPCUrls, createProviderWithFallback } from './utils/rpcConfig'
 * - Backend: require('./utils/rpcConfig') or import equivalent
 * 
 * For resilient calls with automatic failover, use:
 * - import { rpcManager, executeWithFailover } from './utils/rpcManager'
 */

import Web3 from 'web3';
import { rpcManager } from './rpcManager.js';

/**
 * Get all RPC URLs from environment variables
 * @returns {Array<string>} Array of RPC URLs in order of preference
 */
export const getRPCUrls = () => {
  const rpcs = [];

  // Primary RPC
  if (import.meta.env.VITE_RPC_URL) {
    rpcs.push(import.meta.env.VITE_RPC_URL);
  }

  // Fallback RPCs
  if (import.meta.env.VITE_RPC_URL_2) {
    rpcs.push(import.meta.env.VITE_RPC_URL_2);
  }

  if (import.meta.env.VITE_RPC_URL_3) {
    rpcs.push(import.meta.env.VITE_RPC_URL_3);
  }

  // Fallback to default RPCs if no environment variables are set
  if (rpcs.length === 0) {
    console.warn('No RPC URLs found in environment variables, using fallback');
    rpcs.push('https://blockchain.ramestta.com');
    rpcs.push('https://blockchain2.ramestta.com');
  }

  return rpcs;
};

/**
 * Get primary RPC URL
 * @returns {string} Primary RPC URL
 */
export const getPrimaryRPC = () => {
  return import.meta.env.VITE_RPC_URL || 'https://blockchain.ramestta.com';
};

/**
 * Get network configuration from environment
 * @returns {Object} Network configuration
 */
export const getNetworkConfig = () => {
  return {
    chainId: import.meta.env.VITE_CHAIN_ID || 1370,
    networkName: import.meta.env.VITE_NETWORK_NAME || 'Ramestta',
    primaryRPC: getPrimaryRPC(),
    fallbackRPCs: getRPCUrls().slice(1), // All except the first one
    allRPCs: getRPCUrls()
  };
};

/**
 * Create a Web3 instance with automatic failover
 * @param {string} operationName - Name of the operation for logging
 * @returns {Promise<Web3>} Web3 instance from the best available RPC
 */
export const createWeb3Instance = async (operationName = 'Web3') => {
  try {
    // Use RPC Manager to get the best available Web3 instance
    return await rpcManager.getWeb3Instance();
  } catch (error) {
    // Fallback to primary RPC if RPC Manager fails
    console.warn(`${operationName}: RPC Manager failed, using primary RPC fallback`);
    const primaryRPC = getPrimaryRPC();
    return new Web3(primaryRPC);
  }
};

/**
 * Create a synchronous Web3 instance (for backward compatibility)
 * Use createWeb3Instance() for new code
 * @param {string} operationName - Name of the operation for logging
 * @returns {Web3} Web3 instance
 */
export const createWeb3InstanceSync = (operationName = 'Web3') => {
  const primaryRPC = getPrimaryRPC();
  return new Web3(primaryRPC);
};

/**
 * Execute a contract call with automatic RPC failover
 * Uses the new RPC Manager for robust failover handling
 * @param {Function} contractCall - Function that returns a promise for the contract call
 * @param {string} operationName - Name of the operation for logging
 * @returns {Promise} Result of the contract call
 */
export const callWithDualRPC = async (contractCall, operationName = 'Contract Call') => {
  // Use the new RPC Manager for robust failover
  return rpcManager.executeWithFailover(
    async (web3) => {
      // If contractCall expects no arguments, just call it
      // Otherwise pass the web3 instance
      try {
        return await contractCall(web3);
      } catch {
        // Try calling without arguments (for backward compatibility)
        return await contractCall();
      }
    },
    { operationName }
  );
};

/**
 * Create a provider with automatic failover for use with Web3
 * @returns {Object} Provider configuration
 */
export const createProviderWithFallback = () => {
  const rpcUrls = getRPCUrls();

  return {
    primary: rpcUrls[0],
    fallbacks: rpcUrls.slice(1),
    all: rpcUrls,

    // Method to get a working provider using RPC Manager
    async getWorkingProvider() {
      try {
        const bestRpc = await rpcManager.getBestRpc();
        return bestRpc.url;
      } catch (error) {
        // Fallback to old method if RPC Manager fails
        for (const rpc of rpcUrls) {
          try {
            const web3 = new Web3(rpc);
            await web3.eth.getBlockNumber();
            return rpc;
          } catch (err) {
            console.warn(`RPC ${rpc} is not responding:`, err.message);
          }
        }
        throw new Error('No working RPC providers available');
      }
    }
  };
};

/**
 * Node.js compatible version for backend scripts
 * @returns {Array<string>} Array of RPC URLs
 */
export const getRPCUrlsNode = () => {
  // For Node.js environment, read from process.env
  const rpcs = [];

  if (process.env.VITE_RPC_URL) {
    rpcs.push(process.env.VITE_RPC_URL);
  }

  if (process.env.VITE_RPC_URL_2) {
    rpcs.push(process.env.VITE_RPC_URL_2);
  }

  if (process.env.VITE_RPC_URL_3) {
    rpcs.push(process.env.VITE_RPC_URL_3);
  }

  // Fallback to default RPCs
  if (rpcs.length === 0) {
    rpcs.push('https://blockchain.ramestta.com');
    rpcs.push('https://blockchain2.ramestta.com');
  }

  return rpcs;
};

/**
 * Create provider with fallback for Node.js scripts
 * @param {string} operationName - Name of operation for logging
 * @returns {Function} Function that creates provider with fallback
 */
export const createProviderWithFallbackNode = (operationName = 'Script') => {
  const rpcUrls = getRPCUrlsNode();

  return async (contractCall) => {
    let lastError = null;

    for (let i = 0; i < rpcUrls.length; i++) {
      try {
        // console.log(`${operationName}: Attempting with RPC ${i + 1}: ${rpcUrls[i]}`);
        const web3 = new Web3(rpcUrls[i]);

        // Test connection first
        await web3.eth.getBlockNumber();

        const result = await contractCall(web3);
        // console.log(`${operationName}: Success with RPC ${i + 1}`);
        return result;
      } catch (error) {
        console.warn(`${operationName}: RPC ${i + 1} failed:`, error.message);
        lastError = error;

        if (i < rpcUrls.length - 1) {
          // console.log(`${operationName}: Trying next RPC...`);
        }
      }
    }

    console.error(`${operationName}: All RPCs failed`);
    throw lastError;
  };
};

// Export default configuration
export default {
  getRPCUrls,
  getPrimaryRPC,
  getNetworkConfig,
  createWeb3Instance,
  callWithDualRPC,
  createProviderWithFallback,
  getRPCUrlsNode,
  createProviderWithFallbackNode
};