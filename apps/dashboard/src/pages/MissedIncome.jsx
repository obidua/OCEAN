import { useEffect, useMemo, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  ArrowRight,
  CalendarClock,
  Activity,
  Target,
  RefreshCw,
  Wallet,
  Layers,
  ClipboardList,
  ShieldCheck,
} from 'lucide-react';
import NumberPopup from '../components/NumberPopup';
import { useStore } from '../../store/useUserInfoStore';
import { formatUSD } from '../utils/contractData';

const RECOVERY_STEPS = [
  {
    title: 'Top Up Existing Portfolio',
    details:
      'Increase the active stake to unlock a fresh lifetime cap and resume all suspended income streams instantly.',
    action: { label: 'Go to Stake & Invest', to: '/dashboard/stake' },
  },
  {
    title: 'Launch a New Portfolio',
    details:
      'Diversify into a new package and split earnings across multiple caps for smoother long-term growth.',
    action: { label: 'Open Portfolio Wizard', to: '/dashboard/stake' },
  },
  {
    title: 'Talk to Success Coach',
    details:
      'Book a strategy call with our support desk to review options for restoring missed income momentum.',
    action: { label: 'Contact Support', to: '/dashboard/settings' },
  },
];

export default function MissedIncome() {
  const userAddress = typeof window !== 'undefined' ? localStorage.getItem('userAddress') : null;
  const getMissedIncomeOverview = useStore((s) => s.getMissedIncomeOverview);
  const getMissedIncomeSlice = useStore((s) => s.getMissedIncomeSlice);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [overview, setOverview] = useState(null);
  const [timeline, setTimeline] = useState([]);

  // Auto-scroll refs
  const timelineContainerRef = useRef(null);
  const autoScrollFrame = useRef(null);
  const autoScrollPaused = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!userAddress) return;
      setLoading(true);
      setError(null);
      try {
        const [ov, sl] = await Promise.all([
          getMissedIncomeOverview(userAddress),
          getMissedIncomeSlice(userAddress, 0, 50),
        ]);
        if (!cancelled) {
          setOverview(ov);
          setTimeline(sl?.entries || []);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setError(err?.message || 'Unable to load missed income.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [userAddress, getMissedIncomeOverview, getMissedIncomeSlice]);

  // Auto-scroll effect for timeline
  useEffect(() => {
    const container = timelineContainerRef.current;
    if (!container || !timeline?.length) return;

    const scroll = () => {
      if (autoScrollPaused.current) {
        autoScrollFrame.current = requestAnimationFrame(scroll);
        return;
      }

      const maxScroll = container.scrollHeight - container.clientHeight;
      if (maxScroll <= 0) return;

      const currentScroll = container.scrollTop;
      const scrollSpeed = 0.5; // Adjust speed as needed

      if (currentScroll >= maxScroll) {
        // Reset to top when reaching bottom
        container.scrollTop = 0;
      } else {
        container.scrollTop = currentScroll + scrollSpeed;
      }

      autoScrollFrame.current = requestAnimationFrame(scroll);
    };

    // Pause on hover
    const handleMouseEnter = () => {
      autoScrollPaused.current = true;
    };

    const handleMouseLeave = () => {
      autoScrollPaused.current = false;
    };

    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);

    autoScrollFrame.current = requestAnimationFrame(scroll);

    return () => {
      if (autoScrollFrame.current) {
        cancelAnimationFrame(autoScrollFrame.current);
      }
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [timeline]);

  const capDate = useMemo(() => {
    if (!overview?.capReachedAt) return null;
    try {
      return new Date(overview.capReachedAt * 1000);
    } catch {
      return null;
    }
  }, [overview]);

  const categories = useMemo(() => {
    const missed = overview?.missed || {};
    const total = Number(overview?.totalMissedUsd || 0) || 0;
    const pct = (v) => (total > 0 ? `${Math.round((v / total) * 100)}%` : '0%');
    return [
      {
        key: 'spot',
        title: 'Spot Income',
        amountUsd: missed.spotUsd || 0,
        share: pct(missed.spotUsd || 0),
        description:
          'Direct trading/spot income paused while your portfolio is cap-locked.',
        accent: 'text-cyan-300',
        border: 'border-cyan-400/40',
      },
      {
        key: 'slab',
        title: 'Slab Income',
        amountUsd: missed.slabUsd || 0,
        share: pct(missed.slabUsd || 0),
        description:
          'Team slab rewards calculated but withheld during cap lock.',
        accent: 'text-neon-orange',
        border: 'border-neon-orange/40',
      },
      {
        key: 'override',
        title: 'Slab Override',
        amountUsd: missed.slabOverrideUsd || 0,
        share: pct(missed.slabOverrideUsd || 0),
        description:
          'Same-slab override payouts held until a new portfolio activates.',
        accent: 'text-neon-purple',
        border: 'border-neon-purple/40',
      },
    ];
  }, [overview]);

  const timelineUi = useMemo(() => {
    return (timeline || []).map((e) => {
      const d = new Date((Number(e.at) || 0) * 1000);
      const dateStr = Number.isFinite(d.getTime()) ? d.toLocaleDateString() : '';
      const label = `${(e.kind || 'missed').toUpperCase()} Missed`;
      const note = `Missed ${formatUSD(e.amountUsd || 0)} on portfolio #${e.pid} · reason: ${e.reason}`;
      return { date: dateStr, label, note };
    });
  }, [timeline]);

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="cyber-glass border border-red-400/40 bg-red-500/5 rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-cyan-500/10 pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-red-300 uppercase tracking-[0.3em] text-xs">
              <AlertTriangle size={16} className="animate-pulse" />
              <span>Income Halted</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Missed Income Dashboard
            </h1>
            {error && (
              <div className="bg-red-500/10 border border-red-500/40 text-red-200 rounded-xl px-4 py-2 text-xs">
                {error}
              </div>
            )}
            <p className="text-sm sm:text-base text-red-100/80 max-w-3xl">
              {overview?.capLocked
                ? (
                  <>
                    Your portfolio is currently cap-locked{capDate ? (
                      <> since <span className="font-semibold text-white">{capDate.toLocaleDateString()}</span></>
                    ) : null}. Missed income below reflects what could not be credited during the lock.
                  </>
                ) : (
                  <>Your account has an open, uncapped portfolio. Any held balances below are now claimable.</>
                )}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-red-200/80">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-red-500/40">
                <CalendarClock size={14} />
                {overview?.daysSinceCap ?? 0} days since last cap
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-red-500/40">
                <RefreshCw size={14} />
                {overview?.capLocked ? 'Top up or create a new portfolio to restart income.' : 'Active portfolio detected — you can claim held balances.'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:w-auto md:min-w-[260px]">
            <div className="cyber-glass border border-red-400/40 rounded-xl p-4 text-center">
              <p className="text-xs uppercase tracking-wider text-red-200/80 mb-2">
                Total Missed Income (USD)
              </p>
              <NumberPopup
                value={formatUSD(overview?.totalMissedUsd || 0)}
                label="Total missed"
                className="text-2xl sm:text-3xl font-bold text-red-300"
              />
            </div>
            <div className="cyber-glass border border-cyan-400/40 rounded-xl p-4 text-center">
              <p className="text-xs uppercase tracking-wider text-cyan-200/80 mb-2">
                Held Balances (USD)
              </p>
              <NumberPopup
                value={formatUSD(0)}
                label="Royalty + Rewards"
                className="text-2xl sm:text-3xl font-bold text-cyan-300"
              />
              <p className="text-[11px] text-cyan-200/70 mt-2">
                Hold amounts will surface here once post-cap rewards accrue while portfolios are inactive.
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {categories.map((category) => (
          <div
            key={category.key}
            className={`cyber-glass border ${category.border} rounded-2xl p-5 sm:p-6 flex flex-col gap-4 transition-all hover:border-white/40`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-sm font-semibold uppercase tracking-wide ${category.accent}`}>
                  {category.title}
                </p>
                <p className="text-xs text-slate-200/70">{category.description}</p>
              </div>
              <BarChart3 className={`${category.accent} opacity-80`} size={24} />
            </div>
            <NumberPopup
              value={formatUSD(category.amountUsd)}
              label={category.title}
              className="text-2xl font-bold text-white"
            />
            <div className="flex items-center justify-between text-xs text-slate-200/70 bg-white/5 border border-white/5 rounded-lg px-3 py-2">
              <span className="flex items-center gap-2">
                <Activity size={14} className={category.accent} />
                Share of total
              </span>
              <span className={`font-semibold ${category.accent}`}>{category.share}</span>
            </div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[2fr,3fr] gap-6">
        <div className="cyber-glass border border-cyan-500/30 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Target className="text-neon-green" size={22} />
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-cyan-200">
                Recovery Priorities
              </h2>
              <p className="text-xs text-cyan-200/70">
                Choose one of the recommended actions to restart earnings.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {RECOVERY_STEPS.map((step, index) => (
              <div
                key={step.title}
                className="cyber-glass border border-cyan-500/30 rounded-xl p-4 hover:border-cyan-400/50 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-sm font-semibold text-cyan-300">
                    {index + 1}
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="text-sm font-semibold text-cyan-200">{step.title}</h3>
                    <p className="text-xs text-cyan-200/70 leading-relaxed">{step.details}</p>
                    {step.action && (
                      <Link
                        to={step.action.to}
                        className="inline-flex items-center gap-2 text-xs font-semibold text-neon-green hover:text-white transition-colors"
                      >
                        {step.action.label}
                        <ArrowRight size={14} />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="cyber-glass border border-cyan-500/30 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <ClipboardList className="text-neon-green" size={22} />
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-cyan-200">
                Missed Income Timeline
              </h2>
              <p className="text-xs text-cyan-200/70">
                Review key checkpoints after the cap was reached. (Hover to pause scrolling)
              </p>
            </div>
          </div>

          <div
            ref={timelineContainerRef}
            className="space-y-4 max-h-[500px] overflow-y-auto pr-2 hide-scrollbar"
            style={{ scrollBehavior: 'auto' }}
          >
            {(timelineUi || []).map((entry, idx) => (
              <div key={idx} className="relative pl-6">
                {idx !== (timelineUi?.length || 0) - 1 && (
                  <span className="absolute left-2 top-5 bottom-0 w-px bg-gradient-to-b from-cyan-500/50 via-cyan-500/20 to-transparent" />
                )}
                <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-cyan-500/60 bg-dark-950" />
                <div className="cyber-glass border border-cyan-500/20 rounded-xl p-4">
                  <div className="flex items-center justify-between text-xs text-cyan-200/80 mb-2">
                    <span className="font-semibold text-cyan-200">{entry.label}</span>
                    <span>{entry.date}</span>
                  </div>
                  <p className="text-xs text-cyan-200/70 leading-relaxed">{entry.note}</p>
                </div>
              </div>
            ))}
            {!loading && (!timelineUi || !timelineUi.length) && (
              <div className="text-xs text-cyan-300/70">No missed income records yet.</div>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="cyber-glass border border-cyan-500/30 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-3">
            <Wallet className="text-neon-green" size={20} />
            <h3 className="text-sm font-semibold text-cyan-200">Current Funds</h3>
          </div>
          <p className="text-xs text-cyan-200/70">
            Safe wallet and pending portfolios remain untouched. You can redeploy them instantly
            into a new allocation.
          </p>
          <Link
            to="/dashboard/safe-wallet"
            className="inline-flex items-center gap-2 text-xs font-semibold text-neon-green hover:text-white transition-colors"
          >
            Review balances
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="cyber-glass border border-cyan-500/30 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-3">
            <Layers className="text-neon-purple" size={20} />
            <h3 className="text-sm font-semibold text-cyan-200">Team Volume Check</h3>
          </div>
          <p className="text-xs text-cyan-200/70">
            Your directs are still producing volume. Ensure new portfolios are active to capture
            their contributions.
          </p>
          <Link
            to="/dashboard/team"
            className="inline-flex items-center gap-2 text-xs font-semibold text-neon-purple hover:text-white transition-colors"
          >
            View network
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="cyber-glass border border-cyan-500/30 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-neon-orange" size={20} />
            <h3 className="text-sm font-semibold text-cyan-200">Protection Status</h3>
          </div>
          <p className="text-xs text-cyan-200/70">
            Royalty and one-time rewards keep accruing in hold while cap-locked. Create a new
            portfolio to release them and resume all streams.
          </p>
          <Link
            to="/dashboard/settings"
            className="inline-flex items-center gap-2 text-xs font-semibold text-neon-orange hover:text-white transition-colors"
          >
            Review policy
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </div>
  );
}
