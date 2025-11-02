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
  BarChart3,
} from "lucide-react";
import { useStore } from "../../store/useUserInfoStore";
import {
  SLAB_LEVELS,
  formatUSD,
  formatPercentage,
  formatRAMA,
} from "../utils/contractData";
import NumberPopup from "./NumberPopup";
import VolumeAnalytics from "./VolumeAnalytics";
import VolumeSummary from "./VolumeSummary";

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
  
  // Get user address from store
  const userAddressFromStore = useStore((state) => state.userAddress);


  const userAddress = localStorage.getItem("userAddress") || userAddressFromStore;

  
  const {
    error,
    loading,
    slabLevel,
    qualifiedVolumeUsd,
    directs,
    slabStatusLabel,
    slabIncomeUsd,
    slabIncomeRama,
    slabIncomeAvailableUsd,
    slabIncomeAvailableRama,
    overrideIncomeUsd,
    overrideIncomeRama,
    royaltyIncomeUsd,
    royaltyIncomeRama,
    newDirects,
    // Enhanced data
    progressData,
    achievementsData,
    legBreakdown,
    slabPercents,
    rewardMilestones,
    royaltyTiers,
    nextAchievements,
    contractSlabIndex
  } = SlabIncomeData;

  // Local reader-driven state from SlabManagerReader.getUserOverview
  const [slabInfo, setSlabInfo] = useState([]); // achievedSlabs array
  const [readerContractIndex, setReaderContractIndex] = useState(undefined); // currentSlabIdx from reader
  const getUserSlabView = useStore((s) => s.getUserSlabView);

  // Derived display values: prefer reader outputs when available
  const displaySlabLevel = Array.isArray(slabInfo) ? slabInfo.length : 0; // array formula
  const effectiveContractIndex = Number.isFinite(readerContractIndex)
    ? Number(readerContractIndex)
    : Number.isFinite(contractSlabIndex)
    ? Number(contractSlabIndex)
    : Math.max(0, (Number(displaySlabLevel || slabLevel || 1) - 1));
  console.log('🎯 SlabIncomeScreen Debug:', {
    displayLevel: displaySlabLevel,
    contractIndex: effectiveContractIndex,
  });

  // Helper function to get slab info safely
  const getSlabInfo = (level) => {
    if (!level || level < 1 || level > SLAB_LEVELS.length) {
      return { isValid: false, slabData: null, arrayIndex: -1 };
    }
    const arrayIndex = level - 1; // Convert 1-based level to 0-based array index
    return {
      isValid: true,
      slabData: SLAB_LEVELS[arrayIndex],
      arrayIndex: arrayIndex,
      displayLevel: level
    };
  };

  const currentSlabInfo = getSlabInfo(displaySlabLevel || slabLevel);

  // Force slab income card values to zero (no distribution released yet)
  const displaySlabIncomeUsd = 0;
  const displaySlabIncomeRama = 0;
  const displaySlabIncomeAvailableUsd = 0;
  const displaySlabIncomeAvailableRama = 0;
  const displayOverrideIncomeUsd = 0;
  const displayOverrideIncomeRama = 0;

  // Helper function to render progress bars
  const ProgressBar = ({ label, current, target, percentage, color = "cyan" }) => {
    const clampedPercentage = Math.min(percentage || 0, 100);
    return (
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-cyan-300">{label}</span>
          <span className="text-cyan-400">{clampedPercentage.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-dark-900/50 rounded-full h-2">
          <div 
            className={`h-2 rounded-full bg-gradient-to-r from-${color}-500 to-${color}-400 transition-all duration-300`}
            style={{ width: `${clampedPercentage}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-cyan-400/70">
          <span>${current?.toLocaleString() || 0}</span>
          <span>${target?.toLocaleString() || 0}</span>
        </div>
      </div>
    );
  };

  const fetchSlabInfo = async () => {
    try {
      if(!userAddress) return;

      const response = await getUserSlabView(userAddress);
      console.log("=====+Fetched slab info:", response);
      setSlabInfo(response?.achievedSlabs || []);
      setReaderContractIndex(
        Number.isFinite(Number(response?.currentSlabIdx))
          ? Number(response.currentSlabIdx)
          : undefined
      );
    } catch (error) {
      console.error("Error fetching slab info:", error);
    }
  };

  useEffect(()=>{
    if(userAddress){
      fetchSlabInfo();
    }
  },[userAddress])


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
            {Array.isArray(slabInfo) ? slabInfo.length : "—"}
          </p>
          <p className="text-lg text-cyan-300 relative z-10">
            {currentSlabInfo.isValid && currentSlabInfo.slabData
              ? `${formatPercentage(currentSlabInfo.slabData.percentageBPS)} Income Share`
              : "—"}
          </p>
          {currentSlabInfo.isValid && (
            <p className="text-xs text-cyan-400/70 mt-2 relative z-10">
              Slab Level {currentSlabInfo.displayLevel} (Contract Index: {effectiveContractIndex})
            </p>
          )}
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
            {parseFloat(directs)/1e6} Team Volume 
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
              {formatUSD(displaySlabIncomeUsd)}
            </span>{" "}
            ≈ {formatRAMA(displaySlabIncomeRama)} RAMA
          </p>
          <p className="text-sm text-cyan-300/80 relative z-10 mt-1">
            Available now:{" "}
            <span className="font-semibold text-neon-orange">
              {formatUSD(displaySlabIncomeAvailableUsd)}
            </span>{" "}
            ≈ {formatRAMA(displaySlabIncomeAvailableRama)} RAMA
          </p>
          <p className="text-xs text-cyan-300/70 relative z-10 mt-2">
            Same-slab override pending: {formatUSD(displayOverrideIncomeUsd)} •{" "}
            {formatRAMA(displayOverrideIncomeRama)} RAMA
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
                • You are at Slab {currentSlabInfo.isValid ? currentSlabInfo.displayLevel : "—"} and earn{" "}
                {currentSlabInfo.isValid && currentSlabInfo.slabData
                  ? formatPercentage(currentSlabInfo.slabData.percentageBPS)
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
                • Qualified volume now uses adaptive caps: strongest leg counts
                up to 40%, every additional leg up to 30% until targets are
                filled (matches 40:30:30 when you have 3 directs).
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
                const isCurrent = slabNum === (displaySlabLevel || slabLevel);
                const isAchieved = slabNum < (displaySlabLevel || slabLevel);
                const requiredVolume = Number(slab.requiredVolumeUSD) || 0;
                const rawProgress =
                  requiredVolume > 0
                    ? (Number(qualifiedVolumeUsd || 0) / requiredVolume) * 100
                    : 0;
                const clampedProgress = Math.max(0, Math.min(100, rawProgress));
                const progressPct = isAchieved ? 100 : clampedProgress;
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
                      <div className="mt-2 h-1.5 w-full rounded-full bg-cyan-500/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isCurrent
                              ? "bg-gradient-to-r from-neon-green to-cyan-500"
                              : isAchieved
                              ? "bg-gradient-to-r from-emerald-500 to-green-500"
                              : "bg-gradient-to-r from-cyan-500/70 to-cyan-400/70"
                          }`}
                          style={{
                            width: `${progressPct}%`,
                          }}
                        />
                      </div>
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
                        <span className="px-1 py-1 bg-gradient-to-r from-neon-green to-cyan-500 text-white rounded-full text-[9px] lg:text-xs font-bold">
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

        {/* Enhanced Progress Section */}
        {progressData && (
          <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
            <h3 className="text-xl font-bold text-cyan-400 mb-4">Achievement Progress</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <ProgressBar
                label="Next Slab"
                current={qualifiedVolumeUsd}
                target={progressData.nextSlabThreshold}
                percentage={progressData.progressToNextSlab}
                color="neon-green"
              />
              <ProgressBar
                label="Next Reward"
                current={qualifiedVolumeUsd}
                target={progressData.nextRewardThreshold}
                percentage={progressData.progressToNextReward}
                color="yellow"
              />
              <ProgressBar
                label="Next Royalty"
                current={qualifiedVolumeUsd}
                target={progressData.nextRoyaltyThreshold}
                percentage={progressData.progressToNextRoyalty}
                color="purple"
              />
            </div>
          </div>
        )}

        {/* Enhanced Income Breakdown */}
        {/* {(royaltyIncomeUsd > 0 || newDirects > 0) && (
          <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
            <h3 className="text-xl font-bold text-cyan-400 mb-4">Enhanced Income Data</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {royaltyIncomeUsd > 0 && (
                <div className="text-center p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
                  <p className="text-purple-400 text-sm font-medium">Royalty Income</p>
                  <p className="text-2xl font-bold text-purple-300">${royaltyIncomeUsd.toLocaleString()}</p>
                  <p className="text-sm text-purple-400/70">{formatRAMA(royaltyIncomeRama)} RAMA</p>
                </div>
              )}
              {newDirects > 0 && (
                <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                  <p className="text-green-400 text-sm font-medium">New Directs Since Claim</p>
                  <p className="text-2xl font-bold text-green-300">{newDirects}</p>
                  <p className="text-sm text-green-400/70">Fresh registrations</p>
                </div>
              )}
              {legBreakdown && (
                <>
                  <div className="text-center p-4 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                    <p className="text-cyan-400 text-sm font-medium">L1 Volume</p>
                    <p className="text-xl font-bold text-cyan-300">${legBreakdown.L1?.toLocaleString() || 0}</p>
                  </div>
                  <div className="text-center p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                    <p className="text-blue-400 text-sm font-medium">L2 Volume</p>
                    <p className="text-xl font-bold text-blue-300">${legBreakdown.L2?.toLocaleString() || 0}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )} */}

        {/* Enhanced Volume Analytics */}
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

        {/* Achievement Timeline */}
        {achievementsData && (achievementsData.slabs?.length > 0 || achievementsData.rewards?.length > 0) && (
          <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
            <h3 className="text-xl font-bold text-cyan-400 mb-4">Recent Achievements</h3>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {achievementsData.slabs?.slice(-5).reverse().map((achievement, idx) => (
                <div key={`slab-${achievement.id}`} className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {(Number(achievement.id) || 0) + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-green-400 font-medium">
                      Slab {(Number(achievement.id) || 0) + 1} Achieved
                    </p>
                    <p className="text-sm text-green-300/70">
                      {achievement.achievedDate?.toLocaleDateString()} - ${achievement.totalQualified?.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              {achievementsData.rewards?.slice(-3).reverse().map((achievement, idx) => (
                <div key={`reward-${achievement.id}`} className="flex items-center gap-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    R{achievement.id}
                  </div>
                  <div className="flex-1">
                    <p className="text-yellow-400 font-medium">Reward Milestone {achievement.id}</p>
                    <p className="text-sm text-yellow-300/70">
                      {achievement.achievedDate?.toLocaleDateString()} - ${achievement.totalQualified?.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced System Configuration Tables */}
        {(slabPercents || rewardMilestones || royaltyTiers) && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-cyan-400 mb-2">🎯 System Configuration</h3>
              <p className="text-sm text-cyan-300/80">
                Dynamic system parameters and reward structures
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Slab Percentages Table */}
              {slabPercents && (
                <div className="cyber-glass border border-cyan-500/40 rounded-2xl overflow-hidden relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 opacity-50 group-hover:opacity-70 transition-opacity" />
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/70 to-transparent" />
                  
                  {/* Header */}
                  <div className="p-6 pb-4 relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-cyan-500/20 rounded-lg backdrop-blur-sm border border-cyan-500/30">
                        <Layers size={20} className="text-cyan-400" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-cyan-400">Slab Percentages</h4>
                        <p className="text-xs text-cyan-300/70">Income share per level</p>
                      </div>
                    </div>
                    <div className="text-xs text-cyan-300/60">
                      Total Levels: {slabPercents.length}
                    </div>
                  </div>

                  {/* Table */}
                  <div className="relative z-10 max-h-80 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-cyan-500/30 hover:scrollbar-thumb-cyan-500/50">
                    <div className="px-6 pb-6">
                      <div className="bg-dark-950/40 rounded-xl border border-cyan-500/20 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-b border-cyan-500/20">
                            <tr>
                              <th className="text-left py-3 px-4 font-semibold text-cyan-300 text-xs uppercase tracking-wider">
                                Level
                              </th>
                              <th className="text-right py-3 px-4 font-semibold text-cyan-300 text-xs uppercase tracking-wider">
                                Share %
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {slabPercents.map((percent, idx) => {
                              const isCurrentLevel = (idx + 1) === (displaySlabLevel || slabLevel);
                              return (
                                <tr 
                                  key={idx} 
                                  className={`border-b border-cyan-500/10 transition-all duration-200 ${
                                    isCurrentLevel 
                                      ? "bg-gradient-to-r from-neon-green/10 to-cyan-500/10 border-neon-green/20" 
                                      : "hover:bg-cyan-500/5"
                                  }`}
                                >
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                        isCurrentLevel 
                                          ? "bg-gradient-to-r from-neon-green to-cyan-500 text-dark-950" 
                                          : (idx + 1) < (displaySlabLevel || slabLevel)
                                          ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white"
                                          : "bg-cyan-500/20 text-cyan-400"
                                      }`}>
                                        {idx + 1}
                                      </div>
                                      <span className={`font-medium ${
                                        isCurrentLevel ? "text-neon-green" : "text-cyan-400"
                                      }`}>
                                        Slab {idx + 1}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <span className={`font-bold text-lg ${
                                      isCurrentLevel ? "text-neon-green" : "text-cyan-300"
                                    }`}>
                                      {percent}%
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Royalty Rewards Table (renamed from Royalty Tiers) */}
              {royaltyTiers && (
                <div className="cyber-glass border border-purple-500/40 rounded-2xl overflow-hidden relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-50 group-hover:opacity-70 transition-opacity" />
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/70 to-transparent" />
                  
                  {/* Header */}
                  <div className="p-6 pb-4 relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-purple-500/20 rounded-lg backdrop-blur-sm border border-purple-500/30">
                        <TrendingUp size={20} className="text-purple-400" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-purple-400">Royalty Rewards</h4>
                        <p className="text-xs text-purple-300/70">Premium reward structure</p>
                      </div>
                    </div>
                    <div className="text-xs text-purple-300/60">
                      Total Tiers: {royaltyTiers.length}
                    </div>
                  </div>

                  {/* Table */}
                  <div className="relative z-10 max-h-80 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-purple-500/30 hover:scrollbar-thumb-purple-500/50">
                    <div className="px-6 pb-6">
                      <div className="bg-dark-950/40 rounded-xl border border-purple-500/20">
                        <div className="overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-purple-500/30 hover:scrollbar-thumb-purple-500/50">
                          <table className="w-full min-w-[520px] text-sm">
                            <thead className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b border-purple-500/20">
                              <tr>
                                <th className="text-left py-3 px-4 font-semibold text-purple-300 text-xs uppercase tracking-wider whitespace-nowrap">
                                  Tier
                                </th>
                                <th className="text-right py-3 px-4 font-semibold text-purple-300 text-xs uppercase tracking-wider whitespace-nowrap">
                                  Threshold
                                </th>
                                <th className="text-right py-3 px-4 font-semibold text-purple-300 text-xs uppercase tracking-wider whitespace-nowrap">
                                  Reward
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {royaltyTiers.map((tier, idx) => {
                                const isEligible = qualifiedVolumeUsd >= tier.threshold;
                                const isNext = !isEligible && (idx === 0 || qualifiedVolumeUsd >= royaltyTiers[idx - 1]?.threshold);
                                return (
                                  <tr 
                                    key={idx} 
                                    className={`border-b border-purple-500/10 transition-all duration-200 ${
                                      isNext 
                                        ? "bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20" 
                                        : isEligible
                                        ? "bg-gradient-to-r from-green-500/10 to-emerald-500/10"
                                        : "hover:bg-purple-500/5"
                                    }`}
                                  >
                                    <td className="py-3 px-4">
                                      <div className="flex items-center gap-2">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                          isEligible 
                                            ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white" 
                                            : isNext
                                            ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                                            : "bg-purple-500/20 text-purple-400"
                                        }`}>
                                          {idx + 1}
                                        </div>
                                        <span className={`font-medium ${
                                          isNext ? "text-purple-400" : isEligible ? "text-green-400" : "text-purple-300/60"
                                        }`}>
                                          Tier {idx + 1}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                      <span className={`font-bold ${
                                        isNext ? "text-purple-400" : isEligible ? "text-green-400" : "text-purple-300/60"
                                      } whitespace-nowrap`}>
                                        ${tier.threshold?.toLocaleString()}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                      <span className={`font-bold ${
                                        isNext ? "text-purple-400" : isEligible ? "text-green-400" : "text-purple-300/60"
                                      } whitespace-nowrap`}>
                                        ${tier.reward?.toLocaleString()}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Reward Milestones Table */}
              {rewardMilestones && (
                <div className="cyber-glass border border-yellow-500/40 rounded-2xl overflow-hidden relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 opacity-50 group-hover:opacity-70 transition-opacity" />
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-yellow-500/70 to-transparent" />
                  
                  {/* Header */}
                  <div className="p-6 pb-4 relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-yellow-500/20 rounded-lg backdrop-blur-sm border border-yellow-500/30">
                        <Award size={20} className="text-yellow-400" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-yellow-400">Reward Milestones</h4>
                        <p className="text-xs text-yellow-300/70">Achievement targets</p>
                      </div>
                    </div>
                    <div className="text-xs text-yellow-300/60">
                      Total Milestones: {rewardMilestones.length}
                    </div>
                  </div>

                  {/* Table */}
                  <div className="relative z-10 max-h-80 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-yellow-500/30 hover:scrollbar-thumb-yellow-500/50">
                    <div className="px-6 pb-6">
                      <div className="bg-dark-950/40 rounded-xl border border-yellow-500/20 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-b border-yellow-500/20">
                            <tr>
                              <th className="text-left py-3 px-4 font-semibold text-yellow-300 text-xs uppercase tracking-wider">
                                Level
                              </th>
                              <th className="text-right py-3 px-4 font-semibold text-yellow-300 text-xs uppercase tracking-wider">
                                Target
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {rewardMilestones.map((milestone, idx) => {
                              const isAchieved = qualifiedVolumeUsd >= milestone;
                              const isNext = !isAchieved && (idx === 0 || qualifiedVolumeUsd >= rewardMilestones[idx - 1]);
                              return (
                                <tr 
                                  key={idx} 
                                  className={`border-b border-yellow-500/10 transition-all duration-200 ${
                                    isNext 
                                      ? "bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/20" 
                                      : isAchieved
                                      ? "bg-gradient-to-r from-green-500/10 to-emerald-500/10"
                                      : "hover:bg-yellow-500/5"
                                  }`}
                                >
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                        isAchieved 
                                          ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white" 
                                          : isNext
                                          ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-dark-950"
                                          : "bg-yellow-500/20 text-yellow-400"
                                      }`}>
                                        {idx + 1}
                                      </div>
                                      <span className={`font-medium ${
                                        isNext ? "text-yellow-400" : isAchieved ? "text-green-400" : "text-yellow-300/60"
                                      }`}>
                                        Level {idx + 1}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <span className={`font-bold ${
                                      isNext ? "text-yellow-400" : isAchieved ? "text-green-400" : "text-yellow-300/60"
                                    }`}>
                                      ${milestone?.toLocaleString()}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
}
