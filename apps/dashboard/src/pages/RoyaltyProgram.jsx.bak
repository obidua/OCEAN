import { useEffect, useMemo, useState } from 'react';
import { Trophy, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useStore } from '../../store/useUserInfoStore';
import {
  ROYALTY_LEVELS,
  formatUSD,
  formatRAMA,
} from '../utils/contractData';

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

const parseMonthEpoch = (value) => {
  if (!value) return '—';
  const str = String(value);
  if (str.length === 6) {
    const year = str.slice(0, 4);
    const month = str.slice(4);
    return `${year}-${month}`;
  }
  if (value > 1e9 && value < 1e13) {
    try {
      return new Date(Number(value) * 1000).toLocaleDateString();
    } catch (err) {
      return str;
    }
  }
  return str;
};

export default function RoyaltyProgram() {
  const userAddress = localStorage.getItem('userAddress') ;
  const [royaltyDetails, setRoyaltyDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getRoyaltyOverview = useStore((s) => s.getRoyaltyOverview);

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

        console.log(res)
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
  const nextClaimLabel = canClaim
    ? 'Ready Now'
    : nextMonthEpoch
    ? parseMonthEpoch(nextMonthEpoch)
    : 'Not Ready';

  const payoutProgress = Math.min(100, (payoutsReceived % 12) * (100 / 12));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green relative inline-block">
          Royalty Program
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-neon-green/20 blur-xl -z-10" />
        </h1>
        <p className="text-cyan-300/90 mt-1">
          Monthly recurring rewards for top performers
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/40 text-red-200 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}
      {loading && (
        <div className="text-sm text-cyan-200 flex items-center gap-2">
          <AlertCircle size={16} /> Syncing royalty data…
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="cyber-glass border border-neon-orange/50 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Trophy size={24} />
            </div>
            <div>
              <p className="text-sm opacity-90">Current Level</p>
              <p className="text-xs opacity-75">Your royalty tier</p>
            </div>
          </div>
          <p className="text-5xl font-bold mb-2">{currentLevel}</p>
          {currentTier && (
            <p className="text-lg opacity-90">
              {formatUSD(currentTier.monthlyUsd)} / month
            </p>
          )}
        </div>

        <div className="cyber-glass rounded-xl p-6 border border-cyan-500/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 cyber-glass border border-neon-green/20 rounded-lg">
              <CheckCircle className="text-neon-green" size={20} />
            </div>
            <div>
              <p className="text-sm font-medium text-cyan-300">Payouts Received</p>
              <p className="text-xs text-cyan-300/90">Lifetime</p>
            </div>
          </div>
          <p className="text-2xl font-bold text-cyan-300">{payoutsReceived}</p>
          <div className="mt-3 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-teal-600"
              style={{ width: `${payoutProgress}%` }}
            />
          </div>
        </div>

        <div className="cyber-glass rounded-xl p-6 border border-cyan-500/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 cyber-glass border border-cyan-500/20 rounded-lg">
              <Clock className="text-cyan-400" size={20} />
            </div>
            <div>
              <p className="text-sm font-medium text-cyan-300">Next Claim</p>
              <p className="text-xs text-cyan-300/90">Monthly eligibility</p>
            </div>
          </div>
          <p className="text-lg font-bold text-cyan-300">{nextClaimLabel}</p>
          {canClaim && (
            <button className="mt-3 w-full py-2 bg-gradient-to-r from-cyan-500 to-neon-green text-white rounded-lg text-sm font-medium">
              Claim Royalty
            </button>
          )}
          {!canClaim && paused && (
            <p className="text-xs text-neon-orange mt-3">
              Royalty payouts are currently paused.
            </p>
          )}
          <p className="text-xs text-cyan-300/70 mt-3">
            Pending royalty: {formatUSD(royaltyIncomeUsd)} • {formatRAMA(royaltyIncomeRama)} RAMA
          </p>
        </div>
      </div>

      <div className="cyber-glass rounded-2xl p-6 border border-cyan-500/30">
        <h2 className="text-lg font-semibold text-cyan-300 mb-4">
          Royalty Tiers
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
          <h3 className="font-semibold text-cyan-300 mb-4">Program Rules</h3>
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
    </div>
  );
}