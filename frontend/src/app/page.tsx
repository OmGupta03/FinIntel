'use client';

import React, { useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';
import { Dashboard } from '../components/Dashboard';
import type {
  ResearchReport as DashboardReport,
} from '../components/Dashboard';
import { ScreenerTab } from '../components/ScreenerTab';
import { HistoryTab } from '../components/HistoryTab';
import { WatchlistTab } from '../components/WatchlistTab';
import { SettingsTab } from '../components/SettingsTab';
import { ResearchConsole } from '../components/ResearchConsole';
import { Search, Loader2, RefreshCw, ShieldCheck, Activity, Users } from 'lucide-react';

export interface SwotAnalysis {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface ResearchReport extends DashboardReport {
  companyName: string;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'research' | 'screener' | 'history' | 'watchlist' | 'settings'>('research');
  const [query, setQuery] = useState('');
  const [isResearching, setIsResearching] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ResearchReport | null>(null);

  const startResearch = async (companyName: string) => {
    if (!companyName.trim()) return;

    setActiveTab('research');
    setIsResearching(true);
    setError(null);
    setReport(null);
    setLogs([]);
    setCurrentStep('Resolve Ticker');

    const geminiKey = typeof window !== 'undefined' ? localStorage.getItem('geminiApiKey') || '' : '';
    const tavilyKey = typeof window !== 'undefined' ? localStorage.getItem('tavilyApiKey') || '' : '';
    const growwKey = typeof window !== 'undefined' ? localStorage.getItem('growwApiKey') || '' : '';
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    // Security: Send API keys via request headers, eliminating query string exposure
    const headers: Record<string, string> = {
      'Accept': 'text/event-stream',
    };
    if (geminiKey.trim()) headers['x-gemini-api-key'] = geminiKey.trim();
    if (tavilyKey.trim()) headers['x-tavily-api-key'] = tavilyKey.trim();
    if (growwKey.trim()) headers['x-groww-api-key'] = growwKey.trim();

    try {
      const response = await fetch(`${apiUrl}/api/research/stream?company=${encodeURIComponent(companyName.trim())}&refresh=true`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        let errText = `Server responded with status ${response.status}`;
        try {
          const errJson = await response.json();
          errText = errJson.message || errJson.error?.message || errText;
        } catch {
          // ignore parsing error
        }
        throw new Error(errText);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No readable streaming response received from server.');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() || '';

        for (const block of blocks) {
          if (!block.trim()) continue;
          let eventType = 'message';
          let dataStr = '';

          for (const line of block.split('\n')) {
            if (line.startsWith('event:')) {
              eventType = line.replace('event:', '').trim();
            } else if (line.startsWith('data:')) {
              dataStr = line.replace('data:', '').trim();
            }
          }

          if (!dataStr) continue;

          try {
            const data = JSON.parse(dataStr);
            if (eventType === 'step') {
              if (data.logs && data.logs.length > 0) {
                setLogs((prev) => {
                  const uniqueLogs = new Set([...prev, ...data.logs]);
                  return Array.from(uniqueLogs);
                });
              }

              if (data.currentStep) {
                setCurrentStep(data.currentStep);
              }

              setReport((prev) => {
                const base: ResearchReport = prev || {
                  companyName: companyName,
                  ticker: '',
                  resolvedName: '',
                  overview: null,
                  financialMetrics: {},
                  historicalPrices: [],
                  news: [],
                  technicalAnalysis: undefined,
                  financialAnalysis: '',
                  sentimentAnalysis: '',
                  newsIntelligence: undefined,
                  healthScore: undefined,
                  competitors: undefined,
                  swotAnalysis: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
                  bullCase: [],
                  bearCase: [],
                  recommendation: '',
                  confidenceScore: 0,
                  reasoning: '',
                };

                return {
                  ...base,
                  ...data,
                };
              });
            } else if (eventType === 'complete') {
              setIsResearching(false);
            } else if (eventType === 'error') {
              setIsResearching(false);
              setError(data.message || 'An error occurred during agent research.');
            }
          } catch (jsonErr) {
            console.error('Error decoding SSE data packet:', jsonErr);
          }
        }
      }

      setIsResearching(false);
    } catch (err: unknown) {
      setIsResearching(false);
      const message = err instanceof Error ? err.message : 'Failed to establish connection to the research agent.';
      setError(message);
    }
  };

  const handleReset = () => {
    setQuery('');
    setReport(null);
    setLogs([]);
    setError(null);
    setIsResearching(false);
    setCurrentStep('');
  };

  const getStepProgressText = (step: string) => {
    switch (step) {
      case 'Resolve Ticker':
        return 'Disambiguating company name and querying exchange metadata...';
      case 'Fetch Data':
        return 'Fetching real-time statements, price history (OHLC), and news feeds...';
      case 'Technical Analysis':
        return 'Computing deterministic SMA 20/50/200, RSI 14, MACD, and volatility...';
      case 'Financial Analysis':
        return 'Evaluating profitability, solvency, cash generation, and growth ratios...';
      case 'Sentiment Analysis':
        return 'Classifying article sentiment, extracting catalysts, and scoring tone...';
      case 'Stock Health Score':
        return 'Calculating deterministic 0-100 Stock Health Score across 5 dimensions...';
      case 'Competitor Comparison':
        return 'Benchmarking target against industry peers and ranking metrics...';
      case 'SWOT Analysis':
        return 'Mapping strategic strengths, weaknesses, opportunities, and threats...';
      case 'Synthesize Recommendation':
        return 'Constructing adversarial Bull vs Bear cases and investment thesis...';
      default:
        return 'Analyzing institutional investment profiles...';
    }
  };

  const getProgressPercentage = (step: string) => {
    switch (step) {
      case 'Resolve Ticker': return '12%';
      case 'Fetch Data': return '24%';
      case 'Technical Analysis': return '36%';
      case 'Financial Analysis': return '48%';
      case 'Sentiment Analysis': return '60%';
      case 'Stock Health Score': return '72%';
      case 'Competitor Comparison': return '84%';
      case 'SWOT Analysis': return '92%';
      case 'Synthesize Recommendation': return '98%';
      default: return '0%';
    }
  };

  const trendingCompanies = [
    { ticker: 'SBIN.NS', change: '+1.8%', isUp: true },
    { ticker: 'RELIANCE.NS', change: '+0.9%', isUp: true },
    { ticker: 'TCS.NS', change: '+1.4%', isUp: true },
    { ticker: 'HDFCBANK.NS', change: '-0.3%', isUp: false },
    { ticker: 'ICICIBANK.NS', change: '+1.2%', isUp: true },
    { ticker: 'TATAMOTORS.NS', change: '+2.5%', isUp: true },
  ];


  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <Navbar onSearch={startResearch} activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main split window: Sidebar + Content */}
      <div className="flex-1 flex">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          onNewAnalysis={handleReset} 
        />

        {/* Content Area */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {activeTab === 'research' && (
            <div className="w-full">
              {!report && !isResearching && !error ? (
                /* Search Splash Screen */
                <div className="w-full max-w-4xl mx-auto space-y-12 py-10">
                  {/* Hero banner */}
                  <div className="text-center space-y-4">
                    <span className="inline-flex items-center text-[10px] font-mono text-slate-400 uppercase tracking-widest font-extrabold">
                      Institutional Grade AI Decision Support
                    </span>
                    <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
                      Intelligence at the speed of thought.
                    </h2>
                    <p className="text-sm text-slate-500 max-w-xl mx-auto">
                      Deterministic quant calculations, transparent 0-100 stock health scoring, adversarial bull vs bear reasoning, and competitor benchmarking.
                    </p>
                  </div>

                  {/* Search box form */}
                  <form 
                    onSubmit={(e) => { e.preventDefault(); startResearch(query); }} 
                    className="max-w-2xl mx-auto relative flex items-center bg-white border border-gray-200 focus-within:border-blue-500 rounded-xl p-1.5 shadow-sm transition-all"
                  >
                    <div className="relative flex-1 flex items-center pl-3">
                      <Search className="w-4 h-4 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Enter company name or ticker (e.g., Apple, NVDA, Infosys)..."
                        className="w-full bg-transparent border-0 focus:ring-0 focus:outline-none pl-3 text-sm text-slate-800 font-semibold"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-slate-950 hover:bg-slate-900 text-white font-mono text-xs font-bold px-6 py-2.5 rounded-lg transition-colors cursor-pointer border border-transparent shadow-sm shrink-0"
                    >
                      Start Research
                    </button>
                  </form>

                  {/* Trending tags */}
                  <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
                    <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">Trending Equities</span>
                    {trendingCompanies.map((c) => (
                      <button
                        key={c.ticker}
                        type="button"
                        onClick={() => startResearch(c.ticker)}
                        className="bg-white hover:bg-slate-50 text-slate-700 border border-gray-200 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-sm flex items-center space-x-1.5"
                      >
                        <span className="font-bold">{c.ticker}</span>
                        <span className={`text-[10px] font-mono font-bold ${c.isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {c.isUp ? '▲' : '▼'} {c.change.replace(/[+-]/, '')}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Three-Card Feature Highlights */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                    {/* Card 1: Quant Indicators */}
                    <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 flex flex-col justify-between h-48">
                      <div className="flex justify-between items-start">
                        <div className="bg-blue-50 border border-blue-100 text-blue-600 p-2 rounded-lg">
                          <Activity className="w-4 h-4" />
                        </div>
                        <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[8px] font-mono px-2 py-0.5 rounded font-extrabold uppercase">
                          Quant Engine
                        </span>
                      </div>
                      <div className="space-y-1 mt-3">
                        <h4 className="text-sm font-bold text-slate-900 tracking-tight">Deterministic Indicators</h4>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                          SMA 20/50/200, RSI 14, MACD histogram, Bollinger Bands, and annualized historical volatility.
                        </p>
                      </div>
                      <span className="text-[10px] text-blue-600 font-mono font-bold">100% Deterministic Math</span>
                    </div>

                    {/* Card 2: Stock Health Score */}
                    <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 flex flex-col justify-between h-48">
                      <div className="bg-purple-50 border border-purple-100 text-purple-600 p-2 rounded-lg w-fit">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div className="space-y-1 mt-3">
                        <h4 className="text-sm font-bold text-slate-900 tracking-tight">Stock Health Score (0-100)</h4>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                          Multi-factor scoring across Fundamental, Valuation, Growth, Technical, and Risk dimensions.
                        </p>
                      </div>
                      <span className="text-[10px] text-purple-600 font-mono font-bold">Traceable Sub-Scores</span>
                    </div>

                    {/* Card 3: Adversarial Bull vs Bear */}
                    <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 flex flex-col justify-between h-48">
                      <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 p-2 rounded-lg w-fit">
                        <Users className="w-4 h-4" />
                      </div>
                      <div className="space-y-1 mt-3">
                        <h4 className="text-sm font-bold text-slate-900 tracking-tight">Peer Benchmarking</h4>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                          Cross-sectional ranking against direct industry rivals on ROE, growth, and P/E valuation.
                        </p>
                      </div>
                      <span className="text-[10px] text-emerald-600 font-mono font-bold">Relative Rankings</span>
                    </div>
                  </div>
                </div>
              ) : isResearching && !report?.overview ? (
                /* Live Streaming Loader Console */
                <div className="w-full max-w-2xl mx-auto space-y-6 py-10">
                  <div className="flex flex-col items-center justify-center text-center space-y-4 pb-4">
                    <div className="relative flex items-center justify-center">
                      <div className="absolute w-12 h-12 rounded-full border border-blue-500/20 animate-ping"></div>
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 font-mono uppercase tracking-wider">
                        Auditing {query}...
                      </h3>
                      <p className="text-xs text-slate-500 font-mono mt-1 animate-pulse">
                        {getStepProgressText(currentStep)}
                      </p>
                    </div>
                  </div>

                  <ResearchConsole logs={logs} currentStep={currentStep} isResearching={isResearching} />
                </div>
              ) : error ? (
                /* Error Dashboard Panel */
                <div className="w-full max-w-md mx-auto rounded-xl border border-rose-200 bg-rose-50/50 p-6 text-center space-y-5 shadow-sm mt-10">
                  <div className="flex justify-center">
                    <div className="bg-rose-100 border border-rose-200 p-2.5 rounded-full">
                      <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-bold text-slate-900 font-mono uppercase tracking-wider">Research Failed</h3>
                    <p className="text-xs text-rose-700 font-mono leading-relaxed bg-white p-3 rounded-lg border border-rose-100">
                      {error}
                    </p>
                  </div>
                  <button
                    onClick={handleReset}
                    className="flex items-center space-x-1.5 mx-auto bg-slate-950 hover:bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg transition-colors font-mono cursor-pointer border border-transparent"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Search</span>
                  </button>
                </div>
              ) : (
                /* Display Completed Dashboard report */
                report && report.overview && (
                  <div className="w-full space-y-6">
                    {isResearching && (
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between shadow-sm">
                        <div className="flex items-center space-x-3">
                          <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                          <div>
                            <p className="text-xs font-bold text-slate-900 font-mono">Agent Graph Running...</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{getStepProgressText(currentStep)}</p>
                          </div>
                        </div>
                        <div className="max-w-xs w-36 bg-slate-200 rounded-full h-1.5 border border-slate-300/30">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: getProgressPercentage(currentStep) }}
                          ></div>
                        </div>
                      </div>
                    )}
                    <Dashboard
                      report={report}
                      onReset={handleReset}
                      onSelectPeer={(peer) => startResearch(peer)}
                    />
                  </div>
                )
              )}
            </div>
          )}

          {activeTab === 'screener' && (
            <ScreenerTab onSelectTicker={(t) => startResearch(t)} />
          )}

          {activeTab === 'history' && (
            <HistoryTab onViewReport={startResearch} />
          )}

          {activeTab === 'watchlist' && (
            <WatchlistTab />
          )}

          {activeTab === 'settings' && (
            <SettingsTab />
          )}
        </main>
      </div>

      {/* Footer Info */}
      <footer className="text-center py-6 border-t border-gray-200 text-[10px] text-slate-400 font-mono bg-white flex flex-col sm:flex-row items-center justify-between px-8 gap-2">
        <p>ALPHA INSIGHT AI • © 2026 Institutional Investment Research & Decision Support</p>
        <div className="flex space-x-4">
          <a href="#" className="hover:underline">Privacy Policy</a>
          <a href="#" className="hover:underline">Deterministic Methodology</a>
          <a href="#" className="hover:underline">API Docs</a>
        </div>
      </footer>
    </div>
  );
}
