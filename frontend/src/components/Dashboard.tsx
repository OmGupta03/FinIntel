'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  BarChart3,
  Users,
  Newspaper,
  ShieldAlert,
  Cpu,
  Layers,
  Star,
  Download,
  Loader2,
} from 'lucide-react';
import { isInWatchlist, toggleWatchlist, subscribeWatchlist } from '../utils/watchlist';
import { HistoricalChart } from './HistoricalChart';
import { FinancialsTab, TechnicalAnalysisData } from './FinancialsTab';
import { NewsTab, StructuredArticle, NewsIntelligenceData } from './NewsTab';
import { SwotGrid } from './SwotGrid';
import { HealthScoreCard, HealthScorePayload } from './HealthScoreCard';
import { BullBearCard } from './BullBearCard';
import { CompetitorTable, CompetitorData } from './CompetitorTable';
import { SimpleResearchView } from './SimpleResearchView';
import { getResearchViewMode, setResearchViewMode } from '../utils/researchHelpers';

export interface HistoricalPricePoint {
  date: string;
  close: number;
  volume: number;
  open?: number;
  high?: number;
  low?: number;
}

export interface CompanyOverview {
  symbol?: string;
  name?: string;
  exchange?: string;
  price?: number;
  marketCap?: number;
  sector?: string;
  industry?: string;
  summary?: string;
  website?: string;
  currency?: string;
  currencySymbol?: string;
  dayChange?: number;
  dayChangePercent?: number;
  prevClose?: number;
  dayLow?: number;
  dayHigh?: number;
  yearLow?: number;
  yearHigh?: number;
  volume?: number;
  source?: string;
  [key: string]: unknown;
}

export interface FinancialMetrics {
  peRatio?: number;
  returnOnEquity?: number;
  debtToEquity?: number;
  priceToBook?: number;
  trailingEps?: number;
  profitMargin?: number;
  revenueGrowth?: number;
  [key: string]: unknown;
}

export type NewsItem = StructuredArticle;

export type HealthScoreData = HealthScorePayload;

export interface ResearchReport {
  ticker: string;
  resolvedName: string;
  overview?: CompanyOverview | null;
  financialMetrics?: FinancialMetrics | null;
  historicalPrices: HistoricalPricePoint[];
  intradayPrices?: HistoricalPricePoint[];
  news: NewsItem[];
  technicalAnalysis?: TechnicalAnalysisData;
  financialAnalysis: string;
  sentimentAnalysis: string;
  newsIntelligence?: NewsIntelligenceData;
  healthScore?: HealthScoreData;
  competitors?: CompetitorData;
  swotAnalysis: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  bullCase?: string[];
  bearCase?: string[];
  recommendation: string;
  confidenceScore: number;
  reasoning: string;
  plainSummary?: string;
}

