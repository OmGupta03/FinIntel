'use client';

import React from 'react';
import { Newspaper, ExternalLink, Calendar, Sparkles, Tag, Radio } from 'lucide-react';
import { MarkdownRenderer } from './FinancialsTab';

export interface StructuredArticle {
  title: string;
  source?: string;
  url?: string;
  publishedAt?: string;
  snippet?: string;
  sentiment?: 'positive' | 'negative' | 'neutral' | string;
  catalysts?: string[];
  topics?: string[];
  impact?: 'low' | 'medium' | 'high';
  publisher?: string;
  link?: string;
  providerPublishTime?: number;
  [key: string]: unknown;
}

export interface NewsIntelligenceData {
  articles?: StructuredArticle[];
  aggregateSentimentScore?: number;
  sentimentLabel?: string;
  keyCatalysts?: string[];
  topTopics?: string[];
  summary?: string;
  [key: string]: unknown;
}

interface NewsTabProps {
  news: StructuredArticle[];
  sentimentAnalysis: string;
  newsIntelligence?: NewsIntelligenceData;
}

export const NewsTab: React.FC<NewsTabProps> = ({ news, sentimentAnalysis, newsIntelligence }) => {
  const articlesToDisplay = newsIntelligence?.articles || news || [];
  const score = newsIntelligence?.aggregateSentimentScore ?? 50;
  const label = newsIntelligence?.sentimentLabel ?? 'Neutral';

  const getDaysAgo = (dateStr?: string | number) => {
    if (!dateStr) return 'Recent';
    try {
      const past = new Date(dateStr);
      const diffTime = Math.abs(new Date().getTime() - past.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 1) return 'Today';
      return `${diffDays}d ago`;
    } catch {
      return 'Recent';
    }
  };

  const getSentimentBadge = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase">Bullish</span>;
      case 'negative':
        return <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase">Bearish</span>;
      default:
        return <span className="bg-slate-100 text-slate-600 border border-gray-200 text-[9px] font-mono px-2 py-0.5 rounded font-semibold uppercase">Neutral</span>;
    }
  };

  const getImpactBadge = (impact?: string) => {
    if (impact === 'high') {
      return <span className="text-[9px] font-mono text-rose-600 font-bold">High Impact</span>;
    }
    if (impact === 'medium') {
      return <span className="text-[9px] font-mono text-amber-600 font-medium">Med Impact</span>;
    }
    return <span className="text-[9px] font-mono text-slate-400">Low Impact</span>;
  };

  return (
    <div className="space-y-6">
      {/* Aggregate Sentiment Score Meter Banner */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-extrabold flex items-center space-x-1">
              <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
              <span>AI Market Sentiment Intelligence</span>
            </span>
          </div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">
            Overall Market Tone: <span className={score >= 60 ? 'text-emerald-600' : score <= 40 ? 'text-rose-600' : 'text-slate-700'}>{label}</span>
          </h3>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            {newsIntelligence?.summary || 'Synthesized across real-time external headlines and earnings catalysts.'}
          </p>
        </div>

        {/* Meter Gauge */}
        <div className="bg-slate-50 border border-gray-200 rounded-xl p-4 shrink-0 w-full md:w-64 space-y-2 font-mono">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-semibold">Aggregate Score:</span>
            <span className="font-extrabold text-slate-900 text-sm">{score}/100</span>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden border border-slate-300/40">
            <div
              className={`h-full transition-all duration-500 ${
                score >= 60 ? 'bg-emerald-500' : score <= 40 ? 'bg-rose-500' : 'bg-blue-500'
              }`}
              style={{ width: `${score}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-slate-400 font-bold">
            <span>0 Bearish</span>
            <span>50 Neutral</span>
            <span>100 Bullish</span>
          </div>
        </div>
      </div>

      {/* Key Detected Catalysts Pills */}
      {newsIntelligence?.keyCatalysts && newsIntelligence.keyCatalysts.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm">
          <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider flex items-center space-x-1">
            <Tag className="w-3 h-3 text-purple-600" />
            <span>Key Catalysts:</span>
          </span>
          {newsIntelligence.keyCatalysts.map((cat, i) => (
            <span
              key={i}
              className="bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-0.5 rounded-full text-xs font-semibold"
            >
              {cat}
            </span>
          ))}
        </div>
      )}

      {/* Main Split: Article Stream + Synthesis Report */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Article Feeds (Col 7) */}
        <div className="lg:col-span-7 space-y-4 max-h-[750px] overflow-y-auto pr-1">
          <h4 className="text-xs uppercase font-extrabold text-slate-400 tracking-wider font-mono flex items-center space-x-2">
            <Newspaper className="w-4 h-4 text-blue-600" />
            <span>Classified News & Catalyst Feed ({articlesToDisplay.length} Articles)</span>
          </h4>

          {articlesToDisplay.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-slate-400 font-mono text-xs">
              No recent news articles collected for this security.
            </div>
          ) : (
            articlesToDisplay.map((item, idx) => (
              <div
                key={idx}
                className="bg-white border border-gray-200 hover:border-gray-300 rounded-xl p-5 shadow-sm transition-all space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="bg-slate-100 text-slate-700 font-mono text-[10px] px-2 py-0.5 rounded font-bold">
                      {item.source}
                    </span>
                    {getSentimentBadge(item.sentiment)}
                  </div>
                  <div className="flex items-center space-x-2 font-mono text-[10px]">
                    {getImpactBadge(item.impact)}
                    <span className="text-slate-400 flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{getDaysAgo(item.publishedAt)}</span>
                    </span>
                  </div>
                </div>

                <h5 className="text-sm font-bold text-slate-900 leading-snug">
                  {item.title}
                </h5>

                <p className="text-xs text-slate-600 leading-relaxed font-sans">
                  {item.snippet}
                </p>

                {/* Catalyst & Topic chips */}
                {item.topics && item.topics.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {item.topics.map((top, tIdx) => (
                      <span key={tIdx} className="bg-slate-100 text-slate-600 text-[9px] font-mono px-2 py-0.5 rounded">
                        #{top}
                      </span>
                    ))}
                    {item.catalysts && item.catalysts.map((cat, cIdx) => (
                      <span key={cIdx} className="bg-blue-50 text-blue-700 text-[9px] font-mono px-2 py-0.5 rounded">
                        • {cat}
                      </span>
                    ))}
                  </div>
                )}

                {item.url && (
                  <div className="pt-1">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700 font-semibold space-x-1 font-mono cursor-pointer"
                    >
                      <span>Read full coverage</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Narrative Sentiment Synthesis (Col 5) */}
        <div className="lg:col-span-5 bg-white border border-gray-200 shadow-sm rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight border-b border-gray-100 pb-3 flex items-center space-x-2 font-mono">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>AI Sentiment Synthesis & Tone Review</span>
          </h3>

          <div className="overflow-y-auto max-h-[650px] pr-1">
            <MarkdownRenderer content={sentimentAnalysis} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsTab;
