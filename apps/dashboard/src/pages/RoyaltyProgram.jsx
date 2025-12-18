import { useCallback, useEffect, useMemo, useState } from 'react';
import { Trophy, Clock, CheckCircle, AlertCircle, TrendingUp, Award, Lock, History, RefreshCw, BarChart3 } from 'lucide-react';
import { useStore } from '../../store/useUserInfoStore';
import { useAccount, useSendTransaction } from 'wagmi';
import {
  ROYALTY_LEVELS,
  formatUSD,
  formatRAMA,
} from '../utils/contractData';
import ProgressiveTransactionModal from '../components/ProgressiveTransactionModal';
import AddressWithCopy from '../components/AddressWithCopy';
import VolumeAnalytics from '../components/VolumeAnalytics';

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

const TIER_STATUS_META = {
  achieved: {
    card: 'border-neon-green/60 bg-neon-green/5 shadow-[0_0_25px_rgba(16,185,129,0.15)]',
    badge: 'border border-neon-green/40 bg-neon-green/15 text-neon-green',
    progress: 'bg-gradient-to-r from-neon-green via-cyan-400 to-cyan-500',
    number: 'bg-neon-green/20 border border-neon-green/40 text-neon-green',
    amount: 'text-neon-green',
    label: 'Achieved',
  },
  current: {
    card: 'border-neon-orange/60 bg-neon-orange/10 shadow-[0_0_25px_rgba(249,115,22,0.15)]',
    badge: 'border border-neon-orange/40 bg-neon-orange/15 text-neon-orange',
    progress: 'bg-gradient-to-r from-neon-orange via-cyan-400 to-neon-green',
    number: 'bg-neon-orange/20 border border-neon-orange/40 text-neon-orange',
    amount: 'text-neon-orange',
    label: 'In Progress',
  },
  locked: {
    card: 'border-cyan-500/30 bg-cyan-500/5',
    badge: 'border border-cyan-500/30 bg-cyan-500/10 text-cyan-300/80',
    progress: 'bg-cyan-500/30',
    number: 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-300',
    amount: 'text-cyan-300/80',
    label: 'Locked',
  },
};

const SAFEWALLET_KINDS = {
  ROYALTY: 2,
};

const USD_DIVISOR = 1e8;   // For legacy ledger data  
const USD_MICRO_FACTOR = 1e6; // Same as TransactionHistory for transaction data
const RAMA_DIVISOR = 1e18; // Same as TransactionHistory RAMA_DECIMALS
const MIN_VALID_ROYALTY_TS = 946684800;

