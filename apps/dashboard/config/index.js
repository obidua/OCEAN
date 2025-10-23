import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'

export const projectId = "5f2fd12d0417edef168ae25f9ec697ad"

const ramesttaNetwork = {
    id: 1370,
    name: 'Ramestta',
    nativeCurrency: {
        name: 'Rama',
        symbol: 'RAMA',
        decimals: 18,
    },
    rpcUrls: {
        default: {
            http: [
                'https://blockchain.ramestta.com',
                'https://blockchain2.ramestta.com'
            ],
        },
        public: {
            http: [
                'https://blockchain.ramestta.com',
                'https://blockchain2.ramestta.com',
            ],
        },
    },
    blockExplorers: {
        default: {
            name: 'Ramascan',
            url: 'https://ramascan.com/',
        },
    },
    testnet: false,
}

if (!projectId) {
    throw new Error('Project ID is not defined')
}

export const metadata = {
    name: 'OCEAN DeFi',
    description: 'OCEAN DeFi Dashboard',
    url: typeof window !== 'undefined' ? window.location.origin : 'https://oceandefi.uk',
    icons: ['https://avatars.githubusercontent.com/u/179229932']
}

// Networks array (no type assertion needed in JS)
export const networks = [ramesttaNetwork]

// Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
    projectId,
    networks
})

export const config = wagmiAdapter.wagmiConfig
