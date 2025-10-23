import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import TradingViewWidget from './TradingViewWidget';

export default function LivePriceFeed() {
  const [price, setPrice] = useState(0.0245);
  const [priceChange, setPriceChange] = useState(0);
  const [isIncreasing, setIsIncreasing] = useState(true);
  const [priceHistory, setPriceHistory] = useState([]);

  useEffect(() => {
    const initialHistory = Array.from({ length: 20 }, (_, i) => ({
      price: 0.0245 + (Math.random() - 0.5) * 0.001,
      time: Date.now() - (20 - i) * 3000
    }));
    setPriceHistory(initialHistory);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPrice((prevPrice) => {
        const change = (Math.random() - 0.48) * 0.0003;
        const newPrice = Math.max(0.02, prevPrice + change);
        const percentChange = ((newPrice - prevPrice) / prevPrice) * 100;

        setPriceChange(percentChange);
        setIsIncreasing(change >= 0);

        setPriceHistory(prev => {
          const newHistory = [...prev, { price: newPrice, time: Date.now() }];
          return newHistory.slice(-20);
        });

        return parseFloat(newPrice.toFixed(6));
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const renderMiniChart = () => {
    if (priceHistory.length < 2) return null;

    const prices = priceHistory.map(h => h.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 0.0001;

    const points = priceHistory.map((item, index) => {
      const x = (index / (priceHistory.length - 1)) * 100;
      const y = 100 - ((item.price - minPrice) / priceRange) * 100;
      return `${x},${y}`;
    }).join(' ');

    const pathD = `M ${points.split(' ').map((p, i) => {
      const [x, y] = p.split(',');
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ')}`;

    return (
      <div className="mt-4 pt-4 border-t border-cyan-500/20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-cyan-400/70">Price Chart (60s)</span>
        </div>
        <svg
          viewBox="0 0 100 30"
          className="w-full h-16"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="priceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgb(34 211 238)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="rgb(34 211 238)" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path
            d={`${pathD} L 100 100 L 0 100 Z`}
            fill="url(#priceGradient)"
          />
          <polyline
            points={points}
            fill="none"
            stroke="rgb(34 211 238)"
            strokeWidth="0.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-[0_0_4px_rgba(34,211,238,0.5)]"
          />
        </svg>
      </div>
    );
  };

  return (
    <div className="cyber-glass rounded-2xl p-4 sm:p-6 border border-cyan-500/30 relative overflow-hidden hover-glow-cyan h-[28rem] flex flex-col">
      <div className="flex-1 min-h-0">
        <TradingViewWidget />
      </div>
    </div>
  );
}
