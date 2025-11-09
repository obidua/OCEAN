import Web3 from 'web3';

export const getRPCUrls = () => {
  const rpcs = [];
  if (import.meta.env.VITE_RPC_URL) rpcs.push(import.meta.env.VITE_RPC_URL);
  if (import.meta.env.VITE_RPC_URL_2) rpcs.push(import.meta.env.VITE_RPC_URL_2);
  if (import.meta.env.VITE_RPC_URL_3) rpcs.push(import.meta.env.VITE_RPC_URL_3);
  if (rpcs.length === 0) rpcs.push('https://blockchain.ramestta.com');
  return rpcs;
};

export const getPrimaryRPC = () => import.meta.env.VITE_RPC_URL || 'https://blockchain.ramestta.com';

export const getNetworkConfig = () => ({
  chainId: parseInt(import.meta.env.VITE_CHAIN_ID || '1370'),
  networkName: import.meta.env.VITE_NETWORK_NAME || 'Ramestta',
  primaryRPC: getPrimaryRPC(),
  allRPCs: getRPCUrls()
});

export const createWeb3Instance = () => new Web3(getPrimaryRPC());
