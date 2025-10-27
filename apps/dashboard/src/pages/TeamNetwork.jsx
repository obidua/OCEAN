import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Users,
  TrendingUp,
  Copy,
  CheckCircle,
  Eye,
  Search,
  Filter,
  LayoutGrid,
  Table,
  RefreshCw,
  AlertCircle,
  Calendar,
  Loader2,
} from 'lucide-react';
import NumberPopup from '../components/NumberPopup';
import AddressWithCopy from '../components/AddressWithCopy';
import { formatUSD } from '../utils/contractData';
import { useStore } from '../../store/useUserInfoStore';
import { useNavigate } from 'react-router-dom';

const normalizeUsdDisplay = (value) => {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return 0;
  return amount;
};

const LEVEL_KEYS = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10'];

const EMPTY_LEVEL_DATA = LEVEL_KEYS.reduce((acc, key) => {
  acc[key] = [];
  return acc;
}, {});

const truncateAddress = (addr) => {
  if (!addr || addr.length < 10) return addr || '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

export default function TeamNetwork() {
  const getTeamNetworkData = useStore((state) => state.getTeamNetworkData);
  const getDirectsPortfolioAndTeamVolumes = useStore((state) => state.getDirectsPortfolioAndTeamVolumes);
  const getDirectsPortfolioBreakdown = useStore((state) => state.getDirectsPortfolioBreakdown);
  const getLegCapPercentages = useStore((state) => state.getLegCapPercentages);
  const getLegsDetailedVolume = useStore((state) => state.getLegsDetailedVolume);
  const getVolumeAnalytics = useStore((state) => state.getVolumeAnalytics);
  const navigate = useNavigate();

  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState('overview');
  const [activeLevel, setActiveLevel] = useState('L1');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showTeamBusinessTable, setShowTeamBusinessTable] = useState(false);
  const [teamBusinessSearchTerm, setTeamBusinessSearchTerm] = useState('');

  const [network, setNetwork] = useState(null);
  const [directVolumesMap, setDirectVolumesMap] = useState(null);
  const [directsBusinessData, setDirectsBusinessData] = useState(null);
  const [businessDataLoading, setBusinessDataLoading] = useState(false);
  const [legCapData, setLegCapData] = useState({ leg1: 40, leg2: 30, leg3: 30 });
  const [detailedVolumeData, setDetailedVolumeData] = useState(null);
  const [volumeLoading, setVolumeLoading] = useState(false);
  const directListRef = useRef(null);
  const autoScrollFrame = useRef(null);
  const autoScrollPaused = useRef(false);

  const userAddressFromStore = useStore((state) => state.userAddress);
  const userAddress =
    userAddressFromStore ??
    (typeof window !== 'undefined' ? localStorage.getItem('userAddress') : null);
  const referralLink = userAddress
    ? `https://oceandefi.uk/invite/${userAddress}`
    : null;

  const loadNetwork = useCallback(async () => {
    if (!userAddress || !getTeamNetworkData) {
      setNetwork(null);
      setDirectVolumesMap(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await getTeamNetworkData(userAddress, {
        maxDepth: 10,
        detailLimit: 100,
      });
      // Also fetch directs' self/team volumes from ComprehensiveView and keep a quick lookup map
      let volMap = null;
      if (getDirectsPortfolioAndTeamVolumes) {
        try {
          const volumes = await getDirectsPortfolioAndTeamVolumes(userAddress);
          volMap = volumes?.map ?? null;
        } catch (e) {
          console.warn('Failed to fetch directs volumes:', e);
        }
      }
      setDirectVolumesMap(volMap);
      setNetwork(data);

      // Load team business breakdown from DirectsPortfolioBreakdown
      if (getDirectsPortfolioBreakdown) {
        try {
          setBusinessDataLoading(true);
          const businessData = await getDirectsPortfolioBreakdown(userAddress);
          setDirectsBusinessData(businessData);
        } catch (businessErr) {
          console.warn('Failed to fetch team business data:', businessErr);
          setDirectsBusinessData(null);
        } finally {
          setBusinessDataLoading(false);
        }
      }

      // Load detailed volume analytics from SlabManager
      if (getVolumeAnalytics) {
        try {
          setVolumeLoading(true);
          const volumeAnalytics = await getVolumeAnalytics(userAddress);
          setDetailedVolumeData(volumeAnalytics);
        } catch (volErr) {
          console.warn('Failed to fetch volume analytics:', volErr);
          setDetailedVolumeData(null);
        } finally {
          setVolumeLoading(false);
        }
      }
    } catch (err) {
      console.error('TeamNetwork load error:', err);
      setError(err?.message || 'Failed to load team network data');
      setNetwork(null);
      setDirectVolumesMap(null);
    } finally {
      setIsLoading(false);
    }
  }, [userAddress, getTeamNetworkData, getDirectsPortfolioAndTeamVolumes, getDirectsPortfolioBreakdown]);

  useEffect(() => {
    loadNetwork();
  }, [loadNetwork]);

  // Load leg cap percentages
  useEffect(() => {
    if (!userAddress || !getLegCapPercentages) return;
    
    const loadLegCaps = async () => {
      try {
        const caps = await getLegCapPercentages(userAddress);
        setLegCapData(caps);
      } catch (err) {
        console.error('Failed to load leg caps:', err);
        // Keep default values on error
      }
    };
    
    loadLegCaps();
  }, [userAddress, getLegCapPercentages]);

  useEffect(() => {
    if (!network?.levels) return;
    const current = network.levels[activeLevel];
    if (Array.isArray(current) && current.length) return;
    const firstLevel =
      LEVEL_KEYS.find((key) => (network.levels[key] ?? []).length) ||
      Object.keys(network.levels)[0] ||
      'L1';
    setActiveLevel(firstLevel);
  }, [network, activeLevel]);

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const directMembers = network?.directMembers ?? [];
  const directMembersActive = useMemo(
    () => directMembers.filter((member) => member?.registered),
    [directMembers]
  );
  const allMemberDetails = network?.allMemberDetails ?? [];
  const directIncomeSummary = network?.directIncomeSummary ?? null;
  const directVolumeUsd =
    directIncomeSummary?.lifetimeUsd != null
      ? Number(directIncomeSummary.lifetimeUsd)
      : null;

  const teamVolumeQualifiedUsd =
    network?.teamVolumeUsd != null ? Number(network.teamVolumeUsd) : null;

  const memberDetailMap = useMemo(() => {
    const map = new Map();
    const source = allMemberDetails.length ? allMemberDetails : directMembers;
    for (const member of source) {
      const key = (member?.address ?? '').toLowerCase();
      if (key) {
        map.set(key, member);
      }
    }
    return map;
  }, [allMemberDetails, directMembers]);

  const dynamicDirects = useMemo(() => {
    if (!directMembersActive.length) return null;
    return directMembersActive.map((member) => {
      const key = (member.address ?? '').toLowerCase();
      const fromComp = directVolumesMap?.get ? directVolumesMap.get(key) : null;
      const stakeUsd = fromComp?.selfUsd ?? member.stake?.usd ?? 0;
      const teamVolumeUsd = fromComp?.teamUsd ?? member.teamVolume?.qualifiedUsd ?? 0;
      return {
        address: truncateAddress(member.address),
        addressFull: member.address,
        stakedUSD: stakeUsd,
        stakedUSDDisplay: normalizeUsdDisplay(stakeUsd),
        teamVolume: teamVolumeUsd,
        teamVolumeDisplay: normalizeUsdDisplay(teamVolumeUsd),
        activatedAt: member.joinedAt
          ? member.joinedAt.toISOString().slice(0, 10)
          : '—',
        raw: member,
      };
    });
  }, [directMembers, directVolumesMap]);

  const directList = (dynamicDirects ?? []).map((item) => {
    const stakeUsd = item.stakedUSD ?? 0;
    const teamVol = item.teamVolume ?? 0;
    const candidateFull = item.addressFull ?? item.address;
    const normalizedFull =
      candidateFull && candidateFull.includes('...') ? '' : candidateFull ?? '';
    return {
      ...item,
      addressFull: normalizedFull,
      stakedUSD: stakeUsd,
      stakedUSDDisplay: normalizeUsdDisplay(stakeUsd),
      teamVolume: teamVol,
      teamVolumeDisplay: normalizeUsdDisplay(teamVol),
      totalEarned: item.totalEarned ?? 0,
      totalEarnedDisplay: normalizeUsdDisplay(item.totalEarned ?? 0),
      activatedAt: item.activatedAt ?? '—',
      raw: item.raw ?? null,
    };
  });

  const dynamicLevelData = useMemo(() => {
    if (!network?.levels) return null;
    const result = {};
    for (const key of LEVEL_KEYS) {
      const addresses = network.levels[key] ?? [];
      const rows = [];
      addresses.forEach((addr, idx) => {
        const addressRaw = (addr ?? '').toLowerCase();
        const info = memberDetailMap.get(addressRaw);
        if (!info?.registered) return;
        const joined = info?.joinedAt
          ? info.joinedAt.toISOString().slice(0, 10)
          : '';
        const id = info?.id ? `USR-${String(info.id).padStart(4, '0')}` : '';
        const fromComp = directVolumesMap?.get ? directVolumesMap.get(addressRaw) : null;
        const stakeUsd = fromComp?.selfUsd ?? info?.stake?.usd ?? 0;
        const teamVolumeUsd = fromComp?.teamUsd ?? info?.teamVolume?.qualifiedUsd ?? 0;
        rows.push({
          userId: id || `ADDR-${idx + 1}`,
          address: truncateAddress(addr),
          addressFull: addr ?? '',
          addressRaw,
          stakedUSD: stakeUsd,
          stakedUSDDisplay: normalizeUsdDisplay(stakeUsd),
          status: 'Active',
          joinDate: joined || '—',
          totalEarned: info?.summary?.lifetimeUsd ?? 0,
          totalEarnedDisplay: normalizeUsdDisplay(
            info?.summary?.lifetimeUsd ?? 0
          ),
          teamVolumeUsd,
          teamVolumeDisplay: normalizeUsdDisplay(teamVolumeUsd),
          raw: info ?? null,
        });
      });
      result[key] = rows;
    }
    return result;
  }, [network, memberDetailMap, directVolumesMap]);

  const levelData = dynamicLevelData ?? EMPTY_LEVEL_DATA;

  const userStatus = useMemo(() => {
    const qualifiedUsd = Number.isFinite(teamVolumeQualifiedUsd)
      ? teamVolumeQualifiedUsd
      : 0;
    return {
      directChildrenCount: String(directMembersActive.length),
      qualifiedVolumeUSD: Math.round(qualifiedUsd * 1e6).toString(),
    };
  }, [directMembersActive.length, teamVolumeQualifiedUsd]);

  const directVolumeFromMembers = directMembersActive.reduce(
    (sum, member) => sum + (member.summary?.lifetimeUsd ?? 0),
    0
  );
  const totalDirectVolumeRaw = Number.isFinite(directVolumeUsd)
    ? directVolumeUsd
    : directVolumeFromMembers > 0
    ? directVolumeFromMembers
    : directList.reduce((sum, d) => sum + (d.stakedUSD ?? 0), 0);
  const totalDirectVolume = normalizeUsdDisplay(totalDirectVolumeRaw);

  const teamVolumeFromMembers = directMembersActive.reduce(
    (sum, member) => sum + (member.teamVolume?.qualifiedUsd ?? 0),
    0
  );
  const totalTeamVolumeRaw = Number.isFinite(teamVolumeQualifiedUsd)
    ? teamVolumeQualifiedUsd
    : teamVolumeFromMembers > 0
    ? teamVolumeFromMembers
    : directList.reduce((sum, d) => sum + (d.teamVolume ?? 0), 0);
  const totalTeamVolume = normalizeUsdDisplay(totalTeamVolumeRaw);
  const totalTeamMembers = LEVEL_KEYS.reduce(
    (sum, level) => sum + (levelData[level]?.length ?? 0),
    0
  );
  const activeMembers = totalTeamMembers;
  const inactiveMembers = 0;

  const currentLevelData = levelData[activeLevel] ?? [];

  const filteredData = currentLevelData.filter((member) => {
    const matchesSearch =
      String(member.userId ?? '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      member.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.addressRaw ?? '').includes(searchTerm.toLowerCase()) ||
      (member.addressFull ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || member.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCopy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  useEffect(() => {
    const container = directListRef.current;
    if (!container || isLoading || viewMode !== 'overview') return;
    if (container.scrollHeight <= container.clientHeight + 8) {
      container.scrollTop = 0;
      return;
    }

    autoScrollPaused.current = false;

    const handleMouseEnter = () => {
      autoScrollPaused.current = true;
    };
    const handleMouseLeave = () => {
      autoScrollPaused.current = false;
    };

    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('touchstart', handleMouseEnter, { passive: true });
    container.addEventListener('touchend', handleMouseLeave);

    let direction = 1;
    const speedPerSecond = 18; // pixels per second
    let lastTimestamp = 0;

    const step = (timestamp) => {
      if (!container) return;
      if (!lastTimestamp) lastTimestamp = timestamp;
      const delta = timestamp - lastTimestamp;
      lastTimestamp = timestamp;

      if (!autoScrollPaused.current) {
        const deltaPixels = (speedPerSecond * delta) / 1000;
        container.scrollTop += deltaPixels * direction;

        const maxScroll = container.scrollHeight - container.clientHeight;
        if (container.scrollTop >= maxScroll - 1) {
          direction = -1;
        } else if (container.scrollTop <= 0) {
          direction = 1;
        }
      }

      autoScrollFrame.current = window.requestAnimationFrame(step);
    };

    autoScrollFrame.current = window.requestAnimationFrame(step);

    return () => {
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('touchstart', handleMouseEnter);
      container.removeEventListener('touchend', handleMouseLeave);
      if (autoScrollFrame.current) {
        window.cancelAnimationFrame(autoScrollFrame.current);
        autoScrollFrame.current = null;
      }
    };
  }, [directList.length, isLoading, viewMode]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green relative inline-block">
            Team Network
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-neon-green/20 blur-xl -z-10" />
          </h1>
          <p className="text-cyan-300/90 mt-1">
            Manage your referral network and team structure
          </p>
        </div>
        <div className="flex gap-2">
          {referralLink && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cyber-glass border border-cyan-500/30 hover:border-cyan-500/50"
            >
              {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
              {copied ? 'Copied' : 'Copy Link'}
            </button>
          )}
          <button
            onClick={() => setViewMode('overview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'overview'
                ? 'bg-gradient-to-r from-cyan-500 to-neon-green text-dark-950'
                : 'cyber-glass text-cyan-400 border border-cyan-500/30 hover:border-cyan-500/50'
            }`}
          >
            <LayoutGrid size={18} />
            <span className="hidden sm:inline">Overview</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'table'
                ? 'bg-gradient-to-r from-cyan-500 to-neon-green text-dark-950'
                : 'cyber-glass text-cyan-400 border border-cyan-500/30 hover:border-cyan-500/50'
            }`}
          >
            <Table size={18} />
            <span className="hidden sm:inline">Matrix View</span>
          </button>
          <button
            onClick={loadNetwork}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all bg-gradient-to-r from-cyan-500 to-neon-green text-dark-950 disabled:opacity-60"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="cyber-glass border border-red-400/40 rounded-xl p-4 flex items-start gap-3 text-red-300">
          <AlertCircle size={18} className="mt-0.5" />
          <div>
            <p className="text-sm font-medium">Unable to load network data</p>
            <p className="text-xs opacity-80">{error}</p>
          </div>
        </div>
      )}

      {!userAddress && (
        <div className="cyber-glass border border-cyan-500/30 rounded-xl p-4 text-cyan-300">
          Connect your wallet or log in to view your team network.
        </div>
      )}

      {viewMode === 'overview' ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="cyber-glass rounded-xl p-4 border border-cyan-500/30">
              <p className="text-xs text-cyan-300/90 mb-1 truncate">Direct Members</p>
              <p className="text-2xl md:text-3xl font-bold text-cyan-300">
                {userStatus.directChildrenCount}
              </p>
            </div>
            <div className="cyber-glass rounded-xl p-4 border border-cyan-500/30">
              <p className="text-xs text-cyan-300/90 mb-1 truncate">Direct Volume</p>
              <NumberPopup
                value={formatUSD(totalDirectVolume)}
                label="Direct Volume"
                className="text-lg md:text-xl font-bold text-cyan-400"
              />
            </div>
            <div className="cyber-glass rounded-xl p-4 border border-cyan-500/30">
              <p className="text-xs text-cyan-300/90 mb-1 truncate">Team Volume</p>
              <NumberPopup
                value={formatUSD(totalTeamVolume)}
                label="Team Volume"
                className="text-lg md:text-xl font-bold text-neon-green"
              />
            </div>
            <div className="cyber-glass rounded-xl p-4 border border-cyan-500/30">
              <p className="text-xs text-cyan-300/90 mb-1 truncate">Qualified Volume</p>
              <NumberPopup
                value={formatUSD(userStatus.qualifiedVolumeUSD)}
                label="Qualified Volume"
                className="text-lg md:text-xl font-bold text-neon-orange"
              />
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="cyber-glass rounded-2xl p-6 border border-cyan-500/30">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-cyan-300">Direct Referrals</h2>
                  <span className="text-sm text-cyan-300/90">{directList.length} members</span>
                </div>

                <div className="overflow-hidden -mx-6 px-6">
                  <div className="relative">
                    {isLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-dark-950/70 backdrop-blur-sm z-10 rounded-lg">
                        <Loader2 size={28} className="animate-spin text-cyan-300" />
                      </div>
                    )}
                    {!isLoading && directList.length === 0 ? (
                      <div className="p-6 text-center text-sm text-cyan-300/70">
                        No direct referrals found yet.
                      </div>
                    ) : (
                      <div
                        ref={directListRef}
                        className="max-h-[420px] overflow-y-auto pr-2 space-y-3 hide-scrollbar"
                      >
                        {directList.map((direct, idx) => (
                          <div
                            key={idx}
                            className="p-4 cyber-glass border border-cyan-500/20 rounded-lg hover:cyber-glass transition-colors min-w-0"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                              <AddressWithCopy
                                address={
                                  direct.addressFull && direct.addressFull.length === 42
                                    ? direct.addressFull
                                    : direct.address
                                }
                                copyLabel=""
                                className="text-xs sm:text-sm"
                                textClassName="font-mono text-cyan-300 truncate max-w-[200px] text-xs sm:text-sm"
                              />
                              <span className="text-xs text-cyan-300/90 flex-shrink-0">
                                {direct.activatedAt}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="min-w-0">
                                <p className="text-xs text-cyan-300/90 mb-1">Stake Amount</p>
                                <NumberPopup
                                  value={formatUSD(direct.stakedUSDDisplay ?? 0)}
                                  label="Stake Amount"
                                  className="text-sm font-semibold text-cyan-400"
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs text-cyan-300/90 mb-1">Team Volume</p>
                                <NumberPopup
                                  value={formatUSD(direct.teamVolumeDisplay ?? 0)}
                                  label="Team Volume"
                                  className="text-sm font-semibold text-neon-green"
                                />
                              </div>
                            </div>
                            <button
                              className="mt-3 text-xs text-cyan-400 hover:text-cyan-400 flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                              onClick={() => {
                                if (!direct.addressFull) return;
                                navigate(`/dashboard/team/${direct.addressFull}`, {
                                  state: { direct: direct.raw ?? null },
                                });
                              }}
                              disabled={!direct.addressFull || direct.addressFull.length !== 42}
                            >
                              <Eye size={14} />
                              View Details
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="cyber-glass rounded-2xl p-6 border border-cyan-500/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-cyan-300">Enhanced Volume Analysis</h3>
                  {volumeLoading && (
                    <div className="flex items-center gap-2">
                      <Loader2 className="animate-spin text-cyan-400" size={16} />
                      <span className="text-xs text-cyan-400">Loading...</span>
                    </div>
                  )}
                </div>
                
                {detailedVolumeData ? (
                  <div className="space-y-4">
                    {/* Real Volume Data from SlabManager */}
                    <div>
                      <p className="text-sm font-medium text-cyan-400 mb-2">
                        Live SlabManager Data
                      </p>
                      <p className="text-xs text-cyan-300/90 mb-3">
                        Real-time volume distribution from blockchain contracts
                      </p>
                      <div className="space-y-2">
                        <div className="p-3 cyber-glass border border-cyan-500/30 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-cyan-300">L1 (Top Leg)</span>
                            <span className="text-xs font-bold text-cyan-300">
                              {formatUSD(detailedVolumeData.cappedVolumes.L1)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-cyan-300/70">Uncapped:</span>
                            <span className="text-xs text-cyan-300/70">
                              {formatUSD(detailedVolumeData.uncappedVolumes.L1)}
                            </span>
                          </div>
                          <div className="mt-2 text-xs text-cyan-300/70">
                            Capping Efficiency: {detailedVolumeData.volumePerformance.cappingEfficiency.L1.toFixed(1)}%
                          </div>
                        </div>
                        
                        <div className="p-3 cyber-glass border border-neon-green/30 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-neon-green">L2 (Second Leg)</span>
                            <span className="text-xs font-bold text-neon-green">
                              {formatUSD(detailedVolumeData.cappedVolumes.L2)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-neon-green/70">Uncapped:</span>
                            <span className="text-xs text-neon-green/70">
                              {formatUSD(detailedVolumeData.uncappedVolumes.L2)}
                            </span>
                          </div>
                          <div className="mt-2 text-xs text-neon-green/70">
                            Capping Efficiency: {detailedVolumeData.volumePerformance.cappingEfficiency.L2.toFixed(1)}%
                          </div>
                        </div>
                        
                        <div className="p-3 cyber-glass border border-neon-orange/30 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-neon-orange">L-Rest (Other Legs)</span>
                            <span className="text-xs font-bold text-neon-orange">
                              {formatUSD(detailedVolumeData.cappedVolumes.Lrest)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-neon-orange/70">Total Uncapped:</span>
                            <span className="text-xs text-neon-orange/70">
                              {formatUSD(detailedVolumeData.uncappedVolumes.Lrest)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Volume Performance Analysis */}
                    <div className="pt-3 border-t border-cyan-500/30">
                      <div className="p-3 cyber-glass border border-cyan-500/20 bg-gradient-to-r from-cyan-500/5 to-neon-green/5 rounded-lg">
                        <p className="text-xs font-medium text-cyan-300 mb-2">Performance Analysis</p>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-xs text-cyan-300/90">Balance Status:</span>
                            <span className={`text-xs font-medium ${
                              detailedVolumeData.volumePerformance.balance.isBalanced 
                                ? 'text-neon-green' 
                                : 'text-neon-orange'
                            }`}>
                              {detailedVolumeData.volumePerformance.balance.isBalanced ? 'Balanced' : 'Needs Balance'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-cyan-300/90">L1:L2 Ratio:</span>
                            <span className="text-xs text-cyan-300">
                              {detailedVolumeData.volumePerformance.balance.ratio.toFixed(2)}:1
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs text-cyan-300/90">Total Volume Loss:</span>
                            <span className="text-xs text-neon-orange">
                              {formatUSD(detailedVolumeData.volumePerformance.cappingEfficiency.totalLoss)}
                            </span>
                          </div>
                        </div>
                        {!detailedVolumeData.volumePerformance.balance.isBalanced && (
                          <div className="mt-2 p-2 bg-neon-orange/10 border border-neon-orange/20 rounded text-xs text-neon-orange">
                            💡 {detailedVolumeData.volumePerformance.balance.recommendation}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Individual Leg Performance */}
                    <div className="pt-3 border-t border-cyan-500/30">
                      <p className="text-xs font-medium text-cyan-300 mb-2">Top Performing Legs</p>
                      <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                        {detailedVolumeData.legs.slice(0, 6).map((leg, index) => (
                          <div key={leg.address} className="flex items-center justify-between p-2 cyber-glass border border-cyan-500/20 rounded">
                            <div className="flex items-center gap-2">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                                index === 0 ? 'bg-neon-green/20 text-neon-green' :
                                index === 1 ? 'bg-cyan-500/20 text-cyan-400' :
                                index === 2 ? 'bg-neon-orange/20 text-neon-orange' :
                                'bg-cyan-500/10 text-cyan-300'
                              }`}>
                                {index + 1}
                              </div>
                              <span className="text-xs text-cyan-300">
                                {leg.address.slice(0, 6)}...{leg.address.slice(-4)}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="text-xs font-bold text-cyan-300">{formatUSD(leg.volume)}</div>
                              <div className="text-xs text-cyan-400/70">{leg.percentage.toFixed(1)}%</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Fallback to existing static display
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-cyan-400 mb-2">
                        {legCapData.leg1}:{legCapData.leg2}:{legCapData.leg3} Rule
                      </p>
                      <p className="text-xs text-cyan-300/90 mb-3">
                        For 3 legs, volume is calculated with caps
                      </p>
                      <div className="space-y-2">
                        <div className="p-2.5 cyber-glass border border-cyan-500/20 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-cyan-300">Leg 1</span>
                            <span className="text-xs font-bold text-cyan-300">{legCapData.leg1}% Cap</span>
                          </div>
                          {legCapData.volumes && (
                            <div className="text-xs text-cyan-300/70 mt-1">
                              Volume: ${normalizeUsdDisplay(legCapData.volumes.leg1).toFixed(2)}
                            </div>
                          )}
                        </div>
                        <div className="p-2.5 cyber-glass border border-neon-green/20 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-neon-green">Leg 2</span>
                            <span className="text-xs font-bold text-neon-green">{legCapData.leg2}% Cap</span>
                          </div>
                          {legCapData.volumes && (
                            <div className="text-xs text-neon-green/70 mt-1">
                              Volume: ${normalizeUsdDisplay(legCapData.volumes.leg2).toFixed(2)}
                            </div>
                          )}
                        </div>
                        <div className="p-2.5 cyber-glass border border-neon-orange/20 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-neon-orange">Leg 3</span>
                            <span className="text-xs font-bold text-neon-orange">{legCapData.leg3}% Cap</span>
                          </div>
                          {legCapData.volumes && (
                            <div className="text-xs text-neon-orange/70 mt-1">
                              Volume: ${normalizeUsdDisplay(legCapData.volumes.leg3).toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-cyan-500/30">
                      <div className="p-3 cyber-glass border border-cyan-500/20 bg-gradient-to-r from-cyan-500/5 to-neon-green/5 rounded-lg">
                        <p className="text-xs font-medium text-cyan-300 mb-1">4+ Legs Bonus</p>
                        <p className="text-xs text-cyan-300/90">
                          100% of total volume qualifies (no caps)
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="cyber-glass rounded-2xl p-6 border border-cyan-500/30">
                <h3 className="font-semibold text-cyan-300 mb-4">Income Summary</h3>
                <div className="space-y-3">
                  <div className="p-3 cyber-glass border border-cyan-500/20 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-cyan-300">Direct Commission</span>
                      <span className="text-xs font-bold text-cyan-300">5%</span>
                    </div>
                    <p className="text-xs text-cyan-300">On external wallet stakes</p>
                  </div>

                  <div className="p-3 cyber-glass border border-neon-green/20 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-neon-green/80">Slab Income</span>
                      <span className="text-xs font-bold text-neon-green">Up to 60%</span>
                    </div>
                    <p className="text-xs text-neon-green">From team growth</p>
                  </div>

                  <div className="p-3 cyber-glass border border-neon-orange/20 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-neon-orange/80">Override Bonus</span>
                      <span className="text-xs font-bold text-neon-orange">10%/5%/5%</span>
                    </div>
                    <p className="text-xs text-neon-orange">Same-slab uplines</p>
                  </div>
                </div>
              </div>

              <div className="cyber-glass border border-cyan-500/20 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <TrendingUp className="text-cyan-400 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="text-sm font-medium text-cyan-300 mb-1">Build Smart</p>
                    <p className="text-xs text-cyan-300">
                      Focus on balanced leg growth to unlock higher slab levels and royalty income.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="cyber-glass rounded-2xl border border-cyan-500/30">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-6 border-b border-cyan-500/20">
            <div>
              <h2 className="text-lg font-semibold text-cyan-300">Total Team Matrix</h2>
              <p className="text-xs text-cyan-300/80">
                {totalTeamMembers} members • {activeMembers} active • {inactiveMembers} inactive
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {LEVEL_KEYS.map((level) => (
                <button
                  key={level}
                  onClick={() => setActiveLevel(level)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeLevel === level
                      ? 'bg-gradient-to-r from-cyan-500 to-neon-green text-dark-950'
                      : 'cyber-glass border border-cyan-500/30 text-cyan-300 hover:border-cyan-500/50'
                  }`}
                >
                  {level}
                  <span className="ml-2 px-1.5 py-0.5 bg-white/20 rounded text-[11px] text-white/90">
                      {levelData[level]?.length ?? 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 border-b border-cyan-500/20">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-300/70" size={18} />
                <input
                  type="text"
                  placeholder="Search by User ID or Address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 cyber-glass border border-cyan-500/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-300/70" size={18} />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-10 pr-8 py-2.5 cyber-glass border border-cyan-500/20 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
                >
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                </select>
              </div>
              <div className="cyber-glass border border-cyan-500/20 rounded-lg px-4 py-2.5 text-sm text-cyan-300 flex items-center justify-between">
                <span>Level</span>
                <span className="font-semibold text-cyan-100">{activeLevel}</span>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {filteredData.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto text-cyan-400/50 mb-3" size={48} />
                <p className="text-cyan-300/90 font-medium">
                  No team members found at {activeLevel}
                </p>
                <p className="text-sm text-cyan-300/90 mt-1">
                  {searchTerm || statusFilter !== 'All'
                    ? 'Try adjusting your filters'
                    : 'This level is empty'}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto -mx-4 sm:-mx-6">
                  <div className="inline-block min-w-full align-middle">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-cyan-500/20">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-cyan-300 uppercase tracking-wider">
                            User ID
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-cyan-300 uppercase tracking-wider">
                            Address
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-cyan-300 uppercase tracking-wider">
                            Portfolio
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-cyan-300 uppercase tracking-wider">
                            Total Earned
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-cyan-300 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-cyan-300 uppercase tracking-wider">
                            Join Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-cyan-500/10">
                        {filteredData.map((member, idx) => (
                          <tr key={`${member.userId}-${idx}`}>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-cyan-100">
                              {member.userId}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-cyan-100">
                              <AddressWithCopy
                                address={
                                  member.addressFull && member.addressFull.length === 42
                                    ? member.addressFull
                                    : member.address
                                }
                                copyLabel=""
                                textClassName="font-mono text-cyan-100 truncate max-w-[200px] text-sm"
                              />
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm">
                              <NumberPopup
                                value={formatUSD(member.stakedUSDDisplay ?? member.stakedUSD ?? 0)}
                                label="Portfolio Amount"
                                className="text-cyan-300 font-medium"
                              />
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm">
                              <NumberPopup
                                value={formatUSD(normalizeUsdDisplay(member.totalEarned ?? 0))}
                                label="Total Earned"
                                className="text-neon-green font-medium"
                              />
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  member.status === 'Active'
                                    ? 'bg-neon-green/20 text-neon-green'
                                    : 'bg-cyan-500/10 text-cyan-300'
                                }`}
                              >
                                {member.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-cyan-100">
                              {member.joinDate || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* Total Portfolio Sum */}
                <div className="mt-6 pt-4 border-t border-cyan-500/30">
                  <div className="cyber-glass rounded-xl p-4 border border-neon-green/30 bg-gradient-to-r from-neon-green/5 to-cyan-500/5">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-neon-green/20 rounded-lg border border-neon-green/40">
                          <TrendingUp size={20} className="text-neon-green" />
                        </div>
                        <div>
                          <p className="text-xs text-cyan-300/80 uppercase tracking-wide">
                            Total Portfolio Amount ({activeLevel})
                          </p>
                          <p className="text-sm text-cyan-300/60 mt-0.5">
                            Sum of {filteredData.length} member{filteredData.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-cyan-400">
                          {formatUSD(
                            filteredData.reduce((sum, member) => {
                              const portfolioAmount = member.stakedUSDDisplay ?? member.stakedUSD ?? 0;
                              return sum + Number(portfolioAmount);
                            }, 0)
                          )}
                        </p>
                        <p className="text-xs text-cyan-300/70 mt-1">USD</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Team Business Breakdown Table - Expandable View */}
      {directsBusinessData?.success && directsBusinessData?.directs && (
        <div className="cyber-glass border border-neon-orange/30 rounded-xl overflow-hidden mt-8">
          <div className="bg-gradient-to-r from-neon-orange/10 to-purple-500/5 px-6 py-4 border-b border-neon-orange/30">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-neon-orange">Team Business Breakdown</h3>
                <p className="text-sm text-neon-orange/70 mt-1">Detailed analysis of direct members and their portfolio volumes</p>
              </div>
              <button
                onClick={() => setShowTeamBusinessTable(!showTeamBusinessTable)}
                className="flex items-center gap-2 px-4 py-2 bg-neon-orange/20 hover:bg-neon-orange/30 border border-neon-orange/40 rounded-lg text-neon-orange transition-colors"
              >
                {showTeamBusinessTable ? (
                  <>
                    <Eye size={16} />
                    Collapse
                  </>
                ) : (
                  <>
                    <Eye size={16} />
                    Expand View
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Summary Cards - Always Visible */}
          <div className="px-6 py-4 bg-dark-800/30">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="cyber-glass border border-neon-green/30 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Users size={16} className="text-neon-green" />
                  <p className="text-xs text-neon-green/70 uppercase tracking-wider font-semibold">Total Members</p>
                </div>
                <p className="text-2xl font-bold text-neon-green">
                  {directsBusinessData.directs.length}
                </p>
                <p className="text-xs text-neon-green/60 mt-1">Direct referrals</p>
              </div>
              
              <div className="cyber-glass border border-blue-400/30 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp size={16} className="text-blue-400" />
                  <p className="text-xs text-blue-400/70 uppercase tracking-wider font-semibold">Direct Volume</p>
                </div>
                <p className="text-xl font-bold text-blue-400">
                  {formatUSD(directsBusinessData.selfPortfolioUsd ? 
                    directsBusinessData.selfPortfolioUsd.reduce((sum, val) => sum + (val || 0), 0) : 0)}
                </p>
                <p className="text-xs text-blue-400/60 mt-1">Self portfolios</p>
              </div>
              
              <div className="cyber-glass border border-purple-400/30 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Users size={16} className="text-purple-400" />
                  <p className="text-xs text-purple-400/70 uppercase tracking-wider font-semibold">Team Volume</p>
                </div>
                <p className="text-xl font-bold text-purple-400">
                  {formatUSD(directsBusinessData.teamPortfolioUsd ? 
                    directsBusinessData.teamPortfolioUsd.reduce((sum, val) => sum + (val || 0), 0) : 0)}
                </p>
                <p className="text-xs text-purple-400/60 mt-1">Team business</p>
              </div>
              
              <div className="cyber-glass border border-neon-orange/30 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp size={16} className="text-neon-orange" />
                  <p className="text-xs text-neon-orange/70 uppercase tracking-wider font-semibold">Total Volume</p>
                </div>
                <p className="text-xl font-bold text-neon-orange">
                  {formatUSD((() => {
                    const directTotal = directsBusinessData.selfPortfolioUsd ? 
                      directsBusinessData.selfPortfolioUsd.reduce((sum, val) => sum + (val || 0), 0) : 0;
                    const teamTotal = directsBusinessData.teamPortfolioUsd ? 
                      directsBusinessData.teamPortfolioUsd.reduce((sum, val) => sum + (val || 0), 0) : 0;
                    return directTotal + teamTotal;
                  })())}
                </p>
                <p className="text-xs text-neon-orange/60 mt-1">Combined business</p>
              </div>
            </div>
          </div>

          {/* Expandable Detailed Table */}
          {showTeamBusinessTable && (
            <div className="border-t border-neon-orange/20">
              {/* Search Bar */}
              <div className="px-6 py-4 bg-dark-800/20 border-b border-neon-orange/10">
                <div className="relative max-w-md">
                  <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by address..."
                    value={teamBusinessSearchTerm}
                    onChange={(e) => setTeamBusinessSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-dark-800 border border-gray-600/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-neon-orange/50"
                  />
                </div>
              </div>

              {/* Table Headers */}
              <div className="bg-dark-800/50 px-6 py-3 border-b border-neon-orange/20">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-4 text-xs uppercase tracking-wider text-neon-orange/70 font-semibold">
                  <div className="lg:col-span-1">#</div>
                  <div className="lg:col-span-4">Direct Address</div>
                  <div className="lg:col-span-2 text-right">Direct Volume (USD)</div>
                  <div className="lg:col-span-2 text-right">Team Volume (USD)</div>
                  <div className="lg:col-span-2 text-right">Total Volume (USD)</div>
                  <div className="lg:col-span-1 text-right">Contribution %</div>
                </div>
              </div>

              {/* Table Content */}
              <div className="divide-y divide-neon-orange/10 max-h-96 overflow-y-auto">
                {directsBusinessData.directs
                  .map((address, index) => ({
                    address,
                    index,
                    selfUsd: directsBusinessData.selfPortfolioUsd?.[index] || 0,
                    teamUsd: directsBusinessData.teamPortfolioUsd?.[index] || 0,
                  }))
                  .filter(item => 
                    !teamBusinessSearchTerm.trim() || 
                    item.address.toLowerCase().includes(teamBusinessSearchTerm.toLowerCase())
                  )
                  .map((item) => {
                    const sumUsd = item.selfUsd + item.teamUsd;
                    const totalSum = directsBusinessData.selfPortfolioUsd && directsBusinessData.teamPortfolioUsd ?
                      directsBusinessData.selfPortfolioUsd.reduce((sum, val) => sum + (val || 0), 0) +
                      directsBusinessData.teamPortfolioUsd.reduce((sum, val) => sum + (val || 0), 0) : 0;
                    const contributionPercent = totalSum > 0 
                      ? ((sumUsd / totalSum) * 100).toFixed(2)
                      : '0.00';

                    return (
                      <div key={item.index} className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-4 px-6 py-4 hover:bg-neon-orange/5 transition-colors">
                        {/* Index */}
                        <div className="lg:col-span-1 text-sm text-gray-400 font-mono">
                          <span className="block lg:hidden text-xs text-neon-orange/70 mb-1">Index:</span>
                          {item.index + 1}
                        </div>
                        
                        {/* Address */}
                        <div className="lg:col-span-4 font-mono text-sm text-cyan-100 break-all">
                          <span className="block lg:hidden text-xs text-neon-orange/70 mb-1">Address:</span>
                          <div className="flex items-center gap-2">
                            <span>{item.address}</span>
                            <button
                              onClick={() => copyToClipboard(item.address)}
                              className="p-1 hover:bg-neon-orange/20 rounded text-neon-orange hover:text-white transition-colors"
                            >
                              {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                            </button>
                          </div>
                        </div>
                        
                        {/* Direct Volume */}
                        <div className="lg:col-span-2 lg:text-right">
                          <span className="block lg:hidden text-xs text-neon-orange/70 mb-1">Direct Volume:</span>
                          <span className="font-semibold text-blue-400">{formatUSD(item.selfUsd)}</span>
                        </div>
                        
                        {/* Team Volume */}
                        <div className="lg:col-span-2 lg:text-right">
                          <span className="block lg:hidden text-xs text-neon-orange/70 mb-1">Team Volume:</span>
                          <span className="font-semibold text-purple-400">{formatUSD(item.teamUsd)}</span>
                        </div>
                        
                        {/* Total Volume */}
                        <div className="lg:col-span-2 lg:text-right">
                          <span className="block lg:hidden text-xs text-neon-orange/70 mb-1">Total Volume:</span>
                          <span className="font-bold text-neon-orange">{formatUSD(sumUsd)}</span>
                        </div>
                        
                        {/* Contribution % */}
                        <div className="lg:col-span-1 lg:text-right">
                          <span className="block lg:hidden text-xs text-neon-orange/70 mb-1">Contribution:</span>
                          <span className="font-semibold text-neon-green">{contributionPercent}%</span>
                        </div>
                      </div>
                    );
                  })}
                
                {/* Totals Row */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-4 px-6 py-4 bg-gradient-to-r from-neon-orange/10 to-transparent border-t-2 border-neon-orange/30">
                  <div className="lg:col-span-1"></div>
                  <div className="lg:col-span-4 font-bold text-neon-orange uppercase tracking-wider">
                    TOTALS
                  </div>
                  <div className="lg:col-span-2 lg:text-right">
                    <span className="block lg:hidden text-xs text-neon-orange/70 mb-1">Total Direct:</span>
                    <span className="font-bold text-blue-400">
                      {formatUSD(directsBusinessData.selfPortfolioUsd ? 
                        directsBusinessData.selfPortfolioUsd.reduce((sum, val) => sum + (val || 0), 0) : 0)}
                    </span>
                  </div>
                  <div className="lg:col-span-2 lg:text-right">
                    <span className="block lg:hidden text-xs text-neon-orange/70 mb-1">Total Team:</span>
                    <span className="font-bold text-purple-400">
                      {formatUSD(directsBusinessData.teamPortfolioUsd ? 
                        directsBusinessData.teamPortfolioUsd.reduce((sum, val) => sum + (val || 0), 0) : 0)}
                    </span>
                  </div>
                  <div className="lg:col-span-2 lg:text-right">
                    <span className="block lg:hidden text-xs text-neon-orange/70 mb-1">Grand Total:</span>
                    <span className="font-bold text-neon-orange text-lg">
                      {formatUSD((() => {
                        const directTotal = directsBusinessData.selfPortfolioUsd ? 
                          directsBusinessData.selfPortfolioUsd.reduce((sum, val) => sum + (val || 0), 0) : 0;
                        const teamTotal = directsBusinessData.teamPortfolioUsd ? 
                          directsBusinessData.teamPortfolioUsd.reduce((sum, val) => sum + (val || 0), 0) : 0;
                        return directTotal + teamTotal;
                      })())}
                    </span>
                  </div>
                  <div className="lg:col-span-1 lg:text-right">
                    <span className="font-bold text-neon-green">100.00%</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
