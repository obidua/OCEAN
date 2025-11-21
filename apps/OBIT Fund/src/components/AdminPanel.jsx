import { useIsOwner, useAdminRegister, useAdminCreatePortfolio } from '../hooks/useFieldPortfolio'
import AdminStatsSummary from './AdminStatsSummary'
import AdminPortfolioTable from './AdminPortfolioTable'
import { useState } from 'react'

export default function AdminPanel() {
  const owner = useIsOwner()
  const reg = useAdminRegister()
  const create = useAdminCreatePortfolio()

  const [user, setUser] = useState('')
  const [referrer, setReferrer] = useState('')
  const [principalUsd, setPrincipalUsd] = useState('')
  const [capPct, setCapPct] = useState('200')

  if (!owner.isOwner) return null

  return (
    <section className="p-4 rounded-lg bg-zinc-950 border border-zinc-700 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Admin Tools</h2>
        <span className="text-xs text-green-400">Owner connected</span>
      </div>

      <AdminStatsSummary />

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <h3 className="font-medium text-neon-green">Register User</h3>
          <input value={user} onChange={e=>setUser(e.target.value)} placeholder="User address" className="w-full px-3 py-2 rounded bg-zinc-900 border border-zinc-700" />
          <input value={referrer} onChange={e=>setReferrer(e.target.value)} placeholder="Referrer (optional)" className="w-full px-3 py-2 rounded bg-zinc-900 border border-zinc-700" />
          <button
            onClick={()=>reg.mutate({ user, referrer })}
            disabled={reg.isPending || !user}
            className="px-4 py-2 rounded bg-cyan-600 disabled:opacity-40 hover:bg-cyan-500"
          >{reg.isPending ? 'Registering...' : 'Register'}</button>
          {reg.txHash && <div className="text-xs text-cyan-300 break-all">Tx: {reg.txHash}</div>}
          {reg.receipt?.isSuccess && <div className="text-xs text-green-400">Registration confirmed.</div>}
          {reg.error && <div className="text-xs text-red-400">{reg.error.message}</div>}
        </div>

        <div className="space-y-2">
          <h3 className="font-medium text-neon-orange">Create Portfolio</h3>
          <input value={user} onChange={e=>setUser(e.target.value)} placeholder="User address" className="w-full px-3 py-2 rounded bg-zinc-900 border border-zinc-700" />
          <input value={principalUsd} onChange={e=>setPrincipalUsd(e.target.value)} placeholder="Principal (USD)" className="w-full px-3 py-2 rounded bg-zinc-900 border border-zinc-700" />
          <input value={capPct} onChange={e=>setCapPct(e.target.value)} placeholder="Cap % (default 200)" className="w-full px-3 py-2 rounded bg-zinc-900 border border-zinc-700" />
          <button
            onClick={()=>create.mutate({ user, principalUsd, capPct })}
            disabled={create.isPending || !user || !principalUsd}
            className="px-4 py-2 rounded bg-cyan-600 disabled:opacity-40 hover:bg-cyan-500"
          >{create.isPending ? 'Creating...' : 'Create Portfolio'}</button>
          {create.txHash && <div className="text-xs text-cyan-300 break-all">Tx: {create.txHash}</div>}
          {create.receipt?.isSuccess && <div className="text-xs text-green-400">Portfolio created.</div>}
          {create.error && <div className="text-xs text-red-400">{create.error.message}</div>}
        </div>
      </div>

      <p className="text-xs text-zinc-500">Note: Principal is in USD (we convert to micro-USD on-chain). Cap% 200 means 2x cap.</p>

      <AdminPortfolioTable />
    </section>
  )
}
