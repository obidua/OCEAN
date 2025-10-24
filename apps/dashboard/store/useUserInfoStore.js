import { create } from "zustand";
import Web3 from "web3";
import Swal from "sweetalert2";
import UserRegistryABI from './Contract_ABI/UserRegistry.json';
import PortFolioManagerABI from './Contract_ABI/PortfolioManager.json';
import IncomeDistributorABI from './Contract_ABI/IncomeDistributor.json';
import OceanQueryUpgradeableABI from './Contract_ABI/OceanQueryUpgradeable.json';
import OceanViewABI from './Contract_ABI/OceanView.json';
import OceanViewV2ABI from './Contract_ABI/OceanViewV2.json';
import OceanicViewABI from './Contract_ABI/Oceanicview.json';
import ComprehensiveViewABI from './Contract_ABI/COMPREHENSIVEVIEW.json';
import CappingIncomeManagerABI from './Contract_ABI/CappingIncomeManager.json';
import SlabManagerABI from './Contract_ABI/SlabManager.json';
import RoyaltyManagerABI from './Contract_ABI/RoyaltyManager.json';
import RewardVaultABI from './Contract_ABI/RewardVault.json';
import SafeWalletABI from './Contract_ABI/SafeWallet.json';
import RoiDistributionABI from './Contract_ABI/RoiDistributor.json';
import { dayShortFromUnix } from "../src/utils/helper";
import {
  ROYALTY_LEVELS as ROYALTY_LEVELS_FALLBACK,
  ONE_TIME_REWARDS as ONE_TIME_REWARDS_FALLBACK,
} from "../src/utils/contractData";

