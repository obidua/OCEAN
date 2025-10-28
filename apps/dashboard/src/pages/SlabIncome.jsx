import { useEffect, useState } from "react";
import { Table, LayoutGrid, History, TrendingUp, Users, Target, Award } from "lucide-react";
import { useStore } from "../../store/useUserInfoStore";
import SameSlabScreen from "../components/SameSlabScreen";
import SlabIncomeScreen from "../components/SlabIncomeScreen";
import SlabIncomeHistory from "../components/SlabIncomeHistory";

const SlabIncome = () => {
  const [viewMode, setViewMode] = useState("overview");
  
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
        // Load basic overview first
        const overview = await getSlabIncomeOverview(userAddress);
        console.log("Loaded slab income overview:", overview);
        if (!cancelled) setSlabDetails(overview);
        
        // Then load additional data in parallel
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

          // console.log("this is manager details", managerDetails);
          setSlabManagerDetails(managerDetails);
          setNextAchievements(achievements);
          console.log("Comprehensive slab data loaded:", { overview, managerDetails, achievements });
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

  // Process data for UI components
  const slabLevel = Number(slabDetails?.slabLevel ?? 0);
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

  // Legacy override data for SameSlabScreen compatibility
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
    slabLevel,
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
    // Enhanced data
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

  const SameSlabData = {
    totalOverrideRama,
    totalOverrideUsd,
    sameSlabPartners,
    overrideL1,
    overrideL2,
    overrideL3,
    // Enhanced data
    legsDetailed: slabDetails?.legsDetailed,
    legBreakdown: slabDetails?.legBreakdown
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green relative inline-block">
            Slab Income System
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-neon-green/20 blur-xl -z-10" />
          </h1>
          <p className="text-cyan-300/90 mt-1">
            Earn difference income from your team's growth
          </p>
          
          {/* Quick stats bar */}
          {/* {slabDetails && !loading && (
            <div className="flex flex-wrap gap-4 mt-3 text-sm">
              <div className="flex items-center gap-1 text-cyan-400">
                <Award size={16} />
                <span>Slab {slabLevel}</span>
              </div>
              <div className="flex items-center gap-1 text-green-400">
                <Users size={16} />
                <span>{directs.toLocaleString()} Directs</span>
              </div>
              <div className="flex items-center gap-1 text-yellow-400">
                <TrendingUp size={16} />
                <span>${qualifiedVolumeUsd.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1 text-purple-400">
                <Target size={16} />
                <span>{newDirects} New Since Claim</span>
              </div>
            </div>
          )} */}
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
            <span className="hidden sm:inline">Slab overview</span>
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === "table"
                ? "bg-gradient-to-r from-cyan-500 to-neon-green text-dark-950"
                : "cyber-glass text-cyan-400 border border-cyan-500/30 hover:border-cyan-500/50"
            }`}
          >
            <Table size={18} />
            <span className="hidden sm:inline">Same slab override</span>
          </button>
          <button
            onClick={() => setViewMode("history")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === "history"
                ? "bg-gradient-to-r from-cyan-500 to-neon-green text-dark-950"
                : "cyber-glass text-cyan-400 border border-cyan-500/30 hover:border-cyan-500/50"
            }`}
          >
            <History size={18} />
            <span className="hidden sm:inline">History</span>
          </button>
        </div>
      </div>

      <div className="my-5">
        {viewMode === "overview" && (
          <SlabIncomeScreen SlabIncomeData={SlabIncomeData} />
        )}
        {viewMode === "table" && (
          <SameSlabScreen SameSlabData={SameSlabData} />
        )}
        {viewMode === "history" && <SlabIncomeHistory />}
      </div>
    </div>
  );
};

export default SlabIncome;
