import { TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle2 } from 'lucide-react';

const TokenomicsComparison = () => {
  const networks = [
    {
      name: 'Ethereum',
      symbol: 'ETH',
      totalSupply: 'No cap',
      circulatingSupply: '~120,707,000',
      circulatingPercent: 'N/A',
      dailyMint: '~1,600-2,000',
      dailyBurn: '~200-500',
      netDaily: '+1,100 to +1,800',
      trend: 'inflationary',
      color: 'blue-400',
    },
    {
      name: 'Polygon',
      symbol: 'MATIC/POL',
      totalSupply: '10,000,000,000',
      circulatingSupply: 'Varies',
      circulatingPercent: 'Unknown',
      dailyMint: 'Unknown',
      dailyBurn: 'Tracked but not daily',
      netDaily: 'Unknown',
      trend: 'neutral',
      color: 'purple-400',
    },
    {
      name: 'BNB Chain',
      symbol: 'BNB',
      totalSupply: 'Dynamic (burns reduce)',
      circulatingSupply: '~139,181,000',
      circulatingPercent: 'N/A',
      dailyMint: 'Unknown',
      dailyBurn: 'Periodic burns (~1.6M per event)',
      netDaily: 'Unknown',
      trend: 'deflationary',
      color: 'yellow-400',
    },
    {
      name: 'TRON',
      symbol: 'TRX',
      totalSupply: 'No cap',
      circulatingSupply: '~94,700,000,000',
      circulatingPercent: 'N/A',
      dailyMint: '~5,050,000',
      dailyBurn: 'Unknown',
      netDaily: '+5,050,000',
      trend: 'inflationary',
      color: 'red-400',
    },
    {
      name: 'Ramestta',
      symbol: 'RAMA',
      totalSupply: '1,000,000,000',
      circulatingSupply: '4,000,000',
      circulatingPercent: '0.4%',
      dailyMint: '4,200',
      dailyBurn: '2-5',
      netDaily: '+4,195 to +4,198',
      trend: 'controlled',
      color: 'neon-green',
      highlight: true,
    },
  ];

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'inflationary':
        return <TrendingUp className="text-red-400" size={18} />;
      case 'deflationary':
        return <TrendingDown className="text-neon-green" size={18} />;
      case 'controlled':
        return <CheckCircle2 className="text-neon-green" size={18} />;
      default:
        return <Minus className="text-yellow-400" size={18} />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="cyber-glass border border-cyan-500/30 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-cyan-400 flex-shrink-0 mt-1" size={20} />
          <div>
            <h4 className="text-sm font-bold text-cyan-300 mb-2">Understanding the Data</h4>
            <p className="text-xs text-cyan-300/80 leading-relaxed">
              This comparison shows key tokenomics metrics across major blockchain networks.
              <strong className="text-neon-green"> RAMA's unique advantage</strong> is its extremely limited circulating supply
              (only 0.4% of total) compared to competitors, creating natural scarcity that drives price appreciation as demand grows.
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b-2 border-cyan-500/30">
              <th className="text-left p-3 text-sm font-bold text-cyan-300">Network / Token</th>
              <th className="text-left p-3 text-sm font-bold text-cyan-300">Total Supply</th>
              <th className="text-left p-3 text-sm font-bold text-cyan-300">Circulating Supply</th>
              <th className="text-left p-3 text-sm font-bold text-cyan-300">Daily Mint</th>
              <th className="text-left p-3 text-sm font-bold text-cyan-300">Daily Burn</th>
              <th className="text-left p-3 text-sm font-bold text-cyan-300">Net Daily</th>
              <th className="text-left p-3 text-sm font-bold text-cyan-300">Trend</th>
            </tr>
          </thead>
          <tbody>
            {networks.map((network, index) => (
              <tr
                key={network.symbol}
                className={`border-b border-cyan-500/10 transition-all ${
                  network.highlight
                    ? 'bg-gradient-to-r from-neon-green/10 to-cyan-500/10 hover:from-neon-green/15 hover:to-cyan-500/15'
                    : 'hover:bg-cyan-500/5'
                }`}
              >
                <td className="p-3">
                  <div className="flex flex-col">
                    <span className={`font-bold ${network.highlight ? 'text-neon-green' : 'text-cyan-300'}`}>
                      {network.name}
                    </span>
                    <span className={`text-xs ${network.highlight ? 'text-neon-green/70' : 'text-cyan-300/70'}`}>
                      ({network.symbol})
                    </span>
                  </div>
                </td>
                <td className="p-3">
                  <span className="text-sm text-cyan-300/90">{network.totalSupply}</span>
                </td>
                <td className="p-3">
                  <div className="flex flex-col">
                    <span className={`text-sm ${network.highlight ? 'text-neon-green font-bold' : 'text-cyan-300/90'}`}>
                      {network.circulatingSupply}
                    </span>
                    {network.circulatingPercent && (
                      <span className={`text-xs font-bold ${network.highlight ? 'text-neon-green' : 'text-cyan-300/70'}`}>
                        ({network.circulatingPercent})
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3">
                  <span className="text-sm text-cyan-300/90">{network.dailyMint}</span>
                </td>
                <td className="p-3">
                  <span className="text-sm text-cyan-300/90">{network.dailyBurn}</span>
                </td>
                <td className="p-3">
                  <span className={`text-sm ${network.trend === 'inflationary' ? 'text-red-400' : 'text-cyan-300/90'}`}>
                    {network.netDaily}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    {getTrendIcon(network.trend)}
                    <span className="text-xs text-cyan-300/70 capitalize">{network.trend}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-8">
        <div className="cyber-glass border-2 border-neon-green rounded-xl p-6">
          <h4 className="text-xl font-bold text-neon-green mb-4 flex items-center gap-2">
            <CheckCircle2 size={24} />
            RAMA's Supply Advantage
          </h4>
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="text-neon-green mt-1 flex-shrink-0" size={16} />
              <p className="text-sm text-cyan-300/90">
                <strong>Only 0.4% circulating</strong> - 996M RAMA locked with validators and reserves
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="text-neon-green mt-1 flex-shrink-0" size={16} />
              <p className="text-sm text-cyan-300/90">
                <strong>Fixed 1B cap</strong> - Unlike ETH and TRON with no supply limits
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="text-neon-green mt-1 flex-shrink-0" size={16} />
              <p className="text-sm text-cyan-300/90">
                <strong>Minimal daily inflation</strong> - 4,200 minted (~0.105% of circulating daily)
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="text-neon-green mt-1 flex-shrink-0" size={16} />
              <p className="text-sm text-cyan-300/90">
                <strong>Staking removes supply</strong> - OCEAN DeFi users lock RAMA, reducing market availability
              </p>
            </div>
          </div>
        </div>

        <div className="cyber-glass border-2 border-cyan-500 rounded-xl p-6">
          <h4 className="text-xl font-bold text-cyan-300 mb-4 flex items-center gap-2">
            <TrendingUp size={24} />
            Growing Demand Drivers
          </h4>
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <TrendingUp className="text-cyan-400 mt-1 flex-shrink-0" size={16} />
              <p className="text-sm text-cyan-300/90">
                <strong>OCEAN DeFi growth</strong> - More users staking RAMA for 7 income streams
              </p>
            </div>
            <div className="flex items-start gap-2">
              <TrendingUp className="text-cyan-400 mt-1 flex-shrink-0" size={16} />
              <p className="text-sm text-cyan-300/90">
                <strong>Exchange listings</strong> - BitMart, Koinpark live; more tier-1 exchanges coming 2025-2026
              </p>
            </div>
            <div className="flex items-start gap-2">
              <TrendingUp className="text-cyan-400 mt-1 flex-shrink-0" size={16} />
              <p className="text-sm text-cyan-300/90">
                <strong>Ecosystem expansion</strong> - RamaSwap, RamaPay, RamaBridge driving utility demand
              </p>
            </div>
            <div className="flex items-start gap-2">
              <TrendingUp className="text-cyan-400 mt-1 flex-shrink-0" size={16} />
              <p className="text-sm text-cyan-300/90">
                <strong>Network growth</strong> - Layer 3 DeFi apps choosing Ramestta for low fees
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="cyber-glass border-2 border-neon-orange rounded-xl p-6 bg-gradient-to-br from-neon-orange/5 to-yellow-500/5">
        <h4 className="text-xl font-bold text-neon-orange mb-4">Supply-Demand Economics: Why RAMA Price Will Rise</h4>
        <div className="space-y-4">
          <p className="text-base text-cyan-300/90 leading-relaxed">
            Basic economics: <strong className="text-neon-green">When supply is limited and demand increases, prices rise.</strong>
          </p>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-dark-950/50 rounded-lg p-4">
              <p className="text-neon-green font-bold text-lg mb-2">Extreme Scarcity</p>
              <p className="text-sm text-cyan-300/80">
                RAMA has 30x less circulating supply than Ethereum (4M vs 120M+) and 23,000x less than TRON (4M vs 94B)
              </p>
            </div>

            <div className="bg-dark-950/50 rounded-lg p-4">
              <p className="text-cyan-400 font-bold text-lg mb-2">Growing Utility</p>
              <p className="text-sm text-cyan-300/80">
                Every OCEAN DeFi user must buy and stake RAMA. More users = more buying pressure on limited supply
              </p>
            </div>

            <div className="bg-dark-950/50 rounded-lg p-4">
              <p className="text-neon-purple font-bold text-lg mb-2">Market Discovery</p>
              <p className="text-sm text-cyan-300/80">
                As RAMA lists on major exchanges, true price discovery will reveal its value compared to higher-supply competitors
              </p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-neon-green/10 border border-neon-green/30 rounded-lg">
            <p className="text-sm text-cyan-300/90 leading-relaxed">
              <strong className="text-neon-green">Example:</strong> If RAMA reaches the same market interest as a major chain but with 30x less supply,
              the price per token would be significantly higher. A $100M market cap spread across 4M circulating coins ($25/token) versus
              120M coins ($0.83/token) demonstrates the scarcity premium.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenomicsComparison;
