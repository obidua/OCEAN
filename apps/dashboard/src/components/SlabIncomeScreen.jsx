import { useEffect, useMemo, useState } from "react";
import {
  Award,
  TrendingUp,
  Users,
  AlertCircle,
  Layers,
  ArrowDown,
  Table,
  LayoutGrid,
} from "lucide-react";
import { useStore } from "../../store/useUserInfoStore";
import {
  SLAB_LEVELS,
  formatUSD,
  formatPercentage,
  formatRAMA,
} from "../utils/contractData";

const SLAB_TIER_NAMES = [
  "Coral Reef",
  "Shallow Waters",
  "Tide Pool",
  "Wave Crest",
  "Open Sea",
  "Deep Current",
  "Ocean Floor",
  "Abyssal Zone",
  "Mariana Trench",
  "Pacific Master",
  "Ocean Sovereign",
];



export default function SlabIncomeScreen({SlabIncomeData}) {
  
    const {error,loading,slabLevel ,qualifiedVolumeUsd,directs,slabStatusLabel,slabIncomeUsd,slabIncomeRama ,slabIncomeAvailableUsd ,slabIncomeAvailableRama,overrideIncomeUsd,overrideIncomeRama}= SlabIncomeData
  return (
    <div className="space-y-6">

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
              <p className="text-xs text-cyan-300/90">
                Your qualification tier
              </p>
            </div>
          </div>
          <p className="text-5xl font-bold mb-2 text-neon-green relative z-10">
            {slabLevel || "—"}
          </p>
          <p className="text-lg text-cyan-300 relative z-10">
            {slabLevel > 0 && SLAB_LEVELS[slabLevel - 1]
              ? `${formatPercentage(
                  SLAB_LEVELS[slabLevel - 1].percentageBPS
                )} Income Share`
              : "—"}
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
              <p className="text-xs text-cyan-300/80">
                Business counted towards slabs
              </p>
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
                <p className="text-xs text-cyan-300/80">
                  Pending & claimable amounts
                </p>
              </div>
            </div>
          </div>
          <p className="text-sm text-cyan-300/80 relative z-10">
            Total:{" "}
            <span className="font-semibold text-neon-orange">
              {formatUSD(slabIncomeUsd)}
            </span>{" "}
            ≈ {formatRAMA(slabIncomeRama)} RAMA
          </p>
          <p className="text-sm text-cyan-300/80 relative z-10 mt-1">
            Available now:{" "}
            <span className="font-semibold text-neon-orange">
              {formatUSD(slabIncomeAvailableUsd)}
            </span>{" "}
            ≈ {formatRAMA(slabIncomeAvailableRama)} RAMA
          </p>
          <p className="text-xs text-cyan-300/70 relative z-10 mt-2">
            Same-slab override pending: {formatUSD(overrideIncomeUsd)} •{" "}
            {formatRAMA(overrideIncomeRama)} RAMA
          </p>
        </div>
      </div>

      

      

      <div className="cyber-glass rounded-2xl p-6 border-2 border-neon-green">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-neon-green mb-2 uppercase tracking-wide">
            Complete Slab Income Structure
          </h2>
          <p className="text-sm text-cyan-300/90">
            Slab Income is based on{" "}
            <span className="text-neon-green font-semibold">
              difference income
            </span>{" "}
            - you earn the percentage difference between your slab level and
            your team member's slab level on their business volume.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <div className="cyber-glass border border-cyan-500/30 rounded-xl p-4">
            <h3 className="text-base font-bold text-cyan-300 mb-3">
              How Difference Income Works
            </h3>
            <div className="space-y-2 text-sm">
              <p className="text-cyan-300">
                <span className="text-neon-green font-semibold">Example:</span>
              </p>
              <p className="text-cyan-300">
                • You are at Slab {slabLevel || "—"} and earn{" "}
                {slabLevel > 0 && SLAB_LEVELS[slabLevel - 1]
                  ? formatPercentage(SLAB_LEVELS[slabLevel - 1].percentageBPS)
                  : "—"}{" "}
                daily on qualified volume.
              </p>
              <p className="text-cyan-300">
                • If your direct partner is one slab lower, you earn the
                percentage difference on their business volume.
              </p>
              <p className="text-cyan-300">
                • Example: You at 15%, your partner at 10% → you earn 5% on
                their new business volume.
              </p>
            </div>
          </div>

          <div className="cyber-glass border border-cyan-500/30 rounded-xl p-4">
            <h3 className="text-base font-bold text-cyan-300 mb-3">
              Key Highlights
            </h3>
            <ul className="space-y-2 text-sm text-cyan-300/90">
              <li>
                • Required qualified volume builds using the 40:30:30 leg
                balancing rule.
              </li>
              <li>
                • You need a minimum number of direct referrals at each slab
                tier.
              </li>
              <li>
                • Slab income can be claimed daily when you meet the
                qualification requirements.
              </li>
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
                        ? "bg-neon-green/5 hover:bg-neon-green/10"
                        : isAchieved
                        ? "bg-emerald-500/5 hover:bg-emerald-500/10"
                        : "hover:bg-cyan-500/5"
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                          isCurrent
                            ? "bg-gradient-to-br from-neon-green to-cyan-500 text-dark-950"
                            : isAchieved
                            ? "bg-gradient-to-br from-emerald-500 to-green-600 text-white"
                            : "cyber-glass border border-cyan-500/30 text-cyan-300/50"
                        }`}
                      >
                        {slabNum}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-semibold ${
                          isCurrent
                            ? "text-neon-green"
                            : isAchieved
                            ? "text-emerald-400"
                            : "text-cyan-300/50"
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
                            ? "text-neon-green"
                            : isAchieved
                            ? "text-emerald-400"
                            : "text-cyan-300/50"
                        }`}
                      >
                        {formatPercentage(slab.percentageBPS)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-cyan-300">
                      {slab.minDirects}
                    </td>
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

        
      </div>
    </div>
  );
}