import { create } from "zustand";
import Web3 from "web3";
import toast from "../src/utils/toast";
import UserRegistryABI from './Contract_ABI/UserRegistry.json';
import PortFolioManagerABI from './Contract_ABI/PortfolioManager.json';
import IncomeDistributorABI from './Contract_ABI/IncomeDistributor.json';
import OceanQueryUpgradeableABI from './Contract_ABI/OceanQueryUpgradeable.json';
import OceanViewABI from './Contract_ABI/OceanView.json';
import OceanViewV2ABI from './Contract_ABI/OceanViewV2.json';
import OceanViewUpgradeableABI from './Contract_ABI/OCEANVIEWUPGRADEABLE.json';
import OceanicViewABI from './Contract_ABI/Oceanicview.json';
import ComprehensiveViewABI from './Contract_ABI/COMPREHENSIVEVIEW.json';
import CappingIncomeManagerABI from './Contract_ABI/CappingIncomeManager.json';
import SlabManagerABI from './Contract_ABI/SlabManager.json';
import RoyaltyManagerABI from './Contract_ABI/RoyaltyManager.json';
import RewardVaultABI from './Contract_ABI/RewardVault.json';
import SafeWalletABI from './Contract_ABI/SafeWallet.json';
import RoiDistributionABI from './Contract_ABI/RoiDistributor.json';
import { dayShortFromUnix } from "../src/utils/helper";
import { checkEnvironmentConfig, resolveContractAddress, validateRuntimeConfig } from "../src/utils/envCheck.js";
import {
  ROYALTY_LEVELS as ROYALTY_LEVELS_FALLBACK,
  ONE_TIME_REWARDS as ONE_TIME_REWARDS_FALLBACK,
} from "../src/utils/contractData";

// Cache manager for handling contract changes
// let cacheManager = null;
// try {
//   // Dynamically import cacheManager to avoid circular dependencies
//   import('../src/utils/cacheManager.js').then(module => {
//     cacheManager = module.default;
//   });
// } catch (error) {
//   console.warn('CacheManager not available:', error);
// }

// Initialize contract interfaces using the configured RPC-based web3 instance.
// Read-only calls use the RPC provider (safer for previews/paging). Transactions
// are created as unsigned tx objects and returned for the app's wallet layer
// (Reown AppKit / Wagmi) to sign & submit.
const getContractInterface = async () => {
  try {
    // Add cache busting for fresh contract data
    const cacheBuster = Date.now();
    console.log(`🔄 Initializing contracts (v${cacheBuster})`);
    
    const oceanicView = new web3.eth.Contract(OceanicViewABI, Contract["Oceanicview"]);
    const portfolioManager = new web3.eth.Contract(PortFolioManagerABI, Contract["PortFolioManager"]);
    return { oceanicView, portfolioManager };
  } catch (error) {
    console.error("Failed to initialize contracts:", error);
    throw error;
  }
};

const resolveEnvValue = (key) => {
  const env = import.meta.env ?? {};
  return env[`VITE_${key}`] ?? env[key];
};

const resolveAddress = (key, fallback) => {
    const candidate = resolveEnvValue(key);
    if (typeof candidate === "string" && candidate.startsWith("0x") && candidate.length === 42) {
      return candidate;
    }
    return fallback;
  };



// Load contract addresses from environment variables
// Fallback to hardcoded addresses only if env vars are not available
const Contract = {
  UserRegistry: resolveAddress("USERREGISTRY", "0x246c7317F4093065B96c2b0DC65A63De395444ed"),
  CoreConfig: resolveAddress("CORECONFIG", "0xA84e8Be27898E5EC51e16A2298BEDf5Ef5ecB34d"),
  RoiDistribution: resolveAddress("ROIDISTRIBUTOR", "0x7951bf0faABE00c451F1d92008297a7bd85d4678"),
  PortFolioManager: resolveAddress("PORTFOLIOMANAGER", "0xC73f964eA7bC04a2c7455CAf6107238147c88365"),
  RoyaltyManager: resolveAddress("ROYALTYMANAGER", "0xd52Ae0c81ED2bb4A91b62686d8A8426E6Dd686C5"),
  SlabManager: resolveAddress("SLABMANAGER", "0x4fe89Bc0e109b2ad8Ace95f2E4b4e7832D47AEE9"),
  IncomeDistributor: resolveAddress("INCOMEDISTRIBUTOR", "0x8D9B36D95Fe0C15d25DdAecc99684449CEcdC626"),
  FreezePolicy: resolveAddress("FREEZEPOLICY", "0x6541987258B73bd8128d23e8678a00258226ad3C"),
  RewardVault: resolveAddress("REWARDVAULT", "0xfAF7781A4a6cB1b6262fB9279772f0f503b3855d"),
  AdminControl: resolveAddress("ADMINCONTROL", "0x538eB028b51f10f1Bf9A7414c3eb3e85b067120C"),
  MainWallet: resolveAddress("MAINWALLET", "0x5C8E7b2a9c35caF45607bA5AAB4c5dfdD50dCe84"),
  SafeWallet: resolveAddress("SAFEWALLET", "0x36ebfd33a8053Cd6CC72436aDb356364Ee43ad54"),
  CapPayoutRouter: resolveAddress("CAP_PAYOUT_ROUTER", "0x18B1E77b9C71f6d903e4249B0f9837D56Ea76D7B"),
  CappingIncomeManager: resolveAddress("CAPPINGINCOMEMANAGER", "0x038c37724aAf96fdaF82E2C70cf55eB2dC557865"),
  OceanViewUpgradeable: resolveAddress("OCEANVIEWUPGRADEABLE", "0x0Dc6C606988100B53d016E1B7f9462Ca439BB608"),
  OceanViewV2: resolveAddress("OCEANVIEWV2", "0x08A6575a6158Dd5F61a2565F0f97249dcb497a78"),
  Oceanicview: resolveAddress("OCEANICVIEW", "0x938616ab14763506F7111Cdf06EF5A3B4C586dE6"),
  ComprehensiveView: resolveAddress("COMPREHENSIVEVIEW", "0x42d86B1c783c00C7912AD1F13FBC7108fF6EB0A0"),
  OceanQueryUpgradeable: resolveAddress("OCEANQUERYUPGRADEABLE", "0xaA4E8609Bb818c5927b9105da90E2C49a6f1F9db"),
};

// Validate environment configuration on module load
const isConfigValid = validateRuntimeConfig();
if (!isConfigValid) {
  console.error('⚠️ Environment configuration validation failed!');
  checkEnvironmentConfig(); // Show detailed info for debugging
}

// Dual RPC URLs for load balancing and faster responses
const RPC_URLs = [
  "https://blockchain.ramestta.com",
  "https://blockchain2.ramestta.com"
];

// Create multiple Web3 instances for load balancing
const web3Instances = RPC_URLs.map(url => new Web3(url));
const web3 = web3Instances[0]; // Primary instance for backward compatibility

// Dual RPC utility for faster contract calls
const callWithDualRPC = async (contractMethod, methodName = 'unknown') => {
  const promises = web3Instances.map(async (web3Instance, index) => {
    try {
      const startTime = Date.now();
      const result = await contractMethod();
      const duration = Date.now() - startTime;
      console.log(`[RPC-${index + 1}] ${methodName} completed in ${duration}ms`);
      return { result, rpcIndex: index + 1, duration };
    } catch (error) {
      console.warn(`[RPC-${index + 1}] ${methodName} failed:`, error.message);
      throw error;
    }
  });

  try {
    // Return the first successful result
    const { result, rpcIndex, duration } = await Promise.any(promises);
    console.log(`[DUAL-RPC] ${methodName} fastest response from RPC-${rpcIndex} (${duration}ms)`);
    return result;
  } catch (error) {
    console.error(`[DUAL-RPC] All RPCs failed for ${methodName}:`, error);
    throw new Error(`All RPC endpoints failed: ${error.message}`);
  }
};

const USD_MICRO = 1e6;
const RAMA_DECIMALS = 1e18;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

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

const hasAddress = (addr) =>
  typeof addr === "string" &&
  addr.startsWith("0x") &&
  addr.length === 42 &&
  addr.toLowerCase() !== ZERO_ADDRESS.toLowerCase();

// Create contract instance with primary web3 (backward compatibility)
const makeContract = (abi, address) =>
  hasAddress(address) ? new web3.eth.Contract(abi, address) : null;

// Create multiple contract instances for dual RPC calls
const makeDualContracts = (abi, address) => 
  hasAddress(address) ? web3Instances.map(web3Instance => new web3Instance.eth.Contract(abi, address)) : [];

const toNumber = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  return Number(value);
};

const toBigIntSafe = (input) => {
  if (input == null) return 0n;
  if (typeof input === "bigint") return input;
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return 0n;
    return BigInt(Math.trunc(input));
  }
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (trimmed === "") return 0n;
    try {
      return BigInt(trimmed);
    } catch {
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? BigInt(Math.trunc(parsed)) : 0n;
    }
  }
  return 0n;
};

// Bytes32 helpers for decoding kinds and reasons from CappingIncomeManager
const bytes32ToString = (b) => {
  if (!b) return '';
  try {
    const s = Web3.utils.hexToUtf8(b);
    return (s || '').replace(/\u0000/g, '').replace(/\x00/g, '').trim();
  } catch {
    return String(b);
  }
};

const normalizeMissedKind = (k) => {
  const s = (bytes32ToString(k) || '').toLowerCase();
  if (s.includes('direct') || s === 'spot' || s.includes('spot')) return 'spot';
  if (s.includes('slab') && s.includes('override')) return 'slabOverride';
  if (s === 'slab' || s.includes('slab')) return 'slab';
  if (s === 'roi' || s.includes('roi')) return 'roi';
  if (s.includes('royal')) return 'royalty';
  if (s.includes('reward')) return 'reward';
  return s || 'unknown';
};

const fromMicroUSD = (value) => toNumber(value) / USD_MICRO;
const fromWeiToRama = (value) => toNumber(value) / RAMA_DECIMALS;
const fromWadToUsd = (value) => toNumber(value) / 1e18;
const formatTeamVolume = (raw) => {
  if (raw == null) return 0;
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount === 0) return 0;
  if (
    Math.abs(amount) >= 1e6 &&
    Number.isInteger(amount) &&
    Math.abs(amount) % 1e6 === 0
  ) {
    return amount / 1e6;
  }
  return amount;
};

const readLocalJSON = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  } catch {
    return null;
  }
};

function applyPortfolioManagerFields(target, pmRaw) {
  if (!target || !pmRaw) return target;
  const pick = (key, index) => {
    if (pmRaw?.[key] != null) return pmRaw[key];
    if (index != null && pmRaw?.[index] != null) return pmRaw[index];
    return undefined;
  };
  const toStr = (value) => {
    if (value == null) return "0";
    if (typeof value === "string") return value;
    try {
      return value.toString();
    } catch {
      return "0";
    }
  };
  const toNumSafe = (value) => {
    if (value == null) return 0;
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };
  const bool = (value) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value !== "0" && value !== "";
    return Boolean(value);
  };

  if (pick("principalUsd", 1) != null && target.principalUsdMicro == null) {
    const principalUsdMicro = toBigIntSafe(pick("principalUsd", 1));
    target.principalUsdMicro = principalUsdMicro.toString();
    target.principalUsd = fromMicroUSD(principalUsdMicro);
    target.principalUsdDisplay = target.principalUsd;
  }
  if (pick("principal", 0) != null) {
    const principalWei = toStr(pick("principal", 0));
    target.principalRamaWei = principalWei;
    target.principalRama = fromWeiToRama(principalWei);
  }
  if (pick("credited", 2) != null) {
    target.creditedRamaWei = toStr(pick("credited", 2));
  }

  target.createdAt = toNumSafe(pick("createdAt", 3) ?? target.createdAt);
  target.lastAccrual = toNumSafe(pick("lastAccrual", 4) ?? target.lastAccrual);
  target.frozenUntil = toNumSafe(pick("frozenUntil", 5) ?? target.frozenUntil);
  if (pick("booster", 6) != null) target.booster = bool(pick("booster", 6));
  if (pick("tier", 7) != null) target.tier = toNumSafe(pick("tier", 7));
  if (pick("capPct", 8) != null) target.capPct = toNumSafe(pick("capPct", 8));
  target.owner = pick("owner", 9) ?? target.owner ?? null;
  target.activatedBy = pick("activatedBy", 10) ?? target.activatedBy ?? null;
  target.boosterActivationDate = toNumSafe(
    pick("boosterActivationDate", 11) ?? target.boosterActivationDate
  );
  target.isCapped =
    pick("isCapped", 12) != null ? bool(pick("isCapped", 12)) : target.isCapped ?? false;
  target.isClosed =
    pick("isClosed", 13) != null ? bool(pick("isClosed", 13)) : target.isClosed ?? false;
  target.cappedAt = toNumSafe(pick("cappedAt", 14) ?? target.cappedAt);
  target.closedAt = toNumSafe(pick("closedAt", 15) ?? target.closedAt);
  target.totalReceivedBoosterROIWei = toStr(
    pick("totalReceivedBoosterROI", 16) ?? target.totalReceivedBoosterROIWei ?? "0"
  );
  target.isActivatedFromSafeWallet =
    pick("isActivatedFromSafeWallet", 17) != null
      ? bool(pick("isActivatedFromSafeWallet", 17))
      : target.isActivatedFromSafeWallet ?? false;
  target.active = target.isClosed ? false : target.active ?? true;
  return target;
}


const slabsName = ["None", "Coral Reef", "Shallow Waters", "Tide Pool", "Wave Crest", 'Open Sea', "Deep Current", "Ocean Floor", "Abyssal Zone", "Mariana Trench", "Pacific Master", "Ocean Sovereign"]




