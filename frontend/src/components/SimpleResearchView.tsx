'use client';

import React from 'react';
import {
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Newspaper,
  ExternalLink,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { HistoricalChart } from './HistoricalChart';
import {
  getHealthLabel,
  getPlainSummary,
  getBasicRiskNote,
  getOneLineDescription,
} from '../utils/researchHelpers';

interface SimpleResearchViewProps {
  report: any;
  normalizedHistorical: any[];
  normalizedIntraday: any[];
  fxRate: number;
  currencySymbol: string;
  onExpandFull: () => void;
}

export const SimpleResearchView: React.FC<SimpleResearchViewProps> = ({
  report,
  normalizedHistorical,
  normalizedIntraday,
  fxRate,
  currencySymbol,
  onExpandFull,
}) => {
  const healthScore = report?.healthScore?.overallScore ?? report?.confidenceScore ?? 70;
  const healthInfo = getHealthLabel(healthScore);
  const plainSummary = getPlainSummary(report, healthInfo.label);
  const riskNote = getBasicRiskNote(report);
  const oneLineDesc = getOneLineDescription(report);

  const rec = (report?.recommendation || 'HOLD').toUpperCase();
  const isBuy = rec === 'BUY';
  const isSell = rec === 'SELL';
  const recLabel = isBuy ? 'BUY / CONSIDER' : isSell ? 'SELL / CAUTION' : 'HOLD / WAIT';

  const recStyles = isBuy
    ? {
        badge: 'text-emerald-800 bg-emerald-50 border-emerald-300',
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />,
      }
    : isSell
    ? {
        badge: 'text-rose-800 bg-rose-50 border-rose-300',
        icon: <XCircle className="w-4 h-4 text-rose-600 shrink-0" />,
      }
    : {
        badge: 'text-amber-800 bg-amber-50 border-amber-300',
        icon: <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />,
      };

  const dayChange = report?.overview?.dayChangePercent ?? 0;
  const isPriceUp = dayChange >= 0;

  // Filter top 1-2 news articles
  const topNews = Array.isArray(report?.news) ? report.news.slice(0, 2) : [];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5 animate-fade-in px-2 sm:px-0">
      {/* 1. Header & Hero Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {report?.overview?.name || report?.resolvedName || report?.ticker}
              </h2>
              <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-0.5 rounded-md font-mono border border-gray-200 uppercase font-bold">
                {report?.overview?.exchange || 'EQUITY'}: {report?.ticker}
              </span>
            </div>
            {/* 2. One-Line Plain-English Company Description */}
            <p className="text-xs sm:text-sm text-slate-600 mt-2 font-normal leading-relaxed">
              {oneLineDesc}
            </p>
          </div>

          {/* Price Block */}
          {report?.overview?.price != null && (
            <div className="sm:text-right shrink-0 bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl border border-gray-100 sm:border-0">
              <div className="text-2xl sm:text-3xl font-black text-slate-900 font-sans tracking-tight">
                {currencySymbol}
                {(report.overview.price * fxRate).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <div
                className={`inline-flex items-center space-x-1 text-xs font-bold font-mono mt-0.5 ${
                  isPriceUp ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {isPriceUp ? (
                  <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>
                  {isPriceUp ? '+' : ''}
                  {dayChange.toFixed(2)}% (1D)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 3. Core Decision & Health Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Recommendation & 1-sentence Takeaway */}
          <div className="bg-slate-50/80 border border-gray-200/90 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">
                Recommendation
              </span>
              <span
                className={`inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full text-xs font-mono font-bold border ${recStyles.badge}`}
              >
                {recStyles.icon}
                <span>{recLabel}</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
              {plainSummary}
            </p>
          </div>

          {/* 4. Health Label (Good / Average / Risky) */}
          <div className="bg-slate-50/80 border border-gray-200/90 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">
                Financial Health
              </span>
              <span
                className={`inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full text-xs font-mono font-bold border ${healthInfo.badgeClass}`}
              >
                <span className={`w-2 h-2 rounded-full ${healthInfo.dotClass}`} />
                <span>{healthInfo.label}</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
              {healthInfo.explanation}
            </p>
          </div>
        </div>
      </div>

      {/* 5. Simple Price Chart (Price line only, no technical overlays) */}
      <div className="bg-white border border-gray-200 rounded-2xl p-1 shadow-sm overflow-hidden">
        <HistoricalChart
          data={normalizedHistorical}
          intradayData={normalizedIntraday}
          ticker={report?.ticker}
          currencySymbol={currencySymbol}
          currentPrice={report?.overview?.price ? report.overview.price * fxRate : undefined}
          dayChange={report?.overview?.dayChange !== undefined ? report.overview.dayChange * fxRate : undefined}
          dayChangePercent={report?.overview?.dayChangePercent}
          prevClose={report?.overview?.prevClose !== undefined ? report.overview.prevClose * fxRate : undefined}
          simpleMode={true}
        />
      </div>

      {/* 6. Basic Risk Note */}
      <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-4 flex items-start space-x-3 text-slate-800 shadow-2xs">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="text-[11px] font-mono uppercase tracking-wider font-bold text-blue-900">
            Risk & Volatility Note
          </p>
          <p className="text-xs text-slate-700 leading-relaxed font-medium">
            {riskNote}
          </p>
        </div>
      </div>

      {/* 7. Top 1-2 News Headlines */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center space-x-2 border-b border-gray-100 pb-2.5">
          <Newspaper className="w-4 h-4 text-slate-600" />
          <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-700">
            Recent Market Headlines
          </h4>
        </div>

        {topNews.length > 0 ? (
          <div className="space-y-2.5">
            {topNews.map((item: any, idx: number) => {
              const sentiment = (item.sentiment || 'Neutral').toLowerCase();
              const sentimentBadge =
                sentiment === 'positive' || sentiment === 'bullish'
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                  : sentiment === 'negative' || sentiment === 'bearish'
                  ? 'text-rose-700 bg-rose-50 border-rose-200'
                  : 'text-slate-600 bg-slate-50 border-slate-200';

              return (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-50/70 border border-gray-100 hover:border-gray-200 transition-colors"
                >
                  <div className="space-y-1 pr-2">
                    <p className="text-xs font-semibold text-slate-900 leading-snug">
                      {item.title}
                    </p>
                    <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono">
                      <span>{item.source || 'Market Feed'}</span>
                      {item.publishedAt && <span>• {new Date(item.publishedAt).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0 self-start sm:self-center">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border capitalize ${sentimentBadge}`}
                    >
                      {item.sentiment || 'Neutral'}
                    </span>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-blue-600 p-1"
                        title="Open article"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 text-center rounded-xl bg-slate-50 border border-dashed border-gray-200 space-y-1">
            <p className="text-xs font-medium text-slate-600 font-sans">
              No recent major headlines reported for this stock.
            </p>
            <p className="text-[10px] text-slate-400 font-mono">
              Live quote and financial metrics are fully up to date.
            </p>
          </div>
        )}
      </div>

      {/* 9. "See Full Analysis" CTA Button */}
      <div className="bg-slate-950 text-white rounded-2xl p-5 sm:p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <h4 className="text-sm font-bold font-mono tracking-tight text-white uppercase">
              Looking for deeper data?
            </h4>
          </div>
          <p className="text-xs text-slate-300 max-w-xl font-sans leading-relaxed">
            Explore the complete institutional breakdown: Financial ratios (P/E, ROE), peer comparisons,
            technical indicators (RSI, Moving Averages), SWOT matrix, and adversarial Bull vs. Bear cases.
          </p>
        </div>

        <button
          type="button"
          onClick={onExpandFull}
          className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-mono text-xs font-bold py-3 px-5 rounded-xl transition-all cursor-pointer shadow-sm hover:shadow-md shrink-0 active:scale-[0.98]"
        >
          <span>See Full Analysis</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* 8. Persistent Compliance Disclaimer */}
      <div className="p-3.5 rounded-xl border border-gray-200/80 bg-slate-50 text-[10px] text-slate-500 font-mono leading-relaxed text-center">
        <strong>ALPHAINSIGHT AI DISCLAIMER:</strong> This platform provides algorithmic decision-support and
        educational data points. It does not constitute SEBI/SEC-registered financial, investment, or tax advice.
        Always conduct your own independent research before making capital decisions.
      </div>
    </div>
  );
};

export default SimpleResearchView;
