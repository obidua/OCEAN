import { Link } from 'react-router-dom';
import { FileText, Zap, Shield, Users, TrendingUp, ArrowRight, CheckCircle, Code, Lock, AlertCircle } from 'lucide-react';
import PublicNav from '../components/PublicNav';

export default function SmartContracts() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-dark-950 via-dark-900 to-dark-950">
      <PublicNav />

      <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green mb-6">
              Smart Contracts Explained
            </h1>
            <p className="text-xl text-cyan-300/90 max-w-3xl mx-auto">
              Self-executing digital agreements that power decentralized applications and OCEAN DeFi
            </p>
          </div>

          <div className="space-y-12">
            <div className="cyber-glass border-2 border-cyan-500 rounded-3xl p-8 md:p-12 hover-glow-cyan">
              <div className="flex items-center gap-4 mb-8">
                <Code className="text-cyan-400" size={48} />
                <h2 className="text-4xl font-bold text-cyan-300">What is a Smart Contract?</h2>
              </div>

              <p className="text-lg text-cyan-300/90 mb-6 leading-relaxed">
                A <strong className="text-neon-green">smart contract</strong> is a self-executing program stored on a blockchain that automatically enforces the terms of an agreement when predefined conditions are met. Think of it as a digital vending machine: you put in money, select your item, and the machine automatically delivers it without needing a human intermediary.
              </p>

              <div className="cyber-glass border border-neon-purple/50 rounded-xl p-6 mb-6">
                <p className="text-base text-cyan-300 mb-4">
                  <strong className="text-neon-purple">Key Concept:</strong> Smart contracts eliminate the need for middlemen by encoding rules and consequences directly into code that executes automatically on the blockchain.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <Zap className="text-cyan-400 mb-4" size={32} />
                  <h3 className="text-xl font-bold text-cyan-300 mb-3">Automatic</h3>
                  <p className="text-cyan-300/80 text-sm">Executes automatically when conditions are met, no human intervention required</p>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <Shield className="text-neon-green mb-4" size={32} />
                  <h3 className="text-xl font-bold text-neon-green mb-3">Trustless</h3>
                  <p className="text-cyan-300/80 text-sm">No need to trust a third party; code guarantees execution</p>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <Lock className="text-neon-purple mb-4" size={32} />
                  <h3 className="text-xl font-bold text-neon-purple mb-3">Immutable</h3>
                  <p className="text-cyan-300/80 text-sm">Once deployed, the contract cannot be altered or tampered with</p>
                </div>
              </div>
            </div>

            <div className="cyber-glass border-2 border-neon-green rounded-3xl p-8 md:p-12 hover-glow-green">
              <h2 className="text-4xl font-bold text-neon-green mb-8">Traditional Contracts vs Smart Contracts</h2>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="cyber-glass border border-red-500/30 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <FileText className="text-red-400" size={32} />
                    <h3 className="text-2xl font-bold text-red-400">Traditional Contracts</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-red-400 mt-1">✗</span>
                      <p className="text-cyan-300/80 text-sm">Written in legal language, difficult to understand</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-red-400 mt-1">✗</span>
                      <p className="text-cyan-300/80 text-sm">Require lawyers, notaries, and other intermediaries</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-red-400 mt-1">✗</span>
                      <p className="text-cyan-300/80 text-sm">Manual enforcement through courts if disputes arise</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-red-400 mt-1">✗</span>
                      <p className="text-cyan-300/80 text-sm">Can take weeks or months to execute</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-red-400 mt-1">✗</span>
                      <p className="text-cyan-300/80 text-sm">Expensive fees for intermediaries</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-red-400 mt-1">✗</span>
                      <p className="text-cyan-300/80 text-sm">Subject to human error and interpretation</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-red-400 mt-1">✗</span>
                      <p className="text-cyan-300/80 text-sm">Can be disputed or broken</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-red-400 mt-1">✗</span>
                      <p className="text-cyan-300/80 text-sm">Limited transparency</p>
                    </div>
                  </div>
                </div>

                <div className="cyber-glass border border-neon-green/30 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Code className="text-neon-green" size={32} />
                    <h3 className="text-2xl font-bold text-neon-green">Smart Contracts</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                      <p className="text-cyan-300/80 text-sm">Written in code, logic is crystal clear</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                      <p className="text-cyan-300/80 text-sm">No intermediaries needed, peer-to-peer</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                      <p className="text-cyan-300/80 text-sm">Self-enforcing, automatic execution</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                      <p className="text-cyan-300/80 text-sm">Execute in seconds or minutes</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                      <p className="text-cyan-300/80 text-sm">Minimal transaction fees</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                      <p className="text-cyan-300/80 text-sm">Deterministic, no ambiguity in execution</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                      <p className="text-cyan-300/80 text-sm">Cannot be broken or reneged</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                      <p className="text-cyan-300/80 text-sm">Fully transparent and auditable</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="cyber-glass border-2 border-neon-purple rounded-3xl p-8 md:p-12 hover-glow-purple">
              <h2 className="text-4xl font-bold text-neon-purple mb-8">How Smart Contracts Work</h2>

              <div className="space-y-6">
                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-neon-green rounded-full flex items-center justify-center flex-shrink-0 text-dark-950 font-bold text-xl">
                      1
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-cyan-300 mb-2">Agreement Terms Defined</h3>
                      <p className="text-cyan-300/80">Parties agree on conditions and outcomes. For example: "If User stakes 1000 RAMA, then they receive 0.33% daily growth."</p>
                    </div>
                  </div>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-neon-green rounded-full flex items-center justify-center flex-shrink-0 text-dark-950 font-bold text-xl">
                      2
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-cyan-300 mb-2">Code is Written</h3>
                      <p className="text-cyan-300/80">Developers translate the agreement into programming code using languages like Solidity. The logic and rules are encoded precisely.</p>
                    </div>
                  </div>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-neon-green rounded-full flex items-center justify-center flex-shrink-0 text-dark-950 font-bold text-xl">
                      3
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-cyan-300 mb-2">Deployed to Blockchain</h3>
                      <p className="text-cyan-300/80">The smart contract is deployed to the blockchain (like Ramestta). It receives a unique address and becomes publicly accessible.</p>
                    </div>
                  </div>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-neon-green rounded-full flex items-center justify-center flex-shrink-0 text-dark-950 font-bold text-xl">
                      4
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-cyan-300 mb-2">Triggered by Events</h3>
                      <p className="text-cyan-300/80">When specific conditions are met (user stakes coins, time passes, etc.), the contract automatically executes its programmed actions.</p>
                    </div>
                  </div>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-neon-green rounded-full flex items-center justify-center flex-shrink-0 text-dark-950 font-bold text-xl">
                      5
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-cyan-300 mb-2">Automatic Execution</h3>
                      <p className="text-cyan-300/80">The contract performs its programmed actions: transferring coins, updating balances, distributing rewards, etc. No human intervention needed.</p>
                    </div>
                  </div>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-neon-green rounded-full flex items-center justify-center flex-shrink-0 text-dark-950 font-bold text-xl">
                      6
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-cyan-300 mb-2">Recorded Forever</h3>
                      <p className="text-cyan-300/80">All actions are recorded on the blockchain permanently. Anyone can verify that the contract executed correctly and fairly.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="cyber-glass border-2 border-neon-orange rounded-3xl p-8 md:p-12 hover-glow-orange">
              <h2 className="text-4xl font-bold text-neon-orange mb-8">Real-World Use Cases</h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <TrendingUp className="text-cyan-400 mb-4" size={32} />
                  <h3 className="text-xl font-bold text-cyan-300 mb-3">DeFi Platforms</h3>
                  <p className="text-cyan-300/80 text-sm mb-3">Automated lending, borrowing, and yield generation without banks.</p>
                  <p className="text-xs text-neon-green italic">Example: OCEAN DeFi uses smart contracts to automate staking, growth calculation, and reward distribution.</p>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <Users className="text-neon-green mb-4" size={32} />
                  <h3 className="text-xl font-bold text-neon-green mb-3">NFT Marketplaces</h3>
                  <p className="text-cyan-300/80 text-sm mb-3">Automated buying, selling, and royalty distribution for digital art.</p>
                  <p className="text-xs text-neon-green italic">Example: Artists automatically receive 10% royalty on every resale.</p>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <Shield className="text-neon-purple mb-4" size={32} />
                  <h3 className="text-xl font-bold text-neon-purple mb-3">Insurance</h3>
                  <p className="text-cyan-300/80 text-sm mb-3">Automatic claim payouts when predefined conditions are met.</p>
                  <p className="text-xs text-neon-green italic">Example: Flight delay insurance that pays out automatically if flight is delayed.</p>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <FileText className="text-neon-orange mb-4" size={32} />
                  <h3 className="text-xl font-bold text-neon-orange mb-3">Supply Chain</h3>
                  <p className="text-cyan-300/80 text-sm mb-3">Automatic payments when goods reach certain milestones.</p>
                  <p className="text-xs text-neon-green italic">Example: Supplier gets paid automatically when shipment is confirmed delivered.</p>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <Lock className="text-cyan-400 mb-4" size={32} />
                  <h3 className="text-xl font-bold text-cyan-400 mb-3">Real Estate</h3>
                  <p className="text-cyan-300/80 text-sm mb-3">Automatic property transfers and rental payments.</p>
                  <p className="text-xs text-neon-green italic">Example: Ownership automatically transfers when full payment is received.</p>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <Zap className="text-neon-green mb-4" size={32} />
                  <h3 className="text-xl font-bold text-neon-green mb-3">Gaming</h3>
                  <p className="text-cyan-300/80 text-sm mb-3">In-game items, rewards, and tournaments with automatic payouts.</p>
                  <p className="text-xs text-neon-green italic">Example: Tournament winners automatically receive prize pools.</p>
                </div>
              </div>
            </div>

            <div className="cyber-glass border-2 border-cyan-500 rounded-3xl p-8 md:p-12 hover-glow-cyan">
              <h2 className="text-4xl font-bold text-cyan-300 mb-8">Smart Contracts in OCEAN DeFi</h2>

              <p className="text-lg text-cyan-300/90 mb-6 leading-relaxed">
                OCEAN DeFi is powered entirely by smart contracts on the Ramestta blockchain. Every aspect of the platform operates automatically without human intervention:
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="cyber-glass border border-cyan-500/30 rounded-lg p-4">
                    <h4 className="text-lg font-bold text-cyan-300 mb-2">Staking & Growth</h4>
                    <p className="text-sm text-cyan-300/80">When you stake RAMA, the smart contract automatically calculates and compounds your daily growth (0.33% - 0.80%) without any manual processing.</p>
                  </div>

                  <div className="cyber-glass border border-cyan-500/30 rounded-lg p-4">
                    <h4 className="text-lg font-bold text-neon-green mb-2">Direct Income</h4>
                    <p className="text-sm text-cyan-300/80">When someone joins through your referral, you instantly receive 5% commission. The smart contract transfers it to your wallet automatically.</p>
                  </div>

                  <div className="cyber-glass border border-cyan-500/30 rounded-lg p-4">
                    <h4 className="text-lg font-bold text-neon-purple mb-2">Slab Income Distribution</h4>
                    <p className="text-sm text-cyan-300/80">The contract automatically tracks your team's qualified volume, calculates your slab level (1-11), and distributes income accordingly.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="cyber-glass border border-cyan-500/30 rounded-lg p-4">
                    <h4 className="text-lg font-bold text-neon-orange mb-2">Cap Enforcement</h4>
                    <p className="text-sm text-cyan-300/80">The 4x lifetime cap is enforced automatically. Once you've earned 4x your total stake, the contract stops crediting additional income.</p>
                  </div>

                  <div className="cyber-glass border border-cyan-500/30 rounded-lg p-4">
                    <h4 className="text-lg font-bold text-cyan-400 mb-2">Withdrawal Management</h4>
                    <p className="text-sm text-cyan-300/80">The 72-hour freeze period, 20% exit fee, and Safe Wallet transfers are all managed automatically by smart contracts.</p>
                  </div>

                  <div className="cyber-glass border border-cyan-500/30 rounded-lg p-4">
                    <h4 className="text-lg font-bold text-neon-green mb-2">Lifetime Royalty Program</h4>
                    <p className="text-sm text-cyan-300/80">Your eligibility for royalty tiers, lifetime monthly payouts, and renewal requirements are tracked and executed automatically by the contract - no time limits!</p>
                  </div>
                </div>
              </div>

              <div className="cyber-glass border-2 border-neon-green rounded-xl p-6 mt-8 bg-gradient-to-br from-neon-green/5 to-cyan-500/5">
                <div className="flex items-start gap-3">
                  <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={24} />
                  <div>
                    <p className="text-base font-semibold text-neon-green mb-2">Why This Matters</p>
                    <p className="text-sm text-cyan-300/90 leading-relaxed">
                      Because everything is handled by audited smart contracts, there's no risk of human error, fraud, or manipulation. The rules are enforced automatically and transparently. You can verify every transaction on the blockchain. This is the power of trustless automation.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="cyber-glass border-2 border-neon-purple rounded-3xl p-8 md:p-12 hover-glow-purple">
              <h2 className="text-4xl font-bold text-neon-purple mb-8">Benefits of Smart Contracts</h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={20} />
                    <div>
                      <h4 className="text-lg font-bold text-cyan-300 mb-1">Trust Minimization</h4>
                      <p className="text-cyan-300/80 text-sm">No need to trust another party or intermediary. Trust the code and the blockchain.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={20} />
                    <div>
                      <h4 className="text-lg font-bold text-cyan-300 mb-1">Cost Efficiency</h4>
                      <p className="text-cyan-300/80 text-sm">Eliminate expensive intermediaries like lawyers, banks, and brokers.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={20} />
                    <div>
                      <h4 className="text-lg font-bold text-cyan-300 mb-1">Speed</h4>
                      <p className="text-cyan-300/80 text-sm">Transactions execute in seconds instead of days or weeks.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={20} />
                    <div>
                      <h4 className="text-lg font-bold text-cyan-300 mb-1">Accuracy</h4>
                      <p className="text-cyan-300/80 text-sm">No human errors in calculations or execution.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={20} />
                    <div>
                      <h4 className="text-lg font-bold text-cyan-300 mb-1">Transparency</h4>
                      <p className="text-cyan-300/80 text-sm">Anyone can audit the contract code and verify its behavior.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={20} />
                    <div>
                      <h4 className="text-lg font-bold text-cyan-300 mb-1">Security</h4>
                      <p className="text-cyan-300/80 text-sm">Cryptographically secured and protected against tampering.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={20} />
                    <div>
                      <h4 className="text-lg font-bold text-cyan-300 mb-1">Permanence</h4>
                      <p className="text-cyan-300/80 text-sm">Once deployed, contracts can't be altered or deleted.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={20} />
                    <div>
                      <h4 className="text-lg font-bold text-cyan-300 mb-1">Automation</h4>
                      <p className="text-cyan-300/80 text-sm">Set it and forget it. Contracts run 24/7 without supervision.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="cyber-glass border-2 border-neon-orange rounded-xl p-8 hover-glow-orange">
              <div className="flex items-start gap-4 mb-4">
                <AlertCircle className="text-neon-orange flex-shrink-0" size={32} />
                <div>
                  <h3 className="text-2xl font-bold text-neon-orange mb-3">Important Considerations</h3>
                  <div className="space-y-3 text-sm text-cyan-300/90">
                    <p>
                      <strong className="text-cyan-300">Code is Law:</strong> Smart contracts execute exactly as programmed. If there's a bug in the code, it will execute the bug. That's why OCEAN DeFi contracts are thoroughly audited.
                    </p>
                    <p>
                      <strong className="text-cyan-300">Immutability:</strong> Once deployed, smart contracts generally cannot be changed. This protects users but means errors can't be fixed easily.
                    </p>
                    <p>
                      <strong className="text-cyan-300">Gas Fees:</strong> Interacting with smart contracts requires small transaction fees (gas) to compensate network validators. Ramestta keeps these very low.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="cyber-glass border-2 border-cyan-500 rounded-3xl p-12 text-center hover-glow-cyan">
              <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green mb-4">
                Experience Smart Contracts in Action
              </h2>
              <p className="text-xl text-cyan-300/90 mb-8 max-w-2xl mx-auto">
                See how OCEAN DeFi uses smart contracts to create a transparent, automated income ecosystem
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/what-is-defi"
                  className="px-8 py-4 cyber-glass border-2 border-cyan-500 text-cyan-300 rounded-xl font-bold text-lg hover-glow-cyan transition-all inline-flex items-center justify-center gap-2"
                >
                  Next: What is DeFi?
                </Link>
                <Link
                  to="/login"
                  className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-neon-green text-dark-950 rounded-xl font-bold text-lg hover:shadow-neon-cyan transition-all inline-flex items-center justify-center gap-2"
                >
                  Start Using Smart Contracts <ArrowRight size={20} />
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