const formatRoyaltyMonthId = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  if (numeric >= MIN_VALID_ROYALTY_TS) {
    try {
      return new Date(numeric * 1000).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
      });
    } catch {
      return null;
    }
  }
  if (numeric >= 100000) {
    const month = numeric % 100;
    const year = Math.floor(numeric / 100);
    if (month >= 1 && month <= 12) {
      try {
        return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'long',
        });
      } catch {
        return `${String(month).padStart(2, '0')}/${year}`;
      }
    }
  }
  return null;
};

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
  if (numeric < MIN_VALID_ROYALTY_TS) return '—';
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
  const getVolumeAnalytics = useStore((s) => s.getVolumeAnalytics);
  const getIncomeTransaction = useStore((s) => s.getIncomeTransaction);
  const claimRoyaltyReward = useStore((s) => s.claimRoyaltyReward);
  const [claimTransaction, setClaimTransaction] = useState(null);
  const { data: txHash, sendTransaction } = useSendTransaction();
  const [volumeAnalytics, setVolumeAnalytics] = useState(null);

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

  useEffect(() => {
    let cancelled = false;

    const loadVolumeAnalytics = async () => {
      if (!userAddress || typeof getVolumeAnalytics !== 'function') {
        setVolumeAnalytics(null);
        return;
      }
      try {
        const data = await getVolumeAnalytics(userAddress);
        if (!cancelled) {
          setVolumeAnalytics(data ?? null);
        }
      } catch (err) {
        console.warn('RoyaltyProgram volume analytics load failed:', err);
        if (!cancelled) {
          setVolumeAnalytics(null);
        }
      }
    };

    loadVolumeAnalytics();
    return () => {
      cancelled = true;
    };
  }, [userAddress, getVolumeAnalytics]);

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
      // console.log("Royalty transactions result:", result);

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

  // Determine current tier from achievedStages array
  // achievedStages: [0, 1] means stages 0 and 1 are achieved
  // The highest achieved stage number represents the current tier index (0-indexed)
  const achievedStagesArray = Array.isArray(royaltyDetails?.achievedStages) 
    ? royaltyDetails.achievedStages.map(s => Number(s)).filter(s => Number.isFinite(s) && s >= 0)
    : [];
  
  const hasTiers = Array.isArray(tiers) && tiers.length > 0;
  
  // Current tier is the highest achieved stage (0-indexed)
  // If achievedStages is [0, 1], highest is 1, so normalizedTierIndex = 1
  const normalizedTierIndex = achievedStagesArray.length > 0
    ? Math.max(...achievedStagesArray)
    : 0;
  
  // Clamp to valid tier range
  const clampedTierIndex = hasTiers
    ? Math.min(Math.max(normalizedTierIndex, 0), tiers.length - 1)
    : normalizedTierIndex;
  
  // Display level is 1-indexed for user (Tier 1, Tier 2, etc.)
  const displayCurrentLevel = clampedTierIndex + 1;
  
  // Debug log to verify tier calculation
  // console.log('🏆 Royalty Tier Debug:', {
  //   achievedStages: royaltyDetails?.achievedStages,
  //   achievedStagesArray,
  //   highestAchieved: normalizedTierIndex,
  //   clampedIndex: clampedTierIndex,
  //   displayLevel: displayCurrentLevel,
  //   tierName: ROYALTY_TIER_NAMES[clampedTierIndex],
  //   achievedAt: royaltyDetails?.achievedAt,
  // });
  
  const currentTier = hasTiers ? tiers[clampedTierIndex] : null;
  const currentTierName =
    ROYALTY_TIER_NAMES[clampedTierIndex] ?? `Tier ${displayCurrentLevel}`;
  const payoutsReceived = royaltyDetails?.paidMonths ?? 0;
  const canClaim = royaltyDetails?.canClaim ?? false;
  const paused = royaltyDetails?.paused ?? false;

  const analyticsTeamBreakdown = useMemo(() => {
    if (!volumeAnalytics) return null;
    const uncapped = volumeAnalytics?.uncappedVolumes ?? {};
    const l1 = Number(uncapped?.L1 ?? uncapped?.l1 ?? 0);
    const l2 = Number(uncapped?.L2 ?? uncapped?.l2 ?? 0);
    const lrest = Number(uncapped?.Lrest ?? uncapped?.lrest ?? 0);
    const totalUncapped = Number(uncapped?.total ?? 0);
    const totalQualified = Number(volumeAnalytics?.totalQualified ?? 0);
    const totalUsd =
      totalUncapped > 0
        ? totalUncapped
        : totalQualified > 0
        ? totalQualified
        : l1 + l2 + lrest;
    return {
      l1Usd: l1,
      l2Usd: l2,
      lrestUsd: lrest,
      totalUsd,
    };
  }, [volumeAnalytics]);

  const analyticsUsdToRamaRatio = useMemo(() => {
    if (!volumeAnalytics) return null;
    const totalUsd = Number(volumeAnalytics?.uncappedVolumes?.total ?? 0);
    const totalRama = Number(volumeAnalytics?.totalVolumeRAMA ?? 0);
    if (totalUsd > 0 && totalRama > 0) {
      return totalRama / totalUsd;
    }
    return null;
  }, [volumeAnalytics]);

  const qualifiedVolumeUsd =
    Number(royaltyDetails?.qualifiedVolumeUsd) > 0
      ? Number(royaltyDetails?.qualifiedVolumeUsd)
      : Number(volumeAnalytics?.totalQualified) > 0
      ? Number(volumeAnalytics?.totalQualified)
      : 0;

  const fallbackRoyaltyIncomeUsd =
    qualifiedVolumeUsd > 0 ? qualifiedVolumeUsd * 0.05 : 0;

  const royaltyIncomeUsd =
    Number(royaltyDetails?.royaltyIncomeUsd) > 0
      ? Number(royaltyDetails?.royaltyIncomeUsd)
      : fallbackRoyaltyIncomeUsd;

  const royaltyIncomeRama =
    Number(royaltyDetails?.royaltyIncomeRama) > 0
      ? Number(royaltyDetails?.royaltyIncomeRama)
      : royaltyIncomeUsd > 0
      ? (analyticsUsdToRamaRatio && analyticsUsdToRamaRatio > 0
          ? royaltyIncomeUsd * analyticsUsdToRamaRatio
          : royaltyIncomeUsd / 0.1)
      : 0;

  const renewalSnapshotUsd =
    Number(royaltyDetails?.renewalSnapshotUsd) > 0
      ? Number(royaltyDetails?.renewalSnapshotUsd)
      : analyticsTeamBreakdown?.totalUsd ?? 0;

  const renewalRecentUsd =
    Number(royaltyDetails?.renewalRecentUsd) > 0
      ? Number(royaltyDetails?.renewalRecentUsd)
      : analyticsTeamBreakdown?.totalUsd ?? 0;

  const renewalTargetUsd =
    Number(royaltyDetails?.renewalTargetUsd) > 0
      ? Number(royaltyDetails?.renewalTargetUsd)
      : Number(royaltyDetails?.nextThresholdUsd) > 0
      ? Number(royaltyDetails?.nextThresholdUsd)
      : volumeAnalytics?.capBreakdown?.targetVolume > 0
      ? Number(volumeAnalytics.capBreakdown.targetVolume)
      : analyticsTeamBreakdown?.totalUsd ?? 0;

  const renewalRequiredUsd =
    Number(royaltyDetails?.renewalRequiredUsd) > 0
      ? Number(royaltyDetails?.renewalRequiredUsd)
      : Math.max(
          0,
          (renewalTargetUsd || 0) - (analyticsTeamBreakdown?.totalUsd ?? qualifiedVolumeUsd ?? 0)
        );

  const nextMonthEpoch = royaltyDetails?.nextMonthEpoch ?? 0;
  const nextMonthLabelFromStore = royaltyDetails?.nextMonthLabel ?? null;
  const lastPaidMonthLabel = royaltyDetails?.lastPaidMonthLabel ?? null;
  const lastPaidMonthEpoch = royaltyDetails?.lastPaidMonthEpoch ?? 0;
  const lastPaidMonthRaw = royaltyDetails?.lastPaidMonthRaw ?? 0;

  const unclaimedRoyaltyUsd = Number(royaltyIncomeUsd || 0);
  const unclaimedRoyaltyRama = Number(royaltyIncomeRama || 0);
  const holdRoyaltyUsd = 0; // Placeholder: will reflect held royalty once 4x-cap hold logic is active

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

  const teamBreakdown = useMemo(() => {
    const raw = royaltyDetails?.teamBusinessBreakdown;
    if (raw) {
      const normalized = {
        l1Usd: Number(raw.l1Usd) || 0,
        l2Usd: Number(raw.l2Usd) || 0,
        lrestUsd: Number(raw.lrestUsd) || 0,
        totalUsd:
          Number(raw.totalUsd) ||
          (Number(raw.l1Usd) || 0) +
            (Number(raw.l2Usd) || 0) +
            (Number(raw.lrestUsd) || 0),
      };
      const hasVolume =
        normalized.l1Usd > 0 ||
        normalized.l2Usd > 0 ||
        normalized.lrestUsd > 0;
      if (hasVolume) {
        return normalized;
      }
    }
    if (analyticsTeamBreakdown) {
      return analyticsTeamBreakdown;
    }
    return {
      l1Usd: 0,
      l2Usd: 0,
      lrestUsd: 0,
      totalUsd: qualifiedVolumeUsd,
    };
  }, [royaltyDetails?.teamBusinessBreakdown, analyticsTeamBreakdown, qualifiedVolumeUsd]);
  const pendingRoyalty = royaltyDetails?.pendingRoyalty || null;
  const globalDistribution = royaltyDetails?.globalDistribution || null;
  const nextThresholdUsd =
    Number(royaltyDetails?.nextThresholdUsd) > 0
      ? Number(royaltyDetails?.nextThresholdUsd)
      : renewalTargetUsd ?? 0;
  const neededUsd =
    Number(royaltyDetails?.neededUsd) > 0
      ? Number(royaltyDetails?.neededUsd)
      : renewalRequiredUsd ?? 0;
  const accumulatedTowardsNextTier = Math.max(0, nextThresholdUsd - neededUsd);
  const nextTierProgressPct =
    nextThresholdUsd > 0
      ? Math.min(100, (accumulatedTowardsNextTier / nextThresholdUsd) * 100)
      : 0;
  const renewalProgressPct =
    renewalTargetUsd > 0
      ? Math.min(100, (renewalRecentUsd / renewalTargetUsd) * 100)
      : 0;
  const achievedStageIds = useMemo(() => {
    const fromContract = Array.isArray(royaltyDetails?.achievedStages)
      ? royaltyDetails.achievedStages
      : [];
    if (fromContract.length) return fromContract;
    const alt = royaltyDetails?.slabAchiev?.stages;
    return Array.isArray(alt) ? alt : [];
  }, [royaltyDetails]);

  const achievedTimestamps = useMemo(() => {
    const map = new Map();
    const stages = Array.isArray(achievedStageIds) ? achievedStageIds : [];
    const times = Array.isArray(royaltyDetails?.achievedAt)
      ? royaltyDetails.achievedAt
      : Array.isArray(royaltyDetails?.slabAchiev?.achievedAt)
      ? royaltyDetails.slabAchiev.achievedAt
      : [];
    stages.forEach((stageId, idx) => {
      const numericStage = Number(stageId);
      if (!Number.isFinite(numericStage) || numericStage < 0) return;
      const ts = Number(times[idx]);
      if (Number.isFinite(ts) && ts > 0) {
        map.set(numericStage, ts);
      }
    });
    return map;
  }, [achievedStageIds, royaltyDetails]);

  const achievementStages = useMemo(() => {
    if (!Array.isArray(tiers) || tiers.length === 0) return [];
    const achievedSet = new Set(
      (Array.isArray(achievedStageIds) ? achievedStageIds : [])
        .map((v) => Number(v))
        .filter((v) => Number.isFinite(v) && v >= 0)
    );

    return tiers.map((tier, idx) => {
      const achieved = achievedSet.has(idx);
      const status = achieved
        ? 'achieved'
        : idx === clampedTierIndex
        ? 'current'
        : 'locked';
      const achievedTs = achievedTimestamps.get(idx) ?? null;
      const achievedLabel =
        achievedTs && achievedTs > MIN_VALID_ROYALTY_TS
          ? new Date(achievedTs * 1000).toLocaleDateString()
          : null;
      return {
        idx,
        label: ROYALTY_TIER_NAMES[idx] ?? `Tier ${idx + 1}`,
        status,
        achievedTs,
        achievedLabel,
        thresholdUsd: tier.thresholdUsd ?? 0,
      };
    });
  }, [tiers, achievedStageIds, achievedTimestamps, clampedTierIndex]);

  const achievedStageCount = achievementStages.filter(
    (stage) => stage.status === 'achieved'
  ).length;

  const lastDistributionAt = Number(globalDistribution?.lastDistributionAt ?? 0);
  const latestRoyaltyHistoryTs = royaltyHistory.reduce((max, entry) => {
    const ts = Number(entry?.rawTimestamp ?? 0);
    if (Number.isFinite(ts) && ts > max) {
      return ts;
    }
    return max;
  }, 0);
  const fallbackLastDistributionTs =
    lastDistributionAt > MIN_VALID_ROYALTY_TS
      ? lastDistributionAt
      : latestRoyaltyHistoryTs > MIN_VALID_ROYALTY_TS
      ? latestRoyaltyHistoryTs
      : lastPaidMonthEpoch;
  const lastDistributionLabel = formatLedgerTimestamp(fallbackLastDistributionTs);
  const distributionMonthLabel =
    globalDistribution?.lastDistributionMonthLabel ??
    formatRoyaltyMonthId(globalDistribution?.lastDistributionMonth) ??
    lastPaidMonthLabel ??
    formatRoyaltyMonthId(lastPaidMonthRaw) ??
    null;

  const remainingToNextTierUsd = Math.max(0, neededUsd);
  const nextPayoutCandidates = [
    Number(pendingRoyalty?.monthStartTs) || 0,
    nextMonthEpoch || 0,
    fallbackLastDistributionTs > MIN_VALID_ROYALTY_TS
      ? fallbackLastDistributionTs + 30 * 24 * 60 * 60
      : 0,
  ];
  const nextPayoutTimestamp =
    nextPayoutCandidates.find((ts) => ts >= MIN_VALID_ROYALTY_TS) ?? 0;
  let nextPayoutLabel = formatLedgerTimestamp(nextPayoutTimestamp);
  if (nextPayoutLabel === '—') {
    nextPayoutLabel =
      pendingRoyalty?.monthLabel ??
      nextMonthLabelFromStore ??
      (nextPayoutTimestamp >= MIN_VALID_ROYALTY_TS
        ? new Date(nextPayoutTimestamp * 1000).toLocaleDateString()
        : null) ??
      '—';
  }

  const recentAchievedStages = achievementStages.filter(
    (stage) => stage.status === 'achieved'
  );
  const upcomingStage = achievementStages.find((stage) => stage.status !== 'achieved');

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
      const tierIdx = clampedTierIndex;
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
          <Trophy className="text-neon-orange" size={20} />
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
          <p className="text-4xl font-bold text-white mb-1">{displayCurrentLevel}</p>
          <p className="text-sm text-cyan-200/80 mb-1">
            {currentTierName}
          </p>
          {currentTier && (
            <p className="text-sm text-cyan-200/70">
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
          Hold tally activates when rewards accrue after completing the 4x cap with inactive portfolios.
        </p>
      </div>
    </div>

      {userAddress && (
        <div className="space-y-6">
          <div className="cyber-glass border border-cyan-500/40 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-neon-green/10 opacity-40" />
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="p-2 bg-cyan-500/20 rounded-lg border border-cyan-500/30">
                <BarChart3 size={22} className="text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-cyan-300 font-medium uppercase tracking-wide">
                  Enhanced Volume Analytics
                </p>
                <p className="text-xs text-cyan-300/80">
                  Real-time business volume tracking with royalty tier status
                </p>
              </div>
            </div>
            <div className="relative z-10">
              <VolumeAnalytics 
                userAddress={userAddress} 
                showDetailed={true} 
                maxLegs={8}
                customTier={{ 
                  level: displayCurrentLevel, 
                  name: currentTierName 
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Advanced Royalty Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="cyber-glass border border-cyan-500/30 rounded-xl p-5 space-y-3 hover:border-cyan-500/60 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-cyan-300" />
              <span className="text-sm font-semibold text-cyan-200">Team Business</span>
            </div>
            <span className="text-[11px] text-cyan-300/70 uppercase tracking-wide">Qualified</span>
          </div>
          <p className="text-2xl font-bold text-cyan-100">{formatUSD(teamBreakdown.totalUsd)}</p>
          <p className="text-xs text-cyan-300/60">
            Total qualified volume contributing to royalty eligibility.
          </p>
          <div className="grid grid-cols-3 gap-2 text-xs text-cyan-200">
            <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 p-2 text-center">
              <p className="font-semibold text-cyan-100">Level 1</p>
              <p className="mt-1 text-cyan-300/80">{formatUSD(teamBreakdown.l1Usd)}</p>
            </div>
            <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 p-2 text-center">
              <p className="font-semibold text-cyan-100">Level 2</p>
              <p className="mt-1 text-cyan-300/80">{formatUSD(teamBreakdown.l2Usd)}</p>
            </div>
            <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 p-2 text-center">
              <p className="font-semibold text-cyan-100">Beyond</p>
              <p className="mt-1 text-cyan-300/80">{formatUSD(teamBreakdown.lrestUsd)}</p>
            </div>
          </div>
        </div>

        <div className="cyber-glass border border-neon-green/30 rounded-xl p-5 space-y-3 hover:border-neon-green/60 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-neon-green" />
              <span className="text-sm font-semibold text-neon-green">Renewal Progress</span>
            </div>
            <span className="text-[11px] text-neon-green/80 uppercase tracking-wide">{renewalProgressPct.toFixed(1)}%</span>
          </div>
          <div className="h-2 rounded-full bg-neon-green/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 via-neon-green to-emerald-400"
              style={{ width: `${renewalProgressPct}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs text-cyan-300/80">
            <div>
              <p className="font-semibold text-cyan-200">Last 60 Days</p>
              <p className="mt-1">{formatUSD(renewalSnapshotUsd)}</p>
            </div>
            <div>
              <p className="font-semibold text-cyan-200">Current Window</p>
              <p className="mt-1">{formatUSD(renewalRecentUsd)}</p>
            </div>
            <div>
              <p className="font-semibold text-cyan-200">Target</p>
              <p className="mt-1">{formatUSD(renewalTargetUsd)}</p>
            </div>
            <div>
              <p className="font-semibold text-cyan-200">Remaining</p>
              <p className="mt-1">{formatUSD(remainingToNextTierUsd)}</p>
            </div>
          </div>
        </div>

        <div className="cyber-glass border border-neon-purple/40 rounded-xl p-5 space-y-3 hover:border-neon-purple/60 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-neon-purple" />
              <span className="text-sm font-semibold text-neon-purple">Achievements</span>
            </div>
            <span className="text-[11px] text-neon-purple/80 uppercase tracking-wide">{achievedStageCount} stages</span>
          </div>
          <div className="rounded-lg bg-neon-purple/10 border border-neon-purple/30 p-3 text-xs text-neon-purple/80">
            <p className="font-semibold text-neon-purple/90 mb-1">Next Tier Progress</p>
            <div className="h-2 rounded-full bg-neon-purple/20 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-neon-purple via-neon-pink to-cyan-400"
                style={{ width: `${nextTierProgressPct}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-[11px]">
              <span>Reached</span>
              <span>{nextTierProgressPct.toFixed(1)}%</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentAchievedStages.length === 0 ? (
              <span className="text-[11px] text-neon-purple/60">No achievements yet</span>
            ) : (
              recentAchievedStages.map(({ idx, label, achievedLabel }) => (
                <span
                  key={idx}
                  className="px-2 py-1 rounded-full border border-neon-purple/40 bg-neon-purple/10 text-[11px] text-white"
                >
                  {label}
                  {achievedLabel ? ` • ${achievedLabel}` : ''}
                </span>
              ))
            )}
            {upcomingStage && (
              <span className="px-2 py-1 rounded-full border border-cyan-500/40 bg-cyan-500/10 text-[11px] text-cyan-200/80">
                Next: {upcomingStage.label}
              </span>
            )}
          </div>
        </div>

        <div className="cyber-glass border border-cyan-500/40 rounded-xl p-5 space-y-3 hover:border-cyan-500/60 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History size={18} className="text-cyan-400" />
              <span className="text-sm font-semibold text-cyan-200">Payout Pipeline</span>
            </div>
            <span className="text-[11px] text-cyan-300/70 uppercase tracking-wide">Timeline</span>
          </div>
          {pendingRoyalty?.exists ? (
            <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-3 text-xs text-cyan-200 space-y-1">
              <p className="text-sm font-semibold text-cyan-100">Pending Royalty</p>
              <p>
                Month:{' '}
                {pendingRoyalty.monthLabel || formatRoyaltyMonthId(pendingRoyalty.monthId) || pendingRoyalty.monthId}
              </p>
              <p>Tier: {pendingRoyalty.tierIdx + 1}</p>
              <p>Amount: {formatUSD(pendingRoyalty.amountUsd)} • {formatRAMA(pendingRoyalty.amountRama)} RAMA</p>
            </div>
          ) : (
            <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs text-cyan-300/70">
              No pending royalties detected.
            </div>
          )}
          <div className="text-xs text-cyan-300/70 space-y-1">
            <p>
              Last distribution: <span className="text-cyan-100">{lastDistributionLabel}</span>
            </p>
            <p>
              Distribution month:{' '}
              <span className="text-cyan-100">
                {distributionMonthLabel || formatRoyaltyMonthId(globalDistribution?.lastDistributionMonth) || '—'}
              </span>
            </p>
            <p>
              Next payout window:{' '}
              <span className="text-cyan-100">
                {nextPayoutLabel || '—'}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Claimed History Table */}
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

      <div className="cyber-glass rounded-2xl p-6 border border-cyan-500/30 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        <h2 className="text-lg font-semibold text-cyan-300 mb-6 uppercase tracking-wide flex items-center gap-3">
          Royalty Tiers
          <TrendingUp className="text-cyan-400" size={20} />
        </h2>
        <p className="text-sm text-cyan-300/80 mb-5">
          Qualified volume: {formatUSD(qualifiedVolumeUsd)}
        </p>
        <div className="space-y-4">
          {tiers && tiers.length > 0 ? (
            tiers.map((tier, idx) => {
              const thresholdUsd = Number(tier.thresholdUsd) || 0;
              const monthlyUsd = Number(tier.monthlyUsd) || 0;
              const tierName =
                ROYALTY_TIER_NAMES[idx] ?? `Tier ${idx + 1}`;
              const progressRaw =
                thresholdUsd > 0
                  ? (Number(qualifiedVolumeUsd) / thresholdUsd) * 100
                  : 0;
              const progressPct = Math.max(0, Math.min(100, progressRaw));
              const hasCleared =
                thresholdUsd > 0 && Number(qualifiedVolumeUsd) >= thresholdUsd;

              let status = 'locked';
              if (hasCleared || idx < clampedTierIndex) {
                status = 'achieved';
              } else if (idx === clampedTierIndex) {
                status = 'current';
              }

              const meta = TIER_STATUS_META[status] ?? TIER_STATUS_META.locked;
              const cardClass = `cyber-glass rounded-xl border p-4 sm:p-5 transition-all ${meta.card}`;
              const numberClass = `w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold ${meta.number}`;
              const badgeClass = `inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${meta.badge}`;
              const amountClass = `text-lg sm:text-xl font-bold ${meta.amount}`;
              const progressFillClass = `h-full rounded-full transition-all ${meta.progress}`;
              const statusIcon =
                status === 'achieved' ? (
                  <CheckCircle size={14} />
                ) : status === 'current' ? (
                  <Clock size={14} />
                ) : (
                  <Lock size={14} />
                );

              return (
                <div key={`${tierName}-${idx}`} className={cardClass}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className={numberClass}>{idx + 1}</div>
                      <div>
                        <p className="text-sm font-semibold text-cyan-200 uppercase tracking-wide">
                          {tierName}
                        </p>
                        <p className="text-xs text-cyan-300/70">
                          Required Volume: {formatUSD(thresholdUsd)}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-right space-y-2 lg:space-x-6">
                      <div className='flex flex-col lg:flex-row justify-center items-center lg:space-x-1 '>
                        <p className="text-xs lg:text-[15px] text-justify uppercase tracking-wide text-cyan-300/70">
                        Monthly {" "}
                      </p>
                      <p className="text-xs lg:text-[15px] uppercase tracking-wide text-cyan-300/70">
                        Payout
                      </p>
                      </div>
                      <p className={amountClass}>{formatUSD(monthlyUsd)}</p>
                      <span className={badgeClass}>
                        {statusIcon}
                        {meta.label}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[11px] text-cyan-300/80 mb-1">
                      <span>Progress</span>
                      <span>{progressPct.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-cyan-500/10 overflow-hidden">
                      <div
                        className={progressFillClass}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-cyan-300/70 mt-2">
                      Qualified volume: {formatUSD(qualifiedVolumeUsd)} /{' '}
                      {formatUSD(thresholdUsd)}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-sm text-cyan-300/70">
              Royalty tier data is not available right now.
            </div>
          )}
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
