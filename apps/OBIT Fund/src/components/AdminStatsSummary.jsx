import { useAllPortfolios } from '../hooks/useFieldPortfolio'

export default function AdminStatsSummary() {
  const all = useAllPortfolios({})
  if (!all.isSuccess) return null
  const t = all.data.totals
  const principal = Number(t.principalUsd6) / 1e6
  const paid = Number(t.paidUsd6) / 1e6
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="p-3 rounded bg-zinc-900 border border-zinc-700">
        <div className="text-xs text-zinc-400">Total Portfolios</div>
        <div className="text-xl font-semibold">{t.count}</div>
      </div>
      <div className="p-3 rounded bg-zinc-900 border border-zinc-700">
        <div className="text-xs text-zinc-400">Open Portfolios</div>
        <div className="text-xl font-semibold">{t.open}</div>
      </div>
      <div className="p-3 rounded bg-zinc-900 border border-zinc-700">
        <div className="text-xs text-zinc-400">Total Principal (USD)</div>
        <div className="text-xl font-semibold">${principal.toFixed(2)}</div>
      </div>
      <div className="p-3 rounded bg-zinc-900 border border-zinc-700">
        <div className="text-xs text-zinc-400">Total Paid (USD)</div>
        <div className="text-xl font-semibold">${paid.toFixed(2)}</div>
      </div>
    </div>
  )
}
