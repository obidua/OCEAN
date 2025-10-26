import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Users, DollarSign, Award, Activity, BarChart3, Wallet, Target, RefreshCw, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
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
        error: 'User address not available' 
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
        spotIncome
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
      getPortfolioRewards, getSlabIncomeOverview, getRoyaltyOverview, getSpotIncomeSummary]);

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
    return totalStats.allIncomesUsd || 
           (totalStats.totalRoiUsd + totalStats.directIncomeUsd + 
            totalStats.slabIncomeUsd + totalStats.royaltyUsd + totalStats.rewardUsd);
  };

  const getAvgDailyEarnings = () => {
    const { weeklyEarnings } = analyticsData;
    if (!weeklyEarnings.length) return 0;
    const total = weeklyEarnings.reduce((sum, day) => sum + (day.amount || 0), 0);
    return total / weeklyEarnings.length;
  };

  const getTeamSize = () => {
    const { teamData } = analyticsData;
    return teamData?.totalMembers || 0;
  };

  const getTotalRewards = () => {
    const { totalStats } = analyticsData;
    if (!totalStats) return 0;
    return totalStats.rewardUsd || 0;
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
    if (!teamData?.recentMembers) return [];
    
    // Process recent members into monthly growth data
    const monthlyData = {};
    teamData.recentMembers.forEach(member => {
      const date = new Date(member.joinDate || Date.now());
      const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
    });

    return Object.entries(monthlyData).map(([month, members]) => ({
      month,
      members
    }));
  };

  const getIncomeBreakdownData = () => {
    const { totalStats } = analyticsData;
    if (!totalStats) return [];

    return [
      {
        name: 'Portfolio Growth',
        value: totalStats.totalRoiUsd || 0,
        color: '#00f0ff'
      },
      {
        name: 'Slab Income',
        value: totalStats.slabIncomeUsd || 0,
        color: '#39ff14'
      },
      {
        name: 'Direct Income',
        value: totalStats.directIncomeUsd || 0,
        color: '#ff6b35'
      },
      {
        name: 'Royalties',
        value: totalStats.royaltyUsd || 0,
        color: '#ff3d71'
      },
      {
        name: 'Rewards',
        value: totalStats.rewardUsd || 0,
        color: '#a855f7'
      }
    ].filter(item => item.value > 0);
  };

  const getPortfolioProgress = () => {
    const { portfolioData } = analyticsData;
    if (!portfolioData?.summary) return 0;
    
    // Calculate progress based on portfolio value vs target
    const current = portfolioData.summary.totalValue || 0;
    const target = portfolioData.summary.targetValue || 1000; // Default target
    return Math.min((current / target) * 100, 100);
  };

  const getDaysActive = () => {
    const { spotIncomeData } = analyticsData;
    if (!spotIncomeData?.transactions?.length) return 0;
    
    const oldestTransaction = spotIncomeData.transactions.reduce((oldest, tx) => 
      (tx.timestamp < oldest.timestamp) ? tx : oldest
    );
    
    const daysDiff = Math.floor((Date.now()/1000 - oldestTransaction.timestamp) / 86400);
    return daysDiff;
  };

  const getClaimsMade = () => {
    const { slabData, royaltyData } = analyticsData;
    return (slabData?.totalClaims || 0) + (royaltyData?.totalClaims || 0);
  };

  const getAvgTeamDepth = () => {
    const { teamData } = analyticsData;
    return teamData?.averageDepth || 0;
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
  }

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
        <div className="cyber-glass rounded-xl p-5 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 cyber-glass border border-cyan-500/30 rounded-lg">
              <DollarSign className="text-cyan-400" size={20} />
            </div>
            <p className="text-sm font-medium text-cyan-400 uppercase tracking-wide">Total Earned</p>
          </div>
          <p className="text-2xl font-bold text-cyan-300">$2,250</p>
          <p className="text-xs text-neon-green mt-1">↑ 12% this month</p>
        </div>

        <div className="cyber-glass rounded-xl p-5 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 cyber-glass border border-neon-green/30 rounded-lg">
              <TrendingUp className="text-neon-green" size={20} />
            </div>
            <p className="text-sm font-medium text-cyan-400 uppercase tracking-wide">Avg Daily</p>
          </div>
          <p className="text-2xl font-bold text-cyan-300">$28.50</p>
          <p className="text-xs text-cyan-300/90 mt-1">0.38% rate</p>
        </div>

        <div className="cyber-glass rounded-xl p-5 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 cyber-glass border border-neon-orange/30 rounded-lg">
              <Users className="text-neon-orange" size={20} />
            </div>
            <p className="text-sm font-medium text-cyan-400 uppercase tracking-wide">Team Size</p>
          </div>
          <p className="text-2xl font-bold text-cyan-300">18</p>
          <p className="text-xs text-neon-green mt-1">↑ 6 this month</p>
        </div>

        <div className="cyber-glass rounded-xl p-5 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 cyber-glass border border-neon-purple/30 rounded-lg">
              <Award className="text-neon-purple" size={20} />
            </div>
            <p className="text-sm font-medium text-cyan-400 uppercase tracking-wide">Total Rewards</p>
          </div>
          <p className="text-2xl font-bold text-cyan-300">$850</p>
          <p className="text-xs text-cyan-300/90 mt-1">Passive income</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="cyber-glass rounded-2xl p-6 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <h2 className="text-lg font-semibold text-cyan-300 mb-4 uppercase tracking-wide">Earnings Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={earningsData}>
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
              <Line
                type="monotone"
                dataKey="amount"
                stroke="url(#colorGradient)"
                strokeWidth={3}
                dot={{ fill: '#00f0ff', r: 4, strokeWidth: 2, stroke: '#39ff14' }}
              />
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#00f0ff" />
                  <stop offset="100%" stopColor="#39ff14" />
                </linearGradient>
              </defs>
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="cyber-glass rounded-2xl p-6 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <h2 className="text-lg font-semibold text-cyan-300 mb-4 uppercase tracking-wide">Team Growth</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={teamGrowthData}>
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

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="cyber-glass rounded-xl p-6 border border-cyan-500/30 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <h3 className="font-semibold text-cyan-300 mb-4 uppercase tracking-wide">Income Breakdown</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-cyan-300/90">Portfolio Growth</span>
                <span className="text-sm font-bold text-cyan-300">$1,400</span>
              </div>
              <div className="h-2 bg-dark-900 rounded-full overflow-hidden border border-cyan-500/30">
                <div className="h-full bg-gradient-to-r from-cyan-500 to-neon-green rounded-full" style={{ width: '62%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-cyan-300/90">Slab Income</span>
                <span className="text-sm font-bold text-neon-green">$450</span>
              </div>
              <div className="h-2 bg-dark-900 rounded-full overflow-hidden border border-cyan-500/30">
                <div className="h-full bg-neon-green rounded-full" style={{ width: '20%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-cyan-300/90">Royalties</span>
                <span className="text-sm font-bold text-neon-orange">$240</span>
              </div>
              <div className="h-2 bg-dark-900 rounded-full overflow-hidden border border-cyan-500/30">
                <div className="h-full bg-neon-orange rounded-full shadow-neon-orange" style={{ width: '11%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-cyan-300/90">Rewards</span>
                <span className="text-sm font-bold text-neon-purple">$160</span>
              </div>
              <div className="h-2 bg-dark-900 rounded-full overflow-hidden border border-cyan-500/30">
                <div className="h-full bg-neon-purple rounded-full shadow-neon-purple" style={{ width: '7%' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="cyber-glass rounded-xl p-6 border border-cyan-500/30 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <h3 className="font-semibold text-cyan-300 mb-4 uppercase tracking-wide">Performance Stats</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-cyan-300/90">Portfolio Progress</span>
              <span className="text-lg font-bold text-neon-green">30%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-cyan-300/90">Days Active</span>
              <span className="text-lg font-bold text-cyan-300">79</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-cyan-300/90">Avg Team Depth</span>
              <span className="text-lg font-bold text-neon-orange">3.2</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-cyan-300/90">Claims Made</span>
              <span className="text-lg font-bold text-neon-purple">12</span>
            </div>
          </div>
        </div>

        <div className="cyber-glass border border-neon-green/50 rounded-xl p-6 text-white relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-neon-green/10 to-cyan-500/10 opacity-50 group-hover:opacity-70 transition-opacity" />
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon-green/70 to-transparent" />
          <h3 className="font-semibold mb-4 relative z-10 uppercase tracking-wide">Projected Earnings</h3>
          <div className="space-y-3 relative z-10">
            <div>
              <p className="text-sm opacity-90 mb-1">Next 30 Days</p>
              <p className="text-2xl font-bold">$855</p>
            </div>
            <div>
              <p className="text-sm opacity-90 mb-1">Next 90 Days</p>
              <p className="text-2xl font-bold">$2,565</p>
            </div>
            <div className="pt-3 border-t border-white/20">
              <p className="text-xs opacity-75 mb-1">Based on current rate</p>
              <p className="text-sm">0.38% daily average</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
