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
  Calendar,
  Rocket,
  Shield,
  History,
  Timer,
  Award
} from 'lucide-react';
import { useStore } from '../../store/useUserInfoStore';
import NumberPopup from '../components/NumberPopup';
import Tooltip from '../components/Tooltip';
import { formatUSD, formatRAMA } from '../utils/contractData';

const defaultStats = {
  totalRewardsUsd: 0,
  totalRewardsRama: 0,
  pendingRewardsUsd: 0,
  pendingRewardsRama: 0,
  lastClaimTimestamp: null,
  nextClaimAvailable: null,
  portfolioCount: 0,
};

export default function AccruedRewards() {
  const [dashboard, setDashboard] = useState(null);
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('rewards');
  const [sortDir, setSortDir] = useState('desc');
  const [filterActive, setFilterActive] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [showHistory, setShowHistory] = useState(false);
  // Get functions from store
  const getAccruedRewardStats = useStore((s) => s.getAccruedRewardStats);
  const getPortfolioRewards = useStore((s) => s.getPortfolioRewards);
  const getPortfolioROI = useStore((s) => s.getPortfolioROI);
  const getAccruedROI = useStore((s) => s.getAccruedROI);
  const claimAccruedROI = useStore((s) => s.claimAccruedROI);
  const getFreezeInfo = useStore((s) => s.getFreezeInfo);
  const userAddress = useStore((s) => s.userAddress);
  const [claimingPortfolio, setClaimingPortfolio] = useState(null);

  // Wallet connection is managed by the app (Reown AppKit + WalletKit)
  // We rely on the `userAddress` from the global store which is synchronized
  // with the app kit session (see `WalletSessionManager` in `Approute.jsx`).

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
      // Wallet is provided by Reown AppKit; ensure store has an address
      if (!userAddress) {
        throw new Error('Please connect your wallet to view accrued rewards');
      }

      // Get basic portfolio data with retry mechanism
      let portfolioIds;
      try {
        portfolioIds = await getPortfolioRewards(userAddress);
      } catch (err) {
        console.warn('First attempt failed, retrying after delay...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        portfolioIds = await getPortfolioRewards(userAddress);
      }

      if (!portfolioIds || !Array.isArray(portfolioIds)) {
        throw new Error('Unable to fetch portfolio data. Please check your connection and try again.');
      }

      // Load detailed ROI data for each portfolio with individual error handling
      const portfolioPromises = portfolioIds.map(async (pid) => {
        try {
          const [roi, accrued, freezeInfo] = await Promise.all([
            getPortfolioROI(pid).catch(() => null),
            getAccruedROI(pid).catch(() => '0'),
            getFreezeInfo(pid).catch(() => [])
          ]);

          if (!roi) {
            console.warn(`Failed to load complete data for portfolio ${pid}`);
            return null;
          }

          const currentFreezeInterval = freezeInfo.find(
            interval => interval.endDay === 0 || interval.endDay * 86400 > Date.now() / 1000
          );

          return {
            portfolioId: pid,
            roi: {
              ...roi,
              accrued: accrued || '0',
              usdAmount: parseFloat(roi.credited) + parseFloat(accrued || '0'),
              ramaAmount: parseFloat(roi.credited) + parseFloat(accrued || '0'),
              meta: {
                roi: ((parseFloat(roi.credited) + parseFloat(accrued || '0')) / parseFloat(roi.principalUsd) * 100).toFixed(2),
                boosterActive: roi.boosterActive,
                boosterROI: parseFloat(roi.totalBoosterROI || '0'),
                tier: roi.tier,
                principalUsd: parseFloat(roi.principalUsd),
                isCapped: roi.isCapped,
                isClosed: roi.isClosed,
                capPct: roi.capPct,
                frozenUntil: currentFreezeInterval ? currentFreezeInterval.endDay * 86400 : 0
              }
            }
          };
        } catch (err) {
          console.error(`Failed to process portfolio ${pid}:`, err);
          return null;
        }
      });

      const portfoliosWithROI = (await Promise.all(portfolioPromises))
        .filter(Boolean); // Remove null entries

      // Calculate dashboard totals with safer math
      const dashboardData = portfoliosWithROI.reduce((acc, p) => {
        if (!p || !p.roi) return acc;
        
        try {
          // Handle claimed totals
          const usdAmount = parseFloat(p.roi.usdAmount || 0);
          const ramaAmount = parseFloat(p.roi.ramaAmount || 0);
          
          if (!isNaN(usdAmount)) acc.totals.claimed.usd += usdAmount;
          if (!isNaN(ramaAmount)) acc.totals.claimed.rama += ramaAmount;

          // Handle unclaimed totals
          if (!p.roi.meta.isClosed) {
            const unclaimedUsd = parseFloat(p.roi.accrued || 0);
            const unclaimedRama = parseFloat(p.roi.accrued || 0);
            
            if (!isNaN(unclaimedUsd)) acc.totals.unclaimed.usd += unclaimedUsd;
            if (!isNaN(unclaimedRama)) acc.totals.unclaimed.rama += unclaimedRama;
          }
        } catch (err) {
          console.warn('Failed to process portfolio totals:', err);
        }
        return acc;
      }, {
        totals: {
          claimed: { usd: 0, rama: 0 },
          unclaimed: { usd: 0, rama: 0 },
          periods: {
            count: portfoliosWithROI.filter(p => p && p.roi).length,
            from: Math.min(...portfoliosWithROI.filter(p => p && p.roi).map(p => p.roi.createdAt || 0)),
            last: Math.max(...portfoliosWithROI.filter(p => p && p.roi).map(p => p.roi.lastAccrual || 0))
          }
        }
      });

      setDashboard(dashboardData);
      setPortfolios(portfoliosWithROI.filter(p => p && p.roi));
    } catch (err) {
      console.error('Failed to load ROI data:', err);
      const errorMessage = err?.message || 'Failed to load ROI data';
      setError(
        errorMessage.includes('network') || errorMessage.includes('connect') ?
        'Please check your wallet connection and network' :
        errorMessage
      );
    } finally {
      setLoading(false);
    }
  }, [userAddress, getPortfolioRewards, getPortfolioROI, getAccruedROI, getFreezeInfo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    if (loading) return;
    loadData();
  };

  const filteredPortfolios = useMemo(() => {
    let result = [...portfolios];
    
    if (filterActive) {
      result = result.filter(p => p.pendingRewardsUsd > 0);
    }

    result.sort((a, b) => {
      const aValue = sortBy === 'rewards' ? a.pendingRewardsUsd : a.portfolioId;
      const bValue = sortBy === 'rewards' ? b.pendingRewardsUsd : b.portfolioId;
      return sortDir === 'desc' ? bValue - aValue : aValue - bValue;
    });

    return result;
  }, [portfolios, filterActive, sortBy, sortDir]);

  const handleClaim = useCallback(async (portfolioId) => {
    try {
      setClaimingPortfolio(portfolioId);
      
      // Get current accrued amount before claiming
      const accruedAmount = await getAccruedROI(portfolioId);
      if (parseFloat(accruedAmount) <= 0) {
        throw new Error('No rewards available to claim');
      }

      // Execute the claim transaction
      const tx = await claimAccruedROI(portfolioId);
      if (!tx?.status) {
        throw new Error('Transaction failed');
      }

      // Refresh data after successful claim
      await loadData();
    } catch (err) {
      console.error('Failed to claim ROI:', err);
      setError(err?.message || 'Failed to claim ROI');
    } finally {
      setClaimingPortfolio(null);
    }
  }, [getAccruedROI, claimAccruedROI, loadData]);

  const handleDownloadCSV = useCallback(() => {
    const headers = ['Portfolio ID', 'Total ROI (USD)', 'Booster ROI (USD)', 'Status', 'Last Update'];
    const rows = portfolios.map(p => [
      p.portfolioId,
      p.roi?.usdAmount || 0,
      p.roi?.meta?.totalBoosterROI || 0,
      p.roi?.meta?.isClosed ? 'Closed' : p.roi?.meta?.isCapped ? 'Capped' : 'Active',
      new Date(p.roi?.meta?.lastUpdate * 1000).toISOString()
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accrued-rewards-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, [portfolios]);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green">
            Accrued Rewards
          </h1>
          <p className="text-cyan-300/80 mt-1">
            Track and manage your portfolio rewards across all investments
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
            onClick={handleDownloadCSV}
            className="px-3 py-2 text-xs font-semibold rounded-lg border border-cyan-500/40 text-cyan-200 transition-colors hover:bg-cyan-500/10"
          >
            <span className="flex items-center gap-2">
              <Download size={16} />
              <span>Export CSV</span>
            </span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-4 flex items-start gap-3">
          <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}

      {/* Stats Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Claimed ROI */}
        <div className="cyber-glass rounded-xl border border-cyan-500/30 p-4 space-y-2">
          <div className="flex items-center gap-2 text-cyan-300/70">
            <Coins size={18} />
            <span className="text-xs uppercase tracking-wide">Total Claimed ROI</span>
          </div>
          <NumberPopup
            value={dashboard?.totals?.claimed?.usd || 0}
            formatter={formatUSD}
            className="text-2xl font-bold text-cyan-100"
          />
          <p className="text-xs text-cyan-300/60">
            {formatRAMA(dashboard?.totals?.claimed?.rama || 0)} RAMA
          </p>
        </div>

        {/* Unclaimed ROI */}
        <div className="cyber-glass rounded-xl border border-emerald-500/30 p-4 space-y-2">
          <div className="flex items-center gap-2 text-emerald-300/70">
            <TrendingUp size={18} />
            <span className="text-xs uppercase tracking-wide">Unclaimed ROI</span>
          </div>
          <NumberPopup
            value={dashboard?.totals?.unclaimed?.usd || 0}
            formatter={formatUSD}
            className="text-2xl font-bold text-emerald-400"
          />
          <p className="text-xs text-emerald-300/60">
            {formatRAMA(dashboard?.totals?.unclaimed?.rama || 0)} RAMA
          </p>
        </div>

        {/* Active Boosters */}
        <div className="cyber-glass rounded-xl border border-purple-500/30 p-4 space-y-2">
          <div className="flex items-center gap-2 text-purple-300/70">
            <Rocket size={18} />
            <span className="text-xs uppercase tracking-wide">Active Boosters</span>
          </div>
          <div className="text-2xl font-bold text-purple-400">
            {portfolios.filter(p => p.meta?.booster).length}
          </div>
          <p className="text-xs text-purple-300/60">
            Total Boost ROI: {formatUSD(portfolios.reduce((sum, p) => sum + (p.meta?.totalBoosterROI || 0), 0))}
          </p>
        </div>

        {/* Epochs */}
        <div className="cyber-glass rounded-xl border border-amber-500/30 p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-300/70">
            <Timer size={18} />
            <span className="text-xs uppercase tracking-wide">Current Epoch</span>
          </div>
          <div className="text-2xl font-bold text-amber-400">
            {dashboard?.totals?.periods?.count || 0}
          </div>
          <p className="text-xs text-amber-300/60">
            Period {dashboard?.totals?.periods?.from || 0} - {dashboard?.totals?.periods?.last || 0}
          </p>
        </div>

        <div className="cyber-glass rounded-xl border border-cyan-500/30 p-4 space-y-2">
          <div className="flex items-center gap-2 text-cyan-300/70">
            <Clock size={18} />
            <span className="text-xs uppercase tracking-wide">Last Claim</span>
          </div>
          <p className="text-2xl font-bold text-cyan-100">
            {dashboard?.totals?.periods?.last
              ? new Date(dashboard.totals.periods.last * 1000).toLocaleDateString()
              : '—'}
          </p>
          <p className="text-xs text-cyan-300/60">
            {portfolios.some(p => parseFloat(p.roi?.accrued) > 0)
              ? 'Rewards available to claim'
              : 'No pending rewards'}
          </p>
        </div>

        <div className="cyber-glass rounded-xl border border-cyan-500/30 p-4 space-y-2">
          <div className="flex items-center gap-2 text-cyan-300/70">
            <TrendingUp size={18} />
            <span className="text-xs uppercase tracking-wide">Active Portfolios</span>
          </div>
          <p className="text-2xl font-bold text-cyan-100">
            {portfolios.filter(p => !p.roi?.meta?.isClosed).length}
          </p>
          <p className="text-xs text-cyan-300/60">
            {portfolios.filter(p => parseFloat(p.roi?.accrued) > 0).length} with pending rewards
          </p>
        </div>
      </div>

      {/* Portfolio Rewards Table */}
      <div className="cyber-glass rounded-xl border border-cyan-500/30 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-semibold text-cyan-100">Portfolio Rewards</h2>
          
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFilterActive(!filterActive)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                filterActive
                  ? 'border-emerald-500/50 text-emerald-300 bg-emerald-500/10'
                  : 'border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10'
              }`}
            >
              <span className="flex items-center gap-2">
                <Filter size={16} />
                <span>Pending Only</span>
              </span>
            </button>

            <div className="relative">
              <button
                onClick={() => setSortDir(sortDir === 'desc' ? 'asc' : 'desc')}
                className="px-3 py-2 text-xs font-semibold rounded-lg border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10"
              >
                <span className="flex items-center gap-2">
                  <span>Sort by {sortBy === 'rewards' ? 'Rewards' : 'Portfolio ID'}</span>
                  <ChevronDown
                    size={16}
                    className={`transform transition-transform ${
                      sortDir === 'desc' ? 'rotate-180' : ''
                    }`}
                  />
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cyan-500/20">
                <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-cyan-300/70">
                  Portfolio
                </th>
                <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-cyan-300/70">
                  ROI
                </th>
                <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-cyan-300/70">
                  Period Info
                </th>
                <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-cyan-300/70">
                  Status
                </th>
                <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-cyan-300/70">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-500/20">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center">
                    <Loader2 size={24} className="animate-spin mx-auto text-cyan-400" />
                  </td>
                </tr>
              ) : filteredPortfolios.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-cyan-300/70">
                    No portfolio rewards found
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
                            #{portfolio.portfolioId.toString().padStart(4, '0')}
                          </span>
                          {portfolio.roi?.meta?.tier > 0 && (
                            <span className="px-1.5 py-0.5 text-xs bg-cyan-500/10 text-cyan-300 rounded">
                              Tier {portfolio.roi.meta.tier}
                            </span>
                          )}
                        </div>
                        {portfolio.roi?.meta?.strategy && (
                          <span className="text-xs text-cyan-300/60 mt-1">
                            {portfolio.roi.meta.strategy}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2 justify-end">
                          <NumberPopup
                            value={portfolio.roi?.usdAmount || 0}
                            formatter={formatUSD}
                            className="text-cyan-100"
                          />
                          {portfolio.roi?.meta?.roi && (
                            <span className="text-xs px-2 py-0.5 bg-cyan-500/10 text-cyan-300 rounded">
                              {portfolio.roi.meta.roi}%
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-cyan-300/60">
                          {formatRAMA(portfolio.roi?.ramaAmount || 0)} RAMA
                        </div>
                        {portfolio.roi?.meta?.principalUsd > 0 && (
                          <div className="flex items-center gap-1 text-xs text-cyan-300/40 mt-1">
                            <span>Principal:</span>
                            <NumberPopup
                              value={portfolio.roi.meta.principalUsd}
                              formatter={formatUSD}
                              className="text-cyan-300/60"
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-cyan-100">
                            {portfolio.roi?.meta?.startPeriod || '—'}
                          </span>
                          {portfolio.roi?.meta?.periodCount > 0 && (
                            <span className="text-xs px-2 py-0.5 bg-cyan-500/10 text-cyan-300 rounded">
                              {portfolio.roi.meta.periodCount} {portfolio.roi.meta.periodCount === 1 ? 'Period' : 'Periods'}
                            </span>
                          )}
                        </div>
                        {portfolio.roi?.meta?.nextPeriod && (
                          <div className="text-xs text-cyan-300/60">
                            Next: Period {portfolio.roi.meta.nextPeriod}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex flex-wrap justify-end gap-1">
                          {portfolio.roi?.meta?.isClosed && (
                            <div className="text-xs px-2 py-0.5 bg-red-500/20 text-red-300 rounded-full">
                              Closed
                            </div>
                          )}
                          {portfolio.roi?.meta?.isCapped && (
                            <div className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-300 rounded-full">
                              Capped
                            </div>
                          )}
                          {!portfolio.roi?.meta?.isClosed && !portfolio.roi?.meta?.isCapped && (
                            <div className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full">
                              Active
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-cyan-300/60">
                          <span>{portfolio.roi?.epochCount || 0} Epochs</span>
                          {portfolio.roi?.meta?.boosterActive && (
                            <div className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full flex items-center gap-1">
                              <Rocket size={12} />
                              <span>Boosted</span>
                            </div>
                          )}
                        </div>
                        {portfolio.roi?.meta?.frozenUntil > Date.now() / 1000 ? (
                          <Tooltip content={new Date(portfolio.roi.meta.frozenUntil * 1000).toLocaleString()}>
                            <div className="text-xs text-cyan-300/60 flex items-center gap-1">
                              <Timer size={12} />
                              <span>Frozen</span>
                            </div>
                          </Tooltip>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex flex-col items-end gap-2">
                        {portfolio.roi?.usdAmount > 0 && !portfolio.roi?.meta?.frozenUntil && (
                          <button
                            onClick={() => handleClaim(portfolio.portfolioId)}
                            disabled={claimingPortfolio === portfolio.portfolioId}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 
                                     text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {claimingPortfolio === portfolio.portfolioId ? (
                              <span className="flex items-center gap-2">
                                <Loader2 className="animate-spin" size={12} />
                                <span>Claiming...</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-2">
                                <Coins size={12} />
                                <span>Claim ROI</span>
                              </span>
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => handleViewDetails(portfolio.portfolioId)}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-cyan-500/30 
                                   hover:border-cyan-500 text-cyan-300 transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <History size={12} />
                            <span>History</span>
                          </span>
                        </button>
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
  );
}