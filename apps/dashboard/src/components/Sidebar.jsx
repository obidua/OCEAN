// src/components/Sidebar.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Wallet, TrendingUp, Users, Award, Trophy, Gift, Shield,
  History, Info, Settings, FileDown, LogOut, Presentation, BookOpen, Waves,
  AlertTriangle, Coins
} from 'lucide-react';
import { generateOceanDefiPDF } from '../utils/generatePDF';
import { useAccount, useDisconnect } from 'wagmi';
import { useStore } from '../../store/useUserInfoStore';
import AddressWithCopy from './AddressWithCopy';
import CopyButton from './CopyButton';

const mainNavItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-neon-green' },
  { path: '/dashboard/stake', label: 'Stake & Invest', icon: Wallet, color: 'text-neon-purple' },
];

const menuSections = [
  {
    title: 'Income & Rewards',
    items: [
      { path: '/dashboard/accrued-rewards', label: 'Accrued Rewards', icon: Award, color: 'text-neon-green' },
      { path: '/dashboard/slab', label: 'Slab Income', icon: Award, color: 'text-neon-purple' },
      { path: '/dashboard/spot-income', label: 'Spot Income', icon: Coins, color: 'text-emerald-400' },
      { path: '/dashboard/royalty', label: 'Royalty Program', icon: Trophy, color: 'text-amber-400' },
      { path: '/dashboard/rewards', label: 'One-Time Rewards', icon: Gift, color: 'text-neon-pink' },
      { path: '/dashboard/missed-income', label: 'Missed Income', icon: AlertTriangle, color: 'text-neon-orange' },
    ],
  },
  {
    title: 'Network & Assets',
    items: [
      { path: '/dashboard/team', label: 'Team Network', icon: Users, color: 'text-sky-400' },
      { path: '/dashboard/safe-wallet', label: 'Safe Wallet', icon: Shield, color: 'text-emerald-400' },
      { path: '/dashboard/transaction-history', label: 'Income & Trx History', icon: History, color: 'text-fuchsia-400' },
    ],
  },
  {
    title: 'Analytics & Info',
    items: [
      { path: '/dashboard/analytics', label: 'Analytics', icon: TrendingUp, color: 'text-neon-green' },
      { path: '/dashboard/presentation', label: 'Presentation', icon: Presentation, color: 'text-violet-300' },
      { path: '/dashboard/ocean-defi-guide', label: 'About Ocean DeFi', icon: BookOpen, color: 'text-cyan-200' },
      { path: '/dashboard/about', label: 'About & Vision', icon: Info, color: 'text-indigo-300' },
    ],
  },
];

