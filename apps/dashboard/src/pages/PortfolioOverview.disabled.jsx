import {
  TrendingUp,
  Wallet,
  Clock,
  Award,
  AlertCircle,
  Zap,
  RefreshCw,
  Info,
  ArrowUpRight,
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { formatUSD, formatRAMA } from "../utils/contractData";
import { PortfolioStatus } from "../types/contract";
import NumberPopup from "../components/NumberPopup";
import Tooltip from "../components/Tooltip";
import ProgressBar from "../components/ProgressBar";
import AddressWithCopy from "../components/AddressWithCopy";
import { useStore } from "../../store/useUserInfoStore";

export default function PortfolioOverview() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [dashboard, setDashboard] = useState(null);

  const getDashboardDetails = useStore((s) => s.getDashboardDetails);
  const userAddressFromStore = useStore((s) => s.userAddress);
  const userAddress =
    userAddressFromStore || localStorage.getItem("userAddress") || null;

  const loadDashboard = useCallback(async () => {
    if (!userAddress) {
      setDashboard(null);
      return;
    }
    setIsRefreshing(true);
    try {
      const data = await getDashboardDetails(userAddress);
      setDashboard(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  }, [getDashboardDetails, userAddress]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const { portfolio, userStatus, dailyRate } = useMemo(() => {
    const basePortfolio = {
      stakedUSD: 0,
      totalEarnedUSD: 0,
      maxCapUSD: 0,
      isBooster: false,
      upline: "0x0000000000000000000000000000000000000000",
      status: PortfolioStatus.Running,
      freezeEndsAt: "0",
      accruedGrowthUSD: 0,
      totalLifetimeStakedUSD: 0,
      totalLifetimeEarnedUSD: 0,
      maxLifetimeEarnableUSD: 0,
      safeWalletRAMA: 0,
      safeWalletUSD: 0,
    };

    const baseStatus = {
      currentSlabIndex: 0,
      qualifiedVolumeUSD: 0,
      directChildrenCount: 0,
      nextSlabClaimRequiresDirects: "0",
      currentRoyaltyLevelIndex: 0,
      royaltyPayoutsReceived: 0,
    };

    if (!dashboard) {
      return {
        portfolio: basePortfolio,
        userStatus: baseStatus,
        dailyRate: 0,
      };
    }

    const portfolios = dashboard.portfolios ?? [];
    const totalStakedUsd = dashboard.totals?.totalStakedUsd ?? 0;
    const totalEarnedUsd = dashboard.totalEarningsUsd ?? 0;
    const accruedGrowthUsd = dashboard.accruedGrowthUsd ?? 0;
    const safeWalletRama = dashboard.safeWallet?.rama ?? 0;
    const safeWalletUsd = dashboard.safeWallet?.usd ?? null;

    const capUsd = portfolios.reduce((sum, entry) => {
      if (entry?.capUsd != null) return sum + entry.capUsd;
      if (entry?.principalUsd && entry?.capPct) {
        return sum + entry.principalUsd * (entry.capPct / 100);
      }
      return sum;
    }, 0);

    const freezeEndsAt = portfolios.reduce(
      (maxTs, entry) => Math.max(maxTs, Number(entry?.frozenUntil ?? 0)),
      0
    );

    const status =
      portfolios.length === 0
        ? PortfolioStatus.Closed
        : portfolios.some((entry) => (entry?.isClosed ?? entry?.active === false))
        ? PortfolioStatus.Closed
        : portfolios.some((entry) => entry?.isCapped)
        ? PortfolioStatus.Capped
        : freezeEndsAt * 1000 > Date.now()
        ? PortfolioStatus.Frozen
        : PortfolioStatus.Running;

    const totalLifetimeStakedUsd = totalStakedUsd;
    const lifetimeCapBps = dashboard.lifetimeCapBps ?? 0;
    const maxLifetimeEarnableUsd =
      lifetimeCapBps > 0
        ? (totalLifetimeStakedUsd * lifetimeCapBps) / 10000
        : totalLifetimeStakedUsd * 4;

    const primaryPortfolio =
      portfolios.find((entry) => entry && !(entry.isClosed ?? entry.active === false)) ?? portfolios[0] ?? null;
    const rawDailyRate =
      primaryPortfolio?.dailyRateWad != null
        ? Number(primaryPortfolio.dailyRateWad) / 1e16
        : 0;
    const dailyRateValue = Number.isFinite(rawDailyRate)
      ? Number(rawDailyRate.toFixed(2))
      : 0;

    const isBooster = portfolios.some((entry) => Boolean(entry?.booster));

    const resolvedUserStatus = {
      currentSlabIndex:
        dashboard.slabPanel?.slabIndex ??
        dashboard.userStatus?.slabLevel ??
        0,
      qualifiedVolumeUSD:
        dashboard.userStatus?.qualifiedVolumeUsd ??
        dashboard.slabPanel?.qualifiedVolumeUsd ??
        0,
      directChildrenCount:
        dashboard.totals?.directRefs ?? dashboard.userStatus?.directs ?? 0,
      nextSlabClaimRequiresDirects: dashboard.slabPanel?.canClaim
        ? "0"
        : "1",
      currentRoyaltyLevelIndex:
        dashboard.userStatus?.royaltyLevel ??
        dashboard.totals?.royaltyLevel ??
        0,
      royaltyPayoutsReceived:
        dashboard.userStatus?.royaltyPaidMonths ?? 0,
    };

    const computedPortfolio = {
      ...basePortfolio,
      stakedUSD: totalStakedUsd,
      totalEarnedUSD: totalEarnedUsd,
      maxCapUSD: capUsd > 0 ? capUsd : totalStakedUsd * 2,
      isBooster,
      upline: dashboard.upline ?? basePortfolio.upline,
      status,
      freezeEndsAt: String(freezeEndsAt ?? 0),
      accruedGrowthUSD: accruedGrowthUsd,
      totalLifetimeStakedUSD: totalLifetimeStakedUsd,
      totalLifetimeEarnedUSD: totalEarnedUsd,
      maxLifetimeEarnableUSD: maxLifetimeEarnableUsd,
      safeWalletRAMA: safeWalletRama,
      safeWalletUSD:
        safeWalletUsd != null ? safeWalletUsd : safeWalletRama * 0.0245,
    };

    return {
      portfolio: computedPortfolio,
      userStatus: resolvedUserStatus,
      dailyRate: dailyRateValue,
    };
  }, [dashboard]);

  const handleRefresh = () => {
    if (isRefreshing) return;
    loadDashboard();
  };

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const portfolioCapProgress =
    portfolio.maxCapUSD > 0
      ? Math.min(
          100,
          (portfolio.totalEarnedUSD / portfolio.maxCapUSD) * 100
        )
      : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green relative inline-block">
              Portfolio Overview
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-neon-green/20 blur-xl -z-10" />
            </h1>
            <p className="text-sm sm:text-base text-cyan-300/90 mt-1">
              Your complete OCEAN DeFi investment dashboard
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3 py-2 cyber-glass border border-cyan-500/30 rounded-lg hover:border-cyan-500/50 transition-all hover:shadow-neon-cyan group disabled:opacity-50"
              aria-label="Refresh data"
            >
              <RefreshCw
                size={16}
                className={`text-cyan-400 ${
                  isRefreshing
                    ? "animate-spin"
                    : "group-hover:rotate-180 transition-transform duration-500"
                }`}
              />
              <span className="text-xs text-cyan-400 hidden sm:inline">
                Refresh
              </span>
            </button>
            <div className="flex items-center gap-2 px-3 sm:px-4 py-2 cyber-glass border border-neon-green/30 rounded-lg flex-shrink-0 w-fit">
              <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
              <span className="text-xs sm:text-sm font-medium text-neon-green uppercase tracking-wide">
                {portfolio.status}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-cyan-400/70">
          <Clock size={12} />
          <span>Last updated: {getTimeAgo(lastUpdated)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-fade-in-up">
        <div className="cyber-glass rounded-xl p-4 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden group transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-cyan-400/90 uppercase tracking-wide">
              Total Value
            </p>
            <Info size={20} className="text-cyan-400/50" />
          </div>
          <NumberPopup
            value={formatUSD(portfolio.stakedUSD)}
            label="Total Portfolio Value"
            className="text-xl sm:text-2xl font-bold text-cyan-300 mb-1"
          />
          <div className="flex items-center gap-1 text-xs">
            <ArrowUpRight size={12} className="text-neon-green" />
            <span className="text-neon-green">+12.5%</span>
            <span className="text-cyan-400/70">vs last month</span>
          </div>
        </div>
        
        <div className="cyber-glass rounded-xl p-4 border border-neon-green/30 hover:border-neon-green/80 relative overflow-hidden group transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon-green/50 to-transparent" />
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-neon-green/90 uppercase tracking-wide">
              Total Earned
            </p>
            <Tooltip content="Total earnings from portfolio growth, slab income, and rewards combined.">
              <Info size={12} className="text-neon-green/50" />
            </Tooltip>
          </div>
          <NumberPopup
            value={formatUSD(portfolio.totalEarnedUSD)}
            label="Total Earnings"
            className="text-xl sm:text-2xl font-bold text-neon-green mb-1"
          />
          <div className="flex items-center gap-1 text-xs">
            <span className="text-cyan-400/70">Daily Rate:</span>
            <span className="text-neon-green font-semibold">{dailyRate}%</span>
          </div>
        </div>
        {" "}

        <div className="cyber-glass rounded-xl p-4 border border-neon-green/30 hover:border-neon-green/80 relative overflow-hidden group transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon-green/50 to-transparent" />
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-neon-green/90 uppercase tracking-wide">
              Total Earned
            </p>
            <Tooltip content="Total earnings from portfolio growth, slab income, and rewards combined.">
              <Info size={12} className="text-neon-green/50" />
            </Tooltip>
          </div>
          <NumberPopup
            value={formatUSD(portfolio.totalEarnedUSD)}
            label="Total Earnings"
            className="text-xl sm:text-2xl font-bold text-neon-green mb-1"
          />
          <div className="flex items-center gap-1 text-xs">
            <span className="text-cyan-400/70">Daily Rate:</span>
            <span className="text-neon-green font-semibold">{dailyRate}%</span>
          </div>
        </div>
        <div className="cyber-glass rounded-xl p-4 border border-neon-orange/30 hover:border-neon-orange/80 relative overflow-hidden group transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon-orange/50 to-transparent" />
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-neon-orange/90 uppercase tracking-wide">
              Ready to Claim
            </p>
            <Tooltip content="Amount available to claim immediately without any waiting period.">
              <Info size={12} className="text-neon-orange/50" />
            </Tooltip>
          </div>
          <NumberPopup
            value={formatUSD(portfolio.accruedGrowthUSD)}
            label="Available to Claim"
            className="text-xl sm:text-2xl font-bold text-neon-orange mb-1"
          />
          <button className="mt-2 w-full py-1.5 bg-gradient-to-r from-neon-orange to-neon-pink text-white rounded-lg text-xs font-bold hover:shadow-neon-orange transition-all hover:scale-[1.02] uppercase tracking-wide">
            Claim Now
          </button>
        </div>
        <div className="cyber-glass rounded-xl p-4 border border-cyan-400/30 hover:border-cyan-400/80 relative overflow-hidden group transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-cyan-400/90 uppercase tracking-wide">
              Network Size
            </p>
            <Info size={12} className="text-cyan-400/50" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-cyan-300 mb-1">
            {userStatus.directChildrenCount}
          </p>
          <div className="flex items-center gap-1 text-xs">
            <span className="text-cyan-400/70">Direct referrals</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 cyber-glass rounded-2xl p-4 sm:p-6 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-cyan-300 uppercase tracking-wide">
                Active Portfolio
              </h2>
              <p className="text-xs sm:text-sm text-cyan-300/90">
                Your current investment details
              </p>
            </div>
            {portfolio.isBooster && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-neon-orange to-neon-pink text-white rounded-lg text-xs sm:text-sm font-bold flex-shrink-0 w-fit  border border-neon-orange/50">
                <Zap size={14} className="sm:w-4 sm:h-4 animate-pulse" />
                <span className="uppercase">Booster</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-cyan-300/90 mb-1 truncate uppercase tracking-wide">
                Staked Amount
              </p>
              <NumberPopup
                value={formatUSD(portfolio.stakedUSD)}
                label="Staked Amount"
                className="text-lg sm:text-2xl font-bold text-cyan-300"
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-cyan-300/90 mb-1 truncate uppercase tracking-wide">
                Total Earned
              </p>
              <NumberPopup
                value={formatUSD(portfolio.totalEarnedUSD)}
                label="Total Earned"
                className="text-lg sm:text-2xl font-bold text-neon-green"
              />
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs sm:text-sm font-medium text-cyan-400 uppercase tracking-wider">
                  Earnings Progress to Cap
                </span>
                <Tooltip content="Maximum earnings cap based on your stake. Regular portfolios: 200% (2x), Booster portfolios: 250% (2.5x) including principal.">
                  <Info size={14} className="text-cyan-400/70" />
                </Tooltip>
              </div>
              <ProgressBar
                progress={portfolioCapProgress}
                current={formatUSD(portfolio.totalEarnedUSD)}
                max={formatUSD(portfolio.maxCapUSD)}
                label=""
                color="cyan"
                showMilestones={true}
              />
              <p className="text-xs text-cyan-400/80 mt-2">
                Cap Type:{" "}
                {portfolio.isBooster ? "250% (Booster)" : "200% (Regular)"}
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
            <div className="p-2.5 sm:p-3 md:p-4 cyber-glass rounded-xl border border-cyan-500/30 hover:border-cyan-500/80 min-w-0 transition-all overflow-hidden">
              <div className="flex flex-col gap-0.5 mb-1">
                <p className="text-[10px] sm:text-xs text-cyan-400 font-medium sm:uppercase sm:tracking-wider leading-tight">
                  Daily Rate
                </p>
                <Tooltip content="Your current daily earnings rate based on stake amount and booster status.">
                  <Info size={8} className="text-cyan-400/50 sm:hidden" />
                </Tooltip>
                <Tooltip content="Your current daily earnings rate based on stake amount and booster status.">
                  <Info
                    size={10}
                    className="text-cyan-400/50 hidden sm:inline-block"
                  />
                </Tooltip>
              </div>
              <p className="text-base sm:text-lg md:text-xl font-bold text-cyan-300 whitespace-nowrap">
                {dailyRate}%
              </p>
            </div>
            <div className="p-2.5 sm:p-3 md:p-4 cyber-glass rounded-xl border border-neon-green/30 hover:border-neon-green/80 min-w-0 transition-all overflow-hidden">
              <div className="flex flex-col gap-0.5 mb-1">
                <p className="text-[10px] sm:text-xs text-neon-green font-medium sm:uppercase sm:tracking-wider leading-tight">
                  Direct Refs
                </p>
                <Tooltip content="Number of users you've directly referred to the platform.">
                  <Info size={8} className="text-neon-green/50 sm:hidden" />
                </Tooltip>
                <Tooltip content="Number of users you've directly referred to the platform.">
                  <Info
                    size={10}
                    className="text-neon-green/50 hidden sm:inline-block"
                  />
                </Tooltip>
              </div>
              <p className="text-base sm:text-lg md:text-xl font-bold text-neon-green whitespace-nowrap">
                {userStatus.directChildrenCount}
              </p>
            </div>
            <div className="p-2.5 sm:p-3 md:p-4 cyber-glass rounded-xl border border-neon-orange/30 hover:border-neon-orange/80 min-w-0  transition-all overflow-hidden">
              <div className="flex flex-col gap-0.5 mb-1">
                <p className="text-[10px] sm:text-xs text-neon-orange font-medium sm:uppercase sm:tracking-wider leading-tight">
                  Slab Level
                </p>
                <Tooltip content="Your current slab level determines your percentage earnings from your network.">
                  <Info size={8} className="text-neon-orange/50 sm:hidden" />
                </Tooltip>
                <Tooltip content="Your current slab level determines your percentage earnings from your network.">
                  <Info
                    size={10}
                    className="text-neon-orange/50 hidden sm:inline-block"
                  />
                </Tooltip>
              </div>
              <p className="text-base sm:text-lg md:text-xl font-bold text-neon-orange whitespace-nowrap">
                {userStatus.currentSlabIndex}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="cyber-glass border border-neon-green/50 hover:border-neon-green rounded-2xl p-5 sm:p-6 text-white relative overflow-hidden group transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-neon-green/10 to-cyan-500/10 opacity-50 group-hover:opacity-70 transition-opacity" />
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon-green/70 to-transparent" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg flex-shrink-0">
                    <TrendingUp size={20} className="sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold opacity-90 truncate">
                      Accrued Growth
                    </p>
                    <p className="text-xs opacity-75 truncate">
                      Available to claim
                    </p>
                  </div>
                </div>
                <Tooltip
                  content="Your portfolio growth earnings that have accumulated and are ready to be claimed."
                  position="left"
                >
                  <Info size={16} className="text-white/60" />
                </Tooltip>
              </div>
              <NumberPopup
                value={formatUSD(portfolio.accruedGrowthUSD)}
                label="Accrued Growth"
                className="text-3xl sm:text-4xl font-bold mb-2 text-neon-glow"
              />
              <p className="text-xs opacity-75 mb-4">
                ≈{" "}
                {formatRAMA(
                  portfolio.accruedGrowthUSD > 0
                    ? portfolio.accruedGrowthUSD / 0.0245
                    : 0
                )}{" "}
                RAMA
              </p>
              <button className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-neon-green to-cyan-500 hover:from-neon-green hover:to-neon-green text-dark-950 rounded-xl text-sm sm:text-base font-bold transition-all hover:shadow-neon-green hover:scale-[1.02] uppercase tracking-wide group relative overflow-hidden">
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <span>Claim Now</span>
                  <ArrowUpRight
                    size={16}
                    className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                  />
                </span>
              </button>
            </div>
          </div>

          <div className="cyber-glass rounded-2xl p-4 sm:p-6 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 cyber-glass border border-cyan-500/30 rounded-lg flex-shrink-0">
                <Wallet className="text-cyan-400" size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-cyan-300 truncate uppercase tracking-wide">
                  Safe Wallet
                </p>
                <p className="text-xs text-cyan-300/90 truncate">
                  Fee-free balance
                </p>
              </div>
            </div>
            <NumberPopup
              value={`${formatRAMA(portfolio.safeWalletRAMA)} RAMA`}
              label="Safe Wallet Balance"
              className="text-xl sm:text-2xl font-bold text-cyan-300 mb-1"
            />
            <NumberPopup
              value={`≈ ${formatUSD(portfolio.safeWalletUSD)}`}
              label="Safe Wallet USD Value"
              className="text-sm text-cyan-300/90"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="cyber-glass rounded-xl p-4 sm:p-5 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 cyber-glass border border-cyan-500/30 rounded-lg flex-shrink-0">
              <Award className="text-cyan-400" size={18} />
            </div>
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-cyan-300 truncate uppercase tracking-wide">
                Qualified Volume
              </p>
              <Tooltip
                content="Volume calculated using 40:30:30 formula - 40% from strongest leg, 30% from second, 30% from remaining legs."
                position="bottom"
              >
                <Info size={12} className="text-cyan-400/70 flex-shrink-0" />
              </Tooltip>
            </div>
          </div>
          <NumberPopup
            value={formatUSD(userStatus.qualifiedVolumeUSD)}
            label="Qualified Volume"
            className="text-lg sm:text-xl font-bold text-cyan-300"
          />
          <p className="text-xs text-cyan-300/90 mt-1">40:30:30 Formula</p>
        </div>

        <div className="cyber-glass rounded-xl p-4 sm:p-5 border border-neon-green/30 hover:border-neon-green/80 relative overflow-hidden transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon-green/50 to-transparent" />
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 cyber-glass border border-neon-green/30 rounded-lg flex-shrink-0">
              <TrendingUp className="text-neon-green" size={18} />
            </div>
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-neon-green truncate uppercase tracking-wide">
                Royalty Level
              </p>
              <Tooltip
                content="Your royalty tier based on qualified volume. Higher levels unlock monthly royalty payments."
                position="bottom"
              >
                <Info size={12} className="text-neon-green/70 flex-shrink-0" />
              </Tooltip>
            </div>
          </div>
          <p className="text-lg sm:text-xl font-bold text-cyan-300">
            Level {userStatus.currentRoyaltyLevelIndex}
          </p>
          <p className="text-xs text-cyan-300/90 mt-1">
            {userStatus.royaltyPayoutsReceived} payments received
          </p>
        </div>

        <div className="cyber-glass rounded-xl p-4 sm:p-5 border border-neon-orange/30 hover:border-neon-orange/80  relative overflow-hidden transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon-orange/50 to-transparent" />
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 cyber-glass border border-neon-orange/30 rounded-lg flex-shrink-0">
              <Clock className="text-neon-orange" size={18} />
            </div>
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-neon-orange truncate uppercase tracking-wide">
                Next Slab Claim
              </p>
              <Tooltip
                content="Status of your next slab income claim. A 24-hour cooldown applies between claims."
                position="bottom"
              >
                <Info size={12} className="text-neon-orange/70 flex-shrink-0" />
              </Tooltip>
            </div>
          </div>
          <p className="text-base sm:text-lg font-bold text-cyan-300 truncate">
            {userStatus.nextSlabClaimRequiresDirects === "1"
              ? "Needs $50 ID"
              : "Available"}
          </p>
          <p className="text-xs text-cyan-300/90 mt-1">24h cooldown period</p>
        </div>

        <div className="cyber-glass rounded-xl p-4 sm:p-5 border border-cyan-400/30 hover:border-cyan-400/80 relative overflow-hidden transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 cyber-glass border border-cyan-400/30 rounded-lg flex-shrink-0">
              <AlertCircle className="text-cyan-400" size={18} />
            </div>
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-cyan-400 truncate uppercase tracking-wide">
                Upline Sponsor
              </p>
              <Tooltip
                content="The wallet address of the person who referred you to the platform."
                position="bottom"
              >
                <Info size={12} className="text-cyan-400/70 flex-shrink-0" />
              </Tooltip>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AddressWithCopy
              address={portfolio.upline}
              copyLabel=""
              className="flex-1"
              textClassName="text-sm font-mono text-cyan-300 truncate"
            />
          </div>
          <button className="text-xs text-cyan-400 hover:text-neon-green mt-2 transition-colors inline-flex items-center gap-1">
            <span>View Details</span>
            <ArrowUpRight size={10} />
          </button>
        </div>
      </div>

      {portfolio.status === PortfolioStatus.Frozen && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle
            className="text-amber-600 flex-shrink-0 mt-0.5"
            size={20}
          />
          <div className="min-w-0">
            <p className="font-medium text-amber-900">Portfolio Frozen</p>
            <p className="text-sm text-amber-700 mt-1 break-words">
              Withdrawal freeze active until{" "}
              {new Date(
                parseInt(portfolio.freezeEndsAt) * 1000
              ).toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
