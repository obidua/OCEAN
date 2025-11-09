import { useUnclaimedROI } from '../hooks/useFieldPortfolio'

export default function EarningsSummary() {
  const unclaimed = useUnclaimedROI()

  if (unclaimed.isLoading) return <div>Loading earnings...</div>
  if (unclaimed.error) return <div className="text-red-400">Failed to load earnings</div>

  const usd = Number(unclaimed.data?.usdTotal || 0) / 1e6
  const rama = Number(unclaimed.data?.ramaTotal || 0) / 1e18

  return (
    <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-700 space-y-2">
      <h2 className="text-xl font-semibold text-neon-orange">Unclaimed Earnings</h2>
      <p className="text-cyan-300/80">USD: ${usd.toFixed(2)}</p>
      <p className="text-cyan-300/80">RAMA: {rama.toFixed(6)}</p>
      <p className="text-xs text-zinc-500">Epochs counted: {unclaimed.data?.epochsCount || 0}</p>
      <p className="text-xs text-zinc-500">Window: {unclaimed.data?.fromPeriod} → {unclaimed.data?.toPeriod}</p>
    </div>
  )
}
