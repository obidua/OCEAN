import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  Filter,
  CheckCircle,
  Loader2,
  AlertCircle,
  BarChart3,
  Coins
} from 'lucide-react';
import { formatUSD, formatRAMA } from '../utils/contractData';
import NumberPopup from './NumberPopup';

// Helper function to format RAMA with unit
const formatRamaWithUnit = (value) => `${formatRAMA(value ?? 0)} RAMA`;

const ROIDaysBreakdown = ({ 
  userAddress, 
  getPerDayROIBreakdown, 
  getUnclaimedROIDetailed,
  getMaxPeriodsPerClaim,
  onClaimDays,
  className = "" 
}) => {
  const [breakdownData, setBreakdownData] = useState(null);
  const [unclaimedData, setUnclaimedData] = useState(null);
  const [maxPeriods, setMaxPeriods] = useState(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDays, setSelectedDays] = useState(0); // 0 means claim all
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'
  const [sortBy, setSortBy] = useState('day'); // 'day', 'usd', 'rama'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'

  // Load data when component mounts or userAddress changes
  useEffect(() => {
    if (!userAddress) return;

    const loadData = async () => {
      setLoading(true);
      setError('');
      
      try {
        // Load max periods per claim
        if (typeof getMaxPeriodsPerClaim === 'function') {
          const maxPeriodsResult = await getMaxPeriodsPerClaim();
          setMaxPeriods(maxPeriodsResult);
        }

        // Load unclaimed ROI details
        if (typeof getUnclaimedROIDetailed === 'function') {
          const unclaimedResult = await getUnclaimedROIDetailed(userAddress);
          setUnclaimedData(unclaimedResult);
          
          // If we have unclaimed data, load the breakdown
          if (unclaimedResult.success && unclaimedResult.claimableDays > 0) {
            if (typeof getPerDayROIBreakdown === 'function') {
              const breakdownResult = await getPerDayROIBreakdown(
                userAddress,
                unclaimedResult.fromPeriod,
                unclaimedResult.lastPeriod
              );
              setBreakdownData(breakdownResult);
            }
          }
        }
      } catch (err) {
        console.error('[ROIDaysBreakdown] Error loading data:', err);
        setError(err.message || 'Failed to load ROI breakdown data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userAddress, getPerDayROIBreakdown, getUnclaimedROIDetailed, getMaxPeriodsPerClaim]);

  // Sort and filter daily breakdown
  const sortedDailyBreakdown = useMemo(() => {
    if (!breakdownData?.dailyBreakdown) return [];
    
    const sorted = [...breakdownData.dailyBreakdown].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'usd':
          aValue = a.usdAmount;
          bValue = b.usdAmount;
          break;
        case 'rama':
          aValue = a.ramaAmount;
          bValue = b.ramaAmount;
          break;
        case 'day':
        default:
          aValue = a.day;
          bValue = b.day;
          break;
      }
      
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });
    
    return sorted;
  }, [breakdownData?.dailyBreakdown, sortBy, sortOrder]);

  // Calculate selected days totals
  const selectedTotals = useMemo(() => {
    if (!sortedDailyBreakdown.length || selectedDays === 0) {
      return {
        usd: breakdownData?.summary?.totalUsd || 0,
        rama: breakdownData?.summary?.totalRama || 0,
        days: breakdownData?.summary?.totalDays || 0
      };
    }
    
    const selectedDaysData = sortedDailyBreakdown.slice(0, selectedDays);
    return {
      usd: selectedDaysData.reduce((sum, day) => sum + day.usdAmount, 0),
      rama: selectedDaysData.reduce((sum, day) => sum + day.ramaAmount, 0),
      days: selectedDaysData.length
    };
  }, [sortedDailyBreakdown, selectedDays, breakdownData]);

  const handleSort = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  const handleClaimSelected = () => {
    if (typeof onClaimDays === 'function') {
      onClaimDays(selectedDays === 0 ? null : selectedDays);
    }
  };

  if (loading) {
    return (
      <div className={`cyber-glass rounded-2xl p-6 border border-cyan-500/30 ${className}`}>
        <div className="flex items-center justify-center gap-3 py-8">
          <Loader2 className="animate-spin text-cyan-400" size={24} />
          <span className="text-cyan-300">Loading ROI breakdown...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`cyber-glass rounded-2xl p-6 border border-red-500/30 ${className}`}>
        <div className="flex items-center gap-3 text-red-400">
          <AlertCircle size={20} />
          <span>Error: {error}</span>
        </div>
      </div>
    );
  }

  if (!unclaimedData?.success || !breakdownData?.success || sortedDailyBreakdown.length === 0) {
    return (
      <div className={`cyber-glass rounded-2xl p-6 border border-gray-500/30 ${className}`}>
        <div className="text-center py-8">
          <Calendar className="mx-auto text-gray-400 mb-3" size={48} />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">No ROI Available</h3>
          <p className="text-sm text-gray-400">
            No claimable ROI found for the current period.
          </p>
        </div>
      </div>
    );
  }

  const maxClaimableDays = Math.min(sortedDailyBreakdown.length, maxPeriods);

  return (
    <div className={`cyber-glass rounded-2xl border border-cyan-500/30 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-cyan-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-cyan-300 mb-2">ROI Days Breakdown</h2>
            <p className="text-sm text-gray-400">
              Claim ROI for individual days or in bulk (max {maxPeriods} days at once)
            </p>
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'table' 
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' 
                  : 'text-gray-400 hover:text-cyan-400'
              }`}
            >
              <BarChart3 size={16} />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'cards' 
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' 
                  : 'text-gray-400 hover:text-cyan-400'
              }`}
            >
              <Calendar size={16} />
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="cyber-glass border border-blue-400/30 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="text-blue-400" size={20} />
              <span className="text-xs text-blue-400/70 uppercase tracking-wider">Total Days</span>
            </div>
            <p className="text-2xl font-bold text-blue-400">{breakdownData.summary.totalDays}</p>
            <p className="text-xs text-blue-400/60 mt-1">Claimable periods</p>
          </div>
          
          <div className="cyber-glass border border-neon-green/30 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="text-neon-green" size={20} />
              <span className="text-xs text-neon-green/70 uppercase tracking-wider">Total USD</span>
            </div>
            <NumberPopup
              value={formatUSD(breakdownData.summary.totalUsd)}
              label="Total USD ROI"
              className="text-2xl font-bold text-neon-green"
            />
            <p className="text-xs text-neon-green/60 mt-1">Available to claim</p>
          </div>
          
          <div className="cyber-glass border border-neon-orange/30 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Coins className="text-neon-orange" size={20} />
              <span className="text-xs text-neon-orange/70 uppercase tracking-wider">Total RAMA</span>
            </div>
            <NumberPopup
              value={formatRamaWithUnit(breakdownData.summary.totalRama)}
              label="Total RAMA ROI"
              className="text-2xl font-bold text-neon-orange"
            />
            <p className="text-xs text-neon-orange/60 mt-1">Available to claim</p>
          </div>
          
          <div className="cyber-glass border border-purple-400/30 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="text-purple-400" size={20} />
              <span className="text-xs text-purple-400/70 uppercase tracking-wider">Avg Daily</span>
            </div>
            <NumberPopup
              value={formatUSD(breakdownData.summary.averageDailyUsd)}
              label="Average Daily USD"
              className="text-2xl font-bold text-purple-400"
            />
            <p className="text-xs text-purple-400/60 mt-1">{formatRamaWithUnit(breakdownData.summary.averageDailyRama)}</p>
          </div>
        </div>
      </div>

      {/* Claiming Controls */}
      <div className="p-6 border-b border-cyan-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
                Claim Days
              </label>
              <select
                value={selectedDays}
                onChange={(e) => setSelectedDays(Number(e.target.value))}
                className="appearance-none pr-10 pl-3 py-2 rounded-lg bg-dark-900/60 text-cyan-200 border border-cyan-500/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-400 transition-all cyber-glass"
              >
                <option value={0}>All Days ({sortedDailyBreakdown.length})</option>
                {Array.from({ length: maxClaimableDays }, (_, i) => i + 1).map(days => (
                  <option key={days} value={days}>
                    First {days} day{days > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Selected Totals */}
            <div className="text-sm">
              <p className="text-cyan-300">
                Selected: <span className="font-semibold">{selectedTotals.days} days</span>
              </p>
              <p className="text-neon-green">
                USD: <span className="font-semibold">{formatUSD(selectedTotals.usd)}</span>
              </p>
              <p className="text-neon-orange">
                RAMA: <span className="font-semibold">{formatRamaWithUnit(selectedTotals.rama)}</span>
              </p>
            </div>
          </div>
          
          <button
            onClick={handleClaimSelected}
            disabled={selectedTotals.usd === 0 && selectedTotals.rama === 0}
            className="px-6 py-3 bg-gradient-to-r from-neon-green to-cyan-500 text-white font-semibold rounded-lg hover:from-neon-green/80 hover:to-cyan-500/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <CheckCircle size={20} />
            Claim {selectedDays === 0 ? 'All' : selectedDays} Day{selectedDays !== 1 ? 's' : ''}
          </button>
        </div>
      </div>

      {/* Days Breakdown */}
      <div className="p-6">
        {/* Sort Controls */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="text-gray-400" size={16} />
            <span className="text-xs text-gray-400 uppercase tracking-wider">Sort by:</span>
          </div>
          
          {['day', 'usd', 'rama'].map((sortOption) => (
            <button
              key={sortOption}
              onClick={() => handleSort(sortOption)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                sortBy === sortOption
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  : 'text-gray-400 hover:text-cyan-400 border border-transparent'
              }`}
            >
              {sortOption.toUpperCase()}
              {sortBy === sortOption && (
                <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
              )}
            </button>
          ))}
        </div>

        {/* Breakdown Display */}
        {viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-800/50">
                <tr>
                  <th className="text-left p-3 text-xs text-gray-400 uppercase tracking-wider border-b border-gray-700">Day</th>
                  <th className="text-left p-3 text-xs text-gray-400 uppercase tracking-wider border-b border-gray-700">Date</th>
                  <th className="text-right p-3 text-xs text-gray-400 uppercase tracking-wider border-b border-gray-700">USD Amount</th>
                  <th className="text-right p-3 text-xs text-gray-400 uppercase tracking-wider border-b border-gray-700">RAMA Amount</th>
                  <th className="text-right p-3 text-xs text-gray-400 uppercase tracking-wider border-b border-gray-700">Period ID</th>
                </tr>
              </thead>
              <tbody>
                {sortedDailyBreakdown.map((day, index) => (
                  <tr 
                    key={day.periodId} 
                    className={`hover:bg-cyan-500/5 transition-colors border-b border-gray-700/50 ${
                      selectedDays > 0 && index < selectedDays ? 'bg-neon-green/5' : ''
                    }`}
                  >
                    <td className="p-3 text-sm text-cyan-300 font-semibold">Day {day.day}</td>
                    <td className="p-3 text-sm text-gray-300">{day.estimatedDate}</td>
                    <td className="p-3 text-right">
                      <NumberPopup
                        value={formatUSD(day.usdAmount)}
                        label={`Day ${day.day} USD`}
                        className="text-sm font-semibold text-neon-green"
                      />
                    </td>
                    <td className="p-3 text-right">
                      <NumberPopup
                        value={formatRamaWithUnit(day.ramaAmount)}
                        label={`Day ${day.day} RAMA`}
                        className="text-sm font-semibold text-neon-orange"
                      />
                    </td>
                    <td className="p-3 text-right text-sm text-gray-400">#{day.periodId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedDailyBreakdown.map((day, index) => (
              <div 
                key={day.periodId}
                className={`cyber-glass border rounded-xl p-4 transition-all hover:border-cyan-500/50 ${
                  selectedDays > 0 && index < selectedDays 
                    ? 'border-neon-green/50 bg-neon-green/5' 
                    : 'border-cyan-500/20'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
                      {day.day}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-cyan-300">Day {day.day}</p>
                      <p className="text-xs text-gray-400">{day.estimatedDate}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">#{day.periodId}</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-neon-green/70">USD:</span>
                    <NumberPopup
                      value={formatUSD(day.usdAmount)}
                      label={`Day ${day.day} USD`}
                      className="text-sm font-semibold text-neon-green"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-neon-orange/70">RAMA:</span>
                    <NumberPopup
                      value={formatRamaWithUnit(day.ramaAmount)}
                      label={`Day ${day.day} RAMA`}
                      className="text-sm font-semibold text-neon-orange"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Footer Info */}
      <div className="p-6 border-t border-cyan-500/30 bg-dark-900/40">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock size={14} />
              <span>Period Range: {breakdownData.summary.fromPeriod} - {breakdownData.summary.toPeriod}</span>
            </div>
            <div>Max claim: {maxPeriods} days per transaction</div>
          </div>
          <div>
            Last updated: {new Date(breakdownData.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ROIDaysBreakdown;