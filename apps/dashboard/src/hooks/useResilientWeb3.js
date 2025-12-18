/**
 * React Hook for Resilient Web3 Calls
 * 
 * Provides automatic RPC failover for all Web3 operations
 * with built-in error handling and retry logic.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { rpcManager } from '../utils/rpcManager.js';

/**
 * Hook for making resilient Web3 calls with automatic failover
 * @returns {Object} Hook utilities
 */
export function useResilientWeb3() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [rpcStatus, setRpcStatus] = useState([]);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    /**
     * Execute a Web3 call with automatic failover
     * @param {Function} callFn - Function that receives web3 instance
     * @param {Object} options - Options for the call
     * @returns {Promise<any>} Result of the call
     */
    const execute = useCallback(async (callFn, options = {}) => {
        const {
            operationName = 'Web3 Call',
            showLoading = true,
            resetErrorOnStart = true,
        } = options;

        if (showLoading && mountedRef.current) {
            setIsLoading(true);
        }
        if (resetErrorOnStart && mountedRef.current) {
            setError(null);
        }

        try {
            const result = await rpcManager.executeWithFailover(callFn, { operationName });
            return result;
        } catch (err) {
            if (mountedRef.current) {
                setError(err.message || 'Web3 call failed');
            }
            throw err;
        } finally {
            if (showLoading && mountedRef.current) {
                setIsLoading(false);
            }
        }
    }, []);

    /**
     * Get balance with automatic failover
     * @param {string} address - Address to check
     * @returns {Promise<string>} Balance in wei
     */
    const getBalance = useCallback(async (address) => {
        return execute(
            async (web3) => web3.eth.getBalance(address),
            { operationName: 'getBalance' }
        );
    }, [execute]);

    /**
     * Get current block number
     * @returns {Promise<number>} Block number
     */
    const getBlockNumber = useCallback(async () => {
        return execute(
            async (web3) => web3.eth.getBlockNumber(),
            { operationName: 'getBlockNumber' }
        );
    }, [execute]);

    /**
     * Call a contract method with failover
     * @param {Object} contract - Contract instance with ABI and address
     * @param {string} methodName - Method to call
     * @param {Array} args - Arguments for the method
     * @returns {Promise<any>} Result of the call
     */
    const callContract = useCallback(async (contract, methodName, args = []) => {
        const abi = contract.options?.jsonInterface || contract._jsonInterface;
        const address = contract.options?.address || contract._address;

        return execute(
            async (web3) => {
                const contractInstance = new web3.eth.Contract(abi, address);
                return contractInstance.methods[methodName](...args).call();
            },
            { operationName: `${methodName}()` }
        );
    }, [execute]);

    /**
     * Refresh RPC status
     * @returns {Promise<Array>} Updated status array
     */
    const refreshStatus = useCallback(async () => {
        try {
            await rpcManager.refreshHealthStatus();
            const status = await rpcManager.getAllRpcStatus();
            if (mountedRef.current) {
                setRpcStatus(status);
            }
            return status;
        } catch (err) {
            console.error('Failed to refresh RPC status:', err);
            return [];
        }
    }, []);

    /**
     * Get current RPC status
     * @returns {Promise<Array>} Status array
     */
    const getStatus = useCallback(async () => {
        try {
            const status = await rpcManager.getAllRpcStatus();
            if (mountedRef.current) {
                setRpcStatus(status);
            }
            return status;
        } catch (err) {
            return [];
        }
    }, []);

    /**
     * Get best available RPC
     * @param {boolean} forceCheck - Force fresh health check
     * @returns {Promise<Object>} Best RPC endpoint
     */
    const getBestRpc = useCallback(async (forceCheck = false) => {
        return rpcManager.getBestRpc(forceCheck);
    }, []);

    /**
     * Get Web3 instance for the best RPC
     * @returns {Promise<Web3>} Web3 instance
     */
    const getWeb3 = useCallback(async () => {
        return rpcManager.getWeb3Instance();
    }, []);

    return {
        // State
        isLoading,
        error,
        rpcStatus,

        // Methods
        execute,
        getBalance,
        getBlockNumber,
        callContract,
        refreshStatus,
        getStatus,
        getBestRpc,
        getWeb3,

        // Clear error
        clearError: useCallback(() => setError(null), []),
    };
}

/**
 * Hook for monitoring RPC health
 * @param {Object} options - Options
 * @returns {Object} RPC health status
 */
export function useRpcHealth(options = {}) {
    const { autoRefresh = true, refreshInterval = 30000 } = options;
    const [status, setStatus] = useState([]);
    const [bestRpc, setBestRpc] = useState(null);
    const [isChecking, setIsChecking] = useState(false);

    const refresh = useCallback(async () => {
        setIsChecking(true);
        try {
            await rpcManager.refreshHealthStatus();
            const newStatus = await rpcManager.getAllRpcStatus();
            const best = await rpcManager.getBestRpc();
            setStatus(newStatus);
            setBestRpc(best);
        } catch (err) {
            console.error('RPC health check failed:', err);
        } finally {
            setIsChecking(false);
        }
    }, []);

    useEffect(() => {
        refresh();

        if (autoRefresh) {
            const interval = setInterval(refresh, refreshInterval);
            return () => clearInterval(interval);
        }
    }, [refresh, autoRefresh, refreshInterval]);

    return {
        status,
        bestRpc,
        isChecking,
        refresh,
        healthyCount: status.filter(s => s.isHealthy).length,
        totalCount: status.length,
    };
}

export default useResilientWeb3;
