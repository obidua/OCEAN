// sync_coreconfig.js
// Fetch contract addresses from CoreConfig, resolve proxies, download ABIs,
// update .env, and write change reports.

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { ethers } from 'ethers';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'data', 'reports');

const ABI_DIRS = [
  path.join(ROOT, 'abis'),
  path.join(ROOT, 'apps', 'dashboard', 'store', 'Contract_ABI'),
];
const PRIMARY_ABI_DIR = ABI_DIRS[0];
const CHANGE_JSON = path.join(REPORT_DIR, 'abi_changes.json');
const CHANGE_MD = path.join(REPORT_DIR, 'abi_changes.md');
const ENV_FILE = path.join(ROOT, '.env');
const ENV_BACKUP = path.join(ROOT, '.env.bak');

const EXPLORER_API_URL = process.env.EXPLORER_API_URL || '';
const EXPLORER_API_KEY = process.env.EXPLORER_API_KEY || '';
const RPC_URL = process.env.RPC_URL;
const CORECONFIG_ADDR = process.env.CORECONFIG;
const ABI_SYNC_ENABLED =
  process.env.SYNC_ABI != null
    ? String(process.env.SYNC_ABI).toLowerCase() === 'true'
    : true;

if (!RPC_URL) {
  throw new Error('RPC_URL missing in .env');
}
if (!ethers.isAddress(CORECONFIG_ADDR || '')) {
  throw new Error('CORECONFIG missing/invalid in .env');
}

const DEFAULT_MANIFEST = [
  { "envKey": "ADMINCONTROL", "configKey": "AdminControl" },
  { "envKey": "FREEZEPOLICY", "configKey": "FreezePolicy" },
  { "envKey": "PORTFOLIOMANAGER", "configKey": "PortfolioManager" },
  { "envKey": "PRICEORACLE", "configKey": "PriceOracle" },
  { "envKey": "REWARDVAULT", "configKey": "RewardVault" },
  { "envKey": "ROYALTYMANAGER", "configKey": "RoyaltyManager" },
  { "envKey": "SLABMANAGER", "configKey": "SlabManager" },
  { "envKey": "USERREGISTRY", "configKey": "UserRegistry" },
  { "envKey": "INCOMEDISTRIBUTOR", "configKey": "IncomeDistributor" },
  { "envKey": "SAFEWALLET", "configKey": "SafeWallet" },
  { "envKey": "MAINWALLET", "configKey": "MainWallet" },
  { "envKey": "CAP_PAYOUT_ROUTER", "configKey": "capPayoutRouter" },
  { "envKey": "CAPPINGINCOMEMANAGER", "configKey": "CappingIncomeManager" },
  { "envKey": "OCEANQUERYUPGRADEABLE", "configKey": "OceanQueryUpgradeable" },
  { "envKey": "ROIDISTRIBUTOR", "configKey": "RoiDistributor" },
  { "envKey": "OCEANVIEW", "configKey": "OceanView" },
  { "envKey": "OCEANVIEWV2", "configKey": "OceanViewV2" },
  { "envKey": "OCEANICVIEW", "configKey": "OceanicView" },
  { "envKey": "COMPREHENSIVEVIEW", "configKey": "ComprehensiveView" }
];

const CORECONFIG_ABI = [
  'function getAddress(bytes32 key) view returns (address)',
  'function getAddress(string key) view returns (address)',
  'function getContract(bytes32 key) view returns (address)',
  'function getContract(string key) view returns (address)',
  'function addressOf(bytes32 key) view returns (address)',
  'function addressOf(string key) view returns (address)',
  'function addresses(bytes32 key) view returns (address)',
  'function contracts(bytes32 key) view returns (address)'
];