export const useStore = create((set, get) => ({
  // Accrued Rewards functions
  getAccruedRewardStats: async (address) => {
    try {
      const { oceanicView } = await getContractInterface();
      const [portfolios, rewardsData] = await Promise.all([
        oceanicView.methods.getPortfolios(address).call(),
        oceanicView.methods.getRewards(address).call()
      ]);

      // Destructure rewards data based on contract structure
      const {
        lifetimeUsdWad,
        ramaWei,
        thresholdsUsdWad = [],
        rewardsUsdWad = [],
        achieved = []
      } = rewardsData;

      const totalRewardsUsd = parseFloat(Web3.utils.fromWei(lifetimeUsdWad || '0', 'ether'));
      const totalRewardsRama = parseFloat(Web3.utils.fromWei(ramaWei || '0', 'ether'));
      
      // Calculate pending rewards from unclaimed thresholds
      const pendingRewardsUsd = (Array.isArray(rewardsUsdWad) ? rewardsUsdWad : [])
        .filter((_, index) => !(Array.isArray(achieved) ? achieved[index] : false))
        .reduce((sum, reward) => sum + parseFloat(Web3.utils.fromWei(reward || '0', 'ether')), 0);

      // Get the latest timestamp from portfolios (guard all shapes)
      const portfolioList = Array.isArray(portfolios?.portfolios)
        ? portfolios.portfolios
        : Array.isArray(portfolios)
          ? portfolios
          : [];
      const lastClaimTimestamp = portfolioList.length
        ? Math.max(
            ...portfolioList.map((p) => {
              const v = p?.lastUpdate ?? p?.lastAccrual ?? p?.lastUpdateTs ?? 0;
              const n = Number(v);
              return Number.isFinite(n) ? n : 0;
            })
          )
        : 0;

      return {
        totalRewardsUsd,
        totalRewardsRama,
        pendingRewardsUsd,
        pendingRewardsRama: pendingRewardsUsd * get().ramaPrice,
        lastClaimTimestamp,
        nextClaimAvailable: lastClaimTimestamp + (24 * 60 * 60), // 24 hours after last claim
        portfolioCount: Array.isArray(portfolioList) ? portfolioList.length : 0
      };
    } catch (error) {
      console.error('Error fetching accrued reward stats:', error);
      throw error;
    }
  },

  // Get the user's last (most recent PID) portfolio principal in USD
  // Returns: { pid: number|null, amountUsd: number, hasPortfolio: boolean }
  getLastPortfolioAmountUsd: async (userAddress) => {
    try {
      if (!hasAddress(userAddress)) return { pid: null, amountUsd: 0, hasPortfolio: false };

      // Get portfolio IDs and select the max as the latest
      const ids = await get().getPortfolioIds(userAddress).catch(() => []);
      const list = Array.isArray(ids) ? ids.map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0) : [];
      if (!list.length) return { pid: null, amountUsd: 0, hasPortfolio: false };

      const lastPid = list.reduce((m, v) => (v > m ? v : m), list[0]);
      const details = await get().getPortFoliById(lastPid).catch(() => null);
      const amountUsd = details?.principalUsd ?? 0;
      return { pid: Number(lastPid) || null, amountUsd: Number(amountUsd) || 0, hasPortfolio: Number(amountUsd) > 0 };
    } catch (error) {
      console.error('getLastPortfolioAmountUsd error:', error);
      return { pid: null, amountUsd: 0, hasPortfolio: false };
    }
  },

  claimAccruedROI: async (fromAddress) => {
    try {
     
      if (!fromAddress) throw new Error('No connected wallet address found');

      const roiDistributor = makeContract(RoiDistributionABI, Contract.RoiDistribution);
      if (!roiDistributor) throw new Error("ROI Distributor contract not available");
      // 1) Pre-check unclaimed ROI to prevent revert
      let unclaimed;
      try {
        unclaimed = await roiDistributor.methods.getUnclaimedROI(fromAddress).call();
      } catch (e) {
        console.error('Failed to fetch unclaimed ROI preview:', e);
      }

      const usdTotalMicro = toBigIntSafe(unclaimed?.usdTotalMicro ?? 0n);
      const epochsCount = toNumber(unclaimed?.epochsCount ?? 0);
      if (usdTotalMicro === 0n || epochsCount === 0) {
        // Try to provide a helpful ETA if available
        let etaMsg = '';
        try {
          const nextTs = await roiDistributor.methods.nextDistributionTs().call();
          const tsNum = toNumber(nextTs);
          if (tsNum > 0) {
            const now = Math.floor(Date.now() / 1000);
            const diff = Math.max(0, tsNum - now);
            const h = Math.floor(diff / 3600);
            const m = Math.floor((diff % 3600) / 60);
            const when = new Date(tsNum * 1000).toLocaleString();
            etaMsg = ` Next distribution in ${h}h ${m}m (at ${when}).`;
          }
        } catch {}
        throw new Error(`No ROI available to claim yet.${etaMsg}`);
      }

      // 2) Optional static call to catch precise revert reason early
      try {
        await roiDistributor.methods.claimROI().call({ from: fromAddress });
      } catch (callErr) {
        // Surface revert reason if present
        const msg = callErr?.data?.message || callErr?.message || 'Claim simulation reverted';
        console.error('Simulated claimROI reverted:', msg);
        throw new Error(`Claim not available: ${msg}`);
      }

      const data =  roiDistributor.methods.claimROI().encodeABI();

      const gasPrice = await web3.eth.getGasPrice();
      let gasLimit;
      try {
        gasLimit = await web3.eth.estimateGas({
          from: fromAddress,
          to: Contract.RoiDistribution,
          data,
        });
      } catch (err) {
        console.error('Gas estimation failed for claimROI:', err);
        const reason = err?.data?.message || err?.message || '';
        // Map common patterns to friendlier text
        if (/revert/i.test(reason) && /no|zero|empty|unclaim/i.test(reason)) {
          throw new Error('No ROI available to claim yet. Please try after the next distribution.');
        }
        if (/paused/i.test(reason)) {
          throw new Error('Claims are currently paused. Please try later.');
        }
        if (/insufficient funds/i.test(reason)) {
          throw new Error('Insufficient funds for gas. Please add RAMA for gas and try again.');
        }
        throw new Error('Gas estimation failed. The transaction may fail.');
      }

      const toHex = web3.utils.toHex;
      const tx = {
        from: fromAddress,
        to: Contract.RoiDistribution,
        data,
        gas: toHex(gasLimit),
        gasPrice: toHex(gasPrice),
      };

      return tx;
    } catch (error) {
      console.error('Error building claimROI transaction:', error);
      throw error;
    }
  },

 
  // ROI Distributor timings and window helpers
  getROITiming: async () => {
    try {
      const roiDistributor = makeContract(RoiDistributionABI, Contract.RoiDistribution);
      if (!roiDistributor) throw new Error("ROI Distributor contract not available");
      const [lastTs, nextTs, maxPeriods] = await Promise.all([
        roiDistributor.methods.lastDistributionTs().call(),
        roiDistributor.methods.nextDistributionTs().call(),
        roiDistributor.methods.maxPeriodsPerClaim().call(),
      ]);
      return {
        lastDistributionTs: toNumber(lastTs),
        nextDistributionTs: toNumber(nextTs),
        maxPeriodsPerClaim: toNumber(maxPeriods),
      };
    } catch (error) {
      console.error("Error fetching ROI timing:", error);
      return { lastDistributionTs: 0, nextDistributionTs: 0, maxPeriodsPerClaim: 0 };
    }
  },

  getUnclaimedROIWindow: async (address) => {
    try {
      const roiDistributor = makeContract(RoiDistributionABI, Contract.RoiDistribution);
      if (!roiDistributor) throw new Error("ROI Distributor contract not available");
      const out = await roiDistributor.methods.getUnclaimedROI(address).call();
      return {
        usd: fromMicroUSD(out?.usdTotalMicro ?? 0),
        rama: fromWeiToRama(out?.ramaTotalWei ?? 0),
        fromPeriod: toNumber(out?.fromPeriod ?? 0),
        lastPeriod: toNumber(out?.lastPeriod ?? 0),
        epochsCount: toNumber(out?.epochsCount ?? 0),
      };
    } catch (error) {
      console.error("Error fetching unclaimed ROI window:", error);
      return { usd: 0, rama: 0, fromPeriod: 0, lastPeriod: 0, epochsCount: 0 };
    }
  },

  previewClaimPerPortfolioSlice: async (address, offset = 0, limit = 50) => {
    try {
      const roiDistributor = makeContract(RoiDistributionABI, Contract.RoiDistribution);
      if (!roiDistributor) throw new Error("ROI Distributor contract not available");
      const res = await roiDistributor.methods
        .previewClaimPerPortfolioSlice(address, offset, limit)
        .call();
      const pids = res?.pids ?? [];
      const usdTotals = res?.usdTotals ?? [];
      const ramaTotals = res?.ramaTotals ?? [];
      const epochCounts = res?.epochCounts ?? [];
      const fromPeriod = toNumber(res?.fromPeriod ?? 0);
      const lastPeriod = toNumber(res?.lastPeriod ?? 0);
      const totalCount = toNumber(res?.totalCount ?? pids.length);
      const items = pids.map((pid, i) => ({
        pid: toNumber(pid),
        usd: fromMicroUSD(usdTotals[i] ?? 0),
        rama: fromWeiToRama(ramaTotals[i] ?? 0),
        epochCount: toNumber(epochCounts[i] ?? 0),
      }));
      return { items, fromPeriod, lastPeriod, totalCount };
    } catch (error) {
      console.error("Error previewing claim per portfolio slice:", error);
      throw error;
    }
  },

  getTotalsClaimedFromDistributor: async (address) => {
    try {
      const roiDistributor = makeContract(RoiDistributionABI, Contract.RoiDistribution);
      if (!roiDistributor) throw new Error("ROI Distributor contract not available");
      const result = await roiDistributor.methods.getTotalsClaimed(address).call();
      
      // Handle both array and object responses
      const usd = result?.[0] ?? result?.usd ?? result;
      const rama = result?.[1] ?? result?.rama;
      
      const claimedData = {
        usd: fromMicroUSD(usd ?? 0),
        rama: fromWeiToRama(rama ?? 0),
      };
      
      console.log('getTotalsClaimedFromDistributor result:', { raw: result, parsed: claimedData });
      
      return claimedData;
    } catch (error) {
      console.error("Error fetching totals claimed from distributor:", error);
      return { usd: 0, rama: 0 };
    }
  },

  // ROI Distributor daily rates (WAD) and per-pid claimed USD helpers
  getDailyRates: async () => {
    try {
      const roiDistributor = makeContract(RoiDistributionABI, Contract.RoiDistribution);
      if (!roiDistributor) throw new Error("ROI Distributor contract not available");
      const [t0, t1, bt0, bt1] = await Promise.all([
        roiDistributor.methods.dailyRateTier0().call(),
        roiDistributor.methods.dailyRateTier1().call(),
        roiDistributor.methods.dailyRateBoosterTier0().call(),
        roiDistributor.methods.dailyRateBoosterTier1().call(),
      ]);
      return {
        normal: { t0: toBigIntSafe(t0).toString(), t1: toBigIntSafe(t1).toString() },
        booster: { t0: toBigIntSafe(bt0).toString(), t1: toBigIntSafe(bt1).toString() },
      };
    } catch (error) {
      console.error("Error fetching daily rates:", error);
      return { normal: { t0: "0", t1: "0" }, booster: { t0: "0", t1: "0" } };
    }
  },

  getPaidUsdByPidMap: async (pids = []) => {
    try {
      const roiDistributor = makeContract(RoiDistributionABI, Contract.RoiDistribution);
      if (!roiDistributor) throw new Error("ROI Distributor contract not available");
      const unique = Array.from(new Set((pids || []).map((p) => Number(p)).filter((n) => Number.isFinite(n) && n > 0)));
      const calls = unique.map((pid) => roiDistributor.methods.paidUsdByPid(pid).call());
      const results = await Promise.all(calls);
      const out = {};
      results.forEach((val, idx) => {
        const pid = unique[idx];
        out[pid] = fromMicroUSD(val ?? 0);
      });
      return out;
    } catch (error) {
      console.error("Error fetching paidUsdByPid map:", error);
      return {};
    }
  },

  getRoiPreviewPerPortfolio: async (address) => {
    try {
      // First try to get portfolio IDs to check if user has valid portfolios
      const portfolioManager = makeContract(PortFolioManagerABI, Contract["PortfolioManager"]);
      let hasValidPortfolios = false;
      
      if (portfolioManager) {
        try {
          const portfolioIds = await portfolioManager.methods.getPortfolioIds(address).call();
          hasValidPortfolios = portfolioIds && portfolioIds.length > 0;
          
          if (!hasValidPortfolios) {
            console.log(`getPortfolioIds: no valid portfolios found for ${address}`);
            return { map: new Map(), fromPeriod: 0, lastPeriod: 0, portfolioIds: [] };
          }
        } catch (portfolioError) {
          console.warn('Failed to get portfolio IDs:', portfolioError);
        }
      }

      // Use ROI Distributor to get preview
      const roiDistributor = makeContract(RoiDistributionABI, Contract.RoiDistribution);
      if (!roiDistributor) throw new Error("ROI Distributor contract not available");
      
      const previewRaw = await roiDistributor.methods.previewClaimPerPortfolio(address).call();
      
      // Handle both array and object responses with safe access
      const pids = previewRaw?.pids ?? previewRaw?.[0] ?? [];
      const usdTotals = previewRaw?.usdTotals ?? previewRaw?.[1] ?? [];
      const ramaTotals = previewRaw?.ramaTotals ?? previewRaw?.[2] ?? [];
      const epochCounts = previewRaw?.epochCounts ?? previewRaw?.[3] ?? [];
      const fromPeriod = toNumber(previewRaw?.fromPeriod ?? previewRaw?.[4] ?? 0);
      const lastPeriod = toNumber(previewRaw?.lastPeriod ?? previewRaw?.[5] ?? 0);
      
      const map = new Map();
      const portfolioDetails = [];
      
      // Ensure all arrays have the same length
      const minLength = Math.min(pids.length, usdTotals.length, ramaTotals.length, epochCounts.length);
      
      for (let idx = 0; idx < minLength; idx++) {
        const pidValue = pids[idx];
        const pid = Number(pidValue);
        
        if (!Number.isFinite(pid) || pid <= 0) continue;
        
        const usd = fromMicroUSD(usdTotals[idx] ?? 0);
        const rama = fromWeiToRama(ramaTotals[idx] ?? 0);
        const epochCount = toNumber(epochCounts[idx] ?? 0);
        
        const entry = { usd, rama, epochCount, pid };
        map.set(pid, entry);
        portfolioDetails.push(entry);
      }
      
      return { 
        map, 
        fromPeriod, 
        lastPeriod, 
        portfolioDetails,
        totalPortfolios: portfolioDetails.length,
        hasValidPortfolios
      };
    } catch (error) {
      console.error("Error fetching ROI preview per portfolio:", error);
      
      // Return comprehensive fallback data
      return { 
        map: new Map(), 
        fromPeriod: 0, 
        lastPeriod: 0, 
        portfolioDetails: [],
        totalPortfolios: 0,
        hasValidPortfolios: false,
        error: error.message 
      };
    }
  },

  // Fetch per-portfolio claim history from a specific epoch
  getPidClaimsSlice: async (address, epoch = 1, offset = 0, limit = 100) => {
    try {
      const roiDistributor = makeContract(RoiDistributionABI, Contract.RoiDistribution);
      if (!roiDistributor) throw new Error("ROI Distributor contract not available");
      const out = await roiDistributor.methods.getPidClaimsSlice(address, epoch, offset, limit).call();
      return (out || []).map(item => ({
        pid: toNumber(item.pid),
        usdTotal: fromMicroUSD(item.usdTotal),
        ramaTotal: fromWeiToRama(item.ramaTotal),
      }));
    } catch (error) {
      console.error("Error fetching pid claims slice:", error);
      return [];
    }
  },

  // Debug helper to get detailed period info for a portfolio (for transparency/troubleshooting)
  debugPortfolioUsdForPeriod: async (pid, periodId) => {
    try {
      const roiDistributor = makeContract(RoiDistributionABI, Contract.RoiDistribution);
      if (!roiDistributor) throw new Error("ROI Distributor contract not available");
      const d = await roiDistributor.methods.debugPortfolioUsdForPeriod(pid, periodId).call();
      return {
        pid: toNumber(d.pid),
        periodId: toNumber(d.periodId),
        periodStartTs: toNumber(d.periodStartTs),
        periodEndTs: toNumber(d.periodEndTs),
        owner: d.owner,
        createdAt: toNumber(d.createdAt),
        isClosed: Boolean(d.isClosed),
        isCapped: Boolean(d.isCapped),
        closedAt: toNumber(d.closedAt),
        cappedAt: toNumber(d.cappedAt),
        booster: Boolean(d.booster),
        tier: toNumber(d.tier),
        capPct: toNumber(d.capPct),
        existsByEndOfEpoch: Boolean(d.existsByEndOfEpoch),
        afterCutoff: Boolean(d.afterCutoff),
        isFrozen: Boolean(d.isFrozen),
        principalUsdMicro: d.principalUsdMicro,
        principalUsd: fromMicroUSD(d.principalUsdMicro),
        rateWad: d.rateWad,
        usdMicroRaw: d.usdMicroRaw,
        capUsdMicro: d.capUsdMicro,
        capUsd: fromMicroUSD(d.capUsdMicro),
        paidUsdSoFar: fromMicroUSD(d.paidUsdSoFar),
        remainingCapUsd: fromMicroUSD(d.remainingCapUsd),
        usdMicroFinal: d.usdMicroFinal,
        dayId: toNumber(d.dayId),
        price6Latest: d.price6Latest,
      };
    } catch (error) {
      console.error("Error fetching debug portfolio period info:", error);
      return null;
    }
  },


  getAccruedRewardsPaged: async (address, offset = 0, limit = 50) => {
    try {
      const oceanicView = makeContract(OceanicViewABI, Contract["Oceanicview"]);
      if (!oceanicView) {
        throw new Error("OceanicView contract not available");
      }

      // Fetch paged data from the contract
      const result = await oceanicView.methods
        .getROIPreviewPerPortfolioPaged(address, offset, limit)
        .call();

      // The contract returns a struct of arrays. We need to "zip" them into an
      // array of objects for easier consumption by the UI.
      const portfolios = (result.pids ?? []).map((pid, index) => {
        const meta = result.meta?.[index] ?? {};
        const principalUsd = fromMicroUSD(meta.principal_USD_WAD ?? 0);
        const accruedUsd = fromMicroUSD(result.usdMicro?.[index] ?? 0);
        const totalBoosterROI = fromWeiToRama(meta.totalReceivedBoosterROI ?? 0); // Assuming this is in wei

        // Calculate cap USD
        const capPct = Number(meta.capPct ?? 0);
        const capUsd = principalUsd * (capPct / 100 || (meta.booster ? 2.5 : 2));

        return {
          portfolioId: Number(pid),
          roi: {
            accrued: accruedUsd,
            usdAmount: accruedUsd, // Assuming usdMicro is the accrued/pending amount
            ramaAmount: fromWeiToRama(result.ramaWei?.[index] ?? 0),
            credited: 0, // This view doesn't provide credited, set to 0
            principalUsd: principalUsd,
            meta: {
              roi: principalUsd > 0 ? ((accruedUsd / principalUsd) * 100).toFixed(2) : "0.00",
              boosterActive: meta.booster ?? false,
              boosterROI: totalBoosterROI,
              tier: Number(meta.tier ?? 0),
              principalUsd: principalUsd,
              isCapped: meta.isCapped ?? false,
              isClosed: meta.isClosed ?? false,
              capPct: capPct,
              frozenUntil: Number(meta.frozenUntil ?? 0),
              createdAt: Number(meta.createdAt ?? 0),
              cappedAt: Number(meta.cappedAt ?? 0),
              closedAt: Number(meta.closedAt ?? 0),
              lastUpdate: Number(meta.lastAccrual ?? 0), // Or a more appropriate field if available
            },
          },
          epochCount: Number(result.epochCounts?.[index] ?? 0),
        };
      });

      return {
        portfolios,
        totalCount: Number(result.totalCount ?? 0),
      };
    } catch (error) {
      console.error("Error fetching paged accrued rewards:", error);
      // Add user-friendly error message
      if (error.message.includes("invalid BigNumber value")) {
        throw new Error("Received invalid data from the blockchain. Please try again.");
      }
      throw error;
    }
  },

  getClaimHistoryPaged: async (address, offset = 0, limit = 20) => {
    try {
      const roiDistributor = makeContract(RoiDistributionABI, Contract.RoiDistribution);
      if (!roiDistributor) {
        throw new Error("ROI Distributor contract not available");
      }

      const result = await roiDistributor.methods
        .getClaimHistorySlice(address, offset, limit)
        .call();

      const history = (result ?? []).map((item, index) => {
        const usdAmount = fromMicroUSD(item.usdTotal);
        const ramaAmount = fromWeiToRama(item.ramaTotal);
        
        return {
          id: `${item.fromPeriod}-${item.toPeriod}-${index}`,
          dayId: `${item.fromPeriod} - ${item.toPeriod}`,
          usdAmount,
          ramaAmount,
          claimedAt: Number(item.claimedAt)
        };
      });

      return {
        history,
        hasMore: history.length === limit,
      };

    } catch (error) {
      console.error("Error fetching claim history:", error);
      throw error;
    }
  },

  getUnclaimedROI: async (address) => {
    try {
      const { oceanicView } = await getContractInterface();
      const unclaimedData = await oceanicView.methods.getROIPreviewPerPortfolioPaged(
        address,
        0, // offset
        1000, // limit
        [], // all portfolios
      ).call();
      return unclaimedData;
    } catch (error) {
      console.error('Error getting unclaimed ROI:', error);
      throw error;
    }
  },

  getRoiDashboard: async (address) => {
    try {
      const { oceanicView } = await getContractInterface();
      const dashboard = await oceanicView.methods.getROIDashboardPaged(
        address,
        0, // periodFrom
        Math.floor(Date.now() / 86400), // periodTo (current day)
        0, // historyOffset
        100, // historyLimit
        0, // pidClaimsEpoch
        0, // pidClaimsOffset
        1000, // pidClaimsLimit
        0, // previewOffset
        1000 // previewLimit
      ).call();

      return {
        totals: {
          claimed: {
            usd: parseFloat(Web3.utils.fromWei(dashboard.totals.claimedUsdMicro, 'mwei')),
            rama: parseFloat(Web3.utils.fromWei(dashboard.totals.claimedRamaWei, 'ether'))
          },
          unclaimed: {
            usd: parseFloat(Web3.utils.fromWei(dashboard.totals.unclaimedUsdMicro, 'mwei')),
            rama: parseFloat(Web3.utils.fromWei(dashboard.totals.unclaimedRamaWei, 'ether'))
          },
          periods: {
            from: dashboard.totals.unclaimedFromPeriod,
            last: dashboard.totals.unclaimedLastPeriod,
            count: dashboard.totals.unclaimedEpochsCount
          }
        },
        history: dashboard.histUsdMicro.map((usd, i) => ({
          fromPeriod: dashboard.histFromPeriod[i],
          toPeriod: dashboard.histToPeriod[i],
          usdAmount: parseFloat(Web3.utils.fromWei(usd, 'mwei')),
          ramaAmount: parseFloat(Web3.utils.fromWei(dashboard.histRamaWei[i], 'ether')),
          claimedAt: dashboard.histClaimedAt[i],
          epoch: dashboard.histEpoch[i]
        })),
        portfolios: dashboard.previewPids.map((pid, i) => ({
          pid: pid,
          usdAmount: parseFloat(Web3.utils.fromWei(dashboard.previewUsdMicro[i], 'mwei')),
          ramaAmount: parseFloat(Web3.utils.fromWei(dashboard.previewRamaWei[i], 'ether')),
          epochCount: dashboard.previewEpochCounts[i],
          meta: dashboard.previewMeta[i]
        }))
      };
    } catch (error) {
      console.error('Error getting ROI dashboard:', error);
      throw error;
    }
  },

  getROITotals: async (address) => {
    try {
      // First try ComprehensiveView for more comprehensive data
      const comprehensiveView = makeContract(ComprehensiveViewABI, Contract["ComprehensiveView"]);
      
      if (comprehensiveView) {
        try {
          const [totalRoi, todayRoi, unclaimedRoi] = await Promise.all([
            comprehensiveView.methods.getTotalRoi(address).call(),
            comprehensiveView.methods.getTodayRoi(address).call(),
            comprehensiveView.methods.getUnclaimedRoi(address).call()
          ]);

          // Extract data from ComprehensiveView responses
          const claimedUsd = fromMicroUSD(totalRoi.usdSum || 0);
          const claimedRama = fromWeiToRama(totalRoi.ramaSum || 0);
          const unclaimedUsd = unclaimedRoi.claims.reduce((sum, claim) => 
            sum + fromMicroUSD(claim.usdTotalMicro || 0), 0);
          const unclaimedRama = unclaimedRoi.claims.reduce((sum, claim) => 
            sum + fromWeiToRama(claim.ramaTotalWei || 0), 0);

          return {
            claimedUsd,
            claimedRama,
            unclaimedUsd,
            unclaimedRama,
            todayUsd: fromMicroUSD(todayRoi.usdSum || 0),
            todayRama: fromWeiToRama(todayRoi.ramaSum || 0),
            totalCount: totalRoi.count || 0,
            fromPeriod: unclaimedRoi.fromPeriod || 0,
            toPeriod: unclaimedRoi.toPeriod || 0,
            portfolioClaims: unclaimedRoi.claims || []
          };
        } catch (comprehensiveError) {
          console.warn('ComprehensiveView ROI fetch failed, trying ROI Distributor:', comprehensiveError);
        }
      }

      // Fallback to ROI Distributor contract
      const roiDistributor = makeContract(RoiDistributionABI, Contract.RoiDistribution);
      if (!roiDistributor) {
        console.warn("Neither ComprehensiveView nor ROI Distributor contracts available");
        return { claimedUsd: 0, claimedRama: 0, unclaimedUsd: 0, unclaimedRama: 0 };
      }

      // Get totals claimed and unclaimed ROI separately
      const [claimedTotals, unclaimedData] = await Promise.all([
        roiDistributor.methods.getTotalsClaimed(address).call(),
        roiDistributor.methods.getUnclaimedROI(address).call()
      ]);

      return {
        claimedUsd: fromMicroUSD(claimedTotals[0] || 0), // First return value is USD
        claimedRama: fromWeiToRama(claimedTotals[1] || 0), // Second return value is RAMA
        unclaimedUsd: fromMicroUSD(unclaimedData.usdTotalMicro || 0),
        unclaimedRama: fromWeiToRama(unclaimedData.ramaTotalWei || 0),
        fromPeriod: unclaimedData.fromPeriod || 0,
        lastPeriod: unclaimedData.lastPeriod || 0,
        epochsCount: unclaimedData.epochsCount || 0
      };
    } catch (error) {
      console.error("Error fetching ROI totals:", error);
      // Return fallback data instead of throwing
      return { 
        claimedUsd: 0, 
        claimedRama: 0, 
        unclaimedUsd: 0, 
        unclaimedRama: 0,
        todayUsd: 0,
        todayRama: 0,
        totalCount: 0,
        fromPeriod: 0,
        lastPeriod: 0,
        epochsCount: 0,
        portfolioClaims: [],
        error: error.message 
      };
    }
  },

  getPortfolioRewards: async (address) => {
    try {
      const { oceanicView } = await getContractInterface();
      // Get both ROI preview and claim history
      const [roiData, claimHistory] = await Promise.all([
        oceanicView.methods.getROIPreviewPerPortfolioPaged(
          address,
          0, // offset
          1000, // limit
        ).call(),
        oceanicView.methods.getROIClaimHistoryPaged(
          address,
          0, // offset
          100 // limit
        ).call()
      ]);

      return roiData.pids.map((pid, index) => {
        const meta = roiData.meta[index];
        const claims = claimHistory.fromPeriod.map((from, i) => ({
          fromPeriod: from,
          toPeriod: claimHistory.toPeriod[i],
          usdAmount: parseFloat(Web3.utils.fromWei(claimHistory.usdMicro[i], 'mwei')),
          ramaAmount: parseFloat(Web3.utils.fromWei(claimHistory.ramaWei[i], 'ether')),
          claimedAt: claimHistory.claimedAt[i],
          epoch: claimHistory.epoch[i]
        }));

        const totalRewardsUsd = portfolioRewards.reduce((sum, reward) => 
          sum + parseFloat(Web3.utils.fromWei(reward, 'ether')), 0);
        const pendingRewardsUsd = portfolioRewards
          .filter((_, i) => !portfolioAchieved[i])
          .reduce((sum, reward) => sum + parseFloat(Web3.utils.fromWei(reward, 'ether')), 0);

        // Find matching ROI data for this portfolio
        const roiIndex = roiData.meta.findIndex(m => parseInt(m.pid) === parseInt(portfolio.pid));
        const roi = roiIndex !== -1 ? {
          usdAmount: parseFloat(Web3.utils.fromWei(roiData.usdMicro[roiIndex], 'mwei')),
          ramaAmount: parseFloat(Web3.utils.fromWei(roiData.ramaWei[roiIndex], 'ether')),
          epochCount: roiData.epochCounts[roiIndex],
          meta: {
            principalRama: parseFloat(Web3.utils.fromWei(roiData.meta[roiIndex].principal_RAMA, 'ether')),
            principalUsd: parseFloat(Web3.utils.fromWei(roiData.meta[roiIndex].principal_USD_WAD, 'ether')),
            boosterActive: roiData.meta[roiIndex].booster,
            tier: roiData.meta[roiIndex].tier,
            capPct: roiData.meta[roiIndex].capPct,
            isCapped: roiData.meta[roiIndex].isCapped,
            isClosed: roiData.meta[roiIndex].isClosed,
            totalBoosterROI: parseFloat(Web3.utils.fromWei(roiData.meta[roiIndex].totalReceivedBoosterROI || '0', 'ether')),
            boosterActivationDate: roiData.meta[roiIndex].boosterActivationDate,
            isActivatedFromSafeWallet: roiData.meta[roiIndex].isActivatedFromSafeWallet
          }
        } : null;

        return {
          portfolioId: parseInt(portfolio.pid),
          totalRewardsUsd,
          pendingRewardsUsd,
          lastClaimTimestamp: parseInt(portfolio.lastUpdate || '0'),
          status: portfolio.status || 'active',
          roi: roi
        };
      });
    } catch (error) {
      console.error('Error fetching portfolio rewards:', error);
      throw error;
    }
  },

  UserRegistryAddress: Contract["UserRegistry"],
  CoreConfigAddress: Contract["CoreConfig"],
  RoiDistributionAddress: Contract["RoiDistribution"],
  PortFolioManagerAddress: Contract["PortFolioManager"],
  RoyaltyManagerAddress: Contract["RoyaltyManager"],
  SlabManagerAddress: Contract["SlabManager"],
  IncomeDistributorAddress: Contract["IncomeDistributor"],
  FreezePolicyAddress: Contract["FreezePolicy"],
  RewardVaultAddress: Contract["RewardVault"],
  AdminControlAddress: Contract["AdminControl"],
  MainWalletAddress: Contract["MainWallet"],
  SafeWalletAddress: Contract["SafeWallet"],

  // Session
  userAddress: readLocalJSON('userAddress'),
  setUserAddress: (address) => {
    const normalized =
      typeof address === 'string' && address.startsWith('0x') && address.length === 42
        ? address
        : null;
    try {
      if (normalized) {
        localStorage.setItem('userAddress', normalized);
      } else {
        localStorage.removeItem('userAddress');
      }
    } catch {
      /* ignore */
    }
    set({ userAddress: normalized });
  },
  clearUserAddress: () => {
    try {
      localStorage.removeItem('userAddress');
    } catch {
      /* ignore */
    }
    set({ userAddress: null });
  },


  userIdByAdd: async (userAddress) => {
    try {
      if (!userAddress) {
        throw new Error("Invalid userAddress");
      }

      const contract = new web3.eth.Contract(UserRegistryABI, Contract["UserRegistry"]);
      const userInfo = await contract.methods.getUser(userAddress).call();

      if (!userInfo) return null;

      const registered =
        typeof userInfo.registered !== "undefined"
          ? Boolean(userInfo.registered)
          : Boolean(userInfo[0]);
      const idRaw =
        typeof userInfo.id !== "undefined" ? userInfo.id : userInfo[1];
      const referrerRaw =
        typeof userInfo.referrer !== "undefined"
          ? userInfo.referrer
          : userInfo[2];
      const directsRaw =
        typeof userInfo.directsCount !== "undefined"
          ? userInfo.directsCount
          : userInfo[3];
      const createdRaw =
        typeof userInfo.createdAt !== "undefined"
          ? userInfo.createdAt
          : userInfo[4];

      return {
        registered,
        id: idRaw != null ? Number(idRaw) : null,
        referrer: referrerRaw ?? null,
        directsCount: directsRaw != null ? Number(directsRaw) : null,
        createdAt: createdRaw != null ? Number(createdRaw) : null,
        raw: userInfo,
      };
    } catch (error) {
      console.log(error);
      throw error;
    }
  },

  RegisterUser: async (userAddress, value) => {
    console.log('RegisterUser args:', userAddress, value);
    try {
      if (!userAddress || typeof userAddress !== 'string' || !userAddress.startsWith('0x')) {
        throw new Error('Invalid user address');
      }

      const contract = new web3.eth.Contract(UserRegistryABI, Contract['UserRegistry']);

      // --- Resolve sponsor: address or numeric ID
      let sponsorAddress;
      if (typeof value === 'string' && value.startsWith('0x')) {
        sponsorAddress = value;
      } else {
        const userId = typeof value === 'number' ? value : Number(value);
        if (!Number.isFinite(userId) || userId <= 0) throw new Error('Invalid sponsor id');
        sponsorAddress = await contract.methods.idToAddress(userId).call();
      }

      if (!sponsorAddress || !sponsorAddress.startsWith('0x')) {
        throw new Error('Resolved sponsor address is invalid');
      }
      const ZERO = '0x0000000000000000000000000000000000000000';
      if (sponsorAddress.toLowerCase() === ZERO.toLowerCase()) {
        throw new Error('Sponsor not found (zero address)');
      }

      const data = contract.methods.registerUser(sponsorAddress).encodeABI();

      // --- Gas price
      const gasPrice = await web3.eth.getGasPrice(); // string in wei

      // --- IMPORTANT: do NOT send any value; fn is nonpayable
      let gasLimit;
      try {
        gasLimit = await web3.eth.estimateGas({
          from: userAddress,
          to: Contract['UserRegistry'],
          data,                  // no "value" here
        });
      } catch (err) {
        console.error('Gas estimation failed:', err);
        toast.error(err?.message || 'Check contract & inputs.', 'Gas Estimation Failed');
        throw err;
      }

      const toHex = web3.utils.toHex;
      const tx = {
        from: userAddress,
        to: Contract['UserRegistry'],
        data,
        // value omitted (or explicitly zero)
        // value: '0x0',
        gas: toHex(gasLimit),
        gasPrice: toHex(gasPrice),
        // optional: include chainId if your wallet needs it for signing
        // chainId: <Rama chain id here>
      };

      // Return tx for the wallet to sign/send (WalletConnect, MetaMask, etc.)
      return tx;
    } catch (error) {
      console.error('RegisterUser error:', error);
      toast.error(error?.message || 'Unknown error', 'Registration Error');
      throw error;
    }
  },

  checkUserById: async (userId) => {
    try {
      if (!userId) {
        throw new Error("Invalid userId");
      }

      const contract = new web3.eth.Contract(UserRegistryABI, Contract["UserRegistry"]);

      const userAddress = await contract.methods.idToAddress(userId).call();

      return userAddress;
    } catch (error) {
      console.error("Error:", error);
      alert(`Error checking user: ${error.message}`);
      throw error;
    }
  },

  getUserDetails: async (Value) => {
    try {
      const contract = new web3.eth.Contract(UserRegistryABI, Contract['UserRegistry']);

      const raw = typeof Value === 'string' ? Value.trim() : Value;

      // --- Resolve sponsor: address or numeric ID (supports D-prefixed ids)
      let UserAddress;
      if (typeof raw === 'string' && raw.startsWith('0x')) {
        UserAddress = raw;
      } else {
        let numericInput;
        if (typeof raw === 'string') {
          const extracted = raw.replace(/^[dD][\s-]*/, '').replace(/[^0-9]/g, '');
          numericInput = extracted ? Number(extracted) : NaN;
        } else {
          numericInput = Number(raw);
        }

        if (!Number.isFinite(numericInput) || numericInput <= 0) {
          throw new Error('Invalid user id');
        }

        const userId = Math.trunc(numericInput);
        UserAddress = await contract.methods.idToAddress(userId).call();
      }

      if (!UserAddress || !UserAddress.startsWith('0x')) {
        throw new Error('Resolved address is invalid');
      }
      const ZERO = '0x0000000000000000000000000000000000000000';
      if (UserAddress.toLowerCase() === ZERO.toLowerCase()) {
        throw new Error('User Address not found (zero address)');
      }

      const response = await contract.methods.getUser(UserAddress).call()

      localStorage.setItem("userAddress", UserAddress)

      return { response, UserAddress }
    } catch (error) {
      console.error('User id/Address error:', error);
      toast.error(error?.message || 'Unknown error', 'ID/Address Error');
      throw error;
    }
  },


  isUserRegisterd: async (userAddress) => {
    try {
      if (!userAddress) {
        throw new Error("Invalid userId");
      }
      const contract = new web3.eth.Contract(UserRegistryABI, Contract["UserRegistry"]);

      const isUserExist = await contract.methods.isRegistered(userAddress).call();

      console.log(isUserExist)
      return isUserExist;
    } catch (error) {
      console.error("Error:", error);
      alert(`Error checking user: ${error.message}`);
      throw error;
    }
  },

  // =====================================================================
  // Dashboard 
  // =====================================================================

  getTOtalPortFolio: async (userAddress) => {
    try {
      if (!userAddress) {
        return;
      }


      const pmContract = new web3.eth.Contract(
        PortFolioManagerABI,
        Contract["PortFolioManager"]
      );
      const ArrPortfolio = await pmContract.methods
        .portfoliosOf(userAddress)
        .call();

      let ProtFolioDetail = null;
      if (ArrPortfolio.length > 0) {
        const firstPid = Number(ArrPortfolio[0]);
        if (Number.isFinite(firstPid)) {
          ProtFolioDetail = await get().getPortFoliById(firstPid);
        }
      }

      return { ArrPortfolio, ProtFolioDetail };

    } catch (error) {
      console.error('Portfolio error:', error);
      toast.error(error?.message || 'Unknown error', 'Portfolio Error');
      throw error;
    }
  },

  getPortfolioIds: async (userAddress) => {
    try {
      if (!userAddress) return [];

      const pm = new web3.eth.Contract(
        PortFolioManagerABI,
        Contract["PortFolioManager"]
      );

      const rawIds = await pm.methods.portfoliosOf(userAddress).call();
      // Filter out invalid PIDs (0, negative, non-numeric)
      const validIds = rawIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0);
      
      if (validIds.length === 0) {
        console.log(`getPortfolioIds: no valid portfolios found for ${userAddress}`);
      }
      
      return validIds;
    } catch (error) {
      console.error("getPortfolioIds error:", error);
      throw error;
    }
  },

  getPortFoliById: async (portId) => {
    try {
      // Reject invalid PIDs (0, null, undefined, negative)
      const pidNum = Number(portId);
      if (!portId || !Number.isFinite(pidNum) || pidNum <= 0) {
        console.warn(`getPortFoliById: invalid PID ${portId}, returning null`);
        return null;
      }

      const oceanQuery = new web3.eth.Contract(
        OceanQueryUpgradeableABI,
        Contract["OceanQueryUpgradeable"]
      );
      const portfolioManager = new web3.eth.Contract(
        PortFolioManagerABI,
        Contract["PortFolioManager"]
      );
      const cappingIncomeManager = new web3.eth.Contract(
        CappingIncomeManagerABI,
        Contract["CappingIncomeManager"]
      );

      const [raw, pmRaw] = await Promise.all([
        oceanQuery.methods.getPortfolioDetails(portId).call(),
        portfolioManager.methods
          .getPortfolio(portId)
          .call()
          .catch((err) => {
            console.warn("PortfolioManager.getPortfolio failed:", err?.message || err);
            return null;
          }),
      ]);

      const pick = (key, index) =>
        raw?.[key] != null ? raw[key] : raw?.[index];

      const principalUsdMicro = toBigIntSafe(pick("principalUSD", 2));
      const creditedUsdMicro = toBigIntSafe(pick("creditedUsd", 3));
      const capUsdMicro = toBigIntSafe(pick("capUSD", 11) ?? pick("capUsd", 4));
      const capProgressBps = toNumber(pick("capProgressBps", 12));
      const dailyRateWad = pick("dailyRateWad", 11);

      // Fetch remaining-to-cap from CappingIncomeManager and convert to USD6 via PortfolioManager
      let remainingToCapWei = "0";
      let remainingCapUsdMicro = "0";
      try {
        const wei = await cappingIncomeManager.methods.remainingToCapWei(portId).call();
        remainingToCapWei = String(wei ?? "0");
        if (wei && wei !== "0" && wei !== "0x0") {
          try {
            // Validate wei is a valid number
            const weiNumber = BigInt(wei);
            if (weiNumber > 0n) {
              const usd6 = await portfolioManager.methods.getPackageValueInUSD(wei).call();
              remainingCapUsdMicro = String(usd6 ?? "0");
            }
          } catch (convErr) {
            console.warn("getPackageValueInUSD failed for remainingToCapWei:", convErr?.message || convErr);
            // Set to 0 on failure to prevent further errors
            remainingCapUsdMicro = "0";
          }
        }
      } catch (remErr) {
        console.warn("CappingIncomeManager.remainingToCapWei failed:", remErr?.message || remErr);
      }

      const result = {
        pid: Number(pick("pid", 0)),
        principalRama: toNumber(pick("principalRama", 1)),
        principalUsdMicro: principalUsdMicro.toString(),
        principalUsd: fromMicroUSD(principalUsdMicro),
        principalUsdDisplay: fromMicroUSD(principalUsdMicro),
        creditedRama: toNumber(pick("creditedRama", 3)),
        creditedUsdMicro: creditedUsdMicro.toString(),
        creditedUsd: fromMicroUSD(creditedUsdMicro),
        creditedUsdDisplay: fromMicroUSD(creditedUsdMicro),
        createdAt: toNumber(pick("createdAt", 4)),
        frozenUntil: toNumber(pick("frozenUntil", 5)),
        booster: Boolean(pick("booster", 6)),
        tier: toNumber(pick("tier", 7)),
        capPct: toNumber(pick("capPct", 8)),
        active: Boolean(pick("active", 9)),
        capRama: toNumber(pick("capRama", 10)),
        capUsdMicro: capUsdMicro.toString(),
        capUsd: fromMicroUSD(capUsdMicro),
        dailyRateWad,
        capProgressBps,
        remainingToCapWei,
        remainingCapUsdMicro,
        remainingCapUsd: fromMicroUSD(remainingCapUsdMicro),
      };

      applyPortfolioManagerFields(result, pmRaw);
      return result;
    } catch (error) {
      console.error(`Portfolio error for PID ${portId}:`, error);
      
      // Check if it's a contract execution error (portfolio doesn't exist)
      if (error?.message?.includes('execution reverted') || 
          error?.message?.includes('ContractExecutionError')) {
        console.warn(`Portfolio ${portId} does not exist or is invalid`);
        return null; // Return null instead of throwing for non-existent portfolios
      }
      
      // For other errors (network, contract address, etc.), throw them
      throw error;
    }
  },

  getDashboardDetails: async (userAddress) => {
    try {
      if (!userAddress) throw new Error("Missing user address");

      const oceanViewV2 = makeContract(
        OceanViewV2ABI,
        Contract["OceanViewV2"]
      );
      const safeWalletContract = makeContract(
        SafeWalletABI,
        Contract["SafeWallet"]
      );
      const portfolioManager = makeContract(
        PortFolioManagerABI,
        Contract["PortFolioManager"]
      );
      const cappingIncomeManager = makeContract(
        CappingIncomeManagerABI,
        Contract["CappingIncomeManager"]
      );
      const roiDistributor = makeContract(
        RoiDistributionABI,
        Contract["RoiDistribution"]
      );

      const roiPreviewMap = new Map();
      if (roiDistributor) {
        try {
          const previewRaw = await roiDistributor.methods
            .previewClaimPerPortfolio(userAddress)
            .call();
          const previewPids =
            previewRaw?.pids ?? previewRaw?.[0] ?? [];
          const previewUsd =
            previewRaw?.usdTotals ?? previewRaw?.[1] ?? [];
          const previewRama =
            previewRaw?.ramaTotals ?? previewRaw?.[2] ?? [];
          previewPids.forEach((pidValue, idx) => {
            const pidNum = Number(pidValue);
            if (!Number.isFinite(pidNum)) return;
            const usdBig = toBigIntSafe(previewUsd[idx] ?? 0);
            const ramaVal = previewRama[idx] ?? 0;
            roiPreviewMap.set(pidNum, {
              usd: fromMicroUSD(usdBig),
              usdMicro: usdBig.toString(),
              rama: fromWeiToRama(ramaVal),
              ramaWei: ramaVal,
            });
          });
        } catch (err) {
          console.warn("RoiDistributor.previewClaimPerPortfolio failed:", err);
        }
      }

      if (oceanViewV2) {
        try {
          const todayDayId = Math.floor(Date.now() / 86400000);
          const {
            summary: summaryRaw,
            income: incomeRaw,
            wallet: walletRaw,
            portfolios: portfoliosRaw,
            weekly: weeklyRaw,
            lifetimeCapBps: lifetimeCapRaw,
          } = await oceanViewV2.methods
            .getDashboardData(userAddress)
            .call();

          const pick = (record, key, index) =>
            record?.[key] != null ? record[key] : record?.[index];

          const summary = summaryRaw ?? {};
          const income = incomeRaw ?? {};
          const wallet = walletRaw ?? {};
          const portfolios = Array.isArray(portfoliosRaw)
            ? portfoliosRaw
            : portfoliosRaw?.portfolios ?? [];
          const weeklyStruct =
            weeklyRaw ?? (Array.isArray(portfoliosRaw) ? {} : weeklyRaw);

          const normalizedPortfolios = [];
          let sumPrincipalUsd = 0;
          let sumPrincipalRama = 0;
          let sumCreditedUsd = 0;
          let sumCreditedRama = 0;
          let sumPrincipalUsdMicro = 0n;
          let sumCreditedUsdMicro = 0n;

          for (const entry of portfolios ?? []) {
            const pid = toNumber(pick(entry, "pid", 0));
            const principalRamaWei =
              pick(entry, "principalRamaWei", 1) ??
              pick(entry, "principalRama", 1) ??
              0;
            const principalUsdMicro =
              pick(entry, "principalUsdMicro", 2) ??
              pick(entry, "principalUSD", 2) ??
              0;
            const capRamaWei =
              pick(entry, "capRamaWei", 3) ?? pick(entry, "capRama", 3) ?? 0;
            const capUsdMicro =
              pick(entry, "capUsdMicro", 4) ?? pick(entry, "capUsd", 4) ?? 0;
            const creditedRamaWei =
              pick(entry, "creditedRamaWei", 5) ??
              pick(entry, "creditedRama", 5) ??
              0;
            const creditedUsdMicro =
              pick(entry, "creditedUsdMicro", 6) ??
              pick(entry, "creditedUsd", 6) ??
              0;
            const capProgressBps = toNumber(
              pick(entry, "capProgressBps", 7) ?? 0
            );
            const dailyRateWad = pick(entry, "dailyRateWad", 8);
            const capPct = toNumber(pick(entry, "capPct", 9) ?? 0);
            const tier = toNumber(pick(entry, "tier", 10) ?? 0);
            const booster = Boolean(pick(entry, "booster", 11));
            const active = Boolean(pick(entry, "active", 12));
            const createdAt = toNumber(pick(entry, "createdAt", 13) ?? 0);
            const frozenUntil = toNumber(pick(entry, "frozenUntil", 14) ?? 0);
            const roiPreview = roiPreviewMap.get(pid);

            // Remaining-to-cap from CappingIncomeManager (wei) -> USD6 via PortfolioManager
            let remainingToCapWei = "0";
            let remainingCapUsdMicro = "0";
            try {
              if (cappingIncomeManager && Number.isFinite(pid)) {
                const remWei = await cappingIncomeManager.methods.remainingToCapWei(pid).call();
                remainingToCapWei = String(remWei ?? "0");
                if (remWei && remWei !== "0" && portfolioManager) {
                  try {
                    const usd6 = await portfolioManager.methods.getPackageValueInUSD(remWei).call();
                    remainingCapUsdMicro = String(usd6 ?? "0");
                  } catch (convErr) {
                    console.warn("getPackageValueInUSD failed (dashboard portfolios):", convErr?.message || convErr);
                  }
                }
              }
            } catch (remErr) {
              console.warn("remainingToCapWei (dashboard portfolios) failed:", remErr?.message || remErr);
            }

            const principalUsd = fromMicroUSD(principalUsdMicro);
            const principalRama = fromWeiToRama(principalRamaWei);
            const creditedUsd = fromMicroUSD(creditedUsdMicro);
            const creditedRama = fromWeiToRama(creditedRamaWei);

            sumPrincipalUsd += principalUsd;
            sumPrincipalRama += principalRama;
            sumCreditedUsd += creditedUsd;
            sumCreditedRama += creditedRama;
            sumPrincipalUsdMicro += toBigIntSafe(principalUsdMicro);
            sumCreditedUsdMicro += toBigIntSafe(creditedUsdMicro);

            const normalizedEntry = {
              pid,
              principalUsdRaw: principalUsdMicro,
              principalUsd,
              principalRama,
              principalRamaWei,
              capRamaWei,
              capUsd: fromMicroUSD(capUsdMicro),
              creditedUsdRaw: creditedUsdMicro,
              creditedUsd,
              creditedRama,
              creditedRamaWei,
              capProgressBps,
              dailyRateWad,
              capPct,
              tier,
              booster,
              active,
              createdAt,
              frozenUntil,
              pendingUsd: roiPreview?.usd ?? 0,
              pendingUsdMicro: roiPreview?.usdMicro ?? "0",
              pendingRama: roiPreview?.rama ?? 0,
              pendingRamaWei: roiPreview?.ramaWei ?? 0,
              remainingToCapWei,
              remainingCapUsdMicro,
              remainingCapUsd: fromMicroUSD(remainingCapUsdMicro),
            };

            if (portfolioManager) {
              try {
                const pmRaw = await portfolioManager.methods
                  .getPortfolio(pid)
                  .call();
                applyPortfolioManagerFields(normalizedEntry, pmRaw);
              } catch (err) {
                console.warn(
                  "PortfolioManager.getPortfolio failed:",
                  err?.message || err
                );
              }
            }

            normalizedPortfolios.push(normalizedEntry);
          }

          const incomeTotalsUsd = {
            growth: fromMicroUSD(pick(income, "growthUsdMicro", 1) ?? 0),
            slab: fromMicroUSD(pick(income, "slabUsdMicro", 2) ?? 0),
            slabAvailable: fromMicroUSD(
              pick(income, "slabAvailableUsdMicro", 3) ?? 0
            ),
            royalty: fromMicroUSD(pick(income, "royaltyUsdMicro", 4) ?? 0),
            override: fromMicroUSD(pick(income, "overrideUsdMicro", 5) ?? 0),
            rewards: fromMicroUSD(pick(income, "rewardsUsdMicro", 6) ?? 0),
          };

          incomeTotalsUsd.total = fromMicroUSD(
            pick(income, "totalUsdMicro", 0) ?? 0
          );

          const overrideWaveRaw =
            pick(income, "overrideWaveUsdMicro", 7) ?? [];
          const overrideWaveUsd = Array.isArray(overrideWaveRaw)
            ? overrideWaveRaw.map(fromMicroUSD)
            : [];

          const totalEarningsUsd = fromWadToUsd(pick(summary, "totalEarningsUsdWad", 2) ?? 0);
          const totalEarningsRama = fromWeiToRama(pick(summary, "totalEarningsRamaWei", 3) ?? 0);

          const totalClaimableUsd = fromMicroUSD(
            pick(summary, "totalClaimableUsdMicro", 2) ?? 0
          );

          const summaryTotalStakedUsd = fromMicroUSD(
            pick(summary, "totalStakedUsdMicro", 0) ?? 0
          );
          const summaryTotalStakedRama = fromWeiToRama(
            pick(summary, "totalStakedRamaWei", 1) ?? 0
          );
          const lifetimeStakedUsd = fromMicroUSD(
            pick(summary, "lifetimeStakedUsdMicro", 17) ?? 0
          );
          const lifetimeEarnedUsd = fromMicroUSD(
            pick(summary, "totalLifetimeEarnedUsdMicro", 18) ?? 0
          );

          const safeWalletRamaWeiRaw =
            pick(wallet, "safeWalletRamaWei", 0) ??
            pick(wallet, "safeWalletRama", 0) ??
            "0";
          const safeWalletUsdMicroRaw =
            pick(wallet, "safeWalletUsdMicro", 1) ?? 0;

          let safeWalletRama = fromWeiToRama(safeWalletRamaWeiRaw);
          let safeWalletUsd = fromMicroUSD(safeWalletUsdMicroRaw);
          let safeWalletTotals = {
            ramaWei: safeWalletRamaWeiRaw,
            roiUsd: null,
            creditsUsd: null,
            creditsRama: null,
            debitsUsd: null,
            debitsRama: null,
          };

          if (safeWalletContract) {
            try {
              const totals = await safeWalletContract.methods
                .getTotals(userAddress)
                .call();
              if (totals) {
                const [
                  ramaWei,
                  roiUsdWad,
                  creditsUsdWad,
                  creditsRamaWei,
                  debitsUsdWad,
                  debitsRamaWei,
                ] = totals;
                safeWalletTotals = {
                  ramaWei,
                  roiUsd: fromWadToUsd(roiUsdWad),
                  creditsUsd: fromWadToUsd(creditsUsdWad),
                  creditsRama: fromWeiToRama(creditsRamaWei),
                  debitsUsd: fromWadToUsd(debitsUsdWad),
                  debitsRama: fromWeiToRama(debitsRamaWei),
                };
                safeWalletRama = fromWeiToRama(ramaWei);
                if (portfolioManager) {
                  try {
                    const usdMicro = await portfolioManager.methods
                      .getPackageValueInUSD(ramaWei)
                      .call();
                    safeWalletUsd = fromMicroUSD(usdMicro);
                  } catch (err) {
                    console.warn("SafeWallet USD conversion failed:", err);
                  }
                }
              }
            } catch (err) {
              console.warn("SafeWallet.getTotals failed:", err);
            }
          }


          const cap_used= await cappingIncomeManager.methods.getEarnedByKind(userAddress).call();

          console.log("cap_used",cap_used)
          return {
            cap_used,
            totals: {
              totalValueUsd: fromMicroUSD(
                pick(summary, "totalStakedUsdMicro", 0)
              ),
              totalEarnedRama: fromWeiToRama(
                pick(summary, "totalEarnedRamaWei", 1)
              ),
              directRefs: toNumber(pick(summary, "directRefs", 6)),
              qualifiedVolumeUsd: fromMicroUSD(
                pick(summary, "qualifiedVolumeUsdMicro", 5)
              ),
              royaltyLevel: toNumber(pick(summary, "royaltyLevel", 11)),
              totalStakedUsd:
                sumPrincipalUsd > 0
                  ? sumPrincipalUsd
                  : sumPrincipalUsdMicro > 0n
                  ? fromMicroUSD(sumPrincipalUsdMicro)
                  : summaryTotalStakedUsd,
              totalStakedRama:
                sumPrincipalRama > 0 ? sumPrincipalRama : summaryTotalStakedRama,
            },
            slabPanel: {
              slabIndex: toNumber(pick(summary, "slabLevel", 9)),
              qualifiedVolumeUsd: fromMicroUSD(
                pick(summary, "qualifiedVolumeUsdMicro", 5)
              ),
              directMembers: toNumber(pick(summary, "directRefs", 6)),
              canClaim: Boolean(pick(summary, "slabCanClaim", 10)),
            },
            safeWallet: {
              rama: safeWalletRama,
              wei: safeWalletTotals.ramaWei,
              usd: safeWalletUsd,
              totals: safeWalletTotals,
            },
            accruedGrowthUsd: fromMicroUSD(
              pick(wallet, "pendingGrowthUsdMicro", 4) ??
                pick(summary, "accruedGrowthUsdMicro", 3)
            ),
            accruedGrowthRama: fromWeiToRama(
              pick(summary, "accruedGrowthRamaWei", 4) ??
                pick(wallet, "pendingGrowthRamaWei", 3)
            ),
            totalEarningsUsd,
            totalEarningsRama,
            incomeTotalsUsd: {
              ...incomeTotalsUsd,
              total: totalClaimableUsd,
              overrideWaves: overrideWaveUsd,
            },
            totalClaimableUsd,
            userStatus: {
              slabLevel: toNumber(pick(summary, "slabLevel", 9)),
              royaltyLevel: toNumber(pick(summary, "royaltyLevel", 11)),
              directs: toNumber(pick(summary, "directRefs", 6)),
              qualifiedVolumeUsd: fromMicroUSD(
                pick(summary, "qualifiedVolumeUsdMicro", 5)
              ),
              royaltyPaused: Boolean(pick(summary, "royaltyPaused", 12)),
              royaltyCanClaim: Boolean(
                pick(summary, "royaltyCanClaim", 13)
              ),
              royaltyPaidMonths: toNumber(
                pick(summary, "royaltyPaidMonths", 16)
              ),
              royaltyLastMonthEpoch: toNumber(
                pick(summary, "royaltyLastMonthEpoch", 14)
              ),
              royaltyNextMonthEpoch: toNumber(
                pick(summary, "royaltyNextMonthEpoch", 15)
              ),
            },
            teamCount: toNumber(pick(summary, "teamCount", 7)),
            upline: pick(summary, "upline", 8),
            lifetimeCapBps: toNumber(lifetimeCapRaw ?? 0),
            walletSnapshot: {
              lifetimeRoiUsd: fromMicroUSD(
                pick(wallet, "lifetimeRoiUsdMicro", 2)
              ),
              pendingGrowthUsd: fromMicroUSD(
                pick(wallet, "pendingGrowthUsdMicro", 4)
              ),
              pendingGrowthRama: fromWeiToRama(
                pick(wallet, "pendingGrowthRamaWei", 3)
              ),
            },
            portfolios: normalizedPortfolios,
            lifetimeSummary: {
              stakedUsd: lifetimeStakedUsd,
              earnedUsd: lifetimeEarnedUsd,
              capUsd:
                lifetimeCapRaw && Number(lifetimeCapRaw) > 0
                  ? (lifetimeStakedUsd * Number(lifetimeCapRaw)) / 10000
                  : lifetimeStakedUsd * 4,
            },
            weeklyTrend: (() => {
              const dayIds =
                weeklyStruct?.dayIds ?? pick(weeklyStruct, 0) ?? [];
              const usdAmounts =
                weeklyStruct?.usdAmounts ?? pick(weeklyStruct, 1) ?? [];
              return dayIds.map((dayId, index) => {
                const dayTs = Number(dayId) * 86400;
                const amountMicro = usdAmounts[index] ?? 0;
                return {
                  day: dayShortFromUnix(dayTs),
                  amount: fromMicroUSD(amountMicro),
                };
              });
            })(),
          };
        } catch (err) {
          console.warn(
            "OceanViewV2.getDashboardData fallback to legacy:",
            err?.message ?? err
          );
        }
      }

      const oceanQuery = new web3.eth.Contract(
        OceanQueryUpgradeableABI,
        Contract["OceanQueryUpgradeable"]
      );
      const oceanView = new web3.eth.Contract(
        OceanViewUpgradeableABI,
        Contract["OceanViewUpgradeable"]
      );

      const [
        totals,
        slabPanel,
        safeWalletWei,
        accruedGrowthRaw,
        incomeTotals,
        totalClaimable,
        userStatus,
        totalStakedRaw,
        totalEarningsRaw,
      ] = await Promise.all([
        oceanView.methods.getPortfolioTotals(userAddress).call(),
        oceanView.methods.getSlabPanel(userAddress).call(),
        oceanQuery.methods.getSafeWalletBalance(userAddress).call(),
        oceanQuery.methods.getAccruedGrowth(userAddress).call(),
        oceanQuery.methods.getIncomeStreamTotals(userAddress).call(),
        oceanQuery.methods.getTotalClaimableIncome(userAddress).call(),
        oceanQuery.methods.getUserStatus(userAddress).call(),
        oceanQuery.methods.getTotalStakedAmount(userAddress).call(),
        oceanQuery.methods.getTotalEarnings(userAddress).call(),
      ]);

      const totalClaimableValue = totalClaimable?.sum ?? totalClaimable ?? "0";

      const totalStakedUsd = fromMicroUSD(
        totalStakedRaw?.totalUsdMicro ?? totalStakedRaw?.[1]
      );
      const totalStakedRama = fromWeiToRama(
        totalStakedRaw?.totalRamaWei ?? totalStakedRaw?.[0]
      );
      const totalEarningsUsd = fromWadToUsd(
        totalEarningsRaw?.totalUsdWad ?? totalEarningsRaw?.[0]
      );
      const totalEarningsRama = fromWeiToRama(
        totalEarningsRaw?.totalRamaWei ?? totalEarningsRaw?.[1]
      );

      const incomeTotalsUsd = {
        growth: fromMicroUSD(incomeTotals?.growth ?? incomeTotals?.[0]),
        slab: fromMicroUSD(incomeTotals?.slab ?? incomeTotals?.[1]),
        royalty: fromMicroUSD(incomeTotals?.royalty ?? incomeTotals?.[2]),
        override: fromMicroUSD(
          incomeTotals?.overrideB ?? incomeTotals?.override ?? incomeTotals?.[3]
        ),
        rewards: fromMicroUSD(incomeTotals?.rewards ?? incomeTotals?.[4]),
      };
      incomeTotalsUsd.total =
        incomeTotalsUsd.growth +
        incomeTotalsUsd.slab +
        incomeTotalsUsd.royalty +
        incomeTotalsUsd.override +
        incomeTotalsUsd.rewards;

      return {
        totals: {
          totalValueUsd: fromMicroUSD(totals?.totalValueUSD),
          totalEarnedRama: fromWeiToRama(totals?.totalEarnedRama),
          directRefs: toNumber(totals?.directRefs),
          qualifiedVolumeUsd: fromMicroUSD(totals?.qualifiedVolumeUSD),
          royaltyLevel: toNumber(totals?.royaltyLevel),
          totalStakedUsd,
          totalStakedRama,
        },
        slabPanel: {
          slabIndex: toNumber(slabPanel?.slabIndex),
          qualifiedVolumeUsd: fromMicroUSD(slabPanel?.qualifiedVolumeUSD),
          directMembers: toNumber(slabPanel?.directMembers),
          canClaim: Boolean(slabPanel?.canClaim),
        },
        safeWallet: {
          rama: fromWeiToRama(safeWalletWei),
          wei: safeWalletWei,
          usd: null,
        },
        accruedGrowthUsd: fromMicroUSD(accruedGrowthRaw),
        totalEarningsUsd,
        totalEarningsRama,
        incomeTotalsUsd,
        totalClaimableUsd: fromMicroUSD(totalClaimableValue),
        userStatus: {
          slabLevel: toNumber(userStatus?.slabLevel),
          royaltyLevel: toNumber(userStatus?.royaltyLevel),
          directs: toNumber(userStatus?.directs),
          qualifiedVolumeUsd: fromMicroUSD(userStatus?.qualifiedVolumeUSD),
        },
      };
    } catch (error) {
      console.log(error);
      throw error;
    }
  },

  getClaimableBreakdown: async (userAddress) => {
    try {
      if (!userAddress) throw new Error("Missing user address");

      const oceanViewV2 = makeContract(
        OceanViewV2ABI,
        Contract["OceanViewV2"]
      );
      const portfolioManager = makeContract(
        PortFolioManagerABI,
        Contract["PortFolioManager"]
      );

      if (oceanViewV2) {
        try {
          const income = await oceanViewV2.methods
            .getIncomeStreams(userAddress)
            .call();

          const pick = (record, key, index) =>
            record?.[key] != null ? record[key] : record?.[index];

          const totalClaimableUsd = fromMicroUSD(
            pick(income, "totalUsdMicro", 0) ?? 0
          );
          const growthUsd = fromMicroUSD(
            pick(income, "growthUsdMicro", 1) ?? 0
          );
          const slabUsd = fromMicroUSD(
            pick(income, "slabUsdMicro", 2) ?? 0
          );
          const slabAvailableUsd = fromMicroUSD(
            pick(income, "slabAvailableUsdMicro", 3) ?? 0
          );
          const royaltyUsd = fromMicroUSD(
            pick(income, "royaltyUsdMicro", 4) ?? 0
          );
          const overrideUsd = fromMicroUSD(
            pick(income, "overrideUsdMicro", 5) ?? 0
          );
          const rewardsUsd = fromMicroUSD(
            pick(income, "rewardsUsdMicro", 6) ?? 0
          );
          const overrideWaveRaw =
            pick(income, "overrideWaveUsdMicro", 7) ?? [];
          const overrideWaveUsd = Array.isArray(overrideWaveRaw)
            ? overrideWaveRaw.map(fromMicroUSD)
            : [];

      return {
        totalClaimableUsd,
        streams: {
          growthUsd,
          slabTotalUsd: slabUsd,
          slabAvailableUsd,
          royaltyUsd,
          overrideUsd,
          rewardsUsd,
          overrideWaveUsd,
          slabCanClaim:
            Boolean(pick(income, 'slabCanClaim', 8)) || slabAvailableUsd > 0,
        },
        incomeTotalsUsd: {
          growth: growthUsd,
          slab: slabUsd,
          royalty: royaltyUsd,
              override: overrideUsd,
              rewards: rewardsUsd,
              total: totalClaimableUsd,
              overrideWaves: overrideWaveUsd,
            },
          };
        } catch (err) {
          console.warn(
            "OceanViewV2.getIncomeStreams fallback to legacy:",
            err?.message ?? err
          );
        }
      }

      const oceanQuery = new web3.eth.Contract(
        OceanQueryUpgradeableABI,
        Contract["OceanQueryUpgradeable"]
      );

      const [
        totalClaimableRaw,
        growthIncomeRaw,
        slabIncomeRaw,
        slabAvailableRaw,
        royaltyIncomeRaw,
        overrideIncomeRaw,
        rewardIncomeRaw,
        incomeTotalsRaw,
      ] = await Promise.all([
        oceanQuery.methods.getTotalClaimableIncome(userAddress).call(),
        oceanQuery.methods.getPortfolioGrowthIncome(userAddress).call(),
        oceanQuery.methods.getSlabIncome(userAddress).call(),
        oceanQuery.methods.getSlabIncomeAvailable(userAddress).call(),
        oceanQuery.methods.getRoyaltyIncome(userAddress).call(),
        oceanQuery.methods.getSameSlabOverrideIncome(userAddress).call(),
        oceanQuery.methods.getOneTimeRewardIncome(userAddress).call(),
        oceanQuery.methods.getIncomeStreamTotals(userAddress).call(),
      ]);

      const pickIncome = (obj, key, index) => {
        if (!obj) return 0;
        if (obj[key] != null) return obj[key];
        if (Array.isArray(obj) && obj[index] != null) return obj[index];
        return 0;
      };

      return {
        totalClaimableUsd: fromMicroUSD(totalClaimableRaw),
        streams: {
          growthUsd: fromMicroUSD(growthIncomeRaw),
          slabTotalUsd: fromMicroUSD(slabIncomeRaw),
          slabAvailableUsd: fromMicroUSD(slabAvailableRaw),
          royaltyUsd: fromMicroUSD(royaltyIncomeRaw),
          overrideUsd: fromMicroUSD(overrideIncomeRaw),
          rewardsUsd: fromMicroUSD(rewardIncomeRaw),
          slabCanClaim: fromMicroUSD(slabAvailableRaw) > 0,
        },
        incomeTotalsUsd: {
          growth: fromMicroUSD(pickIncome(incomeTotalsRaw, "growth", 0)),
          slab: fromMicroUSD(pickIncome(incomeTotalsRaw, "slab", 1)),
          royalty: fromMicroUSD(pickIncome(incomeTotalsRaw, "royalty", 2)),
          override: fromMicroUSD(
            pickIncome(incomeTotalsRaw, "overrideB", 3)
              ?? pickIncome(incomeTotalsRaw, "override", 3)
          ),
          rewards: fromMicroUSD(pickIncome(incomeTotalsRaw, "rewards", 4)),
        },
      };
    } catch (error) {
      console.error("getClaimableBreakdown error:", error);
      throw error;
    }
  },

  get7DayEarningTrend: async (userAddress) => {
    try {
      if (!userAddress) return [];

      const oceanViewV2 = makeContract(
        OceanViewV2ABI,
        Contract["OceanViewV2"]
      );
      const todayDayId = Math.floor(Date.now() / 86400000);

      if (oceanViewV2) {
        try {
          const weeklyRaw = await oceanViewV2.methods
            .getWeeklyEarnings(userAddress, todayDayId)
            .call();

          const dayIds =
            weeklyRaw?.dayIds ?? weeklyRaw?.[0] ?? weeklyRaw?.day_ids ?? [];
          const usdAmounts =
            weeklyRaw?.usdAmounts ?? weeklyRaw?.[1] ?? weeklyRaw?.usd_amounts ?? [];

          return dayIds.map((dayId, index) => {
            const dayTs = Number(dayId) * 86400;
            const amountMicro = usdAmounts[index] ?? 0;
            return {
              day: dayShortFromUnix(dayTs),
              amount: fromMicroUSD(amountMicro),
            };
          });
        } catch (err) {
          console.warn(
            "OceanViewV2.getWeeklyEarnings fallback to legacy:",
            err?.message ?? err
          );
        }
      }

      const oceanView = new web3.eth.Contract(
        OceanViewUpgradeableABI,
        Contract.OceanViewUpgradeable
      );

      const last7Days = await oceanView.methods
        .getLast7DaysEarningsUSD(userAddress, todayDayId)
        .call();

      const dayIds = last7Days?.dayIds ?? last7Days?.[0] ?? [];
      const usdAmounts = last7Days?.usdAmounts ?? last7Days?.[1] ?? [];

      return dayIds.map((dayId, index) => {
        const dayTs = Number(dayId) * 86400; // seconds
        const amountMicro = usdAmounts[index] ?? 0;
        return {
          day: dayShortFromUnix(dayTs),
          amount: fromMicroUSD(amountMicro),
        };
      });
    } catch (error) {
      console.log("get7DayEarningTrend error:", error);
      return [];
    }
  },

  // =====================================================================
  // Spot / Direct Income
  // =====================================================================

  getSpotIncomeSummary: async (userAddress, options = {}) => {
    const { limit = 25, portfolioLimit = 4 } = options;
    try {
      if (!userAddress) throw new Error("Missing user address");

      const distributor = makeContract(
        IncomeDistributorABI,
        Contract["IncomeDistributor"]
      );
      if (!distributor) throw new Error("IncomeDistributor contract unavailable");

      const oceanQuery = makeContract(
        OceanQueryUpgradeableABI,
        Contract["OceanQueryUpgradeable"]
      );
      const portfolioManager = makeContract(
        PortFolioManagerABI,
        Contract["PortFolioManager"]
      );
      const oceanViewV2 = makeContract(
        OceanViewV2ABI,
        Contract["OceanViewV2"]
      );
      const cappingIncomeManager = makeContract(
        CappingIncomeManagerABI,
        Contract["CappingIncomeManager"]
      );

      const [
        summaryRaw,
        countRaw,
        totalDirectUsdRaw,
        totalDirectRamaRaw,
        sliceRaw,
        totalEarningsRaw,
      ] = await Promise.all([
        distributor.methods.getDirectIncomeSummary(userAddress).call(),
        distributor.methods.getDirectIncomeCount(userAddress).call(),
        distributor.methods.totalDirectUsd(userAddress).call(),
        distributor.methods.totalDirectRama(userAddress).call(),
        distributor.methods
          .getDirectIncomeSlice(userAddress, 0, limit)
          .call(),
        oceanQuery
          ? oceanQuery.methods.getTotalEarnings(userAddress).call()
          : [0, 0],
      ]);

      const entries = toNumber(summaryRaw?.entries);
      const lifetimeUsdMicroBig = toBigIntSafe(summaryRaw?.lifetimeUsd);
      const lifetimeUsd = fromMicroUSD(lifetimeUsdMicroBig);
      const lifetimeRamaWei = toNumber(summaryRaw?.lifetimeRama);
      const lifetimeRama = fromWeiToRama(summaryRaw?.lifetimeRama);
      const claimableRamaWei = toNumber(summaryRaw?.claimableRama);
      const claimableRama = fromWeiToRama(summaryRaw?.claimableRama);

      let claimableUsdMicroBig = 0n;
      if (
        portfolioManager &&
        summaryRaw?.claimableRama &&
        summaryRaw.claimableRama !== "0"
      ) {
        try {
          const usdMicro = await portfolioManager.methods
            .getPackageValueInUSD(summaryRaw.claimableRama)
            .call();
          claimableUsdMicroBig = toBigIntSafe(usdMicro);
        } catch (conversionErr) {
          console.warn("Claimable USD conversion failed:", conversionErr);
        }
      }
      const transactions =
        (sliceRaw ?? []).map((item) => ({
          receiver: item.receiver,
          from: item.receivedFrom,
          portfolioId: toNumber(item.portfolioId),
          amountUsdMicro: Number(toBigIntSafe(item.amountUsd)),
          amountUsd: fromMicroUSD(toBigIntSafe(item.amountUsd)),
          amountRamaWei: toNumber(item.amountRama),
          amountRama: toNumber(item.amountRama) / RAMA_DECIMALS,
          timestamp: toNumber(item.timestamp),
          dayId: toNumber(item.dayId),
        })) ?? [];

      const nowTs = Math.floor(Date.now() / 1000);
      const cutoff = nowTs - 86400;
      let last24hUsdMicro = 0;
      let last24hRamaWei = 0;
      const portfolioSet = new Set();
      transactions.forEach((tx) => {
        if (tx.portfolioId != null && !Number.isNaN(tx.portfolioId)) {
          portfolioSet.add(tx.portfolioId);
        }
        if (tx.timestamp >= cutoff) {
          last24hUsdMicro += tx.amountUsdMicro ?? 0;
          last24hRamaWei += tx.amountRamaWei ?? 0;
        }
      });

      const totalEntries = toNumber(countRaw);
      const averageSpotUsdMicro =
        entries > 0 ? Number(lifetimeUsdMicroBig / BigInt(entries)) : 0;
      const averageSpotUsd = entries > 0 ? fromMicroUSD(lifetimeUsdMicroBig / BigInt(entries)) : 0;
      let totalDirectUsdMicroBig = toBigIntSafe(totalDirectUsdRaw);
      let totalDirectUsd = fromMicroUSD(totalDirectUsdMicroBig);
      let totalDirectRamaWei = toNumber(totalDirectRamaRaw);
      let totalDirectRama = totalDirectRamaWei / RAMA_DECIMALS;
      let totalEarningsUsd = fromWadToUsd(totalEarningsRaw?.[0] ?? 0);
      let totalEarningsRama = fromWeiToRama(totalEarningsRaw?.[1] ?? 0);

      const aggregatedByPortfolio = new Map();
      let aggregatedDirectUsdBig = 0n;
      let aggregatedDirectRamaBig = 0n;
      const MAX_DIRECT_INCOME_SCAN = 200;
      if (totalEntries > 0 && totalEntries <= MAX_DIRECT_INCOME_SCAN) {
        try {
          const indexCalls = [];
          for (let idx = 0; idx < totalEntries; idx += 1) {
            indexCalls.push(
              distributor.methods
                .getDirectIncomeByIndex(userAddress, idx)
                .call()
            );
          }
          const indexResults = await Promise.all(indexCalls);
          indexResults.forEach((row) => {
            const pid = toNumber(row?.portfolioId);
            if (!Number.isFinite(pid)) return;
            const usdBig = toBigIntSafe(row?.amountUsd ?? row?.amountUsdMicro ?? 0);
            const ramaBig = toBigIntSafe(row?.amountRama ?? 0);
            aggregatedDirectUsdBig += usdBig;
            aggregatedDirectRamaBig += ramaBig;
            const existing = aggregatedByPortfolio.get(pid) ?? {
              usdBig: 0n,
              ramaBig: 0n,
              count: 0,
            };
            aggregatedByPortfolio.set(pid, {
              usdBig: existing.usdBig + usdBig,
              ramaBig: existing.ramaBig + ramaBig,
              count: existing.count + 1,
            });
            portfolioSet.add(pid);
          });
        } catch (err) {
          console.warn("getDirectIncomeByIndex aggregation failed:", err);
          aggregatedByPortfolio.clear();
          aggregatedDirectUsdBig = 0n;
          aggregatedDirectRamaBig = 0n;
        }
      }

      if (oceanViewV2) {
        try {
          const todayDayId = Math.floor(Date.now() / 86400000);
          const [summaryFromView] = await oceanViewV2.methods
            .getDashboardData(userAddress)
            .call();

          const pickSummary = (record, key, index) =>
            record?.[key] != null ? record[key] : record?.[index];

          if (summaryFromView) {
            const earningsUsdWad =
              pickSummary(summaryFromView, "totalEarningsUsdWad", 2) ?? 0;
            const earningsRamaWei =
              pickSummary(summaryFromView, "totalEarningsRamaWei", 3) ?? 0;
            totalEarningsUsd = fromWadToUsd(earningsUsdWad);
            totalEarningsRama = fromWeiToRama(earningsRamaWei);

            if (claimableUsdMicroBig === 0n) {
              const claimableMicroRaw = pickSummary(
                summaryFromView,
                "totalClaimableUsdMicro",
                2
              );
              const claimableMicroBig = toBigIntSafe(claimableMicroRaw);
              if (claimableMicroBig > 0n) {
                claimableUsdMicroBig = claimableMicroBig;
              }
            }
          }
        } catch (err) {
          console.warn(
            "OceanViewV2.getDashboardData (spot income) failed:",
            err?.message ?? err
          );
        }
      }

      const claimableUsd = fromMicroUSD(claimableUsdMicroBig);

      const uniquePortfolioIds = new Set(portfolioSet);
      try {
        const additionalIds = await get().getPortfolioIds(userAddress);
        (additionalIds ?? []).forEach((pid) => {
          const numPid = Number(pid);
          if (Number.isFinite(numPid)) uniquePortfolioIds.add(numPid);
        });
      } catch (pidErr) {
        console.warn("getPortfolioIds failed for spot income:", pidErr);
      }

      const portfolioIdsList = Array.from(uniquePortfolioIds).slice(
        0,
        portfolioLimit
      );

      const totalsByPortfolio = await Promise.all(
        portfolioIdsList.map(async (pid) => {
          if (aggregatedByPortfolio.size) {
            const bucket = aggregatedByPortfolio.get(pid);
            if (!bucket) return {
              pid,
              usdMicro: 0,
              usd: 0,
              ramaWei: 0,
              rama: 0,
              count: 0,
            };
            return {
              pid,
              usdMicro: Number(bucket.usdBig),
              usd: fromMicroUSD(bucket.usdBig),
              ramaWei: Number(bucket.ramaBig),
              rama: fromWeiToRama(bucket.ramaBig.toString()),
              count: bucket.count,
            };
          }
          try {
            const totals = await distributor.methods
              .getDirectIncomeTotalsByPortfolio(userAddress, pid)
              .call();
            const usdSumBig = toBigIntSafe(totals?.usdSum ?? totals?.[0]);
            return {
              pid,
              usdMicro: Number(usdSumBig),
              usd: fromMicroUSD(usdSumBig),
              ramaWei: toNumber(totals?.ramaSum ?? totals?.[1]),
              rama:
                toNumber(totals?.ramaSum ?? totals?.[1]) / RAMA_DECIMALS,
              count: toNumber(totals?.count ?? totals?.[2]),
            };
          } catch (err) {
            console.warn(
              `getDirectIncomeTotalsByPortfolio(${pid}) failed`,
              err
            );
            return null;
          }
        })
      ).then((res) => res.filter(Boolean));

      if (aggregatedByPortfolio.size) {
        totalDirectUsdMicroBig = aggregatedDirectUsdBig;
        totalDirectUsd = fromMicroUSD(aggregatedDirectUsdBig);
        totalDirectRamaWei = Number(aggregatedDirectRamaBig);
        totalDirectRama = fromWeiToRama(aggregatedDirectRamaBig.toString());
      }

      return {
        overview: {
          entries,
          totalEntries,
          lifetimeUsdMicro: Number(lifetimeUsdMicroBig),
          lifetimeUsd,
          lifetimeRama,
          lifetimeRamaWei,
          totalDirectUsdMicro: Number(totalDirectUsdMicroBig),
          totalDirectUsd: aggregatedByPortfolio.size
            ? fromMicroUSD(aggregatedDirectUsdBig)
            : totalDirectUsd,
          totalDirectRama: aggregatedByPortfolio.size
            ? fromWeiToRama(aggregatedDirectRamaBig.toString())
            : totalDirectRama,
          totalDirectRamaWei,
          claimableRama,
          claimableRamaWei,
          claimableUsdMicro: Number(claimableUsdMicroBig),
          claimableUsd,
          last24hUsdMicro,
          last24hUsd:
            last24hUsdMicro > 0
              ? fromMicroUSD(BigInt(Math.trunc(last24hUsdMicro)))
              : 0,
          last24hRamaWei,
          last24hRama: last24hRamaWei / RAMA_DECIMALS,
          averageSpotUsd,
          averageSpotUsdMicro,
          totalEarningsUsd,
          totalEarningsRama,
          activeSpots: totalsByPortfolio.length
            ? totalsByPortfolio.length
            : totalEntries,
        },
        transactions,
        totalsByPortfolio,
        hasMore: totalEntries > transactions.length,
      };
    } catch (error) {
      console.error("getSpotIncomeSummary error:", error);
      throw error;
    }
  },

  getIncomeTotals: async (userAddress) => {
    try {
      if (!userAddress) throw new Error('Missing user address');

      const oceanicView = makeContract(
        OceanicViewABI,
        Contract['Oceanicview']
      );
      if (!oceanicView) throw new Error('Oceanicview contract unavailable');

      const cappingIncomeManager = makeContract(
        CappingIncomeManagerABI,
        Contract['CappingIncomeManager']
      );

      let raw = null;
      if (oceanicView) {
        try {
          raw = await oceanicView.methods
            .getIncomeTotals(userAddress)
            .call({ from: userAddress });
        } catch (err) {
          console.warn('Oceanicview.getIncomeTotals failed:', err);
        }
      }

      const pick = (record, key, index) => {
        if (record?.[key] != null) return record[key];
        if (Array.isArray(record) && record[index] != null) return record[index];
        return 0;
      };

      if (raw) {
        const totalRoiUsdMicro = toBigIntSafe(pick(raw, 'totalROI_USD', 0));
        const todayRoiUsdMicro = toBigIntSafe(pick(raw, 'todayROI_USD', 1));
        const boosterRoiUsdMicro = toBigIntSafe(pick(raw, 'boosterROI_USD', 2));
        const directIncomeUsdMicro = toBigIntSafe(pick(raw, 'directIncome_USD', 3));
        const slabIncomeUsdMicro = toBigIntSafe(pick(raw, 'slabIncome_USD', 4));
        const royaltyUsdMicro = toBigIntSafe(pick(raw, 'royalty_USD', 5));
        const rewardUsdMicro = toBigIntSafe(pick(raw, 'reward_USD', 6));
        const growthUsdMicro = toBigIntSafe(pick(raw, 'growth_USD', 7));
        const allIncomesUsdMicro = toBigIntSafe(pick(raw, 'allIncomes_USD', 8));

        return {
          source: 'oceanicView',
          totalRoiUsdMicro: totalRoiUsdMicro.toString(),
          totalRoiUsd: fromMicroUSD(totalRoiUsdMicro),
          todayRoiUsdMicro: todayRoiUsdMicro.toString(),
          todayRoiUsd: fromMicroUSD(todayRoiUsdMicro),
          boosterRoiUsdMicro: boosterRoiUsdMicro.toString(),
          boosterRoiUsd: fromMicroUSD(boosterRoiUsdMicro),
          directIncomeUsdMicro: directIncomeUsdMicro.toString(),
          directIncomeUsd: fromMicroUSD(directIncomeUsdMicro),
          slabIncomeUsdMicro: slabIncomeUsdMicro.toString(),
          slabIncomeUsd: fromMicroUSD(slabIncomeUsdMicro),
          royaltyUsdMicro: royaltyUsdMicro.toString(),
          royaltyUsd: fromMicroUSD(royaltyUsdMicro),
          rewardUsdMicro: rewardUsdMicro.toString(),
          rewardUsd: fromMicroUSD(rewardUsdMicro),
          growthUsdMicro: growthUsdMicro.toString(),
          growthUsd: fromMicroUSD(growthUsdMicro),
          allIncomesUsdMicro: allIncomesUsdMicro.toString(),
          allIncomesUsd: fromMicroUSD(allIncomesUsdMicro),
        };
      }

      if (cappingIncomeManager) {
        const totalUsd6Raw = await cappingIncomeManager.methods
          .totalIncomeEarnedUSD6(userAddress)
          .call();
        const totalMicro = toBigIntSafe(totalUsd6Raw);
        return {
          source: 'cappingIncomeManager',
          totalRoiUsdMicro: '0',
          totalRoiUsd: 0,
          todayRoiUsdMicro: '0',
          todayRoiUsd: 0,
          boosterRoiUsdMicro: '0',
          boosterRoiUsd: 0,
          directIncomeUsdMicro: totalMicro.toString(),
          directIncomeUsd: fromMicroUSD(totalMicro),
          slabIncomeUsdMicro: '0',
          slabIncomeUsd: 0,
          royaltyUsdMicro: '0',
          royaltyUsd: 0,
          rewardUsdMicro: '0',
          rewardUsd: 0,
          growthUsdMicro: '0',
          growthUsd: 0,
          allIncomesUsdMicro: totalMicro.toString(),
          allIncomesUsd: fromMicroUSD(totalMicro),
        };
      }

      throw new Error('Income totals unavailable');
    } catch (error) {
      console.error('getIncomeTotals error:', error);
      throw error;
    }
  },

  // =====================================================================
  // Missed & Held Income (Cap-locked state)
  // =====================================================================

  getMissedIncomeOverview: async (userAddress) => {
    try {
      if (!userAddress) throw new Error('Missing user address');

      const cappingIncomeManager = makeContract(
        CappingIncomeManagerABI,
        Contract['CappingIncomeManager']
      );
      if (!cappingIncomeManager) throw new Error('CappingIncomeManager unavailable');

      const [
        totalsByKindRaw,
        missedCountRaw,
        hasOpenPortfolio,
        openNotCappedPids,
        portfolioSummaries,
        royaltyOverview,
        oneTimeOverview,
        capStatus,
      ] = await Promise.all([
        cappingIncomeManager.methods.getTotalsByKind(userAddress).call(),
        cappingIncomeManager.methods.getMissedIncomeCount(userAddress).call(),
        cappingIncomeManager.methods.hasOpenPortfolio(userAddress).call(),
        cappingIncomeManager.methods.getOpenAndNotCappedPids(userAddress).call(),
        // reuse store methods for richer context
        get().getPortfolioSummaries(userAddress).catch(() => []),
        get().getRoyaltyOverview(userAddress).catch(() => null),
        get().getOneTimeRewardsOverview(userAddress).catch(() => null),
        get().getComprehensiveCapStatus(userAddress).catch(() => null),
      ]);

      const pickTotals = (rec, key, index) => {
        if (!rec) return 0;
        if (rec[key] != null) return rec[key];
        if (Array.isArray(rec)) return rec[index] ?? 0;
        return 0;
      };
      // getTotalsByKind returns tuple of 8 uints (USD6)
      const earnedROI = toBigIntSafe(pickTotals(totalsByKindRaw, 'earnedROI', 0));
      const earnedDirect = toBigIntSafe(pickTotals(totalsByKindRaw, 'earnedDirect', 1));
      const earnedSlab = toBigIntSafe(pickTotals(totalsByKindRaw, 'earnedSlab', 2));
      const earnedSlabOverride = toBigIntSafe(pickTotals(totalsByKindRaw, 'earnedSlabOverride', 3));
      const missedROI = toBigIntSafe(pickTotals(totalsByKindRaw, 'missedROI', 4));
      const missedDirect = toBigIntSafe(pickTotals(totalsByKindRaw, 'missedDirect', 5));
      const missedSlab = toBigIntSafe(pickTotals(totalsByKindRaw, 'missedSlab', 6));
      const missedSlabOverride = toBigIntSafe(pickTotals(totalsByKindRaw, 'missedSlabOverride', 7));

      const missed = {
        spotUsd: fromMicroUSD(missedDirect),
        slabUsd: fromMicroUSD(missedSlab),
        slabOverrideUsd: fromMicroUSD(missedSlabOverride),
        roiUsd: fromMicroUSD(missedROI),
      };
      const totalMissedUsd =
        (missed.spotUsd || 0) + (missed.slabUsd || 0) + (missed.slabOverrideUsd || 0);

      // Cap status and timing
      const capReachedAt = (() => {
        if (!Array.isArray(portfolioSummaries)) return 0;
        const times = portfolioSummaries
          .map((p) => Number(p?.cappedAt || 0))
          .filter((t) => Number.isFinite(t) && t > 0);
        if (!times.length) return 0;
        // Use latest cap event
        return Math.max(...times);
      })();
      const nowSec = Math.floor(Date.now() / 1000);
      const daysSinceCap = capReachedAt > 0 ? Math.max(0, Math.floor((nowSec - capReachedAt) / 86400)) : 0;

      const openNotCapped = Array.isArray(openNotCappedPids) ? openNotCappedPids : [];
      const capLocked = !hasOpenPortfolio || openNotCapped.length === 0;

      const held = {
        royaltyUsd: royaltyOverview?.royaltyIncomeUsd ?? 0,
        rewardsUsd: oneTimeOverview?.pendingRewardUsd ?? 0,
      };
      const canClaimHeldNow = !capLocked && ((held.royaltyUsd ?? 0) > 0 || (held.rewardsUsd ?? 0) > 0);

      return {
        capLocked,
        capStatus,
        capReachedAt,
        daysSinceCap,
        missedCount: toNumber(missedCountRaw),
        missed,
        totalMissedUsd,
        earned: {
          roiUsd: fromMicroUSD(earnedROI),
          spotUsd: fromMicroUSD(earnedDirect),
          slabUsd: fromMicroUSD(earnedSlab),
          slabOverrideUsd: fromMicroUSD(earnedSlabOverride),
        },
        held: {
          ...held,
          canClaimNow: canClaimHeldNow,
        },
        openNotCappedPids: openNotCapped.map((x) => Number(x)).filter(Number.isFinite),
        fetchedAt: Date.now(),
      };
    } catch (error) {
      console.error('getMissedIncomeOverview error:', error);
      throw error;
    }
  },

  getMissedIncomeSlice: async (userAddress, offset = 0, limit = 50) => {
    try {
      if (!userAddress) throw new Error('Missing user address');
      const cappingIncomeManager = makeContract(
        CappingIncomeManagerABI,
        Contract['CappingIncomeManager']
      );
      if (!cappingIncomeManager) throw new Error('CappingIncomeManager unavailable');

      const raw = await cappingIncomeManager.methods
        .getMissedIncomeSlice(userAddress, offset, limit)
        .call();

      const entries = (raw ?? []).map((rec, idx) => {
        const at = toNumber(rec?.at ?? rec?.[0] ?? 0);
        const amountUSD6 = toBigIntSafe(rec?.amountUSD6 ?? rec?.[1] ?? 0);
        const kindRaw = rec?.kind ?? rec?.[2];
        const pid = toNumber(rec?.pid ?? rec?.[3] ?? 0);
        const reasonRaw = rec?.reason ?? rec?.[4];
        const kindKey = normalizeMissedKind(kindRaw);
        const reason = bytes32ToString(reasonRaw) || 'cap';
        return {
          id: `${offset + idx}-${at}-${pid}-${kindKey}`,
          at,
          amountUsd: fromMicroUSD(amountUSD6),
          amountUsdRaw: amountUSD6.toString(),
          kind: kindKey,
          pid,
          reason,
        };
      });

      return {
        offset,
        limit,
        entries,
      };
    } catch (error) {
      console.error('getMissedIncomeSlice error:', error);
      throw error;
    }
  },

  getSpotIncomeTransactions: async (
    userAddress,
    { offset = 0, limit = 20 } = {}
  ) => {
    try {
      if (!userAddress) throw new Error("Missing user address");

      const distributor = makeContract(
        IncomeDistributorABI,
        Contract["IncomeDistributor"]
      );
      if (!distributor) throw new Error("IncomeDistributor contract unavailable");

      const sliceRaw = await distributor.methods
        .getDirectIncomeSlice(userAddress, offset, limit)
        .call();

      return (sliceRaw ?? []).map((item) => ({
        receiver: item.receiver,
        from: item.receivedFrom,
        portfolioId: toNumber(item.portfolioId),
        amountUsdMicro: toNumber(item.amountUsd),
        amountUsd: toNumber(item.amountUsd) / USD_MICRO,
        amountRamaWei: toNumber(item.amountRama),
        amountRama: toNumber(item.amountRama) / RAMA_DECIMALS,
        timestamp: toNumber(item.timestamp),
        dayId: toNumber(item.dayId),
      }));
    } catch (error) {
      console.error("getSpotIncomeTransactions error:", error);
      throw error;
    }
  },

  getPortfolioSummaries: async (userAddress) => {
    try {
      if (!userAddress) return [];

      const oceanViewV2 = makeContract(
        OceanViewV2ABI,
        Contract["OceanViewV2"]
      );
      const portfolioManager = makeContract(
        PortFolioManagerABI,
        Contract["PortFolioManager"]
      );
      const cappingIncomeManager = makeContract(
        CappingIncomeManagerABI,
        Contract["CappingIncomeManager"]
      );

      if (oceanViewV2) {
        try {
          const [cardsRaw] = await oceanViewV2.methods
            .getPortfolioCards(userAddress)
            .call();

          const pick = (record, key, index) =>
            record?.[key] != null ? record[key] : record?.[index];

          const mapped = await Promise.all((cardsRaw ?? [])
            .filter((entry) => {
              const pid = Number(pick(entry, "pid", 0));
              return Number.isFinite(pid) && pid > 0;
            })
            .map(async (entry) => {
            const pid = Number(pick(entry, "pid", 0));
            const principalUsdMicro =
              pick(entry, "principalUsdMicro", 2) ??
              pick(entry, "principalUSD", 2) ??
              0;
            const principalRamaWei =
              pick(entry, "principalRamaWei", 1) ??
              pick(entry, "principalRama", 1) ??
              0;
            const capRamaWei =
              pick(entry, "capRamaWei", 3) ?? pick(entry, "capRama", 3) ?? 0;
            const creditedRamaWei =
              pick(entry, "creditedRamaWei", 5) ??
              pick(entry, "creditedRama", 5) ??
              0;
            const capPct = Number(pick(entry, "capPct", 9) ?? 0);
            const booster = Boolean(pick(entry, "booster", 11));
            const tier = Number(pick(entry, "tier", 10) ?? 0);
            const dailyRateWad = pick(entry, "dailyRateWad", 8);
            const active = Boolean(pick(entry, "active", 12));
            const createdAt = Number(pick(entry, "createdAt", 13) ?? 0);
            const frozenUntil = Number(pick(entry, "frozenUntil", 14) ?? 0);
            const capProgressBps = Number(
              pick(entry, "capProgressBps", 7) ?? 0
            );

            // Remaining-to-cap from CappingIncomeManager (wei) -> USD6 via PortfolioManager
            let remainingToCapWei = "0";
            let remainingCapUsdMicro = "0";
            try {
              if (cappingIncomeManager && Number.isFinite(pid) && pid > 0) {
                const remWei = await cappingIncomeManager.methods.remainingToCapWei(pid).call();
                remainingToCapWei = String(remWei ?? "0");
                if (remWei && remWei !== "0" && portfolioManager) {
                  try {
                    const usd6 = await portfolioManager.methods.getPackageValueInUSD(remWei).call();
                    remainingCapUsdMicro = String(usd6 ?? "0");
                  } catch (convErr) {
                    console.warn("getPackageValueInUSD failed (portfolio summaries v2):", convErr?.message || convErr);
                  }
                }
              }
            } catch (remErr) {
              console.warn("remainingToCapWei (portfolio summaries v2) failed:", remErr?.message || remErr);
            }

            const normalized = {
              pid,
              principalUsdRaw: principalUsdMicro,
              principalUsd: fromMicroUSD(principalUsdMicro),
              principalRama: fromWeiToRama(principalRamaWei),
              principalRamaWei,
              capRama: toNumber(capRamaWei),
              creditedRama: toNumber(creditedRamaWei),
              capPct,
              booster,
              tier,
              dailyRateWad,
              active,
              createdAt,
              frozenUntil,
              capProgressBps,
              remainingToCapWei,
              remainingCapUsdMicro,
              remainingCapUsd: fromMicroUSD(remainingCapUsdMicro),
            };

            if (portfolioManager && pid > 0) {
              try {
                const pmRaw = await portfolioManager.methods.getPortfolio(pid).call();
                applyPortfolioManagerFields(normalized, pmRaw);
              } catch (err) {
                console.warn(`PortfolioManager.getPortfolio(${pid}) failed:`, err?.message || err);
              }
            }

            return normalized;
          }));

          return mapped;
        } catch (err) {
          console.warn(
            "OceanViewV2.getPortfolioCards fallback to legacy:",
            err?.message ?? err
          );
        }
      }

      const oceanView = new web3.eth.Contract(
        OceanViewUpgradeableABI,
        Contract["OceanViewUpgradeable"]
      );
      const oceanQuery = new web3.eth.Contract(
        OceanQueryUpgradeableABI,
        Contract["OceanQueryUpgradeable"]
      );

      const rawSummaries = await oceanView.methods
        .getPortfolioSummaries(userAddress)
        .call();

      const pickValue = (entry, key, index) =>
        entry?.[key] != null ? entry[key] : entry?.[index];

      const items = [];
      for (const entry of rawSummaries ?? []) {
        const pid = Number(pickValue(entry, "pid", 0));
        
        // Skip invalid PIDs (0, negative, non-finite)
        if (!Number.isFinite(pid) || pid <= 0) {
          console.warn(`Skipping invalid PID: ${pid}`);
          continue;
        }
        
        const principalUsdRaw = toNumber(pickValue(entry, "principalUSD", 2));
        const principalRama = toNumber(pickValue(entry, "principalRama", 1));
        const capRama = toNumber(pickValue(entry, "capRama", 3));
        const creditedRama = toNumber(pickValue(entry, "creditedRama", 4));
        const capPct = Number(pickValue(entry, "capPct", 5));
        const booster = Boolean(pickValue(entry, "booster", 6));
        const tier = Number(pickValue(entry, "tier", 7));
        const dailyRateWad = pickValue(entry, "dailyRateWad", 8);
        const active = Boolean(pickValue(entry, "active", 9));
        const createdAt = Number(pickValue(entry, "createdAt", 10));
        const frozenUntil = Number(pickValue(entry, "frozenUntil", 11));

        let capProgressBps = null;
        if (Number.isFinite(pid) && pid > 0) {
          try {
            const progressRaw = await oceanQuery.methods
              .getPortfolioCapProgress(pid)
              .call();
            capProgressBps = Number(progressRaw);
          } catch {
            capProgressBps = null;
          }
        }

        // Remaining-to-cap from CappingIncomeManager (wei) -> USD6 via PortfolioManager
        let remainingToCapWei = "0";
        let remainingCapUsdMicro = "0";
        try {
          if (Number.isFinite(pid)) {
            const cm = new web3.eth.Contract(CappingIncomeManagerABI, Contract["CappingIncomeManager"]);
            const remWei = await cm.methods.remainingToCapWei(pid).call();
            remainingToCapWei = String(remWei ?? "0");
            if (remWei && remWei !== "0") {
              try {
                const pm = new web3.eth.Contract(PortFolioManagerABI, Contract["PortFolioManager"]);
                const usd6 = await pm.methods.getPackageValueInUSD(remWei).call();
                remainingCapUsdMicro = String(usd6 ?? "0");
              } catch (convErr) {
                console.warn("getPackageValueInUSD failed (portfolio summaries legacy):", convErr?.message || convErr);
              }
            }
          }
        } catch (remErr) {
          console.warn("remainingToCapWei (portfolio summaries legacy) failed:", remErr?.message || remErr);
        }

        const normalized = {
          pid,
          principalUsdRaw,
          principalUsd: fromMicroUSD(principalUsdRaw),
          principalRama,
          capRama,
          creditedRama,
          capPct,
          booster,
          tier,
          dailyRateWad,
          active,
          createdAt,
          frozenUntil,
          capProgressBps,
          remainingToCapWei,
          remainingCapUsdMicro,
          remainingCapUsd: fromMicroUSD(remainingCapUsdMicro),
        };

        if (portfolioManager) {
          try {
            const pmRaw = await portfolioManager.methods.getPortfolio(pid).call();
            applyPortfolioManagerFields(normalized, pmRaw);
          } catch (err) {
            console.warn("PortfolioManager.getPortfolio failed:", err?.message || err);
          }
        }

        items.push(normalized);
      }

      return items;
    } catch (error) {
      console.error("getPortfolioSummaries error:", error);
      throw error;
    }
  },

  getComprehensiveCapStatus: async (userAddress) => {
    try {
      if (!userAddress) return null;
      const viewContract = new web3.eth.Contract(
        ComprehensiveViewABI,
        Contract["ComprehensiveView"]
      );
      const raw = await viewContract.methods
        .getOverallCapStatus(userAddress)
        .call();
      const pick = (key, index) =>
        raw?.status?.[key] != null
          ? raw.status[key]
          : raw?.[key] != null
          ? raw[key]
          : raw?.status?.[index] ?? raw?.[index];
      const totalPortfolioValueUSD6 = pick("totalPortfolioValueUSD6", 0) ?? 0;
      const cap4xUSD6 = pick("cap4xUSD6", 1) ?? 0;
      const totalIncomeEarnedUSD6 = pick("totalIncomeEarnedUSD6", 2) ?? 0;
      const remainingCapUSD6 = pick("remainingCapUSD6", 3) ?? 0;

      return {
        totalPortfolioValueUSD6: toNumber(totalPortfolioValueUSD6),
        cap4xUSD6: toNumber(cap4xUSD6),
        totalIncomeEarnedUSD6: toNumber(totalIncomeEarnedUSD6),
        remainingCapUSD6: toNumber(remainingCapUSD6),
      };
    } catch (error) {
      console.error('ComprehensiveView.getOverallCapStatus error:', error);
      return null;
    }
  },

  // Fetch team summary (directs, total team size, business volumes) from ComprehensiveView
  getTeamSummary: async (userAddress, maxDepth = 50) => {
    try {
      if (!userAddress) return null;
      const viewContract = new web3.eth.Contract(
        ComprehensiveViewABI,
        Contract["ComprehensiveView"]
      );
      const raw = await viewContract.methods
        .getTeamSummary(userAddress, maxDepth)
        .call();

      const pick = (key, index) =>
        raw?.summary?.[key] != null
          ? raw.summary[key]
          : raw?.[key] != null
          ? raw[key]
          : raw?.summary?.[index] ?? raw?.[index];

      const totalDirects = pick("totalDirects", 0) ?? 0;
      const totalTeamSize = pick("totalTeamSize", 1) ?? 0;
      const qualifiedBusinessUSD = pick("qualifiedBusinessUSD", 2) ?? 0;
      const rawTeamBusinessUSD = pick("rawTeamBusinessUSD", 3) ?? 0;

      return {
        totalDirects: toNumber(totalDirects),
        totalTeamSize: toNumber(totalTeamSize),
        qualifiedBusinessUSD: toNumber(qualifiedBusinessUSD),
        rawTeamBusinessUSD: toNumber(rawTeamBusinessUSD),
      };
    } catch (error) {
      console.error('ComprehensiveView.getTeamSummary error:', error);
      return null;
    }
  },

  // Fetch per-direct self and team portfolio USD using ComprehensiveView
  getDirectsPortfolioAndTeamVolumes: async (userAddress) => {
    try {
      if (!hasAddress(userAddress)) return null;
      const viewContract = new web3.eth.Contract(
        ComprehensiveViewABI,
        Contract["ComprehensiveView"]
      );

      // First try to get top legs with business volumes
      let legsData = null;
      try {
        const topLegsRaw = await viewContract.methods
          .getTopLegsWithBusiness(userAddress)
          .call();
        
        const legs = topLegsRaw?.legs ?? topLegsRaw?.[0] ?? [];
        const volumes = topLegsRaw?.volumes ?? topLegsRaw?.[1] ?? [];
        
        legsData = { legs, volumes };
      } catch (legsError) {
        console.warn('getTopLegsWithBusiness failed:', legsError);
      }

      // Also try to get leg business details for more comprehensive data
      let legDetails = null;
      try {
        legDetails = await viewContract.methods
          .getLegBusinessDetails(userAddress)
          .call();
      } catch (legDetailsError) {
        console.warn('getLegBusinessDetails failed:', legDetailsError);
      }

      // Prepare response data
      const map = new Map();
      const entries = [];
      const directs = [];
      const selfPortfolioUsd = [];
      const teamPortfolioUsd = [];

      if (legsData && legsData.legs && legsData.volumes) {
        // Process legs and volumes data
        for (let i = 0; i < Math.min(legsData.legs.length, legsData.volumes.length); i++) {
          const legAddress = legsData.legs[i];
          if (!hasAddress(legAddress)) continue;
          
          const addr = legAddress.toLowerCase();
          const volumeUsd = fromMicroUSD(legsData.volumes[i] ?? 0);
          
          // Try to get individual member details for this leg
          let memberDetails = null;
          try {
            memberDetails = await viewContract.methods
              .getTeamMemberDetails(legAddress)
              .call();
          } catch (memberError) {
            console.warn(`getTeamMemberDetails failed for ${legAddress}:`, memberError);
          }
          
          const selfUsd = memberDetails ? fromMicroUSD(memberDetails.totalPortfolioValueUSD ?? 0) : 0;
          const teamUsd = memberDetails ? fromMicroUSD(memberDetails.teamBusinessUSD ?? 0) : volumeUsd;
          
          const entry = { 
            address: legAddress, 
            selfUsd, 
            teamUsd,
            memberDetails: memberDetails ? {
              totalPortfolioValueUSD: fromMicroUSD(memberDetails.totalPortfolioValueUSD ?? 0),
              totalEarningsUSD: fromMicroUSD(memberDetails.totalEarningsUSD ?? 0),
              teamBusinessUSD: fromMicroUSD(memberDetails.teamBusinessUSD ?? 0),
              slabLevel: memberDetails.slabLevel ?? 0,
              royaltyLevel: memberDetails.royaltyLevel ?? 0,
              isSlabEligible: memberDetails.isSlabEligible ?? false
            } : null
          };
          
          map.set(addr, entry);
          entries.push(entry);
          directs.push(legAddress);
          selfPortfolioUsd.push(selfUsd);
          teamPortfolioUsd.push(teamUsd);
        }
      }

      // Add leg business details if available
      const legBusinessDetails = legDetails ? {
        L1_USD: fromMicroUSD(legDetails.L1_USD ?? 0),
        L2_USD: fromMicroUSD(legDetails.L2_USD ?? 0),
        Lrest_USD: fromMicroUSD(legDetails.Lrest_USD ?? 0),
        qualifiedT_USD: fromMicroUSD(legDetails.qualifiedT_USD ?? 0),
        requiredForL1_USD: fromMicroUSD(legDetails.requiredForL1_USD ?? 0),
        requiredForL2_USD: fromMicroUSD(legDetails.requiredForL2_USD ?? 0),
        requiredForLrest_USD: fromMicroUSD(legDetails.requiredForLrest_USD ?? 0),
        meets403030: legDetails.meets403030 ?? false
      } : null;

      return {
        directs,
        selfPortfolioUsd,
        teamPortfolioUsd,
        map, // Map<lowercase address, { address, selfUsd, teamUsd, memberDetails }>
        entries,
        legBusinessDetails
      };

    } catch (error) {
      console.error('ComprehensiveView.getDirectsPortfolioAndTeamVolumes error:', error);
      
      // Fallback: try to get basic team summary
      try {
        const viewContract = new web3.eth.Contract(
          ComprehensiveViewABI,
          Contract["ComprehensiveView"]
        );
        
        const teamSummary = await viewContract.methods
          .getTeamSummary(userAddress, 2) // Get 2 levels deep
          .call();
        
        // Return minimal structure with team summary data
        return {
          directs: [],
          selfPortfolioUsd: [],
          teamPortfolioUsd: [],
          map: new Map(),
          entries: [],
          teamSummary: {
            totalDirects: teamSummary?.totalDirects ?? 0,
            totalTeamSize: teamSummary?.totalTeamSize ?? 0,
            qualifiedBusinessUSD: fromMicroUSD(teamSummary?.qualifiedBusinessUSD ?? 0),
            rawTeamBusinessUSD: fromMicroUSD(teamSummary?.rawTeamBusinessUSD ?? 0)
          }
        };
      } catch (fallbackError) {
        console.error('ComprehensiveView.getTeamSummary fallback error:', fallbackError);
        return {
          directs: [],
          selfPortfolioUsd: [],
          teamPortfolioUsd: [],
          map: new Map(),
          entries: [],
          error: error.message
        };
      }
    }
  },

  // Downline ROI snapshot for a user using ComprehensiveView.getDownlineRoiView
  // Returns: { items: Array<{ member, portfolioUsd, roiUsd, roiRama }>, totals: { portfolioUsd, roiUsd, roiRama }, count }
  getDownlineRoiView: async (userAddress) => {
    try {
      if (!hasAddress(userAddress)) return { items: [], totals: { portfolioUsd: 0, roiUsd: 0, roiRama: 0 }, count: 0 };
      const viewContract = new web3.eth.Contract(
        ComprehensiveViewABI,
        Contract["ComprehensiveView"]
      );

      const raw = await viewContract.methods
        .getDownlineRoiView(userAddress)
        .call();

      const list = (raw ?? []).map((rec) => {
        const pick = (obj, key, idx) => (obj && obj[key] != null ? obj[key] : obj?.[idx]);
        const member = pick(rec, 'member', 0) ?? null;
        const totalPortfolioValueUSD = pick(rec, 'totalPortfolioValueUSD', 1) ?? 0;
        const totalRoiEarnedUSD = pick(rec, 'totalRoiEarnedUSD', 2) ?? 0;
        const totalRoiEarnedRama = pick(rec, 'totalRoiEarnedRama', 3) ?? 0;

        return {
          member,
          portfolioUsd: fromMicroUSD(totalPortfolioValueUSD),
          roiUsd: fromMicroUSD(totalRoiEarnedUSD),
          roiRama: fromWeiToRama(totalRoiEarnedRama),
        };
      });

      // Aggregate totals
      const totals = list.reduce(
        (acc, it) => {
          acc.portfolioUsd += Number(it.portfolioUsd || 0);
          acc.roiUsd += Number(it.roiUsd || 0);
          acc.roiRama += Number(it.roiRama || 0);
          return acc;
        },
        { portfolioUsd: 0, roiUsd: 0, roiRama: 0 }
      );

      // Sort by portfolio USD desc, then ROI USD desc
      list.sort((a, b) => (b.portfolioUsd - a.portfolioUsd) || (b.roiUsd - a.roiUsd));

      return { items: list, totals, count: list.length };
    } catch (error) {
      console.error('ComprehensiveView.getDownlineRoiView error:', error);
      return { items: [], totals: { portfolioUsd: 0, roiUsd: 0, roiRama: 0 }, count: 0 };
    }
  },

  // Fetch single team member details for a user (self)
  getTeamMemberDetails: async (memberAddress) => {
    try {
      if (!memberAddress) return null;
      const viewContract = new web3.eth.Contract(
        ComprehensiveViewABI,
        Contract["ComprehensiveView"]
      );
      const raw = await viewContract.methods
        .getTeamMemberDetails(memberAddress)
        .call();

      const pick = (key) => raw?.details?.[key] ?? raw?.[key];

      return {
        member: pick('member') ?? memberAddress,
        totalPortfolioValueUSD: toNumber(pick('totalPortfolioValueUSD') ?? 0),
        totalEarningsUSD: toNumber(pick('totalEarningsUSD') ?? 0),
        teamBusinessUSD: toNumber(pick('teamBusinessUSD') ?? 0),
        slabLevel: toNumber(pick('slabLevel') ?? 0),
        royaltyLevel: toNumber(pick('royaltyLevel') ?? 0),
        isSlabEligible: Boolean(pick('isSlabEligible') ?? false),
      };
    } catch (error) {
      console.error('ComprehensiveView.getTeamMemberDetails error:', error);
      return null;
    }
  },

  getLifetimeCapProgress: async (userAddress) => {
    try {
      if (!userAddress) return null;

      const oceanViewV2 = makeContract(
        OceanicViewABI,
        Contract["Oceanicview"]
      );

      if (oceanViewV2) {
        try {
          const [, lifetimeCapRaw] = await oceanViewV2.methods
            .getPortfolioCards(userAddress)
            .call();
          return Number(lifetimeCapRaw ?? 0);
        } catch (err) {
          console.warn(
            "OceanViewV2.getPortfolioCards (lifetimeCap) fallback:",
            err?.message ?? err
          );
        }
      }

      const oceanQuery = new web3.eth.Contract(
        OceanQueryUpgradeableABI,
        Contract["OceanQueryUpgradeable"]
      );
      const raw = await oceanQuery.methods
        .getLifetimeCapProgress(userAddress)
        .call();
      return Number(raw);
    } catch (error) {
      console.error("getLifetimeCapProgress error:", error);
      throw error;
    }
  },

  // =====================================================================
  // Royalty Program
  // =====================================================================

  getRoyaltyOverview: async (userAddress) => {
    try {
      if (!userAddress) throw new Error("Missing user address");

      const royaltyManager = makeContract(
        RoyaltyManagerABI,
        Contract["RoyaltyManager"]
      );

      if (!royaltyManager) {
        throw new Error("RoyaltyManager contract not available");
      }

      const CompView = makeContract(
        ComprehensiveViewABI,
        Contract["ComprehensiveView"]
      );

      // Get achievement status from ComprehensiveView
      let slabAchiev = null;
      try {
        slabAchiev = await CompView.methods.getAchievementStatus(userAddress).call();
      } catch (err) {
        console.warn("ComprehensiveView getAchievementStatus failed:", err);
        slabAchiev = { stages: [], achievedAt: [] }; // Fallback
      }

      // Use the new getUserRoyaltyOverview function from RoyaltyManager
      const royaltyOverview = await royaltyManager.methods
        .getUserRoyaltyOverview(userAddress)
        .call();

      // Extract data from the returned RoyaltyOverview struct
      const {
        qualifiedTUSD6,
        currentTierIdx,
        lastPaidTier,
        lastPaidMonth,
        paused,
        nextThresholdUSD6,
        neededUSD6,
        achievedStages,
        achievedAt,
        L1_atLast,
        L2_atLast,
        Lrest_atLast,
        tNowCacheUSD6,
        t60dAgoCacheUSD6
      } = royaltyOverview.ov || royaltyOverview; // Handle both direct and nested return

      // Convert values using proper conversion functions
      const qualifiedVolumeUsd = fromMicroUSD(qualifiedTUSD6);
      const currentLevel = Number(currentTierIdx);
      const lastPaidLevel = Number(lastPaidTier);
      const lastPaidMonthEpoch = Number(lastPaidMonth);
      const nextMonthEpoch = lastPaidMonthEpoch + (30 * 24 * 60 * 60); // Add 30 days
      const renewalTargetUsd = fromMicroUSD(nextThresholdUSD6);
      const renewalRequiredUsd = fromMicroUSD(neededUSD6);
      
      // Calculate other values
      const paidMonths = Math.max(0, Number(lastPaidLevel));
      const canClaim = currentLevel > lastPaidLevel && !paused;
      
      // Calculate renewal amounts from cache
      const renewalSnapshotUsd = fromMicroUSD(t60dAgoCacheUSD6 || 0);
      const renewalRecentUsd = fromMicroUSD(tNowCacheUSD6 || 0);
      
      // Calculate directs from team business (L1, L2, Lrest)
      const directs = fromMicroUSD(L1_atLast || 0) + fromMicroUSD(L2_atLast || 0) + fromMicroUSD(Lrest_atLast || 0);
      
      // Calculate royalty income based on qualified volume
      const royaltyIncomeUsd = qualifiedVolumeUsd * 0.05; // 5% royalty rate
      const royaltyIncomeRama = royaltyIncomeUsd / 0.1; // RAMA conversion (adjust as needed)

      // Get tier thresholds from contract
      let tiers = [];
      try {
        const tierCount = Number(await royaltyManager.methods.getTierCount().call());
        if (tierCount > 0) {
          const indices = Array.from({ length: tierCount }, (_, i) => i);
          tiers = await Promise.all(
            indices.map(async (i) => {
              try {
                const [threshold, salary] = await Promise.all([
                  royaltyManager.methods.thresholdUSD(i).call(),
                  royaltyManager.methods.salaryUSD(i).call(),
                ]);
                return {
                  thresholdUsd: fromMicroUSD(threshold),
                  monthlyUsd: fromMicroUSD(salary),
                };
              } catch (err) {
                console.warn(`Failed to fetch tier ${i}:`, err);
                return null;
              }
            })
          );
          // Filter out null values
          tiers = tiers.filter(tier => tier !== null);
        }
      } catch (err) {
        console.warn("RoyaltyManager tier fetch failed:", err);
      }
      
      // Use fallback tiers if none found
      if (!tiers.length) {
        tiers = ROYALTY_LEVELS_FALLBACK.map((level) => ({
          thresholdUsd: fromMicroUSD(level.requiredVolumeUSD),
          monthlyUsd: fromMicroUSD(level.monthlyRoyaltyUSD),
        }));
      }

      return {
        slabAchiev,
        currentLevel,
        lastPaidTier: lastPaidLevel,
        canClaim,
        paused: Boolean(paused),
        royaltyIncomeUsd,
        royaltyIncomeRama,
        overrideIncomeUsd: 0,
        overrideIncomeRama: 0,
        paidMonths,
        lastPaidMonthEpoch,
        nextMonthEpoch,
        qualifiedVolumeUsd,
        directs,
        renewalSnapshotUsd,
        renewalRecentUsd,
        renewalTargetUsd,
        renewalRequiredUsd,
        tiers,
        // Additional data from getUserRoyaltyOverview
        achievedStages: achievedStages || [],
        achievedAt: achievedAt || [],
        neededUSD6: fromMicroUSD(neededUSD6 || 0),
        nextThresholdUSD6: fromMicroUSD(nextThresholdUSD6 || 0),
      };
    } catch (error) {
      console.error("getRoyaltyOverview error:", error);
      // Return fallback data instead of throwing
      return {
        slabAchiev: { stages: [], achievedAt: [] },
        currentLevel: 0,
        lastPaidTier: 0,
        canClaim: false,
        paused: false,
        royaltyIncomeUsd: 0,
        royaltyIncomeRama: 0,
        overrideIncomeUsd: 0,
        overrideIncomeRama: 0,
        paidMonths: 0,
        lastPaidMonthEpoch: 0,
        nextMonthEpoch: 0,
        qualifiedVolumeUsd: 0,
        directs: 0,
        renewalSnapshotUsd: 0,
        renewalRecentUsd: 0,
        renewalTargetUsd: 0,
        renewalRequiredUsd: 0,
        tiers: ROYALTY_LEVELS_FALLBACK.map((level) => ({
          thresholdUsd: fromMicroUSD(level.requiredVolumeUSD),
          monthlyUsd: fromMicroUSD(level.monthlyRoyaltyUSD),
        })),
        achievedStages: [],
        achievedAt: [],
        neededUSD6: 0,
        nextThresholdUSD6: 0,
      };
    }
  },

  // Fetch royalty claim history from RoyaltyPaid events
  getRoyaltyClaimHistory: async (userAddress, limit = 50) => {
    try {
      if (!userAddress) return [];

      const royaltyManager = makeContract(
        RoyaltyManagerABI,
        Contract["RoyaltyManager"]
      );
      if (!royaltyManager) return [];

      // Attempt to get RoyaltyPaid events for the user.
      // Event signature: RoyaltyPaid(address indexed user, uint64 indexed monthId, uint8 tierIdx, uint256 ramaAmount)
      // We'll parse them backwards (most recent first).
      try {
        const latestBlock = await web3.eth.getBlockNumber();
        // Only scan last ~100k blocks to avoid timeout. Adjust as needed.
        const fromBlock = Math.max(0, Number(latestBlock) - 100000);

        const events = await royaltyManager.getPastEvents("RoyaltyPaid", {
          filter: { user: userAddress },
          fromBlock,
          toBlock: "latest",
        });

        // Parse events into a history array
        const history = events
          .map((evt) => {
            const monthId = toNumber(evt.returnValues.monthId || 0);
            const tierIdx = toNumber(evt.returnValues.tierIdx || 0);
            const ramaAmount = fromWeiToRama(evt.returnValues.ramaAmount || 0);

            // Approximate USD from RAMA if possible (could also store or calculate)
            // For now, use a rough conversion. In production, you'd store or compute from oracle.
            const usdAmount = ramaAmount * 0.01; // placeholder rate

            return {
              monthEpoch: monthId,
              tier: tierIdx + 1,
              tierName: ROYALTY_TIER_NAMES[tierIdx] || 'Unknown',
              amountUsd: usdAmount,
              amountRama: ramaAmount,
              claimedAt: evt.blockNumber ? Math.floor(Date.now() / 1000) : 0, // fallback; could fetch block timestamp
              txHash: evt.transactionHash,
            };
          })
          .reverse()
          .slice(0, limit);

        return history;
      } catch (err) {
        console.warn("Unable to fetch RoyaltyPaid events:", err);
        return [];
      }
    } catch (error) {
      console.error("getRoyaltyClaimHistory error:", error);
      return [];
    }
  },

  // Build a claim transaction for royalty (requires Merkle proof from backend/off-chain).
  claimRoyaltyReward: async (fromAddress, monthId, amountRama, amountInUSD, tierIdx, proof = []) => {
    try {
      if (!fromAddress) throw new Error('No connected wallet address');
      if (!monthId) throw new Error('monthId is required');
      if (!amountRama || !amountInUSD || tierIdx == null) {
        throw new Error('Missing claim parameters (amountRama, amountInUSD, tierIdx)');
      }

      const royaltyManager = makeContract(
        RoyaltyManagerABI,
        Contract['RoyaltyManager']
      );
      if (!royaltyManager) throw new Error('RoyaltyManager contract not available');

      // Convert amounts to wei / micro as needed
      const amountRamaWei = toBigIntSafe(BigInt(Math.trunc(amountRama * RAMA_DECIMALS))).toString();
      const amountUSDMicro = toBigIntSafe(BigInt(Math.trunc(amountInUSD * USD_MICRO))).toString();

      // claimRoyalty(uint64 monthId, uint256 amountRama, uint256 amountInUSD, uint8 tierIdx, bytes32[] proof)
      const data = royaltyManager.methods
        .claimRoyalty(monthId, amountRamaWei, amountUSDMicro, tierIdx, proof)
        .encodeABI();

      const gasPrice = await web3.eth.getGasPrice();
      let gasLimit;
      try {
        gasLimit = await web3.eth.estimateGas({
          from: fromAddress,
          to: Contract['RoyaltyManager'],
          data,
        });
      } catch (err) {
        console.error('Gas estimation failed for claimRoyalty:', err);
        throw new Error('Gas estimation failed. The claim may not be valid or proof may be incorrect.');
      }

      const toHex = web3.utils.toHex;
      const tx = {
        from: fromAddress,
        to: Contract['RoyaltyManager'],
        data,
        gas: toHex(gasLimit),
        gasPrice: toHex(gasPrice),
      };

      return tx;
    } catch (error) {
      console.error('claimRoyaltyReward error:', error);
      throw error;
    }
  },

  // =====================================================================
  // Slab Income 
  // =====================================================================

  getSlabIncomeOverview: async (userAddress) => {
    try {
      if (!userAddress) throw new Error("Missing user address");

      const slabManager = makeContract(SlabManagerABI, Contract["SlabManager"]);
      
      if (!slabManager) {
        console.warn("SlabManager contract not available, using fallback data");
        return {
          slabLevel: 0,
          qualifiedVolumeUsd: 0,
          directs: 0,
          canClaim: false,
          currentEpoch: Math.floor(Date.now() / 1000),
          lastClaimEpoch: 0,
          newDirects: 0,
          slabIncomeUsd: 0,
          slabIncomeAvailableUsd: 0,
          slabIncomeRama: 0,
          slabIncomeAvailableRama: 0,
          overrideIncomeUsd: 0,
          overrideIncomeRama: 0,
          royaltyIncomeUsd: 0,
          royaltyIncomeRama: 0,
          sameSlabPartners: { firstWave: [], secondWave: [], thirdWave: [] },
          legsDetailed: [],
          legBreakdown: { L1: 0, L2: 0, Lrest: 0, total: 0 },
          achievementsData: { slabs: [], rewards: [], royalties: [] },
          progressData: {
            currentSlab: 0,
            nextSlabThreshold: 0,
            nextRewardThreshold: 0,
            nextRoyaltyThreshold: 0,
            progressToNextSlab: 0,
            progressToNextReward: 0,
            progressToNextRoyalty: 0
          }
        };
      }

      console.log("🔗 Fetching SlabManager data for:", userAddress);
      console.log("📍 SlabManager contract address:", Contract["SlabManager"]);

      // Get comprehensive user overview from SlabManager with error handling
      let userOverview;
      try {
        userOverview = await slabManager.methods.getUserOverview(userAddress).call();
        console.log("✅ SlabManager.getUserOverview success:", userOverview);
      } catch (overviewError) {
        console.error("❌ SlabManager.getUserOverview failed:", overviewError);
        
        // Try individual function calls as fallback
        try {
          const [
            qualifiedBusinessUSD,
            currentSlabIdx,
            legsTop2AndRest,
            canClaimSlab
          ] = await Promise.all([
            slabManager.methods.getQualifiedBusinessUSD(userAddress).call(),
            slabManager.methods.getSlabIndex(userAddress).call(),
            slabManager.methods.getLegsTop2AndRest(userAddress).call(),
            slabManager.methods.canClaim(userAddress).call()
          ]);

          userOverview = {
            qualifiedBusinessUSD,
            currentSlabIdx,
            currentL1: legsTop2AndRest[0] || 0,
            currentL2: legsTop2AndRest[1] || 0,
            currentLrest: legsTop2AndRest[2] || 0,
            allLegs: [],
            achievedSlabs: [],
            achievedRewards: [],
            achievedRoyalties: [],
            nextSlabThreshold: 0,
            nextRewardThreshold: 0,
            nextRoyaltyThreshold: 0,
            canClaimSlab,
            lastClaimAt: 0,
            new50DirectsSinceClaim: 0
          };

          console.log("🔄 Fallback data retrieved:", userOverview);
        } catch (fallbackError) {
          console.error("❌ Fallback calls failed:", fallbackError);
          throw new Error(`SlabManager contract calls failed: ${fallbackError.message}`);
        }
      }

      // Enhanced data extraction with safe fallbacks
      const extractSafeValue = (obj, key, fallback = 0) => {
        try {
          const value = obj?.[key];
          if (value === null || value === undefined) return fallback;
          return typeof value === 'string' || typeof value === 'bigint' ? value : fallback;
        } catch {
          return fallback;
        }
      };

      // Extract data from the returned struct with safe fallbacks
      const qualifiedBusinessUSD = extractSafeValue(userOverview, 'qualifiedBusinessUSD', 0);
      const currentSlabIdx = extractSafeValue(userOverview, 'currentSlabIdx', 0);
      const currentL1 = extractSafeValue(userOverview, 'currentL1', 0);
      const currentL2 = extractSafeValue(userOverview, 'currentL2', 0);
      const currentLrest = extractSafeValue(userOverview, 'currentLrest', 0);
      const allLegs = userOverview?.allLegs || [];
      const achievedSlabs = userOverview?.achievedSlabs || [];
      const achievedRewards = userOverview?.achievedRewards || [];
      const achievedRoyalties = userOverview?.achievedRoyalties || [];
      const nextSlabThreshold = extractSafeValue(userOverview, 'nextSlabThreshold', 0);
      const nextRewardThreshold = extractSafeValue(userOverview, 'nextRewardThreshold', 0);
      const nextRoyaltyThreshold = extractSafeValue(userOverview, 'nextRoyaltyThreshold', 0);
      const canClaimSlab = Boolean(userOverview?.canClaimSlab);
      const lastClaimAt = extractSafeValue(userOverview, 'lastClaimAt', 0);
      const new50DirectsSinceClaim = extractSafeValue(userOverview, 'new50DirectsSinceClaim', 0);

      // Convert values to appropriate formats with safe conversion
      const safeFromMicroUSD = (value) => {
        try {
          return fromMicroUSD(value || 0);
        } catch {
          return 0;
        }
      };

      const qualifiedVolumeUsd = safeFromMicroUSD(qualifiedBusinessUSD);
      // Convert 0-based contract index to 1-based display level
      // Contract index 0 = Display Level 1, Contract index 1 = Display Level 2, etc.
      const contractSlabIndex = Number(currentSlabIdx) || 0;
      const slabLevel = contractSlabIndex + 1; // Always add 1 to convert to display level
      const directs = (Number(currentL1) || 0) + (Number(currentL2) || 0) + (Number(currentLrest) || 0);
      const canClaim = Boolean(canClaimSlab);
      const lastClaimEpoch = Number(lastClaimAt) || 0;
      const currentEpoch = Math.floor(Date.now() / 1000);
      const newDirects = Number(new50DirectsSinceClaim) || 0;

      // Calculate slab income from achieved slabs with safety checks
      let slabIncomeUsd = 0;
      let slabIncomeAvailableUsd = 0;
      
      if (Array.isArray(achievedSlabs) && achievedSlabs.length > 0) {
        achievedSlabs.forEach(slab => {
          try {
            const slabAmount = safeFromMicroUSD(slab.qualifiedL1) + 
                              safeFromMicroUSD(slab.qualifiedL2) + 
                              safeFromMicroUSD(slab.qualifiedLrest);
            slabIncomeUsd += slabAmount;
            if (canClaim) {
              slabIncomeAvailableUsd += slabAmount;
            }
          } catch (error) {
            console.warn("Error processing slab achievement:", error);
          }
        });
      }

      // Convert to RAMA (using safer calculation)
      const getRamaPrice = () => {
        try {
          return get().ramaPrice || 0.1; // fallback to 0.1
        } catch {
          return 0.1;
        }
      };
      
      const ramaPrice = getRamaPrice();
      const slabIncomeRama = ramaPrice > 0 ? slabIncomeUsd / ramaPrice : 0;
      const slabIncomeAvailableRama = ramaPrice > 0 ? slabIncomeAvailableUsd / ramaPrice : 0;

      // Calculate override income from achieved rewards with safety checks
      let overrideIncomeUsd = 0;
      let overrideIncomeRama = 0;
      
      if (Array.isArray(achievedRewards) && achievedRewards.length > 0) {
        achievedRewards.forEach(reward => {
          try {
            const rewardAmount = safeFromMicroUSD(reward.qualifiedL1) + 
                                safeFromMicroUSD(reward.qualifiedL2) + 
                                safeFromMicroUSD(reward.qualifiedLrest);
            overrideIncomeUsd += rewardAmount;
          } catch (error) {
            console.warn("Error processing reward achievement:", error);
          }
        });
        overrideIncomeRama = ramaPrice > 0 ? overrideIncomeUsd / ramaPrice : 0;
      }

      // Process royalty achievements with safety checks
      let royaltyIncomeUsd = 0;
      let royaltyIncomeRama = 0;
      
      if (Array.isArray(achievedRoyalties) && achievedRoyalties.length > 0) {
        achievedRoyalties.forEach(royalty => {
          try {
            const royaltyAmount = safeFromMicroUSD(royalty.qualifiedL1) + 
                                 safeFromMicroUSD(royalty.qualifiedL2) + 
                                 safeFromMicroUSD(royalty.qualifiedLrest);
            royaltyIncomeUsd += royaltyAmount;
          } catch (error) {
            console.warn("Error processing royalty achievement:", error);
          }
        });
        royaltyIncomeRama = ramaPrice > 0 ? royaltyIncomeUsd / ramaPrice : 0;
      }

      // Build detailed leg information with safety checks
      const legsDetailed = Array.isArray(allLegs) ? allLegs.map(leg => {
        try {
          return {
            address: leg.leg || '',
            volume: safeFromMicroUSD(leg.volume),
            volumeRaw: leg.volume || 0
          };
        } catch {
          return { address: '', volume: 0, volumeRaw: 0 };
        }
      }) : [];

      // Build same slab partners from allLegs data
      const sameSlabPartners = {
        firstWave: legsDetailed.slice(0, 3) || [],
        secondWave: legsDetailed.slice(3, 6) || [],
        thirdWave: legsDetailed.slice(6, 9) || [],
        all: legsDetailed
      };

      // Process achievements with timestamps and safety checks
      const processAchievements = (achievements, type) => {
        if (!Array.isArray(achievements)) return [];
        return achievements.map(item => {
          try {
            return {
              id: Number(item.id) || 0,
              achievedAt: Number(item.achievedAt) || 0,
              achievedDate: new Date((Number(item.achievedAt) || 0) * 1000),
              qualifiedL1: safeFromMicroUSD(item.qualifiedL1),
              qualifiedL2: safeFromMicroUSD(item.qualifiedL2),
              qualifiedLrest: safeFromMicroUSD(item.qualifiedLrest),
              totalQualified: safeFromMicroUSD(item.qualifiedL1) + 
                            safeFromMicroUSD(item.qualifiedL2) + 
                            safeFromMicroUSD(item.qualifiedLrest)
            };
          } catch (error) {
            console.warn(`Error processing ${type} achievement:`, error);
            return {
              id: 0,
              achievedAt: 0,
              achievedDate: new Date(),
              qualifiedL1: 0,
              qualifiedL2: 0,
              qualifiedLrest: 0,
              totalQualified: 0
            };
          }
        });
      };

      const achievementsData = {
        slabs: processAchievements(achievedSlabs, 'slab'),
        rewards: processAchievements(achievedRewards, 'reward'),
        royalties: processAchievements(achievedRoyalties, 'royalty')
      };

      // Create progress tracking data with safety checks
      const nextSlabThresholdUsd = safeFromMicroUSD(nextSlabThreshold);
      const nextRewardThresholdUsd = safeFromMicroUSD(nextRewardThreshold);
      const nextRoyaltyThresholdUsd = safeFromMicroUSD(nextRoyaltyThreshold);

      const progressData = {
        currentSlab: slabLevel,
        nextSlabThreshold: nextSlabThresholdUsd,
        nextRewardThreshold: nextRewardThresholdUsd,
        nextRoyaltyThreshold: nextRoyaltyThresholdUsd,
        progressToNextSlab: nextSlabThresholdUsd > 0 ? Math.min(100, (qualifiedVolumeUsd / nextSlabThresholdUsd) * 100) : 100,
        progressToNextReward: nextRewardThresholdUsd > 0 ? Math.min(100, (qualifiedVolumeUsd / nextRewardThresholdUsd) * 100) : 100,
        progressToNextRoyalty: nextRoyaltyThresholdUsd > 0 ? Math.min(100, (qualifiedVolumeUsd / nextRoyaltyThresholdUsd) * 100) : 100
      };

      // Leg breakdown for UI with safety checks
      const legBreakdown = {
        L1: safeFromMicroUSD(currentL1),
        L2: safeFromMicroUSD(currentL2),
        Lrest: safeFromMicroUSD(currentLrest),
        total: safeFromMicroUSD(currentL1) + safeFromMicroUSD(currentL2) + safeFromMicroUSD(currentLrest)
      };

      const result = {
        // Basic info
        slabLevel,
        qualifiedVolumeUsd,
        directs,
        canClaim,
        currentEpoch,
        lastClaimEpoch,
        newDirects,
        
        // Income calculations
        slabIncomeUsd,
        slabIncomeAvailableUsd,
        slabIncomeRama,
        slabIncomeAvailableRama,
        overrideIncomeUsd,
        overrideIncomeRama,
        royaltyIncomeUsd,
        royaltyIncomeRama,
        
        // Partner/leg data
        sameSlabPartners,
        legsDetailed,
        legBreakdown,
        
        // Achievement data
        achievementsData,
        progressData,
        
        // Raw data for backward compatibility
        slabAchiev: achievementsData,
        summary: {
          slabLevel,
          qualifiedVolumeUsd,
          directRefs: directs,
          canClaim,
          lastClaimAt: lastClaimEpoch,
          nextSlabThreshold: nextSlabThresholdUsd,
          nextRewardThreshold: nextRewardThresholdUsd,
          nextRoyaltyThreshold: nextRoyaltyThresholdUsd,
          newDirects
        }
      };

      console.log("✅ getSlabIncomeOverview result:", result);
      return result;

    } catch (error) {
      console.error("❌ getSlabIncomeOverview error:", error);
      
      // Return safe fallback data instead of throwing
      console.warn("🔄 Returning fallback slab data due to error");
      return {
        slabLevel: 0,
        qualifiedVolumeUsd: 0,
        directs: 0,
        canClaim: false,
        currentEpoch: Math.floor(Date.now() / 1000),
        lastClaimEpoch: 0,
        newDirects: 0,
        slabIncomeUsd: 0,
        slabIncomeAvailableUsd: 0,
        slabIncomeRama: 0,
        slabIncomeAvailableRama: 0,
        overrideIncomeUsd: 0,
        overrideIncomeRama: 0,
        royaltyIncomeUsd: 0,
        royaltyIncomeRama: 0,
        sameSlabPartners: { firstWave: [], secondWave: [], thirdWave: [] },
        legsDetailed: [],
        legBreakdown: { L1: 0, L2: 0, Lrest: 0, total: 0 },
        achievementsData: { slabs: [], rewards: [], royalties: [] },
        progressData: {
          currentSlab: 0,
          nextSlabThreshold: 0,
          nextRewardThreshold: 0,
          nextRoyaltyThreshold: 0,
          progressToNextSlab: 0,
          progressToNextReward: 0,
          progressToNextRoyalty: 0
        },
        slabAchiev: { slabs: [], rewards: [], royalties: [] },
        summary: {
          slabLevel: 0,
          qualifiedVolumeUsd: 0,
          directRefs: 0,
          canClaim: false,
          lastClaimAt: 0,
          nextSlabThreshold: 0,
          nextRewardThreshold: 0,
          nextRoyaltyThreshold: 0,
          newDirects: 0
        },
        error: error.message
      };
    }
  },

  // Get additional SlabManager data for enriched UI
  getSlabManagerDetails: async (userAddress) => {
    try {
      if (!userAddress) throw new Error("Missing user address");

      const slabManager = makeContract(SlabManagerABI, Contract["SlabManager"]);
      
      if (!slabManager) {
        console.warn("SlabManager contract not available for details, using fallback");
        return {
          slabPercents: Array(11).fill(0),
          rewardMilestones: [],
          royaltyTiers: [],
          currentEpoch: Math.floor(Date.now() / 1000),
          canClaim: false
        };
      }

      console.log("🔗 Fetching SlabManager details for:", userAddress);

      // Get additional data in parallel with individual error handling
      const results = await Promise.allSettled([
        slabManager.methods.getSlabPercents().call(),
        slabManager.methods.getRewardMilestones().call(),
        slabManager.methods.getRoyaltyTiers().call(),
        slabManager.methods.currentEpoch().call(),
        slabManager.methods.canClaim(userAddress).call()
      ]);

      // Process results with fallbacks
      const slabPercents = results[0].status === 'fulfilled' 
        ? (results[0].value || []).map(p => Number(p) || 0)
        : Array(11).fill(0).map((_, i) => [5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25][i] || 0);

      const rewardMilestones = results[1].status === 'fulfilled'
        ? (results[1].value || []).map(m => {
            try {
              return fromMicroUSD(m || 0);
            } catch {
              return 0;
            }
          })
        : [];

      const royaltyTiers = results[2].status === 'fulfilled'
        ? (results[2].value || []).map(tier => {
            try {
              return {
                threshold: fromMicroUSD(tier.thresholdUSD || 0),
                reward: fromMicroUSD(tier.rewardUSD || 0)
              };
            } catch {
              return { threshold: 0, reward: 0 };
            }
          })
        : [];

      const currentEpoch = results[3].status === 'fulfilled'
        ? Number(results[3].value) || Math.floor(Date.now() / 1000)
        : Math.floor(Date.now() / 1000);

      const canClaim = results[4].status === 'fulfilled'
        ? Boolean(results[4].value)
        : false;

      // Log any failures for debugging
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const methods = ['getSlabPercents', 'getRewardMilestones', 'getRoyaltyTiers', 'currentEpoch', 'canClaim'];
          console.warn(`❌ SlabManager.${methods[index]} failed:`, result.reason);
        }
      });

      const detailsResult = {
        slabPercents,
        rewardMilestones,
        royaltyTiers,
        currentEpoch,
        canClaim
      };

      console.log("✅ getSlabManagerDetails result:", detailsResult);
      return detailsResult;

    } catch (error) {
      console.error("❌ getSlabManagerDetails error:", error);
      
      // Return safe fallback data
      return {
        slabPercents: Array(11).fill(0).map((_, i) => [5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25][i] || 0),
        rewardMilestones: [],
        royaltyTiers: [],
        currentEpoch: Math.floor(Date.now() / 1000),
        canClaim: false,
        error: error.message
      };
    }
  },

  // Get detailed leg volumes using SlabManager.getLegsDetailed
  getLegsDetailedVolume: async (userAddress) => {
    try {
      if (!userAddress) throw new Error("Missing user address");

      const slabManager = makeContract(SlabManagerABI, Contract["SlabManager"]);
      
      if (!slabManager) {
        throw new Error("SlabManager contract not available");
      }

      // Get detailed leg data from SlabManager
      const legsDetailed = await slabManager.methods.getLegsDetailed(userAddress).call();
      
      if (!legsDetailed || !Array.isArray(legsDetailed)) {
        return {
          legs: [],
          totalVolume: 0,
          topLegs: { L1: 0, L2: 0, L3: 0 },
          summary: {
            totalLegs: 0,
            activeLegs: 0,
            volumeDistribution: []
          }
        };
      }

      // Process and format leg data
      const processedLegs = legsDetailed.map((leg, index) => {
        const volume = fromMicroUSD(leg.volume || 0);
        return {
          address: leg.leg,
          volume: volume,
          volumeUSD: volume,
          volumeRAMA: volume / 0.1, // Convert USD to RAMA
          volumeRaw: leg.volume,
          rank: index + 1,
          percentage: 0 // Will calculate after sorting
        };
      });

      // Sort by volume (highest first)
      const sortedLegs = processedLegs.sort((a, b) => b.volume - a.volume);

      // Calculate total volume
      const totalVolume = sortedLegs.reduce((sum, leg) => sum + leg.volume, 0);

      // Calculate percentages
      sortedLegs.forEach(leg => {
        leg.percentage = totalVolume > 0 ? (leg.volume / totalVolume) * 100 : 0;
      });

      // Get top 3 legs (L1, L2, L3)
      const topLegs = {
        L1: sortedLegs[0]?.volume || 0,
        L2: sortedLegs[1]?.volume || 0,
        L3: sortedLegs[2]?.volume || 0,
        Lrest: sortedLegs.slice(3).reduce((sum, leg) => sum + leg.volume, 0)
      };

      // Create volume distribution for charts
      const volumeDistribution = sortedLegs.slice(0, 10).map(leg => ({
        address: leg.address,
        volume: leg.volume,
        percentage: leg.percentage,
        label: `${leg.address.slice(0, 6)}...${leg.address.slice(-4)}`
      }));

      // Calculate summary statistics
      const activeLegs = sortedLegs.filter(leg => leg.volume > 0).length;
      
      const summary = {
        totalLegs: sortedLegs.length,
        activeLegs,
        averageVolume: activeLegs > 0 ? totalVolume / activeLegs : 0,
        medianVolume: activeLegs > 0 ? sortedLegs[Math.floor(activeLegs / 2)]?.volume || 0 : 0,
        volumeDistribution,
        topPerformers: sortedLegs.slice(0, 5)
      };

      return {
        legs: sortedLegs,
        totalVolume,
        totalVolumeRAMA: totalVolume / 0.1,
        topLegs,
        summary,
        lastUpdated: Date.now()
      };

    } catch (error) {
      console.error("getLegsDetailedVolume error:", error);
      throw error;
    }
  },

  // Get comprehensive volume analytics
  getVolumeAnalytics: async (userAddress) => {
    try {
      if (!userAddress) throw new Error("Missing user address");

      const slabManager = makeContract(SlabManagerABI, Contract["SlabManager"]);
      
      if (!slabManager) {
        throw new Error("SlabManager contract not available");
      }

      // Get multiple volume-related data points in parallel
      const [
        legsDetailed,
        legsTop2AndRest,
        top3AndSum,
        qualifiedBusinessUSD,
        slabIndex
      ] = await Promise.all([
        slabManager.methods.getLegsDetailed(userAddress).call(),
        slabManager.methods.getLegsTop2AndRest(userAddress).call(),
        slabManager.methods.getTop3AndSum(userAddress).call(),
        slabManager.methods.getQualifiedBusinessUSD(userAddress).call(),
        slabManager.methods.getSlabIndex(userAddress).call()
      ]);

      // Process detailed legs
      const processedLegs = (legsDetailed || []).map((leg, index) => ({
        address: leg.leg,
        volume: fromMicroUSD(leg.volume || 0),
        volumeRAMA: fromMicroUSD(leg.volume || 0) / 0.1,
        rank: index + 1
      })).sort((a, b) => b.volume - a.volume);

      // Calculate total volume for percentage calculations
      const totalVolume = processedLegs.reduce((sum, leg) => sum + leg.volume, 0);
      
      // Add percentage to each leg
      processedLegs.forEach(leg => {
        leg.percentage = totalVolume > 0 ? (leg.volume / totalVolume) * 100 : 0;
      });

      // Process capped volumes (used for slab calculations)
      const cappedVolumes = {
        L1: fromMicroUSD(legsTop2AndRest.L1 || legsTop2AndRest[0] || 0),
        L2: fromMicroUSD(legsTop2AndRest.L2 || legsTop2AndRest[1] || 0),
        Lrest: fromMicroUSD(legsTop2AndRest.Lrest || legsTop2AndRest[2] || 0)
      };

      // Process uncapped volumes (actual business volumes)
      const uncappedVolumes = {
        L1: fromMicroUSD(top3AndSum.L1 || top3AndSum[0] || 0),
        L2: fromMicroUSD(top3AndSum.L2 || top3AndSum[1] || 0),
        L3: fromMicroUSD(top3AndSum.L3 || top3AndSum[2] || 0),
        Lrest: fromMicroUSD(top3AndSum.Lrest || top3AndSum[3] || 0),
        total: fromMicroUSD(top3AndSum.sumAll || top3AndSum[4] || 0)
      };

      // Calculate volume metrics
      const totalQualified = fromMicroUSD(qualifiedBusinessUSD || 0);
      // Convert 0-based contract index to 1-based display level
      // Contract index 0 = Display Level 1, Contract index 1 = Display Level 2, etc.
      const contractSlabIndex = parseInt(slabIndex || 0);
      const currentSlabIndex = contractSlabIndex + 1; // Always add 1 to convert to display level

      // Volume performance analysis
      const volumePerformance = {
        cappingEfficiency: {
          L1: uncappedVolumes.L1 > 0 ? (cappedVolumes.L1 / uncappedVolumes.L1) * 100 : 0,
          L2: uncappedVolumes.L2 > 0 ? (cappedVolumes.L2 / uncappedVolumes.L2) * 100 : 0,
          totalLoss: (uncappedVolumes.total - totalQualified)
        },
        balance: {
          isBalanced: Math.abs(cappedVolumes.L1 - cappedVolumes.L2) / Math.max(cappedVolumes.L1, cappedVolumes.L2, 1) < 0.2,
          ratio: cappedVolumes.L2 > 0 ? cappedVolumes.L1 / cappedVolumes.L2 : 0,
          recommendation: cappedVolumes.L1 > cappedVolumes.L2 ? 'Focus on L2 growth' : 'Focus on L1 growth'
        }
      };

      return {
        legs: processedLegs,
        cappedVolumes,
        uncappedVolumes,
        totalQualified,
        currentSlabIndex,
        volumePerformance,
        analytics: {
          topPerformingLeg: processedLegs[0],
          volumeGaps: {
            L1_L2_gap: uncappedVolumes.L1 - uncappedVolumes.L2,
            L2_L3_gap: uncappedVolumes.L2 - uncappedVolumes.L3
          },
          growthPotential: {
            nextSlabRequirement: calculateNextSlabRequirement(currentSlabIndex, totalQualified),
            volumeNeeded: calculateVolumeNeeded(cappedVolumes)
          }
        },
        lastUpdated: Date.now()
      };

    } catch (error) {
      console.error("getVolumeAnalytics error:", error);
      throw error;
    }
  },

  // Get comprehensive income totals using ComprehensiveView contract
  getIncomeTotals: async (userAddress) => {
    try {
      if (!userAddress) throw new Error("Missing user address");

      const comprehensiveView = makeContract(ComprehensiveViewABI, Contract["ComprehensiveView"]);
      
      if (!comprehensiveView) {
        throw new Error("ComprehensiveView contract not available");
      }

      // Call getIncomeTotals function
      const result = await comprehensiveView.methods.getIncomeTotals(userAddress).call();
      
      // Process the results to convert from micro USD and wei
      const totals = {
        roi: {
          usd: fromMicroUSD(result.roiUsd || 0),
          rama: fromWeiToRama(result.roiRama || 0)
        },
        direct: {
          usd: fromMicroUSD(result.directUsd || 0), 
          rama: fromWeiToRama(result.directRama || 0)
        },
        slab: {
          usd: fromMicroUSD(result.slabUsd || 0),
          rama: fromWeiToRama(result.slabRama || 0)
        },
        royalty: {
          usd: fromMicroUSD(result.royaltyUsd || 0),
          rama: fromWeiToRama(result.royaltyRama || 0)
        },
        reward: {
          usd: fromMicroUSD(result.rewardUsd || 0),
          rama: fromWeiToRama(result.rewardRama || 0)
        }
      };

      // Calculate total across all income types
      totals.total = {
        usd: totals.roi.usd + totals.direct.usd + totals.slab.usd + totals.royalty.usd + totals.reward.usd,
        rama: totals.roi.rama + totals.direct.rama + totals.slab.rama + totals.royalty.rama + totals.reward.rama
      };

      // Add Dashboard-compatible properties
      totals.allIncomesUsd = totals.total.usd;
      totals.totalEarningsUsd = totals.total.usd;
      totals.totalEarningsRama = totals.total.rama;
      
      // Individual income types with expected property names
      totals.growthUsd = totals.roi.usd;
      totals.totalRoiUsd = totals.roi.usd;
      totals.todayRoiUsd = 0; // Today's ROI not available from ComprehensiveView
      totals.directIncomeUsd = totals.direct.usd;
      totals.slabIncomeUsd = totals.slab.usd;
      totals.royaltyUsd = totals.royalty.usd;
      totals.rewardUsd = totals.reward.usd;
      totals.boosterRoiUsd = 0; // Booster ROI not separated in ComprehensiveView

      return totals;

    } catch (error) {
      console.error("getIncomeTotals error:", error);
      throw error;
    }
  },

  // Get remaining progress for next achievements
  // Enhanced function to get comprehensive user overview using contract's getUserOverview
  getSlabUserOverview: async (userAddress) => {
    try {
      if (!userAddress) {
        console.error('❌ getSlabUserOverview: Missing user address');
        return {
          success: false,
          error: 'User address is required',
          data: null
        };
      }

      console.log('🔍 Getting comprehensive slab user overview for:', userAddress);
      
      const slabManager = makeContract(SlabManagerABI, Contract["SlabManager"]);
      if (!slabManager) {
        throw new Error('SlabManager contract not available');
      }

      // Use the comprehensive getUserOverview function from the contract
      const userOverview = await slabManager.methods.getUserOverview(userAddress).call();
      console.log('📊 Raw user overview from contract:', userOverview);

      // Process the comprehensive data
      const result = {
        // Basic user metrics
        qualifiedBusinessUSD: Number(userOverview.qualifiedBusinessUSD || 0),
        currentSlabIdx: Number(userOverview.currentSlabIdx || 0), // 0-based from contract
        displaySlabLevel: (Number(userOverview.currentSlabIdx || 0)) + 1, // 1-based for UI
        
        // Current leg volumes (capped for slab calculations)
        currentL1: Number(userOverview.currentL1 || 0),
        currentL2: Number(userOverview.currentL2 || 0),
        currentLrest: Number(userOverview.currentLrest || 0),
        
        // All legs detailed information
        allLegs: (userOverview.allLegs || []).map((leg, index) => ({
          address: leg.leg || '',
          volume: Number(leg.volume || 0),
          rank: index + 1
        })),
        
        // Achieved slabs with full details
        achievedSlabs: (userOverview.achievedSlabs || []).map(slab => ({
          id: Number(slab.id || 0), // 0-based contract index
          displayLevel: (Number(slab.id || 0)) + 1, // 1-based for UI
          achievedAt: Number(slab.achievedAt || 0),
          achievedDate: new Date((Number(slab.achievedAt || 0)) * 1000),
          qualifiedL1: Number(slab.qualifiedL1 || 0),
          qualifiedL2: Number(slab.qualifiedL2 || 0),
          qualifiedLrest: Number(slab.qualifiedLrest || 0)
        })),
        
        // Achieved rewards
        achievedRewards: (userOverview.achievedRewards || []).map(reward => ({
          id: Number(reward.id || 0),
          achievedAt: Number(reward.achievedAt || 0),
          achievedDate: new Date((Number(reward.achievedAt || 0)) * 1000),
          qualifiedL1: Number(reward.qualifiedL1 || 0),
          qualifiedL2: Number(reward.qualifiedL2 || 0),
          qualifiedLrest: Number(reward.qualifiedLrest || 0)
        })),
        
        // Achieved royalties
        achievedRoyalties: (userOverview.achievedRoyalties || []).map(royalty => ({
          id: Number(royalty.id || 0),
          achievedAt: Number(royalty.achievedAt || 0),
          achievedDate: new Date((Number(royalty.achievedAt || 0)) * 1000),
          qualifiedL1: Number(royalty.qualifiedL1 || 0),
          qualifiedL2: Number(royalty.qualifiedL2 || 0),
          qualifiedLrest: Number(royalty.qualifiedLrest || 0)
        })),
        
        // Next level thresholds
        nextSlabThreshold: Number(userOverview.nextSlabThreshold || 0),
        nextRewardThreshold: Number(userOverview.nextRewardThreshold || 0),
        nextRoyaltyThreshold: Number(userOverview.nextRoyaltyThreshold || 0),
        
        // Claiming status
        canClaimSlab: Boolean(userOverview.canClaimSlab || false),
        lastClaimAt: Number(userOverview.lastClaimAt || 0),
        new50DirectsSinceClaim: Number(userOverview.new50DirectsSinceClaim || 0)
      };

      console.log('✅ Processed slab user overview:', result);
      
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ getSlabUserOverview failed:', error);
      return {
        success: false,
        error: error.message,
        data: null,
        timestamp: new Date().toISOString()
      };
    }
  },

  // Get detailed achievement progress using getRemainingForNext
  getDetailedAchievementProgress: async (userAddress, achievementKind = 0) => {
    try {
      if (!userAddress) {
        console.error('❌ getDetailedAchievementProgress: Missing user address');
        return {
          success: false,
          error: 'User address is required',
          data: null
        };
      }

      console.log('🎯 Getting detailed achievement progress for:', userAddress, 'kind:', achievementKind);
      
      const slabManager = makeContract(SlabManagerABI, Contract["SlabManager"]);
      if (!slabManager) {
        throw new Error('SlabManager contract not available');
      }

      // Get next achievement requirements
      const progressData = await slabManager.methods.getRemainingForNext(userAddress, achievementKind).call();
      console.log('📈 Raw progress data:', progressData);

      const result = {
        targetUSD: Number(progressData.progress?.targetUSD || progressData.targetUSD || 0),
        totalNeeded: Number(progressData.progress?.totalNeeded || progressData.totalNeeded || 0),
        L1_needed: Number(progressData.progress?.L1_needed || progressData.L1_needed || 0),
        L2_needed: Number(progressData.progress?.L2_needed || progressData.L2_needed || 0),
        Lrest_needed: Number(progressData.progress?.Lrest_needed || progressData.Lrest_needed || 0),
        isAchieved: Boolean(progressData.progress?.isAchieved || progressData.isAchieved || false),
        achievementKind: achievementKind, // 0 = Slab, 1 = Reward, 2 = Royalty
        progressPercentage: 0
      };

      // Calculate progress percentage
      if (result.targetUSD > 0 && result.totalNeeded >= 0) {
        const achieved = Math.max(0, result.targetUSD - result.totalNeeded);
        result.progressPercentage = Math.min(100, (achieved / result.targetUSD) * 100);
      }

      console.log('✅ Processed achievement progress:', result);
      
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ getDetailedAchievementProgress failed:', error);
      return {
        success: false,
        error: error.message,
        data: {
          targetUSD: 0,
          totalNeeded: 0,
          L1_needed: 0,
          L2_needed: 0,
          Lrest_needed: 0,
          isAchieved: false,
          progressPercentage: 0
        },
      };
    }
  },

  // Get next achievement progress (enhanced version)
  getNextAchievementProgress: async (userAddress) => {
    try {
      if (!userAddress) throw new Error("Missing user address");

      const slabManager = makeContract(SlabManagerABI, Contract["SlabManager"]);
      
      if (!slabManager) {
        console.warn("SlabManager contract not available for achievement progress, using fallback");
        return {
          nextSlab: {
            targetUSD: 0,
            totalNeeded: 0,
            L1Needed: 0,
            L2Needed: 0,
            LrestNeeded: 0,
            isAchieved: false
          },
          nextReward: {
            targetUSD: 0,
            totalNeeded: 0,
            L1Needed: 0,
            L2Needed: 0,
            LrestNeeded: 0,
            isAchieved: false
          },
          nextRoyalty: {
            targetUSD: 0,
            totalNeeded: 0,
            L1Needed: 0,
            L2Needed: 0,
            LrestNeeded: 0,
            isAchieved: false
          }
        };
      }

      console.log("🔗 Fetching achievement progress for:", userAddress);

      // Get progress for different achievement types with individual error handling
      const results = await Promise.allSettled([
        slabManager.methods.getRemainingForNext(userAddress, 0).call(), // 0 = SLAB
        slabManager.methods.getRemainingForNext(userAddress, 1).call(), // 1 = REWARD  
        slabManager.methods.getRemainingForNext(userAddress, 2).call()  // 2 = ROYALTY
      ]);

      const processProgress = (result, type) => {
        if (result.status === 'rejected') {
          console.warn(`❌ SlabManager.getRemainingForNext(${type}) failed:`, result.reason);
          return {
            targetUSD: 0,
            totalNeeded: 0,
            L1Needed: 0,
            L2Needed: 0,
            LrestNeeded: 0,
            isAchieved: false
          };
        }

        try {
          const progress = result.value;
          const safeFromMicroUSD = (value) => {
            try {
              return fromMicroUSD(value || 0);
            } catch {
              return 0;
            }
          };

          return {
            targetUSD: safeFromMicroUSD(progress.targetUSD),
            totalNeeded: safeFromMicroUSD(progress.totalNeeded),
            L1Needed: safeFromMicroUSD(progress.L1_needed),
            L2Needed: safeFromMicroUSD(progress.L2_needed),
            LrestNeeded: safeFromMicroUSD(progress.Lrest_needed),
            isAchieved: Boolean(progress.isAchieved)
          };
        } catch (error) {
          console.warn(`Error processing ${type} achievement progress:`, error);
          return {
            targetUSD: 0,
            totalNeeded: 0,
            L1Needed: 0,
            L2Needed: 0,
            LrestNeeded: 0,
            isAchieved: false
          };
        }
      };

      const progressResult = {
        nextSlab: processProgress(results[0], 'SLAB'),
        nextReward: processProgress(results[1], 'REWARD'),
        nextRoyalty: processProgress(results[2], 'ROYALTY')
      };

      console.log("✅ getNextAchievementProgress result:", progressResult);
      return progressResult;

    } catch (error) {
      console.error("❌ getNextAchievementProgress error:", error);
      
      // Return safe fallback data
      return {
        nextSlab: {
          targetUSD: 0,
          totalNeeded: 0,
          L1Needed: 0,
          L2Needed: 0,
          LrestNeeded: 0,
          isAchieved: false
        },
        nextReward: {
          targetUSD: 0,
          totalNeeded: 0,
          L1Needed: 0,
          L2Needed: 0,
          LrestNeeded: 0,
          isAchieved: false
        },
        nextRoyalty: {
          targetUSD: 0,
          totalNeeded: 0,
          L1Needed: 0,
          L2Needed: 0,
          LrestNeeded: 0,
          isAchieved: false
        },
        error: error.message
      };
    }
  },

  // Fetch slab achievements (levels reached with timestamps and leg volumes)
  getSlabAchievementsWithTimes: async (userAddress) => {
    try {
      if (!hasAddress(userAddress)) throw new Error('Invalid user address');

      const slabManager = makeContract(SlabManagerABI, Contract["SlabManager"]);


      let ramaPerUsdWei = null;
      if (portfolioManager) {
        try {
          const ratioStr = await portfolioManager.methods
            .getPackageValueInRAMA("1000000")
            .call();
          ramaPerUsdWei = BigInt(ratioStr);
        } catch (err) {
          console.warn("getPackageValueInRAMA failed:", err);
        }
      }

      const USD_MICRO_BI = BigInt(USD_MICRO);
      const convertUsdMicroToRamaWei = (value) => {
        if (!ramaPerUsdWei) return "0";
        try {
          const usdMicroBig = BigInt(value ?? "0");
          const wei = (usdMicroBig * ramaPerUsdWei) / USD_MICRO_BI;
          return wei.toString();
        } catch {
          return "0";
        }
      };

      const slabIncomeUsd = fromMicroUSD(slabIncomeRaw);
      const slabIncomeAvailableUsd = fromMicroUSD(slabIncomeAvailableRaw);
      const slabIncomeRama = fromWeiToRama(
        convertUsdMicroToRamaWei(slabIncomeRaw)
      );
      const slabIncomeAvailableRama = fromWeiToRama(
        convertUsdMicroToRamaWei(slabIncomeAvailableRaw)
      );

      const overrideIncomeUsd = fromMicroUSD(sameSlabOverrideRaw);
      const overrideIncomeRama = fromWeiToRama(
        convertUsdMicroToRamaWei(sameSlabOverrideRaw)
      );

      // const overrideWavesUsd = [
      //   fromMicroUSD(sameSlabEarningsRaw?.[0]),
      //   fromMicroUSD(sameSlabEarningsRaw?.[1]),
      //   fromMicroUSD(sameSlabEarningsRaw?.[2]),
      // ];
      // const overrideWavesRama = [
      //   fromWeiToRama(
      //     convertUsdMicroToRamaWei(sameSlabEarningsRaw?.[0])
      //   ),
      //   fromWeiToRama(
      //     convertUsdMicroToRamaWei(sameSlabEarningsRaw?.[1])
      //   ),
      //   fromWeiToRama(
      //     convertUsdMicroToRamaWei(sameSlabEarningsRaw?.[2])
      //   ),
      // ];

      const slabLevelFromSummary = summary
        ? toNumber(summary?.slabLevel)
        : null;
      const slabLevel = Number.isFinite(slabLevelFromSummary)
        ? slabLevelFromSummary
        : toNumber(slabIndexRaw);

      const qualifiedVolumeUsd = summary
        ? fromMicroUSD(summary?.qualifiedVolumeUsdMicro)
        : fromMicroUSD(qualifiedBusinessUsdRaw);

      const directs = summary
        ? toNumber(summary?.directRefs)
        : toNumber(userStatusRaw?.directs);

      const canClaim =
        typeof slabClaimStatusRaw?.canClaim === "boolean"
          ? slabClaimStatusRaw.canClaim
          : Boolean(slabClaimStatusRaw?.[0]);
      const lastClaimEpoch = toNumber(
        slabClaimStatusRaw?.lastClaimAtEpoch ?? slabClaimStatusRaw?.[1]
      );
      const currentEpoch = toNumber(
        slabClaimStatusRaw?.currentEpoch ?? slabClaimStatusRaw?.[2]
      );

      const partners =
        sameSlabPartnersRaw && sameSlabPartnersRaw.firstWave !== undefined
          ? sameSlabPartnersRaw
          : {
            firstWave: sameSlabPartnersRaw?.[0] ?? [],
            secondWave: sameSlabPartnersRaw?.[1] ?? [],
            thirdWave: sameSlabPartnersRaw?.[2] ?? [],
          };

      return {
        slabLevel,
        qualifiedVolumeUsd,
        slabAchiev,
        directs,
        canClaim,
        currentEpoch,
        lastClaimEpoch,
        slabIncomeUsd,
        slabIncomeAvailableUsd,
        slabIncomeRama,
        slabIncomeAvailableRama,
        overrideIncomeUsd,
        overrideIncomeRama,

        sameSlabPartners: {
          firstWave: partners.firstWave ?? [],
          secondWave: partners.secondWave ?? [],
          thirdWave: partners.thirdWave ?? [],
        },
        summary,
      };
    } catch (error) {
      console.error("getSlabIncomeOverview error:", error);
      throw error;
    }
  },

  // Fetch slab achievements (levels reached with timestamps and leg volumes)
  getSlabAchievementsWithTimes: async (userAddress) => {
    try {
      if (!hasAddress(userAddress)) throw new Error('Invalid user address');
      const slabManager = makeContract(SlabManagerABI, Contract["SlabManager"]);
      if (!slabManager) throw new Error('SlabManager contract unavailable');

      const [idxs, times, L1s, L2s, Lrests] = await slabManager.methods
        .getAchievedSlabsWithTimes(userAddress)
        .call();

      const items = (idxs || []).map((id, i) => ({
        slabIdx: toNumber(id),
        achievedAt: toNumber(times?.[i] ?? 0),
        qualified: {
          l1Usd: fromMicroUSD(L1s?.[i] ?? 0),
          l2Usd: fromMicroUSD(L2s?.[i] ?? 0),
          lrestUsd: fromMicroUSD(Lrests?.[i] ?? 0),
        },
      }));

      // Sort newest first by timestamp
      items.sort((a, b) => (b.achievedAt || 0) - (a.achievedAt || 0));
      return items;
    } catch (error) {
      console.error('getSlabAchievementsWithTimes error:', error);
      return [];
    }
  },

  // Fetch recent slab claim events from SlabManager
  // options: { fromBlock?: number|string, toBlock?: number|string, max?: number }
  getSlabClaimEvents: async (userAddress, options = {}) => {
    try {
      if (!hasAddress(userAddress)) throw new Error('Invalid user address');
      const slabManager = makeContract(SlabManagerABI, Contract["SlabManager"]);
      if (!slabManager) throw new Error('SlabManager contract unavailable');

      const { fromBlock, toBlock, max = 100 } = options;
      const query = {
        filter: { user: userAddress },
        fromBlock: fromBlock ?? 0,
        toBlock: toBlock ?? 'latest',
      };

      const logs = await slabManager.getPastEvents('Claimed', query);
      // newest first
      logs.sort((a, b) => (b.blockNumber || 0) - (a.blockNumber || 0));
      const slice = logs.slice(0, Math.max(1, Math.min(max, logs.length)));

      // Optional conversions
      let ramaPerUsdWei = null;
      try {
        const pm = makeContract(PortFolioManagerABI, Contract['PortFolioManager']);
        if (pm) {
          const ratioStr = await pm.methods.getPackageValueInRAMA("1000000").call();
          ramaPerUsdWei = BigInt(ratioStr);
        }
      } catch (err) {
        console.warn('getSlabClaimEvents: RAMA/USD ratio failed:', err?.message || err);
      }
      const USD_MICRO_BI = BigInt(USD_MICRO);
      const usdMicroToRama = (usdMicro) => {
        try {
          if (!ramaPerUsdWei) return 0;
          const wei = (BigInt(usdMicro) * ramaPerUsdWei) / USD_MICRO_BI;
          return fromWeiToRama(wei);
        } catch { return 0; }
      };

      const items = slice.map((ev) => {
        const { amount, slabIdx, epoch } = ev.returnValues || {};
        const usd = fromMicroUSD(amount ?? 0);
        const rama = usdMicroToRama(amount ?? 0);
        return {
          txHash: ev.transactionHash,
          blockNumber: ev.blockNumber,
          epoch: toNumber(epoch),
          slabIdx: toNumber(slabIdx),
          amountUsd: usd,
          amountRama: rama,
        };
      });

      return items;
    } catch (error) {
      console.error('getSlabClaimEvents error:', error);
      return [];
    }
  },

  // Same Slab Override: history using CappingIncomeManager ExternalIncomeNoted(kind)
  // options: { fromBlock?, toBlock?, max? }
  getSameSlabOverrideHistory: async (userAddress, options = {}) => {
    try {
      if (!hasAddress(userAddress)) throw new Error('Invalid user address');
      const cap = makeContract(CappingIncomeManagerABI, Contract['CappingIncomeManager']);
      if (!cap) throw new Error('CappingIncomeManager contract unavailable');

      const { fromBlock, toBlock, max = 50 } = options;
      const query = {
        filter: { user: userAddress },
        fromBlock: fromBlock ?? 0,
        toBlock: toBlock ?? 'latest',
      };

      const logs = await cap.getPastEvents('ExternalIncomeNoted', query);
      // Filter by kind == slabOverride via bytes32 decoding
      const filtered = logs.filter((ev) => {
        const kindRaw = ev.returnValues?.kind;
        const norm = normalizeMissedKind(kindRaw);
        return norm === 'slabOverride';
      });
      // newest first
      filtered.sort((a, b) => (b.blockNumber || 0) - (a.blockNumber || 0));
      const slice = filtered.slice(0, Math.max(1, Math.min(max, filtered.length)));

      // Fetch block timestamps for display (batch by unique block numbers)
      const byBlock = new Map();
      await Promise.all(
        Array.from(new Set(slice.map((e) => e.blockNumber))).map(async (bn) => {
          try {
            const blk = await web3.eth.getBlock(bn);
            byBlock.set(bn, blk?.timestamp ? Number(blk.timestamp) : null);
          } catch {
            byBlock.set(bn, null);
          }
        })
      );

      const items = slice.map((ev) => {
        const amount = ev.returnValues?.amountUSD6 ?? 0;
        const kindRaw = ev.returnValues?.kind;
        const timestamp = byBlock.get(ev.blockNumber) ?? null;
        return {
          txHash: ev.transactionHash,
          blockNumber: ev.blockNumber,
          amountUsd: fromMicroUSD(amount),
          kind: bytes32ToString(kindRaw),
          normalizedKind: normalizeMissedKind(kindRaw),
          timestamp,
        };
      });

      return items;
    } catch (error) {
      console.error('getSameSlabOverrideHistory error:', error);
      return [];
    }
  },

  // Get leg cap percentages from SlabManager (getLegsTop2AndRest)
  getLegCapPercentages: async (userAddress) => {
    try {
      if (!userAddress) return { leg1: 40, leg2: 30, leg3: 30 };

      const slabManager = makeContract(SlabManagerABI, Contract["SlabManager"]);
      if (!slabManager) return { leg1: 40, leg2: 30, leg3: 30 };

      // getLegsTop2AndRest returns (L1, L2, Lrest) volumes with caps applied
      const legsData = await slabManager.methods.getLegsTop2AndRest(userAddress).call();
      
      const l1 = toNumber(legsData.L1 || legsData[0] || 0);
      const l2 = toNumber(legsData.L2 || legsData[1] || 0);
      const lrest = toNumber(legsData.Lrest || legsData[2] || 0);
      
      const total = l1 + l2 + lrest;
      
      // Calculate percentages from actual volumes
      if (total === 0) {
        return { leg1: 40, leg2: 30, leg3: 30 }; // Default fallback
      }
      
      const leg1Percent = Math.round((l1 / total) * 100);
      const leg2Percent = Math.round((l2 / total) * 100);
      const leg3Percent = Math.round((lrest / total) * 100);
      
      return {
        leg1: leg1Percent,
        leg2: leg2Percent,
        leg3: leg3Percent,
        volumes: {
          leg1: fromMicroUSD(l1),
          leg2: fromMicroUSD(l2),
          leg3: fromMicroUSD(lrest),
          total: fromMicroUSD(total),
        }
      };
    } catch (error) {
      console.error("getLegCapPercentages error:", error);
      return { leg1: 40, leg2: 30, leg3: 30 }; // Fallback to default
    }
  },

  getSlabLevel: async (userAddress) => {
    try {
      if (!userAddress) throw new Error("Missing user address");

      const oceanQuery = new web3.eth.Contract(
        OceanQueryUpgradeableABI,
        Contract["OceanQueryUpgradeable"]
      );

      const slabLevel = await oceanQuery.methods.getCurrentSlabLevel(userAddress).call();
      const OverrideEarnings = await oceanQuery.methods.getSameSlabOverrideEarnings(userAddress).call();
      const getSameSlabPartner = await oceanQuery.methods.getSameSlabPartners(userAddress).call();

      return {
        slabLevel,
        OverrideEarnings,
        getSameSlabPartner
      }

    } catch (err) {
      console.log(err)
    }
  },
  getSafeWalletSummary: async (userAddress) => {
    try {
      if (!hasAddress(userAddress)) {
        throw new Error('Invalid user address');
      }

      const safeWalletContract = makeContract(
        SafeWalletABI,
        Contract["SafeWallet"]
      );
      if (!safeWalletContract) {
        throw new Error('SafeWallet contract unavailable');
      }

      const pick = (record, key, index) => {
        if (!record) return "0";
        if (record[key] != null) return record[key];
        if (record[index] != null) return record[index];
        return "0";
      };

      const totalsRaw = await safeWalletContract.methods
        .getTotals(userAddress)
        .call();

      const ramaWei = pick(totalsRaw, "_ramaBalance", 0);
      const roiUsdWad = pick(totalsRaw, "_roiUsdPaid", 1);
      const creditsUsdWad = pick(totalsRaw, "_totalCreditsUSD", 2);
      const creditsRamaWei = pick(totalsRaw, "_totalCreditsRAMA", 3);
      const debitsUsdWad = pick(totalsRaw, "_totalDebitsUSD", 4);
      const debitsRamaWei = pick(totalsRaw, "_totalDebitsRAMA", 5);

      let usdEstimate = null;
      const portfolioManager = makeContract(
        PortFolioManagerABI,
        Contract["PortFolioManager"]
      );
      if (portfolioManager) {
        try {
          const usdMicro = await portfolioManager.methods
            .getPackageValueInUSD(ramaWei)
            .call();
          usdEstimate = fromMicroUSD(usdMicro);
        } catch (err) {
          console.warn("SafeWalletSummary USD conversion failed:", err);
        }
      }

      const ramaBalance = fromWeiToRama(ramaWei);
      const totals = {
        roiUsd: fromWadToUsd(roiUsdWad),
        creditsUsd: fromWadToUsd(creditsUsdWad),
        creditsRama: fromWeiToRama(creditsRamaWei),
        debitsUsd: fromWadToUsd(debitsUsdWad),
        debitsRama: fromWeiToRama(debitsRamaWei),
      };

      return {
        balance: {
          wei: ramaWei,
          rama: ramaBalance,
          usd: usdEstimate,
        },
        totals: {
          ...totals,
          netUsd: totals.creditsUsd - totals.debitsUsd,
          netRama: totals.creditsRama - totals.debitsRama,
        },
        raw: {
          ramaWei,
          roiUsdWad,
          creditsUsdWad,
          creditsRamaWei,
          debitsUsdWad,
          debitsRamaWei,
        },
        fetchedAt: Date.now(),
      };
    } catch (error) {
      console.error('getSafeWalletSummary error:', error);
      throw error;
    }
  },

  getTeamNetworkData: async (userAddress, options = {}) => {
    try {
      if (!hasAddress(userAddress)) {
        throw new Error('Invalid user address');
      }

      const userRegistry = makeContract(
        UserRegistryABI,
        Contract["UserRegistry"]
      );
      if (!userRegistry) {
        throw new Error('UserRegistry contract unavailable');
      }

      const incomeDistributor = makeContract(
        IncomeDistributorABI,
        Contract["IncomeDistributor"]
      );
      const oceanQuery = makeContract(
        OceanQueryUpgradeableABI,
        Contract["OceanQueryUpgradeable"]
      );

      const maxDepthInput = Number.isFinite(Number(options.maxDepth))
        ? Number(options.maxDepth)
        : 5;
      const maxDepth = Math.min(Math.max(maxDepthInput, 1), 10);
      const detailLimit = Number.isFinite(Number(options.detailLimit))
        ? Math.max(1, Number(options.detailLimit))
        : 50;

      const [directAddressesRaw, levelCountsRaw] = await Promise.all([
        userRegistry.methods.getDirectTeam(userAddress).call(),
        userRegistry.methods.getLevelTeamCounts(userAddress, maxDepth).call(),
      ]);

      const directAddresses = Array.isArray(directAddressesRaw)
        ? directAddressesRaw.filter(hasAddress)
        : [];
      const directCount = directAddresses.length;

      const levelCounts = Array.isArray(levelCountsRaw)
        ? levelCountsRaw.map(toNumber)
        : [];
      const totalTeamSize = levelCounts.reduce((sum, val) => sum + toNumber(val), 0);

      const levelPromises = [];
      for (let level = 1; level <= maxDepth; level += 1) {
        levelPromises.push(
          userRegistry.methods
            .getLevelTeam(userAddress, level)
            .call()
            .then((addresses) => ({
              level,
              addresses: Array.isArray(addresses)
                ? addresses.filter(hasAddress)
                : [],
            }))
            .catch((err) => {
              console.warn(`UserRegistry.getLevelTeam failed for L${level}:`, err);
              return { level, addresses: [] };
            })
        );
      }
      const levelResults = await Promise.all(levelPromises);
      const levels = {};
      levelResults.forEach(({ level, addresses }) => {
        levels[`L${level}`] = addresses;
      });

      let teamVolumeSummary = null;
      if (oceanQuery) {
        try {
          const raw = await oceanQuery.methods.getTeamVolume(userAddress).call();
          const pick = (record, key, index) => {
            if (!record) return "0";
            if (record[key] != null) return record[key];
            if (record[index] != null) return record[index];
            return "0";
          };
          teamVolumeSummary = {
            qualifiedUsd: formatTeamVolume(fromWadToUsd(pick(raw, "qualifiedUSD", 0))),
            leg1Usd: formatTeamVolume(fromWadToUsd(pick(raw, "L1", 1))),
            leg2Usd: formatTeamVolume(fromWadToUsd(pick(raw, "L2", 2))),
            legRestUsd: formatTeamVolume(fromWadToUsd(pick(raw, "Lrest", 3))),
          };
        } catch (err) {
          console.warn("OceanQuery.getTeamVolume failed:", err);
        }
      }

      const detailAddressSet = new Set();
      for (const addr of directAddresses) {
        detailAddressSet.add(addr);
        if (detailAddressSet.size >= detailLimit) break;
      }
      for (const { addresses } of levelResults) {
        for (const addr of addresses) {
          if (detailAddressSet.size >= detailLimit) break;
          if (!detailAddressSet.has(addr)) {
            detailAddressSet.add(addr);
          }
        }
        if (detailAddressSet.size >= detailLimit) break;
      }

      const detailAddresses = Array.from(detailAddressSet);
      const detailPromises = detailAddresses.map(async (addr) => {
        const safeCall = (promise, label) =>
          promise.catch((err) => {
            console.warn(`${label} failed for ${addr}:`, err);
            return null;
          });

        const userPromise = safeCall(
          userRegistry.methods.getUser(addr).call(),
          "UserRegistry.getUser"
        );

        const incomePromise =
          incomeDistributor
            ? safeCall(
                incomeDistributor.methods
                  .getDirectIncomeSummary(addr)
                  .call(),
                "IncomeDistributor.getDirectIncomeSummary"
              )
            : Promise.resolve(null);

        const teamVolumePromise =
          oceanQuery
            ? safeCall(
                oceanQuery.methods.getTeamVolume(addr).call(),
                "OceanQuery.getTeamVolume"
              )
            : Promise.resolve(null);

        const stakePromise =
          oceanQuery
            ? safeCall(
                oceanQuery.methods.getTotalStakedAmount(addr).call(),
                "OceanQuery.getTotalStakedAmount"
              )
            : Promise.resolve(null);

        const [info, incomeRaw, teamVolumeRaw, stakeRaw] = await Promise.all([
          userPromise,
          incomePromise,
          teamVolumePromise,
          stakePromise,
        ]);

        const pickField = (record, key, index) => {
          if (!record) return null;
          if (record[key] != null) return record[key];
          if (Array.isArray(record) && record[index] != null) return record[index];
          return null;
        };

        const directsCount = toNumber(pickField(info, "directsCount", 3));
        const createdAt = toNumber(pickField(info, "createdAt", 4));

        const lifetimeUsd = incomeRaw
          ? fromWadToUsd(pickField(incomeRaw, "lifetimeUsd", 1) ?? 0)
          : null;
        const lifetimeRama = incomeRaw
          ? fromWeiToRama(pickField(incomeRaw, "lifetimeRama", 2) ?? 0)
          : null;
        const claimableRama = incomeRaw
          ? fromWeiToRama(pickField(incomeRaw, "claimableRama", 3) ?? 0)
          : null;

       const teamVolume = teamVolumeRaw
         ? {
              qualifiedUsd: formatTeamVolume(
                fromWadToUsd(pickField(teamVolumeRaw, "qualifiedUSD", 0))
              ),
              leg1Usd: formatTeamVolume(
                fromWadToUsd(pickField(teamVolumeRaw, "L1", 1))
              ),
              leg2Usd: formatTeamVolume(
                fromWadToUsd(pickField(teamVolumeRaw, "L2", 2))
              ),
              legRestUsd: formatTeamVolume(
                fromWadToUsd(pickField(teamVolumeRaw, "Lrest", 3))
              ),
            }
          : null;

        let stakeUsd = null;
        let stakeRama = null;
        if (stakeRaw) {
          const totalUsdMicro = pickField(stakeRaw, "totalUsdMicro", 1);
          const totalRamaWei = pickField(stakeRaw, "totalRamaWei", 0);
          stakeUsd =
            totalUsdMicro != null
              ? fromMicroUSD(totalUsdMicro)
              : stakeRaw?.[1]
              ? fromMicroUSD(stakeRaw[1])
              : null;
          stakeRama =
            totalRamaWei != null
              ? fromWeiToRama(totalRamaWei)
              : stakeRaw?.[0]
              ? fromWeiToRama(stakeRaw[0])
              : null;
        }

        return {
          address: addr,
          directs: directsCount,
          joinedAt: createdAt ? new Date(createdAt * 1000) : null,
          registered: Boolean(pickField(info, "registered", 0)),
          id: toNumber(pickField(info, "id", 1)),
          sponsor: pickField(info, "referrer", 2),
          summary: {
            lifetimeUsd,
            lifetimeRama,
            claimableRama,
          },
          stake: {
            usd: stakeUsd,
            rama: stakeRama,
          },
          teamVolume,
        };
      });
      const detailResultsRaw = await Promise.all(detailPromises);
      const detailResults = detailResultsRaw.filter(Boolean);

      const detailMap = new Map();
      detailResults.forEach((detail) => {
        const key = (detail?.address ?? '').toLowerCase();
        if (key) detailMap.set(key, detail);
      });

      const directMembers = directAddresses.map((addr) => {
        const detail = detailMap.get(addr.toLowerCase());
        if (detail) return detail;
        return {
          address: addr,
          directs: 0,
          joinedAt: null,
          registered: false,
          id: null,
          sponsor: null,
          summary: {
            lifetimeUsd: 0,
            lifetimeRama: 0,
            claimableRama: 0,
          },
          stake: {
            usd: 0,
            rama: 0,
          },
          teamVolume: null,
        };
      });

      let directIncomeSummary = null;
      if (incomeDistributor) {
        try {
          const summaryRaw = await incomeDistributor.methods
            .getDirectIncomeSummary(userAddress)
            .call();
          const pick = (record, key, index) => {
            if (!record) return "0";
            if (record[key] != null) return record[key];
            if (record[index] != null) return record[index];
            return "0";
          };
          const entries = toNumber(pick(summaryRaw, "entries", 0));
          const lifetimeUsdWad = pick(summaryRaw, "lifetimeUsd", 1);
          const lifetimeRamaWei = pick(summaryRaw, "lifetimeRama", 2);
          const claimableRamaWei = pick(summaryRaw, "claimableRama", 3);
          directIncomeSummary = {
            entries,
            lifetimeUsd: fromWadToUsd(lifetimeUsdWad),
            lifetimeRama: fromWeiToRama(lifetimeRamaWei),
            claimableRama: fromWeiToRama(claimableRamaWei),
          };
        } catch (err) {
          console.warn("IncomeDistributor.getDirectIncomeSummary failed:", err);
        }
      }

      const directTeamVolumeSum = directMembers.reduce(
        (sum, member) => sum + (member.teamVolume?.qualifiedUsd ?? 0),
        0
      );
      const aggregatedTeamVolumeUsd =
        teamVolumeSummary?.qualifiedUsd ??
        (directTeamVolumeSum > 0 ? directTeamVolumeSum : null);

      return {
        directCount,
        totalTeamSize,
        levels,
        levelCounts,
        directMembers,
        allMemberDetails: detailResults,
        detailLimit,
        detailFetched: directMembers.length,
        directAddresses,
        directIncomeSummary,
        teamVolumeSummary,
        teamVolumeUsd: aggregatedTeamVolumeUsd,
        fetchedAt: Date.now(),
      };
    } catch (error) {
      console.error('getTeamNetworkData error:', error);
      throw error;
    }
  },

  getTransactionHistory: async (userAddress, options = {}) => {
    try {
      if (!hasAddress(userAddress)) {
        throw new Error('Invalid user address');
      }

      const safeWallet = makeContract(
        SafeWalletABI,
        Contract["SafeWallet"]
      );
      if (!safeWallet) {
        throw new Error('SafeWallet contract unavailable');
      }

      const offset = Number.isFinite(Number(options.offset))
        ? Math.max(0, Number(options.offset))
        : 0;
      const limit = Number.isFinite(Number(options.limit))
        ? Math.max(1, Number(options.limit))
        : 100;

      const pickField = (record, key, index) => {
        if (!record) return null;
        if (record[key] != null) return record[key];
        if (Array.isArray(record) && record[index] != null) return record[index];
        return null;
      };

      const [
        countRaw,
        ledgerSlice,
        totalsRoi,
        totalsGrowth,
        totalsRoyalty,
        totalsSlab,
        totalsReward,
        totalsDirect,
        totalsWithdraw,
        totalsPortfolioCreate,
      ] = await Promise.all([
        safeWallet.methods.getLedgerCount(userAddress).call(),
        safeWallet.methods
          .getLedgerSlice(userAddress, offset, limit)
          .call(),
        safeWallet.methods
          .getTotalsByKind(userAddress, 0, true)
          .call()
          .catch(() => null),
        safeWallet.methods
          .getTotalsByKind(userAddress, 1, true)
          .call()
          .catch(() => null),
        safeWallet.methods
          .getTotalsByKind(userAddress, 2, true)
          .call()
          .catch(() => null),
        safeWallet.methods
          .getTotalsByKind(userAddress, 3, true)
          .call()
          .catch(() => null),
        safeWallet.methods
          .getTotalsByKind(userAddress, 4, true)
          .call()
          .catch(() => null),
        safeWallet.methods
          .getTotalsByKind(userAddress, 5, true)
          .call()
          .catch(() => null),
        safeWallet.methods
          .getTotalsByKind(userAddress, 10, false)
          .call()
          .catch(() => null),
        safeWallet.methods
          .getTotalsByKind(userAddress, 8, false)
          .call()
          .catch(() => null),
      ]);

      const decodeMemo = (memo) => {
        if (!memo || memo === '0x' || /^0x0{64}$/i.test(memo)) return null;
        try {
          return web3.utils.hexToUtf8(memo);
        } catch {
          return memo;
        }
      };

      const entries =
        (ledgerSlice ?? []).map((item, idx) => {
          const kind = toNumber(pickField(item, 'kind', 0));
          const isCredit = Boolean(pickField(item, 'isCredit', 1));
          const usdAmountRaw = pickField(item, 'usdAmount', 2) ?? '0';
          const ramaAmountWei = pickField(item, 'ramaAmount', 3) ?? '0';
          const timestamp = toNumber(pickField(item, 'timestamp', 5));
          const memoRaw = pickField(item, 'memo', 8) ?? null;
          const usdAmountMicro = toBigIntSafe(usdAmountRaw);

          return {
            id: `${offset + idx}-${timestamp}-${kind}-${isCredit ? 1 : 0}`,
            kind,
            isCredit,
            usd: fromMicroUSD(usdAmountMicro),
            usdRaw: usdAmountMicro.toString(),
            rama: fromWeiToRama(ramaAmountWei),
            ramaRaw: ramaAmountWei,
            dayId: toNumber(pickField(item, 'dayId', 4)),
            timestamp,
            related: pickField(item, 'related', 6),
            pid: toNumber(pickField(item, 'pid', 7)),
            memo: memoRaw,
            memoReadable: decodeMemo(memoRaw),
          };
        }) ?? [];

      const convertTotals = (raw) => {
        if (!raw) {
          return { usd: 0, rama: 0, count: 0 };
        }
        const usdSumRaw = pickField(raw, 'usdSum', 0);
        return {
          usd: fromMicroUSD(toBigIntSafe(usdSumRaw)),
          rama: fromWeiToRama(pickField(raw, 'ramaSum', 1)),
          count: toNumber(pickField(raw, 'count', 2)),
        };
      };

      const totalsByKind = {
        roi: convertTotals(totalsRoi),
        growth: convertTotals(totalsGrowth),
        royalty: convertTotals(totalsRoyalty),
        slab: convertTotals(totalsSlab),
        reward: convertTotals(totalsReward),
        direct: convertTotals(totalsDirect),
        withdraw: convertTotals(totalsWithdraw),
        portfolioCreate: convertTotals(totalsPortfolioCreate),
      };

      return {
        totalCount: toNumber(countRaw),
        offset,
        limit,
        entries,
        totalsByKind,
      };
    } catch (error) {
      console.error('getTransactionHistory error:', error);
      throw error;
    }
  },


  // =====================================================================
  // One-Time Rewards 
  // =====================================================================

  // Get user's total claimed rewards from RewardVault
  getUserRewardTotals: async (userAddress) => {
    try {
      if (!userAddress) throw new Error("Missing user address");
      const rewardVault = makeContract(RewardVaultABI, Contract["RewardVault"]);
      if (!rewardVault) throw new Error("RewardVault contract not available");

      const [totalsRaw, pendingTotalRaw] = await Promise.all([
        rewardVault.methods.getUserTotals(userAddress).call(),
        rewardVault.methods.getPendingRewardTotalUSD(userAddress).call().catch(() => "0"),
      ]);

      const claimedUsdMicro = toBigIntSafe(totalsRaw?.[0] ?? totalsRaw?.usdTotal ?? 0);
      const claimedRamaWei = toBigIntSafe(totalsRaw?.[1] ?? totalsRaw?.ramaTotal ?? 0);
      const pendingUsdMicro = toBigIntSafe(pendingTotalRaw ?? 0);

      return {
        claimedUsd: fromMicroUSD(claimedUsdMicro),
        claimedRama: fromWeiToRama(claimedRamaWei.toString()),
        claimedUsdMicro: claimedUsdMicro.toString(),
        claimedRamaWei: claimedRamaWei.toString(),
        pendingUsd: fromMicroUSD(pendingUsdMicro),
        pendingUsdMicro: pendingUsdMicro.toString(),
      };
    } catch (error) {
      console.error("getUserRewardTotals error:", error);
      throw error;
    }
  },

  // Claim pending one-time rewards via RewardVault.releasePending
  claimOneTimeReward: async (fromAddress) => {
    try {
      if (!fromAddress) throw new Error("No connected wallet address found");
      const rewardVault = makeContract(RewardVaultABI, Contract["RewardVault"]);
      if (!rewardVault) throw new Error("RewardVault contract not available");

      const data = rewardVault.methods.releasePending(fromAddress).encodeABI();
      const gasPrice = await web3.eth.getGasPrice();

      let gasLimit;
      try {
        gasLimit = await web3.eth.estimateGas({
          from: fromAddress,
          to: Contract["RewardVault"],
          data,
        });
      } catch (err) {
        console.error("Gas estimation failed for claimOneTimeReward:", err);
        throw new Error("Gas estimation failed. The transaction may fail.");
      }

      const toHex = web3.utils.toHex;
      const tx = {
        from: fromAddress,
        to: Contract["RewardVault"],
        data,
        gas: toHex(gasLimit),
        gasPrice: toHex(gasPrice),
      };

      return tx;
    } catch (error) {
      console.error("Error building claimOneTimeReward transaction:", error);
      throw error;
    }
  },

  // Get user's claimed reward history from RewardVault
  getRewardClaimHistory: async (userAddress, offset = 0, limit = 20) => {
    try {
      if (!userAddress) throw new Error("Missing user address");
      const rewardVault = makeContract(RewardVaultABI, Contract["RewardVault"]);
      if (!rewardVault) throw new Error("RewardVault contract not available");

      const [claimsRaw, countRaw] = await Promise.all([
        rewardVault.methods.getUserClaimsSlice(userAddress, offset, limit).call(),
        rewardVault.methods.getUserClaimsCount(userAddress).call(),
      ]);

      const claims = (claimsRaw ?? []).map((claim, idx) => {
        const milestoneIdx = toNumber(claim?.milestoneIdx ?? claim?.[0] ?? 0);
        const usdRewardMicro = toBigIntSafe(claim?.usdReward ?? claim?.[1] ?? 0);
        const ramaAmountWei = toBigIntSafe(claim?.ramaAmount ?? claim?.[2] ?? 0);
        const qualifiedUsdAtMicro = toBigIntSafe(claim?.qualifiedUsdAt ?? claim?.[3] ?? 0);
        const timestamp = toNumber(claim?.timestamp ?? claim?.[4] ?? 0);

        return {
          id: `${milestoneIdx}-${timestamp}-${idx}`,
          milestoneIdx,
          milestoneName: `Milestone ${milestoneIdx + 1}`,
          usdReward: fromMicroUSD(usdRewardMicro),
          ramaAmount: fromWeiToRama(ramaAmountWei.toString()),
          qualifiedUsdAt: fromMicroUSD(qualifiedUsdAtMicro),
          timestamp,
          claimedAt: timestamp,
        };
      });

      return {
        claims,
        totalCount: toNumber(countRaw),
        hasMore: claims.length === limit,
      };
    } catch (error) {
      console.error("getRewardClaimHistory error:", error);
      throw error;
    }
  },

  // Fetch global milestones (thresholds/rewards) without requiring a user address.
  // Uses RewardVault + SlabManager and normalizes to USD floats.
  getGlobalOneTimeMilestones: async () => {
    try {
      const rewardVault = makeContract(RewardVaultABI, Contract["RewardVault"]);
      const slabManager = makeContract(SlabManagerABI, Contract["SlabManager"]);

      const [allMilestonesRaw, rewardMilestonesRaw] = await Promise.all([
        rewardVault
          ? rewardVault.methods.getAllMilestones().call().catch(() => [[], []])
          : Promise.resolve([[], []]),
        slabManager
          ? slabManager.methods.getRewardMilestones().call().catch(() => [])
          : Promise.resolve([]),
      ]);

  const thresholdsRaw = Array.isArray(allMilestonesRaw?.[0]) ? allMilestonesRaw[0] : [];
  const rewardsRaw = Array.isArray(allMilestonesRaw?.[1]) ? allMilestonesRaw[1] : [];
      const rewardMilestonesArray = Array.isArray(rewardMilestonesRaw) ? rewardMilestonesRaw : [];

      const isNonZero = (v) => {
        if (v == null) return false;
        const n = Number(v);
        return Number.isFinite(n) && n !== 0;
      };
      const anyContractNonZero =
        (Array.isArray(thresholdsRaw) && thresholdsRaw.some(isNonZero)) ||
        (Array.isArray(rewardsRaw) && rewardsRaw.some(isNonZero)) ||
        (Array.isArray(rewardMilestonesArray) && rewardMilestonesArray.some(isNonZero));

      const fallbackMilestones = ONE_TIME_REWARDS_FALLBACK;
      const count = Math.max(
        thresholdsRaw.length,
        rewardsRaw.length,
        rewardMilestonesArray.length,
        fallbackMilestones.length
      );

      const milestones = [];
      let usedFallback = !anyContractNonZero;
      for (let idx = 0; idx < count; idx += 1) {
        const fallback = fallbackMilestones[idx] ?? null;
        let thresholdUsd = 0;
        if (thresholdsRaw[idx] != null && isNonZero(thresholdsRaw[idx])) {
          // RewardVault.getAllMilestones returns USD micro
          thresholdUsd = fromMicroUSD(thresholdsRaw[idx]);
        } else if (rewardMilestonesArray[idx] != null && isNonZero(rewardMilestonesArray[idx])) {
          // SlabManager.getRewardMilestones returns USD micro thresholds
          thresholdUsd = fromMicroUSD(rewardMilestonesArray[idx]);
        } else if (fallback) {
          thresholdUsd = Number(fallback.requiredVolumeUSD) / USD_MICRO;
          usedFallback = true;
        }

        let rewardUsd = 0;
        if (rewardsRaw[idx] != null && isNonZero(rewardsRaw[idx])) {
          // RewardVault.getAllMilestones returns USD micro
          rewardUsd = fromMicroUSD(rewardsRaw[idx]);
        } else if (fallback) {
          rewardUsd = Number(fallback.rewardUSD) / USD_MICRO;
          usedFallback = true;
        }

        milestones.push({
          idx,
          thresholdUsd,
          rewardUsd,
          claimed: false,
          unlocked: false,
          claimable: false,
          achieved: false,
          achievedAt: null,
          status: "locked",
          progressPct: 0,
        });
      }

      // Cache dynamic fallback locally for future offline use
      try {
        const cached = milestones.map((m) => ({
          requiredVolumeUSD: Math.round((m.thresholdUsd || 0) * USD_MICRO).toString(),
          rewardUSD: Math.round((m.rewardUsd || 0) * USD_MICRO).toString(),
        }));
        localStorage.setItem("ONE_TIME_REWARDS_DYNAMIC", JSON.stringify(cached));
      } catch { /* ignore */ }

      return { milestones, milestoneSource: usedFallback ? "fallback" : "contract" };
    } catch (error) {
      console.error("getGlobalOneTimeMilestones error:", error);
      // Final fallback to constants
      const milestones = (ONE_TIME_REWARDS_FALLBACK || []).map((r, idx) => ({
        idx,
        thresholdUsd: Number(r.requiredVolumeUSD) / USD_MICRO,
        rewardUsd: Number(r.rewardUSD) / USD_MICRO,
        claimed: false,
        unlocked: false,
        claimable: false,
        achieved: false,
        achievedAt: null,
        status: "locked",
        progressPct: 0,
      }));
      return { milestones, milestoneSource: "fallback" };
    }
  },

  getOneTimeRewardsOverview: async (userAddress) => {
    try {
      if (!userAddress) throw new Error("Missing user address");

      const oceanViewV2 = makeContract(
        OceanViewV2ABI,
        Contract["OceanViewV2"]
      );
      const oceanQuery = makeContract(
        OceanQueryUpgradeableABI,
        Contract["OceanQueryUpgradeable"]
      );
      const rewardVault = makeContract(
        RewardVaultABI,
        Contract["RewardVault"]
      );
      const portfolioManager = makeContract(
        PortFolioManagerABI,
        Contract["PortFolioManager"]
      );
      const slabManager = makeContract(
        SlabManagerABI,
        Contract["SlabManager"]
      );

      let summary = null;
      if (oceanViewV2) {
        try {
          const dashboardData = await oceanViewV2.methods
            .getDashboardData(userAddress)
            .call();
          summary = dashboardData?.[0] ?? null;
        } catch (err) {
          console.warn("OceanViewV2.getDashboardData (rewards) failed:", err);
        }
      }

      const [
        claimedCountRaw,
        pendingRewardRaw,
        userTotalsRaw,
        claimedStatusRaw,
        allMilestonesRaw,
        rewardMilestonesRaw,
        achievedWithTimesRaw,
        qualifiedBusinessRaw,
      ] = await Promise.all([
        oceanQuery
          ? oceanQuery.methods
              .getTotalRewardsClaimed(userAddress)
              .call()
              .catch(() => "0")
          : Promise.resolve("0"),
        oceanQuery
          ? oceanQuery.methods
              .getOneTimeRewardIncome(userAddress)
              .call()
              .catch(() => "0")
          : Promise.resolve("0"),
        rewardVault
          ? rewardVault.methods
              .getUserTotals(userAddress)
              .call()
              .catch(() => [0, 0])
          : Promise.resolve([0, 0]),
        rewardVault
          ? rewardVault.methods
              .getUserMilestoneStatus(userAddress)
              .call()
              .catch(() => [])
          : Promise.resolve([]),
        rewardVault
          ? rewardVault.methods
              .getAllMilestones()
              .call()
              .catch(() => [[], []])
          : Promise.resolve([[], []]),
        slabManager
          ? slabManager.methods
              .getRewardMilestones()
              .call()
              .catch(() => [])
          : Promise.resolve([]),
        slabManager
          ? slabManager.methods
              .getAchievedWithTimes(userAddress, 0)
              .call()
              .catch(() => [[], []])
          : Promise.resolve([[], []]),
        slabManager
          ? slabManager.methods
              .getQualifiedBusinessUSD(userAddress)
              .call()
              .catch(() => "0")
          : Promise.resolve("0"),
      ]);

  // Qualified business from SlabManager is reported in USD micro (per on-chain data), not WAD
  const qualifiedVolumeFromSlab = fromMicroUSD(qualifiedBusinessRaw ?? 0);
      let qualifiedVolumeUsd = Number.isFinite(qualifiedVolumeFromSlab)
        ? qualifiedVolumeFromSlab
        : 0;

      if ((!qualifiedVolumeUsd || qualifiedVolumeUsd <= 0) && summary) {
        qualifiedVolumeUsd = fromMicroUSD(
          summary?.qualifiedVolumeUsdMicro ?? 0
        );
      }

      const directs = summary ? toNumber(summary?.directRefs) : 0;

      const thresholdsRaw = Array.isArray(allMilestonesRaw?.[0])
        ? allMilestonesRaw[0]
        : [];
      const rewardsRaw = Array.isArray(allMilestonesRaw?.[1])
        ? allMilestonesRaw[1]
        : [];
      const rewardMilestonesArray = Array.isArray(rewardMilestonesRaw)
        ? rewardMilestonesRaw
        : [];

      const claimedFlags = Array.isArray(claimedStatusRaw)
        ? claimedStatusRaw.map((flag) => Boolean(flag))
        : [];

      const achievedIdxsRaw =
        achievedWithTimesRaw?.idxs ??
        achievedWithTimesRaw?.[0] ??
        [];
      const achievedTimesRaw =
        achievedWithTimesRaw?.times ??
        achievedWithTimesRaw?.[1] ??
        [];

      const achievedMap = new Map();
      if (Array.isArray(achievedIdxsRaw)) {
        achievedIdxsRaw.forEach((idx, position) => {
          const numericIdx = Number(idx);
          const tsRaw = achievedTimesRaw?.[position];
          const ts = Number(tsRaw);
          if (Number.isInteger(numericIdx) && numericIdx >= 0) {
            if (Number.isFinite(ts) && ts > 0) {
              achievedMap.set(numericIdx, ts);
            } else {
              achievedMap.set(numericIdx, null);
            }
          }
        });
      }

      const fallbackMilestones = ONE_TIME_REWARDS_FALLBACK;
      const isNonZero = (v) => {
        if (v == null) return false;
        const n = Number(v);
        return Number.isFinite(n) && n !== 0;
      };
      const anyContractNonZero =
        (Array.isArray(thresholdsRaw) && thresholdsRaw.some(isNonZero)) ||
        (Array.isArray(rewardsRaw) && rewardsRaw.some(isNonZero)) ||
        (Array.isArray(rewardMilestonesArray) && rewardMilestonesArray.some(isNonZero));
      const achievedKeys = achievedMap.size
        ? Array.from(achievedMap.keys())
        : [];
      const maxAchievedIdx = achievedKeys.length
        ? Math.max(...achievedKeys)
        : -1;
      const milestoneCount = Math.max(
        thresholdsRaw.length,
        rewardsRaw.length,
        claimedFlags.length,
        rewardMilestonesArray.length,
        maxAchievedIdx + 1,
        fallbackMilestones.length
      );

      const milestones = [];
      let usedFallback = !anyContractNonZero;
      for (let idx = 0; idx < milestoneCount; idx += 1) {
        const fallback = fallbackMilestones[idx] ?? null;

        let thresholdUsd = 0;
        if (thresholdsRaw[idx] != null && isNonZero(thresholdsRaw[idx])) {
          // RewardVault.getAllMilestones returns USD micro
          thresholdUsd = fromMicroUSD(thresholdsRaw[idx]);
        } else if (rewardMilestonesArray[idx] != null && isNonZero(rewardMilestonesArray[idx])) {
          // SlabManager.getRewardMilestones returns USD micro thresholds as well
          thresholdUsd = fromMicroUSD(rewardMilestonesArray[idx]);
        } else if (fallback) {
          thresholdUsd = Number(fallback.requiredVolumeUSD) / USD_MICRO;
          usedFallback = true;
        }

        let rewardUsd = 0;
        if (rewardsRaw[idx] != null && isNonZero(rewardsRaw[idx])) {
          // RewardVault.getAllMilestones returns USD micro
          rewardUsd = fromMicroUSD(rewardsRaw[idx]);
        } else if (fallback) {
          rewardUsd = Number(fallback.rewardUSD) / USD_MICRO;
          usedFallback = true;
        }

        const claimed = claimedFlags[idx] ?? false;
        const unlocked =
          thresholdUsd > 0 && Number.isFinite(qualifiedVolumeUsd)
            ? qualifiedVolumeUsd >= thresholdUsd
            : false;
        const achievedAtTs = achievedMap.has(idx)
          ? achievedMap.get(idx)
          : null;
        const achieved = achievedAtTs != null;
        const claimable = achieved && !claimed;

        let status = "locked";
        if (claimed) status = "claimed";
        else if (claimable) status = "claimable";
        else if (achieved) status = "achieved";
        else if (unlocked) status = "unlocked";

        const progressPct =
          thresholdUsd > 0
            ? Math.min(
                100,
                Math.max(
                  0,
                  (Number(qualifiedVolumeUsd) / Number(thresholdUsd)) * 100
                )
              )
            : 0;

        milestones.push({
          idx,
          thresholdUsd,
          rewardUsd,
          claimed,
          unlocked,
          claimable,
          achieved,
          achievedAt: achievedAtTs,
          status,
          progressPct,
        });
      }

      if (!milestones.length) {
        usedFallback = true;
        milestones.push(
          ...fallbackMilestones.map((reward, idx) => ({
            idx,
            thresholdUsd: Number(reward.requiredVolumeUSD) / USD_MICRO,
            rewardUsd: Number(reward.rewardUSD) / USD_MICRO,
            claimed: false,
            unlocked: false,
            claimable: false,
            achieved: false,
            achievedAt: null,
            status: "locked",
            progressPct: 0,
          }))
        );
      }

      const claimedMilestones = milestones.filter((m) => m.claimed).length;
      const achievedCount = milestones.filter((m) => m.achieved).length;
      const claimableMilestones = milestones.filter((m) => m.claimable);
      const remainingUsd = usedFallback
        ? 0
        : milestones
            .filter((m) => !m.achieved)
            .reduce((sum, m) => sum + (m.rewardUsd ?? 0), 0);

      const pendingRewardUsd = usedFallback
        ? 0
        : fromMicroUSD(pendingRewardRaw ?? 0);

      let pendingRewardRama = 0;
      if (
        !usedFallback &&
        portfolioManager &&
        pendingRewardRaw &&
        pendingRewardRaw !== "0"
      ) {
        try {
          const ramaWei = await portfolioManager.methods
            .getPackageValueInRAMA(pendingRewardRaw)
            .call();
          pendingRewardRama = fromWeiToRama(ramaWei);
        } catch (err) {
          console.warn("One-time reward USD->RAMA conversion failed:", err);
        }
      }

      const totalEarnedUsd = fromWadToUsd(userTotalsRaw?.[0] ?? 0);
      const totalEarnedRama = fromWeiToRama(userTotalsRaw?.[1] ?? 0);

      return {
        claimedCount: claimedMilestones || toNumber(claimedCountRaw),
        achievedCount,
        totalEarnedUsd,
        totalEarnedRama,
        pendingRewardUsd,
        pendingRewardRama,
        qualifiedVolumeUsd,
        directs,
        milestones,
        remainingUsd,
        claimableMilestones,
        milestoneSource: usedFallback ? "fallback" : "contract",
      };
    } catch (error) {
      console.error("getOneTimeRewardsOverview error:", error);
      throw error;
    }
  },

  oneTimeRewardClaimed: async (userAddress) => {
    try {
      if (!userAddress) throw new Error("Missing user address");

      const oceanQuery = new web3.eth.Contract(
        OceanQueryUpgradeableABI,
        Contract["OceanQueryUpgradeable"]
      );
      const slabManag = new web3.eth.Contract(
        SlabManagerABI,
        Contract["SlabManager"]
      );

      const rewardClaimed = await oceanQuery.methods.getTotalRewardsClaimed(userAddress).call();
      const slabIncome = await oceanQuery.methods.getSlabIncome(userAddress).call();
      const slabIncomeAvail = await oceanQuery.methods.getSlabIncomeAvailable(userAddress).call();


      const slapIndex = await slabManag.methods.getSlabIndex(userAddress).call();



      return {
        rewardClaimed,
        slabIncome,
        slabIncomeAvail,

        slapIndex,
        slabName: slabsName[slapIndex]
      }

    } catch (err) {
      console.log(err)
    }
  },


  // =====================================================================
  // Setting And Rules
  // =====================================================================

  regPortFoliAmt: async () => {
    try {

      const contract = new web3.eth.Contract(PortFolioManagerABI, Contract["PortFolioManager"]);

      const portFolioAmtUsd = 10
      const protFolioMicroUsd = portFolioAmtUsd * 1e6
      console.log(protFolioMicroUsd)
      const AmtInRamaWei = await contract.methods.getPackageValueInRAMA(protFolioMicroUsd).call();
      const ramaAmt = parseInt(AmtInRamaWei) / 1e18

      console.log(AmtInRamaWei)

      return {
        portFolioAmtUsd,
        ramaAmt
      };

    } catch (error) {
      console.log("regPortFoliAmt error:", error);
    }
  },

  CreateportFolio: async (userAddress, sponsorInput,amt=10) => {
    console.log('CreateportFolio args:', userAddress, sponsorInput);
    try {
      if (!userAddress || typeof userAddress !== 'string' || !userAddress.startsWith('0x')) {
        throw new Error('Invalid user address');
      }

      // Always use PROXY addresses here
      const regContract = new web3.eth.Contract(UserRegistryABI, Contract.UserRegistry);
      const pm = new web3.eth.Contract(PortFolioManagerABI, Contract.PortFolioManager);

      // --- Resolve sponsor (address or numeric ID)
      let sponsorAddress;
      if (typeof sponsorInput === 'string' && sponsorInput.startsWith('0x')) {
        sponsorAddress = sponsorInput;
      } else {
        const userId = typeof sponsorInput === 'number' ? sponsorInput : Number(sponsorInput);
        if (!Number.isFinite(userId) || userId <= 0) throw new Error('Invalid sponsor id');
        sponsorAddress = await regContract.methods.idToAddress(userId).call();
      }

      if (!sponsorAddress || !sponsorAddress.startsWith('0x')) {
        throw new Error('Resolved sponsor address is invalid');
      }
      if (/^0x0{40}$/i.test(sponsorAddress)) {
        throw new Error('Sponsor not found (zero address)');
      }

      // --- 1) Quote RAMA for $10 (micro-USD, 1e6)
      const usdMicro = amt * 1e6; // $10 -> 10,000,000 micro-USD
      const ramaWeiQuoteStr = await pm.methods
        .getPackageValueInRAMA(usdMicro.toString())
        .call();

      const valueToSend = BigInt(ramaWeiQuoteStr);
      if (valueToSend <= 0) throw new Error('Invalid RAMA quote (0)');



      console.log(sponsorAddress, valueToSend.toString(), valueToSend);

      // --- 2) Build tx: RegisterAndActivate(referrer) PAYABLE (handles registration + first stake)
      const data = pm.methods.RegisterAndActivate(sponsorAddress).encodeABI();

      // --- 3) Gas price & gas limit (estimate against PortfolioManager, include "value")
      const gasPrice = await web3.eth.getGasPrice();

      let gasLimit;
      try {
        gasLimit = await web3.eth.estimateGas({
          from: userAddress,
          to: Contract.PortFolioManager,
          data,
          value: valueToSend,
        });
      } catch (err) {
        console.error('Gas estimation failed:', err);
        toast.error(err?.message || 'Check contract & inputs.', 'Gas Estimation Failed');
        throw err;
      }

      const toHex = web3.utils.toHex;

      const tx = {
        from: userAddress,
        to: Contract.PortFolioManager,   // ✅ correct target (PM)
        data,
        value: valueToSend,       // ✅ must send RAMA wei
        gas: toHex(gasLimit),
        gasPrice: toHex(gasPrice),
        // chainId: <your chain id> // optional, wallet usually fills it
      };

      return tx; // your wallet (AppKit/WalletConnect) will sign & send this
    } catch (error) {
      console.error('CreateportFolio error:', error);
      toast.error(error?.message || 'Unknown error', 'Portfolio Creation Error');
      throw error;
    }
  },



  // =====================================================================
  // PortFolio Withdrawal
  // =====================================================================


  withdrawPortFolio: async (userAddress, pid) => {
    try {
      if (!userAddress && !pid) {
        throw new Error('Invalid user address and PId');
      }

      const contract = new web3.eth.Contract(PortFolioManagerABI, Contract["PortFolioManager"]);


      const data = contract.methods.applyExit(pid).encodeABI();

      // --- Gas price
      const gasPrice = await web3.eth.getGasPrice(); // string in wei

      // --- IMPORTANT: do NOT send any value; fn is nonpayable
      let gasLimit;
      try {
        gasLimit = await web3.eth.estimateGas({
          from: userAddress,
          to: Contract['PortFolioManager'],
          data,                  // no "value" here
        });
      } catch (err) {
        console.error('Gas estimation failed:', err);
        toast.error(err?.message || 'Check contract & inputs.' , 'Gas Estimation Failed');
        throw err;
      }
      const toHex = web3.utils.toHex;
      const tx = {
        from: userAddress,
        to: Contract['PortFolioManager'],
        data,
        gas: toHex(gasLimit),
        gasPrice: toHex(gasPrice),
      };
      return tx;
    } catch (error) {
      console.error('withdraw error:', error);
      toast.error(error?.message || 'Unknown error' , 'Registration error');
      throw error;
    }
  },

  cancelExitPortFolio: async (userAddress, pid) => {
    try {
      if (!userAddress && !pid) {
        throw new Error('Invalid user address and PId');
      }

      const contract = new web3.eth.Contract(PortFolioManagerABI, Contract["PortFolioManager"]);


      const data = contract.methods.cancelExit(pid).encodeABI();

      // --- Gas price
      const gasPrice = await web3.eth.getGasPrice(); // string in wei

      // --- IMPORTANT: do NOT send any value; fn is nonpayable
      let gasLimit;
      try {
        gasLimit = await web3.eth.estimateGas({
          from: userAddress,
          to: Contract['PortFolioManager'],
          data,                  // no "value" here
        });
      } catch (err) {
        console.error('Gas estimation failed:', err);
        toast.error(err?.message || 'Check contract & inputs.' , 'Gas Estimation Failed');
        throw err;
      }
      const toHex = web3.utils.toHex;
      const tx = {
        from: userAddress,
        to: Contract['PortFolioManager'],
        data,
        gas: toHex(gasLimit),
        gasPrice: toHex(gasPrice),
      };
      return tx;
    } catch (error) {
      console.error('withdraw error:', error);
      toast.error(error?.message || 'Unknown error' , 'Registration error');
      throw error;
    }
  },



  // =====================================================================
  // Stake And Invest
  // =====================================================================


  GetchStakeInvest: async (userAddress) => {
    try {
      if (!userAddress) {
        return
      }
      const oceanQuery = new web3.eth.Contract(
        OceanQueryUpgradeableABI,
        Contract["OceanQueryUpgradeable"]
      );

      const safeWalletBalanceRaw = await oceanQuery.methods.getSafeWalletBalance(userAddress).call();
      const safeWalletRama = fromWeiToRama(safeWalletBalanceRaw);

      return safeWalletRama;

    } catch (error) {
      console.error('GetchStakeInvest error:', error);
      toast.error(error?.message || 'Unknown error' , 'GetchStakeInvest error');
      throw error;
    }
  },

  usdToRama: async (amt) => {
    try {
      if (!amt) {
        return;
      }
      const contract = new web3.eth.Contract(PortFolioManagerABI, Contract["PortFolioManager"]);
      const usdMicro = amt * 1e6;
      const ramaWeiQuoteStr = await contract.methods.getPackageValueInRAMA(usdMicro.toString()).call();
      const formattedAmt = parseFloat(ramaWeiQuoteStr) / 1e18

      return formattedAmt

    } catch (error) {
      console.error('InvestInPortFolio error:', error);
      toast.error(error?.message || 'Unknown error' , 'Portfolio creation error');
      throw error;
    }
  },

  RamaTOUsd: async (amt) => {
    try {
      if (!amt) {
        return 0;
      }

      const pm = new web3.eth.Contract(
        PortFolioManagerABI,
        Contract["PortFolioManager"]
      );

      const numericAmount = Number(amt);
      if (!Number.isFinite(numericAmount) || numericAmount < 0) {
        return 0;
      }

      const tokensAsWei = (() => {
        const scaled = Math.trunc(numericAmount * 1e18);
        return scaled > 0 ? BigInt(scaled).toString() : '0';
      })();

      const usdMicroStr = await pm.methods
        .getPackageValueInUSD(tokensAsWei)
        .call();

      return Number(usdMicroStr) / USD_MICRO;
    } catch (error) {
      console.error('RamaTOUsd error:', error);
      throw error;
    }
  },


  InvestInPortFolio: async (userAddress, Amt) => {
    console.log('InvestInPortFolio args:', userAddress, Amt);
    try {

      const pm = new web3.eth.Contract(PortFolioManagerABI, Contract.PortFolioManager);

      const usdMicro = Amt * 1e6;
      const ramaWeiQuoteStr = await pm.methods
        .getPackageValueInRAMA(usdMicro.toString())
        .call();

      const ramaWei = BigInt(ramaWeiQuoteStr);
      if (ramaWei <= 0) throw new Error('Invalid RAMA quote (0)');

      const tol = ramaWei / 200; // 0.5%
      const valueToSend = (ramaWei + tol).toString();

      console.log(sponsorAddress, valueToSend.toString(), ramaWei)

      const data = pm.methods
        .createPortfolio(sponsorAddress, valueToSend)
        .encodeABI();

      const gasPrice = await web3.eth.getGasPrice();

      let gasLimit;
      try {
        gasLimit = await web3.eth.estimateGas({
          from: userAddress,
          to: Contract.PortFolioManager,
          data,
          value: valueToSend,
        });
      } catch (err) {
        console.error('Gas estimation failed:', err);
        toast.error(err?.message || 'Check contract & inputs.', 'Gas Estimation Failed');
        throw err;
      }

      const toHex = web3.utils.toHex;

      const tx = {
        from: userAddress,
        to: Contract.PortFolioManager,   // ✅ correct target (PM)
        data,
        value: valueToSend,       // ✅ must send RAMA wei
        gas: toHex(gasLimit),
        gasPrice: toHex(gasPrice),
      };

      return tx; // your wallet (AppKit/WalletConnect) will sign & send this
    } catch (error) {
      console.error('InvestInPortFolio error:', error);
      toast.error(error?.message || 'Unknown error', 'Portfolio Creation Error');
      throw error;
    }
  },




  // ==========================================================================
  // Stake And Invest
  // ==========================================================================

  CreateSelfPort: async (userAddress, Amt) => {
    console.log('CreateSelfPort args:', userAddress, Amt);
    try {

      const pm = new web3.eth.Contract(PortFolioManagerABI, Contract.PortFolioManager);

      const usdMicro = Amt * 1e6;
      const ramaWeiQuoteStr = await pm.methods
        .getPackageValueInRAMA(usdMicro.toString())
        .call();

      const valueToSend = BigInt(ramaWeiQuoteStr);
      if (valueToSend <= 0) throw new Error('Invalid RAMA quote (0)');



      console.log(valueToSend.toString(), valueToSend)

      const data = pm.methods
        .createPortfolio(valueToSend)
        .encodeABI();

      const gasPrice = await web3.eth.getGasPrice();

      let gasLimit;
      try {
        gasLimit = await web3.eth.estimateGas({
          from: userAddress,
          to: Contract.PortFolioManager,
          data,
          value: valueToSend,
        });
      } catch (err) {
        console.error('Gas estimation failed:', err);
        toast.error(err?.message || 'Check contract & inputs.', 'Gas Estimation Failed');
        throw err;
      }

      const toHex = web3.utils.toHex;

      const tx = {
        from: userAddress,
        to: Contract.PortFolioManager,   // ✅ correct target (PM)
        data,
        value: valueToSend,       // ✅ must send RAMA wei
        gas: toHex(gasLimit),
        gasPrice: toHex(gasPrice),
      };

      return tx; // your wallet (AppKit/WalletConnect) will sign & send this
    } catch (error) {
      console.error('CreateSelfPort error:', error);
      toast.error(error?.message || 'Unknown error', 'Create Portfolio Error');
      throw error;
    }
  },

  CreateOtherfPort: async (userAddress, toBeActivatedUSer, Amt,sponsorAddress) => {
    console.log('userAddress, toBeActivatedUSer, Amt,sponsorAddress args:', userAddress, toBeActivatedUSer, Amt,sponsorAddress);
    try {
      const pm = new web3.eth.Contract(PortFolioManagerABI, Contract.PortFolioManager);

      const usdMicro = Amt * 1e6;
      const ramaWeiQuoteStr = await pm.methods
        .getPackageValueInRAMA(usdMicro.toString())
        .call();

      const valueToSend = BigInt(ramaWeiQuoteStr);
      if (valueToSend <= 0) throw new Error('Invalid RAMA quote (0)');

      console.log(valueToSend.toString(), valueToSend)

      const data = pm.methods
        .createPortfolioForOthers(toBeActivatedUSer, sponsorAddress)
        .encodeABI();

      const gasPrice = await web3.eth.getGasPrice();

      let gasLimit;
      try {
        gasLimit = await web3.eth.estimateGas({
          from: userAddress,
          to: Contract.PortFolioManager,
          data,
          value: valueToSend,
        });
      } catch (err) {
        console.error('Gas estimation failed:', err);
        toast.error(err?.message || 'Check contract & inputs.', 'Gas Estimation Failed');
        throw err;
      }

      const toHex = web3.utils.toHex;

      const tx = {
        from: userAddress,
        to: Contract.PortFolioManager,   // ✅ correct target (PM)
        data,
        value: valueToSend,       // ✅ must send RAMA wei
        gas: toHex(gasLimit),
        gasPrice: toHex(gasPrice),
      };

      return tx; // your wallet (AppKit/WalletConnect) will sign & send this
    } catch (error) {
      console.error('CreateOtherfPort error:', error);
      toast.error(error?.message || 'Unknown error', 'Create Other Portfolio Error');
      throw error;
    }
  },

  SafeSelfPort: async (userAddress, Amt) => {
    console.log('SafeSelfPort args:', userAddress, Amt);
    try {

      const pm = new web3.eth.Contract(PortFolioManagerABI, Contract.PortFolioManager);
      const safeWallCont = new web3.eth.Contract(SafeWalletABI, Contract.SafeWallet);


      const usdMicro = BigInt(Math.floor(Number(Amt) * 1e6));
      const ramaWeiQuoteStr = await pm.methods
        .getPackageValueInRAMA(usdMicro.toString())
        .call();

      const valueToSend = BigInt(ramaWeiQuoteStr);
      if (valueToSend <= 0) throw new Error('Invalid RAMA quote (0)');



      console.log(valueToSend.toString(), valueToSend)

      const data = safeWallCont.methods.createPortfolioFromSafe(valueToSend).encodeABI();

      const gasPrice = await web3.eth.getGasPrice();

      let gasLimit;
      try {
        gasLimit = await web3.eth.estimateGas({
          from: userAddress,
          to: Contract.SafeWallet,
          data,
          value: 0,
        });
      } catch (err) {
        console.error('Gas estimation failed:', err);
        toast.error(err?.message || 'Check contract & inputs.', 'Gas Estimation Failed');
        throw err;
      }

      const toHex = web3.utils.toHex;

      const tx = {
        from: userAddress,
        to: Contract.SafeWallet,  
        data,
        value: 0,       
        gas: toHex(gasLimit),
        gasPrice: toHex(gasPrice),
      };

      return tx;
    } catch (error) {
      console.error('SafeSelfPort error:', error);
      toast.error(error?.message || 'Unknown error', 'Safe Wallet Portfolio Error');
      throw error;
    }
  },

  SafeOtherPort: async (userAddress, beneficiary, Amt) => {
    console.log('SafeOtherPort args:', userAddress, Amt);
    try {

      const pm = new web3.eth.Contract(PortFolioManagerABI, Contract.PortFolioManager);
      const safeWallCont = new web3.eth.Contract(SafeWalletABI, Contract.SafeWallet);


      const usdMicro = BigInt(Math.floor(Number(Amt) * 1e6));
      const ramaWeiQuoteStr = await pm.methods
        .getPackageValueInRAMA(usdMicro.toString())
        .call();

      const valueToSend = BigInt(ramaWeiQuoteStr);
      if (valueToSend <= 0) throw new Error('Invalid RAMA quote (0)');



      console.log(valueToSend.toString(), valueToSend)

      const data = safeWallCont.methods
        .sponsorCreatePortfolioFor(beneficiary, valueToSend, userAddress)
        .encodeABI();

      const gasPrice = await web3.eth.getGasPrice();

      let gasLimit;
      try {
        gasLimit = await web3.eth.estimateGas({
          from: userAddress,
          to: Contract.SafeWallet,
          data,
          value: 0,
        });
      } catch (err) {
        console.error('Gas estimation failed:', err);
        toast.error(err?.message || 'Check contract & inputs.', 'Gas Estimation Failed');
        throw err;
      }

      const toHex = web3.utils.toHex;

      const tx = {
        from: userAddress,
        to: Contract.SafeWallet,   
        data,
        value: 0,       
        gas: toHex(gasLimit),
        gasPrice: toHex(gasPrice),
      };

      return tx; 
    } catch (error) {
      console.error('SafeOtherPort error:', error);
      toast.error(error?.message || 'Unknown error' , 'CreateSelfPort error');
      throw error;
    }
  },

