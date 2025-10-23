// ocean_portfolios.js
// Portfolio creation runner for already registered users
// Usage:
//   node scripts/ocean_portfolios.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { ethers } from 'ethers';

dotenv.config();

// -----------------------------------------------------------------------------//
// Paths & constants
// -----------------------------------------------------------------------------//
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const CONFIG_DIR = path.join(ROOT_DIR, 'config');

const KEYS_FILE = path.join(CONFIG_DIR, 'privateKeys.json');
const REGISTER_JSON = path.join(DATA_DIR, 'ocean_registrations.json');
const PORTFOLIO_JSON = path.join(DATA_DIR, 'ocean_portfolios.json');
const PORTFOLIO_CSV = path.join(DATA_DIR, 'ocean_portfolios.csv');

const RPC_URL = process.env.RPC_URL || 'https://blockchain.ramestta.com';
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

const PORTFOLIOS_PER_USER = 4;
const PORT_MIN_USD = Number(process.env.PORTFOLIO_MIN_USD ?? 10);
const PORT_MAX_USD = Number(process.env.PORTFOLIO_MAX_USD ?? 800);

// -----------------------------------------------------------------------------//
// Minimal ABIs
// -----------------------------------------------------------------------------//
const ABI_PortfolioManager = [
  'function createPortfolio() payable returns (uint256 pid)',
  'function getPackageValueInRAMA(uint256 usdMicro) view returns (uint256)',
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
function randUSD(min = 10, max = 800) {
  const a = Math.floor(Math.max(min, 1));
  const b = Math.floor(Math.max(max, a));
  return Math.floor(Math.random() * (b - a + 1)) + a;
}
function usdToMicro(usdNumber) {
  return BigInt(Math.round(usdNumber * 1_000_000));
}
async function withRetry(label, fn, retries = 5, baseDelay = 1500) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = err?.reason || err?.shortMessage || err?.message || String(err);
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
    entry.portfolios.forEach((p, idx) => {
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

// -----------------------------------------------------------------------------//
// Core logic
// -----------------------------------------------------------------------------//
async function main() {
  ensureDir(DATA_DIR);
  ensureCsvHeader();

  let registrationData = loadJSON(REGISTER_JSON);
  if (!registrationData || !registrationData.users) {
    console.error('Registration data not found. Run ocean_sim.js first.');
    process.exit(1);
  }

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

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const oracle = new ethers.Contract(ADDR.PriceOracle, ABI_PriceOracle, provider);
  const pm = new ethers.Contract(ADDR.PortfolioManager, ABI_PortfolioManager, provider);

  async function usdToRamaWei(usdNum) {
    const micro = usdToMicro(usdNum);
    try {
      const amt = await pm.getPackageValueInRAMA(micro);
      if (amt > 0n) return amt;
    } catch (err) {
      console.warn(
        'getPackageValueInRAMA fallback to oracle:',
        err?.message || err,
      );
    }
    const fallback = await oracle.usdToRama(micro);
    if (fallback <= 0n) throw new Error('usdToRama returned 0');
    return fallback;
  }

  async function createPortfolioForUser(keyIndex, usdAmount) {
    if (keyIndex < 0 || keyIndex >= privKeys.length) {
      throw new Error(`Invalid key index ${keyIndex}`);
    }
    const wallet = new ethers.Wallet(privKeys[keyIndex], provider);
    const ramaWei = await withRetry('usdToRama', () => usdToRamaWei(usdAmount));
    const pmSigner = pm.connect(wallet);

    const tx = await withRetry('createPortfolio', async () => {
      const gas = await pmSigner.createPortfolio.estimateGas({
        value: ramaWei,
      });
      return pmSigner.createPortfolio({
        value: ramaWei,
        gasLimit: gas + 120000n,
      });
    });

    console.log(
      `Portfolio TX: ${tx.hash} user=${await wallet.getAddress()} usd=$${usdAmount} ramaWei=${ramaWei}`,
    );
    const receipt = await tx.wait();
    if (receipt.status !== 1) throw new Error('createPortfolio transaction reverted');
    await delay(1200);
    return { ramaWei: ramaWei.toString(), txHash: tx.hash };
  }

  function savePortfolios() {
    portfoliosData.meta.lastUpdated = humanNow();
    saveJSON(PORTFOLIO_JSON, portfoliosData);
    writePortfolioCsv(portfoliosData);
  }

  function pickNextTarget() {
    const latest = loadJSON(REGISTER_JSON, null);
    if (latest && latest.users) {
      registrationData = latest;
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

  while (true) {
    try {
      const target = pickNextTarget();
      if (!target) {
        console.log('All registered users have required portfolios. Sleeping 6s...');
        await delay(6000);
        continue;
      }

      const { addr, info, done } = target;
      const usdAmount = randUSD(PORT_MIN_USD, PORT_MAX_USD);
      try {
        const { ramaWei, txHash } = await createPortfolioForUser(
          info.keyIndex,
          usdAmount,
        );

        const entry = portfoliosData.users[addr];
        entry.portfolios.push({
          usd: usdAmount,
          ramaWei,
          txHash,
          timestamp: humanNow(),
        });
        savePortfolios();

        console.log(
          `Portfolio ${done + 1}/${PORTFOLIOS_PER_USER} completed for ${addr}.`,
        );
      } catch (err) {
        const msg = err?.reason || err?.shortMessage || err?.message || String(err);
        console.error(`Portfolio creation failed for ${addr}: ${msg}`);
        await delay(4000);
      }

      await delay(800);
    } catch (err) {
      console.error('Loop error:', err?.message || err);
      await delay(5000);
    }
  }
}

main().catch((err) => {
  console.error('Fatal error:', err?.message || err);
  process.exit(1);
});