export default function Sidebar() {
  const { connector, address: wagmiAddress } = useAccount();
  const { disconnect, disconnectAsync } = useDisconnect();
  const userAddressFromStore = useStore((s) => s.userAddress);
  const userIdByAdd = useStore((s) => s.userIdByAdd);
  const clearUserAddress = useStore((s) => s.clearUserAddress);
  const [resolvedUserId, setResolvedUserId] = useState(null);
  const [resolvingUserId, setResolvingUserId] = useState(false);

  const connectedAddress =
    wagmiAddress ??
    userAddressFromStore ??
    (typeof window !== 'undefined' ? localStorage.getItem('userAddress') : null);

  useEffect(() => {
    let cancelled = false;
    const resolve = async () => {
      if (!userIdByAdd || !connectedAddress || connectedAddress.length !== 42) {
        if (!cancelled) {
          setResolvedUserId(null);
          setResolvingUserId(false);
        }
        return;
      }
      setResolvingUserId(true);
      try {
        const result = await userIdByAdd(connectedAddress);
        if (!cancelled) {
          const rawId =
            (result && typeof result === 'object'
              ? result.id ?? result[1]
              : result) ?? null;
          const numeric = Number(rawId);
          if (Number.isFinite(numeric) && numeric > 0) {
            setResolvedUserId(numeric);
          } else if (rawId != null && rawId !== '') {
            setResolvedUserId(rawId);
          } else {
            setResolvedUserId(null);
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('userId lookup failed:', err);
          setResolvedUserId(null);
        }
      } finally {
        if (!cancelled) {
          setResolvingUserId(false);
        }
      }
    };
    resolve();
    return () => {
      cancelled = true;
    };
  }, [connectedAddress, userIdByAdd]);

  const nukeWalletCaches = () => {
    const keys = [
      'wagmi.store',
      'walletconnect',                  // WC v1
      'wc',                             // WC v2
      'WALLETCONNECT_DEEPLINK_CHOICE',
      'WEB3_CONNECT_CACHED_PROVIDER',
      'W3M_CONNECTED_CONNECTOR',
      'WCM_VERSION',
    ];
    keys.forEach((k) => {
      try { localStorage.removeItem(k); } catch { }
      try { sessionStorage.removeItem(k); } catch { }
    });
  };

  const handleDisconnect = async () => {
    try {
      if (disconnectAsync) await disconnectAsync();
      else if (disconnect) await Promise.resolve(disconnect());

      try {
        const provider = await connector?.getProvider?.();
        if (provider?.disconnect) await provider.disconnect();
        if (provider?.wc?.destroy) await provider.wc.destroy();
        if (provider?.close) await provider.close();
      } catch { }

      try {
        clearUserAddress();
      } catch {
        /* ignore */
      }
      nukeWalletCaches();
    } finally {
      // Hard reload to fully reset any in-memory state; AuthGate will send to /login
      window.location.replace('/login');
    }
  };

  const handlePDFDownload = () => generateOceanDefiPDF();

  const linkClasses = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg transition-all group relative ${isActive
      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-neon-cyan'
      : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/20'
    }`;

  const formattedUserId = useMemo(() => {
    if (resolvedUserId == null || resolvedUserId === '' || resolvedUserId === false) return null;
    const value = typeof resolvedUserId === 'number'
      ? resolvedUserId
      : Number(resolvedUserId);
    if (Number.isFinite(value) && value > 0) {
      return `USR-${String(value).padStart(4, '0')}`;
    }
    return String(resolvedUserId);
  }, [resolvedUserId]);

  return (
    <aside className="hidden lg:flex flex-col w-64 h-full cyber-glass border-r border-cyan-500/30 overflow-hidden">
      <div className="p-6 border-b border-cyan-500/30">
        <Link to="/dashboard" className="flex items-center gap-2">
          <Waves className="text-cyan-400" size={28} />
          <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green">
            OCEAN DeFi
          </span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar p-4">
        {connectedAddress && (
          <div className="mb-6 cyber-glass border border-cyan-500/30 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-cyan-400/70 uppercase tracking-wider">
              Connected Wallet
            </p>
            <AddressWithCopy
              address={connectedAddress}
              copyLabel=""
              textClassName="font-mono text-cyan-200 truncate max-w-[180px]"
            />
            <div className="text-xs text-cyan-300/80 flex items-center gap-2">
              <span>User ID:</span>
              {resolvingUserId ? (
                <span className="text-cyan-200">Resolving…</span>
              ) : formattedUserId ? (
                <span className="inline-flex items-center gap-2">
                  <span className="font-semibold text-neon-green">{formattedUserId}</span>
                  <CopyButton
                    text={formattedUserId}
                    label=""
                    className="px-1 py-0.5"
                    ariaLabel="Copy user id"
                  />
                </span>
              ) : (
                <span className="text-cyan-300/60">—</span>
              )}
            </div>
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-xs font-semibold text-cyan-400/70 uppercase tracking-wider px-3 mb-2">
            Main Menu
          </h3>
          <div className="space-y-1">
            {mainNavItems.map(({ path, label, icon: Icon, color }) => (
              <NavLink key={path} to={path} className={linkClasses} end={path === '/dashboard'}>
                {({ isActive }) =>
                  <>
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-cyan-500 to-neon-green rounded-r-full" />
                    )}
                    <Icon
                      size={20}
                      className={`flex-shrink-0 transition-colors ${
                        isActive ? 'text-white' : color
                      }`}
                    />
                    <span className="text-sm font-medium flex-1">{label}</span>
                  </>
                }
              </NavLink>
            ))}
          </div>
        </div>

        {menuSections.map((section, idx) => (
          <div key={idx} className="mb-6">
            <h3 className="text-xs font-semibold text-cyan-400/70 uppercase tracking-wider px-3 mb-2">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map(({ path, label, icon: Icon, color }) => (
                <NavLink key={path} to={path} className={linkClasses}>
                  {({ isActive }) =>
                    <>
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-cyan-500 to-neon-green rounded-r-full" />
                      )}
                      <Icon
                        size={20}
                        className={`flex-shrink-0 transition-colors ${
                          isActive ? 'text-white' : color
                        }`}
                      />
                      <span className="text-sm font-medium flex-1">{label}</span>
                    </>
                  }
                </NavLink>
              ))}
            </div>
          </div>
        ))}

        <div className="mt-6 pt-6 border-t border-cyan-500/30">
          <h3 className="text-xs font-semibold text-cyan-400/70 uppercase tracking-wider px-3 mb-2">
            Settings & Actions
          </h3>
          <div className="space-y-1">
            <NavLink to="/dashboard/settings" className={linkClasses}>
              {({ isActive }) =>
                <>
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-cyan-500 to-neon-green rounded-r-full" />
                  )}
                  <Settings size={20} />
                  <span className="text-sm font-medium flex-1">Settings & Rules</span>
                </>
              }
            </NavLink>

            <button
              onClick={handlePDFDownload}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:bg-cyan-500/10 text-cyan-400 border border-transparent hover:border-cyan-500/30 group"
            >
              <FileDown size={20} className="group-hover:animate-pulse" />
              <span className="text-sm font-medium flex-1 text-left">Download PDF</span>
            </button>

            <button
              onClick={handleDisconnect}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:bg-red-500/10 text-red-400 border border-transparent hover:border-red-500/30 group"
            >
              <LogOut size={20} className="group-hover:animate-pulse" />
              <span className="text-sm font-medium flex-1 text-left">Disconnect</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
