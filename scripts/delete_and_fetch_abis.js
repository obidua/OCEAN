// delete_and_fetch_abis.js
// Usage: node scripts/delete_and_fetch_abis.js
// Purpose: Read VITE_ contract addresses from dashboard .env, resolve implementation addresses,
//          purge old ABIs and fetch fresh ABIs from explorer for each implementation, preserving filenames.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { ethers } from 'ethers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const ROOT = path.join(__dirname, '..');
const DASHBOARD_ENV = path.join(ROOT, 'apps', 'dashboard', '.env');
const ROOT_ENV = path.join(ROOT, '.env');
const ABI_DIR = path.join(ROOT, 'apps', 'dashboard', 'store', 'Contract_ABI');

// Load envs: root first (explorer config), then dashboard (VITE_ contracts)
dotenv.config({ path: ROOT_ENV });
dotenv.config({ path: DASHBOARD_ENV, override: true });

// Config
const RPC_URL = process.env.VITE_RPC_URL || process.env.RPC_URL;
const EXPLORER_API_URL = process.env.EXPLORER_API_URL || process.env.ETHERSCAN_API_URL || '';
const EXPLORER_API_KEY = process.env.EXPLORER_API_KEY || process.env.ETHERSCAN_API_KEY || '';

if (!RPC_URL) {
  console.error('RPC URL is missing. Set VITE_RPC_URL in apps/dashboard/.env or RPC_URL in root .env');
  process.exit(1);
}

// Ensure global fetch (Node 18+ or polyfill)
async function ensureFetch() {
  if (typeof fetch !== 'function') {
    try {
      const { default: nodeFetch } = await import('node-fetch');
      // @ts-ignore
      globalThis.fetch = nodeFetch;
    } catch {
      throw new Error('Global fetch is not available. Use Node 18+ or install node-fetch');
    }
  }
}

function collectExistingNameMap(dir) {
  const map = new Map(); // key: lowercase, value: original stem
  if (!fs.existsSync(dir)) return map;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    const stem = f.slice(0, -5);
    map.set(stem.toLowerCase(), stem);
  }
  return map;
}

function resolveStem(envKey, existingNameMap) {
  const raw = envKey.replace(/^VITE_/, '');
  const lower = raw.toLowerCase();
  if (existingNameMap.has(lower)) return existingNameMap.get(lower);
  // Prefer keeping uppercase (matches some existing imports like COMPREHENSIVEVIEW, OCEANDEFI, OCEANVIEWUPGRADEABLE)
  return raw;
}

// Remove all .json ABI files
function cleanAbiDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const files = fs.readdirSync(dir);
  let count = 0;
  for (const f of files) {
    if (f.endsWith('.json')) {
      fs.unlinkSync(path.join(dir, f));
      count++;
    }
  }
  console.log(`🗑️  Deleted ${count} old ABI files in ${dir}`);
}

// EIP-1967 slots
const EIP1967_IMPLEMENTATION_SLOT = BigInt('0x360894A13BA1A3210667C828492DB98DCA3E2076CC3735A920A3CA505D382BBC');
const EIP1967_BEACON_SLOT = BigInt('0xa3f0ad74e542b56f1b42a1f3b461b1d6a60ca9d6a3ca3f61b44b4c30f90e8bea');

function storageToAddress(value) {
  if (!value || value === '0x' || /^0x0+$/.test(value)) return null;
  const trimmed = value.startsWith('0x') ? value.slice(2) : value;
  const addrHex = trimmed.slice(-40);
  try {
    return ethers.getAddress('0x' + addrHex);
  } catch {
    return null;
  }
}

async function resolveProxy(provider, address) {
  const out = { proxy: ethers.getAddress(address), implementation: null, beacon: null, type: 'direct' };
  const code = await provider.getCode(address);
  if (!code || code === '0x') return out; // not a contract
  try {
    const implRaw = await provider.getStorage(address, EIP1967_IMPLEMENTATION_SLOT);
    const impl = storageToAddress(implRaw);
    if (impl) {
      out.implementation = impl;
      out.type = 'eip1967';
      return out;
    }
  } catch {}
  try {
    const beaconRaw = await provider.getStorage(address, EIP1967_BEACON_SLOT);
    const beacon = storageToAddress(beaconRaw);
    if (beacon) {
      out.beacon = beacon;
      out.type = 'beacon';
      // Try resolve implementation on beacon
      try {
        const implRaw2 = await provider.getStorage(beacon, EIP1967_IMPLEMENTATION_SLOT);
        const impl2 = storageToAddress(implRaw2);
        if (impl2) out.implementation = impl2;
      } catch {}
      return out;
    }
  } catch {}
  // Minimal proxy heuristic
  const minimalSig = '363d3d373d3d3d363d73';
  const sig = code.slice(2, 2 + minimalSig.length).toLowerCase();
  if (sig === minimalSig) {
    const implHex = '0x' + code.slice(-40);
    try {
      out.implementation = ethers.getAddress(implHex);
      out.type = 'minimal';
      return out;
    } catch {}
  }
  // Fallback: treat as direct implementation
  out.implementation = ethers.getAddress(address);
  out.type = 'direct';
  return out;
}

