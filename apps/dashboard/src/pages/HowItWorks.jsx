import { Link } from 'react-router-dom';
import { TrendingUp, Users, Award, Trophy, Gift, Shield, Zap, ChevronRight, CheckCircle } from 'lucide-react';
import PublicNav from '../components/PublicNav';

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-dark-950 via-dark-900 to-dark-950">
      <PublicNav />

      <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green mb-6">
              How OCEAN DeFi Works
            </h1>
            <p className="text-xl text-cyan-300/90 max-w-3xl mx-auto">
              A comprehensive guide to earning through our multi-stream reward ecosystem
            </p>
          </div>

          {/* Income Streams */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold text-cyan-300 mb-8 text-center">Four Income Streams</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="cyber-glass border-2 border-cyan-500 rounded-2xl p-8 hover-glow-cyan">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-neon-green rounded-xl flex items-center justify-center">
                    <TrendingUp className="text-dark-950" size={24} />
                  </div>
                  <h3 className="text-2xl font-bold text-cyan-300">1. Growth Rewards</h3>
                </div>
                <div className="space-y-4">
                  <p className="text-cyan-300/80">
                    Earn 0.33-0.80% daily on your staked amount, accruing consistently until you reach your portfolio cap of 200% (normal) or 250% (booster) including principal.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={16} />
                      <span className="text-cyan-300/80 text-sm">Daily accrual at 0.33-0.80% rate</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={16} />
                      <span className="text-cyan-300/80 text-sm">Claim to Main Wallet (5% fee) or Safe Wallet (0% fee)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={16} />
                      <span className="text-cyan-300/80 text-sm">Cap includes principal investment</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={16} />
                      <span className="text-cyan-300/80 text-sm">Booster mode for accelerated growth</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="cyber-glass border-2 border-neon-green rounded-2xl p-8 hover-glow-green">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-neon-green to-cyan-500 rounded-xl flex items-center justify-center">
                    <Users className="text-dark-950" size={24} />
                  </div>
                  <h3 className="text-2xl font-bold text-neon-green">2. Slab Income</h3>
                </div>
                <div className="space-y-4">
                  <p className="text-cyan-300/80">
                    Earn the percentage difference between your slab level and your team members' levels. Progress through 11 ocean-themed tiers.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={16} />
                      <span className="text-cyan-300/80 text-sm">Earn 5% to 60% based on level difference</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={16} />
                      <span className="text-cyan-300/80 text-sm">Same-slab override bonuses (10%, 5%, 5%)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={16} />
                      <span className="text-cyan-300/80 text-sm">11 progressive tiers from Coral Reef to Ocean Sovereign</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={16} />
                      <span className="text-cyan-300/80 text-sm">Qualified volume calculated using 40:30:30 formula</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="cyber-glass border-2 border-neon-purple rounded-2xl p-8 hover-glow-purple">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-neon-purple to-cyan-500 rounded-xl flex items-center justify-center">
                    <Trophy className="text-dark-950" size={24} />
                  </div>
                  <h3 className="text-2xl font-bold text-neon-purple">3. Royalty Program</h3>
                </div>
                <div className="space-y-4">
                  <p className="text-cyan-300/80">
                    Monthly recurring payments for LifeTime based on team volume. From Coral Starter ($30/mo) to Ocean Supreme ($100,000/mo).
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={16} />
                      <span className="text-cyan-300/80 text-sm">14 progressive royalty tiers</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={16} />
                      <span className="text-cyan-300/80 text-sm">Monthly payments for up to LifeTime</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={16} />
                      <span className="text-cyan-300/80 text-sm">10% growth renewal every 2 months</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={16} />
                      <span className="text-cyan-300/80 text-sm">Claim to Main Wallet (5% fee) or Safe Wallet (0% fee)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="cyber-glass border-2 border-neon-orange rounded-2xl p-8 hover-glow-orange">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-neon-orange to-cyan-500 rounded-xl flex items-center justify-center">
                    <Gift className="text-dark-950" size={24} />
                  </div>
                  <h3 className="text-2xl font-bold text-neon-orange">4. One-Time Rewards</h3>
                </div>
                <div className="space-y-4">
                  <p className="text-cyan-300/80">
                    Achievement bonuses paid instantly when you reach volume milestones. 14 rewards from Coral Spark ($100) to Ocean Infinity ($1.5M).
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={16} />
                      <span className="text-cyan-300/80 text-sm">14 milestone achievements</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={16} />
                      <span className="text-cyan-300/80 text-sm">Instant one-time bonus payments</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={16} />
                      <span className="text-cyan-300/80 text-sm">Based on qualified team volume</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={16} />
                      <span className="text-cyan-300/80 text-sm">Claim to Main Wallet or Safe Wallet</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Getting Started */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold text-cyan-300 mb-8 text-center">Getting Started</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="cyber-glass border-2 border-cyan-500 rounded-2xl p-6 text-center hover-glow-cyan">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-neon-green rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-dark-950">
                  1
                </div>
                <h3 className="text-xl font-bold text-cyan-300 mb-3">Connect Wallet</h3>
                <p className="text-cyan-300/80 text-sm">
                  Use your Web3 wallet or member ID to access the platform securely
                </p>
              </div>

              <div className="cyber-glass border-2 border-neon-green rounded-2xl p-6 text-center hover-glow-green">
                <div className="w-16 h-16 bg-gradient-to-br from-neon-green to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-dark-950">
                  2
                </div>
                <h3 className="text-xl font-bold text-neon-green mb-3">Stake RAMA Coins</h3>
                <p className="text-cyan-300/80 text-sm">
                  Choose your investment amount and start earning immediately with multiple streams
                </p>
              </div>

              <div className="cyber-glass border-2 border-neon-purple rounded-2xl p-6 text-center hover-glow-purple">
                <div className="w-16 h-16 bg-gradient-to-br from-neon-purple to-neon-orange rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-dark-950">
                  3
                </div>
                <h3 className="text-xl font-bold text-neon-purple mb-3">Build & Earn</h3>
                <p className="text-cyan-300/80 text-sm">
                  Grow your team, unlock tiers, and maximize passive income across all streams
                </p>
              </div>
            </div>
          </div>

          {/* Key Features */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold text-cyan-300 mb-8 text-center">Key Features</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="cyber-glass border-2 border-cyan-500 rounded-xl p-6 hover-glow-cyan">
                <div className="flex items-start gap-4">
                  <Shield className="text-cyan-400 flex-shrink-0 mt-1" size={24} />
                  <div>
                    <h3 className="text-lg font-bold text-cyan-300 mb-2">Safe Wallet System</h3>
                    <p className="text-cyan-300/80 text-sm">
                      Secure, fee-free storage for royalty payments and milestone rewards. Withdraw anytime without transaction fees.
                    </p>
                  </div>
                </div>
              </div>

              <div className="cyber-glass border-2 border-neon-green rounded-xl p-6 hover-glow-green">
                <div className="flex items-start gap-4">
                  <Zap className="text-neon-green flex-shrink-0 mt-1" size={24} />
                  <div>
                    <h3 className="text-lg font-bold text-neon-green mb-2">Booster Mode</h3>
                    <p className="text-cyan-300/80 text-sm">
                      Accelerate your growth rewards by activating booster mode. Increase your earning potential strategically.
                    </p>
                  </div>
                </div>
              </div>

              <div className="cyber-glass border-2 border-neon-purple rounded-xl p-6 hover-glow-purple">
                <div className="flex items-start gap-4">
                  <Users className="text-neon-purple flex-shrink-0 mt-1" size={24} />
                  <div>
                    <h3 className="text-lg font-bold text-neon-purple mb-2">Team Analytics</h3>
                    <p className="text-cyan-300/80 text-sm">
                      Real-time visualization of your network, performance tracking, and earning insights across 3 levels.
                    </p>
                  </div>
                </div>
              </div>

              <div className="cyber-glass border-2 border-neon-orange rounded-xl p-6 hover-glow-orange">
                <div className="flex items-start gap-4">
                  <Award className="text-neon-orange flex-shrink-0 mt-1" size={24} />
                  <div>
                    <h3 className="text-lg font-bold text-neon-orange mb-2">40:30:30 Formula</h3>
                    <p className="text-cyan-300/80 text-sm">
                      Qualified volume calculated using balanced formula: 40% from strongest leg, 30% and 30% from other legs.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="cyber-glass border-2 border-cyan-500 rounded-3xl p-12 text-center hover-glow-cyan">
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green mb-4">
              Ready to Start Earning?
            </h2>
            <p className="text-xl text-cyan-300/90 mb-8 max-w-2xl mx-auto">
              Join the OCEAN DeFi ecosystem and start building your passive income streams today
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/login"
                className="px-10 py-4 bg-gradient-to-r from-cyan-500 to-neon-green text-dark-950 rounded-xl font-bold text-lg hover:shadow-neon-cyan transition-all inline-flex items-center justify-center gap-2"
              >
                Launch Dashboard <ChevronRight size={20} />
              </Link>
            </div>
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
