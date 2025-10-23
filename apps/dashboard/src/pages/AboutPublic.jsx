import { Link } from 'react-router-dom';
import { Shield, Zap, TrendingUp, Users, Lock, DollarSign, ArrowRight } from 'lucide-react';
import PublicNav from '../components/PublicNav';

export default function AboutPublic() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-dark-950 via-dark-900 to-dark-950">
      <PublicNav />

      <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green mb-6">
              About OCEAN DeFi
            </h1>
            <p className="text-xl text-cyan-300/90 max-w-3xl mx-auto">
              A revolutionary DeFi ecosystem built on Ramestta Blockchain
            </p>
          </div>

          <div className="space-y-12">
            <div className="cyber-glass border border-cyan-500/30 rounded-2xl p-8 text-white shadow-neon-cyan relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-neon-green/10 opacity-50" />
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
              <h2 className="text-4xl font-bold mb-3 relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green">OCEAN DeFi</h2>
              <p className="text-xl mb-2 relative z-10 text-cyan-300">Decentralized Growth Ecosystem</p>
              <p className="text-lg opacity-90 relative z-10 text-cyan-300/90">Built on Ramestta Blockchain</p>
              <div className="flex gap-4 mt-4 text-sm relative z-10">
                <span className="px-3 py-1 cyber-glass border border-cyan-500/30 rounded-full text-cyan-300">Transparent</span>
                <span className="px-3 py-1 cyber-glass border border-cyan-500/30 rounded-full text-cyan-300">Sustainable</span>
                <span className="px-3 py-1 cyber-glass border border-cyan-500/30 rounded-full text-cyan-300">Validator-Backed</span>
              </div>
            </div>

            <div className="cyber-glass rounded-2xl p-6 border border-cyan-500/30 shadow-neon-cyan relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
              <h2 className="text-2xl font-bold text-cyan-300 mb-4">Vision</h2>
              <p className="text-cyan-400/90 text-lg leading-relaxed">
                "OCEAN DeFi is not just another DeFi project — it's a validator-powered, auto-compounding financial ecosystem designed to create decentralized, transparent, and long-lasting community wealth."
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="cyber-glass rounded-2xl p-6 border border-cyan-500/30 shadow-neon-cyan relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
                <h3 className="text-lg font-semibold text-cyan-300 mb-4 uppercase tracking-wide">0% Trust Policy</h3>
                <div className="space-y-3 text-sm text-cyan-400/90">
                  <p className="font-medium text-cyan-300">Complete Transparency & User Control</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-neon-green mt-0.5">✓</span>
                      <span>Request principal withdrawal anytime</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-neon-green mt-0.5">✓</span>
                      <span>72-hour freeze period (no income during freeze)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-neon-green mt-0.5">✓</span>
                      <span>After 72 hours: 80% refund (20% exit fee)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-neon-green mt-0.5">✓</span>
                      <span>Cancel within 72 hours to resume earning</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-neon-orange mt-0.5">⚠</span>
                      <span>Income lost only during freeze period when cancelled</span>
                    </li>
                  </ul>
                  <p className="text-xs text-cyan-300/90 italic mt-3">
                    "Withdraw anytime with 20% deduction after a 72-hour freeze — or cancel within that time to continue earning."
                  </p>
                </div>
              </div>

              <div className="cyber-glass rounded-2xl p-6 border border-cyan-500/30 shadow-neon-cyan relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
                <h3 className="text-lg font-semibold text-cyan-300 mb-4 uppercase tracking-wide">Sustainability Model</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 cyber-glass border border-cyan-500/30 rounded-lg flex-shrink-0">
                      <Shield className="text-cyan-400" size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-cyan-300">Validator-Based Yield</p>
                      <p className="text-xs text-cyan-300/90">Powers all incomes (no ponzi cycle)</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 cyber-glass border border-neon-green/30 rounded-lg flex-shrink-0">
                      <Zap className="text-neon-green" size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-cyan-300">Daily Auto-Compounding</p>
                      <p className="text-xs text-cyan-300/90">Validator rewards sustain growth</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 cyber-glass border border-neon-orange/30 rounded-lg flex-shrink-0">
                      <Lock className="text-neon-orange" size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-cyan-300">Reserve Vault + Safe Wallet</p>
                      <p className="text-xs text-cyan-300/90">Maintain liquidity</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 cyber-glass border border-neon-purple/30 rounded-lg flex-shrink-0">
                      <DollarSign className="text-neon-purple" size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-cyan-300">Fee Recycling</p>
                      <p className="text-xs text-cyan-300/90">5% claim & 20% exit fees recirculate capital</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 cyber-glass border border-neon-pink/30 rounded-lg flex-shrink-0">
                      <TrendingUp className="text-neon-pink" size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-cyan-300">Balanced System</p>
                      <p className="text-xs text-cyan-300/90">4× cap limit + reactivation keeps system stable</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="cyber-glass rounded-2xl p-6 border border-cyan-500/30 shadow-neon-cyan relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
              <h3 className="text-lg font-semibold text-cyan-300 mb-4 uppercase tracking-wide">Complete Income Structure</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 cyber-glass border border-cyan-500/30 rounded-xl relative overflow-hidden group hover:border-cyan-500/50 transition-all">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="font-semibold text-cyan-300 mb-2 relative z-10">1. Self Income</div>
                  <p className="text-sm text-cyan-400/80 relative z-10">
                    0.33% - 0.40% daily on Tier 1 & 2
                    <br />
                    0.66% - 0.80% with Booster
                    <br />
                    200% or 250% cap
                  </p>
                </div>

                <div className="p-4 cyber-glass border border-neon-green/30 rounded-xl relative overflow-hidden group hover:border-neon-green/50 transition-all">
                  <div className="absolute inset-0 bg-gradient-to-br from-neon-green/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="font-semibold text-neon-green mb-2 relative z-10">2. Booster Income</div>
                  <p className="text-sm text-cyan-400/80 relative z-10">
                    Double daily growth rate
                    <br />
                    5+ directs in 10 days
                    <br />
                    Total ≥ own stake
                  </p>
                </div>

                <div className="p-4 cyber-glass border border-neon-orange/30 rounded-xl relative overflow-hidden group hover:border-neon-orange/50 transition-all">
                  <div className="absolute inset-0 bg-gradient-to-br from-neon-orange/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="font-semibold text-neon-orange mb-2 relative z-10">3. Direct Income</div>
                  <p className="text-sm text-cyan-400/80 relative z-10">
                    5% instant commission
                    <br />
                    On every direct activation
                    <br />
                    Paid in RAMA
                  </p>
                </div>

                <div className="p-4 cyber-glass border border-neon-purple/30 rounded-xl relative overflow-hidden group hover:border-neon-purple/50 transition-all">
                  <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="font-semibold text-neon-purple mb-2 relative z-10">4. Slab Income</div>
                  <p className="text-sm text-cyan-400/80 relative z-10">
                    60% pool distribution
                    <br />
                    11 slab levels (5% - 60%)
                    <br />
                    Difference income model
                  </p>
                </div>

                <div className="p-4 cyber-glass border border-neon-pink/30 rounded-xl relative overflow-hidden group hover:border-neon-pink/50 transition-all">
                  <div className="absolute inset-0 bg-gradient-to-br from-neon-pink/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="font-semibold text-neon-pink mb-2 relative z-10">5. Same-Slab Override</div>
                  <p className="text-sm text-cyan-400/80 relative z-10">
                    10%, 5%, 5% for first 3
                    <br />
                    Same-rank uplines
                    <br />
                    Collaborative bonus
                  </p>
                </div>

                <div className="p-4 cyber-glass border border-cyan-400/30 rounded-xl relative overflow-hidden group hover:border-cyan-400/50 transition-all">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="font-semibold text-cyan-400 mb-2 relative z-10">6. Royalty Program</div>
                  <p className="text-sm text-cyan-400/80 relative z-10">
                    $30 - $100,000 monthly
                    <br />
                    14 levels
                    <br />
                    Life Time
                  </p>
                </div>
              </div>
            </div>

            <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6 shadow-neon-cyan relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-neon-green/5 opacity-50" />
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
              <div className="flex items-start gap-4 relative z-10">
                <Users className="text-cyan-400 flex-shrink-0 mt-1" size={32} />
                <div>
                  <h4 className="text-xl font-bold text-cyan-300 mb-3">Core Philosophy</h4>
                  <p className="text-cyan-400/90 mb-4">
                    OCEAN DeFi combines the security of blockchain validators with the power of network effects. Every income stream is backed by real validator yield from the Ramestta network, ensuring sustainability without relying on new user deposits.
                  </p>
                  <div className="grid md:grid-cols-3 gap-4 mt-4">
                    <div className="p-3 cyber-glass border border-cyan-500/30 rounded-lg">
                      <p className="text-xs text-cyan-300/90 mb-1">Validator APY</p>
                      <p className="text-lg font-bold text-cyan-300">5-8.4%</p>
                    </div>
                    <div className="p-3 cyber-glass border border-neon-green/30 rounded-lg">
                      <p className="text-xs text-neon-green/70 mb-1">Smart Contract</p>
                      <p className="text-lg font-bold text-neon-green">Audited</p>
                    </div>
                    <div className="p-3 cyber-glass border border-neon-orange/30 rounded-lg">
                      <p className="text-xs text-neon-orange/70 mb-1">Transparency</p>
                      <p className="text-lg font-bold text-neon-orange">100%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="cyber-glass border-2 border-cyan-500 rounded-3xl p-12 text-center hover-glow-cyan">
              <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green mb-4">
                Ready to Join OCEAN DeFi?
              </h2>
              <p className="text-xl text-cyan-300/90 mb-8 max-w-2xl mx-auto">
                Start your journey towards financial freedom with validator-backed sustainable income
              </p>
              <div className="flex justify-center">
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
