// delete_and_fetch_abis.js
// Usage: node scripts/delete_and_fetch_abis.js
// Requires: ethers, dotenv, axios

const fs = require('fs');
const path = require('path');
const ethers = require('ethers');
require('dotenv').config({ path: path.join(__dirname, '../apps/dashboard/.env') });
const axios = require('axios');

const ABI_DIR = path.join(__dirname, '../apps/dashboard/store/Contract_ABI');
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || '';
const RPC_URL = process.env.VITE_RPC_URL;

if (!RPC_URL) {
  console.error('VITE_RPC_URL not found in .env');
  process.exit(1);
}

// 1. Delete old ABI directory
if (fs.existsSync(ABI_DIR)) {
  fs.rmSync(ABI_DIR, { recursive: true, force: true });
}
fs.mkdirSync(ABI_DIR, { recursive: true });

// 2. Read proxy contract addresses from .env
const proxyAddresses = Object.entries(process.env)
  .filter(([key, value]) => /^VITE_/.test(key) && /^0x[a-fA-F0-9]{40}$/.test(value))
  .map(([_, value]) => value);

if (proxyAddresses.length === 0) {
  console.error('No proxy contract addresses found in .env');
  process.exit(1);
}

// 3. For each proxy, get implementation address and fetch ABI
async function fetchAbi(address) {
  // EIP-1967 implementation slot
  const implSlot = '0x360894A13BA1A3210667C828492DB98DCA3E2076CC3735A920A3CA505D382BBC';
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  // Get implementation address from proxy
  const implHex = await provider.getStorage(address, implSlot);
  const implAddress = '0x' + implHex.slice(-40);

  // Fetch ABI from Etherscan
  if (!ETHERSCAN_API_KEY) {
    throw new Error('ETHERSCAN_API_KEY not set in .env');
  }
  const url = `https://api.etherscan.io/api?module=contract&action=getabi&address=${implAddress}&apikey=${ETHERSCAN_API_KEY}`;
  const res = await axios.get(url);
  if (res.data.status !== '1') throw new Error('ABI fetch failed');
  return { implAddress, abi: JSON.parse(res.data.result) };
}

(async () => {
  for (const proxy of proxyAddresses) {
    try {
      const { implAddress, abi } = await fetchAbi(proxy);
      fs.writeFileSync(
        path.join(ABI_DIR, `${implAddress}.json`),
        JSON.stringify(abi, null, 2)
      );
      console.log(`Fetched ABI for ${implAddress}`);
    } catch (err) {
      console.error(`Error for ${proxy}:`, err.message);
    }
  }
})();
