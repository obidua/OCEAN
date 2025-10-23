import { useEffect, useMemo, useState } from 'react';
import {
  Award,
  TrendingUp,
  Users,
  AlertCircle,
  Layers,
  ArrowDown,
} from 'lucide-react';
import { useStore } from '../../store/useUserInfoStore';
import {
  SLAB_LEVELS,
  formatUSD,
  formatPercentage,
  formatRAMA,
} from '../utils/contractData';

const SLAB_TIER_NAMES = [
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

const WAVE_META = [
  { key: 'L1', label: 'First Wave (You earn 10%)', badge: 'W1', color: 'neon-purple' },
  { key: 'L2', label: 'Second Wave (You earn 5%)', badge: 'W2', color: 'cyan-500' },
  { key: 'L3', label: 'Third Wave (You earn 5%)', badge: 'W3', color: 'neon-green' },
];

export default function SlabIncome() {
  const userAddress = localStorage.getItem('userAddress');
  const [slabDetails, setSlabDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getSlabIncomeOverview = useStore((s) => s.getSlabIncomeOverview);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!userAddress) {
        setSlabDetails(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await getSlabIncomeOverview(userAddress);
        console.log(res)
        if (!cancelled) setSlabDetails(res);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError(err?.message || 'Unable to load slab income data.');
          setSlabDetails(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [userAddress, getSlabIncomeOverview]);

  const slabLevel = Number(slabDetails?.slabAchiev?.slabAchievements.length ?? 0);
  const qualifiedVolumeUsd = parseFloat(slabDetails?.qualifiedVolumeUsd)/1e6 ;
  const directs = parseFloat(slabDetails?.directs)/1e6;
  const canClaim = slabDetails?.canClaim ?? false;
  const slabIncomeUsd = slabDetails?.slabIncomeUsd ?? 0;
  const slabIncomeRama = slabDetails?.slabIncomeRama ?? 0;
  const slabIncomeAvailableUsd = slabDetails?.slabIncomeAvailableUsd ?? 0;
  const slabIncomeAvailableRama = slabDetails?.slabIncomeAvailableRama ?? 0;
  const overrideIncomeUsd = slabDetails?.overrideIncomeUsd ?? 0;
  const overrideIncomeRama = slabDetails?.overrideIncomeRama ?? 0;

  const overrideL1 = Number(slabDetails?.OverrideEarnings?.l1 ?? 0);
  const overrideL2 = Number(slabDetails?.OverrideEarnings?.l2 ?? 0);
  const overrideL3 = Number(slabDetails?.OverrideEarnings?.l3 ?? 0);
  const overrideL1Usd = slabDetails?.OverrideEarnings?.l1Usd ?? 0;
  const overrideL2Usd = slabDetails?.OverrideEarnings?.l2Usd ?? 0;
  const overrideL3Usd = slabDetails?.OverrideEarnings?.l3Usd ?? 0;

  const totalOverrideRama = overrideL1 + overrideL2 + overrideL3;
  const totalOverrideUsd = overrideL1Usd + overrideL2Usd + overrideL3Usd;

  const sameSlabPartners = slabDetails?.sameSlabPartners ?? {
    firstWave: [],
    secondWave: [],
    thirdWave: [],
  };

  const waveEntries = useMemo(() => {
    const build = (addresses = [], totalRama) => {
      const count = addresses.length || 1;
      const perPartner = totalRama / count;
      return addresses.map((address) => ({ address, earned: perPartner }));
    };
    return {
      L1: build(sameSlabPartners.firstWave, overrideL1),
      L2: build(sameSlabPartners.secondWave, overrideL2),
      L3: build(sameSlabPartners.thirdWave, overrideL3),
    };
  }, [sameSlabPartners, overrideL1, overrideL2, overrideL3]);

  const slabStatusLabel = canClaim ? 'Ready to Claim' : 'Cooldown';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green relative inline-block">
          Slab Income System
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-neon-green/20 blur-xl -z-10" />
        </h1>
        <p className="text-cyan-300/90 mt-1">
          Earn difference income from your team's growth
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/40 text-red-200 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}
      {loading && (
        <div className="text-sm text-cyan-200 flex items-center gap-2">
          <AlertCircle size={16} /> Syncing slab data…
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="cyber-glass border border-neon-green/50 rounded-2xl p-6 text-white relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-neon-green/10 to-cyan-500/10 opacity-50 group-hover:opacity-70 transition-opacity" />
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon-green/70 to-transparent" />
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="p-2 bg-neon-green/20 rounded-lg backdrop-blur-sm border border-neon-green/30">
              <Award size={24} className="text-neon-green" />
            </div>
            <div>
              <p className="text-sm text-neon-green font-medium uppercase tracking-wide">
                Current Slab Level
              </p>
              <p className="text-xs text-cyan-300/90">Your qualification tier</p>
            </div>
          </div>
          <p className="text-5xl font-bold mb-2 text-neon-green relative z-10">
            {slabLevel || '—'}
          </p>
          <p className="text-lg text-cyan-300 relative z-10">
            {slabLevel > 0 && SLAB_LEVELS[slabLevel - 1]
              ? `${formatPercentage(
                  SLAB_LEVELS[slabLevel - 1].percentageBPS
                )} Income Share`
              : '—'}
          </p>
        </div>

        <div className="cyber-glass border border-cyan-500/40 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-neon-green/10 opacity-40" />
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="p-2 bg-cyan-500/20 rounded-lg border border-cyan-500/30">
              <TrendingUp size={22} className="text-cyan-400" />
            </div>
            <div>
              <p className="text-sm text-cyan-300 font-medium uppercase tracking-wide">
                Qualified Volume
              </p>
              <p className="text-xs text-cyan-300/80">Business counted towards slabs</p>
            </div>
          </div>
          <p className="text-3xl font-bold text-cyan-300 relative z-10">
            {formatUSD(qualifiedVolumeUsd)}
          </p>
          <p className="text-xs text-cyan-300/80 relative z-10">
            {directs} direct referrals • Status: {slabStatusLabel}
          </p>
        </div>

        <div className="cyber-glass border border-neon-orange/40 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-neon-orange/10 to-neon-pink/10 opacity-40" />
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-neon-orange/20 rounded-lg border border-neon-orange/30">
                <Users size={22} className="text-neon-orange" />
              </div>
              <div>
                <p className="text-sm text-neon-orange font-medium uppercase tracking-wide">
                  Slab Income
                </p>
                <p className="text-xs text-cyan-300/80">Pending & claimable amounts</p>
              </div>
            </div>
          </div>
          <p className="text-sm text-cyan-300/80 relative z-10">
            Total: <span className="font-semibold text-neon-orange">{formatUSD(slabIncomeUsd)}</span> ≈ {formatRAMA(slabIncomeRama)} RAMA
          </p>
          <p className="text-sm text-cyan-300/80 relative z-10 mt-1">
            Available now: <span className="font-semibold text-neon-orange">{formatUSD(slabIncomeAvailableUsd)}</span> ≈ {formatRAMA(slabIncomeAvailableRama)} RAMA
          </p>
          <p className="text-xs text-cyan-300/70 relative z-10 mt-2">
            Same-slab override pending: {formatUSD(overrideIncomeUsd)} • {formatRAMA(overrideIncomeRama)} RAMA
          </p>
        </div>
      </div>

      <div className="cyber-glass rounded-2xl p-6 border-2 border-neon-purple relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon-purple/50 to-transparent" />
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div className="flex items-center gap-3">
            <Layers size={24} className="text-neon-purple" />
            <div>
              <h2 className="text-lg font-semibold text-neon-purple uppercase tracking-wide">
                Same Slab Override Earnings
              </h2>
              <p className="text-xs text-cyan-300/90 mt-1">
                Earn from your downline members in the same slab (20% of the 60% pool)
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-cyan-300/90">Total Earned</p>
            <p className="text-2xl font-bold text-neon-purple">
              {formatRAMA(totalOverrideRama)} RAMA
            </p>
            <p className="text-[11px] text-cyan-300/70">
              ≈ {formatUSD(totalOverrideUsd)}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6 relative z-10">
          <div className="cyber-glass border-2 border-neon-purple rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ArrowDown size={16} className="text-neon-purple" />
                <span className="text-sm font-semibold text-neon-purple">
                  First Wave (10%)
                </span>
              </div>
              <span className="text-xs bg-neon-purple/20 text-neon-purple px-2 py-1 rounded">
                {sameSlabPartners.firstWave?.length ?? 0} Members
              </span>
            </div>
            <p className="text-2xl font-bold text-cyan-300">
              {formatRAMA(overrideL1)} RAMA
            </p>
            <p className="text-xs text-cyan-300/90 mt-1">Primary same-slab partners</p>
          </div>

          <div className="cyber-glass border-2 border-cyan-500 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ArrowDown size={16} className="text-cyan-400" />
                <span className="text-sm font-semibold text-cyan-400">
                  Second Wave (5%)
                </span>
              </div>
              <span className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded">
                {sameSlabPartners.secondWave?.length ?? 0} Members
              </span>
            </div>
            <p className="text-2xl font-bold text-cyan-300">
              {formatRAMA(overrideL2)} RAMA
            </p>
            <p className="text-xs text-cyan-300/90 mt-1">Extended same-slab partners</p>
          </div>

          <div className="cyber-glass border-2 border-neon-green rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ArrowDown size={16} className="text-neon-green" />
                <span className="text-sm font-semibold text-neon-green">
                  Third Wave (5%)
                </span>
              </div>
              <span className="text-xs bg-neon-green/20 text-neon-green px-2 py-1 rounded">
                {sameSlabPartners.thirdWave?.length ?? 0} Members
              </span>
            </div>
            <p className="text-2xl font-bold text-cyan-300">
              {formatRAMA(overrideL3)} RAMA
            </p>
            <p className="text-xs text-cyan-300/90 mt-1">Deep same-slab partners</p>
          </div>
        </div>

        <div className="space-y-4 relative z-10">
          <h3 className="text-sm font-semibold text-cyan-300 uppercase tracking-wide">
            Earnings Breakdown
          </h3>

          {WAVE_META.map(({ key, label, badge, color }) => {
            const entries = waveEntries[key];
            if (!entries?.length) return null;
            const badgeClasses =
              color === 'neon-purple'
                ? 'bg-neon-purple/20 text-neon-purple'
                : color === 'cyan-500'
                ? 'bg-cyan-500/20 text-cyan-300'
                : 'bg-neon-green/20 text-neon-green';
            const borderClasses =
              color === 'neon-purple'
                ? 'border-neon-purple/20'
                : color === 'cyan-500'
                ? 'border-cyan-500/20'
                : 'border-neon-green/20';
            const textClasses =
              color === 'neon-purple'
                ? 'text-neon-purple'
                : color === 'cyan-500'
                ? 'text-cyan-400'
                : 'text-neon-green';

            return (
              <div key={key} className={`cyber-glass border ${borderClasses} rounded-lg p-4`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${badgeClasses}`}>
                    <span className="text-sm font-bold">{badge}</span>
                  </div>
                  <span className={`text-sm font-medium ${textClasses}`}>{label}</span>
                </div>
                <div className="space-y-2">
                  {entries.map((member, idx) => (
                    <div
                      key={`${key}-${member.address}-${idx}`}
                      className="flex items-center justify-between p-3 cyber-glass border border-cyan-500/10 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <code className="text-xs font-mono text-cyan-300">
                          {member.address.slice(0, 10)}…{member.address.slice(-6)}
                        </code>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${textClasses}`}>
                          +{formatRAMA(member.earned)} RAMA
                        </p>
                        <p className="text-xs text-cyan-300/90">Share of override</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {(!waveEntries.L1.length && !waveEntries.L2.length && !waveEntries.L3.length) && (
            <div className="text-sm text-cyan-300/70">
              No same-slab partner data available yet.
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 p-4 bg-neon-purple/5 border border-neon-purple/20 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-neon-purple flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-neon-purple mb-2">
              How Same Slab Override Works
            </p>
            <ul className="text-xs text-cyan-300/90 space-y-1">
              <li>• When your downline members in the same slab claim growth to external wallet, you earn override bonuses</li>
              <li>• Override is paid from 20% of the 60% slab pool distribution</li>
              <li>• First Wave partners in same slab generate 10% override for you</li>
              <li>• Second Wave partners in same slab generate 5% override for you</li>
              <li>• Third Wave partners in same slab generate 5% override for you</li>
              <li>• Override earnings can be claimed to your Main Wallet or Safe Wallet</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="cyber-glass rounded-2xl p-6 border-2 border-neon-green">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-neon-green mb-2 uppercase tracking-wide">
            Complete Slab Income Structure
          </h2>
          <p className="text-sm text-cyan-300/90">
            Slab Income is based on <span className="text-neon-green font-semibold">difference income</span> - you earn the percentage difference between your slab level and your team member's slab level on their business volume.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <div className="cyber-glass border border-cyan-500/30 rounded-xl p-4">
            <h3 className="text-base font-bold text-cyan-300 mb-3">How Difference Income Works</h3>
            <div className="space-y-2 text-sm">
              <p className="text-cyan-300"><span className="text-neon-green font-semibold">Example:</span></p>
              <p className="text-cyan-300">• You are at Slab {slabLevel || '—'} and earn {slabLevel > 0 && SLAB_LEVELS[slabLevel - 1] ? formatPercentage(SLAB_LEVELS[slabLevel - 1].percentageBPS) : '—'} daily on qualified volume.</p>
              <p className="text-cyan-300">• If your direct partner is one slab lower, you earn the percentage difference on their business volume.</p>
              <p className="text-cyan-300">• Example: You at 15%, your partner at 10% → you earn 5% on their new business volume.</p>
            </div>
          </div>

          <div className="cyber-glass border border-cyan-500/30 rounded-xl p-4">
            <h3 className="text-base font-bold text-cyan-300 mb-3">Key Highlights</h3>
            <ul className="space-y-2 text-sm text-cyan-300/90">
              <li>• Required qualified volume builds using the 40:30:30 leg balancing rule.</li>
              <li>• You need a minimum number of direct referrals at each slab tier.</li>
              <li>• Slab income can be claimed daily when you meet the qualification requirements.</li>
            </ul>
          </div>
        </div>

        <div className="overflow-x-auto bg-dark-950/40 rounded-xl border border-cyan-500/20">
          <table className="min-w-full text-left text-cyan-200 text-sm">
            <thead className="uppercase text-xs text-cyan-300/70 border-b border-cyan-500/20">
              <tr>
                <th className="py-3 px-4">Level</th>
                <th className="py-3 px-4">Tier Name</th>
                <th className="py-3 px-4">Qualified Volume</th>
                <th className="py-3 px-4">Income Share</th>
                <th className="py-3 px-4">Directs Required</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {SLAB_LEVELS.map((slab, idx) => {
                const slabNum = idx + 1;
                const isCurrent = slabNum === slabLevel;
                const isAchieved = slabNum < slabLevel;
                return (
                  <tr
                    key={slabNum}
                    className={`border-b border-cyan-500/10 transition-colors ${
                      isCurrent
                        ? 'bg-neon-green/5 hover:bg-neon-green/10'
                        : isAchieved
                        ? 'bg-emerald-500/5 hover:bg-emerald-500/10'
                        : 'hover:bg-cyan-500/5'
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                          isCurrent
                            ? 'bg-gradient-to-br from-neon-green to-cyan-500 text-dark-950'
                            : isAchieved
                            ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white'
                            : 'cyber-glass border border-cyan-500/30 text-cyan-300/50'
                        }`}
                      >
                        {slabNum}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-semibold ${
                          isCurrent
                            ? 'text-neon-green'
                            : isAchieved
                            ? 'text-emerald-400'
                            : 'text-cyan-300/50'
                        }`}
                      >
                        {SLAB_TIER_NAMES[idx]}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-cyan-300">
                      {formatUSD(slab.requiredVolumeUSD)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-bold text-lg ${
                          isCurrent
                            ? 'text-neon-green'
                            : isAchieved
                            ? 'text-emerald-400'
                            : 'text-cyan-300/50'
                        }`}
                      >
                        {formatPercentage(slab.percentageBPS)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-cyan-300">{slab.minDirects}</td>
                    <td className="py-3 px-4">
                      {isCurrent ? (
                        <span className="px-3 py-1 bg-gradient-to-r from-neon-green to-cyan-500 text-dark-950 rounded-full text-xs font-bold">
                          Current Level
                        </span>
                      ) : isAchieved ? (
                        <span className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-full text-xs font-bold">
                          Achieved
                        </span>
                      ) : (
                        <span className="px-3 py-1 cyber-glass border border-cyan-500/30 text-cyan-300/50 rounded-full text-xs font-medium">
                          Locked
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 cyber-glass border border-neon-purple/30 rounded-xl p-4">
          <h3 className="text-base font-bold text-neon-purple mb-3">
            Same-Slab Override Bonus
          </h3>
          <p className="text-sm text-cyan-300 mb-3">
            When your team members reach the same slab level as you, you earn special override bonuses:
          </p>
          <div className="grid md:grid-cols-3 gap-3">
            <div className="bg-dark-950/50 rounded-lg p-3">
              <p className="text-neon-purple font-semibold text-sm">1st Occurrence</p>
              <p className="text-xl font-bold text-neon-purple">10%</p>
              <p className="text-xs text-cyan-300/70">First same-slab partner</p>
            </div>
            <div className="bg-dark-950/50 rounded-lg p-3">
              <p className="text-neon-purple font-semibold text-sm">2nd Occurrence</p>
              <p className="text-xl font-bold text-neon-purple">5%</p>
              <p className="text-xs text-cyan-300/70">Second same-slab partner</p>
            </div>
            <div className="bg-dark-950/50 rounded-lg p-3">
              <p className="text-neon-purple font-semibold text-sm">3rd+ Occurrence</p>
              <p className="text-xl font-bold text-neon-purple">5%</p>
              <p className="text-xs text-cyan-300/70">All additional partners</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}