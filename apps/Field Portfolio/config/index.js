import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { getRPCUrls, getNetworkConfig } from '../src/utils/rpcConfig.js'

export const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '5f2fd12d0417edef168ae25f9ec697ad'

const networkConfig = getNetworkConfig()
const rpcUrls = getRPCUrls()

const ramesttaNetwork = {
  id: parseInt(networkConfig.chainId),
  name: networkConfig.networkName,
  nativeCurrency: { name: 'Rama', symbol: 'RAMA', decimals: 18 },
  rpcUrls: { default: { http: rpcUrls }, public: { http: rpcUrls } },
  blockExplorers: { default: { name: 'Ramascan', url: 'https://ramascan.com/' } },
  testnet: false,
}

if (!projectId) throw new Error('Project ID is not defined')

export const metadata = {
  name: 'Field Portfolio',
  description: 'Field Executives ROI Portal',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://field.oceandefi.uk',
  icons: ['https://avatars.githubusercontent.com/u/179229932']
}

export const networks = [ramesttaNetwork]

export const wagmiAdapter = new WagmiAdapter({ projectId, networks })
export const config = wagmiAdapter.wagmiConfig
