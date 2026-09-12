'use client';

import React, { useEffect, useState } from 'react';
import { Download, Filter, TrendingUp, TrendingDown, Sparkles, Loader2 } from 'lucide-react';

interface WatchlistItem {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  sentiment?: 'Bullish' | 'Bearish' | 'Neutral';
  exchange?: string;
  currency?: string;
  currencySymbol?: string;
}

export const WatchlistTab: React.FC = () => {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWatchlist = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const res = await fetch(`${apiUrl}/api/research/watchlist`);
        if (res.ok) {
          const result = await res.json();
          if (result.success && Array.isArray(result.data)) {
            // Map quotes from backend and inject sentiments
            const mapped = result.data.map((item: WatchlistItem) => {
              let sentiment: 'Bullish' | 'Bearish' | 'Neutral' = 'Neutral';
              if (item.changePercent > 0.5) {
                sentiment = 'Bullish';
              } else if (item.changePercent < -0.5) {
                sentiment = 'Bearish';
              }
              
              return {
                ...item,
                sentiment,
                currencySymbol: item.currencySymbol || '₹',
                exchange: item.exchange || (item.symbol?.endsWith('.NS') ? 'NSE' : 'EQUITY'),
              };
            });
            setWatchlist(mapped);
          }
        }
      } catch (err) {
        console.error('Failed to fetch watchlist:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWatchlist();
  }, []);

  const getSentimentStyles = (sentiment: 'Bullish' | 'Bearish' | 'Neutral') => {
    switch (sentiment) {
      case 'Bullish':
        return {
          text: 'text-emerald-700 bg-emerald-50 border-emerald-200',
          bar: 'bg-emerald-500',
          width: 'w-4/5',
        };
      case 'Bearish':
        return {
          text: 'text-rose-700 bg-rose-50 border-rose-200',
          bar: 'bg-rose-500',
          width: 'w-1/4',
        };
      default:
        return {
          text: 'text-slate-600 bg-slate-50 border-slate-200',
          bar: 'bg-slate-400',
          width: 'w-1/2',
        };
    }
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    const color = change >= 0 ? 'text-emerald-600' : 'text-rose-600';
    return (
      <span className={`font-mono text-xs font-bold ${color}`}>
        {sign}{change.toFixed(2)}%
      </span>
    );
  };

  // Filter out core watchlist table items from top movers
  const coreTickers = ['NVDA', 'TSLA', 'AAPL', 'MSFT'];
  const coreList = watchlist.filter(item => coreTickers.includes(item.symbol));
  
  // Custom movers hardcoded or derived to match Screenshot 3
  const movers = [
    { symbol: 'SMCI', name: 'Super Micro Computer', changePercent: 8.42, isUp: true },
    { symbol: 'ARM', name: 'ARM Holdings', changePercent: 5.11, isUp: true },
    { symbol: 'SNOW', name: 'Snowflake Inc.', changePercent: -4.12, isUp: false },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full max-w-6xl mx-auto p-1 animate-fade-in">
      
      {/* LEFT COLUMN: Watchlist & Insights (Col-span 8) */}
      <div className="lg:col-span-8 space-y-6">
        {/* Watchlist Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Watchlist</h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">Real-time tracking and AI sentiment analysis for your core positions.</p>
          </div>
          
          <div className="flex items-center space-x-2 font-mono text-xs">
            <button className="flex items-center space-x-1.5 bg-white border border-gray-200 hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-lg transition-colors cursor-pointer font-bold shadow-sm">
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
            <button className="flex items-center space-x-1.5 bg-white border border-gray-200 hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-lg transition-colors cursor-pointer font-bold shadow-sm">
              <Filter className="w-3.5 h-3.5" />
              <span>Filter</span>
            </button>
          </div>
        </div>

        {/* Watchlist Table */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <span className="text-xs font-mono text-slate-400">Loading watchlist details...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-slate-50/50 font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-6">Company</th>
                    <th className="py-3 px-6">Current Price</th>
                    <th className="py-3 px-6">24H Change</th>
                    <th className="py-3 px-6">AI Sentiment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm font-medium">
                  {coreList.map((item, idx) => {
                    const styles = getSentimentStyles(item.sentiment || 'Neutral');
                    const initials = item.symbol.slice(0, 2);
                    
                    return (
                      <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                        <td className="py-4.5 px-6 flex items-center space-x-3.5">
                          {/* Logo badge */}
                          <div className="h-9 w-9 rounded-lg bg-slate-950 text-white font-mono font-black text-xs flex items-center justify-center select-none uppercase shrink-0">
                            {initials}
                          </div>
                          <div>
                            <p className="text-slate-900 font-bold tracking-tight">{item.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide font-semibold font-mono">
                              {item.symbol} • {item.exchange}
                            </p>
                          </div>
                        </td>
                        <td className="py-4.5 px-6 font-mono text-slate-700">
                          {item.currencySymbol || '₹'}{formatPrice(item.price)}
                        </td>
                        <td className="py-4.5 px-6">
                          {formatChange(item.changePercent)}
                        </td>
                        <td className="py-4.5 px-6">
                          <div className="flex items-center space-x-3.5 min-w-[150px]">
                            {/* Visual slider representing sentiment strength */}
                            <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div className={`h-full ${styles.bar} ${styles.width}`} />
                            </div>
                            <span className={`font-mono text-[9px] font-bold px-2 py-0.5 rounded border tracking-wide uppercase shrink-0 ${styles.text}`}>
                              {item.sentiment}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Automated Insight Box */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 space-y-4">
          <div className="flex items-center space-x-2.5">
            <Sparkles className="w-4 h-4 text-slate-900" />
            <h4 className="text-sm font-bold text-slate-900 tracking-tight">Automated Insight</h4>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed font-medium">
            Our aggregate sentiment model indicates a strong sector shift toward <strong className="text-slate-900">Semiconductors</strong> following recent fiscal policy updates. NVIDIA (NVDA) maintains the highest confidence score (0.92) across your watchlist, supported by positive institutional volume trends over the last 72 hours.
          </p>
          <div className="flex space-x-2 font-mono text-xs pt-1">
            <button className="bg-slate-950 hover:bg-slate-900 text-white font-bold py-2 px-4 rounded-lg transition-colors cursor-pointer border border-transparent shadow-sm">
              Full Sector Report
            </button>
            <button className="bg-white border border-gray-200 hover:bg-slate-50 text-slate-750 font-bold py-2 px-4 rounded-lg transition-colors cursor-pointer shadow-sm">
              Compare Portfolios
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Market Overviews & Widgets (Col-span 4) */}
      <div className="lg:col-span-4 space-y-6">
        {/* Market Overview widget */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 space-y-3">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">Market Overview</span>
          <div className="flex justify-between items-center">
            <span className="text-sm font-extrabold text-slate-900">S&P 500</span>
            <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">+1.2%</span>
          </div>
          <div className="h-6 w-full rounded bg-gradient-to-r from-emerald-100 to-emerald-25 border border-emerald-100/50" />
        </div>

        {/* Top Movers (24h) widget */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 space-y-4">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">Top Movers (24h)</span>
          <div className="space-y-3">
            {movers.map((mover, idx) => (
              <div key={idx} className="flex items-center justify-between border-b border-gray-100 pb-2.5 last:border-0 last:pb-0">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-900">{mover.symbol}</p>
                  <p className="text-[9px] text-slate-400 font-medium line-clamp-1">{mover.name}</p>
                </div>
                <div className="flex items-center space-x-1 font-mono text-xs font-bold">
                  {mover.isUp ? (
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  )}
                  <span className={mover.isUp ? 'text-emerald-600' : 'text-rose-600'}>
                    {mover.isUp ? '+' : ''}{mover.changePercent}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Watchlist Performance Mini Bar Chart */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 space-y-3">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold font-mono">Watchlist Performance</span>
          <div className="h-24 w-full flex items-end gap-3 px-2 pt-2 border-b border-gray-150 pb-px">
            <div className="flex-1 bg-slate-200 h-1/2 rounded-t transition-all hover:bg-slate-300 cursor-pointer" title="Mon" />
            <div className="flex-1 bg-slate-200 h-3/5 rounded-t transition-all hover:bg-slate-300 cursor-pointer" title="Tue" />
            <div className="flex-1 bg-slate-300 h-2/5 rounded-t transition-all hover:bg-slate-400 cursor-pointer" title="Wed" />
            <div className="flex-1 bg-blue-500 h-4/5 rounded-t transition-all hover:bg-blue-600 cursor-pointer" title="Thu" />
            <div className="flex-1 bg-blue-600 h-full rounded-t transition-all hover:bg-blue-700 cursor-pointer" title="Fri" />
          </div>
          <div className="flex justify-between font-mono text-[9px] text-slate-400 uppercase tracking-wide font-semibold px-2">
            <span>Mon</span>
            <span>Fri</span>
          </div>
        </div>

        {/* Upgrade to Pro Card */}
        <div className="bg-slate-950 text-white rounded-xl p-5 space-y-4 shadow-md relative overflow-hidden">
          {/* Faded Background Graph Effect */}
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
            <svg width="100" height="80">
              <path d="M 0 80 Q 20 60 40 70 T 80 40 T 120 10 L 120 80 Z" fill="white" />
            </svg>
          </div>
          <div className="space-y-1.5 relative">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">Upgrade to Pro</h5>
            <p className="text-sm font-bold text-white leading-snug">
              Get unlimited AI deeper-dive reports and priority execution.
            </p>
          </div>
          <button className="w-full bg-white hover:bg-slate-50 text-slate-950 font-mono text-[10px] font-bold py-2.5 px-4 rounded-lg transition-colors cursor-pointer shadow-sm relative">
            Go Pro Now
          </button>
        </div>
      </div>
    </div>
  );
};
export default WatchlistTab;
