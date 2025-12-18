import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, 
  TrendingUp, 
  Lock, 
  Unlock, 
  ArrowRight, 
  X,
  CheckCircle,
  Info
} from 'lucide-react';

export default function CappedPortfolioFunnel({ 
  isOpen, 
  onClose, 
  portfolioData = null,
  autoShow = true 
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowAnimation(true);
      setStep(1);
    }
  }, [isOpen]);

  // Prevent background scroll when modal open (mobile-friendly)
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev || '';
    };
  }, [isOpen]);

  const handleStakeNow = () => {
    onClose();
    navigate('/dashboard/stake');
  };

  const handleLearnMore = () => {
    setStep(2);
  };

  if (!isOpen) return null;

  const isCapped = portfolioData?.isCapped ?? false;
  const cappedAt = portfolioData?.cappedAt ?? 0;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 md:p-6 pointer-events-none">
        <div
          className={`pointer-events-auto w-full max-w-2xl transform transition-all duration-500 ${
            showAnimation ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          } max-h-[90vh] sm:max-h-[85vh] md:max-h-[80vh] overflow-y-auto overscroll-contain`}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* Step 1: Alert & Information */}
          {step === 1 && (
            <div className="cyber-glass rounded-3xl border-2 border-neon-orange/50 overflow-hidden shadow-2xl shadow-neon-orange/20">
              {/* Header with gradient */}
              <div className="relative bg-gradient-to-r from-neon-orange/20 via-red-500/20 to-neon-orange/20 p-4 sm:p-6 border-b border-neon-orange/30">
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 text-cyan-300/70 hover:text-cyan-300 transition-colors rounded-lg hover:bg-cyan-500/10"
                  aria-label="Close"
                >
                  <X size={18} className="sm:w-5 sm:h-5" />
                </button>

                <div className="flex items-start gap-3 sm:gap-4 pr-8 sm:pr-0">
                  <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-neon-orange/20 border border-neon-orange/40 animate-pulse">
                    <AlertTriangle className="text-neon-orange" size={24} />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl sm:text-2xl font-bold text-neon-orange mb-1 sm:mb-2">
                      Portfolio Capped!
                    </h2>
                    <p className="text-xs sm:text-sm text-cyan-300/90">
                      Your current portfolio has reached its earning limit
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* Status Card */}
                <div className="cyber-glass rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-neon-orange/30 bg-gradient-to-br from-neon-orange/5 to-red-500/5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-3 sm:gap-0">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Lock className="text-neon-orange flex-shrink-0" size={20} />
                      <div>
                        <p className="text-xs sm:text-sm text-cyan-300/70">Portfolio Status</p>
                        <p className="text-base sm:text-lg font-bold text-neon-orange">Earnings Capped</p>
                      </div>
                    </div>
                    {cappedAt > 0 && (
                      <div className="text-left sm:text-right pl-7 sm:pl-0">
                        <p className="text-xs text-cyan-300/70">Capped At</p>
                        <p className="text-xs sm:text-sm font-mono text-neon-orange">
                          {new Date(cappedAt * 1000).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 text-xs sm:text-sm text-cyan-300/80">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-neon-orange animate-pulse" />
                      <span>No more earnings from this portfolio</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-neon-orange animate-pulse" />
                      <span>Team rewards and referrals limited</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-neon-orange animate-pulse" />
                      <span>New stake required to continue earning</span>
                    </div>
                  </div>
                </div>

                {/* Solution Card */}
                <div className="cyber-glass rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 to-neon-green/5">
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-gradient-to-br from-cyan-500/20 to-neon-green/20 border border-cyan-500/30">
                      <TrendingUp className="text-neon-green" size={20} />
                    </div>
                    <div>
                      <p className="text-base sm:text-lg font-bold text-neon-green">Continue Earning</p>
                      <p className="text-xs text-cyan-300/70">Create a new portfolio to unlock rewards</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <div className="p-2.5 sm:p-3 cyber-glass rounded-lg border border-cyan-500/20">
                      <CheckCircle className="text-neon-green mb-1.5 sm:mb-2" size={18} />
                      <p className="text-xs font-semibold text-cyan-300 mb-0.5 sm:mb-1">Fresh Cap</p>
                      <p className="text-xs text-cyan-300/70">5X earning potential</p>
                    </div>
                    <div className="p-2.5 sm:p-3 cyber-glass rounded-lg border border-cyan-500/20">
                      <CheckCircle className="text-neon-green mb-1.5 sm:mb-2" size={18} />
                      <p className="text-xs font-semibold text-cyan-300 mb-0.5 sm:mb-1">Full Rewards</p>
                      <p className="text-xs text-cyan-300/70">Team & referral income</p>
                    </div>
                    <div className="p-2.5 sm:p-3 cyber-glass rounded-lg border border-cyan-500/20">
                      <CheckCircle className="text-neon-green mb-1.5 sm:mb-2" size={18} />
                      <p className="text-xs font-semibold text-cyan-300 mb-0.5 sm:mb-1">Compound</p>
                      <p className="text-xs text-cyan-300/70">Accelerate growth</p>
                    </div>
                  </div>

                  <div className="p-2.5 sm:p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                    <div className="flex items-start gap-2">
                      <Info className="text-cyan-300 flex-shrink-0 mt-0.5" size={16} />
                      <p className="text-xs text-cyan-300/80">
                        <strong className="text-cyan-300">Tip:</strong> Staking additional RAMA creates a new portfolio with fresh earning limits and unlocks all income streams.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2.5 sm:gap-3">
                  <button
                    onClick={handleStakeNow}
                    className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-cyan-500 to-neon-green text-dark-950 font-bold rounded-xl hover:shadow-xl hover:shadow-cyan-500/30 transition-all duration-300 flex items-center justify-center gap-2 group text-sm sm:text-base"
                  >
                    <Unlock size={18} className="sm:w-5 sm:h-5" />
                    <span>Stake Now & Unlock</span>
                    <ArrowRight size={18} className="sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button
                    onClick={handleLearnMore}
                    className="w-full px-4 sm:px-6 py-3 sm:py-4 cyber-glass border border-cyan-500/30 text-cyan-300 font-semibold rounded-xl hover:border-cyan-500/50 transition-all duration-300 flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    Learn More
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Detailed Information */}
          {step === 2 && (
            <div className="cyber-glass rounded-3xl border-2 border-cyan-500/50 overflow-hidden shadow-2xl shadow-cyan-500/20">
              <div className="relative bg-gradient-to-r from-cyan-500/20 via-neon-green/20 to-cyan-500/20 p-4 sm:p-6 border-b border-cyan-500/30">
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 text-cyan-300/70 hover:text-cyan-300 transition-colors rounded-lg hover:bg-cyan-500/10"
                  aria-label="Close"
                >
                  <X size={18} className="sm:w-5 sm:h-5" />
                </button>

                <h2 className="text-xl sm:text-2xl font-bold text-cyan-300 mb-1 sm:mb-2 pr-8 sm:pr-0">
                  Understanding Portfolio Caps
                </h2>
                <p className="text-xs sm:text-sm text-cyan-300/80">
                  How earning limits work and how to maximize your returns
                </p>
              </div>

              <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-h-[65vh] sm:max-h-[60vh] overflow-y-auto">
                <div className="space-y-3 sm:space-y-4">
                  <div className="cyber-glass rounded-xl p-3 sm:p-4 border border-cyan-500/20">
                    <h3 className="font-semibold text-cyan-300 mb-2 flex items-center gap-2 text-sm sm:text-base">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-xs flex-shrink-0">1</div>
                      What is a Portfolio Cap?
                    </h3>
                    <p className="text-xs sm:text-sm text-cyan-300/80 ml-7 sm:ml-8">
                      Each portfolio has a 5X earning limit based on your staked amount. Once you've earned 5 times your stake, the portfolio caps to maintain sustainability.
                    </p>
                  </div>

                  <div className="cyber-glass rounded-xl p-3 sm:p-4 border border-cyan-500/20">
                    <h3 className="font-semibold text-cyan-300 mb-2 flex items-center gap-2 text-sm sm:text-base">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-xs flex-shrink-0">2</div>
                      Why Does It Cap?
                    </h3>
                    <p className="text-xs sm:text-sm text-cyan-300/80 ml-7 sm:ml-8">
                      Caps ensure fair distribution, prevent system abuse, and maintain long-term platform sustainability for all participants.
                    </p>
                  </div>

                  <div className="cyber-glass rounded-xl p-3 sm:p-4 border border-cyan-500/20">
                    <h3 className="font-semibold text-cyan-300 mb-2 flex items-center gap-2 text-sm sm:text-base">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-xs flex-shrink-0">3</div>
                      How to Continue Earning?
                    </h3>
                    <p className="text-xs sm:text-sm text-cyan-300/80 ml-7 sm:ml-8 mb-2">
                      Simply stake additional RAMA Coin to create a new portfolio with fresh earning limits:
                    </p>
                    <ul className="text-xs sm:text-sm text-cyan-300/70 ml-7 sm:ml-8 space-y-1">
                      <li className="flex items-center gap-2">
                        <span className="text-neon-green">✓</span> New 5X earning cap
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-neon-green">✓</span> Full team rewards restored
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-neon-green">✓</span> Referral bonuses unlocked
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-neon-green">✓</span> ROI distribution continues
                      </li>
                    </ul>
                  </div>

                  <div className="cyber-glass rounded-xl p-3 sm:p-4 border border-neon-green/30 bg-gradient-to-br from-neon-green/5 to-cyan-500/5">
                    <h3 className="font-semibold text-neon-green mb-2 flex items-center gap-2 text-sm sm:text-base">
                      <TrendingUp size={18} className="sm:w-5 sm:h-5 flex-shrink-0" />
                      Pro Tip: Compound Your Earnings
                    </h3>
                    <p className="text-xs sm:text-sm text-cyan-300/80">
                      Reinvesting your earnings into new portfolios accelerates growth exponentially. Your team volume carries forward, multiplying benefits across all active portfolios.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 sm:gap-3">
                  <button
                    onClick={handleStakeNow}
                    className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-cyan-500 to-neon-green text-dark-950 font-bold rounded-xl hover:shadow-xl hover:shadow-cyan-500/30 transition-all duration-300 flex items-center justify-center gap-2 group text-sm sm:text-base"
                  >
                    <span>Create New Portfolio</span>
                    <ArrowRight size={18} className="sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button
                    onClick={() => setStep(1)}
                    className="w-full px-4 sm:px-6 py-3 sm:py-4 cyber-glass border border-cyan-500/30 text-cyan-300 font-semibold rounded-xl hover:border-cyan-500/50 transition-all duration-300 text-sm sm:text-base"
                  >
                    Back
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