interface DashboardProps {
  report: ResearchReport;
  onReset: () => void;
  onSelectPeer?: (ticker: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ report, onReset, onSelectPeer }) => {
  const [viewMode, setViewMode] = useState<'simple' | 'advanced'>('simple');
  const [activeTab, setActiveTab] = useState<'overview' | 'financials' | 'competitors' | 'news' | 'swot'>('overview');
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistToast, setWatchlistToast] = useState<string | null>(null);

  useEffect(() => {
    setViewMode(getResearchViewMode());
  }, []);

  const handleSetViewMode = (mode: 'simple' | 'advanced') => {
    setViewMode(mode);
    setResearchViewMode(mode);
  };

  useEffect(() => {
    setInWatchlist(isInWatchlist(report.ticker));
    const unsub = subscribeWatchlist(() => {
      setInWatchlist(isInWatchlist(report.ticker));
    });
    return () => unsub();
  }, [report.ticker]);

  const handleToggleWatchlist = () => {
    if (!report.ticker) return;
    const newState = toggleWatchlist(report.ticker);
    setInWatchlist(newState);
    setWatchlistToast(newState ? `Added ${report.ticker} to Watchlist` : `Removed ${report.ticker} from Watchlist`);
    setTimeout(() => {
      setWatchlistToast(null);
    }, 2500);
  };

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    if (isDownloadingPdf || !report.ticker) return;
    setIsDownloadingPdf(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const geminiKey = typeof window !== 'undefined' ? localStorage.getItem('geminiApiKey') || '' : '';
      const tavilyKey = typeof window !== 'undefined' ? localStorage.getItem('tavilyApiKey') || '' : '';
      const growwKey = typeof window !== 'undefined' ? localStorage.getItem('growwApiKey') || '' : '';

      const headers: Record<string, string> = {};
      if (geminiKey.trim()) headers['x-gemini-api-key'] = geminiKey.trim();
      if (tavilyKey.trim()) headers['x-tavily-api-key'] = tavilyKey.trim();
      if (growwKey.trim()) headers['x-groww-api-key'] = growwKey.trim();

      const res = await fetch(`${apiUrl}/api/research/${encodeURIComponent(report.ticker)}/report/pdf`, {
        method: 'GET',
        headers,
      });

      if (!res.ok) {
        throw new Error(`Failed to download PDF report (status ${res.status})`);
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${report.ticker}_Research_Report.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(link);
    } catch (err) {
      console.error('PDF Download Error:', err);
      alert('Unable to generate PDF report at this time. Please try again in a few moments.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const recUpper = (report.recommendation || 'HOLD').toUpperCase();
  const isInvest = recUpper === 'BUY';
  const isPass = recUpper === 'SELL';
  const recLabel = isInvest ? 'BUY / INVEST' : isPass ? 'SELL / DIVEST' : 'HOLD / NEUTRAL';

  const recBadgeClass = isInvest
    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
    : isPass
    ? 'text-rose-700 bg-rose-50 border-rose-200'
    : 'text-amber-700 bg-amber-50 border-amber-200';

  const isUsd = report.overview?.currency === 'USD' || report.overview?.currencySymbol === '$';
  const fxRate = isUsd ? 87.5 : 1;
  const currencySymbol = '₹';
  const currency = 'INR';

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return 'N/A';
    const converted = val * fxRate;
    const abs = Math.abs(converted);
    if (abs >= 1e12) return `${currencySymbol}${(converted / 1e12).toFixed(2)}T`;
    if (abs >= 1e9) return `${currencySymbol}${(converted / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `${currencySymbol}${(converted / 1e6).toFixed(2)}M`;
    return `${currencySymbol}${converted.toLocaleString()}`;
  };

  const normalizedHistorical = React.useMemo(() => {
    if (!report.historicalPrices) return [];
    if (!isUsd) return report.historicalPrices;
    return report.historicalPrices.map((b: HistoricalPricePoint) => ({
      ...b,
      close: (b.close || 0) * fxRate,
      open: b.open !== undefined ? b.open * fxRate : undefined,
      high: b.high !== undefined ? b.high * fxRate : undefined,
      low: b.low !== undefined ? b.low * fxRate : undefined,
    }));
  }, [report.historicalPrices, isUsd, fxRate]);

  const normalizedIntraday = React.useMemo(() => {
    if (!report.intradayPrices) return [];
    if (!isUsd) return report.intradayPrices;
    return report.intradayPrices.map((b: HistoricalPricePoint) => ({
      ...b,
      close: (b.close || 0) * fxRate,
      open: b.open !== undefined ? b.open * fxRate : undefined,
      high: b.high !== undefined ? b.high * fxRate : undefined,
      low: b.low !== undefined ? b.low * fxRate : undefined,
    }));
  }, [report.intradayPrices, isUsd, fxRate]);

  const healthScore = report.healthScore?.overallScore ?? report.confidenceScore ?? 75;

  const tabs = [
    { id: 'overview' as const, label: 'Executive Overview', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'financials' as const, label: 'Financials & Technicals', icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: 'competitors' as const, label: 'Competitor Benchmark', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'news' as const, label: 'News Intelligence', icon: <Newspaper className="w-3.5 h-3.5" /> },
    { id: 'swot' as const, label: 'Strategic SWOT', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto p-1 animate-fade-in">
      {/* Top Utility Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
        <button
          onClick={onReset}
          className="flex items-center space-x-1.5 text-slate-500 hover:text-slate-900 transition-colors text-xs font-mono group cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Search Splash</span>
        </button>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Simple View vs Advanced View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-gray-200 text-xs font-mono">
            <button
              type="button"
              onClick={() => handleSetViewMode('simple')}
              className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                viewMode === 'simple'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Simple View
            </button>
            <button
              type="button"
              onClick={() => handleSetViewMode('advanced')}
              className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer ${
                viewMode === 'advanced'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Advanced View
            </button>
          </div>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all bg-slate-950 hover:bg-slate-800 text-white shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-slate-900"
            title="Download formatted summary PDF report"
          >
            {isDownloadingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
            ) : (
              <Download className="w-3.5 h-3.5 text-blue-400" />
            )}
            <span className="hidden sm:inline">{isDownloadingPdf ? 'Generating...' : 'Download PDF'}</span>
            <span className="sm:hidden">PDF</span>
          </button>

          <button
            onClick={handleToggleWatchlist}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border cursor-pointer ${
              inWatchlist
                ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-xs'
                : 'bg-white hover:bg-slate-50 border-gray-200 text-slate-700 hover:border-slate-300 shadow-xs'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${inWatchlist ? 'fill-amber-400 text-amber-500' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">{inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}</span>
          </button>

          <span className="hidden lg:flex text-[10px] font-mono text-slate-400 uppercase tracking-widest font-semibold items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-blue-600" />
            <span>{report.ticker}</span>
          </span>
        </div>
      </div>

      {/* View Mode Switching: Simple View (Beginner Default) vs Advanced View */}
      {viewMode === 'simple' ? (
        <SimpleResearchView
          report={report}
          normalizedHistorical={normalizedHistorical}
          normalizedIntraday={normalizedIntraday}
          fxRate={fxRate}
          currencySymbol={currencySymbol}
          onExpandFull={() => handleSetViewMode('advanced')}
        />
      ) : (
        <>
          {/* Hero Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-gray-200 shadow-sm rounded-xl p-6">
        <div className="space-y-1.5 flex-1 pr-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {report.overview?.name || report.resolvedName}
            </h2>
            <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-0.5 rounded-md font-mono border border-gray-200 uppercase font-bold">
              {report.overview?.exchange || 'EQUITY'}: {report.ticker}
            </span>
            <button
              onClick={handleToggleWatchlist}
              className={`p-1.5 rounded-md transition-colors cursor-pointer border flex items-center gap-1 text-xs font-mono ${
                inWatchlist
                  ? 'bg-amber-50 border-amber-300 text-amber-700 font-bold'
                  : 'bg-slate-50 hover:bg-amber-50 border-gray-200 text-slate-500 hover:text-amber-600'
              }`}
              title={inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
            >
              <Star className={`w-3.5 h-3.5 ${inWatchlist ? 'fill-amber-400 text-amber-500' : ''}`} />
              <span className="hidden sm:inline">{inWatchlist ? 'Tracked' : 'Watchlist'}</span>
            </button>
            {report.overview?.price !== undefined && report.overview?.price !== null && (
              <div className="flex items-baseline space-x-2 bg-slate-50 border border-slate-200 px-3 py-1 rounded-lg">
                <span className="text-sm font-bold text-slate-800 font-sans">
                  {currencySymbol}{(report.overview.price * fxRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                {report.overview?.dayChangePercent !== undefined && report.overview?.dayChangePercent !== null && (
                  <span className={`text-xs font-semibold font-sans flex items-baseline space-x-1 ${
                    report.overview.dayChangePercent >= 0 ? 'text-emerald-600' : 'text-[#eb5b3c]'
                  }`}>
                    {report.overview.dayChange !== undefined && (
                      <span>
                        {report.overview.dayChange >= 0 ? '+' : '-'}{Math.abs(report.overview.dayChange * fxRate).toFixed(2)}
                      </span>
                    )}
                    <span>
                      ({Math.abs(report.overview.dayChangePercent).toFixed(2)}%)
                    </span>
                    <span className="text-slate-400 font-normal text-[11px]">1D</span>
                  </span>
                )}
              </div>
            )}
            {report.overview?.source === 'GROWW_API' ? (
              <span className="bg-emerald-50 text-emerald-800 text-[10px] px-2 py-0.5 rounded-md font-mono border border-emerald-200 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Groww Live Feed (NSE)
              </span>
            ) : (
              <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-md font-mono border border-gray-200 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                NSE Market Feed
              </span>
            )}
            {report.overview?.sector && (
              <span className="text-xs text-slate-500 font-sans font-medium">
                • {report.overview.sector}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 leading-relaxed font-sans line-clamp-2 max-w-3xl">
            {report.overview?.summary || 'Asset summary description loaded from market metadata.'}
          </p>
        </div>

        {/* Action Recommendation Banner */}
        <div className="flex items-center space-x-4 border border-gray-200 rounded-xl p-4 shrink-0 bg-slate-50/60 w-full md:w-auto">
          {/* Health Score Pill */}
          <div className="space-y-0.5 text-center">
            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider font-bold">Health</span>
            <div className="text-xl font-black font-mono text-blue-700">
              {healthScore}<span className="text-[10px] text-slate-400 font-normal">/100</span>
            </div>
          </div>

          <div className="h-9 w-px bg-gray-200" />

          {/* AI Recommendation */}
          <div className="space-y-0.5">
            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider font-bold">Decision</span>
            <div className={`flex items-center space-x-1.5 border rounded-lg px-3.5 py-1 ${recBadgeClass}`}>
              {isInvest ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-rose-600" />}
              <span className="text-xs font-mono font-bold tracking-wider">{recLabel}</span>
            </div>
          </div>

          <div className="h-9 w-px bg-gray-200" />

          {/* Conviction */}
          <div className="space-y-0.5 text-center">
            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider font-bold">Conviction</span>
            <p className="text-xl font-black text-slate-900 font-mono">{report.confidenceScore || 80}%</p>
          </div>
        </div>
      </div>

      {/* Historical Chart */}
      <HistoricalChart
        data={normalizedHistorical}
        intradayData={normalizedIntraday}
        ticker={report.ticker}
        technicalAnalysis={report.technicalAnalysis}
        currencySymbol="₹"
        currentPrice={report.overview?.price ? report.overview.price * fxRate : undefined}
        dayChange={report.overview?.dayChange !== undefined ? report.overview.dayChange * fxRate : undefined}
        dayChangePercent={report.overview?.dayChangePercent}
        prevClose={report.overview?.prevClose !== undefined ? report.overview.prevClose * fxRate : undefined}
      />

      {/* Quick Key Market Statistics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Market Cap</span>
          <p className="text-sm font-black font-mono text-slate-900 truncate">
            {formatCurrency(report.overview?.marketCap)}
          </p>
          <span className="text-[10px] text-slate-500 font-mono block">Enterprise Scale</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Today&apos;s Range</span>
          <p className="text-xs font-black font-mono text-slate-900 truncate">
            {report.overview?.dayLow && report.overview?.dayHigh
              ? `${currencySymbol}${(report.overview.dayLow * fxRate).toLocaleString(undefined, { maximumFractionDigits: 2 })} - ${currencySymbol}${(report.overview.dayHigh * fxRate).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
              : 'N/A'}
          </p>
          <span className="text-[10px] text-slate-500 font-mono block">Low - High (NSE)</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">52-Week Range</span>
          <p className="text-xs font-black font-mono text-slate-900 truncate">
            {report.technicalAnalysis?.fiftyTwoWeekLow?.value && report.technicalAnalysis?.fiftyTwoWeekHigh?.value
              ? `${currencySymbol}${(Number(report.technicalAnalysis.fiftyTwoWeekLow.value) * fxRate).toFixed(2)} - ${currencySymbol}${(Number(report.technicalAnalysis.fiftyTwoWeekHigh.value) * fxRate).toFixed(2)}`
              : 'N/A'}
          </p>
          <span className="text-[10px] text-slate-500 font-mono block">Year Range</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">P/E Ratio (TTM)</span>
          <p className="text-sm font-black font-mono text-slate-900">
            {report.financialMetrics?.peRatio ? `${report.financialMetrics.peRatio.toFixed(2)}x` : 'N/A'}
          </p>
          <span className="text-[10px] text-slate-500 font-mono block">Valuation Multiple</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">ROE</span>
          <p className="text-sm font-black font-mono text-emerald-600">
            {report.financialMetrics?.returnOnEquity ? `${(report.financialMetrics.returnOnEquity * 100).toFixed(2)}%` : 'N/A'}
          </p>
          <span className="text-[10px] text-slate-500 font-mono block">Return on Equity</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Volume</span>
          <p className="text-sm font-black font-mono text-blue-700 truncate">
            {report.overview?.volume
              ? report.overview.volume.toLocaleString()
              : report.technicalAnalysis?.currentVolume?.value
              ? report.technicalAnalysis.currentVolume.value.toLocaleString()
              : 'N/A'}
          </p>
          <span className="text-[10px] text-slate-500 font-mono block">Shares Traded</span>
        </div>
      </div>

      {/* Internal Tab Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
              activeTab === t.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-gray-200'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content Areas */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Adversarial Bull vs Bear Analysis Card (Feature 3) */}
          <BullBearCard
            bullCase={report.bullCase || []}
            bearCase={report.bearCase || []}
            recommendation={report.recommendation}
            reasoning={report.reasoning}
            healthScore={healthScore}
          />

          {/* Stock Health Score Card (Feature 2) */}
          <HealthScoreCard healthScore={report.healthScore} />
        </div>
      )}

      {activeTab === 'financials' && (
        <FinancialsTab
          metrics={report.financialMetrics || {}}
          technicalAnalysis={report.technicalAnalysis}
          analysis={report.financialAnalysis}
          currencySymbol={currencySymbol}
        />
      )}

      {activeTab === 'competitors' && (
        <CompetitorTable
          targetTicker={report.ticker}
          competitors={report.competitors}
          onSelectPeer={onSelectPeer}
          currencySymbol={currencySymbol}
        />
      )}

      {activeTab === 'news' && (
        <NewsTab
          news={report.news || []}
          sentimentAnalysis={report.sentimentAnalysis}
          newsIntelligence={report.newsIntelligence}
        />
      )}

      {activeTab === 'swot' && (
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6">
          <SwotGrid swot={report.swotAnalysis} />
        </div>
      )}
        </>
      )}

      {/* Floating Watchlist Action Feedback */}
      {watchlistToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-950 text-white text-xs font-mono font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2.5 border border-slate-700 animate-fade-in">
          <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0 animate-bounce" />
          <span>{watchlistToast}</span>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
