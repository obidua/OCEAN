import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Coins,
  TrendingUp,
  Award,
  Clock,
  AlertCircle,
  Zap,
  RefreshCw,
  Loader2,
  Info,
  Download,
  Users,
} from "lucide-react";
import NumberPopup from "../components/NumberPopup";
import AddressWithCopy from "../components/AddressWithCopy";
import { formatUSD, formatRAMA } from "../utils/contractData";
import { useStore } from "../../store/useUserInfoStore";

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return "—";
  const now = Date.now();
  const diffMs = now - timestamp * 1000;
  if (diffMs < 60_000) return "Just now";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
};

const microToUsd = (value) => Number(value ?? 0) / 1e6;
const normalizeUsdDisplay = (value) => {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
};
const weiToRama = (value) => Number(value ?? 0) / 1e18;

const defaultOverview = {
  entries: 0,
  totalEntries: 0,
  lifetimeUsdMicro: 0,
  lifetimeUsd: 0,
  lifetimeRamaWei: 0,
  lifetimeRama: 0,
  totalDirectUsdMicro: 0,
  totalDirectUsd: 0,
  totalDirectRamaWei: 0,
  totalDirectRama: 0,
  claimableRamaWei: 0,
  claimableRama: 0,
  claimableUsdMicro: 0,
  claimableUsd: 0,
  last24hUsdMicro: 0,
  last24hUsd: 0,
  last24hRamaWei: 0,
  last24hRama: 0,
  averageSpotUsdMicro: 0,
  averageSpotUsd: 0,
  totalEarningsUsd: 0,
  totalEarningsRama: 0,
  activeSpots: 0,
};

const createDefaultDownline = () => ({
  items: [],
  totals: { portfolioUsd: 0, roiUsd: 0, roiRama: 0 },
  count: 0,
});

