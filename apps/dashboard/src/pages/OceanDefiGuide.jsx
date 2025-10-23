import { Waves, TrendingUp, Users, Award, Trophy, Gift, Zap, CheckCircle, DollarSign, Target, BarChart3, Shield } from 'lucide-react';

export default function OceanDefiGuide() {
  return (
    <div className="space-y-6">
      <div className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-cyan-500 to-neon-green rounded-3xl flex items-center justify-center mx-auto mb-8 animate-glow-pulse">
              <Waves className="text-dark-950" size={56} />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green mb-6">
              OCEAN DeFi Complete Guide
            </h1>
            <p className="text-xl text-cyan-300/90 max-w-3xl mx-auto">
              Your comprehensive guide to all income streams including one-time achievement rewards, rules, and earning potential
            </p>
          </div>

          <div className="space-y-12">
            <div className="cyber-glass border-2 border-cyan-500 rounded-3xl p-8 md:p-12">
              <h2 className="text-4xl font-bold text-cyan-300 mb-8">Welcome to OCEAN DeFi</h2>
              <p className="text-lg text-cyan-300/90 mb-6 leading-relaxed">
                OCEAN DeFi is a revolutionary validator-backed DeFi ecosystem built on the Ramestta blockchain. Unlike traditional platforms that rely solely on new deposits, OCEAN generates sustainable income through professional validator staking that secures the blockchain network.
              </p>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-neon-green mb-2">6</p>
                  <p className="text-sm text-cyan-300">Income Streams</p>
                </div>
                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-neon-green mb-2">4x</p>
                  <p className="text-sm text-cyan-300">Lifetime Cap</p>
                </div>
                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-neon-green mb-2">0%</p>
                  <p className="text-sm text-cyan-300">Trust Policy</p>
                </div>
                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-neon-green mb-2">$50</p>
                  <p className="text-sm text-cyan-300">Minimum Stake</p>
                </div>
              </div>
            </div>

            <div className="cyber-glass border-2 border-neon-green rounded-3xl p-8 md:p-12">
              <div className="flex items-center gap-4 mb-8">
                <TrendingUp className="text-neon-green" size={48} />
                <h2 className="text-4xl font-bold text-neon-green">Income Stream 1: Self Income</h2>
              </div>

              <p className="text-lg text-cyan-300/90 mb-6 leading-relaxed">
                Your foundational income stream based on your personal stake. Earns daily growth that auto-compounds into your portfolio.
              </p>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <h3 className="text-2xl font-bold text-cyan-300 mb-4">Tier 1 (Without Booster)</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-cyan-300/90">Daily Rate:</span>
                      <span className="text-neon-green font-bold">0.33% - 0.40%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-cyan-300/90">Monthly (avg 0.365%):</span>
                      <span className="text-neon-green font-bold">~11%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-cyan-300/90">Lifetime Cap:</span>
                      <span className="text-neon-green font-bold">200%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-cyan-300/90">Time to Cap:</span>
                      <span className="text-cyan-300">~18 months</span>
                    </div>
                  </div>
                  <div className="mt-4 cyber-glass border border-cyan-500/30 rounded-lg p-3">
                    <p className="text-xs text-cyan-300/90"><strong>Example:</strong> $1,000 stake → $3.65/day → $110/month → $2,000 total in 18 months</p>
                  </div>
                </div>

                <div className="cyber-glass border border-neon-green/30 rounded-xl p-6">
                  <h3 className="text-2xl font-bold text-neon-green mb-4">Tier 2 (With Booster)</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-cyan-300/90">Daily Rate:</span>
                      <span className="text-neon-green font-bold">0.66% - 0.80%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-cyan-300/90">Monthly (avg 0.73%):</span>
                      <span className="text-neon-green font-bold">~22%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-cyan-300/90">Lifetime Cap:</span>
                      <span className="text-neon-green font-bold">250%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-cyan-300/90">Time to Cap:</span>
                      <span className="text-cyan-300">~11 months</span>
                    </div>
                  </div>
                  <div className="mt-4 cyber-glass border border-neon-green/30 rounded-lg p-3">
                    <p className="text-xs text-cyan-300/90"><strong>Example:</strong> $1,000 stake → $7.30/day → $220/month → $2,500 total in 11 months</p>
                  </div>
                </div>
              </div>

              <div className="cyber-glass border-2 border-neon-purple rounded-xl p-6">
                <h3 className="text-xl font-bold text-neon-purple mb-3">How to Qualify for Booster (Tier 2)</h3>
                <div className="space-y-2 text-sm text-cyan-300/90">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                    <span>Activate 5+ direct members within 10 days of your activation</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                    <span>Combined team volume must equal or exceed your personal stake</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                    <span>Once activated, booster applies to ALL your stakes (existing + future)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="cyber-glass border-2 border-cyan-500 rounded-3xl p-8 md:p-12">
              <div className="flex items-center gap-4 mb-8">
                <Zap className="text-cyan-400" size={48} />
                <h2 className="text-4xl font-bold text-cyan-400">Income Stream 2: Booster Income</h2>
              </div>

              <p className="text-lg text-cyan-300/90 mb-6 leading-relaxed">
                Additional income earned ONLY during the first 10 days when you achieve booster qualification.
              </p>

              <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6 mb-6">
                <h3 className="text-2xl font-bold text-cyan-300 mb-4">Qualification Requirements</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="cyber-glass border border-neon-green/30 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-neon-green mb-2">5+</p>
                    <p className="text-sm text-cyan-300">Direct Members</p>
                    <p className="text-xs text-cyan-300/70 mt-1">Within 10 days</p>
                  </div>
                  <div className="cyber-glass border border-neon-green/30 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-neon-green mb-2">≥</p>
                    <p className="text-sm text-cyan-300">Team Volume</p>
                    <p className="text-xs text-cyan-300/70 mt-1">Equal to your stake</p>
                  </div>
                  <div className="cyber-glass border border-neon-green/30 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-neon-green mb-2">10</p>
                    <p className="text-sm text-cyan-300">Day Window</p>
                    <p className="text-xs text-cyan-300/70 mt-1">To qualify</p>
                  </div>
                </div>
              </div>

              <div className="cyber-glass border border-neon-purple/50 rounded-xl p-6">
                <h3 className="text-xl font-bold text-neon-purple mb-4">Booster Income Benefits</h3>
                <div className="space-y-3 text-sm text-cyan-300/90">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                    <span><strong className="text-cyan-300">Immediate Reward:</strong> Earn additional income for your first 10 days based on team performance</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                    <span><strong className="text-cyan-300">Permanent Upgrade:</strong> Unlocks Tier 2 (doubled) daily rate for ALL your stakes forever</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                    <span><strong className="text-cyan-300">Higher Cap:</strong> Increases lifetime earning potential from 200% to 250%</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                    <span><strong className="text-cyan-300">Faster Maturity:</strong> Reach your cap in ~11 months instead of ~18 months</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="cyber-glass border-2 border-neon-green rounded-3xl p-8 md:p-12">
              <div className="flex items-center gap-4 mb-8">
                <DollarSign className="text-neon-green" size={48} />
                <h2 className="text-4xl font-bold text-neon-green">Income Stream 3: Direct Income</h2>
              </div>

              <p className="text-lg text-cyan-300/90 mb-6 leading-relaxed">
                Instant commission on every direct referral activation. Paid immediately in RAMA to your Safe Wallet.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <h3 className="text-2xl font-bold text-cyan-300 mb-4">How It Works</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-neon-green rounded-full flex items-center justify-center flex-shrink-0 text-dark-950 font-bold">
                        1
                      </div>
                      <div>
                        <p className="text-cyan-300 font-semibold mb-1">Share Your Link</p>
                        <p className="text-cyan-300/80 text-sm">Give your referral link to friends and family</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-neon-green rounded-full flex items-center justify-center flex-shrink-0 text-dark-950 font-bold">
                        2
                      </div>
                      <div>
                        <p className="text-cyan-300 font-semibold mb-1">They Stake</p>
                        <p className="text-cyan-300/80 text-sm">When they activate with a stake (minimum $50)</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-neon-green rounded-full flex items-center justify-center flex-shrink-0 text-dark-950 font-bold">
                        3
                      </div>
                      <div>
                        <p className="text-cyan-300 font-semibold mb-1">Instant 5% Commission</p>
                        <p className="text-cyan-300/80 text-sm">You receive 5% of their stake amount immediately</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="cyber-glass border border-neon-green/30 rounded-xl p-6">
                  <h3 className="text-2xl font-bold text-neon-green mb-4">Earnings Examples</h3>
                  <div className="space-y-3">
                    <div className="cyber-glass border border-cyan-500/30 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-cyan-300">Direct stakes $100</span>
                        <span className="text-neon-green font-bold">→ $5</span>
                      </div>
                      <p className="text-xs text-cyan-300/70">Instant commission in RAMA</p>
                    </div>
                    <div className="cyber-glass border border-cyan-500/30 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-cyan-300">Direct stakes $500</span>
                        <span className="text-neon-green font-bold">→ $25</span>
                      </div>
                      <p className="text-xs text-cyan-300/70">Instant commission in RAMA</p>
                    </div>
                    <div className="cyber-glass border border-cyan-500/30 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-cyan-300">Direct stakes $1,000</span>
                        <span className="text-neon-green font-bold">→ $50</span>
                      </div>
                      <p className="text-xs text-cyan-300/70">Instant commission in RAMA</p>
                    </div>
                    <div className="cyber-glass border border-neon-green/30 rounded-lg p-3 bg-gradient-to-br from-neon-green/5 to-cyan-500/5">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-cyan-300 font-semibold">10 directs @ $500 each</span>
                        <span className="text-neon-green font-bold text-lg">→ $250</span>
                      </div>
                      <p className="text-xs text-neon-green">Total direct income potential!</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="cyber-glass border-2 border-cyan-500 rounded-xl p-6 mt-6">
                <div className="flex items-start gap-3">
                  <Target className="text-cyan-400 flex-shrink-0 mt-1" size={24} />
                  <div>
                    <h4 className="text-lg font-bold text-cyan-300 mb-2">Pro Tip: Build Your Foundation</h4>
                    <p className="text-sm text-cyan-300/90">Direct income is your fastest path to initial earnings. Focus on helping 5-10 people get started to create immediate cash flow while building your team network for passive slab income.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="cyber-glass border-2 border-neon-purple rounded-3xl p-8 md:p-12">
              <div className="flex items-center gap-4 mb-8">
                <Award className="text-neon-purple" size={48} />
                <h2 className="text-4xl font-bold text-neon-purple">Income Stream 4: Slab Income</h2>
              </div>

              <p className="text-lg text-cyan-300/90 mb-6 leading-relaxed">
                Your most powerful passive income stream. Earn from your team's growth across 11 ocean-themed slab levels (Coral Reef to Ocean Sovereign) with up to 60% distribution from the daily growth pool.
              </p>

              <div className="cyber-glass border border-neon-purple/50 rounded-xl p-6 mb-6">
                <h3 className="text-2xl font-bold text-neon-purple mb-4">How Slab Income Works</h3>
                <p className="text-cyan-300/90 mb-4">
                  60% of all daily growth from your team is distributed to upline leaders based on their slab level. The higher your qualified team volume, the higher your slab level and share percentage.
                </p>
                <div className="cyber-glass border border-cyan-500/30 rounded-lg p-4">
                  <p className="text-sm text-cyan-300/90 mb-2"><strong className="text-cyan-300">Qualified Volume Calculation:</strong></p>
                  <ul className="text-xs text-cyan-300/80 space-y-1">
                    <li>• <strong>3 legs:</strong> 40% + 30% + 30% of top three legs</li>
                    <li>• <strong>4+ legs:</strong> 100% of all team volume counts</li>
                  </ul>
                </div>
              </div>

              <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6 mb-6">
                <h3 className="text-2xl font-bold text-cyan-300 mb-4">11 Slab Levels & Distribution</h3>
                <div className="space-y-2">
                  {[
                    { level: 1, name: 'Coral Reef', volume: '$500', share: '5%' },
                    { level: 2, name: 'Shallow Waters', volume: '$2.5K', share: '10%' },
                    { level: 3, name: 'Tide Pool', volume: '$10K', share: '15%' },
                    { level: 4, name: 'Wave Crest', volume: '$25K', share: '20%' },
                    { level: 5, name: 'Open Sea', volume: '$50K', share: '25%' },
                    { level: 6, name: 'Deep Current', volume: '$100K', share: '30%' },
                    { level: 7, name: 'Ocean Floor', volume: '$500K', share: '35%' },
                    { level: 8, name: 'Abyssal Zone', volume: '$1M', share: '45%' },
                    { level: 9, name: 'Mariana Trench', volume: '$2.5M', share: '50%' },
                    { level: 10, name: 'Pacific Master', volume: '$5M', share: '55%' },
                    { level: 11, name: 'Ocean Sovereign', volume: '$20M', share: '60%' }
                  ].map((slab) => (
                    <div key={slab.level} className={`cyber-glass border rounded-lg p-3 flex items-center justify-between ${slab.level >= 9 ? 'border-neon-green/50 bg-neon-green/5' : 'border-cyan-500/30'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-neon-green text-dark-950 flex items-center justify-center font-bold text-sm">{slab.level}</div>
                        <div>
                          <p className={`font-bold text-sm ${slab.level >= 9 ? 'text-neon-green' : 'text-cyan-300'}`}>{slab.name}</p>
                          <p className="text-xs text-cyan-300/70">{slab.volume} volume</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-lg ${slab.level >= 9 ? 'text-neon-green' : 'text-cyan-300'}`}>{slab.share}</p>
                        <p className="text-xs text-cyan-300/70">Share</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="cyber-glass border-2 border-neon-green rounded-xl p-6 mb-6">
                <h3 className="text-xl font-bold text-neon-green mb-4">Earnings Example: Slab 7 Leader</h3>
                <div className="space-y-3 text-sm text-cyan-300/90">
                  <div className="flex justify-between items-center py-2 border-b border-cyan-500/30">
                    <span>Qualified Team Volume:</span>
                    <span className="text-cyan-300 font-bold">$100,000</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-cyan-500/30">
                    <span>Average Daily Growth (0.5%):</span>
                    <span className="text-cyan-300 font-bold">$500/day</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-cyan-500/30">
                    <span>60% Goes to Slab Distribution:</span>
                    <span className="text-cyan-300 font-bold">$300/day</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-cyan-500/30">
                    <span>Your Slab 7 Share (15%):</span>
                    <span className="text-neon-green font-bold text-lg">$45/day</span>
                  </div>
                  <div className="flex justify-between items-center py-2 bg-gradient-to-r from-neon-green/10 to-cyan-500/10 rounded-lg px-3">
                    <span className="font-semibold">Monthly Slab Income:</span>
                    <span className="text-neon-green font-bold text-xl">$1,350</span>
                  </div>
                </div>
              </div>

              <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                <h3 className="text-xl font-bold text-cyan-300 mb-3">Important Slab Rules</h3>
                <div className="space-y-2 text-sm text-cyan-300/90">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                    <span><strong>Claim Requirement:</strong> Need 1 new $50 direct member before claiming slab income</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                    <span><strong>Difference Model:</strong> You earn the difference between your slab % and the next lower slab upline</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                    <span><strong>Volume Updates Daily:</strong> Your slab level adjusts automatically as team grows</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                    <span><strong>No Cap on Slab:</strong> Slab income continues even after you hit 4x personal cap</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="cyber-glass border-2 border-cyan-500 rounded-3xl p-8 md:p-12">
              <div className="flex items-center gap-4 mb-8">
                <Users className="text-cyan-400" size={48} />
                <h2 className="text-4xl font-bold text-cyan-400">Income Stream 5: Same-Slab Override</h2>
              </div>

              <p className="text-lg text-cyan-300/90 mb-6 leading-relaxed">
                Collaborative income that rewards you when your team members reach the same slab level as you. Encourages mentorship and team development.
              </p>

              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div className="cyber-glass border border-neon-green/30 rounded-xl p-6 text-center">
                  <div className="text-4xl font-bold text-neon-green mb-3">10%</div>
                  <p className="text-cyan-300 font-semibold mb-2">First Same-Slab</p>
                  <p className="text-xs text-cyan-300/80">First upline at your slab level</p>
                </div>
                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6 text-center">
                  <div className="text-4xl font-bold text-cyan-400 mb-3">5%</div>
                  <p className="text-cyan-300 font-semibold mb-2">Second Same-Slab</p>
                  <p className="text-xs text-cyan-300/80">Second upline at your slab level</p>
                </div>
                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6 text-center">
                  <div className="text-4xl font-bold text-cyan-400 mb-3">5%</div>
                  <p className="text-cyan-300 font-semibold mb-2">Third Same-Slab</p>
                  <p className="text-xs text-cyan-300/80">Third upline at your slab level</p>
                </div>
              </div>

              <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6 mb-6">
                <h3 className="text-xl font-bold text-cyan-300 mb-4">How Override Works</h3>
                <p className="text-sm text-cyan-300/90 mb-4">
                  When you reach a slab level, the system looks upward in your genealogy to find the first 3 people who are at the SAME slab level as you. They each receive an override bonus on your slab earnings.
                </p>
                <div className="cyber-glass border border-neon-purple/30 rounded-lg p-4">
                  <p className="text-xs text-cyan-300/90 mb-2"><strong className="text-neon-purple">Example Scenario:</strong></p>
                  <p className="text-xs text-cyan-300/80 leading-relaxed">
                    You reach Slab 5 with $100/day slab income. Your first upline at Slab 5 gets $10/day (10%), second gets $5/day (5%), and third gets $5/day (5%). This is IN ADDITION to their own slab earnings!
                  </p>
                </div>
              </div>

              <div className="cyber-glass border-2 border-neon-green rounded-xl p-6">
                <h3 className="text-xl font-bold text-neon-green mb-3">Why Override Matters</h3>
                <div className="space-y-2 text-sm text-cyan-300/90">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                    <span><strong className="text-cyan-300">Rewards Leadership:</strong> Top earners benefit when they help others reach their level</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                    <span><strong className="text-cyan-300">Team Motivation:</strong> Creates incentive for uplines to mentor and support downlines</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                    <span><strong className="text-cyan-300">Passive Scaling:</strong> As your team grows and advances, your override income compounds</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                    <span><strong className="text-cyan-300">No Extra Effort:</strong> Automatic bonus on top of your regular slab earnings</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="cyber-glass border-2 border-neon-purple rounded-3xl p-8 md:p-12">
              <div className="flex items-center gap-4 mb-8">
                <Gift className="text-neon-purple" size={48} />
                <h2 className="text-4xl font-bold text-neon-purple">Bonus: One-Time Achievement Rewards</h2>
              </div>

              <p className="text-lg text-cyan-300/90 mb-6 leading-relaxed">
                Celebrate your milestones with one-time bonus rewards. 14 ocean-themed achievement rewards (Coral Spark to Ocean Infinity) paid directly to your Safe Wallet when you reach team volume milestones.
              </p>

              <div className="cyber-glass border border-neon-purple/50 rounded-xl p-6 mb-6">
                <h3 className="text-2xl font-bold text-neon-purple mb-4">14 Achievement Milestones</h3>
                <div className="space-y-2">
                  {[
                    { name: 'Coral Spark', amount: '$100', volume: '$6K' },
                    { name: 'Pearl Bloom', amount: '$250', volume: '$15K' },
                    { name: 'Shell Harvest', amount: '$500', volume: '$40K' },
                    { name: 'Wave Bounty', amount: '$1,000', volume: '$120K' },
                    { name: 'Tide Treasure', amount: '$2,500', volume: '$300K' },
                    { name: 'Blue Depth Bonus', amount: '$5,000', volume: '$600K' },
                    { name: 'Guardian\'s Gift', amount: '$8,000', volume: '$1.5M' },
                    { name: 'Captain\'s Chest', amount: '$12,000', volume: '$3M' },
                    { name: 'Trident Gem', amount: '$30,000', volume: '$6M' },
                    { name: 'Sea Legend Award', amount: '$50,000', volume: '$15M' },
                    { name: 'Abyss Crown', amount: '$85,000', volume: '$30M' },
                    { name: 'Poseidon\'s Favor', amount: '$150,000', volume: '$60M' },
                    { name: 'Neptune Scepter', amount: '$500,000', volume: '$200M' },
                    { name: 'Ocean Infinity', amount: '$1,500,000', volume: '$500M' }
                  ].map((reward, index) => (
                    <div key={index} className={`cyber-glass border rounded-lg p-3 flex items-center justify-between ${index >= 10 ? 'border-neon-purple/50 bg-neon-purple/5' : 'border-cyan-500/30'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${index >= 10 ? 'bg-gradient-to-br from-neon-purple to-pink-500 text-dark-950' : 'bg-gradient-to-br from-cyan-500 to-neon-green text-dark-950'}`}>{index + 1}</div>
                        <div>
                          <p className={`font-bold text-sm ${index >= 10 ? 'text-neon-purple' : 'text-cyan-300'}`}>{reward.name}</p>
                          <p className="text-xs text-cyan-300/70">{reward.volume} volume</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-base ${index >= 10 ? 'text-neon-purple' : 'text-neon-green'}`}>{reward.amount}</p>
                        <p className="text-xs text-cyan-300/70">one-time</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-cyan-300 mb-4">How Rewards Work</h3>
                  <div className="space-y-2 text-sm text-cyan-300/90">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                      <span>Build qualified team volume using 40:30:30 calculation</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                      <span>Reach volume milestones starting from $6,000</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                      <span>Claim reward when milestone is achieved</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                      <span>Rewards paid directly to Safe Wallet (0% fee)</span>
                    </div>
                  </div>
                </div>

                <div className="cyber-glass border border-neon-green/30 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-neon-green mb-4">Total Potential</h3>
                  <div className="space-y-3">
                    <div className="cyber-glass border border-cyan-500/30 rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-cyan-300">Rewards 1-3 ($100 each)</span>
                        <span className="text-neon-green font-bold">$300</span>
                      </div>
                    </div>
                    <div className="cyber-glass border border-cyan-500/30 rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-cyan-300">Rewards 4-6 ($250 each)</span>
                        <span className="text-neon-green font-bold">$750</span>
                      </div>
                    </div>
                    <div className="cyber-glass border border-cyan-500/30 rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-cyan-300">Rewards 7-9 ($500 each)</span>
                        <span className="text-neon-green font-bold">$1,500</span>
                      </div>
                    </div>
                    <div className="cyber-glass border border-neon-purple/30 rounded-lg p-3 bg-gradient-to-br from-neon-purple/5 to-pink-500/5">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-cyan-300 font-semibold">All 14 Rewards</span>
                        <span className="text-neon-purple font-bold text-lg">$8,550</span>
                      </div>
                      <p className="text-xs text-neon-purple mt-1">Total lifetime bonus potential!</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="cyber-glass border-2 border-neon-green rounded-xl p-6 mt-6">
                <div className="flex items-start gap-3">
                  <Gift className="text-neon-green flex-shrink-0 mt-1" size={24} />
                  <div>
                    <h4 className="text-lg font-bold text-neon-green mb-2">Achievement Bonuses</h4>
                    <p className="text-sm text-cyan-300/90">
                      One-time rewards complement your recurring income streams. They're designed to celebrate your growth milestones and provide additional capital for reinvestment or withdrawal. All rewards are paid to your Safe Wallet with zero fees, making them perfect for compounding your earnings.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="cyber-glass border-2 border-neon-orange rounded-3xl p-8 md:p-12">
              <div className="flex items-center gap-4 mb-8">
                <Trophy className="text-neon-orange" size={48} />
                <h2 className="text-4xl font-bold text-neon-orange">Income Stream 6: Royalty Program</h2>
              </div>

              <p className="text-lg text-cyan-300/90 mb-6 leading-relaxed">
                Elite monthly payouts for top performers. 14 ocean-themed royalty tiers (Coral Starter to Ocean Supreme) ranging from $30 to $100,000 per month, paid MONTHLY FOR LIFETIME. No time limit or cap - earn royalties forever as long as you maintain 10% growth every 2 months!
              </p>

              <div className="cyber-glass border border-neon-orange/50 rounded-xl p-6 mb-6">
                <h3 className="text-2xl font-bold text-neon-orange mb-4">14 Royalty Tiers</h3>
                <div className="space-y-2">
                  {[
                    { tier: 'Coral Starter', amount: '$30', volume: '$5K' },
                    { tier: 'Pearl Diver', amount: '$100', volume: '$25K' },
                    { tier: 'Sea Explorer', amount: '$250', volume: '$50K' },
                    { tier: 'Wave Rider', amount: '$500', volume: '$100K' },
                    { tier: 'Tide Surge', amount: '$1,000', volume: '$250K' },
                    { tier: 'Deep Blue', amount: '$2,000', volume: '$500K' },
                    { tier: 'Ocean Guardian', amount: '$3,000', volume: '$750K' },
                    { tier: 'Marine Commander', amount: '$5,000', volume: '$1M' },
                    { tier: 'Aqua Captain', amount: '$7,500', volume: '$2M' },
                    { tier: 'Current Master', amount: '$10,000', volume: '$3.5M' },
                    { tier: 'Sea Legend', amount: '$15,000', volume: '$5M' },
                    { tier: 'Trident Icon', amount: '$25,000', volume: '$10M' },
                    { tier: 'Poseidon Crown', amount: '$50,000', volume: '$20M' },
                    { tier: 'Ocean Supreme', amount: '$100,000', volume: '$50M' }
                  ].map((tier, index) => (
                    <div key={index} className={`cyber-glass border rounded-lg p-3 flex items-center justify-between ${index >= 10 ? 'border-neon-orange/50 bg-neon-orange/5' : 'border-cyan-500/30'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${index >= 10 ? 'bg-gradient-to-br from-neon-orange to-red-500 text-dark-950' : 'bg-gradient-to-br from-cyan-500 to-neon-green text-dark-950'}`}>{index + 1}</div>
                        <div>
                          <p className={`font-bold text-sm ${index >= 10 ? 'text-neon-orange' : 'text-neon-green'}`}>{tier.tier}</p>
                          <p className="text-xs text-cyan-300/70">{tier.volume} volume</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-base ${index >= 10 ? 'text-neon-orange' : 'text-neon-green'}`}>{tier.amount}</p>
                        <p className="text-xs text-cyan-300/70">/month</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-cyan-300 mb-4">Qualification Rules</h3>
                  <div className="space-y-2 text-sm text-cyan-300/90">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                      <span>Achieve required team volume in qualified legs</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                      <span>Maintain minimum 10% growth every 2 months</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                      <span>First payout in month of qualification</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                      <span>Maximum LifeTime</span>
                    </div>
                  </div>
                </div>

                <div className="cyber-glass border border-neon-green/30 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-neon-green mb-4">Potential Earnings</h3>
                  <div className="space-y-3">
                    <div className="cyber-glass border border-cyan-500/30 rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-cyan-300">Sea Explorer ($250/mo)</span>
                        <span className="text-neon-green font-bold">$6,000</span>
                      </div>
                      <p className="text-xs text-cyan-300/70">Over LifeTime</p>
                    </div>
                    <div className="cyber-glass border border-cyan-500/30 rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-cyan-300">Marine Commander ($5,000/mo)</span>
                        <span className="text-neon-green font-bold">$120,000</span>
                      </div>
                      <p className="text-xs text-cyan-300/70">Over LifeTime</p>
                    </div>
                    <div className="cyber-glass border border-neon-orange/30 rounded-lg p-3 bg-gradient-to-br from-neon-orange/5 to-red-500/5">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-cyan-300 font-semibold">Ocean Supreme ($100K/mo)</span>
                        <span className="text-neon-orange font-bold text-lg">UNLIMITED ∞</span>
                      </div>
                      <p className="text-xs text-neon-orange">Lifetime Earnings - No Cap!</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="cyber-glass border-2 border-neon-purple rounded-xl p-6">
                <h3 className="text-xl font-bold text-neon-purple mb-3">Renewal Requirements</h3>
                <p className="text-sm text-cyan-300/90 mb-3">
                  To continue receiving royalty payouts, you must maintain at least 10% qualified team volume growth every 2 months. This ensures active leadership and sustainable team building.
                </p>
                <div className="cyber-glass border border-cyan-500/30 rounded-lg p-3">
                  <p className="text-xs text-neon-green italic">
                    Pro Tip: Focus on helping your team succeed. When they grow, your volume grows automatically, securing your royalty status!
                  </p>
                </div>
              </div>
            </div>

            <div className="cyber-glass border-2 border-cyan-500 rounded-3xl p-8 md:p-12">
              <div className="flex items-center gap-4 mb-8">
                <Shield className="text-cyan-400" size={48} />
                <h2 className="text-4xl font-bold text-cyan-400">Platform Rules & Policies</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="cyber-glass border border-cyan-500/30 rounded-xl p-4">
                    <h4 className="text-lg font-bold text-cyan-300 mb-2">0% Trust Policy</h4>
                    <p className="text-sm text-cyan-300/90 mb-2">Withdraw your principal anytime with complete freedom:</p>
                    <ul className="text-xs text-cyan-300/80 space-y-1">
                      <li>• Request withdrawal anytime (no restrictions)</li>
                      <li>• 72-hour freeze period (no income during freeze)</li>
                      <li>• Cancel within 72h to resume earning</li>
                      <li>• After 72h: 80% refund (20% exit fee)</li>
                    </ul>
                  </div>

                  <div className="cyber-glass border border-cyan-500/30 rounded-xl p-4">
                    <h4 className="text-lg font-bold text-neon-green mb-2">Safe Wallet Benefits</h4>
                    <p className="text-sm text-cyan-300/90 mb-2">Internal wallet with zero fees:</p>
                    <ul className="text-xs text-cyan-300/80 space-y-1">
                      <li>• 0% fee for Safe Wallet transfers</li>
                      <li>• 5% fee only on external wallet withdrawals</li>
                      <li>• Perfect for compounding growth</li>
                      <li>• Instant internal transactions</li>
                    </ul>
                  </div>

                  <div className="cyber-glass border border-cyan-500/30 rounded-xl p-4">
                    <h4 className="text-lg font-bold text-neon-purple mb-2">Earning Caps</h4>
                    <p className="text-sm text-cyan-300/90 mb-2">Fair distribution limits:</p>
                    <ul className="text-xs text-cyan-300/80 space-y-1">
                      <li>• Self Income: 200% (Tier 1) or 250% (Tier 2)</li>
                      <li>• Global Cap: 4x total stakes across all incomes</li>
                      <li>• Slab income continues after personal cap</li>
                      <li>• Royalty runs Life Time per tier</li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="cyber-glass border border-cyan-500/30 rounded-xl p-4">
                    <h4 className="text-lg font-bold text-cyan-300 mb-2">Minimum Requirements</h4>
                    <p className="text-sm text-cyan-300/90 mb-2">Getting started:</p>
                    <ul className="text-xs text-cyan-300/80 space-y-1">
                      <li>• Minimum stake: $50 USD in RAMA</li>
                      <li>• Slab claim needs 1 new $50 direct</li>
                      <li>• Booster needs 5 directs in 10 days</li>
                      <li>• Total team ≥ personal stake for booster</li>
                    </ul>
                  </div>

                  <div className="cyber-glass border border-cyan-500/30 rounded-xl p-4">
                    <h4 className="text-lg font-bold text-neon-green mb-2">Qualified Volume</h4>
                    <p className="text-sm text-cyan-300/90 mb-2">How team volume is calculated:</p>
                    <ul className="text-xs text-cyan-300/80 space-y-1">
                      <li>• 3 legs: 40% + 30% + 30% of top three</li>
                      <li>• 4+ legs: 100% of all team volume</li>
                      <li>• Encourages balanced team building</li>
                      <li>• Updates daily automatically</li>
                    </ul>
                  </div>

                  <div className="cyber-glass border border-cyan-500/30 rounded-xl p-4">
                    <h4 className="text-lg font-bold text-neon-purple mb-2">Fee Structure</h4>
                    <p className="text-sm text-cyan-300/90 mb-2">Transparent and fair:</p>
                    <ul className="text-xs text-cyan-300/80 space-y-1">
                      <li>• 0% fee: Safe Wallet transfers</li>
                      <li>• 5% fee: External wallet claims</li>
                      <li>• 20% fee: Principal withdrawal (after 72h)</li>
                      <li>• Fees recirculate to sustain ecosystem</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="cyber-glass border-2 border-neon-green rounded-3xl p-8 md:p-12">
              <div className="flex items-center gap-4 mb-8">
                <BarChart3 className="text-neon-green" size={48} />
                <h2 className="text-4xl font-bold text-neon-green">Total Earning Potential</h2>
              </div>

              <p className="text-lg text-cyan-300/90 mb-6 leading-relaxed">
                By combining all 6 income streams, OCEAN DeFi offers unprecedented earning potential:
              </p>

              <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6 mb-6">
                <h3 className="text-xl font-bold text-cyan-300 mb-4">Example: $1,000 Stake with Booster & Active Team</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-cyan-500/30">
                    <span className="text-cyan-300/90">Self Income (250% cap):</span>
                    <span className="text-cyan-300 font-bold">$2,500</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-cyan-500/30">
                    <span className="text-cyan-300/90">Direct Income (10 x $500):</span>
                    <span className="text-cyan-300 font-bold">$250</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-cyan-500/30">
                    <span className="text-cyan-300/90">Slab Income (Open Sea, 12 months):</span>
                    <span className="text-cyan-300 font-bold">$3,600</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-cyan-500/30">
                    <span className="text-cyan-300/90">Same-Slab Override:</span>
                    <span className="text-cyan-300 font-bold">$1,200</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-cyan-500/30">
                    <span className="text-cyan-300/90">One-Time Rewards (first 6):</span>
                    <span className="text-cyan-300 font-bold">$1,050</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-cyan-500/30">
                    <span className="text-cyan-300/90">Royalty (Sea Explorer, LifeTime):</span>
                    <span className="text-cyan-300 font-bold">$6,000</span>
                  </div>
                  <div className="flex justify-between items-center py-3 bg-gradient-to-r from-neon-green/20 to-cyan-500/20 rounded-lg px-3 mt-3">
                    <span className="text-cyan-300 font-bold text-lg">Total Potential Earnings:</span>
                    <span className="text-neon-green font-bold text-2xl">$14,600</span>
                  </div>
                  <p className="text-center text-neon-green font-bold text-xl mt-2">14.6x Return on $1,000 Stake!</p>
                </div>
              </div>

              <div className="cyber-glass border-2 border-neon-purple rounded-xl p-6">
                <h3 className="text-xl font-bold text-neon-purple mb-3">Key Success Factors</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                      <span className="text-sm text-cyan-300/90">Qualify for booster early (5 directs in 10 days)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                      <span className="text-sm text-cyan-300/90">Build balanced team across multiple legs</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                      <span className="text-sm text-cyan-300/90">Use Safe Wallet to avoid 5% withdrawal fees</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                      <span className="text-sm text-cyan-300/90">Focus on team growth for slab advancement</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                      <span className="text-sm text-cyan-300/90">Maintain 10% growth for royalty renewals</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                      <span className="text-sm text-cyan-300/90">Mentor team members to same slab for overrides</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
