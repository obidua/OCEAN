// ocean_team_report.js
// Build a team structure report from ocean_users.json with on-chain User IDs
// Outputs:
//   - ocean_team_report.json      (hierarchical tree per user)
//   - ocean_team_report.csv       (summary per user)
//   - ocean_team_directs.csv      (one row per (user, direct) pair)
//
// Usage: node scripts/ocean_team_report.js
//
// Requires:
//   - ./.env with RPC_URL and USERREGISTRY
//   - ./data/ocean_users.json (created by ocean_sim.js)

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import { getRPCUrls, callWithRPCFailover, getNetworkConfig } from './rpcConfig-node.js';

dotenv.config();

// ---------- Paths ----------
const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data');
const USERS_JSON_IN   = path.join(DATA_DIR, 'ocean_users.json');
const REPORT_JSON_OUT = path.join(DATA_DIR, 'ocean_team_report.json');
const REPORT_CSV_OUT  = path.join(DATA_DIR, 'ocean_team_report.csv');
const DIRECTS_CSV_OUT = path.join(DATA_DIR, 'ocean_team_directs.csv');

// ---------- ENV - Now using centralized RPC configuration ----------
const RPC_URLS = getRPCUrls();
const networkConfig = getNetworkConfig();

console.log('📡 Network Configuration:');
console.log(`   Network: ${networkConfig.networkName}`);
console.log(`   Chain ID: ${networkConfig.chainId}`);
console.log(`   Available RPC URLs: ${RPC_URLS.length}`);
RPC_URLS.forEach((url, index) => {
  console.log(`     ${index + 1}. ${url}`);
});

const USERREGISTRY = process.env.USERREGISTRY;
if (!ethers.isAddress(USERREGISTRY || '')) {
  console.error('ERROR: USERREGISTRY missing/invalid in .env');
  process.exit(1);
}

// ---------- Minimal ABI ----------
const ABI_UserRegistry = [
  'function getId(address user) view returns (uint32)',
  'function getReferrer(address user) view returns (address)',
  // Optional helpers (not strictly needed since we derive directs from ocean_users.json):
  // 'function getDirects(address user) view returns (address[])'
];

// ---------- Helpers ----------
function loadJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) {
    console.error(`ERROR: Could not read ${file}:`, e.message);
    process.exit(1);
  }
}

