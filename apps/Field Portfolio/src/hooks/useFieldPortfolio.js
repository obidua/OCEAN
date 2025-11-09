import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { readContract, CONTRACT_ADDRESS } from '../lib/contractClient'
import { useAppKitAccount } from '@reown/appkit/react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'

// Fetch portfolios pids
export function usePortfolioIds() {
  const { address } = useAppKitAccount()
  return useQuery({
    queryKey: ['portfolioIds', address],
    enabled: !!address,
    queryFn: async () => await readContract('portfoliosOf', [address])
  })
}

// Fetch portfolio details list
export function usePortfolios() {
  const idsQuery = usePortfolioIds()
  return useQuery({
    queryKey: ['portfolios', idsQuery.data],
    enabled: idsQuery.isSuccess && idsQuery.data.length > 0,
    queryFn: async () => {
      const pids = idsQuery.data
      const all = []
      for (const pid of pids) {
        const p = await readContract('getPortfolio', [pid])
        all.push({ pid, ...p })
      }
      return all
    }
  })
}

// Check registration
export function useIsRegistered() {
  const { address } = useAppKitAccount()
  return useQuery({
    queryKey: ['isRegistered', address],
    enabled: !!address,
    queryFn: async () => await readContract('isRegistered', [address])
  })
}

// Unclaimed ROI preview
export function useUnclaimedROI() {
  const { address } = useAppKitAccount()
  return useQuery({
    queryKey: ['unclaimedROI', address],
    enabled: !!address,
    refetchInterval: 30000,
    queryFn: async () => {
      const [usdTotal, ramaTotal, fromPeriod, toPeriod, epochsCount] = await readContract('getUnclaimedROI', [address])
      return { usdTotal, ramaTotal, fromPeriod, toPeriod, epochsCount }
    }
  })
}

// Claim history slice (simple first 50)
export function useClaimHistory() {
  const { address } = useAppKitAccount()
  return useQuery({
    queryKey: ['claimHistory', address],
    enabled: !!address,
    queryFn: async () => await readContract('getClaimHistorySlice', [address, 0n, 50n])
  })
}

// Claim ROI mutation
export function useClaimROI() {
  const { address } = useAppKitAccount()
  const queryClient = useQueryClient()
  const { writeContract, data: hash, isPending } = useWriteContract()
  const receipt = useWaitForTransactionReceipt({ hash, confirmations: 1 })

  const mutation = useMutation({
    mutationFn: async () => {
      if (!address) throw new Error('Connect wallet')
      return writeContract({
        address: CONTRACT_ADDRESS,
        abi: [
          {"inputs":[],"name":"claimROI","outputs":[],"stateMutability":"nonpayable","type":"function"}
        ],
        functionName: 'claimROI'
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unclaimedROI'] })
      queryClient.invalidateQueries({ queryKey: ['claimHistory'] })
    }
  })

  return { ...mutation, txHash: hash, receipt, isPending }
}
