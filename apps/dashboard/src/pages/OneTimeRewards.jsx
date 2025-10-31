import { useEffect, useMemo, useState } from 'react';
import { Gift, CheckCircle, Lock, AlertCircle, Clock, TrendingUp, Award, DollarSign, BarChart3 } from 'lucide-react';
import { useStore } from '../../store/useUserInfoStore';
import { ONE_TIME_REWARDS, formatUSD, formatRAMA } from '../utils/contractData';
import { useAccount, useSendTransaction } from 'wagmi';
import ProgressiveTransactionModal from '../components/ProgressiveTransactionModal';
import VolumeAnalytics from '../components/VolumeAnalytics';

const REWARD_NAMES = [
  'Coral Spark',
  'Pearl Bloom',
  'Shell Harvest',
  'Wave Bounty',
  'Tide Treasure',
  'Blue Depth Bonus',
  "Guardian's Gift",
  "Captain's Chest",
  'Trident Gem',
  'Sea Legend Award',
  'Abyss Crown',
  "Poseidon's Favor",
  'Neptune Scepter',
  'Ocean Infinity',
];

export default function OneTimeRewards() {
  const { address: connectedAddress } = useAccount();
  const userAddressStore = useStore((s) => s.userAddress);
  const userAddress =
    connectedAddress || userAddressStore || (typeof window !== 'undefined' ? localStorage.getItem('userAddress') : null);
  
  const [overview, setOverview] = useState(null);
  const [rewardTotals, setRewardTotals] = useState(null);
  const [claimHistory, setClaimHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimError, setClaimError] = useState(null);
  const [teamVolume, setTeamVolume] = useState(null);
  const [loadingTeamVolume, setLoadingTeamVolume] = useState(false);

  const getOneTimeRewardsOverview = useStore((s) => s.getOneTimeRewardsOverview);
  const getGlobalOneTimeMilestones = useStore((s) => s.getGlobalOneTimeMilestones);
  const getUserRewardTotals = useStore((s) => s.getUserRewardTotals);
  const claimOneTimeReward = useStore((s) => s.claimOneTimeReward);
  const getRewardClaimHistory = useStore((s) => s.getRewardClaimHistory);
  const getVolumeAnalytics = useStore((s) => s.getVolumeAnalytics);

  const { data: txHash, sendTransaction } = useSendTransaction();
  const [showProgressModal, setShowProgressModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!userAddress) {
        // No wallet: load public milestones (from contracts) so fallbacks stay up to date.
        setLoading(true);
        setError(null);
        try {
          const pub = await getGlobalOneTimeMilestones();
          setOverview({
            claimedCount: 0,
            achievedCount: 0,
            totalEarnedUsd: 0,
            totalEarnedRama: 0,
            pendingRewardUsd: 0,
            pendingRewardRama: 0,
            qualifiedVolumeUsd: 0,
            directs: 0,
            milestones: pub?.milestones || [],
            remainingUsd: (pub?.milestones || []).reduce((s, m) => s + (m.rewardUsd || 0), 0),
            claimableMilestones: [],
            milestoneSource: pub?.milestoneSource || 'contract',
          });
          setRewardTotals(null);
        } catch (err) {
          console.error(err);
          setOverview(null);
          setError(err?.message || 'Unable to load milestone data.');
        } finally {
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const [res, totals] = await Promise.all([
          getOneTimeRewardsOverview(userAddress),
          getUserRewardTotals(userAddress).catch(() => null),
        ]);
        if (!cancelled) {
          setOverview(res);
          setRewardTotals(totals);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError(err?.message || 'Unable to load one-time reward data.');
          setOverview(null);
          setRewardTotals(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [userAddress, getOneTimeRewardsOverview, getGlobalOneTimeMilestones, getUserRewardTotals]);

  useEffect(() => {
    let cancelled = false;
    const loadHistory = async () => {
      if (!userAddress) {
        setClaimHistory([]);
        return;
      }
      setLoadingHistory(true);
      try {
        const res = await getRewardClaimHistory(userAddress, 0, 20);
        if (!cancelled) setClaimHistory(res?.claims || []);
      } catch (err) {
        console.error(err);
        if (!cancelled) setClaimHistory([]);
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    };
    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [userAddress, getRewardClaimHistory]);

  useEffect(() => {
    let cancelled = false;
    if (!userAddress || typeof getVolumeAnalytics !== 'function') {
      setTeamVolume(null);
      return () => {};
    }
    const loadVolume = async () => {
      try {
        setLoadingTeamVolume(true);
        const res = await getVolumeAnalytics(userAddress);
        if (!cancelled) setTeamVolume(res || null);
      } catch (err) {
        console.warn('One-time rewards volume analytics unavailable:', err);
        if (!cancelled) setTeamVolume(null);
      } finally {
        if (!cancelled) setLoadingTeamVolume(false);
      }
    };
    loadVolume();
    return () => {
      cancelled = true;
    };
  }, [userAddress, getVolumeAnalytics]);

  const handleClaimReward = async () => {
    if (!userAddress || !connectedAddress) {
      setClaimError('Please connect your wallet to claim rewards.');
      return;
    }
    setIsClaiming(true);
    setClaimError(null);
    setShowProgressModal(true);
    try {
      const tx = await claimOneTimeReward(connectedAddress);
      sendTransaction(tx);
    } catch (err) {
      console.error(err);
      setClaimError(err?.message || 'Failed to claim rewards.');
      setIsClaiming(false);
      setShowProgressModal(false);
    }
  };

  const handleModalClose = () => {
    setShowProgressModal(false);
    setIsClaiming(false);
    setClaimError(null);
  };

  const handleTransactionSuccess = () => {
    // Refresh data after successful claim
    if (userAddress) {
      Promise.all([
        getOneTimeRewardsOverview(userAddress).then(setOverview).catch(() => {}),
        getUserRewardTotals(userAddress).then(setRewardTotals).catch(() => {}),
        getRewardClaimHistory(userAddress, 0, 20).then((res) => setClaimHistory(res?.claims || [])).catch(() => {}),
        typeof getVolumeAnalytics === 'function'
          ? getVolumeAnalytics(userAddress).then(setTeamVolume).catch(() => {})
          : Promise.resolve(),
      ]);
    }
  };

  const fallbackMilestones = useMemo(
    () =>
      ONE_TIME_REWARDS.map((reward, idx) => ({
        idx,
        thresholdUsd: parseFloat(reward.requiredVolumeUSD) / 1e6,
        rewardUsd: parseFloat(reward.rewardUSD) / 1e6,
        claimed: false,
        unlocked: false,
        claimable: false,
        achieved: false,
        achievedAt: null,
        status: 'locked',
        progressPct: 0,
      })),
    []
  );

  const milestonesCore = overview?.milestones?.length
    ? overview.milestones
    : fallbackMilestones;

  // Treat missing overview as fallback so top tiles display constant-based totals
  const milestoneSource = overview?.milestoneSource ?? 'fallback';
  const isFallback = !overview?.milestones?.length || milestoneSource === 'fallback';

  const milestones = useMemo(
    () =>
      milestonesCore.map((milestone, idx) => ({
        ...milestone,
        name: REWARD_NAMES[idx] ?? `Milestone ${idx + 1}`,
      })),
    [milestonesCore]
  );

  const totalMilestones = milestones.length;
  const claimedCount =
    overview?.claimedCount ?? milestones.filter((m) => m.claimed).length;
  const achievedCount =
    overview?.achievedCount ?? milestones.filter((m) => m.achieved).length;
  const claimableMilestones = milestones.filter((m) => m.claimable);

  const totalEarnedUsd = rewardTotals?.claimedUsd ?? overview?.totalEarnedUsd ?? 0;
  const totalEarnedRama = rewardTotals?.claimedRama ?? overview?.totalEarnedRama ?? 0;
  const pendingRewardUsd = rewardTotals?.pendingUsd ?? overview?.pendingRewardUsd ?? 0;
  const pendingRewardRama = overview?.pendingRewardRama ?? 0;
  const qualifiedVolume = overview?.qualifiedVolumeUsd ?? 0;
  const qualifiedVolumeDisplay = isFallback ? '—' : formatUSD(qualifiedVolume);
  const teamVolumeSummary = useMemo(() => {
    const toNum = (val) => {
      const n = Number(val);
      return Number.isFinite(n) ? n : 0;
    };
    if (teamVolume && teamVolume.oneTimeReward?.teamBusiness) {
      const summary = teamVolume.oneTimeReward.teamBusiness;
      return {
        total: toNum(summary.totalUsd),
        l1: toNum(summary.l1Usd),
        l2: toNum(summary.l2Usd),
        lRest: toNum(summary.lrestUsd),
      };
    }
    if (teamVolume) {
      const capped = teamVolume.cappedVolumes || {};
      const uncapped = teamVolume.uncappedVolumes || {};
      const total =
        toNum(capped.total) || toNum(teamVolume.totalQualified) || toNum(qualifiedVolume);
      const l1 = toNum(capped.L1) || toNum(uncapped.L1);
      const l2 = toNum(capped.L2) || toNum(uncapped.L2);
      const restCandidate = toNum(capped.Lrest) || toNum(uncapped.Lrest);
      const remainder = Math.max(total - (l1 + l2), 0);
      return {
        total,
        l1,
        l2,
        lRest: restCandidate > 0 ? restCandidate : remainder,
      };
    }
    const fallbackTotal = toNum(qualifiedVolume);
    return {
      total: fallbackTotal,
      l1: 0,
      l2: 0,
      lRest: 0,
    };
  }, [teamVolume, qualifiedVolume]);

  // When using fallback milestones, compute a meaningful aggregate for the tiles
  const fallbackTotals = useMemo(() => {
    if (!isFallback) return null;
    const totalPotentialUsd = milestonesCore.reduce(
      (sum, m) => sum + (Number(m?.rewardUsd) || 0),
      0
    );
    return { totalPotentialUsd };
  }, [isFallback, milestonesCore]);

  const totalRewardUsd = fallbackTotals?.totalPotentialUsd ?? 
    milestones.reduce((sum, m) => sum + (m.rewardUsd || 0), 0);
  const unclaimedUsd = totalRewardUsd - totalEarnedUsd;
  const holdRewardUsd = 0; // Placeholder until hold logic (4x cap + inactive portfolio) is implemented

  const remainingUsd = overview?.remainingUsd ?? fallbackTotals?.totalPotentialUsd ?? 0;
  const canClaim = pendingRewardUsd > 0 && userAddress && connectedAddress;

  const STATUS_META = {
    claimed: {
      label: 'Claimed',
      card: 'border-neon-green/40 bg-neon-green/5',
      badge: 'bg-neon-green/20 text-neon-green border border-neon-green/40',
    },
    claimable: {
      label: 'Claimable',
      card: 'border-cyan-500/40 bg-cyan-500/5',
      badge: 'bg-gradient-to-r from-cyan-500 to-neon-green text-dark-950 border border-neon-green/40',
    },
    achieved: {
      label: 'Achieved',
      card: 'border-neon-purple/40 bg-neon-purple/10',
      badge: 'bg-neon-purple/10 text-neon-purple border border-neon-purple/40',
    },
    unlocked: {
      label: 'Unlocked',
      card: 'border-cyan-500/30 bg-dark-950/40',
      badge: 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30',
    },
    locked: {
      label: 'Locked',
      card: 'border-cyan-500/10 bg-dark-950/30',
      badge: 'cyber-glass border border-cyan-500/20 text-cyan-400/60',
    },
  };

  return (
    <div className="space-y-6">
      <div>
        <div className='flex items-center space-x-3'>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green relative inline-block">
            One-Time Rewards
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-neon-green/20 blur-xl -z-10" />
          </h1>
          <Gift size={20} className="text-white" />
        </div>
        <p className="text-cyan-300/90 mt-1">Achievement milestones with bonus rewards</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/40 text-red-200 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}
      {loading && (
        <div className="text-sm text-cyan-200 flex items-center gap-2"><AlertCircle size={16} /> Syncing one-time rewards…</div>
      )}

      {isFallback && !loading && !error && (
        <div className="text-xs text-cyan-300/70">Live reward data is unavailable; connect your wallet to load dynamic milestone totals.</div>
      )}

      {/* Removed Team Business, Qualified, Level 1, Level 2, Beyond summary boxes and table (already exists in Volume Distribution table) */}

      {/* Enhanced Ticket Boxes - 4 boxes */}
      <div className="grid md:grid-cols-4 gap-4">
        {/* Total Rewards */}
        <div className="cyber-glass border border-cyan-500/40 rounded-2xl p-5 text-white relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-neon-purple/10 opacity-50 group-hover:opacity-70 transition-opacity" />
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/70 to-transparent" />
          <div className="flex items-center gap-3 mb-3 relative z-10">
            <div className="p-2 cyber-glass border border-cyan-500/30 rounded-lg backdrop-blur-sm">
              <TrendingUp size={20} className="text-cyan-400" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-cyan-400">
                Total Rewards
              </p>
              <p className="text-[10px] opacity-75">All milestones</p>
            </div>
          </div>
          <p className="text-3xl font-bold mb-1 relative z-10 text-cyan-300">
            {formatUSD(totalRewardUsd)}
          </p>
          <p className="text-[10px] opacity-90 relative z-10 text-cyan-200">
            {totalMilestones} milestones available
          </p>
        </div>

        {/* Claimed Rewards */}
        <div className="cyber-glass rounded-xl p-5 border border-neon-green/40 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-neon-green/10 to-cyan-500/10 opacity-50 group-hover:opacity-70 transition-opacity" />
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon-green/70 to-transparent" />
          <div className="flex items-center gap-3 mb-3 relative z-10">
            <div className="p-2 cyber-glass border border-neon-green/30 rounded-lg">
              <CheckCircle className="text-neon-green" size={20} />
            </div>
            <div>
              <p className="text-xs font-medium text-neon-green uppercase tracking-wide">
                Claimed
              </p>
              <p className="text-[10px] text-cyan-300/80">{claimedCount} milestones</p>
            </div>
          </div>
          <p className="text-3xl font-bold text-neon-green relative z-10">
            {formatUSD(totalEarnedUsd)}
          </p>
          <p className="text-[10px] text-cyan-300/70 mt-1 relative z-10">
            ≈ {formatRAMA(totalEarnedRama)} RAMA
          </p>
        </div>

        {/* Unclaimed Rewards */}
        <div className="cyber-glass rounded-xl p-5 border border-neon-purple/40 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/10 to-cyan-500/10 opacity-50 group-hover:opacity-70 transition-opacity" />
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon-purple/70 to-transparent" />
          <div className="flex items-center gap-3 mb-3 relative z-10">
            <div className="p-2 cyber-glass border border-neon-purple/30 rounded-lg">
              <Lock className="text-neon-purple" size={20} />
            </div>
            <div>
              <p className="text-xs font-medium text-neon-purple uppercase tracking-wide">
                Unclaimed
              </p>
              <p className="text-[10px] text-cyan-300/80">Not yet claimed</p>
            </div>
          </div>
          <p className="text-3xl font-bold text-neon-purple relative z-10">
            {formatUSD(unclaimedUsd)}
          </p>
          <p className="text-[10px] text-cyan-300/70 mt-1 relative z-10">
            {achievedCount - claimedCount} available to claim
          </p>
        </div>

        {/* Hold/Pending Rewards */}
        <div className="cyber-glass rounded-xl p-5 border border-yellow-500/40 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 opacity-50 group-hover:opacity-70 transition-opacity" />
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-yellow-500/70 to-transparent" />
          <div className="flex items-center gap-3 mb-3 relative z-10">
            <div className="p-2 cyber-glass border border-yellow-500/30 rounded-lg">
              <Award className="text-yellow-400" size={20} />
            </div>
            <div>
              <p className="text-xs font-medium text-yellow-400 uppercase tracking-wide">
                Hold Reward
              </p>
              <p className="text-[10px] text-cyan-300/80">Pending activation</p>
            </div>
          </div>
          <p className="text-3xl font-bold text-yellow-400 relative z-10">
            {formatUSD(holdRewardUsd)}
          </p>
          <p className="text-[10px] text-cyan-300/80 mt-2 relative z-10">
            Hold rewards appear here once post-cap bonuses accrue while portfolios are inactive.
          </p>
          {holdRewardUsd > 0 && canClaim && (
            <button
              onClick={handleClaimReward}
              disabled={isClaiming || isTxPending}
              className="mt-2 w-full px-3 py-1.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-dark-950 rounded-lg text-xs font-bold hover:shadow-lg hover:shadow-yellow-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed relative z-10"
            >
              {isClaiming || isTxPending ? 'Claiming...' : 'Claim Now'}
            </button>
          )}
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
                  Real-time business volume tracking from SlabManager
                </p>
              </div>
            </div>
            <div className="relative z-10">
              <VolumeAnalytics userAddress={userAddress} showDetailed={true} maxLegs={8} />
            </div>
          </div>
        </div>
      )}

      {claimError && (
        <div className="bg-red-500/10 border border-red-500/40 text-red-200 rounded-xl px-4 py-3 text-sm">
          {claimError}
        </div>
      )}

      {/* Claimed History Table */}
      {userAddress && claimHistory.length > 0 && (
        <div className="cyber-glass rounded-2xl p-6 border border-cyan-500/30 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <h2 className="text-lg font-semibold text-cyan-300 mb-4 uppercase tracking-wide flex items-center gap-2">
            <DollarSign size={20} />
            Claimed History
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cyan-500/20">
                  <th className="text-left py-3 px-2 text-cyan-400 font-medium">Milestone</th>
                  <th className="text-left py-3 px-2 text-cyan-400 font-medium">USD Reward</th>
                  <th className="text-left py-3 px-2 text-cyan-400 font-medium">RAMA Amount</th>
                  <th className="text-left py-3 px-2 text-cyan-400 font-medium">Qualified At</th>
                  <th className="text-left py-3 px-2 text-cyan-400 font-medium">Claimed At</th>
                </tr>
              </thead>
              <tbody>
                {claimHistory.map((claim) => (
                  <tr key={claim.id} className="border-b border-cyan-500/10 hover:bg-cyan-500/5 transition-colors">
                    <td className="py-3 px-2 text-cyan-200">{claim.milestoneName}</td>
                    <td className="py-3 px-2 text-neon-green font-semibold">{formatUSD(claim.usdReward)}</td>
                    <td className="py-3 px-2 text-cyan-300">{formatRAMA(claim.ramaAmount)} RAMA</td>
                    <td className="py-3 px-2 text-cyan-300/80">{formatUSD(claim.qualifiedUsdAt)}</td>
                    <td className="py-3 px-2 text-cyan-300/80 text-xs">
                      {claim.claimedAt > 0 ? new Date(claim.claimedAt * 1000).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {loadingHistory && (
            <div className="text-xs text-cyan-300/70 mt-2 text-center">Loading history...</div>
          )}
        </div>
      )}

      <div className="cyber-glass rounded-2xl p-6 border border-cyan-500/30 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        <h2 className="text-lg font-semibold text-cyan-300 mb-6 uppercase tracking-wide">
          Milestone Progress
        </h2>

        <p className="text-sm text-cyan-300/80 mb-4">
          Qualified volume: {qualifiedVolumeDisplay}
        </p>

        <div className="space-y-4">
          {milestones.map((reward, idx) => {
            const statusKey =
              reward.status ??
              (reward.claimed
                ? 'claimed'
                : reward.claimable
                ? 'claimable'
                : reward.unlocked
                ? 'unlocked'
                : 'locked');
            const statusMeta = STATUS_META[statusKey] ?? STATUS_META.locked;
            const containerClass = `cyber-glass rounded-xl p-4 transition-all border ${statusMeta.card}`;
            const achievedAtLabel =
              reward.achievedAt && Number(reward.achievedAt) > 0
                ? new Date(Number(reward.achievedAt) * 1000).toLocaleString()
                : null;
            const rawProgress =
              Number.isFinite(reward.progressPct) && reward.progressPct >= 0
                ? reward.progressPct
                : reward.thresholdUsd > 0
                ? (Number(qualifiedVolume) / Number(reward.thresholdUsd)) * 100
                : 0;
            const progressPct = Math.min(100, Math.max(0, rawProgress));

            return (
              <div key={reward.idx} className={containerClass}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                      <span className="text-lg font-semibold text-cyan-300">
                        {idx + 1}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-cyan-200 uppercase tracking-wide">
                        {reward.name ?? `Milestone ${idx + 1}`}
                      </p>
                      <p className="text-xs text-cyan-300/70">
                        Required Volume: {formatUSD(reward.thresholdUsd)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right space-y-2">
                    <p
                      className={`text-xs font-medium lg:text-2xl font-bold ${
                        statusKey === 'claimed'
                          ? 'text-neon-green'
                          : statusKey === 'locked'
                          ? 'text-cyan-400/50'
                          : 'text-cyan-300'
                      }`}
                    >
                      {formatUSD(reward.rewardUsd)}
                    </p>
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusMeta.badge}`}
                    >
                      {statusKey === 'claimed' ? (
                        <CheckCircle size={14} />
                      ) : statusKey === 'locked' ? (
                        <Lock size={14} />
                      ) : null}
                      {statusMeta.label}
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
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-neon-green transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-cyan-300/70 mt-2">
                    Current qualified volume:{' '}
                    {isFallback ? '—' : formatUSD(qualifiedVolume)} /{' '}
                    {formatUSD(reward.thresholdUsd)}
                  </p>
                  {achievedAtLabel && (
                    <p className="text-[11px] text-cyan-300/70 mt-1 flex items-center gap-1">
                      <Clock size={12} />
                      Achieved {achievedAtLabel}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="cyber-glass rounded-2xl p-6 border border-cyan-500/30 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <h3 className="font-semibold text-cyan-300 mb-4 uppercase tracking-wide">
            How It Works
          </h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-neon-green/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-cyan-300">1</span>
              </div>
              <div>
                <p className="text-sm font-medium text-cyan-300">
                  Build Qualified Volume
                </p>
                <p className="text-xs text-cyan-300/90">
                  Grow your team using adaptive leg caps—strongest leg up to 40%, each additional leg up to 30% until targets are satisfied.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-neon-green/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-cyan-300">2</span>
              </div>
              <div>
                <p className="text-sm font-medium text-cyan-300">
                  Reach Milestones
                </p>
                <p className="text-xs text-cyan-300/90">
                  Unlock rewards as your qualified volume crosses each milestone threshold.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-neon-green/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-cyan-300">3</span>
              </div>
              <div>
                <p className="text-sm font-medium text-cyan-300">Claim Rewards</p>
                <p className="text-xs text-cyan-300/90">
                  Claim one-time bonuses directly to your wallet once each milestone unlocks.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="cyber-glass rounded-2xl p-6 border border-cyan-500/30 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <h3 className="font-semibold text-cyan-300 mb-4 uppercase tracking-wide">
            Tips for Faster Progress
          </h3>
          <ul className="space-y-3 text-xs text-cyan-300/90">
            <li>• Maintain consistent team volume so no leg hits the 40% / 30% caps too early.</li>
            <li>• Track qualified volume in the dashboard to see which milestones are approaching.</li>
            <li>• Encourage your directs to reach slab levels faster to unlock higher milestones.</li>
            <li>• Reinvest pending rewards or claim to Safe Wallet for 0% fee restaking.</li>
          </ul>
        </div>
      </div>

      {/* Progressive Transaction Modal */}
      <ProgressiveTransactionModal
        isOpen={showProgressModal}
        onClose={handleModalClose}
        txHash={txHash}
        title="Claim One-Time Rewards"
        description="Claiming your milestone rewards"
        successMessage="Your rewards have been claimed successfully!"
        onSuccess={handleTransactionSuccess}
        amount={rewardTotals?.pendingUsd ? formatUSD(rewardTotals.pendingUsd) : null}
        amountLabel="Claiming Amount"
      />
    </div>
  );
}
