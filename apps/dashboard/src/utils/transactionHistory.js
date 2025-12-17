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

export default {
  getLocalTransactions,
  addTransaction,
  updateTransaction,
  updateTransactionByHash,
  getClaimTransactions,
  addClaimTransaction,
  clearWalletTransactions,
};
