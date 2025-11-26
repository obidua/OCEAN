import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: 8786,
    proxy: {
      '/api': {
        target: 'https://testapi.oceandefi.uk',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  optimizeDeps: { 
    exclude: ['lucide-react'] 
  },
  build: {
    sourcemap: mode !== 'production',
    minify: mode === 'production' ? 'terser' : 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'web3-vendor': ['web3', 'wagmi', 'viem'],
          'ui-vendor': ['@headlessui/react', '@mui/x-charts', 'recharts'],
        }
      }
    },
    // Performance optimizations
    chunkSizeWarningLimit: 1000,
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
  }
}))
