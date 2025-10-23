import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Wallet, TrendingUp, Users } from 'lucide-react';
import NumberPopup from '../components/NumberPopup';
import { formatUSD, formatRAMA } from '../utils/contractData';
import { useStore } from '../../store/useUserInfoStore';

const normalizeUsdDisplay = (value) => {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount === 0) return 0;
  if (Math.abs(amount) >= 1e6) return amount / 1e6;
  return amount;
};

const microToUsd = (value) => Number(value ?? 0) / 1e6;

const formatDate = (timestamp) => {
  if (!timestamp) return '—';
  const date = new Date(timestamp * 1000);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toISOString().slice(0, 10);
};

export default function TeamMemberDetails() {
  const { address } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const getPortfolioIds = useStore((s) => s.getPortfolioIds);
  const getPortFoliById = useStore((s) => s.getPortFoliById);
  const getTeamNetworkData = useStore((s) => s.getTeamNetworkData);

  const [portfolios, setPortfolios] = useState([]);
  const [profile, setProfile] = useState(location.state?.direct ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!address) {
        setError('Missing member address.');
        return;
      }
      setLoading(true);
      setError(null);

      try {
        if (!profile && getTeamNetworkData) {
          try {
            const snapshot = await getTeamNetworkData(address, {
              maxDepth: 1,
              detailLimit: 0,
            });
            if (!cancelled) {
              setProfile({
                address,
                summary: snapshot?.directIncomeSummary ?? null,
                teamVolume: snapshot?.teamVolumeSummary ?? null,
              });
            }
          } catch (profileErr) {
            console.warn('TeamMemberDetails profile fetch failed:', profileErr);
          }
        }

        let ids = [];
        if (getPortfolioIds) {
          try {
            ids = await getPortfolioIds(address);
          } catch (pidErr) {
            console.warn('getPortfolioIds failed:', pidErr);
          }
        }
        const uniqueIds = Array.from(new Set(ids ?? []));
        const details = await Promise.all(
          uniqueIds.map((pid) =>
            getPortFoliById(pid).catch((detailErr) => {
              console.warn(`Portfolio ${pid} load failed:`, detailErr);
              return null;
            })
          )
        );
        if (!cancelled) {
          setPortfolios(details.filter(Boolean));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Unable to load member details.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [address, getPortfolioIds, getPortFoliById, getTeamNetworkData, profile]);

  const aggregatedStakeUsd = useMemo(
    () =>
      portfolios.reduce(
        (sum, item) => sum + (item?.principalUsdDisplay ?? 0),
        0
      ),
    [portfolios]
  );
  const aggregatedStakeUsdDisplay = normalizeUsdDisplay(aggregatedStakeUsd);

  const profileSummary = useMemo(() => {
    const summary = profile?.summary ?? {};
    const teamVolume = profile?.teamVolume ?? {};
    const lifetimeUsd = normalizeUsdDisplay(summary?.lifetimeUsd ?? 0);
    const teamVolumeUsd = normalizeUsdDisplay(teamVolume?.qualifiedUsd ?? 0);
    return {
      address: profile?.address ?? address ?? '—',
      directs: profile?.directs ?? null,
      joinedAt: profile?.joinedAt ?? null,
      lifetimeUsd,
      lifetimeRama: summary?.lifetimeRama ?? 0,
      claimableRama: summary?.claimableRama ?? 0,
      teamVolumeUsd,
    };
  }, [profile, address]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-2 cyber-glass border border-cyan-500/30 rounded-lg hover:border-cyan-500/50 transition-all text-xs text-cyan-300"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green relative inline-block">
              Member Details
              <span className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-neon-green/20 blur-xl -z-10" />
            </h1>
            <p className="text-xs text-cyan-300/80">
              Full portfolio breakdown for {profileSummary.address}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="cyber-glass border border-red-500/40 bg-red-500/10 text-red-200 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-cyan-200 text-sm">
          <Loader2 size={16} className="animate-spin" />
          Loading member portfolios…
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="cyber-glass border border-cyan-500/40 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-cyan-500/20 border border-cyan-500/30 rounded-lg">
              <Users size={18} className="text-cyan-300" />
            </div>
            <div>
              <p className="text-xs text-cyan-300/70 uppercase tracking-wide">
                Directs
              </p>
              <p className="text-lg font-bold text-cyan-100">
                {profileSummary.directs ?? '—'}
              </p>
            </div>
          </div>
          <p className="text-[11px] text-cyan-300/70">
            Joined: {profileSummary.joinedAt ? profileSummary.joinedAt.toISOString().slice(0, 10) : '—'}
          </p>
        </div>

        <div className="cyber-glass border border-neon-green/40 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-neon-green/20 border border-neon-green/30 rounded-lg">
              <TrendingUp size={18} className="text-neon-green" />
            </div>
            <div>
              <p className="text-xs text-neon-green/80 uppercase tracking-wide">
                Lifetime Direct USD
              </p>
              <NumberPopup
                value={formatUSD(profileSummary.lifetimeUsd ?? 0)}
                label="Lifetime Direct USD"
                className="text-lg font-bold text-neon-green"
              />
            </div>
          </div>
          <p className="text-[11px] text-cyan-300/70">
            Claimable: {formatRAMA(profileSummary.claimableRama)} RAMA
          </p>
        </div>

        <div className="cyber-glass border border-cyan-500/40 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-cyan-500/20 border border-cyan-500/30 rounded-lg">
              <Wallet size={18} className="text-cyan-300" />
            </div>
            <div>
              <p className="text-xs text-cyan-300/80 uppercase tracking-wide">
                Total Stake (USD)
              </p>
              <NumberPopup
                value={formatUSD(aggregatedStakeUsdDisplay)}
                label="Total Stake"
                className="text-lg font-bold text-cyan-100"
              />
            </div>
          </div>
          <p className="text-[11px] text-cyan-300/70">
            Portfolios: {portfolios.length}
          </p>
        </div>

        <div className="cyber-glass border border-neon-orange/40 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-neon-orange/20 border border-neon-orange/30 rounded-lg">
              <TrendingUp size={18} className="text-neon-orange" />
            </div>
            <div>
              <p className="text-xs text-neon-orange/80 uppercase tracking-wide">
                Team Volume
              </p>
              <NumberPopup
                value={formatUSD(profileSummary.teamVolumeUsd ?? 0)}
                label="Team Volume"
                className="text-lg font-bold text-neon-orange"
              />
            </div>
          </div>
          <p className="text-[11px] text-cyan-300/70">
            Lifetime RAMA: {formatRAMA(profileSummary.lifetimeRama)}
          </p>
        </div>
      </div>

      <div className="cyber-glass rounded-2xl border border-cyan-500/30">
        <div className="flex items-center justify-between p-5 border-b border-cyan-500/20">
          <div>
            <h2 className="text-lg font-semibold text-cyan-300 uppercase tracking-wide">
              Portfolio Breakdown
            </h2>
            <p className="text-xs text-cyan-300/80">
              Detailed stakes and maturity metrics for each portfolio.
            </p>
          </div>
        </div>

        {portfolios.length === 0 ? (
          <div className="p-6 text-center text-cyan-300/80 text-sm">
            No portfolios found for this member.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-cyan-500/20">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-cyan-300 uppercase tracking-wider">
                    Portfolio
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-cyan-300 uppercase tracking-wider">
                    Principal USD
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-cyan-300 uppercase tracking-wider">
                    Principal RAMA
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-cyan-300 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-cyan-300 uppercase tracking-wider">
                    Booster
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-500/10">
                {portfolios.map((portfolio) => (
                  <tr key={portfolio.pid}>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-cyan-100">
                      #{portfolio.pid}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-cyan-100">
                      {formatUSD(portfolio.principalUsdDisplay ?? 0)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-cyan-100">
                      {formatRAMA(portfolio.principalRama ?? 0)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-cyan-100">
                      {formatDate(portfolio.createdAt)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-cyan-100">
                      {portfolio.booster ? 'Yes' : 'No'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
