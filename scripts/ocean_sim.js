// ocean_sim.js
// Registration orchestrator (5x5 matrix) for Ocean DeFi
// Usage:
//   node scripts/ocean_sim.js --start
//   node scripts/ocean_sim.js --resume

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
const REGISTER_STATE_FILE = path.join(DATA_DIR, 'ocean_register_state.json');
const REGISTER_JSON = path.join(DATA_DIR, 'ocean_registrations.json');
const REGISTER_CSV = path.join(DATA_DIR, 'ocean_registrations.csv');

const RPC_URLS = [
  process.env.RPC_URL || 'https://blockchain.ramestta.com',
  process.env.RPC_URL_2 || 'https://blockchain2.ramestta.com',
  process.env.RPC_URL_3 || 'https://testrpc.bidua.in',
].filter(url => url && url.startsWith('http'));

console.log('Available RPC URLs:', RPC_URLS);

const ROOT_ADDR = (process.env.ROOT_ADDRESS || '').trim();
if (!ethers.isAddress(ROOT_ADDR)) {
  console.error('ERROR: Set ROOT_ADDRESS in .env to the UserRegistry root address');
  process.exit(1);
}

const ADDR = {
  CoreConfig: process.env.CORECONFIG,
  PriceOracle: process.env.PRICEORACLE,
  PortfolioManager: process.env.PORTFOLIOMANAGER,
  UserRegistry: process.env.USERREGISTRY,
};
for (const [k, v] of Object.entries(ADDR)) {
  if (!ethers.isAddress(v || '')) {
    console.error(`ERROR: ${k} address missing/invalid in .env`);
    process.exit(1);
  }
}

const MAX_CHILDREN = 5;
const DEFAULT_REG_MAX_USD = Number(process.env.REGISTER_MAX_USD ?? 300);

// -----------------------------------------------------------------------------//
// Minimal ABIs (only what we need)
// -----------------------------------------------------------------------------//
const ABI_PriceOracle = [
  'function usdToRama(uint256 usdMicro) view returns (uint256)',
  'function ramaPriceInUSD() view returns (uint256)',
];
const ABI_PortfolioManager = [
  'function RegisterAndActivate(address referrer) payable returns (uint256 pid)',
  'function getPackageValueInRAMA(uint256 usdMicro) view returns (uint256)',
];
const ABI_CoreConfig = ['function getUSDMinStake() view returns (uint256)'];

// -----------------------------------------------------------------------------//
// Helpers
// -----------------------------------------------------------------------------//
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
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
function randUSD(min = 10, max = 300) {
  if (max < min) max = min;
  const a = Math.floor(min);
  const b = Math.floor(max);
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
  if (!fs.existsSync(REGISTER_CSV)) {
    const header =
      'address,referrer,key_index,usd_amount,rama_wei,tx_hash,timestamp\n';
    fs.writeFileSync(REGISTER_CSV, header);
  }
}

function writeRegistrationsCsv(regData) {
  const lines = [
    'address,referrer,key_index,usd_amount,rama_wei,tx_hash,timestamp',
  ];
  for (const [addr, info] of Object.entries(regData.users)) {
    if (!info.activation) continue;
    const act = info.activation;
    lines.push(
      [
        addr,
        info.referrer || '',
        info.keyIndex,
        act.usd,
        act.ramaWei,
        act.txHash,
        act.timestamp,
      ].join(','),
    );
  }
  fs.writeFileSync(REGISTER_CSV, lines.join('\n') + '\n');
}

