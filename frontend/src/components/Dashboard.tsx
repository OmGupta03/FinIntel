'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { HistoricalChart } from './HistoricalChart';
import { FinancialsTab, TechnicalAnalysisData } from './FinancialsTab';
import { NewsTab, StructuredArticle, NewsIntelligenceData } from './NewsTab';
import { SwotGrid } from './SwotGrid';
import { HealthScoreCard, HealthScorePayload } from './HealthScoreCard';
import { BullBearCard } from './BullBearCard';
import { CompetitorTable, CompetitorData } from './CompetitorTable';

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
}

interface DashboardProps {
  report: ResearchReport;
  onReset: () => void;
  onSelectPeer?: (ticker: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ report, onReset, onSelectPeer }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'financials' | 'competitors' | 'news' | 'swot'>('overview');

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
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <button
          onClick={onReset}
          className="flex items-center space-x-1.5 text-slate-500 hover:text-slate-900 transition-colors text-xs font-mono group cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Search Splash</span>
        </button>

        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-semibold flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-blue-600" />
          <span>Live Session: {report.ticker}-RESEARCH</span>
        </span>
      </div>

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
            {report.overview?.price !== undefined && report.overview?.price !== null && (
              <span className="bg-blue-50 text-blue-800 text-xs px-2.5 py-0.5 rounded-md font-mono border border-blue-200 font-extrabold flex items-center">
                {currencySymbol}{(report.overview.price * fxRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
              </span>
            )}
            {report.overview?.dayChangePercent !== undefined && report.overview?.dayChangePercent !== null && (
              <span className={`text-xs px-2 py-0.5 rounded-md font-mono border font-extrabold flex items-center gap-1 ${
                report.overview.dayChangePercent >= 0
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                {report.overview.dayChangePercent >= 0 ? '+' : ''}
                {report.overview.dayChangePercent.toFixed(2)}%
                {report.overview.dayChange !== undefined && (
                  <span className="font-normal opacity-90 text-[11px]">
                    ({report.overview.dayChange >= 0 ? '+' : '-'}{currencySymbol}{Math.abs(report.overview.dayChange * fxRate).toFixed(2)})
                  </span>
                )}
              </span>
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
    </div>
  );
};

export default Dashboard;
