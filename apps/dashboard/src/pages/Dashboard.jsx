// src/screens/Dashboard.jsx
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  TrendingUp,
  Wallet,
  Users,
  Award,
  DollarSign,
  Clock,
  Zap,
  Gift,
  Trophy,
  ArrowUpRight,
  Loader2,
  X,
  RefreshCw,
  Copy,
  User2Icon,
  AlertCircle,
  Info,
  XCircle,
  CheckCircle,
  Lock,
  Pause,
  Coins,
  LayoutDashboard,
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatUSD, formatRAMA } from "../utils/contractData";
import NumberPopup from "../components/NumberPopup";
import LivePriceFeed from "../components/LivePriceFeed";
import { computeSevenDayTrend } from "../utils/earningsTrends";
import IncomeNotificationOverlay from "../components/IncomeNotificationOverlay";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useStore } from "../../store/useUserInfoStore";
import { PortfolioStatus } from "../types/contract";
import { useWaitForTransactionReceipt } from "wagmi";
import { useTransaction } from "../../config/register";
import { useAppKitAccount } from "@reown/appkit/react";
import ProgressiveTransactionModal from "../components/ProgressiveTransactionModal";
import CappedPortfolioFunnel from "../components/CappedPortfolioFunnel";
import toast from "../utils/toast";
import financialSounds from "../utils/financialSounds";
import incomeTracker from "../utils/incomeTracker";

