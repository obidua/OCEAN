/**
 * Local Transaction History Tracker
 * Stores transaction attempts in localStorage to track failed transactions
 * that don't get recorded on-chain.
 */

const STORAGE_KEY = 'ocean_defi_tx_history';
const MAX_ENTRIES = 100; // Keep last 100 transactions

/**
 * Get all stored transactions for a wallet address
 * @param {string} walletAddress - The wallet address
 * @param {string} type - Transaction type filter (optional)
 * @returns {Array} Array of transaction objects
 */
export const getLocalTransactions = (walletAddress, type = null) => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const allTxs = JSON.parse(stored);
    const walletTxs = allTxs.filter(tx => 
      tx.wallet?.toLowerCase() === walletAddress?.toLowerCase()
    );
    
    if (type) {
      return walletTxs.filter(tx => tx.type === type);
    }
    
    return walletTxs.sort((a, b) => b.timestamp - a.timestamp);
  } catch (err) {
    console.error('[TransactionHistory] Error reading:', err);
    return [];
  }
};

/**
 * Add a transaction attempt to local storage
 * @param {Object} txData - Transaction data
 */
export const addTransaction = (txData) => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const allTxs = stored ? JSON.parse(stored) : [];
    
    const newTx = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...txData,
    };
    
    allTxs.unshift(newTx);
    
    // Keep only the last MAX_ENTRIES
    if (allTxs.length > MAX_ENTRIES) {
      allTxs.splice(MAX_ENTRIES);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allTxs));
    console.log('[TransactionHistory] Added:', newTx);
    
    return newTx;
  } catch (err) {
    console.error('[TransactionHistory] Error adding:', err);
    return null;
  }
};

/**
 * Update a transaction's status
 * @param {string} id - Transaction ID or hash
 * @param {Object} updates - Fields to update
 */
export const updateTransaction = (id, updates) => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;
    
    const allTxs = JSON.parse(stored);
    const index = allTxs.findIndex(tx => tx.id === id || tx.hash === id);
    
    if (index === -1) return false;
    
    allTxs[index] = { ...allTxs[index], ...updates, updatedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allTxs));
    
    console.log('[TransactionHistory] Updated:', allTxs[index]);
    return true;
  } catch (err) {
    console.error('[TransactionHistory] Error updating:', err);
    return false;
  }
};

/**
 * Update a transaction by hash
 * @param {string} hash - Transaction hash
 * @param {Object} updates - Fields to update
 */
export const updateTransactionByHash = (hash, updates) => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;
    
    const allTxs = JSON.parse(stored);
    const index = allTxs.findIndex(tx => tx.hash?.toLowerCase() === hash?.toLowerCase());
    
    if (index === -1) return false;
    
    allTxs[index] = { ...allTxs[index], ...updates, updatedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allTxs));
    
    console.log('[TransactionHistory] Updated by hash:', allTxs[index]);
    return true;
  } catch (err) {
    console.error('[TransactionHistory] Error updating by hash:', err);
    return false;
  }
};

/**
 * Get ROI claim transaction history (for AccruedRewards page)
 * @param {string} walletAddress - The wallet address
 * @returns {Array} Array of claim transactions
 */
export const getClaimTransactions = (walletAddress) => {
  return getLocalTransactions(walletAddress, 'roi_claim');
};

/**
 * Add an ROI claim transaction
 * @param {Object} data - Claim data
 */
export const addClaimTransaction = (data) => {
  return addTransaction({
    type: 'roi_claim',
    ...data,
  });
};

/**
 * Clear all transactions for a wallet (for testing)
 * @param {string} walletAddress - The wallet address
 */
export const clearWalletTransactions = (walletAddress) => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    
    const allTxs = JSON.parse(stored);
    const filtered = allTxs.filter(tx => 
      tx.wallet?.toLowerCase() !== walletAddress?.toLowerCase()
    );
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    console.log('[TransactionHistory] Cleared for wallet:', walletAddress);
  } catch (err) {
    console.error('[TransactionHistory] Error clearing:', err);
  }
};

/**
 * Get all pending transactions for a wallet
 * @param {string} walletAddress - The wallet address
 * @returns {Array} Array of pending transaction objects
 */
export const getPendingTransactions = (walletAddress) => {
  const txs = getLocalTransactions(walletAddress);
  return txs.filter(tx => tx.status === 'pending');
};

/**
 * Check and update pending transactions by checking their status on-chain
 * @param {string} walletAddress - The wallet address
 * @param {Object} web3 - Web3 instance
 * @returns {Promise<Array>} Array of updated transactions
 */
export const checkAndUpdatePendingTransactions = async (walletAddress, web3) => {
  if (!web3) return [];
  
  const pendingTxs = getPendingTransactions(walletAddress);
  const updated = [];
  
  for (const tx of pendingTxs) {
    if (tx.hash) {
      try {
        const receipt = await web3.eth.getTransactionReceipt(tx.hash);
        if (receipt) {
          // Transaction is mined - check if it succeeded or failed
          const status = receipt.status ? 'success' : 'failed';
          updateTransaction(tx.id, { 
            status, 
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed?.toString()
          });
          updated.push({ ...tx, status });
          console.log(`[TransactionHistory] Updated pending tx ${tx.hash} to ${status}`);
        } else {
          // Transaction still pending or might have been dropped
          // Check if it's been more than 10 minutes - might be dropped
          const age = Date.now() - tx.timestamp;
          if (age > 10 * 60 * 1000) { // 10 minutes
            // Check if tx exists in mempool
            try {
              const txData = await web3.eth.getTransaction(tx.hash);
              if (!txData) {
                // Transaction was dropped
                updateTransaction(tx.id, { status: 'dropped', error: 'Transaction was dropped from mempool' });
                updated.push({ ...tx, status: 'dropped' });
                console.log(`[TransactionHistory] Marked tx ${tx.hash} as dropped`);
              }
            } catch (e) {
              // Ignore error - tx might still be pending
            }
          }
        }
      } catch (err) {
        console.error(`[TransactionHistory] Error checking tx ${tx.hash}:`, err);
      }
    } else {
      // No hash - transaction was never submitted, mark as failed
      const age = Date.now() - tx.timestamp;
      if (age > 2 * 60 * 1000) { // 2 minutes without hash = failed
        updateTransaction(tx.id, { status: 'failed', error: 'Transaction was never submitted' });
        updated.push({ ...tx, status: 'failed' });
        console.log(`[TransactionHistory] Marked tx ${tx.id} as failed (no hash)`);
      }
    }
  }
  
  return updated;
};

export default {
  getLocalTransactions,
  addTransaction,
  updateTransaction,
  updateTransactionByHash,
  getClaimTransactions,
  addClaimTransaction,
  clearWalletTransactions,
  getPendingTransactions,
  checkAndUpdatePendingTransactions,
};
