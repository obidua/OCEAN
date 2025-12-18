import { useAppKitAccount, useAppKit } from '@reown/appkit/react';
import { Wallet } from 'lucide-react';

/**
 * Wallet Connection Status Indicator
 * Shows green glowing dot when connected, red when disconnected
 * Displays on all pages at the top right corner
 */
export default function WalletConnectionStatus() {
  const { isConnected, address } = useAppKitAccount();
  const { open } = useAppKit();

  const handleClick = () => {
    open();
  };

  // Format address for display (0x1234...5678)
  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 px-3 py-2 rounded-xl cyber-glass border border-cyan-500/30 hover:border-cyan-400/50 transition-all group cursor-pointer"
      title={isConnected ? `Connected: ${address}` : 'Click to connect wallet'}
    >
      {/* Glowing Status Dot */}
      <div className="relative">
        <div
          className={`w-2.5 h-2.5 rounded-full ${
            isConnected 
              ? 'bg-neon-green' 
              : 'bg-red-500'
          }`}
        />
        {/* Glow effect */}
        <div
          className={`absolute inset-0 w-2.5 h-2.5 rounded-full animate-ping opacity-75 ${
            isConnected 
              ? 'bg-neon-green' 
              : 'bg-red-500'
          }`}
          style={{ animationDuration: '2s' }}
        />
        {/* Outer glow */}
        <div
          className={`absolute -inset-1 rounded-full blur-sm ${
            isConnected 
              ? 'bg-neon-green/40' 
              : 'bg-red-500/40'
          }`}
        />
      </div>

      {/* Wallet Icon */}
      <Wallet 
        size={16} 
        className={`${
          isConnected 
            ? 'text-neon-green' 
            : 'text-red-400'
        } transition-colors`} 
      />

      {/* Status Text - Hidden on very small screens */}
      <span 
        className={`text-xs font-medium hidden sm:inline ${
          isConnected 
            ? 'text-neon-green' 
            : 'text-red-400'
        }`}
      >
        {isConnected ? formatAddress(address) : 'Not Connected'}
      </span>

      {/* Mobile: Just show Connected/Offline text */}
      <span 
        className={`text-xs font-medium sm:hidden ${
          isConnected 
            ? 'text-neon-green' 
            : 'text-red-400'
        }`}
      >
        {isConnected ? 'Online' : 'Offline'}
      </span>
    </button>
  );
}
