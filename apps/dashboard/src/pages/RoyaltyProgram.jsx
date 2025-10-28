import { useCallback, useEffect, useMemo, useState } from 'react';
import { Trophy, Clock, CheckCircle, AlertCircle, TrendingUp, Award, Lock, History, RefreshCw } from 'lucide-react';
import { useStore } from '../../store/useUserInfoStore';
import { useAccount, useSendTransaction } from 'wagmi';
import {
  ROYALTY_LEVELS,
  formatUSD,
  formatRAMA,
} from '../utils/contractData';
import ProgressiveTransactionModal from '../components/ProgressiveTransactionModal';
import AddressWithCopy from '../components/AddressWithCopy';

const ROYALTY_TIER_NAMES = [
  'Coral Starter',
  'Pearl Diver',
  'Sea Explorer',
  'Wave Rider',
  'Tide Surge',
  'Deep Blue',
  'Ocean Guardian',
  'Marine Commander',
  'Aqua Captain',
  'Current Master',
  'Sea Legend',
  'Trident Icon',
  'Poseidon Crown',
  'Ocean Supreme',
];

const SAFEWALLET_KINDS = {
  ROYALTY: 2,
};

const USD_DIVISOR = 1e8;   // For legacy ledger data  
const USD_MICRO_FACTOR = 1e6; // Same as TransactionHistory for transaction data
const RAMA_DIVISOR = 1e18; // Same as TransactionHistory RAMA_DECIMALS

const toNumberSafe = (value) => {
  if (value == null) return 0;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const transformRoyaltyLedgerEntry = (entry) => {
  if (!entry) {
    return {
      id: Math.random().toString(36).slice(2),
      amountUsd: 0,
      amountRama: 0,
      rawTimestamp: 0,
      memo: '',
      txHash: null,
      isCredit: true,
      source: null,
      status: 'Claimed',
    };
  }

  const usdRaw =
    entry.usdAmount ??
    entry.amountUsd ??
    entry.amount_usd ??
    entry.usd ??
    0;
  const ramaRaw =
    entry.ramaAmount ??
    entry.amountRama ??
    entry.amount_rama ??
    entry.rama ??
    0;
  const timestamp =
    toNumberSafe(entry.timestamp ?? entry.time ?? entry.createdAt ?? 0);
  const memo =
    entry.memoReadable ??
    entry.memo ??
    entry.detail ??
    entry.description ??
    'Royalty Claim';
  const txHash =
    entry.txHash ?? entry.transactionHash ?? entry.hash ?? null;
  const isCreditRaw = entry.isCredit;
  let isCredit = true;
  if (typeof isCreditRaw === 'boolean') {
    isCredit = isCreditRaw;
  } else if (typeof isCreditRaw === 'number') {
    isCredit = isCreditRaw !== 0;
  } else if (typeof isCreditRaw === 'string') {
    const normalized = isCreditRaw.trim().toLowerCase();
    isCredit = !(normalized === 'false' || normalized === '0' || normalized === '');
  }
  const source =
    entry.source ??
    entry.sourceAddress ??
    entry.from ??
    entry.sender ??
    null;
  const status =
    entry.status ??
    (isCredit ? 'Claimed' : 'Debited');

  return {
    id:
      entry.id ??
      entry.memoReadable ??
      `${SAFEWALLET_KINDS.ROYALTY}-${timestamp}-${txHash ?? Math.random()
        .toString(36)
        .slice(2)}`,
    amountUsd: toNumberSafe(usdRaw) / USD_DIVISOR,
    amountRama: toNumberSafe(ramaRaw) / RAMA_DIVISOR,
    rawTimestamp: timestamp,
    memo,
    txHash,
    isCredit,
    source,
    status,
  };
};

const formatLedgerTimestamp = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return '—';
  try {
    return new Date(numeric * 1000).toLocaleString();
  } catch {
    return '—';
  }
};

