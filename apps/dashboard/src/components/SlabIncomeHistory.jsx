import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../store/useUserInfoStore';
import { formatUSD, formatRAMA } from '../utils/contractData';
import { Clock, Trophy, BarChart2, Activity, Layers } from 'lucide-react';

function EpochToDate({ epoch }) {
  if (!epoch && epoch !== 0) return <span className="text-cyan-300/70">—</span>;
  try {
    const ts = Number(epoch) * 86400; // treat epoch as dayId
    const d = new Date(ts * 1000);
    return <span>{d.toLocaleDateString()}</span>;
  } catch {
    return <span className="text-cyan-300/70">Epoch {String(epoch)}</span>;
  }
}

export default function SlabIncomeHistory() {
  const userAddress = typeof window !== 'undefined' ? localStorage.getItem('userAddress') : null;
  const getAchievements = useStore((s) => s.getSlabAchievementsWithTimes);
  const getClaims = useStore((s) => s.getSlabClaimEvents);
  const getLegs = useStore((s) => s.getLegCapPercentages);
  const getOverrideHistory = useStore((s) => s.getSameSlabOverrideHistory);

  const [achievements, setAchievements] = useState([]);
  const [claims, setClaims] = useState([]);
  const [legs, setLegs] = useState({ leg1: 40, leg2: 30, leg3: 30, volumes: { leg1: 0, leg2: 0, leg3: 0, total: 0 } });
  const [overrideRows, setOverrideRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!userAddress) return;
      setLoading(true);
      setError(null);
      try {
        const [achs, cls, legData, ovh] = await Promise.all([
          getAchievements(userAddress),
          getClaims(userAddress, { max: 50 }),
          getLegs(userAddress),
          getOverrideHistory(userAddress, { max: 50 }),
        ]);
        if (cancelled) return;
        setAchievements(achs || []);
        setClaims(cls || []);
        setLegs(legData || legs);
        setOverrideRows(ovh || []);
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Failed to load history');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [userAddress, getAchievements, getClaims, getLegs]);

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/40 text-red-200 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}
      {loading && (
        <div className="text-sm text-cyan-200">Loading slab history…</div>
      )}

      {/* Quick stats tickets */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="cyber-glass border border-cyan-500/30 rounded-xl p-3 sm:p-4">
          <div className="text-xs text-cyan-300/80 mb-1">Achievements</div>
          <div className="text-xl sm:text-2xl font-bold text-cyan-300">{achievements.length}</div>
        </div>
        <div className="cyber-glass border border-cyan-500/30 rounded-xl p-3 sm:p-4">
          <div className="text-xs text-cyan-300/80 mb-1">Claims</div>
          <div className="text-xl sm:text-2xl font-bold text-cyan-300">{claims.length}</div>
        </div>
        <div className="cyber-glass border border-neon-green/30 rounded-xl p-3 sm:p-4 col-span-2 sm:col-span-1">
          <div className="text-xs text-cyan-300/80 mb-1">Last Claim</div>
          <div className="text-xs sm:text-sm text-cyan-300">
            {claims[0]?.epoch != null ? <EpochToDate epoch={claims[0].epoch} /> : <span className="text-cyan-300/70">—</span>}
          </div>
        </div>
        <div className="cyber-glass border border-neon-green/30 rounded-xl p-3 sm:p-4 col-span-2 sm:col-span-1 lg:col-span-1">
          <div className="text-xs text-cyan-300/80 mb-1">Slab Claimed</div>
          <div className="text-xs sm:text-sm font-semibold text-neon-green">{formatUSD((claims || []).reduce((s, x) => s + (x.amountUsd || 0), 0))}</div>
        </div>
        <div className="cyber-glass border border-cyan-500/30 rounded-xl p-3 sm:p-4 col-span-2 sm:col-span-3 lg:col-span-1">
          <div className="text-xs text-cyan-300/80 mb-1">Same-Slab Override</div>
          <div className="text-xs sm:text-sm font-semibold text-cyan-300">{formatUSD((overrideRows || []).reduce((s, x) => s + (x.amountUsd || 0), 0))}</div>
        </div>
      </div>

      {/* Distribution cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="cyber-glass border border-cyan-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart2 size={16} className="text-cyan-400" />
            <span className="text-sm text-cyan-300/90">Leg 1 (max 40%)</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-cyan-300">{legs.leg1}%</p>
          <p className="text-xs text-cyan-300/70 mt-1">
            {formatUSD((legs?.volumes?.leg1 || 0))} of {formatUSD((legs?.volumes?.total || 0))}
          </p>
        </div>
        <div className="cyber-glass border border-cyan-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart2 size={16} className="text-cyan-400" />
            <span className="text-sm text-cyan-300/90">Leg 2 (max 30%)</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-cyan-300">{legs.leg2}%</p>
          <p className="text-xs text-cyan-300/70 mt-1">
            {formatUSD((legs?.volumes?.leg2 || 0))} of {formatUSD((legs?.volumes?.total || 0))}
          </p>
        </div>
        <div className="cyber-glass border border-cyan-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart2 size={16} className="text-cyan-400" />
            <span className="text-sm text-cyan-300/90">Rest (max 30%)</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-cyan-300">{legs.leg3}%</p>
          <p className="text-xs text-cyan-300/70 mt-1">
            {formatUSD((legs?.volumes?.leg3 || 0))} of {formatUSD((legs?.volumes?.total || 0))}
          </p>
        </div>
        <div className="cyber-glass border border-neon-green/40 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={16} className="text-neon-green" />
            <span className="text-sm text-neon-green">Total Qualified</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-neon-green">{formatUSD((legs?.volumes?.total || 0))}</p>
          <p className="text-xs text-cyan-300/70 mt-1">Based on current capped leg rules</p>
        </div>
      </div>

      {/* Claims table */}
      <div className="cyber-glass border border-cyan-500/20 rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-cyan-400" />
            <h3 className="text-base sm:text-lg font-semibold text-cyan-300">Recent Slab Claims</h3>
          </div>
          <span className="text-xs text-cyan-300/70">{claims.length} entries</span>
        </div>
        
        {/* Mobile responsive table wrapper */}
        <div className="overflow-x-auto hide-scrollbar -mx-4 sm:mx-0">
          <div className="min-w-[700px] px-4 sm:px-0">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase border-b border-cyan-500/20 text-cyan-300/70">
                <tr>
                  <th className="py-3 px-2 sm:px-3 text-left">Date</th>
                  <th className="py-3 px-2 sm:px-3 text-left">Epoch</th>
                  <th className="py-3 px-2 sm:px-3 text-left">Slab</th>
                  <th className="py-3 px-2 sm:px-3 text-right">Amount (USD)</th>
                  <th className="py-3 px-2 sm:px-3 text-right">Amount (RAMA)</th>
                  <th className="py-3 px-2 sm:px-3 text-left">Transaction</th>
                </tr>
              </thead>
              <tbody>
                {claims.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 px-2 sm:px-3 text-center text-cyan-300/70">
                      No slab claim events found yet.
                    </td>
                  </tr>
                )}
                {claims.map((c, i) => (
                  <tr key={`${c.txHash}-${i}`} className="border-b border-cyan-500/10 hover:bg-cyan-500/5 transition-colors">
                    <td className="py-3 px-2 sm:px-3">
                      <div className="text-cyan-300">
                        <EpochToDate epoch={c.epoch} />
                      </div>
                    </td>
                    <td className="py-3 px-2 sm:px-3">
                      <span className="text-cyan-400 font-mono text-xs">#{c.epoch}</span>
                    </td>
                    <td className="py-3 px-2 sm:px-3">
                      <span className="bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded text-xs font-medium">
                        {c.slabIdx}
                      </span>
                    </td>
                    <td className="py-3 px-2 sm:px-3 text-right">
                      <div className="font-semibold text-cyan-300">{formatUSD(c.amountUsd)}</div>
                    </td>
                    <td className="py-3 px-2 sm:px-3 text-right">
                      <div className="font-semibold text-neon-green">{formatRAMA(c.amountRama)}</div>
                    </td>
                    <td className="py-3 px-2 sm:px-3">
                      <code className="text-[10px] sm:text-[11px] text-cyan-300/80 bg-dark-950/50 px-2 py-1 rounded">
                        {c.txHash.slice(0, 6)}…{c.txHash.slice(-4)}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Mobile scroll hint */}
        {claims.length > 0 && (
          <div className="mt-3 text-xs text-cyan-300/60 text-center sm:hidden">
            ← Scroll horizontally to see all columns →
          </div>
        )}
      </div>

      {/* Achievements table */}
      <div className="cyber-glass border border-neon-green/20 rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-neon-green" />
            <h3 className="text-base sm:text-lg font-semibold text-neon-green">Slab Achievements</h3>
          </div>
          <span className="text-xs text-cyan-300/70">{achievements.length} achieved</span>
        </div>
        
        {/* Mobile responsive table wrapper */}
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
                {achievements.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 px-2 sm:px-3 text-center text-cyan-300/70">
                      No slab achievements yet.
                    </td>
                  </tr>
                )}
                {achievements.map((a, idx) => (
                  <tr key={`${a.slabIdx}-${idx}`} className="border-b border-cyan-500/10 hover:bg-neon-green/5 transition-colors">
                    <td className="py-3 px-2 sm:px-3">
                      <div className="text-cyan-300">
                        <EpochToDate epoch={Math.floor((a.achievedAt || 0) / 86400)} />
                      </div>
                    </td>
                    <td className="py-3 px-2 sm:px-3 text-center">
                      <span className="bg-neon-green/20 text-neon-green px-2 py-1 rounded text-xs font-bold">
                        Slab {a.slabIdx}
                      </span>
                    </td>
                    <td className="py-3 px-2 sm:px-3 text-right">
                      <div className="font-semibold text-cyan-300">{formatUSD(a.qualified.l1Usd)}</div>
                    </td>
                    <td className="py-3 px-2 sm:px-3 text-right">
                      <div className="font-semibold text-cyan-300">{formatUSD(a.qualified.l2Usd)}</div>
                    </td>
                    <td className="py-3 px-2 sm:px-3 text-right">
                      <div className="font-semibold text-cyan-300">{formatUSD(a.qualified.lrestUsd)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Mobile scroll hint */}
        {achievements.length > 0 && (
          <div className="mt-3 text-xs text-cyan-300/60 text-center sm:hidden">
            ← Scroll horizontally to see all columns →
          </div>
        )}
      </div>

      {/* Same Slab Override History */}
      <div className="cyber-glass border border-cyan-500/20 rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-cyan-400" />
            <h3 className="text-base sm:text-lg font-semibold text-cyan-300">Same Slab Override History</h3>
          </div>
          <span className="text-xs text-cyan-300/70">{overrideRows.length} records</span>
        </div>
        
        {/* Mobile responsive table wrapper */}
        <div className="overflow-x-auto hide-scrollbar -mx-4 sm:mx-0">
          <div className="min-w-[600px] px-4 sm:px-0">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase border-b border-cyan-500/20 text-cyan-300/70">
                <tr>
                  <th className="py-3 px-2 sm:px-3 text-left">Date</th>
                  <th className="py-3 px-2 sm:px-3 text-center">Block</th>
                  <th className="py-3 px-2 sm:px-3 text-center">Kind</th>
                  <th className="py-3 px-2 sm:px-3 text-right">Amount (USD)</th>
                  <th className="py-3 px-2 sm:px-3 text-left">Transaction</th>
                </tr>
              </thead>
              <tbody>
                {overrideRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 px-2 sm:px-3 text-center text-cyan-300/70">
                      No same-slab override records yet.
                    </td>
                  </tr>
                )}
                {overrideRows.map((r, i) => (
                  <tr key={`${r.txHash}-${i}`} className="border-b border-cyan-500/10 hover:bg-cyan-500/5 transition-colors">
                    <td className="py-3 px-2 sm:px-3">
                      <div className="text-cyan-300 text-xs">
                        {r.timestamp ? new Date(r.timestamp * 1000).toLocaleDateString() : '—'}
                      </div>
                      <div className="text-cyan-300/70 text-[10px] mt-0.5">
                        {r.timestamp ? new Date(r.timestamp * 1000).toLocaleTimeString() : ''}
                      </div>
                    </td>
                    <td className="py-3 px-2 sm:px-3 text-center">
                      <span className="text-cyan-400 font-mono text-xs">#{r.blockNumber}</span>
                    </td>
                    <td className="py-3 px-2 sm:px-3 text-center">
                      <span className="bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded text-xs">
                        {r.kind || r.normalizedKind}
                      </span>
                    </td>
                    <td className="py-3 px-2 sm:px-3 text-right">
                      <div className="font-semibold text-neon-green">{formatUSD(r.amountUsd)}</div>
                    </td>
                    <td className="py-3 px-2 sm:px-3">
                      <code className="text-[10px] sm:text-[11px] text-cyan-300/80 bg-dark-950/50 px-2 py-1 rounded">
                        {r.txHash.slice(0, 6)}…{r.txHash.slice(-4)}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Mobile scroll hint */}
        {overrideRows.length > 0 && (
          <div className="mt-3 text-xs text-cyan-300/60 text-center sm:hidden">
            ← Scroll horizontally to see all columns →
          </div>
        )}
      </div>
    </div>
  );
}
