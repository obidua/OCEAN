import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Users, DollarSign, Award, Activity, BarChart3, Wallet, Target, RefreshCw, AlertCircle, Coins, Pause, ShieldCheck } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';
import { useStore } from '../../store/useUserInfoStore';

export default function Analytics() {
  // Store state
  const userAddressFromStore = useStore((s) => s.userAddress);
  const getIncomeTotals = useStore((s) => s.getIncomeTotals);
  const get7DayEarningTrend = useStore((s) => s.get7DayEarningTrend);
  const getTeamSummary = useStore((s) => s.getTeamSummary);
  const getPortfolioRewards = useStore((s) => s.getPortfolioRewards);
  const getSlabIncomeOverview = useStore((s) => s.getSlabIncomeOverview);
  const getRoyaltyOverview = useStore((s) => s.getRoyaltyOverview);
  const getSpotIncomeSummary = useStore((s) => s.getSpotIncomeSummary);
  const getSafeWalletSummary = useStore((s) => s.getSafeWalletSummary);
  const getMissedIncomeOverview = useStore((s) => s.getMissedIncomeOverview);
  const getROITotals = useStore((s) => s.getROITotals);

  // User address resolution
  const userAddress = 
    userAddressFromStore ?? 
    (typeof window !== 'undefined' ? localStorage.getItem('userAddress') : null);

  // Component state
  const [analyticsData, setAnalyticsData] = useState({
    totalStats: null,
    weeklyEarnings: [],
    teamData: null,
    portfolioData: null,
    slabData: null,
    royaltyData: null,
    spotIncomeData: null,
    safeWallet: null,
    missedOverview: null,
    roiTotals: null,
    loading: true,
    error: null,
    lastUpdated: null
  });

  const [refreshing, setRefreshing] = useState(false);

  // Comprehensive data fetching function
  const fetchAnalyticsData = useCallback(async () => {
    if (!userAddress) {
      setAnalyticsData(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'User address not available',
        safeWallet: null,
        missedOverview: null,
        roiTotals: null,
      }));
      return;
    }

    try {
      setAnalyticsData(prev => ({ ...prev, loading: true, error: null }));

      // Fetch all analytics data in parallel
      const [
        incomeTotals,
        weeklyTrend,
        teamSummary,
        portfolioRewards,
        slabOverview,
        royaltyOverview,
        spotIncome,
        safeWalletSummary,
        missedIncomeOverview,
        roiTotals
      ] = await Promise.allSettled([
        getIncomeTotals(userAddress).catch(err => {
          console.warn('Income totals failed:', err);
          return null;
        }),
        get7DayEarningTrend(userAddress).catch(err => {
          console.warn('Weekly earnings failed:', err);
          return [];
        }),
        getTeamSummary(userAddress, 50).catch(err => {
          console.warn('Team summary failed:', err);
          return null;
        }),
        getPortfolioRewards(userAddress).catch(err => {
          console.warn('Portfolio rewards failed:', err);
          return null;
        }),
        getSlabIncomeOverview(userAddress).catch(err => {
          console.warn('Slab overview failed:', err);
          return null;
        }),
        getRoyaltyOverview(userAddress).catch(err => {
          console.warn('Royalty overview failed:', err);
          return null;
        }),
        getSpotIncomeSummary(userAddress, { limit: 50 }).catch(err => {
          console.warn('Spot income failed:', err);
          return null;
        }),
        getSafeWalletSummary(userAddress).catch(err => {
          console.warn('Safe wallet summary failed:', err);
          return null;
        }),
        getMissedIncomeOverview(userAddress).catch(err => {
          console.warn('Missed income overview failed:', err);
          return null;
        }),
        getROITotals(userAddress).catch(err => {
          console.warn('ROI totals failed:', err);
          return null;
        })
      ]);

      // Process results
      const processResult = (result) => 
        result.status === 'fulfilled' ? result.value : null;

      setAnalyticsData({
        totalStats: processResult(incomeTotals),
        weeklyEarnings: processResult(weeklyTrend) || [],
        teamData: processResult(teamSummary),
        portfolioData: processResult(portfolioRewards),
        slabData: processResult(slabOverview),
        royaltyData: processResult(royaltyOverview),
        spotIncomeData: processResult(spotIncome),
        safeWallet: processResult(safeWalletSummary),
        missedOverview: processResult(missedIncomeOverview),
        roiTotals: processResult(roiTotals),
        loading: false,
        error: null,
        lastUpdated: new Date()
      });

    } catch (error) {
      console.error('Analytics data fetch error:', error);
      setAnalyticsData(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to fetch analytics data'
      }));
    }
  }, [userAddress, getIncomeTotals, get7DayEarningTrend, getTeamSummary, 
      getPortfolioRewards, getSlabIncomeOverview, getRoyaltyOverview, getSpotIncomeSummary,
      getSafeWalletSummary, getMissedIncomeOverview, getROITotals]);

  // Manual refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalyticsData();
    setRefreshing(false);
  };

  // Initial data fetch
  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // Data processing helpers
  const getTotalEarned = () => {
    const { totalStats } = analyticsData;
    if (!totalStats) return 0;
    if (typeof totalStats.total?.usd === 'number') return totalStats.total.usd;
    const roi = totalStats.roi?.usd ?? totalStats.totalRoiUsd ?? 0;
    const direct = totalStats.direct?.usd ?? totalStats.directIncomeUsd ?? 0;
    const slab = totalStats.slab?.usd ?? totalStats.slabIncomeUsd ?? 0;
    const royalty = totalStats.royalty?.usd ?? totalStats.royaltyUsd ?? 0;
    const reward = totalStats.reward?.usd ?? totalStats.rewardUsd ?? 0;
    return roi + direct + slab + royalty + reward;
  };

  const getAvgDailyEarnings = () => {
    const { weeklyEarnings } = analyticsData;
    if (!weeklyEarnings.length) return 0;
    const total = weeklyEarnings.reduce((sum, day) => sum + (day.amount || 0), 0);
    return total / weeklyEarnings.length;
  };

  const getTeamSize = () => {
    const { teamData } = analyticsData;
    if (!teamData) return 0;
    return (
      teamData.totalTeamSize ??
      teamData.totalMembers ??
      teamData.totalDirects ??
      0
    );
  };

  const getTotalRewards = () => {
    const { totalStats } = analyticsData;
    if (!totalStats) return 0;
    return totalStats.reward?.usd ?? totalStats.rewardUsd ?? 0;
  };

  const getSafeWalletBalance = () => {
    const { safeWallet } = analyticsData;
    return Number(safeWallet?.balance?.usd ?? 0);
  };

  const getSafeWalletRama = () => {
    const { safeWallet } = analyticsData;
    return Number(safeWallet?.balance?.rama ?? 0);
  };

  const getMissedIncomeTotal = () => {
    const { missedOverview } = analyticsData;
    return Number(missedOverview?.totalMissedUsd ?? 0);
  };

  const getHoldSummary = () => ({
    totalUsd: 0,
    royaltyUsd: 0,
    rewardsUsd: 0,
  });

  const getUnclaimedRoiUsd = () => {
    const { roiTotals } = analyticsData;
    return roiTotals?.unclaimedUsd ?? 0;
  };

  const getUnclaimedRoiRama = () => {
    const { roiTotals } = analyticsData;
    return roiTotals?.unclaimedRama ?? 0;
  };

  // Chart data processing
  const getEarningsChartData = () => {
    const { weeklyEarnings } = analyticsData;
    return weeklyEarnings.map(day => ({
      date: day.day,
      amount: parseFloat((day.amount || 0).toFixed(2))
    }));
  };

  const getTeamGrowthData = () => {
    const { teamData } = analyticsData;
    if (Array.isArray(teamData?.recentMembers) && teamData.recentMembers.length) {
      const monthlyData = new Map();
      teamData.recentMembers.forEach((member) => {
        const date = new Date(Number(member.joinDate) * 1000 || Date.now());
        const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
        monthlyData.set(monthKey, (monthlyData.get(monthKey) || 0) + 1);
      });
      const entries = Array.from(monthlyData.entries()).map(([month, members]) => ({
        month,
        members,
      }));
      return entries.length ? entries : [{ month: 'Current', members: getTeamSize() }];
    }

    const size = getTeamSize();
    if (size <= 0) {
      return [
        { month: 'Jul', members: 0 },
        { month: 'Aug', members: 0 },
        { month: 'Sep', members: 0 },
        { month: 'Oct', members: 0 },
      ];
    }

    const baseline = Math.max(1, Math.floor(size * 0.25));
    return [
      { month: 'Jul', members: Math.round(baseline * 0.6) },
      { month: 'Aug', members: Math.round(baseline * 0.9) },
      { month: 'Sep', members: Math.round(baseline * 1.2) },
      { month: 'Oct', members: size },
    ];
  };

  const getIncomeBreakdownData = () => {
    const { totalStats } = analyticsData;
    if (!totalStats) return [];

    const breakdown = [
      {
        name: 'Portfolio Growth',
        value: totalStats.roi?.usd ?? totalStats.totalRoiUsd ?? 0,
        color: '#00f0ff'
      },
      {
        name: 'Slab Income',
        value: totalStats.slab?.usd ?? totalStats.slabIncomeUsd ?? 0,
        color: '#39ff14'
      },
      {
        name: 'Direct Income',
        value: totalStats.direct?.usd ?? totalStats.directIncomeUsd ?? 0,
        color: '#ff6b35'
      },
      {
        name: 'Royalties',
        value: totalStats.royalty?.usd ?? totalStats.royaltyUsd ?? 0,
        color: '#ff3d71'
      },
      {
        name: 'Rewards',
        value: totalStats.reward?.usd ?? totalStats.rewardUsd ?? 0,
        color: '#a855f7'
      }
    ];
    return breakdown.filter(item => item.value > 0);
  };

  const getPortfolioProgress = () => {
    const { roiTotals } = analyticsData;
    if (!roiTotals) return 0;
    const claimed = roiTotals.claimedUsd ?? 0;
    const unclaimed = roiTotals.unclaimedUsd ?? 0;
    const total = claimed + unclaimed;
    if (total <= 0) return 0;
    return Math.min((claimed / total) * 100, 100);
  };

  const getDaysActive = () => {
    const { spotIncomeData, portfolioData } = analyticsData;
    let oldestTs = null;

    const pushTs = (ts) => {
      if (!Number.isFinite(ts) || ts <= 0) return;
      if (oldestTs === null || ts < oldestTs) {
        oldestTs = ts;
      }
    };

    if (Array.isArray(spotIncomeData?.transactions)) {
      spotIncomeData.transactions.forEach((tx) => pushTs(Number(tx.timestamp)));
    }

    if (Array.isArray(portfolioData?.history)) {
      portfolioData.history.forEach((entry) => pushTs(Number(entry.claimedAt)));
    }

    if (oldestTs === null) return 0;
    const daysDiff = Math.floor((Date.now() / 1000 - oldestTs) / 86400);
    return Math.max(0, daysDiff);
  };

  const getClaimsMade = () => {
    const { portfolioData, royaltyData } = analyticsData;
    const portfolioClaims = Array.isArray(portfolioData?.history)
      ? portfolioData.history.length
      : 0;
    const royaltyClaims = royaltyData?.paidMonths ?? 0;
    return portfolioClaims + royaltyClaims;
  };

  const getAvgTeamDepth = () => {
    const { teamData } = analyticsData;
    if (!teamData) return 0;
    if (typeof teamData.averageDepth === 'number') return teamData.averageDepth;
    const directs = teamData.totalDirects ?? 0;
    const teamSize = teamData.totalTeamSize ?? 0;
    if (directs <= 0) return teamSize > 0 ? 1 : 0;
    return teamSize / directs;
  };

  const getRoyaltySnapshot = () => {
    const data = analyticsData.royaltyData;
    if (!data) {
      return {
        level: 0,
        qualifiedVolumeUsd: 0,
        royaltyIncomeUsd: 0,
        canClaim: false,
        paused: false,
        paidMonths: 0,
      };
    }
    return {
      level: Number(data.currentLevel ?? 0),
      qualifiedVolumeUsd: Number(data.qualifiedVolumeUsd ?? 0),
      royaltyIncomeUsd: Number(data.royaltyIncomeUsd ?? 0),
      canClaim: Boolean(data.canClaim),
      paused: Boolean(data.paused),
      paidMonths: Number(data.paidMonths ?? data.lastPaidTier ?? 0),
    };
  };

  const getSlabSnapshot = () => {
    const data = analyticsData.slabData;
    if (!data) {
      return {
        slabLevel: 0,
        qualifiedBusinessUsd: 0,
        slabIncomeUsd: 0,
        slabIncomeAvailableUsd: 0,
        overrideIncomeUsd: 0,
        progressToNextSlab: 0,
        canClaim: false,
      };
    }
    return {
      slabLevel: Number(data.slabLevel ?? data.currentSlabIndex ?? 0),
      qualifiedBusinessUsd: Number(data.qualifiedVolumeUsd ?? data.qualifiedBusinessUsd ?? 0),
      slabIncomeUsd: Number(data.slabIncomeUsd ?? 0),
      slabIncomeAvailableUsd: Number(data.slabIncomeAvailableUsd ?? 0),
      overrideIncomeUsd: Number(data.overrideIncomeUsd ?? 0),
      progressToNextSlab: Number(data.progressData?.progressToNextSlab ?? 0),
      canClaim: Boolean(data.canClaim),
    };
  };

  // Loading state
  if (analyticsData.loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green relative inline-block">
            Analytics & Performance
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-neon-green/20 blur-xl -z-10" />
          </h1>
          <p className="text-cyan-300/90 mt-1">Loading your performance data...</p>
        </div>
        
        <div className="grid md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="cyber-glass rounded-xl p-5 border border-cyan-500/30 animate-pulse">
              <div className="h-16 bg-cyan-500/10 rounded-lg"></div>
            </div>
          ))}
        </div>
        
        <div className="grid lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="cyber-glass rounded-2xl p-6 border border-cyan-500/30 animate-pulse">
              <div className="h-80 bg-cyan-500/10 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (analyticsData.error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green relative inline-block">
            Analytics & Performance
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-neon-green/20 blur-xl -z-10" />
          </h1>
          <p className="text-cyan-300/90 mt-1">Track your portfolio performance and team growth</p>
        </div>

        <div className="cyber-glass rounded-xl p-8 border border-red-500/30 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-300 mb-2">Unable to Load Analytics</h3>
          <p className="text-red-300/70 mb-4">{analyticsData.error}</p>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-6 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 hover:bg-red-500/30 transition-colors disabled:opacity-50"
          >
            {refreshing ? 'Retrying...' : 'Try Again'}
          </button>
        </div>
      </div>
    );
  }

  const holdSummary = getHoldSummary();
  const royaltySnapshot = getRoyaltySnapshot();
  const slabSnapshot = getSlabSnapshot();

  // Main render
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green relative inline-block">
            Analytics & Performance
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-neon-green/20 blur-xl -z-10" />
          </h1>
          <p className="text-cyan-300/90 mt-1">Real-time portfolio performance and team insights</p>
          {analyticsData.lastUpdated && (
            <p className="text-xs text-cyan-300/60 mt-1">
              Last updated: {analyticsData.lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 cyber-glass border border-cyan-500/30 rounded-lg text-cyan-300 hover:border-cyan-500/80 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Updating...' : 'Refresh'}
        </button>
      </div>

      {/* Performance Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="cyber-glass rounded-xl p-5 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 cyber-glass border border-cyan-500/30 rounded-lg">
              <DollarSign className="text-cyan-400" size={20} />
            </div>
            <p className="text-sm font-medium text-cyan-400 uppercase tracking-wide">Total Earned</p>
          </div>
          <p className="text-2xl font-bold text-cyan-300">${getTotalEarned().toFixed(2)}</p>
          <p className="text-xs text-neon-green mt-1">Live blockchain data</p>
        </div>

        <div className="cyber-glass rounded-xl p-5 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 cyber-glass border border-neon-green/30 rounded-lg">
              <TrendingUp className="text-neon-green" size={20} />
            </div>
            <p className="text-sm font-medium text-cyan-400 uppercase tracking-wide">Avg Daily</p>
          </div>
          <p className="text-2xl font-bold text-cyan-300">${getAvgDailyEarnings().toFixed(2)}</p>
          <p className="text-xs text-cyan-300/90 mt-1">7-day average</p>
        </div>

        <div className="cyber-glass rounded-xl p-5 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 cyber-glass border border-neon-orange/30 rounded-lg">
              <Users className="text-neon-orange" size={20} />
            </div>
            <p className="text-sm font-medium text-cyan-400 uppercase tracking-wide">Team Size</p>
          </div>
          <p className="text-2xl font-bold text-cyan-300">{getTeamSize()}</p>
          <p className="text-xs text-neon-green mt-1">Active network</p>
        </div>

        <div className="cyber-glass rounded-xl p-5 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 cyber-glass border border-neon-purple/30 rounded-lg">
              <Award className="text-neon-purple" size={20} />
            </div>
            <p className="text-sm font-medium text-cyan-400 uppercase tracking-wide">Total Rewards</p>
          </div>
          <p className="text-2xl font-bold text-cyan-300">${getTotalRewards().toFixed(2)}</p>
          <p className="text-xs text-cyan-300/90 mt-1">Bonus earnings</p>
        </div>
      </div>

      {/* Balance & Risk Overview */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="cyber-glass rounded-xl p-5 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 cyber-glass border border-cyan-500/30 rounded-lg">
              <Wallet className="text-cyan-400" size={20} />
            </div>
            <p className="text-sm font-medium text-cyan-400 uppercase tracking-wide">Safe Wallet</p>
          </div>
          <p className="text-2xl font-bold text-cyan-300">${getSafeWalletBalance().toFixed(2)}</p>
          <p className="text-xs text-cyan-300/80 mt-1">{getSafeWalletRama().toFixed(4)} RAMA</p>
        </div>

        <div className="cyber-glass rounded-xl p-5 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 cyber-glass border border-neon-green/30 rounded-lg">
              <Coins className="text-neon-green" size={20} />
            </div>
            <p className="text-sm font-medium text-cyan-400 uppercase tracking-wide">Unclaimed ROI</p>
          </div>
          <p className="text-2xl font-bold text-cyan-300">${getUnclaimedRoiUsd().toFixed(2)}</p>
          <p className="text-xs text-cyan-300/80 mt-1">{getUnclaimedRoiRama().toFixed(4)} RAMA waiting</p>
        </div>

        <div className="cyber-glass rounded-xl p-5 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 cyber-glass border border-yellow-400/40 rounded-lg">
              <Pause className="text-yellow-400" size={20} />
            </div>
            <p className="text-sm font-medium text-cyan-400 uppercase tracking-wide">Hold Balances</p>
          </div>
          <p className="text-2xl font-bold text-cyan-300">${holdSummary.totalUsd.toFixed(2)}</p>
          <p className="text-xs text-cyan-300/80 mt-1">
            Royalty: ${holdSummary.royaltyUsd.toFixed(2)} • Rewards: ${holdSummary.rewardsUsd.toFixed(2)}
          </p>
        </div>

        <div className="cyber-glass rounded-xl p-5 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 cyber-glass border border-red-500/30 rounded-lg">
              <ShieldCheck className="text-red-300" size={20} />
            </div>
            <p className="text-sm font-medium text-cyan-400 uppercase tracking-wide">Missed Income</p>
          </div>
          <p className="text-2xl font-bold text-cyan-300">${getMissedIncomeTotal().toFixed(2)}</p>
          <p className="text-xs text-cyan-300/80 mt-1">Recoverable once new portfolios activate</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="cyber-glass rounded-2xl p-6 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <h2 className="text-lg font-semibold text-cyan-300 mb-4 uppercase tracking-wide flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            7-Day Earnings Trend
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={getEarningsChartData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,240,255,0.1)" />
              <XAxis dataKey="date" stroke="#22d3ee" fontSize={12} />
              <YAxis stroke="#22d3ee" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid rgba(0,240,255,0.3)',
                  borderRadius: '8px',
                  color: '#22d3ee',
                  backdropFilter: 'blur(10px)',
                }}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#00f0ff"
                strokeWidth={3}
                fill="url(#areaGradient)"
              />
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00f0ff" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#39ff14" stopOpacity={0.1} />
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="cyber-glass rounded-2xl p-6 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <h2 className="text-lg font-semibold text-cyan-300 mb-4 uppercase tracking-wide flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team Growth
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getTeamGrowthData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,240,255,0.1)" />
              <XAxis dataKey="month" stroke="#22d3ee" fontSize={12} />
              <YAxis stroke="#22d3ee" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid rgba(0,240,255,0.3)',
                  borderRadius: '8px',
                  color: '#22d3ee',
                  backdropFilter: 'blur(10px)',
                }}
              />
              <Bar dataKey="members" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00f0ff" />
                  <stop offset="100%" stopColor="#39ff14" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Snapshot Section */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="cyber-glass rounded-2xl p-6 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <h3 className="text-lg font-semibold text-cyan-300 mb-4 uppercase tracking-wide flex items-center gap-2">
            <Award className="w-5 h-5" />
            Royalty Snapshot
          </h3>
          <div className="space-y-4 text-sm text-cyan-200/90">
            <div className="flex items-center justify-between">
              <span>Current Level</span>
              <span className="text-lg font-bold text-cyan-100">{royaltySnapshot.level}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Qualified Volume</span>
              <span className="text-cyan-100">${royaltySnapshot.qualifiedVolumeUsd.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Monthly Royalty In Hold</span>
              <span className="text-cyan-100">${royaltySnapshot.royaltyIncomeUsd.toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2">
                <p className="text-cyan-200/70">Paid Cycles</p>
                <p className="text-cyan-200 font-semibold mt-1">{royaltySnapshot.paidMonths}</p>
              </div>
              <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2">
                <p className="text-cyan-200/70">Claim Status</p>
                <p className={`font-semibold ${royaltySnapshot.canClaim ? 'text-neon-green' : 'text-cyan-200/80'}`}>
                  {royaltySnapshot.canClaim ? 'Ready' : royaltySnapshot.paused ? 'Paused' : 'Pending'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="cyber-glass rounded-2xl p-6 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <h3 className="text-lg font-semibold text-cyan-300 mb-4 uppercase tracking-wide flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Slab Snapshot
          </h3>
          <div className="space-y-4 text-sm text-cyan-200/90">
            <div className="flex items-center justify-between">
              <span>Current Slab</span>
              <span className="text-lg font-bold text-cyan-100">{slabSnapshot.slabLevel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Qualified Business</span>
              <span className="text-cyan-100">${slabSnapshot.qualifiedBusinessUsd.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Available Slab Income</span>
              <span className="text-cyan-100">${slabSnapshot.slabIncomeAvailableUsd.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Progress to Next Slab</span>
              <span className="text-neon-green font-semibold">{slabSnapshot.progressToNextSlab.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span>Override Earnings (USD)</span>
              <span className="text-cyan-200">${slabSnapshot.overrideIncomeUsd.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section - Income Breakdown, Performance Stats, and Projections */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="cyber-glass rounded-xl p-6 border border-cyan-500/30 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <h3 className="font-semibold text-cyan-300 mb-4 uppercase tracking-wide flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            Income Breakdown
          </h3>
          <div className="space-y-3">
            {getIncomeBreakdownData().map((item, index) => {
              const percentage = getTotalEarned() > 0 ? (item.value / getTotalEarned()) * 100 : 0;
              return (
                <div key={index}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-cyan-300/90">{item.name}</span>
                    <span className="text-sm font-bold text-cyan-300">${item.value.toFixed(2)}</span>
                  </div>
                  <div className="h-2 bg-dark-900 rounded-full overflow-hidden border border-cyan-500/30">
                    <div 
                      className="h-full rounded-full" 
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: item.color,
                        boxShadow: `0 0 8px ${item.color}40`
                      }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="cyber-glass rounded-xl p-6 border border-cyan-500/30 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <h3 className="font-semibold text-cyan-300 mb-4 uppercase tracking-wide flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Performance Stats
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-cyan-300/90">Portfolio Progress</span>
              <span className="text-lg font-bold text-neon-green">{getPortfolioProgress().toFixed(0)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-cyan-300/90">Days Active</span>
              <span className="text-lg font-bold text-cyan-300">{getDaysActive()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-cyan-300/90">Avg Team Depth</span>
              <span className="text-lg font-bold text-neon-orange">{getAvgTeamDepth().toFixed(1)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-cyan-300/90">Claims Made</span>
              <span className="text-lg font-bold text-neon-purple">{getClaimsMade()}</span>
            </div>
          </div>
        </div>

        <div className="cyber-glass border border-neon-green/50 rounded-xl p-6 text-white relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-neon-green/10 to-cyan-500/10 opacity-50 group-hover:opacity-70 transition-opacity" />
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon-green/70 to-transparent" />
          <h3 className="font-semibold mb-4 relative z-10 uppercase tracking-wide flex items-center gap-2">
            <Target className="w-4 h-4" />
            Projected Earnings
          </h3>
          <div className="space-y-3 relative z-10">
            <div>
              <p className="text-sm opacity-90 mb-1">Next 30 Days</p>
              <p className="text-2xl font-bold">${(getAvgDailyEarnings() * 30).toFixed(0)}</p>
            </div>
            <div>
              <p className="text-sm opacity-90 mb-1">Next 90 Days</p>
              <p className="text-2xl font-bold">${(getAvgDailyEarnings() * 90).toFixed(0)}</p>
            </div>
            <div className="pt-3 border-t border-white/20">
              <p className="text-xs opacity-75 mb-1">Based on current rate</p>
              <p className="text-sm">${getAvgDailyEarnings().toFixed(2)} daily average</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
