import { Link } from 'react-router-dom';
import { Coins, Building2, CreditCard, Smartphone, Blocks, TrendingUp, ArrowRight, CheckCircle } from 'lucide-react';
import PublicNav from '../components/PublicNav';

export default function MoneyRevolution() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-dark-950 via-dark-900 to-dark-950">
      <PublicNav />

      <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green mb-6">
              Money Revolution
            </h1>
            <p className="text-xl text-cyan-300/90 max-w-3xl mx-auto">
              The evolution of money from barter systems to blockchain technology
            </p>
          </div>

          <div className="space-y-12">
            <div className="cyber-glass border-2 border-cyan-500 rounded-3xl p-8 md:p-12 hover-glow-cyan">
              <h2 className="text-4xl font-bold text-cyan-300 mb-8">The Journey of Money</h2>
              <p className="text-lg text-cyan-300/90 mb-8 leading-relaxed">
                Money has evolved dramatically throughout human history, from simple bartering to sophisticated digital currencies. Understanding this evolution helps us appreciate why blockchain and DeFi represent the next revolutionary step in financial systems.
              </p>

              <div className="space-y-8">
                <div className="cyber-glass border-2 border-neon-orange rounded-xl p-6 hover-glow-orange">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-neon-orange to-red-500 rounded-full flex items-center justify-center text-dark-950 font-bold text-2xl">
                      1
                    </div>
                    <h3 className="text-2xl font-bold text-neon-orange">Barter System (Prehistoric - 3000 BC)</h3>
                  </div>
                  <p className="text-cyan-300/90 mb-4 leading-relaxed">
                    The earliest form of trade involved direct exchange of goods and services. A farmer might trade wheat for a craftsman's pottery.
                  </p>
                  <div className="cyber-glass border border-red-500/30 rounded-lg p-4">
                    <p className="text-sm font-semibold text-cyan-300 mb-2">Limitations:</p>
                    <ul className="space-y-2 text-sm text-cyan-300/80">
                      <li className="flex items-start gap-2">
                        <span className="text-red-400 mt-1">✗</span>
                        <span>Double coincidence of wants required (both parties must want what the other has)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-400 mt-1">✗</span>
                        <span>Difficulty storing value (perishable goods)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-400 mt-1">✗</span>
                        <span>Lack of divisibility (can't split a cow)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-400 mt-1">✗</span>
                        <span>No standard measure of value</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="cyber-glass border-2 border-neon-yellow rounded-xl p-6 hover-glow-yellow">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-neon-orange rounded-full flex items-center justify-center text-dark-950 font-bold text-2xl">
                      2
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-yellow-400">Commodity Money (3000 BC - 600 BC)</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <Coins className="text-yellow-400" size={32} />
                    <p className="text-cyan-300/90 leading-relaxed">
                      Societies began using valuable commodities as mediums of exchange: shells, salt, tea, livestock, and precious metals.
                    </p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="cyber-glass border border-neon-green/30 rounded-lg p-4">
                      <p className="text-sm font-semibold text-neon-green mb-2">Advantages:</p>
                      <ul className="space-y-1 text-sm text-cyan-300/80">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={14} />
                          <span>Intrinsic value</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={14} />
                          <span>Widely recognized</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={14} />
                          <span>Durable (metals)</span>
                        </li>
                      </ul>
                    </div>
                    <div className="cyber-glass border border-red-500/30 rounded-lg p-4">
                      <p className="text-sm font-semibold text-red-400 mb-2">Limitations:</p>
                      <ul className="space-y-1 text-sm text-cyan-300/80">
                        <li className="flex items-start gap-2">
                          <span className="text-red-400 mt-1">✗</span>
                          <span>Heavy to transport</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-red-400 mt-1">✗</span>
                          <span>Difficult to divide</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-red-400 mt-1">✗</span>
                          <span>Security concerns</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="cyber-glass border-2 border-cyan-500 rounded-xl p-6 hover-glow-cyan">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-dark-950 font-bold text-2xl">
                      3
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-cyan-400">Metallic Coins (600 BC - 1000 AD)</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <Coins className="text-cyan-400" size={32} />
                    <p className="text-cyan-300/90 leading-relaxed">
                      The first standardized coins were minted in ancient Lydia (modern-day Turkey). Gold and silver coins became the standard for centuries.
                    </p>
                  </div>
                  <div className="cyber-glass border border-cyan-500/30 rounded-lg p-4">
                    <p className="text-sm font-semibold text-cyan-300 mb-2">Key Innovations:</p>
                    <ul className="space-y-2 text-sm text-cyan-300/80">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={14} />
                        <span>Standardized weight and purity</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={14} />
                        <span>Government backing and authentication</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={14} />
                        <span>Portable and durable</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={14} />
                        <span>Easily divisible into smaller denominations</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="cyber-glass border-2 border-neon-green rounded-xl p-6 hover-glow-green">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-neon-green to-emerald-500 rounded-full flex items-center justify-center text-dark-950 font-bold text-2xl">
                      4
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-neon-green">Paper Money (1000 AD - 1900s)</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <Building2 className="text-neon-green" size={32} />
                    <p className="text-cyan-300/90 leading-relaxed">
                      China introduced paper money during the Tang Dynasty. Later, European banks issued banknotes as promissory notes backed by gold reserves.
                    </p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="cyber-glass border border-neon-green/30 rounded-lg p-4">
                      <p className="text-sm font-semibold text-neon-green mb-2">Revolution:</p>
                      <ul className="space-y-2 text-sm text-cyan-300/80">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={14} />
                          <span>Lightweight and easy to carry</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={14} />
                          <span>Eliminated need to transport heavy metals</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={14} />
                          <span>Facilitated international trade</span>
                        </li>
                      </ul>
                    </div>
                    <div className="cyber-glass border border-red-500/30 rounded-lg p-4">
                      <p className="text-sm font-semibold text-red-400 mb-2">New Challenges:</p>
                      <ul className="space-y-2 text-sm text-cyan-300/80">
                        <li className="flex items-start gap-2">
                          <span className="text-red-400 mt-1">✗</span>
                          <span>Counterfeiting risks</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-red-400 mt-1">✗</span>
                          <span>Required trust in issuing authority</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-red-400 mt-1">✗</span>
                          <span>Inflation through over-printing</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="cyber-glass border-2 border-neon-purple rounded-xl p-6 hover-glow-purple">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-neon-purple to-pink-500 rounded-full flex items-center justify-center text-dark-950 font-bold text-2xl">
                      5
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-neon-purple">Digital Banking (1950s - 2000s)</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <CreditCard className="text-neon-purple" size={32} />
                    <p className="text-cyan-300/90 leading-relaxed">
                      Credit cards, ATMs, online banking, and digital payments transformed how we interact with money. Most money became digital entries in bank databases.
                    </p>
                  </div>
                  <div className="cyber-glass border border-neon-purple/30 rounded-lg p-4 mb-4">
                    <p className="text-sm font-semibold text-neon-purple mb-2">Digital Era Benefits:</p>
                    <ul className="space-y-2 text-sm text-cyan-300/80">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={14} />
                        <span>Instant transactions globally</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={14} />
                        <span>Convenient online shopping</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={14} />
                        <span>Automated bill payments</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={14} />
                        <span>Reduced need for physical cash</span>
                      </li>
                    </ul>
                  </div>
                  <div className="cyber-glass border border-red-500/30 rounded-lg p-4">
                    <p className="text-sm font-semibold text-red-400 mb-2">Critical Problems:</p>
                    <ul className="space-y-2 text-sm text-cyan-300/80">
                      <li className="flex items-start gap-2">
                        <span className="text-red-400 mt-1">✗</span>
                        <span>Banks control your money completely</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-400 mt-1">✗</span>
                        <span>High fees for international transfers</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-400 mt-1">✗</span>
                        <span>Accounts can be frozen or restricted</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-400 mt-1">✗</span>
                        <span>Privacy concerns with transaction tracking</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-400 mt-1">✗</span>
                        <span>Excluded 1.7 billion unbanked people worldwide</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-400 mt-1">✗</span>
                        <span>Vulnerable to bank failures and bailouts</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="cyber-glass border-2 border-neon-green rounded-xl p-6 hover-glow-green relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-neon-green/10 animate-pulse" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-neon-green rounded-full flex items-center justify-center text-dark-950 font-bold text-2xl shadow-neon-cyan animate-glow-pulse">
                        6
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green">Cryptocurrency & Blockchain (2009 - Present)</h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mb-6">
                      <Blocks className="text-cyan-400" size={40} />
                      <p className="text-lg text-cyan-300/90 leading-relaxed font-medium">
                        Bitcoin launched in 2009 as the first decentralized digital currency. Blockchain technology enables peer-to-peer transactions without intermediaries.
                      </p>
                    </div>
                    <div className="cyber-glass border-2 border-neon-green rounded-lg p-6 mb-4">
                      <p className="text-base font-semibold text-neon-green mb-4">The Paradigm Shift:</p>
                      <ul className="space-y-3 text-sm text-cyan-300/90">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                          <span><strong className="text-cyan-300">True Ownership:</strong> You control your assets with private keys, no bank can freeze your account</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                          <span><strong className="text-cyan-300">Borderless:</strong> Send money anywhere instantly with minimal fees</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                          <span><strong className="text-cyan-300">Transparent:</strong> All transactions recorded on public blockchain, fully auditable</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                          <span><strong className="text-cyan-300">Programmable:</strong> Smart contracts enable automated, trustless agreements</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                          <span><strong className="text-cyan-300">Inclusive:</strong> Anyone with internet access can participate</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                          <span><strong className="text-cyan-300">Deflationary:</strong> Fixed supply prevents inflation (e.g., Bitcoin 21M, RAMA 1B)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                          <span><strong className="text-cyan-300">Decentralized:</strong> No single point of failure or control</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="cyber-glass border-2 border-cyan-500 rounded-xl p-6 hover-glow-cyan relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-neon-green/5" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-neon-green rounded-full flex items-center justify-center text-dark-950 font-bold text-2xl shadow-neon-cyan">
                        7
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green">DeFi - The Future of Finance (2020 - Present)</h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mb-6">
                      <TrendingUp className="text-neon-green" size={40} />
                      <p className="text-lg text-cyan-300/90 leading-relaxed font-medium">
                        Decentralized Finance (DeFi) takes blockchain to the next level by recreating traditional financial services without intermediaries. OCEAN DeFi represents the cutting edge of this revolution.
                      </p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                      <div className="cyber-glass border border-cyan-500/30 rounded-lg p-4">
                        <h4 className="text-lg font-bold text-cyan-300 mb-3">What DeFi Enables:</h4>
                        <ul className="space-y-2 text-sm text-cyan-300/80">
                          <li className="flex items-start gap-2">
                            <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={14} />
                            <span>Staking and yield farming</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={14} />
                            <span>Lending and borrowing</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={14} />
                            <span>Decentralized exchanges</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={14} />
                            <span>Automated market making</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={14} />
                            <span>Community governance</span>
                          </li>
                        </ul>
                      </div>
                      <div className="cyber-glass border border-neon-green/30 rounded-lg p-4">
                        <h4 className="text-lg font-bold text-neon-green mb-3">OCEAN DeFi Advantages:</h4>
                        <ul className="space-y-2 text-sm text-cyan-300/80">
                          <li className="flex items-start gap-2">
                            <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={14} />
                            <span>Validator-backed sustainability</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={14} />
                            <span>Multiple income streams (6 types)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={14} />
                            <span>Auto-compounding daily</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={14} />
                            <span>0% Trust Policy (withdraw anytime)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={14} />
                            <span>Built on Ramestta (Layer 3)</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                    <div className="cyber-glass border-2 border-neon-green rounded-lg p-6 bg-gradient-to-br from-neon-green/5 to-cyan-500/5">
                      <p className="text-base text-cyan-300 leading-relaxed">
                        <strong className="text-neon-green">OCEAN DeFi</strong> combines the best of blockchain technology with real-world validator income, creating a sustainable ecosystem where your stake generates actual returns from network security operations. This is the future of finance: transparent, decentralized, and accessible to everyone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="cyber-glass border-2 border-cyan-500 rounded-3xl p-12 text-center hover-glow-cyan">
              <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green mb-4">
                Ready to Join the Revolution?
              </h2>
              <p className="text-xl text-cyan-300/90 mb-8 max-w-2xl mx-auto">
                Continue your journey and learn about the technology powering OCEAN DeFi
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/blockchain-basics"
                  className="px-8 py-4 cyber-glass border-2 border-cyan-500 text-cyan-300 rounded-xl font-bold text-lg hover-glow-cyan transition-all inline-flex items-center justify-center gap-2"
                >
                  Next: Blockchain Basics
                </Link>
                <Link
                  to="/login"
                  className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-neon-green text-dark-950 rounded-xl font-bold text-lg hover:shadow-neon-cyan transition-all inline-flex items-center justify-center gap-2"
                >
                  Start Earning <ArrowRight size={20} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
