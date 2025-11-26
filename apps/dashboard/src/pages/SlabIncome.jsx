import { useEffect, useState } from "react";
import { LayoutGrid, Award, BarChart3 } from "lucide-react";
import { useStore } from "../../store/useUserInfoStore";
import SlabIncomeScreen from "../components/SlabIncomeScreen";
import SlabDashboard from "../components/SlabDashboard";

const SlabIncome = () => {
  const [viewMode, setViewMode] = useState("overview");  // Default to overview
  
  const userAddress = localStorage.getItem("userAddress");
  const [slabDetails, setSlabDetails] = useState(null);
  const [slabManagerDetails, setSlabManagerDetails] = useState(null);
  const [nextAchievements, setNextAchievements] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [incomeTotals, setIncomeTotals] = useState(null);
  const [incomeTotalsLoading, setIncomeTotalsLoading] = useState(false);
  const [incomeTotalsError, setIncomeTotalsError] = useState(null);

  const {
    getSlabIncomeOverview,
    getSlabManagerDetails,
    getNextAchievementProgress,
    getIncomeTotals,
  } = useStore();

  // Load data from store (contract-based)
  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      if (!userAddress) {
        setSlabDetails(null);
        setSlabManagerDetails(null);
        setNextAchievements(null);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const overview = await getSlabIncomeOverview(userAddress);
        if (!cancelled) setSlabDetails(overview);
        
        const [managerDetails, achievements] = await Promise.all([
          getSlabManagerDetails(userAddress).catch(err => {
            console.warn("Failed to load SlabManager details:", err);
            return null;
          }),
          getNextAchievementProgress(userAddress).catch(err => {
            console.warn("Failed to load achievement progress:", err);
            return null;
          })
        ]);
        
        if (!cancelled) {
          setSlabManagerDetails(managerDetails);
          setNextAchievements(achievements);
        }
      } catch (err) {
        console.error("Error loading slab data:", err);
        if (!cancelled) {
          setError(err?.message || "Unable to load slab income data.");
          setSlabDetails(null);
          setSlabManagerDetails(null);
          setNextAchievements(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    
    loadData();
    return () => {
      cancelled = true;
    };
  }, [userAddress, getSlabIncomeOverview, getSlabManagerDetails, getNextAchievementProgress]);

  useEffect(() => {
    if (!userAddress || typeof getIncomeTotals !== "function") {
      setIncomeTotals(null);
      return;
    }

    let cancelled = false;
    const loadTotals = async () => {
      try {
        setIncomeTotalsLoading(true);
        setIncomeTotalsError(null);
        const totals = await getIncomeTotals(userAddress);
        if (!cancelled) {
          setIncomeTotals(totals ?? null);
        }
      } catch (totalsErr) {
        console.error("Failed to load income totals:", totalsErr);
        if (!cancelled) {
          setIncomeTotals(null);
          setIncomeTotalsError(totalsErr?.message || "Unable to load income totals.");
        }
      } finally {
        if (!cancelled) setIncomeTotalsLoading(false);
      }
    };

    loadTotals();
    return () => {
      cancelled = true;
    };
  }, [userAddress, getIncomeTotals]);

  // Process data for UI
  const fallbackSlabIndex = Number.isFinite(Number(slabDetails?.slabLevel))
    ? Math.max(0, Math.floor(Number(slabDetails.slabLevel) - 1))
    : 0;
  const derivedContractIndex = Number.isFinite(Number(slabDetails?.contractSlabIndex))
    ? Number(slabDetails.contractSlabIndex)
    : fallbackSlabIndex;
  const contractSlabIndex = Number.isFinite(derivedContractIndex) && derivedContractIndex >= 0
    ? derivedContractIndex
    : 0;
  const displayedSlabLevel = contractSlabIndex + 1;
  const qualifiedVolumeUsd = parseFloat(slabDetails?.qualifiedVolumeUsd ?? 0);
  const directs = parseFloat(slabDetails?.directs ?? 0);
  const canClaim = slabDetails?.canClaim ?? false;
  const newDirects = slabDetails?.newDirects ?? 0;
  
  // Income data
  const slabIncomeUsdRaw = slabDetails?.slabIncomeUsd ?? 0;
  const slabIncomeAvailableUsdRaw = slabDetails?.slabIncomeAvailableUsd ?? 0;
  const slabIncomeRamaRaw = slabDetails?.slabIncomeRama ?? 0;
  const slabIncomeAvailableRamaRaw = slabDetails?.slabIncomeAvailableRama ?? 0;
  const overrideIncomeUsdRaw = slabDetails?.overrideIncomeUsd ?? 0;
  const overrideIncomeRamaRaw = slabDetails?.overrideIncomeRama ?? 0;

  const slabIncomeUsdDisplay =
    incomeTotals?.slabIncomeUsd ?? slabIncomeUsdRaw ?? 0;
  const slabIncomeAvailableUsdDisplay =
    incomeTotals?.slabIncomeUsd ?? slabIncomeAvailableUsdRaw ?? slabIncomeUsdDisplay;
  const overrideIncomeUsdDisplay =
    incomeTotals?.overrideUsd ?? overrideIncomeUsdRaw ?? 0;

  const usdToRamaRatio = (() => {
    if (slabIncomeUsdRaw > 0 && slabIncomeRamaRaw > 0) {
      return slabIncomeRamaRaw / slabIncomeUsdRaw;
    }
    if (overrideIncomeUsdRaw > 0 && overrideIncomeRamaRaw > 0) {
      return overrideIncomeRamaRaw / overrideIncomeUsdRaw;
    }
    if (slabIncomeAvailableUsdRaw > 0 && slabIncomeAvailableRamaRaw > 0) {
      return slabIncomeAvailableRamaRaw / slabIncomeAvailableUsdRaw;
    }
    return null;
  })();

  const convertUsdToRama = (usd) => {
    if (!usdToRamaRatio || !isFinite(usdToRamaRatio)) return usd === 0 ? 0 : null;
    return usd * usdToRamaRatio;
  };

  const slabIncomeRamaDisplay = convertUsdToRama(slabIncomeUsdDisplay) ?? 0;
  const slabIncomeAvailableRamaDisplay =
    convertUsdToRama(slabIncomeAvailableUsdDisplay) ?? 0;
  const overrideIncomeRamaDisplay =
    convertUsdToRama(overrideIncomeUsdDisplay) ?? 0;
  const royaltyIncomeUsd = slabDetails?.royaltyIncomeUsd ?? 0;
  const royaltyIncomeRama = slabDetails?.royaltyIncomeRama ?? 0;

  // Override data
  const overrideL1 = Number(slabDetails?.legBreakdown?.L1 ?? 0);
  const overrideL2 = Number(slabDetails?.legBreakdown?.L2 ?? 0);
  const overrideL3 = Number(slabDetails?.legBreakdown?.Lrest ?? 0);
  const overrideL1Usd = overrideL1;
  const overrideL2Usd = overrideL2;
  const overrideL3Usd = overrideL3;
  const totalOverrideRama = overrideL1 + overrideL2 + overrideL3;
  const totalOverrideUsd = overrideL1Usd + overrideL2Usd + overrideL3Usd;

  const sameSlabPartners = slabDetails?.sameSlabPartners ?? {
    firstWave: [],
    secondWave: [],
    thirdWave: [],
  };

  const slabStatusLabel = canClaim ? "Ready to Claim" : "Cooldown";

  // Enhanced data for components
  const SlabIncomeData = {
    error,
    loading,
    slabLevel: displayedSlabLevel,
    contractSlabIndex,
    qualifiedVolumeUsd,
    directs,
    slabStatusLabel,
    slabIncomeUsd: slabIncomeUsdDisplay,
    slabIncomeRama: slabIncomeRamaDisplay,
    slabIncomeAvailableUsd: slabIncomeAvailableUsdDisplay,
    slabIncomeAvailableRama: slabIncomeAvailableRamaDisplay,
    overrideIncomeUsd: overrideIncomeUsdDisplay,
    overrideIncomeRama: overrideIncomeRamaDisplay,
    royaltyIncomeUsd,
    royaltyIncomeRama,
    newDirects,
    progressData: slabDetails?.progressData,
    achievementsData: slabDetails?.achievementsData,
    legBreakdown: slabDetails?.legBreakdown,
    slabPercents: slabManagerDetails?.slabPercents,
    rewardMilestones: slabManagerDetails?.rewardMilestones,
    royaltyTiers: slabManagerDetails?.royaltyTiers,
    nextAchievements,
    incomeTotals,
    incomeTotalsLoading,
    incomeTotalsError,
  };
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green relative inline-block">
              Slab Income System
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-neon-green/20 blur-xl -z-10" />
            </h1>
            <Award size={20} className="text-white" />
          </div>
          <p className="text-cyan-300/90 mt-1">
            Earn difference income from your team's growth
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("overview")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === "overview"
                ? "bg-gradient-to-r from-cyan-500 to-neon-green text-dark-950"
                : "cyber-glass text-cyan-400 border border-cyan-500/30 hover:border-cyan-500/50"
            }`}
          >
            <LayoutGrid size={18} />
            <span className="hidden sm:inline">Slab Overview</span>
          </button>
          <button
            onClick={() => setViewMode("dashboard")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === "dashboard"
                ? "bg-gradient-to-r from-cyan-500 to-neon-green text-dark-950"
                : "cyber-glass text-cyan-400 border border-cyan-500/30 hover:border-cyan-500/50"
            }`}
          >
            <BarChart3 size={18} />
            <span className="hidden sm:inline">Slab Dashboard</span>
          </button>
        </div>
      </div>

      <div className="my-5">
        {viewMode === "overview" && (
          <SlabIncomeScreen SlabIncomeData={SlabIncomeData} />
        )}
        {viewMode === "dashboard" && (
          <SlabDashboard />
        )}
      </div>
    </div>
  );
};

export default SlabIncome;