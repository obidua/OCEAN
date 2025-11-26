import { useEffect, useState, useMemo } from 'react';
import { 
  Award, TrendingUp, Users, DollarSign, Calendar, Loader2, Info, Table, History,
  Target, Activity, BarChart3, PieChart, Layers, GitBranch, Shield, Zap,
  Wallet, Clock, CheckCircle, XCircle, TrendingDown, ChevronDown, ChevronUp, RefreshCw
} from 'lucide-react';
import { formatUSD, formatRAMA } from '../utils/contractData';
import { 
  getCombinedIncome, 
  getUserAchievement,
  getTeamSummary,
  getTeamLegs,
  getPortfolioVolume,
  getTotalPortfolioVolume,
  getPeriodIncome,
  getClaimableIncome,
  getLevelAchievers,
  getUserIncomeHistory,
  calculateDayId,
  getRamaPrice,
  microUsdToUsd,
  weiToRama,
  formatDayId,
  getRelativeDay
} from '../services/slabIncomeApi';
import SameSlabScreen from './SameSlabScreen';
import SlabIncomeHistory from './SlabIncomeHistory';
import ClaimHistoryScreen from './ClaimHistoryScreen';

const SLAB_LEVELS = [
  { level: 1, name: 'Bronze', percentage: 5, color: 'from-amber-700 to-amber-500' },
  { level: 2, name: 'Silver', percentage: 15, color: 'from-gray-400 to-gray-200' },
  { level: 3, name: 'Gold', percentage: 10, color: 'from-yellow-500 to-yellow-300' },
  { level: 4, name: 'Platinum', percentage: 8, color: 'from-cyan-400 to-cyan-200' },
  { level: 5, name: 'Diamond', percentage: 5, color: 'from-blue-400 to-purple-400' },
  { level: 6, name: 'Crown Diamond', percentage: 2, color: 'from-purple-500 to-pink-500' },
];

// Skeleton loader component for cards
const SkeletonCard = ({ className = "" }) => (
  <div className={`animate-pulse ${className}`}>
    <div className="h-6 bg-cyan-500/10 rounded w-3/4 mb-3"></div>
    <div className="h-10 bg-cyan-500/20 rounded w-1/2 mb-2"></div>
    <div className="h-4 bg-cyan-500/10 rounded w-2/3"></div>
  </div>
);

