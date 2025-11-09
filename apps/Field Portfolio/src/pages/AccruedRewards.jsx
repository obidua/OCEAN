import { useState, useMemo } from 'react'
import { useAppKitAccount } from '@reown/appkit/react'
import {
  useUnclaimedROI,
  usePortfolios,
  useClaimHistory,
  useClaimROI
} from '../hooks/useFieldPortfolio'
import WithdrawPanel from '../components/WithdrawPanel'
import {
  TrendingUp,
  Coins,
  Clock,
  RefreshCw,
  History,
  Timer,
  X,
  Calendar,
  BarChart3,
  AlertCircle
} from 'lucide-react'

function formatUSD(n) {
  const num = Number(n || 0)
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}

function formatRama(n) {
  const num = Number(n || 0)
  if (num === 0) return '0.00'
  if (num < 0.0001 && num > 0) return num.toPrecision(4)
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 6, minimumFractionDigits: 2 }).format(num)
}

function usd6ToNumber(usd6) {
  try { return Number(usd6) / 1e6 } catch { return 0 }
}

function ClaimHistoryModal({ isOpen, onClose, history, loading }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="cyber-glass rounded-xl border border-cyan-500/30 p-6 w-full max-w-4xl max-h-[80vh] overflow-auto space-y-4">
        <div className="flex items-center justify-between sticky top-0 bg-black/70 backdrop-blur-sm pb-4 border-b border-cyan-500/20">
          <h2 className="text-xl font-bold text-cyan-300">Claim History</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-cyan-500/10">
            <X size={20} className="text-cyan-300" />
          </button>
        </div>
        <div>
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin text-cyan-400"><RefreshCw /></div>
            </div>
          ) : (history?.length || 0) === 0 ? (
            <p className="text-center text-cyan-300/70 p-8">No claim history found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cyan-500/20 text-cyan-300/70 text-xs uppercase">
                  <th className="text-left py-3 px-4">Epoch</th>
                  <th className="text-left py-3 px-4">Period</th>
                  <th className="text-left py-3 px-4">Claimed At</th>
                  <th className="text-right py-3 px-4">USD</th>
                  <th className="text-right py-3 px-4">RAMA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-500/20">
                {history.map((item, idx) => {
                  const usd = usd6ToNumber(item.usdTotal ?? 0n)
                  const rama = Number(item.ramaTotal ?? 0n) / 1e18
                  const periodRange = `${item.fromPeriod ?? '—'} → ${item.toPeriod ?? '—'}`
                  return (
                    <tr key={idx} className="hover:bg-cyan-500/5">
                      <td className="py-3 px-4 text-cyan-200">{item.epoch ?? '—'}</td>
                      <td className="py-3 px-4 text-cyan-200 font-mono text-xs">{periodRange}</td>
                      <td className="py-3 px-4 text-cyan-200">{item.claimedAt ? new Date(Number(item.claimedAt) * 1000).toLocaleString() : '—'}</td>
                      <td className="py-3 px-4 text-right">{formatUSD(usd)}</td>
                      <td className="py-3 px-4 text-right">{formatRama(rama)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AccruedRewards() {
  const { address, isConnected } = useAppKitAccount()
  const unclaimed = useUnclaimedROI()
  const portfolios = usePortfolios()
  const historyQ = useClaimHistory()
  const claim = useClaimROI()

  const [showHistory, setShowHistory] = useState(false)

  const totals = useMemo(() => {
    const usd = unclaimed.data ? usd6ToNumber(unclaimed.data.usdTotal) : 0
    const rama = unclaimed.data ? Number(unclaimed.data.ramaTotal || 0n) / 1e18 : 0
    const epochs = unclaimed.data ? Number(unclaimed.data.epochsCount || 0n) : 0
    const fromP = unclaimed.data ? Number(unclaimed.data.fromPeriod || 0n) : 0
    const toP = unclaimed.data ? Number(unclaimed.data.toPeriod || 0n) : 0
    // Compute claimed USD and RAMA from claim history
    let claimedUsd = 0
    let claimedRama = 0
    if (historyQ.data) {
      for (const claim of historyQ.data) {
        claimedUsd += usd6ToNumber(claim.usdTotal || 0n)
        claimedRama += Number(claim.ramaTotal || 0n) / 1e18
      }
    }
    return { usd, rama, epochs, fromP, toP, claimedUsd, claimedRama }
  }, [unclaimed.data, historyQ.data])

  const userPortfolios = useMemo(() => {
    if (!portfolios.data) return []
    return portfolios.data.map(p => {
      const principal = usd6ToNumber(p.principalUsd6)
      const paid = usd6ToNumber(p.paidUsd6)
      const capPct = Number(p.capPct || 0)
      const capUsd = principal * (capPct / 100)
      const remaining = Math.max(capUsd - paid, 0)
      const createdAt = Number(p.createdAt || 0n)
      return {
        pid: Number(p.pid),
        principal,
        paid,
        capPct,
        capUsd,
        remaining,
        isClosed: Boolean(p.isClosed),
        createdAt
      }
    })
  }, [portfolios.data])

  const pending = !unclaimed.isLoading && !portfolios.isLoading && !claim.isPending
  const canClaim = pending && totals.usd > 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">Accrued Rewards</h1>
          <p className="text-cyan-300/80 mt-1">Track and claim your portfolio rewards.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => { unclaimed.refetch(); portfolios.refetch(); }}
            disabled={unclaimed.isFetching || portfolios.isFetching}
            className="px-3 py-2 text-xs font-semibold rounded-lg border border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/10 disabled:opacity-50"
          >
            <span className="flex items-center gap-2">
              <RefreshCw className={(unclaimed.isFetching || portfolios.isFetching) ? 'animate-spin' : ''} size={16} />
              <span>{(unclaimed.isFetching || portfolios.isFetching) ? 'Refreshing...' : 'Refresh'}</span>
            </span>
          </button>
          <button
            onClick={() => setShowHistory(true)}
            disabled={historyQ.isLoading}
            className="px-3 py-2 text-xs font-semibold rounded-lg border border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/10 disabled:opacity-50"
          >
            <span className="flex items-center gap-2">
              <History size={16} />
              <span>View History</span>
            </span>
          </button>
          <button
            onClick={() => claim.mutate()}
            disabled={!canClaim}
            className="px-4 py-2 text-sm font-bold rounded-lg bg-gradient-to-r from-emerald-500 to-green-500 text-white disabled:opacity-50"
          >
            <span className="flex items-center gap-2">
              <Coins size={16} />
              <span>{claim.isPending ? 'Claiming...' : 'Claim Accrued Reward'}</span>
            </span>
          </button>
        </div>
      </div>

      {/* Error */}
      {(unclaimed.error || portfolios.error) && (
        <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-4 flex items-start gap-3">
          <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
          <p className="text-red-200 text-sm">{unclaimed.error?.message || portfolios.error?.message || 'Failed to load data'}</p>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="cyber-glass rounded-xl border border-cyan-500/30 p-4 space-y-2">
          <div className="flex items-center gap-2 text-cyan-300/70"><Coins size={18} /><span className="text-xs uppercase">Total Claimed Reward</span></div>
          <div className="text-2xl font-bold text-cyan-100">{formatUSD(totals.claimedUsd)}</div>
          <p className="text-xs text-cyan-300/60">{formatRama(totals.claimedRama)} RAMA</p>
        </div>
        <div className="cyber-glass rounded-xl border border-emerald-500/30 p-4 space-y-2">
          <div className="flex items-center gap-2 text-emerald-300/70"><TrendingUp size={18} /><span className="text-xs uppercase">Unclaimed Reward</span></div>
          <div className="text-2xl font-bold text-emerald-400">{formatUSD(totals.usd)}</div>
          <p className="text-xs text-emerald-300/60">{formatRama(totals.rama)} RAMA</p>
        </div>
        <div className="cyber-glass rounded-xl border border-cyan-500/30 p-4 space-y-2">
          <div className="flex items-center gap-2 text-cyan-300/70"><Timer size={18} /><span className="text-xs uppercase">Unclaimed Window</span></div>
          <div className="text-cyan-100 text-sm font-mono">{totals.fromP} → {totals.toP}</div>
          <div className="text-cyan-300/60 text-xs">{totals.epochs} epochs</div>
        </div>
        <div className="cyber-glass rounded-xl border border-purple-500/30 p-4 space-y-2">
          <div className="flex items-center gap-2 text-purple-300/70"><Clock size={18} /><span className="text-xs uppercase">Total Portfolios</span></div>
          <div className="text-2xl font-bold text-purple-400">{userPortfolios.length}</div>
          <p className="text-xs text-purple-300/60">Active & running portfolios</p>
        </div>
      </div>

      {/* Withdraw Panel */}
      <WithdrawPanel />

      {/* Portfolio table */}
      <div className="cyber-glass rounded-xl border border-cyan-500/30 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-cyan-100">All Portfolios</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cyan-500/20">
                <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-cyan-300/70">PID</th>
                <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-cyan-300/70">Principal</th>
                <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-cyan-300/70">Paid</th>
                <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-cyan-300/70">Cap %</th>
                <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-cyan-300/70">Cap USD</th>
                <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-cyan-300/70">Remaining</th>
                <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-cyan-300/70">Created</th>
                <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-cyan-300/70">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-500/20">
              {portfolios.isLoading ? (
                <tr><td colSpan={8} className="py-8 text-center text-cyan-300">Loading...</td></tr>
              ) : userPortfolios.length === 0 ? (
                <tr><td colSpan={8} className="py-8 text-center text-cyan-300/70">No portfolios found.</td></tr>
              ) : (
                userPortfolios.map(p => {
                  const created = p.createdAt ? new Date(p.createdAt * 1000).toLocaleDateString('en-US', {year:'numeric',month:'short',day:'numeric'}) : '—'
                  return (
                    <tr key={p.pid} className="hover:bg-cyan-500/5">
                      <td className="py-3 px-4 text-cyan-200 font-mono">#{String(p.pid).padStart(4, '0')}</td>
                      <td className="py-3 px-4 text-right">{formatUSD(p.principal)}</td>
                      <td className="py-3 px-4 text-right">{formatUSD(p.paid)}</td>
                      <td className="py-3 px-4 text-right">{p.capPct}%</td>
                      <td className="py-3 px-4 text-right">{formatUSD(p.capUsd)}</td>
                      <td className="py-3 px-4 text-right">{formatUSD(p.remaining)}</td>
                      <td className="py-3 px-4 text-left text-cyan-200 text-xs whitespace-nowrap">{created}</td>
                      <td className="py-3 px-4 text-right">
                        {p.isClosed ? (
                          <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-300 rounded-full">Closed</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full">Running</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Claim History Modal */}
      <ClaimHistoryModal isOpen={showHistory} onClose={() => setShowHistory(false)} history={historyQ.data || []} loading={historyQ.isLoading} />
    </div>
  )
}
