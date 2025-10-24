import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Vault,
  TrendingUp,
  History,
  Search,
  Eye,
  AlertCircle,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
} from 'lucide-react';
import { formatRAMA, formatUSD } from '../utils/contractData';
import AddressWithCopy from '../components/AddressWithCopy';
import { useStore } from '../../store/useUserInfoStore';
import { useNavigate } from 'react-router-dom';

const HISTORY_PAGE_SIZE = 20;

const SAFEWALLET_KINDS = {
  ROI: 0,
  GROWTH: 1,
  ROYALTY: 2,
  SLAB: 3,
  REWARD: 4,
  DIRECT: 5,
  MANUAL: 6,
  STAKE_SPEND: 7,
  PORTFOLIO_CREATE: 8,
  PORTFOLIO_TOPUP: 9,
  WITHDRAW: 10,
};

const CREDIT_KIND_LABEL = {
  [SAFEWALLET_KINDS.ROI]: 'Portfolio Growth Credit',
  [SAFEWALLET_KINDS.GROWTH]: 'Spot Income Credit',
  [SAFEWALLET_KINDS.ROYALTY]: 'Royalty Income Credit',
  [SAFEWALLET_KINDS.SLAB]: 'Slab Income Credit',
  [SAFEWALLET_KINDS.REWARD]: 'One-Time Reward Credit',
  [SAFEWALLET_KINDS.DIRECT]: 'Direct Income Credit',
  [SAFEWALLET_KINDS.MANUAL]: 'Manual Credit',
};

const DEBIT_KIND_LABEL = {
  [SAFEWALLET_KINDS.STAKE_SPEND]: 'Portfolio Stake Spend',
  [SAFEWALLET_KINDS.PORTFOLIO_CREATE]: 'Portfolio Creation Debit',
  [SAFEWALLET_KINDS.PORTFOLIO_TOPUP]: 'Portfolio Top-up Debit',
  [SAFEWALLET_KINDS.WITHDRAW]: 'Withdrawal to External Wallet',
};

