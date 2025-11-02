// src/components/MoreMenu.jsx
import { useEffect, useMemo, useState } from "react";
import {
  X,
  Users,
  Award,
  Trophy,
  Gift,
  Shield,
  History,
  TrendingUp,
  Info,
  Settings,
  FileDown,
  LogOut,
  Presentation,
  BookOpen,
  Wallet,
  Coins,
  AlertTriangle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { generateOceanDefiPDF } from "../utils/generatePDF";
import { useAccount, useDisconnect } from "wagmi";
import AddressWithCopy from "./AddressWithCopy";
import CopyButton from "./CopyButton";
import { useStore } from "../../store/useUserInfoStore";

const menuSections = [
  {
    title: "Income & Rewards",
    items: [
      {
        path: "/dashboard/accrued-rewards",
        label: "Accrued Rewards",
        icon: TrendingUp,
        color: "text-emerald-400",
      },
      {
        path: "/dashboard/slab",
        label: "Slab Income",
        icon: Award,
        color: "text-neon-purple",
      },
      {
        path: "/dashboard/stake",
        label: "Stake",
        icon: Wallet,
        color: "text-cyan-300",
      },
      {
        path: "/dashboard/spot-income",
        label: "Spot Income",
        icon: Coins,
        color: "text-cyan-300",
      },
      {
        path: "/dashboard/royalty",
        label: "Royalty Program",
        icon: Trophy,
        color: "text-amber-400",
      },
      {
        path: "/dashboard/rewards",
        label: "One-Time Rewards",
        icon: Gift,
        color: "text-neon-pink",
      },
      {
        path: "/dashboard/missed-income",
        label: "Missed Income",
        icon: AlertTriangle,
        color: "text-neon-orange",
      },
    ],
  },
  {
    title: "Network & Assets",
    items: [
      {
        path: "/dashboard/team",
        label: "Team Network",
        icon: Users,
        color: "text-sky-400",
      },
      {
        path: "/dashboard/safe-wallet",
        label: "Safe Wallet",
        icon: Shield,
        color: "text-emerald-400",
      },
      // Intentionally hidden from mobile menu per request; route remains available at /dashboard/transaction-history
      // {
      //   path: "/dashboard/transaction-history",
      //   label: "Transaction History",
      //   icon: History,
      //   color: "text-fuchsia-400",
      // },
    ],
  },
  {
    title: "Analytics & Info",
    items: [
      {
        path: "/dashboard/analytics",
        label: "Analytics",
        icon: TrendingUp,
        color: "text-neon-green",
      },
      {
        path: "/dashboard/presentation",
        label: "Presentation",
        icon: Presentation,
        color: "text-violet-300",
      },
      {
        path: "/dashboard/about",
        label: "About & Vision",
        icon: Info,
        color: "text-indigo-300",
      },
    ],
  },
];

export default function MoreMenu({ isOpen, onClose = () => {} }) {
  const { connector, address } = useAccount();
  const { disconnect, disconnectAsync } = useDisconnect();
  const userIdByAdd = useStore((s) => s.userIdByAdd);
  const clearUserAddress = useStore((s) => s.clearUserAddress);
  const [resolvedUserId, setResolvedUserId] = useState(null);
  const [resolvingUserId, setResolvingUserId] = useState(false);

  const userAddressStore = localStorage.getItem("userAddress");

  const nukeWalletCaches = () => {
    const keys = [
      "wagmi.store",
      "walletconnect", // WalletConnect v1
      "wc", // WalletConnect v2
      "WALLETCONNECT_DEEPLINK_CHOICE",
      "WEB3_CONNECT_CACHED_PROVIDER",
      "W3M_CONNECTED_CONNECTOR",
      "WCM_VERSION",
    ];
    keys.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {}
      try {
        sessionStorage.removeItem(k);
      } catch {}
    });
  };

  const handleDisconnect = async () => {
    try {
      // Temporarily disable sounds during disconnect
      if (typeof window !== 'undefined' && window.financialSounds) {
        window.financialSounds.setTemporarilyDisabled(true, 10000);
      }

      // 1. Clear our internal state first
      try {
        clearUserAddress();
        localStorage.removeItem('userAddress');
      } catch {}

      // 2. Clear wallet caches before disconnecting
      nukeWalletCaches();

      // 3. Disconnect wallet connections
      if (disconnectAsync) await disconnectAsync();
      else if (disconnect) await Promise.resolve(disconnect());

      // 4. Additional provider cleanup
      try {
        const provider = await connector?.getProvider?.();
        if (provider?.disconnect) await provider.disconnect();
        if (provider?.wc?.destroy) await provider.wc.destroy();
        if (provider?.close) await provider.close();
      } catch {}

      // 5. Clear any AppKit specific caches
      try {
        if (window.appKit && window.appKit.reset) {
          window.appKit.reset();
        }
        // Clear AppKit specific storage
        const appKitKeys = ['appkit', 'w3m', 'reown'];
        appKitKeys.forEach(key => {
          try {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
          } catch {}
        });
      } catch {}

      // 6. Clear any remaining wallet state
      try {
        // Clear IndexedDB wallet data
        if (window.indexedDB) {
          const deleteReq = window.indexedDB.deleteDatabase('appkit');
          deleteReq.onsuccess = () => console.log('AppKit DB cleared');
        }
      } catch {}

      // 7. Clear Service Worker caches to prevent wallet state persistence
      try {
        if ('serviceWorker' in navigator && 'caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
          );
          console.log('Service Worker caches cleared');
        }
      } catch (e) {
        console.log('Cache clearing failed:', e);
      }

    } finally {
      // 8. Add a small delay before redirect to ensure cleanup completes
      setTimeout(() => {
        window.location.replace('/login');
      }, 750); // Increased delay for cache clearing
    }
  };

  const handlePDFDownload = () => {
    generateOceanDefiPDF();
    onClose(); // safe to close; not changing routes
  };

  useEffect(() => {
    let cancelled = false;
    const resolve = async () => {
      if (!userIdByAdd || !userAddressStore || userAddressStore.length !== 42) {
        if (!cancelled) {
          setResolvedUserId(null);
          setResolvingUserId(false);
        }
        return;
      }
      setResolvingUserId(true);
      try {
        const result = await userIdByAdd(userAddressStore);
        if (!cancelled) {
          const rawId =
            (result && typeof result === "object"
              ? result.id ?? result[1]
              : result) ?? null;
          const numeric = Number(rawId);
          if (Number.isFinite(numeric) && numeric > 0) {
            setResolvedUserId(numeric);
          } else if (rawId != null && rawId !== "") {
            setResolvedUserId(rawId);
          } else {
            setResolvedUserId(null);
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.warn("userId lookup failed (MoreMenu):", err);
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
  }, [userAddressStore, userIdByAdd]);

  const formattedUserId = useMemo(() => {
    if (
      resolvedUserId == null ||
      resolvedUserId === "" ||
      resolvedUserId === false
    )
      return null;
    const value =
      typeof resolvedUserId === "number"
        ? resolvedUserId
        : Number(resolvedUserId);
    if (Number.isFinite(value) && value > 0) {
      return `USR-${String(value).padStart(4, "0")}`;
    }
    return String(resolvedUserId);
  }, [resolvedUserId]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        onClick={onClose}
      />

      <div className="fixed inset-x-0 bottom-0 z-50 lg:hidden max-h-[85vh] animate-slide-up">
        <div className="cyber-glass border-t border-cyan-500/30 rounded-t-3xl overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

          <div className="sticky top-0 cyber-glass border-b border-cyan-500/30 px-6 py-4 flex items-center justify-between z-10">
            <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green">
              More Options
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-cyan-500/10 rounded-lg transition-all border border-cyan-500/20 hover:border-cyan-500/40 text-cyan-400"
            >
              <X size={20} />
            </button>
          </div>

          <div className="overflow-y-auto max-h-[calc(85vh-5rem)] px-4 pb-6 hide-scrollbar">
            
            
            <div className="mt-4 mb-6">
              <div className="cyber-glass border border-cyan-500/30 rounded-2xl px-4 py-3">
                <p className="text-[11px] font-semibold text-cyan-400/80 uppercase tracking-wider">
                  {address ? "Connected Wallet":"View Mode"}
                </p>
                <AddressWithCopy
                  address={userAddressStore}
                  className="mt-2"
                  textClassName="font-mono text-sm text-cyan-200"
                />
                <div className="mt-3 text-[11px] text-cyan-300/80 flex items-center gap-2">
                  <span>User ID:</span>
                  {resolvingUserId ? (
                    <span className="text-cyan-200">Resolving…</span>
                  ) : formattedUserId ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="font-semibold text-neon-green">
                        {formattedUserId}
                      </span>
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
            </div>


            {menuSections.map((section, idx) => (
              <div key={idx} className="mb-6">
                <h3 className="text-xs font-semibold text-cyan-400/70 uppercase tracking-wider px-3 mb-2 mt-4">
                  {section.title}
                </h3>
                <div className="space-y-1">
                  {section.items.map(({ path, label, icon: Icon, color }) => (
                    <Link
                      key={path}
                      to={path}
                      onClick={onClose}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:bg-cyan-500/10 text-slate-400 hover:text-cyan-300 border border-transparent hover:border-cyan-500/20 group"
                    >
                      <Icon size={20} className={`flex-shrink-0 ${color}`} />
                      <span className="text-sm font-medium flex-1">
                        {label}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            <div className="mt-6 pt-6 border-t border-cyan-500/30">
              <h3 className="text-xs font-semibold text-cyan-400/70 uppercase tracking-wider px-3 mb-2">
                Settings & Actions
              </h3>
              <div className="space-y-1">
                <Link
                  to="/dashboard/settings"
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:bg-cyan-500/10 text-slate-400 hover:text-cyan-300 border border-transparent hover:border-cyan-500/20"
                >
                  <Settings size={20} />
                  <span className="text-sm font-medium flex-1">
                    Settings & Rules
                  </span>
                </Link>

                <button
                  onClick={handlePDFDownload}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:bg-cyan-500/10 text-cyan-400 border border-transparent hover:border-cyan-500/30 group"
                >
                  <FileDown size={20} className="group-hover:animate-pulse" />
                  <span className="text-sm font-medium flex-1 text-left">
                    Download PDF
                  </span>
                </button>

                <button
                  onClick={handleDisconnect}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:bg-red-500/10 text-red-400 border border-transparent hover:border-red-500/30 group"
                >
                  <LogOut size={20} className="group-hover:animate-pulse" />
                  <span className="text-sm font-medium flex-1 text-left">
                    Disconnect
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
