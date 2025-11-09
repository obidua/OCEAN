import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import { useIsRegistered, usePortfolioIds, useIsOwner } from '../hooks/useFieldPortfolio'

export default function ConnectGuard({ children }) {
  const { open } = useAppKit()
  const { address, isConnected } = useAppKitAccount()
  const isReg = useIsRegistered()
  const ids = usePortfolioIds()
  const ownerStatus = useIsOwner()

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Field Executives Portal</h1>
          <p className="text-cyan-300/80">Only whitelisted addresses with a portfolio can access.</p>
          <button onClick={() => open()} className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400">Connect Wallet</button>
        </div>
      </div>
    )
  }

  if (isReg.isLoading || ids.isLoading || ownerStatus.isLoading) {
    return <div className="min-h-screen grid place-items-center text-white">Loading...</div>
  }

  // Owner bypass: if owner connected, allow access regardless of registration/portfolio presence
  const allowed = ownerStatus.isOwner || (isReg.data && Array.isArray(ids.data) && ids.data.length > 0)

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center space-y-3">
          <h2 className="text-xl font-semibold">Access Restricted</h2>
          <p className="text-cyan-300/80">This wallet is not registered or has no field portfolio.</p>
        </div>
      </div>
    )
  }

  return children
}
