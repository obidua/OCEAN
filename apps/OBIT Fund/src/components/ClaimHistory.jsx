import { useClaimHistory } from '../hooks/useFieldPortfolio'

export default function ClaimHistory() {
  const hist = useClaimHistory()

  if (hist.isLoading) return <div>Loading history...</div>
  if (hist.error) return <div className="text-red-400">Failed to load history</div>

  const list = hist.data || []

  return (
    <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-700 space-y-3">
      <h2 className="text-xl font-semibold text-neon-orange">Claim History</h2>
      {list.length === 0 && <p className="text-sm text-zinc-400">No claims yet.</p>}
      <div className="space-y-2">
        {list.map((r, idx) => (
          <div key={idx} className="flex justify-between text-sm border-b border-zinc-800 pb-2">
            <div className="text-cyan-300/80">Periods {r.fromPeriod} → {r.toPeriod}</div>
            <div className="text-zinc-300">${(Number(r.usdTotal)/1e6).toFixed(2)} | {(Number(r.ramaTotal)/1e18).toFixed(6)} RAMA</div>
          </div>
        ))}
      </div>
    </div>
  )
}
