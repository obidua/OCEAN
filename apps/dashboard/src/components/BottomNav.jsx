import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Wallet, MoreHorizontal, Shield } from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { path: '/dashboard/stake', label: 'Stake', icon: Wallet },
  { path: '/dashboard/safe-wallet', label: 'Safe Wallet', icon: Shield },
];

export default function BottomNav({ onMoreClick }) {
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname === path;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden safe-area-bottom" style={{ position: '-webkit-sticky', WebkitTransform: 'translateZ(0)', transform: 'translateZ(0)' }}>
      <div className="cyber-glass border-t border-cyan-500/30 backdrop-blur-xl pb-1" style={{ WebkitBackdropFilter: 'blur(12px)' }}>
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

        <div className="grid grid-cols-4 h-16 pt-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex flex-col items-center justify-center gap-1 transition-all relative group
                  ${active
                    ? 'text-cyan-400'
                    : 'text-slate-400 hover:text-cyan-300'
                  }
                `}
              >
                {active && (
                  <>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-cyan-500 to-neon-green rounded-b-full" />
                    <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 to-transparent" />
                  </>
                )}

                <div className={`
                  relative z-10 p-2 rounded-lg transition-all
                  ${active
                    ? 'bg-cyan-500/20 border border-cyan-500/30 shadow-neon-cyan'
                    : 'group-hover:bg-cyan-500/10'
                  }
                `}>
                  <Icon size={20} className={active ? 'animate-pulse' : ''} />
                </div>

                <span className={`
                  text-xs font-medium relative z-10 transition-all
                  ${active ? 'text-cyan-400 font-bold' : ''}
                `}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          <button
            onClick={onMoreClick}
            className="flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-cyan-300 transition-all group"
          >
            <div className="relative z-10 p-2 rounded-lg group-hover:bg-cyan-500/10 transition-all">
              <MoreHorizontal size={20} />
            </div>
            <span className="text-xs font-medium relative z-10">More</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
