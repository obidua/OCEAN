import { createPublicClient, http, parseAbi } from 'viem'
import { getNetworkConfig } from '../utils/rpcConfig'
import abi from './fieldPortfolioAbi.json'

export const CONTRACT_ADDRESS = import.meta.env.VITE_FIELD_PORTFOLIO_CONTRACT || '0x971dBA324C7399a5Ff739e82177bE7001687f27D'

const network = getNetworkConfig()

export const publicClient = createPublicClient({
  chain: {
    id: network.chainId,
    name: network.networkName,
    nativeCurrency: { name: 'Rama', symbol: 'RAMA', decimals: 18 },
    rpcUrls: { default: { http: network.allRPCs } }
  },
  transport: http(network.primaryRPC)
})

export async function readContract(functionName, args = []) {
  return publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName,
    args
  })
}
