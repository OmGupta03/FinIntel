'use client';

import React from 'react';
import { IndianRupee, BarChart3, TrendingUp, ShieldAlert, Sparkles, Activity } from 'lucide-react';

export interface IndicatorValue<T> {
  value: T | null;
  insufficientData?: boolean;
  notes?: string;
}

export interface MacdResult {
  macd: number;
  signal: number;
  histogram: number;
}

export interface BollingerBandsResult {
  upper: number;
  middle: number;
  lower: number;
  bandwidth?: number;
}

export interface TechnicalAnalysisData {
  currentPrice?: number;
  sma20?: IndicatorValue<number>;
  sma50?: IndicatorValue<number>;
  sma200?: IndicatorValue<number>;
  ema20?: IndicatorValue<number>;
  rsi14?: IndicatorValue<number> & { interpretation?: string };
  macd?: IndicatorValue<MacdResult>;
  bollingerBands?: IndicatorValue<BollingerBandsResult>;
  fiftyTwoWeekHigh?: IndicatorValue<number>;
  fiftyTwoWeekLow?: IndicatorValue<number>;
  currentVolume?: IndicatorValue<number>;
  averageVolume30d?: IndicatorValue<number>;
  volumeRatio?: IndicatorValue<number>;
  annualizedVolatility?: IndicatorValue<number>;
  trendSignal?: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | string;
  summary?: string;
  [key: string]: unknown;
}

interface FinancialsTabProps {
  metrics: {
    peRatio?: number;
    forwardPe?: number;
    priceToBook?: number;
    pegRatio?: number;
    currentRatio?: number;
    quickRatio?: number;
    debtToEquity?: number;
    returnOnEquity?: number;
    returnOnAssets?: number;
    revenueGrowth?: number;
    earningsGrowth?: number;
    trailingEps?: number;
    forwardEps?: number;
    profitMargin?: number;
    ebitda?: number;
    freeCashFlow?: number;
    operatingCashFlow?: number;
    totalCash?: number;
    totalDebt?: number;
  };
  technicalAnalysis?: TechnicalAnalysisData;
  analysis: string;
  currencySymbol?: string;
}

// Inline markdown to JSX parser styled for clean light cards
export const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return <p className="text-slate-400 italic font-mono text-xs">No analysis generated yet.</p>;

  const lines = content.split('\n');
  return (
    <div className="space-y-3 text-slate-700 text-xs sm:text-sm leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('####')) {
          return <h5 key={idx} className="text-xs font-bold text-slate-900 uppercase tracking-wider mt-3 font-mono">{trimmed.replace(/####\s*/, '')}</h5>;
        }
        if (trimmed.startsWith('###')) {
          return <h4 key={idx} className="text-sm font-extrabold text-blue-700 mt-4 border-b border-gray-100 pb-1 font-mono">{trimmed.replace(/###\s*/, '')}</h4>;
        }
        if (trimmed.startsWith('##')) {
          return <h3 key={idx} className="text-base font-extrabold text-slate-900 mt-5 font-mono">{trimmed.replace(/##\s*/, '')}</h3>;
        }
        if (trimmed.startsWith('#')) {
          return <h2 key={idx} className="text-lg font-black text-slate-900 mt-5 mb-1 font-mono">{trimmed.replace(/#\s*/, '')}</h2>;
        }
        if (trimmed.startsWith('*') || trimmed.startsWith('-')) {
          const rawText = trimmed.replace(/^[\s*-]+\s*/, '');
          return (
            <div key={idx} className="flex items-start space-x-2 pl-2">
              <span className="text-blue-600 font-bold select-none">•</span>
              <span className="text-slate-700">{parseBoldText(rawText)}</span>
            </div>
          );
        }
        if (trimmed === '') {
          return <div key={idx} className="h-1.5" />;
        }
        return <p key={idx}>{parseBoldText(trimmed)}</p>;
      })}
    </div>
  );
};

function parseBoldText(text: string) {
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return <strong key={index} className="font-extrabold text-slate-950">{part}</strong>;
    }
    return part;
  });
}

