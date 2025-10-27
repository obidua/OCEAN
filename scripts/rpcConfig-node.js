/**
 * Node.js RPC Configuration Utility
 * 
 * This utility provides centralized RPC management for backend scripts.
 * It reads RPC URLs from environment variables and provides failover logic.
 * 
 * Usage:
 * const { getRPCUrls, createProviderWithFallback } = require('./rpcConfig-node');
 */

const Web3 = require('web3');
const fs = require('fs');
const path = require('path');

/**
 * Load environment variables from .env file
 */
function loadEnvFile() {
  try {
    // Look for .env file in the dashboard directory
    const envPath = path.join(__dirname, '../apps/dashboard/.env');
    
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envLines = envContent.split('\n');
      
      envLines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=');
            process.env[key] = value;
          }
        }
      });
      
      console.log('Environment variables loaded from .env file');
    } else {
      console.warn('No .env file found, using environment variables or defaults');
    }
  } catch (error) {
    console.warn('Error loading .env file:', error.message);
  }
}

// Load environment variables when this module is imported
loadEnvFile();

/**
 * Get all RPC URLs from environment variables
 * @returns {Array<string>} Array of RPC URLs in order of preference
 */
function getRPCUrls() {
  const rpcs = [];
  
  // Primary RPC
  if (process.env.VITE_RPC_URL) {
    rpcs.push(process.env.VITE_RPC_URL);
  }
  
  // Fallback RPCs
  if (process.env.VITE_RPC_URL_2) {
    rpcs.push(process.env.VITE_RPC_URL_2);
  }
  
  if (process.env.VITE_RPC_URL_3) {
    rpcs.push(process.env.VITE_RPC_URL_3);
  }
  
  // Fallback to default if no environment variables are set
  if (rpcs.length === 0) {
    console.warn('No RPC URLs found in environment variables, using fallback');
    rpcs.push('https://blockchain.ramestta.com');
    rpcs.push('https://blockchain2.ramestta.com');
    rpcs.push('https://testrpc.bidua.in');
  }
  
  console.log('Available RPC URLs:', rpcs);
  return rpcs;
}

/**
 * Get primary RPC URL
 * @returns {string} Primary RPC URL
 */
function getPrimaryRPC() {
  return process.env.VITE_RPC_URL || 'https://blockchain.ramestta.com';
}

/**
 * Get network configuration from environment
 * @returns {Object} Network configuration
 */
function getNetworkConfig() {
  return {
    chainId: process.env.VITE_CHAIN_ID || 1370,
    networkName: process.env.VITE_NETWORK_NAME || 'Ramestta',
    primaryRPC: getPrimaryRPC(),
    fallbackRPCs: getRPCUrls().slice(1),
    allRPCs: getRPCUrls()
  };
}

/**
 * Create a Web3 instance with automatic failover
 * @param {string} operationName - Name of the operation for logging
 * @returns {Web3} Web3 instance
 */
function createWeb3Instance(operationName = 'Web3') {
  const primaryRPC = getPrimaryRPC();
  console.log(`${operationName}: Creating Web3 instance with primary RPC: ${primaryRPC}`);
  return new Web3(primaryRPC);
}

/**
 * Create provider with fallback for Node.js scripts
 * @param {string} operationName - Name of operation for logging
 * @returns {Function} Function that creates provider with fallback
 */
function createProviderWithFallback(operationName = 'Script') {
  const rpcUrls = getRPCUrls();
  
  return async (contractCall) => {
    let lastError = null;
    
    for (let i = 0; i < rpcUrls.length; i++) {
      try {
        console.log(`${operationName}: Attempting with RPC ${i + 1}: ${rpcUrls[i]}`);
        const web3 = new Web3(rpcUrls[i]);
        
        // Test connection first
        await web3.eth.getBlockNumber();
        
        const result = await contractCall(web3);
        console.log(`${operationName}: Success with RPC ${i + 1}`);
        return result;
      } catch (error) {
        console.warn(`${operationName}: RPC ${i + 1} failed:`, error.message);
        lastError = error;
        
        if (i < rpcUrls.length - 1) {
          console.log(`${operationName}: Trying next RPC...`);
        }
      }
    }
    
    console.error(`${operationName}: All RPCs failed`);
    throw lastError;
  };
}

/**
 * Execute a contract call with automatic RPC failover
 * @param {Function} contractCall - Function that takes a web3 instance and returns a promise
 * @param {string} operationName - Name of the operation for logging
 * @returns {Promise} Result of the contract call
 */
async function callWithRPCFailover(contractCall, operationName = 'Contract Call') {
  const rpcUrls = getRPCUrls();
  let lastError = null;
  
  for (let i = 0; i < rpcUrls.length; i++) {
    try {
      console.log(`${operationName}: Attempting with RPC ${i + 1}: ${rpcUrls[i]}`);
      
      const web3 = new Web3(rpcUrls[i]);
      
      // Test connection first
      await web3.eth.getBlockNumber();
      
      const result = await contractCall(web3);
      console.log(`${operationName}: Success with RPC ${i + 1}`);
      return result;
    } catch (error) {
      console.warn(`${operationName}: RPC ${i + 1} failed:`, error.message);
      lastError = error;
      
      if (i < rpcUrls.length - 1) {
        console.log(`${operationName}: Trying next RPC...`);
      }
    }
  }
  
  console.error(`${operationName}: All RPCs failed`);
  throw lastError;
}

/**
 * Test all RPC connections
 * @returns {Promise<Object>} Status of each RPC
 */
async function testRPCConnections() {
  const rpcUrls = getRPCUrls();
  const results = {};
  
  for (let i = 0; i < rpcUrls.length; i++) {
    try {
      const web3 = new Web3(rpcUrls[i]);
      const blockNumber = await web3.eth.getBlockNumber();
      results[rpcUrls[i]] = {
        status: 'working',
        blockNumber: blockNumber,
        index: i + 1
      };
      console.log(`✅ RPC ${i + 1} (${rpcUrls[i]}): Working - Block ${blockNumber}`);
    } catch (error) {
      results[rpcUrls[i]] = {
        status: 'failed',
        error: error.message,
        index: i + 1
      };
      console.log(`❌ RPC ${i + 1} (${rpcUrls[i]}): Failed - ${error.message}`);
    }
  }
  
  return results;
}

module.exports = {
  getRPCUrls,
  getPrimaryRPC,
  getNetworkConfig,
  createWeb3Instance,
  createProviderWithFallback,
  callWithRPCFailover,
  testRPCConnections,
  loadEnvFile
};