'use client';

import React, { useEffect, useState } from 'react';
import { Download, Filter, ArrowUpRight, CheckCircle2, ChevronLeft, ChevronRight, Sparkles, Loader2 } from 'lucide-react';

interface HistoryItem {
  ticker: string;
  resolvedName: string;
  recommendation: string;
  confidenceScore: number;
  timestamp: string;
  sector: string;
}

interface HistoryTabProps {
  onViewReport: (ticker: string) => void;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ onViewReport }) => {
  const [historyData, setHistoryData] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const res = await fetch(`${apiUrl}/api/research/history`);
        if (res.ok) {
          const result = await res.json();
          if (result.success && Array.isArray(result.data)) {
            setHistoryData(result.data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }) + ', ' + date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return dateStr;
    }
  };

  const getDecisionBadge = (rec: string) => {
    const isInvest = rec.toUpperCase() === 'BUY' || rec.toUpperCase() === 'INVEST';
    const label = isInvest ? 'INVEST' : 'PASS';
    const colorClass = isInvest 
      ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
      : 'text-rose-700 bg-rose-50 border-rose-200';
    return (
      <span className={`inline-block font-mono text-[10px] font-bold px-3 py-1 rounded-full border tracking-wide uppercase ${colorClass}`}>
        {label}
      </span>
    );
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = historyData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(historyData.length / itemsPerPage);

  const stats = [
    { label: 'TOTAL RUNS', value: '1,284', subtext: '+12% this month', isGreen: true },
    { label: 'INVEST SIGNALS', value: '142', subtext: '11% Conviction Rate', isGreen: false },
    { label: 'AVG CONFIDENCE', value: '84.2%', subtext: 'Institutional Grade', isGreen: false },
    { label: 'SUCCESS RATE', value: '68.5%', subtext: 'Target Met', isCheck: true },
  ];

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto p-1 animate-fade-in">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Research History</h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">Review and manage your institutional-grade AI analysis runs.</p>
        </div>
        
        <div className="flex items-center space-x-2 font-mono text-xs">
          <button className="flex items-center space-x-1.5 bg-white border border-gray-200 hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-lg transition-colors cursor-pointer font-bold shadow-sm">
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button className="flex items-center space-x-1.5 bg-white border border-gray-200 hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-lg transition-colors cursor-pointer font-bold shadow-sm">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter</span>
          </button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 space-y-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">{stat.label}</span>
            <p className="text-2xl font-black text-slate-900 font-mono tracking-tight">{stat.value}</p>
            <div className="flex items-center gap-1 pt-1.5">
              {stat.isCheck ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : stat.isGreen ? (
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              ) : null}
              <span className={`text-[10px] font-mono font-semibold ${
                stat.isGreen || stat.isCheck ? 'text-emerald-600' : 'text-slate-400'
              }`}>
                {stat.subtext}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Table Container */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <span className="text-xs font-mono text-slate-400">Loading audit history...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-slate-50/50 font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-6">Company / Entity</th>
                  <th className="py-3 px-6">Date Analyzed</th>
                  <th className="py-3 px-6">AI Decision</th>
                  <th className="py-3 px-6">Confidence</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm font-medium">
                {currentItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                    <td className="py-4.5 px-6">
                      <p className="text-slate-900 font-bold tracking-tight">{item.resolvedName}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide font-semibold font-mono">
                        {item.sector}
                      </p>
                    </td>
                    <td className="py-4.5 px-6 font-mono text-xs text-slate-500">
                      {formatDate(item.timestamp)}
                    </td>
                    <td className="py-4.5 px-6">
                      {getDecisionBadge(item.recommendation)}
                    </td>
                    <td className="py-4.5 px-6 font-mono text-slate-700">
                      {item.confidenceScore.toFixed(1)}%
                    </td>
                    <td className="py-4.5 px-6 text-right">
                      <button
                        onClick={() => onViewReport(item.ticker)}
                        className="bg-slate-950 hover:bg-slate-900 text-white font-mono text-[10px] font-bold py-2 px-4 rounded-lg transition-colors cursor-pointer border border-transparent shadow-sm"
                      >
                        View Full Report
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination Footer */}
            <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
              <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase">
                Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, historyData.length)} of {historyData.length} entries
              </span>
              <div className="flex items-center space-x-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="p-1.5 rounded border border-gray-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`h-7 w-7 rounded border font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                      currentPage === page
                        ? 'bg-slate-950 text-white border-slate-950'
                        : 'bg-white text-slate-600 border-gray-200 hover:bg-slate-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="p-1.5 rounded border border-gray-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Market Shift Insight Panel */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 space-y-4">
        <div className="flex items-center space-x-2.5">
          <Sparkles className="w-4 h-4 text-slate-900" />
          <h4 className="text-sm font-bold text-slate-900 tracking-tight">Recent AI Insight: Market Shift Detected</h4>
        </div>
        <div className="space-y-3 text-slate-600 text-sm leading-relaxed font-medium">
          <p>
            Our cross-industry analysis has identified a significant pivot in <strong className="text-slate-900">Semiconductor supply chain resilience</strong>. The last 5 research runs indicate a 14% increase in institutional capital allocation toward specialty silicon fabrication.
          </p>
          <p>
            The reasoning engine highlights that current valuation gaps in Mid-Cap tech are narrowing faster than projected by traditional consensus models. Our &quot;Invest&quot; recommendation for NVIDIA (94.2% confidence) was primarily driven by an unmodeled surge in data-center demand from emerging Sovereign AI initiatives.
          </p>
        </div>
        
        <div className="flex gap-2 font-mono text-[9px] font-bold uppercase tracking-wider pt-1">
          <span className="bg-slate-100 text-slate-600 border border-gray-200 px-2.5 py-1 rounded">Data Verified</span>
          <span className="bg-slate-100 text-slate-600 border border-gray-200 px-2.5 py-1 rounded">12ms Latency</span>
        </div>
      </div>
    </div>
  );
};
export default HistoryTab;
