import { Link } from 'react-router-dom';
import { Shield, Lock, TrendingUp, RefreshCw, DollarSign, ArrowRight, CheckCircle, AlertTriangle, Zap } from 'lucide-react';
import PublicNav from '../components/PublicNav';

export default function ValidatorSecurity() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-dark-950 via-dark-900 to-dark-950">
      <PublicNav />

      <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green mb-6">
              Validator-Backed Security
            </h1>
            <p className="text-xl text-cyan-300/90 max-w-3xl mx-auto">
              How OCEAN DeFi ensures long-term sustainability through professional validator staking
            </p>
          </div>

          <div className="cyber-glass border-2 border-neon-purple rounded-3xl p-8 md:p-12 mb-12 hover-glow-purple">
            <h2 className="text-4xl font-bold text-neon-purple mb-8 text-center">Network Performance</h2>
            <div className="grid md:grid-cols-4 gap-6 mb-8">
              <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6 text-center">
                <div className="text-4xl font-bold text-neon-green mb-2">70,000+</div>
                <div className="text-cyan-300/70 text-sm uppercase tracking-wide">TPS Capacity</div>
              </div>
              <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6 text-center">
                <div className="text-4xl font-bold text-neon-green mb-2">99.9%</div>
                <div className="text-cyan-300/70 text-sm uppercase tracking-wide">Uptime</div>
              </div>
              <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6 text-center">
                <div className="text-4xl font-bold text-neon-green mb-2">100+</div>
                <div className="text-cyan-300/70 text-sm uppercase tracking-wide">Active Validators</div>
              </div>
              <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6 text-center">
                <div className="text-4xl font-bold text-neon-green mb-2">$50M+</div>
                <div className="text-cyan-300/70 text-sm uppercase tracking-wide">Total Value Locked</div>
              </div>
            </div>

            <div className="cyber-glass border border-cyan-500/30 rounded-2xl p-6">
              <h3 className="text-2xl font-bold text-cyan-300 mb-6 text-center">Network Stats</h3>
              <p className="text-cyan-300/70 text-sm text-center mb-6">Live network information and endpoints</p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-dark-950/50 rounded-lg p-4">
                  <div className="text-cyan-300/70 text-xs uppercase tracking-wide mb-1">Parameter</div>
                  <div className="text-cyan-300 font-semibold">Chain ID</div>
                </div>
                <div className="bg-dark-950/50 rounded-lg p-4">
                  <div className="text-cyan-300/70 text-xs uppercase tracking-wide mb-1">Value</div>
                  <div className="text-neon-green font-bold">1370</div>
                </div>

                <div className="bg-dark-950/50 rounded-lg p-4">
                  <div className="text-cyan-300/70 text-xs uppercase tracking-wide mb-1">Parameter</div>
                  <div className="text-cyan-300 font-semibold">RPC Endpoint</div>
                </div>
                <div className="bg-dark-950/50 rounded-lg p-4">
                  <div className="text-cyan-300/70 text-xs uppercase tracking-wide mb-1">Value</div>
                  <a href="https://blockchain.ramestta.com" target="_blank" rel="noopener noreferrer" className="text-neon-green font-mono text-sm hover:text-cyan-400 transition-colors">blockchain.ramestta.com</a>
                </div>

                <div className="bg-dark-950/50 rounded-lg p-4">
                  <div className="text-cyan-300/70 text-xs uppercase tracking-wide mb-1">Parameter</div>
                  <div className="text-cyan-300 font-semibold">RPC Endpoint</div>
                </div>
                <div className="bg-dark-950/50 rounded-lg p-4">
                  <div className="text-cyan-300/70 text-xs uppercase tracking-wide mb-1">Value</div>
                  <a href="https://blockchain2.ramestta.com" target="_blank" rel="noopener noreferrer" className="text-neon-green font-mono text-sm hover:text-cyan-400 transition-colors">blockchain2.ramestta.com</a>
                </div>

                <div className="bg-dark-950/50 rounded-lg p-4">
                  <div className="text-cyan-300/70 text-xs uppercase tracking-wide mb-1">Parameter</div>
                  <div className="text-cyan-300 font-semibold">Explorer</div>
                </div>
                <div className="bg-dark-950/50 rounded-lg p-4">
                  <div className="text-cyan-300/70 text-xs uppercase tracking-wide mb-1">Value</div>
                  <a href="https://ramascan.com" target="_blank" rel="noopener noreferrer" className="text-neon-green font-mono text-sm hover:text-cyan-400 transition-colors">ramascan.com</a>
                </div>

                <div className="bg-dark-950/50 rounded-lg p-4">
                  <div className="text-cyan-300/70 text-xs uppercase tracking-wide mb-1">Parameter</div>
                  <div className="text-cyan-300 font-semibold">Bridge</div>
                </div>
                <div className="bg-dark-950/50 rounded-lg p-4">
                  <div className="text-cyan-300/70 text-xs uppercase tracking-wide mb-1">Value</div>
                  <a href="https://ramabridge.com" target="_blank" rel="noopener noreferrer" className="text-neon-green font-mono text-sm hover:text-cyan-400 transition-colors">ramabridge.com</a>
                </div>

                <div className="bg-dark-950/50 rounded-lg p-4">
                  <div className="text-cyan-300/70 text-xs uppercase tracking-wide mb-1">Parameter</div>
                  <div className="text-cyan-300 font-semibold">Swap DApp</div>
                </div>
                <div className="bg-dark-950/50 rounded-lg p-4">
                  <div className="text-cyan-300/70 text-xs uppercase tracking-wide mb-1">Value</div>
                  <a href="https://ramaswap.com" target="_blank" rel="noopener noreferrer" className="text-neon-green font-mono text-sm hover:text-cyan-400 transition-colors">ramaswap.com</a>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-12">
            <div className="cyber-glass border-2 border-cyan-500 rounded-3xl p-8 md:p-12 hover-glow-cyan">
              <div className="flex items-center gap-4 mb-8">
                <Shield className="text-cyan-400" size={48} />
                <h2 className="text-4xl font-bold text-cyan-300">The Validator Model</h2>
              </div>

              <p className="text-lg text-cyan-300/90 mb-8 leading-relaxed">
                Unlike traditional DeFi platforms that rely solely on new user deposits to pay existing users (a ponzi model), <strong className="text-neon-green">OCEAN DeFi generates real income through blockchain validation</strong>. When you stake RAMA in OCEAN, your coins are deployed to professional validator nodes that secure the Ramestta network.
              </p>

              <div className="cyber-glass border-2 border-neon-purple rounded-xl p-6 mb-8">
                <h3 className="text-2xl font-bold text-neon-purple mb-6 text-center">How Your Stake Works</h3>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-neon-green rounded-full flex items-center justify-center mx-auto mb-3 text-dark-950 font-bold text-xl">
                      1
                    </div>
                    <p className="text-cyan-300 font-semibold mb-2">You Stake RAMA</p>
                    <p className="text-cyan-300/70 text-sm">Deposit your RAMA coins into OCEAN DeFi smart contract</p>
                  </div>

                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-neon-green rounded-full flex items-center justify-center mx-auto mb-3 text-dark-950 font-bold text-xl">
                      2
                    </div>
                    <p className="text-cyan-300 font-semibold mb-2">Validators Stake</p>
                    <p className="text-cyan-300/70 text-sm">Your RAMA is delegated to professional validator nodes</p>
                  </div>

                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-neon-green rounded-full flex items-center justify-center mx-auto mb-3 text-dark-950 font-bold text-xl">
                      3
                    </div>
                    <p className="text-cyan-300 font-semibold mb-2">Earn Rewards</p>
                    <p className="text-cyan-300/70 text-sm">Validators earn 8.4% monthly for securing the network</p>
                  </div>

                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-neon-green rounded-full flex items-center justify-center mx-auto mb-3 text-dark-950 font-bold text-xl">
                      4
                    </div>
                    <p className="text-cyan-300 font-semibold mb-2">You Get Paid</p>
                    <p className="text-cyan-300/70 text-sm">Validator income funds your growth rewards and team bonuses</p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <Lock className="text-neon-green mb-4" size={32} />
                  <h3 className="text-xl font-bold text-cyan-300 mb-3">Secure Validators</h3>
                  <p className="text-cyan-300/80 text-sm">
                    Professional validator nodes with 99.9% uptime, slashing protection, and institutional-grade security infrastructure.
                  </p>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <RefreshCw className="text-neon-green mb-4" size={32} />
                  <h3 className="text-xl font-bold text-cyan-300 mb-3">Active Compounding Strategy</h3>
                  <p className="text-cyan-300/80 text-sm">
                    Validators who withdraw rewards daily or weekly and reinvest them can achieve 5-10x annual returns through exponential compounding of the 8.4% monthly base rate.
                  </p>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <TrendingUp className="text-neon-green mb-4" size={32} />
                  <h3 className="text-xl font-bold text-cyan-300 mb-3">Sustainable Income</h3>
                  <p className="text-cyan-300/80 text-sm">
                    Real validator earnings provide the economic foundation for all OCEAN income streams, creating long-term viability.
                  </p>
                </div>
              </div>
            </div>

            <div className="cyber-glass border-2 border-neon-green rounded-3xl p-8 md:p-12 hover-glow-green">
              <h2 className="text-4xl font-bold text-neon-green mb-8">The Sustainability Model</h2>

              <p className="text-lg text-cyan-300/90 mb-8 leading-relaxed">
                OCEAN DeFi's sustainability comes from a simple principle: <strong className="text-neon-green">validator income exceeds user payouts</strong>. With validators earning 8.4% monthly and actively compounding through daily/weekly reinvestment, the total annual income can reach 500-1000%+ (5-10x returns). Here's how the economics work:
              </p>

              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div className="cyber-glass border-2 border-cyan-500 rounded-xl p-6">
                  <h3 className="text-2xl font-bold text-cyan-300 mb-6">Validator Income (Input)</h3>
                  <div className="space-y-4">
                    <div className="bg-dark-950/50 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-cyan-300">Base Monthly Return</span>
                        <span className="text-neon-green font-bold">8.4%</span>
                      </div>
                      <p className="text-cyan-300/70 text-xs">Earned by validators for network security</p>
                    </div>

                    <div className="bg-dark-950/50 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-cyan-300">Daily/Weekly Compounding</span>
                        <span className="text-neon-green font-bold">Exponential</span>
                      </div>
                      <p className="text-cyan-300/70 text-xs">Withdrawing & reinvesting rewards compounds returns dramatically</p>
                    </div>

                    <div className="bg-dark-950/50 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-cyan-300">Network Growth</span>
                        <span className="text-neon-green font-bold">Variable</span>
                      </div>
                      <p className="text-cyan-300/70 text-xs">More validators = higher overall rewards</p>
                    </div>

                    <div className="bg-gradient-to-r from-neon-green/20 to-cyan-500/20 border border-neon-green rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-neon-green font-bold">Total Annual Income</span>
                        <span className="text-neon-green font-bold text-xl">500-1000%+</span>
                      </div>
                      <p className="text-cyan-300/70 text-xs mt-1">With active daily/weekly reward compounding (5-10x returns)</p>
                    </div>
                  </div>
                </div>

                <div className="cyber-glass border-2 border-neon-purple rounded-xl p-6">
                  <h3 className="text-2xl font-bold text-neon-purple mb-6">User Payouts (Output)</h3>
                  <div className="space-y-4">
                    <div className="bg-dark-950/50 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-cyan-300">Growth Rewards</span>
                        <span className="text-cyan-400 font-bold">0.33-0.80%/day</span>
                      </div>
                      <p className="text-cyan-300/70 text-xs">Capped at 200-250% per portfolio</p>
                    </div>

                    <div className="bg-dark-950/50 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-cyan-300">Team Income (60% pool)</span>
                        <span className="text-cyan-400 font-bold">Variable</span>
                      </div>
                      <p className="text-cyan-300/70 text-xs">Slab differences & same-slab overrides</p>
                    </div>

                    <div className="bg-dark-950/50 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-cyan-300">Royalty Program</span>
                        <span className="text-cyan-400 font-bold">Monthly</span>
                      </div>
                      <p className="text-cyan-300/70 text-xs">LifeTime maximum with renewal rules</p>
                    </div>

                    <div className="bg-gradient-to-r from-cyan-500/20 to-neon-purple/20 border border-neon-purple rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-neon-purple font-bold">Avg User Returns</span>
                        <span className="text-neon-purple font-bold text-xl">~6-9%</span>
                      </div>
                      <p className="text-cyan-300/70 text-xs mt-2">After all caps and fees applied</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="cyber-glass border-2 border-neon-green rounded-xl p-6">
                <h3 className="text-xl font-bold text-neon-green mb-4 text-center">The Surplus Powers Long-Term Growth</h3>
                <p className="text-cyan-300/80 text-center leading-relaxed mb-4">
                  The substantial surplus between validator income (500-1000%+ with active compounding) and average user payouts (6-9%) is retained as protocol reserves. These reserves handle:
                </p>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="bg-dark-950/50 rounded-lg p-4 text-center">
                    <p className="text-cyan-300 font-semibold mb-1">Withdrawal Coverage</p>
                    <p className="text-cyan-300/70 text-xs">72-hour principal thaw liquidity</p>
                  </div>
                  <div className="bg-dark-950/50 rounded-lg p-4 text-center">
                    <p className="text-cyan-300 font-semibold mb-1">Market Fluctuations</p>
                    <p className="text-cyan-300/70 text-xs">Buffer for RAMA price volatility</p>
                  </div>
                  <div className="bg-dark-950/50 rounded-lg p-4 text-center">
                    <p className="text-cyan-300 font-semibold mb-1">Emergency Reserve</p>
                    <p className="text-cyan-300/70 text-xs">Safety net for system stability</p>
                  </div>
                  <div className="bg-dark-950/50 rounded-lg p-4 text-center">
                    <p className="text-cyan-300 font-semibold mb-1">Protocol Development</p>
                    <p className="text-cyan-300/70 text-xs">Ongoing improvements & features</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="cyber-glass border-2 border-neon-purple rounded-3xl p-8 md:p-12 hover-glow-purple">
              <h2 className="text-4xl font-bold text-neon-purple mb-8">Safety Mechanisms</h2>

              <p className="text-lg text-cyan-300/90 mb-8 leading-relaxed">
                OCEAN DeFi implements multiple layers of protection to ensure your investment is secure and the system remains stable:
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Lock className="text-cyan-400" size={24} />
                    <h3 className="text-xl font-bold text-cyan-300">4x Lifetime Cap</h3>
                  </div>
                  <p className="text-cyan-300/80 text-sm mb-4">
                    No user can earn more than 4x their total lifetime staked amount across all portfolios. This prevents infinite extraction and ensures fair distribution.
                  </p>
                  <div className="bg-dark-950/50 rounded-lg p-3">
                    <p className="text-cyan-300/70 text-xs mb-1">Example:</p>
                    <p className="text-cyan-300 text-sm">Lifetime staked: $10,000</p>
                    <p className="text-neon-green text-sm">Maximum earnings: $40,000</p>
                  </div>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Shield className="text-neon-green" size={24} />
                    <h3 className="text-xl font-bold text-neon-green">Portfolio Caps (200/250%)</h3>
                  </div>
                  <p className="text-cyan-300/80 text-sm mb-4">
                    Each portfolio caps at 200% (normal) or 250% (booster) including principal. When cap is reached, principal becomes zero and portfolio closes. Must stake again to create new portfolio.
                  </p>
                  <div className="bg-dark-950/50 rounded-lg p-3">
                    <p className="text-cyan-300/70 text-xs mb-1">Example:</p>
                    <p className="text-cyan-300 text-sm">Portfolio stake: $1,000</p>
                    <p className="text-neon-green text-sm">Cap including principal: $2,000-$2,500</p>
                    <p className="text-cyan-300/70 text-xs mt-1">After cap, principal = $0</p>
                  </div>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertTriangle className="text-neon-orange" size={24} />
                    <h3 className="text-xl font-bold text-neon-orange">72-Hour Withdrawal Freeze</h3>
                  </div>
                  <p className="text-cyan-300/80 text-sm mb-4">
                    Principal withdrawal requires 72-hour freeze period with 20% exit fee. Prevents bank-run scenarios and maintains liquidity.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={14} />
                      <span className="text-cyan-300/70 text-xs">Request withdrawal anytime</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={14} />
                      <span className="text-cyan-300/70 text-xs">No income during 72h freeze</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={14} />
                      <span className="text-cyan-300/70 text-xs">Cancel within 72h to resume earning</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={14} />
                      <span className="text-cyan-300/70 text-xs">After 72h: 80% refund, 20% to treasury</span>
                    </div>
                  </div>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <DollarSign className="text-neon-purple" size={24} />
                    <h3 className="text-xl font-bold text-neon-purple">Fee Recycling</h3>
                  </div>
                  <p className="text-cyan-300/80 text-sm mb-4">
                    Withdrawal fees (5%) and exit fees (20%) are recycled back into the validator pool, strengthening the economic foundation.
                  </p>
                  <div className="bg-dark-950/50 rounded-lg p-3">
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-cyan-300/70 text-xs">Claim Fee</span>
                        <span className="text-cyan-300 text-xs">5% → Treasury</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cyan-300/70 text-xs">Exit Fee</span>
                        <span className="text-cyan-300 text-xs">20% → Treasury</span>
                      </div>
                      <div className="flex justify-between border-t border-cyan-500/30 pt-1">
                        <span className="text-neon-green text-xs font-bold">Treasury Use</span>
                        <span className="text-neon-green text-xs">Restake to validators</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="cyber-glass border-2 border-neon-orange rounded-3xl p-8 md:p-12 hover-glow-orange">
              <h2 className="text-4xl font-bold text-neon-orange mb-8">Safe Wallet: Fee-Free Operations</h2>

              <p className="text-lg text-cyan-300/90 mb-8 leading-relaxed">
                The Safe Wallet is your internal OCEAN DeFi balance that operates without withdrawal fees. <strong className="text-neon-orange">Note: The Safe Wallet does not automatically transfer any income.</strong> Users must manually claim their earnings and choose to transfer them to their Safe Wallet or external wallet.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-cyan-300 mb-4">What Goes to Safe Wallet</h3>
                  <div className="space-y-3">
                    <div className="cyber-glass border border-cyan-500/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="text-neon-green" size={20} />
                        <span className="text-cyan-300 font-semibold">Slab Income</span>
                      </div>
                      <p className="text-cyan-300/70 text-sm">All team-based difference and override income (manual claim required)</p>
                    </div>

                    <div className="cyber-glass border border-cyan-500/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="text-neon-green" size={20} />
                        <span className="text-cyan-300 font-semibold">Royalty Payments</span>
                      </div>
                      <p className="text-cyan-300/70 text-sm">Monthly recurring payments for LifeTime (manual claim required)</p>
                    </div>

                    <div className="cyber-glass border border-cyan-500/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="text-neon-green" size={20} />
                        <span className="text-cyan-300 font-semibold">One-Time Rewards</span>
                      </div>
                      <p className="text-cyan-300/70 text-sm">Achievement milestone bonuses (manual claim required)</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-cyan-300 mb-4">Safe Wallet Benefits</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={20} />
                      <div>
                        <p className="text-cyan-300 font-semibold text-sm mb-1">Zero Withdrawal Fees</p>
                        <p className="text-cyan-300/70 text-xs">Internal transfers and withdrawals are completely free</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={20} />
                      <div>
                        <p className="text-cyan-300 font-semibold text-sm mb-1">Restaking Without Fees</p>
                        <p className="text-cyan-300/70 text-xs">Use Safe Wallet balance to top-up portfolios fee-free</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={20} />
                      <div>
                        <p className="text-cyan-300 font-semibold text-sm mb-1">Instant Availability</p>
                        <p className="text-cyan-300/70 text-xs">Funds available immediately for any internal operation</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={20} />
                      <div>
                        <p className="text-cyan-300 font-semibold text-sm mb-1">Secure Storage</p>
                        <p className="text-cyan-300/70 text-xs">Protected by smart contract, not affected by market volatility</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="cyber-glass border-2 border-cyan-500 rounded-3xl p-12 text-center hover-glow-cyan">
              <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green mb-4">
                Experience True DeFi Security
              </h2>
              <p className="text-xl text-cyan-300/90 mb-8 max-w-2xl mx-auto">
                Join OCEAN DeFi where your earnings are backed by real validator income, not just new user deposits
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/how-it-works"
                  className="px-8 py-4 cyber-glass border-2 border-cyan-500 text-cyan-300 rounded-xl font-bold text-lg hover-glow-cyan transition-all inline-flex items-center justify-center gap-2"
                >
                  Learn How It Works
                </Link>
                <Link
                  to="/login"
                  className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-neon-green text-dark-950 rounded-xl font-bold text-lg hover:shadow-neon-cyan transition-all inline-flex items-center justify-center gap-2"
                >
                  Get Started <ArrowRight size={20} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-cyan-500/20">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-cyan-300/70 text-sm">
            © 2025 OCEAN DeFi. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