export default function SpotIncome() {
  const [overview, setOverview] = useState(defaultOverview);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [teamVolumeUsd, setTeamVolumeUsd] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [downline, setDownline] = useState(createDefaultDownline);
  const [downlineError, setDownlineError] = useState(null);
  const [showAllDownline, setShowAllDownline] = useState(false);
  const [downlineLoading, setDownlineLoading] = useState(false);

  const getSpotIncomeSummary = useStore((s) => s.getSpotIncomeSummary);
  const getSpotIncomeTransactions = useStore(
    (s) => s.getSpotIncomeTransactions
  );
  const getTeamNetworkData = useStore((s) => s.getTeamNetworkData);
  const getDownlineRoiView = useStore((s) => s.getDownlineRoiView);
  const userAddressFromStore = useStore((s) => s.userAddress);
  const userAddress =
    userAddressFromStore || localStorage.getItem("userAddress") || null;

  const loadData = useCallback(async () => {
    if (!userAddress) {
      setOverview(defaultOverview);
      setTransactions([]);
      setHasMore(false);
      setTeamVolumeUsd(null);
      setDownline(createDefaultDownline());
      setDownlineError(null);
      setShowAllDownline(false);
      setDownlineLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getSpotIncomeSummary(userAddress, {
        limit: 25,
        portfolioLimit: 4,
      });
      setOverview(data?.overview ?? defaultOverview);
      setTransactions(data?.transactions ?? []);
      setHasMore(Boolean(data?.hasMore));

      if (getTeamNetworkData) {
        try {
          const snapshot = await getTeamNetworkData(userAddress, {
            maxDepth: 1,
            detailLimit: 0,
          });
          setTeamVolumeUsd(snapshot?.teamVolumeUsd ?? null);
        } catch (teamErr) {
          console.warn('Spot income team volume fetch failed:', teamErr);
          setTeamVolumeUsd(null);
        }
      } else {
        setTeamVolumeUsd(null);
      }

  // Fetch downline daily accrued reward snapshot (ComprehensiveView)
      if (getDownlineRoiView) {
        setDownlineLoading(true);
        setShowAllDownline(false);
        try {
          const snap = await getDownlineRoiView(userAddress);
          setDownline(snap ?? createDefaultDownline());
          setDownlineError(null);
        } catch (dlErr) {
          console.warn('Spot income downline Daily Accrued Reward fetch failed:', dlErr);
          setDownline(createDefaultDownline());
          setDownlineError(dlErr?.message || 'Unable to load downline daily accrued reward data.');
        } finally {
          setDownlineLoading(false);
        }
      } else {
        setDownline(createDefaultDownline());
        setDownlineError(null);
        setDownlineLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError(err?.message || "Unable to load spot income data.");
      setOverview(defaultOverview);
      setTransactions([]);
      setHasMore(false);
      setTeamVolumeUsd(null);
      setDownline(createDefaultDownline());
      setDownlineLoading(false);
    } finally {
      setLoading(false);
    }
  }, [getSpotIncomeSummary, getTeamNetworkData, userAddress]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    if (!userAddress || loading) return;
    loadData();
  };

  const handleLoadMore = async () => {
    if (!userAddress || loadingMore) return;
    setLoadingMore(true);
    try {
      const slice = await getSpotIncomeTransactions(userAddress, {
        offset: transactions.length,
        limit: 20,
      });
      setTransactions((prev) => [...prev, ...(slice ?? [])]);
      setHasMore(slice?.length === 20);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Unable to load more transactions.");
    } finally {
      setLoadingMore(false);
    }
  };

  const spotRate = useMemo(() => {
    if (!overview) return 0;
    const totalUsdMicro =
      overview.totalDirectUsdMicro ??
      (overview.totalDirectUsd != null ? overview.totalDirectUsd * 1e6 : 0);
    const last24hUsdMicro =
      overview.last24hUsdMicro ??
      (overview.last24hUsd != null ? overview.last24hUsd * 1e6 : 0);
    if (!Number.isFinite(totalUsdMicro) || totalUsdMicro <= 0) return 0;
    const ratio = last24hUsdMicro / totalUsdMicro;
    return Number.isFinite(ratio) ? ratio * 100 : 0;
  }, [overview]);

  const lifetimeUsdValue = useMemo(() => {
    const raw =
      overview?.lifetimeUsdMicro != null
        ? microToUsd(overview.lifetimeUsdMicro)
        : overview?.lifetimeUsd ?? 0;
    return normalizeUsdDisplay(raw);
  }, [overview]);

  const last24hUsdValue = useMemo(() => {
    const raw =
      overview?.last24hUsdMicro != null
        ? microToUsd(overview.last24hUsdMicro)
        : overview?.last24hUsd ?? 0;
    return normalizeUsdDisplay(raw);
  }, [overview]);

  const claimableUsdValue = useMemo(() => {
    const raw =
      overview?.claimableUsdMicro != null
        ? microToUsd(overview.claimableUsdMicro)
        : overview?.claimableUsd ?? 0;
    return normalizeUsdDisplay(raw);
  }, [overview]);

  const lifetimeRamaValue = useMemo(
    () =>
      overview?.lifetimeRamaWei != null
        ? weiToRama(overview.lifetimeRamaWei)
        : overview?.lifetimeRama ?? 0,
    [overview]
  );

  const claimableRamaValue = useMemo(
    () =>
      overview?.claimableRamaWei != null
        ? weiToRama(overview.claimableRamaWei)
        : overview?.claimableRama ?? 0,
    [overview]
  );

  const last24hRamaValue = useMemo(
    () =>
      overview?.last24hRamaWei != null
        ? weiToRama(overview.last24hRamaWei)
        : overview?.last24hRama ?? 0,
    [overview]
  );

  const sortedTransactions = useMemo(() => {
    return (transactions ?? [])
      .slice()
      .sort((a, b) => (b?.timestamp ?? 0) - (a?.timestamp ?? 0));
  }, [transactions]);

  const transactionsNormalized = useMemo(
    () =>
      sortedTransactions.map((tx) => {
        const amountUsdValue =
          tx?.amountUsdMicro != null
            ? microToUsd(tx.amountUsdMicro)
            : tx?.amountUsd ?? 0;
        const amountRamaValue =
          tx?.amountRamaWei != null
            ? weiToRama(tx.amountRamaWei)
            : tx?.amountRama ?? 0;
        return {
          ...tx,
          amountUsdValue: normalizeUsdDisplay(amountUsdValue),
          amountRamaValue,
        };
      }),
    [sortedTransactions]
  );

  const todayStats = useMemo(() => {
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return { count: 0, usdValue: 0, ramaValue: 0 };
    }
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startTs = Math.floor(startOfDay.getTime() / 1000);
    let usdMicroSum = 0;
    let ramaWeiSum = 0;
    let count = 0;

    for (const tx of transactions) {
      const ts = Number(tx?.timestamp);
      if (!Number.isFinite(ts) || ts < startTs) continue;
      const usdMicro = Number(tx?.amountUsdMicro ?? 0);
      const ramaWei = Number(tx?.amountRamaWei ?? 0);
      if (Number.isFinite(usdMicro)) {
        usdMicroSum += usdMicro;
      }
      if (Number.isFinite(ramaWei)) {
        ramaWeiSum += ramaWei;
      }
      count += 1;
    }

    return {
      count,
      usdValue: normalizeUsdDisplay(microToUsd(usdMicroSum)),
      ramaValue: weiToRama(ramaWeiSum),
    };
  }, [transactions]);

  const {
    count: todayEntryCount,
    usdValue: todayUsdValue,
    ramaValue: todayRamaValue,
  } = todayStats;

  const displayedDownline = useMemo(() => {
    const items = Array.isArray(downline?.items) ? downline.items : [];
    return showAllDownline ? items : items.slice(0, 10);
  }, [downline, showAllDownline]);

  const downlineHasMore =
    (Array.isArray(downline?.items) ? downline.items.length : 0) >
    displayedDownline.length;

  const teamVolumeDisplay =
    teamVolumeUsd != null && Number.isFinite(Number(teamVolumeUsd))
      ? Number(teamVolumeUsd)
      : null;

  const handleExportHistory = useCallback(() => {
    if (
      !transactionsNormalized.length ||
      typeof window === "undefined" ||
      typeof document === "undefined"
    ) {
      return;
    }

    const now = new Date();
    const headerLines = [
      "Spot Income History Export",
      `Generated: ${now.toISOString()}`,
      `Entries: ${transactionsNormalized.length}`,
      "",
    ];

    const rows = transactionsNormalized.map((tx, index) => {
      const timestampIso =
        tx?.timestamp && Number.isFinite(tx.timestamp)
          ? new Date(tx.timestamp * 1000).toISOString()
          : "—";
      const portfolioLabel = tx?.portfolioId != null ? tx.portfolioId : "—";
      const usdValue = formatUSD(tx?.amountUsdValue ?? 0);
      const ramaValue = `${formatRAMA(tx?.amountRamaValue ?? 0)} RAMA`;
      const sourceLabel = tx?.from ?? tx?.source ?? tx?.address ?? "—";

      return `${index + 1}. ${timestampIso} | Portfolio: ${portfolioLabel} | Amount USD: ${usdValue} | Amount RAMA: ${ramaValue} | From: ${sourceLabel}`;
    });

    const content = [...headerLines, ...rows].join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `spot-income-history-${now.toISOString().replace(/[:.]/g, "-")}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, [transactionsNormalized]);

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green relative inline-block">
            Spot Income
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-neon-green/20 blur-xl -z-10" />
          </h1>
          <p className="text-cyan-300/90 mt-1">
            Track real-time direct income credited from your network.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 cyber-glass border border-cyan-500/30 rounded-lg hover:border-cyan-500/50 transition-all hover:shadow-neon-cyan disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh spot income data"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin text-cyan-400" : "text-cyan-400"}
            />
            <span className="text-xs text-cyan-400 uppercase tracking-wide">
              Refresh
            </span>
          </button>
          <button
            onClick={handleExportHistory}
            disabled={!transactionsNormalized.length}
            className="flex items-center gap-2 px-3 py-2 cyber-glass border border-cyan-500/30 rounded-lg hover:border-cyan-500/50 transition-all hover:shadow-neon-cyan disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export spot income history to .txt"
          >
            <Download size={16} className="text-cyan-400" />
            <span className="text-xs text-cyan-400 uppercase tracking-wide">
              Export TXT
            </span>
          </button>
        </div>
      </div>

      {error && (
        <div className="cyber-glass border border-red-400/40 bg-red-500/10 text-red-200 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-3 text-cyan-200 text-sm">
          <Loader2 className="animate-spin" size={16} />
          Syncing latest spot income data…
        </div>
      )}

      {!loading && !userAddress && (
        <div className="bg-yellow-900/20 border border-yellow-500/40 rounded-xl px-4 py-3 text-sm text-yellow-100 flex items-center gap-2">
          <AlertCircle size={18} />
          Connect your wallet to view spot income details.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="cyber-glass border border-cyan-500/40 rounded-2xl p-5 text-white relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-neon-green/10 opacity-50 group-hover:opacity-70 transition-opacity" />
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/70 to-transparent" />
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="p-2 bg-cyan-500/20 rounded-lg border border-cyan-500/30">
              <Coins size={22} className="text-cyan-400" />
            </div>
            <div>
              <p className="text-xs text-cyan-300/80 uppercase tracking-wide">
                Total Spot Earnings
              </p>
              <p className="text-[11px] text-cyan-300/70">
                Lifetime direct income (USD)
              </p>
            </div>
          </div>
          <NumberPopup
            value={formatUSD(lifetimeUsdValue)}
            label="Total Spot Earnings"
            className="text-3xl font-bold text-cyan-300 relative z-10"
            isLoading={loading}
          />
          <p className="text-xs text-neon-green relative z-10 mt-1">
            +{formatUSD(last24hUsdValue)} (last 24h)
          </p>
          <p className="text-[11px] text-cyan-300/70 relative z-10">
            Also tracked: {formatRAMA(lifetimeRamaValue)} RAMA total
          </p>
          {teamVolumeDisplay != null && (
            <p className="text-[11px] text-cyan-300/70 relative z-10">
              Team volume: {formatUSD(teamVolumeDisplay)}
            </p>
          )}
        </div>

        <div className="cyber-glass rounded-2xl p-5 border border-neon-green/40">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 cyber-glass border border-neon-green/30 rounded-lg">
              <Zap className="text-neon-green" size={20} />
            </div>
            <div>
              <p className="text-xs font-medium text-cyan-300 uppercase tracking-wide">
                Today Spot Rewards
              </p>
              <p className="text-[11px] text-cyan-300/80">
                Direct income collected today
              </p>
            </div>
          </div>
          <p className="text-3xl font-bold text-neon-green">
            {formatUSD(todayUsdValue)}
          </p>
          <p className="text-xs text-cyan-300/90 mt-1">
            Entries today: {todayEntryCount}
          </p>
          <p className="text-xs text-cyan-300/70 mt-1">
            Total RAMA: {formatRAMA(todayRamaValue)}
          </p>
        </div>

        <div className="cyber-glass rounded-2xl p-5 border border-neon-orange/40">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 cyber-glass border border-neon-orange/30 rounded-lg">
              <Clock className="text-neon-orange" size={20} />
            </div>
            <div>
              <p className="text-xs font-medium text-cyan-300 uppercase tracking-wide">
                Claimable Balance
              </p>
              <p className="text-[11px] text-cyan-300/80">
                Ready to transfer from Safe Wallet
              </p>
            </div>
          </div>
          <p className="text-3xl font-bold text-neon-orange">
            {formatRAMA(claimableRamaValue)} RAMA
          </p>
          <p className="text-xs text-cyan-300/80 mt-1">
            ≈ {formatUSD(claimableUsdValue)}
          </p>
          <p className="text-[11px] text-cyan-300/60 mt-1">
            24h growth rate: {spotRate.toFixed(2)}%
          </p>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="cyber-glass rounded-2xl p-5 border border-cyan-500/30">
          <div className="flex items-center gap-3 mb-5">
            <TrendingUp className="text-cyan-400" size={22} />
            <h3 className="text-base font-semibold text-cyan-300 uppercase tracking-wide">
              Recent Spot Transactions
            </h3>
          </div>

          {transactionsNormalized.length === 0 ? (
            <div className="text-sm text-cyan-300/70 flex items-center gap-2">
              <AlertCircle size={16} />
              No direct income entries recorded yet.
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1 hide-scrollbar">
              {transactionsNormalized.map((tx, idx) => (
                <div
                  key={`${tx.timestamp}-${idx}`}
                  className="cyber-glass border border-cyan-500/20 rounded-lg p-4 hover:border-cyan-500/40 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-cyan-200">
                        Portfolio #{tx.portfolioId ?? "—"}
                      </p>
                      <p className="text-[11px] text-cyan-300/70">
                        {new Date(tx.timestamp * 1000).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-neon-green">
                        +{formatUSD(tx.amountUsdValue)}
                      </p>
                      <p className="text-[11px] text-cyan-300/70">
                        {formatRAMA(tx.amountRamaValue)} RAMA
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] text-cyan-300/70 flex items-center gap-1 flex-wrap">
                    <span>From:</span>
                    {tx.from ? (
                      <AddressWithCopy
                        address={tx.from}
                        copyLabel=""
                        className="text-[11px]"
                        textClassName="font-mono text-cyan-200"
                      />
                    ) : (
                      <span className="font-mono text-cyan-200">—</span>
                    )}
                    <span>• {formatRelativeTime(tx.timestamp)}</span>
                  </p>
                </div>
              ))}

              {hasMore && (
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="w-full py-2 text-xs font-semibold uppercase tracking-wide border border-cyan-500/30 rounded-lg text-cyan-200 hover:border-cyan-500/60 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loadingMore && <Loader2 className="animate-spin" size={14} />}
                  Load More
                </button>
              )}
            </div>
         )}
       </div>

        <div className="cyber-glass rounded-2xl p-5 border border-cyan-500/30 space-y-4">
          <h3 className="font-semibold text-cyan-300 uppercase tracking-wide flex items-center gap-2">
            <Info size={16} className="text-cyan-400" />
            How Spot Income Works
          </h3>
          <div className="space-y-4 text-sm text-cyan-300/90">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-cyan-300">1</span>
              </div>
              <div>
                <p className="font-medium text-cyan-200">
                  Direct referrals earn instantly
                </p>
                <p className="text-xs">
                  Each new portfolio activation through your network credits
                  spot income directly to your Safe Wallet.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-cyan-300">2</span>
              </div>
              <div>
                <p className="font-medium text-cyan-200">
                  Track totals by portfolio
                </p>
                <p className="text-xs">
                  Review which portfolios are producing the highest direct
                  credits and monitor overall performance.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-cyan-300">3</span>
              </div>
              <div>
                <p className="font-medium text-cyan-200">
                  Claim or restake instantly
                </p>
                <p className="text-xs">
                  Claimable balances are available without cooldown and can be
                  moved to external wallets or reinvested.
                </p>
              </div>
            </div>
        </div>
      </div>
    </div>

    {userAddress && false && (
      <div className="cyber-glass rounded-2xl p-5 border border-cyan-500/40 relative overflow-hidden space-y-5">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/15 via-cyan-400/5 to-neon-green/10 pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
        <div className="relative z-10 flex flex-col gap-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/20 border border-cyan-500/30 rounded-lg">
                <Award size={20} className="text-cyan-300" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-cyan-100 uppercase tracking-wide">
                  Downline Daily Accrued Reward
                </h3>
                <p className="text-[11px] text-cyan-300/70">
                  Snapshot of daily accrued ROI across your direct team.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 text-[11px] uppercase tracking-wide border border-cyan-500/40 rounded-full text-cyan-200 bg-cyan-500/10">
                {downline?.count ?? 0} members
              </span>
              <span className="px-3 py-1 text-[11px] uppercase tracking-wide border border-neon-green/40 rounded-full text-neon-green bg-neon-green/10">
                {formatUSD(downline?.totals?.roiUsd ?? 0)} daily
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4 backdrop-blur">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-cyan-300/70">
                <Users size={14} className="text-cyan-300" />
                Team Members
              </div>
              <p className="text-2xl font-semibold text-cyan-100 mt-2">
                {downline?.count ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4 backdrop-blur">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-cyan-300/70">
                <Coins size={14} className="text-cyan-300" />
                Portfolio Value (USD)
              </div>
              <p className="text-2xl font-semibold text-cyan-100 mt-2">
                {formatUSD(downline?.totals?.portfolioUsd ?? 0)}
              </p>
            </div>
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4 backdrop-blur">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-cyan-300/70">
                <TrendingUp size={14} className="text-neon-green" />
                Daily ROI
              </div>
              <p className="text-2xl font-semibold text-neon-green mt-2">
                {formatUSD(downline?.totals?.roiUsd ?? 0)}
              </p>
              <p className="text-[11px] text-cyan-300/70 mt-1">
                {formatRAMA(downline?.totals?.roiRama ?? 0)} RAMA
              </p>
            </div>
          </div>

          {!downlineLoading && downlineError && (
            <div className="text-sm text-yellow-200 bg-yellow-900/20 border border-yellow-500/40 rounded-lg px-3 py-2">
              {downlineError}
            </div>
          )}

          {downlineLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-12 rounded-lg bg-cyan-500/15 animate-pulse"
                />
              ))}
            </div>
          ) : (downline?.items?.length ?? 0) > 0 ? (
            <>
              <div className="relative z-10 overflow-hidden rounded-xl border border-cyan-500/20 backdrop-blur">
                <table className="w-full text-sm min-w-[640px]">
                  <thead className="bg-cyan-500/10 text-[11px] uppercase tracking-wide text-cyan-300/80">
                    <tr>
                      <th className="py-3 px-4 text-left">#</th>
                      <th className="py-3 px-4 text-left">Member</th>
                      <th className="py-3 px-4 text-right">Portfolio (USD)</th>
                      <th className="py-3 px-4 text-right">Daily ROI (USD)</th>
                      <th className="py-3 px-4 text-right">Daily ROI (RAMA)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cyan-500/15">
                    {displayedDownline.map((m, i) => (
                      <tr
                        key={`${m.member}-${i}`}
                        className="transition-colors hover:bg-cyan-500/5"
                      >
                        <td className="py-3 px-4 text-cyan-300/80 font-mono text-xs">
                          {i + 1}
                        </td>
                        <td className="py-3 px-4">
                          <AddressWithCopy
                            address={m.member}
                            copyLabel=""
                            className="text-[11px]"
                            textClassName="font-mono text-cyan-200 truncate max-w-[240px]"
                          />
                        </td>
                        <td className="py-3 px-4 text-right text-cyan-100">
                          {formatUSD(m.portfolioUsd)}
                        </td>
                        <td className="py-3 px-4 text-right text-neon-green">
                          {formatUSD(m.roiUsd)}
                        </td>
                        <td className="py-3 px-4 text-right text-cyan-100">
                          {formatRAMA(m.roiRama)} RAMA
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-cyan-500/5 text-cyan-200/90 text-sm">
                    <tr>
                      <td className="py-3 px-4 text-left" colSpan={2}>
                        Totals
                      </td>
                      <td className="py-3 px-4 text-right">
                        {formatUSD(downline?.totals?.portfolioUsd ?? 0)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {formatUSD(downline?.totals?.roiUsd ?? 0)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {formatRAMA(downline?.totals?.roiRama ?? 0)} RAMA
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {downlineHasMore && (
                <button
                  onClick={() => setShowAllDownline((v) => !v)}
                  className="self-start px-4 py-2 text-xs font-semibold uppercase tracking-wide border border-cyan-500/30 rounded-lg text-cyan-200 hover:border-cyan-500/60 transition-all"
                >
                  {showAllDownline
                    ? "Show Less"
                    : `View More (${
                        (downline?.items?.length ?? 0) - displayedDownline.length
                      } more)`}
                </button>
              )}
            </>
          ) : (
            <div className="text-sm text-cyan-300/80 flex items-center gap-2">
              <AlertCircle size={16} />
              No downline daily accrued reward data available yet.
            </div>
          )}
        </div>
      </div>
    )}
  </div>
  );
}
