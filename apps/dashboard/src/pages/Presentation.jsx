import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Waves, ChevronLeft, ChevronRight, X, TrendingUp, Users, Award, Trophy, Gift, Shield, Zap, DollarSign, Target, CheckCircle, BarChart3, PieChart, Wallet, Lock, Globe, ArrowRight, AlertCircle, Maximize, Minimize, Play, Pause, Coins, Building2, CreditCard, Smartphone, Blocks, Code, FileText, Network, Layers } from 'lucide-react';
import TokenomicsComparison from '../components/TokenomicsComparison';

function Presentation() {

  // Ocean-themed slab tier names
  const SLAB_TIER_NAMES = [
    'Coral Reef',      // Level 1 - $500
    'Shallow Waters',  // Level 2 - $2,500
    'Tide Pool',       // Level 3 - $10,000
    'Wave Crest',      // Level 4 - $25,000
    'Open Sea',        // Level 5 - $50,000
    'Deep Current',    // Level 6 - $100,000
    'Ocean Floor',     // Level 7 - $500,000
    'Abyssal Zone',    // Level 8 - $1M
    'Mariana Trench',  // Level 9 - $2.5M
    'Pacific Master',  // Level 10 - $5M
    'Ocean Sovereign', // Level 11 - $20M
  ];

  const REWARD_NAMES = [
    'Coral Spark',        // 1 - $6,000 - $100
    'Pearl Bloom',        // 2 - $15,000 - $250
    'Shell Harvest',      // 3 - $40,000 - $500
    'Wave Bounty',        // 4 - $120,000 - $1,000
    'Tide Treasure',      // 5 - $300,000 - $2,500
    'Blue Depth Bonus',   // 6 - $600,000 - $5,000
    'Guardian\'s Gift',   // 7 - $1.5M - $8,000
    'Captain\'s Chest',   // 8 - $3M - $12,000
    'Trident Gem',        // 9 - $6M - $30,000
    'Sea Legend Award',   // 10 - $15M - $50,000
    'Abyss Crown',        // 11 - $30M - $85,000
    'Poseidon\'s Favor',  // 12 - $60M - $150,000
    'Neptune Scepter',    // 13 - $200M - $500,000
    'Ocean Infinity',     // 14 - $500M - $1,500,000
  ];

  const ROYALTY_TIER_NAMES = [
    'Coral Starter',      // Level 1 - $5,000
    'Pearl Diver',        // Level 2 - $10,000
    'Sea Explorer',       // Level 3 - $20,000
    'Wave Rider',         // Level 4 - $60,000
    'Tide Surge',         // Level 5 - $120,000
    'Deep Blue',          // Level 6 - $300,000
    'Ocean Guardian',     // Level 7 - $600,000
    'Marine Commander',   // Level 8 - $1.5M
    'Aqua Captain',       // Level 9 - $3M
    'Current Master',     // Level 10 - $5M
    'Sea Legend',         // Level 11 - $10M
    'Trident Icon',       // Level 12 - $30M
    'Poseidon Crown',     // Level 13 - $50M
    'Ocean Supreme',      // Level 14 - $100M
  ];

  const slides = [
    {
      title: "Welcome to OCEAN DeFi",
      subtitle: "The Future of Decentralized Finance on Ramestta Blockchain",
      content: (
        <div className="space-y-2 md:space-y-6 text-center">
          <div className="w-16 h-16 md:w-32 md:h-32 bg-gradient-to-br from-cyan-500 to-neon-green rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto animate-glow-pulse animate-scale-in">
            <Waves className="text-dark-950" size={32} />
          </div>
          <h2 className="text-xl md:text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green animate-slide-in-top" style={{animationDelay: '0.1s', animationFillMode: 'both'}}>
            OCEAN DeFi
          </h2>
          <p className="text-xs md:text-lg lg:text-2xl text-cyan-300 max-w-3xl mx-auto leading-snug md:leading-relaxed px-1 animate-fade-in-up" style={{animationDelay: '0.2s', animationFillMode: 'both'}}>
            A revolutionary validator-backed DeFi ecosystem with 7 income streams. Built on Ramestta blockchain for security, speed, and sustainability.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 lg:gap-6 mt-2 md:mt-8">
            <div className="cyber-glass border-2 border-cyan-500 rounded-lg md:rounded-xl p-2 md:p-4 lg:p-6 animate-fade-in-up" style={{animationDelay: '0.3s', animationFillMode: 'both'}}>
              <p className="text-2xl md:text-4xl font-bold text-neon-green mb-0.5 md:mb-2">7</p>
              <p className="text-[9px] md:text-sm text-cyan-300 leading-tight">Income Streams</p>
            </div>
            <div className="cyber-glass border-2 border-neon-green rounded-lg md:rounded-xl p-2 md:p-4 lg:p-6 animate-fade-in-up" style={{animationDelay: '0.4s', animationFillMode: 'both'}}>
              <p className="text-2xl md:text-4xl font-bold text-neon-green mb-0.5 md:mb-2">4x</p>
              <p className="text-[9px] md:text-sm text-cyan-300 leading-tight">Lifetime Cap</p>
            </div>
            <div className="cyber-glass border-2 border-neon-purple rounded-lg md:rounded-xl p-2 md:p-4 lg:p-6 animate-fade-in-up" style={{animationDelay: '0.5s', animationFillMode: 'both'}}>
              <p className="text-2xl md:text-4xl font-bold text-neon-purple mb-0.5 md:mb-2">0%</p>
              <p className="text-[9px] md:text-sm text-cyan-300 leading-tight">Trust Policy</p>
            </div>
            <div className="cyber-glass border-2 border-neon-orange rounded-lg md:rounded-xl p-2 md:p-4 lg:p-6 animate-fade-in-up" style={{animationDelay: '0.6s', animationFillMode: 'both'}}>
              <p className="text-2xl md:text-4xl font-bold text-neon-orange mb-0.5 md:mb-2">$50</p>
              <p className="text-[9px] md:text-sm text-cyan-300 leading-tight">Min Stake</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "The Evolution of Money",
      subtitle: "From Barter to Blockchain",
      content: (
        <div className="space-y-4">
          <p className="text-base md:text-lg text-cyan-300/90 text-center mb-6 animate-fade-in">
            Understanding how money evolved helps us appreciate why blockchain represents the next revolution
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="cyber-glass border border-neon-orange/30 rounded-xl p-4 animate-slide-fade-left" style={{animationDelay: '0.1s', animationFillMode: 'both'}}>
              <div className="text-3xl font-bold text-neon-orange mb-2">1</div>
              <h4 className="text-lg font-bold text-cyan-300 mb-2">Barter System</h4>
              <p className="text-sm text-cyan-300/80">Direct exchange of goods</p>
              <p className="text-xs text-red-400 mt-2">Limited by double coincidence</p>
            </div>
            <div className="cyber-glass border border-yellow-400/30 rounded-xl p-4 animate-slide-fade-left" style={{animationDelay: '0.2s', animationFillMode: 'both'}}>
              <div className="text-3xl font-bold text-yellow-400 mb-2">2-3</div>
              <h4 className="text-lg font-bold text-cyan-300 mb-2">Commodity & Coins</h4>
              <p className="text-sm text-cyan-300/80">Precious metals, minted coins</p>
              <p className="text-xs text-yellow-400 mt-2">Heavy, hard to divide</p>
            </div>
            <div className="cyber-glass border border-neon-green/30 rounded-xl p-4 animate-slide-fade-left" style={{animationDelay: '0.3s', animationFillMode: 'both'}}>
              <div className="text-3xl font-bold text-neon-green mb-2">4</div>
              <h4 className="text-lg font-bold text-cyan-300 mb-2">Paper Money</h4>
              <p className="text-sm text-cyan-300/80">Banknotes backed by gold</p>
              <p className="text-xs text-neon-green mt-2">Portable, divisible</p>
            </div>
            <div className="cyber-glass border border-neon-purple/30 rounded-xl p-4 animate-slide-fade-left" style={{animationDelay: '0.4s', animationFillMode: 'both'}}>
              <div className="text-3xl font-bold text-neon-purple mb-2">5</div>
              <h4 className="text-lg font-bold text-cyan-300 mb-2">Digital Banking</h4>
              <p className="text-sm text-cyan-300/80">Credit cards, online transfers</p>
              <p className="text-xs text-red-400 mt-2">Banks control everything</p>
            </div>
            <div className="cyber-glass border border-cyan-500/30 rounded-xl p-4 animate-slide-fade-left" style={{animationDelay: '0.5s', animationFillMode: 'both'}}>
              <div className="text-3xl font-bold text-cyan-400 mb-2">6</div>
              <h4 className="text-lg font-bold text-cyan-300 mb-2">Cryptocurrency</h4>
              <p className="text-sm text-cyan-300/80">Blockchain, decentralized</p>
              <p className="text-xs text-neon-green mt-2">You control your assets</p>
            </div>
            <div className="cyber-glass border-2 border-neon-green rounded-xl p-4 bg-gradient-to-br from-neon-green/10 to-cyan-500/10 animate-slide-fade-left" style={{animationDelay: '0.6s', animationFillMode: 'both'}}>
              <div className="text-3xl font-bold text-neon-green mb-2">7</div>
              <h4 className="text-lg font-bold text-neon-green mb-2">DeFi</h4>
              <p className="text-sm text-cyan-300/80">Automated finance, no banks</p>
              <p className="text-xs text-neon-green font-semibold mt-2">The Future is Here!</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "What is Blockchain?",
      subtitle: "The Foundation of OCEAN DeFi",
      content: (
        <div className="space-y-6">
          <p className="text-base md:text-lg text-cyan-300/90 leading-relaxed animate-fade-in">
            A <strong className="text-neon-green">blockchain</strong> is a distributed digital ledger that records transactions across many computers. Think of it as a digital chain of blocks where each block contains transaction records.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="cyber-glass border border-cyan-500/30 rounded-xl p-5 animate-fade-in-up" style={{animationDelay: '0.1s', animationFillMode: 'both'}}>
              <Lock className="text-cyan-400 mb-3" size={32} />
              <h3 className="text-xl font-bold text-cyan-300 mb-2">Immutable</h3>
              <p className="text-sm text-cyan-300/80">Once recorded, data cannot be altered or deleted</p>
            </div>
            <div className="cyber-glass border border-cyan-500/30 rounded-xl p-5 animate-fade-in-up" style={{animationDelay: '0.2s', animationFillMode: 'both'}}>
              <Network className="text-neon-green mb-3" size={32} />
              <h3 className="text-xl font-bold text-neon-green mb-2">Decentralized</h3>
              <p className="text-sm text-cyan-300/80">No single entity controls the network</p>
            </div>
            <div className="cyber-glass border border-cyan-500/30 rounded-xl p-5 animate-fade-in-up" style={{animationDelay: '0.3s', animationFillMode: 'both'}}>
              <Shield className="text-neon-purple mb-3" size={32} />
              <h3 className="text-xl font-bold text-neon-purple mb-2">Transparent</h3>
              <p className="text-sm text-cyan-300/80">All transactions are visible and verifiable</p>
            </div>
          </div>
          <div className="cyber-glass border-2 border-neon-green rounded-xl p-6 bg-gradient-to-br from-neon-green/5 to-cyan-500/5 animate-slide-in-bottom" style={{animationDelay: '0.4s', animationFillMode: 'both'}}>
            <p className="text-base text-cyan-300 leading-relaxed">
              <strong className="text-neon-green">OCEAN DeFi</strong> leverages Ramestta blockchain to provide fast (2-second blocks), secure (validator-backed), and affordable transactions for all your DeFi activities.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Smart Contracts",
      subtitle: "Automated Agreements on Blockchain",
      content: (
        <div className="space-y-6">
          <p className="text-base md:text-lg text-cyan-300/90 leading-relaxed animate-fade-in">
            <strong className="text-neon-green">Smart contracts</strong> are self-executing programs on blockchain that automatically enforce agreements when conditions are met. No intermediaries needed!
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="cyber-glass border border-red-400/30 rounded-xl p-5 animate-slide-in-left" style={{animationDelay: '0.1s', animationFillMode: 'both'}}>
              <FileText className="text-red-400 mb-3" size={32} />
              <h3 className="text-xl font-bold text-red-400 mb-3">Traditional Contracts</h3>
              <ul className="space-y-2 text-sm text-cyan-300/80">
                <li>✗ Need lawyers & intermediaries</li>
                <li>✗ Slow (weeks/months)</li>
                <li>✗ Expensive fees</li>
                <li>✗ Can be disputed</li>
                <li>✗ Manual enforcement</li>
              </ul>
            </div>
            <div className="cyber-glass border border-neon-green/30 rounded-xl p-5 animate-slide-in-right" style={{animationDelay: '0.2s', animationFillMode: 'both'}}>
              <Code className="text-neon-green mb-3" size={32} />
              <h3 className="text-xl font-bold text-neon-green mb-3">Smart Contracts</h3>
              <ul className="space-y-2 text-sm text-cyan-300/80">
                <li>✓ No intermediaries</li>
                <li>✓ Instant execution</li>
                <li>✓ Minimal fees</li>
                <li>✓ Cannot be broken</li>
                <li>✓ Automatic enforcement</li>
              </ul>
            </div>
          </div>
          <div className="cyber-glass border-2 border-cyan-500 rounded-xl p-5 animate-slide-in-bottom" style={{animationDelay: '0.3s', animationFillMode: 'both'}}>
            <p className="text-sm text-cyan-300/90 leading-relaxed">
              <strong className="text-cyan-300">OCEAN DeFi uses smart contracts</strong> to automate staking, calculate daily growth, distribute rewards, enforce caps, and manage withdrawals. Everything happens automatically and transparently!
            </p>
          </div>
        </div>
      )
    },
    {
      title: "What is DeFi?",
      subtitle: "Decentralized Finance Explained",
      content: (
        <div className="space-y-6">
          <p className="text-base md:text-lg text-cyan-300/90 leading-relaxed animate-fade-in">
            <strong className="text-neon-green">DeFi (Decentralized Finance)</strong> recreates traditional financial services using blockchain and smart contracts, eliminating banks and intermediaries.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="cyber-glass border border-red-400/30 rounded-xl p-5 animate-slide-in-left" style={{animationDelay: '0.1s', animationFillMode: 'both'}}>
              <Building2 className="text-red-400 mb-3" size={32} />
              <h3 className="text-xl font-bold text-red-400 mb-3">Traditional Finance</h3>
              <ul className="space-y-2 text-sm text-cyan-300/80">
                <li>✗ Banks control your money</li>
                <li>✗ Limited hours (9-5, M-F)</li>
                <li>✗ High fees, slow transfers</li>
                <li>✗ Geographic restrictions</li>
                <li>✗ Requires KYC/documentation</li>
                <li>✗ Opaque operations</li>
              </ul>
            </div>
            <div className="cyber-glass border border-neon-green/30 rounded-xl p-5 animate-slide-in-right" style={{animationDelay: '0.2s', animationFillMode: 'both'}}>
              <Blocks className="text-neon-green mb-3" size={32} />
              <h3 className="text-xl font-bold text-neon-green mb-3">Decentralized Finance</h3>
              <ul className="space-y-2 text-sm text-cyan-300/80">
                <li>✓ You control your assets</li>
                <li>✓ 24/7 worldwide access</li>
                <li>✓ Low fees, instant transfers</li>
                <li>✓ Accessible from anywhere</li>
                <li>✓ Pseudonymous participation</li>
                <li>✓ Fully transparent on-chain</li>
              </ul>
            </div>
          </div>
          <div className="cyber-glass border-2 border-neon-purple rounded-xl p-5 bg-gradient-to-br from-neon-purple/5 to-pink-500/5 animate-slide-in-bottom" style={{animationDelay: '0.3s', animationFillMode: 'both'}}>
            <p className="text-base text-cyan-300 leading-relaxed">
              <strong className="text-neon-purple">OCEAN DeFi</strong> combines staking, yield generation, and team rewards - all powered by validator income for long-term sustainability.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Ramestta Blockchain",
      subtitle: "Layer 3 Built on Polygon",
      content: (
        <div className="space-y-6">
          <p className="text-base md:text-lg text-cyan-300/90 leading-relaxed animate-fade-in">
            <strong className="text-neon-green">Ramestta</strong> is an open-source public blockchain built by a global community of developers since 2021. It's a Layer 3 blockchain optimized for DeFi applications, offering the best combination of speed, security, and low costs.
          </p>
          <div className="cyber-glass border border-neon-green/50 rounded-xl p-4 mb-4 animate-slide-in-left" style={{animationDelay: '0.15s', animationFillMode: 'both'}}>
            <h4 className="text-lg font-bold text-neon-green mb-3">Community-Built Innovation</h4>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="flex items-start gap-2">
                <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={14} />
                <span className="text-xs text-cyan-300/90">Global developers contributing knowledge & infrastructure</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={14} />
                <span className="text-xs text-cyan-300/90">No ICO or private sales - purely organic growth</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={14} />
                <span className="text-xs text-cyan-300/90">Controlled supply: Only 4M RAMA in circulation</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="text-neon-green mt-1 flex-shrink-0" size={14} />
                <span className="text-xs text-cyan-300/90">Listed: Koinpark, BitMart Exchange + more by 2026</span>
              </div>
            </div>
          </div>
          <div className="cyber-glass border border-neon-purple/50 rounded-xl p-5 mb-4 animate-slide-in-top" style={{animationDelay: '0.1s', animationFillMode: 'both'}}>
            <h3 className="text-xl font-bold text-neon-purple mb-4">The Layer Hierarchy</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-4 animate-slide-in-left" style={{animationDelay: '0.15s', animationFillMode: 'both'}}>
                <div className="w-20 bg-blue-500 text-white text-center py-2 rounded-lg font-bold text-sm">Layer 1</div>
                <p className="text-cyan-300 text-sm"><strong>Ethereum</strong> - Base security layer</p>
              </div>
              <div className="ml-4 border-l-2 border-cyan-500/30 h-6 animate-fade-in" style={{animationDelay: '0.25s', animationFillMode: 'both'}}></div>
              <div className="flex items-center gap-4 animate-slide-in-left" style={{animationDelay: '0.35s', animationFillMode: 'both'}}>
                <div className="w-20 bg-purple-500 text-white text-center py-2 rounded-lg font-bold text-sm">Layer 2</div>
                <p className="text-cyan-300 text-sm"><strong>Polygon</strong> - Scalability layer</p>
              </div>
              <div className="ml-4 border-l-2 border-cyan-500/30 h-6 animate-fade-in" style={{animationDelay: '0.45s', animationFillMode: 'both'}}></div>
              <div className="flex items-center gap-4 animate-slide-in-left" style={{animationDelay: '0.55s', animationFillMode: 'both'}}>
                <div className="w-20 bg-gradient-to-r from-cyan-500 to-neon-green text-dark-950 text-center py-2 rounded-lg font-bold text-sm">Layer 3</div>
                <p className="text-neon-green text-sm font-semibold"><strong>Ramestta</strong> - DeFi optimization</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="cyber-glass border border-cyan-500/30 rounded-xl p-3 text-center animate-fade-in-up" style={{animationDelay: '0.2s', animationFillMode: 'both'}}>
              <Zap className="text-cyan-400 mx-auto mb-2" size={24} />
              <p className="text-lg font-bold text-neon-green mb-1">70,000+</p>
              <p className="text-[10px] text-cyan-300/80">TPS Capacity</p>
            </div>
            <div className="cyber-glass border border-cyan-500/30 rounded-xl p-3 text-center animate-fade-in-up" style={{animationDelay: '0.25s', animationFillMode: 'both'}}>
              <DollarSign className="text-neon-green mx-auto mb-2" size={24} />
              <p className="text-lg font-bold text-neon-green mb-1">$0.001</p>
              <p className="text-[10px] text-cyan-300/80">Gas Fee</p>
            </div>
            <div className="cyber-glass border border-cyan-500/30 rounded-xl p-3 text-center animate-fade-in-up" style={{animationDelay: '0.3s', animationFillMode: 'both'}}>
              <Globe className="text-neon-purple mx-auto mb-2" size={24} />
              <p className="text-lg font-bold text-neon-green mb-1">4M</p>
              <p className="text-[10px] text-cyan-300/80">Circulation</p>
            </div>
            <div className="cyber-glass border border-cyan-500/30 rounded-xl p-3 text-center animate-fade-in-up" style={{animationDelay: '0.35s', animationFillMode: 'both'}}>
              <TrendingUp className="text-neon-orange mx-auto mb-2" size={24} />
              <p className="text-lg font-bold text-neon-green mb-1">$50K</p>
              <p className="text-[10px] text-cyan-300/80">Price Target</p>
            </div>
          </div>
          <div className="cyber-glass border border-cyan-500/30 rounded-xl p-4 animate-fade-in-up" style={{animationDelay: '0.4s', animationFillMode: 'both'}}>
            <h4 className="text-base font-bold text-cyan-300 mb-2">RAMA vs ETH, Polygon, BSC, Tron</h4>
            <p className="text-xs text-cyan-300/80 mb-3">Lower supply + high demand from gas fees & platforms like OCEAN DeFi = potential $50,000 RAMA price in the future</p>
            <div className="grid md:grid-cols-2 gap-2">
              <div className="flex items-start gap-2">
                <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={12} />
                <span className="text-[11px] text-cyan-300/80">Layer 3 advantage: Speed + Security</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={12} />
                <span className="text-[11px] text-cyan-300/80">Controlled supply vs unlimited chains</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "RAMA Tokenomics",
      subtitle: "1 Billion Total Supply",
      content: (
        <div className="space-y-6">
          <p className="text-base md:text-lg text-cyan-300/90 leading-relaxed">
            RAMA has a <strong className="text-neon-green">fixed supply of 1 billion (1000 million)</strong> coins, ensuring scarcity and deflationary value over time.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="cyber-glass border-2 border-neon-purple rounded-xl p-6 animate-slide-in-left" style={{animationDelay: '0.1s', animationFillMode: 'both'}}>
              <Lock className="text-neon-purple mb-3" size={32} />
              <h3 className="text-2xl font-bold text-neon-purple mb-2">80% Locked</h3>
              <p className="text-3xl font-bold text-cyan-400 mb-3">800 Million</p>
              <p className="text-sm text-cyan-300/80">Allocated to validator nodes for network security and sustainable rewards generation</p>
            </div>
            <div className="cyber-glass border-2 border-neon-green rounded-xl p-6 animate-slide-in-right" style={{animationDelay: '0.2s', animationFillMode: 'both'}}>
              <Globe className="text-neon-green mb-3" size={32} />
              <h3 className="text-2xl font-bold text-neon-green mb-2">20% Ecosystem</h3>
              <p className="text-3xl font-bold text-cyan-400 mb-3">200 Million</p>
              <p className="text-sm text-cyan-300/80">Development, marketing, liquidity, and community growth initiatives</p>
            </div>
          </div>
          <div className="cyber-glass border-2 border-cyan-500 rounded-xl p-5 animate-fade-in-up" style={{animationDelay: '0.3s', animationFillMode: 'both'}}>
            <h3 className="text-lg font-bold text-cyan-300 mb-3">Key Benefits</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="flex items-start gap-2 animate-fade-in" style={{animationDelay: '0.4s', animationFillMode: 'both'}}>
                <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                <span className="text-sm text-cyan-300/90">Fixed supply prevents inflation</span>
              </div>
              <div className="flex items-start gap-2 animate-fade-in" style={{animationDelay: '0.5s', animationFillMode: 'both'}}>
                <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                <span className="text-sm text-cyan-300/90">Deflationary over time</span>
              </div>
              <div className="flex items-start gap-2 animate-fade-in" style={{animationDelay: '0.6s', animationFillMode: 'both'}}>
                <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                <span className="text-sm text-cyan-300/90">Validator APY: 5-8.4% monthly</span>
              </div>
              <div className="flex items-start gap-2 animate-fade-in" style={{animationDelay: '0.7s', animationFillMode: 'both'}}>
                <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                <span className="text-sm text-cyan-300/90">Trading on BitMart & Koinpark</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "RAMA vs Major Chains",
      subtitle: "Cross-Chain Tokenomics Comparison",
      content: (
        <div className="space-y-4">
          <p className="text-sm md:text-base text-cyan-300/90 leading-relaxed text-center mb-4 animate-fade-in">
            Compare RAMA's tokenomics against major blockchain networks to understand why <strong className="text-neon-green">limited supply + growing demand = price appreciation</strong>
          </p>

          <div className="animate-fade-in-up" style={{animationDelay: '0.2s', animationFillMode: 'both'}}>
            <TokenomicsComparison />
          </div>

          <div className="cyber-glass border-2 border-neon-orange rounded-xl p-4 md:p-6 mt-6 animate-slide-in-bottom" style={{animationDelay: '0.4s', animationFillMode: 'both'}}>
            <h4 className="text-lg md:text-xl font-bold text-neon-orange mb-3 text-center">The Scarcity Advantage</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              <div className="bg-dark-950/50 rounded-lg p-3 md:p-4 text-center">
                <p className="text-xs md:text-sm text-cyan-300/70 mb-1">RAMA Circulating</p>
                <p className="text-xl md:text-2xl font-bold text-neon-green">4M</p>
                <p className="text-[10px] md:text-xs text-neon-green/80 mt-1">0.4% of supply</p>
              </div>
              <div className="bg-dark-950/50 rounded-lg p-3 md:p-4 text-center">
                <p className="text-xs md:text-sm text-cyan-300/70 mb-1">ETH Circulating</p>
                <p className="text-xl md:text-2xl font-bold text-cyan-400">120M+</p>
                <p className="text-[10px] md:text-xs text-red-400/80 mt-1">30x more supply</p>
              </div>
              <div className="bg-dark-950/50 rounded-lg p-3 md:p-4 text-center">
                <p className="text-xs md:text-sm text-cyan-300/70 mb-1">Price Impact</p>
                <p className="text-xl md:text-2xl font-bold text-neon-orange">30x</p>
                <p className="text-[10px] md:text-xs text-neon-orange/80 mt-1">Potential multiplier</p>
              </div>
            </div>
            <p className="text-xs md:text-sm text-cyan-300/90 text-center mt-4 leading-relaxed">
              With 30x less circulating supply than Ethereum, RAMA has significant upside potential as OCEAN DeFi adoption grows and more exchanges list the token.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Validator-Backed Security",
      subtitle: "Real Income, Not Ponzi",
      content: (
        <div className="space-y-6">
          <p className="text-base md:text-lg text-cyan-300/90 leading-relaxed">
            Unlike platforms that rely only on new deposits, <strong className="text-neon-green">OCEAN DeFi generates real income from blockchain validators</strong>.
          </p>
          <div className="cyber-glass border-2 border-neon-purple rounded-xl p-6 animate-fade-in-up" style={{animationDelay: '0.1s', animationFillMode: 'both'}}>
            <h3 className="text-xl font-bold text-neon-purple mb-4 text-center">How Your Stake Works</h3>
            <div className="grid md:grid-cols-4 gap-3">
              <div className="text-center animate-scale-in" style={{animationDelay: '0.2s', animationFillMode: 'both'}}>
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-neon-green rounded-full flex items-center justify-center mx-auto mb-2 text-dark-950 font-bold text-lg">1</div>
                <p className="text-xs text-cyan-300 font-semibold mb-1">You Stake RAMA</p>
                <p className="text-xs text-cyan-300/70">Deposit coins</p>
              </div>
              <div className="text-center animate-scale-in" style={{animationDelay: '0.3s', animationFillMode: 'both'}}>
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-neon-green rounded-full flex items-center justify-center mx-auto mb-2 text-dark-950 font-bold text-lg">2</div>
                <p className="text-xs text-cyan-300 font-semibold mb-1">Validators Stake</p>
                <p className="text-xs text-cyan-300/70">Deploy to nodes</p>
              </div>
              <div className="text-center animate-scale-in" style={{animationDelay: '0.4s', animationFillMode: 'both'}}>
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-neon-green rounded-full flex items-center justify-center mx-auto mb-2 text-dark-950 font-bold text-lg">3</div>
                <p className="text-xs text-cyan-300 font-semibold mb-1">Earn Rewards</p>
                <p className="text-xs text-cyan-300/70">5-8.4% APY</p>
              </div>
              <div className="text-center animate-scale-in" style={{animationDelay: '0.5s', animationFillMode: 'both'}}>
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-neon-green rounded-full flex items-center justify-center mx-auto mb-2 text-dark-950 font-bold text-lg">4</div>
                <p className="text-xs text-cyan-300 font-semibold mb-1">Powers Payouts</p>
                <p className="text-xs text-cyan-300/70">Sustainable</p>
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="cyber-glass border border-cyan-500/30 rounded-xl p-4 animate-slide-in-left" style={{animationDelay: '0.6s', animationFillMode: 'both'}}>
              <h4 className="text-base font-bold text-cyan-300 mb-3">Validator Income</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-cyan-300/80">Monthly APY:</span>
                  <span className="text-neon-green font-bold">5-8.4%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-cyan-300/80">User Payouts:</span>
                  <span className="text-cyan-400 font-bold">Average 6-9%</span>
                </div>
                <div className="flex justify-between text-sm border-t border-cyan-500/30 pt-2">
                  <span className="text-cyan-300 font-semibold">Surplus:</span>
                  <span className="text-neon-green font-bold">Sustainable!</span>
                </div>
              </div>
            </div>
            <div className="cyber-glass border border-neon-green/30 rounded-xl p-4 animate-slide-in-right" style={{animationDelay: '0.7s', animationFillMode: 'both'}}>
              <h4 className="text-base font-bold text-neon-green mb-3">Safety Features</h4>
              <ul className="space-y-1 text-xs text-cyan-300/90">
                <li>✓ 4x lifetime earning cap</li>
                <li>✓ 200%/250% portfolio caps</li>
                <li>✓ Fee recycling to validators</li>
                <li>✓ Reserve vault for liquidity</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Income Stream 1: Self Income",
      subtitle: "Your Personal Daily Growth",
      content: (
        <div className="space-y-6">
          <p className="text-base md:text-lg text-cyan-300/90 leading-relaxed animate-fade-in">
            Earn daily growth that auto-compounds into your portfolio. Rate depends on your tier and booster status.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="cyber-glass border-2 border-cyan-500 rounded-xl p-5 animate-slide-in-left" style={{animationDelay: '0.1s', animationFillMode: 'both'}}>
              <h3 className="text-2xl font-bold text-cyan-300 mb-3">Tier 1 (Normal)</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-cyan-300/90">Daily Rate:</span>
                  <span className="text-neon-green font-bold">0.33% - 0.40%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyan-300/90">Monthly:</span>
                  <span className="text-neon-green font-bold">~11%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyan-300/90">Cap:</span>
                  <span className="text-neon-green font-bold">200%</span>
                </div>
                <div className="flex justify-between border-t border-cyan-500/30 pt-2">
                  <span className="text-cyan-300/90">Time to Cap:</span>
                  <span className="text-cyan-400">~18 months</span>
                </div>
              </div>
              <div className="mt-4 cyber-glass border border-cyan-500/30 rounded-lg p-3">
                <p className="text-xs text-cyan-300/90"><strong>Example:</strong> $1,000 → $3.65/day → $2,000 total</p>
              </div>
            </div>
            <div className="cyber-glass border-2 border-neon-green rounded-xl p-5 animate-slide-in-right" style={{animationDelay: '0.2s', animationFillMode: 'both'}}>
              <h3 className="text-2xl font-bold text-neon-green mb-3">Tier 2 (Booster)</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-cyan-300/90">Daily Rate:</span>
                  <span className="text-neon-green font-bold">0.66% - 0.80%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyan-300/90">Monthly:</span>
                  <span className="text-neon-green font-bold">~22%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyan-300/90">Cap:</span>
                  <span className="text-neon-green font-bold">250%</span>
                </div>
                <div className="flex justify-between border-t border-cyan-500/30 pt-2">
                  <span className="text-cyan-300/90">Time to Cap:</span>
                  <span className="text-cyan-400">~11 months</span>
                </div>
              </div>
              <div className="mt-4 cyber-glass border border-neon-green/30 rounded-lg p-3">
                <p className="text-xs text-cyan-300/90"><strong>Example:</strong> $1,000 → $7.30/day → $2,500 total</p>
              </div>
            </div>
          </div>
          <div className="cyber-glass border-2 border-neon-purple rounded-xl p-5 animate-slide-in-bottom" style={{animationDelay: '0.3s', animationFillMode: 'both'}}>
            <h3 className="text-lg font-bold text-neon-purple mb-2">Booster Qualification</h3>
            <p className="text-sm text-cyan-300/90 mb-3">Activate 5+ directs in 10 days + team volume ≥ your stake = Permanent 2x rate!</p>
          </div>
        </div>
      )
    },
    {
      title: "Income Stream 2: Booster Income",
      subtitle: "Double Your Growth Rate",
      content: (
        <div className="space-y-6">
          <p className="text-base md:text-lg text-cyan-300/90 leading-relaxed">
            Earn additional income during first 10 days when qualifying for booster + permanent doubled daily rate.
          </p>
          <div className="cyber-glass border border-neon-orange/50 rounded-xl p-6 animate-fade-in-up" style={{animationDelay: '0.1s', animationFillMode: 'both'}}>
            <h3 className="text-xl font-bold text-neon-orange mb-4">Qualification Requirements</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="cyber-glass border border-neon-green/30 rounded-lg p-4 text-center animate-scale-in" style={{animationDelay: '0.2s', animationFillMode: 'both'}}>
                <p className="text-3xl font-bold text-neon-green mb-2">5+</p>
                <p className="text-sm text-cyan-300">Direct Members</p>
                <p className="text-xs text-cyan-300/70 mt-1">In 10 days</p>
              </div>
              <div className="cyber-glass border border-neon-green/30 rounded-lg p-4 text-center animate-scale-in" style={{animationDelay: '0.3s', animationFillMode: 'both'}}>
                <p className="text-3xl font-bold text-neon-green mb-2">≥</p>
                <p className="text-sm text-cyan-300">Team Volume</p>
                <p className="text-xs text-cyan-300/70 mt-1">Equal to stake</p>
              </div>
              <div className="cyber-glass border border-neon-green/30 rounded-lg p-4 text-center animate-scale-in" style={{animationDelay: '0.4s', animationFillMode: 'both'}}>
                <p className="text-3xl font-bold text-neon-green mb-2">10</p>
                <p className="text-sm text-cyan-300">Day Window</p>
                <p className="text-xs text-cyan-300/70 mt-1">To qualify</p>
              </div>
            </div>
          </div>
          <div className="cyber-glass border-2 border-neon-green rounded-xl p-5 animate-fade-in-up" style={{animationDelay: '0.5s', animationFillMode: 'both'}}>
            <h3 className="text-lg font-bold text-neon-green mb-3">Booster Benefits</h3>
            <div className="space-y-2 text-sm text-cyan-300/90">
              <div className="flex items-start gap-2 animate-fade-in" style={{animationDelay: '0.6s', animationFillMode: 'both'}}>
                <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                <span><strong>Immediate Reward:</strong> Extra income first 10 days</span>
              </div>
              <div className="flex items-start gap-2 animate-fade-in" style={{animationDelay: '0.7s', animationFillMode: 'both'}}>
                <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                <span><strong>Permanent Upgrade:</strong> 2x daily rate forever</span>
              </div>
              <div className="flex items-start gap-2 animate-fade-in" style={{animationDelay: '0.8s', animationFillMode: 'both'}}>
                <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                <span><strong>Higher Cap:</strong> 200% → 250%</span>
              </div>
              <div className="flex items-start gap-2 animate-fade-in" style={{animationDelay: '0.9s', animationFillMode: 'both'}}>
                <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                <span><strong>Faster Maturity:</strong> 18 months → 11 months</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Direct Income Explained",
      subtitle: "Instant 5% Commission on Every Referral",
      content: (
        <div className="space-y-6">
          <div className="cyber-glass border-2 border-neon-green rounded-xl p-6 bg-gradient-to-br from-neon-green/5 to-cyan-500/5">
            <h3 className="text-xl font-bold text-neon-green mb-4">How Direct Income Works</h3>
            <div className="space-y-4">
              <div className="cyber-glass border border-cyan-500/30 rounded-lg p-4 animate-slide-in-left" style={{animationDelay: '0.1s', animationFillMode: 'both'}}>
                <h4 className="font-bold text-cyan-300 mb-2 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-neon-green text-dark-950 flex items-center justify-center text-sm font-bold">1</div>
                  Share Your Referral Link
                </h4>
                <p className="text-sm text-cyan-300/90">Every member gets a unique referral link. Share it with friends, family, or on social media.</p>
              </div>
              <div className="cyber-glass border border-cyan-500/30 rounded-lg p-4 animate-slide-in-left" style={{animationDelay: '0.2s', animationFillMode: 'both'}}>
                <h4 className="font-bold text-cyan-300 mb-2 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-neon-green text-dark-950 flex items-center justify-center text-sm font-bold">2</div>
                  They Stake (Min $50)
                </h4>
                <p className="text-sm text-cyan-300/90">When someone joins using your link and stakes minimum $50 in RAMA coins, they activate their portfolio.</p>
              </div>
              <div className="cyber-glass border border-cyan-500/30 rounded-lg p-4 animate-slide-in-left" style={{animationDelay: '0.3s', animationFillMode: 'both'}}>
                <h4 className="font-bold text-cyan-300 mb-2 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-neon-green text-dark-950 flex items-center justify-center text-sm font-bold">3</div>
                  Get 5% Instantly
                </h4>
                <p className="text-sm text-cyan-300/90">You earn 5% of their stake amount immediately in RAMA coins. You can claim to your Main Wallet or Safe Wallet.</p>
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="cyber-glass border border-cyan-500/30 rounded-xl p-4 animate-slide-in-left" style={{animationDelay: '0.4s', animationFillMode: 'both'}}>
              <h4 className="text-base font-bold text-cyan-300 mb-3">Payment Details</h4>
              <ul className="space-y-2 text-sm text-cyan-300/90">
                <li className="flex items-start gap-2">
                  <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                  <span><strong>Claim Options:</strong> Transfer earnings to your Main Wallet (5% fee) or Safe Wallet (0% fee)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                  <span><strong>Instant Payment:</strong> Received immediately upon referral activation</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                  <span><strong>No Limits:</strong> Unlimited direct referrals, unlimited earnings</span>
                </li>
              </ul>
            </div>
            <div className="cyber-glass border border-neon-green/30 rounded-xl p-4 animate-slide-in-right" style={{animationDelay: '0.5s', animationFillMode: 'both'}}>
              <h4 className="text-base font-bold text-neon-green mb-3">Real Example</h4>
              <div className="space-y-2 text-sm">
                <p className="text-cyan-300/90">You refer 20 people who each stake $500:</p>
                <div className="cyber-glass border border-cyan-500/30 rounded-lg p-3 mt-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-cyan-300">20 x $500 stakes:</span>
                    <span className="text-cyan-300 font-bold">$10,000</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-cyan-500/30 pt-2">
                    <span className="text-neon-green font-semibold">Your 5% commission:</span>
                    <span className="text-neon-green font-bold text-xl">$500</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Income Stream 3: Direct Income",
      subtitle: "5% Instant Commission",
      content: (
        <div className="space-y-6">
          <p className="text-base md:text-lg text-cyan-300/90 leading-relaxed">
            Earn <strong className="text-neon-green">5% instant commission</strong> on every direct referral activation. Claim immediately in RAMA to your wallet of choice.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="cyber-glass border border-cyan-500/30 rounded-xl p-5 animate-slide-in-left" style={{animationDelay: '0.1s', animationFillMode: 'both'}}>
              <h3 className="text-xl font-bold text-cyan-300 mb-4">How It Works</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 animate-fade-in" style={{animationDelay: '0.2s', animationFillMode: 'both'}}>
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-neon-green rounded-full flex items-center justify-center flex-shrink-0 text-dark-950 font-bold">1</div>
                  <div>
                    <p className="text-cyan-300 font-semibold text-sm">Share Your Link</p>
                    <p className="text-cyan-300/80 text-xs">Give referral link to others</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 animate-fade-in" style={{animationDelay: '0.3s', animationFillMode: 'both'}}>
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-neon-green rounded-full flex items-center justify-center flex-shrink-0 text-dark-950 font-bold">2</div>
                  <div>
                    <p className="text-cyan-300 font-semibold text-sm">They Stake</p>
                    <p className="text-cyan-300/80 text-xs">Minimum $50 activation</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 animate-fade-in" style={{animationDelay: '0.4s', animationFillMode: 'both'}}>
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-neon-green rounded-full flex items-center justify-center flex-shrink-0 text-dark-950 font-bold">3</div>
                  <div>
                    <p className="text-cyan-300 font-semibold text-sm">Get 5% Instantly</p>
                    <p className="text-cyan-300/80 text-xs">Immediate RAMA payment</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="cyber-glass border border-neon-green/30 rounded-xl p-5 animate-slide-in-right" style={{animationDelay: '0.1s', animationFillMode: 'both'}}>
              <h3 className="text-xl font-bold text-neon-green mb-4">Earnings Examples</h3>
              <div className="space-y-2">
                <div className="cyber-glass border border-cyan-500/30 rounded-lg p-3 animate-fade-in" style={{animationDelay: '0.2s', animationFillMode: 'both'}}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-cyan-300">Direct: $100</span>
                    <span className="text-neon-green font-bold">→ $5</span>
                  </div>
                </div>
                <div className="cyber-glass border border-cyan-500/30 rounded-lg p-3 animate-fade-in" style={{animationDelay: '0.3s', animationFillMode: 'both'}}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-cyan-300">Direct: $500</span>
                    <span className="text-neon-green font-bold">→ $25</span>
                  </div>
                </div>
                <div className="cyber-glass border border-cyan-500/30 rounded-lg p-3 animate-fade-in" style={{animationDelay: '0.4s', animationFillMode: 'both'}}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-cyan-300">Direct: $1,000</span>
                    <span className="text-neon-green font-bold">→ $50</span>
                  </div>
                </div>
                <div className="cyber-glass border border-neon-green/30 rounded-lg p-3 bg-gradient-to-br from-neon-green/5 to-cyan-500/5 animate-fade-in" style={{animationDelay: '0.5s', animationFillMode: 'both'}}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-cyan-300 font-semibold">10 x $500</span>
                    <span className="text-neon-green font-bold text-lg">→ $250</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Income Stream 4: Slab Income",
      subtitle: "11 Levels, 5% to 60% Distribution",
      content: (
        <div className="space-y-6">
          <p className="text-base md:text-lg text-cyan-300/90 leading-relaxed">
            Your most powerful passive income. Earn from team's daily growth across <strong className="text-neon-green">11 slab levels</strong> with up to 60% pool distribution.
          </p>
          <div className="cyber-glass border border-cyan-500/30 rounded-xl p-5 mb-4">
            <h3 className="text-lg font-bold text-cyan-300 mb-3">How Slab Works</h3>
            <p className="text-sm text-cyan-300/90 mb-3">
              60% of all team's daily growth is distributed to upline leaders based on slab level. Higher qualified volume = higher share!
            </p>
            <div className="cyber-glass border border-neon-purple/30 rounded-lg p-3">
              <p className="text-xs text-cyan-300/90"><strong>Qualified Volume:</strong> 3 legs = 40%+30%+30% | 4+ legs = 100% of all</p>
            </div>
          </div>
          <div className="max-h-[40vh] md:max-h-[50vh] overflow-y-auto custom-scrollbar pr-2 space-y-2">
            {[
              { level: 1, name: 'Coral Reef', vol: '$500', share: '5%' },
              { level: 2, name: 'Shallow Waters', vol: '$2.5K', share: '10%' },
              { level: 3, name: 'Tide Pool', vol: '$10K', share: '15%' },
              { level: 4, name: 'Wave Crest', vol: '$25K', share: '20%' },
              { level: 5, name: 'Open Sea', vol: '$50K', share: '25%' },
              { level: 6, name: 'Deep Current', vol: '$100K', share: '30%' },
              { level: 7, name: 'Ocean Floor', vol: '$500K', share: '35%' },
              { level: 8, name: 'Abyssal Zone', vol: '$1M', share: '45%' },
              { level: 9, name: 'Mariana Trench', vol: '$2.5M', share: '50%' },
              { level: 10, name: 'Pacific Master', vol: '$5M', share: '55%' },
              { level: 11, name: 'Ocean Sovereign', vol: '$20M', share: '60%' }
            ].map((slab, index) => (
              <div key={slab.level} className={`cyber-glass border rounded-lg p-3 flex items-center justify-between ${slab.level >= 9 ? 'border-neon-green/50 bg-neon-green/5' : 'border-cyan-500/30'} animate-slide-in-left`} style={{animationDelay: `${index * 0.08}s`, animationFillMode: 'both'}}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-neon-green text-dark-950 flex items-center justify-center font-bold text-sm">{slab.level}</div>
                  <div>
                    <p className={`font-bold text-sm ${slab.level >= 9 ? 'text-neon-green' : 'text-cyan-300'}`}>{slab.name}</p>
                    <p className="text-xs text-cyan-300/70">{slab.vol} volume</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-lg ${slab.level >= 9 ? 'text-neon-green' : 'text-cyan-300'}`}>{slab.share}</p>
                  <p className="text-xs text-cyan-300/70">Share</p>
                </div>
              </div>
            ))}
          </div>
          <div className="cyber-glass border-2 border-neon-green rounded-xl p-4">
            <p className="text-sm text-cyan-300/90"><strong className="text-neon-green">Example:</strong> Slab 7 with $500K team → $500/day growth → $300 to distribute → Your 35% = <strong className="text-neon-green">$105/day</strong> or <strong className="text-neon-green text-lg">$3,150/month!</strong></p>
          </div>
        </div>
      )
    },
    {
      title: "Slab Income Explained",
      subtitle: "How the 60% Pool Distribution Works",
      content: (
        <div className="space-y-6">
          <div className="cyber-glass border-2 border-cyan-500 rounded-xl p-6 bg-gradient-to-br from-cyan-500/5 to-neon-green/5">
            <h3 className="text-xl font-bold text-cyan-300 mb-4">How Slab Income Works</h3>
            <p className="text-sm text-cyan-300/90 mb-4">60% of all team members' daily growth is distributed to upline leaders based on their slab qualifications.</p>
            <div className="space-y-3">
              <div className="cyber-glass border border-neon-green/30 rounded-lg p-4">
                <h4 className="font-bold text-neon-green mb-2">Qualification Criteria</h4>
                <div className="space-y-2 text-sm text-cyan-300/90">
                  <div className="flex items-start gap-2 animate-slide-in-left" style={{animationDelay: '0.1s', animationFillMode: 'both'}}>
                    <div className="w-5 h-5 rounded-full bg-neon-green/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-neon-green">1</span>
                    </div>
                    <span><strong>Reach Volume Threshold:</strong> Build qualified team volume (40:30:30 from top 3 legs or 100% with 4+ legs)</span>
                  </div>
                  <div className="flex items-start gap-2 animate-slide-in-left" style={{animationDelay: '0.2s', animationFillMode: 'both'}}>
                    <div className="w-5 h-5 rounded-full bg-neon-green/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-neon-green">2</span>
                    </div>
                    <span><strong>Unlock Slab Level:</strong> Each volume milestone unlocks a higher slab tier with better pool share</span>
                  </div>
                  <div className="flex items-start gap-2 animate-slide-in-left" style={{animationDelay: '0.3s', animationFillMode: 'both'}}>
                    <div className="w-5 h-5 rounded-full bg-neon-green/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-neon-green">3</span>
                    </div>
                    <span><strong>Claim Requirement:</strong> Must have 1 new direct referral ($50+ stake) to claim slab earnings</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="cyber-glass border border-cyan-500/30 rounded-xl p-4 animate-slide-in-left" style={{animationDelay: '0.4s', animationFillMode: 'both'}}>
              <h4 className="text-base font-bold text-cyan-300 mb-3">Payment Details</h4>
              <ul className="space-y-2 text-sm text-cyan-300/90">
                <li className="flex items-start gap-2">
                  <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                  <span><strong>Daily Distribution:</strong> 60% of team's daily growth distributed to qualified uplines</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                  <span><strong>Higher Slab = Bigger Share:</strong> 5% → 10% → 15% → 20% → 25% → 30% → 35% → 45% → 50% → 55% → 60%</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                  <span><strong>Continues After Cap:</strong> Slab income continues even after you hit your 4x cap</span>
                </li>
              </ul>
            </div>
            <div className="cyber-glass border border-neon-green/30 rounded-xl p-4 animate-slide-in-right" style={{animationDelay: '0.5s', animationFillMode: 'both'}}>
              <h4 className="text-base font-bold text-neon-green mb-3">Example Scenario</h4>
              <div className="space-y-2 text-sm text-cyan-300/90">
                <p>You qualify for Slab 7 (Ocean Floor) with $500K team:</p>
                <div className="cyber-glass border border-cyan-500/30 rounded-lg p-3 mt-2 space-y-1">
                  <div className="flex justify-between">
                    <span>Team daily growth:</span>
                    <span className="font-bold">$500/day</span>
                  </div>
                  <div className="flex justify-between">
                    <span>60% to pool:</span>
                    <span className="font-bold">$300</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Your 35% share:</span>
                    <span className="text-neon-green font-bold">$105/day</span>
                  </div>
                  <div className="flex justify-between border-t border-cyan-500/30 pt-1">
                    <span className="text-neon-green font-semibold">Monthly:</span>
                    <span className="text-neon-green font-bold text-lg">$3,150!</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Income Stream 5: Same-Slab Override",
      subtitle: "10%, 5%, 5% Collaborative Bonus",
      content: (
        <div className="space-y-6">
          <p className="text-base md:text-lg text-cyan-300/90 leading-relaxed">
            Earn <strong className="text-neon-green">override bonuses</strong> when your downline members reach the same slab level as you. Rewards mentorship!
          </p>
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="cyber-glass border border-neon-green/30 rounded-xl p-5 text-center animate-scale-in" style={{animationDelay: '0.1s', animationFillMode: 'both'}}>
              <div className="text-4xl font-bold text-neon-green mb-2">10%</div>
              <p className="text-cyan-300 font-semibold mb-1">First Same-Slab</p>
              <p className="text-xs text-cyan-300/80">First upline at your level</p>
            </div>
            <div className="cyber-glass border border-cyan-500/30 rounded-xl p-5 text-center animate-scale-in" style={{animationDelay: '0.2s', animationFillMode: 'both'}}>
              <div className="text-4xl font-bold text-cyan-400 mb-2">5%</div>
              <p className="text-cyan-300 font-semibold mb-1">Second Same-Slab</p>
              <p className="text-xs text-cyan-300/80">Second upline at your level</p>
            </div>
            <div className="cyber-glass border border-cyan-500/30 rounded-xl p-5 text-center animate-scale-in" style={{animationDelay: '0.3s', animationFillMode: 'both'}}>
              <div className="text-4xl font-bold text-cyan-400 mb-2">5%</div>
              <p className="text-cyan-300 font-semibold mb-1">Third Same-Slab</p>
              <p className="text-xs text-cyan-300/80">Third upline at your level</p>
            </div>
          </div>
          <div className="cyber-glass border border-neon-purple/50 rounded-xl p-5 animate-fade-in-up" style={{animationDelay: '0.4s', animationFillMode: 'both'}}>
            <h3 className="text-base font-bold text-neon-purple mb-3">Example Scenario</h3>
            <p className="text-sm text-cyan-300/90">
              You reach Slab 5 earning $100/day. System finds first 3 uplines at Slab 5. They get $10, $5, $5 daily EXTRA - on top of their own earnings!
            </p>
          </div>
          <div className="cyber-glass border-2 border-neon-green rounded-xl p-4 animate-fade-in-up" style={{animationDelay: '0.5s', animationFillMode: 'both'}}>
            <h3 className="text-base font-bold text-neon-green mb-2">Why It Matters</h3>
            <ul className="space-y-1 text-sm text-cyan-300/90">
              <li>✓ Rewards top leaders for mentorship</li>
              <li>✓ Creates team motivation</li>
              <li>✓ Passive scaling as team grows</li>
              <li>✓ Automatic bonus distribution</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      title: "Income Stream 6: Royalty Program",
      subtitle: "14 Tiers: $30 to $100,000/Month",
      content: (
        <div className="space-y-6">
          <p className="text-base md:text-lg text-cyan-300/90 leading-relaxed">
            Elite monthly payouts for top performers. <strong className="text-neon-green">14 royalty tiers</strong> paid MONTHLY FOR LIFETIME with 10% growth renewal requirement every 2 months.
          </p>
          <div className="max-h-[40vh] md:max-h-[50vh] overflow-y-auto custom-scrollbar pr-2 space-y-2 mb-4">
            {ROYALTY_TIER_NAMES.map((name, i) => {
              const tiers = [
                { amt: '$30', vol: '$5K' },
                { amt: '$100', vol: '$25K' },
                { amt: '$250', vol: '$50K' },
                { amt: '$500', vol: '$100K' },
                { amt: '$1K', vol: '$250K' },
                { amt: '$2K', vol: '$500K' },
                { amt: '$3K', vol: '$750K' },
                { amt: '$5K', vol: '$1M' },
                { amt: '$7.5K', vol: '$2M' },
                { amt: '$10K', vol: '$3.5M' },
                { amt: '$15K', vol: '$5M' },
                { amt: '$25K', vol: '$10M' },
                { amt: '$50K', vol: '$20M' },
                { amt: '$100K', vol: '$50M' }
              ];
              return (
                <div key={i} className={`cyber-glass border rounded-lg p-3 flex items-center justify-between ${i >= 10 ? 'border-neon-orange/50 bg-neon-orange/5' : 'border-cyan-500/30'} animate-slide-in-right`} style={{animationDelay: `${i * 0.08}s`, animationFillMode: 'both'}}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${i >= 10 ? 'bg-gradient-to-br from-neon-orange to-red-500 text-dark-950' : 'bg-gradient-to-br from-cyan-500 to-neon-green text-dark-950'}`}>{i + 1}</div>
                    <div>
                      <p className={`font-bold text-sm ${i >= 10 ? 'text-neon-orange' : 'text-neon-green'}`}>{name}</p>
                      <p className="text-xs text-cyan-300/70">{tiers[i].vol} volume</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-base ${i >= 10 ? 'text-neon-orange' : 'text-neon-green'}`}>{tiers[i].amt}</p>
                    <p className="text-xs text-cyan-300/70">/month</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="cyber-glass border border-cyan-500/30 rounded-xl p-4">
              <h4 className="text-base font-bold text-cyan-300 mb-2">Rules</h4>
              <ul className="space-y-1 text-xs text-cyan-300/90">
                <li>✓ Achieve required team volume</li>
                <li>✓ 10% growth every 2 months</li>
                <li>✓ First payout in qualification month</li>
                <li>✓ Maximum : LifeTime</li>
              </ul>
            </div>
            <div className="cyber-glass border border-neon-green/30 rounded-xl p-4">
              <h4 className="text-base font-bold text-neon-green mb-2">Lifetime Potential</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-cyan-300">Sea Explorer /mo:</span>
                  <span className="text-neon-green font-bold">$200 × ∞</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyan-300">Marine Commander /mo:</span>
                  <span className="text-neon-green font-bold">$5,000 × ∞</span>
                </div>
                <div className="flex justify-between border-t border-cyan-500/30 pt-1">
                  <span className="text-cyan-300 font-semibold">Ocean Supreme /mo:</span>
                  <span className="text-neon-orange font-bold">$100K × ∞!</span>
                </div>
                <div className="text-center pt-2 border-t border-neon-orange/30">
                  <span className="text-neon-orange font-bold text-sm">UNLIMITED LIFETIME EARNINGS! 🌊</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Royalty Program Explained",
      subtitle: "14 Tiers - Monthly Recurring Income for LifeTime",
      content: (
        <div className="space-y-6">
          <div className="cyber-glass border-2 border-neon-purple rounded-xl p-6 bg-gradient-to-br from-neon-purple/5 to-pink-500/5">
            <h3 className="text-xl font-bold text-neon-purple mb-4">How Royalty Program Works</h3>
            <div className="space-y-3">
              <div className="cyber-glass border border-neon-orange/30 rounded-lg p-4">
                <h4 className="font-bold text-neon-orange mb-3">Qualification Criteria</h4>
                <div className="space-y-2 text-sm text-cyan-300/90">
                  <div className="flex items-start gap-2 animate-slide-in-left" style={{animationDelay: '0.1s', animationFillMode: 'both'}}>
                    <div className="w-5 h-5 rounded-full bg-neon-orange/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-neon-orange">1</span>
                    </div>
                    <span><strong>Reach Volume Threshold:</strong> Build qualified team volume to unlock your royalty tier (starts at $5,000)</span>
                  </div>
                  <div className="flex items-start gap-2 animate-slide-in-left" style={{animationDelay: '0.2s', animationFillMode: 'both'}}>
                    <div className="w-5 h-5 rounded-full bg-neon-orange/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-neon-orange">2</span>
                    </div>
                    <span><strong>Claim Monthly:</strong> Eligible to claim once per month FOR LIFETIME - No time limit or cap!</span>
                  </div>
                  <div className="flex items-start gap-2 animate-slide-in-left" style={{animationDelay: '0.3s', animationFillMode: 'both'}}>
                    <div className="w-5 h-5 rounded-full bg-neon-orange/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-neon-orange">3</span>
                    </div>
                    <span><strong>Growth Requirement:</strong> Every 2 months, team volume must show 10% growth to continue eligibility</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="cyber-glass border border-cyan-500/30 rounded-xl p-4">
              <h4 className="text-base font-bold text-cyan-300 mb-3">Payment Details</h4>
              <ul className="space-y-2 text-sm text-cyan-300/90">
                <li className="flex items-start gap-2">
                  <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                  <span><strong>Flexible Claims:</strong> You can claim royalty payments to Main Wallet (5% fee) or Safe Wallet (0% fee)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                  <span><strong>Maximum:</strong> Maximum LifeTime per tier level achieved</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                  <span><strong>Higher Tiers Available:</strong> Can upgrade to higher tiers by increasing team volume</span>
                </li>
              </ul>
            </div>
            <div className="cyber-glass border border-neon-purple/30 rounded-xl p-4">
              <h4 className="text-base font-bold text-neon-purple mb-3">Example: Coral Starter Tier</h4>
              <div className="space-y-2 text-sm text-cyan-300/90">
                <p>Reach $5,000 qualified volume:</p>
                <div className="cyber-glass border border-cyan-500/30 rounded-lg p-3 mt-2 space-y-1">
                  <div className="flex items-start gap-1">
                    <span>•</span>
                    <span>Qualify for Coral Starter tier ($30/month)</span>
                  </div>
                  <div className="flex items-start gap-1">
                    <span>•</span>
                    <span>Claim $30 monthly to your wallet for up to LifeTime</span>
                  </div>
                  <div className="flex items-start gap-1">
                    <span>•</span>
                    <span>Maintain 10% volume growth every 2 months to continue</span>
                  </div>
                  <div className="flex justify-between border-t border-cyan-500/30 pt-2 mt-2">
                    <span className="text-neon-purple font-semibold">Maximum potential:</span>
                    <span className="text-neon-purple font-bold text-lg">$720</span>
                  </div>
                  <p className="text-xs text-cyan-300/70 italic">over LifeTime from this tier alone</p>
                </div>
              </div>
            </div>
          </div>
          <div className="cyber-glass border-2 border-neon-orange rounded-xl p-4">
            <h4 className="text-base font-bold text-neon-orange mb-2">Rules & Regulations</h4>
            <ul className="space-y-1 text-sm text-cyan-300/90">
              <li>✓ First payout received in month of qualification</li>
              <li>✓ 10% growth measured from volume snapshot at qualification</li>
              <li>✓ If growth requirement not met, royalty eligibility pauses</li>
              <li>✓ Can requalify by meeting growth target in future periods</li>
              <li>✓ Top tier (Ocean Supreme) pays $100,000/month = UNLIMITED LIFETIME EARNINGS!</li>
              <li>✓ No 24-month cap - Royalties continue forever with 10% growth every 2 months</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      title: "Income Stream 7: One-Time Rewards",
      subtitle: "14 Milestone Bonuses: $100 to $1,500,000",
      content: (
        <div className="space-y-6">
          <p className="text-base md:text-lg text-cyan-300/90 leading-relaxed">
            <strong className="text-neon-green">One-time bonus rewards</strong> when you reach team volume milestones. Claim to your wallet of choice!
          </p>
          <div className="max-h-[40vh] md:max-h-[50vh] overflow-y-auto custom-scrollbar pr-2 space-y-2 mb-4">
            {REWARD_NAMES.slice(0, 14).map((name, i) => {
              const rewards = [
                { amt: '$100', vol: '$6K' },
                { amt: '$250', vol: '$15K' },
                { amt: '$500', vol: '$40K' },
                { amt: '$1,000', vol: '$120K' },
                { amt: '$2,500', vol: '$300K' },
                { amt: '$5,000', vol: '$600K' },
                { amt: '$8,000', vol: '$1.5M' },
                { amt: '$12,000', vol: '$3M' },
                { amt: '$30,000', vol: '$6M' },
                { amt: '$50,000', vol: '$15M' },
                { amt: '$85,000', vol: '$30M' },
                { amt: '$150,000', vol: '$60M' },
                { amt: '$500,000', vol: '$200M' },
                { amt: '$1,500,000', vol: '$500M' }
              ];
              return (
                <div key={i} className={`cyber-glass border rounded-lg p-3 flex items-center justify-between ${i >= 10 ? 'border-neon-purple/50 bg-neon-purple/5' : 'border-cyan-500/30'} animate-fade-in-up`} style={{animationDelay: `${i * 0.08}s`, animationFillMode: 'both'}}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${i >= 10 ? 'bg-gradient-to-br from-neon-purple to-pink-500 text-dark-950' : 'bg-gradient-to-br from-cyan-500 to-neon-green text-dark-950'}`}>{i + 1}</div>
                    <div>
                      <p className={`font-bold text-sm ${i >= 10 ? 'text-neon-purple' : 'text-cyan-300'}`}>{name}</p>
                      <p className="text-xs text-cyan-300/70">{rewards[i].vol} volume</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-base ${i >= 10 ? 'text-neon-purple' : 'text-neon-green'}`}>{rewards[i].amt}</p>
                    <p className="text-xs text-cyan-300/70">once</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="cyber-glass border-2 border-neon-green rounded-xl p-5">
            <h3 className="text-base font-bold text-neon-green mb-3">Total Potential from All Rewards</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-cyan-400">$2,246,850</p>
                <p className="text-xs text-cyan-300/80">Total bonuses</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-neon-green">14</p>
                <p className="text-xs text-cyan-300/80">Milestones</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-neon-orange">1x</p>
                <p className="text-xs text-cyan-300/80">Per lifetime</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-neon-purple">0%</p>
                <p className="text-xs text-cyan-300/80">Fee</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "One-Time Rewards Explained",
      subtitle: "Achievement Milestones with Bonus Payouts",
      content: (
        <div className="space-y-6">
          <div className="cyber-glass border-2 border-neon-green rounded-xl p-6 bg-gradient-to-br from-neon-green/5 to-cyan-500/5">
            <h3 className="text-xl font-bold text-neon-green mb-4">How One-Time Rewards Work</h3>
            <div className="space-y-3">
              <div className="cyber-glass border border-cyan-500/30 rounded-lg p-4">
                <h4 className="font-bold text-cyan-300 mb-3">Qualification Process</h4>
                <div className="space-y-2 text-sm text-cyan-300/90">
                  <div className="flex items-start gap-2 animate-slide-in-left" style={{animationDelay: '0.1s', animationFillMode: 'both'}}>
                    <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-cyan-300">1</span>
                    </div>
                    <span><strong>Reach Volume Milestone:</strong> Each reward unlocks at specific qualified team volume thresholds</span>
                  </div>
                  <div className="flex items-start gap-2 animate-slide-in-left" style={{animationDelay: '0.2s', animationFillMode: 'both'}}>
                    <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-cyan-300">2</span>
                    </div>
                    <span><strong>Automatic Eligibility:</strong> Once you reach the volume, reward becomes claimable</span>
                  </div>
                  <div className="flex items-start gap-2 animate-slide-in-left" style={{animationDelay: '0.3s', animationFillMode: 'both'}}>
                    <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-cyan-300">3</span>
                    </div>
                    <span><strong>Claim Your Bonus:</strong> Transfer bonus payment to your Main Wallet or Safe Wallet</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="cyber-glass border border-cyan-500/30 rounded-xl p-4">
              <h4 className="text-base font-bold text-cyan-300 mb-3">Payment Details</h4>
              <ul className="space-y-2 text-sm text-cyan-300/90">
                <li className="flex items-start gap-2">
                  <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                  <span><strong>Claim Options:</strong> Transfer rewards to Main Wallet (5% fee) or Safe Wallet (0% fee)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                  <span><strong>One-Time Only:</strong> Each milestone can only be claimed once per lifetime</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="text-neon-green mt-0.5 flex-shrink-0" size={16} />
                  <span><strong>Progressive Rewards:</strong> Bonuses increase from $100 to $1,500,000 as you reach higher milestones</span>
                </li>
              </ul>
            </div>
            <div className="cyber-glass border border-neon-green/30 rounded-xl p-4">
              <h4 className="text-base font-bold text-neon-green mb-3">Example: First Milestone</h4>
              <div className="space-y-2 text-sm text-cyan-300/90">
                <p>Reach $6,000 qualified volume:</p>
                <div className="cyber-glass border border-cyan-500/30 rounded-lg p-3 mt-2 space-y-1">
                  <div className="flex items-start gap-1">
                    <span>•</span>
                    <span>Unlock Coral Spark achievement</span>
                  </div>
                  <div className="flex items-start gap-1">
                    <span>•</span>
                    <span>Claim $100 bonus to your wallet</span>
                  </div>
                  <div className="flex items-start gap-1">
                    <span>•</span>
                    <span>Continue building to unlock next 13 milestones</span>
                  </div>
                  <div className="flex justify-between border-t border-cyan-500/30 pt-2 mt-2">
                    <span className="text-neon-green font-semibold">Total Potential (14 rewards):</span>
                    <span className="text-neon-green font-bold text-lg">$2,246,850</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="cyber-glass border-2 border-neon-purple rounded-xl p-4">
            <h4 className="text-base font-bold text-neon-purple mb-2">Milestone Tiers</h4>
            <div className="grid grid-cols-3 gap-3 text-xs text-cyan-300/90">
              <div className="space-y-1">
                <p className="font-semibold text-cyan-300">Early Tiers (1-3):</p>
                <p>$100-$500 • $6K-$40K volume</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-cyan-300">Mid Tiers (4-9):</p>
                <p>$1K-$30K • $120K-$6M volume</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-neon-purple">Elite Tiers (10-14):</p>
                <p>$50K-$1.5M • $15M-$500M volume</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Total Earning Potential",
      subtitle: "22.9x Return Example",
      content: (
        <div className="space-y-6">
          <p className="text-base md:text-lg text-cyan-300/90 leading-relaxed text-center mb-4">
            By combining all income streams, <strong className="text-neon-green">OCEAN DeFi offers unprecedented earning potential</strong>
          </p>
          <div className="cyber-glass border-2 border-cyan-500 rounded-xl p-6">
            <h3 className="text-xl font-bold text-cyan-300 mb-4 text-center">Example: $1,000 Stake with Active Team</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-2 border-b border-cyan-500/30 animate-fade-in" style={{animationDelay: '0.1s', animationFillMode: 'both'}}>
                <span className="text-cyan-300/90 text-sm">1. Self Income (250% cap):</span>
                <span className="text-cyan-300 font-bold">$2,500</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-cyan-500/30 animate-fade-in" style={{animationDelay: '0.2s', animationFillMode: 'both'}}>
                <span className="text-cyan-300/90 text-sm">2. Direct Income (10 x $500):</span>
                <span className="text-cyan-300 font-bold">$250</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-cyan-500/30 animate-fade-in" style={{animationDelay: '0.3s', animationFillMode: 'both'}}>
                <span className="text-cyan-300/90 text-sm">3. Slab Income (12 months):</span>
                <span className="text-cyan-300 font-bold">$3,600</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-cyan-500/30 animate-fade-in" style={{animationDelay: '0.4s', animationFillMode: 'both'}}>
                <span className="text-cyan-300/90 text-sm">4. Same-Slab Override:</span>
                <span className="text-cyan-300 font-bold">$1,200</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-cyan-500/30 animate-fade-in" style={{animationDelay: '0.5s', animationFillMode: 'both'}}>
                <span className="text-cyan-300/90 text-sm">5. One-Time Rewards (first 6):</span>
                <span className="text-cyan-300 font-bold">$9,350</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-cyan-500/30 animate-fade-in" style={{animationDelay: '0.6s', animationFillMode: 'both'}}>
                <span className="text-cyan-300/90 text-sm">6. Royalty (Sea Explorer, LifeTime):</span>
                <span className="text-cyan-300 font-bold">$6,000</span>
              </div>
              <div className="flex justify-between items-center py-3 bg-gradient-to-r from-neon-green/20 to-cyan-500/20 rounded-lg px-3 mt-3">
                <span className="text-cyan-300 font-bold text-lg">Total Potential:</span>
                <span className="text-neon-green font-bold text-2xl">$22,900</span>
              </div>
            </div>
            <p className="text-center text-neon-green font-bold text-xl mt-4">22.9x Return on Investment!</p>
          </div>
        </div>
      )
    },
    {
      title: "Platform Rules & Policies",
      subtitle: "Transparent & Fair",
      content: (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="cyber-glass border border-cyan-500/30 rounded-xl p-5 animate-scale-in" style={{animationDelay: '0.1s', animationFillMode: 'both'}}>
              <h3 className="text-lg font-bold text-cyan-300 mb-3">0% Trust Policy</h3>
              <ul className="space-y-2 text-sm text-cyan-300/90">
                <li>✓ Withdraw principal anytime</li>
                <li>✓ 72-hour freeze period</li>
                <li>✓ Cancel to resume earning</li>
                <li>✓ After 72h: 80% refund (20% fee)</li>
              </ul>
            </div>
            <div className="cyber-glass border border-cyan-500/30 rounded-xl p-5 animate-scale-in" style={{animationDelay: '0.2s', animationFillMode: 'both'}}>
              <h3 className="text-lg font-bold text-neon-green mb-3">Safe Wallet</h3>
              <ul className="space-y-2 text-sm text-cyan-300/90">
                <li>✓ 0% fee for internal transfers</li>
                <li>✓ 5% fee only on external claims</li>
                <li>✓ Perfect for compounding</li>
                <li>✓ Instant transactions</li>
              </ul>
            </div>
            <div className="cyber-glass border border-cyan-500/30 rounded-xl p-5 animate-scale-in" style={{animationDelay: '0.3s', animationFillMode: 'both'}}>
              <h3 className="text-lg font-bold text-neon-purple mb-3">Earning Caps</h3>
              <ul className="space-y-2 text-sm text-cyan-300/90">
                <li>✓ Self: 200% or 250%</li>
                <li>✓ Global: 4x total stakes</li>
                <li>✓ Slab continues after cap</li>
                <li>✓ Royalty: upto LifeTime</li>
              </ul>
            </div>
            <div className="cyber-glass border border-cyan-500/30 rounded-xl p-5 animate-scale-in" style={{animationDelay: '0.4s', animationFillMode: 'both'}}>
              <h3 className="text-lg font-bold text-neon-orange mb-3">Requirements</h3>
              <ul className="space-y-2 text-sm text-cyan-300/90">
                <li>✓ Min stake: $50</li>
                <li>✓ Slab claim: 1 new $50 direct</li>
                <li>✓ Booster: 5 directs in 10 days</li>
                <li>✓ Qualified volume: 40:30:30</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Why Choose OCEAN DeFi?",
      subtitle: "The Complete Package",
      content: (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="cyber-glass border-2 border-cyan-500 rounded-xl p-6 animate-fade-in-up" style={{animationDelay: '0.1s', animationFillMode: 'both'}}>
              <Shield className="text-cyan-400 mb-4" size={40} />
              <h3 className="text-2xl font-bold text-cyan-300 mb-4">Validator-Backed</h3>
              <p className="text-sm text-cyan-300/90">Real income from blockchain validators, not just new deposits. Sustainable long-term!</p>
            </div>
            <div className="cyber-glass border-2 border-neon-green rounded-xl p-6 animate-fade-in-up" style={{animationDelay: '0.2s', animationFillMode: 'both'}}>
              <DollarSign className="text-neon-green mb-4" size={40} />
              <h3 className="text-2xl font-bold text-neon-green mb-4">7 Income Streams</h3>
              <p className="text-sm text-cyan-300/90">Multiple ways to earn: self, booster, direct, slab, override, royalty, and one-time rewards.</p>
            </div>
            <div className="cyber-glass border-2 border-neon-purple rounded-xl p-6 animate-fade-in-up" style={{animationDelay: '0.3s', animationFillMode: 'both'}}>
              <Zap className="text-neon-purple mb-4" size={40} />
              <h3 className="text-2xl font-bold text-neon-purple mb-4">Fast & Affordable</h3>
              <p className="text-sm text-cyan-300/90">Ramestta blockchain: 2-second blocks, $0.001 fees. Lightning-fast transactions!</p>
            </div>
            <div className="cyber-glass border-2 border-neon-orange rounded-xl p-6 animate-fade-in-up" style={{animationDelay: '0.4s', animationFillMode: 'both'}}>
              <Lock className="text-neon-orange mb-4" size={40} />
              <h3 className="text-2xl font-bold text-neon-orange mb-4">0% Trust Policy</h3>
              <p className="text-sm text-cyan-300/90">Withdraw anytime with 72-hour freeze. Complete freedom and transparency!</p>
            </div>
          </div>
          <div className="cyber-glass border-2 border-neon-green rounded-xl p-8 text-center bg-gradient-to-br from-neon-green/10 to-cyan-500/10 animate-scale-in" style={{animationDelay: '0.5s', animationFillMode: 'both'}}>
            <p className="text-xl md:text-2xl text-cyan-300 leading-relaxed">
              <strong className="text-neon-green">Join thousands</strong> already earning sustainable passive income with OCEAN DeFi!
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Start Your Journey Today",
      subtitle: "Begin Earning in 3 Simple Steps",
      content: (
        <div className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="cyber-glass border-2 border-cyan-500 rounded-xl p-6 text-center animate-scale-in" style={{animationDelay: '0.1s', animationFillMode: 'both'}}>
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-neon-green rounded-full flex items-center justify-center mx-auto mb-4 text-dark-950 font-bold text-2xl">
                1
              </div>
              <h3 className="text-xl font-bold text-cyan-300 mb-3">Create Account</h3>
              <p className="text-sm text-cyan-300/80">Sign up and connect your wallet to get started</p>
            </div>
            <div className="cyber-glass border-2 border-neon-green rounded-xl p-6 text-center animate-scale-in" style={{animationDelay: '0.2s', animationFillMode: 'both'}}>
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-neon-green rounded-full flex items-center justify-center mx-auto mb-4 text-dark-950 font-bold text-2xl">
                2
              </div>
              <h3 className="text-xl font-bold text-neon-green mb-3">Stake RAMA</h3>
              <p className="text-sm text-cyan-300/80">Deposit minimum $50 to activate your portfolio</p>
            </div>
            <div className="cyber-glass border-2 border-neon-purple rounded-xl p-6 text-center animate-scale-in" style={{animationDelay: '0.3s', animationFillMode: 'both'}}>
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-neon-green rounded-full flex items-center justify-center mx-auto mb-4 text-dark-950 font-bold text-2xl">
                3
              </div>
              <h3 className="text-xl font-bold text-neon-purple mb-3">Start Earning</h3>
              <p className="text-sm text-cyan-300/80">Watch your daily growth compound automatically!</p>
            </div>
          </div>
          <div className="cyber-glass border-2 border-neon-green rounded-xl p-8 text-center">
            <h3 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green mb-4">
              Ready to Join OCEAN DeFi?
            </h3>
            <p className="text-lg text-cyan-300/90 mb-6">
              Start earning with validator-backed passive income today!
            </p>
          </div>
        </div>
      )
    }
  ];

  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }, 8000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, slides.length]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document ).webkitFullscreenElement ||
        (document ).mozFullScreenElement ||
        (document ).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'Right') {
        e.preventDefault();
        if (currentSlide < slides.length - 1) {
          nextSlide();
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'Left') {
        e.preventDefault();
        if (currentSlide > 0) {
          prevSlide();
        }
      } else if (e.key === 'Home') {
        e.preventDefault();
        setCurrentSlide(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setCurrentSlide(slides.length - 1);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentSlide, slides.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && currentSlide < slides.length - 1) {
      nextSlide();
    }
    if (isRightSwipe && currentSlide > 0) {
      prevSlide();
    }
  };

  const toggleFullscreen = async () => {
    const elem = containerRef.current;
    if (!elem) return;

    try {
      const isCurrentlyFullscreen =
        document.fullscreenElement ||
        (document ).webkitFullscreenElement ||
        (document ).mozFullScreenElement ||
        (document ).msFullscreenElement;

      if (!isCurrentlyFullscreen) {
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if ((elem ).webkitRequestFullscreen) {
          await (elem ).webkitRequestFullscreen();
        } else if ((elem ).webkitEnterFullscreen) {
          await (elem ).webkitEnterFullscreen();
        } else if ((elem ).mozRequestFullScreen) {
          await (elem ).mozRequestFullScreen();
        } else if ((elem ).msRequestFullscreen) {
          await (elem ).msRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document ).webkitExitFullscreen) {
          await (document ).webkitExitFullscreen();
        } else if ((document ).mozCancelFullScreen) {
          await (document ).mozCancelFullScreen();
        } else if ((document ).msExitFullscreen) {
          await (document ).msExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  return (
    <div
      ref={containerRef}
      className="h-screen bg-dark-950 cyber-grid-bg relative overflow-hidden flex flex-col"
    >
      <div className="fixed inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-neon-green/5 pointer-events-none" />

      <div className="h-16 cyber-glass border-b border-cyan-500/30 z-50 shadow-neon-blue flex-shrink-0">
        <div className="h-full px-4 flex items-center justify-between relative w-full mx-auto" style={{maxWidth: '1600px'}}>
          <Link to="/dashboard/presentation" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Waves className="text-cyan-400" size={28} />
            <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green">
              OCEAN DeFi
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden md:block text-sm text-cyan-300">
              Slide {currentSlide + 1} of {slides.length}
            </div>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 hover:bg-cyan-500/10 rounded-lg transition-all border border-cyan-500/20 hover:border-cyan-500/40 text-cyan-400"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-cyan-500/10 rounded-lg transition-all border border-cyan-500/20 hover:border-cyan-500/40 text-cyan-400"
              title="Fullscreen"
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>

            <button
              onClick={async () => {
                if (isFullscreen) {
                  try {
                    if (document.exitFullscreen) {
                      await document.exitFullscreen();
                    } else if ((document ).webkitExitFullscreen) {
                      await (document ).webkitExitFullscreen();
                    } else if ((document ).mozCancelFullScreen) {
                      await (document ).mozCancelFullScreen();
                    } else if ((document ).msExitFullscreen) {
                      await (document ).msExitFullscreen();
                    }
                  } catch (err) {
                    console.error('Exit fullscreen error:', err);
                  }
                }
                navigate('/dashboard/presentation');
              }}
              className="p-2 hover:bg-cyan-500/10 rounded-lg transition-all border border-cyan-500/20 hover:border-cyan-500/40 text-cyan-400"
              title="Exit Presentation"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 px-2 sm:px-4 md:px-6 lg:px-8 relative z-10 flex items-center overflow-hidden">
        <div className="mx-auto w-full h-full py-4" style={{maxWidth: '1600px'}}>
          <div className="flex items-center gap-1 md:gap-4 lg:gap-8 h-full">
            {/* Previous Button - Left Side */}
            <button
              onClick={prevSlide}
              disabled={currentSlide === 0}
              className="flex-shrink-0 p-1.5 md:p-3 lg:p-4 cyber-glass border-2 border-cyan-500/30 rounded-lg md:rounded-xl hover:border-cyan-500/50 transition-all disabled:opacity-20 disabled:cursor-not-allowed text-cyan-300 hover:shadow-neon-cyan active:scale-95"
            >
              <ChevronLeft size={18} className="md:w-7 md:h-7" />
            </button>

            {/* Content Area */}
            <div
              className="flex-1 flex flex-col h-full min-w-0"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{touchAction: 'pan-y'}}
            >
              <div key={currentSlide} className="cyber-glass rounded-xl md:rounded-3xl p-3 md:p-8 lg:p-12 border-2 border-cyan-500/30 flex-1 flex flex-col overflow-hidden">
                <div className="mb-2 md:mb-6 text-center flex-shrink-0">
                  <h2 className="text-base md:text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-neon-green mb-0.5 md:mb-2 leading-tight animate-slide-in-top">
                    {slides[currentSlide].title}
                  </h2>
                  <p className="text-[10px] md:text-base lg:text-xl text-cyan-300/90 leading-tight animate-fade-in" style={{animationDelay: '0.1s'}}>
                    {slides[currentSlide].subtitle}
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 md:pr-2">
                  {slides[currentSlide].content}
                </div>
              </div>

              {/* Slide Indicators - Bottom */}
              <div className="flex items-center justify-center gap-1 md:gap-2 mt-2 md:mt-4 flex-shrink-0">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`h-1 md:h-2 rounded-full transition-all ${
                      index === currentSlide
                        ? 'bg-neon-green w-4 md:w-8'
                        : 'bg-cyan-500/30 hover:bg-cyan-500/50 w-1 md:w-2'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Next Button - Right Side */}
            <button
              onClick={nextSlide}
              disabled={currentSlide === slides.length - 1}
              className="flex-shrink-0 p-1.5 md:p-3 lg:p-4 cyber-glass border-2 border-cyan-500/30 rounded-lg md:rounded-xl hover:border-cyan-500/50 transition-all disabled:opacity-20 disabled:cursor-not-allowed text-cyan-300 hover:shadow-neon-cyan active:scale-95"
            >
              <ChevronRight size={18} className="md:w-7 md:h-7" />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(6, 182, 212, 0.1);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(6, 182, 212, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(6, 182, 212, 0.5);
        }

        @media (prefers-reduced-motion: no-preference) {
          [class*="animate-"] {
            animation-play-state: running;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          [class*="animate-"] {
            animation: none !important;
          }
        }

        /* Landscape mode support for mobile devices */
        @media (max-height: 500px) and (orientation: landscape) {
          .cyber-glass {
            padding: 0.5rem !important;
          }
          h2 {
            font-size: 1rem !important;
            margin-bottom: 0.25rem !important;
          }
          p {
            font-size: 0.75rem !important;
          }
        }
      `}</style>
    </div>
  );
}

export default Presentation;






















































// import { useState, useEffect, useRef } from 'react';
// import { Link, useNavigate } from 'react-router-dom';
// import { Waves, ChevronLeft, ChevronRight, X, Shield, Zap, DollarSign, Lock, CheckCircle, Maximize, Minimize, Play, Pause } from 'lucide-react';

// function Presentation() {
//   const navigate = useNavigate();

//   const SLAB_TIER_NAMES = [
//     'Coral Reef', 'Shallow Waters', 'Tide Pool', 'Wave Crest', 'Open Sea',
//     'Deep Current', 'Ocean Floor', 'Abyssal Zone', 'Mariana Trench',
//     'Pacific Master', 'Ocean Sovereign'
//   ];

//   const REWARD_NAMES = [
//     'Coral Spark', 'Pearl Bloom', 'Shell Harvest', 'Wave Bounty', 'Tide Treasure',
//     'Blue Depth Bonus', 'Guardian\'s Gift', 'Captain\'s Chest', 'Trident Gem',
//     'Sea Legend Award', 'Abyss Crown', 'Poseidon\'s Favor', 'Neptune Scepter', 'Ocean Infinity'
//   ];

//   const ROYALTY_TIER_NAMES = [
//     'Coral Starter', 'Pearl Diver', 'Sea Explorer', 'Wave Rider', 'Tide Surge',
//     'Deep Blue', 'Ocean Guardian', 'Marine Commander', 'Aqua Captain',
//     'Current Master', 'Sea Legend', 'Trident Icon', 'Poseidon Crown', 'Ocean Supreme'
//   ];

//   const slides = [
//     {
//       title: "Welcome to OCEAN DeFi",
//       subtitle: "The Future of Decentralized Finance on Ramestta Blockchain",
//       content: (
//         <div className="space-y-2 md:space-y-6 text-center slide-content">
//           <div className="w-16 h-16 md:w-32 md:h-32 bg-gradient-to-br from-cyan-500 to-green-400 rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto animate-scale-in">
//             <Waves className="text-gray-900" size={32} />
//           </div>
//           <h2 className="text-xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-green-400 bg-clip-text text-transparent mb-0.5 md:mb-2 leading-tight animate-fade-in-up delay-100">
//             OCEAN DeFi
//           </h2>
//           <p className="text-xs md:text-lg lg:text-2xl text-cyan-300 max-w-3xl mx-auto leading-snug md:leading-relaxed px-1 animate-fade-in-up delay-200">
//             A revolutionary validator-backed DeFi ecosystem with 7 income streams. Built on Ramestta blockchain for security, speed, and sustainability.
//           </p>
//           <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 lg:gap-6 mt-2 md:mt-8 animate-fade-in-up delay-300">
//             <div className="bg-gray-800/50 backdrop-blur-sm border-2 border-cyan-500 rounded-lg md:rounded-xl p-2 md:p-4 lg:p-6 hover:shadow-lg hover:shadow-cyan-500/50 transition-all">
//               <p className="text-2xl md:text-4xl font-bold text-green-400 mb-0.5 md:mb-2">6</p>
//               <p className="text-[9px] md:text-sm text-cyan-300 leading-tight">Income Streams</p>
//             </div>
//             <div className="bg-gray-800/50 backdrop-blur-sm border-2 border-green-400 rounded-lg md:rounded-xl p-2 md:p-4 lg:p-6 hover:shadow-lg hover:shadow-green-400/50 transition-all">
//               <p className="text-2xl md:text-4xl font-bold text-green-400 mb-0.5 md:mb-2">4x</p>
//               <p className="text-[9px] md:text-sm text-cyan-300 leading-tight">Lifetime Cap</p>
//             </div>
//             <div className="bg-gray-800/50 backdrop-blur-sm border-2 border-purple-500 rounded-lg md:rounded-xl p-2 md:p-4 lg:p-6 hover:shadow-lg hover:shadow-purple-500/50 transition-all">
//               <p className="text-2xl md:text-4xl font-bold text-purple-400 mb-0.5 md:mb-2">0%</p>
//               <p className="text-[9px] md:text-sm text-cyan-300 leading-tight">Trust Policy</p>
//             </div>
//             <div className="bg-gray-800/50 backdrop-blur-sm border-2 border-orange-500 rounded-lg md:rounded-xl p-2 md:p-4 lg:p-6 hover:shadow-lg hover:shadow-orange-500/50 transition-all">
//               <p className="text-2xl md:text-4xl font-bold text-orange-400 mb-0.5 md:mb-2">$50</p>
//               <p className="text-[9px] md:text-sm text-cyan-300 leading-tight">Min Stake</p>
//             </div>
//           </div>
//         </div>
//       )
//     },
//     {
//       title: "The Evolution of Money",
//       subtitle: "From Barter to Blockchain",
//       content: (
//         <div className="space-y-4 slide-content">
//           <p className="text-base md:text-lg text-cyan-300/90 text-center mb-6 animate-fade-in">
//             Understanding how money evolved helps us appreciate why blockchain represents the next revolution
//           </p>
//           <div className="grid md:grid-cols-3 gap-4 animate-fade-in-up delay-100">
//             {[
//               { num: "1", title: "Barter System", desc: "Direct exchange of goods", issue: "Limited by double coincidence", color: "orange" },
//               { num: "2-3", title: "Commodity & Coins", desc: "Precious metals, minted coins", issue: "Heavy, hard to divide", color: "yellow" },
//               { num: "4", title: "Paper Money", desc: "Banknotes backed by gold", issue: "Portable, divisible", color: "green", positive: true },
//               { num: "5", title: "Digital Banking", desc: "Credit cards, online transfers", issue: "Banks control everything", color: "purple" },
//               { num: "6", title: "Cryptocurrency", desc: "Blockchain, decentralized", issue: "You control your assets", color: "cyan", positive: true },
//               { num: "7", title: "DeFi", desc: "Automated finance, no banks", issue: "The Future is Here!", color: "green", positive: true, featured: true }
//             ].map((item, i) => (
//               <div
//                 key={i}
//                 className={`bg-gray-800/50 backdrop-blur-sm border ${item.featured ? 'border-2 border-green-400 bg-gradient-to-br from-green-400/10 to-cyan-500/10' : `border-${item.color}-400/30`} rounded-xl p-4 animate-slide-in`}
//                 style={{ animationDelay: `${i * 100}ms` }}
//               >
//                 <div className={`text-3xl font-bold text-${item.color}-400 mb-2`}>{item.num}</div>
//                 <h4 className={`text-lg font-bold ${item.featured ? 'text-green-400' : 'text-cyan-300'} mb-2`}>{item.title}</h4>
//                 <p className="text-sm text-cyan-300/80">{item.desc}</p>
//                 <p className={`text-xs ${item.positive ? 'text-green-400' : 'text-red-400'} mt-2 ${item.featured ? 'font-semibold' : ''}`}>{item.issue}</p>
//               </div>
//             ))}
//           </div>
//         </div>
//       )
//     },
//     {
//       title: "Start Your Journey Today",
//       subtitle: "Begin Earning in 3 Simple Steps",
//       content: (
//         <div className="space-y-6 slide-content">
//           <div className="grid md:grid-cols-3 gap-6 animate-fade-in-up">
//             {[
//               { num: 1, title: "Create Account", desc: "Sign up and connect your wallet to get started", icon: "🔐" },
//               { num: 2, title: "Stake RAMA", desc: "Deposit minimum $50 to activate your portfolio", icon: "💰" },
//               { num: 3, title: "Start Earning", desc: "Watch your daily growth compound automatically!", icon: "🚀" }
//             ].map((step, i) => (
//               <div
//                 key={i}
//                 className="bg-gray-800/50 backdrop-blur-sm border-2 border-cyan-500 rounded-xl p-6 text-center hover:shadow-lg hover:shadow-cyan-500/50 transition-all animate-scale-in"
//                 style={{ animationDelay: `${i * 150}ms` }}
//               >
//                 <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-green-400 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-900 font-bold text-2xl">
//                   {step.num}
//                 </div>
//                 <h3 className="text-xl font-bold text-cyan-300 mb-3">{step.title}</h3>
//                 <p className="text-sm text-cyan-300/80">{step.desc}</p>
//               </div>
//             ))}
//           </div>
//           <div className="bg-gray-800/50 backdrop-blur-sm border-2 border-green-400 rounded-xl p-8 text-center animate-fade-in-up delay-300">
//             <h3 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-green-400 bg-clip-text text-transparent mb-4">
//               Ready to Join OCEAN DeFi?
//             </h3>
//             <p className="text-lg text-cyan-300/90 mb-6">
//               Start earning with validator-backed passive income today!
//             </p>
//             <div className="flex flex-col sm:flex-row gap-4 justify-center">
//               <button
//                 onClick={() => navigate('/login')}
//                 className="px-10 py-4 bg-gradient-to-r from-cyan-500 to-green-400 text-gray-900 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all inline-flex items-center justify-center gap-2"
//               >
//                 Launch App →
//               </button>
//               <button
//                 onClick={() => navigate('/')}
//                 className="px-10 py-4 bg-gray-800/50 backdrop-blur-sm border-2 border-cyan-500 text-cyan-300 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
//               >
//                 Learn More
//               </button>
//             </div>
//           </div>
//         </div>
//       )
//     }
//   ];

//   const [currentSlide, setCurrentSlide] = useState(0);
//   const [isPlaying, setIsPlaying] = useState(false);
//   const [isFullscreen, setIsFullscreen] = useState(false);
//   const [slideDirection, setSlideDirection] = useState<'forward' | 'backward'>('forward');
//   const containerRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     let interval: NodeJS.Timeout;
//     if (isPlaying) {
//       interval = setInterval(() => {
//         setSlideDirection('forward');
//         setCurrentSlide((prev) => (prev + 1) % slides.length);
//       }, 8000);
//     }
//     return () => clearInterval(interval);
//   }, [isPlaying, slides.length]);

//   useEffect(() => {
//     const handleFullscreenChange = () => {
//       const isCurrentlyFullscreen = !!(
//         document.fullscreenElement ||
//         (document as any).webkitFullscreenElement ||
//         (document as any).mozFullScreenElement ||
//         (document as any).msFullscreenElement
//       );
//       setIsFullscreen(isCurrentlyFullscreen);
//     };

//     document.addEventListener('fullscreenchange', handleFullscreenChange);
//     document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
//     document.addEventListener('mozfullscreenchange', handleFullscreenChange);
//     document.addEventListener('MSFullscreenChange', handleFullscreenChange);

//     return () => {
//       document.removeEventListener('fullscreenchange', handleFullscreenChange);
//       document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
//       document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
//       document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
//     };
//   }, []);

//   const nextSlide = () => {
//     setSlideDirection('forward');
//     setCurrentSlide((prev) => (prev + 1) % slides.length);
//   };

//   const prevSlide = () => {
//     setSlideDirection('backward');
//     setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
//   };

//   const toggleFullscreen = async () => {
//     const elem = containerRef.current;
//     if (!elem) return;

//     try {
//       const isCurrentlyFullscreen =
//         document.fullscreenElement ||
//         (document as any).webkitFullscreenElement ||
//         (document as any).mozFullScreenElement ||
//         (document as any).msFullscreenElement;

//       if (!isCurrentlyFullscreen) {
//         if (elem.requestFullscreen) {
//           await elem.requestFullscreen();
//         } else if ((elem as any).webkitRequestFullscreen) {
//           await (elem as any).webkitRequestFullscreen();
//         } else if ((elem as any).mozRequestFullScreen) {
//           await (elem as any).mozRequestFullScreen();
//         } else if ((elem as any).msRequestFullscreen) {
//           await (elem as any).msRequestFullscreen();
//         }
//       } else {
//         if (document.exitFullscreen) {
//           await document.exitFullscreen();
//         } else if ((document as any).webkitExitFullscreen) {
//           await (document as any).webkitExitFullscreen();
//         } else if ((document as any).mozCancelFullScreen) {
//           await (document as any).mozCancelFullScreen();
//         } else if ((document as any).msExitFullscreen) {
//           await (document as any).msExitFullscreen();
//         }
//       }
//     } catch (err) {
//       console.error('Fullscreen error:', err);
//     }
//   };

//   return (
//     <div
//       ref={containerRef}
//       className="min-h-screen bg-gray-900 relative overflow-hidden"
//     >
//       <div className="fixed inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-green-400/5 pointer-events-none" />

//       <div className="fixed top-0 left-0 right-0 h-16 bg-gray-800/50 backdrop-blur-sm border-b border-cyan-500/30 z-50">
//         <div className="h-full px-4 flex items-center justify-between relative max-w-7xl mx-auto">
//           <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
//             <Waves className="text-cyan-400" size={28} />
//             <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-green-400 bg-clip-text text-transparent">
//               OCEAN DeFi
//             </span>
//           </Link>

//           <div className="flex items-center gap-3">
//             <div className="hidden md:block text-sm text-cyan-300">
//               Slide {currentSlide + 1} of {slides.length}
//             </div>

//             <button
//               onClick={() => setIsPlaying(!isPlaying)}
//               className="p-2 hover:bg-cyan-500/10 rounded-lg transition-all border border-cyan-500/20 hover:border-cyan-500/40 text-cyan-400"
//               title={isPlaying ? "Pause" : "Play"}
//             >
//               {isPlaying ? <Pause size={20} /> : <Play size={20} />}
//             </button>

//             <button
//               onClick={toggleFullscreen}
//               className="p-2 hover:bg-cyan-500/10 rounded-lg transition-all border border-cyan-500/20 hover:border-cyan-500/40 text-cyan-400"
//               title="Fullscreen"
//             >
//               {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
//             </button>

//             <Link
//               to="/"
//               className="p-2 hover:bg-cyan-500/10 rounded-lg transition-all border border-cyan-500/20 hover:border-cyan-500/40 text-cyan-400"
//               title="Exit Presentation"
//             >
//               <X size={20} />
//             </Link>
//           </div>
//         </div>
//       </div>

//       <div className="pt-14 md:pt-16 pb-4 md:pb-8 px-1 sm:px-4 lg:px-8 relative z-10 min-h-screen flex items-center">
//         <div className="max-w-7xl mx-auto w-full">
//           <div className="flex items-center gap-1 md:gap-4 lg:gap-8">
//             <button
//               onClick={prevSlide}
//               disabled={currentSlide === 0}
//               className="flex-shrink-0 p-1.5 md:p-3 lg:p-4 bg-gray-800/50 backdrop-blur-sm border-2 border-cyan-500/30 rounded-lg md:rounded-xl hover:border-cyan-500/50 transition-all disabled:opacity-20 disabled:cursor-not-allowed text-cyan-300 hover:shadow-lg hover:shadow-cyan-500/50 active:scale-95"
//             >
//               <ChevronLeft size={18} className="md:w-7 md:h-7" />
//             </button>

//             <div className="flex-1 flex flex-col max-h-[calc(100vh-7rem)] md:max-h-none md:min-h-[75vh] min-w-0 mt-8">
//               <div
//                 key={currentSlide}
//                 className={`bg-gray-800/50 backdrop-blur-sm rounded-xl md:rounded-3xl p-3 md:p-8 lg:p-12 border-2 border-cyan-500/30 flex-1 flex flex-col overflow-hidden slide-transition ${slideDirection}`}
//               >
//                 <div className="mb-2 md:mb-6 text-center flex-shrink-0">
//                   <h2 className="text-base md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-green-400 bg-clip-text text-transparent mb-0.5 md:mb-2 leading-tight animate-fade-in">
//                     {slides[currentSlide].title}
//                   </h2>
//                   <p className="text-[10px] md:text-base lg:text-xl text-cyan-300/90 leading-tight animate-fade-in delay-100">
//                     {slides[currentSlide].subtitle}
//                   </p>
//                 </div>

//                 <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 md:pr-2">
//                   {slides[currentSlide].content}
//                 </div>
//               </div>

//               <div className="flex items-center justify-center gap-1 md:gap-2 mt-2 md:mt-6 flex-shrink-0">
//                 {slides.map((_, index) => (
//                   <button
//                     key={index}
//                     onClick={() => {
//                       setSlideDirection(index > currentSlide ? 'forward' : 'backward');
//                       setCurrentSlide(index);
//                     }}
//                     className={`h-1 md:h-2 rounded-full transition-all ${
//                       index === currentSlide
//                         ? 'bg-green-400 w-4 md:w-8'
//                         : 'bg-cyan-500/30 hover:bg-cyan-500/50 w-1 md:w-2'
//                     }`}
//                   />
//                 ))}
//               </div>
//             </div>

//             <button
//               onClick={nextSlide}
//               disabled={currentSlide === slides.length - 1}
//               className="flex-shrink-0 p-1.5 md:p-3 lg:p-4 bg-gray-800/50 backdrop-blur-sm border-2 border-cyan-500/30 rounded-lg md:rounded-xl hover:border-cyan-500/50 transition-all disabled:opacity-20 disabled:cursor-not-allowed text-cyan-300 hover:shadow-lg hover:shadow-cyan-500/50 active:scale-95"
//             >
//               <ChevronRight size={18} className="md:w-7 md:h-7" />
//             </button>
//           </div>
//         </div>
//       </div>

//       <style>{`
//         .custom-scrollbar::-webkit-scrollbar {
//           width: 6px;
//         }
//         .custom-scrollbar::-webkit-scrollbar-track {
//           background: rgba(6, 182, 212, 0.1);
//           border-radius: 3px;
//         }
//         .custom-scrollbar::-webkit-scrollbar-thumb {
//           background: rgba(6, 182, 212, 0.3);
//           border-radius: 3px;
//         }
//         .custom-scrollbar::-webkit-scrollbar-thumb:hover {
//           background: rgba(6, 182, 212, 0.5);
//         }

//         /* Slide transition animations */
//         @keyframes fadeIn {
//           from {
//             opacity: 0;
//           }
//           to {
//             opacity: 1;
//           }
//         }

//         @keyframes fadeInUp {
//           from {
//             opacity: 0;
//             transform: translateY(20px);
//           }
//           to {
//             opacity: 1;
//             transform: translateY(0);
//           }
//         }

//         @keyframes scaleIn {
//           from {
//             opacity: 0;
//             transform: scale(0.9);
//           }
//           to {
//             opacity: 1;
//             transform: scale(1);
//           }
//         }

//         @keyframes slideIn {
//           from {
//             opacity: 0;
//             transform: translateX(-20px);
//           }
//           to {
//             opacity: 1;
//             transform: translateX(0);
//           }
//         }

//         @keyframes slideTransition {
//           from {
//             opacity: 0;
//             transform: translateX(50px);
//           }
//           to {
//             opacity: 1;
//             transform: translateX(0);
//           }
//         }

//         @keyframes slideTransitionBackward {
//           from {
//             opacity: 0;
//             transform: translateX(-50px);
//           }
//           to {
//             opacity: 1;
//             transform: translateX(0);
//           }
//         }

//         .animate-fade-in {
//           animation: fadeIn 0.6s ease-out forwards;
//         }

//         .animate-fade-in-up {
//           animation: fadeInUp 0.8s ease-out forwards;
//         }

//         .animate-scale-in {
//           animation: scaleIn 0.6s ease-out forwards;
//         }

//         .animate-slide-in {
//           animation: slideIn 0.6s ease-out forwards;
//         }

//         .slide-transition {
//           animation: slideTransition 0.5s ease-out;
//         }

//         .slide-transition.backward {
//           animation: slideTransitionBackward 0.5s ease-out;
//         }

//         .delay-100 {
//           animation-delay: 0.1s;
//           opacity: 0;
//         }

//         .delay-200 {
//           animation-delay: 0.2s;
//           opacity: 0;
//         }

//         .delay-300 {
//           animation-delay: 0.3s;
//           opacity: 0;
//         }

//         .slide-content > * {
//           animation-fill-mode: forwards;
//         }
//       `}</style>
//     </div>
//   );
// }

// export default Presentation;
