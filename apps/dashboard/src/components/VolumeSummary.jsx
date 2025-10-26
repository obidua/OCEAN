import React, { useState, useEffect } from 'react';
import { TrendingUp, Target, AlertCircle, Loader2 } from 'lucide-react';
import { formatUSD } from '../utils/contractData';
import { useStore } from '../../store/useUserInfoStore';

const VolumeSummary = ({ userAddress, compact = false }) => {
  const [volumeData, setVolumeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getVolumeAnalytics = useStore((s) => s.getVolumeAnalytics);

  useEffect(() => {
    async function loadVolumeData() {
      if (!userAddress || !getVolumeAnalytics) {
        setVolumeData(null);
        return;
      }
      try {
        setLoading(true);
        setError('');
        const analytics = await getVolumeAnalytics(userAddress);
        setVolumeData(analytics);
      } catch (err) {
        console.error('Volume analytics error:', err);
        setError(err?.message || 'Failed to load volume analytics');
      } finally {
        setLoading(false);
      }
    }
    loadVolumeData();
  }, [userAddress, getVolumeAnalytics]);

  if (loading) {
    return (
      <div className={`cyber-glass rounded-xl p-4 border border-cyan-500/30 ${compact ? 'h-20' : 'h-32'}`}>
        <div className="flex items-center justify-center h-full gap-2">
          <Loader2 className="animate-spin text-cyan-400" size={16} />
          <span className="text-xs text-cyan-300">Loading...</span>
        </div>
      </div>
    );
  }

  if (error || !volumeData) {
    return (
      <div className={`cyber-glass rounded-xl p-4 border border-red-500/30 ${compact ? 'h-20' : 'h-32'}`}>
        <div className="flex items-center justify-center h-full gap-2 text-red-300">
          <AlertCircle size={16} />
          <span className="text-xs">{error || 'No data'}</span>
        </div>
      </div>
    );
  }

  const { cappedVolumes, totalQualified, currentSlabIndex, volumePerformance } = volumeData;

  if (compact) {
    return (
      <div className="cyber-glass rounded-xl p-3 border border-cyan-500/30 hover:border-cyan-500/80 transition-all">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-cyan-400/90 uppercase tracking-wide">Volume</p>
            <p className="text-sm font-bold text-cyan-300">{formatUSD(totalQualified)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-cyan-400/90">Slab {currentSlabIndex}</p>
            <p className={`text-xs font-medium ${volumePerformance.balance.isBalanced ? 'text-neon-green' : 'text-neon-orange'}`}>
              {volumePerformance.balance.isBalanced ? 'Balanced' : 'Needs Balance'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cyber-glass rounded-xl p-4 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
      
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-cyan-500/20 rounded-lg flex-shrink-0 border border-cyan-500/30">
          <TrendingUp className="text-cyan-400" size={16} />
        </div>
        <h3 className="text-sm font-semibold text-cyan-300 uppercase tracking-wide">Volume Summary</h3>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="text-center">
          <p className="text-xs text-cyan-400/90 uppercase">L1</p>
          <p className="text-sm font-bold text-cyan-300">{formatUSD(cappedVolumes.L1)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-blue-400/90 uppercase">L2</p>
          <p className="text-sm font-bold text-blue-300">{formatUSD(cappedVolumes.L2)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-neon-green/90 uppercase">Rest</p>
          <p className="text-sm font-bold text-neon-green">{formatUSD(cappedVolumes.Lrest)}</p>
        </div>
      </div>

      <div className="pt-2 border-t border-cyan-500/20">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs text-cyan-400/90">Total Qualified</p>
            <p className="text-sm font-bold text-cyan-300">{formatUSD(totalQualified)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-cyan-400/90">Slab Level</p>
            <p className="text-sm font-bold text-neon-green">{currentSlabIndex}</p>
          </div>
        </div>
        
        {!volumePerformance.balance.isBalanced && (
          <div className="mt-2 p-2 bg-neon-orange/10 border border-neon-orange/20 rounded text-xs text-neon-orange">
            <div className="flex items-center gap-1">
              <Target size={12} />
              <span>{volumePerformance.balance.recommendation}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VolumeSummary;