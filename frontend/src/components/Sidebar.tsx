'use client';

import React from 'react';
import { Search, History, Star, Settings, HelpCircle, Code, Plus, Sparkles } from 'lucide-react';

interface SidebarProps {
  activeTab: 'research' | 'screener' | 'history' | 'watchlist' | 'settings';
  setActiveTab: (tab: 'research' | 'screener' | 'history' | 'watchlist' | 'settings') => void;
  onNewAnalysis: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onNewAnalysis,
}) => {
  const menuItems = [
    { id: 'research' as const, label: 'Research Terminal', icon: <Search className="w-4 h-4" /> },
    { id: 'screener' as const, label: 'AI Stock Screener', icon: <Sparkles className="w-4 h-4 text-purple-600" /> },
    { id: 'history' as const, label: 'Research History', icon: <History className="w-4 h-4" /> },
    { id: 'watchlist' as const, label: 'Watchlist', icon: <Star className="w-4 h-4" /> },
    { id: 'settings' as const, label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-64 border-r border-gray-200 bg-slate-50/50 flex flex-col justify-between h-[calc(100vh-65px)] sticky top-[65px] p-5">
      <div className="space-y-6">
        {/* Terminal Header */}
        <div className="flex items-center space-x-3 bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm">
          <div className="bg-slate-950 p-2 rounded-lg flex items-center justify-center text-white font-mono font-bold shrink-0">
            AI
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 leading-tight">Research Terminal</h3>
            <p className="text-[9px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Institutional Grade</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 cursor-pointer ${
                activeTab === item.id
                  ? 'bg-blue-50 text-blue-600 border-l-2 border-blue-600'
                  : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="space-y-4">
        {/* + New Analysis button */}
        <button
          onClick={onNewAnalysis}
          className="w-full flex items-center justify-center space-x-1.5 bg-slate-950 hover:bg-slate-900 text-white font-mono font-bold text-xs py-3 px-4 rounded-lg transition-colors cursor-pointer border border-transparent shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Analysis</span>
        </button>

        {/* Bottom Utility Items */}
        <div className="border-t border-gray-200 pt-3 space-y-1.5 font-mono text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          <a
            href="#"
            className="flex items-center space-x-2.5 px-3 py-1.5 rounded-md hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Support</span>
          </a>
          <a
            href="#"
            className="flex items-center space-x-2.5 px-3 py-1.5 rounded-md hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <Code className="w-3.5 h-3.5" />
            <span>API Docs</span>
          </a>
        </div>
      </div>
    </aside>
  );
};
export default Sidebar;
