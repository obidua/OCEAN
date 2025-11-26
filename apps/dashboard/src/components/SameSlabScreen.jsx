import React, { useEffect, useMemo, useState } from "react";
import {
  SLAB_LEVELS,
  formatUSD,
  formatPercentage,
  formatRAMA,
} from "../utils/contractData";
import { 
  AlertCircle, 
  ArrowDown, 
  Layers, 
  Loader2, 
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  Award,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from "lucide-react";
import { 
  getCombinedIncome,
  getPeriodIncome,
  getClaimableIncome,
  getUserIncomeHistory,
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

const SameSlabScreen = () => {
  const userAddress = typeof window !== 'undefined' ? localStorage.getItem("userAddress") : null;
  
  // Data states
  const [todayData, setTodayData] = useState(null);
  const [periodData, setPeriodData] = useState(null);
  const [claimableData, setClaimableData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0, percentage: 0 });
  const [error, setError] = useState(null);
  const [selectedDay, setSelectedDay] = useState(calculateDayId());
  const [refreshingCard, setRefreshingCard] = useState(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  // Load today's override data sequentially
  useEffect(() => {
    let cancelled = false;

    const loadTodayData = async () => {
      if (!userAddress) {
        console.log('[SameSlabScreen] No user address');
        return;
      }

      console.log('[SameSlabScreen] Starting data load for:', userAddress);
      setLoading(true);
      setError(null);

      try {
        const ramaPrice = getRamaPrice();
        const currentDay = calculateDayId();

        // Card 1: Today's Override Income
        console.log('[SameSlabScreen] 1/3 Loading today override...');
        const todayResult = await getCombinedIncome(userAddress, selectedDay, ramaPrice);
        if (!cancelled && todayResult.success) {
          console.log('[SameSlabScreen] ✓ Today data:', todayResult.data);
          setTodayData(todayResult.data);
        } else if (!cancelled) {
          console.error('[SameSlabScreen] ✗ Today fetch failed:', todayResult.error);
        }

        // Card 2: Last 30 Days Override
        console.log('[SameSlabScreen] 2/3 Loading period override...');
        const periodResult = await getPeriodIncome(userAddress, Math.max(0, currentDay - 30), currentDay, ramaPrice);
        if (!cancelled && periodResult.success) {
          console.log('[SameSlabScreen] ✓ Period data:', periodResult.data);
          setPeriodData(periodResult.data);
        } else if (!cancelled) {
          console.error('[SameSlabScreen] ✗ Period fetch failed:', periodResult.error);
        }

        // Card 3: Total Claimable Override
        console.log('[SameSlabScreen] 3/3 Loading claimable override...');
        const claimableResult = await getClaimableIncome(userAddress, currentDay, ramaPrice);
        if (!cancelled && claimableResult.success) {
          console.log('[SameSlabScreen] ✓ Claimable data:', claimableResult.data);
          setClaimableData(claimableResult.data);
        } else if (!cancelled) {
          console.error('[SameSlabScreen] ✗ Claimable fetch failed:', claimableResult.error);
        }

        if (!cancelled) {
          setLoading(false);
          console.log('[SameSlabScreen] Data loading complete');
        }
      } catch (err) {
        console.error('[SameSlabScreen] Failed to load override data:', err);
        if (!cancelled) {
          setError(err.message || 'Failed to load override data');
          setLoading(false);
        }
      }
    };

    loadTodayData();
    return () => { cancelled = true; };
  }, [userAddress, selectedDay]);

  // Load all-time override history
  useEffect(() => {
    let cancelled = false;

    const loadHistoricalData = async () => {
      if (!userAddress) return;

      const ramaPrice = getRamaPrice();
      console.log('[SameSlabScreen] Loading override history...');

      try {
        const historyResult = await getUserIncomeHistory(
          userAddress,
          ramaPrice,
          (current, total) => {
            if (!cancelled) {
              const percentage = Math.round((current / total) * 100);
              setLoadingProgress({ current, total, percentage });
            }
          },
          90 // Last 90 days
        );

        if (!cancelled && historyResult.success) {
          // Filter only days with override income
          const overrideHistory = historyResult.data.filter(
            item => item.data && item.data.override_income_usd > 0
          );
          console.log('[SameSlabScreen] Override history loaded:', overrideHistory.length, 'days with override income');
          setHistoricalData(overrideHistory);
          setLoadingProgress({ current: 0, total: 0, percentage: 0 });
        } else if (!cancelled && !historyResult.success) {
          console.error('[SameSlabScreen] History failed:', historyResult.error);
        }
      } catch (err) {
        console.error('[SameSlabScreen] Failed to load historical data:', err);
      }
    };

    loadHistoricalData();
    return () => { cancelled = true; };
  }, [userAddress]);

  // Calculate stats from today's data
  const todayStats = useMemo(() => {
    if (!todayData) return null;

    return {
      overrideUsd: microUsdToUsd(todayData.override_income_usd || 0),
      overrideRama: weiToRama(todayData.override_income_rama_wei || '0'),
      totalUsd: microUsdToUsd(todayData.total_income_usd || 0),
      totalRama: weiToRama(todayData.total_income_rama_wei || '0'),
      achieversCount: todayData.achievers_count || 0,
      slabLevel: todayData.user_slab_level || 0,
      overrideDetails: Array.isArray(todayData.override_details) ? todayData.override_details : []
    };
  }, [todayData]);

  // Calculate period stats (last 30 days)
  const periodStats = useMemo(() => {
    if (!periodData) return null;

    return {
      overrideUsd: microUsdToUsd(periodData.override_income_usd || 0),
      overrideRama: weiToRama(periodData.override_income_rama_wei || '0'),
      totalUsd: microUsdToUsd(periodData.total_income_usd || 0),
      daysCount: periodData.days_count || 0
    };
  }, [periodData]);

  // Calculate claimable stats
  const claimableStats = useMemo(() => {
    if (!claimableData) return null;

    return {
      overrideUsd: microUsdToUsd(claimableData.override_income_usd || 0),
      overrideRama: weiToRama(claimableData.override_income_rama_wei || '0'),
      totalUsd: microUsdToUsd(claimableData.total_income_usd || 0),
      daysCount: claimableData.days_count || 0
    };
  }, [claimableData]);

  // Pagination logic
  const paginatedHistory = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return historicalData.slice(startIndex, startIndex + itemsPerPage);
  }, [historicalData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(historicalData.length / itemsPerPage);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Award className="text-neon-green" size={28} />
          <div>
            <h2 className="text-2xl font-bold text-neon-green">Same-Slab Override Income</h2>
            <p className="text-sm text-cyan-300/70">
              Earn bonuses when team members achieve your slab level (10%, 5%, 5%)
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Today's Override Income */}
        <div className="cyber-glass rounded-xl p-5 border-2 border-neon-green hover:border-neon-green/50 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <DollarSign size={18} className="text-neon-green" />
              <span className="text-sm font-semibold text-cyan-300 uppercase tracking-wide">
                Today's Override
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  setRefreshingCard('today');
                  const ramaPrice = getRamaPrice();
                  const result = await getCombinedIncome(userAddress, selectedDay, ramaPrice);
                  if (result.success) setTodayData(result.data);
                  setRefreshingCard(null);
                }}
                className="p-1 hover:bg-neon-green/20 rounded transition-colors"
                title="Refresh"
                disabled={refreshingCard === 'today'}
              >
                <RefreshCw size={14} className={`text-neon-green ${refreshingCard === 'today' ? 'animate-spin' : ''}`} />
              </button>
              <Calendar size={16} className="text-cyan-400" />
            </div>
          </div>
          <div className="mb-3">
            {loading && !todayStats ? (
              <SkeletonCard />
            ) : (
              <>
                <div className="text-3xl font-bold text-neon-green mb-1">
                  {formatUSD(todayStats?.overrideUsd || 0)}
                </div>
                <div className="text-sm text-cyan-300/70">
                  {formatRAMA(todayStats?.overrideRama || 0)} RAMA
                </div>
                <div className="text-xs text-cyan-300/60 mt-2">
                  {formatDayId(selectedDay, 'medium')}
                </div>
              </>
            )}
          </div>
          {todayStats && (
            <div className="flex items-center gap-2 text-xs">
              <Award size={14} className="text-neon-green" />
              <span className="text-cyan-300/90">
                {todayStats.achieversCount} Achiever{todayStats.achieversCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* Last 30 Days Override */}
        <div className="cyber-glass rounded-xl p-5 border-2 border-yellow-500 hover:border-yellow-500/50 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-yellow-400" />
              <span className="text-sm font-semibold text-cyan-300 uppercase tracking-wide">
                Last 30 Days
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  setRefreshingCard('period');
                  const ramaPrice = getRamaPrice();
                  const currentDay = calculateDayId();
                  const result = await getPeriodIncome(userAddress, Math.max(0, currentDay - 30), currentDay, ramaPrice);
                  if (result.success) setPeriodData(result.data);
                  setRefreshingCard(null);
                }}
                className="p-1 hover:bg-yellow-500/20 rounded transition-colors"
                title="Refresh"
                disabled={refreshingCard === 'period'}
              >
                <RefreshCw size={14} className={`text-yellow-400 ${refreshingCard === 'period' ? 'animate-spin' : ''}`} />
              </button>
              <Calendar size={16} className="text-cyan-400" />
            </div>
          </div>
          <div className="mb-3">
            {loading && !periodStats ? (
              <SkeletonCard />
            ) : (
              <>
                <div className="text-3xl font-bold text-yellow-400 mb-1">
                  {formatUSD(periodStats?.overrideUsd || 0)}
                </div>
                <div className="text-sm text-cyan-300/70">
                  {formatRAMA(periodStats?.overrideRama || 0)} RAMA
                </div>
                <div className="text-xs text-cyan-300/60 mt-2">
                  From {periodStats?.daysCount || 0} active days
                </div>
              </>
            )}
          </div>
        </div>

        {/* Total Claimable Override */}
        <div className="cyber-glass rounded-xl p-5 border-2 border-pink-500 hover:border-pink-500/50 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-pink-400" />
              <span className="text-sm font-semibold text-cyan-300 uppercase tracking-wide">
                Total Claimable
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  setRefreshingCard('claimable');
                  const ramaPrice = getRamaPrice();
                  const currentDay = calculateDayId();
                  const result = await getClaimableIncome(userAddress, currentDay, ramaPrice);
                  if (result.success) setClaimableData(result.data);
                  setRefreshingCard(null);
                }}
                className="p-1 hover:bg-pink-500/20 rounded transition-colors"
                title="Refresh"
                disabled={refreshingCard === 'claimable'}
              >
                <RefreshCw size={14} className={`text-pink-400 ${refreshingCard === 'claimable' ? 'animate-spin' : ''}`} />
              </button>
              <Award size={16} className="text-cyan-400" />
            </div>
          </div>
          <div className="mb-3">
            {loading && !claimableStats ? (
              <SkeletonCard />
            ) : (
              <>
                <div className="text-3xl font-bold text-pink-400 mb-1">
                  {formatUSD(claimableStats?.overrideUsd || 0)}
                </div>
                <div className="text-sm text-cyan-300/70">
                  {formatRAMA(claimableStats?.overrideRama || 0)} RAMA
                </div>
                <div className="text-xs text-cyan-300/60 mt-2">
                  {claimableStats?.daysCount || 0} Days pending
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Override Details for Selected Day */}
      {todayStats && todayStats.overrideDetails.length > 0 && (
        <div className="cyber-glass rounded-xl p-6 border-2 border-neon-green">
          <div className="flex items-center gap-2 mb-4">
            <Award size={20} className="text-neon-green" />
            <h3 className="text-lg font-semibold text-neon-green">
              Override Breakdown - {formatDayId(selectedDay, 'medium')}
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {todayStats.overrideDetails.map((detail, idx) => (
              <div
                key={idx}
                className="cyber-glass border border-neon-green/30 rounded-lg p-4 hover:border-neon-green/60 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-neon-green uppercase">
                    {idx === 0 ? '1st' : idx === 1 ? '2nd' : idx === 2 ? '3rd' : `${idx + 1}th`} Achiever
                  </span>
                  <span className="text-xs bg-neon-green/20 text-neon-green px-2 py-0.5 rounded">
                    {idx === 0 ? '10%' : '5%'}
                  </span>
                </div>
                {detail?.achiever_address && (
                  <code className="text-[10px] text-cyan-300/70 block mb-2">
                    {detail.achiever_address.slice(0, 10)}...{detail.achiever_address.slice(-6)}
                  </code>
                )}
                <div className="text-lg font-bold text-neon-green">
                  {formatUSD(microUsdToUsd(detail?.income_micro_usd || 0))}
                </div>
                <div className="text-xs text-cyan-300/70">
                  {formatRAMA(weiToRama(detail?.income_rama_wei || '0'))} RAMA
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All-Time Override History */}
      <div className="cyber-glass rounded-xl p-6 border-2 border-cyan-500">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-cyan-400" />
            <h3 className="text-lg font-semibold text-cyan-300">
              All-Time Override Income History
            </h3>
          </div>
          {historicalData.length > 0 && (
            <span className="text-sm text-cyan-300/70">
              {historicalData.length} days with override income
            </span>
          )}
        </div>

        {/* Progress Bar */}
        {loadingProgress.percentage > 0 && loadingProgress.percentage < 100 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-cyan-300">Loading override history...</span>
              <span className="text-sm font-semibold text-neon-green">
                {loadingProgress.percentage}%
              </span>
            </div>
            <div className="w-full bg-dark-800 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-neon-green to-cyan-400 transition-all duration-300"
                style={{ width: `${loadingProgress.percentage}%` }}
              />
            </div>
            <p className="text-xs text-cyan-300/70 mt-1">
              {loadingProgress.current} / {loadingProgress.total} days processed
            </p>
          </div>
        )}

        {historicalData.length === 0 && !loadingProgress.percentage ? (
          <div className="text-center py-12">
            <Award size={48} className="text-cyan-400/30 mx-auto mb-3" />
            <p className="text-cyan-300/70">No override income history yet</p>
            <p className="text-sm text-cyan-300/50 mt-1">
              Override income appears when team members achieve your slab level
            </p>
          </div>
        ) : (
          <>
            {/* History Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-cyan-500/30">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-cyan-300">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-cyan-300">Day ID</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-cyan-300">Achievers</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-cyan-300">Override USD</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-cyan-300">Override RAMA</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedHistory.map((item, idx) => {
                    const overrideUsd = microUsdToUsd(item.data.override_income_usd || 0);
                    const overrideRama = weiToRama(item.data.override_income_rama_wei || '0');
                    const achieversCount = item.data.achievers_count || 0;

                    return (
                      <tr
                        key={item.dayId}
                        className="border-b border-cyan-500/10 hover:bg-cyan-500/5 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="text-sm text-cyan-300">
                            {formatDayId(item.dayId, 'medium')}
                          </div>
                          <div className="text-xs text-cyan-300/60">
                            {getRelativeDay(item.dayId)}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <code className="text-xs text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded">
                            {item.dayId}
                          </code>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Award size={14} className="text-neon-green" />
                            <span className="text-sm text-cyan-300">{achieversCount}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="text-sm font-semibold text-neon-green">
                            {formatUSD(overrideUsd)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="text-sm text-cyan-300">
                            {formatRAMA(overrideRama)}
                          </div>
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
                  {Math.min(currentPage * itemsPerPage, historicalData.length)} of{' '}
                  {historicalData.length} days
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
                              ? 'bg-neon-green text-dark-900 font-semibold'
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
      <div className="cyber-glass rounded-xl p-5 border border-neon-green/30">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-neon-green flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-neon-green mb-2">
              How Same-Slab Override Works
            </p>
            <ul className="text-xs text-cyan-300/90 space-y-1.5">
              <li>
                • <strong>1st Achiever:</strong> When the first person in your team reaches your slab level, you earn 10% of their ROI
              </li>
              <li>
                • <strong>2nd Achiever:</strong> Second person to reach your level = 5% of their ROI
              </li>
              <li>
                • <strong>3rd+ Achievers:</strong> All subsequent achievers = 5% of their ROI each
              </li>
              <li>
                • <strong>Daily Calculation:</strong> Override bonuses are calculated and distributed daily
              </li>
              <li>
                • <strong>No Limit:</strong> Unlimited achievers means unlimited override income potential
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SameSlabScreen;