export default function SafeWallet() {
  const navigate = useNavigate();
  const getPortfolioSummaries = useStore((s) => s.getPortfolioSummaries);
  const getPortFoliById = useStore((s) => s.getPortFoliById);
  const getSafeWalletSummary = useStore((s) => s.getSafeWalletSummary);
  const getTransactionHistory = useStore((s) => s.getTransactionHistory);
  const userAddressFromStore = useStore((s) => s.userAddress);

  const [showPortfolioViewer, setShowPortfolioViewer] = useState(false);
  const [lookupAddress, setLookupAddress] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [viewerMode, setViewerMode] = useState(null); // 'address' | 'portfolio'
  const [viewerSearchType, setViewerSearchType] = useState('address');
  const [selectedViewerPid, setSelectedViewerPid] = useState(null);
  const [viewerMeta, setViewerMeta] = useState(null);
  const [portfolioCards, setPortfolioCards] = useState([]);
  const [portfolioDetail, setPortfolioDetail] = useState(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawCurrency, setWithdrawCurrency] = useState('USD');
  const [withdrawInput, setWithdrawInput] = useState('');
  const [safeSummary, setSafeSummary] = useState(null);
  const [safeSummaryLoading, setSafeSummaryLoading] = useState(false);
  const [safeSummaryError, setSafeSummaryError] = useState('');
  const [historyEntries, setHistoryEntries] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  const userAddress =
    userAddressFromStore ||
    (typeof window !== 'undefined' ? localStorage.getItem('userAddress') : null);

  useEffect(() => {
    let cancelled = false;

    const fetchSummary = async () => {
      if (!userAddress || typeof getSafeWalletSummary !== 'function') {
        setSafeSummary(null);
        setSafeSummaryLoading(false);
        setSafeSummaryError('');
        return;
      }

      setSafeSummaryLoading(true);
      setSafeSummaryError('');
      try {
        const summary = await getSafeWalletSummary(userAddress);
        if (cancelled) return;
        setSafeSummary(summary ?? null);
      } catch (error) {
        if (cancelled) return;
        console.error('Safe wallet summary load failed:', error);
        setSafeSummary(null);
        setSafeSummaryError(error?.message || 'Unable to load safe wallet balance.');
      } finally {
        if (!cancelled) {
          setSafeSummaryLoading(false);
        }
      }
    };

    fetchSummary();

    return () => {
      cancelled = true;
    };
  }, [userAddress, getSafeWalletSummary]);

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      if (!userAddress || typeof getTransactionHistory !== 'function') {
        setHistoryEntries([]);
        setHistoryError('');
        return;
      }

      setHistoryLoading(true);
      setHistoryError('');
      try {
        const data = await getTransactionHistory(userAddress, {
          offset: 0,
          limit: 200,
        });
        if (cancelled) return;
        const rawEntries = Array.isArray(data?.entries) ? data.entries : [];
        const sortedEntries = rawEntries
          .slice()
          .sort(
            (a, b) =>
              (Number(b?.timestamp ?? 0) || 0) -
              (Number(a?.timestamp ?? 0) || 0)
          );
        setHistoryEntries(sortedEntries);
        setCurrentPage(1);
      } catch (error) {
        if (cancelled) return;
        console.error('Safe wallet history load failed:', error);
        setHistoryEntries([]);
        setHistoryError(error?.message || 'Unable to load history records.');
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [userAddress, getTransactionHistory]);

  const fallbackRamaBalance = 0;
  const summaryRama = safeSummary?.balance?.rama;
  const summaryUsd = safeSummary?.balance?.usd;
  const hasSummaryRama =
    summaryRama !== null &&
    summaryRama !== undefined &&
    Number.isFinite(Number(summaryRama));
  const hasSummaryUsd =
    summaryUsd !== null &&
    summaryUsd !== undefined &&
    Number.isFinite(Number(summaryUsd));

  const ramaBalance = hasSummaryRama ? Number(summaryRama) : fallbackRamaBalance;
  const usdValue = hasSummaryUsd ? Number(summaryUsd) : 0;
  const derivedPrice =
    ramaBalance > 0 && usdValue > 0 ? usdValue / ramaBalance : null;
  const safePrice =
    Number.isFinite(derivedPrice) && derivedPrice > 0 ? derivedPrice : 0;

  const inflowTotals = useMemo(() => {
    return historyEntries.reduce(
      (acc, entry) => {
        if (entry?.isCredit) {
          acc.usd += Number(entry?.usd ?? 0);
          acc.rama += Number(entry?.rama ?? 0);
        }
        return acc;
      },
      { usd: 0, rama: 0 }
    );
  }, [historyEntries]);
  const totalInflows = inflowTotals.usd;
  const toUsd = (valueRama) =>
    Number.isFinite(valueRama) && safePrice > 0 ? valueRama * safePrice : 0;
  const toRama = (valueUsd) =>
    Number.isFinite(valueUsd) && safePrice > 0 ? valueUsd / safePrice : 0;

  const totalInflowsRama = inflowTotals.rama;
  const availableAfterFeeUsd = usdValue * 0.95;
  const availableAfterFeeRama = ramaBalance * 0.95;
  const formattedRamaBalance = formatRAMA(ramaBalance);
  const formattedUsdValue = formatUSD(usdValue);
  const formattedAvailableAfterFeeUsd = formatUSD(availableAfterFeeUsd);
  const formattedAvailableAfterFeeRama = formatRAMA(availableAfterFeeRama);

  const parsedInput = useMemo(() => {
    const raw = parseFloat(withdrawInput);
    return Number.isFinite(raw) && raw > 0 ? raw : 0;
  }, [withdrawInput]);

  const amountRama = useMemo(() => {
    if (parsedInput <= 0) return 0;
    return withdrawCurrency === 'RAMA' ? parsedInput : toRama(parsedInput);
  }, [parsedInput, withdrawCurrency]);

  const amountUsd = useMemo(() => toUsd(amountRama), [amountRama]);
  const feeUsd = amountUsd * 0.05;
  const netUsd = Math.max(amountUsd - feeUsd, 0);
  const feeRama = toRama(feeUsd);
  const netRama = Math.max(amountRama - feeRama, 0);
  const exceedsBalance = amountUsd > usdValue;
  const wadToPercent = (value) => (value ? Number(value) / 1e16 : 0);
  const formatDate = (ts) => {
    if (!ts) return '—';
    const date = new Date(Number(ts) * 1000);
    return Number.isFinite(date.getTime()) ? date.toLocaleString() : '—';
  };
  const slabNames = useMemo(
    () => [
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
    ],
    []
  );
  const detailPrincipalUsd = portfolioDetail ? Number(portfolioDetail.principalUsd ?? 0) : 0;
  const detailCapPct = portfolioDetail ? Number(portfolioDetail.capPct ?? 0) : 0;
  const fallbackCapMultiplier = portfolioDetail?.booster ? 2.5 : 2;
  const derivedCapFromPct =
    detailPrincipalUsd > 0
      ? detailCapPct > 0
        ? detailPrincipalUsd * (detailCapPct / 100)
        : detailPrincipalUsd * fallbackCapMultiplier
      : 0;
  let detailCapUsd = portfolioDetail
    ? Number(
        portfolioDetail.capUsd != null
          ? portfolioDetail.capUsd
          : derivedCapFromPct
      )
    : 0;
  if (!Number.isFinite(detailCapUsd) || detailCapUsd <= 0) {
    detailCapUsd = derivedCapFromPct;
  }
  if (derivedCapFromPct > 0 && detailCapUsd > derivedCapFromPct * 5) {
    detailCapUsd = derivedCapFromPct;
  }
  const detailCreditedUsd = portfolioDetail ? Number(portfolioDetail.creditedUsd ?? 0) : 0;
  const detailPendingUsd = portfolioDetail ? Number(portfolioDetail.pendingUsd ?? 0) : 0;
  const detailTotalAccrued = detailCreditedUsd + detailPendingUsd;
  const detailRemainingUsdFallback = Math.max(0, detailCapUsd - detailTotalAccrued);
  const detailRemainingUsd = portfolioDetail?.remainingCapUsd ?? detailRemainingUsdFallback;
  const detailProgress = detailCapUsd > 0 ? Math.min(100, (detailTotalAccrued / detailCapUsd) * 100) : 0;
  const detailProgressLabel = detailProgress.toFixed(2);
  const detailCapLabel = portfolioDetail
    ? detailCapPct
      ? `${detailCapPct}% Cap${portfolioDetail.booster ? ' • Booster' : ''}`
      : portfolioDetail.booster
      ? 'Booster'
      : ''
    : '';
  const detailDailyRate = portfolioDetail ? wadToPercent(portfolioDetail.dailyRateWad) : 0;
  const detailDaysActive = portfolioDetail?.createdAt
    ? Math.max(0, Math.floor((Date.now() / 1000 - Number(portfolioDetail.createdAt)) / 86400))
    : null;
  const detailDirectRefs =
    portfolioDetail?.directMembers ??
    portfolioDetail?.directs ??
    portfolioDetail?.directRefs ??
    '—';
  const detailSlabIndex = portfolioDetail ? Number(portfolioDetail.tier ?? 0) : 0;
  const detailSlabName =
    detailSlabIndex && detailSlabIndex > 0
      ? slabNames[detailSlabIndex - 1] ?? `Tier ${detailSlabIndex}`
      : 'None';

  const formatSignedUsd = (value, direction) => {
    const prefix = direction === 'credit' ? '+' : '-';
    return `${prefix}${formatUSD(value)}`;
  };

  const typeBadgeClass = (type) => {
    switch (type) {
      case 'income':
        return 'text-neon-green border-neon-green/40 bg-neon-green/10';
      case 'withdrawal':
        return 'text-neon-orange border-neon-orange/40 bg-neon-orange/10';
      default:
        return 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10';
    }
  };

  const sourceBadgeClass = (source) => {
    if (source === 'Safe Wallet') {
      return 'text-neon-green border-neon-green/30 bg-neon-green/10';
    }
    if (source === 'External Wallet') {
      return 'text-neon-orange border-neon-orange/40 bg-neon-orange/10';
    }
    return 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10';
  };

  const mapHistoryEntry = useCallback(
    (entry) => {
      if (!entry) return null;
      const direction = entry.isCredit ? 'credit' : 'debit';
      const kind = Number(entry.kind ?? 0);
      const activity = entry.isCredit
        ? CREDIT_KIND_LABEL[kind] ?? 'Safe Wallet Credit'
        : DEBIT_KIND_LABEL[kind] ?? 'Safe Wallet Debit';
      const type =
        entry.isCredit
          ? 'income'
          : kind === SAFEWALLET_KINDS.WITHDRAW
          ? 'withdrawal'
          : 'portfolio';

      const related = entry.related;
      const relatedLabel =
        typeof related === 'string' && related.startsWith('0x') && related.length === 42
          ? `${related.slice(0, 6)}…${related.slice(-4)}`
          : null;

      const detailsPieces = [];
      if (entry.memoReadable) detailsPieces.push(entry.memoReadable);
      if (entry.pid && Number(entry.pid) > 0) {
        detailsPieces.push(`Portfolio #${entry.pid}`);
      }
      if (relatedLabel) {
        detailsPieces.push(`Related ${relatedLabel}`);
      }
      const details = detailsPieces.join(' • ') || '—';

      const grossUsd = Number(entry.usd ?? 0);
      const grossRama = Number(entry.rama ?? 0);
      const fundSource = entry.isCredit ? 'Safe Wallet' : 'External Wallet';

      return {
        id: entry.id,
        activity,
        details,
        direction,
        grossUsd,
        feeUsd: 0,
        netUsd: grossUsd,
        fundSource,
        type,
        date: entry.timestamp ? formatDate(entry.timestamp) : '—',
        tokenAmount: grossRama,
      };
    },
    [formatDate]
  );

  const historyRows = useMemo(
    () => historyEntries.map(mapHistoryEntry).filter(Boolean),
    [historyEntries, mapHistoryEntry]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [historyRows.length]);

  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * HISTORY_PAGE_SIZE;
    return historyRows.slice(start, start + HISTORY_PAGE_SIZE);
  }, [currentPage, historyRows]);

  const totalRecords = historyRows.length;
  const totalPages = Math.max(
    1,
    Math.ceil(Math.max(totalRecords, 1) / HISTORY_PAGE_SIZE)
  );

  useEffect(() => {
    setCurrentPage((prev) => {
      if (prev < 1) return 1;
      if (prev > totalPages) return totalPages;
      return prev;
    });
  }, [totalPages]);

  const recordRangeStart =
    totalRecords === 0 ? 0 : (currentPage - 1) * HISTORY_PAGE_SIZE + 1;
  const recordRangeEnd =
    totalRecords === 0
      ? 0
      : Math.min(recordRangeStart + HISTORY_PAGE_SIZE - 1, totalRecords);

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const handleOpenWithdraw = () => {
    setWithdrawCurrency('USD');
    setWithdrawInput('');
    setIsWithdrawOpen(true);
  };

  const handleCloseWithdraw = () => {
    setIsWithdrawOpen(false);
    setWithdrawInput('');
  };

  const resetViewerState = () => {
    setViewerMode(null);
    setViewerMeta(null);
    setPortfolioCards([]);
    setPortfolioDetail(null);
    setSelectedViewerPid(null);
    setLookupError('');
  };

  const handleChangeSearchType = (type) => {
    if (type === viewerSearchType) return;
    setViewerSearchType(type);
    setLookupAddress('');
    resetViewerState();
  };

  const fetchPortfolioDetail = useCallback(
    async (pid, { showLoader = true } = {}) => {
      if (!Number.isFinite(pid)) return;
      if (showLoader) setViewerLoading(true);
      try {
        const detail = await getPortFoliById(pid);
        if (!detail) {
          setLookupError('Unable to load portfolio details.');
          setPortfolioDetail(null);
          setSelectedViewerPid(null);
          return;
        }
        setLookupError('');
        setPortfolioDetail(detail);
        setSelectedViewerPid(pid);
      } catch (err) {
        console.error('Portfolio detail fetch failed:', err);
        setLookupError(err?.message || 'Unable to load portfolio details.');
        setPortfolioDetail(null);
        setSelectedViewerPid(null);
      } finally {
        if (showLoader) setViewerLoading(false);
      }
    },
    [getPortFoliById]
  );

  const handleSelectCurrency = (next) => {
    if (next === withdrawCurrency) return;
    const raw = parseFloat(withdrawInput);
    if (Number.isFinite(raw) && raw > 0) {
      const valueRama = withdrawCurrency === 'RAMA' ? raw : toRama(raw);
      const converted = next === 'USD' ? toUsd(valueRama) : valueRama;
      setWithdrawInput(converted.toFixed(2));
    } else {
      setWithdrawInput('');
    }
    setWithdrawCurrency(next);
  };

  const handlePercentSelect = (percent) => {
    const ramaPortion = ramaBalance * percent;
    const amount =
      withdrawCurrency === 'USD'
        ? toUsd(ramaPortion).toFixed(2)
        : ramaPortion.toFixed(2);
    setWithdrawInput(amount);
  };

  const handleWithdrawSubmit = () => {
    if (amountUsd <= 0 || exceedsBalance) return;
    alert(
      `Static withdraw preview:\nGross: ${formatRAMA(amountRama)} RAMA (${formatUSD(amountUsd)})\nFee (5%): ${formatRAMA(feeRama)} RAMA (${formatUSD(feeUsd)})\nNet: ${formatRAMA(netRama)} RAMA (${formatUSD(netUsd)})`
    );
    handleCloseWithdraw();
  };

  const handleLookupPortfolio = async () => {
    const rawInput = lookupAddress.trim();

    setLookupError('');
    setViewerMode(null);
    setViewerMeta(null);
    setPortfolioCards([]);
    setPortfolioDetail(null);
    setSelectedViewerPid(null);

    if (!rawInput) {
      setLookupError('Please enter a wallet address or portfolio ID');
      return;
    }

    if (viewerSearchType === 'address') {
      if (!/^0x[a-fA-F0-9]{40}$/.test(rawInput)) {
        setLookupError('Enter a valid 0x wallet address.');
        return;
      }
      setViewerLoading(true);
      try {
        const summaries = await getPortfolioSummaries(rawInput);
        if (!summaries || summaries.length === 0) {
          resetViewerState();
          setLookupError('No portfolios found for this wallet.');
        } else {
          setViewerMode('address');
          setViewerMeta({ value: rawInput });
          setPortfolioCards(summaries);
          const firstPid = Number(summaries[0]?.pid);
          if (Number.isFinite(firstPid)) {
            await fetchPortfolioDetail(firstPid, { showLoader: false });
          } else {
            setPortfolioDetail(null);
            setSelectedViewerPid(null);
          }
        }
      } catch (error) {
        console.error('Portfolio viewer error:', error);
        resetViewerState();
        setLookupError(error?.message || 'Unable to load portfolio information.');
      } finally {
        setViewerLoading(false);
      }
      return;
    }

    // portfolio id search
    const parsedPid = Number(rawInput);
    if (!Number.isFinite(parsedPid) || parsedPid < 0) {
      setLookupError('Portfolio ID should be a non-negative number.');
      return;
    }
    setViewerMode('portfolio');
    setViewerMeta({ value: parsedPid });
    await fetchPortfolioDetail(parsedPid, { showLoader: true });
  };

  return (
    <div className="space-y-6">
      {isWithdrawOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-dark-950/80 backdrop-blur-sm"
            onClick={handleCloseWithdraw}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-10">
            <div className="relative w-full max-w-lg cyber-glass border border-cyan-500/40 rounded-2xl p-6 sm:p-8 space-y-6">
              <button
                onClick={handleCloseWithdraw}
                className="absolute top-3 right-3 p-2 text-cyan-300/70 hover:text-white hover:bg-cyan-500/10 rounded-lg transition-all"
                aria-label="Close withdraw dialog"
              >
                <X size={18} />
              </button>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">Withdraw</p>
                <h2 className="text-2xl font-bold text-white">Transfer to Connected Wallet</h2>
                <p className="text-sm text-cyan-300/80">
                  Choose how much you’d like to move out. A 5% network protection fee applies to every external withdrawal.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-cyan-200">Amount</span>
                  <div className="flex items-center gap-2">
                    {['USD', 'RAMA'].map((option) => (
                      <button
                        key={option}
                        onClick={() => handleSelectCurrency(option)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${
                          withdrawCurrency === option
                            ? 'border-neon-green/60 text-neon-green bg-neon-green/10'
                            : 'border-cyan-500/30 text-cyan-300 hover:border-cyan-500/50'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="cyber-glass border border-cyan-500/30 rounded-xl flex items-center px-4 py-3">
                  <input
                    value={withdrawInput}
                    onChange={(event) => setWithdrawInput(event.target.value)}
                    placeholder={withdrawCurrency === 'USD' ? '0.00 USD' : '0.00 RAMA'}
                    className="flex-1 bg-transparent text-lg font-semibold text-white placeholder-cyan-500/40 focus:outline-none"
                    inputMode="decimal"
                  />
                  <span className="text-sm font-semibold text-cyan-300/80">{withdrawCurrency}</span>
                </div>
                {parsedInput > 0 && (
                  <p className="text-xs text-cyan-300/70">
                    ≈{' '}
                    {withdrawCurrency === 'USD'
                      ? `${formatRAMA(amountRama)} RAMA`
                      : formatUSD(amountUsd)}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {[0.1, 0.25, 0.5, 0.75, 1].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => handlePercentSelect(pct)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-cyan-500/30 text-cyan-300 hover:border-neon-green/50 hover:text-neon-green transition-all"
                    >
                      {Math.round(pct * 100)}%
                    </button>
                  ))}
                </div>
                <p className="text-xs text-cyan-300/70">
                  Available: {formattedUsdValue} • {formattedRamaBalance} RAMA
                </p>
              </div>

              <div className="space-y-3 cyber-glass border border-cyan-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between text-sm text-cyan-300/80">
                  <span>Gross Amount</span>
                  <span className="text-white font-semibold">
                    {amountRama > 0 ? `${formatRAMA(amountRama)} RAMA` : '0 RAMA'}
                  </span>
                </div>
                <p className="text-[11px] text-cyan-300/60 text-right">
                  ≈ {amountUsd > 0 ? formatUSD(amountUsd) : '$0.00'}
                </p>
                <div className="flex items-center justify-between text-sm text-cyan-300/80">
                  <span>Fee (5%)</span>
                  <span className="text-neon-orange font-semibold">
                    {amountUsd > 0 ? `${formatRAMA(feeRama)} RAMA` : '0 RAMA'}
                  </span>
                </div>
                <p className="text-[11px] text-cyan-300/60 text-right">
                  ≈ {amountUsd > 0 ? formatUSD(feeUsd) : '$0.00'}
                </p>
                <div className="flex items-center justify-between text-sm font-semibold text-neon-green">
                  <span>Net to Wallet</span>
                  <span>{amountUsd > 0 ? `${formatRAMA(netRama)} RAMA` : '0 RAMA'}</span>
                </div>
                <p className="text-[11px] text-cyan-300/60 text-right">
                  ≈ {amountUsd > 0 ? formatUSD(netUsd) : '$0.00'}
                </p>
                {exceedsBalance && (
                  <p className="text-xs text-neon-orange">
                    Requested amount exceeds Safe Wallet balance. Enter a smaller amount or fund your wallet.
                  </p>
                )}
              </div>

              <button
                onClick={handleWithdrawSubmit}
                disabled={amountUsd <= 0 || exceedsBalance}
                className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                  amountUsd <= 0 || exceedsBalance
                    ? 'bg-cyan-500/20 text-cyan-300/40 cursor-not-allowed'
                    : 'bg-gradient-to-r from-neon-green to-cyan-500 text-dark-950 hover:shadow-neon-green'
                }`}
              >
                Withdraw Now
              </button>

              <p className="text-[11px] text-cyan-300/60 text-center">
                Preview only — contract integration coming soon. Connected wallet required for actual settlement.
              </p>
            </div>
          </div>
        </>
      )}
      <div>
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green relative inline-block">
          Safe Wallet
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-neon-green/20 blur-xl -z-10" />
        </h1>
        <p className="text-cyan-300/90 mt-1">Your fee-free internal balance</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 cyber-glass border border-neon-green/50 rounded-2xl p-8 text-white relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-neon-green/10 to-cyan-500/10 opacity-50 group-hover:opacity-70 transition-opacity" />
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon-green/70 to-transparent" />
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="p-3 cyber-glass border border-neon-green/30 rounded-xl backdrop-blur-sm">
              <Vault size={32} />
            </div>
            <div>
              <p className="text-sm opacity-90">Safe Wallet Balance</p>
              <p className="text-xs opacity-75">Fee-free internal funds</p>
            </div>
          </div>

          <div className="mb-6 relative z-10">
            <p className="text-5xl font-bold mb-2">
              {safeSummaryLoading ? (
                <span className="text-2xl text-cyan-300 animate-pulse">Loading...</span>
              ) : (
                `${formattedRamaBalance} RAMA`
              )}
            </p>
            <p className="text-2xl opacity-90">≈ {formattedUsdValue}</p>
            <p className="text-sm text-cyan-300/80 mt-2">
              Available after 5% fee: {formattedAvailableAfterFeeUsd} • {formattedAvailableAfterFeeRama} RAMA
            </p>
            {safeSummaryError && !safeSummaryLoading && (
              <p className="mt-2 text-xs text-neon-orange">{safeSummaryError}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 relative z-10">
            <button
              onClick={() => navigate('/dashboard/stake')}
              className="py-3 cyber-glass hover:bg-white/10 backdrop-blur-sm rounded-lg font-medium transition-colors border border-cyan-500/30 hover:border-cyan-500/50"
            >
              Stake from Wallet
            </button>
            <button
              onClick={handleOpenWithdraw}
              className="py-3 cyber-glass rounded-lg font-medium border border-cyan-500/30 hover:border-neon-orange/60 text-neon-orange transition-all relative group"
            >
              Withdraw
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="cyber-glass rounded-xl p-5 border border-cyan-500/30 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 cyber-glass border border-neon-green/30 rounded-lg">
                <TrendingUp className="text-neon-green" size={20} />
              </div>
            <p className="text-sm font-medium text-cyan-300">Total Inflows</p>
          </div>
            <div className="text-2xl font-bold text-neon-green">
              {historyLoading ? (
                <span className="flex items-center gap-2 text-sm text-cyan-200">
                  <Loader2 className="animate-spin" size={16} />
                  <span>Syncing…</span>
                </span>
              ) : (
                formatUSD(totalInflows)
              )}
            </div>
            <p className="text-xs text-cyan-300/80 mt-1">
              {historyLoading
                ? '≈ —'
                : `≈ ${formatRAMA(totalInflowsRama)} RAMA credited`}
            </p>
          </div>

          <div className="cyber-glass border border-neon-green/30 rounded-xl p-4">
            <p className="text-sm font-medium text-neon-green mb-2 uppercase tracking-wide">Key Features</p>
            <ul className="space-y-1 text-xs text-cyan-300/90">
              <li>• 0% fees for staking</li>
              <li>• No commission on stakes</li>
              <li>• 5% fee on withdrawals to external wallets</li>
              <li>• Supports self & team portfolio creation</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Portfolio Viewer Section */}
      <div className="cyber-glass rounded-2xl p-6 border border-cyan-500/30 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Eye size={20} className="text-cyan-400" />
            <h2 className="text-lg font-semibold text-cyan-300 uppercase tracking-wide">Portfolio Viewer</h2>
          </div>
          <button
            onClick={() => setShowPortfolioViewer(!showPortfolioViewer)}
            className="px-4 py-2 cyber-glass border border-cyan-500/30 hover:border-cyan-500/50 rounded-lg text-sm font-medium text-cyan-300 transition-colors"
          >
            {showPortfolioViewer ? 'Hide' : 'Show'} Viewer
          </button>
        </div>

        {showPortfolioViewer && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {[
                  { key: 'address', label: 'Wallet Address' },
                  { key: 'portfolio', label: 'Portfolio ID' },
                ].map((option) => (
                  <button
                    key={option.key}
                    onClick={() => handleChangeSearchType(option.key)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${
                      viewerSearchType === option.key
                        ? 'border-neon-green/60 text-neon-green bg-neon-green/10'
                        : 'border-cyan-500/30 text-cyan-300 hover:border-cyan-500/50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {viewerMode === 'address' && portfolioCards.length > 1 && (
                <p className="text-[11px] text-cyan-300/60">
                  Click a portfolio card below to view details.
                </p>
              )}
            </div>

            <div className="p-4 cyber-glass border border-cyan-500/20 rounded-lg">
              <p className="text-sm text-cyan-300 mb-3">
                {viewerSearchType === 'address'
                  ? 'Enter wallet address to load all associated portfolios'
                  : 'Enter a portfolio ID to view its latest status'}
              </p>
              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={lookupAddress}
                    onChange={(e) => {
                      setLookupAddress(e.target.value);
                      setLookupError('');
                    }}
                    placeholder={
                      viewerSearchType === 'address'
                        ? '0x1234...5678'
                        : '1024'
                    }
                    className="w-full px-4 py-2 cyber-glass border border-cyan-500/30 rounded-lg text-cyan-300 placeholder-cyan-400/50 focus:outline-none focus:border-cyan-500/50"
                  />
                  {lookupError && (
                    <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                      <AlertCircle size={12} />
                      {lookupError}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleLookupPortfolio}
                  className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-neon-green text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <Search size={18} />
                  View
                </button>
              </div>
            </div>

            {viewerLoading && (
              <div className="p-4 cyber-glass border border-cyan-500/30 rounded-xl text-sm text-cyan-200 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                Loading portfolio data…
              </div>
            )}

            {!viewerLoading && viewerMode === 'address' && portfolioCards.length > 0 && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm text-cyan-300/80">
                    <Wallet size={18} className="text-neon-green" />
                    <span>Wallet:</span>
                    <AddressWithCopy
                      address={viewerMeta?.value}
                      className="text-xs sm:text-sm"
                      textClassName="font-mono text-cyan-200"
                      copyLabel=""
                    />
                  </div>
                  <span className="text-xs font-semibold text-neon-green uppercase tracking-wider">
                    {portfolioCards.length} portfolio{portfolioCards.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {portfolioCards.map((card) => {
                    const pidNumber = Number(card.pid);
                    const isSelected = selectedViewerPid === pidNumber;
                    const progressPercent = Math.max(
                      0,
                      Math.min(100, Number(card.capProgressBps ?? 0) / 100)
                    );
                    const capTargetUsd =
                      card.capPct && card.capPct > 0
                        ? card.principalUsd * (card.capPct / 100)
                        : null;
                    const dailyRate = wadToPercent(card.dailyRateWad);
                    return (
                      <button
                        key={card.pid}
                        type="button"
                        onClick={() => fetchPortfolioDetail(pidNumber)}
                        className={`text-left p-4 cyber-glass border rounded-xl transition-all space-y-3 ${
                          isSelected
                            ? 'border-neon-green/60 shadow-neon-green'
                            : 'border-cyan-500/20 hover:border-cyan-500/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-cyan-300/70 uppercase tracking-wider">
                              Portfolio #{card.pid}
                            </p>
                            <p className="text-sm font-semibold text-cyan-100">
                              {card.capPct ? `${card.capPct}% Cap` : 'Cap Pending'}
                              {card.booster ? ' • Booster' : ''}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                              card.active
                                ? 'border-neon-green/40 text-neon-green bg-neon-green/10'
                                : 'border-red-400/40 text-red-300 bg-red-500/10'
                            }`}
                          >
                            {card.active ? 'Active' : 'Closed'}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-xs text-cyan-300/70 mb-1">
                            <span>Cap Progress</span>
                            <span className="font-semibold text-neon-green">
                              {progressPercent.toFixed(2)}%
                            </span>
                          </div>
                          <div className="h-2 bg-dark-900 rounded-full overflow-hidden border border-cyan-500/20">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-500 to-neon-green rounded-full"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs text-cyan-300/80">
                          <div>
                            <p className="uppercase tracking-wide text-[10px] text-cyan-400/80">
                              Principal
                            </p>
                            <p className="text-sm font-semibold text-cyan-200">
                              {formatUSD(card.principalUsd)}
                            </p>
                            <p className="text-[11px] text-cyan-300/60">
                              {formatRAMA(card.principalRama)} RAMA
                            </p>
                          </div>
                          <div>
                            <p className="uppercase tracking-wide text-[10px] text-cyan-400/80">
                              Cap Target
                            </p>
                            <p className="text-sm font-semibold text-neon-green">
                              {capTargetUsd ? formatUSD(capTargetUsd) : '—'}
                            </p>
                            <p className="text-[11px] text-cyan-300/60">
                              Progress: {progressPercent.toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <p className="uppercase tracking-wide text-[10px] text-cyan-400/80">
                              Daily Rate
                            </p>
                            <p className="text-sm font-semibold text-cyan-200">
                              {dailyRate ? `${dailyRate.toFixed(2)}%` : '—'}
                            </p>
                          </div>
                          <div>
                            <p className="uppercase tracking-wide text-[10px] text-cyan-400/80">
                              Created
                            </p>
                            <p className="text-sm font-semibold text-cyan-200">
                              {formatDate(card.createdAt)}
                            </p>
                            {card.frozenUntil > 0 && (
                              <p className="text-[11px] text-neon-orange/80">
                                Frozen until {formatDate(card.frozenUntil)}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {!viewerLoading && portfolioDetail && (
              <div className="cyber-glass border border-neon-green/40 rounded-2xl p-5 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-cyan-200 uppercase tracking-wide">
                      Active Portfolio Status
                    </h3>
                    <p className="text-xs text-cyan-300/70">
                      Portfolio #{selectedViewerPid ?? portfolioDetail.pid}
                    </p>
                    {detailDaysActive != null && (
                      <p className="text-[11px] text-cyan-300/60">
                        Active since {detailDaysActive} day{detailDaysActive === 1 ? '' : 's'}
                      </p>
                    )}
                  </div>
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                      portfolioDetail.active
                        ? 'border-neon-green/50 text-neon-green bg-neon-green/10'
                        : 'border-red-400/50 text-red-300 bg-red-500/10'
                    }`}
                  >
                    {portfolioDetail.active ? 'Active' : 'Closed'}
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-xs text-cyan-300/70 mb-2">
                      <span className="font-medium uppercase tracking-wider">
                        Portfolio Cap Progress
                      </span>
                      <span className="font-semibold text-neon-green">
                        {detailProgressLabel}%
                      </span>
                    </div>
                    <div className="h-3 bg-dark-900 rounded-full overflow-hidden border border-cyan-500/20">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-neon-green rounded-full"
                        style={{ width: `${Math.max(0, Math.min(100, detailProgress))}%` }}
                      />
                    </div>
                    <p className="text-xs text-cyan-300/70 mt-1">
                      {formatUSD(detailPrincipalUsd)} / {formatUSD(detailCapUsd)}
                      {detailCapLabel && <span className="text-neon-green ml-1">{detailCapLabel}</span>}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 cyber-glass border border-neon-green/30 rounded-xl">
                      <p className="text-[11px] text-neon-green uppercase tracking-wider">
                        Total Accrued Reward
                      </p>
                      <p className="text-lg font-bold text-neon-green">
                        {formatUSD(detailTotalAccrued)}
                      </p>
                      <p className="text-[11px] text-neon-green/70 mt-1">
                        Pending: {formatUSD(detailPendingUsd)}
                      </p>
                    </div>
                    <div className="p-3 cyber-glass border border-cyan-500/30 rounded-xl">
                      <p className="text-[11px] text-cyan-400 uppercase tracking-wider">
                        Portfolio Principal
                      </p>
                      <p className="text-lg font-bold text-cyan-200">
                        {formatUSD(detailPrincipalUsd)}
                      </p>
                    </div>
                    <div className="p-3 cyber-glass border border-neon-purple/30 rounded-xl">
                      <p className="text-[11px] text-neon-purple uppercase tracking-wider">
                        Cap Target
                      </p>
                      <p className="text-lg font-bold text-neon-purple">
                        {formatUSD(detailCapUsd)}
                      </p>
                    </div>
                    <div className="p-3 cyber-glass border border-neon-orange/30 rounded-xl">
                      <p className="text-[11px] text-neon-orange uppercase tracking-wider">
                        Remaining Reward
                      </p>
                      <p className="text-lg font-bold text-neon-orange">
                        {formatUSD(detailRemainingUsd)}
                      </p>
                      <p className="text-[11px] text-neon-orange/70 mt-1">Until full cap</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 cyber-glass border border-cyan-500/30 rounded-xl">
                      <p className="text-[11px] text-cyan-400 font-medium uppercase tracking-wider">
                        Daily Rate
                      </p>
                      <p className="text-lg font-bold text-cyan-200">
                        {detailDailyRate ? `${detailDailyRate.toFixed(2)}%` : '—'}
                      </p>
                    </div>
                    <div className="p-3 cyber-glass border border-neon-green/30 rounded-xl">
                      <p className="text-[11px] text-neon-green font-medium uppercase tracking-wider">
                        Direct Refs
                      </p>
                      <p className="text-lg font-bold text-neon-green">
                        {Number.isFinite(Number(detailDirectRefs))
                          ? Number(detailDirectRefs)
                          : detailDirectRefs ?? '—'}
                      </p>
                    </div>
                    <div className="p-3 cyber-glass border border-neon-orange/30 rounded-xl">
                      <p className="text-[11px] text-neon-orange font-medium uppercase tracking-wider">
                        Slab Tier
                      </p>
                      <p className="text-lg font-bold text-neon-orange">
                        {detailSlabName}
                      </p>
                      <p className="text-[11px] text-neon-orange/70 mt-0.5">
                        Level {detailSlabIndex || '—'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="cyber-glass rounded-2xl p-6 border border-cyan-500/30 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
            <div className="flex items-center gap-3 mb-6">
              <History size={20} className="text-cyan-400" />
              <h2 className="text-lg font-semibold text-cyan-300 uppercase tracking-wide">Transaction History</h2>
            </div>

            <p className="text-xs text-cyan-300/80 mb-4">
              On-chain ledger pulled directly from the SafeWallet contract. Credits and debits reflect the latest contract state.
            </p>

            {historyError && (
              <div className="mb-4 p-3 border border-red-400/40 bg-red-500/10 text-red-200 rounded-lg text-xs">
                {historyError}
              </div>
            )}

            {historyLoading ? (
              <div className="flex items-center gap-2 text-sm text-cyan-200">
                <Loader2 className="animate-spin" size={16} />
                <span>Syncing Safe Wallet transactions…</span>
              </div>
            ) : historyRows.length === 0 ? (
              <div className="text-sm text-cyan-300/70">
                No Safe Wallet transactions found. Create a portfolio or receive earnings to populate this ledger.
              </div>
            ) : (
            <div className="overflow-x-auto hide-scrollbar">
              <div className="min-w-[960px]">
                <div className="grid grid-cols-[minmax(240px,2fr)_minmax(140px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(150px,1fr)_minmax(180px,1fr)] gap-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-cyan-300/60">
                  <span>Activity</span>
                  <span>Gross</span>
                  <span>Fee (5%)</span>
                  <span>Net</span>
                  <span>Fund Source</span>
                  <span className="text-right">Timestamp</span>
                </div>

                <div className="max-h-[420px] overflow-y-auto hide-scrollbar divide-y divide-cyan-500/10">
                  {paginatedHistory.map((tx) => {
                    const typeLabel =
                      tx.type === 'income'
                        ? 'Income'
                        : tx.type === 'withdrawal'
                        ? 'Withdrawal'
                        : 'Portfolio';
                    const iconClass =
                      tx.direction === 'credit'
                        ? 'text-neon-green border-neon-green/40 bg-neon-green/10'
                        : 'text-neon-orange border-neon-orange/40 bg-neon-orange/10';
                    return (
                      <div
                        key={tx.id}
                        className="grid grid-cols-[minmax(240px,2fr)_minmax(140px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(150px,1fr)_minmax(180px,1fr)] gap-4 py-4"
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-0.5 inline-flex items-center justify-center w-9 h-9 rounded-xl border ${iconClass}`}
                          >
                            {tx.direction === 'credit' ? (
                              <ArrowUpRight size={16} />
                            ) : (
                              <ArrowDownRight size={16} />
                            )}
                          </span>
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${typeBadgeClass(
                                  tx.type
                                )}`}
                              >
                                {typeLabel}
                              </span>
                              <p className="text-sm font-semibold text-cyan-200">{tx.activity}</p>
                            </div>
                            <p className="text-xs text-cyan-300/70">{tx.details}</p>
                          </div>
                        </div>

                        <div className="text-sm font-semibold text-cyan-200">
                          {formatSignedUsd(tx.grossUsd, tx.direction)}
                        </div>

                        <div className="text-sm font-semibold text-cyan-200">
                          {tx.feeUsd ? formatUSD(tx.feeUsd) : '—'}
                        </div>

                        <div
                          className={`text-sm font-semibold ${
                            tx.direction === 'credit' ? 'text-neon-green' : 'text-neon-orange'
                          }`}
                        >
                          {formatSignedUsd(tx.netUsd, tx.direction)}
                        </div>

                        <div>
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-semibold ${sourceBadgeClass(
                              tx.fundSource
                            )}`}
                          >
                            {tx.fundSource}
                         </span>
                       </div>

                       <div className="text-xs text-cyan-300/70 text-right space-y-1">
                          <p>{tx.date ?? '—'}</p>
                          <p className="font-mono text-[11px] tracking-tight text-cyan-500/80">{tx.id}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            )}

            <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-cyan-300/80">
              <span>
                Showing {recordRangeStart}-{recordRangeEnd} of {totalRecords} records
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-cyan-500/30 transition-all ${
                    currentPage === 1
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:border-cyan-500/60 hover:text-cyan-200'
                  }`}
                >
                  <ChevronLeft size={14} />
                  <span>Prev</span>
                </button>
                <span className="px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 font-semibold">
                  Page {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-cyan-500/30 transition-all ${
                    currentPage === totalPages
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:border-cyan-500/60 hover:text-cyan-200'
                  }`}
                >
                  <span>Next</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="cyber-glass rounded-2xl p-6 border border-cyan-500/30 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
            <h3 className="font-semibold text-cyan-300 mb-4 uppercase tracking-wide">Income Sources</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 cyber-glass border border-cyan-500/30 rounded-lg">
                <span className="text-sm font-medium text-cyan-300">Slab Income</span>
                <span className="text-sm font-bold text-cyan-300">125.5 RAMA</span>
              </div>
              <div className="flex items-center justify-between p-3 cyber-glass border border-neon-green/30 rounded-lg">
                <span className="text-sm font-medium text-neon-green">Growth Claims</span>
                <span className="text-sm font-bold text-neon-green">200 RAMA</span>
              </div>
              <div className="flex items-center justify-between p-3 cyber-glass border border-neon-orange/30 rounded-lg">
                <span className="text-sm font-medium text-neon-orange">Royalties</span>
                <span className="text-sm font-bold text-neon-orange">80 RAMA</span>
              </div>
              <div className="flex items-center justify-between p-3 cyber-glass border border-neon-purple/30 rounded-lg">
                <span className="text-sm font-medium text-neon-purple">Rewards</span>
                <span className="text-sm font-bold text-neon-purple">500 RAMA</span>
              </div>
            </div>
          </div>

          <div className="cyber-glass border border-cyan-500/30 rounded-xl p-4">
            <p className="text-sm font-medium text-cyan-300 mb-2 uppercase tracking-wide">Smart Strategy</p>
            <p className="text-xs text-cyan-300/90">
              Use Safe Wallet funds to restake and compound your earnings without paying withdrawal fees or commissions.
            </p>
          </div>
        </div>
      </div>

      <div className="cyber-glass rounded-2xl p-6 border border-cyan-500/30 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        <h2 className="text-lg font-semibold text-cyan-300 mb-4 uppercase tracking-wide">How Safe Wallet Works</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-5 cyber-glass border border-cyan-500/30 rounded-xl hover:border-cyan-500/50 transition-all group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-neon-green rounded-lg flex items-center justify-center mb-3 relative z-10">
              <span className="text-dark-950 font-bold">1</span>
            </div>
            <h4 className="font-semibold text-cyan-300 mb-2 relative z-10">Passive Income Hub</h4>
            <p className="text-sm text-cyan-300/90 relative z-10">
              All passive income (slab, royalty, override) automatically flows to your Safe Wallet
            </p>
          </div>

          <div className="p-5 cyber-glass border border-neon-green/30 rounded-xl hover:border-neon-green/50 transition-all group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-neon-green/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-10 h-10 bg-gradient-to-br from-neon-green to-cyan-500 rounded-lg flex items-center justify-center mb-3 relative z-10">
              <span className="text-dark-950 font-bold">2</span>
            </div>
            <h4 className="font-semibold text-neon-green mb-2 relative z-10">Fee-Free Claims</h4>
            <p className="text-sm text-cyan-300/90 relative z-10">
              Claim your growth earnings directly to Safe Wallet without paying 5% withdrawal fees
            </p>
          </div>

          <div className="p-5 cyber-glass border border-neon-orange/30 rounded-xl hover:border-neon-orange/50 transition-all group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-neon-orange/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-10 h-10 bg-gradient-to-br from-neon-orange to-neon-pink rounded-lg flex items-center justify-center mb-3 relative z-10">
              <span className="text-dark-950 font-bold">3</span>
            </div>
            <h4 className="font-semibold text-neon-orange mb-2 relative z-10">No-Commission Staking</h4>
            <p className="text-sm text-cyan-300/90 relative z-10">
              Stake from Safe Wallet without paying 5% commission to upline for maximum compounding
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
