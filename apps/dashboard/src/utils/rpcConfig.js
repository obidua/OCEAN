/**
 * Centralized RPC Configuration Utility
 * 
 * This utility provides all RPC endpoints from environment variables
 * and manages failover logic for network connectivity.
 * 
 * Usage:
 * - Frontend: import { getRPCUrls, createProviderWithFallback } from './utils/rpcConfig'
 * - Backend: require('./utils/rpcConfig') or import equivalent
 */

import Web3 from 'web3';

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
  
  // Fallback to default if no environment variables are set
  if (rpcs.length === 0) {
    console.warn('No RPC URLs found in environment variables, using fallback');
    rpcs.push('https://blockchain.ramestta.com');
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
 * @returns {Web3} Web3 instance
 */
export const createWeb3Instance = (operationName = 'Web3') => {
  const primaryRPC = getPrimaryRPC();
  // console.log(`${operationName}: Creating Web3 instance with primary RPC: ${primaryRPC}`);
  return new Web3(primaryRPC);
};

/**
 * Execute a contract call with automatic RPC failover
 * @param {Function} contractCall - Function that returns a promise for the contract call
 * @param {string} operationName - Name of the operation for logging
 * @returns {Promise} Result of the contract call
 */
export const callWithDualRPC = async (contractCall, operationName = 'Contract Call') => {
  const rpcUrls = getRPCUrls();
  let lastError = null;
  
  for (let i = 0; i < rpcUrls.length; i++) {
    try {
      // console.log(`${operationName}: Attempting with RPC ${i + 1}: ${rpcUrls[i]}`);
      
      // Create a new Web3 instance for this RPC attempt
      const web3Instance = new Web3(rpcUrls[i]);
      
      // Test connection first
      await web3Instance.eth.getBlockNumber();
      
      // Execute the contract call with this web3 instance
      const result = await contractCall();
      
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
    
    // Method to get a working provider
    async getWorkingProvider() {
      for (const rpc of rpcUrls) {
        try {
          const web3 = new Web3(rpc);
          // Test the connection
          await web3.eth.getBlockNumber();
          return rpc;
        } catch (error) {
          console.warn(`RPC ${rpc} is not responding:`, error.message);
        }
      }
      throw new Error('No working RPC providers available');
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
  
  // Fallback
  if (rpcs.length === 0) {
    rpcs.push('https://blockchain.ramestta.com');
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