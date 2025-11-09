import { useAllPortfolios } from '../hooks/useFieldPortfolio'

export default function AdminPortfolioTable() {
  const all = useAllPortfolios({})
  if (all.isLoading) return <div>Loading portfolios...</div>
  if (all.error) return <div className="text-red-400">Failed to load portfolios</div>

  const rows = all.data?.rows || []

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-zinc-400">
            <th className="text-left py-2 pr-3">PID</th>
            <th className="text-left py-2 pr-3">Owner</th>
            <th className="text-right py-2 pr-3">Principal (USD)</th>
            <th className="text-right py-2 pr-3">Paid (USD)</th>
            <th className="text-right py-2 pr-3">Cap %</th>
            <th className="text-left py-2 pr-3">Status</th>
            <th className="text-left py-2 pr-3">Created</th>
            <th className="text-left py-2 pr-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const principal = Number(r.principalUsd6) / 1e6
            const paid = Number(r.paidUsd6) / 1e6
            const created = new Date(Number(r.createdAt) * 1000).toLocaleString()
            return (
              <tr key={`${r.owner}-${r.pid}`} className="border-b border-zinc-900">
                <td className="py-2 pr-3">{r.pid}</td>
                <td className="py-2 pr-3 font-mono text-xs break-all max-w-[240px]">{r.owner}</td>
                <td className="py-2 pr-3 text-right">${principal.toFixed(2)}</td>
                <td className="py-2 pr-3 text-right">${paid.toFixed(2)}</td>
                <td className="py-2 pr-3 text-right">{r.capPct}</td>
                <td className="py-2 pr-3">{r.isClosed ? <span className="text-red-400">Closed</span> : <span className="text-green-400">Open</span>}</td>
                <td className="py-2 pr-3">{created}</td>
                <td className="py-2 pr-3">
                  <button className="px-3 py-1 rounded bg-zinc-800 text-zinc-500 cursor-not-allowed" title="No on-chain close function. Requires contract update." disabled>
                    Close
                  </button>
                </td>
              </tr>
            )
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="py-6 text-center text-zinc-400">No portfolios found</td>
            </tr>
          )}
        </tbody>
      </table>
      <p className="text-xs text-zinc-500 mt-2">Note: Contract does not expose an admin close function. Closing requires claim to reach cap or a new contract method.</p>
    </div>
  )
}
