import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../store/useUserInfoStore';
import { formatUSD } from '../utils/contractData';
import {
  ArrowLeft,
  Download,
  Filter,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react';

const PAGE_SIZE = 100;

export default function MissedIncomeHistory() {
  const userAddress =
    typeof window !== 'undefined'
      ? localStorage.getItem('userAddress')
      : null;
  const getMissedIncomeSliceFiltered = useStore(
    (s) => s.getMissedIncomeSliceFiltered
  );
  const getMissedByKind = useStore((s) => s.getMissedByKind);
  const getMissedTotalsByReason = useStore(
    (s) => s.getMissedTotalsByReason
  );

  const [entries, setEntries] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const [selectedKind, setSelectedKind] = useState('all');
  const [selectedReason, setSelectedReason] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [kindTotals, setKindTotals] = useState(null);
  const [reasonOptions, setReasonOptions] = useState([]);
  const [totalMatched, setTotalMatched] = useState(0);

  const offsetRef = useRef(0);

  const loadEntries = useCallback(
    async (reset = false) => {
      if (
        !userAddress ||
        typeof getMissedIncomeSliceFiltered !== 'function'
      )
        return;

      const nextOffset = reset ? 0 : offsetRef.current;
      const setLoadingState = reset ? setLoading : setLoadingMore;

      setLoadingState(true);
      setError(null);
      try {
        const res = await getMissedIncomeSliceFiltered(userAddress, {
          kind: selectedKind !== 'all' ? selectedKind : null,
          reason:
            selectedReason !== 'all' ? selectedReason : null,
          offset: nextOffset,
          limit: PAGE_SIZE,
        });
        const newEntries = res?.entries ?? [];
        setEntries((prev) =>
          reset ? newEntries : [...prev, ...newEntries]
        );
        const updatedOffset = nextOffset + newEntries.length;
        offsetRef.current = updatedOffset;
        setOffset(updatedOffset);
        const matched =
          res?.totalMatched != null
            ? Number(res.totalMatched)
            : updatedOffset;
        setTotalMatched(matched);
        setHasMore(updatedOffset < matched);
      } catch (err) {
        console.error('Missed income history load failed:', err);
        setError(err?.message || 'Unable to load missed income history.');
      } finally {
        setLoadingState(false);
      }
    },
    [userAddress, getMissedIncomeSliceFiltered, selectedKind, selectedReason]
  );

  useEffect(() => {
    setEntries([]);
    setOffset(0);
    offsetRef.current = 0;
    setHasMore(true);
    if (userAddress) {
      loadEntries(true);
    }
  }, [userAddress, loadEntries]);

  useEffect(() => {
    if (!userAddress) {
      setKindTotals(null);
      setReasonOptions([]);
      return;
    }
    let cancelled = false;

    const loadMeta = async () => {
      try {
        if (typeof getMissedByKind === 'function') {
          const totals = await getMissedByKind(userAddress);
          if (!cancelled) setKindTotals(totals);
        }
        if (typeof getMissedTotalsByReason === 'function') {
          const reasons = await getMissedTotalsByReason(userAddress);
          if (!cancelled) setReasonOptions(reasons ?? []);
        }
      } catch (err) {
        console.warn('Failed to load missed meta:', err);
      }
    };

    loadMeta();
    return () => {
      cancelled = true;
    };
  }, [userAddress, getMissedByKind, getMissedTotalsByReason]);

  const kinds = useMemo(() => {
    const set = new Set(entries.map((entry) => entry.kind));
    if (kindTotals) {
      if ((kindTotals.spotUsd ?? 0) > 0) set.add('spot');
      if ((kindTotals.slabUsd ?? 0) > 0) set.add('slab');
      if ((kindTotals.slabOverrideUsd ?? 0) > 0) set.add('slabOverride');
      if ((kindTotals.roiUsd ?? 0) > 0) set.add('roi');
    }
    return Array.from(set).sort();
  }, [entries, kindTotals]);

  const filteredEntries = useMemo(() => {
    return entries
      .filter((entry) =>
        selectedKind === 'all' ? true : entry.kind === selectedKind
      )
      .filter((entry) =>
        selectedReason === 'all'
          ? true
          : entry.reasonHex === selectedReason
      )
      .filter((entry) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
          entry.reason?.toLowerCase().includes(term) ||
          String(entry.pid).includes(term)
        );
      });
  }, [entries, selectedKind, searchTerm]);

  const totalMissed = filteredEntries.reduce(
    (sum, entry) => sum + (entry.amountUsd || 0),
    0
  );

  const kindTotalsDisplay = useMemo(() => {
    if (!kindTotals) return [];
    return [
      { key: 'roi', label: 'ROI', value: kindTotals.roiUsd ?? 0 },
      { key: 'spot', label: 'Spot', value: kindTotals.spotUsd ?? 0 },
      { key: 'slab', label: 'Slab', value: kindTotals.slabUsd ?? 0 },
      { key: 'slabOverride', label: 'Override', value: kindTotals.slabOverrideUsd ?? 0 },
    ].filter((item) => item.value > 0);
  }, [kindTotals]);

  const reasonOptionsDisplay = useMemo(() => {
    return reasonOptions.map((entry) => ({
      value: entry.reasonHex,
      label: `${entry.label} (${formatUSD(entry.totalUsd)})`,
    }));
  }, [reasonOptions]);

  useEffect(() => {
    if (
      selectedReason !== 'all' &&
      !reasonOptionsDisplay.some((opt) => opt.value === selectedReason)
    ) {
      setSelectedReason('all');
    }
  }, [reasonOptionsDisplay, selectedReason]);

  const downloadCSV = () => {
    if (!filteredEntries.length) return;
    const header = ['Date', 'Type', 'USD', 'Portfolio', 'Reason'];
    const rows = filteredEntries.map((entry) => {
      const date = Number.isFinite(entry.at)
        ? new Date(entry.at * 1000).toISOString()
        : '';
      return [
        date,
        entry.kind,
        (entry.amountUsd || 0).toFixed(2),
        entry.pid > 0 ? `#${entry.pid}` : '',
        entry.reason ?? '',
      ];
    });
    const csvContent = [header, ...rows]
      .map((row) =>
        row
          .map((cell) =>
            `"${String(cell).replace(/"/g, '""')}"`
          )
          .join(',')
      )
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `missed-income-history-${Date.now()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="cyber-glass border border-cyan-500/30 rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-neon-green/10 pointer-events-none" />
        <div className="relative flex flex-col gap-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard/missed-income"
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-cyan-200 border border-cyan-500/40 rounded-lg hover:border-cyan-300 transition-all"
              >
                <ArrowLeft size={14} />
                Back to Overview
              </Link>
              <span className="text-xs text-cyan-200/70">
                Deeper dive into every missed income event.
              </span>
            </div>
            <button
              onClick={downloadCSV}
              disabled={!filteredEntries.length}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-cyan-200 border border-cyan-500/40 rounded-lg hover:border-cyan-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={14} />
              Export CSV
            </button>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            <div className="flex-1 space-y-2">
              <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                Missed Income History
              </h1>
              <p className="text-sm text-cyan-200/80 max-w-3xl">
                View every recorded missed payout, grouped by income type and
                portfolio. Use filters to narrow down specific cap events or
                reasons.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <label className="flex items-center gap-2 px-3 py-2 border border-cyan-500/30 rounded-lg bg-cyan-500/5 text-xs text-cyan-200">
                <Filter size={14} />
                <span>Type</span>
                <select
                  value={selectedKind}
                  onChange={(e) => setSelectedKind(e.target.value)}
                  className="bg-transparent text-cyan-100 text-xs focus:outline-none"
                >
                  <option value="all">All</option>
                  {kinds.map((kind) => (
                    <option key={kind} value={kind}>
                      {kind.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2 px-3 py-2 border border-cyan-500/30 rounded-lg bg-cyan-500/5 text-xs text-cyan-200">
                <Filter size={14} />
                <span>Reason</span>
                <select
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="bg-transparent text-cyan-100 text-xs focus:outline-none"
                >
                  <option value="all">All</option>
                  {reasonOptionsDisplay.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2 px-3 py-2 border border-cyan-500/30 rounded-lg bg-cyan-500/5 text-xs text-cyan-200">
                <Search size={14} />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search reason or portfolio"
                  className="bg-transparent text-cyan-100 text-xs focus:outline-none placeholder:text-cyan-200/60"
                />
              </label>
            </div>
          </div>
        </div>
      </header>

      <section className="cyber-glass border border-cyan-500/30 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-cyan-200">
              Filtered Summary
            </h2>
            <p className="text-xs text-cyan-200/70">
              {filteredEntries.length.toLocaleString()} of{' '}
              {entries.length.toLocaleString()} entries shown. Total missed:{' '}
              <span className="text-emerald-300 font-semibold">
                {formatUSD(totalMissed)}
              </span>
            </p>
            {error && (
              <p className="mt-2 text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </div>
          <button
            onClick={() => loadEntries(true)}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-cyan-200 border border-cyan-500/40 rounded-lg hover:border-cyan-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {kindTotalsDisplay.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {kindTotalsDisplay.map((item) => (
              <div
                key={item.key}
                className="cyber-glass border border-cyan-500/20 rounded-xl px-3 py-4 text-center"
              >
                <p className="text-[11px] uppercase tracking-wider text-cyan-200/70">
                  {item.label}
                </p>
                <p className="text-sm font-semibold text-emerald-300">
                  {formatUSD(item.value)}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="border border-cyan-500/20 rounded-xl overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead className="bg-cyan-500/10 text-cyan-300/80 uppercase tracking-wider">
              <tr>
                <th className="text-left py-3 px-3">Date &amp; Time</th>
                <th className="text-left py-3 px-3">Type</th>
                <th className="text-left py-3 px-3">Reason</th>
                <th className="text-right py-3 px-3">Portfolio</th>
                <th className="text-right py-3 px-3">Amount (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-500/20">
              {loading && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-cyan-200">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 size={18} className="animate-spin" />
                      Loading history...
                    </span>
                  </td>
                </tr>
              )}
              {!loading &&
                filteredEntries.map((entry) => {
                  const date = Number.isFinite(entry.at)
                    ? new Date(entry.at * 1000).toLocaleString()
                    : '—';
                  return (
                    <tr key={entry.id} className="hover:bg-cyan-500/10">
                      <td className="py-3 px-3 text-cyan-100">{date}</td>
                      <td className="py-3 px-3 font-mono uppercase text-cyan-100">
                        {entry.kind}
                      </td>
                      <td className="py-3 px-3 text-cyan-200/80">
                        {entry.reason || '—'}
                      </td>
                      <td className="py-3 px-3 text-right text-cyan-200/70">
                        {entry.pid > 0 ? `#${entry.pid}` : '—'}
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-300 font-semibold">
                        {formatUSD(entry.amountUsd)}
                      </td>
                    </tr>
                  );
                })}
              {!loading && filteredEntries.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-cyan-200/70">
                    No missed income records match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-xs text-cyan-200/70">
          <span>
            Showing {filteredEntries.length.toLocaleString()} of{' '}
            {entries.length.toLocaleString()} loaded entries (
            {totalMatched.toLocaleString()} total matches).
          </span>
          {hasMore && (
            <button
              onClick={() => loadEntries(false)}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-cyan-200 border border-cyan-500/40 rounded-lg hover:border-cyan-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingMore ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Loading…
                </>
              ) : (
                'Load More'
              )}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
