import { Link } from 'react-router-dom';
import { Layers, Zap, Shield, DollarSign, Network, Globe, ArrowRight, CheckCircle, TrendingUp } from 'lucide-react';
import PublicNav from '../components/PublicNav';

export default function RamesttaBlockchain() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-dark-950 via-dark-900 to-dark-950">
      <PublicNav />

      <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green mb-6">
              Ramestta Blockchain
            </h1>
            <p className="text-xl text-cyan-300/90 max-w-3xl mx-auto">
              The Layer 3 blockchain powering OCEAN DeFi with speed, security, and sustainability
            </p>
          </div>

          <div className="space-y-12">
            <div className="cyber-glass border-2 border-cyan-500 rounded-3xl p-8 md:p-12 hover-glow-cyan">
              <div className="flex items-center gap-4 mb-8">
                <Layers className="text-cyan-400" size={48} />
                <h2 className="text-4xl font-bold text-cyan-300">What is Ramestta?</h2>
              </div>

              <p className="text-lg text-cyan-300/90 mb-6 leading-relaxed">
                Ramestta is a <strong className="text-neon-green">Layer 3 blockchain</strong> built on top of Polygon (Layer 2), which itself is built on Ethereum (Layer 1). This multi-layered architecture provides the best of all worlds: Ethereum's security, Polygon's scalability, and Ramestta's specialized DeFi optimizations.
              </p>

              <div className="cyber-glass border-2 border-neon-green rounded-xl p-6 mb-8">
                <h3 className="text-2xl font-bold text-neon-green mb-4">Open Source & Community-Driven</h3>
                <p className="text-cyan-300/90 mb-4 leading-relaxed">
                  <strong className="text-cyan-300">RAMA is an open-source public blockchain</strong> built by an open community of developers from around the globe. Unlike many blockchain projects, Ramestta was developed organically through the collective knowledge and infrastructure contributions of multiple developers worldwide.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-dark-950/50 rounded-lg p-4">
                    <p className="text-cyan-300 font-semibold mb-2">🌍 Global Development</p>
                    <p className="text-cyan-300/70 text-sm">Built by international developers contributing their expertise and infrastructure</p>
                  </div>
                  <div className="bg-dark-950/50 rounded-lg p-4">
                    <p className="text-cyan-300 font-semibold mb-2">📅 Launched 2021</p>
                    <p className="text-cyan-300/70 text-sm">Established in 2021 and continuously evolving with community input</p>
                  </div>
                  <div className="bg-dark-950/50 rounded-lg p-4">
                    <p className="text-cyan-300 font-semibold mb-2">🚫 No ICO / Private Sale</p>
                    <p className="text-cyan-300/70 text-sm">Never conducted any public ICO or private sales - purely community-built</p>
                  </div>
                  <div className="bg-dark-950/50 rounded-lg p-4">
                    <p className="text-cyan-300 font-semibold mb-2">💎 Controlled Supply</p>
                    <p className="text-cyan-300/70 text-sm">Total, circulation, and max supply fully controlled without speculative funding</p>
                  </div>
                </div>
              </div>

              <div className="cyber-glass border border-neon-purple/50 rounded-xl p-6 mb-8">
                <h3 className="text-2xl font-bold text-neon-purple mb-4">The Layer Hierarchy</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-24 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-center py-2 rounded-lg font-bold text-sm">
                      Layer 1
                    </div>
                    <div className="flex-1">
                      <p className="text-cyan-300 font-semibold">Ethereum</p>
                      <p className="text-cyan-300/70 text-sm">Base security layer, decentralized and immutable</p>
                    </div>
                  </div>
                  <div className="ml-8 border-l-2 border-cyan-500/30 h-8"></div>
                  <div className="flex items-center gap-4">
                    <div className="w-24 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-center py-2 rounded-lg font-bold text-sm">
                      Layer 2
                    </div>
                    <div className="flex-1">
                      <p className="text-cyan-300 font-semibold">Polygon</p>
                      <p className="text-cyan-300/70 text-sm">Scaling solution with faster transactions and lower fees</p>
                    </div>
                  </div>
                  <div className="ml-8 border-l-2 border-cyan-500/30 h-8"></div>
                  <div className="flex items-center gap-4">
                    <div className="w-24 bg-gradient-to-r from-cyan-500 to-neon-green text-dark-950 text-center py-2 rounded-lg font-bold text-sm">
                      Layer 3
                    </div>
                    <div className="flex-1">
                      <p className="text-neon-green font-semibold">Ramestta</p>
                      <p className="text-cyan-300/70 text-sm">Application-specific optimizations for DeFi and staking</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6 text-center">
                  <Zap className="text-neon-green mx-auto mb-3" size={32} />
                  <p className="text-3xl font-bold text-cyan-400 mb-2">2s</p>
                  <p className="text-cyan-300 text-sm">Block Time</p>
                  <p className="text-cyan-300/60 text-xs mt-2">Lightning-fast confirmations</p>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6 text-center">
                  <DollarSign className="text-neon-green mx-auto mb-3" size={32} />
                  <p className="text-3xl font-bold text-cyan-400 mb-2">$0.001</p>
                  <p className="text-cyan-300 text-sm">Average Gas Fee</p>
                  <p className="text-cyan-300/60 text-xs mt-2">Nearly fee-free transactions</p>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6 text-center">
                  <Shield className="text-neon-green mx-auto mb-3" size={32} />
                  <p className="text-3xl font-bold text-cyan-400 mb-2">100%</p>
                  <p className="text-cyan-300 text-sm">Security</p>
                  <p className="text-cyan-300/60 text-xs mt-2">Inherited from Ethereum</p>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6 text-center">
                  <Globe className="text-neon-green mx-auto mb-3" size={32} />
                  <p className="text-3xl font-bold text-cyan-400 mb-2">4M</p>
                  <p className="text-cyan-300 text-sm">Circulating Supply</p>
                  <p className="text-cyan-300/60 text-xs mt-2">Including validator stakes</p>
                </div>
              </div>
            </div>

            <div className="cyber-glass border-2 border-neon-green rounded-3xl p-8 md:p-12 hover-glow-green">
              <h2 className="text-4xl font-bold text-neon-green mb-8">Why Layer 3?</h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold text-cyan-300 mb-3">Specialized Optimization</h3>
                    <p className="text-cyan-300/80 leading-relaxed">
                      While Layer 1 (Ethereum) provides security and Layer 2 (Polygon) provides scalability, Layer 3 (Ramestta) is optimized specifically for DeFi applications. This means custom features like efficient staking, fast validator settlements, and seamless cross-contract interactions.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold text-cyan-300 mb-3">Cost Efficiency</h3>
                    <p className="text-cyan-300/80 leading-relaxed">
                      By building on top of Polygon's already low-cost infrastructure, Ramestta achieves even lower transaction fees. This makes micro-transactions viable and ensures that claiming your daily rewards doesn't eat into your earnings.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold text-cyan-300 mb-3">Instant Finality</h3>
                    <p className="text-cyan-300/80 leading-relaxed">
                      With 2-second block times, your staking, claims, and transfers are confirmed almost instantly. No more waiting 15 minutes for Ethereum confirmations or even 2 minutes on other chains.
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold text-cyan-300 mb-3">Inherited Security</h3>
                    <p className="text-cyan-300/80 leading-relaxed">
                      Ramestta inherits security from both Polygon and Ethereum. Even though it's Layer 3, it benefits from the combined security of all underlying layers, making it as secure as Ethereum itself.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold text-cyan-300 mb-3">Ecosystem Integration</h3>
                    <p className="text-cyan-300/80 leading-relaxed">
                      Being part of the Ethereum ecosystem means compatibility with all major wallets (MetaMask, Trust Wallet, etc.) and easy bridging to other chains. Users don't need to learn new tools or processes.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold text-cyan-300 mb-3">Scalability</h3>
                    <p className="text-cyan-300/80 leading-relaxed">
                      Ramestta can handle thousands of transactions per second without congestion, ensuring smooth operations even during peak usage times when thousands of users are claiming rewards simultaneously.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="cyber-glass border-2 border-neon-purple rounded-3xl p-8 md:p-12 hover-glow-purple">
              <h2 className="text-4xl font-bold text-neon-purple mb-8">The Ramestta Ecosystem</h2>

              <p className="text-lg text-cyan-300/90 mb-8 leading-relaxed">
                Ramestta is more than just a blockchain - it's a complete DeFi ecosystem with multiple interconnected services:
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-neon-green rounded-xl flex items-center justify-center">
                      <Shield className="text-dark-950" size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-cyan-300">RamaPay Wallet</h3>
                  </div>
                  <p className="text-cyan-300/80 text-sm mb-3">
                    Ramestta's official decentralized wallet for secure asset storage, staking, and transactions. Non-custodial design means you always control your private keys.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-neon-green flex-shrink-0" />
                      <span className="text-cyan-300/70 text-xs">Multi-chain support</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-neon-green flex-shrink-0" />
                      <span className="text-cyan-300/70 text-xs">Built-in staking interface</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-neon-green flex-shrink-0" />
                      <span className="text-cyan-300/70 text-xs">Mobile & desktop versions</span>
                    </div>
                  </div>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-neon-green to-cyan-500 rounded-xl flex items-center justify-center">
                      <Network className="text-dark-950" size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-neon-green">RamaBridge</h3>
                  </div>
                  <p className="text-cyan-300/80 text-sm mb-3">
                    Cross-chain bridge connecting Ramestta to Ethereum, Polygon, BSC, and other major networks. Seamlessly move assets between blockchains.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-neon-green flex-shrink-0" />
                      <span className="text-cyan-300/70 text-xs">Fast bridging (5-10 min)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-neon-green flex-shrink-0" />
                      <span className="text-cyan-300/70 text-xs">Low bridge fees</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-neon-green flex-shrink-0" />
                      <span className="text-cyan-300/70 text-xs">Security-audited contracts</span>
                    </div>
                  </div>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-neon-purple to-cyan-500 rounded-xl flex items-center justify-center">
                      <Zap className="text-dark-950" size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-neon-purple">RamaSwap</h3>
                  </div>
                  <p className="text-cyan-300/80 text-sm mb-3">
                    Decentralized exchange (DEX) for swapping RAMA and other coins. Automated market maker (AMM) model ensures liquidity and fair pricing.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-neon-green flex-shrink-0" />
                      <span className="text-cyan-300/70 text-xs">Instant swaps</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-neon-green flex-shrink-0" />
                      <span className="text-cyan-300/70 text-xs">Liquidity pools & farming</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-neon-green flex-shrink-0" />
                      <span className="text-cyan-300/70 text-xs">0.3% trading fee</span>
                    </div>
                  </div>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-neon-orange to-neon-pink rounded-xl flex items-center justify-center">
                      <TrendingUp className="text-dark-950" size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-neon-orange">Validation & Delegation Portal</h3>
                  </div>
                  <p className="text-cyan-300/80 text-sm mb-3">
                    Become a validator or delegate your RAMA to validators to secure the network and earn rewards. Professional validators power OCEAN DeFi's income streams.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-neon-green flex-shrink-0" />
                      <span className="text-cyan-300/70 text-xs">5-8.4% validator APY</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-neon-green flex-shrink-0" />
                      <span className="text-cyan-300/70 text-xs">Daily reward distribution</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-neon-green flex-shrink-0" />
                      <span className="text-cyan-300/70 text-xs">Slashing protection</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="cyber-glass border-2 border-neon-orange rounded-3xl p-8 md:p-12 hover-glow-orange">
              <h2 className="text-4xl font-bold text-neon-orange mb-8">Network Performance</h2>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6 text-center">
                  <p className="text-4xl font-bold text-neon-green mb-2">70,000+</p>
                  <p className="text-cyan-300 text-sm">TPS Capacity</p>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6 text-center">
                  <p className="text-4xl font-bold text-neon-green mb-2">99.9%</p>
                  <p className="text-cyan-300 text-sm">Uptime</p>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6 text-center">
                  <p className="text-4xl font-bold text-neon-green mb-2">100+</p>
                  <p className="text-cyan-300 text-sm">Active Validators</p>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6 text-center">
                  <p className="text-4xl font-bold text-neon-green mb-2">$50M+</p>
                  <p className="text-cyan-300 text-sm">Total Value Locked</p>
                </div>
              </div>

              <div className="cyber-glass border-2 border-cyan-500 rounded-xl p-6 mb-8">
                <h3 className="text-2xl font-bold text-cyan-300 mb-4">RAMA vs Major Blockchains</h3>
                <p className="text-cyan-300/90 mb-6">Key differences compared to Ethereum, Polygon, Binance Smart Chain, and Tron:</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-dark-950/50 rounded-lg p-4">
                    <p className="text-neon-green font-semibold mb-2">📊 Controlled Supply</p>
                    <p className="text-cyan-300/80 text-sm">Total, circulation, and max supply fully controlled. Only 4 million RAMA in circulation (including validator stakes), creating scarcity unlike unlimited-supply chains.</p>
                  </div>
                  <div className="bg-dark-950/50 rounded-lg p-4">
                    <p className="text-neon-green font-semibold mb-2">💰 Exchange Listings</p>
                    <p className="text-cyan-300/80 text-sm">Listed on Hotbit (discontinued), and currently on Koinpark and BitMart Exchange. Projected to list on many major exchanges by end of 2026.</p>
                  </div>
                  <div className="bg-dark-950/50 rounded-lg p-4">
                    <p className="text-neon-green font-semibold mb-2">🚀 Price Potential</p>
                    <p className="text-cyan-300/80 text-sm">Due to lower supply and increasing demand from gas fees and platforms like OCEAN DeFi, RAMA price may reach up to $50,000 in the future.</p>
                  </div>
                  <div className="bg-dark-950/50 rounded-lg p-4">
                    <p className="text-neon-green font-semibold mb-2">⚡ Layer 3 Advantage</p>
                    <p className="text-cyan-300/80 text-sm">Unlike Ethereum (L1), Polygon/BSC (L2), or Tron, RAMA operates as Layer 3 with 70,000+ TPS, combining security, speed, and ultra-low fees.</p>
                  </div>
                </div>
              </div>

              <div className="cyber-glass border border-neon-purple/50 rounded-xl p-6">
                <h3 className="text-xl font-bold text-neon-purple mb-4">How OCEAN DeFi Uses Ramestta</h3>
                <p className="text-cyan-300/80 leading-relaxed mb-4">
                  OCEAN DeFi is built natively on Ramestta to leverage its unique advantages:
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={16} />
                      <span className="text-cyan-300/80 text-sm">User stakes are deployed to Ramestta validators</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={16} />
                      <span className="text-cyan-300/80 text-sm">Validator rewards auto-compound daily</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={16} />
                      <span className="text-cyan-300/80 text-sm">Smart contracts enforce all caps and rules</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={16} />
                      <span className="text-cyan-300/80 text-sm">Fast claims with minimal gas fees</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={16} />
                      <span className="text-cyan-300/80 text-sm">Instant team network updates</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={16} />
                      <span className="text-cyan-300/80 text-sm">Transparent on-chain verification</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="cyber-glass border-2 border-cyan-500 rounded-3xl p-12 text-center hover-glow-cyan">
              <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green mb-4">
                Experience the Power of Layer 3
              </h2>
              <p className="text-xl text-cyan-300/90 mb-8 max-w-2xl mx-auto">
                Join OCEAN DeFi on Ramestta and enjoy fast, secure, and cost-effective DeFi operations
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/rama-tokenomics"
                  className="px-8 py-4 cyber-glass border-2 border-cyan-500 text-cyan-300 rounded-xl font-bold text-lg hover-glow-cyan transition-all inline-flex items-center justify-center gap-2"
                >
                  Learn About RAMA
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
