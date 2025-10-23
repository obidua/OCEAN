import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { useStore } from '../../store/useUserInfoStore';
import { Wallet, ArrowRight, AlertCircle, Link2 } from 'lucide-react';

/**
 * Referral landing flow for oceandefi.uk
 * Supports links like /invite/<refCode>
 */
export default function ReferralLanding() {
  const { ref: referralParam } = useParams();
  const navigate = useNavigate();
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const isUserRegistered = useStore((s) => s.isUserRegisterd);
  const setUserAddress = useStore((s) => s.setUserAddress);

  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  const referralCode = useMemo(() => referralParam ?? '', [referralParam]);

  useEffect(() => {
    if (referralCode) {
      try {
        localStorage.setItem('referralCode', referralCode);
      } catch {
        // ignore storage errors
      }
    }
  }, [referralCode]);

  useEffect(() => {
    if (!isConnected || !address) return;
    let cancelled = false;

    const validate = async () => {
      setChecking(true);
      setError('');
      try {
        const registered = await isUserRegistered(address);
        if (cancelled) return;
        setUserAddress(address);
        if (registered) {
          navigate('/dashboard', { replace: true });
        } else {
          const query = referralCode ? `?ref=${encodeURIComponent(referralCode)}` : '';
          navigate(`/signup${query}`, { replace: true });
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Referral check failed:', err);
        setError(err?.message || 'Unable to verify referral. Please try again.');
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    validate();
    return () => {
      cancelled = true;
    };
  }, [address, isConnected, isUserRegistered, navigate, referralCode, setUserAddress]);

  const handleConnect = async () => {
    setError('');
    if (!isConnected) {
      await open();
    } else if (address) {
      // force re-run of validation
      const query = referralCode ? `?ref=${encodeURIComponent(referralCode)}` : '';
      navigate(`/signup${query}`, { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 cyber-grid-bg relative flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-neon-green/10 pointer-events-none" />
      <div className="fixed inset-0 scan-lines pointer-events-none opacity-30" />
      <div className="w-full max-w-lg relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-neon-green rounded-xl flex items-center justify-center shadow-neon-cyan animate-glow-pulse relative">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-neon-green rounded-xl blur-xl opacity-60" />
              <Link2 size={28} className="text-dark-950 relative z-10" />
            </div>
            <div className="text-left">
              <p className="text-xs text-cyan-300/70 uppercase tracking-widest">OCEAN DeFi Referral</p>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-neon-green bg-clip-text text-transparent">
                Join via Partner Link
              </h1>
            </div>
          </div>
          <p className="text-cyan-300/80 text-sm">
            You’re moments away from activating your validator-backed account.
          </p>
        </div>

        <div className="cyber-glass rounded-2xl shadow-neon-cyan border border-cyan-500/30 p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/70 to-transparent" />

          {referralCode ? (
            <div className="mb-6 p-3 cyber-glass border border-neon-green/40 rounded-xl text-xs text-neon-green/80 flex items-center justify-between">
              <span>Referral Code</span>
              <code className="font-mono text-sm text-neon-green">{referralCode}</code>
            </div>
          ) : (
            <div className="mb-6 p-3 border border-cyan-500/30 rounded-xl text-xs text-cyan-300/80">
              No referral code detected. You can still onboard; a default sponsor will be applied.
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 cyber-glass border border-red-500/50 rounded-xl flex items-start gap-3 shadow-lg">
              <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5 animate-pulse" size={20} />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleConnect}
            disabled={checking}
            className="w-full py-3 sm:py-4 px-6 bg-gradient-to-r from-cyan-500 to-neon-green text-dark-950 rounded-xl font-bold hover:shadow-neon-cyan transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide text-sm sm:text-base relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-neon-green opacity-0 group-hover:opacity-100 transition-opacity" />
            <Wallet size={20} className="relative z-10" />
            <span className="relative z-10">
              {checking ? 'Checking access…' : isConnected ? 'Continue' : 'Connect Wallet'}
            </span>
          </button>

          <p className="mt-6 text-xs text-cyan-300/70">
            • Already registered wallets will be redirected to the dashboard.<br />
            • New wallets will be guided through account activation with a $10 USD minimum stake.
          </p>
        </div>

        <p className="text-center text-xs text-cyan-400/50 mt-6 uppercase tracking-widest">
          oceandefi.uk • Validator-backed staking ecosystem
        </p>
      </div>
    </div>
  );
}
