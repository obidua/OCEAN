import { Link } from 'react-router-dom';
import { PieChart, Lock, TrendingUp, Shield, DollarSign, ArrowRight, CheckCircle, Globe, Zap, BarChart3 } from 'lucide-react';
import PublicNav from '../components/PublicNav';
import TokenomicsComparison from '../components/TokenomicsComparison';

export default function RamaTokenomics() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-dark-950 via-dark-900 to-dark-950">
      <PublicNav />

      <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green mb-6">
              RAMA Tokenomics
            </h1>
            <p className="text-xl text-cyan-300/90 max-w-3xl mx-auto">
              Understanding RAMA coin distribution, utility, and long-term value proposition
            </p>
          </div>

          <div className="space-y-12">
            <div className="cyber-glass border-2 border-cyan-500 rounded-3xl p-8 md:p-12 hover-glow-cyan">
              <div className="flex items-center gap-4 mb-8">
                <PieChart className="text-cyan-400" size={48} />
                <h2 className="text-4xl font-bold text-cyan-300">Total Supply: 1 Billion RAMA</h2>
              </div>

              <p className="text-lg text-cyan-300/90 mb-8 leading-relaxed">
                RAMA has a fixed total supply of <strong className="text-neon-green">1 billion (1000 million)</strong> coins. This fixed supply ensures scarcity and prevents inflation, making RAMA a deflationary asset over time.
              </p>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="cyber-glass border-2 border-neon-purple rounded-xl p-6 hover-glow-purple">
                  <div className="flex items-center gap-3 mb-4">
                    <Lock className="text-neon-purple" size={32} />
                    <h3 className="text-2xl font-bold text-neon-purple">80% Locked for Validators</h3>
                  </div>
                  <p className="text-4xl font-bold text-cyan-400 mb-4">800 Million RAMA</p>
                  <p className="text-cyan-300/80 leading-relaxed mb-4">
                    The majority of RAMA supply is locked and allocated to validator nodes that secure the Ramestta network. This ensures:
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={16} />
                      <span className="text-cyan-300/80 text-sm">Network security through high validator stakes</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={16} />
                      <span className="text-cyan-300/80 text-sm">Sustainable validator rewards (5-8.4% APY)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={16} />
                      <span className="text-cyan-300/80 text-sm">Foundation for OCEAN DeFi income streams</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={16} />
                      <span className="text-cyan-300/80 text-sm">Long-term network stability</span>
                    </div>
                  </div>
                </div>

                <div className="cyber-glass border-2 border-neon-green rounded-xl p-6 hover-glow-green">
                  <div className="flex items-center gap-3 mb-4">
                    <Shield className="text-neon-green" size={32} />
                    <h3 className="text-2xl font-bold text-neon-green">20% Reserved for Growth</h3>
                  </div>
                  <p className="text-4xl font-bold text-cyan-400 mb-4">200 Million RAMA</p>
                  <p className="text-cyan-300/80 leading-relaxed mb-4">
                    Reserved allocation for ecosystem development and long-term sustainability:
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={16} />
                      <span className="text-cyan-300/80 text-sm">Technical development and upgrades</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={16} />
                      <span className="text-cyan-300/80 text-sm">Marketing and promotion initiatives</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={16} />
                      <span className="text-cyan-300/80 text-sm">Ecosystem partnerships and integrations</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={16} />
                      <span className="text-cyan-300/80 text-sm">Strategic reserves for platform operations</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 cyber-glass border-2 border-neon-orange rounded-xl p-6 hover-glow-orange">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="text-neon-orange" size={32} />
                  <h3 className="text-2xl font-bold text-neon-orange">Only 4 Million (0.4%) in Market Circulation</h3>
                </div>
                <p className="text-lg text-cyan-300/90 leading-relaxed mb-4">
                  Despite the 1 billion total supply, only <strong className="text-neon-green">4 million RAMA (0.4%)</strong> coins are currently available for trading in the open market. This creates a unique supply-demand dynamic:
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-dark-950/50 rounded-lg p-4 text-center">
                    <p className="text-cyan-300/70 text-sm mb-2">Total Supply</p>
                    <p className="text-2xl font-bold text-cyan-400">1B</p>
                  </div>
                  <div className="bg-dark-950/50 rounded-lg p-4 text-center">
                    <p className="text-cyan-300/70 text-sm mb-2">Locked/Reserved</p>
                    <p className="text-2xl font-bold text-neon-purple">996M</p>
                  </div>
                  <div className="bg-dark-950/50 rounded-lg p-4 text-center">
                    <p className="text-cyan-300/70 text-sm mb-2">Circulating</p>
                    <p className="text-2xl font-bold text-neon-green">4M</p>
                  </div>
                </div>
                <p className="text-cyan-300/80 text-sm mt-4 italic">
                  Only 0.4% of total supply in circulation creates extreme scarcity. Combined with growing demand from OCEAN DeFi users and exchange traders, this creates strong upward price pressure.
                </p>
              </div>
            </div>

            <div className="cyber-glass border-2 border-neon-green rounded-3xl p-8 md:p-12 hover-glow-green">
              <h2 className="text-4xl font-bold text-neon-green mb-8">RAMA Utility & Use Cases</h2>

              <p className="text-lg text-cyan-300/90 mb-8 leading-relaxed">
                RAMA is not just a speculative asset - it has real utility across the entire Ramestta ecosystem:
              </p>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <Zap className="text-cyan-400 mb-4" size={32} />
                  <h3 className="text-xl font-bold text-cyan-300 mb-3">Staking in OCEAN DeFi</h3>
                  <p className="text-cyan-300/80 text-sm">
                    Stake RAMA to earn through multiple income streams: portfolio growth (200-250% cap including principal), slab income, royalty program, and one-time bonuses.
                  </p>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <Lock className="text-neon-green mb-4" size={32} />
                  <h3 className="text-xl font-bold text-neon-green mb-3">Validator Delegation</h3>
                  <p className="text-cyan-300/80 text-sm">
                    Delegate RAMA to validators to secure the network and earn 5-8.4% APY in validator rewards, paid out daily.
                  </p>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <DollarSign className="text-neon-purple mb-4" size={32} />
                  <h3 className="text-xl font-bold text-neon-purple mb-3">Transaction Fees</h3>
                  <p className="text-cyan-300/80 text-sm">
                    Pay gas fees on Ramestta network with RAMA. Ultra-low fees (~$0.001) make transactions virtually free.
                  </p>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <Globe className="text-neon-orange mb-4" size={32} />
                  <h3 className="text-xl font-bold text-neon-orange mb-3">Trading & Liquidity</h3>
                  <p className="text-cyan-300/80 text-sm">
                    Trade RAMA on exchanges (BitMart, Koinpark) or provide liquidity on RamaSwap to earn trading fees.
                  </p>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <Shield className="text-cyan-400 mb-4" size={32} />
                  <h3 className="text-xl font-bold text-cyan-400 mb-3">Governance Rights</h3>
                  <p className="text-cyan-300/80 text-sm">
                    RAMA holders participate in governance decisions for protocol upgrades, parameter changes, and ecosystem direction.
                  </p>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <TrendingUp className="text-neon-green mb-4" size={32} />
                  <h3 className="text-xl font-bold text-neon-green mb-3">Ecosystem Services</h3>
                  <p className="text-cyan-300/80 text-sm">
                    Access RamaPay wallet, RamaBridge transfers, and other ecosystem services with RAMA as the native currency.
                  </p>
                </div>
              </div>
            </div>

            <div className="cyber-glass border-2 border-neon-purple rounded-3xl p-8 md:p-12 hover-glow-purple">
              <h2 className="text-4xl font-bold text-neon-purple mb-8">Where to Buy RAMA</h2>

              <p className="text-lg text-cyan-300/90 mb-8 leading-relaxed">
                RAMA is listed on major exchanges with more listings coming soon:
              </p>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="cyber-glass border-2 border-cyan-500 rounded-xl p-6 hover-glow-cyan">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold text-cyan-300">BitMart</h3>
                    <span className="px-3 py-1 bg-neon-green/20 text-neon-green rounded-full text-xs font-bold">LIVE</span>
                  </div>
                  <p className="text-cyan-300/80 mb-4">
                    Global cryptocurrency exchange with 9+ million users across 180+ countries
                  </p>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="text-neon-green" size={16} />
                      <span className="text-cyan-300/70 text-sm">RAMA/USDT trading pair</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="text-neon-green" size={16} />
                      <span className="text-cyan-300/70 text-sm">High liquidity</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="text-neon-green" size={16} />
                      <span className="text-cyan-300/70 text-sm">24/7 trading</span>
                    </div>
                  </div>
                </div>

                <div className="cyber-glass border-2 border-neon-green rounded-xl p-6 hover-glow-green">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold text-neon-green">Koinpark</h3>
                    <span className="px-3 py-1 bg-neon-green/20 text-neon-green rounded-full text-xs font-bold">LIVE</span>
                  </div>
                  <p className="text-cyan-300/80 mb-4">
                    Leading crypto exchange in India and Southeast Asia with robust security
                  </p>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="text-neon-green" size={16} />
                      <span className="text-cyan-300/70 text-sm">RAMA/INR & RAMA/USDT pairs</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="text-neon-green" size={16} />
                      <span className="text-cyan-300/70 text-sm">Fiat gateway support</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="text-neon-green" size={16} />
                      <span className="text-cyan-300/70 text-sm">Low trading fees</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="cyber-glass border border-neon-orange/50 rounded-xl p-6">
                <h3 className="text-xl font-bold text-neon-orange mb-4">Coming Soon to More Exchanges</h3>
                <p className="text-cyan-300/80 mb-4">
                  RAMA is in advanced discussions with multiple tier-1 and tier-2 exchanges for additional listings:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-dark-950/50 rounded-lg p-3 text-center">
                    <p className="text-cyan-300 font-semibold">Binance</p>
                    <p className="text-cyan-300/60 text-xs">In Discussion</p>
                  </div>
                  <div className="bg-dark-950/50 rounded-lg p-3 text-center">
                    <p className="text-cyan-300 font-semibold">OKX</p>
                    <p className="text-cyan-300/60 text-xs">In Discussion</p>
                  </div>
                  <div className="bg-dark-950/50 rounded-lg p-3 text-center">
                    <p className="text-cyan-300 font-semibold">Gate.io</p>
                    <p className="text-cyan-300/60 text-xs">In Discussion</p>
                  </div>
                  <div className="bg-dark-950/50 rounded-lg p-3 text-center">
                    <p className="text-cyan-300 font-semibold">Bybit</p>
                    <p className="text-cyan-300/60 text-xs">In Discussion</p>
                  </div>
                </div>
                <p className="text-cyan-300/60 text-xs mt-4 italic text-center">
                  More exchange listings increase accessibility, liquidity, and price discovery for RAMA holders
                </p>
              </div>
            </div>

            <div className="cyber-glass border-2 border-neon-orange rounded-3xl p-8 md:p-12 hover-glow-orange">
              <h2 className="text-4xl font-bold text-neon-orange mb-8">RAMA Price Dynamics</h2>

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-2xl font-bold text-cyan-300 mb-4">Factors Supporting Price Growth</h3>
                  <div className="space-y-4">
                    <div className="cyber-glass border border-cyan-500/30 rounded-lg p-4">
                      <h4 className="text-lg font-bold text-neon-green mb-2">Limited Circulating Supply</h4>
                      <p className="text-cyan-300/80 text-sm">Only 4 million RAMA in active circulation creates natural scarcity and upward price pressure as demand increases.</p>
                    </div>

                    <div className="cyber-glass border border-cyan-500/30 rounded-lg p-4">
                      <h4 className="text-lg font-bold text-neon-green mb-2">Growing Utility</h4>
                      <p className="text-cyan-300/80 text-sm">Expanding use cases across OCEAN DeFi, validators, RamaSwap, and the broader ecosystem drive organic demand.</p>
                    </div>

                    <div className="cyber-glass border border-cyan-500/30 rounded-lg p-4">
                      <h4 className="text-lg font-bold text-neon-green mb-2">Staking Lock-Up</h4>
                      <p className="text-cyan-300/80 text-sm">Users staking in OCEAN DeFi remove coins from circulation, further reducing available supply on exchanges.</p>
                    </div>

                    <div className="cyber-glass border border-cyan-500/30 rounded-lg p-4">
                      <h4 className="text-lg font-bold text-neon-green mb-2">Exchange Listings</h4>
                      <p className="text-cyan-300/80 text-sm">Each new exchange listing expands market access and trading volume, typically resulting in price appreciation.</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-cyan-300 mb-4">Deflationary Mechanisms</h3>
                  <div className="space-y-4">
                    <div className="cyber-glass border border-cyan-500/30 rounded-lg p-4">
                      <h4 className="text-lg font-bold text-neon-purple mb-2">Fixed Supply Cap</h4>
                      <p className="text-cyan-300/80 text-sm">No new RAMA will ever be minted beyond the 1 billion total supply, preventing inflation.</p>
                    </div>

                    <div className="cyber-glass border border-cyan-500/30 rounded-lg p-4">
                      <h4 className="text-lg font-bold text-neon-purple mb-2">Transaction Burns</h4>
                      <p className="text-cyan-300/80 text-sm">A portion of transaction fees is permanently burned, gradually reducing total supply over time.</p>
                    </div>

                    <div className="cyber-glass border border-cyan-500/30 rounded-lg p-4">
                      <h4 className="text-lg font-bold text-neon-purple mb-2">Validator Lock-Ups</h4>
                      <p className="text-cyan-300/80 text-sm">800 million RAMA locked with validators is inaccessible for trading, permanently removed from market dynamics.</p>
                    </div>

                    <div className="cyber-glass border border-cyan-500/30 rounded-lg p-4">
                      <h4 className="text-lg font-bold text-neon-purple mb-2">Buy Pressure from OCEAN</h4>
                      <p className="text-cyan-300/80 text-sm">New OCEAN DeFi users must purchase RAMA to stake, creating consistent buying pressure.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="cyber-glass border-2 border-neon-purple rounded-3xl p-8 md:p-12 hover-glow-purple">
              <div className="flex items-center gap-4 mb-8">
                <BarChart3 className="text-neon-purple" size={48} />
                <h2 className="text-4xl font-bold text-neon-purple">Cross-Chain Tokenomics Comparison</h2>
              </div>

              <p className="text-lg text-cyan-300/90 mb-8 leading-relaxed">
                Compare RAMA's tokenomics against major blockchain networks to understand why <strong className="text-neon-green">limited supply + growing demand = price appreciation</strong>
              </p>

              <TokenomicsComparison />
            </div>

            <div className="cyber-glass border-2 border-cyan-500 rounded-3xl p-12 text-center hover-glow-cyan">
              <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green mb-4">
                Start Earning with RAMA Today
              </h2>
              <p className="text-xl text-cyan-300/90 mb-8 max-w-2xl mx-auto">
                Purchase RAMA on exchanges and stake in OCEAN DeFi to access multiple passive income streams
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/validator-security"
                  className="px-8 py-4 cyber-glass border-2 border-cyan-500 text-cyan-300 rounded-xl font-bold text-lg hover-glow-cyan transition-all inline-flex items-center justify-center gap-2"
                >
                  Learn About Security
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
