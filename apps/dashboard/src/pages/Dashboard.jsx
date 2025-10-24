// src/screens/Dashboard.jsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { TrendingUp, Wallet, Users, Award, DollarSign, Clock, Zap, Gift, Trophy, ArrowUpRight, Loader2, X, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatUSD, formatRAMA } from '../utils/contractData';
import NumberPopup from '../components/NumberPopup';
import LivePriceFeed from '../components/LivePriceFeed';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useStore } from '../../store/useUserInfoStore';
import { PortfolioStatus } from '../types/contract';

export default function Dashboard() {
  const [portfolioIds, setPortFolioId] = useState([]);
  const [selectedPid, setSelectedPid] = useState(() => {
    const saved = localStorage.getItem('selectedPortfolioId');
    const parsed = saved ? Number(saved) : null;
    return Number.isFinite(parsed) ? parsed : null;
  });
  const [portFolioDetails, setFortFolioDetails] = useState(null);
  const [DashBoardDetail, setDashboardDetails] = useState(null);
  const [last7Day, setLast7Days] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dashError, setDashError] = useState(null);
  const [usdPerRama, setUsdPerRama] = useState(null);
  const [incomeTotalsBreakdown, setIncomeTotalsBreakdown] = useState(null);
  const [incomeTotalsLoading, setIncomeTotalsLoading] = useState(false);
  const [incomeTotalsError, setIncomeTotalsError] = useState('');
  const [showIncomeModal, setShowIncomeModal] = useState(false);

  const getTOtalPortFolio = useStore((s) => s.getTOtalPortFolio);
  const getPortFoliById = useStore((s) => s.getPortFoliById);
  const getDashboardDetails = useStore((s) => s.getDashboardDetails);
  const get7DayEarningTrend = useStore((s) => s.get7DayEarningTrend);
  const convertRamaToUsd = useStore((s) => s.RamaTOUsd);
  const getIncomeTotals = useStore((s) => s.getIncomeTotals);
  const getComprehensiveCapStatus = useStore((s) => s.getComprehensiveCapStatus);
  const [comprehensiveCapStatus, setComprehensiveCapStatus] = useState(null);
  const [comprehensiveCapError, setComprehensiveCapError] = useState(null);
  const userAddressStore = useStore((s) => s.userAddress);
  const userAddress =
    userAddressStore || (typeof window !== 'undefined' ? localStorage.getItem('userAddress') : null);

  // ===========================================================================
  // Dashboard details
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!userAddress) {
      setDashboardDetails(null);
      setPortFolioId([]);
      setFortFolioDetails(null);
      setLast7Days([]);
      setUsdPerRama(null);
      setComprehensiveCapStatus(null);
      setComprehensiveCapError(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setDashError(null);
      setComprehensiveCapError(null);
      try {
        const [portfolioInfo, dashboardInfo, earningsTrend, capStatus] = await Promise.all([
          getTOtalPortFolio(userAddress),
          getDashboardDetails(userAddress),
          get7DayEarningTrend(userAddress),
          getComprehensiveCapStatus(userAddress),
        ]);

        if (cancelled) return;

        const aggregatedPortfolios = Array.isArray(dashboardInfo?.portfolios)
          ? dashboardInfo.portfolios
          : [];
        const ids =
          aggregatedPortfolios.length > 0
            ? aggregatedPortfolios.map((p) => Number(p.pid))
            : (portfolioInfo?.ArrPortfolio ?? []).map((id) => Number(id));
        setPortFolioId(ids);

        setSelectedPid((prev) => {
          if (!ids.length) return null;
          if (prev !== null && ids.includes(Number(prev))) {
            return Number(prev);
          }
          return ids[0];
        });

        setDashboardDetails(dashboardInfo ?? null);
        if (aggregatedPortfolios.length > 0) {
          const initialPid =
            (aggregatedPortfolios.length && (ids.includes(Number(selectedPid)) ? Number(selectedPid) : aggregatedPortfolios[0].pid));
          const matched =
            aggregatedPortfolios.find((p) => Number(p.pid) === Number(initialPid)) ??
            aggregatedPortfolios[0];
          setFortFolioDetails(matched ?? null);
        } else {
          setFortFolioDetails(portfolioInfo?.ProtFolioDetail ?? null);
        }
        setLast7Days(Array.isArray(earningsTrend) ? earningsTrend : []);
        setComprehensiveCapStatus(capStatus ?? null);
        setComprehensiveCapError(null);

        if (convertRamaToUsd) {
          try {
            const quote = await convertRamaToUsd(1);
            if (cancelled) return;
            setUsdPerRama(
              quote && Number.isFinite(Number(quote)) && Number(quote) > 0
                ? Number(quote)
                : null
            );
          } catch (priceErr) {
            if (cancelled) return;
            console.warn('Unable to fetch RAMA/USD quote:', priceErr);
            setUsdPerRama(null);
          }
        } else if (!cancelled) {
          setUsdPerRama(null);
        }
      } catch (error) {
        if (cancelled) return;
        console.error(error);
        setDashError(error?.message || 'Failed to load dashboard data');
        setComprehensiveCapError(error?.message || 'Failed to load cap status');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [userAddress, getTOtalPortFolio, getDashboardDetails, get7DayEarningTrend, convertRamaToUsd]);

  const refreshIncomeTotals = useCallback(async () => {
    if (!userAddress || typeof getIncomeTotals !== 'function') {
      setIncomeTotalsBreakdown(null);
      setIncomeTotalsLoading(false);
      setIncomeTotalsError('');
      return;
    }

    setIncomeTotalsLoading(true);
    setIncomeTotalsError('');
    try {
      const totals = await getIncomeTotals(userAddress);
      setIncomeTotalsBreakdown(totals ?? null);
    } catch (error) {
      console.error('Income totals fetch failed:', error);
      setIncomeTotalsBreakdown(null);
      setIncomeTotalsError(error?.message || 'Unable to load income totals.');
    } finally {
      setIncomeTotalsLoading(false);
    }
  }, [userAddress, getIncomeTotals]);

  useEffect(() => {
    refreshIncomeTotals();
  }, [refreshIncomeTotals]);

  const loadPortfolioById = async (pid) => {
    try {
      if (pid === null || pid === undefined) return;
      const aggregated =
        DashBoardDetail?.portfolios?.find((p) => Number(p.pid) === Number(pid)) ??
        null;
      if (aggregated) {
        setFortFolioDetails(aggregated);
        return;
      }
      const res = await getPortFoliById(pid);
      setFortFolioDetails(res);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (!portfolioIds.length || selectedPid === null) return;
    loadPortfolioById(selectedPid);
  }, [selectedPid, portfolioIds.length, DashBoardDetail?.portfolios]);

  useEffect(() => {
    if (selectedPid !== null && Number.isFinite(Number(selectedPid))) {
      localStorage.setItem('selectedPortfolioId', String(selectedPid));
    }
  }, [selectedPid]);

  const microToUsd = (value) => (value ? Number(value) / 1e6 : 0);
  const wadToPercent = (value) => (value ? Number(value) / 1e16 : 0);
  const toNumberSafe = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  };

  const formatTimestamp = (value) => {
    if (value == null) return null;
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    return new Date(numeric * 1000).toLocaleString();
  };

  const hasPortfolio = Boolean(portFolioDetails);
  const normalizeUsd = ({ float, display, micro }) => {
    if (float != null && Number.isFinite(Number(float))) {
      return Number(float);
    }
    if (display != null && Number.isFinite(Number(display))) {
      return Number(display);
    }
    if (micro != null && Number.isFinite(Number(micro))) {
      return microToUsd(micro);
    }
    return 0;
  };
  const formatCapUsd = (value) => {
    if (value == null) return 0;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return numeric / 1e6;
  };
  const principalUSD = hasPortfolio
    ? normalizeUsd({
        float: portFolioDetails.principalUsd,
        display: portFolioDetails.principalUsdDisplay,
        micro:
          portFolioDetails.principalUsdMicro ??
          portFolioDetails.principalUSD ??
          portFolioDetails.principalUsdRaw,
      })
    : 0;
  const capPct = hasPortfolio ? Number(portFolioDetails.capPct ?? 0) : 0;
  const capProgressBps = hasPortfolio ? Number(portFolioDetails.capProgressBps ?? 0) : 0;
  const maturityTargetUsd = hasPortfolio
    ? normalizeUsd({
        float: portFolioDetails.capUsd,
        display: portFolioDetails.capUsdDisplay,
        micro:
          portFolioDetails.capUsdMicro ??
          portFolioDetails.capUSD ??
          portFolioDetails.capUsdRaw,
      }) || principalUSD * (capPct / 100 || 0)
    : 0;
  const freezeEndsAt = hasPortfolio ? Number(portFolioDetails.frozenUntil ?? 0) : 0;
  const createdAt = hasPortfolio ? Number(portFolioDetails.createdAt ?? 0) : 0;
  const isBoosterActive = hasPortfolio && Boolean(portFolioDetails?.booster);
  const dailyRatePercent = hasPortfolio ? wadToPercent(portFolioDetails?.dailyRateWad) : 0;
  const daysActive = createdAt ? Math.max(0, Math.floor((Date.now() / 1000 - createdAt) / 86400)) : null;

  const selectedPortfolioPid =
    selectedPid ?? (portfolioIds.length ? Number(portfolioIds[0]) : null);
  const dashboardPortfolio = DashBoardDetail?.portfolios?.find(
    (entry) => Number(entry?.pid) === selectedPortfolioPid
  ) ?? null;
  const totalStakedUsdBase = toNumberSafe(
    DashBoardDetail?.totals?.totalStakedUsd ??
    DashBoardDetail?.totals?.totalValueUsd ??
    0
  );

  const portfolioPrincipalUsd = dashboardPortfolio?.principalUsd ?? principalUSD;
  const capPercentValue = dashboardPortfolio?.capPct ?? capPct;
  const expectedCapFromPercent = capPercentValue
    ? portfolioPrincipalUsd * (capPercentValue / 100)
    : portfolioPrincipalUsd * (isBoosterActive ? 2.5 : 2);
  let portfolioCapUsd = dashboardPortfolio?.capUsd ?? maturityTargetUsd;
  if (
    !portfolioCapUsd ||
    portfolioCapUsd <= 0 ||
    (expectedCapFromPercent > 0 &&
      Math.abs(portfolioCapUsd - expectedCapFromPercent) / expectedCapFromPercent > 0.2)
  ) {
    portfolioCapUsd = expectedCapFromPercent;
  }
  const creditedUsdValue = dashboardPortfolio?.creditedUsd ?? portFolioDetails?.creditedUsd ?? 0;
  const pendingUsdValue = dashboardPortfolio?.pendingUsd ?? 0;
  const totalAccruedRewardUsd = creditedUsdValue + pendingUsdValue;
  const remainingRewardUsd = Math.max(0, portfolioCapUsd - totalAccruedRewardUsd);

  const cap4xUsd = comprehensiveCapStatus ? formatCapUsd(comprehensiveCapStatus.cap4xUSD6) : 0;
  const totalPortfolioUsd = comprehensiveCapStatus ? formatCapUsd(comprehensiveCapStatus.totalPortfolioValueUSD6) : portfolioCapUsd;
  const totalIncomeEarnedUsd = comprehensiveCapStatus ? formatCapUsd(comprehensiveCapStatus.totalIncomeEarnedUSD6) : totalAccruedRewardUsd;
  const remainingCapUsd = comprehensiveCapStatus ? formatCapUsd(comprehensiveCapStatus.remainingCapUSD6) : Math.max(0, cap4xUsd - totalIncomeEarnedUsd);
  const capProgressPercent = cap4xUsd > 0 ? Math.min(100, (totalIncomeEarnedUsd / cap4xUsd) * 100) : 0;
  const capProgressWidth = Number.isFinite(capProgressPercent) ? Math.max(0, Math.min(capProgressPercent, 100)) : 0;
  const capProgressDisplay = Number.isFinite(capProgressPercent) ? capProgressPercent.toFixed(2) : '0.00';
  const hasCapStatus = comprehensiveCapStatus != null;

  const cappedAtLabel = hasPortfolio ? formatTimestamp(portFolioDetails?.cappedAt) : null;
  const closedAtLabel = hasPortfolio ? formatTimestamp(portFolioDetails?.closedAt) : null;
  const lastAccrualLabel = hasPortfolio ? formatTimestamp(portFolioDetails?.lastAccrual) : null;

  const computedProgressFromTotals =
    portfolioCapUsd > 0
      ? Math.min(100, (totalAccruedRewardUsd / portfolioCapUsd) * 100)
      : 0;
  const progressRaw = capProgressBps
    ? capProgressBps / 100
    : computedProgressFromTotals;
  const progress = hasPortfolio ? Math.min(100, progressRaw) : 0;
  const progressLabel = hasPortfolio && Number.isFinite(progress)
    ? progress.toFixed(2)
    : null;
  const capLabel = capPercentValue
    ? `(${capPercentValue}% Cap${isBoosterActive ? ' • Booster' : ''})`
    : '';

  const summaryReady = Boolean(DashBoardDetail);
  const summaryLoading = !summaryReady;
  const fallbackIncomeTotals = summaryReady ? DashBoardDetail?.incomeTotalsUsd ?? {} : {};
  const totalStakedUsd = summaryReady ? totalStakedUsdBase : 0;
  const userStatus = summaryReady ? DashBoardDetail?.userStatus ?? null : null;
  const totalClaimableUsd = summaryReady
    ? DashBoardDetail?.totalClaimableUsd ?? DashBoardDetail?.incomeTotalsUsd?.total ?? 0
    : 0;
  const rawTotalEarnedUsd = summaryReady
    ? DashBoardDetail?.totalEarningsUsd ?? null
    : null;
  const totalEarnedUsdFromRama =
    summaryReady &&
    (rawTotalEarnedUsd == null || Number(rawTotalEarnedUsd) === 0) &&
    DashBoardDetail?.totalEarningsRama != null &&
    usdPerRama
      ? Number(DashBoardDetail.totalEarningsRama) * Number(usdPerRama)
      : rawTotalEarnedUsd;
  const growthUsd = incomeTotalsBreakdown?.growthUsd ?? fallbackIncomeTotals.growth ?? 0;
  const slabUsd = incomeTotalsBreakdown?.slabIncomeUsd ?? fallbackIncomeTotals.slab ?? 0;
  const royaltyUsd = incomeTotalsBreakdown?.royaltyUsd ?? fallbackIncomeTotals.royalty ?? 0;
  const overrideUsd = fallbackIncomeTotals.override ?? 0;
  const rewardUsd = incomeTotalsBreakdown?.rewardUsd ?? fallbackIncomeTotals.rewards ?? 0;
  const directIncomeUsd = incomeTotalsBreakdown?.directIncomeUsd ??
    fallbackIncomeTotals.direct ??
    fallbackIncomeTotals.directIncome ??
    0;
  const boosterRoiUsd = incomeTotalsBreakdown?.boosterRoiUsd ?? 0;
  const totalRoiUsd = incomeTotalsBreakdown?.totalRoiUsd ?? 0;
  const todayRoiUsd = incomeTotalsBreakdown?.todayRoiUsd ?? 0;
  const totalEarnedUsd = summaryReady
    ? incomeTotalsBreakdown?.allIncomesUsd ??
      fallbackIncomeTotals.total ??
      totalEarnedUsdFromRama ??
      DashBoardDetail?.totalEarningsUsd ??
      0
    : 0;
  const incomeBreakdownRows = [
    { label: 'Portfolio ROI', value: totalRoiUsd },
    { label: 'ROI (Today)', value: todayRoiUsd },
    { label: 'ROI (Booster)', value: boosterRoiUsd },
    { label: 'Direct Income', value: directIncomeUsd },
    { label: 'Slab Income', value: slabUsd },
    { label: 'Royalty Income', value: royaltyUsd },
    { label: 'Rewards', value: rewardUsd },
    { label: 'Growth Income', value: growthUsd },
  ];
  const safeWalletRama = summaryReady ? DashBoardDetail?.safeWallet?.rama ?? 0 : 0;
  const directMembers =
    DashBoardDetail?.slabPanel?.directMembers ??
    DashBoardDetail?.userStatus?.directs ??
    0;
  const slabLevel =
    DashBoardDetail?.slabPanel?.slabIndex ??
    DashBoardDetail?.userStatus?.slabLevel ??
    0;
  const slabNames = [
    'Coral Reef',
    'Shallow Waters',
    'Tide Pool',
    'Wave Crest',
    'Open Sea',
    'Deep Current',
    'Ocean Floor',
    'Abyssal Zone',
    'Mariana Trench',
    'Pacific Master',
    'Ocean Sovereign',
  ];
  const slabName = slabNames[slabLevel - 1] ?? 'None';
  const totalTeamMembers =
    DashBoardDetail?.teamCount ??
    DashBoardDetail?.slabPanel?.teamCount ??
    DashBoardDetail?.userStatus?.teamCount ??
    directMembers ??
    0;

  const renderLoading = (label = 'Loading…') => (
    <span className="inline-flex items-center gap-2 text-cyan-200 text-sm">
      <Loader2 className="animate-spin" size={14} />
      <span>{label}</span>
    </span>
  );

  const formatCount = (value) => Number(value ?? 0).toLocaleString('en-US');
  const formatRamaWithUnit = (value) => `${formatRAMA(value ?? 0)} RAMA`;

  const handleSelectPid = (event) => {
    const { value } = event.target;
    setSelectedPid(value === '' ? null : Number(value));
  };

  const qualifiedVolumeUsd =
    (userStatus?.qualifiedVolumeUsd ??
    DashBoardDetail?.slabPanel?.qualifiedVolumeUsd ??
    DashBoardDetail?.totals?.qualifiedVolumeUsd ??
    0);
  const royaltyLevel =
    userStatus?.royaltyLevel ?? DashBoardDetail?.totals?.royaltyLevel ?? 0;
  const royaltyPayouts = summaryReady ? royaltyUsd : null;
  const combinedBackendUsd = slabUsd + royaltyUsd + overrideUsd;
  const readyToClaimUsd = totalClaimableUsd;

  const activityItems = [
    {
      icon: DollarSign,
      wrapperClass: 'bg-neon-green/20 border border-neon-green/30',
      iconClass: 'text-neon-green',
      valueClass: 'text-neon-green',
      title: 'Claimable Balance',
      value: summaryLoading ? renderLoading() : formatUSD(readyToClaimUsd),
      subtitle: 'Current on-chain claimable rewards',
    },
    {
      icon: Gift,
      wrapperClass: 'bg-cyan-400/20 border border-cyan-400/30',
      iconClass: 'text-cyan-400',
      valueClass: 'text-cyan-300',
      title: 'One-Time Rewards',
      value: summaryLoading ? renderLoading() : formatUSD(rewardUsd),
      subtitle: 'Lifetime milestone bonuses (on-chain)',
    },
    {
      icon: Users,
      wrapperClass: 'bg-neon-orange/20 border border-neon-orange/30',
      iconClass: 'text-neon-orange',
      valueClass: 'text-neon-orange',
      title: 'Team Distributions',
      value: summaryLoading
        ? renderLoading()
        : combinedBackendUsd > 0
          ? formatUSD(combinedBackendUsd)
          : 'Backend sync pending',
      subtitle: 'Slab, override, royalty payouts handled off-chain',
    },
  ];

  const portfolioStatus = useMemo(() => {
    const isClosed = hasPortfolio
      ? (portFolioDetails?.isClosed ?? portFolioDetails?.active === false)
      : false;
    const isCapped = Boolean(portFolioDetails?.isCapped);
    const isFrozen = freezeEndsAt && freezeEndsAt * 1000 > Date.now();

    if (!hasPortfolio) {
      return portfolioIds.length ? PortfolioStatus.Running : 'No Portfolio';
    }
    if (isClosed) return PortfolioStatus.Closed;
    if (isCapped) return PortfolioStatus.Capped;
    if (isFrozen) return PortfolioStatus.Frozen;
    return PortfolioStatus.Running;
  }, [
    hasPortfolio,
    portFolioDetails?.isClosed,
    portFolioDetails?.active,
    portFolioDetails?.isCapped,
    portfolioIds.length,
    freezeEndsAt,
  ]);

  const portfolioStatusColor = useMemo(() => {
    switch (portfolioStatus) {
      case PortfolioStatus.Closed:
        return 'bg-red-400';
      case PortfolioStatus.Capped:
        return 'bg-neon-orange';
      case PortfolioStatus.Frozen:
        return 'bg-cyan-400';
      case PortfolioStatus.Running:
        return 'bg-neon-green';
      default:
        return 'bg-slate-400';
    }
  }, [portfolioStatus]);

  const portfolioStatusTextClass = useMemo(() => {
    switch (portfolioStatus) {
      case PortfolioStatus.Closed:
        return 'text-red-300';
      case PortfolioStatus.Capped:
        return 'text-neon-orange';
      case PortfolioStatus.Frozen:
        return 'text-cyan-300';
      case PortfolioStatus.Running:
        return 'text-neon-green';
      default:
        return 'text-cyan-200';
    }
  }, [portfolioStatus]);

  const portfolioStatusBadgeClass = useMemo(() => {
    switch (portfolioStatus) {
      case PortfolioStatus.Closed:
        return 'border-red-400/60 text-red-300 bg-red-400/10';
      case PortfolioStatus.Capped:
        return 'border-neon-orange/60 text-neon-orange bg-neon-orange/10';
      case PortfolioStatus.Frozen:
        return 'border-cyan-400/60 text-cyan-300 bg-cyan-400/10';
      case PortfolioStatus.Running:
        return 'border-neon-green/60 text-neon-green bg-neon-green/10';
      default:
        return 'border-cyan-500/30 text-cyan-200 bg-cyan-500/10';
    }
  }, [portfolioStatus]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-neon-green bg-clip-text text-transparent relative inline-block">
            Dashboard
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-neon-green/20 blur-xl -z-10" />
          </h1>
          <p className="text-sm sm:text-base text-cyan-300/70 mt-1">Welcome back! Here's your complete overview</p>
        </div>
        <div className="flex items-center gap-2 px-3 sm:px-4 py-2 cyber-glass border border-cyan-500/30 rounded-lg flex-shrink-0 w-fit">
          <div className={`w-2 h-2 rounded-full ${portfolioStatusColor} animate-pulse`} />
          <span className={`text-xs sm:text-sm font-medium uppercase tracking-wide ${portfolioStatusTextClass}`}>
            {portfolioStatus}
          </span>
        </div>
      </div>

      {dashError && (
        <div className="cyber-glass border border-red-400/40 bg-red-500/5 text-red-300 rounded-xl px-4 py-3 text-sm">
          {dashError}
        </div>
      )}
      {isLoading && (
        <div className="cyber-glass border border-cyan-500/30 text-cyan-200 rounded-xl px-4 py-3 text-sm">
          Syncing latest on-chain data…
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Link to="/dashboard" className="cyber-glass border border-cyan-500/30 hover:border-cyan-500/80 rounded-xl p-4 sm:p-5 text-white transition-all group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center gap-3 mb-3 relative z-10">
            <div className="p-2 bg-cyan-500/20 rounded-lg flex-shrink-0 border border-cyan-500/30">
              <Wallet size={20} className="text-cyan-400" />
            </div>
            <p className="text-xs sm:text-sm font-medium text-cyan-300 uppercase tracking-wide">Staked Portfolio</p>
          </div>
          <NumberPopup
            value={formatUSD(totalStakedUsd)}
            label="Staked Portfolio"
            className="text-xl sm:text-2xl font-bold mb-2 text-cyan-400 relative z-10"
            isLoading={summaryLoading}
          />
          <div className="flex items-center gap-1 text-xs text-cyan-300/90 relative z-10">
            <span>View Portfolio</span>
            <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </Link>

        <div
          role="button"
          tabIndex={0}
          onClick={() => setShowIncomeModal(true)}
          onKeyDown={(e) => e.key === 'Enter' && setShowIncomeModal(true)}
          className="w-full cyber-glass border border-neon-green/30 hover:border-neon-green/80 rounded-xl p-4 sm:p-5 text-white transition-all group relative overflow-hidden text-left cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-neon-green/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between mb-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-neon-green/20 rounded-lg flex-shrink-0 border border-neon-green/30">
                <TrendingUp size={20} className="text-neon-green" />
              </div>
              <p className="text-xs sm:text-sm font-medium text-neon-green uppercase tracking-wide">Total Earned</p>
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                if (!incomeTotalsLoading) {
                  refreshIncomeTotals();
                }
              }}
              disabled={incomeTotalsLoading}
              className="inline-flex items-center justify-center p-2 rounded-full border border-neon-green/30 text-neon-green hover:border-neon-green/60 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Refresh income totals"
            >
              <RefreshCw size={14} className={incomeTotalsLoading ? 'animate-spin' : ''} />
            </button>
          </div>
          <NumberPopup
            value={formatUSD(totalEarnedUsd)}
            label="Total Earned"
            className="text-xl sm:text-2xl font-bold mb-2 text-neon-green relative z-10"
            isLoading={summaryLoading || incomeTotalsLoading}
          />
          <div className="flex items-center gap-1 text-xs text-neon-green/70 relative z-10">
            <span>{incomeTotalsLoading ? 'Loading breakdown…' : 'View earnings breakdown'}</span>
            <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          {incomeTotalsError && !incomeTotalsLoading && (
            <p className="mt-2 text-[11px] text-neon-orange/80 relative z-10">
              {incomeTotalsError}
            </p>
          )}
        </div>

        <Link to="/dashboard/team" className="cyber-glass border border-neon-orange/30 hover:border-neon-orange/80 rounded-xl p-4 sm:p-5 text-white transition-all group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-neon-orange/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center gap-3 mb-3 relative z-10">
            <div className="p-2 bg-neon-orange/20 rounded-lg flex-shrink-0 border border-neon-orange/30">
              <Users size={20} className="text-neon-orange" />
            </div>
            <p className="text-xs sm:text-sm font-medium text-neon-orange uppercase tracking-wide">Team Network</p>
          </div>
          <p className="text-xl sm:text-2xl font-bold mb-2 text-neon-orange relative z-10">
            {summaryLoading ? (
              renderLoading()
            ) : (
              <>
                {formatCount(totalTeamMembers)}
                <span className="text-sm font-semibold text-neon-orange/80 ml-1">members</span>
              </>
            )}
          </p>
          {!summaryLoading && (
            <p className="text-xs text-neon-orange/70 relative z-10">
              Directs: {formatCount(directMembers)}
            </p>
          )}
          <div className="flex items-center gap-1 text-xs text-neon-orange/70 relative z-10">
            <span>View Team</span>
            <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </Link>

        <Link to="/dashboard/safe-wallet" className="cyber-glass border border-cyan-400/30 hover:border-cyan-400/80 rounded-xl p-4 sm:p-5 text-white transition-all group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center gap-3 mb-3 relative z-10">
            <div className="p-2 bg-cyan-400/20 rounded-lg flex-shrink-0 border border-cyan-400/30">
              <Wallet size={20} className="text-cyan-400" />
            </div>
            <p className="text-xs sm:text-sm font-medium text-cyan-400 uppercase tracking-wide">Safe Wallet</p>
          </div>
          <NumberPopup
            value={formatRamaWithUnit(safeWalletRama)}
            label="Safe Wallet"
            className="text-xl sm:text-2xl font-bold mb-2 text-cyan-400 relative z-10"
            isLoading={summaryLoading}
          />
          <div className="flex items-center gap-1 text-xs text-cyan-300/90 relative z-10">
            <span>Manage Wallet</span>
            <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <div className="cyber-glass rounded-2xl p-4 sm:p-6 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-cyan-300 uppercase tracking-wide">
                  Lifetime 4x Cap Progress
                </h2>
                <p className="text-xs text-cyan-300/80">
                  Global earnings cap across all active portfolios
                </p>
              </div>
              <span className="text-sm font-bold text-neon-green">
                {hasCapStatus ? `${capProgressDisplay}%` : '—'}
              </span>
            </div>

            {hasCapStatus ? (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2 gap-2">
                    <span className="text-xs sm:text-sm font-medium text-cyan-400 uppercase tracking-wider">
                      Cap Progress
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-neon-green">
                      {capProgressDisplay}%
                    </span>
                  </div>
                  <div className="h-3 bg-dark-900 rounded-full overflow-hidden border border-cyan-500/30 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-neon-green/20 animate-pulse" />
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-neon-green rounded-full transition-all relative z-10"
                      style={{ width: `${capProgressWidth.toFixed(2)}%` }}
                    />
                  </div>
                  <p className="text-xs text-cyan-300/90 mt-1">
                    {formatUSD(totalIncomeEarnedUsd)} / {formatUSD(cap4xUsd)}
                    <span className="ml-1 text-neon-green">4x cap</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                  <div className="p-3 sm:p-4 cyber-glass rounded-xl border border-cyan-500/30 hover:border-cyan-500/80 transition-all">
                    <p className="text-[11px] text-cyan-400 uppercase tracking-wider">
                      Total Portfolio
                    </p>
                    <p className="text-lg sm:text-xl font-bold text-cyan-300">
                      {formatUSD(totalPortfolioUsd)}
                    </p>
                    <p className="text-[11px] text-cyan-300/70 mt-1">
                      Active stake amount
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 cyber-glass rounded-xl border border-neon-purple/30 hover:border-neon-purple/80 transition-all">
                    <p className="text-[11px] text-neon-purple uppercase tracking-wider">
                      Total Available Cap
                    </p>
                    <p className="text-lg sm:text-xl font-bold text-neon-purple">
                      {formatUSD(cap4xUsd)}
                    </p>
                    <p className="text-[11px] text-neon-purple/70 mt-1">
                      4x of active portfolio
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 cyber-glass rounded-xl border border-neon-green/30 hover:border-neon-green/80 transition-all">
                    <p className="text-[11px] text-neon-green uppercase tracking-wider">
                      Used Cap
                    </p>
                    <p className="text-lg sm:text-xl font-bold text-neon-green">
                      {formatUSD(totalIncomeEarnedUsd)}
                    </p>
                    <p className="text-[11px] text-neon-green/70 mt-1">
                      Earned from ROI & slabs
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 cyber-glass rounded-xl border border-neon-orange/30 hover:border-neon-orange/80 transition-all">
                    <p className="text-[11px] text-neon-orange uppercase tracking-wider">
                      Remaining Cap
                    </p>
                    <p className="text-lg sm:text-xl font-bold text-neon-orange">
                      {formatUSD(remainingCapUsd)}
                    </p>
                    <p className="text-[11px] text-neon-orange/70 mt-1">
                      Capacity left to earn
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 sm:p-4 border border-cyan-500/20 rounded-xl bg-dark-900/40 text-xs text-cyan-300/80">
                Cap status data not yet available.
              </div>
            )}

            {comprehensiveCapError && (
              <p className="text-xs text-neon-orange/80 mt-4">{comprehensiveCapError}</p>
            )}
          </div>

          <div className="cyber-glass rounded-2xl p-4 sm:p-6 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h2 className="text-base sm:text-lg font-semibold text-cyan-300 uppercase tracking-wide">Portfolio Status</h2>
              {isBoosterActive && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-neon-orange to-neon-pink text-white rounded-lg text-xs sm:text-sm font-bold flex-shrink-0 w-fit shadow-lg animate-glow-pulse border border-neon-orange/50">
                  <Zap size={14} className="animate-pulse" />
                  <span className="uppercase">Booster Active</span>
                </div>
              )}
              {hasPortfolio && (
                <div className={`px-3 py-1.5 rounded-lg border text-xs sm:text-sm font-bold flex-shrink-0 w-fit ${portfolioStatusBadgeClass}`}>
                  <span className="uppercase">{portfolioStatus}</span>
                </div>
              )}

              {/* Portfolio ID Select */}
              <div className="w-full sm:w-auto">
                <label className="block text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
                  Portfolio ID
                </label>
                <div className="relative">
                  <select
                    value={selectedPid ?? ''}
                    onChange={handleSelectPid}
                    className="
                      peer w-full sm:w-56 appearance-none pr-10 pl-3 py-2 rounded-lg
                      bg-dark-900/60 text-cyan-200 border border-cyan-500/30
                      focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-400
                      transition-all cyber-glass
                    "
                  >
                    {portfolioIds.length === 0 && <option value="">No portfolios</option>}
                    {portfolioIds.map((pid) => (
                      <option key={pid} value={pid}>
                        {pid}
                      </option>
                    ))}
                  </select>

                  {/* Chevron */}
                  <svg
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-70"
                    width="18" height="18" viewBox="0 0 24 24" fill="none"
                  >
                    <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>


              </div>
            </div>

            <div className="space-y-4">
              <div>

                {portfolioIds.length !== 0 ? (
                  hasPortfolio ? (
                    <>
                      <div className="flex justify-between items-center mb-2 gap-2">
                        <span className="text-xs sm:text-sm font-medium text-cyan-400 uppercase tracking-wider">Portfolio Cap Progress</span>
                        <span className="text-xs sm:text-sm font-bold text-neon-green">{progressLabel ?? '—'}%</span>
                      </div>
                      <div className="h-3 bg-dark-900 rounded-full overflow-hidden border border-cyan-500/30 relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-neon-green/20 animate-pulse" />
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-neon-green rounded-full transition-all relative z-10"
                          style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }}
                        />
                      </div>
                      <p className="text-xs text-cyan-300/90 mt-1">
                        {formatUSD(portfolioPrincipalUsd)} / {formatUSD(portfolioCapUsd)}
                        {capLabel && <span className="ml-1 text-neon-green">{capLabel}</span>}
                      </p>
                      {(portFolioDetails?.isCapped || portFolioDetails?.isClosed || portFolioDetails?.isActivatedFromSafeWallet || lastAccrualLabel) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-cyan-300/80 mt-2">
                          {portFolioDetails?.isCapped && (
                            <div>
                              <span className="text-cyan-200/80 font-semibold uppercase tracking-wider">Capped</span>
                              <div>{cappedAtLabel ?? 'Cap limit reached'}</div>
                            </div>
                          )}
                          {portFolioDetails?.isClosed && (
                            <div>
                              <span className="text-cyan-200/80 font-semibold uppercase tracking-wider">Closed</span>
                              <div>{closedAtLabel ?? 'Closed'}</div>
                            </div>
                          )}
                          {lastAccrualLabel && (
                            <div>
                              <span className="text-cyan-200/80 font-semibold uppercase tracking-wider">Last Accrual</span>
                              <div>{lastAccrualLabel}</div>
                            </div>
                          )}
                          {portFolioDetails?.isActivatedFromSafeWallet && (
                            <div>
                              <span className="text-cyan-200/80 font-semibold uppercase tracking-wider">Activation</span>
                              <div>Safe Wallet</div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-xs text-cyan-300/80">Synchronizing portfolio details…</div>
                  )
                ) : (
                  <div className="text-xs text-cyan-300/80">No portfolio data available.</div>
                )}
              </div>

              {portfolioIds.length !== 0 && hasPortfolio && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mt-4">
                  <div className="p-3 sm:p-4 cyber-glass rounded-xl border border-neon-green/30 hover:border-neon-green/80 transition-all">
                    <p className="text-xs text-neon-green font-medium uppercase tracking-wider mb-1">
                      Total Accrued Reward
                    </p>
                    <p className="text-lg sm:text-xl font-bold text-neon-green">
                      {formatUSD(totalAccruedRewardUsd)}
                    </p>
                    <p className="text-[11px] text-neon-green/70 mt-1">
                      Pending: {formatUSD(pendingUsdValue)}
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 cyber-glass rounded-xl border border-cyan-500/30 hover:border-cyan-500/80 transition-all">
                    <p className="text-xs text-cyan-400 font-medium uppercase tracking-wider mb-1">
                      Portfolio Principal
                    </p>
                    <p className="text-lg sm:text-xl font-bold text-cyan-300">
                      {formatUSD(portfolioPrincipalUsd)}
                    </p>
                    <p className="text-[11px] text-cyan-300/70 mt-1">
                      Active since {daysActive != null ? `${daysActive} days` : '—'}
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 cyber-glass rounded-xl border border-neon-purple/30 hover:border-neon-purple/80 transition-all">
                    <p className="text-xs text-neon-purple font-medium uppercase tracking-wider mb-1">
                      Cap Target
                    </p>
                    <p className="text-lg sm:text-xl font-bold text-neon-purple">
                      {formatUSD(portfolioCapUsd)}
                    </p>
                    <p className="text-[11px] text-neon-purple/70 mt-1">
                      {capPercentValue || capPercentValue === 0 ? `${capPercentValue}% Cap` : '—'}
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 cyber-glass rounded-xl border border-neon-orange/30 hover:border-neon-orange/80 transition-all">
                    <p className="text-xs text-neon-orange font-medium uppercase tracking-wider mb-1">
                      Remaining Reward
                    </p>
                    <p className="text-lg sm:text-xl font-bold text-neon-orange">
                      {formatUSD(remainingRewardUsd)}
                    </p>
                    <p className="text-[11px] text-neon-orange/70 mt-1">
                      Until full cap
                    </p>
                  </div>
                </div>
              )}

              {portfolioIds.length !== 0 && hasPortfolio && (
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <div className="p-3 sm:p-4 cyber-glass rounded-xl border border-cyan-500/30 hover:border-cyan-500/80 transition-all group">
                    <p className="text-xs text-cyan-400 font-medium mb-1 uppercase tracking-wider">Daily Rate</p>
                    <p className="text-lg sm:text-xl font-bold text-cyan-300 group-hover:text-neon-glow transition-all">
                      {dailyRatePercent ? `${dailyRatePercent.toFixed(2)}%` : '—'}
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 cyber-glass rounded-xl border border-neon-green/30 hover:border-neon-green/80 transition-all group">
                    <p className="text-xs text-neon-green font-medium mb-1 uppercase tracking-wider">Direct Refs</p>
                    <p className="text-lg sm:text-xl font-bold text-neon-green group-hover:text-neon-glow transition-all">
                      {summaryLoading ? renderLoading() : formatCount(directMembers)}
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 cyber-glass rounded-xl border border-neon-orange/30 hover:border-neon-orange/80 transition-all group">
                    <p className="text-xs text-neon-orange font-medium mb-1 uppercase tracking-wider">Slab Tier</p>
                    <p className="text-lg sm:text-xl font-bold text-neon-orange group-hover:text-neon-glow transition-all">
                      {summaryReady ? slabName : '—'}
                    </p>
                    <p className="text-xs text-neon-orange/70 mt-0.5">Level {slabLevel || '—'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="cyber-glass rounded-2xl p-4 sm:p-6 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
            <h2 className="text-base sm:text-lg font-semibold text-cyan-300 mb-4 uppercase tracking-wide">7-Day Earnings Trend</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={last7Day.length ? last7Day : [{ day: '—', amount: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,240,255,0.1)" />
                <XAxis dataKey="day" stroke="#22d3ee" fontSize={12} />
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
                  stroke="url(#dashGradient)"
                  strokeWidth={3}
                  dot={{ fill: '#00f0ff', r: 5, strokeWidth: 2, stroke: '#39ff14' }}
                />
                <defs>
                  <linearGradient id="dashGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#00f0ff" />
                    <stop offset="100%" stopColor="#39ff14" />
                  </linearGradient>
                </defs>
              </LineChart>
            </ResponsiveContainer>
          </div>

          <LivePriceFeed />
        </div>

        <div className="space-y-4 sm:space-y-6">
          <div className="cyber-glass border border-neon-green/50 hover:border-neon-green rounded-2xl p-4 sm:p-6 text-white relative overflow-hidden group transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-neon-green/10 to-cyan-500/10 opacity-50 group-hover:opacity-70 transition-opacity" />
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon-green/70 to-transparent" />
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="p-2 bg-neon-green/20 rounded-lg flex-shrink-0 border border-neon-green/40">
                <TrendingUp size={20} className="text-neon-green" />
              </div>
              <div>
                <p className="text-sm text-neon-green font-medium uppercase tracking-wide">Accrued Growth</p>
                <p className="text-xs text-cyan-300/90">Available to claim</p>
              </div>
            </div>
            <NumberPopup
              value={formatUSD(DashBoardDetail?.accruedGrowthUsd ?? 0)}
              label="Accrued Growth"
              className="text-2xl sm:text-3xl font-bold mb-4 text-neon-green relative z-10"
              isLoading={summaryLoading}
            />
            <Link
              to="/dashboard/earnings"
              className="block w-full py-2.5 sm:py-3 bg-gradient-to-r from-cyan-500 to-neon-green hover:from-cyan-400 hover:to-neon-green/90 rounded-lg text-sm sm:text-base font-bold transition-all text-dark-950 text-center relative z-10 group-hover:shadow-neon-green"
            >
              Claim Now
            </Link>
          </div>

          <div className="cyber-glass rounded-2xl p-4 sm:p-6 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
            <h3 className="text-base font-semibold text-cyan-300 mb-4 uppercase tracking-wide">Quick Actions</h3>
            <div className="space-y-2">
              <Link
                to="/dashboard/stake"
                className="flex items-center gap-3 p-3 cyber-glass hover:bg-cyan-500/10 rounded-lg transition-all group border border-transparent hover:border-cyan-500/30"
              >
                <div className="p-2 bg-cyan-500/20 rounded-lg flex-shrink-0 border border-cyan-500/30">
                  <Wallet className="text-cyan-400" size={16} />
                </div>
                <span className="text-sm font-medium text-cyan-300 flex-1">Stake & Invest</span>
                <ArrowUpRight size={16} className="text-cyan-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>

              <Link
                to="/dashboard/slab"
                className="flex items-center gap-3 p-3 cyber-glass hover:bg-neon-green/10 rounded-lg transition-all group border border-transparent hover:border-neon-green/30"
              >
                <div className="p-2 bg-neon-green/20 rounded-lg flex-shrink-0 border border-neon-green/30">
                  <Award className="text-neon-green" size={16} />
                </div>
                <span className="text-sm font-medium text-neon-green flex-1">Slab Income</span>
                <ArrowUpRight size={16} className="text-neon-green group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>

              <Link
                to="/dashboard/royalty"
                className="flex items-center gap-3 p-3 cyber-glass hover:bg-neon-orange/10 rounded-lg transition-all group border border-transparent hover:border-neon-orange/30"
              >
                <div className="p-2 bg-neon-orange/20 rounded-lg flex-shrink-0 border border-neon-orange/30">
                  <Trophy className="text-neon-orange" size={16} />
                </div>
                <span className="text-sm font-medium text-neon-orange flex-1">Royalty Program</span>
                <ArrowUpRight size={16} className="text-neon-orange group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>

              <Link
                to="/dashboard/rewards"
                className="flex items-center gap-3 p-3 cyber-glass hover:bg-cyan-400/10 rounded-lg transition-all group border border-transparent hover:border-cyan-400/30"
              >
                <div className="p-2 bg-cyan-400/20 rounded-lg flex-shrink-0 border border-cyan-400/30">
                  <Gift className="text-cyan-400" size={16} />
                </div>
                <span className="text-sm font-medium text-cyan-400 flex-1">Rewards</span>
                <ArrowUpRight size={16} className="text-cyan-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          <div className="cyber-glass rounded-2xl p-4 sm:p-6 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
            <h3 className="text-base font-semibold text-cyan-300 mb-4 uppercase tracking-wide">Recent Activity</h3>
            <div className="space-y-3">
              {activityItems.map(({ icon: Icon, wrapperClass, iconClass, valueClass, title, value, subtitle }, idx) => (
                <div
                  key={`${title}-${idx}`}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-cyan-500/5 transition-colors"
                >
                  <div className={`p-1.5 rounded-lg flex-shrink-0 ${wrapperClass}`}>
                    <Icon className={iconClass} size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-cyan-300">{title}</p>
                    <p className={`text-xs font-semibold ${valueClass}`}>
                      {value}
                    </p>
                    <p className="text-xs text-cyan-400/60">{subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link to="/dashboard/analytics" className="cyber-glass rounded-xl p-5 border border-cyan-500/30 hover:border-cyan-500/80 transition-all group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center gap-3 mb-3 relative z-10">
            <div className="p-2 bg-cyan-500/20 rounded-lg flex-shrink-0 border border-cyan-500/30">
              <TrendingUp className="text-cyan-400" size={20} />
            </div>
            <p className="text-sm font-medium text-cyan-400 uppercase tracking-wide">Performance</p>
            <ArrowUpRight size={16} className="ml-auto text-cyan-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          <p className="text-2xl font-bold text-neon-green relative z-10">
            {hasPortfolio && progressLabel ? `${progressLabel}% to cap` : 'No active portfolio'}
          </p>
          <p className="text-xs text-cyan-300/90 mt-1 relative z-10">
            {hasPortfolio && daysActive != null ? `${daysActive} day${daysActive === 1 ? '' : 's'} active` : 'Stake to start tracking performance'}
          </p>
        </Link>

        <div className="cyber-glass rounded-xl p-5 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-neon-green/20 rounded-lg flex-shrink-0 border border-neon-green/30">
              <Award className="text-neon-green" size={20} />
            </div>
            <p className="text-sm font-medium text-neon-green uppercase tracking-wide">Qualified Volume</p>
          </div>
          <NumberPopup
            value={formatUSD(qualifiedVolumeUsd)}
            label="Qualified Volume"
            className="text-2xl font-bold text-cyan-300"
            isLoading={summaryLoading}
          />
          <p className="text-xs text-cyan-300/90 mt-1">
            Qualified business volume across directs
          </p>
        </div>

        <div className="cyber-glass rounded-xl p-5 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-neon-orange/20 rounded-lg flex-shrink-0 border border-neon-orange/30">
              <Trophy className="text-neon-orange" size={20} />
            </div>
            <p className="text-sm font-medium text-neon-orange uppercase tracking-wide">Royalty Status</p>
          </div>
          <p className="text-2xl font-bold text-cyan-300">
            Level {royaltyLevel || '—'}
          </p>
          <p className="text-xs text-cyan-300/90 mt-1">
            {royaltyPayouts != null ? `${formatUSD(royaltyPayouts)} lifetime` : 'Royalty accrual data pending'}
          </p>
        </div>
      </div>

      {showIncomeModal && (
        <>
          <div
            className="fixed inset-0 z-40 bg-dark-950/80 backdrop-blur-sm"
            onClick={() => setShowIncomeModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-10">
            <div className="relative w-full max-w-xl cyber-glass border border-neon-green/40 rounded-2xl p-6 sm:p-8 space-y-6">
              <button
                onClick={() => setShowIncomeModal(false)}
                className="absolute top-3 right-3 p-2 text-cyan-300/70 hover:text-white hover:bg-cyan-500/10 rounded-lg transition-all"
                aria-label="Close income breakdown"
              >
                <X size={18} />
              </button>
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">Earnings Breakdown</p>
                <h2 className="text-2xl font-bold text-white">Total Earned Overview</h2>
                <p className="text-sm text-cyan-300/80">
                  Data sourced directly from <span className="font-semibold text-neon-green">OceanicView.getIncomeTotals</span>.
                </p>
              </div>

              {incomeTotalsLoading ? (
                <div className="flex items-center gap-2 text-cyan-200 text-sm">
                  <Loader2 className="animate-spin" size={18} />
                  <span>Syncing income totals…</span>
                </div>
              ) : incomeTotalsError ? (
                <div className="border border-red-400/40 bg-red-500/10 text-red-200 rounded-lg px-4 py-3 text-sm">
                  {incomeTotalsError}
                </div>
              ) : !incomeTotalsBreakdown ? (
                <div className="text-sm text-cyan-300/80">
                  No income breakdown available yet. Earn from your portfolios to populate this view.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="cyber-glass border border-neon-green/40 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-neon-green uppercase tracking-wide">Total Earned</p>
                      <p className="text-2xl font-bold text-neon-green">{formatUSD(totalEarnedUsd)}</p>
                    </div>
                    <div className="text-right text-[11px] text-cyan-300/70">
                      <p>ROI (Today): {formatUSD(todayRoiUsd)}</p>
                      <p>ROI (Booster): {formatUSD(boosterRoiUsd)}</p>
                    </div>
                  </div>
                  {incomeTotalsBreakdown?.source === 'cappingIncomeManager' && (
                    <p className="text-[11px] text-cyan-300/70">
                      Detailed breakdown is unavailable from the capping manager. Showing total earnings only.
                    </p>
                  )}

                  <div className="grid sm:grid-cols-2 gap-3">
                    {incomeBreakdownRows.map(({ label, value }) => (
                      <div
                        key={label}
                        className="cyber-glass border border-cyan-500/30 rounded-lg p-3 hover:border-cyan-500/60 transition-all"
                      >
                        <p className="text-[11px] text-cyan-300/70 uppercase tracking-wide">{label}</p>
                        <p className="text-lg font-semibold text-cyan-100">{formatUSD(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-cyan-500/20 text-[11px] text-cyan-300/70">
                All earnings credit directly to your Safe Wallet. No additional action required.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
