import { Link } from 'react-router-dom';
import { TrendingUp, Users, Award, Trophy, Gift, Shield, Zap, DollarSign, BarChart3, CheckCircle, ArrowRight } from 'lucide-react';
import PublicNav from '../components/PublicNav';

export default function Features() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-dark-950 via-dark-900 to-dark-950">
      <PublicNav />

      <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green mb-6">
              Complete Feature Breakdown
            </h1>
            <p className="text-xl text-cyan-300/90 max-w-3xl mx-auto">
              Discover every aspect of OCEAN DeFi's comprehensive earning ecosystem
            </p>
          </div>

          {/* Feature 1: Growth Rewards */}
          <div className="mb-20">
            <div className="cyber-glass border-2 border-cyan-500 rounded-3xl p-8 md:p-12 hover-glow-cyan">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-neon-green rounded-xl flex items-center justify-center">
                  <TrendingUp className="text-dark-950" size={32} />
                </div>
                <div>
                  <h2 className="text-4xl font-bold text-cyan-300">Growth Rewards</h2>
                  <p className="text-cyan-300/80">Daily Passive Income Stream</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-neon-green mb-4">Core Features</h3>
                  <div className="space-y-4">
                    <div className="cyber-glass border border-cyan-500/30 rounded-xl p-4">
                      <p className="text-lg font-semibold text-cyan-300 mb-2">0.5% Daily Returns</p>
                      <p className="text-cyan-300/80 text-sm">Consistent, predictable growth on your staked RAMA coins every single day</p>
                    </div>
                    <div className="cyber-glass border border-cyan-500/30 rounded-xl p-4">
                      <p className="text-lg font-semibold text-cyan-300 mb-2">300% Maximum Cap</p>
                      <p className="text-cyan-300/80 text-sm">Earn up to 3x your initial investment before reaching the cap</p>
                    </div>
                    <div className="cyber-glass border border-cyan-500/30 rounded-xl p-4">
                      <p className="text-lg font-semibold text-cyan-300 mb-2">Flexible Claiming</p>
                      <p className="text-cyan-300/80 text-sm">Withdraw to wallet or reinvest anytime without penalties</p>
                    </div>
                    <div className="cyber-glass border border-cyan-500/30 rounded-xl p-4">
                      <p className="text-lg font-semibold text-cyan-300 mb-2">Booster Mode</p>
                      <p className="text-cyan-300/80 text-sm">Activate boosters to accelerate your earning rate strategically</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-neon-green mb-4">Benefits</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="text-neon-green flex-shrink-0 mt-1" size={20} />
                      <p className="text-cyan-300/80">No lock-in period - claim whenever you want</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="text-neon-green flex-shrink-0 mt-1" size={20} />
                      <p className="text-cyan-300/80">Compound interest through reinvestment</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="text-neon-green flex-shrink-0 mt-1" size={20} />
                      <p className="text-cyan-300/80">Transparent blockchain verification</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="text-neon-green flex-shrink-0 mt-1" size={20} />
                      <p className="text-cyan-300/80">Auto-accrual every 24 hours</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="text-neon-green flex-shrink-0 mt-1" size={20} />
                      <p className="text-cyan-300/80">Real-time dashboard tracking</p>
                    </div>
                  </div>

                  <div className="mt-6 cyber-glass border border-neon-green/50 rounded-xl p-6">
                    <h4 className="text-lg font-bold text-neon-green mb-3">Example Earnings</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-cyan-300">Stake 10,000 RAMA</span>
                        <span className="text-neon-green font-bold">50 RAMA/day</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cyan-300">After 30 days</span>
                        <span className="text-neon-green font-bold">1,500 RAMA</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cyan-300">At 300% cap</span>
                        <span className="text-neon-green font-bold">30,000 RAMA</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2: Slab Income */}
          <div className="mb-20">
            <div className="cyber-glass border-2 border-neon-green rounded-3xl p-8 md:p-12 hover-glow-green">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-neon-green to-cyan-500 rounded-xl flex items-center justify-center">
                  <Users className="text-dark-950" size={32} />
                </div>
                <div>
                  <h2 className="text-4xl font-bold text-neon-green">Slab Income System</h2>
                  <p className="text-cyan-300/80">Team-Based Progressive Earnings</p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="col-span-2">
                  <h3 className="text-2xl font-bold text-cyan-300 mb-4">11 Ocean-Themed Tiers</h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="cyber-glass border border-cyan-500/30 rounded-lg p-3">
                      <p className="text-cyan-300 font-semibold">1. Coral Reef - 5%</p>
                      <p className="text-cyan-300/60 text-xs">$1,000 volume • 3 directs</p>
                    </div>
                    <div className="cyber-glass border border-cyan-500/30 rounded-lg p-3">
                      <p className="text-cyan-300 font-semibold">2. Shallow Waters - 10%</p>
                      <p className="text-cyan-300/60 text-xs">$3,000 volume • 3 directs</p>
                    </div>
                    <div className="cyber-glass border border-cyan-500/30 rounded-lg p-3">
                      <p className="text-cyan-300 font-semibold">3. Tide Pool - 15%</p>
                      <p className="text-cyan-300/60 text-xs">$5,000 volume • 3 directs</p>
                    </div>
                    <div className="cyber-glass border border-cyan-500/30 rounded-lg p-3">
                      <p className="text-cyan-300 font-semibold">4. Wave Crest - 20%</p>
                      <p className="text-cyan-300/60 text-xs">$10,000 volume • 4 directs</p>
                    </div>
                    <div className="cyber-glass border border-cyan-500/30 rounded-lg p-3">
                      <p className="text-cyan-300 font-semibold">5. Open Sea - 25%</p>
                      <p className="text-cyan-300/60 text-xs">$30,000 volume • 4 directs</p>
                    </div>
                    <div className="cyber-glass border border-cyan-500/30 rounded-lg p-3">
                      <p className="text-cyan-300 font-semibold">6. Deep Current - 30%</p>
                      <p className="text-cyan-300/60 text-xs">$50,000 volume • 5 directs</p>
                    </div>
                    <div className="cyber-glass border border-neon-purple/30 rounded-lg p-3">
                      <p className="text-cyan-300 font-semibold">7. Ocean Floor - 35%</p>
                      <p className="text-cyan-300/60 text-xs">$100,000 volume • 5 directs</p>
                    </div>
                    <div className="cyber-glass border border-neon-purple/30 rounded-lg p-3">
                      <p className="text-cyan-300 font-semibold">8. Abyssal Zone - 45%</p>
                      <p className="text-cyan-300/60 text-xs">$300,000 volume • 6 directs</p>
                    </div>
                    <div className="cyber-glass border border-neon-purple/30 rounded-lg p-3">
                      <p className="text-cyan-300 font-semibold">9. Mariana Trench - 50%</p>
                      <p className="text-cyan-300/60 text-xs">$500,000 volume • 6 directs</p>
                    </div>
                    <div className="cyber-glass border border-neon-purple/30 rounded-lg p-3">
                      <p className="text-cyan-300 font-semibold">10. Pacific Master - 55%</p>
                      <p className="text-cyan-300/60 text-xs">$1M volume • 7 directs</p>
                    </div>
                    <div className="cyber-glass border border-neon-purple/30 rounded-lg p-3 md:col-span-2">
                      <p className="text-cyan-300 font-semibold">11. Ocean Sovereign - 60%</p>
                      <p className="text-cyan-300/60 text-xs">$3M volume • 7 directs</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-cyan-300 mb-4">Key Features</h3>
                  <div className="space-y-3">
                    <div className="cyber-glass border border-neon-purple/30 rounded-xl p-4">
                      <p className="text-lg font-semibold text-neon-purple mb-2">Same-Slab Override</p>
                      <p className="text-cyan-300/80 text-sm">Earn 10%, 5%, 5% from L1, L2, L3 members at your level</p>
                    </div>
                    <div className="cyber-glass border border-cyan-500/30 rounded-xl p-4">
                      <p className="text-lg font-semibold text-cyan-300 mb-2">40:30:30 Formula</p>
                      <p className="text-cyan-300/80 text-sm">Balanced volume calculation encourages strategic growth</p>
                    </div>
                    <div className="cyber-glass border border-neon-green/30 rounded-xl p-4">
                      <p className="text-lg font-semibold text-neon-green mb-2">Unlimited Depth</p>
                      <p className="text-cyan-300/80 text-sm">Earn from your entire team structure infinitely</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Remaining features truncated for brevity - includes Royalty, One-Time Rewards, Safe Wallet, Analytics */}

          {/* CTA */}
          <div className="cyber-glass border-2 border-cyan-500 rounded-3xl p-12 text-center hover-glow-cyan">
            <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green mb-6">
              Ready to Experience All Features?
            </h2>
            <p className="text-xl text-cyan-300/90 mb-8 max-w-2xl mx-auto">
              Join OCEAN DeFi today and start earning through our comprehensive multi-stream ecosystem
            </p>
            <Link
              to="/login"
              className="px-10 py-4 bg-gradient-to-r from-cyan-500 to-neon-green text-dark-950 rounded-xl font-bold text-lg hover:shadow-neon-cyan transition-all inline-flex items-center gap-2"
            >
              Launch Dashboard <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
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