function csvSafe(s) {
  if (s === null || s === undefined) return '';
  const st = String(s);
  if (st.includes(',') || st.includes('"') || st.includes('\n')) {
    return '"' + st.replace(/"/g,'""') + '"';
  }
  return st;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function sumUserTotals(portfolios) {
  const totalUsd  = portfolios.reduce((s,p)=> s + Number(p.amount_usd || 0), 0);
  const totalRama = portfolios.reduce((s,p)=> s + BigInt(p.amount_rama_wei || '0'), 0n);
  const lastTime  = portfolios.length ? portfolios[portfolios.length - 1].timestamp : '';
  return { totalUsd, totalRama, lastTime };
}

async function withRetry(label, fn, retries=3, base=500) {
  let err;
  for (let i=0;i<=retries;i++){
    try { return await fn(); }
    catch (e) {
      err = e;
      if (i === retries) break;
      const wait = base * (i+1);
      // eslint-disable-next-line no-console
      console.log(`[${label}] attempt ${i+1} failed: ${e?.message || e}; retry in ${wait}ms`);
      await new Promise(r=>setTimeout(r, wait));
    }
  }
  throw err;
}

// ---------- Main ----------
async function main() {
  ensureDir(DATA_DIR);
  // load local user activity (created by ocean_sim.js)
  const usersJson = loadJSON(USERS_JSON_IN);
  
  // Use centralized RPC failover to create ethers provider
  let provider = null;
  for (let i = 0; i < RPC_URLS.length; i++) {
    try {
      console.log(`🔗 Team Report: Trying RPC ${i + 1}: ${RPC_URLS[i]}`);
      provider = new ethers.JsonRpcProvider(RPC_URLS[i]);
      await provider.getNetwork(); // Test connection
      console.log(`✅ Team Report: Connected to RPC ${i + 1}`);
      break;
    } catch (error) {
      console.warn(`❌ Team Report: RPC ${i + 1} failed:`, error.message);
      if (i === RPC_URLS.length - 1) {
        throw new Error('All RPC URLs failed to connect');
      }
    }
  }
  
  const registry = new ethers.Contract(USERREGISTRY, ABI_UserRegistry, provider);

  // Build quick reverse index: uplineAddr -> [childAddrs...]
  const directsIndex = new Map();
  const allUsers = Object.keys(usersJson); // addresses
  for (const addr of allUsers) {
    const upline = (usersJson[addr].upline || '').toLowerCase();
    if (!upline) continue;
    if (!directsIndex.has(upline)) directsIndex.set(upline, []);
    directsIndex.get(upline).push(addr.toLowerCase());
  }

  // ID cache to minimize RPC calls
  const idCache = new Map(); // addrLower -> uint32
  async function getIdCached(address_) {
    const a = address_.toLowerCase();
    if (idCache.has(a)) return idCache.get(a);
    const id = await withRetry('getId', async () => registry.getId(a));
    idCache.set(a, Number(id));
    return Number(id);
  }

  // Prepare report structures
  const treeReport = [];      // array of user objects with directs embedded
  const csvRows = [];         // for ocean_team_report.csv
  const directsCsvRows = [];  // for ocean_team_directs.csv

  // For stable order, sort users by firstSeen if available, else address
  const sortedUsers = allUsers.sort((a,b)=>{
    const A = usersJson[a]?.firstSeen || '';
    const B = usersJson[b]?.firstSeen || '';
    if (A && B && A !== B) return A.localeCompare(B);
    return a.localeCompare(b);
  });

  // Build per-user
  for (const userAddr of sortedUsers) {
    const info = usersJson[userAddr] || {};
    const userAddrLower = userAddr.toLowerCase();
    const uplineAddr = (info.upline || '').toLowerCase();

    // IDs via on-chain
    let userId = 0, uplineId = 0;
    try { userId = await getIdCached(userAddrLower); } catch {}
    try { if (uplineAddr) uplineId = await getIdCached(uplineAddr); } catch {}

    const portfolios = Array.isArray(info.portfolios) ? info.portfolios : [];
    const { totalUsd, totalRama, lastTime } = sumUserTotals(portfolios);

    // find directs L1 (from local index)
    const directs = (directsIndex.get(userAddrLower) || []).map(a => a.toLowerCase());

    // Build directs detailed list (each direct + their portfolios detail)
    const directsDetailed = [];
    for (const directAddrLower of directs) {
      const dInfo = usersJson[directAddrLower] || {};
      let directId = 0;
      try { directId = await getIdCached(directAddrLower); } catch {}

      const dPortfolios = Array.isArray(dInfo.portfolios) ? dInfo.portfolios : [];
      const dTotals = sumUserTotals(dPortfolios);

      directsDetailed.push({
        userId: directId,
        address: directAddrLower,
        portfolioCount: dPortfolios.length,
        totalUsd: dTotals.totalUsd,
        totalRamaWei: dTotals.totalRama.toString(),
        lastActivity: dTotals.lastTime || '',
        portfolios: dPortfolios.map(p => ({
          usd: Number(p.amount_usd || 0),
          ramaWei: String(p.amount_rama_wei || '0'),
          txHash: p.tx_hash || '',
          time: p.timestamp || ''
        }))
      });

      // also add to directs CSV
      directsCsvRows.push([
        userId,
        userAddrLower,
        uplineId,
        uplineAddr,
        directId,
        directAddrLower,
        dPortfolios.length,
        dTotals.totalUsd,
        dTotals.totalRama.toString(),
        dTotals.lastTime || ''
      ]);
    }

    // Construct per-user tree node
    const node = {
      userId,
      address: userAddrLower,
      uplineId,
      uplineAddress: uplineAddr || '',
      portfolioCount: portfolios.length,
      totalUsd,
      totalRamaWei: totalRama.toString(),
      firstSeen: info.firstSeen || (portfolios[0]?.timestamp || ''),
      lastActivity: lastTime || '',
      portfolios: portfolios.map(p => ({
        usd: Number(p.amount_usd || 0),
        ramaWei: String(p.amount_rama_wei || '0'),
        txHash: p.tx_hash || '',
        time: p.timestamp || ''
      })),
      directsCount: directsDetailed.length,
      directs: directsDetailed
    };

    treeReport.push(node);

    // Add a summary CSV row
    csvRows.push([
      userId,
      userAddrLower,
      uplineId,
      uplineAddr || '',
      portfolios.length,
      totalUsd,
      totalRama.toString(),
      info.firstSeen || (portfolios[0]?.timestamp || ''),
      lastTime || ''
    ]);
  }

  // Write JSON
  fs.writeFileSync(REPORT_JSON_OUT, JSON.stringify(treeReport, null, 2));

  // Write user summary CSV
  const csvHeader = [
    'user_id',
    'user_address',
    'upline_id',
    'upline_address',
    'total_portfolios',
    'total_usd',
    'total_rama_wei',
    'first_seen',
    'last_activity'
  ].join(',') + '\n';

  const csvBody = csvRows.map(r => r.map(csvSafe).join(',')).join('\n') + '\n';
  fs.writeFileSync(REPORT_CSV_OUT, csvHeader + csvBody);

  // Write directs drilldown CSV
  const directsHeader = [
    'user_id',
    'user_address',
    'upline_id',
    'upline_address',
    'direct_user_id',
    'direct_user_address',
    'direct_total_portfolios',
    'direct_total_usd',
    'direct_total_rama_wei',
    'direct_last_activity'
  ].join(',') + '\n';
  const directsBody = directsCsvRows.map(r => r.map(csvSafe).join(',')).join('\n') + '\n';
  fs.writeFileSync(DIRECTS_CSV_OUT, directsHeader + directsBody);

  console.log('✅ Reports generated:');
  console.log(' -', REPORT_JSON_OUT);
  console.log(' -', REPORT_CSV_OUT);
  console.log(' -', DIRECTS_CSV_OUT);
}

main().catch(err => {
  console.error('Fatal error:', err?.message || err);
  process.exit(1);
});
