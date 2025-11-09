import { useAllPortfolios, useAdminClosePortfolio } from '../hooks/useFieldPortfolio'
import { useState } from 'react'

export default function AdminPortfolioTable() {
  const all = useAllPortfolios({})
  const closePortfolio = useAdminClosePortfolio()
  const [closingPid, setClosingPid] = useState(null)

  if (all.isLoading) return <div>Loading portfolios...</div>
  if (all.error) return <div className="text-red-400">Failed to load portfolios</div>

  const rows = all.data?.rows || []

  const handleClose = async (pid) => {
    if (!confirm(`Close portfolio #${pid}? This cannot be undone.`)) return
    setClosingPid(pid)
    try {
      await closePortfolio.mutateAsync({ pid })
    } catch (err) {
      console.error('Close failed:', err)
      alert(err.message || 'Failed to close portfolio')
    } finally {
      setClosingPid(null)
    }
  }

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
                  {r.isClosed ? (
                    <span className="text-xs text-zinc-500">Closed</span>
                  ) : (
                    <button 
                      onClick={() => handleClose(r.pid)}
                      disabled={closingPid === r.pid || closePortfolio.isPending}
                      className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-xs transition-colors"
                    >
                      {closingPid === r.pid ? 'Closing...' : 'Close'}
                    </button>
                  )}
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
      {closePortfolio.txHash && (
        <div className="mt-3 text-xs text-zinc-400">
          Transaction: <span className="font-mono">{closePortfolio.txHash}</span>
          {closePortfolio.receipt.isSuccess && <span className="ml-2 text-green-400">✓ Confirmed</span>}
        </div>
      )}
    </div>
  )
}
