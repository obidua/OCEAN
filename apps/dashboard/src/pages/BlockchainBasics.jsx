import { Link } from 'react-router-dom';
import { Blocks, Shield, Network, ArrowRight, CheckCircle, Lock, Zap } from 'lucide-react';
import PublicNav from '../components/PublicNav';

export default function BlockchainBasics() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-dark-950 via-dark-900 to-dark-950">
      <PublicNav />

      <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green mb-6">
              Blockchain Technology Basics
            </h1>
            <p className="text-xl text-cyan-300/90 max-w-3xl mx-auto">
              Understanding the foundation of OCEAN DeFi and decentralized finance
            </p>
          </div>

          <div className="space-y-12">
            <div className="cyber-glass border-2 border-cyan-500 rounded-3xl p-8 md:p-12 hover-glow-cyan">
              <div className="flex items-center gap-4 mb-8">
                <Blocks className="text-cyan-400" size={48} />
                <h2 className="text-4xl font-bold text-cyan-300">What is Blockchain?</h2>
              </div>

              <p className="text-lg text-cyan-300/90 mb-6 leading-relaxed">
                A blockchain is a distributed digital ledger that records transactions across many computers in a way that makes it virtually impossible to change or hack. Think of it as a digital chain of blocks, where each block contains a record of transactions.
              </p>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <Lock className="text-neon-green mb-4" size={32} />
                  <h3 className="text-xl font-bold text-neon-green mb-3">Immutable</h3>
                  <p className="text-cyan-300/80 text-sm">Once data is recorded on the blockchain, it cannot be altered or deleted, ensuring permanent and tamper-proof records.</p>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <Network className="text-neon-green mb-4" size={32} />
                  <h3 className="text-xl font-bold text-neon-green mb-3">Decentralized</h3>
                  <p className="text-cyan-300/80 text-sm">No single entity controls the network. It's maintained by thousands of computers (nodes) worldwide, eliminating single points of failure.</p>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <Shield className="text-neon-green mb-4" size={32} />
                  <h3 className="text-xl font-bold text-neon-green mb-3">Transparent</h3>
                  <p className="text-cyan-300/80 text-sm">All transactions are visible to network participants, creating complete transparency while maintaining user privacy through encryption.</p>
                </div>
              </div>
            </div>

            <div className="cyber-glass border-2 border-neon-green rounded-3xl p-8 md:p-12 hover-glow-green">
              <h2 className="text-4xl font-bold text-neon-green mb-8">How Does It Work?</h2>

              <div className="space-y-6">
                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-neon-green rounded-full flex items-center justify-center flex-shrink-0 text-dark-950 font-bold text-xl">
                      1
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-cyan-300 mb-2">Transaction Initiated</h3>
                      <p className="text-cyan-300/80">A user initiates a transaction (like sending RAMA coins or staking in OCEAN DeFi). This transaction is broadcast to the network.</p>
                    </div>
                  </div>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-neon-green rounded-full flex items-center justify-center flex-shrink-0 text-dark-950 font-bold text-xl">
                      2
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-cyan-300 mb-2">Validation</h3>
                      <p className="text-cyan-300/80">Network nodes (validators) verify the transaction is legitimate, checking digital signatures and ensuring the sender has sufficient funds.</p>
                    </div>
                  </div>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-neon-green rounded-full flex items-center justify-center flex-shrink-0 text-dark-950 font-bold text-xl">
                      3
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-cyan-300 mb-2">Block Creation</h3>
                      <p className="text-cyan-300/80">Verified transactions are grouped together into a block. This block is cryptographically linked to the previous block, forming a chain.</p>
                    </div>
                  </div>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-neon-green rounded-full flex items-center justify-center flex-shrink-0 text-dark-950 font-bold text-xl">
                      4
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-cyan-300 mb-2">Consensus & Confirmation</h3>
                      <p className="text-cyan-300/80">The network reaches consensus that the block is valid. The block is added to the chain permanently, and the transaction is complete.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="cyber-glass border-2 border-neon-purple rounded-3xl p-8 md:p-12 hover-glow-purple">
              <h2 className="text-4xl font-bold text-neon-purple mb-8">Key Benefits of Blockchain</h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={20} />
                    <div>
                      <h4 className="text-lg font-bold text-cyan-300 mb-1">Enhanced Security</h4>
                      <p className="text-cyan-300/80 text-sm">Cryptographic protection makes blockchain extremely secure against fraud and unauthorized access.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={20} />
                    <div>
                      <h4 className="text-lg font-bold text-cyan-300 mb-1">Reduced Costs</h4>
                      <p className="text-cyan-300/80 text-sm">Eliminates intermediaries and reduces transaction fees, making financial services more affordable.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={20} />
                    <div>
                      <h4 className="text-lg font-bold text-cyan-300 mb-1">Faster Transactions</h4>
                      <p className="text-cyan-300/80 text-sm">Processes transactions in seconds or minutes, compared to days for traditional banking systems.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={20} />
                    <div>
                      <h4 className="text-lg font-bold text-cyan-300 mb-1">24/7 Availability</h4>
                      <p className="text-cyan-300/80 text-sm">Blockchain networks operate continuously without downtime, enabling round-the-clock access.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={20} />
                    <div>
                      <h4 className="text-lg font-bold text-cyan-300 mb-1">Global Access</h4>
                      <p className="text-cyan-300/80 text-sm">Anyone with internet access can participate, providing financial services to the unbanked worldwide.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={20} />
                    <div>
                      <h4 className="text-lg font-bold text-cyan-300 mb-1">Smart Contracts</h4>
                      <p className="text-cyan-300/80 text-sm">Self-executing agreements that automatically enforce terms without intermediaries.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={20} />
                    <div>
                      <h4 className="text-lg font-bold text-cyan-300 mb-1">Traceability</h4>
                      <p className="text-cyan-300/80 text-sm">Complete audit trail of all transactions, improving accountability and compliance.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={20} />
                    <div>
                      <h4 className="text-lg font-bold text-cyan-300 mb-1">User Control</h4>
                      <p className="text-cyan-300/80 text-sm">You maintain full ownership and control of your assets without relying on third parties.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="cyber-glass border-2 border-neon-orange rounded-3xl p-8 md:p-12 hover-glow-orange">
              <h2 className="text-4xl font-bold text-neon-orange mb-8">Blockchain in OCEAN DeFi</h2>

              <p className="text-lg text-cyan-300/90 mb-6 leading-relaxed">
                OCEAN DeFi leverages blockchain technology on the Ramestta network to provide a secure, transparent, and efficient DeFi platform:
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <Zap className="text-cyan-400 mb-4" size={32} />
                  <h3 className="text-xl font-bold text-cyan-300 mb-3">Fast & Affordable</h3>
                  <p className="text-cyan-300/80">Ramestta blockchain provides 2-second block times and minimal transaction fees, making your staking and claiming operations instant and cost-effective.</p>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <Shield className="text-neon-green mb-4" size={32} />
                  <h3 className="text-xl font-bold text-neon-green mb-3">Validator Secured</h3>
                  <p className="text-cyan-300/80">Your staked RAMA is deployed to professional validator nodes that secure the network, generating sustainable returns (5-8.4% monthly APY) that power all income streams.</p>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <Lock className="text-neon-purple mb-4" size={32} />
                  <h3 className="text-xl font-bold text-neon-purple mb-3">Smart Contract Automation</h3>
                  <p className="text-cyan-300/80">All earnings calculations, distributions, and caps are enforced automatically by audited smart contracts, eliminating human error and ensuring fairness.</p>
                </div>

                <div className="cyber-glass border border-cyan-500/30 rounded-xl p-6">
                  <Network className="text-neon-orange mb-4" size={32} />
                  <h3 className="text-xl font-bold text-neon-orange mb-3">Fully Transparent</h3>
                  <p className="text-cyan-300/80">Every transaction, stake, and reward distribution is recorded on-chain and publicly verifiable, providing complete transparency into platform operations.</p>
                </div>
              </div>
            </div>

            <div className="cyber-glass border-2 border-cyan-500 rounded-3xl p-12 text-center hover-glow-cyan">
              <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green mb-4">
                Continue Your Learning Journey
              </h2>
              <p className="text-xl text-cyan-300/90 mb-8 max-w-2xl mx-auto">
                Now that you understand blockchain, learn about smart contracts and DeFi
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/money-revolution"
                  className="px-8 py-4 cyber-glass border-2 border-cyan-500 text-cyan-300 rounded-xl font-bold text-lg hover-glow-cyan transition-all inline-flex items-center justify-center gap-2"
                >
                  ← Previous: Money Evolution
                </Link>
                <Link
                  to="/smart-contracts"
                  className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-neon-green text-dark-950 rounded-xl font-bold text-lg hover:shadow-neon-cyan transition-all inline-flex items-center justify-center gap-2"
                >
                  Next: Smart Contracts <ArrowRight size={20} />
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