export default function SlabDashboard() {
  const userAddress = typeof window !== 'undefined' ? localStorage.getItem('userAddress') : null;
  
  // Cache key based on user address and session
  const CACHE_KEY = `slab_dashboard_cache_${userAddress}`;
  const CACHE_TIMESTAMP_KEY = `slab_dashboard_timestamp_${userAddress}`;
  const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  // Helper to save data to sessionStorage
  const saveToCache = (data) => {
    if (!userAddress) return;
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
      sessionStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      console.log('[SlabDashboard] Data cached successfully');
    } catch (error) {
      console.warn('[SlabDashboard] Failed to cache data:', error);
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
        console.log('[SlabDashboard] Cache expired, clearing...');
        sessionStorage.removeItem(CACHE_KEY);
        sessionStorage.removeItem(CACHE_TIMESTAMP_KEY);
        return null;
      }
      
      console.log('[SlabDashboard] Loading from cache (age: ' + Math.round(age / 1000) + 's)');
      return JSON.parse(cached);
    } catch (error) {
      console.warn('[SlabDashboard] Failed to load cache:', error);
      return null;
    }
  };

  // Helper to clear cache (on logout)
  const clearCache = () => {
    if (!userAddress) return;
    sessionStorage.removeItem(CACHE_KEY);
    sessionStorage.removeItem(CACHE_TIMESTAMP_KEY);
    console.log('[SlabDashboard] Cache cleared');
  };
  
  const [selectedDay, setSelectedDay] = useState(calculateDayId());
  const [subView, setSubView] = useState('overview'); // overview, same-slab, history
  const [loading, setLoading] = useState(false);
  const [refreshingTab, setRefreshingTab] = useState(null);
  const [refreshingCard, setRefreshingCard] = useState(null); // Track which tab is refreshing
  const [dataLoaded, setDataLoaded] = useState(false); // Track if data has been loaded
  
  // Overview tab data
  const [incomeData, setIncomeData] = useState(null);
  const [achievementData, setAchievementData] = useState(null);
  const [teamData, setTeamData] = useState(null);
  const [teamLegsData, setTeamLegsData] = useState(null);
  const [portfolioVolumeData, setPortfolioVolumeData] = useState(null);
  const [totalPortfolioVolume, setTotalPortfolioVolume] = useState(null);
  const [periodIncomeData, setPeriodIncomeData] = useState(null);
  const [claimableData, setClaimableData] = useState(null);
  const [levelAchieversData, setLevelAchieversData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  
  // Same Slab Override tab data
  const [sameslabTodayData, setSameslabTodayData] = useState(null);
  const [sameslabPeriodData, setSameslabPeriodData] = useState(null);
  const [sameslabClaimableData, setSameslabClaimableData] = useState(null);
  const [sameslabHistoricalData, setSameslabHistoricalData] = useState([]);
  
  // Claim History tab data
  const [claimHistory, setClaimHistory] = useState([]);
  const [claimHistoryClaimable, setClaimHistoryClaimable] = useState(null);
  
  // UI state
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0, percentage: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(30);
  const [tabsLoaded, setTabsLoaded] = useState({
    overview: false,
    sameSlab: false,
    claimHistory: false
  });
  const [expandedSections, setExpandedSections] = useState({
    slabBreakdown: true,
    overrideBreakdown: true,
    teamStats: true,
    portfolioVolume: false,
    weeklyTrend: true,
    levelAchievers: false
  });

  // Load cached data on mount
  useEffect(() => {
    const cached = loadFromCache();
    if (cached) {
      console.log('[SlabDashboard] Restoring from cache...');
      setIncomeData(cached.incomeData);
      setAchievementData(cached.achievementData);
      setTeamData(cached.teamData);
      setTeamLegsData(cached.teamLegsData);
      setPortfolioVolumeData(cached.portfolioVolumeData);
      setTotalPortfolioVolume(cached.totalPortfolioVolume);
      setPeriodIncomeData(cached.periodIncomeData);
      setClaimableData(cached.claimableData);
      setLevelAchieversData(cached.levelAchieversData);
      setHistoricalData(cached.historicalData || []);
      setDataLoaded(true);
      console.log('[SlabDashboard] Cache restored successfully');
    }
  }, []);

  // Listen for logout to clear cache
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'userAddress' && !e.newValue) {
        console.log('[SlabDashboard] User logged out, clearing cache');
        clearCache();
        setDataLoaded(false);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Load comprehensive data for selected day
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      if (!userAddress) {
        console.log('[SlabDashboard] No user address, skipping load');
        return;
      }

      // Skip if data already loaded from cache
      if (dataLoaded && !refreshingTab) {
        console.log('[SlabDashboard] Data already loaded from cache, skipping reload');
        return;
      }

      console.log('[SlabDashboard] Starting sequential data load for:', userAddress);
      setLoading(true);
      try {
        const ramaPrice = getRamaPrice();
        const currentDay = calculateDayId();
        console.log('[SlabDashboard] Current day:', currentDay, 'RAMA price:', ramaPrice);

        // Load cards ONE BY ONE so each appears as its data arrives
        
        // Card 1: Today's Total Income
        console.log('[SlabDashboard] 1/8 Loading income data...');
        const incomeResult = await getCombinedIncome(userAddress, selectedDay, ramaPrice);
        if (!cancelled && incomeResult.success) {
          console.log('[SlabDashboard] ✓ Income data:', incomeResult.data);
          setIncomeData(incomeResult.data);
        } else if (!cancelled) {
          console.error('[SlabDashboard] ✗ Income fetch failed:', incomeResult.error);
        }

        // Card 2 & 3: Slab Achievement (Differential + Override)
        console.log('[SlabDashboard] 2/8 Loading achievement data...');
        const achievementResult = await getUserAchievement(userAddress, selectedDay);
        if (!cancelled && achievementResult.success) {
          console.log('[SlabDashboard] ✓ Achievement data:', achievementResult.data);
          setAchievementData(achievementResult.data);
        }

        // Card 4: Last 30 Days
        console.log('[SlabDashboard] 3/8 Loading period stats...');
        const periodResult = await getPeriodIncome(userAddress, Math.max(0, currentDay - 30), currentDay, ramaPrice);
        if (!cancelled && periodResult.success) {
          console.log('[SlabDashboard] ✓ Period data:', periodResult.data);
          setPeriodIncomeData(periodResult.data);
        } else if (!cancelled) {
          console.error('[SlabDashboard] ✗ Period fetch failed:', periodResult.error);
        }

        // Card 5, 6, 7, 8: Claimable stats (Total Claimable, Total Slab Income, Claimed, Unclaimed)
        console.log('[SlabDashboard] 4/8 Loading claimable stats...');
        const claimableResult = await getClaimableIncome(userAddress, currentDay, ramaPrice);
        if (!cancelled && claimableResult.success) {
          console.log('[SlabDashboard] ✓ Claimable data:', claimableResult.data);
          setClaimableData(claimableResult.data);
        } else if (!cancelled) {
          console.error('[SlabDashboard] ✗ Claimable fetch failed:', claimableResult.error);
        }

        // Card 9: Total Team
        console.log('[SlabDashboard] 5/8 Loading team data...');
        const teamResult = await getTeamSummary(userAddress);
        if (!cancelled && teamResult.success) {
          console.log('[SlabDashboard] ✓ Team data:', teamResult.data);
          setTeamData(teamResult.data);
        }

        // Team legs breakdown section
        console.log('[SlabDashboard] 6/8 Loading team legs...');
        const teamLegsResult = await getTeamLegs(userAddress);
        if (!cancelled && teamLegsResult.success) {
          console.log('[SlabDashboard] ✓ Team legs:', teamLegsResult.data);
          setTeamLegsData(teamLegsResult.data);
        }

        // Portfolio volume section
        console.log('[SlabDashboard] 7/8 Loading portfolio volume...');
        const portfolioVolumeResult = await getPortfolioVolume(userAddress);
        if (!cancelled && portfolioVolumeResult.success) {
          console.log('[SlabDashboard] ✓ Portfolio volume:', portfolioVolumeResult.data);
          setPortfolioVolumeData(portfolioVolumeResult.data);
        }

        // Total portfolio
        console.log('[SlabDashboard] 8/8 Loading total portfolio...');
        const totalPortfolioResult = await getTotalPortfolioVolume(userAddress);
        if (!cancelled && totalPortfolioResult.success) {
          console.log('[SlabDashboard] ✓ Total portfolio:', totalPortfolioResult.data);
          setTotalPortfolioVolume(totalPortfolioResult.data);
        }

        if (!cancelled) {
          setLoading(false);
          setDataLoaded(true);
          console.log('[SlabDashboard] Sequential data loading complete');
          
          // Cache the loaded data
          saveToCache({
            incomeData: incomeResult.success ? incomeResult.data : null,
            achievementData: achievementResult.success ? achievementResult.data : null,
            teamData: teamResult.success ? teamResult.data : null,
            teamLegsData: teamLegsResult.success ? teamLegsResult.data : null,
            portfolioVolumeData: portfolioVolumeResult.success ? portfolioVolumeResult.data : null,
            totalPortfolioVolume: totalPortfolioResult.success ? totalPortfolioResult.data : null,
            periodIncomeData: periodResult.success ? periodResult.data : null,
            claimableData: claimableResult.success ? claimableResult.data : null,
            levelAchieversData: null,
            historicalData: []
          });
        }

        // Load level achievers asynchronously (doesn't block UI)
        if (!cancelled && incomeResult.success && incomeResult.data?.user_slab_level > 0) {
          console.log('[SlabDashboard] Fetching level achievers...');
          const achieversResult = await getLevelAchievers(incomeResult.data.user_slab_level, selectedDay);
          if (!cancelled && achieversResult.success) {
            setLevelAchieversData(achieversResult.data);
          }
        }

      } catch (err) {
        console.error('[SlabDashboard] Failed to load slab dashboard data:', err);
        if (!cancelled) setLoading(false);
      }
    };

    loadData();
    return () => { cancelled = true; };
  }, [userAddress, selectedDay, dataLoaded, refreshingTab]);

  // Load all-time historical data (from registration to current day)
  useEffect(() => {
    let cancelled = false;

    const loadHistoricalData = async () => {
      if (!userAddress) return;

      const ramaPrice = getRamaPrice();
      console.log('[SlabDashboard] Loading income history...');

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
          90 // Last 90 days only
        );
        
        if (!cancelled && historyResult.success) {
          console.log('[SlabDashboard] Income history loaded:', historyResult.data.length, 'days');
          setHistoricalData(historyResult.data);
          setLoadingProgress({ current: 0, total: 0, percentage: 0 });
        } else if (!cancelled && !historyResult.success) {
          console.error('[SlabDashboard] Income history failed:', historyResult.error);
        }
      } catch (err) {
        console.error('[SlabDashboard] Failed to load historical data:', err);
      }
    };

    loadHistoricalData();
    return () => { cancelled = true; };
  }, [userAddress]);

  // Calculate comprehensive stats
  const stats = useMemo(() => {
    if (!incomeData) return null;

    const slabUsd = microUsdToUsd(incomeData.slab_income_usd || 0);
    const slabRama = weiToRama(incomeData.slab_income_rama_wei || '0');
    const overrideUsd = microUsdToUsd(incomeData.override_income_usd || 0);
    const overrideRama = weiToRama(incomeData.override_income_rama_wei || '0');
    const totalUsd = microUsdToUsd(incomeData.total_income_usd || 0);
    const totalRama = weiToRama(incomeData.total_income_rama_wei || '0');

    return {
      slabUsd,
      slabRama,
      overrideUsd,
      overrideRama,
      totalUsd,
      totalRama,
      slabLevel: incomeData.user_slab_level || 0,
      slabPercentage: incomeData.user_slab_percentage || 0,
      legsCount: incomeData.legs_count || 0,
      achieversCount: incomeData.achievers_count || 0
    };
  }, [incomeData]);

  // Calculate period stats (last 30 days)
  const periodStats = useMemo(() => {
    if (!periodIncomeData) return null;
    
    return {
      totalUsd: microUsdToUsd(periodIncomeData.total_income_usd || 0),
      totalRama: weiToRama(periodIncomeData.total_income_rama_wei || '0'),
      slabUsd: microUsdToUsd(periodIncomeData.slab_income_usd || 0),
      overrideUsd: microUsdToUsd(periodIncomeData.override_income_usd || 0),
      daysCount: periodIncomeData.days_count || 0
    };
  }, [periodIncomeData]);

  // Calculate claimable stats
  const claimableStats = useMemo(() => {
    if (!claimableData) return null;
    
    return {
      totalUsd: microUsdToUsd(claimableData.total_claimable_usd || 0),
      totalRama: weiToRama(claimableData.total_claimable_rama_wei || '0'),
      slabUsd: microUsdToUsd(claimableData.slab_claimable_usd || 0),
      overrideUsd: microUsdToUsd(claimableData.override_claimable_usd || 0),
      daysCount: claimableData.days_count || 0
    };
  }, [claimableData]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const currentSlabInfo = useMemo(() => {
    if (!stats || stats.slabLevel === 0) return null;
    return SLAB_LEVELS.find(s => s.level === stats.slabLevel);
  }, [stats]);

  return (
    <div className="space-y-6">
      {/* Header with Day Selector and Sub Navigation */}
      <div className="cyber-glass rounded-2xl p-4 border border-cyan-500/30">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Award className="text-neon-purple" size={24} />
            <div>
              <h2 className="text-xl font-bold text-cyan-300">Slab Income Dashboard</h2>
              <p className="text-sm text-cyan-300/70">Complete overview of your slab earnings</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedDay(d => Math.max(0, d - 1))}
              className="px-3 py-2 rounded-lg bg-neon-purple/20 text-neon-purple hover:bg-neon-purple/30 transition-colors text-sm disabled:opacity-50"
              disabled={selectedDay <= 0}
            >
              ← Prev
            </button>
            <div className="px-4 py-2 rounded-lg bg-black/40 border border-cyan-500/30">
              <div className="text-cyan-300 font-semibold text-sm">{formatDayId(selectedDay, 'medium')}</div>
              <div className="text-cyan-300/60 text-xs font-mono">Day {selectedDay} • {getRelativeDay(selectedDay)}</div>
            </div>
            <button
              onClick={() => setSelectedDay(d => Math.min(calculateDayId(), d + 1))}
              className="px-3 py-2 rounded-lg bg-neon-purple/20 text-neon-purple hover:bg-neon-purple/30 transition-colors text-sm disabled:opacity-50"
              disabled={selectedDay >= calculateDayId()}
            >
              Next →
            </button>
            <button
              onClick={() => setSelectedDay(calculateDayId())}
              className="px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-colors text-sm"
            >
              Today
            </button>
          </div>
        </div>

        {/* Sub Navigation */}
        <div className="flex gap-2 mt-4 border-t border-cyan-500/20 pt-4">
          <button
            onClick={() => setSubView('overview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              subView === 'overview'
                ? 'bg-gradient-to-r from-cyan-500 to-neon-green text-dark-950'
                : 'cyber-glass text-cyan-400 border border-cyan-500/30 hover:border-cyan-500/50'
            }`}
          >
            <DollarSign size={16} />
            <span>Income Overview</span>
            {subView === 'overview' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearCache();
                  setDataLoaded(false);
                  setRefreshingTab('overview');
                  setTimeout(() => setRefreshingTab(null), 100);
                }}
                className="ml-2 p-1 hover:bg-white/20 rounded transition-colors"
                title="Refresh Overview"
                disabled={refreshingTab === 'overview'}
              >
                <RefreshCw size={14} className={refreshingTab === 'overview' ? 'animate-spin' : ''} />
              </button>
            )}
          </button>
          <button
            onClick={() => setSubView('same-slab')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              subView === 'same-slab'
                ? 'bg-gradient-to-r from-cyan-500 to-neon-green text-dark-950'
                : 'cyber-glass text-cyan-400 border border-cyan-500/30 hover:border-cyan-500/50'
            }`}
          >
            <Table size={16} />
            <span>Same Slab Override</span>
            {subView === 'same-slab' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearCache();
                  setDataLoaded(false);
                  setRefreshingTab('same-slab');
                  setTimeout(() => setRefreshingTab(null), 100);
                }}
                className="ml-2 p-1 hover:bg-white/20 rounded transition-colors"
                title="Refresh Same Slab Override"
                disabled={refreshingTab === 'same-slab'}
              >
                <RefreshCw size={14} className={refreshingTab === 'same-slab' ? 'animate-spin' : ''} />
              </button>
            )}
          </button>
          <button
            onClick={() => setSubView('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              subView === 'history'
                ? 'bg-gradient-to-r from-cyan-500 to-neon-green text-dark-950'
                : 'cyber-glass text-cyan-400 border border-cyan-500/30 hover:border-cyan-500/50'
            }`}
          >
            <History size={16} />
            <span>Claim History</span>
            {subView === 'history' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearCache();
                  setDataLoaded(false);
                  setRefreshingTab('history');
                  setTimeout(() => setRefreshingTab(null), 100);
                }}
                className="ml-2 p-1 hover:bg-white/20 rounded transition-colors"
                title="Refresh Claim History"
                disabled={refreshingTab === 'history'}
              >
                <RefreshCw size={14} className={refreshingTab === 'history' ? 'animate-spin' : ''} />
              </button>
            )}
          </button>
        </div>
      </div>

      {/* Content based on sub view - keep all tabs mounted to preserve state */}
      <div style={{ display: subView === 'overview' ? 'block' : 'none' }}>
        {/* Overview content */}
      {/* Current Slab Level */}
      {currentSlabInfo && (
        <div className={`cyber-glass rounded-2xl p-6 border-2 border-neon-purple bg-gradient-to-r ${currentSlabInfo.color} bg-opacity-10`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-cyan-300/70 mb-1">Current Slab Level</div>
              <div className="text-3xl font-bold text-white mb-2">
                Level {currentSlabInfo.level} - {currentSlabInfo.name}
              </div>
              <div className="text-lg text-cyan-300">
                {currentSlabInfo.percentage}% Differential Rate
              </div>
            </div>
            <div className="text-6xl opacity-20">
              <Award />
            </div>
          </div>
        </div>
      )}

      {/* Main Stats Grid - Enhanced with 6 cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Income (Today) */}
        <div className="cyber-glass rounded-xl p-5 border-2 border-neon-green/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-neon-green/20 to-transparent rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-neon-green/80 uppercase tracking-wider">Today's Total Income</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    setRefreshingCard('today-total');
                    const ramaPrice = getRamaPrice();
                    const result = await getCombinedIncome(userAddress, selectedDay, ramaPrice);
                    if (result.success) setIncomeData(result.data);
                    setRefreshingCard(null);
                  }}
                  className="p-1 hover:bg-neon-green/20 rounded transition-colors"
                  title="Refresh"
                  disabled={refreshingCard === 'today-total'}
                >
                  <RefreshCw size={14} className={`text-neon-green ${refreshingCard === 'today-total' ? 'animate-spin' : ''}`} />
                </button>
                <DollarSign size={20} className="text-neon-green" />
              </div>
            </div>
            {loading && !stats ? (
              <SkeletonCard />
            ) : (
              <>
                <div className="text-3xl font-bold text-neon-green mb-1">
                  {formatUSD(stats?.totalUsd || 0)}
                </div>
                <div className="text-sm text-cyan-300/80 flex items-center gap-2">
                  <Zap size={14} className="text-neon-green" />
                  {formatRAMA(stats?.totalRama || 0)}
                </div>
              </>
            )}
            <div className="mt-3 pt-3 border-t border-neon-green/20">
              <div className="text-xs text-cyan-300/60">{formatDayId(selectedDay, 'short')}</div>
            </div>
          </div>
        </div>

        {/* Slab Differential Income */}
        <div className="cyber-glass rounded-xl p-5 border-2 border-neon-purple/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-neon-purple/20 to-transparent rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-neon-purple/80 uppercase tracking-wider">Slab Differential</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    setRefreshingCard('slab-diff');
                    const ramaPrice = getRamaPrice();
                    const result = await getCombinedIncome(userAddress, selectedDay, ramaPrice);
                    if (result.success) setIncomeData(result.data);
                    setRefreshingCard(null);
                  }}
                  className="p-1 hover:bg-neon-purple/20 rounded transition-colors"
                  title="Refresh"
                  disabled={refreshingCard === 'slab-diff'}
                >
                  <RefreshCw size={14} className={`text-neon-purple ${refreshingCard === 'slab-diff' ? 'animate-spin' : ''}`} />
                </button>
                <TrendingUp size={20} className="text-neon-purple" />
              </div>
            </div>
            {loading && !stats ? (
              <SkeletonCard />
            ) : (
              <>
                <div className="text-3xl font-bold text-neon-purple mb-1">
                  {formatUSD(stats?.slabUsd || 0)}
                </div>
                <div className="text-sm text-cyan-300/80 flex items-center gap-2">
                  <Wallet size={14} className="text-neon-purple" />
                  {formatRAMA(stats?.slabRama || 0)}
                </div>
              </>
            )}
            <div className="mt-3 pt-3 border-t border-neon-purple/20">
              <div className="text-xs text-cyan-300/60">{stats?.slabPercentage || 0}% Rate</div>
            </div>
          </div>
        </div>

        {/* Same-Slab Override Income */}
        <div className="cyber-glass rounded-xl p-5 border-2 border-cyan-500/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/20 to-transparent rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-cyan-400/80 uppercase tracking-wider">Same-Slab Override</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    setRefreshingCard('override');
                    const ramaPrice = getRamaPrice();
                    const result = await getCombinedIncome(userAddress, selectedDay, ramaPrice);
                    if (result.success) setIncomeData(result.data);
                    setRefreshingCard(null);
                  }}
                  className="p-1 hover:bg-cyan-500/20 rounded transition-colors"
                  title="Refresh"
                  disabled={refreshingCard === 'override'}
                >
                  <RefreshCw size={14} className={`text-cyan-400 ${refreshingCard === 'override' ? 'animate-spin' : ''}`} />
                </button>
                <Users size={20} className="text-cyan-400" />
              </div>
            </div>
            {loading && !stats ? (
              <SkeletonCard />
            ) : (
              <>
                <div className="text-3xl font-bold text-cyan-400 mb-1">
                  {formatUSD(stats?.overrideUsd || 0)}
                </div>
                <div className="text-sm text-cyan-300/80 flex items-center gap-2">
                  <Wallet size={14} className="text-cyan-400" />
                  {formatRAMA(stats?.overrideRama || 0)}
                </div>
              </>
            )}
            <div className="mt-3 pt-3 border-t border-cyan-500/20">
              <div className="text-xs text-cyan-300/60">{stats?.achieversCount || 0} Achievers</div>
            </div>
          </div>
        </div>

        {/* 30-Day Period Income */}
        <div className="cyber-glass rounded-xl p-5 border border-yellow-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-500/10 to-transparent rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-yellow-400/80 uppercase tracking-wider">Last 30 Days</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    setRefreshingCard('period');
                    const ramaPrice = getRamaPrice();
                    const currentDay = calculateDayId();
                    const result = await getPeriodIncome(userAddress, Math.max(0, currentDay - 30), currentDay, ramaPrice);
                    if (result.success) setPeriodIncomeData(result.data);
                    setRefreshingCard(null);
                  }}
                  className="p-1 hover:bg-yellow-500/20 rounded transition-colors"
                  title="Refresh"
                  disabled={refreshingCard === 'period'}
                >
                  <RefreshCw size={14} className={`text-yellow-400 ${refreshingCard === 'period' ? 'animate-spin' : ''}`} />
                </button>
                <Calendar size={20} className="text-yellow-400" />
              </div>
            </div>
            {loading && !periodStats ? (
              <SkeletonCard />
            ) : (
              <>
                <div className="text-2xl font-bold text-yellow-400 mb-1">
                  {formatUSD(periodStats?.totalUsd || 0)}
                </div>
                <div className="text-sm text-cyan-300/80">
                  {formatRAMA(periodStats?.totalRama || 0)}
                </div>
              </>
            )}
            <div className="mt-3 pt-3 border-t border-yellow-500/20">
              <div className="text-xs text-cyan-300/60">{periodStats?.daysCount || 0} Active Days</div>
            </div>
          </div>
        </div>

        {/* Claimable Income */}
        <div className="cyber-glass rounded-xl p-5 border border-pink-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-pink-500/10 to-transparent rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-pink-400/80 uppercase tracking-wider">Total Claimable</div>
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
                <CheckCircle size={20} className="text-pink-400" />
              </div>
            </div>
            {loading && !claimableStats ? (
              <SkeletonCard />
            ) : (
              <>
                <div className="text-2xl font-bold text-pink-400 mb-1">
                  {formatUSD(claimableStats?.totalUsd || 0)}
                </div>
                <div className="text-sm text-cyan-300/80">
                  {formatRAMA(claimableStats?.totalRama || 0)}
                </div>
              </>
            )}
            <div className="mt-3 pt-3 border-t border-pink-500/20">
              <div className="text-xs text-cyan-300/60">{claimableStats?.daysCount || 0} Days</div>
            </div>
          </div>
        </div>

        {/* Team Size */}
        <div className="cyber-glass rounded-xl p-5 border border-blue-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-blue-400/80 uppercase tracking-wider">Total Team</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    setRefreshingCard('team');
                    const result = await getTeamSummary(userAddress);
                    if (result.success) setTeamData(result.data);
                    setRefreshingCard(null);
                  }}
                  className="p-1 hover:bg-blue-500/20 rounded transition-colors"
                  title="Refresh"
                  disabled={refreshingCard === 'team'}
                >
                  <RefreshCw size={14} className={`text-blue-400 ${refreshingCard === 'team' ? 'animate-spin' : ''}`} />
                </button>
                <GitBranch size={20} className="text-blue-400" />
              </div>
            </div>
            {loading && !teamData ? (
              <SkeletonCard />
            ) : (
              <>
                <div className="text-3xl font-bold text-blue-400 mb-1">
                  {teamData?.total_team || 0}
                </div>
                <div className="text-sm text-cyan-300/80">
                  {teamData?.total_directs || 0} Directs
                </div>
              </>
            )}
            <div className="mt-3 pt-3 border-t border-blue-500/20">
              <div className="text-xs text-cyan-300/60">Depth: {teamData?.max_depth || 0}</div>
            </div>
          </div>
        </div>

        {/* Total Slab Income - Claimed vs Unclaimed */}
        <div className="cyber-glass rounded-xl p-5 border border-purple-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-purple-400/80 uppercase tracking-wider">Total Slab Income</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    setRefreshingCard('total-slab');
                    const ramaPrice = getRamaPrice();
                    const currentDay = calculateDayId();
                    const [periodResult, claimableResult] = await Promise.all([
                      getPeriodIncome(userAddress, Math.max(0, currentDay - 30), currentDay, ramaPrice),
                      getClaimableIncome(userAddress, currentDay, ramaPrice)
                    ]);
                    if (periodResult.success) setPeriodIncomeData(periodResult.data);
                    if (claimableResult.success) setClaimableData(claimableResult.data);
                    setRefreshingCard(null);
                  }}
                  className="p-1 hover:bg-purple-500/20 rounded transition-colors"
                  title="Refresh"
                  disabled={refreshingCard === 'total-slab'}
                >
                  <RefreshCw size={14} className={`text-purple-400 ${refreshingCard === 'total-slab' ? 'animate-spin' : ''}`} />
                </button>
                <Wallet size={20} className="text-purple-400" />
              </div>
            </div>
            {loading && !claimableStats ? (
              <SkeletonCard />
            ) : (
              <>
                <div className="text-2xl font-bold text-purple-400 mb-1">
                  {formatUSD((claimableStats?.totalUsd || 0) + Math.max(0, (periodStats?.totalUsd || 0)))}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="bg-green-500/10 rounded p-2 border border-green-500/20">
                    <div className="text-xs text-green-400/70 mb-1">Claimed</div>
                    <div className="text-sm font-bold text-green-400">
                      {formatUSD(Math.max(0, (periodStats?.totalUsd || 0) - (claimableStats?.totalUsd || 0)))}
                    </div>
                  </div>
                  <div className="bg-orange-500/10 rounded p-2 border border-orange-500/20">
                    <div className="text-xs text-orange-400/70 mb-1">Unclaimed</div>
                    <div className="text-sm font-bold text-orange-400">
                      {formatUSD(claimableStats?.totalUsd || 0)}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Claimed Income */}
        <div className="cyber-glass rounded-xl p-5 border border-green-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/10 to-transparent rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-green-400/80 uppercase tracking-wider">Claimed Income</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    setRefreshingCard('claimed');
                    const ramaPrice = getRamaPrice();
                    const currentDay = calculateDayId();
                    const [periodResult, claimableResult] = await Promise.all([
                      getPeriodIncome(userAddress, Math.max(0, currentDay - 30), currentDay, ramaPrice),
                      getClaimableIncome(userAddress, currentDay, ramaPrice)
                    ]);
                    if (periodResult.success) setPeriodIncomeData(periodResult.data);
                    if (claimableResult.success) setClaimableData(claimableResult.data);
                    setRefreshingCard(null);
                  }}
                  className="p-1 hover:bg-green-500/20 rounded transition-colors"
                  title="Refresh"
                  disabled={refreshingCard === 'claimed'}
                >
                  <RefreshCw size={14} className={`text-green-400 ${refreshingCard === 'claimed' ? 'animate-spin' : ''}`} />
                </button>
                <CheckCircle size={20} className="text-green-400" />
              </div>
            </div>
            {loading && !claimableStats && !periodStats ? (
              <SkeletonCard />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-400 mb-1">
                  {formatUSD(Math.max(0, (periodStats?.totalUsd || 0) - (claimableStats?.totalUsd || 0)))}
                </div>
                <div className="text-sm text-cyan-300/80">
                  {formatRAMA(Math.max(0, (periodStats?.totalRama || 0) - (claimableStats?.totalRama || 0)))}
                </div>
              </>
            )}
            <div className="mt-3 pt-3 border-t border-green-500/20">
              <div className="text-xs text-cyan-300/60">Last 30 days</div>
            </div>
          </div>
        </div>

        {/* Unclaimed Income */}
        <div className="cyber-glass rounded-xl p-5 border border-orange-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/10 to-transparent rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-orange-400/80 uppercase tracking-wider">Unclaimed Income</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    setRefreshingCard('unclaimed');
                    const ramaPrice = getRamaPrice();
                    const currentDay = calculateDayId();
                    const result = await getClaimableIncome(userAddress, currentDay, ramaPrice);
                    if (result.success) setClaimableData(result.data);
                    setRefreshingCard(null);
                  }}
                  className="p-1 hover:bg-orange-500/20 rounded transition-colors"
                  title="Refresh"
                  disabled={refreshingCard === 'unclaimed'}
                >
                  <RefreshCw size={14} className={`text-orange-400 ${refreshingCard === 'unclaimed' ? 'animate-spin' : ''}`} />
                </button>
                <Clock size={20} className="text-orange-400" />
              </div>
            </div>
            {loading && !claimableStats ? (
              <SkeletonCard />
            ) : (
              <>
                <div className="text-2xl font-bold text-orange-400 mb-1">
                  {formatUSD(claimableStats?.totalUsd || 0)}
                </div>
                <div className="text-sm text-cyan-300/80">
                  {formatRAMA(claimableStats?.totalRama || 0)}
                </div>
              </>
            )}
            <div className="mt-3 pt-3 border-t border-orange-500/20">
              <div className="text-xs text-cyan-300/60">{claimableStats?.daysCount || 0} Days pending</div>
            </div>
          </div>
        </div>
      </div>

      {/* Slab Details Breakdown - Collapsible */}
      {incomeData?.slab_details && incomeData.slab_details.length > 0 && (
        <div className="cyber-glass rounded-2xl border border-cyan-500/20 overflow-hidden">
          <button
            onClick={() => toggleSection('slabBreakdown')}
            className="w-full p-5 flex items-center justify-between hover:bg-cyan-500/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <TrendingUp size={22} className="text-neon-purple" />
              <div className="text-left">
                <h3 className="text-lg font-bold text-cyan-300">Slab Differential Breakdown</h3>
                <p className="text-xs text-cyan-300/60">{incomeData.slab_details.length} Earning Legs</p>
              </div>
            </div>
            {expandedSections.slabBreakdown ? (
              <ChevronUp size={20} className="text-cyan-400" />
            ) : (
              <ChevronDown size={20} className="text-cyan-400" />
            )}
          </button>
          {expandedSections.slabBreakdown && (
            <div className="p-5 pt-0 space-y-3">
              {incomeData.slab_details.map((detail, idx) => (
                <div key={idx} className="bg-black/30 rounded-lg p-4 border border-neon-purple/20 hover:border-neon-purple/40 transition-colors">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <div className="text-cyan-300/50 text-xs mb-1 uppercase tracking-wide">Leg</div>
                      <div className="text-cyan-300 font-semibold">{detail.leg_name || `Leg ${idx + 1}`}</div>
                    </div>
                    <div>
                      <div className="text-cyan-300/50 text-xs mb-1 uppercase tracking-wide">Downline Slab</div>
                      <div className="text-neon-purple font-bold">Level {detail.downline_slab_level}</div>
                    </div>
                    <div>
                      <div className="text-cyan-300/50 text-xs mb-1 uppercase tracking-wide">Differential</div>
                      <div className="text-neon-green font-bold">{detail.differential_percentage}%</div>
                    </div>
                    <div>
                      <div className="text-cyan-300/50 text-xs mb-1 uppercase tracking-wide">Income (USD)</div>
                      <div className="text-neon-green font-bold">{formatUSD(microUsdToUsd(detail.income_micro_usd))}</div>
                    </div>
                    <div>
                      <div className="text-cyan-300/50 text-xs mb-1 uppercase tracking-wide">Income (RAMA)</div>
                      <div className="text-neon-green font-bold">{formatRAMA(weiToRama(detail.income_rama_wei || '0'))}</div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="bg-gradient-to-r from-neon-purple/20 to-neon-green/20 rounded-lg p-4 border border-neon-purple/30">
                <div className="flex items-center justify-between">
                  <span className="text-cyan-300 font-semibold">Total Slab Income:</span>
                  <div className="text-right">
                    <div className="text-xl font-bold text-neon-green">{formatUSD(stats?.slabUsd || 0)}</div>
                    <div className="text-xs text-cyan-300/70">{formatRAMA(stats?.slabRama || 0)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Override Details Breakdown - Collapsible */}
      {incomeData?.override_details && incomeData.override_details.length > 0 && (
        <div className="cyber-glass rounded-2xl border border-cyan-500/20 overflow-hidden">
          <button
            onClick={() => toggleSection('overrideBreakdown')}
            className="w-full p-5 flex items-center justify-between hover:bg-cyan-500/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Users size={22} className="text-cyan-400" />
              <div className="text-left">
                <h3 className="text-lg font-bold text-cyan-300">Same-Slab Override Breakdown</h3>
                <p className="text-xs text-cyan-300/60">{incomeData.override_details.length} Achievers</p>
              </div>
            </div>
            {expandedSections.overrideBreakdown ? (
              <ChevronUp size={20} className="text-cyan-400" />
            ) : (
              <ChevronDown size={20} className="text-cyan-400" />
            )}
          </button>
          {expandedSections.overrideBreakdown && (
            <div className="p-5 pt-0 space-y-3">
              {incomeData.override_details.map((detail, idx) => (
                <div key={idx} className="bg-black/30 rounded-lg p-4 border border-cyan-500/20 hover:border-cyan-500/40 transition-colors">
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                    <div>
                      <div className="text-cyan-300/50 text-xs mb-1 uppercase tracking-wide">Achiever</div>
                      <div className="text-cyan-300 font-mono text-xs">
                        {detail.achiever_address?.slice(0, 6)}...{detail.achiever_address?.slice(-4)}
                      </div>
                    </div>
                    <div>
                      <div className="text-cyan-300/50 text-xs mb-1 uppercase tracking-wide">Wave</div>
                      <div className="text-cyan-400 font-semibold">{detail.wave_type}</div>
                    </div>
                    <div>
                      <div className="text-cyan-300/50 text-xs mb-1 uppercase tracking-wide">Slab Level</div>
                      <div className="text-cyan-400 font-bold">Level {detail.slab_level}</div>
                    </div>
                    <div>
                      <div className="text-cyan-300/50 text-xs mb-1 uppercase tracking-wide">Override</div>
                      <div className="text-cyan-400 font-bold">{detail.override_percentage}%</div>
                    </div>
                    <div>
                      <div className="text-cyan-300/50 text-xs mb-1 uppercase tracking-wide">Income (USD)</div>
                      <div className="text-cyan-400 font-bold">{formatUSD(microUsdToUsd(detail.income_micro_usd))}</div>
                    </div>
                    <div>
                      <div className="text-cyan-300/50 text-xs mb-1 uppercase tracking-wide">Income (RAMA)</div>
                      <div className="text-cyan-400 font-bold">{formatRAMA(weiToRama(detail.income_rama_wei || '0'))}</div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-lg p-4 border border-cyan-500/30">
                <div className="flex items-center justify-between">
                  <span className="text-cyan-300 font-semibold">Total Override Income:</span>
                  <div className="text-right">
                    <div className="text-xl font-bold text-cyan-400">{formatUSD(stats?.overrideUsd || 0)}</div>
                    <div className="text-xs text-cyan-300/70">{formatRAMA(stats?.overrideRama || 0)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Team Statistics - Enhanced & Collapsible */}
      {loading && !teamData ? (
        <div className="cyber-glass rounded-2xl border border-cyan-500/20 p-6">
          <div className="flex items-center gap-3 mb-4">
            <GitBranch size={22} className="text-blue-400" />
            <h3 className="text-lg font-bold text-cyan-300">Team Network Statistics</h3>
          </div>
          <div className="flex items-center justify-center py-8 gap-3">
            <Loader2 size={24} className="animate-spin text-blue-400" />
            <span className="text-cyan-300/60">Loading team data...</span>
          </div>
        </div>
      ) : teamData && (
        <div className="cyber-glass rounded-2xl border border-cyan-500/20 overflow-hidden">
          <button
            onClick={() => toggleSection('teamStats')}
            className="w-full p-5 flex items-center justify-between hover:bg-cyan-500/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <GitBranch size={22} className="text-blue-400" />
              <div className="text-left">
                <h3 className="text-lg font-bold text-cyan-300">Team Network Statistics</h3>
                <p className="text-xs text-cyan-300/60">{teamData.total_team || 0} Total Members</p>
              </div>
            </div>
            {expandedSections.teamStats ? (
              <ChevronUp size={20} className="text-cyan-400" />
            ) : (
              <ChevronDown size={20} className="text-cyan-400" />
            )}
          </button>
          {expandedSections.teamStats && (
            <div className="p-5 pt-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-black/30 rounded-lg p-4 border border-blue-500/20 text-center">
                  <GitBranch size={24} className="text-blue-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-400">{teamData.total_team || 0}</div>
                  <div className="text-xs text-cyan-300/60 mt-1">Total Team</div>
                </div>
                <div className="bg-black/30 rounded-lg p-4 border border-cyan-500/20 text-center">
                  <Users size={24} className="text-cyan-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-cyan-400">{teamData.total_directs || 0}</div>
                  <div className="text-xs text-cyan-300/60 mt-1">Direct Referrals</div>
                </div>
                <div className="bg-black/30 rounded-lg p-4 border border-purple-500/20 text-center">
                  <Layers size={24} className="text-purple-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-purple-400">{teamData.max_depth || 0}</div>
                  <div className="text-xs text-cyan-300/60 mt-1">Max Depth</div>
                </div>
                <div className="bg-black/30 rounded-lg p-4 border border-green-500/20 text-center">
                  <Activity size={24} className="text-green-400 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-400">{incomeData?.legs_count || 0}</div>
                  <div className="text-xs text-cyan-300/60 mt-1">Active Legs</div>
                </div>
              </div>
              
              {/* Team Legs Breakdown */}
              {teamLegsData && teamLegsData.legs && teamLegsData.legs.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm font-semibold text-cyan-300 mb-3 flex items-center gap-2">
                    <BarChart3 size={16} />
                    <span>Leg-wise Team Distribution</span>
                  </div>
                  <div className="space-y-2">
                    {teamLegsData.legs.map((leg, idx) => (
                      <div key={idx} className="bg-black/20 rounded-lg p-3 border border-cyan-500/10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-xs">
                              {idx + 1}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-cyan-300">{leg.direct_address?.slice(0, 8)}...{leg.direct_address?.slice(-6)}</div>
                              <div className="text-xs text-cyan-300/50">Leg {idx + 1}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-lg font-bold text-cyan-400">{leg.team_count || 0}</div>
                              <div className="text-xs text-cyan-300/50">Members</div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-purple-400">{leg.max_depth || 0}</div>
                              <div className="text-xs text-cyan-300/50">Depth</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Portfolio Volume - New Section */}
      {loading && (!portfolioVolumeData || !totalPortfolioVolume) ? (
        <div className="cyber-glass rounded-2xl border border-cyan-500/20 p-6">
          <div className="flex items-center gap-3 mb-4">
            <PieChart size={22} className="text-yellow-400" />
            <h3 className="text-lg font-bold text-cyan-300">Portfolio Volume Breakdown</h3>
          </div>
          <div className="flex items-center justify-center py-8 gap-3">
            <Loader2 size={24} className="animate-spin text-yellow-400" />
            <span className="text-cyan-300/60">Loading portfolio data...</span>
          </div>
        </div>
      ) : (portfolioVolumeData && totalPortfolioVolume) ? (
        <div className="cyber-glass rounded-2xl border border-cyan-500/20 overflow-hidden">
          <button
            onClick={() => toggleSection('portfolioVolume')}
            className="w-full p-5 flex items-center justify-between hover:bg-cyan-500/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <PieChart size={22} className="text-yellow-400" />
              <div className="text-left">
                <h3 className="text-lg font-bold text-cyan-300">Portfolio Volume Breakdown</h3>
                <p className="text-xs text-cyan-300/60">
                  {totalPortfolioVolume ? formatUSD(microUsdToUsd(totalPortfolioVolume.total_volume_usd || 0)) : 'Loading...'}
                </p>
              </div>
            </div>
            {expandedSections.portfolioVolume ? (
              <ChevronUp size={20} className="text-cyan-400" />
            ) : (
              <ChevronDown size={20} className="text-cyan-400" />
            )}
          </button>
          {expandedSections.portfolioVolume && (
            <div className="p-5 pt-0">
              {totalPortfolioVolume && (
                <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg p-4 border border-yellow-500/30 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-cyan-300 font-semibold flex items-center gap-2">
                      <Wallet size={18} />
                      Total Portfolio Volume:
                    </span>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-yellow-400">
                        {formatUSD(microUsdToUsd(totalPortfolioVolume.total_volume_usd || 0))}
                      </div>
                      <div className="text-xs text-cyan-300/60">{totalPortfolioVolume.total_portfolios || 0} Portfolios</div>
                    </div>
                  </div>
                </div>
              )}
              
              {portfolioVolumeData && portfolioVolumeData.legs && portfolioVolumeData.legs.length > 0 && (
                <div className="space-y-2">
                  {portfolioVolumeData.legs.map((leg, idx) => (
                    <div key={idx} className="bg-black/20 rounded-lg p-4 border border-yellow-500/10">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-cyan-300/50 text-xs mb-1">Leg</div>
                          <div className="text-cyan-300 font-semibold">Leg {idx + 1}</div>
                        </div>
                        <div>
                          <div className="text-cyan-300/50 text-xs mb-1">Volume (USD)</div>
                          <div className="text-yellow-400 font-bold">{formatUSD(microUsdToUsd(leg.volume_usd || 0))}</div>
                        </div>
                        <div>
                          <div className="text-cyan-300/50 text-xs mb-1">Portfolios</div>
                          <div className="text-yellow-400 font-bold">{leg.portfolio_count || 0}</div>
                        </div>
                        <div>
                          <div className="text-cyan-300/50 text-xs mb-1">% of Total</div>
                          <div className="text-yellow-400 font-bold">
                            {totalPortfolioVolume && totalPortfolioVolume.total_volume_usd > 0
                              ? ((leg.volume_usd / totalPortfolioVolume.total_volume_usd) * 100).toFixed(1)
                              : '0'}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}

      {/* Level Achievers - New Section */}
      {loading && stats?.slabLevel > 0 && !levelAchieversData ? (
        <div className="cyber-glass rounded-2xl border border-cyan-500/20 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield size={22} className="text-purple-400" />
            <h3 className="text-lg font-bold text-cyan-300">Level Achievers Network</h3>
          </div>
          <div className="flex items-center justify-center py-8 gap-3">
            <Loader2 size={24} className="animate-spin text-purple-400" />
            <span className="text-cyan-300/60">Loading achievers...</span>
          </div>
        </div>
      ) : levelAchieversData && levelAchieversData.achievers && levelAchieversData.achievers.length > 0 && (
        <div className="cyber-glass rounded-2xl border border-cyan-500/20 overflow-hidden">
          <button
            onClick={() => toggleSection('levelAchievers')}
            className="w-full p-5 flex items-center justify-between hover:bg-cyan-500/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Award size={22} className="text-yellow-400" />
              <div className="text-left">
                <h3 className="text-lg font-bold text-cyan-300">Level {stats?.slabLevel || 0} Achievers Network</h3>
                <p className="text-xs text-cyan-300/60">{levelAchieversData.achievers.length} Members Achieved Same Level</p>
              </div>
            </div>
            {expandedSections.levelAchievers ? (
              <ChevronUp size={20} className="text-cyan-400" />
            ) : (
              <ChevronDown size={20} className="text-cyan-400" />
            )}
          </button>
          {expandedSections.levelAchievers && (
            <div className="p-5 pt-0 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {levelAchieversData.achievers.map((achiever, idx) => (
                  <div key={idx} className="bg-black/20 rounded-lg p-3 border border-yellow-500/10 hover:border-yellow-500/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                          <Award size={16} className="text-white" />
                        </div>
                        <div>
                          <div className="text-sm font-mono text-cyan-300">
                            {achiever.user_address?.slice(0, 8)}...{achiever.user_address?.slice(-6)}
                          </div>
                          <div className="text-xs text-cyan-300/50">Level {achiever.slab_level}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-yellow-400">{achiever.slab_percentage}%</div>
                        <div className="text-xs text-cyan-300/50">Rate</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Historical Trend - All Time Income History with Pagination */}
      {loadingProgress.percentage > 0 && loadingProgress.percentage < 100 ? (
        <div className="cyber-glass rounded-2xl border border-cyan-500/20 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Activity size={22} className="text-green-400" />
            <h3 className="text-lg font-bold text-cyan-300">Income History</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Loader2 size={24} className="animate-spin text-green-400" />
              <span className="text-cyan-300/60">Loading income history... {loadingProgress.percentage}%</span>
            </div>
            <div className="w-full bg-black/40 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-cyan-500 transition-all duration-300"
                style={{ width: `${loadingProgress.percentage}%` }}
              />
            </div>
            <div className="text-center text-xs text-cyan-300/50">
              {loadingProgress.current} / {loadingProgress.total} days processed
            </div>
          </div>
        </div>
      ) : historicalData.length > 0 ? (
        <div className="cyber-glass rounded-2xl border border-cyan-500/20 overflow-hidden">
          <button
            onClick={() => toggleSection('weeklyTrend')}
            className="w-full p-5 flex items-center justify-between hover:bg-cyan-500/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Activity size={22} className="text-green-400" />
              <div className="text-left">
                <h3 className="text-lg font-bold text-cyan-300">Income History (Last 90 Days)</h3>
                <p className="text-xs text-cyan-300/60">{historicalData.length} days with earnings • Page {currentPage} of {Math.ceil(historicalData.length / itemsPerPage)}</p>
              </div>
            </div>
            {expandedSections.weeklyTrend ? (
              <ChevronUp size={20} className="text-cyan-400" />
            ) : (
              <ChevronDown size={20} className="text-cyan-400" />
            )}
          </button>
          {expandedSections.weeklyTrend && (
            <div className="p-5 pt-0">
              <div className="space-y-2 mb-4">
                {historicalData
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((item) => {
                const totalUsd = microUsdToUsd(item.data?.total_income_usd || 0);
                const slabUsd = microUsdToUsd(item.data?.slab_income_usd || 0);
                const overrideUsd = microUsdToUsd(item.data?.override_income_usd || 0);
                const isToday = item.dayId === calculateDayId();
                const relativeDay = getRelativeDay(item.dayId);
                
                return (
                  <div key={item.dayId} className={`p-4 bg-black/20 rounded-lg border ${isToday ? 'border-neon-green/40' : 'border-cyan-500/10'} hover:border-cyan-500/30 transition-colors`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`text-sm font-semibold ${isToday ? 'text-neon-green' : 'text-cyan-300/70'}`}>
                          {formatDayId(item.dayId, 'short')}
                          {isToday && <span className="ml-2 text-xs bg-neon-green/20 text-neon-green px-2 py-1 rounded">Today</span>}
                        </div>
                        <div className="text-xs text-cyan-300/50 font-mono">Day {item.dayId} • {relativeDay}</div>
                        <div className={`w-2 h-2 rounded-full ${totalUsd > 0 ? 'bg-neon-green animate-pulse' : 'bg-gray-500'}`}></div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-neon-green">{formatUSD(totalUsd)}</div>
                        <div className="text-xs text-cyan-300/60">{formatRAMA(weiToRama(item.data?.total_income_rama_wei || '0'))}</div>
                      </div>
                    </div>
                    {totalUsd > 0 && (
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-cyan-500/10">
                        <div>
                          <div className="text-xs text-cyan-300/50 mb-1">Slab Income</div>
                          <div className="text-sm font-bold text-neon-purple">{formatUSD(slabUsd)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-cyan-300/50 mb-1">Override Income</div>
                          <div className="text-sm font-bold text-cyan-400">{formatUSD(overrideUsd)}</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
              
              {/* Pagination Controls */}
              {historicalData.length > itemsPerPage && (
                <div className="flex items-center justify-between pt-4 border-t border-cyan-500/20">
                  <div className="text-sm text-cyan-300/60">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, historicalData.length)} of {historicalData.length} days
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                    >
                      ← Previous
                    </button>
                    <div className="flex gap-1">
                      {Array.from({ length: Math.ceil(historicalData.length / itemsPerPage) }, (_, i) => i + 1)
                        .filter(page => {
                          const totalPages = Math.ceil(historicalData.length / itemsPerPage);
                          return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                        })
                        .map((page, idx, arr) => {
                          if (idx > 0 && page - arr[idx - 1] > 1) {
                            return (
                              <span key={`ellipsis-${page}`} className="px-2 py-1 text-cyan-300/50">...</span>
                            );
                          }
                          return (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`px-3 py-1 rounded text-sm ${
                                currentPage === page
                                  ? 'bg-cyan-500 text-white'
                                  : 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30'
                              }`}
                            >
                              {page}
                            </button>
                          );
                        })}
                    </div>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(historicalData.length / itemsPerPage), p + 1))}
                      disabled={currentPage >= Math.ceil(historicalData.length / itemsPerPage)}
                      className="px-3 py-1 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}

      {/* No Data Message */}
      {!loading && stats?.slabLevel === 0 && (
        <div className="cyber-glass rounded-2xl p-8 border border-yellow-500/20 text-center">
          <Info size={48} className="text-yellow-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-cyan-300 mb-2">No Slab Achievement</h3>
          <p className="text-cyan-300/70">
            You haven't achieved any slab level on {formatDayId(selectedDay, 'long')} (Day {selectedDay}). Build your team and qualified volume to earn slab income!
          </p>
        </div>
      )}
      </div>

      {/* Same Slab Override Tab */}
      <div style={{ display: subView === 'same-slab' ? 'block' : 'none' }}>
        <SameSlabScreen />
      </div>

      {/* Claim History Tab */}
      <div style={{ display: subView === 'history' ? 'block' : 'none' }}>
        <ClaimHistoryScreen />
      </div>
    </div>
  );
}
