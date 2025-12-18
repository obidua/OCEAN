import React, { useEffect, useMemo, useState } from "react";
import {
  formatUSD,
  formatRAMA,
} from "../utils/contractData";
import {
  CheckCircle,
  Clock,
  DollarSign,
  TrendingUp,
  Calendar,
  Award,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  FileText,
  Hash,
  RefreshCw
} from "lucide-react";
import {
  getClaimHistory,
  getClaimableIncome,
  calculateDayId,
  microUsdToUsd,
  weiToRama,
  getRamaPrice,
  formatDayId,
  getRelativeDay
} from '../services/slabIncomeApi';

// Skeleton loader component
const SkeletonCard = ({ className = "" }) => (
  <div className={`animate-pulse ${className}`}>
    <div className="h-6 bg-cyan-500/10 rounded w-3/4 mb-3"></div>
    <div className="h-10 bg-cyan-500/20 rounded w-1/2 mb-2"></div>
    <div className="h-4 bg-cyan-500/10 rounded w-2/3"></div>
  </div>
);

const ClaimHistoryScreen = () => {
  const userAddress = typeof window !== 'undefined' ? localStorage.getItem("userAddress") : null;
  
  // Cache configuration
  const CACHE_KEY = `claim_history_cache_${userAddress}`;
  const CACHE_TIMESTAMP_KEY = `claim_history_timestamp_${userAddress}`;
  const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  // Helper to save data to sessionStorage
  const saveToCache = (data) => {
    if (!userAddress) return;
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
      sessionStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      console.log('[ClaimHistory] Data cached successfully');
    } catch (error) {
      console.warn('[ClaimHistory] Failed to cache data:', error);
    }
  };

  // Helper to load data from sessionStorage
  const loadFromCache = () => {
    if (!userAddress) return null;
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      const timestamp = sessionStorage.getItem(CACHE_TIMESTAMP_KEY);
      
      if (!cached || !timestamp) return null;
      
      const age = Date.now() - parseInt(timestamp);
      if (age > CACHE_DURATION) {
        console.log('[ClaimHistory] Cache expired, clearing...');
        sessionStorage.removeItem(CACHE_KEY);
        sessionStorage.removeItem(CACHE_TIMESTAMP_KEY);
        return null;
      }
      
      console.log('[ClaimHistory] Loading from cache (age: ' + Math.round(age / 1000) + 's)');
      return JSON.parse(cached);
    } catch (error) {
      console.warn('[ClaimHistory] Failed to load cache:', error);
      return null;
    }
  };
  
  // Data states
  const [claimHistory, setClaimHistory] = useState([]);
  const [claimableData, setClaimableData] = useState(null);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [copiedTx, setCopiedTx] = useState(null);
  const [refreshingCard, setRefreshingCard] = useState(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Load cached data on mount
  useEffect(() => {
    const cached = loadFromCache();
    if (cached) {
      console.log('[ClaimHistory] Restoring from cache...');
      setClaimHistory(cached.claimHistory || []);
      setClaimableData(cached.claimableData);
      setDataLoaded(true);
      console.log('[ClaimHistory] Cache restored successfully');
    }
  }, []);

  // Load claim history and claimable data
  useEffect(() => {
    let cancelled = false;

    const loadClaimData = async () => {
      if (!userAddress) {
        console.log('[ClaimHistory] No user address');
        return;
      }

      // Skip if data already loaded from cache
      if (dataLoaded) {
        console.log('[ClaimHistory] Data already loaded from cache, skipping reload');
        return;
      }

      console.log('[ClaimHistory] Starting data load for:', userAddress);
      setLoading(true);
      setError(null);

      try {
        const ramaPrice = getRamaPrice();
        const currentDay = calculateDayId();

        // Load claim history
        console.log('[ClaimHistory] 1/2 Loading claim history...');
        const historyResult = await getClaimHistory(userAddress);
        if (!cancelled && historyResult.success) {
          console.log('[ClaimHistory] ✓ History data:', historyResult.data);
          // Sort by most recent first
          const sortedHistory = (historyResult.data.claims || []).sort((a, b) => {
            return new Date(b.claimed_at) - new Date(a.claimed_at);
          });
          setClaimHistory(sortedHistory);
        } else if (!cancelled) {
          console.warn('[ClaimHistory] ✗ History fetch failed (this is normal if no claims exist yet):', historyResult.error);
          // Don't treat this as an error - just means table not created yet or no claims
          setClaimHistory([]);
        }

        // Load current claimable amount
        // Note: This endpoint may timeout for users with long history, so we handle gracefully
        console.log('[ClaimHistory] 2/2 Loading claimable amount...');
        const claimableResult = await getClaimableIncome(userAddress, currentDay, ramaPrice);
        if (!cancelled && claimableResult.success) {
          console.log('[ClaimHistory] ✓ Claimable data:', claimableResult.data);
          setClaimableData(claimableResult.data);
        } else if (!cancelled) {
          console.warn('[ClaimHistory] ⚠ Claimable fetch failed:', claimableResult.error);
          // Set empty claimable data instead of failing
          setClaimableData({
            total_claimable_usd: 0,
            total_claimable_rama_wei: '0',
            is_estimated: true
          });
        }

        if (!cancelled) {
          setLoading(false);
          setDataLoaded(true);
          console.log('[ClaimHistory] Data loading complete');
          
          // Cache the loaded data
          saveToCache({
            claimHistory: historyResult.success ? (historyResult.data.claims || []).sort((a, b) => {
              return new Date(b.claimed_at) - new Date(a.claimed_at);
            }) : [],
            claimableData: claimableResult.success ? claimableResult.data : null
          });
        }
      } catch (err) {
        console.error('[ClaimHistory] Failed to load claim data:', err);
        if (!cancelled) {
          setError(err.message || 'Failed to load claim history');
          setLoading(false);
        }
      }
    };

    loadClaimData();
    return () => { cancelled = true; };
  }, [userAddress, dataLoaded]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!claimHistory.length) {
      return {
        totalClaims: 0,
        totalClaimedUsd: 0,
        totalClaimedRama: 0,
        lastClaimDate: null
      };
    }

    const totalClaimedUsd = claimHistory.reduce((sum, claim) => 
      sum + microUsdToUsd(claim.usd_amount || 0), 0
    );
    const totalClaimedRama = claimHistory.reduce((sum, claim) => 
      sum + weiToRama(claim.rama_amount || '0'), 0
    );
    const lastClaim = claimHistory[0]; // Already sorted by most recent

    return {
      totalClaims: claimHistory.length,
      totalClaimedUsd,
      totalClaimedRama,
      lastClaimDate: lastClaim ? new Date(lastClaim.claimed_at) : null
    };
  }, [claimHistory]);

  // Claimable stats
  const claimableStats = useMemo(() => {
    if (!claimableData) return null;

    return {
      totalUsd: microUsdToUsd(claimableData.total_income_usd || 0),
      totalRama: weiToRama(claimableData.total_income_rama_wei || '0'),
      slabUsd: microUsdToUsd(claimableData.slab_income_usd || 0),
      overrideUsd: microUsdToUsd(claimableData.override_income_usd || 0),
      daysCount: claimableData.days_count || 0
    };
  }, [claimableData]);

  // Pagination logic
  const paginatedHistory = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return claimHistory.slice(startIndex, startIndex + itemsPerPage);
  }, [claimHistory, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(claimHistory.length / itemsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  // Copy transaction hash
  const copyToClipboard = (text, txHash) => {
    navigator.clipboard.writeText(text);
    setCopiedTx(txHash);
    setTimeout(() => setCopiedTx(null), 2000);
  };

  // Format transaction hash
  const formatTxHash = (hash) => {
    if (!hash) return 'N/A';
    return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
  };

  // Get block explorer URL (Base Sepolia)
  const getExplorerUrl = (txHash) => {
    return `https://sepolia.basescan.org/tx/${txHash}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="text-cyan-400" size={28} />
          <div>
            <h2 className="text-2xl font-bold text-cyan-300">Claim History</h2>
            <p className="text-sm text-cyan-300/70">
              Track all your slab income claims and pending amounts
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Claims */}
        <div className="cyber-glass rounded-xl p-5 border-2 border-cyan-500 hover:border-cyan-500/50 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-cyan-400" />
              <span className="text-sm font-semibold text-cyan-300 uppercase tracking-wide">
                Total Claims
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  setRefreshingCard('claims');
                  const historyResult = await getClaimHistory(userAddress);
                  if (historyResult.success) {
                    const sortedHistory = (historyResult.data.claims || []).sort((a, b) => 
                      new Date(b.claimed_at) - new Date(a.claimed_at)
                    );
                    setClaimHistory(sortedHistory);
                  } else {
                    setClaimHistory([]);
                  }
                  setRefreshingCard(null);
                }}
                className="p-1 hover:bg-cyan-500/20 rounded transition-colors"
                title="Refresh"
                disabled={refreshingCard === 'claims'}
              >
                <RefreshCw size={14} className={`text-cyan-400 ${refreshingCard === 'claims' ? 'animate-spin' : ''}`} />
              </button>
              <CheckCircle size={16} className="text-cyan-400" />
            </div>
          </div>
          <div className="mb-3">
            {loading ? (
              <SkeletonCard />
            ) : (
              <>
                <div className="text-3xl font-bold text-cyan-400 mb-1">
                  {stats.totalClaims}
                </div>
                <div className="text-xs text-cyan-300/60 mt-2">
                  {stats.lastClaimDate ? `Last: ${formatDayId(Math.floor(stats.lastClaimDate.getTime() / 1000 / 86400), 'short')}` : 'No claims yet'}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Total Claimed USD */}
        <div className="cyber-glass rounded-xl p-5 border-2 border-neon-green hover:border-neon-green/50 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <DollarSign size={18} className="text-neon-green" />
              <span className="text-sm font-semibold text-cyan-300 uppercase tracking-wide">
                Total Claimed
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  setRefreshingCard('claimed');
                  const historyResult = await getClaimHistory(userAddress);
                  if (historyResult.success) {
                    const sortedHistory = (historyResult.data.claims || []).sort((a, b) => 
                      new Date(b.claimed_at) - new Date(a.claimed_at)
                    );
                    setClaimHistory(sortedHistory);
                  } else {
                    setClaimHistory([]);
                  }
                  setRefreshingCard(null);
                }}
                className="p-1 hover:bg-neon-green/20 rounded transition-colors"
                title="Refresh"
                disabled={refreshingCard === 'claimed'}
              >
                <RefreshCw size={14} className={`text-neon-green ${refreshingCard === 'claimed' ? 'animate-spin' : ''}`} />
              </button>
              <TrendingUp size={16} className="text-cyan-400" />
            </div>
          </div>
          <div className="mb-3">
            {loading ? (
              <SkeletonCard />
            ) : (
              <>
                <div className="text-3xl font-bold text-neon-green mb-1">
                  {formatUSD(stats.totalClaimedUsd)}
                </div>
                <div className="text-sm text-cyan-300/70">
                  {formatRAMA(stats.totalClaimedRama)} RAMA
                </div>
              </>
            )}
          </div>
        </div>

        {/* Pending Claims */}
        <div className="cyber-glass rounded-xl p-5 border-2 border-yellow-500 hover:border-yellow-500/50 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-yellow-400" />
              <span className="text-sm font-semibold text-cyan-300 uppercase tracking-wide">
                Pending Claims
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  setRefreshingCard('pending');
                  const ramaPrice = getRamaPrice();
                  const currentDay = calculateDayId();
                  const claimableResult = await getClaimableIncome(userAddress, currentDay, ramaPrice);
                  if (claimableResult.success) setClaimableData(claimableResult.data);
                  setRefreshingCard(null);
                }}
                className="p-1 hover:bg-yellow-500/20 rounded transition-colors"
                title="Refresh"
                disabled={refreshingCard === 'pending'}
              >
                <RefreshCw size={14} className={`text-yellow-400 ${refreshingCard === 'pending' ? 'animate-spin' : ''}`} />
              </button>
              <Award size={16} className="text-cyan-400" />
            </div>
          </div>
          <div className="mb-3">
            {loading ? (
              <SkeletonCard />
            ) : (
              <>
                <div className="text-3xl font-bold text-yellow-400 mb-1">
                  {formatUSD(claimableStats?.totalUsd || 0)}
                </div>
                <div className="text-sm text-cyan-300/70">
                  {formatRAMA(claimableStats?.totalRama || 0)} RAMA
                </div>
                <div className="text-xs text-cyan-300/60 mt-2">
                  {claimableStats?.daysCount || 0} days pending
                </div>
              </>
            )}
          </div>
        </div>

        {/* Pending Breakdown */}
        <div className="cyber-glass rounded-xl p-5 border-2 border-purple-500 hover:border-purple-500/50 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Award size={18} className="text-purple-400" />
              <span className="text-sm font-semibold text-cyan-300 uppercase tracking-wide">
                Breakdown
              </span>
            </div>
            <button
              onClick={async () => {
                setRefreshingCard('breakdown');
                const ramaPrice = getRamaPrice();
                const currentDay = calculateDayId();
                const claimableResult = await getClaimableIncome(userAddress, currentDay, ramaPrice);
                if (claimableResult.success) setClaimableData(claimableResult.data);
                setRefreshingCard(null);
              }}
              className="p-1 hover:bg-purple-500/20 rounded transition-colors"
              title="Refresh"
              disabled={refreshingCard === 'breakdown'}
            >
              <RefreshCw size={14} className={`text-purple-400 ${refreshingCard === 'breakdown' ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="space-y-2">
            {loading ? (
              <SkeletonCard />
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-cyan-300/70">Slab:</span>
                  <span className="text-sm font-semibold text-neon-purple">
                    {formatUSD(claimableStats?.slabUsd || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-cyan-300/70">Override:</span>
                  <span className="text-sm font-semibold text-neon-green">
                    {formatUSD(claimableStats?.overrideUsd || 0)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Claim History Table */}
      <div className="cyber-glass rounded-xl p-6 border-2 border-cyan-500">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-cyan-400" />
            <h3 className="text-lg font-semibold text-cyan-300">
              Claim Transactions
            </h3>
          </div>
          {claimHistory.length > 0 && (
            <span className="text-sm text-cyan-300/70">
              {claimHistory.length} total claim{claimHistory.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {claimHistory.length === 0 && !loading ? (
          <div className="text-center py-12">
            <CheckCircle size={48} className="text-cyan-400/30 mx-auto mb-3" />
            <p className="text-cyan-300/70">No claim history yet</p>
            <p className="text-sm text-cyan-300/50 mt-1">
              Your claims will appear here once you start claiming slab income
            </p>
          </div>
        ) : (
          <>
            {/* Claims Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-cyan-500/30">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-cyan-300">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-cyan-300">Transaction</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-cyan-300">Days Claimed</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-cyan-300">Amount (USD)</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-cyan-300">Amount (RAMA)</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-cyan-300">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedHistory.map((claim, idx) => {
                    const claimDate = new Date(claim.claimed_at);
                    const amountUsd = microUsdToUsd(claim.usd_amount || 0);
                    const amountRama = weiToRama(claim.rama_amount || '0');
                    const txHash = claim.tx_hash || claim.transaction_hash;

                    return (
                      <tr
                        key={idx}
                        className="border-b border-cyan-500/10 hover:bg-cyan-500/5 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="text-sm text-cyan-300">
                            {claimDate.toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}
                          </div>
                          <div className="text-xs text-cyan-300/60">
                            {claimDate.toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {txHash ? (
                            <div className="flex items-center gap-2">
                              <code className="text-xs text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded">
                                {formatTxHash(txHash)}
                              </code>
                              <button
                                onClick={() => copyToClipboard(txHash, txHash)}
                                className="p-1 hover:bg-cyan-500/20 rounded transition-colors"
                                title="Copy full hash"
                              >
                                {copiedTx === txHash ? (
                                  <Check size={14} className="text-neon-green" />
                                ) : (
                                  <Copy size={14} className="text-cyan-400" />
                                )}
                              </button>
                              <a
                                href={getExplorerUrl(txHash)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 hover:bg-cyan-500/20 rounded transition-colors"
                                title="View on BaseScan"
                              >
                                <ExternalLink size={14} className="text-cyan-400" />
                              </a>
                            </div>
                          ) : (
                            <span className="text-xs text-cyan-300/50">Pending...</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Calendar size={14} className="text-cyan-400" />
                            <span className="text-sm text-cyan-300">
                              {claim.from_day && claim.to_day 
                                ? `${claim.to_day - claim.from_day + 1}`
                                : 'N/A'}
                            </span>
                          </div>
                          {claim.from_day && claim.to_day && (
                            <div className="text-xs text-cyan-300/60">
                              Days {claim.from_day}-{claim.to_day}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="text-sm font-semibold text-neon-green">
                            {formatUSD(amountUsd)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="text-sm text-cyan-300">
                            {formatRAMA(amountRama)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-neon-green/20 text-neon-green text-xs font-semibold">
                            <CheckCircle size={12} />
                            Claimed
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-cyan-500/30">
                <div className="text-sm text-cyan-300/70">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} -{' '}
                  {Math.min(currentPage * itemsPerPage, claimHistory.length)} of{' '}
                  {claimHistory.length} claims
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={!hasPrevPage}
                    className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="flex gap-1">
                    {getPageNumbers().map((page, idx) =>
                      page === '...' ? (
                        <span key={`ellipsis-${idx}`} className="px-3 py-1 text-cyan-300/50">
                          ...
                        </span>
                      ) : (
                        <button
                          key={page}
                          onClick={() => goToPage(page)}
                          className={`px-3 py-1 rounded-lg transition-all ${
                            currentPage === page
                              ? 'bg-cyan-400 text-dark-900 font-semibold'
                              : 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30'
                          }`}
                        >
                          {page}
                        </button>
                      )
                    )}
                  </div>
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={!hasNextPage}
                    className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Information Card */}
      <div className="cyber-glass rounded-xl p-5 border border-cyan-500/30">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-cyan-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-cyan-300 mb-2">
              About Slab Income Claims
            </p>
            <ul className="text-xs text-cyan-300/90 space-y-1.5">
              <li>
                • <strong>On-Chain Claims:</strong> All claims are processed on the Base Sepolia blockchain and are immutable
              </li>
              <li>
                • <strong>Pending Income:</strong> Unclaimed slab income accumulates daily and can be claimed at any time
              </li>
              <li>
                • <strong>Transaction Hash:</strong> Each claim has a unique transaction hash that can be verified on BaseScan
              </li>
              <li>
                • <strong>Day Range:</strong> Claims show the range of days included in each transaction
              </li>
              <li>
                • <strong>RAMA Tokens:</strong> Claimed amounts are distributed in RAMA tokens based on current price
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClaimHistoryScreen;
