'use client';

import React, { useEffect, useState } from 'react';
import {
  Download,
  TrendingUp,
  TrendingDown,
  Loader2,
  Trash2,
  ArrowUpRight,
  Star,
  Search,
  RefreshCw,
} from 'lucide-react';
import {
  getWatchlist,
  removeFromWatchlist,
  clearWatchlist,
  subscribeWatchlist,
} from '../utils/watchlist';

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

interface WatchlistTabProps {
  onSelectTicker?: (ticker: string) => void;
  onGoToResearch?: () => void;
}

export const WatchlistTab: React.FC<WatchlistTabProps> = ({
  onSelectTicker,
  onGoToResearch,
}) => {
  const [savedSymbols, setSavedSymbols] = useState<string[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Initialize saved symbols from localStorage & listen for global updates
  useEffect(() => {
    setSavedSymbols(getWatchlist());
    const unsubscribe = subscribeWatchlist((symbols) => {
      setSavedSymbols(symbols);
    });
    return () => unsubscribe();
  }, []);

  // Fetch real-time data whenever savedSymbols change
  useEffect(() => {
    if (savedSymbols.length === 0) {
      setWatchlist([]);
      setLoading(false);
      return;
    }

    const fetchWatchlist = async () => {
      setLoading(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const res = await fetch(
          `${apiUrl}/api/research/watchlist?tickers=${encodeURIComponent(savedSymbols.join(','))}`
        );
        if (res.ok) {
          const result = await res.json();
          if (result.success && Array.isArray(result.data)) {
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
  }, [savedSymbols]);

  const handleRemoveTicker = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeFromWatchlist(symbol);
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to empty your entire watchlist?')) {
      clearWatchlist();
    }
  };

  const handleExportCSV = () => {
    if (watchlist.length === 0) return;
    const headers = 'Symbol,Name,Exchange,Price,24h Change (%),Sentiment\n';
    const rows = watchlist
      .map(
        (w) =>
          `"${w.symbol}","${w.name}","${w.exchange || ''}",${w.price},${w.changePercent.toFixed(2)},"${w.sentiment || ''}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `FinIntel_Watchlist_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
    const isUp = change >= 0;
    return (
      <span
        className={`inline-flex items-center space-x-1 font-mono text-xs font-bold ${
          isUp ? 'text-emerald-600' : 'text-rose-600'
        }`}
      >
        {isUp ? (
          <TrendingUp className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <TrendingDown className="w-3.5 h-3.5 shrink-0" />
        )}
        <span>
          {sign}
          {change.toFixed(2)}%
        </span>
      </span>
    );
  };

  const isEmpty = savedSymbols.length === 0;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-fade-in p-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Watchlist</h2>
            <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200">
              {savedSymbols.length} {savedSymbols.length === 1 ? 'Position' : 'Positions'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Real-time tracking and market quotes for your selected equities.
          </p>
        </div>

        {!isEmpty && (
          <div className="flex items-center space-x-2 font-mono text-xs">
            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-1.5 bg-white border border-gray-200 hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-lg transition-colors cursor-pointer font-bold shadow-xs"
              title="Export Watchlist as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleClearAll}
              className="flex items-center space-x-1.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 px-3.5 py-2 rounded-lg transition-colors cursor-pointer font-bold shadow-xs"
              title="Clear all items from watchlist"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Container */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
        {loading && isEmpty ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <span className="text-xs font-mono text-slate-400">Loading watchlist quotes...</span>
          </div>
        ) : isEmpty ? (
          /* PURE EMPTY STATE */
          <div className="p-12 sm:p-16 flex flex-col items-center text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-500 shadow-xs">
              <Star className="w-8 h-8 fill-amber-400/40 text-amber-500" />
            </div>

            <div className="space-y-2 max-w-md">
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Your Watchlist is Empty
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                You have not added any stocks to your watchlist yet. Search for any company on the
                Research Terminal and click the <strong className="text-slate-800">Star (★)</strong> or{' '}
                <strong className="text-slate-800">&quot;Add to Watchlist&quot;</strong> icon to track it here.
              </p>
            </div>

            {onGoToResearch && (
              <button
                type="button"
                onClick={onGoToResearch}
                className="mt-2 inline-flex items-center space-x-2 bg-slate-950 hover:bg-slate-800 text-white font-mono text-xs font-bold px-5 py-2.5 rounded-lg transition-colors cursor-pointer shadow-sm border border-slate-900"
              >
                <Search className="w-3.5 h-3.5 text-blue-400" />
                <span>Go to Research Terminal</span>
              </button>
            )}
          </div>
        ) : (
          /* POPULATED EQUITIES TABLE */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-slate-50/50 font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-6">Company</th>
                  <th className="py-3 px-6">Current Price</th>
                  <th className="py-3 px-6">24H Change</th>
                  <th className="py-3 px-6">AI Sentiment</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm font-medium">
                {watchlist.map((item, idx) => {
                  const styles = getSentimentStyles(item.sentiment || 'Neutral');
                  const initials = item.symbol.slice(0, 2);

                  return (
                    <tr
                      key={idx}
                      onClick={() => onSelectTicker?.(item.symbol)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-6 flex items-center space-x-3.5">
                        <div className="h-9 w-9 rounded-lg bg-slate-950 text-white font-mono font-black text-xs flex items-center justify-center select-none uppercase shrink-0 shadow-xs">
                          {initials}
                        </div>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <p className="text-slate-900 font-bold tracking-tight group-hover:text-blue-600 transition-colors">
                              {item.name}
                            </p>
                            <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide font-semibold font-mono">
                            {item.symbol} • {item.exchange}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-mono text-slate-800 font-bold">
                        {item.currencySymbol || '₹'}
                        {formatPrice(item.price)}
                      </td>
                      <td className="py-4 px-6">{formatChange(item.changePercent)}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3 min-w-[130px]">
                          <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className={`h-full ${styles.bar} ${styles.width}`} />
                          </div>
                          <span
                            className={`font-mono text-[9px] font-bold px-2 py-0.5 rounded border tracking-wide uppercase shrink-0 ${styles.text}`}
                          >
                            {item.sentiment}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectTicker?.(item.symbol);
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer text-xs font-mono font-bold flex items-center space-x-1"
                            title="Open Research Terminal"
                          >
                            <span className="hidden sm:inline">Research</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleRemoveTicker(item.symbol, e)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Remove from Watchlist"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
    </div>
  );
};

export default WatchlistTab;
