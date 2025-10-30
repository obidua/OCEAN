import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  X,
  Calendar,
  BarChart3,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useWaitForTransactionReceipt } from 'wagmi';
import { useTransaction } from '../../config/register';
import { useStore } from '../../store/useUserInfoStore';
import NumberPopup from '../components/NumberPopup';
import Tooltip from '../components/Tooltip';
import ROIDaysBreakdown from '../components/ROIDaysBreakdown';
import IncomeNotificationOverlay from '../components/IncomeNotificationOverlay';
import { formatUSD } from '../utils/contractData';
import toast from '../utils/toast';
import financialSounds from '../utils/financialSounds';
import incomeTracker from '../utils/incomeTracker';
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

  const entries = debugInfo?.periods ?? [];
  const formatCapPercent = (value) => {
    if (value == null) return '—';
    const asNumber = Number(value);
    if (!Number.isFinite(asNumber)) return '—';
    return `${asNumber.toFixed(2)}%`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/80 backdrop-blur-sm pt-10 pb-10 sm:pt-0 sm:pb-0">
      <div className="cyber-glass rounded-xl border border-cyan-500/30 w-full max-w-4xl max-h-[calc(100vh-80px)] mx-4 my-4 sm:my-6 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 sm:px-6 border-b border-cyan-500/20 bg-dark-900/90 sticky top-0 z-10">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-cyan-300">Unclaimed Accrued Reward Logs</h2>
            {debugInfo && (
              <p className="text-xs text-cyan-300/60 mt-1">Portfolio #{debugInfo.pid}</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-cyan-500/10">
            <X size={18} className="text-cyan-300" />
          </button>
        </div>

        <div className="px-5 py-4 sm:px-6 sm:py-5 overflow-y-auto max-h-[calc(100vh-112px)]">
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="animate-spin text-cyan-400" size={32} />
            </div>
          ) : !debugInfo ? (
            <p className="text-center text-cyan-300/70 py-12">No unclaimed log data available.</p>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="cyber-glass rounded-lg border border-cyan-500/20 p-4">
                  <h3 className="text-sm font-semibold text-cyan-300 mb-3">Unclaimed Totals</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-cyan-300/70">USD:</span>
                      <span className="text-emerald-300 font-semibold">{formatUSD(debugInfo.usdTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cyan-300/70">RAMA:</span>
                      <span className="text-cyan-100 font-mono">{formatRAMAPrecise(debugInfo.ramaTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cyan-300/70">Epochs Count:</span>
                      <span className="text-cyan-100">{debugInfo.epochsCount}</span>
                    </div>
                  </div>
                </div>

                <div className="cyber-glass rounded-lg border border-cyan-500/20 p-4">
                  <h3 className="text-sm font-semibold text-cyan-300 mb-3">Period Range</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-cyan-300/70">From → To:</span>
                      <span className="text-cyan-100 font-mono">{debugInfo.fromPeriod} → {debugInfo.toPeriod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cyan-300/70">Page Window:</span>
                      <span className="text-cyan-100 font-mono">{debugInfo.pageStartPeriod} → {debugInfo.pageEndPeriod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cyan-300/70">Total Epochs:</span>
                      <span className="text-cyan-100">{debugInfo.totalEpochs}</span>
                    </div>
                  </div>
                </div>

                <div className="cyber-glass rounded-lg border border-cyan-500/20 p-4">
                  <h3 className="text-sm font-semibold text-cyan-300 mb-3">Principal & Cap</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-cyan-300/70">Principal:</span>
                      <span className="text-cyan-100">{formatUSD(debugInfo.principalUsd)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cyan-300/70">Cap %:</span>
                      <span className="text-cyan-100">{formatCapPercent(debugInfo.capPct)}</span>
                    </div>
                  </div>
                </div>

                <div className="cyber-glass rounded-lg border border-cyan-500/20 p-4">
                  <h3 className="text-sm font-semibold text-cyan-300 mb-3">Remaining Caps</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-cyan-300/70">PID Cap (Before → After):</span>
                      <span className="text-cyan-100 text-right">
                        {formatUSD(debugInfo.remainingPidCapBefore)} → {formatUSD(debugInfo.remainingPidCapAfter)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cyan-300/70">User 4x Cap (Before → After):</span>
                      <span className="text-cyan-100 text-right">
                        {formatUSD(debugInfo.remainingUser4xBefore)} → {formatUSD(debugInfo.remainingUser4xAfter)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="cyber-glass rounded-lg border border-cyan-500/20 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-cyan-300">Unclaimed Period Logs</h3>
                  <span className="text-[11px] text-cyan-300/60">{entries.length} records</span>
                </div>
                {entries.length === 0 ? (
                  <p className="text-xs text-cyan-300/70">No unclaimed periods returned for this portfolio.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="max-h-[55vh] sm:max-h-[65vh] overflow-y-auto pr-1 pb-1">
                      <table className="min-w-full text-xs sm:text-sm text-cyan-100">
                        <thead className="sticky top-0 bg-dark-900/90">
                          <tr className="text-cyan-300/70">
                            <th className="py-2 pl-2 pr-3 text-left font-medium">#</th>
                            <th className="py-2 px-3 text-left font-medium">Period</th>
                            <th className="py-2 px-3 text-right font-medium">USD</th>
                            <th className="py-2 px-3 text-right font-medium">RAMA</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-cyan-500/20">
                          {entries.map((item, idx) => (
                            <tr key={`${item.periodId}-${idx}`} className="hover:bg-cyan-500/10 transition-colors">
                              <td className="py-2 pl-2 pr-3 text-cyan-300/80 font-mono">{idx + 1}</td>
                              <td className="py-2 px-3 font-mono text-cyan-200">{item.periodId}</td>
                              <td className="py-2 px-3 text-right text-emerald-300">{formatUSD(item.usd)}</td>
                              <td className="py-2 px-3 text-right text-cyan-200">{formatRAMAPrecise(item.rama)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
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
  const [viewMode, setViewMode] = useState('legacy'); // 'legacy' or 'daysBreakdown'

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [claimHistory, setClaimHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [claimConfirmData, setClaimConfirmData] = useState(null);
  const [showSoundSettings, setShowSoundSettings] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [expandedPortfolio, setExpandedPortfolio] = useState(null);
  const [portfolioDebugInfo, setPortfolioDebugInfo] = useState(null);
  const [debugLoading, setDebugLoading] = useState(false);
  const [autoWindowInfo, setAutoWindowInfo] = useState(null);

  // Ref to prevent multiple success notifications
  const successHandledRef = useRef(false);
  
  // Ref to track previous ROI values for sound notifications
  const previousROIRef = useRef(null);

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
  const previewUnclaimedForPortfolio = useStore((s) => s.previewUnclaimedForPortfolioUsingCapMgr);
  
  // New enhanced ROI functions
  const getPerDayROIBreakdown = useStore((s) => s.getPerDayROIBreakdown);
  const getUnclaimedROIDetailed = useStore((s) => s.getUnclaimedROIDetailed);
  const getMaxPeriodsPerClaim = useStore((s) => s.getMaxPeriodsPerClaim);
  const claimAllROI = useStore((s) => s.claimAllROI);
  const claimROIUpTo = useStore((s) => s.claimROIUpTo);
  const getROIClaimHistory = useStore((s) => s.getROIClaimHistory);
  const claimAccruedROISmart = useStore((s) => s.claimAccruedROISmart);
  const getAutoWindow = useStore((s) => s.getAutoWindow);

  const { handleSendTx, hash } = useTransaction();
  const { data: receipt, isSuccess, isError } = useWaitForTransactionReceipt({
    hash,
    confirmations: 1,
  });

  // Function to detect ROI changes and play sounds
  const checkROIChangesAndPlaySounds = useCallback((newDashboard) => {
    if (!newDashboard) return;

    const address = userAddress || '';
    
    // Track different types of income
    incomeTracker.trackValue(
      `roi-unclaimed-${address}`,
      newDashboard?.totals?.unclaimed?.usd || 0,
      'roi',
      { source: 'ROI Generation', dashboard: newDashboard }
    );

    incomeTracker.trackValue(
      `roi-claimed-${address}`,
      newDashboard?.totals?.claimed?.usd || 0,
      'portfolio',
      { source: 'Claimed ROI', dashboard: newDashboard }
    );

    incomeTracker.trackValue(
      `total-roi-${address}`,
      newDashboard?.totals?.roi?.usd || 0,
      'portfolio',
      { source: 'Total ROI', dashboard: newDashboard }
    );

    // Track individual portfolio ROI if available
    if (newDashboard?.portfolios) {
      newDashboard.portfolios.forEach((portfolio, index) => {
        if (portfolio?._derived?.unclaimedUsd > 0) {
          incomeTracker.trackValue(
            `portfolio-${portfolio.portfolioId}-${address}`,
            portfolio._derived.unclaimedUsd,
            'portfolio',
            { 
              source: 'Portfolio ROI',
              portfolioId: portfolio.portfolioId,
              dashboard: newDashboard 
            }
          );
        }
      });
    }
  }, [userAddress]);

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
      const [totals, timing, window, pidListRaw, preview, rates, distClaimedTotals, autoWindow] = await Promise.all([
        getROITotals(effectiveAddress),
        getROITiming(),
        getUnclaimedROIWindow(effectiveAddress),
        getPortfolioIds(effectiveAddress),
        getRoiPreviewPerPortfolio(effectiveAddress),
        getDailyRates(),
        getTotalsClaimedFromDistributor(effectiveAddress),
        getAutoWindow(effectiveAddress).catch(err => {
          console.warn('[AccruedRewards] Auto window load failed:', err);
          return null;
        }),
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
      setAutoWindowInfo(autoWindow);
      
      // Check for ROI changes and play sounds
      checkROIChangesAndPlaySounds(dashboardData);

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
  }, [userAddress, address, getROITotals, getROITiming, getUnclaimedROIWindow, getPortfolioIds, getRoiPreviewPerPortfolio, getDailyRates, getPaidUsdByPidMap, currentPage, pageSize, getAutoWindow, checkROIChangesAndPlaySounds]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load sound settings
  useEffect(() => {
    const enabled = localStorage.getItem('financialSoundsEnabled');
    if (enabled !== null) {
      setSoundEnabled(enabled === 'true');
    }
  }, []);

  // Auto-refresh data every 30 seconds to detect ROI changes
  useEffect(() => {
    if (!isConnected || !address) return;

    const interval = setInterval(() => {
      console.log('🔄 Auto-checking for ROI changes...');
      loadData();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [isConnected, address, loadData]);

  const handleRefresh = () => {
    if (loading) return;
    loadData();
  };

  const toggleSounds = () => {
    const newEnabled = !soundEnabled;
    setSoundEnabled(newEnabled);
    financialSounds.setEnabled(newEnabled);
    
    // Play a test sound when enabling
    if (newEnabled) {
      financialSounds.playCoinDrop(1);
    }
  };

  // Function to simulate ROI increase for testing
  const simulateROIIncrease = () => {
    if (!dashboard) return;
    
    const simulatedDashboard = {
      ...dashboard,
      totals: {
        ...dashboard.totals,
        unclaimed: {
          ...dashboard.totals.unclaimed,
          usd: (dashboard.totals.unclaimed.usd || 0) + Math.random() * 50 + 10 // Add 10-60 USD
        }
      }
    };
    
    checkROIChangesAndPlaySounds(simulatedDashboard);
    setDashboard(simulatedDashboard);
  };

  const handleClaim = useCallback(async () => {
    try {
      if (!dashboard || dashboard.totals.unclaimed.usd <= 0) {
        throw new Error('No rewards available to claim.');
      }
      if(!isConnected) {
        throw new Error('Wallet not connected.');
        return;
      }

      // Load auto window information to show confirmation details
      try {
        const autoWindow = await getAutoWindow(address);
        setAutoWindowInfo(autoWindow);
        
        if (autoWindow && autoWindow.success && autoWindow.canClaim && autoWindow.totalPeriods > 0) {
          const firstClaim = autoWindow.claimingPlan?.[0];
          const maxPerTransaction = 50; // claimROI() can claim max 50 days per transaction
          const claimingThisTime = Math.min(autoWindow.totalPeriods, maxPerTransaction);
          const remainingAfterThis = Math.max(0, autoWindow.totalPeriods - maxPerTransaction);
          const needsMultiple = autoWindow.totalPeriods > maxPerTransaction;
          
          setClaimConfirmData({
            totalDays: autoWindow.totalPeriods,
            claimingDays: claimingThisTime, // Claiming up to 50 days in this transaction
            remainingDays: remainingAfterThis,
            fromDate: firstClaim?.estimatedFromDate,
            toDate: firstClaim?.estimatedToDate, // Only covers first 50 days
            totalTransactions: needsMultiple ? Math.ceil(autoWindow.totalPeriods / maxPerTransaction) : 1,
            currentTransaction: 1,
            estimatedAmount: dashboard.totals.unclaimed.usd,
            autoWindow: autoWindow,
            needsMultipleTransactions: needsMultiple,
            maxPerTransaction: maxPerTransaction
          });
          setShowConfirmModal(true);
        } else {
          throw new Error('No claimable periods available');
        }
        
        console.log('[AccruedRewards] Auto window info loaded:', autoWindow);
      } catch (autoErr) {
        console.error('[AccruedRewards] Failed to load auto window info:', autoErr);
        setError(autoErr?.message || 'Failed to load claiming information');
      }
    } catch (err) {
      console.error('Failed to prepare claim:', err);
      setError(err?.message || 'Failed to prepare claim');
    } 
  }, [getAutoWindow, dashboard, isConnected, address]);

  const handleConfirmClaim = useCallback(async () => {
    try {
      setShowConfirmModal(false);
      setIsClaiming(true);
      setShowClaimModal(true);
      
      // Reset success flag for new transaction
      successHandledRef.current = false;

      const tx = await claimAccruedROISmart(address);
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
  }, [claimAccruedROISmart, handleSendTx, address]);

  const handleClaimModalClose = () => {
    setShowClaimModal(false);
    setIsClaiming(false);
    setShowConfirmModal(false);
    setError(null);
    setAutoWindowInfo(null);
    setClaimConfirmData(null);
  };

  const handleClaimSuccess = async () => {
    try {
      // Prevent multiple calls
      if (successHandledRef.current) {
        console.log('Success already handled, skipping...');
        return;
      }
      successHandledRef.current = true;
      
      // Close the modal and reset states first
      setShowClaimModal(false);
      setIsClaiming(false);
      setError(null);
      setAutoWindowInfo(null);
      setClaimConfirmData(null);
      
      // Show success notification (only once)
      toast.success('ROI Accrued Reward claimed successfully', {
        title: 'Success',
        duration: 4000,
        playSound: false // We'll use our custom financial sound instead
      });
      
      // Play transaction success sound
      financialSounds.playTransactionSuccess();
      
      // Reload data to reflect the claim
      await loadData();
      
      // Reset the success flag after a delay
      setTimeout(() => {
        successHandledRef.current = false;
      }, 2000);
    } catch (err) {
      console.error('Error in handleClaimSuccess:', err);
      successHandledRef.current = false;
    }
  };

  // New handler for days-based claiming
  const handleClaimDays = useCallback(async (maxPeriods = null) => {
    try {
      setIsClaiming(true);
      setShowClaimModal(true);
      
      if (!isConnected) {
        throw new Error('Wallet not connected.');
      }

      const effectiveAddress = userAddress || address;
      let tx;

      if (maxPeriods) {
        // Claim specific number of days
        tx = await claimROIUpTo(effectiveAddress, maxPeriods);
        console.log('[AccruedRewards] Claiming', maxPeriods, 'days');
      } else {
        // Claim all available days
        tx = await claimAllROI(effectiveAddress);
        console.log('[AccruedRewards] Claiming all available days');
      }

      if (!tx) {
        throw new Error('Unable to build claim transaction');
      }

      handleSendTx(tx);
    } catch (err) {
      console.error('Failed to claim ROI days:', err);
      setError(err?.message || 'Failed to claim ROI days');
      setIsClaiming(false);
      setShowClaimModal(false);
    }
  }, [claimAllROI, claimROIUpTo, handleSendTx, isConnected, address, userAddress]);

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

  const handleViewPortfolioDebug = async (pid) => {
    setExpandedPortfolio(pid);
    setDebugLoading(true);
    setPortfolioDebugInfo(null);
    try {
      const info = await previewUnclaimedForPortfolio(pid, 1, 1000);
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
      {/* Universal Income Notifications */}
      <IncomeNotificationOverlay />
      
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
            {/* View Mode Toggle */}
            <div className="flex items-center bg-dark-900/60 rounded-lg border border-cyan-500/30 overflow-hidden">
              <button
                onClick={() => setViewMode('legacy')}
                className={`px-3 py-2 text-xs font-semibold transition-colors flex items-center gap-2 ${
                  viewMode === 'legacy' 
                    ? 'bg-cyan-500/20 text-cyan-300 border-r border-cyan-500/40' 
                    : 'text-gray-400 hover:text-cyan-300 border-r border-gray-600'
                }`}
              >
                <BarChart3 size={14} />
                <span>Legacy View</span>
              </button>
              <button
                onClick={() => setViewMode('daysBreakdown')}
                className={`px-3 py-2 text-xs font-semibold transition-colors flex items-center gap-2 ${
                  viewMode === 'daysBreakdown' 
                    ? 'bg-cyan-500/20 text-cyan-300' 
                    : 'text-gray-400 hover:text-cyan-300'
                }`}
              >
                <Calendar size={14} />
                <span>Days Breakdown</span>
              </button>
            </div>
            
            {/* Smart Claiming Info */}
            {autoWindowInfo && autoWindowInfo.success && autoWindowInfo.canClaim && autoWindowInfo.claimingPlan?.[0] && (
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs">
                <Timer size={14} className="text-emerald-400" />
                <span className="text-emerald-200">
                  Ready to claim: {autoWindowInfo.claimingPlan[0].estimatedFromDate} to {autoWindowInfo.claimingPlan[0].estimatedToDate}
                  {autoWindowInfo.totalTransactions > 1 && (
                    <span className="text-emerald-300/80"> ({autoWindowInfo.totalTransactions} transactions)</span>
                  )}
                </span>
              </div>
            )}
            
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
              onClick={toggleSounds}
              className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                soundEnabled 
                  ? 'border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10' 
                  : 'border-gray-500/40 text-gray-400 hover:bg-gray-500/10'
              }`}
              title={soundEnabled ? 'Sound ON - Click to disable' : 'Sound OFF - Click to enable'}
            >
              <span className="flex items-center gap-2">
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                <span>{soundEnabled ? 'Sound ON' : 'Sound OFF'}</span>
              </span>
            </button>
            
            {/* Sound Test Buttons (for development/demo) */}
            {soundEnabled && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => financialSounds.playCoinDrop(5)}
                  className="px-2 py-1 text-xs rounded border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10"
                  title="Test Coin Drop Sound"
                >
                  🪙
                </button>
                <button
                  onClick={() => financialSounds.playROIIncome(100)}
                  className="px-2 py-1 text-xs rounded border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
                  title="Test ROI Income Sound"
                >
                  💰
                </button>
                <button
                  onClick={() => financialSounds.playMoneyOut(50)}
                  className="px-2 py-1 text-xs rounded border border-red-500/30 text-red-300 hover:bg-red-500/10"
                  title="Test Money Out Sound"
                >
                  📤
                </button>
                <button
                  onClick={simulateROIIncrease}
                  className="px-2 py-1 text-xs rounded border border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                  title="Simulate ROI Increase"
                >
                  🚀
                </button>
                <button
                  onClick={() => {
                    // Test income tracker with fake increase
                    const fakeAmount = Math.random() * 100 + 10;
                    incomeTracker.trackValue(
                      `test-roi-${Date.now()}`,
                      fakeAmount,
                      'roi',
                      { source: 'Test Income' }
                    );
                  }}
                  className="px-2 py-1 text-xs rounded border border-green-500/30 text-green-300 hover:bg-green-500/10"
                  title="Test Income Glow Effect"
                >
                  ✨
                </button>
              </div>
            )}
            
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
                  <span>Claim Accrued Reward</span>
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
          <div 
            className="cyber-glass rounded-xl border border-cyan-500/30 p-4 space-y-2"
            data-income-type="portfolio"
            data-income-key={`roi-claimed-${userAddress || address}`}
          >
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

          <div 
            className="cyber-glass rounded-xl border border-emerald-500/30 p-4 space-y-2"
            data-income-type="roi"
            data-income-key={`roi-unclaimed-${userAddress || address}`}
          >
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

          <div 
            className="cyber-glass rounded-xl border border-purple-500/30 p-4 space-y-2"
            data-income-type="portfolio"
          >
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

          <div 
            className="cyber-glass rounded-xl border border-cyan-500/30 p-4 space-y-2"
            data-income-type="portfolio"
          >
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

        {/* Conditional View Rendering */}
        {viewMode === 'daysBreakdown' ? (
          <ROIDaysBreakdown
            userAddress={userAddress || address}
            getPerDayROIBreakdown={getPerDayROIBreakdown}
            getUnclaimedROIDetailed={getUnclaimedROIDetailed}
            getMaxPeriodsPerClaim={getMaxPeriodsPerClaim}
            onClaimDays={handleClaimDays}
            className="mt-6"
          />
        ) : (
          // Legacy Portfolio View
          <>
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
                        <td className="py-3 px-4 text-right text-cyan-200 text-[12px] md:text-[14px] lg:text-[16px] xl:text-[18px]">{portfolio?._derived?.portfolioType}</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleViewPortfolioDebug(portfolio.portfolioId)}
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
          </>
        )}
      </div>

      {/* Claim Confirmation Modal */}
      {showConfirmModal && claimConfirmData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="cyber-glass rounded-xl border border-cyan-500/30 p-6 w-full max-w-md mx-4 space-y-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-cyan-300 mb-4">
                <Coins size={24} />
                <h2 className="text-xl font-bold">Confirm ROI Claim</h2>
              </div>
              
              <div className="space-y-4 text-left">
                <div className="bg-dark-900/60 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Total Pending Days:</span>
                    <span className="text-cyan-300 font-semibold">{claimConfirmData.totalDays} days</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Claiming Now:</span>
                    <span className="text-emerald-300 font-semibold">{claimConfirmData.claimingDays} days</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Period:</span>
                    <span className="text-cyan-200 text-sm">{claimConfirmData.fromDate} to {claimConfirmData.toDate}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Estimated Amount:</span>
                    <span className="text-green-300 font-bold">{formatUSD(claimConfirmData.estimatedAmount)}</span>
                  </div>
                  
                  {claimConfirmData.remainingDays > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Remaining After This:</span>
                      <span className="text-yellow-300 font-semibold">{claimConfirmData.remainingDays} days</span>
                    </div>
                  )}
                  
                  {claimConfirmData.needsMultipleTransactions && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Max per Transaction:</span>
                      <span className="text-orange-300 font-semibold">{claimConfirmData.maxPerTransaction} days</span>
                    </div>
                  )}
                </div>
                
                {claimConfirmData.needsMultipleTransactions && (
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={16} className="text-orange-400 mt-0.5 flex-shrink-0" />
                      <div className="text-orange-200 text-sm">
                        <p className="font-semibold mb-1">50-Day Transaction Limit</p>
                        <p>This transaction will claim {claimConfirmData.claimingDays} days. The remaining {claimConfirmData.remainingDays} days can be claimed in a separate transaction later.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-500/50 text-gray-300 hover:bg-gray-500/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmClaim}
                  className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-green-500 text-white font-semibold hover:shadow-lg hover:shadow-green-500/30 transition-all"
                >
                  <span className="flex items-center justify-center gap-2">
                    <Coins size={16} />
                    Confirm Claim
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progressive Transaction Modal */}
      <ProgressiveTransactionModal
        isOpen={showClaimModal}
        onClose={handleClaimModalClose}
        txHash={hash}
        title="Claim Accrued Reward"
        description={
          autoWindowInfo && autoWindowInfo.success && autoWindowInfo.totalPeriods > 0
            ? `Claiming ${Math.min(autoWindowInfo.totalPeriods, 50)} days of accrued rewards${autoWindowInfo.totalPeriods > 50 ? ` (${autoWindowInfo.totalPeriods - 50} days remaining for next transaction)` : ''} from ${autoWindowInfo.claimingPlan?.[0]?.estimatedFromDate}`
            : "Claiming up to 50 days of your portfolio growth rewards in this transaction"
        }
        successMessage="Your rewards have been claimed successfully!"
        onSuccess={handleClaimSuccess}
        amount={dashboard?.totals?.unclaimed?.usd ? formatUSD(dashboard.totals.unclaimed.usd) : null}
        amountLabel="Claiming Amount"
      />
    </>
  );
}
