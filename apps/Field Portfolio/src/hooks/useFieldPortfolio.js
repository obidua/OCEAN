import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { readContract, CONTRACT_ADDRESS } from '../lib/contractClient'
import { useAppKitAccount } from '@reown/appkit/react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'

// Helper: safely serialize values for React Query keys (BigInt unsupported by JSON.stringify)
function keySafe(value) {
  if (Array.isArray(value)) return value.map(v => typeof v === 'bigint' ? v.toString() : v)
  if (typeof value === 'bigint') return value.toString()
  return value ?? null
}

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
    queryKey: ['portfolios', keySafe(idsQuery.data)],
    enabled: idsQuery.isSuccess && (idsQuery.data?.length ?? 0) > 0,
    queryFn: async () => {
      const pids = idsQuery.data || []
      const all = []
      for (const pid of pids) {
        const p = await readContract('getPortfolio', [pid])
        // Keep raw BigInt values for precision; UI will cast/format.
        all.push({ pid: typeof pid === 'bigint' ? Number(pid) : pid, rawPid: pid, ...p })
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

// Owner address fetch
export function useOwnerAddress() {
  return useQuery({
    queryKey: ['ownerAddress'],
    queryFn: async () => await readContract('owner', [])
  })
}

// Detect if current connected wallet is contract owner
export function useIsOwner() {
  const { address } = useAppKitAccount()
  const ownerQ = useOwnerAddress()
  return {
    isLoading: ownerQ.isLoading,
    isOwner: !!address && ownerQ.data && address.toLowerCase() === ownerQ.data.toLowerCase(),
    owner: ownerQ.data
  }
}

// Admin register user action
export function useAdminRegister() {
  const { address } = useAppKitAccount()
  const isOwner = useIsOwner()
  const { writeContract, data: hash, isPending } = useWriteContract()
  const receipt = useWaitForTransactionReceipt({ hash })
  const mutation = useMutation({
    mutationFn: async ({ user, referrer }) => {
      if (!isOwner.isOwner) throw new Error('Not owner')
      return writeContract({
        address: CONTRACT_ADDRESS,
        abi: [{"inputs":[{"internalType":"address","name":"user","type":"address"},{"internalType":"address","name":"referrer","type":"address"}],"name":"adminRegisterUser","outputs":[{"internalType":"uint32","name":"newId","type":"uint32"}],"stateMutability":"nonpayable","type":"function"}],
        functionName: 'adminRegisterUser',
        args: [user, referrer || '0x0000000000000000000000000000000000000000']
      })
    }
  })
  return { ...mutation, txHash: hash, isPending, receipt }
}

// Admin create portfolio action
export function useAdminCreatePortfolio() {
  const isOwner = useIsOwner()
  const { writeContract, data: hash, isPending } = useWriteContract()
  const receipt = useWaitForTransactionReceipt({ hash })
  const mutation = useMutation({
    mutationFn: async ({ user, principalUsd, capPct }) => {
      if (!isOwner.isOwner) throw new Error('Not owner')
      const principalUsd6 = BigInt(Math.trunc(Number(principalUsd) * 1e6))
      const cap = Number(capPct) || 200
      return writeContract({
        address: CONTRACT_ADDRESS,
        abi: [{"inputs":[{"internalType":"address","name":"user","type":"address"},{"internalType":"uint256","name":"principalUsd6","type":"uint256"},{"internalType":"uint16","name":"capPct","type":"uint16"}],"name":"adminCreatePortfolio","outputs":[{"internalType":"uint256","name":"pid","type":"uint256"}],"stateMutability":"nonpayable","type":"function"}],
        functionName: 'adminCreatePortfolio',
        args: [user, principalUsd6, cap]
      })
    }
  })
  return { ...mutation, txHash: hash, isPending, receipt }
}

// Admin data enumeration
export function useLastUserId() {
  return useQuery({
    queryKey: ['lastUserId'],
    queryFn: async () => await readContract('lastUserId', [])
  })
}

export function useAllUsers({ enabled = true, limit } = {}) {
  const last = useLastUserId()
  return useQuery({
    queryKey: ['allUsers', keySafe(last.data), limit ?? null],
    enabled: enabled && last.isSuccess,
    queryFn: async () => {
      const max = Number(last.data || 0n)
      const upto = limit ? Math.min(max, limit) : max
      const addrs = []
      for (let i = 1; i <= upto; i++) {
        const addr = await readContract('idToAddress', [BigInt(i)])
        addrs.push(addr)
      }
      return addrs
    }
  })
}

export function useAllPortfolios({ limitUsers } = {}) {
  const users = useAllUsers({ enabled: true, limit: limitUsers })
  return useQuery({
    queryKey: ['allPortfolios', users.data],
    enabled: users.isSuccess,
    queryFn: async () => {
      const rows = []
      let totals = { count: 0, open: 0, principalUsd6: 0n, paidUsd6: 0n }
      for (const u of users.data) {
        if (!u || u === '0x0000000000000000000000000000000000000000') continue
        const pids = await readContract('portfoliosOf', [u])
        for (const pid of pids) {
          const p = await readContract('getPortfolio', [pid])
          const row = { pid: Number(pid), owner: u, ...p }
          rows.push(row)
          totals.count++
          if (!p.isClosed) totals.open++
          totals.principalUsd6 += BigInt(p.principalUsd6)
          totals.paidUsd6 += BigInt(p.paidUsd6)
        }
      }
      return { rows, totals }
    }
  })
}
