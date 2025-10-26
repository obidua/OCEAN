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
import toast from '../utils/toast';
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
      <div className="cyber-glass rounded-xl border border-cyan-500/30 p-6 w-full max-w-4xl max-h-[80vh] overflow-auto space-y-4">
        <div className="flex items-center justify-between sticky top-0 bg-dark-900/95 backdrop-blur-sm pb-4 border-b border-cyan-500/20">
          <h2 className="text-xl font-bold text-cyan-300">Claim History</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-cyan-500/10">
            <X size={20} className="text-cyan-300" />
          </button>
        </div>
        <div>
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
                  <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-cyan-300/70">Epoch</th>
                  <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-cyan-300/70">Period Range</th>
                  <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-cyan-300/70">Claimed At</th>
                  <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-cyan-300/70">USD Amount</th>
                  <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-cyan-300/70">RAMA Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-500/20">
                {history.map(item => (
                  <tr key={item.id} className="hover:bg-cyan-500/5">
                    <td className="py-3 px-4 text-cyan-200 font-mono">#{item.epoch || '—'}</td>
                    <td className="py-3 px-4 text-cyan-200 font-mono">{item.dayId}</td>
                    <td className="py-3 px-4 text-cyan-200 whitespace-nowrap">{new Date(item.claimedAt * 1000).toLocaleString()}</td>
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

const PortfolioDebugModal = ({ isOpen, onClose, debugInfo, loading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="cyber-glass rounded-xl border border-cyan-500/30 p-6 w-full max-w-4xl max-h-[80vh] overflow-auto space-y-4">
        <div className="flex items-center justify-between sticky top-0 bg-dark-900/95 backdrop-blur-sm pb-4 border-b border-cyan-500/20">
          <h2 className="text-xl font-bold text-cyan-300">Portfolio Debug Info</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-cyan-500/10">
            <X size={20} className="text-cyan-300" />
          </button>
        </div>
        <div>
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="animate-spin text-cyan-400" size={32} />
            </div>
          ) : !debugInfo ? (
            <p className="text-center text-cyan-300/70 p-8">No debug info available.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="cyber-glass rounded-lg border border-cyan-500/20 p-4">
                <h3 className="text-sm font-semibold text-cyan-300 mb-3">Portfolio Info</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-cyan-300/70">PID:</span><span className="text-cyan-100 font-mono">#{debugInfo.pid}</span></div>
                  <div className="flex justify-between"><span className="text-cyan-300/70">Period ID:</span><span className="text-cyan-100">{debugInfo.periodId}</span></div>
                  <div className="flex justify-between"><span className="text-cyan-300/70">Owner:</span><span className="text-cyan-100 font-mono text-xs">{debugInfo.owner?.slice(0,6)}...{debugInfo.owner?.slice(-4)}</span></div>
                  <div className="flex justify-between"><span className="text-cyan-300/70">Created:</span><span className="text-cyan-100">{new Date(debugInfo.createdAt * 1000).toLocaleString()}</span></div>
                </div>
              </div>
              <div className="cyber-glass rounded-lg border border-cyan-500/20 p-4">
                <h3 className="text-sm font-semibold text-cyan-300 mb-3">Status</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-cyan-300/70">Closed:</span><span className={debugInfo.isClosed ? 'text-red-300' : 'text-emerald-300'}>{debugInfo.isClosed ? 'Yes' : 'No'}</span></div>
                  <div className="flex justify-between"><span className="text-cyan-300/70">Capped:</span><span className={debugInfo.isCapped ? 'text-yellow-300' : 'text-cyan-100'}>{debugInfo.isCapped ? 'Yes' : 'No'}</span></div>
                  <div className="flex justify-between"><span className="text-cyan-300/70">Frozen:</span><span className={debugInfo.isFrozen ? 'text-blue-300' : 'text-cyan-100'}>{debugInfo.isFrozen ? 'Yes' : 'No'}</span></div>
                  <div className="flex justify-between"><span className="text-cyan-300/70">Booster:</span><span className={debugInfo.booster ? 'text-purple-300' : 'text-cyan-100'}>{debugInfo.booster ? 'Yes' : 'No'}</span></div>
                </div>
              </div>
              <div className="cyber-glass rounded-lg border border-cyan-500/20 p-4">
                <h3 className="text-sm font-semibold text-cyan-300 mb-3">Principal & Cap</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-cyan-300/70">Principal:</span><span className="text-cyan-100">{formatUSD(debugInfo.principalUsd)}</span></div>
                  <div className="flex justify-between"><span className="text-cyan-300/70">Cap USD:</span><span className="text-cyan-100">{formatUSD(debugInfo.capUsd)}</span></div>
                  <div className="flex justify-between"><span className="text-cyan-300/70">Cap %:</span><span className="text-cyan-100">{debugInfo.capPct}%</span></div>
                  <div className="flex justify-between"><span className="text-cyan-300/70">Tier:</span><span className="text-cyan-100">T{debugInfo.tier}</span></div>
                </div>
              </div>
              <div className="cyber-glass rounded-lg border border-cyan-500/20 p-4">
                <h3 className="text-sm font-semibold text-cyan-300 mb-3">Earnings Tracking</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-cyan-300/70">Paid So Far:</span><span className="text-emerald-300">{formatUSD(debugInfo.paidUsdSoFar)}</span></div>
                  <div className="flex justify-between"><span className="text-cyan-300/70">Remaining Cap:</span><span className="text-cyan-100">{formatUSD(debugInfo.remainingCapUsd)}</span></div>
                  <div className="flex justify-between"><span className="text-cyan-300/70">Rate (WAD):</span><span className="text-cyan-100 font-mono text-xs">{debugInfo.rateWad?.toString().slice(0,8)}...</span></div>
                </div>
              </div>
              <div className="cyber-glass rounded-lg border border-cyan-500/20 p-4 md:col-span-2">
                <h3 className="text-sm font-semibold text-cyan-300 mb-3">Period Window</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between"><span className="text-cyan-300/70">Period Start:</span><span className="text-cyan-100">{new Date(debugInfo.periodStartTs * 1000).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-cyan-300/70">Period End:</span><span className="text-cyan-100">{new Date(debugInfo.periodEndTs * 1000).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-cyan-300/70">Exists by End:</span><span className={debugInfo.existsByEndOfEpoch ? 'text-emerald-300' : 'text-red-300'}>{debugInfo.existsByEndOfEpoch ? 'Yes' : 'No'}</span></div>
                  <div className="flex justify-between"><span className="text-cyan-300/70">After Cutoff:</span><span className={debugInfo.afterCutoff ? 'text-yellow-300' : 'text-cyan-100'}>{debugInfo.afterCutoff ? 'Yes' : 'No'}</span></div>
                </div>
              </div>
            </div>
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
  const [filterMode, setFilterMode] = useState('all');
  const [isClaiming, setIsClaiming] = useState(false);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [claimHistory, setClaimHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [expandedPortfolio, setExpandedPortfolio] = useState(null);
  const [portfolioDebugInfo, setPortfolioDebugInfo] = useState(null);
  const [debugLoading, setDebugLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPortfolios, setTotalPortfolios] = useState(0);

  const { address, isConnected } = useAppKitAccount();

  const getAccruedRewardsPaged = useStore((s) => s.getAccruedRewardsPaged);
  const getClaimHistoryPaged = useStore((s) => s.getClaimHistoryPaged);
  const claimAccruedROI = useStore((s) => s.claimAccruedROI);
  const userAddress = useStore((s) => s.userAddress);
  const getROITotals = useStore((s) => s.getROITotals);
  const getROITiming = useStore((s) => s.getROITiming);
  const getUnclaimedROIWindow = useStore((s) => s.getUnclaimedROIWindow);
  const getPaidUsdByPidMap = useStore((s) => s.getPaidUsdByPidMap);
  const getDailyRates = useStore((s) => s.getDailyRates);
  const getPortfolioIds = useStore((s) => s.getPortfolioIds);
  const getPortFoliById = useStore((s) => s.getPortFoliById);
  const getRoiPreviewPerPortfolio = useStore((s) => s.getRoiPreviewPerPortfolio);
  const getTotalsClaimedFromDistributor = useStore((s) => s.getTotalsClaimedFromDistributor);
  const getPidClaimsSlice = useStore((s) => s.getPidClaimsSlice);
  const debugPortfolioUsdForPeriod = useStore((s) => s.debugPortfolioUsdForPeriod);

  const { handleSendTx, hash } = useTransaction();
  const { data: receipt, isSuccess, isError } = useWaitForTransactionReceipt({
    hash,
    confirmations: 1,
  });

  const loadData = useCallback(async () => {
    const effectiveAddress = userAddress || address;
    if (!effectiveAddress) {
      setDashboard(null);
      setPortfolios([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const offset = (currentPage - 1) * pageSize;
      
      // Fetch core stats and portfolio ids in parallel
      const [totals, timing, window, pidListRaw, preview, rates, distClaimedTotals] = await Promise.all([
        getROITotals(effectiveAddress),
        getROITiming(),
        getUnclaimedROIWindow(effectiveAddress),
        getPortfolioIds(effectiveAddress),
        getRoiPreviewPerPortfolio(effectiveAddress),
        getDailyRates(),
        getTotalsClaimedFromDistributor(effectiveAddress),
      ]);

      const pidList = (pidListRaw || []).map(Number).filter(n => Number.isFinite(n) && n > 0);
      if (!pidList.length) {
        setPortfolios([]);
        setTotalPortfolios(0);
      }

      // Load portfolio details and claimed map
      const [detailsList, claimedMap] = await Promise.all([
        Promise.all(pidList.map(pid => getPortFoliById(pid))),
        getPaidUsdByPidMap(pidList),
      ]);

      const rateToPct = (wadStr) => {
        const n = Number(wadStr || 0);
        if (!Number.isFinite(n) || n <= 0) return 0;
        // WAD fraction per day -> percent per day
        return n / 1e16; // (n/1e18)*100
      };

      const enriched = pidList.map((pid, idx) => {
        const d = detailsList[idx];
        if (!d) return null;
        const tierIdx = (d?.tier ?? 0) > 0 ? 1 : 0;
        const booster = Boolean(d?.booster);
        const dailyWad = booster
          ? (tierIdx === 0 ? rates.booster.t0 : rates.booster.t1)
          : (tierIdx === 0 ? rates.normal.t0 : rates.normal.t1);
        const dailyPct = rateToPct(dailyWad);
        const claimed = claimedMap[pid] || 0;
        const prev = preview?.map?.get(pid) || { usd: 0, rama: 0, epochCount: 0 };
        const unclaimed = prev.usd || 0;
        const totalAccrued = claimed + unclaimed;
        const capPct = Number(d?.capPct ?? 0) || (booster ? 250 : 200);
        return {
          portfolioId: pid,
          roi: {
            principalUsd: d?.principalUsd || 0,
            accrued: unclaimed,
            ramaAmount: prev?.rama || 0,
            meta: {
              boosterActive: booster,
              tier: d?.tier ?? 0,
              principalUsd: d?.principalUsd || 0,
              isCapped: d?.isCapped || false,
              isClosed: d?.isClosed || false,
              capPct: d?.capPct ?? 0,
              frozenUntil: d?.frozenUntil || 0,
              createdAt: d?.createdAt || 0,
              lastUpdate: d?.lastAccrual || 0,
            },
          },
          _derived: {
            sr: offset + idx + 1,
            claimedUsd: claimed,
            unclaimedUsd: unclaimed,
            totalAccruedUsd: totalAccrued,
            dailyPct,
            capPct,
            portfolioType: booster
              ? `Booster T${tierIdx + 1}`
              : `Normal T${tierIdx + 1}`,
            status: d?.isClosed
              ? 'Closed'
              : (d?.isCapped ? 'Capped' : 'Running'),
          },
        };
      }).filter(Boolean);

      setPortfolios(enriched);
      setTotalPortfolios(pidList.length);

      // Calculate total claimed from per-portfolio map as fallback
      const totalClaimedFromMap = Object.values(claimedMap).reduce((sum, val) => sum + (val || 0), 0);

      // Use claimed totals from Distributor (authoritative) and unclaimed from Distributor window
      console.log('Claimed totals debug:', {
        distClaimedTotals,
        totalClaimedFromMap,
        totalsClaimedUsd: totals.claimedUsd,
        totalsClaimedRama: totals.claimedRama,
        windowUsd: window.usd,
        windowRama: window.rama,
      });

      const dashboardData = {
        totals: {
          claimed: {
            usd: distClaimedTotals?.usd ?? totalClaimedFromMap ?? totals.claimedUsd ?? 0,
            rama: distClaimedTotals?.rama ?? totals.claimedRama ?? 0,
          },
          unclaimed: {
            usd: totals.unclaimedUsd || window.usd || 0,
            rama: totals.unclaimedRama || window.rama || 0,
          },
          periods: {
            count: window.epochsCount || pidList.length,
            from: window.fromPeriod || 0,
            last: window.lastPeriod || 0,
          },
          timing,
        }
      };

      console.log('Final dashboard data:', dashboardData);

      // Leave from/last from distributor window; portfolio dates can still be used for UI hints if needed

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
  }, [userAddress, address, getROITotals, getROITiming, getUnclaimedROIWindow, getPortfolioIds, getRoiPreviewPerPortfolio, getDailyRates, getPaidUsdByPidMap, currentPage, pageSize]);

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
    toast.success('Daily Accrued Reward claimed successfully');
    await loadData();
  };

  const handleViewHistory = async () => {
    setShowHistoryModal(true);
    setHistoryLoading(true);
    try {
      const effectiveAddress = userAddress || address;
      const { history } = await getClaimHistoryPaged(effectiveAddress, 0, 100);
      setClaimHistory(history || []);
    } catch (err) {
      setError("Failed to load claim history.");
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleViewPortfolioDebug = async (pid, periodId) => {
    setExpandedPortfolio(pid);
    setDebugLoading(true);
    setPortfolioDebugInfo(null);
    try {
      const info = await debugPortfolioUsdForPeriod(pid, periodId);
      setPortfolioDebugInfo(info);
    } catch (err) {
      console.error('Failed to load debug info:', err);
      toast.error('Failed to load portfolio debug info');
    } finally {
      setDebugLoading(false);
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
    if (filterMode === 'pending') {
      result = result.filter(p => (p?._derived?.unclaimedUsd ?? p?.roi?.accrued ?? 0) > 0);
    } else if (filterMode === 'claimed') {
      result = result.filter(p => (p?._derived?.unclaimedUsd ?? p?.roi?.accrued ?? 0) <= 0);
    }
    result.sort((a, b) => {
      const aValue = sortBy === 'rewards' ? a.roi?.accrued : a.portfolioId;
      const bValue = sortBy === 'rewards' ? b.roi?.accrued : b.portfolioId;
      return sortDir === 'desc' ? (bValue ?? 0) - (aValue ?? 0) : (aValue ?? 0) - (bValue ?? 0);
    });
    return result;
  }, [portfolios, filterMode, sortBy, sortDir]);

  const canClaimGlobal = !loading && dashboard?.totals?.unclaimed?.usd > 0;

  return (
    <>
      <ClaimHistoryModal 
        isOpen={showHistoryModal} 
        onClose={() => setShowHistoryModal(false)} 
        history={claimHistory} 
        loading={historyLoading} 
      />
      <PortfolioDebugModal
        isOpen={expandedPortfolio !== null}
        onClose={() => {
          setExpandedPortfolio(null);
          setPortfolioDebugInfo(null);
        }}
        debugInfo={portfolioDebugInfo}
        loading={debugLoading}
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

        {/* Distributor window and timing */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="cyber-glass rounded-xl border border-cyan-500/30 p-4">
            <div className="flex items-center gap-2 text-cyan-300/70 text-xs mb-2">
              <Timer size={16} />
              <span>Unclaimed Period Window</span>
            </div>
            <div className="text-cyan-100 text-sm font-mono">
              {dashboard?.totals?.periods?.from || 0} → {dashboard?.totals?.periods?.last || 0}
            </div>
            <div className="text-cyan-300/60 text-xs mt-1">
              {dashboard?.totals?.periods?.count || 0} epoch{dashboard?.totals?.periods?.count !== 1 ? 's' : ''}
            </div>
          </div>
          <div className="cyber-glass rounded-xl border border-cyan-500/30 p-4">
            <div className="flex items-center gap-2 text-cyan-300/70 text-xs mb-2">
              <Clock size={16} />
              <span>Last Distribution</span>
            </div>
            <div className="text-cyan-100 text-sm">
              {dashboard?.totals?.timing?.lastDistributionTs ? new Date(dashboard.totals.timing.lastDistributionTs * 1000).toLocaleString() : '—'}
            </div>
            <div className="text-cyan-300/60 text-xs mt-1">
              {dashboard?.totals?.timing?.lastDistributionTs ? `${Math.floor((Date.now() / 1000 - dashboard.totals.timing.lastDistributionTs) / 60)} min ago` : ''}
            </div>
          </div>
          <div className="cyber-glass rounded-xl border border-emerald-500/30 p-4">
            <div className="flex items-center gap-2 text-emerald-300/70 text-xs mb-2">
              <TrendingUp size={16} />
              <span>Next Distribution</span>
            </div>
            <div className="text-emerald-100 text-sm">
              {dashboard?.totals?.timing?.nextDistributionTs ? new Date(dashboard.totals.timing.nextDistributionTs * 1000).toLocaleString() : '—'}
            </div>
            <div className="text-emerald-300/60 text-xs mt-1">
              {dashboard?.totals?.timing?.nextDistributionTs && dashboard.totals.timing.nextDistributionTs > Date.now() / 1000 
                ? `in ${Math.floor((dashboard.totals.timing.nextDistributionTs - Date.now() / 1000) / 60)} min`
                : dashboard?.totals?.timing?.nextDistributionTs ? 'Due now' : ''}
            </div>
          </div>
        </div>

       <div className="cyber-glass rounded-xl border border-cyan-500/30 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-semibold text-cyan-100">
              All Portfolios
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center bg-cyan-500/5 border border-cyan-500/30 rounded-lg overflow-hidden">
                {['all','pending','claimed'].map(opt => (
                  <button
                    key={opt}
                    onClick={() => setFilterMode(opt)}
                    className={`px-3 py-2 text-xs font-semibold transition-colors ${
                      filterMode === opt
                        ? 'bg-cyan-500/20 text-cyan-100'
                        : 'text-cyan-300 hover:bg-cyan-500/10'
                    }`}
                  >
                    {opt === 'all' ? 'All' : opt === 'pending' ? 'Pending' : 'Claimed'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-cyan-500/20">
                  <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-cyan-300/70">Sr</th>
                  <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-cyan-300/70">Portfolio #</th>
                  <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-cyan-300/70">Amount (USD)</th>
                  <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-cyan-300/70">Target Cap</th>
                  <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-cyan-300/70">Daily %</th>
                  <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-cyan-300/70">Epochs</th>
                  <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-cyan-300/70">Till Accrued</th>
                  <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-cyan-300/70">Claimed</th>
                  <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-cyan-300/70">Unclaimed (USD/RAMA)</th>
                  <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-cyan-300/70">Available (USD/RAMA)</th>
                  <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-cyan-300/70">Status</th>
                  <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-cyan-300/70">Type</th>
                  <th className="text-center py-3 px-4 text-xs uppercase tracking-wider text-cyan-300/70">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-500/20">
                {loading ? (
                  <tr>
                    <td colSpan={13} className="py-8 text-center">
                      <Loader2
                        size={24}
                        className="animate-spin mx-auto text-cyan-400"
                      />
                    </td>
                  </tr>
                ) : filteredPortfolios.length === 0 ? (
                  <tr>
                    <td
                      colSpan={13}
                      className="py-8 text-center text-cyan-300/70"
                    >
                      {filterMode === 'pending' ? 'No portfolios with pending rewards found.' : filterMode === 'claimed' ? 'No fully-claimed portfolios found.' : 'No portfolios found.'}
                    </td>
                  </tr>
                ) : (
                  filteredPortfolios.map((portfolio) => {
                    const prev = dashboard?.totals?.periods || {};
                    const epochCount = portfolio?.roi?.ramaAmount ? (prev.count || 0) : 0;
                    return (
                      <tr
                        key={portfolio.portfolioId}
                        className="hover:bg-cyan-500/5 transition-colors"
                      >
                        <td className="py-3 px-4 text-cyan-200">{portfolio?._derived?.sr}</td>
                        <td className="py-3 px-4 text-cyan-200 font-mono">#{String(portfolio.portfolioId).padStart(4, '0')}</td>
                        <td className="py-3 px-4 text-right">{formatUSD(portfolio.roi?.principalUsd || 0)}</td>
                        <td className="py-3 px-4 text-right">{portfolio?._derived?.capPct}%</td>
                        <td className="py-3 px-4 text-right">{(portfolio?._derived?.dailyPct ?? 0).toFixed(2)}%</td>
                        <td className="py-3 px-4 text-right">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-500/10 text-cyan-200 rounded-full text-xs">
                            {epochCount > 0 ? epochCount : '—'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">{formatUSD(portfolio?._derived?.totalAccruedUsd || 0)}</td>
                        <td className="py-3 px-4 text-right">{formatUSD(portfolio?._derived?.claimedUsd || 0)}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex flex-col items-end leading-tight">
                            <span className="text-cyan-100">{formatUSD(portfolio?._derived?.unclaimedUsd || 0)}</span>
                            <span className="text-[11px] text-cyan-300/70">{formatRAMAPrecise(portfolio?.roi?.ramaAmount || 0)} RAMA</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex flex-col items-end leading-tight">
                            <span className="text-emerald-300">{formatUSD(portfolio?.roi?.accrued || 0)}</span>
                            <span className="text-[11px] text-emerald-300/70">{formatRAMAPrecise(portfolio?.roi?.ramaAmount || 0)} RAMA</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            {portfolio?._derived?.status === 'Closed' ? (
                              <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-300 rounded-full">Closed</span>
                            ) : portfolio?._derived?.status === 'Capped' ? (
                              <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-300 rounded-full">Capped</span>
                            ) : (
                              <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full">Running</span>
                            )}
                            {portfolio.roi?.meta?.boosterActive && (
                              <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full">Boosted</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-cyan-200">{portfolio?._derived?.portfolioType}</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleViewPortfolioDebug(portfolio.portfolioId, prev.last || 0)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/10 transition-colors text-xs"
                            title="View debug info for this portfolio"
                          >
                            <AlertCircle size={14} />
                            <span>Debug</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
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