// -----------------------------------------------------------------------------//
// Core logic
// -----------------------------------------------------------------------------//
async function main() {
  const args = process.argv.slice(2);
  const mode = args.includes('--start')
    ? 'start'
    : args.includes('--resume')
      ? 'resume'
      : null;
  if (!mode) {
    console.log('Usage: node scripts/ocean_sim.js --start | --resume');
    process.exit(1);
  }

  ensureDir(DATA_DIR);
  ensureCsvHeader();

  // Load private keys
  const rawKeys = loadJSON(KEYS_FILE);
  if (!Array.isArray(rawKeys) || rawKeys.length < 2) {
    console.error('privateKeys.json must be an array of >=2 keys (strings or objects)');
    process.exit(1);
  }
  const privKeys = rawKeys.map((item) => {
    if (typeof item === 'string') return ensureHexKey(item);
    if (item && typeof item === 'object' && item.privateKey)
      return ensureHexKey(item.privateKey);
    throw new Error('privateKeys.json item missing "privateKey" or not a string');
  });

  // Create provider with fallback RPC URLs
  async function createProviderWithFallback() {
    for (let i = 0; i < RPC_URLS.length; i++) {
      try {
        console.log(`Trying RPC ${i + 1}: ${RPC_URLS[i]}`);
        const provider = new ethers.JsonRpcProvider(RPC_URLS[i]);
        // Test the connection
        await provider.getNetwork();
        console.log(`✅ Connected to RPC ${i + 1}: ${RPC_URLS[i]}`);
        return provider;
      } catch (error) {
        console.warn(`❌ RPC ${i + 1} failed: ${error.message}`);
        if (i === RPC_URLS.length - 1) {
          throw new Error('All RPC URLs failed to connect');
        }
      }
    }
  }

  const provider = await createProviderWithFallback();
  const oracle = new ethers.Contract(ADDR.PriceOracle, ABI_PriceOracle, provider);
  const pm = new ethers.Contract(ADDR.PortfolioManager, ABI_PortfolioManager, provider);
  const cfg = new ethers.Contract(ADDR.CoreConfig, ABI_CoreConfig, provider);

  // Load or initialize state
  let state;
  let registrations = loadJSON(REGISTER_JSON, null);
  if (mode === 'resume') {
    state = loadJSON(REGISTER_STATE_FILE);
    if (!state) {
      console.error('No ocean_register_state.json found to resume from.');
      process.exit(1);
    }
    if (!registrations) {
      console.error('Registration JSON missing; cannot resume.');
      process.exit(1);
    }
    console.log('Resuming from saved state.');
  } else {
    state = {
      version: 1,
      rpc: provider.connection.url, // Use the successfully connected RPC URL
      root: ROOT_ADDR,
      queue: [],
      users: {},
      nextKeyIndex: 1,
      minStakeUSD: 10,
      startedAt: humanNow(),
      lastUpdated: humanNow(),
    };
    state.queue.push({ addr: ROOT_ADDR, keyIndex: -1, childrenMade: 0 });
    state.users[ROOT_ADDR] = {
      keyIndex: -1,
      childrenMade: 0,
      firstSeen: humanNow(),
      referrer: null,
    };

    registrations = {
      meta: {
        root: ROOT_ADDR,
        createdAt: humanNow(),
        lastUpdated: humanNow(),
      },
      users: {
        [ROOT_ADDR]: {
          referrer: null,
          keyIndex: -1,
          activation: null,
          registeredAt: humanNow(),
        },
      },
    };

    saveJSON(REGISTER_STATE_FILE, state);
    saveJSON(REGISTER_JSON, registrations);
    writeRegistrationsCsv(registrations);
    console.log('Starting fresh. State initialized.');
  }

  // Discover min stake
  try {
    const usdMinStakeMicro = await withRetry('getUSDMinStake', () =>
      cfg.getUSDMinStake(),
    );
    if (usdMinStakeMicro > 0n) {
      state.minStakeUSD = Number(usdMinStakeMicro) / 1_000_000;
    }
  } catch (err) {
    console.log(
      'Warning: could not read getUSDMinStake, using default',
      state.minStakeUSD,
    );
  }
  const minUsd = Math.max(Math.ceil(state.minStakeUSD || 10), 10);
  const maxUsd = Math.max(minUsd, DEFAULT_REG_MAX_USD);
  console.log(`Min stake (USD): $${minUsd}. Activation range: $${minUsd} - $${maxUsd}.`);

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
    const amtFallback = await oracle.usdToRama(micro);
    if (amtFallback <= 0n) throw new Error('usdToRama returned 0');
    return amtFallback;
  }

  async function doRegisterAndActivate(childKeyIndex, referrer, usdAmount) {
    if (childKeyIndex >= privKeys.length) {
      throw new Error('Ran out of private keys!');
    }
    const wallet = new ethers.Wallet(privKeys[childKeyIndex], provider);
    const childAddr = await wallet.getAddress();
    const ramaWei = await withRetry('usdToRama', () => usdToRamaWei(usdAmount));
    const pmSigner = pm.connect(wallet);

    const tx = await withRetry('RegisterAndActivate', async () => {
      const gas = await pmSigner.RegisterAndActivate.estimateGas(referrer, {
        value: ramaWei,
      });
      return pmSigner.RegisterAndActivate(referrer, {
        value: ramaWei,
        gasLimit: gas + 120000n,
      });
    });

    console.log(
      `Register TX: ${tx.hash} child=${childAddr} ref=${referrer} usd=$${usdAmount} ramaWei=${ramaWei}`,
    );
    const receipt = await tx.wait();
    if (receipt.status !== 1) throw new Error('RegisterAndActivate transaction reverted');
    await delay(1500);
    return { childAddr, ramaWei: ramaWei.toString(), txHash: tx.hash };
  }

  function saveState() {
    state.lastUpdated = humanNow();
    saveJSON(REGISTER_STATE_FILE, state);
  }

  function recordRegistration(childAddr, referrer, keyIndex, usdAmount, ramaWei, txHash) {
    const timestamp = humanNow();
    registrations.meta.lastUpdated = timestamp;
    registrations.users[childAddr] = {
      referrer,
      keyIndex,
      activation: {
        usd: usdAmount,
        ramaWei,
        txHash,
        timestamp,
      },
      registeredAt: timestamp,
    };
    saveJSON(REGISTER_JSON, registrations);
    writeRegistrationsCsv(registrations);
  }

  async function processOneParent() {
    const idx = state.queue.findIndex((entry) => entry.childrenMade < MAX_CHILDREN);
    if (idx === -1) {
      return false;
    }

    const parent = state.queue[idx];
    const parentAddr = parent.addr;
    const childKeyIndex = state.nextKeyIndex++;
    if (childKeyIndex >= privKeys.length) {
      console.log('Out of private keys. Halting.');
      saveState();
      return false;
    }

    const usdAmount = randUSD(minUsd, maxUsd);
    try {
      const { childAddr, ramaWei, txHash } = await doRegisterAndActivate(
        childKeyIndex,
        parentAddr,
        usdAmount,
      );

      recordRegistration(childAddr, parentAddr, childKeyIndex, usdAmount, ramaWei, txHash);

      state.users[childAddr] = {
        keyIndex: childKeyIndex,
        childrenMade: 0,
        firstSeen: humanNow(),
        referrer: parentAddr,
      };
      state.queue.push({
        addr: childAddr,
        keyIndex: childKeyIndex,
        childrenMade: 0,
      });
      parent.childrenMade += 1;
      saveState();

      console.log(
        `Linked ${childAddr} under ${parentAddr} (${parent.childrenMade}/${MAX_CHILDREN}). nextKey=${state.nextKeyIndex}`,
      );
    } catch (err) {
      const msg = err?.reason || err?.shortMessage || err?.message || String(err);
      console.error(
        `Registration failed for parent ${parentAddr} with keyIndex=${childKeyIndex}: ${msg}`,
      );
      saveState();
      console.log('Skipping this child and moving on...');
    }
    return true;
  }

  process.on('SIGINT', () => {
    console.log('\nSIGINT received. Saving state and exiting...');
    saveState();
    saveJSON(REGISTER_JSON, registrations);
    writeRegistrationsCsv(registrations);
    process.exit(0);
  });

  console.log('--- Ocean registration 5x5 BFS orchestrator running ---');
  console.log('Press Ctrl+C to stop. Use --resume to continue later.');

  while (true) {
    try {
      const didWork = await processOneParent();
      if (!didWork) {
        console.log('All parents currently saturated. Sleeping 5s...');
        await delay(5000);
      } else {
        await delay(800);
      }
    } catch (err) {
      console.error('Loop error:', err?.message || err);
      await delay(4000);
    }
  }
}

main().catch((err) => {
  console.error('Fatal error:', err?.message || err);
  process.exit(1);
});
