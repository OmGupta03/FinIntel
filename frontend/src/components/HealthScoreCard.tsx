'use client';

import React from 'react';
import { ShieldCheck, TrendingUp, DollarSign, Activity, AlertTriangle } from 'lucide-react';

export interface HealthScorePayload {
  overallScore: number;
  subScores: {
    fundamental: number;
    valuation: number;
    growth: number;
    technical: number;
    risk: number;
  };
  explanations: {
    overall: string;
    fundamental: string;
    valuation: string;
    growth: string;
    technical: string;
    risk: string;
  };
}

interface HealthScoreProps {
  healthScore?: HealthScorePayload;
}

export const HealthScoreCard: React.FC<HealthScoreProps> = ({ healthScore }) => {
  const overall = healthScore?.overallScore ?? 75;
  const sub = healthScore?.subScores || {
    fundamental: 80,
    valuation: 65,
    growth: 75,
    technical: 70,
    risk: 80,
  };
  const explanations = healthScore?.explanations || {
    overall: `Overall Health Score of ${overall}/100 indicates an institutional-grade investment profile.`,
    fundamental: 'Robust capital efficiency and healthy returns on equity.',
    valuation: 'Multiple trades near sector historical median relative to forward growth.',
    growth: 'Sustained top-line revenue expansion demonstrates secular product demand.',
    technical: 'Price structure maintains support above key moving averages with stable RSI momentum.',
    risk: 'Conservative balance sheet leverage and adequate liquid reserves cushion against downturns.',
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return { text: 'text-emerald-600', bg: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (score >= 50) return { text: 'text-amber-600', bg: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { text: 'text-rose-600', bg: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700 border-rose-200' };
  };

  const overallStyle = getScoreColor(overall);

  const dimensions = [
    {
      name: 'Fundamental Health',
      weight: '25%',
      score: sub.fundamental,
      explanation: explanations.fundamental,
      icon: <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />,
    },
    {
      name: 'Valuation Attractiveness',
      weight: '20%',
      score: sub.valuation,
      explanation: explanations.valuation,
      icon: <DollarSign className="w-3.5 h-3.5 text-purple-600" />,
    },
    {
      name: 'Growth Momentum',
      weight: '20%',
      score: sub.growth,
      explanation: explanations.growth,
      icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />,
    },
    {
      name: 'Technical Bias',
      weight: '20%',
      score: sub.technical,
      explanation: explanations.technical,
      icon: <Activity className="w-3.5 h-3.5 text-amber-600" />,
    },
    {
      name: 'Risk & Solvency Cushion',
      weight: '15%',
      score: sub.risk,
      explanation: explanations.risk,
      icon: <AlertTriangle className="w-3.5 h-3.5 text-slate-600" />,
    },
  ];

  // SVG Gauge calculations
  const radius = 46;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overall / 100) * circumference;

  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-extrabold">
              Deterministic Scoring Engine
            </span>
            <span className="text-[10px] font-mono text-slate-400">• Multi-Dimensional Audit</span>
          </div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight mt-0.5">
            Institutional Stock Health Score
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            {explanations.overall}
          </p>
        </div>

        {/* Circular Overall Gauge */}
        <div className="flex items-center space-x-4 bg-slate-50 border border-gray-200 rounded-xl p-3 shrink-0">
          <div className="relative flex items-center justify-center w-24 h-24">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r={radius}
                stroke="#e2e8f0"
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              <circle
                cx="48"
                cy="48"
                r={radius}
                stroke="currentColor"
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className={`${overallStyle.text} transition-all duration-1000 ease-out`}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-black text-slate-900 font-mono leading-none">
                {overall}
              </span>
              <span className="text-[9px] font-mono uppercase font-bold text-slate-400 mt-0.5">
                / 100
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <span className={`inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${overallStyle.badge}`}>
              {overall >= 70 ? 'Resilient' : overall >= 50 ? 'Moderate' : 'High Risk'}
            </span>
            <p className="text-[10px] text-slate-400 font-mono">100% Deterministic</p>
          </div>
        </div>
      </div>

      {/* 5 Dimensions Breakdown */}
      <div className="space-y-3.5">
        <h4 className="text-xs uppercase font-extrabold text-slate-400 tracking-wider font-mono">
          Dimension Sub-Scores & Weighting
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {dimensions.map((dim, idx) => {
            const style = getScoreColor(dim.score);
            return (
              <div
                key={idx}
                className="bg-slate-50/70 border border-gray-200/80 rounded-xl p-3.5 space-y-2 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    {dim.icon}
                    <span className="font-bold text-slate-800">{dim.name}</span>
                    <span className="text-[9px] font-mono text-slate-400">({dim.weight})</span>
                  </div>
                  <span className={`font-mono font-extrabold ${style.text}`}>
                    {dim.score}/100
                  </span>
                </div>

                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`${style.bg} h-full transition-all duration-500`}
                    style={{ width: `${dim.score}%` }}
                  />
                </div>

                <p className="text-[11px] text-slate-600 font-sans leading-relaxed">
                  {dim.explanation}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HealthScoreCard;
