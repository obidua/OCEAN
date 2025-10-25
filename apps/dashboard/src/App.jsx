import Approute from './Approute';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { projectId, metadata, networks, wagmiAdapter } from '../config'
import { createAppKit } from '@reown/appkit/react'
import { WagmiProvider } from 'wagmi';

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
  features: {
    analytics: false // Optional - defaults to your Cloud configuration
  }
})

function App() {

  const queryClient = new QueryClient();

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
