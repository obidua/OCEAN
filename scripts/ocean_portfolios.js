// ocean_portfolios.js
// Portfolio creation runner for already registered users
// Usage:
//   node scripts/ocean_portfolios.js
//   node scripts/ocean_portfolios.js --resume

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import { getRPCUrls, getNetworkConfig } from './rpcConfig-node.js';

// -----------------------------------------------------------------------------//
// Resolve project root and load .env from root (../.env relative to /scripts)
// -----------------------------------------------------------------------------//
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
dotenv.config({ path: path.join(ROOT_DIR, '.env') });

// -----------------------------------------------------------------------------//
// CLI arguments
// -----------------------------------------------------------------------------//
const RESUME_MODE = process.argv.includes('--resume');

// -----------------------------------------------------------------------------//
// Paths & constants
// -----------------------------------------------------------------------------//
const DATA_DIR = path.join(ROOT_DIR, 'data');
const CONFIG_DIR = path.join(ROOT_DIR, 'config');

const KEYS_FILE = path.join(CONFIG_DIR, 'privateKeys.json');
const REGISTER_JSON = path.join(DATA_DIR, 'ocean_registrations.json');
const PORTFOLIO_JSON = path.join(DATA_DIR, 'ocean_portfolios.json');
const PORTFOLIO_CSV = path.join(DATA_DIR, 'ocean_portfolios.csv');

// ---------- ENV CONFIG - Now using centralized RPC configuration ----------
const RPC_URLS = getRPCUrls();
const networkConfig = getNetworkConfig();

console.log('📡 Portfolio Script Network Configuration:');
console.log(`   Network: ${networkConfig.networkName}`);
console.log(`   Chain ID: ${networkConfig.chainId}`);
console.log(`   Available RPC URLs: ${RPC_URLS.length}`);
RPC_URLS.forEach((url, index) => {
  console.log(`     ${index + 1}. ${url}`);
});

const ADDR = {
  PortfolioManager: process.env.PORTFOLIOMANAGER,
  PriceOracle: process.env.PRICEORACLE,
};
for (const [k, v] of Object.entries(ADDR)) {
  if (!ethers.isAddress(v || '')) {
    console.error(`ERROR: ${k} address missing/invalid in .env`);
    process.exit(1);
  }
}

const PORTFOLIOS_PER_USER = 4; // create 4 additional portfolios per user
const PORT_MIN_USD = Number(process.env.PORTFOLIO_MIN_USD ?? 10);
const PORT_MAX_USD = Number(process.env.PORTFOLIO_MAX_USD ?? 5000);
const INCREASE_MIN_PCT = 20; // minimum 20% increase
const INCREASE_MAX_PCT = 40; // maximum 40% increase

// -----------------------------------------------------------------------------//
// Minimal ABIs (only what we need)
// -----------------------------------------------------------------------------//
const ABI_PortfolioManager = [
  // tx
  'function createPortfolio() payable returns (uint256 pid)',

  // helpers for price mapping
  'function getPackageValueInRAMA(uint256 usdMicro) view returns (uint256)',

  // on-chain reads to fetch last portfolio amounts
  'function portfoliosOf(address user) view returns (uint256[])',
  `function getPortfolio(uint256 pid) view returns (
      tuple(
        uint128 principal,
        uint128 principalUsd,
        uint128 credited,
        uint64 createdAt,
        uint64 lastAccrual,
        uint64 frozenUntil,
        bool booster,
        uint8 tier,
        uint8 capPct,
        address owner,
        address activatedBy,
        uint64 boosterActivationDate,
        bool isCapped,
        bool isClosed,
        uint256 cappedAt,
        uint256 closedAt,
        uint256 totalReceivedBoosterROI,
        bool isActivatedFromSafeWallet
      )
    )`,
];
const ABI_PriceOracle = [
  'function usdToRama(uint256 usdMicro) view returns (uint256)',
];

// -----------------------------------------------------------------------------//
// Helpers
// -----------------------------------------------------------------------------//
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
function loadJSON(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}
function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
function ensureHexKey(k) {
  if (typeof k !== 'string') throw new Error('private key must be string');
  let key = k.trim();
  if (!key.startsWith('0x')) key = '0x' + key;
  return key;
}
function humanNow() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}
function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}
function usdToMicro(usdNumber) {
  return BigInt(Math.round(usdNumber * 1_000_000));
}
function extractReason(err) {
  return err?.reason || err?.shortMessage || err?.message || String(err);
}

