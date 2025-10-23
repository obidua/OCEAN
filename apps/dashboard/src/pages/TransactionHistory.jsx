import { useCallback, useEffect, useMemo, useState } from 'react';
import { History, Filter, Download, Search, TrendingUp, Award, Trophy, Gift, Layers, Wallet, ArrowUpRight, ArrowDownRight, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { formatUSD, formatRAMA } from '../utils/contractData';
import AddressWithCopy from '../components/AddressWithCopy';
import CopyButton from '../components/CopyButton';
import { useStore } from '../../store/useUserInfoStore';

const TRANSACTION_TYPES = {
  ROI: 'ROI',
  GROWTH: 'Portfolio Growth',
  ROYALTY: 'Royalty Income',
  SLAB: 'Slab Income',
  REWARD: 'One-Time Reward',
  DIRECT: 'Direct Income',
  MANUAL: 'Manual Credit',

  STAKE_SPEND: 'Stake Spend',
  PORTFOLIO_CREATED: 'Portfolio Created',
  PORTFOLIO_TOPUP: 'Portfolio Topup',
  WITHDRAW: 'external Withdraw',
};

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

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const normalizeUsdDisplay = (value) => {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount === 0) return 0;
  if (Math.abs(amount) >= 1e6) return amount / 1e6;
  return amount;
};

const CREDIT_KIND_TO_TYPE = {
  [SAFEWALLET_KINDS.ROI]: TRANSACTION_TYPES.ROI,
  [SAFEWALLET_KINDS.GROWTH]: TRANSACTION_TYPES.GROWTH,
  [SAFEWALLET_KINDS.ROYALTY]: TRANSACTION_TYPES.ROYALTY,
  [SAFEWALLET_KINDS.SLAB]: TRANSACTION_TYPES.SLAB,
  [SAFEWALLET_KINDS.REWARD]: TRANSACTION_TYPES.REWARD,
  [SAFEWALLET_KINDS.DIRECT]: TRANSACTION_TYPES.DIRECT,
  [SAFEWALLET_KINDS.MANUAL]: TRANSACTION_TYPES.MANUAL,
};

const DEBIT_KIND_TO_TYPE = {
  [SAFEWALLET_KINDS.STAKE_SPEND]: TRANSACTION_TYPES.STAKE_SPEND,
  [SAFEWALLET_KINDS.PORTFOLIO_CREATE]: TRANSACTION_TYPES.PORTFOLIO_CREATED,
  [SAFEWALLET_KINDS.PORTFOLIO_TOPUP]: TRANSACTION_TYPES.PORTFOLIO_TOPUP,
  [SAFEWALLET_KINDS.WITHDRAW]: TRANSACTION_TYPES.WITHDRAW,
};


const getTransactionIcon = (type) => {
  const iconMap = {
    [TRANSACTION_TYPES.PORTFOLIO_GROWTH]: TrendingUp,
    [TRANSACTION_TYPES.SLAB_INCOME]: Award,
    [TRANSACTION_TYPES.ROYALTY_INCOME]: Trophy,
    [TRANSACTION_TYPES.SAME_SLAB_OVERRIDE]: Layers,
    [TRANSACTION_TYPES.ONE_TIME_REWARD]: Gift,
    [TRANSACTION_TYPES.SPOT_INCOME]: Award,
    [TRANSACTION_TYPES.PORTFOLIO_CREATED]: Wallet,
    [TRANSACTION_TYPES.CLAIM_TO_WALLET]: ArrowUpRight,
    [TRANSACTION_TYPES.CLAIM_TO_SAFE]: ArrowDownRight,
    [TRANSACTION_TYPES.TRANSFER_TO_SAFE]: ArrowDownRight,
  };
  return iconMap[type] || History;
};

