import { useEffect, useMemo, useState } from 'react';
import { formatUSD, formatRAMA } from '../utils/contractData';
import { Clock, Trophy, BarChart2, Activity, Layers, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { getPeriodIncome, calculateDayId, getRamaPrice, getClaimHistory, formatDayId, getRelativeDay } from '../services/slabIncomeApi';

export default function SlabIncomeHistory() {
  const userAddress = typeof window !== 'undefined' ? localStorage.getItem('userAddress') : null;
  
  // Single API-based history
  const [combinedHistory, setCombinedHistory] = useState(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState(null);
  const limit = 50;

  // Load all history from API endpoints
  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      if (!userAddress) return;

      setHistoryLoading(true);
      setError(null);
      try {
        // Get claim history
        const historyResult = await getClaimHistory(userAddress);
        
        if (!cancelled) {
          if (historyResult.success) {
            // Transform claims into combined history format
            const claims = (historyResult.data?.claims || []).map(claim => ({
              type: 'claim',
              from_day: claim.from_day,
              to_day: claim.to_day,
              usd_amount: claim.usd_amount,
              rama_amount: claim.rama_amount,
              claimed_at: claim.claimed_at,
            }));
            
            setCombinedHistory({
              events: claims,
              total_claims: historyResult.data?.total_claims || 0,
            });
            setError(null);
          } else {
            // Only show error if it's not a network error
            if (historyResult.error && !historyResult.error.includes('Failed to fetch')) {
              setError(historyResult.error);
            }
            // Show empty state instead of error
            setCombinedHistory({
              events: [],
              total_claims: 0,
            });
          }
        }
      } catch (err) {
        // Don't show network errors, just show empty state
        if (!cancelled) {
          setCombinedHistory({
            events: [],
            total_claims: 0,
          });
        }
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    };

    loadHistory();
    return () => { cancelled = true; };
  }, [userAddress, historyPage]);

  // Derived data from combined history
  const stats = useMemo(() => {
    if (!combinedHistory?.events) {
      return { 
        claims: [],
        achievements: [],
        overrides: [],
        totalClaims: 0,
        totalUSD: 0,
        totalRAMA: 0,
      };
    }
    const claims = combinedHistory.events.filter(e => e.type === 'claim');
    const totalUSD = claims.reduce((sum, c) => sum + (parseFloat(c.usd_amount) || 0), 0);
    const totalRAMA = claims.reduce((sum, c) => sum + (parseFloat(c.rama_amount) || 0), 0);
    
    return {
      claims,
      achievements: [], // Not available from getClaimHistory API
      overrides: [],    // Not available from getClaimHistory API
      totalClaims: claims.length,
      totalUSD,
      totalRAMA,
    };
  }, [combinedHistory]);


  return (
    <div className="space-y-6">
      {historyLoading && combinedHistory === null && (
        <div className="flex items-center justify-center py-20 gap-3">
          <Loader2 size={24} className="animate-spin text-cyan-400" />
          <span className="text-cyan-300">Loading claim history...</span>
        </div>
      )}

      {!historyLoading && error && (
        <div className="bg-red-500/10 border border-red-500/40 text-red-200 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      {!historyLoading && (
      <div className="space-y-6">
      {/* Quick stats from combined history */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="cyber-glass border border-cyan-500/30 rounded-xl p-3 sm:p-4">
          <div className="text-xs text-cyan-300/80 mb-1">Total Claims</div>
          <div className="text-xl sm:text-2xl font-bold text-cyan-300">{stats.totalClaims}</div>
        </div>
        <div className="cyber-glass border border-cyan-500/30 rounded-xl p-3 sm:p-4">
          <div className="text-xs text-cyan-300/80 mb-1">Total USD</div>
          <div className="text-xl sm:text-2xl font-bold text-cyan-300">{formatUSD(stats.totalUSD)}</div>
        </div>
        <div className="cyber-glass border border-neon-green/30 rounded-xl p-3 sm:p-4 col-span-2 sm:col-span-1">
          <div className="text-xs text-cyan-300/80 mb-1">Total RAMA</div>
          <div className="text-xs sm:text-sm text-cyan-300">
            {formatRAMA(stats.totalRAMA)}
          </div>
        </div>
        <div className="cyber-glass border border-neon-green/30 rounded-xl p-3 sm:p-4 col-span-2 sm:col-span-1 lg:col-span-1">
          <div className="text-xs text-cyan-300/80 mb-1">Last Claim</div>
          <div className="text-xs sm:text-sm text-cyan-300">
            {stats.claims[0]?.claimed_at 
              ? new Date(stats.claims[0].claimed_at).toLocaleDateString()
              : <span className="text-cyan-300/70">—</span>
            }
          </div>
        </div>
      </div>

      {historyLoading && combinedHistory === null && (
        <div className="flex items-center justify-center py-12 gap-2 text-cyan-300">
          <Loader2 size={18} className="animate-spin" />
          <span>Loading slab history…</span>
        </div>
      )}

      {/* Claims table from API data */}
      <div className="cyber-glass border border-cyan-500/20 rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-cyan-400" />
            <h3 className="text-base sm:text-lg font-semibold text-cyan-300">Recent Slab Claims</h3>
          </div>
          <span className="text-xs text-cyan-300/70">{stats.claims.length} entries</span>
        </div>
        
        <div className="overflow-x-auto hide-scrollbar -mx-4 sm:mx-0">
          <div className="min-w-[700px] px-4 sm:px-0">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase border-b border-cyan-500/20 text-cyan-300/70">
                <tr>
                  <th className="py-3 px-2 sm:px-3 text-left">Claimed At</th>
                  <th className="py-3 px-2 sm:px-3 text-left">From Day</th>
                  <th className="py-3 px-2 sm:px-3 text-left">To Day</th>
                  <th className="py-3 px-2 sm:px-3 text-right">Amount (USD)</th>
                  <th className="py-3 px-2 sm:px-3 text-right">Amount (RAMA)</th>
                </tr>
              </thead>
              <tbody>
                {stats.claims.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 px-2 sm:px-3 text-center text-cyan-300/70">
                      No slab claim events found yet.
                    </td>
                  </tr>
                )}
                {stats.claims.map((c, i) => (
                  <tr key={`claim-${c.from_day}-${i}`} className="border-b border-cyan-500/10 hover:bg-cyan-500/5 transition-colors">
                    <td className="py-3 px-2 sm:px-3">
                      <div className="text-cyan-300 text-xs">
                        {c.claimed_at ? new Date(c.claimed_at).toLocaleDateString() : '—'}
                      </div>
                    </td>
                    <td className="py-3 px-2 sm:px-3">
                      <div className="text-cyan-400 text-sm">{formatDayId(c.from_day, 'short')}</div>
                      <div className="text-cyan-400/60 text-xs font-mono">Day {c.from_day}</div>
                    </td>
                    <td className="py-3 px-2 sm:px-3">
                      <div className="text-cyan-400 text-sm">{formatDayId(c.to_day, 'short')}</div>
                      <div className="text-cyan-400/60 text-xs font-mono">Day {c.to_day}</div>
                    </td>
                    <td className="py-3 px-2 sm:px-3 text-right">
                      <div className="font-semibold text-cyan-300">{formatUSD(c.usd_amount)}</div>
                    </td>
                    <td className="py-3 px-2 sm:px-3 text-right">
                      <div className="font-semibold text-neon-green">{formatRAMA(c.rama_amount || 0)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {stats.claims.length > 0 && (
          <div className="mt-3 text-xs text-cyan-300/60 text-center sm:hidden">
            ← Scroll horizontally to see all columns →
          </div>
        )}
      </div>

      {/* Achievements table from API data */}
      <div className="cyber-glass border border-neon-green/20 rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-neon-green" />
            <h3 className="text-base sm:text-lg font-semibold text-neon-green">Slab Achievements</h3>
          </div>
          <span className="text-xs text-cyan-300/70">{stats.achievements.length} achieved</span>
        </div>
        
        <div className="overflow-x-auto hide-scrollbar -mx-4 sm:mx-0">
          <div className="min-w-[650px] px-4 sm:px-0">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase border-b border-neon-green/20 text-cyan-300/70">
                <tr>
                  <th className="py-3 px-2 sm:px-3 text-left">Date</th>
                  <th className="py-3 px-2 sm:px-3 text-center">Slab</th>
                  <th className="py-3 px-2 sm:px-3 text-right">L1 Qualified</th>
                  <th className="py-3 px-2 sm:px-3 text-right">L2 Qualified</th>
                  <th className="py-3 px-2 sm:px-3 text-right">Rest Qualified</th>
                </tr>
              </thead>
              <tbody>
                {stats.achievements.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 px-2 sm:px-3 text-center text-cyan-300/70">
                      No slab achievements yet.
                    </td>
                  </tr>
                )}
                {stats.achievements.map((a, idx) => (
                  <tr key={`${a.slab}-${idx}`} className="border-b border-cyan-500/10 hover:bg-neon-green/5 transition-colors">
                    <td className="py-3 px-2 sm:px-3">
                      <div className="text-cyan-300 text-xs">
                        {new Date(a.date || a.timestamp).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3 px-2 sm:px-3 text-center">
                      <span className="bg-neon-green/20 text-neon-green px-2 py-1 rounded text-xs font-bold">
                        Slab {a.slab}
                      </span>
                    </td>
                    <td className="py-3 px-2 sm:px-3 text-right">
                      <div className="font-semibold text-cyan-300">{formatUSD(a.l1Qualified || 0)}</div>
                    </td>
                    <td className="py-3 px-2 sm:px-3 text-right">
                      <div className="font-semibold text-cyan-300">{formatUSD(a.l2Qualified || 0)}</div>
                    </td>
                    <td className="py-3 px-2 sm:px-3 text-right">
                      <div className="font-semibold text-cyan-300">{formatUSD(a.restQualified || a.l3Qualified || 0)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {stats.achievements.length > 0 && (
          <div className="mt-3 text-xs text-cyan-300/60 text-center sm:hidden">
            ← Scroll horizontally to see all columns →
          </div>
        )}
      </div>

      {/* Same Slab Override History from API data */}
      <div className="cyber-glass border border-cyan-500/20 rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-cyan-400" />
            <h3 className="text-base sm:text-lg font-semibold text-cyan-300">Same Slab Override History</h3>
          </div>
          <span className="text-xs text-cyan-300/70">{stats.overrides.length} records</span>
        </div>
        
        <div className="overflow-x-auto hide-scrollbar -mx-4 sm:mx-0">
          <div className="min-w-[600px] px-4 sm:px-0">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase border-b border-cyan-500/20 text-cyan-300/70">
                <tr>
                  <th className="py-3 px-2 sm:px-3 text-left">Date</th>
                  <th className="py-3 px-2 sm:px-3 text-center">Block</th>
                  <th className="py-3 px-2 sm:px-3 text-center">Wave</th>
                  <th className="py-3 px-2 sm:px-3 text-right">Amount (USD)</th>
                  <th className="py-3 px-2 sm:px-3 text-left">Transaction</th>
                </tr>
              </thead>
              <tbody>
                {stats.overrides.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 px-2 sm:px-3 text-center text-cyan-300/70">
                      No same-slab override records yet.
                    </td>
                  </tr>
                )}
                {stats.overrides.map((r, i) => (
                  <tr key={`${r.txHash}-${i}`} className="border-b border-cyan-500/10 hover:bg-cyan-500/5 transition-colors">
                    <td className="py-3 px-2 sm:px-3">
                      <div className="text-cyan-300 text-xs">
                        {new Date(r.date || r.timestamp).toLocaleDateString()}
                      </div>
                      <div className="text-cyan-300/70 text-[10px] mt-0.5">
                        {new Date(r.date || r.timestamp).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="py-3 px-2 sm:px-3 text-center">
                      <span className="text-cyan-400 font-mono text-xs">#{r.blockNumber || r.block}</span>
                    </td>
                    <td className="py-3 px-2 sm:px-3 text-center">
                      <span className="bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded text-xs">
                        {r.wave || r.kind}
                      </span>
                    </td>
                    <td className="py-3 px-2 sm:px-3 text-right">
                      <div className="font-semibold text-neon-green">{formatUSD(r.amountUsd)}</div>
                    </td>
                    <td className="py-3 px-2 sm:px-3">
                      {r.txHash && (
                        <code className="text-[10px] sm:text-[11px] text-cyan-300/80 bg-dark-950/50 px-2 py-1 rounded">
                          {r.txHash.slice(0, 6)}…{r.txHash.slice(-4)}
                        </code>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {stats.overrides.length > 0 && (
          <div className="mt-3 text-xs text-cyan-300/60 text-center sm:hidden">
            ← Scroll horizontally to see all columns →
          </div>
        )}
      </div>


      {/* Pagination Controls */}
      {combinedHistory?.pagination && combinedHistory.pagination.total > limit && (
        <div className="mt-4 flex items-center justify-between gap-4">
          <button
            onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
            disabled={historyPage === 1 || historyLoading}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-neon-purple/20 text-neon-purple hover:bg-neon-purple/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          <span className="text-sm text-cyan-300/70">
            Page {historyPage} of {Math.ceil(combinedHistory.pagination.total / limit)}
          </span>
          <button
            onClick={() => setHistoryPage(p => p + 1)}
            disabled={!combinedHistory.pagination.hasMore || historyLoading}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-neon-purple/20 text-neon-purple hover:bg-neon-purple/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      )}
      </div>
      )}
    </div>
  );
}