function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

async function withRetry(label, fn, retries = 5, baseDelay = 1500) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = extractReason(err);
      const wait = baseDelay * (i + 1);
      console.log(`[${label}] attempt ${i + 1} failed: ${msg}; retrying in ${wait}ms`);
      await delay(wait);
    }
  }
  throw lastErr;
}

function ensureCsvHeader() {
  if (!fs.existsSync(PORTFOLIO_CSV)) {
    const header =
      'address,referrer,key_index,portfolio_index,usd_amount,rama_wei,tx_hash,timestamp\n';
    fs.writeFileSync(PORTFOLIO_CSV, header);
  }
}

function writePortfolioCsv(portData) {
  const lines = [
    'address,referrer,key_index,portfolio_index,usd_amount,rama_wei,tx_hash,timestamp',
  ];
  for (const [addr, entry] of Object.entries(portData.users)) {
    (entry.portfolios || []).forEach((p, idx) => {
      lines.push(
        [
          addr,
          entry.referrer || '',
          entry.keyIndex,
          idx + 1,
          p.usd,
          p.ramaWei,
          p.txHash,
          p.timestamp,
        ].join(','),
      );
    });
  }
  fs.writeFileSync(PORTFOLIO_CSV, lines.join('\n') + '\n');
}

/** Return the last portfolio record for this user, or null */
function lastPortfolio(entry) {
  const list = entry?.portfolios || [];
  if (list.length === 0) return null;
  return list[list.length - 1];
}

/** Get the user's activation USD from registrations (first portfolio baseline). */
function activationUsd(registrationData, addr) {
  const rec = registrationData.users?.[addr];
  if (!rec || !rec.activation) return null;
  const u = rec.activation.usd;
  return typeof u === 'number' ? u : Number(u ?? 0) || null;
}

