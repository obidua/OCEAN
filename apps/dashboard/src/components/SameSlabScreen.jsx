import React, { useMemo } from "react";
import {
  SLAB_LEVELS,
  formatUSD,
  formatPercentage,
  formatRAMA,
} from "../utils/contractData";
import { AlertCircle, ArrowDown, Layers } from "lucide-react";

const WAVE_META = [
  {
    key: "L1",
    label: "First Wave (You earn 10%)",
    badge: "W1",
    color: "neon-purple",
  },
  {
    key: "L2",
    label: "Second Wave (You earn 5%)",
    badge: "W2",
    color: "cyan-500",
  },
  {
    key: "L3",
    label: "Third Wave (You earn 5%)",
    badge: "W3",
    color: "neon-green",
  },
];

const SameSlabScreen = ({ SameSlabData }) => {
  const {
    totalOverrideRama,
    totalOverrideUsd,
    sameSlabPartners,
    overrideL1,
    overrideL2,
    overrideL3,
  } = SameSlabData;

  const waveEntries = useMemo(() => {
    const build = (addresses = [], totalRama) => {
      const count = addresses.length || 1;
      const perPartner = totalRama / count;
      return addresses.map((address) => ({ address, earned: perPartner }));
    };
    return {
      L1: build(sameSlabPartners?.firstWave, overrideL1),
      L2: build(sameSlabPartners?.secondWave, overrideL2),
      L3: build(sameSlabPartners?.thirdWave, overrideL3),
    };
  }, [sameSlabPartners, overrideL1, overrideL2, overrideL3]);

  return (
    <div>
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
                Earn from your downline members in the same slab (20% of the 60%
                pool)
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
                {sameSlabPartners?.firstWave?.length ?? 0} Members
              </span>
            </div>
            <p className="text-2xl font-bold text-cyan-300">
              {formatRAMA(overrideL1)} RAMA
            </p>
            <p className="text-xs text-cyan-300/90 mt-1">
              Primary same-slab partners
            </p>
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
                {sameSlabPartners?.secondWave?.length ?? 0} Members
              </span>
            </div>
            <p className="text-2xl font-bold text-cyan-300">
              {formatRAMA(overrideL2)} RAMA
            </p>
            <p className="text-xs text-cyan-300/90 mt-1">
              Extended same-slab partners
            </p>
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
                {sameSlabPartners?.thirdWave?.length ?? 0} Members
              </span>
            </div>
            <p className="text-2xl font-bold text-cyan-300">
              {formatRAMA(overrideL3)} RAMA
            </p>
            <p className="text-xs text-cyan-300/90 mt-1">
              Deep same-slab partners
            </p>
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
              color === "neon-purple"
                ? "bg-neon-purple/20 text-neon-purple"
                : color === "cyan-500"
                ? "bg-cyan-500/20 text-cyan-300"
                : "bg-neon-green/20 text-neon-green";
            const borderClasses =
              color === "neon-purple"
                ? "border-neon-purple/20"
                : color === "cyan-500"
                ? "border-cyan-500/20"
                : "border-neon-green/20";
            const textClasses =
              color === "neon-purple"
                ? "text-neon-purple"
                : color === "cyan-500"
                ? "text-cyan-400"
                : "text-neon-green";

            return (
              <div
                key={key}
                className={`cyber-glass border ${borderClasses} rounded-lg p-4`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${badgeClasses}`}
                  >
                    <span className="text-sm font-bold">{badge}</span>
                  </div>
                  <span className={`text-sm font-medium ${textClasses}`}>
                    {label}
                  </span>
                </div>
                <div className="space-y-2">
                  {entries.map((member, idx) => (
                    <div
                      key={`${key}-${member.address}-${idx}`}
                      className="flex items-center justify-between p-3 cyber-glass border border-cyan-500/10 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <code className="text-xs font-mono text-cyan-300">
                          {member.address.slice(0, 10)}…
                          {member.address.slice(-6)}
                        </code>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${textClasses}`}>
                          +{formatRAMA(member.earned)} RAMA
                        </p>
                        <p className="text-xs text-cyan-300/90">
                          Share of override
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {!waveEntries.L1.length &&
            !waveEntries.L2.length &&
            !waveEntries.L3.length && (
              <div className="text-sm text-cyan-300/70">
                No same-slab partner data available yet.
              </div>
            )}
        </div>
      </div>

      <div className="mt-6 cyber-glass border border-neon-purple/30 rounded-xl p-4">
        <h3 className="text-base font-bold text-neon-purple mb-3">
          Same-Slab Override Bonus
        </h3>
        <p className="text-sm text-cyan-300 mb-3">
          When your team members reach the same slab level as you, you earn
          special override bonuses:
        </p>
        <div className="grid md:grid-cols-3 gap-3">
          <div className="bg-dark-950/50 rounded-lg p-3">
            <p className="text-neon-purple font-semibold text-sm">
              1st Occurrence
            </p>
            <p className="text-xl font-bold text-neon-purple">10%</p>
            <p className="text-xs text-cyan-300/70">First same-slab partner</p>
          </div>
          <div className="bg-dark-950/50 rounded-lg p-3">
            <p className="text-neon-purple font-semibold text-sm">
              2nd Occurrence
            </p>
            <p className="text-xl font-bold text-neon-purple">5%</p>
            <p className="text-xs text-cyan-300/70">Second same-slab partner</p>
          </div>
          <div className="bg-dark-950/50 rounded-lg p-3">
            <p className="text-neon-purple font-semibold text-sm">
              3rd+ Occurrence
            </p>
            <p className="text-xl font-bold text-neon-purple">5%</p>
            <p className="text-xs text-cyan-300/70">All additional partners</p>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-neon-purple/5 border border-neon-purple/20 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle
            size={20}
            className="text-neon-purple flex-shrink-0 mt-0.5"
          />
          <div>
            <p className="text-sm font-medium text-neon-purple mb-2">
              How Same Slab Override Works
            </p>
            <ul className="text-xs text-cyan-300/90 space-y-1">
              <li>
                • When your downline members in the same slab claim growth to
                external wallet, you earn override bonuses
              </li>
              <li>
                • Override is paid from 20% of the 60% slab pool distribution
              </li>
              <li>
                • First Wave partners in same slab generate 10% override for you
              </li>
              <li>
                • Second Wave partners in same slab generate 5% override for you
              </li>
              <li>
                • Third Wave partners in same slab generate 5% override for you
              </li>
              <li>
                • Override earnings can be claimed to your Main Wallet or Safe
                Wallet
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SameSlabScreen;