function buildExplorerUrl(address) {
  const base = (EXPLORER_API_URL || '').trim();
  if (!base) throw new Error('EXPLORER_API_URL not set in .env');
  if (base.includes('{address}')) {
    const u = base.replace('{address}', address);
    return EXPLORER_API_KEY ? appendQuery(u, { apikey: EXPLORER_API_KEY }) : u;
  }
  const lowered = base.toLowerCase();
  if (lowered.includes('/api/v2')) {
    const url = new URL(base);
    url.search = '';
    const p = url.pathname.replace(/\/+$/, '');
    let next;
    if (p.toLowerCase().endsWith('/contracts')) next = `${p}/${address}/abi`;
    else next = `${p}/smart-contracts/${address}`;
    url.pathname = next.replace(/\/{2,}/g, '/');
    if (EXPLORER_API_KEY) url.searchParams.set('apikey', EXPLORER_API_KEY);
    return url.toString();
  }
  const url = new URL(base);
  if (!url.searchParams.has('module')) url.searchParams.set('module', 'contract');
  if (!url.searchParams.has('action')) url.searchParams.set('action', 'getabi');
  url.searchParams.set('address', address);
  if (EXPLORER_API_KEY) url.searchParams.set('apikey', EXPLORER_API_KEY);
  return url.toString();
}

function appendQuery(rawUrl, params) {
  const url = new URL(rawUrl);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v != null && v !== '') url.searchParams.set(k, v);
  });
  return url.toString();
}

async function fetchAbiFor(address) {
  await ensureFetch();
  const req = buildExplorerUrl(address);
  const res = await fetch(req, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`Explorer HTTP ${res.status}`);
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  if (typeof body === 'string') return JSON.parse(body);
  const abiPayload = body?.result ?? body?.ABI ?? body?.abi ?? body?.data?.abi ?? body?.data;
  if (!abiPayload) throw new Error('ABI missing in explorer response');
  const abiStr = typeof abiPayload === 'string' ? abiPayload : JSON.stringify(abiPayload);
  return JSON.parse(abiStr);
}

async function main() {
  console.log('🧩 Refreshing ABIs from environment contracts...');
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  // Snapshot existing names to preserve stems
  const nameMap = collectExistingNameMap(ABI_DIR);

  // Collect env contracts (VITE_*)
  const entries = Object.entries(process.env)
    .filter(([k, v]) => k.startsWith('VITE_') && /^0x[a-fA-F0-9]{40}$/.test(String(v || '')))
    .map(([k, v]) => ({ envKey: k, proxy: ethers.getAddress(String(v)) }));

  if (entries.length === 0) {
    console.error('No VITE_ contract addresses found in apps/dashboard/.env');
    process.exit(1);
  }

  // Clean directory
  cleanAbiDir(ABI_DIR);

  let ok = 0, fail = 0;
  for (const { envKey, proxy } of entries) {
    try {
      const info = await resolveProxy(provider, proxy);
      const impl = info.implementation || proxy;
      const abi = await fetchAbiFor(impl);
      const stem = resolveStem(envKey, nameMap);
      const outFile = path.join(ABI_DIR, `${stem}.json`);
      fs.writeFileSync(outFile, JSON.stringify(abi, null, 2));
      console.log(`✅ ${envKey} → ${stem}.json (${impl})`);
      ok++;
    } catch (err) {
      console.error(`❌ ${envKey} (${proxy}): ${err.message || err}`);
      fail++;
    }
  }

  console.log(`\nDone. Wrote ${ok} ABIs${fail ? `, ${fail} failed` : ''}.`);
}

main().catch((e) => {
  console.error('Fatal:', e.stack || e.message || e);
  process.exit(1);
});