export default function Dashboard() {
  const [portfolioIds, setPortFolioId] = useState([]);
  const [selectedPid, setSelectedPid] = useState(() => {
    const saved = localStorage.getItem("selectedPortfolioId");
    const parsed = saved ? Number(saved) : null;
    return Number.isFinite(parsed) ? parsed : null;
  });
  const [portFolioDetails, setFortFolioDetails] = useState(null);
  const [DashBoardDetail, setDashboardDetails] = useState(null);
  const [last7Day, setLast7Days] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dashError, setDashError] = useState(null);
  const [usdPerRama, setUsdPerRama] = useState(null);
  const [incomeTotalsBreakdown, setIncomeTotalsBreakdown] = useState(null);
  const [incomeTotalsLoading, setIncomeTotalsLoading] = useState(false);
  const [incomeTotalsError, setIncomeTotalsError] = useState("");
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [isClaimingGrowth, setIsClaimingGrowth] = useState(false);
  const [claimError, setClaimError] = useState(null);
  const [roiTotals, setRoiTotals] = useState(null);
  const [roiTotalsLoading, setRoiTotalsLoading] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [claimConfirmData, setClaimConfirmData] = useState(null);
  const [autoWindowInfo, setAutoWindowInfo] = useState(null);
  const [showCappedFunnel, setShowCappedFunnel] = useState(false);

  // Income tracking state
  const previousValuesRef = useRef({});
  const successHandledRef = useRef(false);

  const { address, isConnected } = useAppKitAccount();
  const { handleSendTx, hash, isSuccess, isError, receipt } = useTransaction();

  const getTOtalPortFolio = useStore((s) => s.getTOtalPortFolio);
  const getPortFoliById = useStore((s) => s.getPortFoliById);
  const getDashboardDetails = useStore((s) => s.getDashboardDetails);
  const get7DayEarningTrend = useStore((s) => s.get7DayEarningTrend);
  const getTransactionHistory = useStore((s) => s.getTransactionHistory);
  const convertRamaToUsd = useStore((s) => s.RamaTOUsd);
  const getIncomeTotals = useStore((s) => s.getIncomeTotals);
  const getComprehensiveCapStatus = useStore(
    (s) => s.getComprehensiveCapStatus
  );
  const getAccruedRewardStats = useStore((s) => s.getAccruedRewardStats);
  const getTeamSummary = useStore((s) => s.getTeamSummary);
  const getTeamMemberDetails = useStore((s) => s.getTeamMemberDetails);
  const claimAccruedROI = useStore((s) => s.claimAccruedROI);
  const claimAccruedROISmart = useStore((s) => s.claimAccruedROISmart);
  const getAutoWindow = useStore((s) => s.getAutoWindow);
  const getROITotals = useStore((s) => s.getROITotals);
  const getUnclaimedROIWindow = useStore((s) => s.getUnclaimedROIWindow);
  const getPaidUsdByPidMap = useStore((s) => s.getPaidUsdByPidMap);
  const getTotalsClaimedFromDistributor = useStore(
    (s) => s.getTotalsClaimedFromDistributor
  );

  const getROITiming = useStore((s) => s.getROITiming);
  const getMissedIncomeOverview = useStore((s) => s.getMissedIncomeOverview);
  const getLegsDetailedVolume = useStore((s) => s.getLegsDetailedVolume);
  const getVolumeAnalytics = useStore((s) => s.getVolumeAnalytics);
  const getCappingIncomeData = useStore((s) => s.getCappingIncomeData);
  const getDirectsPortfolioAndTeamVolumes = useStore(
    (s) => s.getDirectsPortfolioAndTeamVolumes
  );
  const getDirectsPortfolioBreakdown = useStore(
    (s) => s.getDirectsPortfolioBreakdown
  );
  const getRoyaltyOverview = useStore((s) => s.getRoyaltyOverview);
  const userAddressStore = useStore((s) => s.userAddress);
  const [comprehensiveCapStatus, setComprehensiveCapStatus] = useState(null);
  const [comprehensiveCapError, setComprehensiveCapError] = useState(null);
  const [cappingIncomeData, setCappingIncomeData] = useState(null);
  const [cappingIncomeLoading, setCappingIncomeLoading] = useState(false);
  const [cappingIncomeError, setCappingIncomeError] = useState(null);
  const [directsPortfolioData, setDirectsPortfolioData] = useState(null);
  const [directsPortfolioLoading, setDirectsPortfolioLoading] = useState(false);
  const [directsPortfolioError, setDirectsPortfolioError] = useState(null);

  const [teamSummary, setTeamSummary] = useState(null);
  const [teamMemberDetails, setTeamMemberDetails] = useState(null);
  const [royaltyDetails, setRoyaltyDetails] = useState(null);
  const [royaltyLoading, setRoyaltyLoading] = useState(false);
  const userAddress =
    userAddressStore ||
    (typeof window !== "undefined"
      ? localStorage.getItem("userAddress")
      : null);

  // Accrued totals (claimed + unclaimed)
  const [accruedLoading, setAccruedLoading] = useState(false);
  const [accruedError, setAccruedError] = useState("");
  const [accruedStats, setAccruedStats] = useState(null);

  // Robust ROI aggregates (match AccruedRewards logic for non-zero fallbacks)
  const [roiAgg, setRoiAgg] = useState(null);
  const [roiAggLoading, setRoiAggLoading] = useState(false);
  const [roiAggError, setRoiAggError] = useState("");

  // Missed income overview
  const [missedOverview, setMissedOverview] = useState(null);
  const [missedLoading, setMissedLoading] = useState(false);

  // Volume analytics from SlabManager
  const [volumeData, setVolumeData] = useState(null);
  const [volumeLoading, setVolumeLoading] = useState(false);
  const [volumeError, setVolumeError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadAccrued() {
      if (!userAddress || typeof getAccruedRewardStats !== "function") {
        setAccruedStats(null);
        return;
      }
      try {
        setAccruedLoading(true);
        setAccruedError("");
        const stats = await getAccruedRewardStats(userAddress);
        if (cancelled) return;
        setAccruedStats(stats ?? null);
      } catch (e) {
        if (cancelled) return;
        setAccruedError(e?.message || "Failed to load accrued stats");
      } finally {
        if (!cancelled) setAccruedLoading(false);
      }
    }
    loadAccrued();
    return () => {
      cancelled = true;
    };
  }, [userAddress, getAccruedRewardStats]);

  const tillAccruedUsd = useMemo(() => {
    // Till Accrued = Claimed (totalRewardsUsd from accruedStats) + Unclaimed (unclaimedUsd from roiAgg)
    const claimed = Number(accruedStats?.totalRewardsUsd || 0);
    const unclaimed = Number(roiAgg?.unclaimedUsd || 0);
    const total = claimed + unclaimed;
    return isFinite(total) ? total : 0;
  }, [accruedStats, roiAgg]);

  const lastPortfolioId = useMemo(() => {
    if (!Array.isArray(portfolioIds) || portfolioIds.length === 0) return null;
    return portfolioIds.reduce(
      (m, v) => (Number(v) > Number(m) ? Number(v) : Number(m)),
      Number(portfolioIds[0])
    );
  }, [portfolioIds]);

  // ===========================================================================
  // Dashboard details
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!userAddress) {
      setDashboardDetails(null);
      setPortFolioId([]);
      setFortFolioDetails(null);
      setLast7Days([]);
      setUsdPerRama(null);
      setComprehensiveCapStatus(null);
      setComprehensiveCapError(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setDashError(null);
      setComprehensiveCapError(null);
      try {
        const [
          portfolioInfo,
          dashboardInfo,
          capStatus,
          teamSum,
          teamDet,
          trendCombined,
        ] = await Promise.all([
          getTOtalPortFolio(userAddress),
          getDashboardDetails(userAddress),
          getComprehensiveCapStatus(userAddress),
          typeof getTeamSummary === "function"
            ? getTeamSummary(userAddress, 50)
            : null,
          typeof getTeamMemberDetails === "function"
            ? getTeamMemberDetails(userAddress)
            : null,
          computeSevenDayTrend({
            userAddress,
            get7DayEarningTrend,
            getTransactionHistory,
          }),
        ]);

        console.log("#########", dashboardInfo);

        if (cancelled) return;

        const aggregatedPortfolios = Array.isArray(dashboardInfo?.portfolios)
          ? dashboardInfo.portfolios
          : [];
        const ids =
          aggregatedPortfolios.length > 0
            ? aggregatedPortfolios
                .map((p) => Number(p.pid))
                .filter((id) => Number.isFinite(id) && id > 0)
            : (portfolioInfo?.ArrPortfolio ?? [])
                .map((id) => Number(id))
                .filter((id) => Number.isFinite(id) && id > 0);
        setPortFolioId(ids);

        setSelectedPid((prev) => {
          if (!ids.length) return null;
          if (prev !== null && ids.includes(Number(prev))) {
            return Number(prev);
          }
          return ids[0];
        });

  setDashboardDetails(dashboardInfo ?? null);
        if (aggregatedPortfolios.length > 0) {
          const initialPid =
            aggregatedPortfolios.length &&
            (ids.includes(Number(selectedPid))
              ? Number(selectedPid)
              : aggregatedPortfolios[0].pid);
          const matched =
            aggregatedPortfolios.find(
              (p) => Number(p.pid) === Number(initialPid)
            ) ?? aggregatedPortfolios[0];
          setFortFolioDetails(matched ?? null);
        } else {
          setFortFolioDetails(portfolioInfo?.ProtFolioDetail ?? null);

          console.log(portfolioInfo?.ProtFolioDetail)
        }
  setLast7Days(Array.isArray(trendCombined) ? trendCombined : []);
        setComprehensiveCapStatus(capStatus ?? null);
        setTeamSummary(teamSum ?? null);
        setTeamMemberDetails(teamDet ?? null);
        setComprehensiveCapError(null);

        if (convertRamaToUsd) {
          try {
            const quote = await convertRamaToUsd(1);
            if (cancelled) return;
            setUsdPerRama(
              quote && Number.isFinite(Number(quote)) && Number(quote) > 0
                ? Number(quote)
                : null
            );
          } catch (priceErr) {
            if (cancelled) return;
            console.warn("Unable to fetch RAMA/USD quote:", priceErr);
            setUsdPerRama(null);
          }
        } else if (!cancelled) {
          setUsdPerRama(null);
        }
      } catch (error) {
        if (cancelled) return;
        console.error(error);
        setDashError(error?.message || "Failed to load dashboard data");
        setComprehensiveCapError(error?.message || "Failed to load cap status");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [
    userAddress,
    getTOtalPortFolio,
    getDashboardDetails,
    get7DayEarningTrend,
    convertRamaToUsd,
  ]);

  const refreshIncomeTotals = useCallback(async () => {
    if (!userAddress || typeof getIncomeTotals !== "function") {
      setIncomeTotalsBreakdown(null);
      setIncomeTotalsLoading(false);
      setIncomeTotalsError("");
      return;
    }

    setIncomeTotalsLoading(true);
    setIncomeTotalsError("");
    try {
      const totals = await getIncomeTotals(userAddress);
      setIncomeTotalsBreakdown(totals ?? null);
    } catch (error) {
      console.error("Income totals fetch failed:", error);
      setIncomeTotalsBreakdown(null);
      setIncomeTotalsError(error?.message || "Unable to load income totals.");
    } finally {
      setIncomeTotalsLoading(false);
    }
  }, [userAddress, getIncomeTotals]);

  useEffect(() => {
    refreshIncomeTotals();
  }, [refreshIncomeTotals]);

  // Load robust ROI aggregates similar to AccruedRewards page
  useEffect(() => {
    let cancelled = false;
    const loadAgg = async () => {
      const effective = userAddress || address;
      if (!effective) {
        if (!cancelled) {
          setRoiAgg(null);
          setRoiAggLoading(false);
          setRoiAggError("");
        }
        return;
      }

      setRoiAggLoading(true);
      setRoiAggError("");
      try {
        const [totals, windowInfo, claimedMap, distClaimedTotals] =
          await Promise.all([
            typeof getROITotals === "function" ? getROITotals(effective) : null,
            typeof getUnclaimedROIWindow === "function"
              ? getUnclaimedROIWindow(effective)
              : null,
            Array.isArray(portfolioIds) &&
            portfolioIds.length &&
            typeof getPaidUsdByPidMap === "function"
              ? getPaidUsdByPidMap(portfolioIds)
              : Promise.resolve({}),
            typeof getTotalsClaimedFromDistributor === "function"
              ? getTotalsClaimedFromDistributor(effective)
              : null,
          ]);

        const totalClaimedFromMap =
          claimedMap && typeof claimedMap === "object"
            ? Object.values(claimedMap).reduce(
                (sum, v) => sum + (Number(v) || 0),
                0
              )
            : 0;

        const claimedUsd =
          (distClaimedTotals?.usd != null
            ? Number(distClaimedTotals.usd)
            : null) ??
          (Number.isFinite(totalClaimedFromMap) ? totalClaimedFromMap : null) ??
          (totals?.claimedUsd != null ? Number(totals.claimedUsd) : 0);

        // Prefer non-zero window value if totals are zero; fall back to 0
        const totalsUnc =
          totals?.unclaimedUsd != null ? Number(totals.unclaimedUsd) : null;
        const windowUnc =
          windowInfo?.usd != null ? Number(windowInfo.usd) : null;
        const unclaimedUsd =
          (totalsUnc != null && totalsUnc > 0 ? totalsUnc : null) ??
          (windowUnc != null && windowUnc > 0 ? windowUnc : 0);

        const agg = {
          claimedUsd: Number.isFinite(claimedUsd) ? claimedUsd : 0,
          unclaimedUsd: Number.isFinite(unclaimedUsd) ? unclaimedUsd : 0,
          // Optional: rama
          claimedRama: distClaimedTotals?.rama ?? totals?.claimedRama ?? 0,
          unclaimedRama: totals?.unclaimedRama ?? windowInfo?.rama ?? 0,
        };
        if (!cancelled) setRoiAgg(agg);
      } catch (e) {
        console.warn("Accrued aggregate load failed:", e);
        if (!cancelled) {
          setRoiAgg(null);
          setRoiAggError(e?.message || "Failed to load Accrued aggregates");
        }
      } finally {
        if (!cancelled) setRoiAggLoading(false);
      }
    };

    loadAgg();
    return () => {
      cancelled = true;
    };
  }, [
    userAddress,
    address,
    getROITotals,
    getUnclaimedROIWindow,
    getPaidUsdByPidMap,
    getTotalsClaimedFromDistributor,
    portfolioIds,
  ]);

  // Load ROI totals (unclaimed ROI) to keep Dashboard consistent with Accrued Rewards page
  useEffect(() => {
    let cancelled = false;
    const loadRoiTotals = async () => {
      if (!userAddress || typeof getROITotals !== "function") {
        setRoiTotals(null);
        setRoiTotalsLoading(false);
        return;
      }
      setRoiTotalsLoading(true);
      try {
        const totals = await getROITotals(userAddress);
        if (cancelled) return;
        setRoiTotals(totals || null);
      } catch (err) {
        console.warn("Failed to load Accrued totals:", err);
        if (!cancelled) setRoiTotals(null);
      } finally {
        if (!cancelled) setRoiTotalsLoading(false);
      }
    };
    loadRoiTotals();
    return () => {
      cancelled = true;
    };
  }, [userAddress, getROITotals]);

  // Load missed income overview
  useEffect(() => {
    let cancelled = false;
    const loadMissed = async () => {
      if (!userAddress || typeof getMissedIncomeOverview !== "function") {
        setMissedOverview(null);
        setMissedLoading(false);
        return;
      }
      setMissedLoading(true);
      try {
        const overview = await getMissedIncomeOverview(userAddress);
        if (cancelled) return;
        setMissedOverview(overview || null);
      } catch (err) {
        console.warn("Failed to load missed income:", err);
        if (!cancelled) setMissedOverview(null);
      } finally {
        if (!cancelled) setMissedLoading(false);
      }
    };
    loadMissed();
    return () => {
      cancelled = true;
    };
  }, [userAddress, getMissedIncomeOverview]);

  // Load capping income data from CappingIncomeManager
  useEffect(() => {
    let cancelled = false;
    const loadCappingIncome = async () => {
      if (!userAddress || typeof getCappingIncomeData !== "function") {
        setCappingIncomeData(null);
        setCappingIncomeLoading(false);
        setCappingIncomeError(null);
        return;
      }
      setCappingIncomeLoading(true);
      setCappingIncomeError(null);
      try {
        const data = await getCappingIncomeData(userAddress);
        if (cancelled) return;
        setCappingIncomeData(data || null);
      } catch (err) {
        console.warn("Failed to load capping income data:", err);
        if (!cancelled) {
          setCappingIncomeData(null);
          setCappingIncomeError(
            err?.message || "Failed to load capping income data"
          );
        }
      } finally {
        if (!cancelled) setCappingIncomeLoading(false);
      }
    };
    loadCappingIncome();
    return () => {
      cancelled = true;
    };
  }, [userAddress, getCappingIncomeData]);

  // Load directs portfolio breakdown from ComprehensiveView
  useEffect(() => {
    let cancelled = false;
    const loadDirectsBreakdown = async () => {
      if (!userAddress) {
        setDirectsPortfolioData(null);
        setDirectsPortfolioLoading(false);
        setDirectsPortfolioError(null);
        return;
      }
      setDirectsPortfolioLoading(true);
      setDirectsPortfolioError(null);
      try {
        const data = await getDirectsPortfolioAndTeamVolumes(userAddress);
        if (cancelled) return;
        setDirectsPortfolioData(data || null);
      } catch (err) {
        console.warn("Failed to load directs portfolio breakdown:", err);
        if (!cancelled) {
          setDirectsPortfolioData(null);
          setDirectsPortfolioError(
            err?.message || "Failed to load directs portfolio breakdown"
          );
        }
      } finally {
        if (!cancelled) setDirectsPortfolioLoading(false);
      }
    };
    loadDirectsBreakdown();
    return () => {
      cancelled = true;
    };
  }, [userAddress, getDirectsPortfolioAndTeamVolumes]);

  // Load volume analytics from SlabManager
  useEffect(() => {
    let cancelled = false;
    async function loadVolumeData() {
      if (!userAddress || typeof getVolumeAnalytics !== "function") {
        setVolumeData(null);
        return;
      }
      try {
        setVolumeLoading(true);
        setVolumeError("");
        const analytics = await getVolumeAnalytics(userAddress);
        if (cancelled) return;
        setVolumeData(analytics ?? null);
      } catch (e) {
        if (cancelled) return;
        console.error("[Dashboard] Volume analytics error:", e);
        setVolumeError(e?.message || "Failed to load volume analytics");
      } finally {
        if (!cancelled) setVolumeLoading(false);
      }
    }
    loadVolumeData();
    return () => {
      cancelled = true;
    };
  }, [userAddress, getVolumeAnalytics]);

  // Load royalty overview from RoyaltyManager
  useEffect(() => {
    let cancelled = false;
    async function loadRoyaltyData() {
      if (!userAddress || typeof getRoyaltyOverview !== "function") {
        setRoyaltyDetails(null);
        return;
      }
      try {
        setRoyaltyLoading(true);
        const overview = await getRoyaltyOverview(userAddress);
        if (cancelled) return;
        setRoyaltyDetails(overview ?? null);
      } catch (e) {
        if (cancelled) return;
        console.error("[Dashboard] Royalty overview error:", e);
      } finally {
        if (!cancelled) setRoyaltyLoading(false);
      }
    }
    loadRoyaltyData();
    return () => {
      cancelled = true;
    };
  }, [userAddress, getRoyaltyOverview]);

  // Check for capped portfolio and show funnel
  useEffect(() => {
    if (!portFolioDetails) return;

    const isCapped = portFolioDetails?.isCapped ?? false;
    const hasSeenFunnel = localStorage.getItem("cappedFunnelSeen");

    // Show funnel if portfolio is capped and user hasn't seen it in this session
    if (isCapped && !hasSeenFunnel) {
      // Delay showing the funnel by 2 seconds for better UX
      const timer = setTimeout(() => {
        setShowCappedFunnel(true);
        localStorage.setItem("cappedFunnelSeen", "true");
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [portFolioDetails]);

  const handleCloseCappedFunnel = () => {
    setShowCappedFunnel(false);
  };

  // Accrued Growth claim handler
  const handleClaimGrowth = useCallback(async () => {
    try {
      if (!isConnected || !address) {
        throw new Error("Please connect your wallet to claim rewards.");
      }

      const unclaimedUsd = roiAgg?.unclaimedUsd ?? roiTotals?.unclaimedUsd ?? 0;
      if (!(unclaimedUsd > 0)) {
        throw new Error("No unclaimed rewards available to claim.");
      }

      // Load auto window to determine periods and show confirmation
      try {
        const autoWindow = await getAutoWindow(address);
        setAutoWindowInfo(autoWindow);
        
        if (autoWindow && autoWindow.success && autoWindow.canClaim && autoWindow.totalPeriods > 0) {
          const firstClaim = autoWindow.claimingPlan?.[0];
          const maxPerTransaction = 50; // claimROI() can claim max 50 days per transaction
          const claimingThisTime = Math.min(autoWindow.totalPeriods, maxPerTransaction);
          const remainingAfterThis = Math.max(0, autoWindow.totalPeriods - maxPerTransaction);
          const needsMultiple = autoWindow.totalPeriods > maxPerTransaction;
          
          setClaimConfirmData({
            totalDays: autoWindow.totalPeriods,
            claimingDays: claimingThisTime,
            remainingDays: remainingAfterThis,
            fromDate: firstClaim?.estimatedFromDate,
            toDate: firstClaim?.estimatedToDate,
            totalTransactions: needsMultiple ? Math.ceil(autoWindow.totalPeriods / maxPerTransaction) : 1,
            currentTransaction: 1,
            estimatedAmount: unclaimedUsd,
            autoWindow: autoWindow,
            needsMultipleTransactions: needsMultiple,
            maxPerTransaction: maxPerTransaction
          });
          setShowConfirmModal(true);
        } else {
          throw new Error('No claimable periods available');
        }
        
        console.log('[Dashboard] Auto window info loaded:', autoWindow);
      } catch (autoErr) {
        console.error('[Dashboard] Failed to load auto window info:', autoErr);
        setClaimError(autoErr?.message || 'Failed to load claiming information');
      }
    } catch (err) {
      console.error('Failed to prepare claim:', err);
      setClaimError(err?.message || 'Failed to prepare claim');
    } 
  }, [getAutoWindow, roiAgg, roiTotals, isConnected, address]);

  const handleConfirmClaim = useCallback(async () => {
    try {
      setShowConfirmModal(false);
      setIsClaimingGrowth(true);
      setShowClaimModal(true);
      setClaimError(null);
      
      // Reset success flag for new transaction
      successHandledRef.current = false;

      const tx = await claimAccruedROISmart(address);
      if (!tx) {
        throw new Error('Unable to build claim transaction');
      }

      handleSendTx(tx);
    } catch (err) {
      console.error('Failed to claim rewards:', err);
      setClaimError(err?.message || 'Failed to claim rewards');
      setIsClaimingGrowth(false);
      setShowClaimModal(false);
    }
  }, [claimAccruedROISmart, handleSendTx, address]);

  const handleClaimModalClose = () => {
    setShowClaimModal(false);
    setIsClaimingGrowth(false);
    setShowConfirmModal(false);
    setClaimError(null);
    setAutoWindowInfo(null);
    setClaimConfirmData(null);
  };

  const handleClaimSuccess = async () => {
    try {
      // Prevent multiple calls
      if (successHandledRef.current) {
        console.log('Success already handled, skipping...');
        return;
      }
      successHandledRef.current = true;
      
      // Close modals and reset states first
      setShowClaimModal(false);
      setIsClaimingGrowth(false);
      setClaimError(null);
      setAutoWindowInfo(null);
      setClaimConfirmData(null);
      
      // Show success notification (only once)
      toast.success('ROI Accrued Reward claimed successfully', {
        title: 'Success',
        duration: 4000,
        playSound: false // We'll use our custom financial sound instead
      });
      
      // Play transaction success sound
      financialSounds.playTransactionSuccess();
      
      // Reload dashboard data
      const reload = async () => {
        if (!userAddress) return;
        try {
          const [portfolioInfo, dashboardInfo] = await Promise.all([
            getTOtalPortFolio(userAddress),
            getDashboardDetails(userAddress),
          ]);
          if (dashboardInfo) {
            setDashboardDetails(dashboardInfo);
          }
          await refreshIncomeTotals();
          // Refresh ROI totals so the box updates after a claim
          if (typeof getROITotals === "function") {
            try {
            const totals = await getROITotals(userAddress);
            setRoiTotals(totals || null);
          } catch (e) {
            console.warn("Failed to refresh Accrued totals after claim:", e);
          }
        }
        // Refresh robust aggregates as well
        try {
          const [totals, windowInfo, claimedMap, distClaimedTotals] =
            await Promise.all([
              typeof getROITotals === "function"
                ? getROITotals(userAddress)
                : null,
              typeof getUnclaimedROIWindow === "function"
                ? getUnclaimedROIWindow(userAddress)
                : null,
              Array.isArray(portfolioIds) &&
              portfolioIds.length &&
              typeof getPaidUsdByPidMap === "function"
                ? getPaidUsdByPidMap(portfolioIds)
                : Promise.resolve({}),
              typeof getTotalsClaimedFromDistributor === "function"
                ? getTotalsClaimedFromDistributor(userAddress)
                : null,
            ]);
          const totalClaimedFromMap =
            claimedMap && typeof claimedMap === "object"
              ? Object.values(claimedMap).reduce(
                  (s, v) => s + (Number(v) || 0),
                  0
                )
              : 0;
          const claimedUsd =
            (distClaimedTotals?.usd != null
              ? Number(distClaimedTotals.usd)
              : null) ??
            (Number.isFinite(totalClaimedFromMap)
              ? totalClaimedFromMap
              : null) ??
            (totals?.claimedUsd != null ? Number(totals.claimedUsd) : 0);
          const totalsUnc =
            totals?.unclaimedUsd != null ? Number(totals.unclaimedUsd) : null;
          const windowUnc =
            windowInfo?.usd != null ? Number(windowInfo.usd) : null;
          const unclaimedUsd =
            (totalsUnc != null && totalsUnc > 0 ? totalsUnc : null) ??
            (windowUnc != null && windowUnc > 0 ? windowUnc : 0);
          setRoiAgg({
            claimedUsd: Number.isFinite(claimedUsd) ? claimedUsd : 0,
            unclaimedUsd: Number.isFinite(unclaimedUsd) ? unclaimedUsd : 0,
            claimedRama: distClaimedTotals?.rama ?? totals?.claimedRama ?? 0,
            unclaimedRama: totals?.unclaimedRama ?? windowInfo?.rama ?? 0,
          });
        } catch (e) {
          console.warn("Failed to refresh Accrued aggregates after claim:", e);
        }
      } catch (error) {
        console.error("Failed to refresh after claim:", error);
      }
    };
    reload();
    } catch (error) {
      console.error('Error in claim success handler:', error);
    }
  };

  // Monitor claim transaction
  useEffect(() => {
    if (isSuccess && receipt && isClaimingGrowth) {
      console.log("Claim successful, refreshing dashboard data...");
      setIsClaimingGrowth(false);
      setClaimError(null);
    }

    if (isError && isClaimingGrowth) {
      // Keep modal open so ProgressiveTransactionModal can show the error state
      setClaimError("Transaction failed. Please try again.");
      setIsClaimingGrowth(false);
      // do not close modal here; let the modal show the failure UI with explorer links
    }
  }, [isSuccess, isError, receipt, isClaimingGrowth]);

  const loadPortfolioById = async (pid) => {
    try {
      if (pid === null || pid === undefined) return;
      const aggregated =
        DashBoardDetail?.portfolios?.find(
          (p) => Number(p.pid) === Number(pid)
        ) ?? null;
      if (aggregated) {
        setFortFolioDetails(aggregated);
        return;
      }
      const res = await getPortFoliById(pid);
      setFortFolioDetails(res);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (!portfolioIds.length || selectedPid === null) return;
    loadPortfolioById(selectedPid);
  }, [selectedPid, portfolioIds.length, DashBoardDetail?.portfolios]);

  useEffect(() => {
    if (selectedPid !== null && Number.isFinite(Number(selectedPid))) {
      localStorage.setItem("selectedPortfolioId", String(selectedPid));
    }
  }, [selectedPid]);

  const microToUsd = (value) => (value ? Number(value) / 1e6 : 0);
  const wadToPercent = (value) => (value ? Number(value) / 1e16 : 0);
  const toNumberSafe = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  };

  const formatTimestamp = (value) => {
    if (value == null) return null;
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    return new Date(numeric * 1000).toLocaleString();
  };

  const hasPortfolio = Boolean(portFolioDetails);
  const normalizeUsd = ({ float, display, micro }) => {
    if (float != null && Number.isFinite(Number(float))) {
      return Number(float);
    }
    if (display != null && Number.isFinite(Number(display))) {
      return Number(display);
    }
    if (micro != null && Number.isFinite(Number(micro))) {
      return microToUsd(micro);
    }
    return 0;
  };
  const formatCapUsd = (value) => {
    if (value == null) return 0;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return numeric / 1e6;
  };
  const principalUSD = hasPortfolio
    ? normalizeUsd({
        float: portFolioDetails.principalUsd,
        display: portFolioDetails.principalUsdDisplay,
        micro:
          portFolioDetails.principalUsdMicro ??
          portFolioDetails.principalUSD ??
          portFolioDetails.principalUsdRaw,
      })
    : 0;
  const capPct = hasPortfolio ? Number(portFolioDetails.capPct ?? 0) : 0;
  const capProgressBps = hasPortfolio
    ? Number(portFolioDetails.capProgressBps ?? 0)
    : 0;
  const maturityTargetUsd = hasPortfolio
    ? normalizeUsd({
        float: portFolioDetails.capUsd,
        display: portFolioDetails.capUsdDisplay,
        micro:
          portFolioDetails.capUsdMicro ??
          portFolioDetails.capUSD ??
          portFolioDetails.capUsdRaw,
      }) || principalUSD * (capPct / 100 || 0)
    : 0;
  const freezeEndsAt = hasPortfolio
    ? Number(portFolioDetails.frozenUntil ?? 0)
    : 0;
  const createdAt = hasPortfolio ? Number(portFolioDetails.createdAt ?? 0) : 0;
  const isBoosterActive = hasPortfolio && Boolean(portFolioDetails?.booster);
  const dailyRatePercent = hasPortfolio
    ? wadToPercent(portFolioDetails?.dailyRateWad)
    : 0;
  const daysActive = createdAt
    ? Math.max(0, Math.floor((Date.now() / 1000 - createdAt) / 86400))
    : null;

  const selectedPortfolioPid =
    selectedPid ?? (portfolioIds.length ? Number(portfolioIds[0]) : null);
  const dashboardPortfolio =
    DashBoardDetail?.portfolios?.find(
      (entry) => Number(entry?.pid) === selectedPortfolioPid
    ) ?? null;
  const totalStakedUsdBase = toNumberSafe(
    DashBoardDetail?.totals?.totalStakedUsd ??
      DashBoardDetail?.totals?.totalValueUsd ??
      0
  );

  const portfolioPrincipalUsd =
    dashboardPortfolio?.principalUsd ?? principalUSD;
  const capPercentValue = dashboardPortfolio?.capPct ?? capPct;
  const expectedCapFromPercent = capPercentValue
    ? portfolioPrincipalUsd * (capPercentValue / 100)
    : portfolioPrincipalUsd * (isBoosterActive ? 2.5 : 2);
  let portfolioCapUsd = dashboardPortfolio?.capUsd ?? maturityTargetUsd;
  if (
    !portfolioCapUsd ||
    portfolioCapUsd <= 0 ||
    (expectedCapFromPercent > 0 &&
      Math.abs(portfolioCapUsd - expectedCapFromPercent) /
        expectedCapFromPercent >
        0.2)
  ) {
    portfolioCapUsd = expectedCapFromPercent;
  }
  const creditedUsdValue =
    dashboardPortfolio?.creditedUsd ?? portFolioDetails?.creditedUsd ?? 0;
  const pendingUsdValue = dashboardPortfolio?.pendingUsd ?? 0;
  const totalAccruedRewardUsd = creditedUsdValue + pendingUsdValue;
  
  // Remaining Reward = Maximum possible reward - Already accrued reward
  // Maximum possible reward = Cap - Principal (the growth portion only)
  const maxPossibleReward = Math.max(0, portfolioCapUsd - portfolioPrincipalUsd);
  const remainingRewardUsdFallback = Math.max(
    0,
    maxPossibleReward - totalAccruedRewardUsd
  );
  const remainingRewardUsd =
    dashboardPortfolio?.remainingCapUsd ??
    portFolioDetails?.remainingCapUsd ??
    remainingRewardUsdFallback;

  const cap4xUsd = comprehensiveCapStatus
    ? formatCapUsd(comprehensiveCapStatus.cap4xUSD6)
    : 0;
  const totalPortfolioUsd = comprehensiveCapStatus
    ? formatCapUsd(comprehensiveCapStatus.totalPortfolioValueUSD6)
    : portfolioCapUsd;

  // Use CappingIncomeManager data when available, otherwise fallback to comprehensive status or accrued rewards
  const usedCapRoiUnclaimedUsd = roiTotals?.unclaimedUsd ?? 0;
  const baseClaimedIncomeUsd =
    cappingIncomeData?.totalEarnedUSD ??
    (comprehensiveCapStatus
      ? formatCapUsd(comprehensiveCapStatus.totalIncomeEarnedUSD6)
      : totalAccruedRewardUsd);
  const claimedIncomeUsd =
    cappingIncomeData?.totalEarnedUSD != null || comprehensiveCapStatus
      ? baseClaimedIncomeUsd
      : Math.max(0, baseClaimedIncomeUsd - usedCapRoiUnclaimedUsd);
  const usedCapDirectIncomeUsd = cappingIncomeData?.breakdown?.direct ?? 0;
  const usedCapSlabIncomeUsd = cappingIncomeData?.breakdown?.slab ?? 0;
  const usedCapOverrideIncomeUsd =
    cappingIncomeData?.breakdown?.slabOverride ?? 0;
  const usedCapRoiClaimedUsd =
    cappingIncomeData?.breakdown?.roi ??
    Math.max(
      0,
      claimedIncomeUsd -
        (usedCapDirectIncomeUsd +
          usedCapSlabIncomeUsd +
          usedCapOverrideIncomeUsd)
    );
  const totalIncomeEarnedUsd =
    usedCapRoiUnclaimedUsd +
    usedCapRoiClaimedUsd +
    usedCapDirectIncomeUsd +
    usedCapSlabIncomeUsd +
    usedCapOverrideIncomeUsd;

  const remainingCapUsd = comprehensiveCapStatus
    ? formatCapUsd(comprehensiveCapStatus.remainingCapUSD6)
    : Math.max(0, cap4xUsd - totalIncomeEarnedUsd);
  const capProgressPercent =
    cap4xUsd > 0 ? Math.min(100, (totalIncomeEarnedUsd / cap4xUsd) * 100) : 0;
  const capProgressWidth = Number.isFinite(capProgressPercent)
    ? Math.max(0, Math.min(capProgressPercent, 100))
    : 0;
  const capProgressDisplay = Number.isFinite(capProgressPercent)
    ? capProgressPercent.toFixed(2)
    : "0.00";
  const hasCapStatus = comprehensiveCapStatus != null;

  const cappedAtLabel = hasPortfolio
    ? formatTimestamp(portFolioDetails?.cappedAt)
    : null;
  const closedAtLabel = hasPortfolio
    ? formatTimestamp(portFolioDetails?.closedAt)
    : null;
  const lastAccrualLabel = hasPortfolio
    ? formatTimestamp(portFolioDetails?.lastAccrual)
    : null;

  // Portfolio Cap Progress: Shows how much of the potential reward has been earned
  // Progress = (Accrued Reward / Maximum Possible Reward) * 100
  const maxPossibleRewardForProgress = Math.max(0, portfolioCapUsd - portfolioPrincipalUsd);
  const computedProgressFromTotals =
    maxPossibleRewardForProgress > 0
      ? Math.min(100, (totalAccruedRewardUsd / maxPossibleRewardForProgress) * 100)
      : 0;
  const progressRaw = capProgressBps
    ? capProgressBps / 100
    : computedProgressFromTotals;
  const progress = hasPortfolio ? Math.min(100, progressRaw) : 0;
  const progressLabel =
    hasPortfolio && Number.isFinite(progress) ? progress.toFixed(2) : null;
  const capLabel = capPercentValue
    ? `(${capPercentValue}% Cap${isBoosterActive ? " • Booster" : ""})`
    : "";

  const summaryReady = Boolean(DashBoardDetail);
  const summaryLoading = !summaryReady;
  const fallbackIncomeTotals = summaryReady
    ? DashBoardDetail?.incomeTotalsUsd ?? {}
    : {};
  const totalStakedUsd = summaryReady ? totalStakedUsdBase : 0;
  const userStatus = summaryReady ? DashBoardDetail?.userStatus ?? null : null;
  const totalClaimableUsd = summaryReady
    ? DashBoardDetail?.totalClaimableUsd ??
      DashBoardDetail?.incomeTotalsUsd?.total ??
      0
    : 0;
  const rawTotalEarnedUsd = summaryReady
    ? DashBoardDetail?.totalEarningsUsd ?? null
    : null;
  const totalEarnedUsdFromRama =
    summaryReady &&
    (rawTotalEarnedUsd == null || Number(rawTotalEarnedUsd) === 0) &&
    DashBoardDetail?.totalEarningsRama != null &&
    usdPerRama
      ? Number(DashBoardDetail.totalEarningsRama) * Number(usdPerRama)
      : rawTotalEarnedUsd;
  const growthUsd =
    incomeTotalsBreakdown?.growthUsd ?? fallbackIncomeTotals.growth ?? 0;
  const slabUsd =
    incomeTotalsBreakdown?.slabIncomeUsd ?? fallbackIncomeTotals.slab ?? 0;
  const royaltyUsd =
    incomeTotalsBreakdown?.royaltyUsd ?? fallbackIncomeTotals.royalty ?? 0;
  const overrideUsd = fallbackIncomeTotals.override ?? 0;
  const rewardUsd =
    incomeTotalsBreakdown?.rewardUsd ?? fallbackIncomeTotals.rewards ?? 0;
  const directIncomeUsd =
    incomeTotalsBreakdown?.directIncomeUsd ??
    fallbackIncomeTotals.direct ??
    fallbackIncomeTotals.directIncome ??
    0;
  const boosterRoiUsd = incomeTotalsBreakdown?.boosterRoiUsd ?? 0;
  const totalRoiUsd = incomeTotalsBreakdown?.totalRoiUsd ?? 0;
  const todayRoiUsd = incomeTotalsBreakdown?.todayRoiUsd ?? 0;
  const totalEarnedUsd = summaryReady
    ? incomeTotalsBreakdown?.allIncomesUsd ??
      fallbackIncomeTotals.total ??
      totalEarnedUsdFromRama ??
      DashBoardDetail?.totalEarningsUsd ??
      0
    : 0;
  const incomeBreakdownRows = [
    { label: "Portfolio Daily Accrued Reward", value: totalRoiUsd },
    // { label: "Daily Accrued Reward (Today)", value: todayRoiUsd },
    // { label: "Daily Accrued Reward (Booster)", value: boosterRoiUsd },
    { label: "Direct Income", value: directIncomeUsd },
    { label: "Slab Income", value: slabUsd },
    { label: "Royalty Income", value: royaltyUsd },
    { label: "Rewards", value: rewardUsd },
    // { label: "Growth Income", value: growthUsd },
  ];
  const safeWalletRama = summaryReady
    ? DashBoardDetail?.safeWallet?.rama ?? 0
    : 0;
  const safeWalletUsd =
    summaryReady && (usdPerRama ?? 0) > 0
      ? Number(safeWalletRama ?? 0) * Number(usdPerRama)
      : null;
  const directMembers =
    teamSummary?.totalDirects ??
    DashBoardDetail?.slabPanel?.directMembers ??
    DashBoardDetail?.userStatus?.directs ??
    0;
  const holdTotals = missedOverview?.held ?? {};
  const holdTotalUsd =
    holdTotals?.totalUsd != null
      ? holdTotals.totalUsd
      : (holdTotals.royaltyUsd || 0) +
        (holdTotals.oneTimeUsd != null
          ? holdTotals.oneTimeUsd
          : holdTotals.rewardsUsd || 0);
  const holdRoyaltyUsd = holdTotals.royaltyUsd || 0;
  const holdOneTimeUsd =
    holdTotals.oneTimeUsd != null
      ? holdTotals.oneTimeUsd
      : holdTotals.rewardsUsd || 0;
  const slabLevel =
    teamMemberDetails?.slabLevel ??
    DashBoardDetail?.slabPanel?.slabIndex ??
    DashBoardDetail?.userStatus?.slabLevel ??
    0;
  const slabNames = [
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
  const slabName = slabNames[slabLevel] ?? "None";
  const totalTeamMembers =
    teamSummary?.totalTeamSize ??
    DashBoardDetail?.teamCount ??
    DashBoardDetail?.slabPanel?.teamCount ??
    DashBoardDetail?.userStatus?.teamCount ??
    directMembers ??
    0;

  const renderLoading = (label = "Loading…") => (
    <span className="inline-flex items-center gap-2 text-cyan-200 text-sm">
      <Loader2 className="animate-spin" size={14} />
      <span>{label}</span>
    </span>
  );

  const formatCount = (value) => Number(value ?? 0).toLocaleString("en-US");
  const formatRamaWithUnit = (value) => `${formatRAMA(value ?? 0)} RAMA`;

  const handleSelectPid = (event) => {
    const { value } = event.target;
    setSelectedPid(value === "" ? null : Number(value));
  };

  const qualifiedVolumeUsd =
    userStatus?.qualifiedVolumeUsd ??
    DashBoardDetail?.slabPanel?.qualifiedVolumeUsd ??
    DashBoardDetail?.totals?.qualifiedVolumeUsd ??
    0;
  
  // Calculate royalty level from achievedStages (same logic as RoyaltyProgram.jsx)
  const ROYALTY_TIER_NAMES = [
    'Coral Starter', 'Pearl Diver', 'Sea Explorer', 'Wave Rider',
    'Tide Surge', 'Deep Blue', 'Ocean Guardian', 'Marine Commander',
    'Aqua Captain', 'Current Master', 'Sea Legend', 'Trident Icon',
    'Poseidon Crown', 'Ocean Supreme'
  ];
  
  const achievedStagesArray = Array.isArray(royaltyDetails?.achievedStages) 
    ? royaltyDetails.achievedStages.map(s => Number(s)).filter(s => Number.isFinite(s) && s >= 0)
    : [];
  
  // Current tier is the highest achieved stage (0-indexed)
  const normalizedTierIndex = achievedStagesArray.length > 0
    ? Math.max(...achievedStagesArray)
    : 0;
  
  // Clamp to valid tier range
  const clampedTierIndex = Math.min(Math.max(normalizedTierIndex, 0), ROYALTY_TIER_NAMES.length - 1);
  
  // Display level is 1-indexed for user (Tier 1, Tier 2, etc.)
  const royaltyLevel = achievedStagesArray.length > 0 ? clampedTierIndex + 1 : 0;
  const royaltyTierName = achievedStagesArray.length > 0 ? ROYALTY_TIER_NAMES[clampedTierIndex] : null;
  
  const royaltyPayouts = summaryReady ? royaltyUsd : null;
  const combinedBackendUsd = slabUsd + royaltyUsd + overrideUsd;
  const readyToClaimUsd = totalClaimableUsd;

  const activityItems = [
    {
      icon: DollarSign,
      wrapperClass: "bg-neon-green/20 border border-neon-green/30",
      iconClass: "text-neon-green",
      valueClass: "text-neon-green",
      title: "Claimable Balance",
      value: summaryLoading ? renderLoading() : formatUSD(readyToClaimUsd),
      subtitle: "Current on-chain claimable rewards",
    },
    {
      icon: Gift,
      wrapperClass: "bg-cyan-400/20 border border-cyan-400/30",
      iconClass: "text-cyan-400",
      valueClass: "text-cyan-300",
      title: "One-Time Rewards",
      value: summaryLoading ? renderLoading() : formatUSD(rewardUsd),
      subtitle: "Lifetime milestone bonuses (on-chain)",
    },
    {
      icon: Users,
      wrapperClass: "bg-neon-orange/20 border border-neon-orange/30",
      iconClass: "text-neon-orange",
      valueClass: "text-neon-orange",
      title: "Team Distributions",
      value: summaryLoading
        ? renderLoading()
        : combinedBackendUsd > 0
        ? formatUSD(combinedBackendUsd)
        : "Backend sync pending",
      subtitle: "Slab, override, royalty payouts handled off-chain",
    },
  ];

  const portfolioStatus = useMemo(() => {
    const isClosed = hasPortfolio
      ? portFolioDetails?.isClosed ?? portFolioDetails?.active === false
      : false;
    const isCapped = Boolean(portFolioDetails?.isCapped);
    const isFrozen = freezeEndsAt && freezeEndsAt * 1000 > Date.now();

    if (!hasPortfolio) {
      return portfolioIds.length ? PortfolioStatus.Running : "No Portfolio";
    }
    if (isClosed) return PortfolioStatus.Closed;
    if (isCapped) return PortfolioStatus.Capped;
    if (isFrozen) return PortfolioStatus.Frozen;
    return PortfolioStatus.Running;
  }, [
    hasPortfolio,
    portFolioDetails?.isClosed,
    portFolioDetails?.active,
    portFolioDetails?.isCapped,
    portfolioIds.length,
    freezeEndsAt,
  ]);

  const portfolioStatusColor = useMemo(() => {
    switch (portfolioStatus) {
      case PortfolioStatus.Closed:
        return "bg-red-400";
      case PortfolioStatus.Capped:
        return "bg-neon-orange";
      case PortfolioStatus.Frozen:
        return "bg-cyan-400";
      case PortfolioStatus.Running:
        return "bg-neon-green";
      default:
        return "bg-slate-400";
    }
  }, [portfolioStatus]);

  const portfolioStatusTextClass = useMemo(() => {
    switch (portfolioStatus) {
      case PortfolioStatus.Closed:
        return "text-red-300";
      case PortfolioStatus.Capped:
        return "text-neon-orange";
      case PortfolioStatus.Frozen:
        return "text-cyan-300";
      case PortfolioStatus.Running:
        return "text-neon-green";
      default:
        return "text-cyan-200";
    }
  }, [portfolioStatus]);

  const portfolioStatusBadgeClass = useMemo(() => {
    switch (portfolioStatus) {
      case PortfolioStatus.Closed:
        return "border-red-400/60 text-red-300 bg-red-400/10";
      case PortfolioStatus.Capped:
        return "border-neon-orange/60 text-neon-orange bg-neon-orange/10";
      case PortfolioStatus.Frozen:
        return "border-cyan-400/60 text-cyan-300 bg-cyan-400/10";
      case PortfolioStatus.Running:
        return "border-neon-green/60 text-neon-green bg-neon-green/10";
      default:
        return "border-cyan-500/30 text-cyan-200 bg-cyan-500/10";
    }
  }, [portfolioStatus]);

  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/signup?ref=${userAddress}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy referral link:", err);
    }
  };

  const loadInlineDebug = async () => {
    if (!selectedPid || portfolioDebugInfo) return;

    setDebugLoading(true);
    try {
      const timing = await getROITiming();
      const lastPeriod =
        timing?.lastDistributionTs || Math.floor(Date.now() / 1000);
      const periodId = Math.floor(lastPeriod / 600);

      const debugInfo = await debugPortfolioUsdForPeriod(selectedPid, periodId);
      setPortfolioDebugInfo(debugInfo);
    } catch (err) {
      console.error("Failed to load inline debug info:", err);
      toast.error("Failed to load debug details");
    } finally {
      setDebugLoading(false);
    }
  };

  // Income tracking function to detect changes and trigger sounds/glows
  const trackDashboardChanges = useCallback(() => {
    if (!address || !isConnected) return;

    const addressKey = address.toLowerCase();

    // Track main dashboard values
    incomeTracker.trackValue(
      `total-staked-${addressKey}`,
      totalStakedUsd || 0,
      "portfolio",
      { source: "Staked Portfolio", cardId: "staked-portfolio" }
    );

    incomeTracker.trackValue(
      `total-earned-${addressKey}`,
      totalEarnedUsd || 0,
      "income",
      { source: "Total Earned", cardId: "total-earned" }
    );

    incomeTracker.trackValue(
      `ready-to-claim-${addressKey}`,
      readyToClaimUsd || 0,
      "Accrued",
      { source: "Ready to Claim", cardId: "ready-to-claim" }
    );

    incomeTracker.trackValue(
      `total-accrued-${addressKey}`,
      totalAccruedRewardUsd || 0,
      "Accrued",
      { source: "Total Accrued", cardId: "total-accrued" }
    );

    // Track individual income types
    if (incomeTotalsBreakdown) {
      incomeTracker.trackValue(
        `direct-income-${addressKey}`,
        directIncomeUsd || 0,
        "direct",
        { source: "Direct Income", cardId: "direct-income" }
      );

      incomeTracker.trackValue(
        `slab-income-${addressKey}`,
        slabUsd || 0,
        "slab",
        { source: "Slab Income", cardId: "slab-income" }
      );

      incomeTracker.trackValue(
        `royalty-income-${addressKey}`,
        royaltyUsd || 0,
        "royalty",
        { source: "Royalty Income", cardId: "royalty-income" }
      );

      incomeTracker.trackValue(
        `reward-income-${addressKey}`,
        rewardUsd || 0,
        "reward",
        { source: "Reward Income", cardId: "reward-income" }
      );

      incomeTracker.trackValue(
        `growth-income-${addressKey}`,
        growthUsd || 0,
        "growth",
        { source: "Growth Income", cardId: "growth-income" }
      );
    }
  }, [
    address,
    isConnected,
    totalStakedUsd,
    totalEarnedUsd,
    readyToClaimUsd,
    totalAccruedRewardUsd,
    incomeTotalsBreakdown,
    directIncomeUsd,
    slabUsd,
    royaltyUsd,
    rewardUsd,
    growthUsd,
  ]);

  // Load sound settings and track changes
  // Run income tracking when values change
  useEffect(() => {
    if (summaryReady && !isLoading) {
      trackDashboardChanges();
    }
  }, [trackDashboardChanges, summaryReady, isLoading]);

  // Auto-refresh to detect new income
  useEffect(() => {
    if (!isConnected || !address) return;

    const interval = setInterval(() => {
      // Refresh data silently to detect changes
      if (!isLoading) {
        getTOtalPortFolio(address).catch(() => {});
        getDashboardDetails(address).catch(() => {});
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [isConnected, address, isLoading, getTOtalPortFolio, getDashboardDetails]);



  const [directTeamInfo, setDirecTeamInfo] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const loadDirectTeamInfo = async () => {
      if (!userAddress) {
        setDirecTeamInfo(null);
        return;
      }
      try {
        const data = await getDirectsPortfolioBreakdown(userAddress);
        console.log("Direct Team Info:", data);
        if (cancelled) return;
        setDirecTeamInfo(data || null);
      } catch (err) {
        console.warn("Failed to load direct team info:", err);
        if (!cancelled) {
          setDirecTeamInfo(null);
        }
      }
    };
    loadDirectTeamInfo();
    return () => {
      cancelled = true;
    };
  }, [userAddress]);

  return (
    <div className="space-y-4 sm:space-y-6">

      <div className="flex items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green relative inline-block">
          Dashboard
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-neon-green/20 blur-xl -z-10" />
        </h1>
        <LayoutDashboard
        size={20}
        className="text-white"
        />
      </div>


      <IncomeNotificationOverlay />
      {dashError && (
        <div className="cyber-glass border border-red-400/40 bg-red-500/5 text-red-300 rounded-xl px-4 py-3 text-sm">
          {dashError}
        </div>
      )}
      {isLoading && (
        <div className="cyber-glass border border-cyan-500/30 text-cyan-200 rounded-xl px-4 py-3 text-sm">
          Syncing latest on-chain data…
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <Link
          to="/dashboard"
          id="staked-portfolio"
          className="cyber-glass border border-cyan-500/30 hover:border-cyan-500/80 rounded-xl p-4 sm:p-5 text-white transition-all group relative overflow-hidden income-glow-target"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center gap-3 mb-3 relative z-10">
            <div className="p-2 bg-cyan-500/20 rounded-lg flex-shrink-0 border border-cyan-500/30">
              <Wallet size={20} className="text-cyan-400" />
            </div>
            <p className="text-xs sm:text-sm font-medium text-cyan-300 uppercase tracking-wide">
              Staked Portfolio
            </p>
          </div>
          <NumberPopup
            value={formatUSD(totalStakedUsd)}
            label="Staked Portfolio"
            className="text-xl sm:text-2xl font-bold mb-2 text-cyan-400 relative z-10"
            isLoading={summaryLoading}
          />
          <div className="flex items-center gap-1 text-xs text-cyan-300/90 relative z-10">
            <span>View Portfolio</span>
            <ArrowUpRight
              size={14}
              className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
            />
          </div>
        </Link>

        <div
          role="button"
          tabIndex={0}
          onClick={() => setShowIncomeModal(true)}
          onKeyDown={(e) => e.key === "Enter" && setShowIncomeModal(true)}
          id="total-earned"
          className="w-full cyber-glass border border-neon-green/30 hover:border-neon-green/80 rounded-xl p-4 sm:p-5 text-white transition-all group relative overflow-hidden text-left cursor-pointer income-glow-target"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-neon-green/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between mb-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-neon-green/20 rounded-lg flex-shrink-0 border border-neon-green/30">
                <TrendingUp size={20} className="text-neon-green" />
              </div>
              <p className="text-xs sm:text-sm font-medium text-neon-green uppercase tracking-wide">
                Total Earned
              </p>
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                if (!incomeTotalsLoading) {
                  refreshIncomeTotals();
                }
              }}
              disabled={incomeTotalsLoading}
              className="inline-flex items-center justify-center p-2 rounded-full border border-neon-green/30 text-neon-green hover:border-neon-green/60 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Refresh income totals"
            >
              <RefreshCw
                size={14}
                className={incomeTotalsLoading ? "animate-spin" : ""}
              />
            </button>
          </div>
          <NumberPopup
            value={formatUSD(totalEarnedUsd)}
            label="Total Earned"
            className="text-xl sm:text-2xl font-bold mb-2 text-neon-green relative z-10"
            isLoading={summaryLoading || incomeTotalsLoading}
          />
          <div className="flex items-center gap-1 text-xs text-neon-green/70 relative z-10">
            <span>
              {incomeTotalsLoading
                ? "Loading breakdown…"
                : "View earnings breakdown"}
            </span>
            <ArrowUpRight
              size={14}
              className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
            />
          </div>
          {incomeTotalsError && !incomeTotalsLoading && (
            <p className="mt-2 text-[11px] text-neon-orange/80 relative z-10">
              {incomeTotalsError}
            </p>
          )}
        </div>

        {/* Till Accrued (claimed + unclaimed) */}
        <div
          id="total-accrued"
          className="w-full cyber-glass border border-neon-purple/30 hover:border-neon-purple/80 rounded-xl p-4 sm:p-5 text-white transition-all group relative overflow-hidden income-glow-target"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between mb-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-neon-purple/20 rounded-lg flex-shrink-0 border border-neon-purple/30">
                <DollarSign size={20} className="text-neon-purple" />
              </div>
              <p className="text-xs sm:text-sm font-medium text-neon-purple uppercase tracking-wide">
                Till Accrued
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                // refresh accrued stats
                if (
                  typeof getAccruedRewardStats === "function" &&
                  userAddress
                ) {
                  setAccruedLoading(true);
                  setAccruedError("");
                  getAccruedRewardStats(userAddress)
                    .then((stats) => setAccruedStats(stats ?? null))
                    .catch((err) => setAccruedError(err?.message || "Failed"))
                    .finally(() => setAccruedLoading(false));
                }
              }}
              disabled={accruedLoading}
              className="inline-flex items-center justify-center p-2 rounded-full border border-neon-purple/30 text-neon-purple hover:border-neon-purple/60 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Refresh accrued totals"
            >
              <RefreshCw
                size={14}
                className={accruedLoading ? "animate-spin" : ""}
              />
            </button>
          </div>
          <NumberPopup
            value={formatUSD(tillAccruedUsd)}
            label="Till Accrued"
            className="text-xl sm:text-2xl font-bold mb-2 text-neon-purple relative z-10"
            isLoading={accruedLoading || roiAggLoading}
          />
          <div className="text-[11px] text-neon-purple/70 relative z-10">
            Claimed + Unclaimed
          </div>
          {accruedError && !accruedLoading && (
            <p className="mt-2 text-[11px] text-neon-orange/80 relative z-10">
              {accruedError}
            </p>
          )}
        </div>

        {/* Last Portfolio */}
        <div className="cyber-glass border border-cyan-500/30 hover:border-cyan-500/80 rounded-xl p-4 sm:p-5 text-white transition-all group relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center gap-3 mb-3 relative z-10">
            <div className="p-2 bg-cyan-500/20 rounded-lg flex-shrink-0 border border-cyan-500/30">
              <Award size={20} className="text-cyan-400" />
            </div>
            <p className="text-xs sm:text-sm font-medium text-cyan-300 uppercase tracking-wide">
              Last Portfolio
            </p>
          </div>
          <p className="text-xl sm:text-2xl font-bold mb-2 text-cyan-400 relative z-10">
            {lastPortfolioId !== null && lastPortfolioId !== undefined
              ? String(lastPortfolioId)
              : "—"}
          </p>
          <div className="flex items-center gap-1 text-xs text-cyan-300/90 relative z-10">
            <span>
              {lastPortfolioId ? "Most recent PID" : "No portfolios yet"}
            </span>
          </div>
        </div>

        <div
          id="team-network"
          className="cyber-glass border border-neon-orange/40 rounded-xl p-4 sm:p-5 text-white transition-all group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-neon-orange/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="flex items-center gap-3 mb-3 relative z-10">
            <div className="p-2 bg-neon-orange/20 rounded-lg flex-shrink-0 border border-neon-orange/30">
              <Users size={20} className="text-neon-orange" />
            </div>
            <p className="text-xs sm:text-sm font-medium text-neon-orange uppercase tracking-wide">
              Team/Volume
            </p>
          </div>

          {/* Main Members Count */}
          <div className="mb-3 relative z-10">
            {directsPortfolioLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-neon-orange/20 rounded animate-pulse"></div>
                <div className="w-20 h-5 bg-neon-orange/20 rounded animate-pulse"></div>
              </div>
            ) : (
              <p className="text-xl sm:text-2xl font-bold mb-2 text-neon-orange relative z-10">
                {directsPortfolioData?.summary?.directCount +
                  (directsPortfolioData?.summary?.totalTeamCount || 0) ||
                  formatCount(totalTeamMembers)}{" "}
                <span className="text-sm font-medium text-neon-orange/80">members</span>
              </p>
            )}
          </div>

          {/* Business Metrics */}
          {!directsPortfolioLoading && (
            <div className="space-y-2 relative z-10">
              <div className="flex justify-between items-center">
                <span className="text-xs text-neon-orange/70 font-medium">
                  Directs:
                </span>
                <span className="text-sm font-semibold text-neon-orange">
                  {directsPortfolioData?.summary?.directCount ||
                    formatCount(directMembers)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-neon-orange/70 font-medium">
                  Direct Volume:
                </span>
                <span className="text-sm font-semibold text-neon-orange">
                  ${(parseFloat(directTeamInfo?.fullData["totalSelfUsd"]) / 1e6).toFixed(2) || "0.00"}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs text-neon-orange/70 font-medium">
                  Total Team Volume:
                </span>
                <span className="text-sm font-semibold text-neon-orange">
                  ${(parseFloat(directTeamInfo?.fullData["totalSumUsd"]) / 1e6).toFixed(2) || "0.00"}
                </span>
              </div>
            </div>
          )}

          {/* View Details Link */}
          <div className="flex items-center gap-1 text-xs text-neon-orange/90 relative z-10 mt-3">
            <Link
              to="/dashboard/team"
              className="flex items-center gap-1 hover:text-neon-orange transition-colors"
            >
              <span>View Details</span>
              <ArrowUpRight
                size={14}
                className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
              />
            </Link>
          </div>

          {directsPortfolioError && (
            <p className="text-xs text-red-400 mt-2 relative z-10">
              {directsPortfolioError}
            </p>
          )}
        </div>

        <Link
          to="/dashboard/safe-wallet"
          className="cyber-glass border border-cyan-400/30 hover:border-cyan-400/80 rounded-xl p-4 sm:p-5 text-white transition-all group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center gap-3 mb-3 relative z-10">
            <div className="p-2 bg-cyan-400/20 rounded-lg flex-shrink-0 border border-cyan-400/30">
              <Wallet size={20} className="text-cyan-400" />
            </div>
            <p className="text-xs sm:text-sm font-medium text-cyan-400 uppercase tracking-wide">
              Safe Wallet
            </p>
          </div>
          <NumberPopup
            value={
              safeWalletUsd != null
                ? formatUSD(safeWalletUsd)
                : formatRamaWithUnit(safeWalletRama)
            }
            label="Safe Wallet"
            className="text-xl sm:text-2xl font-bold mb-2 text-cyan-400 relative z-10"
            isLoading={summaryLoading}
          />
          <div className="text-xs text-cyan-300/80 relative z-10 mb-1">
            {formatRamaWithUnit(safeWalletRama)}
          </div>
          <div className="flex items-center gap-1 text-xs text-cyan-300/90 relative z-10">
            <span>Manage Wallet</span>
            <ArrowUpRight
              size={14}
              className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
            />
          </div>
        </Link>

        {/* Total Missed */}
        <Link
          to="/dashboard/missed-income"
          className="cyber-glass border border-red-400/30 hover:border-red-400/80 rounded-xl p-4 sm:p-5 text-white transition-all group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-red-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center gap-3 mb-3 relative z-10">
            <div className="p-2 bg-red-400/20 rounded-lg flex-shrink-0 border border-red-400/30">
              <XCircle size={20} className="text-red-400" />
            </div>
            <p className="text-xs sm:text-sm font-medium text-red-400 uppercase tracking-wide">
              Total Missed
            </p>
          </div>
          <NumberPopup
            value={formatUSD(missedOverview?.totalMissedUsd ?? 0)}
            label="Total Missed"
            className="text-xl sm:text-2xl font-bold mb-2 text-red-400 relative z-10"
            isLoading={missedLoading}
          />
          <div className="text-xs text-red-300/80 relative z-10 mb-1">
            {missedOverview?.capLocked ? "Cap Locked" : "Active Portfolio"}
          </div>
          <div className="flex items-center gap-1 text-xs text-red-300/90 relative z-10">
            <span>View Details</span>
            <ArrowUpRight
              size={14}
              className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
            />
          </div>
        </Link>

        {/* Total Hold */}
        <Link
          to="/dashboard/missed-income"
          className="cyber-glass border border-yellow-400/30 hover:border-yellow-400/80 rounded-xl p-4 sm:p-5 text-white transition-all group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center gap-3 mb-3 relative z-10">
            <div className="p-2 bg-yellow-400/20 rounded-lg flex-shrink-0 border border-yellow-400/30">
              <Pause size={20} className="text-yellow-400" />
            </div>
            <p className="text-xs sm:text-sm font-medium text-yellow-400 uppercase tracking-wide">
              Total Hold
            </p>
          </div>
          <NumberPopup
            value={formatUSD(holdTotalUsd || 0)}
            label="Total Hold"
            className="text-xl sm:text-2xl font-bold mb-2 text-yellow-400 relative z-10"
            isLoading={missedLoading}
          />
          <div className="text-xs text-yellow-300/80 relative z-10 mb-1">
            Post-cap rewards waiting in RewardVault until a new portfolio activates.
          </div>
          <div className="text-[10px] text-yellow-200/70 relative z-10 mb-2">
            Royalty Hold: {formatUSD(holdRoyaltyUsd || 0)} • One-Time Hold: {formatUSD(holdOneTimeUsd || 0)}
          </div>
          <div className="flex items-center gap-1 text-xs text-yellow-300/90 relative z-10">
            <span>View Details</span>
            <ArrowUpRight
              size={14}
              className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
            />
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Mobile-only referral card placed immediately before the 7-day trend */}
          <div className="block lg:hidden">
            <div className="cyber-glass border border-neon-green/50 hover:border-neon-green rounded-2xl p-4 sm:p-6 text-white relative overflow-hidden group transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-neon-green/10 to-cyan-500/10 opacity-50 group-hover:opacity-70 transition-opacity" />
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon-green/70 to-transparent" />

              <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className="p-2 bg-neon-green/20 rounded-lg flex-shrink-0 border border-neon-green/40">
                  <User2Icon size={20} className="text-neon-green" />
                </div>
                <div>
                  <p className="text-sm text-neon-green font-medium uppercase tracking-wide">
                    Your Referral Link
                  </p>
                </div>
              </div>

              <div className="relative z-10">
                <div className="bg-slate-900/50 border border-cyan-500/30 rounded-lg p-3 flex items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm text-cyan-300 truncate">
                    {`${window.location.origin}/signup?ref=${
                      userAddress.slice(0, 5) + "...." + userAddress.slice(-4)
                    }`}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-xs font-medium text-neon-green hover:text-white transition-colors"
                  >
                    <Copy size={14} />
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="cyber-glass rounded-2xl p-4 sm:p-6 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-cyan-300 uppercase tracking-wide">
                  Lifetime 4x Cap Progress
                </h2>
                <p className="text-xs text-cyan-300/80">
                  Global earnings cap across all active portfolios
                </p>
              </div>
              <span className="text-sm font-bold text-neon-green">
                {hasCapStatus ? `${capProgressDisplay}%` : "—"}
              </span>
            </div>

            {hasCapStatus ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center mb-2 gap-2">
                    <span className="text-xs sm:text-sm font-medium text-cyan-400 uppercase tracking-wider">
                      Cap Progress
                    </span>
                  </div>
                  <div className="h-3 bg-dark-900 rounded-full overflow-hidden border border-cyan-500/30 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-neon-green/20 animate-pulse" />
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-neon-green rounded-full transition-all relative z-10"
                      style={{ width: `${capProgressWidth.toFixed(2)}%` }}
                    />
                  </div>
                  <p className="text-xs text-cyan-300/90 mt-1">
                    {formatUSD(totalIncomeEarnedUsd)} / {formatUSD(cap4xUsd)}
                    <span className="ml-1 text-neon-green">4x cap</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                  <div className="p-3 sm:p-4 cyber-glass rounded-xl border border-cyan-500/30 hover:border-cyan-500/80 transition-all">
                    <p className="text-[11px] text-cyan-400 uppercase tracking-wider">
                      Total Portfolio
                    </p>
                    <p className="text-lg sm:text-xl font-bold text-cyan-300">
                      {formatUSD(totalPortfolioUsd)}
                    </p>
                    <p className="text-[11px] text-cyan-300/70 mt-1">
                      Active stake amount
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 cyber-glass rounded-xl border border-neon-purple/30 hover:border-neon-purple/80 transition-all">
                    <p className="text-[11px] text-neon-purple uppercase tracking-wider">
                      Total Available Cap
                    </p>
                    <p className="text-lg sm:text-xl font-bold text-neon-purple">
                      {formatUSD(cap4xUsd)}
                    </p>
                    <p className="text-[11px] text-neon-purple/70 mt-1">
                      4x of active portfolio
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 cyber-glass rounded-xl border border-neon-green/30 hover:border-neon-green/80 transition-all">
                    <p className="text-[11px] text-neon-green uppercase tracking-wider">
                      Used Cap
                    </p>
                    <p className="text-lg sm:text-xl font-bold text-neon-green">
                      {formatUSD(totalIncomeEarnedUsd)}
                    </p>
                    <p className="text-[11px] text-neon-green/70 mt-1">
                      All earnings (Accrued, direct, slab, override)
                    </p>
                    <div className="text-[9px] text-neon-green/50 mt-1 space-y-0.5">
                      <div className="flex justify-between">
                        <span>Accrued (Unclaimed):</span>
                        <span>{formatUSD(usedCapRoiUnclaimedUsd)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Accrued (Claimed):</span>
                        <span>{formatUSD(usedCapRoiClaimedUsd)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Direct:</span>
                        <span>{formatUSD(usedCapDirectIncomeUsd)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Slab:</span>
                        <span>{formatUSD(usedCapSlabIncomeUsd)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Override:</span>
                        <span>{formatUSD(usedCapOverrideIncomeUsd)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Temporary Debug Button for CappingIncomeManager - Remove in production */}
                  {/* {process.env.NODE_ENV === 'development' && (
                    <div className="col-span-full mt-2 flex gap-2">
                      <button
                        onClick={async () => {
                          console.log('[Dashboard] Testing CappingIncomeManager manually...');
                          try {
                            const data = await getCappingIncomeData(userAddress);
                            console.log('[Dashboard] Manual test result:', data);
                            alert(`Total Earned: $${data?.totalEarnedUSD?.toFixed(2) || '0.00'}\nBreakdown:\nROI: $${data?.breakdown?.roi?.toFixed(2) || '0.00'}\nDirect: $${data?.breakdown?.direct?.toFixed(2) || '0.00'}\nSlab: $${data?.breakdown?.slab?.toFixed(2) || '0.00'}\nOverride: $${data?.breakdown?.slabOverride?.toFixed(2) || '0.00'}`);
                          } catch (err) {
                            console.error('[Dashboard] Manual test error:', err);
                            alert(`Error: ${err.message}`);
                          }
                        }}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded border border-purple-500"
                      >
                        🧪 Test CappingIncome
                      </button>
                      <button
                        onClick={async () => {
                          console.log('[Dashboard] Testing DirectsPortfolioBreakdown manually...');
                          try {
                            const data = await getDirectsPortfolioBreakdown(userAddress);
                            console.log('[Dashboard] Manual test result:', data);
                            alert(`Total Directs: ${data?.summary?.directCount || 0}\nSelf Business: $${data?.summary?.totalSelfUsd?.toFixed(2) || '0.00'}\nTeam Business: $${data?.summary?.totalTeamUsd?.toFixed(2) || '0.00'}\nTotal Volume: $${data?.summary?.totalSumUsd?.toFixed(2) || '0.00'}`);
                          } catch (err) {
                            console.error('[Dashboard] Manual test error:', err);
                            alert(`Error: ${err.message}`);
                          }
                        }}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded border border-green-500"
                      >
                        🧪 Test DirectsBreakdown
                      </button>
                    </div>
                  )} */}
                  <div className="p-3 sm:p-4 cyber-glass rounded-xl border border-neon-orange/30 hover:border-neon-orange/80 transition-all">
                    <p className="text-[11px] text-neon-orange uppercase tracking-wider">
                      Remaining Cap
                    </p>
                    <p className="text-lg sm:text-xl font-bold text-neon-orange">
                      {formatUSD(remainingCapUsd)}
                    </p>
                    <p className="text-[11px] text-neon-orange/70 mt-1">
                      Capacity left to earn
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 sm:p-4 border border-cyan-500/20 rounded-xl bg-dark-900/40 text-xs text-cyan-300/80">
                Cap status data not yet available.
              </div>
            )}

            {comprehensiveCapError && (
              <p className="text-xs text-neon-orange/80 mt-4">
                {comprehensiveCapError}
              </p>
            )}
          </div>

          <div className="cyber-glass rounded-2xl p-4 sm:p-6 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h2 className="text-base sm:text-lg font-semibold text-cyan-300 uppercase tracking-wide">
                Portfolio Status
              </h2>
              {isBoosterActive && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-neon-orange to-neon-pink text-white rounded-lg text-xs sm:text-sm font-bold flex-shrink-0 w-fit shadow-lg animate-glow-pulse border border-neon-orange/50">
                  <Zap size={14} className="animate-pulse" />
                  <span className="uppercase">Booster Active</span>
                </div>
              )}
              {hasPortfolio && (
                <div
                  className={`px-3 py-1.5 rounded-lg border text-xs sm:text-sm font-bold flex-shrink-0 w-fit ${portfolioStatusBadgeClass}`}
                >
                  <span className="uppercase">{portfolioStatus}</span>
                </div>
              )}

              {/* Portfolio ID Select */}
              <div className="w-full sm:w-auto">
                <label className="block text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
                  Portfolio ID
                </label>
                <div className="relative">
                  <select
                    value={selectedPid ?? ""}
                    onChange={handleSelectPid}
                    className="
                      peer w-full sm:w-56 appearance-none pr-10 pl-3 py-2 rounded-lg
                      bg-dark-900/60 text-cyan-200 border border-cyan-500/30
                      focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-400
                      transition-all cyber-glass
                    "
                  >
                    {portfolioIds.length === 0 && (
                      <option value="">No portfolios</option>
                    )}
                    {(Array.isArray(portfolioIds) ? portfolioIds : []).map(
                      (pid) => (
                        <option key={pid} value={pid}>
                          #Portfolio {pid}
                        </option>
                      )
                    )}
                  </select>

                  {/* Chevron */}
                  <svg
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-70"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M7 10l5 5 5-5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                {portfolioIds.length !== 0 ? (
                  hasPortfolio ? (
                    <>
                      <div className="flex justify-between items-center mb-2 gap-2">
                        <span className="text-xs sm:text-sm font-medium text-cyan-400 uppercase tracking-wider">
                          Portfolio Cap Progress
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-neon-green">
                          {progressLabel ?? "—"}%
                        </span>
                      </div>
                      <div className="h-3 bg-dark-900 rounded-full overflow-hidden border border-cyan-500/30 relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-neon-green/20 animate-pulse" />
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-neon-green rounded-full transition-all relative z-10"
                          style={{
                            width: `${Math.max(0, Math.min(progress, 100))}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-cyan-300/90 mt-1">
                        {formatUSD(totalAccruedRewardUsd)} /{" "}
                        {formatUSD(maxPossibleRewardForProgress)}
                        {capLabel && (
                          <span className="ml-1 text-neon-green">
                            {capLabel}
                          </span>
                        )}
                      </p>
                      {(portFolioDetails?.isCapped ||
                        portFolioDetails?.isClosed ||
                        portFolioDetails?.isActivatedFromSafeWallet ||
                        lastAccrualLabel) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-cyan-300/80 mt-2">
                          {portFolioDetails?.isCapped && (
                            <div>
                              <span className="text-cyan-200/80 font-semibold uppercase tracking-wider">
                                Capped
                              </span>
                              <div>{cappedAtLabel ?? "Cap limit reached"}</div>
                            </div>
                          )}
                          {portFolioDetails?.isClosed && (
                            <div>
                              <span className="text-cyan-200/80 font-semibold uppercase tracking-wider">
                                Closed
                              </span>
                              <div>{closedAtLabel ?? "Closed"}</div>
                            </div>
                          )}
                          {lastAccrualLabel && (
                            <div>
                              <span className="text-cyan-200/80 font-semibold uppercase tracking-wider">
                                Last Accrual
                              </span>
                              <div>{lastAccrualLabel}</div>
                            </div>
                          )}
                          {portFolioDetails?.isActivatedFromSafeWallet && (
                            <div>
                              <span className="text-cyan-200/80 font-semibold uppercase tracking-wider">
                                Activation
                              </span>
                              <div>Safe Wallet</div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-xs text-cyan-300/80">
                      Synchronizing portfolio details…
                    </div>
                  )
                ) : (
                  <div className="text-xs text-cyan-300/80">
                    No portfolio data available.
                  </div>
                )}
              </div>

              {portfolioIds.length !== 0 && hasPortfolio && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mt-4">
                  <div className="p-3 sm:p-4 cyber-glass rounded-xl border border-neon-green/30 hover:border-neon-green/80 transition-all">
                    <p className="text-xs text-neon-green font-medium uppercase tracking-wider mb-1">
                      Total Accrued Reward
                    </p>
                    <p className="text-lg sm:text-xl font-bold text-neon-green">
                      {formatUSD(totalAccruedRewardUsd)}
                    </p>
                    <p className="text-[11px] text-neon-green/70 mt-1">
                      Pending: {formatUSD(pendingUsdValue)}
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 cyber-glass rounded-xl border border-cyan-500/30 hover:border-cyan-500/80 transition-all">
                    <p className="text-xs text-cyan-400 font-medium uppercase tracking-wider mb-1">
                      Portfolio Principal
                    </p>
                    <p className="text-lg sm:text-xl font-bold text-cyan-300">
                      {formatUSD(portfolioPrincipalUsd)}
                    </p>
                    <p className="text-[11px] text-cyan-300/70 mt-1">
                      Active since{" "}
                      {daysActive != null ? `${daysActive} days` : "—"}
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 cyber-glass rounded-xl border border-neon-purple/30 hover:border-neon-purple/80 transition-all">
                    <p className="text-xs text-neon-purple font-medium uppercase tracking-wider mb-1">
                      Cap Target
                    </p>
                    <p className="text-lg sm:text-xl font-bold text-neon-purple">
                      {formatUSD(portfolioCapUsd)}
                    </p>
                    <p className="text-[11px] text-neon-purple/70 mt-1">
                      {capPercentValue || capPercentValue === 0
                        ? `${capPercentValue}% Cap`
                        : "—"}
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 cyber-glass rounded-xl border border-neon-orange/30 hover:border-neon-orange/80 transition-all">
                    <p className="text-xs text-neon-orange font-medium uppercase tracking-wider mb-1">
                      Remaining Reward
                    </p>
                    <p className="text-lg sm:text-xl font-bold text-neon-orange">
                      {formatUSD(remainingRewardUsd)}
                    </p>
                    <p className="text-[11px] text-neon-orange/70 mt-1">
                      Until full cap
                    </p>
                  </div>
                </div>
              )}

              {/* Additional Portfolio Details */}
              {portfolioIds.length !== 0 &&
                hasPortfolio &&
                portFolioDetails && (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-dark-900/40 border border-cyan-500/20">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-cyan-300/70 uppercase tracking-wider">
                        Tier
                      </span>
                      <span className="text-sm font-bold text-cyan-300">
                        {portFolioDetails.tier
                          ? `T${portFolioDetails.tier}`
                          : "—"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-cyan-300/70 uppercase tracking-wider">
                        Booster
                      </span>
                      <span
                        className={`text-sm font-bold ${
                          portFolioDetails.booster
                            ? "text-neon-orange"
                            : "text-cyan-300/50"
                        }`}
                      >
                        {portFolioDetails.booster ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-cyan-300/70 uppercase tracking-wider">
                        Created
                      </span>
                      <span className="text-sm font-medium text-cyan-300">
                        {portFolioDetails.createdAt
                          ? new Date(
                              portFolioDetails.createdAt * 1000
                            ).toLocaleDateString()
                          : "—"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-cyan-300/70 uppercase tracking-wider">
                        Status
                      </span>
                      <div className="flex gap-1 flex-wrap">
                        {portFolioDetails.isCapped && (
                          <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                            Capped
                          </span>
                        )}
                        {portFolioDetails.isClosed && (
                          <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                            Closed
                          </span>
                        )}
                        {!portFolioDetails.isCapped &&
                          !portFolioDetails.isClosed && (
                            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Active
                            </span>
                          )}
                      </div>
                    </div>
                  </div>
                )}

              {portfolioIds.length !== 0 && hasPortfolio && (
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <div className="p-3 sm:p-4 cyber-glass rounded-xl border border-cyan-500/30 hover:border-cyan-500/80 transition-all group">
                    <p className="text-xs text-cyan-400 font-medium mb-1 uppercase tracking-wider">
                      Daily Rate
                    </p>
                    <p className="text-lg sm:text-xl font-bold text-cyan-300 group-hover:text-neon-glow transition-all">
                      {dailyRatePercent
                        ? `${dailyRatePercent.toFixed(2)}%`
                        : "—"}
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 cyber-glass rounded-xl border border-neon-green/30 hover:border-neon-green/80 transition-all group">
                    <p className="text-xs text-neon-green font-medium mb-1 uppercase tracking-wider">
                      Direct Refs
                    </p>
                    <p className="text-lg sm:text-xl font-bold text-neon-green group-hover:text-neon-glow transition-all">
                      {summaryLoading
                        ? renderLoading()
                        : formatCount(directMembers)}
                    </p>
                  </div>
                  <div className="p-3 sm:p-4 cyber-glass rounded-xl border border-neon-orange/30 hover:border-neon-orange/80 transition-all group">
                    <p className="text-xs text-neon-orange font-medium mb-1 uppercase tracking-wider">
                      Slab Tier
                    </p>
                    <p className="text-lg sm:text-xl font-bold text-neon-orange group-hover:text-neon-glow transition-all">
                      {summaryReady ? slabName : "—"}
                    </p>
                    <p className="text-xs text-neon-orange/70 mt-0.5">
                      Level {parseFloat(slabLevel) + 1 || "—"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="cyber-glass rounded-2xl p-4 sm:p-6 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
            <h2 className="text-base sm:text-lg font-semibold text-cyan-300 mb-4 uppercase tracking-wide">
              7-Day Earnings Trend
            </h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart
                data={last7Day.length ? last7Day : [{ day: "—", amount: 0 }]}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(0,240,255,0.1)"
                />
                <XAxis dataKey="day" stroke="#22d3ee" fontSize={12} />
                <YAxis stroke="#22d3ee" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    border: "1px solid rgba(0,240,255,0.3)",
                    borderRadius: "8px",
                    color: "#22d3ee",
                    backdropFilter: "blur(10px)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="url(#dashGradient)"
                  strokeWidth={3}
                  dot={{
                    fill: "#00f0ff",
                    r: 5,
                    strokeWidth: 2,
                    stroke: "#39ff14",
                  }}
                />
                <defs>
                  <linearGradient id="dashGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#00f0ff" />
                    <stop offset="100%" stopColor="#39ff14" />
                  </linearGradient>
                </defs>
              </LineChart>
            </ResponsiveContainer>
          </div>

          <LivePriceFeed />
        </div>

        <div className="space-y-4 sm:space-y-6">
          {/* Desktop-only referral card with link and copy button */}
          <div className="hidden lg:block cyber-glass border border-neon-green/50 hover:border-neon-green rounded-2xl p-4 sm:p-6 text-white relative overflow-hidden group transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-neon-green/10 to-cyan-500/10 opacity-50 group-hover:opacity-70 transition-opacity" />
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon-green/70 to-transparent" />

            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="p-2 bg-neon-green/20 rounded-lg flex-shrink-0 border border-neon-green/40">
                <User2Icon size={20} className="text-neon-green" />
              </div>
              <div>
                <p className="text-sm text-neon-green font-medium uppercase tracking-wide">
                  Your Referral Link
                </p>
              </div>
            </div>

            <div className="relative z-10">
              <div className="bg-slate-900/50 border border-cyan-500/30 rounded-lg p-3 flex items-center justify-between gap-2">
                <span className="text-xs sm:text-sm text-cyan-300 truncate">
                  {`${window.location.origin}/signup?ref=${
                    userAddress.slice(0, 5) + "...." + userAddress.slice(-4)
                  }`}
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-xs font-medium text-neon-green hover:text-white transition-colors"
                >
                  <Copy size={14} />
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          </div>

          <div className="cyber-glass border border-neon-green/50 hover:border-neon-green rounded-2xl p-4 sm:p-6 text-white relative overflow-hidden group transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-neon-green/10 to-cyan-500/10 opacity-50 group-hover:opacity-70 transition-opacity" />
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon-green/70 to-transparent" />
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="p-2 bg-neon-green/20 rounded-lg flex-shrink-0 border border-neon-green/40">
                <TrendingUp size={20} className="text-neon-green" />
              </div>
              <div>
                <p className="text-sm text-neon-green font-medium uppercase tracking-wide">
                  Unclaimed Daily Accrued Reward
                </p>
                <p className="text-xs text-cyan-300/90">Available to claim</p>
              </div>
            </div>
            <NumberPopup
              value={formatUSD(
                roiAgg?.unclaimedUsd ?? roiTotals?.unclaimedUsd ?? 0
              )}
              label="Unclaimed Daily Accrued Reward"
              className="text-2xl sm:text-3xl font-bold mb-4 text-neon-green relative z-10"
              isLoading={summaryLoading || roiTotalsLoading || roiAggLoading}
            />
            <button
              onClick={handleClaimGrowth}
              disabled={
                isClaimingGrowth ||
                !((roiAgg?.unclaimedUsd ?? roiTotals?.unclaimedUsd ?? 0) > 0)
              }
              className="block w-full py-2.5 sm:py-3 bg-gradient-to-r from-cyan-500 to-neon-green hover:from-cyan-400 hover:to-neon-green/90 rounded-lg text-sm sm:text-base font-bold transition-all text-dark-950 text-center relative z-10 group-hover:shadow-neon-green disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isClaimingGrowth ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Claiming...</span>
                </>
              ) : (
                "Claim Now"
              )}
            </button>
            {claimError && (
              <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 relative z-10">
                {claimError}
              </div>
            )}
          </div>

          <div className="cyber-glass rounded-2xl p-4 sm:p-6 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
            <h3 className="text-base font-semibold text-cyan-300 mb-4 uppercase tracking-wide">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <Link
                to="/dashboard/stake"
                className="flex items-center gap-3 p-3 cyber-glass hover:bg-cyan-500/10 rounded-lg transition-all group border border-transparent hover:border-cyan-500/30"
              >
                <div className="p-2 bg-cyan-500/20 rounded-lg flex-shrink-0 border border-cyan-500/30">
                  <Wallet className="text-cyan-400" size={16} />
                </div>
                <span className="text-sm font-medium text-cyan-300 flex-1">
                  Stake & Invest
                </span>
                <ArrowUpRight
                  size={16}
                  className="text-cyan-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                />
              </Link>

              <Link
                to="/dashboard/slab"
                className="flex items-center gap-3 p-3 cyber-glass hover:bg-neon-green/10 rounded-lg transition-all group border border-transparent hover:border-neon-green/30"
              >
                <div className="p-2 bg-neon-green/20 rounded-lg flex-shrink-0 border border-neon-green/30">
                  <Award className="text-neon-green" size={16} />
                </div>
                <span className="text-sm font-medium text-neon-green flex-1">
                  Slab Income
                </span>
                <ArrowUpRight
                  size={16}
                  className="text-neon-green group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                />
              </Link>

              <Link
                to="/dashboard/royalty"
                className="flex items-center gap-3 p-3 cyber-glass hover:bg-neon-orange/10 rounded-lg transition-all group border border-transparent hover:border-neon-orange/30"
              >
                <div className="p-2 bg-neon-orange/20 rounded-lg flex-shrink-0 border border-neon-orange/30">
                  <Trophy className="text-neon-orange" size={16} />
                </div>
                <span className="text-sm font-medium text-neon-orange flex-1">
                  Royalty Program
                </span>
                <ArrowUpRight
                  size={16}
                  className="text-neon-orange group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                />
              </Link>

              <Link
                to="/dashboard/rewards"
                className="flex items-center gap-3 p-3 cyber-glass hover:bg-cyan-400/10 rounded-lg transition-all group border border-transparent hover:border-cyan-400/30"
              >
                <div className="p-2 bg-cyan-400/20 rounded-lg flex-shrink-0 border border-cyan-400/30">
                  <Gift className="text-cyan-400" size={16} />
                </div>
                <span className="text-sm font-medium text-cyan-400 flex-1">
                  Rewards
                </span>
                <ArrowUpRight
                  size={16}
                  className="text-cyan-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                />
              </Link>
            </div>
          </div>

          <div className="cyber-glass rounded-2xl p-4 sm:p-6 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
            <h3 className="text-base font-semibold text-cyan-300 mb-4 uppercase tracking-wide">
              Recent Activity
            </h3>
            <div className="space-y-3">
              {(Array.isArray(activityItems) ? activityItems : []).map(
                (
                  {
                    icon: Icon,
                    wrapperClass,
                    iconClass,
                    valueClass,
                    title,
                    value,
                    subtitle,
                  },
                  idx
                ) => (
                  <div
                    key={`${title}-${idx}`}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-cyan-500/5 transition-colors"
                  >
                    <div
                      className={`p-1.5 rounded-lg flex-shrink-0 ${wrapperClass}`}
                    >
                      <Icon className={iconClass} size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-cyan-300">
                        {title}
                      </p>
                      <p className={`text-xs font-semibold ${valueClass}`}>
                        {value}
                      </p>
                      <p className="text-xs text-cyan-400/60">{subtitle}</p>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          to="/dashboard/analytics"
          className="cyber-glass rounded-xl p-5 border border-cyan-500/30 hover:border-cyan-500/80 transition-all group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center gap-3 mb-3 relative z-10">
            <div className="p-2 bg-cyan-500/20 rounded-lg flex-shrink-0 border border-cyan-500/30">
              <TrendingUp className="text-cyan-400" size={20} />
            </div>
            <p className="text-sm font-medium text-cyan-400 uppercase tracking-wide">
              Performance
            </p>
            <ArrowUpRight
              size={16}
              className="ml-auto text-cyan-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
            />
          </div>
          <p className="text-2xl font-bold text-neon-green relative z-10">
            {hasPortfolio && progressLabel
              ? `${progressLabel}% to cap`
              : "No active portfolio"}
          </p>
          <p className="text-xs text-cyan-300/90 mt-1 relative z-10">
            {hasPortfolio && daysActive != null
              ? `${daysActive} day${daysActive === 1 ? "" : "s"} active`
              : "Stake to start tracking performance"}
          </p>
        </Link>

        <div className="cyber-glass rounded-xl p-5 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-neon-green/20 rounded-lg flex-shrink-0 border border-neon-green/30">
              <Award className="text-neon-green" size={20} />
            </div>
            <p className="text-sm font-medium text-neon-green uppercase tracking-wide">
              Qualified Volume
            </p>
          </div>
          <NumberPopup
            value={formatUSD(qualifiedVolumeUsd)}
            label="Qualified Volume"
            className="text-2xl font-bold text-cyan-300"
            isLoading={summaryLoading}
          />
          <p className="text-xs text-cyan-300/90 mt-1">
            Qualified business volume across directs
          </p>
        </div>

        <div className="cyber-glass rounded-xl p-5 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-neon-orange/20 rounded-lg flex-shrink-0 border border-neon-orange/30">
              <Trophy className="text-neon-orange" size={20} />
            </div>
            <p className="text-sm font-medium text-neon-orange uppercase tracking-wide">
              Royalty Status
            </p>
          </div>
          
          {/* Enhanced Royalty Display */}
          <div className="space-y-2">
            {royaltyLoading ? (
              <div className="flex items-center gap-2 text-cyan-300">
                <Loader2 className="animate-spin" size={16} />
                <span className="text-sm">Loading royalty tier...</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-cyan-300">
                    Level {royaltyLevel || "—"}
                  </p>
                  {royaltyLevel > 0 && royaltyTierName && (
                    <div className="px-2 py-1 bg-neon-orange/20 rounded-full border border-neon-orange/30">
                      <span className="text-xs font-medium text-neon-orange">
                        {royaltyTierName}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Current Tier Monthly Amount */}
                {royaltyLevel > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-cyan-300/80">Monthly:</span>
                    <span className="font-semibold text-neon-orange">
                      {(() => {
                        const monthlyAmounts = [
                          30, 100, 250, 500, 1000, 2500, 5000, 12500, 25000, 
                          50000, 125000, 250000, 500000, 1000000
                        ];
                        const amount = monthlyAmounts[royaltyLevel - 1];
                        return amount ? formatUSD(amount) : '—';
                      })()} /mo
                    </span>
                  </div>
                )}
                
                {/* Lifetime Earnings */}
                <p className="text-xs text-cyan-300/90">
                  {royaltyPayouts != null
                    ? `${formatUSD(royaltyPayouts)} lifetime earned`
                    : "Royalty data synchronizing..."}
                </p>
                
                {/* Achievement Status */}
                {royaltyLevel > 0 ? (
                  <div className="flex items-center gap-1 mt-2">
                    <CheckCircle className="text-neon-green" size={12} />
                    <span className="text-xs text-neon-green font-medium">Qualified</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 mt-2">
                    <Lock className="text-cyan-400/60" size={12} />
                    <span className="text-xs text-cyan-400/60">Not Qualified</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Volume Analytics Section */}
      {volumeData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Leg Volume Distribution */}
          <div className="cyber-glass rounded-2xl p-6 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-cyan-500/20 rounded-lg flex-shrink-0 border border-cyan-500/30">
                <TrendingUp className="text-cyan-400" size={20} />
              </div>
              <h3 className="text-base font-semibold text-cyan-300 uppercase tracking-wide">
                Leg Volume Analysis
              </h3>
            </div>

            <div className="space-y-4">
              {/* Top 3 Legs Display */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                  <p className="text-cyan-400 text-xs font-medium uppercase">
                    L1 (Top)
                  </p>
                  <p className="text-[12px] md:text[15px] lgtext-lg  font-bold text-cyan-300">
                    {formatUSD(volumeData.cappedVolumes.L1)}
                  </p>
                  <p className="text-xs text-cyan-400/70">
                    {formatRAMA(volumeData.cappedVolumes.L1 / 0.1)}
                  </p>
                </div>
                <div className="text-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                  <p className="text-blue-400 text-xs font-medium uppercase">
                    L2
                  </p>
                  <p className="text-[12px] md:text[15px] lgtext-lg font-bold text-blue-300">
                    {formatUSD(volumeData.cappedVolumes.L2)}
                  </p>
                  <p className="text-xs text-blue-400/70">
                    {formatRAMA(volumeData.cappedVolumes.L2 / 0.1)}
                  </p>
                </div>
                <div className="text-center p-3 bg-neon-green/10 rounded-lg border border-neon-green/30">
                  <p className="text-neon-green text-xs font-medium uppercase">
                    L-Rest
                  </p>
                  <p className="text-[12px] md:text[15px] lgtext-lg font-bold text-neon-green">
                    {formatUSD(volumeData.cappedVolumes.Lrest)}
                  </p>
                  <p className="text-xs text-neon-green/70">
                    {formatRAMA(volumeData.cappedVolumes.Lrest / 0.1)}
                  </p>
                </div>
              </div>

              {/* Volume Performance */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-cyan-300/90">
                    Volume Balance:
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      volumeData.volumePerformance.balance.isBalanced
                        ? "text-neon-green"
                        : "text-neon-orange"
                    }`}
                  >
                    {volumeData.volumePerformance.balance.isBalanced
                      ? "Balanced"
                      : "Needs Optimization"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-cyan-300/90">
                    Total Qualified:
                  </span>
                  <span className="text-xs font-semibold text-cyan-300">
                    {formatUSD(volumeData.totalQualified)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-cyan-300/90">
                    Current Slab:
                  </span>
                  <span className="text-xs font-semibold text-neon-green">
                    Level {volumeData.currentSlabIndex}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Performing Legs */}
          <div className="cyber-glass rounded-2xl p-6 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-neon-purple/20 rounded-lg flex-shrink-0 border border-neon-purple/30">
                <Users className="text-neon-purple" size={20} />
              </div>
              <h3 className="text-base font-semibold text-cyan-300 uppercase tracking-wide">
                Top Performing Legs
              </h3>
            </div>

            <div className="space-y-3 max-h-[200px] overflow-y-auto custom-scrollbar">
              {volumeData.legs.slice(0, 5).map((leg, index) => (
                <div
                  key={leg.address}
                  className="flex items-center justify-between p-3 cyber-glass border border-cyan-500/20 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0
                          ? "bg-neon-green/20 text-neon-green border border-neon-green/40"
                          : index === 1
                          ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                          : index === 2
                          ? "bg-neon-orange/20 text-neon-orange border border-neon-orange/40"
                          : "bg-cyan-500/10 text-cyan-300 border border-cyan-500/30"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-cyan-300">
                        {leg.address.slice(0, 6)}...{leg.address.slice(-4)}
                      </p>
                      <p className="text-xs text-cyan-400/70">
                        {(leg.percentage || 0).toFixed(1)}% of total
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-cyan-300">
                      {formatUSD(leg.volume)}
                    </p>
                    <p className="text-xs text-cyan-400/70">
                      {formatRAMA(leg.volumeRAMA)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {volumeError && (
              <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-300">
                {volumeError}
              </div>
            )}
          </div>
        </div>
      )}

      {volumeLoading && (
        <div className="mt-6 cyber-glass rounded-2xl p-6 border border-cyan-500/30">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="animate-spin text-cyan-400" size={20} />
            <span className="text-cyan-300">Loading volume analytics...</span>
          </div>
        </div>
      )}

      {showIncomeModal && (
        <div>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40 bg-dark-950/80 backdrop-blur-sm"
            onClick={() => setShowIncomeModal(false)}
          />

          {/* Modal container */}
         <div className="fixed inset-0 z-50 flex justify-center px-4 py-6 overflow-y-auto sm:items-center sm:py-10">
            {/* Content box */}
           <div className="relative w-full max-w-xl cyber-glass border border-neon-green/40 rounded-2xl p-6 sm:p-8 space-y-6
                 my-6 sm:my-0 overflow-y-auto max-h-[calc(100dvh-3rem)] sm:max-h-[80vh]">
              {/* Close button */}
              <button
                onClick={() => setShowIncomeModal(false)}
                className="absolute top-3 right-3 p-2 text-cyan-300/70 hover:text-white hover:bg-cyan-500/10 rounded-lg transition-all"
                aria-label="Close income breakdown"
              >
                <X size={18} />
              </button>

              {/* Header */}
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/70 ">
                  Earnings Breakdown
                </p>
                <h2 className="text-2xl font-bold text-white">
                  Total Earned Overview
                </h2>
                <p className="text-sm text-cyan-300/80">
                  Data sourced directly from{" "}
                  <span className="font-semibold text-neon-green">
                    ComprehensiveView.getIncomeTotals
                  </span>
                  .
                </p>
              </div>

              {/* Body */}
              {incomeTotalsLoading ? (
                <div className="flex items-center gap-2 text-cyan-200 text-sm">
                  <Loader2 className="animate-spin" size={18} />
                  <span>Syncing income totals…</span>
                </div>
              ) : incomeTotalsError ? (
                <div className="border border-red-400/40 bg-red-500/10 text-red-200 rounded-lg px-4 py-3 text-sm">
                  {incomeTotalsError}
                </div>
              ) : !incomeTotalsBreakdown ? (
                <div className="text-sm text-cyan-300/80">
                  No income breakdown available yet. Earn from your portfolios
                  to populate this view.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="cyber-glass border border-neon-green/40 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-neon-green uppercase tracking-wide">
                        Total Earned
                      </p>
                      <p className="text-2xl font-bold text-neon-green">
                        {formatUSD(totalEarnedUsd)}
                      </p>
                    </div>
                    <div className="text-right text-[11px] text-cyan-300/70">
                      <p>
                        Daily Accrued Reward (Today): {formatUSD(todayRoiUsd)}
                      </p>
                      <p>
                        Daily Accrued Reward (Booster):{" "}
                        {formatUSD(boosterRoiUsd)}
                      </p>
                    </div>
                  </div>

                  {incomeTotalsBreakdown?.source === "cappingIncomeManager" && (
                    <p className="text-[11px] text-cyan-300/70">
                      Detailed breakdown is unavailable from the capping
                      manager. Showing total earnings only.
                    </p>
                  )}

                  <div className="grid sm:grid-cols-2 gap-3 overflow-x-auto">
                    {(Array.isArray(incomeBreakdownRows)
                      ? incomeBreakdownRows
                      : []
                    ).map(({ label, value }) => (
                      <div
                        key={label}
                        className="cyber-glass border border-cyan-500/30 rounded-lg p-3 hover:border-cyan-500/60 transition-all"
                      >
                        <p className="text-[11px] text-cyan-300/70 uppercase tracking-wide">
                          {label}
                        </p>
                        <p className="text-lg font-semibold text-cyan-100">
                          {formatUSD(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="pt-2 border-t border-cyan-500/20 text-[11px] text-cyan-300/70">
                All earnings credit directly to your Safe Wallet. No additional
                action required.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Claim Confirmation Modal */}
      {showConfirmModal && claimConfirmData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="cyber-glass rounded-xl border border-cyan-500/30 p-6 w-full max-w-md mx-4 space-y-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-cyan-300 mb-4">
                <Coins size={24} />
                <h2 className="text-xl font-bold">Confirm ROI Claim</h2>
              </div>
              
              <div className="space-y-4 text-left">
                <div className="bg-dark-900/60 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Total Pending Days:</span>
                    <span className="text-cyan-300 font-semibold">{claimConfirmData.totalDays} days</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Claiming Now:</span>
                    <span className="text-emerald-300 font-semibold">{claimConfirmData.claimingDays} days</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Period:</span>
                    <span className="text-cyan-200 text-sm">{claimConfirmData.fromDate} to {claimConfirmData.toDate}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Estimated Amount:</span>
                    <span className="text-green-300 font-bold">{formatUSD(claimConfirmData.estimatedAmount)}</span>
                  </div>
                  
                  {claimConfirmData.remainingDays > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Remaining After This:</span>
                      <span className="text-yellow-300 font-semibold">{claimConfirmData.remainingDays} days</span>
                    </div>
                  )}
                  
                  {claimConfirmData.needsMultipleTransactions && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Max per Transaction:</span>
                      <span className="text-orange-300 font-semibold">{claimConfirmData.maxPerTransaction} days</span>
                    </div>
                  )}
                </div>
                
                {claimConfirmData.needsMultipleTransactions && (
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={16} className="text-orange-400 mt-0.5 flex-shrink-0" />
                      <div className="text-orange-200 text-sm">
                        <p className="font-semibold mb-1">50-Day Transaction Limit</p>
                        <p>This transaction will claim {claimConfirmData.claimingDays} days. The remaining {claimConfirmData.remainingDays} days can be claimed in a separate transaction later.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-gray-500/30 text-gray-300 hover:bg-gray-500/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmClaim}
                  disabled={isClaimingGrowth}
                  className="flex-1 px-4 py-2 text-sm font-bold rounded-lg bg-gradient-to-r from-emerald-500 to-green-500 text-white transition-all shadow-lg hover:shadow-green-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {isClaimingGrowth ? (
                    <span className="flex items-center gap-2 justify-center">
                      <Loader2 className="animate-spin" size={16} />
                      <span>Processing...</span>
                    </span>
                  ) : (
                    'Confirm Claim'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progressive Transaction Modal */}
      <ProgressiveTransactionModal
        isOpen={showClaimModal}
        onClose={handleClaimModalClose}
        txHash={hash}
        title="Claim Daily Accrued Reward"
        description={
          autoWindowInfo && autoWindowInfo.success && autoWindowInfo.totalPeriods > 0
            ? `Claiming ${Math.min(autoWindowInfo.totalPeriods, 50)} days of accrued rewards${autoWindowInfo.totalPeriods > 50 ? ` (${autoWindowInfo.totalPeriods - 50} days remaining for next transaction)` : ''} from ${autoWindowInfo.claimingPlan?.[0]?.estimatedFromDate}`
            : "Claiming up to 50 days of your portfolio growth rewards in this transaction"
        }
        successMessage="Your Daily Accrued Reward has been claimed successfully!"
        onSuccess={handleClaimSuccess}
        amount={
          (roiAgg?.unclaimedUsd ?? roiTotals?.unclaimedUsd) &&
          (roiAgg?.unclaimedUsd ?? roiTotals?.unclaimedUsd) > 0
            ? formatUSD(roiAgg?.unclaimedUsd ?? roiTotals?.unclaimedUsd)
            : null
        }
        amountLabel="Claiming Amount"
      />
    </div>
  );
}
