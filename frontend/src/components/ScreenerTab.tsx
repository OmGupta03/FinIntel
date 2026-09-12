'use client';

import React, { useState } from 'react';
import { Sparkles, Filter, ArrowRight, AlertCircle, RefreshCw, SlidersHorizontal } from 'lucide-react';

export interface ScreenerFilter {
  sector?: string;
  country?: string;
  peMin?: number;
  peMax?: number;
  roeMin?: number;
  revenueGrowthMin?: number;
  debtLevel?: 'low' | 'moderate' | 'high';
  marketCapMin?: number;
  unsupportedFilters?: string[];
}

export interface CandidateStock {
  ticker: string;
  name: string;
  exchange: string;
  country: string;
  sector: string;
  industry: string;
  price: number;
  marketCap: number;
  peRatio: number | null;
  roe: number | null;
  revenueGrowth: number | null;
  debtToEquity: number | null;
  profitMargin: number | null;
}

interface ScreenerTabProps {
  onSelectTicker: (ticker: string) => void;
}

export const ScreenerTab: React.FC<ScreenerTabProps> = ({ onSelectTicker }) => {
  const [nlQuery, setNlQuery] = useState('Find Indian IT companies with ROE above 15%, revenue growth above 10%, P/E below 30 and low debt.');
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ScreenerFilter | null>(null);
  const [results, setResults] = useState<CandidateStock[]>([]);
  const [unsupportedMsg, setUnsupportedMsg] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);

  const sampleQueries = [
    'Find Indian IT companies with ROE above 15%, revenue growth above 10%, P/E below 30 and low debt.',
    'US Tech companies with low debt and revenue growth above 15%',
    'Indian banking companies with ROE above 16%',
    'Companies with P/E below 25 and ROE above 20%',
  ];

  const handleParseAndRun = async (queryToRun: string) => {
    if (!queryToRun.trim()) return;
    setIsLoading(true);
    setHasRun(true);
    setUnsupportedMsg(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const geminiKey = typeof window !== 'undefined' ? localStorage.getItem('geminiApiKey') || '' : '';

    try {
      // Step 1: Parse Natural Language into Structured Filters
      const parseRes = await fetch(`${apiUrl}/api/research/screener/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(geminiKey ? { 'x-gemini-api-key': geminiKey.trim() } : {}),
        },
        body: JSON.stringify({ query: queryToRun }),
      });

      if (!parseRes.ok) throw new Error('Failed to parse screener query');
      const parseData = await parseRes.json();
      const filter: ScreenerFilter = parseData.data || {};
      setActiveFilter(filter);

      if (filter.unsupportedFilters && filter.unsupportedFilters.length > 0) {
        setUnsupportedMsg(filter.unsupportedFilters.join(' • '));
      }

      // Step 2: Apply Filters Deterministically
      const runRes = await fetch(`${apiUrl}/api/research/screener/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filter }),
      });

      if (!runRes.ok) throw new Error('Failed to execute screener');
      const runData = await runRes.json();
      setResults(runData.data?.matches || []);
    } catch (err: unknown) {
      console.error('Screener error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (field: keyof ScreenerFilter, value: ScreenerFilter[keyof ScreenerFilter]) => {
    if (!activeFilter) return;
    const updated = { ...activeFilter, [field]: value || undefined };
    setActiveFilter(updated);
    // Re-run filter deterministically
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    fetch(`${apiUrl}/api/research/screener/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filter: updated }),
    })
      .then(res => res.json())
      .then(data => {
        setResults(data.data?.matches || []);
      })
      .catch(console.error);
  };

  const formatMarketCap = (val?: number) => {
    if (!val || isNaN(val)) return 'N/A';
    const abs = Math.abs(val);
    if (abs >= 1e12) return `₹${(val / 1e12).toFixed(2)}T`;
    if (abs >= 1e9) return `₹${(val / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `₹${(val / 1e6).toFixed(2)}M`;
    return `₹${val.toLocaleString()}`;
  };

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto p-1 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-purple-100 text-purple-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider">
              Natural Language Discovery
            </span>
            <span className="text-[10px] font-mono text-slate-400 font-semibold">• Deterministic Scoring</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
            AI Stock Screener & Filter Engine
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Describe investment criteria in plain English. The AI parses structured filters, and deterministic code ranks matching equities.
          </p>
        </div>
      </div>

      {/* Query Search Box */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleParseAndRun(nlQuery);
          }}
          className="flex flex-col sm:flex-row gap-2.5"
        >
          <div className="relative flex-1 flex items-center bg-slate-50 border border-gray-200 rounded-xl px-3.5 focus-within:border-purple-500 focus-within:bg-white transition-all">
            <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
            <input
              type="text"
              value={nlQuery}
              onChange={(e) => setNlQuery(e.target.value)}
              placeholder="e.g. Find Indian IT companies with ROE above 15%, revenue growth above 10%, P/E below 30 and low debt..."
              className="w-full bg-transparent border-0 focus:ring-0 focus:outline-none pl-3 py-3 text-xs sm:text-sm text-slate-900 font-semibold placeholder:text-slate-400 placeholder:font-normal"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700 text-white font-mono text-xs font-bold px-6 py-3 rounded-xl transition-all shadow-sm flex items-center justify-center space-x-2 cursor-pointer shrink-0 disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Parsing & Filtering...</span>
              </>
            ) : (
              <>
                <SlidersHorizontal className="w-4 h-4" />
                <span>Screen Equities</span>
              </>
            )}
          </button>
        </form>

        {/* Example prompts */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">Try:</span>
          {sampleQueries.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setNlQuery(q);
                handleParseAndRun(q);
              }}
              className="text-[11px] bg-slate-100 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200 text-slate-600 border border-gray-200 px-3 py-1 rounded-full transition-all cursor-pointer font-medium"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Unsupported Filter Warning Alert */}
      {unsupportedMsg && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start space-x-3 text-xs text-amber-900">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Criterion Notice: </span>
            <span>{unsupportedMsg} (Deterministic screening applied to supported fields).</span>
          </div>
        </div>
      )}

      {/* Parsed Interactive Filter Bar */}
      {activeFilter && (
        <div className="bg-slate-50 border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-extrabold flex items-center space-x-1.5">
              <Filter className="w-3.5 h-3.5 text-purple-600" />
              <span>Parsed Structured Filters (Edit to fine-tune):</span>
            </span>
            <span className="text-[10px] font-mono text-slate-500 font-bold">
              Found {results.length} Matches
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
            {/* Sector */}
            <div className="bg-white border border-gray-200 rounded-lg p-2 space-y-1">
              <span className="text-[9px] text-slate-400 uppercase font-bold">Sector</span>
              <input
                type="text"
                value={activeFilter.sector || ''}
                onChange={(e) => handleFilterChange('sector', e.target.value)}
                placeholder="Any"
                className="w-full text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
              />
            </div>

            {/* Country */}
            <div className="bg-white border border-gray-200 rounded-lg p-2 space-y-1">
              <span className="text-[9px] text-slate-400 uppercase font-bold">Country</span>
              <input
                type="text"
                value={activeFilter.country || ''}
                onChange={(e) => handleFilterChange('country', e.target.value)}
                placeholder="Any"
                className="w-full text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
              />
            </div>

            {/* ROE Min */}
            <div className="bg-white border border-gray-200 rounded-lg p-2 space-y-1">
              <span className="text-[9px] text-slate-400 uppercase font-bold">ROE Min (%)</span>
              <input
                type="number"
                value={activeFilter.roeMin ?? ''}
                onChange={(e) => handleFilterChange('roeMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="None"
                className="w-full text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
              />
            </div>

            {/* Rev Growth Min */}
            <div className="bg-white border border-gray-200 rounded-lg p-2 space-y-1">
              <span className="text-[9px] text-slate-400 uppercase font-bold">Rev Growth (%)</span>
              <input
                type="number"
                value={activeFilter.revenueGrowthMin ?? ''}
                onChange={(e) => handleFilterChange('revenueGrowthMin', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="None"
                className="w-full text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
              />
            </div>

            {/* P/E Max */}
            <div className="bg-white border border-gray-200 rounded-lg p-2 space-y-1">
              <span className="text-[9px] text-slate-400 uppercase font-bold">P/E Max</span>
              <input
                type="number"
                value={activeFilter.peMax ?? ''}
                onChange={(e) => handleFilterChange('peMax', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="None"
                className="w-full text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
              />
            </div>

            {/* Debt Level */}
            <div className="bg-white border border-gray-200 rounded-lg p-2 space-y-1">
              <span className="text-[9px] text-slate-400 uppercase font-bold">Debt Level</span>
              <select
                value={activeFilter.debtLevel || ''}
                onChange={(e) => handleFilterChange('debtLevel', e.target.value || undefined)}
                className="w-full text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
              >
                <option value="">Any</option>
                <option value="low">Low (D/E &le; 50%)</option>
                <option value="moderate">Moderate (&le; 120%)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Results Table */}
      {hasRun && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-mono">
                Screened Equities ({results.length} Candidates)
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                Ranked deterministically by capital return efficiency (ROE) and top-line growth.
              </p>
            </div>
          </div>

          {results.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <Filter className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 font-mono">No Matching Companies Found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No companies in the current dataset satisfied all filter criteria. Try relaxing the P/E ceiling or lowering the ROE threshold above.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-slate-50 border-b border-gray-200 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="py-3.5 px-4">Rank / Company</th>
                    <th className="py-3.5 px-3">Exchange & Country</th>
                    <th className="py-3.5 px-3 text-right">Market Cap</th>
                    <th className="py-3.5 px-3 text-right">P/E (TTM)</th>
                    <th className="py-3.5 px-3 text-right">ROE</th>
                    <th className="py-3.5 px-3 text-right">Rev Growth</th>
                    <th className="py-3.5 px-3 text-right">D/E Ratio</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {results.map((stock, index) => (
                    <tr key={stock.ticker} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2.5">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black flex items-center justify-center">
                            #{index + 1}
                          </span>
                          <div>
                            <span className="font-bold text-slate-900 text-sm">{stock.ticker}</span>
                            <p className="text-[11px] text-slate-500 font-sans">{stock.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">
                          {stock.country} • {stock.exchange}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-slate-800">
                        {formatMarketCap(stock.marketCap)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-slate-800">
                        {stock.peRatio ? `${stock.peRatio.toFixed(1)}x` : 'N/A'}
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-emerald-600">
                        {stock.roe !== null ? `${(stock.roe * 100).toFixed(1)}%` : 'N/A'}
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-blue-600">
                        {stock.revenueGrowth !== null ? `${(stock.revenueGrowth * 100).toFixed(1)}%` : 'N/A'}
                      </td>
                      <td className="py-3.5 px-3 text-right text-slate-700">
                        {stock.debtToEquity !== null ? `${stock.debtToEquity}%` : 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => onSelectTicker(stock.ticker)}
                          className="bg-slate-950 hover:bg-blue-600 text-white font-mono text-[11px] font-bold px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer inline-flex items-center space-x-1 shadow-sm"
                        >
                          <span>Research</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScreenerTab;
