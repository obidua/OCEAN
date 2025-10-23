import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const STATUS_STYLES = {
  completed: 'text-neon-green bg-neon-green/10 border border-neon-green/30',
  pending: 'text-neon-orange bg-neon-orange/10 border border-neon-orange/30',
  failed: 'text-red-400 bg-red-500/10 border border-red-500/30',
};

const formatCurrency = (value, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatNumber = (value) =>
  new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatTimestamp = (timestamp) => {
  if (!timestamp) return '—';
  const ts = typeof timestamp === 'number' ? timestamp : Number(timestamp);
  const date = Number.isNaN(ts) ? new Date(timestamp) : new Date(ts);
  if (Number.isNaN(date.getTime())) return String(timestamp);
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

export default function LatestTransactions({ transactions = [], pageSize = 20 }) {
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [transactions]);

  const totalPages = useMemo(() => {
    const total = Math.ceil(Math.max(transactions.length, 1) / pageSize);
    return total || 1;
  }, [transactions.length, pageSize]);

  const pageItems = useMemo(() => {
    const start = page * pageSize;
    return transactions.slice(start, start + pageSize);
  }, [page, pageSize, transactions]);

  const startIndex = page * pageSize;
  const endIndex = startIndex + pageItems.length;

  return (
    <div className="cyber-glass rounded-2xl p-4 sm:p-6 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 relative z-10">
        <h3 className="text-base font-semibold text-cyan-300 uppercase tracking-wide">Latest Transactions</h3>
        {transactions.length > pageSize && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
              disabled={page === 0}
              className={`flex items-center justify-center p-2 rounded-lg border transition-all ${
                page === 0
                  ? 'border-cyan-500/10 text-cyan-400/40 cursor-not-allowed'
                  : 'border-cyan-500/30 text-cyan-300 hover:border-cyan-500/60 hover:text-cyan-100'
              }`}
              aria-label="Previous transactions"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages - 1))}
              disabled={page >= totalPages - 1}
              className={`flex items-center justify-center p-2 rounded-lg border transition-all ${
                page >= totalPages - 1
                  ? 'border-cyan-500/10 text-cyan-400/40 cursor-not-allowed'
                  : 'border-cyan-500/30 text-cyan-300 hover:border-cyan-500/60 hover:text-cyan-100'
              }`}
              aria-label="Next transactions"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto -mx-4 sm:mx-0">
        {transactions.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-cyan-300/70">
            No transactions recorded yet.
          </div>
        ) : (
          <table className="min-w-full text-left text-sm text-cyan-100 whitespace-nowrap">
            <thead className="text-xs uppercase tracking-wide text-cyan-400/70">
              <tr>
                <th className="px-4 py-3 font-medium">Hash / ID</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium text-right">Amount (USD)</th>
                <th className="px-4 py-3 font-medium text-right">Amount (RAMA)</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-500/10">
              {pageItems.map((tx) => {
                const statusKey = tx.status ? tx.status.toLowerCase() : 'completed';
                const pillClasses = STATUS_STYLES[statusKey] || STATUS_STYLES.completed;

                return (
                  <tr key={tx.id || tx.hash} className="hover:bg-cyan-500/5 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-cyan-300 truncate max-w-[160px]">
                      {tx.id || tx.hash || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-cyan-200">
                      {tx.type || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-cyan-100">
                      {formatCurrency(tx.amountUSD ?? tx.amountMicroUSD / 1e6 || 0)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-cyan-100">
                      {formatNumber(tx.amountRAMA ?? tx.ramaWei / 1e18 || 0)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold uppercase tracking-wide rounded-full ${pillClasses}`}>
                        {(tx.status || 'Completed').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-cyan-200">
                      {formatTimestamp(tx.timestamp)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {transactions.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-4 text-xs text-cyan-300/70">
          <span>
            Showing {startIndex + 1}-{endIndex} of {transactions.length}
          </span>
          <span>
            Page {page + 1} of {totalPages}
          </span>
        </div>
      )}
    </div>
  );
}
