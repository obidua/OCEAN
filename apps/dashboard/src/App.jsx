import Approute from './Approute';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { projectId, metadata, getNetworks, getWagmiAdapter } from '../config'
import { createAppKit } from '@reown/appkit/react'
import { WagmiProvider } from 'wagmi';

function App() {
  const queryClient = new QueryClient();

  // Get initialized wagmi adapter and networks
  const wagmiAdapter = getWagmiAdapter()
  const networks = getNetworks()

  // RamaPay wallet configuration - Official Ramestta Wallet
  const ramaPayWallet = {
    id: 'ramapay',
    name: 'RamaPay',
    homepage: 'https://ramestta.com/ramapay',
    image_url: 'https://ramestta.com/assets/RamaPay%20Wallet-BVpk7FJX.png',
    mobile_link: 'ramapay://', // Deep link for RamaPay wallet
    play_store: 'https://play.google.com/store/apps/details?id=io.ramestta.wallet',
    // app_store: '', // iOS coming soon
  }

  // Create modal configuration
  const generalConfig = {
    projectId,
    networks,
    metadata,
    themeMode: 'black',
    themeVariables: {
      '--w3m-accent': '#000000',
    }
  }

  // Create modal
  createAppKit({
    adapters: [wagmiAdapter],
    ...generalConfig,
    // Add RamaPay as a custom wallet option
    customWallets: [ramaPayWallet],
    features: {
      analytics: false // Optional - defaults to your Cloud configuration
    }
  })

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <Approute />
        <PWAInstallPrompt />
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
