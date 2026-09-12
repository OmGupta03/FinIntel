'use client';

import React from 'react';
import { PlusCircle, MinusCircle, Lightbulb, AlertOctagon, ShieldCheck } from 'lucide-react';

interface SwotGridProps {
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
}

export const SwotGrid: React.FC<SwotGridProps> = ({ swot }) => {
  const categories = [
    {
      title: 'Strengths',
      icon: <PlusCircle className="w-5 h-5 text-emerald-600" />,
      items: swot.strengths || [],
      borderClass: 'border-emerald-200 bg-emerald-50/30',
      badgeClass: 'bg-emerald-100 text-emerald-800',
      desc: 'Internal structural advantages and balance sheet strengths.'
    },
    {
      title: 'Weaknesses',
      icon: <MinusCircle className="w-5 h-5 text-rose-600" />,
      items: swot.weaknesses || [],
      borderClass: 'border-rose-200 bg-rose-50/30',
      badgeClass: 'bg-rose-100 text-rose-800',
      desc: 'Internal vulnerabilities, multiple expansion risks, and friction.'
    },
    {
      title: 'Opportunities',
      icon: <Lightbulb className="w-5 h-5 text-blue-600" />,
      items: swot.opportunities || [],
      borderClass: 'border-blue-200 bg-blue-50/30',
      badgeClass: 'bg-blue-100 text-blue-800',
      desc: 'Secular growth tailwinds, market expansion, and AI adoption.'
    },
    {
      title: 'Threats',
      icon: <AlertOctagon className="w-5 h-5 text-amber-600" />,
      items: swot.threats || [],
      borderClass: 'border-amber-200 bg-amber-50/30',
      badgeClass: 'bg-amber-100 text-amber-800',
      desc: 'Macro headwinds, regulatory antitrust scrutiny, and competition.'
    }
  ];

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
        <ShieldCheck className="w-4 h-4 text-slate-700" />
        <h3 className="text-sm font-bold text-slate-900 font-mono tracking-tight uppercase">
          SWOT Strategic Assessment Matrix
        </h3>
        <span className="text-[10px] text-slate-400 font-mono font-medium">
          • Synthesized from balance sheets, news catalysts, and risk factors
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((cat, idx) => (
          <div
            key={idx}
            className={`rounded-xl border p-5 shadow-sm flex flex-col bg-white ${cat.borderClass}`}
          >
            <div className="flex items-center space-x-2 border-b border-gray-200/60 pb-3 mb-2">
              {cat.icon}
              <span className="font-extrabold text-slate-900 text-sm tracking-wide font-mono uppercase">
                {cat.title}
              </span>
              <span className="text-[10px] font-mono text-slate-400 ml-auto font-bold">
                {cat.items.length} Points
              </span>
            </div>

            <p className="text-[11px] text-slate-500 italic mb-4 font-sans leading-snug">
              {cat.desc}
            </p>

            <ul className="space-y-3 flex-1">
              {cat.items.length === 0 ? (
                <li className="text-xs text-slate-400 italic">No specific factors identified.</li>
              ) : (
                cat.items.map((item, itemIdx) => {
                  const parts = item.split(':');
                  const heading = parts[0];
                  const detail = parts.slice(1).join(':');
                  return (
                    <li key={itemIdx} className="flex items-start space-x-2.5 text-xs text-slate-700 leading-relaxed">
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold shrink-0 mt-0.5 ${cat.badgeClass}`}>
                        {cat.title[0]}-{itemIdx + 1}
                      </span>
                      <span>
                        <strong className="text-slate-900 font-bold">{heading}</strong>
                        {detail ? `: ${detail}` : ''}
                      </span>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SwotGrid;
