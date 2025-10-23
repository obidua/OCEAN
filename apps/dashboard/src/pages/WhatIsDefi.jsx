import { Link } from 'react-router-dom';
import { TrendingUp, Users, Lock, Zap, Globe, ArrowRight, CheckCircle, DollarSign, Shield } from 'lucide-react';
import PublicNav from '../components/PublicNav';

export default function WhatIsDefi() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-dark-950 via-dark-900 to-dark-950">
      <PublicNav />

      <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green mb-6">
              What is DeFi?
            </h1>
            <p className="text-xl text-cyan-300/90 max-w-3xl mx-auto">
              Understanding Decentralized Finance and how it's transforming the financial world
            </p>
          </div>

          <div className="space-y-12">
            <div className="cyber-glass border-2 border-cyan-500 rounded-3xl p-8 md:p-12 hover-glow-cyan">
              <h2 className="text-4xl font-bold text-cyan-300 mb-8">DeFi Explained</h2>

              <p className="text-lg text-cyan-300/90 mb-6 leading-relaxed">
                <strong className="text-neon-green">DeFi (Decentralized Finance)</strong> refers to financial services built on blockchain technology that operate without traditional intermediaries like banks, brokers, or exchanges. Instead, smart contracts automatically execute financial transactions and agreements.
              </p>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <h3 className="text-2xl font-bold text-cyan-300 mb-4">Traditional Finance (TradFi)</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-red-400 mt-1">✗</span>
                      <p className="text-cyan-300/80 text-sm">Banks control your money</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-red-400 mt-1">✗</span>
                      <p className="text-cyan-300/80 text-sm">Limited business hours</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-red-400 mt-1">✗</span>
                      <p className="text-cyan-300/80 text-sm">High fees and slow transfers</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-red-400 mt-1">✗</span>
                      <p className="text-cyan-300/80 text-sm">Requires personal information</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-red-400 mt-1">✗</span>
                      <p className="text-cyan-300/80 text-sm">Geographic restrictions</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-red-400 mt-1">✗</span>
                      <p className="text-cyan-300/80 text-sm">Opaque operations</p>
                    </div>
                  </div>
                </div>

                <div className="cyber-glass border border-neon-green/30 rounded-xl p-6">
                  <h3 className="text-2xl font-bold text-neon-green mb-4">Decentralized Finance (DeFi)</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={16} />
                      <p className="text-cyan-300/80 text-sm">You control your assets</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={16} />
                      <p className="text-cyan-300/80 text-sm">24/7 availability worldwide</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={16} />
                      <p className="text-cyan-300/80 text-sm">Low fees, instant transactions</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={16} />
                      <p className="text-cyan-300/80 text-sm">Pseudonymous participation</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={16} />
                      <p className="text-cyan-300/80 text-sm">Accessible from anywhere</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={16} />
                      <p className="text-cyan-300/80 text-sm">Fully transparent on-chain</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="cyber-glass border-2 border-neon-green rounded-3xl p-8 md:p-12 hover-glow-green">
              <h2 className="text-4xl font-bold text-neon-green mb-8">Core DeFi Services</h2>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <TrendingUp className="text-cyan-400 mb-4" size={32} />
                  <h3 className="text-xl font-bold text-cyan-300 mb-3">Staking & Yield</h3>
                  <p className="text-cyan-300/80 text-sm">Earn passive income by locking your crypto assets in protocols. OCEAN DeFi offers up to 300% returns through validator-backed staking.</p>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <DollarSign className="text-neon-green mb-4" size={32} />
                  <h3 className="text-xl font-bold text-neon-green mb-3">Lending & Borrowing</h3>
                  <p className="text-cyan-300/80 text-sm">Lend your assets to earn interest or borrow against your holdings without credit checks or lengthy approval processes.</p>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <Zap className="text-neon-purple mb-4" size={32} />
                  <h3 className="text-xl font-bold text-neon-purple mb-3">Decentralized Exchanges</h3>
                  <p className="text-cyan-300/80 text-sm">Trade cryptocurrencies directly with other users without intermediaries. Ramestta ecosystem includes RamaSwap for seamless trading.</p>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <Lock className="text-neon-orange mb-4" size={32} />
                  <h3 className="text-xl font-bold text-neon-orange mb-3">Asset Management</h3>
                  <p className="text-cyan-300/80 text-sm">Manage your portfolio through decentralized platforms with full custody and control. OCEAN Safe Wallet provides fee-free storage.</p>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <Shield className="text-cyan-400 mb-4" size={32} />
                  <h3 className="text-xl font-bold text-cyan-400 mb-3">Insurance</h3>
                  <p className="text-cyan-300/80 text-sm">Protect your investments with decentralized insurance protocols that cover smart contract failures and platform risks.</p>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <Globe className="text-neon-green mb-4" size={32} />
                  <h3 className="text-xl font-bold text-neon-green mb-3">Cross-Chain Bridges</h3>
                  <p className="text-cyan-300/80 text-sm">Move assets between different blockchains seamlessly. RamaBridge connects Ramestta to other major networks.</p>
                </div>
              </div>
            </div>

            <div className="cyber-glass border-2 border-neon-purple rounded-3xl p-8 md:p-12 hover-glow-purple">
              <h2 className="text-4xl font-bold text-neon-purple mb-8">Why DeFi Matters</h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold text-cyan-300 mb-3">Financial Inclusion</h3>
                    <p className="text-cyan-300/80 leading-relaxed">
                      Over 1.7 billion people worldwide are unbanked. DeFi provides financial services to anyone with internet access, regardless of location, credit history, or economic status.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold text-cyan-300 mb-3">Higher Returns</h3>
                    <p className="text-cyan-300/80 leading-relaxed">
                      Traditional savings accounts offer 0.01-1% APY. DeFi protocols like OCEAN can provide significantly higher returns through staking, farming, and liquidity provision.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold text-cyan-300 mb-3">Innovation Speed</h3>
                    <p className="text-cyan-300/80 leading-relaxed">
                      DeFi protocols can be built and deployed in weeks, not years. This rapid innovation creates new financial products and services constantly.
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold text-cyan-300 mb-3">Transparency</h3>
                    <p className="text-cyan-300/80 leading-relaxed">
                      All transactions and protocol operations are recorded on public blockchains. Anyone can verify how the system works and audit smart contract code.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold text-cyan-300 mb-3">Composability</h3>
                    <p className="text-cyan-300/80 leading-relaxed">
                      DeFi protocols can interact and build on each other like "money legos," creating sophisticated financial products from simple building blocks.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold text-cyan-300 mb-3">Self-Custody</h3>
                    <p className="text-cyan-300/80 leading-relaxed">
                      You maintain complete control over your assets through private keys. No bank can freeze your account or impose arbitrary restrictions.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="cyber-glass border-2 border-neon-orange rounded-3xl p-8 md:p-12 hover-glow-orange">
              <h2 className="text-4xl font-bold text-neon-orange mb-8">OCEAN DeFi: Next-Generation Platform</h2>

              <p className="text-lg text-cyan-300/90 mb-6 leading-relaxed">
                OCEAN DeFi represents the evolution of DeFi by combining multiple income streams with validator-backed security on the Ramestta blockchain:
              </p>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-neon-green mb-2">4</p>
                  <p className="text-cyan-300 text-sm">Income Streams</p>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-neon-green mb-2">4x</p>
                  <p className="text-cyan-300 text-sm">Lifetime Earning Cap</p>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-neon-green mb-2">0%</p>
                  <p className="text-cyan-300 text-sm">Safe Wallet Fees</p>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-neon-green mb-2">24/7</p>
                  <p className="text-cyan-300 text-sm">Global Access</p>
                </div>
              </div>

              <div className="mt-8 cyber-glass border border-neon-purple/50 rounded-xl p-6">
                <h3 className="text-xl font-bold text-neon-purple mb-4">Validator-Backed Sustainability</h3>
                <p className="text-cyan-300/80 leading-relaxed">
                  Unlike traditional DeFi platforms that rely solely on new deposits, OCEAN DeFi stakes your RAMA coins with professional validators. These validators secure the Ramestta network and earn rewards that are auto-compounded daily. This validator income provides the sustainable foundation for all user payouts, creating a long-term viable ecosystem.
                </p>
              </div>
            </div>

            <div className="cyber-glass border-2 border-cyan-500 rounded-3xl p-12 text-center hover-glow-cyan">
              <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green mb-4">
                Continue Your Learning Journey
              </h2>
              <p className="text-xl text-cyan-300/90 mb-8 max-w-2xl mx-auto">
                Learn about the Ramestta blockchain that powers OCEAN DeFi
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/smart-contracts"
                  className="px-8 py-4 cyber-glass border-2 border-cyan-500 text-cyan-300 rounded-xl font-bold text-lg hover-glow-cyan transition-all inline-flex items-center justify-center gap-2"
                >
                  ← Previous: Smart Contracts
                </Link>
                <Link
                  to="/ramestta-blockchain"
                  className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-neon-green text-dark-950 rounded-xl font-bold text-lg hover:shadow-neon-cyan transition-all inline-flex items-center justify-center gap-2"
                >
                  Next: Ramestta Blockchain <ArrowRight size={20} />
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
