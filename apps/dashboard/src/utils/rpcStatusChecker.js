/**
 * RPC Status Checker Utility
 * Checks which RPCs are online and returns the working one
 * Now integrated with RPC Manager for consistent status tracking
 */

import { rpcManager } from './rpcManager.js';

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

/**
 * Check if a single RPC endpoint is online
 * @param {Object} rpc - RPC endpoint object with name and url
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Object>} Status object with name, url, isOnline, and responseTime
 */
export async function checkRPCStatus(rpc, timeout = 5000) {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(rpc.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const responseTime = Date.now() - startTime;

    if (data.result) {
      return {
        name: rpc.name,
        url: rpc.url,
        priority: rpc.priority,
        isOnline: true,
        responseTime,
        blockNumber: parseInt(data.result, 16),
      };
    } else {
      throw new Error('Invalid response from RPC');
    }
  } catch (error) {
    return {
      name: rpc.name,
      url: rpc.url,
      priority: rpc.priority,
      isOnline: false,
      responseTime: Date.now() - startTime,
      error: error.message,
    };
  }
}

/**
 * Check all RPC endpoints and return their status
 * Uses RPC Manager for consistent status tracking
 * @returns {Promise<Array>} Array of status objects for all RPCs
 */
export async function checkAllRPCs() {
  try {
    // Use RPC Manager's status which is already being tracked
    const statuses = await rpcManager.getAllRpcStatus();
    return statuses.map(status => ({
      name: status.name,
      url: status.url,
      priority: status.priority,
      isOnline: status.isHealthy,
      responseTime: status.responseTime,
      blockNumber: status.blockNumber,
      error: status.error,
    }));
  } catch (error) {
    // Fallback to direct checks if RPC Manager fails
    const checks = RPC_ENDPOINTS.map(rpc => checkRPCStatus(rpc));
    return Promise.all(checks);
  }
}

/**
 * Get the first working RPC endpoint
 * Uses RPC Manager for optimal RPC selection
 * @returns {Promise<Object|null>} Working RPC object or null if none are working
 */
export async function getWorkingRPC() {
  try {
    const bestRpc = await rpcManager.getBestRpc();
    return {
      name: bestRpc.name,
      url: bestRpc.url,
      priority: bestRpc.priority,
      isOnline: true,
    };
  } catch (error) {
    // Fallback to old method
    const statuses = await checkAllRPCs();
    const workingRPCs = statuses
      .filter(rpc => rpc.isOnline)
      .sort((a, b) => a.priority - b.priority);
    return workingRPCs.length > 0 ? workingRPCs[0] : null;
  }
}

/**
 * Get all working RPCs sorted by priority
 * @returns {Promise<Array>} Array of working RPC URLs
 */
export async function getWorkingRPCUrls() {
  const statuses = await checkAllRPCs();
  return statuses
    .filter(rpc => rpc.isOnline)
    .sort((a, b) => a.priority - b.priority)
    .map(rpc => rpc.url);
}

/**
 * Get RPC endpoints configuration
 * @returns {Array} Array of RPC endpoint objects
 */
export function getRPCEndpoints() {
  return RPC_ENDPOINTS;
}

export default {
  checkRPCStatus,
  checkAllRPCs,
  getWorkingRPC,
  getWorkingRPCUrls,
  getRPCEndpoints,
};