const EIP1967_IMPLEMENTATION_SLOT = BigInt('0x360894A13BA1A3210667C828492DB98DCA3E2076CC3735A920A3CA505D382BBC');
const EIP1967_BEACON_SLOT = BigInt('0xa3f0ad74e542b56f1b42a1f3b461b1d6a60ca9d6a3ca3f61b44b4c30f90e8bea');
const MINIMAL_PROXY_SIGNATURE = '363d3d373d3d3d363d73';

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function ensureFetch() {
  if (typeof fetch !== 'function') {
    try {
      const { default: nodeFetch } = await import('node-fetch');
      globalThis.fetch = nodeFetch;
    } catch {
      throw new Error('Global fetch is not available. Use Node 18+ or install node-fetch.');
    }
  }
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function hasFunction(contract, signature) {
  try {
    contract.interface.getFunction(signature);
    return true;
  } catch {
    return false;
  }
}

function deriveManifest() {
  const manifestPath = path.join(ROOT, 'config', 'coreconfig_manifest.json');
  if (fs.existsSync(manifestPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (Array.isArray(parsed) && parsed.every((e) => e.envKey && e.configKey)) {
        return parsed;
      }
    } catch (err) {
      console.warn(`Warning: failed to parse coreconfig_manifest.json: ${err.message}. Falling back to defaults.`);
    }
  }

  if (fs.existsSync(ENV_FILE)) {
    const envText = fs.readFileSync(ENV_FILE, 'utf8');
    const matches = envText.matchAll(/^\s*([A-Z0-9_]+)\s*=\s*/gm);
    const entries = [];
    for (const match of matches) {
      const key = match[1];
      if (['RPC_URL', 'ROOT_ADDRESS', 'CORECONFIG', 'EXPLORER_API_URL', 'EXPLORER_API_KEY'].includes(key)) continue;
      const configKey = key
        .toLowerCase()
        .split('_')
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join('');
      entries.push({ envKey: key, configKey });
    }
    if (entries.length > 0) return entries;
  }

  return DEFAULT_MANIFEST;
}

function normalizeAddress(addr) {
  if (!addr) return null;
  try {
    return ethers.getAddress(addr);
  } catch {
    return null;
  }
}

function storageToAddress(value) {
  if (!value || value === '0x' || /^0x0+$/.test(value)) return null;
  const trimmed = value.startsWith('0x') ? value.slice(2) : value;
  const addressHex = trimmed.slice(-40);
  try {
    return ethers.getAddress('0x' + addressHex);
  } catch {
    return null;
  }
}

async function resolveProxy(provider, address) {
  const result = {
    proxy: address,
    implementation: null,
    beacon: null,
    proxyType: 'none'
  };

  const code = await provider.getCode(address);
  if (!code || code === '0x') {
    result.proxyType = 'none';
    return result;
  }

  try {
    const implStorage = await provider.getStorage(address, EIP1967_IMPLEMENTATION_SLOT);
    const implAddr = storageToAddress(implStorage);
    if (implAddr) {
      result.implementation = implAddr;
      result.proxyType = 'eip1967';
      return result;
    }
  } catch {
    // ignore storage read failure
  }

  try {
    const beaconStorage = await provider.getStorage(address, EIP1967_BEACON_SLOT);
    const beaconAddr = storageToAddress(beaconStorage);
    if (beaconAddr) {
      result.beacon = beaconAddr;
      result.proxyType = 'beacon';
      try {
        const implStorage2 = await provider.getStorage(beaconAddr, EIP1967_IMPLEMENTATION_SLOT);
        const beaconImpl = storageToAddress(implStorage2);
        if (beaconImpl) {
          result.implementation = beaconImpl;
        }
      } catch {
        // ignore beacon inspection failure
      }
      return result;
    }
  } catch {
    // ignore storage read failure
  }

  const minimalProxySig = code.slice(2, 2 + MINIMAL_PROXY_SIGNATURE.length).toLowerCase();
  if (minimalProxySig === MINIMAL_PROXY_SIGNATURE) {
    const implHex = '0x' + code.slice(-40);
    const impl = normalizeAddress(implHex);
    if (impl) {
      result.implementation = impl;
      result.proxyType = 'minimal';
      return result;
    }
  }

  result.proxyType = 'direct';
  result.implementation = address;
  return result;
}

async function fetchAddressFromCoreConfig(coreConfig, manifestEntry) {
  const { envKey, configKey } = manifestEntry;
  const variants = Array.from(
    new Set([
      configKey,
      envKey,
      envKey.toLowerCase(),
      configKey.toLowerCase()
    ])
  );

  for (const variant of variants) {
    const bytes32Hash = ethers.id(variant);
    const candidates = [];

    if (hasFunction(coreConfig, 'getAddress(bytes32)')) {
      candidates.push({
        signature: 'getAddress(bytes32)',
        call: () => coreConfig['getAddress(bytes32)'](bytes32Hash),
        input: `hash(${variant})`
      });
      try {
        const encoded = ethers.encodeBytes32String(variant);
        candidates.push({
          signature: 'getAddress(bytes32)',
          call: () => coreConfig['getAddress(bytes32)'](encoded),
          input: `encodeBytes32(${variant})`
        });
      } catch {
        // ignore encode failure
      }
    }
    if (hasFunction(coreConfig, 'getAddress(string)')) {
      candidates.push({
        signature: 'getAddress(string)',
        call: () => coreConfig['getAddress(string)'](variant),
        input: variant
      });
    }
    if (hasFunction(coreConfig, 'getContract(bytes32)')) {
      candidates.push({
        signature: 'getContract(bytes32)',
        call: () => coreConfig['getContract(bytes32)'](bytes32Hash),
        input: `hash(${variant})`
      });
    }
    if (hasFunction(coreConfig, 'getContract(string)')) {
      candidates.push({
        signature: 'getContract(string)',
        call: () => coreConfig['getContract(string)'](variant),
        input: variant
      });
    }
    if (hasFunction(coreConfig, 'addressOf(bytes32)')) {
      candidates.push({
        signature: 'addressOf(bytes32)',
        call: () => coreConfig['addressOf(bytes32)'](bytes32Hash),
        input: `hash(${variant})`
      });
    }
    if (hasFunction(coreConfig, 'addressOf(string)')) {
      candidates.push({
        signature: 'addressOf(string)',
        call: () => coreConfig['addressOf(string)'](variant),
        input: variant
      });
    }
    if (hasFunction(coreConfig, 'addresses(bytes32)')) {
      candidates.push({
        signature: 'addresses(bytes32)',
        call: () => coreConfig['addresses(bytes32)'](bytes32Hash),
        input: `hash(${variant})`
      });
    }
    if (hasFunction(coreConfig, 'contracts(bytes32)')) {
      candidates.push({
        signature: 'contracts(bytes32)',
        call: () => coreConfig['contracts(bytes32)'](bytes32Hash),
        input: `hash(${variant})`
      });
    }
    candidates.push({
      signature: `${variant}()`,
      call: () => callDirectGetter(coreConfig.runner || coreConfig.provider, coreConfig.target, variant),
      input: '()'
    });

    for (const candidate of candidates) {
      if (!candidate?.call) continue;
      try {
        const addr = await candidate.call();
        const normalized = normalizeAddress(addr);
        if (normalized && normalized !== ethers.ZeroAddress) {
          return {
            envKey,
            configKey,
            address: normalized,
            label: variant,
            method: candidate.signature,
            input: candidate.input
          };
        }
      } catch {
        // continue trying other variants
      }
    }
  }

  return { envKey, configKey, address: null, label: null, method: null, input: null };
}

async function fetchAbi(address) {
  if (!EXPLORER_API_URL) {
    throw new Error('Set EXPLORER_API_URL in .env to fetch ABIs');
  }
  await ensureFetch();
  const requestUrl = buildExplorerUrl(address);

  const res = await fetch(requestUrl, { headers: { accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`Explorer responded with ${res.status} ${res.statusText}`);
  }
  const bodyText = await res.text();
  let body;
  try {
    body = JSON.parse(bodyText);
  } catch {
    body = bodyText;
  }

  if (typeof body === 'string') {
    if (!body.trim()) throw new Error('Explorer returned empty ABI payload');
    return JSON.parse(body);
  }

  if (body?.status && body.status !== '1') {
    throw new Error(`Explorer error: ${body.message || 'unknown'} (${body.result || ''})`);
  }

  const abiPayload =
    body?.result ??
    body?.ABI ??
    body?.abi ??
    body?.data?.abi ??
    body?.data ??
    null;

  if (!abiPayload) throw new Error('Explorer returned empty ABI');

  const abiString = typeof abiPayload === 'string' ? abiPayload : JSON.stringify(abiPayload);
  return JSON.parse(abiString);
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

function writeAbiFiles(paths, content) {
  for (const target of paths) {
    fs.writeFileSync(target, content, 'utf8');
  }
}

function collectExistingAbiNames(dirs) {
  const nameMap = new Map();
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.json')) continue;
      const stem = file.slice(0, -'.json'.length);
      const key = stem.toLowerCase();
      if (!nameMap.has(key)) {
        nameMap.set(key, stem);
      }
    }
  }
  return nameMap;
}

function toPascalCase(raw) {
  if (!raw) return 'Contract';
  const spaced = String(raw)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim();
  if (!spaced) return 'Contract';
  return spaced
    .split(/\s+/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('');
}

function resolveAbiStem(entry, existingNameMap) {
  const candidates = [];
  if (entry.configKey) candidates.push(entry.configKey);
  if (entry.envKey) candidates.push(entry.envKey);

  for (const candidate of candidates) {
    const key = candidate.toLowerCase();
    if (existingNameMap.has(key)) {
      return existingNameMap.get(key);
    }
  }

  return toPascalCase(candidates[0] ?? 'Contract');
}

function updateEnvFile(updates) {
  if (updates.length === 0) return { updated: false };
  const original = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf8') : '';
  if (!original && !fs.existsSync(ENV_FILE)) {
    throw new Error('.env file not found');
  }
  fs.writeFileSync(ENV_BACKUP, original, 'utf8');

  const lines = original.split(/\r?\n/);
  const indexMap = new Map();
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^\s*([A-Z0-9_]+)\s*=/);
    if (match) indexMap.set(match[1], i);
  }

  for (const { envKey, value } of updates) {
    const normalizedLine = `${envKey}=${value}`;
    if (indexMap.has(envKey)) {
      const idx = indexMap.get(envKey);
      const line = lines[idx];
      const commentMatch = line.match(/(#.*)$/);
      const comment = commentMatch ? ` ${commentMatch[1]}` : '';
      lines[idx] = normalizedLine + comment;
    } else {
      lines.push(normalizedLine);
    }
  }

  fs.writeFileSync(ENV_FILE, lines.join('\n'), 'utf8');
  return { updated: true, backup: ENV_BACKUP };
}

async function main() {
  const manifest = deriveManifest();
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const coreConfig = new ethers.Contract(CORECONFIG_ADDR, CORECONFIG_ABI, provider);

  for (const dir of ABI_DIRS) {
    ensureDir(dir);
  }
  ensureDir(REPORT_DIR);

  const existingAbiNames = collectExistingAbiNames(ABI_DIRS);

  const envUpdates = [];
  const changeItems = [];

  for (const entry of manifest) {
    const fetched = await fetchAddressFromCoreConfig(coreConfig, entry);
    const currentEnv = normalizeAddress(process.env[entry.envKey] || '');
    const addressToUse = fetched.address || currentEnv;
    if (!addressToUse) {
      changeItems.push({
        envKey: entry.envKey,
        configKey: entry.configKey,
        status: 'missing',
        message: 'No address found in CoreConfig or .env'
      });
      continue;
    }

    const proxyInfo = await resolveProxy(provider, addressToUse);
    const targetImplementation = proxyInfo.implementation || proxyInfo.proxy;

    const abiStem = resolveAbiStem(entry, existingAbiNames);
    const abiPaths = ABI_DIRS.map((dir) => path.join(dir, `${abiStem}.json`));
    const primaryAbiPath = abiPaths[0];
    const previousAbiRaw = fs.existsSync(primaryAbiPath) ? fs.readFileSync(primaryAbiPath, 'utf8') : null;
    let previousAbiHash = previousAbiRaw ? sha256(previousAbiRaw) : null;
    let newAbiHash = previousAbiHash;
    let abiUpdated = false;
    let abiFetchError = ABI_SYNC_ENABLED ? null : 'skipped';
    let abiWrittenThisRun = false;

    if (ABI_SYNC_ENABLED) {
      try {
        const abi = await fetchAbi(targetImplementation);
        const formatted = JSON.stringify(abi, null, 2) + '\n';
        const candidateHash = sha256(formatted);
        if (candidateHash !== previousAbiHash) {
          writeAbiFiles(abiPaths, formatted);
          abiUpdated = true;
          newAbiHash = candidateHash;
          abiWrittenThisRun = true;
          existingAbiNames.set(abiStem.toLowerCase(), abiStem);
        }
      } catch (err) {
        abiFetchError = err.message;
      }

      if (!fs.existsSync(primaryAbiPath)) {
        const stub = {
          status: 'unavailable',
          implementation: targetImplementation,
          generatedAt: new Date().toISOString(),
          reason: abiFetchError || 'ABI not downloaded'
        };
        const stubFormatted = JSON.stringify(stub, null, 2) + '\n';
        writeAbiFiles(abiPaths, stubFormatted);
        const stubHash = sha256(stubFormatted);
        abiUpdated = abiUpdated || previousAbiHash !== stubHash;
        newAbiHash = stubHash;
        abiWrittenThisRun = true;
        existingAbiNames.set(abiStem.toLowerCase(), abiStem);
      }
    }

    if (!abiWrittenThisRun && previousAbiRaw) {
      // Keep secondary ABI directories in sync with the primary file when nothing new was written.
      for (const target of abiPaths.slice(1)) {
        if (!fs.existsSync(target) || sha256(fs.readFileSync(target, 'utf8')) !== previousAbiHash) {
          fs.writeFileSync(target, previousAbiRaw, 'utf8');
        }
      }
      existingAbiNames.set(abiStem.toLowerCase(), abiStem);
    }

    if (currentEnv !== proxyInfo.proxy && fetched.address) {
      envUpdates.push({ envKey: entry.envKey, value: proxyInfo.proxy });
    }

    changeItems.push({
      envKey: entry.envKey,
      configKey: entry.configKey,
      fetchedAddress: fetched.address,
      labelUsed: fetched.label,
      coreConfigMethod: fetched.method,
      coreConfigInput: fetched.input,
      proxyAddress: proxyInfo.proxy,
      implementationAddress: proxyInfo.implementation,
      beaconAddress: proxyInfo.beacon,
      proxyType: proxyInfo.proxyType,
      envBefore: currentEnv,
      envAfter: proxyInfo.proxy,
      envChanged: currentEnv !== proxyInfo.proxy,
      abiUpdated,
      abiHashBefore: previousAbiHash,
      abiHashAfter: newAbiHash,
      abiError: abiFetchError
    });
  }

  const summaryRows = changeItems.map((item) => ({
    key: item.envKey,
    before: formatAddress(item.envBefore),
    after: formatAddress(item.envAfter),
    fetched: formatAddress(item.fetchedAddress),
    resolved: formatAddress(item.proxyAddress),
    impl: formatAddress(item.implementationAddress),
    chg: item.envBefore !== item.envAfter ? 'y' : '',
    abi: item.abiUpdated ? 'y' : '',
    err: summarizeError(item.abiError)
  }));

  if (summaryRows.length) {
    console.log('\nCoreConfig address summary:');
    console.table(summaryRows);
  }

  const envResult = updateEnvFile(envUpdates);

  const runSummary = {
    runAt: new Date().toISOString(),
    rpcUrl: RPC_URL,
    coreConfig: CORECONFIG_ADDR,
    explorer: EXPLORER_API_URL || null,
    envUpdated: envResult.updated,
    results: changeItems
  };

  writeJson(CHANGE_JSON, runSummary);
  fs.writeFileSync(CHANGE_MD, renderMarkdown(runSummary), 'utf8');

  console.log('✅ CoreConfig sync completed.');
  if (envResult.updated) {
    console.log(`.env updated (backup saved at ${ENV_BACKUP})`);
  } else {
    console.log('.env already up to date.');
  }
  console.log(`Change report written to ${CHANGE_JSON} and ${CHANGE_MD}`);
}

function renderMarkdown(summary) {
  const lines = [];
  lines.push(`# ABI Sync Report`);
  lines.push('');
  lines.push(`- Run at: ${summary.runAt}`);
  lines.push(`- RPC URL: ${summary.rpcUrl}`);
  lines.push(`- CoreConfig: ${summary.coreConfig}`);
  if (summary.explorer) lines.push(`- Explorer API: ${summary.explorer}`);
  lines.push(`- .env updated: ${summary.envUpdated ? 'yes' : 'no'}`);
  lines.push('');
  summary.results.forEach((item) => {
    lines.push(`## ${item.envKey} (${item.configKey})`);
    if (item.status === 'missing') {
      lines.push(`- Status: ❌ ${item.message}`);
      lines.push('');
      return;
    }
    lines.push(`- Proxy address: ${item.proxyAddress}`);
    if (item.proxyType && item.proxyType !== 'none') {
      lines.push(`- Proxy type: ${item.proxyType}`);
    }
    if (item.implementationAddress) {
      lines.push(`- Implementation: ${item.implementationAddress}`);
    }
    if (item.beaconAddress) {
      lines.push(`- Beacon: ${item.beaconAddress}`);
    }
    const methodLabel = item.coreConfigMethod || 'method?';
    const inputLabel = item.coreConfigInput ? ` with ${item.coreConfigInput}` : '';
    lines.push(`- CoreConfig label: ${item.labelUsed || 'n/a'} (${methodLabel}${inputLabel})`);
    lines.push(`- .env address ${item.envChanged ? 'updated' : 'unchanged'} (${item.envBefore || 'n/a'} → ${item.envAfter})`);
    if (item.abiError) {
      lines.push(`- ABI fetch: ❌ ${item.abiError}`);
    } else {
      lines.push(`- ABI updated: ${item.abiUpdated ? 'yes' : 'no'}${item.abiUpdated ? ` (${item.abiHashBefore || 'none'} → ${item.abiHashAfter})` : ''}`);
    }
    lines.push('');
  });
  return lines.join('\n');
}

async function callDirectGetter(provider, target, functionName) {
  if (!provider || !target || !functionName) return null;
  try {
    const iface = new ethers.Interface([`function ${functionName}() view returns (address)`]);
    const data = iface.encodeFunctionData(functionName, []);
    const raw = await provider.call({ to: target, data });
    if (!raw || raw === '0x') return null;
    const [addr] = iface.decodeFunctionResult(functionName, raw);
    return normalizeAddress(addr);
  } catch {
    return null;
  }
}

function buildExplorerUrl(address) {
  const base = (EXPLORER_API_URL || '').trim();
  if (!base) throw new Error('EXPLORER_API_URL is empty');

  if (base.includes('{address}')) {
    const substituted = base.replace('{address}', address);
    return EXPLORER_API_KEY ? appendQuery(substituted, { apikey: EXPLORER_API_KEY }) : substituted;
  }

  const lowered = base.toLowerCase();
  if (lowered.includes('/api/v2')) {
    const url = new URL(base);
    url.search = '';
    const cleanPath = url.pathname.replace(/\/+$/, '');
    const pathLower = cleanPath.toLowerCase();
    let nextPath;
    if (pathLower.endsWith('/smart-contracts') || pathLower.includes('/smart-contracts/')) {
      nextPath = `${cleanPath}/${address}`;
    } else if (pathLower.endsWith('/contracts') || pathLower.includes('/contracts/')) {
      nextPath = `${cleanPath}/${address}/abi`;
    } else {
      nextPath = `${cleanPath}/smart-contracts/${address}`;
    }
    url.pathname = nextPath.replace(/\/{2,}/g, '/');
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
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value != null && value !== '') {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
}

function formatAddress(addr) {
  if (!addr) return '—';
  try {
    const normalized = ethers.getAddress(addr);
    return `${normalized.slice(0, 6)}…${normalized.slice(-4)}`;
  } catch {
    return addr;
  }
}

function truncate(str, length = 18) {
  if (str == null) return '—';
  const value = String(str);
  if (value.length <= length) return value;
  return `${value.slice(0, Math.max(1, length - 1))}…`;
}

function summarizeError(message) {
  if (!message || message === 'skipped') return '';
  const httpMatch = message.match(/Explorer responded with (\d+)/i);
  if (httpMatch) return `HTTP ${httpMatch[1]}`;
  return truncate(message, 16);
}

main().catch((err) => {
  console.error('Fatal error:', err.stack || err.message || err);
  process.exit(1);
});