export const FinancialsTab: React.FC<FinancialsTabProps> = ({ metrics, technicalAnalysis, analysis }) => {
  const currencySymbol = '₹';
  const formatNum = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return 'N/A';
    return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const formatPercent = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return 'N/A';
    return `${(val * 100).toFixed(2)}%`;
  };

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return 'N/A';
    const abs = Math.abs(val);
    if (abs >= 1e12) return `${currencySymbol}${(val / 1e12).toFixed(2)}T`;
    if (abs >= 1e9) return `${currencySymbol}${(val / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `${currencySymbol}${(val / 1e6).toFixed(2)}M`;
    return `${currencySymbol}${val.toLocaleString()}`;
  };

  const tech = technicalAnalysis;

  return (
    <div className="space-y-6">
      {/* 4 Quantitative Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Valuation Multiples */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
          <h4 className="text-xs uppercase font-extrabold text-slate-400 tracking-wider flex items-center space-x-2 font-mono">
            <IndianRupee className="w-4 h-4 text-blue-600" />
            <span>Valuation Multiples</span>
          </h4>
          <div className="space-y-2.5 font-mono text-xs">
            <div className="flex justify-between border-b border-gray-100 pb-1.5">
              <span className="text-slate-500">Trailing P/E</span>
              <span className="font-bold text-slate-900">{formatNum(metrics?.peRatio)}x</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1.5">
              <span className="text-slate-500">Forward P/E</span>
              <span className="font-bold text-slate-900">{formatNum(metrics?.forwardPe)}x</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1.5">
              <span className="text-slate-500">Price to Book (P/B)</span>
              <span className="font-bold text-slate-900">{formatNum(metrics?.priceToBook)}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1.5">
              <span className="text-slate-500">PEG Ratio</span>
              <span className="font-bold text-slate-900">{formatNum(metrics?.pegRatio)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Trailing EPS</span>
              <span className="font-bold text-slate-900">{metrics?.trailingEps !== undefined && metrics?.trailingEps !== null ? `${currencySymbol}${metrics.trailingEps.toFixed(2)}` : 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Profitability & Returns */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
          <h4 className="text-xs uppercase font-extrabold text-slate-400 tracking-wider flex items-center space-x-2 font-mono">
            <BarChart3 className="w-4 h-4 text-purple-600" />
            <span>Profitability & Returns</span>
          </h4>
          <div className="space-y-2.5 font-mono text-xs">
            <div className="flex justify-between border-b border-gray-100 pb-1.5">
              <span className="text-slate-500">Profit Margin</span>
              <span className="font-bold text-slate-900">{formatPercent(metrics?.profitMargin)}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1.5">
              <span className="text-slate-500">Return on Equity (ROE)</span>
              <span className="font-bold text-emerald-600">{formatPercent(metrics?.returnOnEquity)}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1.5">
              <span className="text-slate-500">Return on Assets (ROA)</span>
              <span className="font-bold text-blue-600">{formatPercent(metrics?.returnOnAssets)}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1.5">
              <span className="text-slate-500">YoY Rev Growth</span>
              <span className="font-bold text-slate-900">{formatPercent(metrics?.revenueGrowth)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Earnings Growth</span>
              <span className="font-bold text-slate-900">{formatPercent(metrics?.earningsGrowth)}</span>
            </div>
          </div>
        </div>

        {/* Solvency & Leverage */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
          <h4 className="text-xs uppercase font-extrabold text-slate-400 tracking-wider flex items-center space-x-2 font-mono">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>Liquidity & Leverage</span>
          </h4>
          <div className="space-y-2.5 font-mono text-xs">
            <div className="flex justify-between border-b border-gray-100 pb-1.5">
              <span className="text-slate-500">Current Ratio</span>
              <span className="font-bold text-slate-900">{formatNum(metrics?.currentRatio)}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1.5">
              <span className="text-slate-500">Quick Ratio</span>
              <span className="font-bold text-slate-900">{formatNum(metrics?.quickRatio)}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1.5">
              <span className="text-slate-500">Debt to Equity</span>
              <span className="font-bold text-slate-900">{metrics?.debtToEquity !== undefined ? `${metrics.debtToEquity.toFixed(1)}%` : 'N/A'}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1.5">
              <span className="text-slate-500">Total Cash</span>
              <span className="font-bold text-slate-900">{formatCurrency(metrics?.totalCash)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Debt</span>
              <span className="font-bold text-slate-900">{formatCurrency(metrics?.totalDebt)}</span>
            </div>
          </div>
        </div>

        {/* Cash Flow Generation */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
          <h4 className="text-xs uppercase font-extrabold text-slate-400 tracking-wider flex items-center space-x-2 font-mono">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>Cash Flow Strength</span>
          </h4>
          <div className="space-y-2.5 font-mono text-xs">
            <div className="flex justify-between border-b border-gray-100 pb-1.5">
              <span className="text-slate-500">Free Cash Flow</span>
              <span className="font-bold text-emerald-600">{formatCurrency(metrics?.freeCashFlow)}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1.5">
              <span className="text-slate-500">Operating Cash Flow</span>
              <span className="font-bold text-slate-900">{formatCurrency(metrics?.operatingCashFlow)}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1.5">
              <span className="text-slate-500">EBITDA</span>
              <span className="font-bold text-slate-900">{formatCurrency(metrics?.ebitda)}</span>
            </div>
            <div className="flex justify-between border-b border-gray-100 pb-1.5">
              <span className="text-slate-500">52w High</span>
              <span className="font-bold text-slate-900">{tech?.fiftyTwoWeekHigh?.value ? `${currencySymbol}${tech.fiftyTwoWeekHigh.value}` : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">52w Low</span>
              <span className="font-bold text-slate-900">{tech?.fiftyTwoWeekLow?.value ? `${currencySymbol}${tech.fiftyTwoWeekLow.value}` : 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Split: Technical Analysis Card + Narrative LLM Report */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Technical Indicators Deep-Dive (Col 5) */}
        <div className="lg:col-span-5 bg-white border border-gray-200 shadow-sm rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h4 className="text-xs uppercase font-extrabold text-slate-400 tracking-wider font-mono flex items-center space-x-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <span>Technical Indicators (Deterministic)</span>
            </h4>
            {tech?.trendSignal && (
              <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-extrabold uppercase ${
                tech.trendSignal === 'BULLISH' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                tech.trendSignal === 'BEARISH' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                'bg-slate-100 text-slate-600 border border-gray-200'
              }`}>
                {tech.trendSignal} Bias
              </span>
            )}
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg">
              <span className="text-slate-500">RSI (14-Period)</span>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-slate-900">{tech?.rsi14?.value ?? 'N/A'}</span>
                <span className="text-[10px] text-slate-400 font-semibold">
                  {typeof tech?.rsi14?.value === 'number'
                    ? tech.rsi14.value > 70
                      ? '(Overbought)'
                      : tech.rsi14.value < 30
                      ? '(Oversold)'
                      : '(Neutral)'
                    : ''}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg">
              <span className="text-slate-500">Moving Averages</span>
              <div className="text-right text-[11px]">
                <span className="font-bold text-slate-800">SMA20: {tech?.sma20?.value ? `${currencySymbol}${tech.sma20.value}` : 'N/A'}</span>
                <span className="text-slate-400 mx-1">|</span>
                <span className="font-bold text-slate-800">SMA50: {tech?.sma50?.value ? `${currencySymbol}${tech.sma50.value}` : 'N/A'}</span>
              </div>
            </div>

            <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg">
              <span className="text-slate-500">MACD (12, 26, 9)</span>
              <div className="text-right text-[11px]">
                <span className="font-bold text-slate-800">Line: {tech?.macd?.value?.macd ?? 'N/A'}</span>
                <span className="text-slate-400 mx-1">|</span>
                <span className={`font-bold ${(tech?.macd?.value?.histogram ?? 0) > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  Hist: {tech?.macd?.value?.histogram ?? 'N/A'}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg">
              <span className="text-slate-500">Bollinger Bands (20, 2&sigma;)</span>
              <div className="text-right text-[11px]">
                <span className="font-bold text-slate-800">{tech?.bollingerBands?.value?.lower !== undefined ? `${currencySymbol}${tech.bollingerBands.value.lower} - ${currencySymbol}${tech.bollingerBands.value.upper}` : 'N/A'}</span>
              </div>
            </div>

            <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg">
              <span className="text-slate-500">Annualized Volatility</span>
              <span className="font-bold text-slate-900">{tech?.annualizedVolatility?.value ? `${tech.annualizedVolatility.value}%` : 'N/A'}</span>
            </div>

            <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg">
              <span className="text-slate-500">Volume vs 30d Avg</span>
              <span className="font-bold text-slate-900">{tech?.volumeRatio?.value ? `${tech.volumeRatio.value}x` : 'N/A'}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 font-mono leading-relaxed pt-1">
            {tech?.summary || 'Quantitative technical indicators computed from 12-month daily trading records.'}
          </p>
        </div>

        {/* Financial Evaluation Narrative (Col 7) */}
        <div className="lg:col-span-7 bg-white border border-gray-200 shadow-sm rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight border-b border-gray-100 pb-3 flex items-center space-x-2 font-mono">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>AI Fundamental Evaluation & Ratio Interpretation</span>
          </h3>

          <div className="overflow-y-auto max-h-[600px] pr-1">
            <MarkdownRenderer content={analysis} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialsTab;