// -----------------------------------------------------------------------------//
// Core logic
// -----------------------------------------------------------------------------//
async function main() {
  ensureDir(DATA_DIR);
  ensureCsvHeader();

  // Load registration data (contains activation.usd per user)
  let registrationData = loadJSON(REGISTER_JSON);
  if (!registrationData || !registrationData.users) {
    console.error('Registration data not found. Run ocean_sim.js first.');
    process.exit(1);
  }

  // Load / init portfolio data
  let portfoliosData = loadJSON(PORTFOLIO_JSON, null);
  if (!portfoliosData) {
    portfoliosData = {
      meta: {
        createdAt: humanNow(),
        lastUpdated: humanNow(),
        source: path.basename(REGISTER_JSON),
      },
      users: {},
    };
    saveJSON(PORTFOLIO_JSON, portfoliosData);
    writePortfolioCsv(portfoliosData);
  }

  // Load keys
  const rawKeys = loadJSON(KEYS_FILE);
  if (!Array.isArray(rawKeys) || rawKeys.length === 0) {
    console.error('privateKeys.json must be an array of keys');
    process.exit(1);
  }
  const privKeys = rawKeys.map((item) => {
    if (typeof item === 'string') return ensureHexKey(item);
    if (item && typeof item === 'object' && item.privateKey)
      return ensureHexKey(item.privateKey);
    throw new Error('privateKeys.json item missing "privateKey" or not a string');
  });

  // Create ethers provider using centralized RPC configuration
  let provider = null;
  for (let i = 0; i < RPC_URLS.length; i++) {
    try {
      console.log(`🔗 Portfolio Script: Trying RPC ${i + 1}: ${RPC_URLS[i]}`);
      provider = new ethers.JsonRpcProvider(RPC_URLS[i]);
      await provider.getNetwork(); // Test connection
      console.log(`✅ Portfolio Script: Connected to RPC ${i + 1}`);
      break;
    } catch (error) {
      console.warn(`❌ Portfolio Script: RPC ${i + 1} failed:`, error.message);
      if (i === RPC_URLS.length - 1) {
        throw new Error('All RPC URLs failed to connect');
      }
    }
  }

  // Contracts
  const oracle = new ethers.Contract(ADDR.PriceOracle, ABI_PriceOracle, provider);
  const pm = new ethers.Contract(ADDR.PortfolioManager, ABI_PortfolioManager, provider);

  async function usdToRamaWei(usdNum) {
    const micro = usdToMicro(usdNum);
    try {
      const amt = await pm.getPackageValueInRAMA(micro);
      if (amt > 0n) return amt;
    } catch (err) {
      console.warn('getPackageValueInRAMA fallback to oracle:', extractReason(err));
    }
    const fallback = await oracle.usdToRama(micro);
    if (fallback <= 0n) throw new Error('usdToRama returned 0');
    return fallback;
  }

  /** Read the last portfolio's USD (micro -> number) from on-chain for a user; null if none. */
  async function onChainLastUsd(userAddress) {
    const pids = await pm.portfoliosOf(userAddress);
    if (!Array.isArray(pids) || pids.length === 0) return null;

    // Use the last pid in the array
    const lastPid = pids[pids.length - 1];
    const pf = await pm.getPortfolio(lastPid);

    // principalUsd is uint128 (6 decimals = micro USD)
    const principalUsdMicro = pf.principalUsd !== undefined ? pf.principalUsd : pf[1];

    const usd = Number(principalUsdMicro) / 1_000_000;
    return isFinite(usd) ? usd : null;
  }

  /**
   * Calculate the next portfolio amount based on the last portfolio
   * Increases by 20-40% plus a random amount
   */
  function calculateNextPortfolioAmount(lastUsd) {
    // Calculate increase percentage (20-40%)
    const increasePct = randomInRange(INCREASE_MIN_PCT, INCREASE_MAX_PCT);
    
    // Calculate base increase
    const baseIncrease = lastUsd * (increasePct / 100);
    
    // Add random amount (0-10% of last USD)
    const randomAmount = randomInRange(0, lastUsd * 0.1);
    
    // Calculate new amount
    const newAmount = lastUsd + baseIncrease + randomAmount;
    
    // Round to 2 decimal places
    return Math.round(newAmount * 100) / 100;
  }

  /**
   * For a user:
   * - Get the last portfolio USD from on-chain
   * - Calculate next 4 portfolio amounts with 20-40% increases
   * - Create portfolios sequentially
   */
  async function createNextPortfolio(addr, entry, keyIndex) {
    // Get on-chain last portfolio
    const onchainLast = await onChainLastUsd(addr);
    
    if (!onchainLast) {
      // If no on-chain portfolio, try to get from local data or activation
      const localLastUsd = lastPortfolio(entry)?.usd ?? null;
      const actUsd = activationUsd(registrationData, addr);
      
      const baseline = localLastUsd || actUsd;
      if (!baseline) {
        throw new Error(
          `No portfolios found for ${addr}. User must activate first.`
        );
      }
      
      // Use baseline for first portfolio
      const candidateUsd = Math.max(PORT_MIN_USD, baseline);
      return await createPortfolioWithAmount(addr, candidateUsd, keyIndex);
    }

    // Calculate next portfolio amount (20-40% increase + random)
    let candidateUsd = calculateNextPortfolioAmount(onchainLast);
    
    // Ensure it's at least the minimum increase over last portfolio
    const minRequired = onchainLast + 1;
    if (candidateUsd < minRequired) {
      candidateUsd = minRequired;
    }
    
    // Check if we've exceeded the max
    if (candidateUsd > PORT_MAX_USD) {
      throw new Error(
        `Next portfolio amount ($${candidateUsd.toFixed(2)}) exceeds PORT_MAX_USD ($${PORT_MAX_USD}). ` +
        `Increase PORTFOLIO_MAX_USD in .env or skip this user.`
      );
    }

    console.log(
      `Creating portfolio for ${addr}: last=$${onchainLast.toFixed(2)}, new=$${candidateUsd.toFixed(2)} (+${((candidateUsd - onchainLast) / onchainLast * 100).toFixed(1)}%)`
    );

    return await createPortfolioWithAmount(addr, candidateUsd, keyIndex);
  }

  /**
   * Create a portfolio with a specific USD amount
   */
  async function createPortfolioWithAmount(addr, usdAmount, keyIndex) {
    const ramaWei = await usdToRamaWei(usdAmount);
    const wallet = new ethers.Wallet(privKeys[keyIndex], provider);
    const pmSigner = pm.connect(wallet);

    console.log(
      `Creating portfolio: ${addr}, USD=$${usdAmount.toFixed(2)}, ramaWei=${ramaWei}`
    );

    try {
      const gas = await pmSigner.createPortfolio.estimateGas({ value: ramaWei });
      const tx = await pmSigner.createPortfolio({
        value: ramaWei,
        gasLimit: gas + 120000n,
      });

      console.log(
        `Portfolio TX: ${tx.hash} user=${addr} usd=$${usdAmount.toFixed(2)} ramaWei=${ramaWei}`
      );
      
      const receipt = await tx.wait();
      if (receipt.status !== 1) throw new Error('createPortfolio transaction reverted');

      await delay(1200);
      return { usd: usdAmount, ramaWei: ramaWei.toString(), txHash: tx.hash };
    } catch (err) {
      const reason = extractReason(err);
      throw new Error(`Portfolio creation failed: ${reason}`);
    }
  }

  function savePortfolios() {
    portfoliosData.meta.lastUpdated = humanNow();
    saveJSON(PORTFOLIO_JSON, portfoliosData);
    writePortfolioCsv(portfoliosData);
  }

  function pickNextTarget() {
    const latest = loadJSON(REGISTER_JSON, null);
    if (latest && latest.users) {
      registrationData = latest; // refresh in case sim added more
    }
    const rootAddr =
      registrationData.meta?.root || (process.env.ROOT_ADDRESS || '').trim();
    const entries = Object.entries(registrationData.users)
      .filter(([addr]) => {
        if (!rootAddr) return true;
        return addr.toLowerCase() !== rootAddr.toLowerCase();
      })
      .filter(([, info]) => info && typeof info.keyIndex === 'number' && info.keyIndex >= 0)
      .sort(([, a], [, b]) => {
        const ta = a.activation?.timestamp || a.registeredAt || '';
        const tb = b.activation?.timestamp || b.registeredAt || '';
        return ta.localeCompare(tb);
      });

    for (const [addr, info] of entries) {
      if (!portfoliosData.users[addr]) {
        portfoliosData.users[addr] = {
          referrer: info.referrer || null,
          keyIndex: info.keyIndex,
          portfolios: [],
        };
      }
      const done = portfoliosData.users[addr].portfolios.length;
      if (done < PORTFOLIOS_PER_USER) {
        return { addr, info, done };
      }
    }
    return null;
  }

  process.on('SIGINT', () => {
    console.log('\nSIGINT received. Saving portfolio data and exiting...');
    savePortfolios();
    process.exit(0);
  });

  console.log('--- Ocean portfolio creator is running ---');
  console.log(
    `Target: ${PORTFOLIOS_PER_USER} portfolios/user, range $${PORT_MIN_USD} - $${PORT_MAX_USD}.`,
  );
  console.log(
    `Increase strategy: ${INCREASE_MIN_PCT}-${INCREASE_MAX_PCT}% + random amount per portfolio`
  );
  console.log(`Resume mode: ${RESUME_MODE ? 'ON' : 'OFF'}`);

  while (true) {
    try {
      const target = pickNextTarget();
      if (!target) {
        console.log('All registered users have required portfolios. Sleeping 6s...');
        await delay(6000);
        continue;
      }

      const { addr, info, done } = target;

      // Ensure entry exists
      if (!portfoliosData.users[addr]) {
        portfoliosData.users[addr] = {
          referrer: info.referrer || null,
          keyIndex: info.keyIndex,
          portfolios: [],
        };
      }
      const entry = portfoliosData.users[addr];

      try {
        const { usd, ramaWei, txHash } = await createNextPortfolio(
          addr,
          entry,
          info.keyIndex
        );

        entry.portfolios.push({
          usd,
          ramaWei,
          txHash,
          timestamp: humanNow(),
        });
        savePortfolios();

        console.log(
          `✅ Portfolio ${done + 1}/${PORTFOLIOS_PER_USER} completed for ${addr}. USD=$${usd.toFixed(2)}`
        );
      } catch (err) {
        const msg = extractReason(err);
        console.error(`❌ Portfolio creation failed for ${addr}: ${msg}`);
        await delay(4000);
      }

      await delay(800);
    } catch (err) {
      console.error('Loop error:', extractReason(err));
      await delay(5000);
    }
  }
}

main().catch((err) => {
  console.error('Fatal error:', extractReason(err));
  process.exit(1);
});
