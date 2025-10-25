import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TrendingUp,
  Coins,
  Clock,
  RefreshCw,
  Download,
  Filter,
  ChevronDown,
  Loader2,
  AlertCircle,
  Rocket,
  History,
  Timer,
  X
} from 'lucide-react';
import { useWaitForTransactionReceipt } from 'wagmi';
import { useTransaction } from '../../config/register';
import { useStore } from '../../store/useUserInfoStore';
import NumberPopup from '../components/NumberPopup';
import Tooltip from '../components/Tooltip';
import { formatUSD } from '../utils/contractData';
import { useAppKitAccount } from '@reown/appkit/react';
import ProgressiveTransactionModal from '../components/ProgressiveTransactionModal';

const formatRAMAPrecise = (value) => {
  const num = Number(value) || 0;
  if (num === 0) return '0.00';
  if (num < 0.0001 && num > 0) {
    return num.toPrecision(4);
  }
  return new Intl.NumberFormat('en-US', { 
    maximumFractionDigits: 6,
    minimumFractionDigits: 2,
  }).format(num);
};

const ClaimHistoryModal = ({ isOpen, onClose, history, loading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="cyber-glass rounded-xl border border-cyan-500/30 p-6 w-full max-w-3xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-cyan-300">Claim History</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-cyan-500/10">
            <X size={20} className="text-cyan-300" />
          </button>
        </div>
        <div className="overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="animate-spin text-cyan-400" size={32} />
            </div>
          ) : history.length === 0 ? (
            <p className="text-center text-cyan-300/70 p-8">No claim history found.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-cyan-500/20">
                  <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-cyan-300/70">Claimed At</th>
                  <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-cyan-300/70">Period Range</th>
                  <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-cyan-300/70">USD Amount</th>
                  <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-cyan-300/70">RAMA Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-500/20">
                {history.map(item => (
                  <tr key={item.id}>
                    <td className="py-3 px-4 text-cyan-200 whitespace-nowrap">{new Date(item.claimedAt * 1000).toLocaleString()}</td>
                    <td className="py-3 px-4 text-cyan-200">{item.dayId}</td>
                    <td className="py-3 px-4 text-right text-cyan-100">{formatUSD(item.usdAmount)}</td>
                    <td className="py-3 px-4 text-right text-cyan-100">{formatRAMAPrecise(item.ramaAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default function AccruedRewards() {
  const [dashboard, setDashboard] = useState(null);
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('rewards');
  const [sortDir, setSortDir] = useState('desc');
  const [filterActive, setFilterActive] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [claimHistory, setClaimHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPortfolios, setTotalPortfolios] = useState(0);

  const { address, isConnected } = useAppKitAccount();

  const getAccruedRewardsPaged = useStore((s) => s.getAccruedRewardsPaged);
  const getClaimHistoryPaged = useStore((s) => s.getClaimHistoryPaged);
  const claimAccruedROI = useStore((s) => s.claimAccruedROI);
  const userAddress = useStore((s) => s.userAddress);
  const getROITotals = useStore((s) => s.getROITotals);

  const { handleSendTx, hash } = useTransaction();
  const { data: receipt, isSuccess, isError } = useWaitForTransactionReceipt({
    hash,
    confirmations: 1,
  });

  const loadData = useCallback(async () => {
    if (!userAddress) {
      setDashboard(null);
      setPortfolios([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const offset = (currentPage - 1) * pageSize;
      
      // Fetch totals and paged portfolios in parallel
      const [totals, pagedData] = await Promise.all([
        getROITotals(userAddress),
        getAccruedRewardsPaged(userAddress, offset, pageSize)
      ]);

      const { portfolios: fetchedPortfolios, totalCount } = pagedData;

      if (!fetchedPortfolios) {
        throw new Error('Unable to fetch portfolio data.');
      }

      setPortfolios(fetchedPortfolios);
      setTotalPortfolios(totalCount);

      // Use the accurate totals from getROITotals
      const dashboardData = {
        totals: {
          claimed: {
            usd: totals.claimedUsd || 0,
            rama: totals.claimedRama || 0,
          },
          unclaimed: {
            usd: totals.unclaimedUsd || 0,
            rama: totals.unclaimedRama || 0,
          },
          periods: {
            count: totalCount,
            from: 0,
            last: 0,
          }
        }
      };

      // We can still iterate to get the from/last dates if needed
      fetchedPortfolios.forEach(p => {
        if (!p || !p.roi) return;
        if (p.roi.meta.createdAt > dashboardData.totals.periods.from) {
          dashboardData.totals.periods.from = p.roi.meta.createdAt;
        }
        if (p.roi.meta.lastUpdate > dashboardData.totals.periods.last) {
          dashboardData.totals.periods.last = p.roi.meta.lastUpdate;
        }
      });

      setDashboard(dashboardData);

    } catch (err) {
      console.error('Failed to load  data:', err);
      const errorMessage = err?.message || 'Failed to load  data';
      setError(
        errorMessage.includes('network') || errorMessage.includes('connect') ?
        'Please check your wallet connection and network' :
        errorMessage
      );
    } finally {
      setLoading(false);
    }
  }, [userAddress, getAccruedRewardsPaged, getROITotals, currentPage, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    if (loading) return;
    loadData();
  };

  const handleClaim = useCallback(async () => {
    try {
      setIsClaiming(true);
      setShowClaimModal(true);
      
      if (!dashboard || dashboard.totals.unclaimed.usd <= 0) {
        throw new Error('No rewards available to claim.');
      }
      if(!isConnected) {
        throw new Error('Wallet not connected.');
        return;
      }

      const tx = await claimAccruedROI(address);
      if (!tx) {
        throw new Error('Unable to build claim transaction');
      }

      handleSendTx(tx);
    } catch (err) {
      console.error('Failed to claim rewards:', err);
      setError(err?.message || 'Failed to claim rewards');
      setIsClaiming(false);
      setShowClaimModal(false);
    } 
  }, [claimAccruedROI, handleSendTx, dashboard, isConnected, address]);

  const handleClaimModalClose = () => {
    setShowClaimModal(false);
    setIsClaiming(false);
  };

  const handleClaimSuccess = async () => {
    await loadData();
  };

  const handleViewHistory = async () => {
    setShowHistoryModal(true);
    setHistoryLoading(true);
    try {
      const { history } = await getClaimHistoryPaged(userAddress, 0, 100);
      setClaimHistory(history || []);
    } catch (err) {
      setError("Failed to load claim history.");
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (!isClaiming) return;

    if (isSuccess && receipt) {
      setIsClaiming(false);
    } else if (isError) {
      setError('Transaction failed or was reverted');
      setIsClaiming(false);
      setShowClaimModal(false);
    }
  }, [isSuccess, isError, receipt, isClaiming]);

  const filteredPortfolios = useMemo(() => {
    let result = [...portfolios];
    if (filterActive) {
      result = result.filter(p => p.roi?.accrued > 0);
    }
    result.sort((a, b) => {
      const aValue = sortBy === 'rewards' ? a.roi?.accrued : a.portfolioId;
      const bValue = sortBy === 'rewards' ? b.roi?.accrued : b.portfolioId;
      return sortDir === 'desc' ? (bValue ?? 0) - (aValue ?? 0) : (aValue ?? 0) - (bValue ?? 0);
    });
    return result;
  }, [portfolios, filterActive, sortBy, sortDir]);

  const canClaimGlobal = !loading && dashboard?.totals?.unclaimed?.usd > 0;

  return (
    <>
      <ClaimHistoryModal 
        isOpen={showHistoryModal} 
        onClose={() => setShowHistoryModal(false)} 
        history={claimHistory} 
        loading={historyLoading} 
      />
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green">
              Accrued Rewards
            </h1>
            <p className="text-cyan-300/80 mt-1">
              Track and claim your portfolio rewards across all investments.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-3 py-2 text-xs font-semibold rounded-lg border border-cyan-500/40 text-cyan-200 transition-colors hover:bg-cyan-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex items-center gap-2">
                <RefreshCw className={loading ? 'animate-spin' : ''} size={16} />
                <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
              </span>
            </button>
            <button
              onClick={handleViewHistory}
              disabled={loading || historyLoading}
              className="px-3 py-2 text-xs font-semibold rounded-lg border border-cyan-500/40 text-cyan-200 transition-colors hover:bg-cyan-500/10 disabled:opacity-50"
            >
              <span className="flex items-center gap-2">
                <History size={16} />
                <span>View History</span>
              </span>
            </button>
            <button
              onClick={handleClaim}
              disabled={!canClaimGlobal || isClaiming}
              className="px-4 py-2 text-sm font-bold rounded-lg bg-gradient-to-r from-emerald-500 to-green-500 text-white transition-all shadow-lg hover:shadow-green-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {isClaiming ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="animate-spin" size={16} />
                  <span>Claiming...</span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Coins size={16} />
                  <span>Claim All Reward</span>
                </span>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-4 flex items-start gap-3">
            <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="cyber-glass rounded-xl border border-cyan-500/30 p-4 space-y-2">
            <div className="flex items-center gap-2 text-cyan-300/70">
              <Coins size={18} />
              <span className="text-xs uppercase tracking-wide">Total Claimed Reward</span>
            </div>
            <NumberPopup
              value={dashboard?.totals?.claimed?.usd || 0}
              formatter={formatUSD}
              className="text-2xl font-bold text-cyan-100"
            />
            <p className="text-xs text-cyan-300/60">
              {formatRAMAPrecise(dashboard?.totals?.claimed?.rama || 0)} RAMA
            </p>
          </div>

          <div className="cyber-glass rounded-xl border border-emerald-500/30 p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-300/70">
              <TrendingUp size={18} />
              <span className="text-xs uppercase tracking-wide">Unclaimed Reward</span>
            </div>
            <NumberPopup
              value={dashboard?.totals?.unclaimed?.usd || 0}
              formatter={formatUSD}
              className="text-2xl font-bold text-emerald-400"
            />
            <p className="text-xs text-emerald-300/60">
              {formatRAMAPrecise(dashboard?.totals?.unclaimed?.rama || 0)} RAMA
            </p>
          </div>

          <div className="cyber-glass rounded-xl border border-purple-500/30 p-4 space-y-2">
            <div className="flex items-center gap-2 text-purple-300/70">
              <Rocket size={18} />
              <span className="text-xs uppercase tracking-wide">Active Boosters</span>
            </div>
            <div className="text-2xl font-bold text-purple-400">
              {portfolios.filter(p => p.roi?.meta?.boosterActive).length}
            </div>
            <p className="text-xs text-purple-300/60">
              of {totalPortfolios} portfolios
            </p>
          </div>

          <div className="cyber-glass rounded-xl border border-cyan-500/30 p-4 space-y-2">
            <div className="flex items-center gap-2 text-cyan-300/70">
              <TrendingUp size={18} />
              <span className="text-xs uppercase tracking-wide">Portfolios with Reward</span>
            </div>
            <p className="text-2xl font-bold text-cyan-100">
              {portfolios.filter(p => p.roi?.accrued > 0).length}
            </p>
            <p className="text-xs text-cyan-300/60">
              {totalPortfolios} total portfolios
            </p>
          </div>
        </div>

       <div className="cyber-glass rounded-xl border border-cyan-500/30 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-semibold text-cyan-100">
              All Portfolios
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setFilterActive(!filterActive)}
                className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                  filterActive
                    ? "border-emerald-500/50 text-emerald-300 bg-emerald-500/10"
                    : "border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Filter size={16} />
                  <span>Show Pending Only</span>
                </span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-cyan-500/20">
                  <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-cyan-300/70">
                    Portfolio Details
                  </th>
                  <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-cyan-300/70">
                    Accrued Rewards
                  </th>
                  <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-cyan-300/70">
                    Principal Amount
                  </th>
                  <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-cyan-300/70">
                    Current Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-500/20">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center">
                      <Loader2
                        size={24}
                        className="animate-spin mx-auto text-cyan-400"
                      />
                    </td>
                  </tr>
                ) : filteredPortfolios.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-8 text-center text-cyan-300/70"
                    >
                      No portfolios with pending rewards found.
                    </td>
                  </tr>
                ) : (
                  filteredPortfolios.map((portfolio) => (
                    <tr
                      key={portfolio.portfolioId}
                      className="hover:bg-cyan-500/5 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-cyan-200">
                              #
                              {portfolio.portfolioId
                                .toString()
                                .padStart(4, "0")}
                            </span>
                            {portfolio.roi?.meta?.tier > 0 && (
                              <span className="px-1.5 py-0.5 text-xs bg-cyan-500/10 text-cyan-300 rounded">
                                Tier {portfolio.roi.meta.tier}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-cyan-300/60 mt-1">
                            Created:{" "}
                            {new Date(
                              portfolio.roi.meta.createdAt * 1000
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 flex-col">
                        <div className="flex flex-col text-right gap-1">
                          ${portfolio.roi?.accrued || 0}
                        </div>
                        <div className="text-xs text-right text-cyan-300/60">
                          {formatRAMAPrecise(portfolio.roi?.ramaAmount || 0)}{" "}
                          RAMA
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        ${portfolio.roi?.principalUsd || 0}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex flex-wrap justify-end gap-1">
                            {portfolio.roi?.meta?.isClosed ? (
                              <div className="text-xs px-2 py-0.5 bg-red-500/20 text-red-300 rounded-full">
                                Closed
                              </div>
                            ) : portfolio.roi?.meta?.isCapped ? (
                              <div className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-300 rounded-full">
                                Capped
                              </div>
                            ) : (
                              <div className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full">
                                Active
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-cyan-300/60">
                            {portfolio.roi?.meta?.boosterActive && (
                              <div className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full flex items-center gap-1">
                                <Rocket size={12} />
                                <span>Boosted</span>
                              </div>
                            )}
                          </div>
                          {portfolio.roi?.meta?.frozenUntil >
                          Date.now() / 1000 ? (
                            <Tooltip
                              content={`Frozen until: ${new Date(
                                portfolio.roi.meta.frozenUntil * 1000
                              ).toLocaleString()}`}
                            >
                              <div className="text-xs text-cyan-300/60 flex items-center gap-1">
                                <Timer size={12} />
                                <span>Frozen</span>
                              </div>
                            </Tooltip>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Progressive Transaction Modal */}
      <ProgressiveTransactionModal
        isOpen={showClaimModal}
        onClose={handleClaimModalClose}
        txHash={hash}
        title="Claim Accrued"
        description="Claiming your portfolio growth rewards"
        successMessage="Your rewards have been claimed successfully!"
        onSuccess={handleClaimSuccess}
        amount={dashboard?.totals?.unclaimed?.usd ? formatUSD(dashboard.totals.unclaimed.usd) : null}
        amountLabel="Claiming Amount"
      />
    </>
  );
}