// Initialize contract interfaces using the configured RPC-based web3 instance.
// Read-only calls use the RPC provider (safer for previews/paging). Transactions
// are created as unsigned tx objects and returned for the app's wallet layer
// (Reown AppKit / Wagmi) to sign & submit.
const getContractInterface = async () => {
  try {
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


const RPC_URL =
  resolveEnvValue("RPC_URL") ||
  "https://blockchain.ramestta.com";
const web3 = new Web3(RPC_URL);

const USD_MICRO = 1e6;
const RAMA_DECIMALS = 1e18;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const hasAddress = (addr) =>
  typeof addr === "string" &&
  addr.startsWith("0x") &&
  addr.length === 42 &&
  addr.toLowerCase() !== ZERO_ADDRESS.toLowerCase();

const makeContract = (abi, address) =>
  hasAddress(address) ? new web3.eth.Contract(abi, address) : null;

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
      const pendingRewardsUsd = rewardsUsdWad
        .filter((_, index) => !achieved[index])
        .reduce((sum, reward) => sum + parseFloat(Web3.utils.fromWei(reward, 'ether')), 0);

      // Get the latest timestamp from portfolios
      const lastClaimTimestamp = Math.max(
        ...portfolios.portfolios.map(p => parseInt(p.lastUpdate || '0'))
      );

      return {
        totalRewardsUsd,
        totalRewardsRama,
        pendingRewardsUsd,
        pendingRewardsRama: pendingRewardsUsd * get().ramaPrice,
        lastClaimTimestamp,
        nextClaimAvailable: lastClaimTimestamp + (24 * 60 * 60), // 24 hours after last claim
        portfolioCount: portfolios.portfolios.length
      };
    } catch (error) {
      console.error('Error fetching accrued reward stats:', error);
      throw error;
    }
  },

  claimAccruedROI: async (fromAddress) => {
    try {
     
      if (!fromAddress) throw new Error('No connected wallet address found');

      const roiDistributor = makeContract(RoiDistributionABI, Contract.RoiDistribution);
      if (!roiDistributor) throw new Error("ROI Distributor contract not available");

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
      const oceanicView = makeContract(OceanicViewABI, Contract["Oceanicview"]);
      if (!oceanicView) {
        console.warn("OceanicView contract not available for getROITotals");
        return { claimedUsd: 0, claimedRama: 0, unclaimedUsd: 0, unclaimedRama: 0 };
      }
      const totals = await oceanicView.methods.getROITotals(address).call();
      return {
        claimedUsd: fromMicroUSD(totals.claimedUsdMicro),
        claimedRama: fromWeiToRama(totals.claimedRamaWei),
        unclaimedUsd: fromMicroUSD(totals.unclaimedUsdMicro),
        unclaimedRama: fromWeiToRama(totals.unclaimedRamaWei),
      };
    } catch (error) {
      console.error("Error fetching ROI totals:", error);
      throw error;
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
        Swal.fire({ icon: 'error', title: 'Gas estimation failed', text: err?.message || 'Check contract & inputs.' });
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
      Swal.fire({ icon: 'error', title: 'Registration error', text: error?.message || 'Unknown error' });
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
      Swal.fire({ icon: 'error', title: 'id/Address  error', text: error?.message || 'Unknown error' });
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
      Swal.fire({ icon: 'error', title: 'Portfolio error', text: error?.message || 'Unknown error' });
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
      return rawIds.map((id) => Number(id));
    } catch (error) {
      console.error("getPortfolioIds error:", error);
      throw error;
    }
  },

  getPortFoliById: async (portId) => {
    try {
      if (!portId) {
        return;
      }
      const oceanQuery = new web3.eth.Contract(
        OceanQueryUpgradeableABI,
        Contract["OceanQueryUpgradeable"]
      );
      const portfolioManager = new web3.eth.Contract(
        PortFolioManagerABI,
        Contract["PortFolioManager"]
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
      };

      applyPortfolioManagerFields(result, pmRaw);
      return result;
    } catch (error) {
      console.error('Portfolio error:', error);
      Swal.fire({ icon: 'error', title: 'Portfolio error', text: error?.message || 'Unknown error' });
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
            .getDashboardData(userAddress, todayDayId)
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

          return {
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
        OceanViewABI,
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
        OceanViewABI,
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
      const oceanicView = makeContract(
        OceanicViewABI,
        Contract["Oceanicview"]
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

      if (oceanicView) {
        try {
          const todayDayId = Math.floor(Date.now() / 86400000);
          const [summaryFromView] = await oceanicView.methods
            .getDashboardData(userAddress, todayDayId)
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
            "OceanicView.getDashboardData (spot income) failed:",
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

      if (oceanViewV2) {
        try {
          const [cardsRaw] = await oceanViewV2.methods
            .getPortfolioCards(userAddress)
            .call();

          const pick = (record, key, index) =>
            record?.[key] != null ? record[key] : record?.[index];

          const mapped = await Promise.all((cardsRaw ?? []).map(async (entry) => {
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
            };

            if (portfolioManager) {
              try {
                const pmRaw = await portfolioManager.methods.getPortfolio(pid).call();
                applyPortfolioManagerFields(normalized, pmRaw);
              } catch (err) {
                console.warn("PortfolioManager.getPortfolio failed:", err?.message || err);
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
        OceanViewABI,
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
        if (Number.isFinite(pid) && pid >= 0) {
          try {
            const progressRaw = await oceanQuery.methods
              .getPortfolioCapProgress(pid)
              .call();
            capProgressBps = Number(progressRaw);
          } catch {
            capProgressBps = null;
          }
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

      const oceanViewV2 = makeContract(
        OceanicViewABI,
        Contract["Oceanicview"]
      );
      const oceanQuery = makeContract(
        OceanQueryUpgradeableABI,
        Contract["OceanQueryUpgradeable"]
      );
      const royaltyManager = makeContract(
        RoyaltyManagerABI,
        Contract["RoyaltyManager"]
      );
      const portfolioManager = makeContract(
        PortFolioManagerABI,
        Contract["PortFolioManager"]
      );

        const CompView = makeContract(
        ComprehensiveViewABI,
        Contract["ComprehensiveView"]
      );

      const slabAchiev = await CompView.methods.getAchievementStatus(userAddress).call();



      const todayDayId = Math.floor(Date.now() / 86400000);
      let summary = null;
      let incomeSummary = null;

      if (oceanViewV2) {
        try {
          const dashboardData = await oceanViewV2.methods
            .getDashboardData(userAddress, todayDayId)
            .call();
          summary = dashboardData?.[0] ?? null;
          incomeSummary = dashboardData?.[1] ?? null;
        } catch (err) {
          console.warn("OceanViewV2.getDashboardData (royalty) failed:", err);
        }
      }

      const [
        royaltyIncomeRaw,
        nextClaimRaw,
        renewalRaw,
        currentLevelRaw,
        canClaimRaw,
      ] = await Promise.all([
        oceanQuery.methods.getRoyaltyIncome(userAddress).call(),
        oceanQuery.methods.getNextRoyaltyClaimDate(userAddress).call(),
        oceanQuery.methods.getRoyaltyRenewalRequirement(userAddress).call(),
        oceanQuery.methods.getCurrentRoyaltyLevel(userAddress).call(),
        oceanQuery.methods.canClaimRoyalty(userAddress).call(),
      ]);

      let royaltyState = null;
      if (royaltyManager) {
        try {
          royaltyState = await royaltyManager.methods
            .royalty(userAddress)
            .call();
        } catch (err) {
          console.warn("RoyaltyManager.royalty call failed:", err);
        }
      }

      const royaltyUsdMicroRaw = incomeSummary?.royaltyUsdMicro ?? royaltyIncomeRaw;
      const royaltyIncomeUsd = fromMicroUSD(royaltyUsdMicroRaw);

      let royaltyIncomeRama = 0;
      if (portfolioManager && royaltyUsdMicroRaw && royaltyUsdMicroRaw !== "0") {
        try {
          const ramaWei = await portfolioManager.methods
            .getPackageValueInRAMA(royaltyUsdMicroRaw)
            .call();
          royaltyIncomeRama = fromWeiToRama(ramaWei);
        } catch (err) {
          console.warn("Royalty USD->RAMA conversion failed:", err);
        }
      }

      const currentLevel = summary
        ? toNumber(summary.royaltyLevel)
        : toNumber(currentLevelRaw);
      const canClaim = summary
        ? Boolean(summary.royaltyCanClaim)
        : Boolean(canClaimRaw);
      const paused = summary
        ? Boolean(summary.royaltyPaused)
        : Boolean(renewalRaw?.paused);

      const paidMonths = summary
        ? toNumber(summary.royaltyPaidMonths)
        : 0;

      const lastPaidMonthEpoch = summary
        ? toNumber(summary.royaltyLastMonthEpoch)
        : toNumber(nextClaimRaw?.[0] ?? 0);
      const nextMonthEpoch = summary
        ? toNumber(summary.royaltyNextMonthEpoch)
        : toNumber(nextClaimRaw?.[1] ?? 0);

      const renewalSnapshotUsd = summary
        ? fromMicroUSD(summary.royaltyRenewalSnapshotUsd)
        : fromMicroUSD(renewalRaw?.lastT ?? 0);
      const renewalRecentUsd = summary
        ? fromMicroUSD(summary.royaltyRecentSnapshotUsd)
        : fromMicroUSD(renewalRaw?.nowT ?? 0);
      const renewalTargetUsd =
        renewalSnapshotUsd > 0 ? renewalSnapshotUsd * 1.1 : 0;
      const renewalRequiredUsd = Math.max(
        0,
        renewalTargetUsd - renewalRecentUsd
      );

      const qualifiedVolumeUsd = summary
        ? fromMicroUSD(summary.qualifiedVolumeUsdMicro)
        : 0;
      const directs = summary ? toNumber(summary.directRefs) : 0;

      const overrideUsdMicro = incomeSummary?.overrideUsdMicro ?? 0;
      const overrideUsd = fromMicroUSD(overrideUsdMicro);
      const pendingRoyaltyUsd = royaltyIncomeUsd;

      let overrideIncomeRama = 0;
      if (portfolioManager && overrideUsdMicro && overrideUsdMicro !== "0") {
        try {
          const ramaWei = await portfolioManager.methods
            .getPackageValueInRAMA(overrideUsdMicro)
            .call();
          overrideIncomeRama = fromWeiToRama(ramaWei);
        } catch (err) {
          console.warn("Override USD->RAMA conversion failed:", err);
        }
      }

      let tiers = [];
      if (royaltyManager) {
        try {
          let tierCount = toNumber(
            await royaltyManager.methods.getTierCount().call()
          );
          if (!Number.isFinite(tierCount) || tierCount <= 0)
            tierCount = ROYALTY_LEVELS_FALLBACK.length;
          const indices = Array.from({ length: tierCount }, (_, i) => i);
          tiers = await Promise.all(
            indices.map(async (i) => {
              const [threshold, salary] = await Promise.all([
                royaltyManager.methods.thresholdUSD(i).call(),
                royaltyManager.methods.salaryUSD(i).call(),
              ]);
              return {
                thresholdUsd: fromMicroUSD(threshold),
                monthlyUsd: fromMicroUSD(salary),
              };
            })
          );
        } catch (err) {
          console.warn("RoyaltyManager tier fetch failed:", err);
        }
      }
      if (!tiers.length) {
        tiers = ROYALTY_LEVELS_FALLBACK.map((level) => ({
          thresholdUsd: fromMicroUSD(level.requiredVolumeUSD),
          monthlyUsd: fromMicroUSD(level.monthlyRoyaltyUSD),
        }));
      }

      let lastPaidTier = 0;
      if (royaltyState) {
        lastPaidTier = toNumber(royaltyState.lastPaidTier ?? royaltyState[0]);
      }

      return {
        slabAchiev,
        currentLevel,
        lastPaidTier,
        canClaim,
        paused,
        royaltyIncomeUsd: pendingRoyaltyUsd,
        royaltyIncomeRama,
        overrideIncomeUsd: overrideUsd,
        overrideIncomeRama,
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
      };
    } catch (error) {
      console.error("getRoyaltyOverview error:", error);
      throw error;
    }
  },

  // =====================================================================
  // Slab Income 
  // =====================================================================

  getSlabIncomeOverview: async (userAddress) => {
    try {
      if (!userAddress) throw new Error("Missing user address");

      const oceanViewV2 = makeContract(
        OceanViewV2ABI,
        Contract["OceanViewV2"]
      );


      const CompView = makeContract(
        ComprehensiveViewABI,
        Contract["ComprehensiveView"]
      );

      const slabAchiev = await CompView.methods.getAchievementStatus(userAddress).call();


      const oceanQuery = makeContract(
        OceanQueryUpgradeableABI,
        Contract["OceanQueryUpgradeable"]
      );
      const slabManager = makeContract(SlabManagerABI, Contract["SlabManager"]);
      const portfolioManager = makeContract(
        PortFolioManagerABI,
        Contract["PortFolioManager"]
      );

      const todayDayId = Math.floor(Date.now() / 86400000);
      let summary = null;
      if (oceanViewV2) {
        try {
          summary = await oceanViewV2.methods.getDashboardData(userAddress, todayDayId).call();

        } catch (err) {
          console.warn("OceanViewV2.getDashboardData (royalty) failed:", err);
        }
      }


      const [
        slabIncomeRaw,
        slabIncomeAvailableRaw,
        sameSlabOverrideRaw,
        // sameSlabEarningsRaw,
        sameSlabPartnersRaw,
        slabClaimStatusRaw,
        slabIndexRaw,
        qualifiedBusinessUsdRaw,
        userStatusRaw,
      ] = await Promise.all([
        oceanQuery.methods.getSlabIncome(userAddress).call(),
        oceanQuery.methods.getSlabIncomeAvailable(userAddress).call(),
        oceanQuery.methods.getSameSlabOverrideIncome(userAddress).call(),
        // oceanQuery.methods.getSameSlabOverrideEarnings(userAddress).call(),
        oceanQuery.methods.getSameSlabPartners(userAddress).call(),
        oceanQuery.methods.getSlabClaimStatus(userAddress).call(),
        slabManager
          ? slabManager.methods.getSlabIndex(userAddress).call()
          : 0,
        slabManager
          ? slabManager.methods.getQualifiedBusinessUSD(userAddress).call()
          : 0,
        oceanQuery.methods.getUserStatus(userAddress).call(),
      ]);


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

  getOneTimeRewardsOverview: async (userAddress) => {
    try {
      if (!userAddress) throw new Error("Missing user address");

      const oceanViewV2 = makeContract(
        OceanicViewABI,
        Contract["Oceanicview"]
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

      const todayDayId = Math.floor(Date.now() / 86400000);
      let summary = null;
      if (oceanViewV2) {
        try {
          const dashboardData = await oceanViewV2.methods
            .getDashboardData(userAddress, todayDayId)
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
              .getAchievedRewardsWithTimes(userAddress)
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

      const qualifiedVolumeFromSlab = fromWadToUsd(qualifiedBusinessRaw ?? 0);
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
      let usedFallback = false;
      for (let idx = 0; idx < milestoneCount; idx += 1) {
        const fallback = fallbackMilestones[idx] ?? null;

        let thresholdUsd = 0;
        if (thresholdsRaw[idx] != null) {
          thresholdUsd = fromWadToUsd(thresholdsRaw[idx]);
        } else if (rewardMilestonesArray[idx] != null) {
          thresholdUsd = fromWadToUsd(rewardMilestonesArray[idx]);
        } else if (fallback) {
          thresholdUsd = Number(fallback.requiredVolumeUSD) / USD_MICRO;
        }

        let rewardUsd = 0;
        if (rewardsRaw[idx] != null) {
          rewardUsd = fromWadToUsd(rewardsRaw[idx]);
        } else if (fallback) {
          rewardUsd = Number(fallback.rewardUSD) / USD_MICRO;
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
        : fromWadToUsd(pendingRewardRaw ?? 0);

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
        Swal.fire({
          icon: 'error',
          title: 'Gas estimation failed',
          text: err?.message || 'Check contract & inputs.',
        });
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
      Swal.fire({ icon: 'error', title: 'Portfolio creation error', text: error?.message || 'Unknown error' });
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
        Swal.fire({ icon: 'error', title: 'Gas estimation failed', text: err?.message || 'Check contract & inputs.' });
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
      Swal.fire({ icon: 'error', title: 'Registration error', text: error?.message || 'Unknown error' });
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
        Swal.fire({ icon: 'error', title: 'Gas estimation failed', text: err?.message || 'Check contract & inputs.' });
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
      Swal.fire({ icon: 'error', title: 'Registration error', text: error?.message || 'Unknown error' });
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
      Swal.fire({ icon: 'error', title: 'GetchStakeInvest error', text: error?.message || 'Unknown error' });
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
      Swal.fire({ icon: 'error', title: 'Portfolio creation error', text: error?.message || 'Unknown error' });
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
        Swal.fire({
          icon: 'error',
          title: 'Gas estimation failed',
          text: err?.message || 'Check contract & inputs.',
        });
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
      Swal.fire({ icon: 'error', title: 'Portfolio creation error', text: error?.message || 'Unknown error' });
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
        Swal.fire({
          icon: 'error',
          title: 'Gas estimation failed',
          text: err?.message || 'Check contract & inputs.',
        });
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
      Swal.fire({ icon: 'error', title: 'CreateSelfPort error', text: error?.message || 'Unknown error' });
      throw error;
    }
  },

  CreateOtherfPort: async (userAddress, toBeActivatedUSer, Amt) => {
    console.log('CreateOtherfPort args:', userAddress, toBeActivatedUSer, Amt);
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
        .createPortfolioForOthers(toBeActivatedUSer, userAddress, Amt)
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
        Swal.fire({
          icon: 'error',
          title: 'Gas estimation failed',
          text: err?.message || 'Check contract & inputs.',
        });
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
      Swal.fire({ icon: 'error', title: 'CreateOtherfPort error', text: error?.message || 'Unknown error' });
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
        Swal.fire({
          icon: 'error',
          title: 'Gas estimation failed',
          text: err?.message || 'Check contract & inputs.',
        });
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
      Swal.fire({ icon: 'error', title: 'SafeSelfPort error', text: error?.message || 'Unknown error' });
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
        Swal.fire({
          icon: 'error',
          title: 'Gas estimation failed',
          text: err?.message || 'Check contract & inputs.',
        });
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
      Swal.fire({ icon: 'error', title: 'CreateSelfPort error', text: error?.message || 'Unknown error' });
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
        Swal.fire({
          icon: 'error',
          title: 'Gas estimation failed',
          text: err?.message || 'Check contract & inputs.',
        });
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
      Swal.fire({ icon: 'error', title: 'Registration error', text: error?.message || 'Unknown error' });
      throw error;
    }
  }

}));
