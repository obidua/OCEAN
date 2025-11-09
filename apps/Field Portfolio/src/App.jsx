import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createAppKit } from '@reown/appkit/react'
import { projectId, metadata, networks, wagmiAdapter } from '../config/index.js'
import ConnectGuard from './components/ConnectGuard'
import PortfolioOverview from './components/PortfolioOverview'
import EarningsSummary from './components/EarningsSummary'
import ClaimPanel from './components/ClaimPanel'
import ClaimHistory from './components/ClaimHistory'

const generalConfig = {
  projectId,
  networks,
  metadata,
  themeMode: 'black',
  themeVariables: { '--w3m-accent': '#00d4ff' },
}

createAppKit({ adapters: [wagmiAdapter], ...generalConfig })

const queryClient = new QueryClient()

export default function App() {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ConnectGuard>
          <div className="min-h-screen bg-black text-white">
            <header className="border-b border-zinc-800 p-4 flex items-center justify-between">
              <h1 className="text-2xl font-bold">Field Executives Portal</h1>
              <appkit-button />
            </header>
            <main className="max-w-5xl mx-auto p-4 space-y-6">
              <EarningsSummary />
              <ClaimPanel />
              <PortfolioOverview />
              <ClaimHistory />
            </main>
          </div>
        </ConnectGuard>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