export default function RoyaltyProgram() {
  const { address: connectedAddress } = useAccount();
  const userAddressStore = useStore((s) => s.userAddress);
  const userAddress =
    connectedAddress || userAddressStore || (typeof window !== 'undefined' ? localStorage.getItem('userAddress') : null);

  const [royaltyDetails, setRoyaltyDetails] = useState(null);
  const [royaltyLedger, setRoyaltyLedger] = useState([]);
  const [royaltyLedgerLoading, setRoyaltyLedgerLoading] = useState(false);
  const [royaltyLedgerError, setRoyaltyLedgerError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showClaimModal, setShowClaimModal] = useState(false);

  // Transaction History style data for actual claimed royalties
  const [royaltyTransactions, setRoyaltyTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState(null);

  const getRoyaltyOverview = useStore((s) => s.getRoyaltyOverview);
  const getIncomeTransaction = useStore((s) => s.getIncomeTransaction);
  const claimRoyaltyReward = useStore((s) => s.claimRoyaltyReward);
  const [claimTransaction, setClaimTransaction] = useState(null);
  const { data: txHash, sendTransaction } = useSendTransaction();

  // Transform transaction entry to match TransactionHistory format
  const transformTransactionEntry = useCallback((entry) => {
    const usdRaw = toNumberSafe(entry.usdAmount) || toNumberSafe(entry.amountUsd) || toNumberSafe(entry.usd);
    const ramaRaw = toNumberSafe(entry.ramaAmount) || toNumberSafe(entry.amountRama) || toNumberSafe(entry.rama);

    return {
      id: entry.memoReadable || entry.memo || `royalty-${entry.timestamp}`,
      type: 'Royalty Income',
      isCredit: entry.isCredit,
      amount_usd: usdRaw / USD_MICRO_FACTOR, // Use 1e6 to match TransactionHistory exactly
      amount_rama: ramaRaw / RAMA_DIVISOR,
      timestamp: new Date(Number(entry.timestamp) * 1000)
        .toISOString()
        .replace("T", " ")
        .slice(0, 19),
      rawTimestamp: Number(entry.timestamp),
      source: 'To Safe Wallet', // Changed from 'Safe Wallet' to 'To Safe Wallet'
      status: entry.isCredit ? 'Claimed' : 'Pending',
      txHash: entry.txHash || null,
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!userAddress) {
        setRoyaltyDetails(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await getRoyaltyOverview(userAddress);
        if (!cancelled) setRoyaltyDetails(res);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError(err?.message || 'Unable to load royalty data.');
          setRoyaltyDetails(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [userAddress, getRoyaltyOverview]);

  const fetchRoyaltyLedger = useCallback(async () => {
    if (!userAddress || typeof getIncomeTransaction !== 'function') {
      setRoyaltyLedger([]);
      setRoyaltyLedgerError(null);
      return;
    }

    setRoyaltyLedgerLoading(true);
    setRoyaltyLedgerError(null);

    try {
      const response = await getIncomeTransaction(
        userAddress,
        SAFEWALLET_KINDS.ROYALTY,
        50,
        0
      );

      let slices = [];
      if (Array.isArray(response)) {
        if (Array.isArray(response[0])) {
          slices = response[0];
        } else if (Array.isArray(response.slice)) {
          slices = response.slice;
        } else {
          slices = response;
        }
      }

      const transformed = (slices ?? [])
        .map(transformRoyaltyLedgerEntry)
        .filter((entry) => entry.amountUsd !== 0 || entry.amountRama !== 0);

      transformed.sort(
        (a, b) => (b.rawTimestamp ?? 0) - (a.rawTimestamp ?? 0)
      );

      setRoyaltyLedger(transformed);
    } catch (err) {
      console.error('Failed to load royalty ledger:', err);
      setRoyaltyLedger([]);
      setRoyaltyLedgerError(err?.message || 'Unable to load royalty history.');
    } finally {
      setRoyaltyLedgerLoading(false);
    }
  }, [userAddress, getIncomeTransaction]);

  // Fetch royalty transactions using TransactionHistory approach
  const fetchRoyaltyTransactions = useCallback(async () => {
    if (!userAddress || !getIncomeTransaction) return;

    setTransactionsLoading(true);
    setTransactionsError(null);

    try {
      // Fetch royalty transactions specifically (kind = 2 for ROYALTY)
      const result = await getIncomeTransaction(userAddress, SAFEWALLET_KINDS.ROYALTY, 100, 0);
      console.log("Royalty transactions result:", result);

      const slices = result[0] || result.slice || [];
      const transformed = slices.map(transformTransactionEntry).filter(tx => tx.isCredit); // Only include claimed/credited royalties
      
      // Sort by timestamp (most recent first)
      transformed.sort((a, b) => (b.rawTimestamp || 0) - (a.rawTimestamp || 0));
      
      setRoyaltyTransactions(transformed);
    } catch (err) {
      console.error("Failed to load royalty transactions:", err);
      setTransactionsError(err?.message || "Failed to load royalty transactions.");
      setRoyaltyTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  }, [userAddress, getIncomeTransaction, transformTransactionEntry]);

  useEffect(() => {
    fetchRoyaltyLedger();
  }, [fetchRoyaltyLedger]);

  useEffect(() => {
    fetchRoyaltyTransactions();
  }, [fetchRoyaltyTransactions]);

  const tiers = useMemo(() => {
    // Prefer normalized tiers from store (already in USD units)
    if (Array.isArray(royaltyDetails?.tiers) && royaltyDetails.tiers.length) {
      return royaltyDetails.tiers.map((t) => ({
        thresholdUsd: Number(t?.thresholdUsd) || 0,
        monthlyUsd: Number(t?.monthlyUsd) || 0,
      }));
    }
    // Fallback to static constants if needed
    return ROYALTY_LEVELS.map((level) => ({
      thresholdUsd: Number(level.requiredVolumeUSD) / 1e6,
      monthlyUsd: Number(level.monthlyRoyaltyUSD) / 1e6,
    }));
  }, [royaltyDetails]);

  const currentLevel = Number(royaltyDetails?.currentLevel) || 0;
  const currentTier = currentLevel > 0 ? tiers[currentLevel - 1] : null;
  const payoutsReceived = royaltyDetails?.paidMonths ?? 0;
  const canClaim = royaltyDetails?.canClaim ?? false;
  const paused = royaltyDetails?.paused ?? false;

  const royaltyIncomeUsd = royaltyDetails?.royaltyIncomeUsd ?? 0;
  const royaltyIncomeRama = royaltyDetails?.royaltyIncomeRama ?? 0;
  const qualifiedVolumeUsd = royaltyDetails?.qualifiedVolumeUsd ?? 0;
  const renewalSnapshotUsd = royaltyDetails?.renewalSnapshotUsd ?? 0;
  const renewalRecentUsd = royaltyDetails?.renewalRecentUsd ?? 0;
  const renewalRequiredUsd = royaltyDetails?.renewalRequiredUsd ?? 0;
  const renewalTargetUsd = royaltyDetails?.renewalTargetUsd ?? 0;

  const nextMonthEpoch = royaltyDetails?.nextMonthEpoch ?? 0;

  const unclaimedRoyaltyUsd = Number(royaltyIncomeUsd || 0);
  const unclaimedRoyaltyRama = Number(royaltyIncomeRama || 0);
  const holdRoyaltyUsd = Number(currentTier?.monthlyUsd || 0);

  // Calculate claimed royalty totals from actual transaction history
  const claimedRoyaltyTotals = useMemo(() => {
    if (!Array.isArray(royaltyTransactions) || royaltyTransactions.length === 0) {
      return { usd: 0, rama: 0 };
    }
    return royaltyTransactions.reduce((acc, tx) => {
      acc.usd += Number(tx.amount_usd || 0);
      acc.rama += Number(tx.amount_rama || 0);
      return acc;
    }, { usd: 0, rama: 0 });
  }, [royaltyTransactions]);

  const royaltyLedgerTotals = useMemo(() => {
    if (!Array.isArray(royaltyLedger) || royaltyLedger.length === 0) {
      return { usd: 0, rama: 0 };
    }
    return royaltyLedger.reduce(
      (acc, entry) => {
        if (entry?.isCredit !== false) {
          acc.usd += Number(entry?.amountUsd || 0);
          acc.rama += Number(entry?.amountRama || 0);
        }
        return acc;
      },
      { usd: 0, rama: 0 }
    );
  }, [royaltyLedger]);

  const fallbackClaimedUsd = Math.max(0, 0); // Initialize to 0 for now
  const fallbackClaimedRama = Math.max(0, 0); // Initialize to 0 for now

  const claimedRoyaltyUsd =
    claimedRoyaltyTotals.usd > 0 ? claimedRoyaltyTotals.usd : 
    royaltyLedgerTotals.usd > 0 ? royaltyLedgerTotals.usd : fallbackClaimedUsd;
  const claimedRoyaltyRama =
    claimedRoyaltyTotals.rama > 0 ? claimedRoyaltyTotals.rama :
    royaltyLedgerTotals.rama > 0 ? royaltyLedgerTotals.rama : fallbackClaimedRama;

  // Calculate totals - Total should equal claimed amount
  const totalRoyaltyUsd = claimedRoyaltyUsd;
  const totalRoyaltyRama = claimedRoyaltyRama;

  const royaltyHistory = useMemo(() => {
    // Prioritize transaction history data over ledger data
    if (Array.isArray(royaltyTransactions) && royaltyTransactions.length > 0) {
      return royaltyTransactions;
    }
    return Array.isArray(royaltyLedger) ? royaltyLedger : [];
  }, [royaltyTransactions, royaltyLedger]);

  const handleClaimRoyalty = async () => {
    if (!connectedAddress || !canClaim) return;
    
    setShowClaimModal(true);
    
    try {
      // NOTE: RoyaltyManager.claimRoyalty() requires a Merkle proof (bytes32[] proof).
      // This proof must be generated off-chain by a backend API or script.
      // For now, we attempt to claim with an empty proof. This will fail unless:
      //   1) The contract allows empty proofs (unlikely), or
      //   2) You integrate with a backend that provides the proof.
      
      // Extract claim parameters from royaltyDetails
      const monthId = royaltyDetails?.nextMonthEpoch || 0;
      const tierIdx = (royaltyDetails?.currentLevel || 1) - 1; // 0-indexed
      const amountRama = royaltyDetails?.royaltyIncomeRama || 0;
      const amountInUSD = royaltyDetails?.royaltyIncomeUsd || 0;
      const proof = []; // Placeholder: replace with actual Merkle proof from backend

      const tx = await claimRoyaltyReward(
        connectedAddress,
        monthId,
        amountRama,
        amountInUSD,
        tierIdx,
        proof
      );

      setClaimTransaction(tx);
    } catch (err) {
      console.error('Royalty claim preparation failed:', err);
      setShowClaimModal(false);
      alert(err?.message || 'Failed to prepare claim transaction');
    }
  };

  const handleClaimModalClose = () => {
    setShowClaimModal(false);
  };

  const handleClaimSuccess = () => {
    // Reload royalty data
    if (userAddress) {
      getRoyaltyOverview(userAddress).then(setRoyaltyDetails).catch(() => {});
      fetchRoyaltyLedger();
      fetchRoyaltyTransactions(); // Also refresh transaction history
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green relative inline-flex items-center gap-3">
          Royalty Program
          <Trophy className="text-neon-orange" size={32} />
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-neon-green/20 blur-xl -z-10" />
        </h1>
        <p className="text-cyan-300/90 mt-1">
          Monthly recurring rewards for top performers
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/40 text-red-200 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      {loading && (
        <div className="text-sm text-cyan-200 flex items-center gap-2 cyber-glass rounded-lg px-4 py-3 border border-cyan-500/30">
          <RefreshCw size={16} className="animate-spin" /> Syncing royalty data…
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Total Royalty */}
        <div className="cyber-glass border border-cyan-500/40 rounded-xl p-5 hover:border-cyan-500/60 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
              <TrendingUp className="text-cyan-400" size={20} />
            </div>
            <span className="text-xs text-cyan-400 uppercase tracking-wider">Total</span>
          </div>
          <p className="text-xs text-cyan-300/70 uppercase tracking-wide mb-1">Total Royalty Earned</p>
          <p className="text-2xl md:text-3xl font-bold text-cyan-100 mb-1">{formatUSD(totalRoyaltyUsd)}</p>
          <p className="text-xs text-cyan-300/60">{formatRAMA(totalRoyaltyRama)} RAMA</p>
        </div>

        {/* Claimed Royalty */}
        <div className="cyber-glass border border-neon-green/40 rounded-xl p-5 hover:border-neon-green/60 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-neon-green/20 to-emerald-500/20">
              <CheckCircle className="text-neon-green" size={20} />
            </div>
            <span className="text-xs text-neon-green uppercase tracking-wider">Claimed</span>
          </div>
          <p className="text-xs text-cyan-300/70 uppercase tracking-wide mb-1">Claimed Royalty</p>
          <p className="text-2xl md:text-3xl font-bold text-neon-green mb-1">{formatUSD(claimedRoyaltyUsd)}</p>
          <p className="text-xs text-cyan-300/60">{formatRAMA(claimedRoyaltyRama)} RAMA</p>
        </div>

        {/* Current Level */}
        <div className="cyber-glass border border-neon-orange/50 rounded-xl p-5 hover:border-neon-orange/70 transition-all text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-white/15 rounded-lg">
              <Trophy size={22} />
            </div>
            <div>
              <p className="text-xs text-cyan-200 uppercase tracking-wider">
                Current Level
              </p>
              <p className="text-[11px] text-cyan-200/70">
                Active royalty tier
              </p>
            </div>
          </div>
          <p className="text-4xl font-bold text-white mb-2">{currentLevel}</p>
          {currentTier && (
            <p className="text-sm text-cyan-200/80">
              {formatUSD(currentTier.monthlyUsd)} / month
            </p>
          )}
        </div>

        {/* Hold Reward */}
        <div className="cyber-glass border border-neon-orange/40 rounded-xl p-5 hover:border-neon-orange/60 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-neon-orange/20 to-red-500/20">
              <Award className="text-neon-orange" size={20} />
            </div>
            <span className="text-xs text-neon-orange uppercase tracking-wider">Next</span>
          </div>
          <p className="text-xs text-cyan-300/70 uppercase tracking-wide mb-1">Hold / Next Month</p>
          <p className="text-2xl md:text-3xl font-bold text-neon-orange mb-1">{formatUSD(holdRoyaltyUsd)}</p>
          <p className="text-xs text-cyan-300/70 mt-2">
            Royalty payouts are auto-credited to your Safe Wallet.
          </p>
        </div>
      </div>

      {/* Claimed History Table */}
      <div className="cyber-glass rounded-2xl p-6 border border-cyan-500/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-cyan-300">Claimed History</h2>
            <History className="text-cyan-400" size={20} />
          </div>
          {(royaltyLedgerLoading || transactionsLoading) && (
            <RefreshCw size={16} className="text-cyan-400 animate-spin" />
          )}
        </div>

        <div className="overflow-x-auto">
          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            {(royaltyLedgerLoading || transactionsLoading) ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-12 rounded-lg bg-cyan-500/10 border border-cyan-500/20 animate-pulse"
                  />
                ))}
              </div>
            ) : (royaltyLedgerError || transactionsError) ? (
              <div className="text-sm text-red-200 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
                {royaltyLedgerError || transactionsError}
              </div>
            ) : royaltyHistory.length === 0 ? (
              <div className="text-center py-12 text-cyan-300/60">
                <Trophy size={48} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No royalty claims yet</p>
                <p className="text-xs mt-1">Your claim history will appear here</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 bg-dark-950/90 backdrop-blur z-10 text-xs uppercase tracking-wider text-cyan-300/70">
                  <tr className="border-b border-cyan-500/20">
                    <th className="text-left py-3 px-4">Sr. No.</th>
                    <th className="text-left py-3 px-4">Type</th>
                    <th className="text-right py-3 px-4">Amount (USD)</th>
                    <th className="text-right py-3 px-4">Amount (RAMA)</th>
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-left py-3 px-4">To</th>
                    <th className="text-right py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cyan-500/10">
                  {royaltyHistory.map((entry, idx) => {
                    const isTransactionFormat = entry.type && entry.amount_usd !== undefined;
                    return (
                      <tr key={entry.id} className="hover:bg-cyan-500/5 transition-colors">
                        <td className="py-3 px-4 text-cyan-200 text-sm font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-neon-orange/20 rounded border border-neon-orange/30">
                              <Trophy size={14} className="text-neon-orange" />
                            </div>
                            <span className="text-sm text-cyan-100 font-medium">
                              Royalty Income
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-neon-green font-semibold">
                          {isTransactionFormat 
                            ? formatUSD(entry.amount_usd) 
                            : formatUSD(entry.amountUsd)}
                        </td>
                        <td className="py-3 px-4 text-right text-cyan-100">
                          {isTransactionFormat 
                            ? entry.amount_rama.toFixed(5)
                            : formatRAMA(entry.amountRama)}
                        </td>
                        <td className="py-3 px-4 text-cyan-200 whitespace-nowrap text-sm">
                          {isTransactionFormat 
                            ? entry.timestamp 
                            : formatLedgerTimestamp(entry.rawTimestamp)}
                        </td>
                        <td className="py-3 px-4 text-cyan-300/90 font-mono text-sm">
                          {isTransactionFormat 
                            ? (entry.source || 'To Safe Wallet')
                            : 'To Safe Wallet'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            (isTransactionFormat ? entry.isCredit : (entry.isCredit !== false))
                              ? 'bg-neon-green/20 text-neon-green border border-neon-green/30' 
                              : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          }`}>
                            {(isTransactionFormat ? entry.isCredit : (entry.isCredit !== false)) ? (
                              <CheckCircle size={12} />
                            ) : (
                              <Clock size={12} />
                            )}
                            {isTransactionFormat 
                              ? entry.status 
                              : (entry.status || ((entry.isCredit === false) ? 'Debited' : 'Claimed'))}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <div className="cyber-glass rounded-2xl p-6 border border-cyan-500/30">
        <h2 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center gap-3">
          Royalty Tiers
          <TrendingUp className="text-cyan-400" size={20} />
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tiers?.map((tier, idx) => {
            const levelNum = idx + 1;
            const isAchieved = levelNum <= currentLevel;
            const isCurrent = levelNum === currentLevel;
            const thresholdUsd = Number(tier.thresholdUsd) || 0;
            const monthlyUsd = Number(tier.monthlyUsd) || 0;

            return (
              <div
                key={idx}
                className={`p-5 rounded-xl border-2 transition-all ${
                  isCurrent
                    ? 'border-neon-orange cyber-glass shadow-neon-green'
                    : isAchieved
                    ? 'border-neon-green cyber-glass '
                    : 'border-cyan-500 cyber-glass'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex flex-col">
                    <span
                      className={`text-lg font-bold ${
                        isCurrent
                          ? 'text-neon-orange'
                          : isAchieved
                          ? 'text-neon-green'
                          : 'text-cyan-300/90'
                      }`}
                    >
                      {ROYALTY_TIER_NAMES[idx]}
                    </span>
                    <span className="text-xs text-cyan-300/60">
                      Tier #{levelNum}
                    </span>
                  </div>
                  {isAchieved && (
                    <Trophy
                      className={isCurrent ? 'text-amber-500' : 'text-emerald-500'}
                      size={20}
                    />
                  )}
                </div>
                <p className="text-sm text-cyan-300/90 mb-2">Required Volume</p>
                <p className="text-lg font-semibold text-cyan-300 mb-3">
                  {formatUSD(thresholdUsd)}
                </p>
                <div
                  className={`p-3 rounded-lg ${
                    isCurrent
                      ? 'bg-amber-500/20'
                      : isAchieved
                      ? 'bg-emerald-500/20'
                      : 'bg-slate-700'
                  }`}
                >
                  <p className="text-xs text-cyan-300/90 mb-1">Monthly Payout</p>
                  <p
                    className={`text-xl font-bold ${
                      isCurrent
                        ? 'text-neon-orange/80'
                        : isAchieved
                        ? 'text-neon-green/80'
                        : 'text-cyan-400'
                    }`}
                  >
                    {formatUSD(monthlyUsd)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="cyber-glass rounded-2xl p-6 border border-cyan-500/30">
          <h3 className="font-semibold text-cyan-300 mb-4 flex items-center gap-3">
            Program Rules
            <AlertCircle className="text-cyan-400" size={18} />
          </h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-cyan-300">1</span>
              </div>
              <div>
                <p className="text-sm font-medium text-cyan-300">Monthly Payments</p>
                <p className="text-xs text-cyan-300/90">
                  Receive royalty payments once per month for as long as you
                  stay qualified.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-cyan-300">2</span>
              </div>
              <div>
                <p className="text-sm font-medium text-cyan-300">10% Growth Renewal</p>
                <p className="text-xs text-cyan-300/90">
                  Team volume must grow by 10% every two months to keep
                  royalty status active.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-cyan-300">3</span>
              </div>
              <div>
                <p className="text-sm font-medium text-cyan-300">Claim to Wallet</p>
                <p className="text-xs text-cyan-300/90">
                  Transfer royalty payments to Safe Wallet (0% fee) or Main
                  Wallet (5% fee).
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="cyber-glass rounded-2xl p-6 border border-cyan-500/30">
          <h3 className="font-semibold text-cyan-300 mb-4">Renewal Status</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-cyan-300/90 mb-2">
                Current Qualified Volume
              </p>
              <p className="text-2xl font-bold text-cyan-300">
                {formatUSD(qualifiedVolumeUsd)}
              </p>
            </div>
            {renewalTargetUsd > 0 && (
              <>
                <div>
                  <p className="text-sm text-cyan-300/90 mb-2">
                    Required for Renewal (10% growth)
                  </p>
                  <p className="text-2xl font-bold text-neon-orange">
                    {formatUSD(renewalRequiredUsd)}
                  </p>
                </div>
                <div className="p-4 cyber-glass border border-neon-orange/20 rounded-lg text-xs text-cyan-300/80">
                  <p>
                    Snapshot volume: {formatUSD(renewalSnapshotUsd)} • Current
                    tracking: {formatUSD(renewalRecentUsd)}
                  </p>
                  <p className="mt-1">
                    Next renewal check occurs with payout #{payoutsReceived + 1}.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Progressive Transaction Modal */}
      <ProgressiveTransactionModal
        isOpen={showClaimModal}
        onClose={handleClaimModalClose}
        txHash={txHash}
        title="Claim Royalty Reward"
        description="Claiming your monthly royalty payment"
        successMessage="Your royalty reward has been claimed successfully!"
        onSuccess={handleClaimSuccess}
        amount={holdRoyaltyUsd ? formatUSD(holdRoyaltyUsd) : null}
        amountLabel="Claiming Amount"
      />
    </div>
  );
}
