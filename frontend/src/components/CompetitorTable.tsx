'use client';

import React, { useState, useEffect } from 'react';
import { Users, Award, Star } from 'lucide-react';
import { isInWatchlist, toggleWatchlist, subscribeWatchlist, getWatchlist } from '../utils/watchlist';

export interface PeerRow {
  ticker: string;
  name: string;
  marketCap: number;
  peRatio: number | null;
  revenueGrowth: number | null;
  roe: number | null;
  profitMargin: number | null;
  debtToEquity: number | null;
  isTarget?: boolean;
}

export interface CompetitorData {
  targetTicker?: string;
  peers?: PeerRow[];
  rankings?: {
    marketCapRank?: string;
    growthRank?: string;
    profitabilityRank?: string;
    valuationRank?: string;
  };
  summary?: string;
  currencySymbol?: string;
}

interface CompetitorTableProps {
  targetTicker: string;
  competitors?: CompetitorData;
  onSelectPeer?: (ticker: string) => void;
  currencySymbol?: string;
}

export const CompetitorTable: React.FC<CompetitorTableProps> = ({
  targetTicker,
  competitors,
  onSelectPeer,
}) => {
  const activeCurrencySymbol = '₹';
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([]);

  useEffect(() => {
    setWatchlistSymbols(getWatchlist());
    const unsub = subscribeWatchlist((symbols) => setWatchlistSymbols(symbols));
    return () => unsub();
  }, []);

  if (!competitors || !competitors.peers || competitors.peers.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-slate-400 font-mono text-xs">
        No peer competitor data collected for {targetTicker}.
      </div>
    );
  }

  const formatCap = (cap?: number) => {
    if (!cap || isNaN(cap)) return 'N/A';
    const abs = Math.abs(cap);
    if (abs >= 1e12) return `${activeCurrencySymbol}${(cap / 1e12).toFixed(2)}T`;
    if (abs >= 1e9) return `${activeCurrencySymbol}${(cap / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `${activeCurrencySymbol}${(cap / 1e6).toFixed(2)}M`;
    return `${activeCurrencySymbol}${cap.toLocaleString()}`;
  };

  const formatPercent = (val?: number | null) => {
    if (val === undefined || val === null || isNaN(val)) return 'N/A';
    return `${(val * 100).toFixed(1)}%`;
  };

  const { rankings, peers, summary } = competitors;

  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900 font-mono uppercase tracking-wider">
              Competitor Benchmarking & Relative Peer Ranking
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Cross-sectional analysis comparing {targetTicker} against direct industry peers across key financial ratios.
          </p>
        </div>
      </div>

      {/* 4 Ranking Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        <div className="bg-slate-50 border border-gray-200 rounded-xl p-3 space-y-1">
          <span className="text-[9px] text-slate-400 uppercase font-bold">Market Cap Rank</span>
          <p className="text-lg font-black text-slate-900">{rankings?.marketCapRank || 'N/A'}</p>
          <span className="text-[10px] text-slate-500">Size & Scale</span>
        </div>

        <div className="bg-slate-50 border border-gray-200 rounded-xl p-3 space-y-1">
          <span className="text-[9px] text-slate-400 uppercase font-bold">ROE Rank</span>
          <p className="text-lg font-black text-emerald-600">{rankings?.profitabilityRank || 'N/A'}</p>
          <span className="text-[10px] text-slate-500">Capital Efficiency</span>
        </div>

        <div className="bg-slate-50 border border-gray-200 rounded-xl p-3 space-y-1">
          <span className="text-[9px] text-slate-400 uppercase font-bold">Rev Growth Rank</span>
          <p className="text-lg font-black text-blue-600">{rankings?.growthRank || 'N/A'}</p>
          <span className="text-[10px] text-slate-500">Top-Line Expansion</span>
        </div>

        <div className="bg-slate-50 border border-gray-200 rounded-xl p-3 space-y-1">
          <span className="text-[9px] text-slate-400 uppercase font-bold">Valuation (P/E) Rank</span>
          <p className="text-lg font-black text-purple-600">{rankings?.valuationRank || 'N/A'}</p>
          <span className="text-[10px] text-slate-500">Multiple Attractiveness</span>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-slate-50 border-b border-gray-200 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-3 text-right">Market Cap</th>
                <th className="py-3 px-3 text-right">P/E (TTM)</th>
                <th className="py-3 px-3 text-right">ROE</th>
                <th className="py-3 px-3 text-right">Rev Growth</th>
                <th className="py-3 px-3 text-right">Profit Margin</th>
                <th className="py-3 px-3 text-right">Debt / Equity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {peers.map((p) => {
                const isTarget = p.isTarget || p.ticker.toUpperCase() === targetTicker.toUpperCase();
                return (
                  <tr
                    key={p.ticker}
                    onClick={() => !isTarget && onSelectPeer?.(p.ticker)}
                    className={isTarget ? 'bg-blue-50/60 font-bold' : onSelectPeer ? 'hover:bg-blue-50/40 transition-colors cursor-pointer' : 'hover:bg-slate-50/70 transition-colors'}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleWatchlist(p.ticker);
                          }}
                          className={`p-1 rounded transition-colors cursor-pointer ${
                            isInWatchlist(p.ticker)
                              ? 'text-amber-500 hover:text-amber-600'
                              : 'text-slate-300 hover:text-amber-500'
                          }`}
                          title={isInWatchlist(p.ticker) ? 'Remove from Watchlist' : 'Add to Watchlist'}
                        >
                          <Star className={`w-3.5 h-3.5 ${isInWatchlist(p.ticker) ? 'fill-amber-400' : ''}`} />
                        </button>
                        <span className="text-slate-900 font-extrabold">{p.ticker}</span>
                        {isTarget && (
                          <span className="bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded uppercase">
                            Target
                          </span>
                        )}
                        <span className="text-[11px] text-slate-500 font-sans truncate max-w-[140px]">
                          {p.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right text-slate-900 font-bold">
                      {formatCap(p.marketCap)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-800">
                      {p.peRatio ? `${p.peRatio.toFixed(1)}x` : 'N/A'}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-600 font-bold">
                      {formatPercent(p.roe)}
                    </td>
                    <td className="py-3 px-3 text-right text-blue-600">
                      {formatPercent(p.revenueGrowth)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700">
                      {formatPercent(p.profitMargin)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700">
                      {p.debtToEquity !== null ? `${p.debtToEquity.toFixed(0)}%` : 'N/A'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Explanatory Narrative grounded in comparison */}
      <div className="bg-slate-50 border border-gray-200 rounded-xl p-4 space-y-1.5">
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-extrabold flex items-center space-x-1.5">
          <Award className="w-3.5 h-3.5 text-purple-600" />
          <span>Grounded Competitive Analysis</span>
        </span>
        <p className="text-xs text-slate-700 leading-relaxed font-sans font-medium">
          {summary}
        </p>
      </div>
    </div>
  );
};

export default CompetitorTable;
