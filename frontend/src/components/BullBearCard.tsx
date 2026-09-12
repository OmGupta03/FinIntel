'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Scale, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface BullBearCardProps {
  bullCase: string[];
  bearCase: string[];
  recommendation: string;
  reasoning: string;
  healthScore?: number;
}

export const BullBearCard: React.FC<BullBearCardProps> = ({
  bullCase,
  bearCase,
  recommendation,
  reasoning,
  healthScore,
}) => {
  const isInvest = recommendation.toUpperCase() === 'BUY';
  const isPass = recommendation.toUpperCase() === 'SELL';
  const strongerSide = isInvest ? 'Bull Case' : isPass ? 'Bear Case' : 'Neutral / Balanced';

  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 space-y-6">
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Scale className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900 font-mono uppercase tracking-wider">
              Adversarial Bull vs. Bear Case Analysis
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Objective evaluation of upside catalysts versus downside risk factors, grounded in deterministic fundamentals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {healthScore !== undefined && (
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700 font-bold uppercase tracking-wider">
              Health: {healthScore}/100
            </span>
          )}
          <span className={`text-[10px] font-mono px-3 py-1 rounded-full border font-bold uppercase tracking-wider ${
            isInvest
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : isPass
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            Stronger Evidence: {strongerSide}
          </span>
        </div>
      </div>

      {/* Split Comparison Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* BULL CASE */}
        <div className="border border-emerald-200 bg-emerald-50/20 rounded-xl p-5 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 border-b border-emerald-200/60 pb-2 mb-3">
              <div className="bg-emerald-100 p-1.5 rounded-lg text-emerald-700">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-black text-emerald-950 font-mono tracking-wide uppercase">
                Bull Case (Upside Catalysts)
              </h4>
            </div>

            <ul className="space-y-3">
              {bullCase.map((point, idx) => (
                <li key={idx} className="flex items-start space-x-2.5 text-xs text-slate-700 leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{point}</span>
                </li>
              ))}
              {bullCase.length === 0 && (
                <li className="text-xs text-slate-400 italic">No specific bull arguments generated.</li>
              )}
            </ul>
          </div>

          <div className="bg-emerald-100/50 border border-emerald-200/60 rounded-lg p-2.5 text-[11px] text-emerald-900 font-mono">
            Supported by: High Capital Efficiency, Cash Conversion, & Secular Demand
          </div>
        </div>

        {/* BEAR CASE */}
        <div className="border border-rose-200 bg-rose-50/20 rounded-xl p-5 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 border-b border-rose-200/60 pb-2 mb-3">
              <div className="bg-rose-100 p-1.5 rounded-lg text-rose-700">
                <TrendingDown className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-black text-rose-950 font-mono tracking-wide uppercase">
                Bear Case (Downside Risks)
              </h4>
            </div>

            <ul className="space-y-3">
              {bearCase.map((point, idx) => (
                <li key={idx} className="flex items-start space-x-2.5 text-xs text-slate-700 leading-relaxed">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{point}</span>
                </li>
              ))}
              {bearCase.length === 0 && (
                <li className="text-xs text-slate-400 italic">No specific bear arguments generated.</li>
              )}
            </ul>
          </div>

          <div className="bg-rose-100/50 border border-rose-200/60 rounded-lg p-2.5 text-[11px] text-rose-900 font-mono">
            Key Risks: Multiple Compression, Macro Deceleration, & Leverage Friction
          </div>
        </div>
      </div>

      {/* Synthesis Conclusion */}
      <div className="bg-slate-50 border border-gray-200 rounded-xl p-4 space-y-1.5">
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-extrabold flex items-center space-x-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>Investment Committee Synthesis & Evidence Weighing</span>
        </span>
        <p className="text-xs text-slate-800 leading-relaxed font-sans font-medium">
          {reasoning}
        </p>
      </div>
    </div>
  );
};

export default BullBearCard;
