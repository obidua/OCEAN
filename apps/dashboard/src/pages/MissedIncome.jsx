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
  const getMissedByKind = useStore((s) => s.getMissedByKind);
  const getMissedTotalsByReason = useStore((s) => s.getMissedTotalsByReason);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [overview, setOverview] = useState(null);
  const [entries, setEntries] = useState([]);
  const [missedByKind, setMissedByKind] = useState(null);
  const [missedReasonsTotals, setMissedReasonsTotals] = useState([]);

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
          setEntries(sl?.entries || []);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setError(err?.message || 'Unable to load missed income.');
      } finally {
        if (!cancelled) setLoading(false);
      }

      if (userAddress) {
        try {
          const [byKind, reasonTotals] = await Promise.all([
            typeof getMissedByKind === 'function'
              ? getMissedByKind(userAddress)
              : Promise.resolve(null),
            typeof getMissedTotalsByReason === 'function'
              ? getMissedTotalsByReason(userAddress)
              : Promise.resolve([]),
          ]);
          if (!cancelled) {
            if (byKind) setMissedByKind(byKind);
            if (reasonTotals) setMissedReasonsTotals(reasonTotals);
          }
        } catch (aggErr) {
          console.warn('Failed to load missed income aggregates:', aggErr);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [userAddress, getMissedIncomeOverview, getMissedIncomeSlice, getMissedByKind, getMissedTotalsByReason]);

  // Auto-scroll effect for timeline
  useEffect(() => {
    const container = timelineContainerRef.current;
    if (!container || !entries?.length) return;

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
  }, [entries]);

  const capDate = useMemo(() => {
    if (!overview?.capReachedAt) return null;
    try {
      return new Date(overview.capReachedAt * 1000);
    } catch {
      return null;
    }
  }, [overview]);

  const categories = useMemo(() => {
    const missed = missedByKind ?? overview?.missed ?? {};
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

  const totalMissedUsd = overview?.totalMissedUsd || 0;
  const earnedTotals = overview?.earned || {};
  const totalEarnedUsd =
    (earnedTotals.roiUsd || 0) +
    (earnedTotals.spotUsd || 0) +
    (earnedTotals.slabUsd || 0) +
    (earnedTotals.slabOverrideUsd || 0);
  const heldTotals = overview?.held || {};
  const heldRoyaltyUsd = heldTotals.royaltyUsd || 0;
  const heldOneTimeUsd =
    heldTotals.oneTimeUsd != null
      ? heldTotals.oneTimeUsd
      : heldTotals.rewardsUsd || 0;
  const heldTotalUsd =
    heldTotals.totalUsd != null
      ? heldTotals.totalUsd
      : heldRoyaltyUsd + heldOneTimeUsd;

  const kindBreakdown = useMemo(() => {
    const buckets = new Map();
    (entries || []).forEach((entry) => {
      const bucket = buckets.get(entry.kind) || {
        kind: entry.kind,
        count: 0,
        total: 0,
        reasons: new Map(),
      };
      bucket.count += 1;
      bucket.total += entry.amountUsd || 0;
      const reasonKey = entry.reason || 'unknown';
      bucket.reasons.set(reasonKey, (bucket.reasons.get(reasonKey) || 0) + (entry.amountUsd || 0));
      buckets.set(entry.kind, bucket);
    });
    return Array.from(buckets.values())
      .map((bucket) => {
        const topReason = Array.from(bucket.reasons.entries())
          .sort((a, b) => b[1] - a[1])[0];
        return {
          kind: bucket.kind,
          count: bucket.count,
          total: bucket.total,
          share: totalMissedUsd > 0 ? (bucket.total / totalMissedUsd) * 100 : 0,
          topReason: topReason ? topReason[0] : '—',
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [entries, totalMissedUsd]);

  const portfolioBreakdown = useMemo(() => {
    const buckets = new Map();
    (entries || []).forEach((entry) => {
      if (!Number.isFinite(entry.pid) || entry.pid <= 0) return;
      const bucket = buckets.get(entry.pid) || {
        pid: entry.pid,
        count: 0,
        total: 0,
        kinds: new Map(),
      };
      bucket.count += 1;
      bucket.total += entry.amountUsd || 0;
      bucket.kinds.set(entry.kind, (bucket.kinds.get(entry.kind) || 0) + (entry.amountUsd || 0));
      buckets.set(entry.pid, bucket);
    });
    return Array.from(buckets.values())
      .map((bucket) => {
        const topKind = Array.from(bucket.kinds.entries())
          .sort((a, b) => b[1] - a[1])[0];
        return {
          pid: bucket.pid,
          count: bucket.count,
          total: bucket.total,
          topKind: topKind ? topKind[0] : '—',
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [entries]);

  const timelineUi = useMemo(() => {
    return (entries || []).map((e) => {
      const d = new Date((Number(e.at) || 0) * 1000);
      const dateStr = Number.isFinite(d.getTime()) ? d.toLocaleDateString() : '';
      const label = `${(e.kind || 'missed').toUpperCase()} Missed`;
      const note = `Missed ${formatUSD(e.amountUsd || 0)} on portfolio #${e.pid} · reason: ${e.reason}`;
      return { date: dateStr, label, note };
    });
  }, [entries]);

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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:w-auto md:min-w-[280px]">
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
                value={formatUSD(heldTotalUsd)}
                label="Royalty + Rewards"
                className="text-2xl sm:text-3xl font-bold text-cyan-300"
              />
              <div className="text-[11px] text-cyan-200/70 mt-2 space-y-1">
                <p>Royalty Hold: <span className="text-emerald-300 font-medium">{formatUSD(heldRoyaltyUsd)}</span></p>
                <p>One-Time Hold: <span className="text-emerald-300 font-medium">{formatUSD(heldOneTimeUsd)}</span></p>
              </div>
            </div>
            <div className="cyber-glass border border-emerald-400/40 rounded-xl p-4 text-center sm:col-span-2">
              <p className="text-xs uppercase tracking-wider text-emerald-200/80 mb-2">
                Lifetime Earned Before Cap
              </p>
              <NumberPopup
                value={formatUSD(totalEarnedUsd)}
                label="Total earned"
                className="text-2xl sm:text-3xl font-bold text-emerald-300"
              />
              <p className="text-[11px] text-emerald-200/70 mt-2">
                Includes ROI, spot, slab, and override income credited before the current lock.
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

      {reasonsTop.length > 0 && (
        <section className="cyber-glass border border-cyan-500/30 rounded-2xl p-6 space-y-3">
          <h2 className="text-sm font-semibold text-cyan-200 uppercase tracking-wide">
            Top Missed Reasons
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {reasonsTop.map((reason) => (
              <div
                key={reason.reasonHex}
                className="border border-cyan-500/20 rounded-xl px-4 py-3 bg-cyan-500/5"
              >
                <p className="text-xs text-cyan-200/70 uppercase tracking-wide">
                  {reason.label}
                </p>
                <p className="text-sm font-semibold text-emerald-300 mt-1">
                  {formatUSD(reason.totalUsd)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {(kindBreakdown.length > 0 || portfolioBreakdown.length > 0) && (
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="cyber-glass border border-cyan-500/30 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="text-cyan-300" size={20} />
                <h2 className="text-base font-semibold text-cyan-200">
                  Missed Income By Type
                </h2>
              </div>
              <span className="text-xs text-cyan-300/70">
                {kindBreakdown.length} categories
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead className="text-cyan-300/70 uppercase tracking-wide">
                  <tr>
                    <th className="text-left py-2 pr-3">Type</th>
                    <th className="text-right py-2 px-3">Occurrences</th>
                    <th className="text-right py-2 px-3">Total USD</th>
                    <th className="text-right py-2 px-3">Share</th>
                    <th className="text-left py-2 pl-3">Top Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cyan-500/10">
                  {kindBreakdown.map((row) => (
                    <tr key={row.kind} className="hover:bg-cyan-500/5 transition-colors">
                      <td className="py-2 pr-3 font-mono uppercase text-cyan-100">{row.kind}</td>
                      <td className="py-2 px-3 text-right text-cyan-100">{row.count}</td>
                      <td className="py-2 px-3 text-right text-emerald-300">{formatUSD(row.total)}</td>
                      <td className="py-2 px-3 text-right text-cyan-200">
                        {row.share > 0 ? `${row.share.toFixed(1)}%` : '0%'}
                      </td>
                      <td className="py-2 pl-3 text-cyan-200/80">{row.topReason}</td>
                    </tr>
                  ))}
                  {kindBreakdown.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-cyan-300/70">
                        No missed income captured yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="cyber-glass border border-cyan-500/30 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Layers className="text-neon-purple" size={20} />
                <h2 className="text-base font-semibold text-cyan-200">
                  Portfolio Impact
                </h2>
              </div>
              <span className="text-xs text-cyan-300/70">
                {portfolioBreakdown.length} affected portfolios
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead className="text-cyan-300/70 uppercase tracking-wide">
                  <tr>
                    <th className="text-left py-2 pr-3">Portfolio #</th>
                    <th className="text-right py-2 px-3">Missed Events</th>
                    <th className="text-right py-2 px-3">Total USD</th>
                    <th className="text-left py-2 pl-3">Primary Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cyan-500/10">
                  {portfolioBreakdown.map((row) => (
                    <tr key={row.pid} className="hover:bg-cyan-500/5 transition-colors">
                      <td className="py-2 pr-3 font-mono text-cyan-100">#{row.pid}</td>
                      <td className="py-2 px-3 text-right text-cyan-100">{row.count}</td>
                      <td className="py-2 px-3 text-right text-emerald-300">{formatUSD(row.total)}</td>
                      <td className="py-2 pl-3 text-cyan-200/80 uppercase">{row.topKind}</td>
                    </tr>
                  ))}
                  {portfolioBreakdown.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-cyan-300/70">
                        No portfolio-level missed income detected.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <section className="cyber-glass border border-cyan-500/30 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ClipboardList className="text-neon-green" size={22} />
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-cyan-200">
                Detailed Missed Records
              </h2>
              <p className="text-xs text-cyan-200/70">
                Latest {entries.length} events pulled directly from CappingIncomeManager.
              </p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead className="text-cyan-300/70 uppercase tracking-wide">
              <tr>
                <th className="text-left py-2 pr-3">Date</th>
                <th className="text-left py-2 px-3">Type</th>
                <th className="text-left py-2 px-3">Reason</th>
                <th className="text-right py-2 px-3">Portfolio</th>
                <th className="text-right py-2 pl-3">USD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-500/10">
              {entries.map((entry) => {
                const date = Number.isFinite(entry.at)
                  ? new Date(entry.at * 1000).toLocaleString()
                  : '—';
                return (
                  <tr key={entry.id} className="hover:bg-cyan-500/5 transition-colors">
                    <td className="py-2 pr-3 text-cyan-100">{date}</td>
                    <td className="py-2 px-3 font-mono uppercase text-cyan-100">{entry.kind}</td>
                    <td className="py-2 px-3 text-cyan-200/80">{entry.reason}</td>
                    <td className="py-2 px-3 text-right text-cyan-200">
                      {entry.pid > 0 ? `#${entry.pid}` : '—'}
                    </td>
                    <td className="py-2 pl-3 text-right text-emerald-300">{formatUSD(entry.amountUsd)}</td>
                  </tr>
                );
              })}
              {!loading && entries.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-cyan-300/70">
                    No missed income events recorded for this account.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
            <div className="ml-auto">
              <Link
                to="/dashboard/missed-income/history"
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-cyan-200 border border-cyan-500/40 rounded-lg hover:border-cyan-300 transition-all"
              >
                View Full History
                <ArrowRight size={14} />
              </Link>
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
  const reasonsTop = useMemo(() => {
    return missedReasonsTotals
      .slice()
      .sort((a, b) => (b.totalUsd || 0) - (a.totalUsd || 0))
      .slice(0, 3);
  }, [missedReasonsTotals]);
