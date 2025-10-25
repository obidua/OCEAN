import { useEffect, useState } from "react";
import {
  Table,
  LayoutGrid,
} from "lucide-react";
import { useStore } from "../../store/useUserInfoStore";
import SameSlabScreen from "../components/SameSlabScreen";
import SlabIncomeScreen from "../components/SlabIncomeScreen";

const SlabIncome = () => {
  const [viewMode, setViewMode] = useState("overview");

  const userAddress = localStorage.getItem("userAddress");
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
        console.log(res);
        if (!cancelled) setSlabDetails(res);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError(err?.message || "Unable to load slab income data.");
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

  const slabLevel = Number(
    slabDetails?.slabAchiev?.slabAchievements.length ?? 0
  );
  const qualifiedVolumeUsd = parseFloat(slabDetails?.qualifiedVolumeUsd) / 1e6;
  const directs = parseFloat(slabDetails?.directs) / 1e6;
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

 
  const slabStatusLabel = canClaim ? "Ready to Claim" : "Cooldown";


  const SlabIncomeData = {error,loading,slabLevel ,qualifiedVolumeUsd,directs,slabStatusLabel,slabIncomeUsd,slabIncomeRama ,slabIncomeAvailableUsd ,slabIncomeAvailableRama,overrideIncomeUsd,overrideIncomeRama}
  const SameSlabData = {totalOverrideRama,totalOverrideUsd ,sameSlabPartners,overrideL1,overrideL2 ,overrideL3 }

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
            <span className="hidden sm:inline">slab overivew</span>
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
            <span className="hidden sm:inline">same slab overiode</span>
          </button>
        </div>
      </div>

      <div className="my-5">
        {viewMode == "overview" ? <SlabIncomeScreen SlabIncomeData={SlabIncomeData}  /> : <SameSlabScreen SameSlabData={SameSlabData}/>}
      </div>
    </div>
  );
};

export default SlabIncome;