import { useEffect, useMemo, useState } from 'react';
import { Gift, CheckCircle, Lock, AlertCircle, Clock } from 'lucide-react';
import { useStore } from '../../store/useUserInfoStore';
import { ONE_TIME_REWARDS, formatUSD, formatRAMA } from '../utils/contractData';

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
  const userAddressStore = useStore((s) => s.userAddress);
  const userAddress =
    userAddressStore || (typeof window !== 'undefined' ? localStorage.getItem('userAddress') : null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getOneTimeRewardsOverview = useStore(
    (s) => s.getOneTimeRewardsOverview
  );
  const getGlobalOneTimeMilestones = useStore(
    (s) => s.getGlobalOneTimeMilestones
  );

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
        const res = await getOneTimeRewardsOverview(userAddress);
        if (!cancelled) setOverview(res);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError(err?.message || 'Unable to load one-time reward data.');
          setOverview(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [userAddress, getOneTimeRewardsOverview]);

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

  const milestones = useMemo(
    () =>
      milestonesCore.map((milestone, idx) => ({
        ...milestone,
        name: REWARD_NAMES[idx] ?? `Milestone ${idx + 1}`,
      })),
    [milestonesCore]
  );

  // Treat missing overview as fallback so top tiles display constant-based totals
  const milestoneSource = overview?.milestoneSource ?? 'fallback';
  const isFallback = !overview?.milestones?.length || milestoneSource === 'fallback';

  const totalMilestones = milestones.length;
  const claimedCount =
    overview?.claimedCount ?? milestones.filter((m) => m.claimed).length;
  const achievedCount =
    overview?.achievedCount ?? milestones.filter((m) => m.achieved).length;
  const claimableMilestones = milestones.filter((m) => m.claimable);

  const totalEarnedUsd = overview?.totalEarnedUsd ?? 0;
  const totalEarnedRama = overview?.totalEarnedRama ?? 0;
  const pendingRewardUsd = overview?.pendingRewardUsd ?? 0;
  const pendingRewardRama = overview?.pendingRewardRama ?? 0;
  const qualifiedVolume = overview?.qualifiedVolumeUsd ?? 0;
  const qualifiedVolumeDisplay = isFallback ? '—' : formatUSD(qualifiedVolume);

  // When using fallback milestones, compute a meaningful aggregate for the tiles
  const fallbackTotals = useMemo(() => {
    if (!isFallback) return null;
    const totalPotentialUsd = milestonesCore.reduce(
      (sum, m) => sum + (Number(m?.rewardUsd) || 0),
      0
    );
    return { totalPotentialUsd };
  }, [isFallback, milestonesCore]);

  const remainingUsd = overview?.remainingUsd ?? fallbackTotals?.totalPotentialUsd ?? 0;
  const remainingUsdDisplay = formatUSD(remainingUsd);
  const pendingRewardUsdDisplay = isFallback
    ? formatUSD(fallbackTotals?.totalPotentialUsd ?? 0)
    : formatUSD(pendingRewardUsd);
  const pendingRewardRamaDisplay = isFallback
    ? '—'
    : `${formatRAMA(pendingRewardRama)} RAMA`;

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
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green relative inline-block">
          One-Time Rewards
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-neon-green/20 blur-xl -z-10" />
        </h1>
        <p className="text-cyan-300/90 mt-1">
          Achievement milestones with bonus rewards
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/40 text-red-200 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}
      {loading && (
        <div className="text-sm text-cyan-200 flex items-center gap-2">
          <AlertCircle size={16} /> Syncing one-time rewards…
        </div>
      )}

      {isFallback && !loading && !error && (
        <div className="text-xs text-cyan-300/70">
          Live reward data is unavailable; connect your wallet to load dynamic milestone totals.
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="cyber-glass border border-neon-green/50 rounded-2xl p-6 text-white relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-neon-green/10 to-cyan-500/10 opacity-50 group-hover:opacity-70 transition-opacity" />
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon-green/70 to-transparent" />
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="p-2 cyber-glass border border-neon-green/30 rounded-lg backdrop-blur-sm">
              <Gift size={24} />
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-wide">
                Rewards Claimed
              </p>
              <p className="text-xs opacity-75">Out of {totalMilestones} milestones</p>
            </div>
          </div>
          <p className="text-5xl font-bold mb-2 relative z-10">
            {claimedCount}
          </p>
          <p className="text-sm opacity-90 relative z-10">
            {achievedCount} achieved • {claimableMilestones.length} claimable
          </p>
        </div>

        <div className="cyber-glass rounded-xl p-6 border border-cyan-500/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 cyber-glass border border-cyan-500/30 rounded-lg">
              <CheckCircle className="text-cyan-400" size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-cyan-400 uppercase tracking-wide">
                Total Earned
              </p>
              <p className="text-xs text-cyan-300/90">Claimed rewards</p>
            </div>
          </div>
          <p className="text-3xl font-bold text-neon-green">
            {formatUSD(totalEarnedUsd)}
          </p>
          <p className="text-xs text-cyan-300/80 mt-1">
            ≈ {formatRAMA(totalEarnedRama)} RAMA
          </p>
        </div>

        <div className="cyber-glass rounded-xl p-6 border border-cyan-500/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 cyber-glass border border-neon-purple/30 rounded-lg">
              <Lock className="text-neon-purple" size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-cyan-400 uppercase tracking-wide">
                Remaining Potential
              </p>
              <p className="text-xs text-cyan-300/90">Unclaimed rewards</p>
            </div>
          </div>
          <p className="text-3xl font-bold text-neon-purple">
            {remainingUsdDisplay}
          </p>
          <p className="text-xs text-cyan-300/80 mt-1">
            Pending reward: {pendingRewardUsdDisplay} • {pendingRewardRamaDisplay}
          </p>
        </div>
      </div>

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
                      className={`text-2xl font-bold ${
                        statusKey === 'claimed'
                          ? 'text-neon-green'
                          : statusKey === 'locked'
                          ? 'text-cyan-400/50'
                          : 'text-cyan-300'
                      }`}
                    >
                      {formatUSD(reward.rewardUsd)}
                    </p>
                    {statusKey === 'claimable' ? (
                      <div className="flex flex-col items-end gap-2">
                        <button className="px-3 py-1 bg-gradient-to-r from-cyan-500 to-neon-green text-dark-950 rounded-full text-xs font-bold hover:shadow-neon-cyan transition-all">
                          Claim Now
                        </button>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-cyan-200 border border-white/10">
                          {statusMeta.label}
                        </span>
                      </div>
                    ) : (
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
                    )}
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
                  Grow your team using the 40:30:30 calculation for business volume.
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
            <li>• Maintain consistent team volume in all legs to meet 40:30:30 requirements.</li>
            <li>• Track qualified volume in the dashboard to see which milestones are approaching.</li>
            <li>• Encourage your directs to reach slab levels faster to unlock higher milestones.</li>
            <li>• Reinvest pending rewards or claim to Safe Wallet for 0% fee restaking.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