const getTransactionColor = (type) => {
  const colorMap = {
    [TRANSACTION_TYPES.PORTFOLIO_GROWTH]: 'neon-green',
    [TRANSACTION_TYPES.SLAB_INCOME]: 'neon-purple',
    [TRANSACTION_TYPES.ROYALTY_INCOME]: 'neon-orange',
    [TRANSACTION_TYPES.SAME_SLAB_OVERRIDE]: 'cyan-400',
    [TRANSACTION_TYPES.ONE_TIME_REWARD]: 'blue-400',
    [TRANSACTION_TYPES.SPOT_INCOME]: 'cyan-400',
    [TRANSACTION_TYPES.PORTFOLIO_CREATED]: 'cyan-500',
    [TRANSACTION_TYPES.CLAIM_TO_WALLET]: 'neon-pink',
    [TRANSACTION_TYPES.CLAIM_TO_SAFE]: 'neon-green',
    [TRANSACTION_TYPES.TRANSFER_TO_SAFE]: 'cyan-400',
  };
  return colorMap[type] || 'cyan-400';
};




const transformLedgerEntry = (entry) => {
  const type = entry.isCredit
    ? CREDIT_KIND_TO_TYPE[Number(entry.kind)] || TRANSACTION_TYPES.MANUAL
    : DEBIT_KIND_TO_TYPE[Number(entry.kind)] || TRANSACTION_TYPES.WITHDRAW;

  return {
    id: entry.memoReadable || entry.memo || `${entry.kind}-${entry.timestamp}`,
    type,
    isCredit: entry.isCredit,
    amount_usd: parseFloat(entry.usdAmount) / 1e8, // assuming cents → dollars
    amount_rama: parseFloat(entry.ramaAmount) / 1e18, // adjust if 18 decimals
    timestamp: new Date(Number(entry.timestamp) * 1000)
      .toISOString()
      .replace("T", " ")
      .slice(0, 19),
    rawTimestamp: Number(entry.timestamp),
    related: entry.related,
    pid: Number(entry.pid),
  };
};


