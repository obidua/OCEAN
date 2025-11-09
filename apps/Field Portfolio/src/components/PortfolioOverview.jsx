import { usePortfolios } from '../hooks/useFieldPortfolio'

export default function PortfolioOverview() {
  const portfolios = usePortfolios()

  if (portfolios.isLoading) return <div>Loading portfolios...</div>
  if (portfolios.error) return <div className="text-red-400">Error loading portfolios</div>

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-neon-green">Your Portfolios</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {portfolios.data?.map(p => {
          const principalUsd = Number(p.principalUsd6) / 1e6
          const paidUsd = Number(p.paidUsd6) / 1e6
          const capUsd = (Number(p.principalUsd6) * p.capPct) / (100 * 1e6)
          const remainingUsd = Math.max(capUsd - paidUsd, 0)
          return (
            <div key={p.pid} className="p-4 rounded-lg bg-zinc-900 border border-zinc-700 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">PID #{p.pid}</span>
                {p.isClosed && <span className="text-xs px-2 py-1 bg-red-600 rounded">Closed</span>}
              </div>
              <p className="text-sm text-cyan-300/80">Principal: ${principalUsd.toFixed(2)}</p>
              <p className="text-sm text-cyan-300/80">Paid: ${paidUsd.toFixed(2)}</p>
              <p className="text-sm text-cyan-300/80">Cap: ${capUsd.toFixed(2)} ({p.capPct}%)</p>
              <p className="text-sm text-cyan-300/80">Remaining: ${remainingUsd.toFixed(2)}</p>
              <div className="text-xs text-zinc-400">Created: {new Date(Number(p.createdAt) * 1000).toLocaleDateString()}</div>
            </div>
          )
        })}
        {portfolios.data?.length === 0 && (
          <div className="p-4 rounded bg-zinc-800 text-cyan-300">No portfolios found.</div>
        )}
      </div>
    </div>
  )
}
