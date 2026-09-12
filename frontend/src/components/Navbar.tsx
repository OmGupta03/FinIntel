'use client';

import React, { useState } from 'react';
import { Bell, Settings, Search } from 'lucide-react';

interface NavbarProps {
  onSearch: (companyName: string) => void;
  activeTab: 'research' | 'screener' | 'history' | 'watchlist' | 'settings';
  setActiveTab: (tab: 'research' | 'screener' | 'history' | 'watchlist' | 'settings') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onSearch, activeTab, setActiveTab }) => {
  const [tickerQuery, setTickerQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tickerQuery.trim()) {
      onSearch(tickerQuery.trim());
      setTickerQuery('');
    }
  };

  return (
    <header className="h-[65px] border-b border-gray-200 bg-white sticky top-0 z-50 px-6 flex items-center justify-between">
      {/* Brand & Tabs */}
      <div className="flex items-center space-x-10">
        <h1 
          onClick={() => setActiveTab('research')}
          className="text-lg font-black tracking-tight text-slate-900 uppercase cursor-pointer select-none font-mono"
        >
          AlphaInsight <span className="text-blue-600">AI</span>
        </h1>

        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('research')}
            className={`text-sm font-semibold py-5 cursor-pointer relative ${
              activeTab === 'research'
                ? 'text-slate-900 border-b-2 border-slate-900'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Terminal
          </button>
          <button
            onClick={() => setActiveTab('screener')}
            className={`text-sm font-semibold py-5 cursor-pointer relative flex items-center space-x-1.5 ${
              activeTab === 'screener'
                ? 'text-purple-600 border-b-2 border-purple-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>AI Screener</span>
            <span className="bg-purple-100 text-purple-700 text-[9px] font-mono px-1.5 py-0.2 rounded font-extrabold uppercase">New</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`text-sm font-semibold py-5 cursor-pointer relative ${
              activeTab === 'history'
                ? 'text-slate-900 border-b-2 border-slate-900'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            History
          </button>
          <button
            onClick={() => setActiveTab('watchlist')}
            className={`text-sm font-semibold py-5 cursor-pointer relative ${
              activeTab === 'watchlist'
                ? 'text-slate-900 border-b-2 border-slate-900'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Watchlist
          </button>
        </nav>
      </div>

      {/* Global Controls & Avatar */}
      <div className="flex items-center space-x-4">
        {/* Ticker Search (Visible only when not on splash screen) */}
        <form onSubmit={handleSubmit} className="relative flex items-center w-56">
          <input
            type="text"
            value={tickerQuery}
            onChange={(e) => setTickerQuery(e.target.value)}
            placeholder="Search ticker..."
            className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-gray-200 focus:border-blue-500 focus:outline-none rounded-lg py-1.5 pl-8 pr-3 text-xs font-mono transition-all"
          />
          <Search className="absolute left-2.5 w-3.5 h-3.5 text-gray-400" />
        </form>

        {/* Notifications Bell */}
        <button className="text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
          <Bell className="w-4 h-4" />
        </button>

        {/* Settings Shortcut */}
        <button
          onClick={() => setActiveTab('settings')}
          className="text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* User Profile Avatar */}
        <div className="h-8 w-8 rounded-full bg-slate-200 overflow-hidden border border-gray-200 cursor-pointer shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=150&auto=format&fit=crop"
            alt="User profile"
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    </header>
  );
};
export default Navbar;
