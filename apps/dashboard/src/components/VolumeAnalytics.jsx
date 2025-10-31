import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, BarChart3, PieChart, Target, AlertCircle, Loader2, TrendingDown, Activity } from 'lucide-react';
import { formatUSD, formatRAMA } from '../utils/contractData';
import { useStore } from '../../store/useUserInfoStore';

const VolumeAnalytics = ({ userAddress, showDetailed = true, maxLegs = 10 }) => {
  const [volumeData, setVolumeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getVolumeAnalytics = useStore((s) => s.getVolumeAnalytics);
  const getLegsDetailedVolume = useStore((s) => s.getLegsDetailedVolume);

  useEffect(() => {
    async function loadVolumeData() {
      if (!userAddress) {
        setVolumeData(null);
        return;
      }
      
      try {
        setLoading(true);
        setError('');
        
        let analytics = null;
        
        // Try primary getVolumeAnalytics first
        if (getVolumeAnalytics) {
          try {
            analytics = await getVolumeAnalytics(userAddress);
            console.log('✅ getVolumeAnalytics success:', analytics);
          } catch (err) {
            console.warn('⚠️ getVolumeAnalytics failed, trying fallback:', err);
          }
        }
        
        // Fallback to getLegsDetailedVolume if primary fails
        if (!analytics && getLegsDetailedVolume) {
          try {
            const legsData = await getLegsDetailedVolume(userAddress);
            console.log('🔄 Using legs detailed fallback:', legsData);
            
            // Transform legs data to analytics format
            analytics = {
              legs: legsData.legs || [],
              cappedVolumes: legsData.topLegs || { L1: 0, L2: 0, Lrest: 0 },
              uncappedVolumes: {
                L1: legsData.topLegs?.L1 || 0,
                L2: legsData.topLegs?.L2 || 0,
                L3: legsData.topLegs?.L3 || 0,
                Lrest: legsData.topLegs?.Lrest || 0,
                total: legsData.totalVolume || 0
              },
              totalQualified: legsData.totalVolume || 0,
              currentSlabIndex: 0,
              volumePerformance: {
                cappingEfficiency: {
                  L1: 100,
                  L2: 100,
                  totalLoss: 0
                },
                balance: {
                  isBalanced: true,
                  ratio: 1,
                  recommendation: 'Continue growing volume'
                }
              },
              analytics: {
                topPerformingLeg: legsData.legs?.[0] || null,
                volumeGaps: {
                  L1_L2_gap: 0,
                  L2_L3_gap: 0
                },
                growthPotential: {
                  nextSlabRequirement: null,
                  volumeNeeded: null
                }
              }
            };
          } catch (fallbackErr) {
            console.warn('⚠️ Fallback also failed:', fallbackErr);
          }
        }
        
        // Final fallback with minimal data
        if (!analytics) {
          console.log('🔄 Using minimal fallback data');
          analytics = {
            legs: [],
            cappedVolumes: { L1: 0, L2: 0, Lrest: 0 },
            uncappedVolumes: { L1: 0, L2: 0, L3: 0, Lrest: 0, total: 0 },
            totalQualified: 0,
            currentSlabIndex: 0,
            volumePerformance: {
              cappingEfficiency: { L1: 0, L2: 0, totalLoss: 0 },
              balance: { isBalanced: true, ratio: 0, recommendation: 'Start building volume' }
            },
            analytics: {
              topPerformingLeg: null,
              volumeGaps: { L1_L2_gap: 0, L2_L3_gap: 0 },
              growthPotential: { nextSlabRequirement: null, volumeNeeded: null }
            }
          };
        }
        
        setVolumeData(analytics);
        
      } catch (err) {
        console.error('❌ Volume analytics error:', err);
        setError(err?.message || 'Failed to load volume analytics');
      } finally {
        setLoading(false);
      }
    }
    
    loadVolumeData();
  }, [userAddress, getVolumeAnalytics, getLegsDetailedVolume]);

  if (loading) {
    return (
      <div className="cyber-glass rounded-2xl p-6 border border-cyan-500/30">
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="animate-spin text-cyan-400" size={20} />
          <span className="text-cyan-300">Loading volume analytics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cyber-glass rounded-2xl p-4 border border-red-500/30">
        <div className="flex items-center gap-2 text-red-300">
          <AlertCircle size={16} />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  if (!volumeData) {
    return (
      <div className="cyber-glass rounded-2xl p-4 border border-cyan-500/30">
        <div className="flex items-center gap-2 text-cyan-300">
          <AlertCircle size={16} />
          <span className="text-sm">No volume data available</span>
        </div>
      </div>
    );
  }

  const { cappedVolumes, uncappedVolumes, volumePerformance, legs, totalQualified, currentSlabIndex } = volumeData;
  const safeLegs = Array.isArray(legs) ? legs : [];

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="cyber-glass rounded-xl p-4 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <div className="flex items-center gap-1 mb-2">
            <div className="p-2 bg-cyan-500/20 rounded-lg flex-shrink-0 border border-cyan-500/30">
              <TrendingUp className="text-cyan-400" size={16} />
            </div>
            <p className="text-[9px] lg:text-xs font-medium text-cyan-400 uppercase tracking-wide">Total Qualified</p>
          </div>
          <p className="text-[12px] lg:text-xl font-bold text-cyan-300">{formatUSD(totalQualified || 0)}</p>
          <p className="text-xs text-cyan-400/70 mt-1">Qualified volume</p>
        </div>

        <div className="cyber-glass rounded-xl p-4 border border-neon-green/30 hover:border-neon-green/80 relative overflow-hidden transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon-green/50 to-transparent" />
          <div className="flex items-center gap-1 mb-2">
            <div className="p-2 bg-neon-green/20 rounded-lg flex-shrink-0 border border-neon-green/30">
              <Activity className="text-neon-green" size={16} />
            </div>
            <p className="text-[9px] lg:text-xs font-medium text-neon-green uppercase tracking-wide">Current Slab</p>
          </div>
          <p className="text-[12px] lg:text-xl font-bold text-neon-green">Level {currentSlabIndex || 0}</p>
          <p className="text-xs text-neon-green/70 mt-1">Achievement level</p>
        </div>

        <div className="cyber-glass rounded-xl p-4 border border-neon-orange/30 hover:border-neon-orange/80 relative overflow-hidden transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon-orange/50 to-transparent" />
          <div className="flex items-center gap-1 mb-2">
            <div className="p-2 bg-neon-orange/20 rounded-lg flex-shrink-0 border border-neon-orange/30">
              <TrendingDown className="text-neon-orange" size={16} />
            </div>
            <p className="text-[9px] lg:text-xs font-medium text-neon-orange uppercase tracking-wide">Volume Loss</p>
          </div>
          <p className="text-[12px] lg:text-xl font-bold text-neon-orange">
            {formatUSD(volumePerformance?.cappingEfficiency?.totalLoss || 0)}
          </p>
          <p className="text-xs text-neon-orange/70 mt-1">Due to capping</p>
        </div>

        <div className="cyber-glass rounded-xl p-4 border border-neon-purple/30 hover:border-neon-purple/80 relative overflow-hidden transition-all">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neon-purple/50 to-transparent" />
          <div className="flex items-center gap-1 mb-2">
            <div className="p-2 bg-neon-purple/20 rounded-lg flex-shrink-0 border border-neon-purple/30">
              <Target className="text-neon-purple" size={16} />
            </div>
            <p className="text-[9px] lg:text-xs font-medium text-neon-purple uppercase tracking-wide">Balance Status</p>
          </div>
          <p className={`text-[12px] lg:text-xl font-bold ${volumePerformance?.balance?.isBalanced ? 'text-neon-green' : 'text-neon-orange'}`}>
            {volumePerformance?.balance?.isBalanced ? 'Balanced' : 'Needs Balance'}
          </p>
          <p className="text-xs text-neon-purple/70 mt-1">Volume distribution</p>
        </div>
      </div>

      {showDetailed && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Leg Volume Distribution */}
          <div className="cyber-glass rounded-2xl p-6 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-cyan-500/20 rounded-lg flex-shrink-0 border border-cyan-500/30">
                <BarChart3 className="text-cyan-400" size={20} />
              </div>
              <h3 className="text-base font-semibold text-cyan-300 uppercase tracking-wide">Volume Distribution</h3>
            </div>
            
            <div className="space-y-4">
              {/* Top 3 Legs Display */}
              <div className="grid grid-cols-3 gap-3 grid grid-cols-3">
                <div className="text-center p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30 col-span-3 lg:col-span-1">
                  <p className="text-cyan-400 text-xs font-medium uppercase">L1 (Capped)</p>
                  <p className="text-[12px] text-lg font-bold text-cyan-300">{formatUSD(cappedVolumes?.L1 || 0)}</p>
                  <p className="text-xs text-cyan-400/70">vs {formatUSD(uncappedVolumes?.L1 || 0)} actual</p>
                  <div className="mt-1 text-xs text-cyan-400/70">
                    {cappedVolumes?.L1 > 0 && uncappedVolumes?.L1 > 0 
                      ? ((cappedVolumes.L1 / uncappedVolumes.L1) * 100).toFixed(1) 
                      : 0}% efficiency
                  </div>
                </div>
                <div className="text-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/30 col-span-3 lg:col-span-1">
                  <p className="text-blue-400 text-xs font-medium uppercase">L2 (Capped)</p>
                  <p className="text-lg font-bold text-blue-300 text-[12px] text-lg ">{formatUSD(cappedVolumes?.L2 || 0)}</p>
                  <p className="text-xs text-blue-400/70">vs {formatUSD(uncappedVolumes?.L2 || 0)} actual</p>
                  <div className="mt-1 text-xs text-blue-400/70">
                    {cappedVolumes?.L2 > 0 && uncappedVolumes?.L2 > 0 
                      ? ((cappedVolumes.L2 / uncappedVolumes.L2) * 100).toFixed(1) 
                      : 0}% efficiency
                  </div>
                </div>
                <div className="text-center p-3 bg-neon-green/10 rounded-lg border border-neon-green/30 col-span-3 lg:col-span-1">
                  <p className="text-neon-green text-xs font-medium uppercase">L-Rest</p>
                  <p className="text-lg font-bold text-neon-green text-[12px] text-lg ">{formatUSD(cappedVolumes?.Lrest || 0)}</p>
                  <p className="text-xs text-neon-green/70">vs {formatUSD(uncappedVolumes?.Lrest || 0)} actual</p>
                  <div className="mt-1 text-xs text-neon-green/70">
                    All legs combined
                  </div>
                </div>
              </div>

              {/* Performance Insights */}
              <div className="p-3 cyber-glass border border-cyan-500/20 rounded-lg">
                <h4 className="text-xs font-medium text-cyan-300 mb-2 uppercase tracking-wide">Performance Insights</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-cyan-300/90">L1:L2 Ratio:</span>
                    <span className="text-xs text-cyan-300">
                      {volumePerformance?.balance?.ratio ? volumePerformance.balance.ratio.toFixed(2) : '0'}:1
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-cyan-300/90">Recommendation:</span>
                    <span className="text-xs text-neon-orange">
                      {volumePerformance?.balance?.recommendation || 'Build volume evenly'}
                    </span>
                  </div>
                  {volumeData.analytics?.nextSlabRequirement && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-cyan-300/90">Next Slab Need:</span>
                      <span className="text-xs text-neon-green">
                        {formatUSD(volumeData.analytics.nextSlabRequirement.remaining)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Top Performing Legs */}
          <div className="cyber-glass rounded-2xl p-6 border border-cyan-500/30 hover:border-cyan-500/80 relative overflow-hidden transition-all">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-neon-purple/20 rounded-lg flex-shrink-0 border border-neon-purple/30">
                <Users className="text-neon-purple" size={20} />
              </div>
              <h3 className="text-base font-semibold text-cyan-300 uppercase tracking-wide">Top Contributors</h3>
            </div>
            
            <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
              {safeLegs.slice(0, maxLegs).map((leg, index) => (
                <div key={leg.address || index} className="flex items-center justify-between p-3 cyber-glass border border-cyan-500/20 rounded-lg hover:border-cyan-500/40 transition-all overflow-x-auto space-x-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-neon-green/20 text-neon-green border border-neon-green/40' :
                      index === 1 ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' :
                      index === 2 ? 'bg-neon-orange/20 text-neon-orange border border-neon-orange/40' :
                      'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-cyan-300 font-mono">
                        {leg.address ? `${leg.address.slice(0, 8)}...${leg.address.slice(-6)}` : 'Unknown'}
                      </p>
                      <p className="text-[10px] lg:text-xs text-cyan-400/70">
                        {typeof leg.percentage === 'number' ? leg.percentage.toFixed(1) : '0'}% of total volume
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] lg:text-sm font-bold text-cyan-300">{formatUSD(leg.volume || 0)}</p>
                    <p className="text-[10px] lg:text-xs text-cyan-400/70">{formatRAMA(leg.volumeRAMA || 0)}</p>
                  </div>
                </div>
              ))}
              
              {safeLegs.length === 0 && (
                <div className="text-center py-6">
                  <AlertCircle className="mx-auto text-cyan-400/50 mb-2" size={24} />
                  <p className="text-sm text-cyan-300/70">No leg data available</p>
                  <p className="text-xs text-cyan-400/50 mt-1">Build your network to see volume analytics</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Volume Optimization Tips */}
      {volumePerformance?.balance && !volumePerformance.balance.isBalanced && (
        <div className="cyber-glass rounded-xl p-4 border border-neon-orange/30 bg-neon-orange/5">
          <div className="flex items-center gap-3 mb-3">
            <Target className="text-neon-orange" size={20} />
            <h4 className="text-sm font-semibold text-neon-orange">Volume Optimization Tips</h4>
          </div>
          <div className="space-y-2 text-sm text-cyan-300">
            <p>• {volumePerformance.balance.recommendation}</p>
            <p>• Consider building volume in underperforming legs to improve balance</p>
            <p>• Optimal distribution: 40% L1, 30% L2, 30% Others for maximum efficiency</p>
            {volumePerformance.cappingEfficiency?.totalLoss > 1000 && (
              <p className="text-neon-orange">• You're losing {formatUSD(volumePerformance.cappingEfficiency.totalLoss)} due to volume caps!</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VolumeAnalytics;