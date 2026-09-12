'use client';

import React, { useEffect, useRef } from 'react';
import { Terminal, Cpu, Database, TrendingUp, AlertTriangle, ShieldCheck } from 'lucide-react';

interface ResearchConsoleProps {
  logs: string[];
  currentStep: string;
  isResearching: boolean;
}

export const ResearchConsole: React.FC<ResearchConsoleProps> = ({
  logs,
  currentStep,
  isResearching,
}) => {
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto scroll terminal to bottom on new logs
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getStepIcon = (step: string) => {
    switch (step) {
      case 'Resolve Ticker':
        return <Cpu className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'Fetch Data':
        return <Database className="w-4 h-4 text-green-400 animate-pulse" />;
      case 'Financial Analysis':
        return <TrendingUp className="w-4 h-4 text-purple-400" />;
      case 'Sentiment Analysis':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'SWOT Analysis':
        return <ShieldCheck className="w-4 h-4 text-teal-400" />;
      default:
        return <Terminal className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="w-full rounded-xl border border-gray-800 bg-[#0b0f19] p-5 shadow-2xl glass-panel">
      {/* Console Header */}
      <div className="flex items-center justify-between border-b border-gray-850 pb-3 mb-4">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-red-500/80 inline-block"></span>
            <span className="w-3.5 h-3.5 rounded-full bg-yellow-500/80 inline-block"></span>
            <span className="w-3.5 h-3.5 rounded-full bg-green-500/80 inline-block"></span>
          </div>
          <span className="text-xs text-gray-400 font-mono pl-3">agent_orch_terminal.sh</span>
        </div>
        
        {isResearching && (
          <div className="flex items-center space-x-2 bg-blue-950/65 px-3 py-1 rounded-full border border-blue-900/50">
            {getStepIcon(currentStep)}
            <span className="text-[10px] text-blue-300 font-mono tracking-wider uppercase font-semibold">
              Node: {currentStep || 'Initializing'}
            </span>
          </div>
        )}
      </div>

      {/* Terminal Screen */}
      <div className="h-64 overflow-y-auto font-mono text-[13px] text-gray-300 space-y-1.5 pr-2">
        {logs.length === 0 ? (
          <div className="text-gray-500 italic flex items-center justify-center h-full">
            Ready to initialize investment research pipeline...
          </div>
        ) : (
          logs.map((log, index) => {
            let colorClass = 'text-gray-300';
            if (log.startsWith('[ERROR]')) {
              colorClass = 'text-red-400 font-bold';
            } else if (log.startsWith('[WARNING]')) {
              colorClass = 'text-yellow-400 font-semibold';
            } else if (log.startsWith('[SYSTEM]') || log.startsWith('[SIMULATION]')) {
              colorClass = 'text-blue-400';
            } else if (log.includes('Successfully') || log.includes('complete') || log.includes('retrieved')) {
              colorClass = 'text-green-400';
            }
            
            return (
              <div key={index} className={`leading-relaxed ${colorClass}`}>
                <span className="text-gray-600 select-none mr-2">$</span>
                {log}
              </div>
            );
          })
        )}
        {isResearching && (
          <div className="flex items-center space-x-1.5 text-blue-400 animate-pulse mt-2">
            <span className="text-gray-600 select-none mr-2">$</span>
            <span>Agent graph transitioning to next node...</span>
            <span className="w-1.5 h-4 bg-blue-400 animate-ping inline-block"></span>
          </div>
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
};
export default ResearchConsole;