export default function TransactionHistory() {
  const [selectedType, setSelectedType] = useState(TRANSACTION_TYPES.ROI

  );
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTx, setExpandedTx] = useState(null);

  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(20); // you can change to 20 
  const [totalPages, setTotalPages] = useState(1);




  const getIncomeTransaction = useStore((s) => s.getIncomeTransaction);
  const userAddress = localStorage.getItem('userAddress') || null;

  const fetchTransactions = useCallback(
    async (page = 0) => {
      if (!userAddress || !getIncomeTransaction) return;

      try {
        setLoading(true);
        setError(null);

        let kind = 0;
        const lookup = Object.entries(TRANSACTION_TYPES).find(
          ([key, label]) => label === selectedType
        );
        if (lookup) kind = SAFEWALLET_KINDS[lookup[0]];

        const offset = page * pageSize;
        console.log("Fetching:", { userAddress, kind, pageSize, offset });

        // FIX: positional params instead of object
        const result = await getIncomeTransaction(userAddress, kind, pageSize, offset);
        console.log("Result:", result);

        const slices = result[0] || result.slice || [];
        const total = Number(result[1] || result.total || 0);
        setTotalPages(Math.ceil(total / pageSize));

        const transformed = slices.map(transformLedgerEntry);
        setTransactions(transformed);
      } catch (err) {
        console.error("Transaction load error:", err);
        setError(err?.message || "Failed to load transactions.");
      } finally {
        setLoading(false);
      }
    },
    [userAddress, selectedType, getIncomeTransaction, pageSize]
  );


  useEffect(() => {
    const addr =
      typeof window !== "undefined"
        ? localStorage.getItem("userAddress")
        : null;

    if (!addr || !getIncomeTransaction) return;

    // Reset page if type changes
    setTransactions([]); // clear existing before load
    setCurrentPage((p) => (p === 0 ? 0 : 0)); // ensures reset only when changed
    fetchTransactions(0, false);
  }, [selectedType]);

  useEffect(() => {
    if (!userAddress) return;
    fetchTransactions(currentPage);
  }, [userAddress, currentPage, selectedType]);



  const baseTransactions = transactions;

  const totalsByKind = summary?.totalsByKind ?? null;

  const incomeStreamTotals = useMemo(() => {
    if (totalsByKind) {
      const portfolioGrowthRaw =
        (totalsByKind.roi?.usd ?? 0) + (totalsByKind.growth?.usd ?? 0);
      return {
        portfolioGrowth: normalizeUsdDisplay(portfolioGrowthRaw),
        slabIncome: normalizeUsdDisplay(totalsByKind.slab?.usd ?? 0),
        royaltyIncome: normalizeUsdDisplay(totalsByKind.royalty?.usd ?? 0),
        sameSlabOverride: normalizeUsdDisplay(totalsByKind.override?.usd ?? 0),
        oneTimeReward: normalizeUsdDisplay(totalsByKind.reward?.usd ?? 0),
        spotIncome: normalizeUsdDisplay(totalsByKind.direct?.usd ?? 0),
      };
    }

    return {
      portfolioGrowth: normalizeUsdDisplay(
        baseTransactions
          .filter((tx) => tx.type === TRANSACTION_TYPES.PORTFOLIO_GROWTH)
          .reduce((sum, tx) => sum + tx.amount_usd, 0)
      ),
      slabIncome: normalizeUsdDisplay(
        baseTransactions
          .filter((tx) => tx.type === TRANSACTION_TYPES.SLAB_INCOME)
          .reduce((sum, tx) => sum + tx.amount_usd, 0)
      ),
      royaltyIncome: normalizeUsdDisplay(
        baseTransactions
          .filter((tx) => tx.type === TRANSACTION_TYPES.ROYALTY_INCOME)
          .reduce((sum, tx) => sum + tx.amount_usd, 0)
      ),
      sameSlabOverride: normalizeUsdDisplay(
        baseTransactions
          .filter((tx) => tx.type === TRANSACTION_TYPES.SAME_SLAB_OVERRIDE)
          .reduce((sum, tx) => sum + tx.amount_usd, 0)
      ),
      oneTimeReward: normalizeUsdDisplay(
        baseTransactions
          .filter((tx) => tx.type === TRANSACTION_TYPES.ONE_TIME_REWARD)
          .reduce((sum, tx) => sum + tx.amount_usd, 0)
      ),
      spotIncome: normalizeUsdDisplay(
        baseTransactions
          .filter((tx) => tx.type === TRANSACTION_TYPES.SPOT_INCOME)
          .reduce((sum, tx) => sum + tx.amount_usd, 0)
      ),
    };
  }, [totalsByKind, baseTransactions]);

  const totalEarnings = useMemo(() => {
    if (totalsByKind) {
      const sum =
        (totalsByKind.roi?.usd ?? 0) +
        (totalsByKind.growth?.usd ?? 0) +
        (totalsByKind.slab?.usd ?? 0) +
        (totalsByKind.royalty?.usd ?? 0) +
        (totalsByKind.reward?.usd ?? 0) +
        (totalsByKind.direct?.usd ?? 0);
      return normalizeUsdDisplay(sum);
    }
    return normalizeUsdDisplay(
      baseTransactions
        .filter((tx) => tx.isCredit !== false)
        .reduce((sum, tx) => sum + tx.amount_usd, 0)
    );
  }, [totalsByKind, baseTransactions]);

  const totalTransactions = summary?.totalCount ?? baseTransactions.length;
  const completedTransactions = baseTransactions.length;

  const portfolioCreations = baseTransactions.filter(
    (tx) => tx.type === TRANSACTION_TYPES.PORTFOLIO_CREATED
  );
  const safeWalletCreations = portfolioCreations.filter(
    (tx) => tx.destination?.toLowerCase().includes('portfolio') || tx.destination === 'Safe Wallet'
  );
  const externalWalletCreations = portfolioCreations.filter((tx) =>
    tx.destination?.toLowerCase().includes('external')
  );

  const latestActivity = baseTransactions[0] ?? null;

  const filteredTransactions = baseTransactions.filter((tx) => {
    const matchesType = selectedType === 'all' || tx.type === selectedType;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      (tx.txHash ?? '').toLowerCase().includes(query) ||
      (tx.source ?? '').toLowerCase().includes(query) ||
      (tx.destination ?? '').toLowerCase().includes(query);
    return matchesType && matchesSearch;
  });

  const handleExportHistory = useCallback(() => {
    if (
      !filteredTransactions.length ||
      typeof window === 'undefined' ||
      typeof document === 'undefined'
    ) {
      return;
    }

    const now = new Date();
    const headerLines = [
      'Income & Transaction History Export',
      `Generated: ${now.toISOString()}`,
      `Entries: ${filteredTransactions.length}`,
      '',
    ];

    const rows = filteredTransactions.map((tx, index) => {
      const timestampIso = tx.rawTimestamp
        ? new Date(tx.rawTimestamp * 1000).toISOString()
        : tx.timestamp ?? '—';
      const usdValue = formatUSD(tx?.amount_usd ?? 0);
      const ramaValue = `${formatRAMA(tx?.amount_rama ?? 0)} RAMA`;
      const direction = tx.isCredit === false ? 'Debit' : 'Credit';
      const typeLabel = tx.type ?? '—';
      const statusLabel = tx.status ?? '—';
      const sourceLabel = tx.source ?? tx.sourceAddress ?? '—';
      const destinationLabel = tx.destination ?? tx.destinationAddress ?? '—';
      const hash = tx.txHash ?? '—';

      return `${index + 1}. ${timestampIso} | ${direction} ${typeLabel} | USD: ${usdValue} | RAMA: ${ramaValue} | From: ${sourceLabel} | To: ${destinationLabel} | Status: ${statusLabel} | Tx: ${hash}`;
    });

    const content = [...headerLines, ...rows].join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transaction-history-${now.toISOString().replace(/[:.]/g, '-')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, [filteredTransactions]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green relative inline-block">
          Income/Trx History
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-neon-green/20 blur-xl -z-10" />
        </h1>
        <p className="text-sm sm:text-base text-cyan-300/90 mt-1">Complete record of all your income streams and transactions</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="cyber-glass rounded-xl p-4 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden group transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-cyan-500/20 rounded-lg flex-shrink-0 border border-cyan-500/30">
              <History size={20} className="text-cyan-400" />
            </div>
            <p className="text-xs text-cyan-400 uppercase tracking-wide">Total Transactions</p>
          </div>
          <p className="text-2xl font-bold text-cyan-300">{totalTransactions}</p>
          <p className="text-xs text-neon-green mt-1">{completedTransactions} completed</p>
        </div>

        <div className="cyber-glass rounded-xl p-4 border border-neon-green/30 hover:border-neon-green/80 relative overflow-hidden group transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon-green/50 to-transparent" />
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-neon-green/20 rounded-lg flex-shrink-0 border border-neon-green/30">
              <TrendingUp size={20} className="text-neon-green" />
            </div>
            <p className="text-xs text-neon-green uppercase tracking-wide">Total Volume</p>
          </div>
          <p className="text-2xl font-bold text-neon-green">{formatUSD(totalEarnings)}</p>
          <p className="text-xs text-cyan-300/90 mt-1">All time earnings</p>
        </div>

        <div className="cyber-glass rounded-xl p-4 border border-neon-orange/30 hover:border-neon-orange/80 relative overflow-hidden group transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon-orange/50 to-transparent" />
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-neon-orange/20 rounded-lg flex-shrink-0 border border-neon-orange/30">
              <Wallet size={20} className="text-neon-orange" />
            </div>
            <p className="text-xs text-neon-orange uppercase tracking-wide">Portfolios Created</p>
          </div>
          <p className="text-2xl font-bold text-neon-orange">{portfolioCreations.length}</p>
          <p className="text-xs text-cyan-300/90 mt-1">{safeWalletCreations.length} from Safe Wallet</p>
        </div>

        <div className="cyber-glass rounded-xl p-4 border border-cyan-400/30 hover:border-cyan-400/80 relative overflow-hidden group transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-cyan-400/20 rounded-lg flex-shrink-0 border border-cyan-400/30">
              <Clock size={20} className="text-cyan-400" />
            </div>
            <p className="text-xs text-cyan-400 uppercase tracking-wide">Latest Activity</p>
          </div>
          <p className="text-sm font-bold text-cyan-300">
            {latestActivity ? latestActivity.timestamp.split(' ')[0] : '—'}
          </p>
          <p className="text-xs text-cyan-300/90 mt-1">
            {latestActivity ? latestActivity.type : 'No activity'}
          </p>
        </div>
      </div>

      <div className="cyber-glass rounded-2xl p-4 sm:p-6 border border-cyan-500/30 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        <h2 className="text-base sm:text-lg font-semibold text-cyan-300 mb-4 uppercase tracking-wide">Income Stream Breakdown</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 cyber-glass border border-neon-green/30 rounded-lg">
            <p className="text-xs text-neon-green/90 mb-1">Portfolio Growth</p>
            <p className="text-lg font-bold text-neon-green">{formatUSD(incomeStreamTotals.portfolioGrowth ?? 0)}</p>
          </div>
          <div className="p-3 cyber-glass border border-neon-purple/30 rounded-lg">
            <p className="text-xs text-neon-purple/90 mb-1">Slab Income</p>
            <p className="text-lg font-bold text-neon-purple">{formatUSD(incomeStreamTotals.slabIncome ?? 0)}</p>
          </div>
          <div className="p-3 cyber-glass border border-neon-orange/30 rounded-lg">
            <p className="text-xs text-neon-orange/90 mb-1">Royalty Income</p>
            <p className="text-lg font-bold text-neon-orange">{formatUSD(incomeStreamTotals.royaltyIncome ?? 0)}</p>
          </div>
          <div className="p-3 cyber-glass border border-cyan-400/30 rounded-lg">
            <p className="text-xs text-cyan-400/90 mb-1">Same-Slab Override</p>
            <p className="text-lg font-bold text-cyan-400">{formatUSD(incomeStreamTotals.sameSlabOverride ?? 0)}</p>
          </div>
          <div className="p-3 cyber-glass border border-blue-400/30 rounded-lg">
            <p className="text-xs text-blue-400/90 mb-1">One-Time Rewards</p>
            <p className="text-lg font-bold text-blue-400">{formatUSD(incomeStreamTotals.oneTimeReward ?? 0)}</p>
          </div>
          <div className="p-3 cyber-glass border border-emerald-400/30 rounded-lg">
            <p className="text-xs text-emerald-400/90 mb-1">Spot Income</p>
            <p className="text-lg font-bold text-emerald-400">{formatUSD(incomeStreamTotals.spotIncome ?? 0)}</p>
          </div>
        </div>
      </div>

      <div className="cyber-glass rounded-2xl p-4 sm:p-6 border border-cyan-500/30 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-xs text-cyan-400 mb-2 uppercase tracking-wide">Filter by Type</label>
            <div className="relative">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full bg-dark-900 border border-cyan-500/30 rounded-lg px-4 py-2.5 text-cyan-300 text-sm"
              >
                {Object.values(TRANSACTION_TYPES).map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
              <Filter className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-400 pointer-events-none" size={16} />
            </div>
          </div>

          <div className="flex-1">
            <label className="block text-xs text-cyan-400 mb-2 uppercase tracking-wide">Search</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by hash or address..."
                className="w-full bg-dark-900 border border-cyan-500/30 rounded-lg px-4 py-2.5 text-cyan-300 text-sm placeholder-cyan-400/50 hover:border-cyan-500/50 focus:border-cyan-500 focus:outline-none transition-colors"
              />
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-400 pointer-events-none" size={16} />
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleExportHistory}
              disabled={!filteredTransactions.length}
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-neon-green text-dark-950 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export filtered history to .txt"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Export TXT</span>
            </button>
          </div>
        </div>


        <div className="pr-1 hide-scrollbar">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-cyan-500/30">
                  <th className="text-left py-3 px-4 text-xs text-cyan-400 uppercase tracking-wide">Sr. No.</th>
                  <th className="text-left py-3 px-4 text-xs text-cyan-400 uppercase tracking-wide">Type</th>
                  <th className="text-left py-3 px-4 text-xs text-cyan-400 uppercase tracking-wide">Amount (USD)</th>
                  <th className="text-left py-3 px-4 text-xs text-cyan-400 uppercase tracking-wide">Amount (RAMA)</th>
                  <th className="text-left py-3 px-4 text-xs text-cyan-400 uppercase tracking-wide">Date</th>
                  <th className="text-left py-3 px-4 text-xs text-cyan-400 uppercase tracking-wide">From</th>
                  <th className="text-left py-3 px-4 text-xs text-cyan-400 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx, index) => {
                  const Icon = getTransactionIcon(tx.type);
                  const color = getTransactionColor(tx.type);
                  const isExpanded = expandedTx === tx.id;
                  const sourceContent = tx.sourceAddress ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="text-cyan-300/70">{tx.isCredit ? 'From' : 'To'}</span>
                      <AddressWithCopy
                        address={tx.sourceAddress}
                        copyLabel=""
                        textClassName="font-mono text-cyan-300 text-xs truncate max-w-[180px]"
                      />
                    </span>
                  ) : (
                    <span>{tx.source}</span>
                  );

                  return (
                    <>
                      <tr
                        key={tx.id}
                        className="border-b border-cyan-500/10 hover:bg-cyan-500/5 transition-colors cursor-pointer"
                        onClick={() => setExpandedTx(isExpanded ? null : tx.id)}
                      >
                        <td className="py-3 px-4 text-sm text-cyan-300">{index + 1}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 bg-${color}/20 rounded border border-${color}/30`}>
                              <Icon size={14} className={`text-${color}`} />
                            </div>
                            <span className="text-sm text-cyan-300 font-medium">{tx.type}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-neon-green font-semibold">{formatUSD(tx.amount_usd ?? 0)}</td>
                        <td className="py-3 px-4 text-sm text-cyan-300">{tx.amount_rama.toFixed(5)}</td>
                        <td className="py-3 px-4 text-sm text-cyan-300">{tx.timestamp}</td>
                        <td className="py-3 px-4 text-sm text-cyan-300/90 font-mono">
                          {sourceContent}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${tx.isCredit ? 'bg-neon-green/20 text-neon-green border border-neon-green/30' : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                            }`}>
                            {tx.isCredit ? <CheckCircle size={12} /> : <Clock size={12} />}
                            {tx.isCredit ? 'Claimed' : 'Pending'}
                          </span>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td colSpan="7" className="p-0">
                            <div className="border-t border-cyan-500/20 p-4 bg-dark-900/30">
                              <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                  <p className="text-xs text-cyan-400 mb-2 uppercase tracking-wide">Transaction Details</p>
                                  <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                      <span className="text-cyan-300/70">Destination:</span>
                                      {tx.destinationAddress ? (
                                        <AddressWithCopy
                                          address={tx.destinationAddress}
                                          copyLabel=""
                                          textClassName="font-mono text-cyan-300 text-xs truncate max-w-[180px]"
                                        />
                                      ) : (
                                        <span className="text-cyan-300 font-medium">
                                          {tx.destination}
                                        </span>
                                      )}
                                    </div>
                                    {tx.fee > 0 && (
                                      <>
                                        <div className="flex justify-between text-sm">
                                          <span className="text-cyan-300/70">Fee ({tx.fee}%):</span>
                                          <span className="text-neon-orange font-medium">{tx.feeAmount?.toFixed(2)} RAMA</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                          <span className="text-cyan-300/70">Net Amount:</span>
                                          <span className="text-neon-green font-medium">{tx.netAmount?.toFixed(2)} RAMA</span>
                                        </div>
                                      </>
                                    )}
                                    <div className="flex justify-between text-sm">
                                      <span className="text-cyan-300/70">Status:</span>
                                      <span className="text-neon-green font-medium capitalize">{tx.isCredit}</span>
                                    </div>
                                  </div>
                                </div>

                                {tx.txHash && (
                                  <div>
                                    <p className="text-xs text-cyan-400 mb-2 uppercase tracking-wide">Transaction Hash</p>
                                    <div className="p-3 cyber-glass border border-cyan-500/20 rounded-lg">
                                      <div className="flex items-center justify-between gap-3">
                                        <p className="text-xs font-mono text-cyan-300 break-all">{tx.txHash}</p>
                                        <CopyButton text={tx.txHash} label="" className="px-1 py-0.5" ariaLabel="Copy transaction hash" />
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {tx.incomeDetails && (
                                  <div className="md:col-span-2">
                                    <p className="text-xs text-cyan-400 mb-2 uppercase tracking-wide">Income Details</p>
                                    <div className="p-3 cyber-glass border border-neon-purple/20 rounded-lg">
                                      <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div>
                                          <span className="text-cyan-300/70">Slab Level:</span>
                                          <span className="text-neon-purple font-medium ml-2">{tx.incomeDetails.slabLevel}</span>
                                        </div>
                                        <div>
                                          <span className="text-cyan-300/70">Percentage:</span>
                                          <span className="text-neon-purple font-medium ml-2">{tx.incomeDetails.percentage}%</span>
                                        </div>
                                        <div>
                                          <span className="text-cyan-300/70">From:</span>
                                          <span className="text-cyan-300 font-medium ml-2 font-mono text-xs">{tx.incomeDetails.teamMember}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {tx.portfolioDetails && (
                                  <div className="md:col-span-2">
                                    <p className="text-xs text-cyan-400 mb-2 uppercase tracking-wide">Portfolio Details</p>
                                    <div className="p-3 cyber-glass border border-cyan-500/20 rounded-lg">
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div>
                                          <span className="text-cyan-300/70">Type:</span>
                                          <span className={`ml-2 font-medium ${tx.portfolioDetails.isBooster ? 'text-neon-orange' : 'text-cyan-300'}`}>
                                            {tx.portfolioDetails.isBooster ? 'Booster' : 'Regular'}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-cyan-300/70">Source:</span>
                                          <span className="text-cyan-300 font-medium ml-2">{tx.portfolioDetails.walletType}</span>
                                        </div>
                                        <div>
                                          <span className="text-cyan-300/70">Commission:</span>
                                          <span className={`font-medium ml-2 ${tx.portfolioDetails.commission === 0 ? 'text-neon-green' : 'text-neon-orange'}`}>
                                            {tx.portfolioDetails.commission}%
                                          </span>
                                        </div>
                                        {tx.portfolioDetails.upline && (
                                          <div>
                                            <span className="text-cyan-300/70">Upline:</span>
                                            <span className="text-cyan-300 font-medium ml-2 font-mono text-xs">{tx.portfolioDetails.upline}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {tx.royaltyDetails && (
                                  <div className="md:col-span-2">
                                    <p className="text-xs text-cyan-400 mb-2 uppercase tracking-wide">Royalty Details</p>
                                    <div className="p-3 cyber-glass border border-neon-orange/20 rounded-lg">
                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                          <span className="text-cyan-300/70">Royalty Level:</span>
                                          <span className="text-neon-orange font-medium ml-2">{tx.royaltyDetails.level}</span>
                                        </div>
                                        <div>
                                          <span className="text-cyan-300/70">Monthly Payout:</span>
                                          <span className="text-neon-orange font-medium ml-2">${tx.royaltyDetails.monthlyPayout.toLocaleString()}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {tx.overrideDetails && (
                                  <div className="md:col-span-2">
                                    <p className="text-xs text-cyan-400 mb-2 uppercase tracking-wide">Override Details</p>
                                    <div className="p-3 cyber-glass border border-cyan-400/20 rounded-lg">
                                      <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div>
                                          <span className="text-cyan-300/70">Wave:</span>
                                          <span className="text-cyan-400 font-medium ml-2">{tx.overrideDetails.wave}</span>
                                        </div>
                                        <div>
                                          <span className="text-cyan-300/70">Percentage:</span>
                                          <span className="text-cyan-400 font-medium ml-2">{tx.overrideDetails.percentage}%</span>
                                        </div>
                                        <div>
                                          <span className="text-cyan-300/70">From:</span>
                                          <span className="text-cyan-300 font-medium ml-2 font-mono text-xs">{tx.overrideDetails.sourceMember}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {tx.rewardDetails && (
                                  <div className="md:col-span-2">
                                    <p className="text-xs text-cyan-400 mb-2 uppercase tracking-wide">Reward Details</p>
                                    <div className="p-3 cyber-glass border border-blue-400/20 rounded-lg">
                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                          <span className="text-cyan-300/70">Milestone:</span>
                                          <span className="text-blue-400 font-medium ml-2">#{tx.rewardDetails.milestone}</span>
                                        </div>
                                        <div>
                                          <span className="text-cyan-300/70">Reward Name:</span>
                                          <span className="text-blue-400 font-medium ml-2">{tx.rewardDetails.rewardName}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {tx.spotIncomeDetails && (
                                  <div className="md:col-span-2">
                                    <p className="text-xs text-cyan-400 mb-2 uppercase tracking-wide">Spot Income Details</p>
                                    <div className="p-3 cyber-glass border border-cyan-400/20 rounded-lg">
                                      <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div>
                                          <span className="text-cyan-300/70">Referral Level:</span>
                                          <span className="text-cyan-400 font-medium ml-2">{tx.spotIncomeDetails.referralLevel}</span>
                                        </div>
                                        <div>
                                          <span className="text-cyan-300/70">Percentage:</span>
                                          <span className="text-cyan-400 font-medium ml-2">{tx.spotIncomeDetails.percentage}%</span>
                                        </div>
                                        <div>
                                          <span className="text-cyan-300/70">From User:</span>
                                          <span className="text-cyan-300 font-medium ml-2 font-mono text-xs">{tx.spotIncomeDetails.fromUser}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-4">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 0))}
                  disabled={currentPage === 0 || loading}
                  className="px-3 py-1.5 text-sm rounded-md bg-dark-800 border border-cyan-500/30 text-cyan-300 hover:border-cyan-400 disabled:opacity-40"
                >
                  Prev
                </button>

                <span className="text-cyan-400 text-sm">
                  Page {currentPage + 1} of {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage((p) => (p + 1 < totalPages ? p + 1 : p))}
                  disabled={currentPage + 1 >= totalPages || loading}
                  className="px-3 py-1.5 text-sm rounded-md bg-dark-800 border border-cyan-500/30 text-cyan-300 hover:border-cyan-400 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}

          </div>
        </div>


        {filteredTransactions.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle size={48} className="text-cyan-400/50 mx-auto mb-4" />
            <p className="text-cyan-300/70 text-lg">No transactions found</p>
            <p className="text-cyan-400/50 text-sm mt-2">Try adjusting your filters or search query</p>
          </div>
        )}
      </div>
    </div>
  );
}