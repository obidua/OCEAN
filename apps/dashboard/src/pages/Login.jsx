import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Wallet, Search, ArrowRight, AlertCircle, Waves } from 'lucide-react';
// import { mockConnectWallet, checkWalletRegistration, getUserById } from '../utils/walletAuth';
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { useStore } from '../../store/useUserInfoStore';
import RPCStatus from '../components/RPCStatus';
import { switchToWorkingRPC } from '../utils/networkSwitcher';

export default function Login() {
  const [userId, setUserId] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();


  const { address, isConnected } = useAppKitAccount();
  const { open } = useAppKit();


  const getUserDetails = useStore((s) => s.getUserDetails);
  const isUserRegisterd = useStore((s) => s.isUserRegisterd);
  const setUserAddress = useStore((s) => s.setUserAddress);

  const handleConnectWallet = async () => {
    setIsConnecting(true);
    setError('');
    try {

      const res = await isUserRegisterd(address);
      if (!res) {
        navigate('/signup', { state: { address } });
        return
      }

      setUserAddress(address);
      navigate('/dashboard');

    } catch (error) {
      console.error('Wallet connection failed:', error);
      setError('Failed to connect wallet. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleViewById = async (e) => {
    e.preventDefault();
    setError('');

    if (userId.trim()) {
      const response = await getUserDetails(userId);
      // console.log(response?.UserAddress)

      if (response) {
        setUserAddress(response?.UserAddress.trim())
        navigate('/dashboard');
      }
      else {
        setError('User ID not found. Please check and try again.');
      }
    }
  };


  // Auto-switch to working RPC when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      // Small delay to ensure wallet is fully connected
      const timer = setTimeout(async () => {
        try {
          const result = await switchToWorkingRPC();
          if (result.success && !result.alreadyConnected) {
            console.log(`✅ Network switched: ${result.message}`);
          }
        } catch (error) {
          console.warn('Auto RPC switch failed:', error);
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isConnected, address]);

  useEffect(() => {
    if (isConnected && address) {
      handleConnectWallet();
    }
  }, [isConnected, address])

  return (
    <div className="min-h-screen bg-dark-950 cyber-grid-bg relative flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-neon-green/10 pointer-events-none" />
      <div className="fixed inset-0 scan-lines pointer-events-none opacity-30" />
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-6 sm:mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-cyan-500 to-neon-green rounded-xl flex items-center justify-center shadow-neon-cyan animate-glow-pulse relative">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-neon-green rounded-xl blur-xl opacity-60" />
              <Waves className="text-dark-950 relative z-10" size={28} />
            </div>
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-neon-green bg-clip-text text-transparent mb-2 text-neon-glow">
            OCEAN DeFi
          </h1>
          <p className="text-cyan-300/90 uppercase tracking-widest text-xs sm:text-sm">Built on Ramestta</p>
          <Link to="/" className="text-cyan-400 hover:text-neon-green text-xs sm:text-sm mt-2 inline-block transition-colors">← Back to Home</Link>
        </div>

        <div className="cyber-glass rounded-2xl shadow-neon-cyan border border-cyan-500/30 p-6 sm:p-8 relative overflow-hidden hover-glow-cyan">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/70 to-transparent" />
          <h2 className="text-xl sm:text-2xl font-bold text-cyan-300 mb-6 uppercase tracking-wide">Welcome Back</h2>

          {error && (
            <div className="mb-4 p-4 cyber-glass border border-red-500/50 rounded-xl flex items-start gap-3 shadow-lg">
              <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5 animate-pulse" size={20} />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* RPC Status Display */}
          <div className="mb-6">
            <RPCStatus />
          </div>

          <button
            onClick={async () => {
              if (!isConnected) {
                await open();
              } else {
                await handleConnectWallet(); // already connected -> proceed
              }
            }}
            disabled={isConnecting}
            className="w-full py-3 sm:py-4 px-4 sm:px-6 bg-gradient-to-r from-cyan-500 to-neon-green text-dark-950 rounded-xl font-bold hover:shadow-neon-cyan transition-all flex items-center justify-center gap-2 sm:gap-3 mb-6 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] uppercase tracking-wide text-sm sm:text-base relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-neon-green opacity-0 group-hover:opacity-100 transition-opacity" />
            <Wallet size={20} className="relative z-10" />
            <span className="relative z-10">{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-cyan-500/30"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-dark-900 text-cyan-400 uppercase tracking-wider">Or</span>
            </div>
          </div>

          <form onSubmit={handleViewById}>
            <label className="block text-sm font-medium text-cyan-400 mb-3 uppercase tracking-wide">
              View Dashboard by ID
            </label>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400/50" size={20} />
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Enter user ID"
                  className="w-full pl-10 pr-4 py-3 bg-dark-900/50 border border-cyan-500/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-cyan-300 placeholder-cyan-400/30 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={!userId.trim()}
                className="w-full px-6 py-3 cyber-glass border border-cyan-500/50 text-cyan-400 rounded-xl font-bold hover:bg-cyan-500/10 hover:shadow-neon-cyan transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase"
              >
                View
                <ArrowRight size={18} />
              </button>
            </div>
          </form>

          <p className="text-center text-xs sm:text-sm text-cyan-300/90 mt-6">
            New to OCEAN DeFi?{' '}
            <button
              onClick={() => navigate('/signup')}
              className="text-neon-green hover:text-cyan-400 font-bold transition-colors"
            >
              Create Account
            </button>
          </p>
        </div>

        <p className="text-center text-xs text-cyan-400/50 mt-4 sm:mt-6 uppercase tracking-widest px-4">
          Validator-Backed Staking Ecosystem
        </p>
      </div>
    </div>
  );
}
