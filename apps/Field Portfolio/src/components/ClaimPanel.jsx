import { useClaimROI, useUnclaimedROI } from '../hooks/useFieldPortfolio'

export default function ClaimPanel() {
  const claim = useClaimROI()
  const unclaimed = useUnclaimedROI()

  const usd = Number(unclaimed.data?.usdTotal || 0) / 1e6
  const hasValue = usd > 0

  return (
    <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-700 space-y-3">
      <h2 className="text-xl font-semibold text-neon-green">Claim Rewards</h2>
      <p className="text-cyan-300/80 text-sm">Claim your accumulated ROI (auto-window).</p>
      {!hasValue && <p className="text-xs text-zinc-400">Nothing claimable right now.</p>}
      <button
        disabled={claim.isPending || !hasValue}
        onClick={() => claim.mutate()}
        className="px-4 py-2 rounded bg-cyan-600 disabled:opacity-40 hover:bg-cyan-500 transition"
      >
        {claim.isPending ? 'Claiming...' : 'Claim ROI'}
      </button>
      {claim.txHash && (
        <p className="text-xs break-all text-cyan-400">Tx: {claim.txHash}</p>
      )}
      {claim.receipt.isSuccess && <p className="text-xs text-green-400">Claim confirmed.</p>}
      {claim.error && <p className="text-xs text-red-400">{claim.error.message}</p>}
    </div>
  )
}