// ==========================================================================
  // INcome Transaction History
  // ==========================================================================


  getIncomeTransaction: async (userAddress, kind, limit, offset) => {
    try {
      if (!userAddress) return null;

      const CompView = makeContract(
        ComprehensiveViewABI,
        Contract["ComprehensiveView"]
      );


      console.log(userAddress, kind, limit, offset)

      const response = await CompView.methods
        .getIncomeHistoryByKind(userAddress, kind, offset, limit)
        .call();

      console.log(response)

      return response;
    } catch (error) {
      console.log("getIncomeTransaction error:", error);
      return null;
    }
  },

  // Safe Wallet registration with custom sponsor
  SafeRegisterAndActivate: async (userAddress, beneficiary, sponsor, Amt) => {
    console.log('SafeRegisterAndActivate args:', { userAddress, beneficiary, sponsor, Amt });
    try {
      const pm = new web3.eth.Contract(PortFolioManagerABI, Contract.PortFolioManager);
      const safeWallCont = new web3.eth.Contract(SafeWalletABI, Contract.SafeWallet);
      const regContract = new web3.eth.Contract(UserRegistryABI, Contract.UserRegistry);

      // Resolve sponsor (address or numeric ID)
      let sponsorAddress;
      if (typeof sponsor === 'string' && sponsor.startsWith('0x')) {
        sponsorAddress = sponsor;
      } else {
        const userId = typeof sponsor === 'number' ? sponsor : Number(sponsor);
        if (!Number.isFinite(userId) || userId <= 0) throw new Error('Invalid sponsor id');
        sponsorAddress = await regContract.methods.idToAddress(userId).call();
      }

      if (!sponsorAddress || !sponsorAddress.startsWith('0x')) {
        throw new Error('Resolved sponsor address is invalid');
      }
      if (/^0x0{40}$/i.test(sponsorAddress)) {
        throw new Error('Sponsor not found (zero address)');
      }

      const usdMicro = BigInt(Math.floor(Number(Amt) * 1e6));
      const ramaWeiQuoteStr = await pm.methods
        .getPackageValueInRAMA(usdMicro.toString())
        .call();

      const valueToSend = BigInt(ramaWeiQuoteStr);
      if (valueToSend <= 0) throw new Error('Invalid RAMA quote (0)');

      console.log('Calling sponsorCreatePortfolioFor with:', { beneficiary, valueToSend: valueToSend.toString(), sponsor: sponsorAddress });

      const data = safeWallCont.methods
        .sponsorCreatePortfolioFor(beneficiary, valueToSend, sponsorAddress)
        .encodeABI();

      const gasPrice = await web3.eth.getGasPrice();

      let gasLimit;
      try {
        gasLimit = await web3.eth.estimateGas({
          from: userAddress,
          to: Contract.SafeWallet,
          data,
          value: 0,
        });
      } catch (err) {
        console.error('Gas estimation failed:', err);
        toast.error(err?.message || 'Check contract & inputs.', 'Gas Estimation Failed');
        throw err;
      }

      const toHex = web3.utils.toHex;

      const tx = {
        from: userAddress,
        to: Contract.SafeWallet,
        data,
        value: 0,
        gas: toHex(gasLimit),
        gasPrice: toHex(gasPrice),
      };

      return tx;
    } catch (error) {
      console.error('SafeRegisterAndActivate error:', error);
      toast.error(error?.message || 'Unknown error' , 'Registration error');
      throw error;
    }
  },

  // Safe Wallet withdrawal to external wallet
  withdrawFromSafeWallet: async (userAddress, ramaAmount) => {
    try {
      if (!userAddress) throw new Error('No connected wallet address found');
      if (!ramaAmount || ramaAmount <= 0) throw new Error('Invalid withdrawal amount');

      const safeWallet = makeContract(SafeWalletABI, Contract.SafeWallet);
      if (!safeWallet) throw new Error('SafeWallet contract not available');

      // Convert RAMA to wei
      const ramaWei = toBigIntSafe(BigInt(Math.trunc(ramaAmount * RAMA_DECIMALS))).toString();
      
      // Check if user has sufficient balance
      const balance = await safeWallet.methods.balanceOf(userAddress).call();
      if (toBigIntSafe(ramaWei) > toBigIntSafe(balance)) {
        throw new Error('Insufficient Safe Wallet balance');
      }

      // Build transaction for claimToExternal(amount, to)
      const data = safeWallet.methods
        .claimToExternal(ramaWei, userAddress)
        .encodeABI();

      const gasPrice = await web3.eth.getGasPrice();
      
      let gasLimit;
      try {
        gasLimit = await web3.eth.estimateGas({
          from: userAddress,
          to: Contract.SafeWallet,
          data,
        });
      } catch (err) {
        console.error('Gas estimation failed for SafeWallet withdrawal:', err);
        const reason = err?.data?.message || err?.message || '';
        if (/insufficient|balance/i.test(reason)) {
          throw new Error('Insufficient Safe Wallet balance for withdrawal');
        }
        throw new Error(`Gas estimation failed: ${reason}`);
      }

      const toHex = web3.utils.toHex;
      const tx = {
        from: userAddress,
        to: Contract.SafeWallet,
        data,
        gas: toHex(gasLimit),
        gasPrice: toHex(gasPrice),
      };

      return tx;
    } catch (error) {
      console.error('withdrawFromSafeWallet error:', error);
      toast.error(error?.message || 'Unknown error', 'Safe Wallet Withdrawal Error');
      throw error;
    }
  },

  // Cache Management Methods
  clearCache: async () => {
    console.log('[Store] Clearing all cached data...');
    
    try {
      // Clear local storage data
      localStorage.removeItem('userInfo');
      localStorage.removeItem('contractData');
      localStorage.removeItem('portfolioData');
      localStorage.removeItem('transactionHistory');
      
      // Clear session storage
      sessionStorage.clear();
      
      // Reset store state
      const resetState = useUserInfoStore.getState().resetStore;
      if (resetState) resetState();
      
      // Force contract re-initialization
      const initState = useUserInfoStore.getState().initializeContracts;
      if (initState) {
        await initState();
      }
      
      console.log('[Store] Cache cleared successfully');
    } catch (error) {
      console.error('[Store] Error clearing cache:', error);
    }
  },

  invalidateContractCache: async () => {
    console.log('[Store] Invalidating contract cache...');
    
    try {
      // Clear contract-specific cached data
      localStorage.removeItem('contractData');
      localStorage.removeItem('portfolioData');
      localStorage.removeItem('stakingData');
      localStorage.removeItem('rewardData');
      
      // Reset contract-related state
      set(state => ({
        ...state,
        contracts: {},
        portfolios: [],
        userBalance: '0',
        totalStaked: '0',
        totalRewards: '0',
        isInitialized: false
      }));
      
      // Re-initialize contracts with fresh data
      const initContracts = useUserInfoStore.getState().initializeContracts;
      if (initContracts) {
        await initContracts();
      }
      
      console.log('[Store] Contract cache invalidated and contracts re-initialized');
    } catch (error) {
      console.error('[Store] Error invalidating contract cache:', error);
    }
  },

  // Get capping income summary with totals from CappingIncomeManager using dual RPC
  getCappingIncomeData: async (userAddress) => {
    try {
      if (!userAddress) throw new Error("Missing user address");

      console.log('[Store] Fetching CappingIncomeManager data for:', userAddress);
      console.log('[Store] Using dual RPC endpoints for faster response');

      // Create dual contract instances
      const cappingIncomeContracts = makeDualContracts(
        CappingIncomeManagerABI,
        Contract["CappingIncomeManager"]
      );

      if (cappingIncomeContracts.length === 0) {
        throw new Error("CappingIncomeManager contract not available");
      }

      console.log('[Store] CappingIncomeManager address:', Contract["CappingIncomeManager"]);

      // Use dual RPC for faster response
      const earnedByKind = await callWithDualRPC(
        () => cappingIncomeContracts[0].methods.getEarnedByKind(userAddress).call(),
        'getEarnedByKind'
      );

      console.log('[Store] CappingIncomeManager earnedByKind raw response:', earnedByKind);

      // Extract values (they should be in USD6 format - 6 decimal places)
      const roiUSD6 = BigInt(earnedByKind[0] || '0');
      const directUSD6 = BigInt(earnedByKind[1] || '0');
      const slabUSD6 = BigInt(earnedByKind[2] || '0');
      const slabOverrideUSD6 = BigInt(earnedByKind[3] || '0');

      // Sum all income types
      const totalEarnedUSD6 = roiUSD6 + directUSD6 + slabUSD6 + slabOverrideUSD6;

      // Convert from USD6 (micro USD) to regular USD
      const totalEarnedUSD = fromMicroUSD(totalEarnedUSD6);
      
      console.log('[Store] CappingIncomeManager breakdown:', {
        roi: fromMicroUSD(roiUSD6),
        direct: fromMicroUSD(directUSD6),
        slab: fromMicroUSD(slabUSD6),
        slabOverride: fromMicroUSD(slabOverrideUSD6),
        total: totalEarnedUSD
      });

      const result = {
        breakdown: {
          roi: fromMicroUSD(roiUSD6),
          direct: fromMicroUSD(directUSD6),
          slab: fromMicroUSD(slabUSD6),
          slabOverride: fromMicroUSD(slabOverrideUSD6)
        },
        totalEarnedUSD,
        rawValues: {
          roiUSD6: roiUSD6.toString(),
          directUSD6: directUSD6.toString(),
          slabUSD6: slabUSD6.toString(),
          slabOverrideUSD6: slabOverrideUSD6.toString(),
          totalEarnedUSD6: totalEarnedUSD6.toString()
        }
      };

      console.log('[Store] CappingIncomeManager final result:', result);
      return result;
    } catch (error) {
      console.error('[Store] Error fetching CappingIncomeManager data:', error);
      
      // Return safe fallback values
      return {
        breakdown: {
          roi: 0,
          direct: 0,
          slab: 0,
          slabOverride: 0
        },
        totalEarnedUSD: 0,
        rawValues: {
          roiUSD6: '0',
          directUSD6: '0',
          slabUSD6: '0',
          slabOverrideUSD6: '0',
          totalEarnedUSD6: '0'
        },
        error: error.message
      };
    }
  },

  // Get direct members portfolio breakdown from OceanicView with dual RPC optimization
  getDirectsPortfolioBreakdown: async (userAddress) => {
    try {
      if (!userAddress) throw new Error("Missing user address");

      console.log('[Store] Fetching directs portfolio breakdown for:', userAddress);
      console.log('[Store] Using dual RPC endpoints for faster response');

      // Create dual contract instances
      const oceanicViewContracts = makeDualContracts(OceanicViewABI, Contract["Oceanicview"]);
      if (oceanicViewContracts.length === 0) {
        throw new Error("OceanicView contract not available");
      }

      console.log('[Store] OceanicView address:', Contract["Oceanicview"]);

      // Use dual RPC for faster response
      const result = await callWithDualRPC(
        () => oceanicViewContracts[0].methods.getDirectsPortfolioBreakdown(userAddress).call(),
        'getDirectsPortfolioBreakdown'
      );

      console.log('[Store] Raw directs portfolio breakdown:', result);

      // Extract and parse the response
      const [
        directs,
        selfUsd,
        teamUsd,
        sumUsd,
        totalSelfUsd,
        totalTeamUsd,
        totalSumUsd
      ] = result;

      // Convert USD values from wei (18 decimals) to regular USD
      // Process each direct member with their portfolio data
      const directsData = directs.map((address, index) => {
        const selfUsdValue = fromWadToUsd(selfUsd[index] || '0');
        const teamUsdValue = fromWadToUsd(teamUsd[index] || '0');
        const sumUsdValue = fromWadToUsd(sumUsd[index] || '0');

        return {
          address,
          selfUsd: selfUsdValue,
          teamUsd: teamUsdValue,
          sumUsd: sumUsdValue,
          selfUsdRaw: selfUsd[index] || '0',
          teamUsdRaw: teamUsd[index] || '0',
          sumUsdRaw: sumUsd[index] || '0',
          // Team business calculation: each user's own portfolio + their team's volume
          totalBusiness: selfUsdValue + teamUsdValue,
          hasTeam: teamUsdValue > 0,
          // Portfolio strength indicators
          portfolioRatio: teamUsdValue > 0 ? (teamUsdValue / selfUsdValue).toFixed(2) : '0',
          contributionToTotal: sumUsdValue
        };
      });

      // Calculate comprehensive summary statistics
      const summary = {
        totalSelfUsd: fromWadToUsd(totalSelfUsd),
        totalTeamUsd: fromWadToUsd(totalTeamUsd),
        totalSumUsd: fromWadToUsd(totalSumUsd),
        totalSelfUsdRaw: totalSelfUsd,
        totalTeamUsdRaw: totalTeamUsd,
        totalSumUsdRaw: totalSumUsd,
        directCount: directs.length,
        // Additional business metrics
        averageDirectPortfolio: directs.length > 0 ? fromWadToUsd(totalSelfUsd) / directs.length : 0,
        averageTeamVolume: directs.length > 0 ? fromWadToUsd(totalTeamUsd) / directs.length : 0,
        teamPenetration: directs.length > 0 ? directsData.filter(d => d.hasTeam).length / directs.length : 0,
        strongestDirect: directsData.reduce((max, current) => 
          current.totalBusiness > (max?.totalBusiness || 0) ? current : max, null
        ),
        // Network health indicators
        teamBusinessRatio: fromWadToUsd(totalSelfUsd) > 0 ? 
          (fromWadToUsd(totalTeamUsd) / fromWadToUsd(totalSelfUsd)).toFixed(2) : '0'
      };

      // Sort directs by total business (self + team) for better display
      directsData.sort((a, b) => b.totalBusiness - a.totalBusiness);

      console.log('[Store] Processed directs portfolio breakdown:', {
        directsData: directsData.slice(0, 3), // Log first 3 for brevity
        summary,
        totalDirects: directsData.length
      });

      // Team business calculation example based on your data:
      // User 0x8e12c1204d29A5B236A866B470279B52C0707472:
      // - Self Portfolio: 110000000000000000 (0.11 USD)
      // - Team Volume: 2500000000 (0.0000025 USD) 
      // - Total Business: 0.11 + 0.0000025 = 0.1100025 USD
      console.log('[Store] Team business calculation example:');
      directsData.forEach((direct, index) => {
        if (index < 3) { // Log first 3 examples
          console.log(`Direct ${index + 1} (${direct.address.slice(0, 6)}...${direct.address.slice(-4)}):
            Self Portfolio: $${direct.selfUsd.toFixed(6)}
            Team Volume: $${direct.teamUsd.toFixed(6)}
            Total Business: $${direct.totalBusiness.toFixed(6)}
            Has Team: ${direct.hasTeam ? 'Yes' : 'No'}`
          );
        }
      });

      return {
        directs: directsData,
        summary,
        success: true,
        timestamp: Date.now(),
        rpcOptimized: true
      };
    } catch (error) {
      console.error('[Store] Error fetching directs portfolio breakdown:', error);
      
      return {
        directs: [],
        summary: {
          totalSelfUsd: 0,
          totalTeamUsd: 0,
          totalSumUsd: 0,
          totalSelfUsdRaw: '0',
          totalTeamUsdRaw: '0',
          totalSumUsdRaw: '0',
          directCount: 0,
          averageDirectPortfolio: 0,
          averageTeamVolume: 0,
          teamPenetration: 0,
          strongestDirect: null,
          teamBusinessRatio: '0'
        },
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  },

  // Enhanced ROI Distribution functions with multi-day claiming support
  getMaxPeriodsPerClaim: async () => {
    try {
      console.log('[Store] Fetching max periods per claim...');
      
      const roiDistributorContracts = makeDualContracts(RoiDistributionABI, Contract["RoiDistribution"]);
      if (roiDistributorContracts.length === 0) {
        throw new Error("RoiDistributor contract not available");
      }

      const maxPeriods = await callWithDualRPC(
        () => roiDistributorContracts[0].methods.maxPeriodsPerClaim().call(),
        'maxPeriodsPerClaim'
      );

      console.log('[Store] Max periods per claim:', maxPeriods);
      return Number(maxPeriods);
    } catch (error) {
      console.error('[Store] Error fetching max periods per claim:', error);
      return 100; // Default fallback
    }
  },

  // Get user's auto window for claiming periods
  getAutoWindow: async (userAddress) => {
    try {
      if (!userAddress) throw new Error("Missing user address");

      console.log('[Store] Fetching auto window for:', userAddress);
      
      const roiDistributorContracts = makeDualContracts(RoiDistributionABI, Contract["RoiDistribution"]);
      if (roiDistributorContracts.length === 0) {
        throw new Error("RoiDistributor contract not available");
      }

      const autoWindow = await callWithDualRPC(
        () => roiDistributorContracts[0].methods._autoWindow(userAddress).call(),
        '_autoWindow'
      );

      console.log('[Store] Raw auto window data:', autoWindow);

      const fromPeriod = Number(autoWindow.fromPeriod || autoWindow[0]);
      const lastPeriod = Number(autoWindow.lastPeriod || autoWindow[1]);
      const totalPeriods = lastPeriod - fromPeriod + 1;

      // Calculate smart claiming strategy (max 99 periods per transaction)
      const maxPeriodsPerTx = 99;
      const totalTransactions = Math.ceil(totalPeriods / maxPeriodsPerTx);
      
      const claimingPlan = [];
      for (let i = 0; i < totalTransactions; i++) {
        const txFromPeriod = fromPeriod + (i * maxPeriodsPerTx);
        const txToPeriod = Math.min(txFromPeriod + maxPeriodsPerTx - 1, lastPeriod);
        const txPeriods = txToPeriod - txFromPeriod + 1;
        
        claimingPlan.push({
          transactionNumber: i + 1,
          fromPeriod: txFromPeriod,
          toPeriod: txToPeriod,
          periodsCount: txPeriods,
          // Estimate dates (assuming daily periods)
          estimatedFromDate: new Date(Date.now() - (lastPeriod - txFromPeriod + 1) * 24 * 60 * 60 * 1000).toLocaleDateString(),
          estimatedToDate: new Date(Date.now() - (lastPeriod - txToPeriod + 1) * 24 * 60 * 60 * 1000).toLocaleDateString()
        });
      }

      const result = {
        fromPeriod,
        lastPeriod,
        totalPeriods,
        totalTransactions,
        claimingPlan,
        canClaim: totalPeriods > 0,
        success: true,
        timestamp: Date.now(),
        rpcOptimized: true
      };

      console.log('[Store] Processed auto window:', result);
      return result;
    } catch (error) {
      console.error('[Store] Error fetching auto window:', error);
      
      return {
        fromPeriod: 0,
        lastPeriod: 0,
        totalPeriods: 0,
        totalTransactions: 0,
        claimingPlan: [],
        canClaim: false,
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  },

  // Get per-day ROI breakdown for claiming preview
  getPerDayROIBreakdown: async (userAddress, fromPeriod = null, toPeriod = null) => {
    try {
      if (!userAddress) throw new Error("Missing user address");

      console.log('[Store] Fetching per-day ROI breakdown for:', userAddress);
      console.log('[Store] Period range:', { fromPeriod, toPeriod });

      const roiDistributorContracts = makeDualContracts(RoiDistributionABI, Contract["RoiDistribution"]);
      if (roiDistributorContracts.length === 0) {
        throw new Error("RoiDistributor contract not available");
      }

      // If no periods specified, get the auto window
      let actualFromPeriod = fromPeriod;
      let actualToPeriod = toPeriod;

      if (!fromPeriod || !toPeriod) {
        const autoWindow = await callWithDualRPC(
          () => roiDistributorContracts[0].methods._autoWindow(userAddress).call(),
          '_autoWindow'
        );
        
        actualFromPeriod = fromPeriod || Number(autoWindow.fromPeriod);
        actualToPeriod = toPeriod || Number(autoWindow.lastPeriod);
        
        console.log('[Store] Auto window:', { actualFromPeriod, actualToPeriod });
      }

      // Get per-period preview
      const perPeriodData = await callWithDualRPC(
        () => roiDistributorContracts[0].methods.perPeriodPreview(
          userAddress, 
          actualFromPeriod, 
          actualToPeriod
        ).call(),
        'perPeriodPreview'
      );

      console.log('[Store] Raw per-period data:', perPeriodData);

      const [periodIds, usdPerPeriod, ramaPerPeriod, epochsCount] = perPeriodData;

      // Process daily breakdown
      const dailyBreakdown = periodIds.map((periodId, index) => {
        const usdAmount = fromMicroUSD(BigInt(usdPerPeriod[index] || '0'));
        const ramaAmount = parseFloat(Web3.utils.fromWei(ramaPerPeriod[index] || '0', 'ether'));
        
        return {
          periodId: Number(periodId),
          day: index + 1,
          usdAmount,
          ramaAmount,
          usdRaw: usdPerPeriod[index] || '0',
          ramaRaw: ramaPerPeriod[index] || '0',
          // Calculate date from period (assuming daily periods)
          estimatedDate: new Date(Date.now() - (periodIds.length - index - 1) * 24 * 60 * 60 * 1000).toLocaleDateString()
        };
      });

      // Calculate totals
      const totalUsd = dailyBreakdown.reduce((sum, day) => sum + day.usdAmount, 0);
      const totalRama = dailyBreakdown.reduce((sum, day) => sum + day.ramaAmount, 0);

      const summary = {
        totalDays: Number(epochsCount),
        totalUsd,
        totalRama,
        fromPeriod: actualFromPeriod,
        toPeriod: actualToPeriod,
        averageDailyUsd: totalUsd > 0 ? totalUsd / dailyBreakdown.length : 0,
        averageDailyRama: totalRama > 0 ? totalRama / dailyBreakdown.length : 0
      };

      console.log('[Store] Processed daily breakdown:', {
        summary,
        totalDays: dailyBreakdown.length,
        sampleDays: dailyBreakdown.slice(0, 3)
      });

      return {
        dailyBreakdown,
        summary,
        success: true,
        timestamp: Date.now(),
        rpcOptimized: true
      };
    } catch (error) {
      console.error('[Store] Error fetching per-day ROI breakdown:', error);
      
      return {
        dailyBreakdown: [],
        summary: {
          totalDays: 0,
          totalUsd: 0,
          totalRama: 0,
          fromPeriod: 0,
          toPeriod: 0,
          averageDailyUsd: 0,
          averageDailyRama: 0
        },
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  },

  // Enhanced getUnclaimedROI with detailed period information
  getUnclaimedROIDetailed: async (userAddress) => {
    try {
      if (!userAddress) throw new Error("Missing user address");

      console.log('[Store] Fetching detailed unclaimed ROI for:', userAddress);

      const roiDistributorContracts = makeDualContracts(RoiDistributionABI, Contract["RoiDistribution"]);
      if (roiDistributorContracts.length === 0) {
        throw new Error("RoiDistributor contract not available");
      }

      const unclaimedData = await callWithDualRPC(
        () => roiDistributorContracts[0].methods.getUnclaimedROI(userAddress).call(),
        'getUnclaimedROI'
      );

      console.log('[Store] Raw unclaimed ROI data:', unclaimedData);

      const [usdTotalMicro, ramaTotalWei, fromPeriod, lastPeriod, epochsCount] = unclaimedData;

      const totalUsd = fromMicroUSD(BigInt(usdTotalMicro));
      const totalRama = parseFloat(Web3.utils.fromWei(ramaTotalWei, 'ether'));

      const result = {
        totalUsd,
        totalRama,
        fromPeriod: Number(fromPeriod),
        lastPeriod: Number(lastPeriod),
        epochsCount: Number(epochsCount),
        usdRaw: usdTotalMicro,
        ramaRaw: ramaTotalWei,
        // Calculate claimable days
        claimableDays: Number(epochsCount),
        periodRange: `${fromPeriod} - ${lastPeriod}`,
        canClaim: totalUsd > 0 || totalRama > 0,
        success: true,
        timestamp: Date.now(),
        rpcOptimized: true
      };

      console.log('[Store] Processed unclaimed ROI:', result);
      return result;
    } catch (error) {
      console.error('[Store] Error fetching detailed unclaimed ROI:', error);
      
      return {
        totalUsd: 0,
        totalRama: 0,
        fromPeriod: 0,
        lastPeriod: 0,
        epochsCount: 0,
        usdRaw: '0',
        ramaRaw: '0',
        claimableDays: 0,
        periodRange: '0 - 0',
        canClaim: false,
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  },

  // Get preview of portfolio-based claiming
  getPortfolioClaimPreview: async (userAddress) => {
    try {
      if (!userAddress) throw new Error("Missing user address");

      console.log('[Store] Fetching portfolio claim preview for:', userAddress);

      const roiDistributorContracts = makeDualContracts(RoiDistributionABI, Contract["RoiDistribution"]);
      if (roiDistributorContracts.length === 0) {
        throw new Error("RoiDistributor contract not available");
      }

      const portfolioPreview = await callWithDualRPC(
        () => roiDistributorContracts[0].methods.previewClaimPerPortfolio(userAddress).call(),
        'previewClaimPerPortfolio'
      );

      console.log('[Store] Raw portfolio preview:', portfolioPreview);

      const [pids, usdTotals, ramaTotals, epochCounts, fromPeriod, lastPeriod] = portfolioPreview;

      // Process portfolio breakdown
      const portfolioBreakdown = pids.map((pid, index) => ({
        pid: Number(pid),
        usdTotal: fromMicroUSD(BigInt(usdTotals[index] || '0')),
        ramaTotal: parseFloat(Web3.utils.fromWei(ramaTotals[index] || '0', 'ether')),
        epochCount: Number(epochCounts[index]),
        usdRaw: usdTotals[index] || '0',
        ramaRaw: ramaTotals[index] || '0'
      }));

      // Calculate totals
      const totalUsd = portfolioBreakdown.reduce((sum, p) => sum + p.usdTotal, 0);
      const totalRama = portfolioBreakdown.reduce((sum, p) => sum + p.ramaTotal, 0);
      const totalEpochs = portfolioBreakdown.reduce((sum, p) => sum + p.epochCount, 0);

      const result = {
        portfolioBreakdown,
        summary: {
          totalPortfolios: pids.length,
          totalUsd,
          totalRama,
          totalEpochs,
          fromPeriod: Number(fromPeriod),
          lastPeriod: Number(lastPeriod),
          periodRange: `${fromPeriod} - ${lastPeriod}`
        },
        success: true,
        timestamp: Date.now(),
        rpcOptimized: true
      };

      console.log('[Store] Processed portfolio preview:', result);
      return result;
    } catch (error) {
      console.error('[Store] Error fetching portfolio claim preview:', error);
      
      return {
        portfolioBreakdown: [],
        summary: {
          totalPortfolios: 0,
          totalUsd: 0,
          totalRama: 0,
          totalEpochs: 0,
          fromPeriod: 0,
          lastPeriod: 0,
          periodRange: '0 - 0'
        },
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  },

  // Smart ROI claiming with automatic period management
  claimAccruedROISmart: async (fromAddress) => {
    try {
      if (!fromAddress) throw new Error("Missing sender address");

      console.log('[Store] Creating smart claimROIUpTo transaction for:', fromAddress);

      // Get auto window to determine periods
      const autoWindow = await get().getAutoWindow(fromAddress);
      if (!autoWindow.success || !autoWindow.canClaim) {
        throw new Error("No claimable periods available");
      }

      console.log('[Store] Auto window result:', autoWindow);

      // Use the first claiming plan (99 periods max)
      const firstClaim = autoWindow.claimingPlan[0];
      if (!firstClaim) {
        throw new Error("No claiming plan available");
      }

      const periodsToClaimFirst = firstClaim.periodsCount;
      console.log('[Store] Claiming', periodsToClaimFirst, 'periods in first transaction');

      const roiDistributor = makeContract(RoiDistributionABI, Contract["RoiDistribution"]);
      if (!roiDistributor) {
        throw new Error("RoiDistributor contract not available");
      }

      // Create the transaction object for claimROIUpTo
      const transaction = roiDistributor.methods.claimROIUpTo(periodsToClaimFirst);

      // Estimate gas
      let gasEstimate;
      try {
        gasEstimate = await transaction.estimateGas({ from: fromAddress });
        console.log('[Store] claimROIUpTo gas estimate:', gasEstimate);
      } catch (err) {
        console.error('Gas estimation failed for claimROIUpTo:', err);
        gasEstimate = 350000; // Fallback gas limit
      }

      const txObject = {
        from: fromAddress,
        to: Contract["RoiDistribution"],
        data: transaction.encodeABI(),
        gas: Math.floor(Number(gasEstimate) * 1.2), // Add 20% buffer
        gasPrice: await web3.eth.getGasPrice(),
        // Add metadata for UI display
        _metadata: {
          claimingStrategy: 'smart',
          currentTransaction: 1,
          totalTransactions: autoWindow.totalTransactions,
          periodsInThisTx: periodsToClaimFirst,
          totalPeriods: autoWindow.totalPeriods,
          fromPeriod: firstClaim.fromPeriod,
          toPeriod: firstClaim.toPeriod,
          estimatedFromDate: firstClaim.estimatedFromDate,
          estimatedToDate: firstClaim.estimatedToDate,
          hasMoreTransactions: autoWindow.totalTransactions > 1
        }
      };

      console.log('[Store] Smart claimROIUpTo transaction object:', txObject);
      return txObject;
    } catch (error) {
      console.error('claimAccruedROISmart error:', error);
      throw error;
    }
  },

  claimAllROI: async (fromAddress) => {
    try {
      if (!fromAddress) throw new Error("Missing sender address");

      console.log('[Store] Creating claimROI transaction for:', fromAddress);

      const roiDistributor = makeContract(RoiDistributionABI, Contract["RoiDistribution"]);
      if (!roiDistributor) {
        throw new Error("RoiDistributor contract not available");
      }

      // Create the transaction object
      const transaction = roiDistributor.methods.claimROI();

      // Estimate gas
      let gasEstimate;
      try {
        gasEstimate = await transaction.estimateGas({ from: fromAddress });
        console.log('[Store] claimROI gas estimate:', gasEstimate);
      } catch (err) {
        console.error('Gas estimation failed for claimROI:', err);
        gasEstimate = 300000; // Fallback gas limit
      }

      const txObject = {
        from: fromAddress,
        to: Contract["RoiDistribution"],
        data: transaction.encodeABI(),
        gas: Math.floor(gasEstimate * 1.2), // Add 20% buffer
        gasPrice: await web3.eth.getGasPrice(),
      };

      console.log('[Store] claimROI transaction object:', txObject);
      return txObject;
    } catch (error) {
      console.error('claimAllROI error:', error);
      throw error;
    }
  },

  claimROIUpTo: async (fromAddress, maxPeriods) => {
    try {
      if (!fromAddress) throw new Error("Missing sender address");
      if (!maxPeriods || maxPeriods <= 0) throw new Error("Invalid maxPeriods");

      console.log('[Store] Creating claimROIUpTo transaction for:', fromAddress, 'maxPeriods:', maxPeriods);

      const roiDistributor = makeContract(RoiDistributionABI, Contract["RoiDistribution"]);
      if (!roiDistributor) {
        throw new Error("RoiDistributor contract not available");
      }

      // Create the transaction object
      const transaction = roiDistributor.methods.claimROIUpTo(maxPeriods);

      // Estimate gas
      let gasEstimate;
      try {
        gasEstimate = await transaction.estimateGas({ from: fromAddress });
        console.log('[Store] claimROIUpTo gas estimate:', gasEstimate);
      } catch (err) {
        console.error('Gas estimation failed for claimROIUpTo:', err);
        gasEstimate = 350000; // Fallback gas limit (higher than claimROI)
      }

      const txObject = {
        from: fromAddress,
        to: Contract["RoiDistribution"],
        data: transaction.encodeABI(),
        gas: Math.floor(gasEstimate * 1.2), // Add 20% buffer
        gasPrice: await web3.eth.getGasPrice(),
      };

      console.log('[Store] claimROIUpTo transaction object:', txObject);
      return txObject;
    } catch (error) {
      console.error('claimROIUpTo error:', error);
      throw error;
    }
  },

  // Get claim history for user
  getROIClaimHistory: async (userAddress, offset = 0, limit = 50) => {
    try {
      if (!userAddress) throw new Error("Missing user address");

      console.log('[Store] Fetching ROI claim history for:', userAddress);

      const roiDistributorContracts = makeDualContracts(RoiDistributionABI, Contract["RoiDistribution"]);
      if (roiDistributorContracts.length === 0) {
        throw new Error("RoiDistributor contract not available");
      }

      // Get total count first
      const totalCount = await callWithDualRPC(
        () => roiDistributorContracts[0].methods.getClaimHistoryCount(userAddress).call(),
        'getClaimHistoryCount'
      );

      if (Number(totalCount) === 0) {
        return {
          claimHistory: [],
          totalCount: 0,
          hasMore: false,
          success: true,
          timestamp: Date.now()
        };
      }

      // Get claim history slice
      const historyData = await callWithDualRPC(
        () => roiDistributorContracts[0].methods.getClaimHistorySlice(userAddress, offset, limit).call(),
        'getClaimHistorySlice'
      );

      console.log('[Store] Raw claim history data:', historyData);

      // Process claim history
      const claimHistory = historyData.map((claim) => ({
        fromPeriod: Number(claim.fromPeriod),
        toPeriod: Number(claim.toPeriod),
        usdTotal: fromMicroUSD(BigInt(claim.usdTotal || '0')),
        ramaTotal: parseFloat(Web3.utils.fromWei(claim.ramaTotal || '0', 'ether')),
        claimedAt: Number(claim.claimedAt),
        epoch: Number(claim.epoch),
        claimedDate: new Date(Number(claim.claimedAt) * 1000).toLocaleDateString(),
        claimedTime: new Date(Number(claim.claimedAt) * 1000).toLocaleTimeString(),
        daysClaimed: Number(claim.toPeriod) - Number(claim.fromPeriod) + 1,
        usdRaw: claim.usdTotal || '0',
        ramaRaw: claim.ramaTotal || '0'
      }));

      const result = {
        claimHistory,
        totalCount: Number(totalCount),
        hasMore: offset + limit < Number(totalCount),
        currentOffset: offset,
        currentLimit: limit,
        success: true,
        timestamp: Date.now(),
        rpcOptimized: true
      };

      console.log('[Store] Processed claim history:', result);
      return result;
    } catch (error) {
      console.error('[Store] Error fetching ROI claim history:', error);
      
      return {
        claimHistory: [],
        totalCount: 0,
        hasMore: false,
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  },

  resetStore: () => {
    console.log('[Store] Resetting store to initial state...');
    
    set(state => ({
      ...state,
      contracts: {},
      portfolios: [],
      userBalance: '0',
      totalStaked: '0',
      totalRewards: '0',
      transactions: [],
      isInitialized: false,
      loading: false,
      error: null
    }));
  }

}));

// Helper functions for volume analytics
const calculateNextSlabRequirement = (currentSlabIndex, currentVolume) => {
  // Slab thresholds in USD (these should match your contract)
  const slabThresholds = [
    0,        // Slab 0
    50,       // Slab 1
    100,      // Slab 2
    250,      // Slab 3
    500,      // Slab 4
    1000,     // Slab 5
    2500,     // Slab 6
    5000,     // Slab 7
    10000,    // Slab 8
    25000,    // Slab 9
    50000     // Slab 10
  ];

  const nextSlabIndex = Math.min(currentSlabIndex + 1, slabThresholds.length - 1);
  const nextThreshold = slabThresholds[nextSlabIndex];
  const remaining = Math.max(0, nextThreshold - currentVolume);
  
  return {
    currentSlab: currentSlabIndex,
    nextSlab: nextSlabIndex,
    currentThreshold: slabThresholds[currentSlabIndex],
    nextThreshold,
    remaining,
    progress: nextThreshold > 0 ? (currentVolume / nextThreshold) * 100 : 100
  };
};

const calculateVolumeNeeded = (cappedVolumes) => {
  // 40:30:30 rule optimization
  const total = cappedVolumes.L1 + cappedVolumes.L2 + cappedVolumes.Lrest;
  const optimal = {
    L1: total * 0.4,
    L2: total * 0.3,
    Lrest: total * 0.3
  };

  return {
    L1_needed: Math.max(0, optimal.L1 - cappedVolumes.L1),
    L2_needed: Math.max(0, optimal.L2 - cappedVolumes.L2),
    Lrest_needed: Math.max(0, optimal.Lrest - cappedVolumes.Lrest),
    total_optimization_potential: Math.abs(optimal.L1 - cappedVolumes.L1) + 
                                 Math.abs(optimal.L2 - cappedVolumes.L2) + 
                                 Math.abs(optimal.Lrest - cappedVolumes.Lrest)
  };
};

export default useStore;
