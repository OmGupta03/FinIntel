'use client';

import React, { useState } from 'react';
import { Key, ShieldCheck, Bell, Sliders, Sparkles, Check, Copy, Eye, EyeOff } from 'lucide-react';

export const SettingsTab: React.FC = () => {
  const [name, setName] = useState('Jonathan Vance');
  const [email, setEmail] = useState('vance.j@alpha-insight.ai');
  const [engine, setEngine] = useState('Insight-4-Institutional (Advanced Reasoning)');
  const [risk, setRisk] = useState('75');
  const [xai, setXai] = useState(true);
  const apiKey = 'pk_live_89x_AI_9921_insight';
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [geminiKey, setGeminiKey] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('geminiApiKey') || '' : ''));
  const [tavilyKey, setTavilyKey] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('tavilyApiKey') || '' : ''));
  const [growwKey, setGrowwKey] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('growwApiKey') || '' : ''));
  const [showGemini, setShowGemini] = useState(false);
  const [showTavily, setShowTavily] = useState(false);
  const [showGroww, setShowGroww] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('geminiApiKey', geminiKey);
      localStorage.setItem('tavilyApiKey', tavilyKey);
      localStorage.setItem('growwApiKey', growwKey);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const getRiskLabel = (val: string) => {
    const num = parseInt(val, 10);
    if (num < 25) return 'CONSERVATIVE';
    if (num < 50) return 'MODERATE';
    if (num < 75) return 'MID-HIGH';
    return 'AGGRESSIVE';
  };

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto p-1 animate-fade-in pb-10">
      {/* Title Header */}
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">System Settings</h2>
        <p className="text-xs text-slate-500 mt-1 font-medium">Manage your institutional identity, AI model parameters, and connectivity.</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-6 flex flex-col md:flex-row items-center gap-6">
        <div className="relative h-16 w-16 rounded-full overflow-hidden border border-gray-200 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&auto=format&fit=crop"
            alt="Profile avatar"
            className="h-full w-full object-cover"
          />
          <span className="absolute bottom-0 right-0 bg-slate-950 text-white rounded-full p-1 border border-white cursor-pointer hover:bg-slate-900 transition-colors">
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
          </span>
        </div>

        <div className="space-y-1 text-center md:text-left flex-1">
          <h3 className="text-md font-bold text-slate-950 tracking-tight">{name}</h3>
          <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">Senior Portfolio Analyst • Institutional Tier</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full md:w-auto md:max-w-md flex-1">
          <div className="space-y-1 text-left">
            <label className="text-[9px] font-mono text-slate-400 uppercase tracking-wider font-bold">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:outline-none rounded-lg py-1.5 px-3 text-xs font-semibold text-slate-800 transition-colors"
            />
          </div>
          <div className="space-y-1 text-left">
            <label className="text-[9px] font-mono text-slate-400 uppercase tracking-wider font-bold">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:outline-none rounded-lg py-1.5 px-3 text-xs font-semibold text-slate-800 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Research Preferences (Col-span 7) */}
        <div className="lg:col-span-7 bg-white border border-gray-200 shadow-sm rounded-xl p-6 space-y-6">
          <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
            <Sliders className="w-4 h-4 text-slate-900" />
            <h4 className="text-sm font-bold text-slate-900 tracking-tight">Research Preferences</h4>
          </div>

          {/* Engine Dropdown */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-mono text-slate-400 uppercase tracking-wider font-bold">Primary AI Engine</label>
            <select
              value={engine}
              onChange={(e) => setEngine(e.target.value)}
              className="w-full bg-slate-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:outline-none rounded-lg py-2 px-3 text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
            >
              <option>Insight-4-Institutional (Advanced Reasoning)</option>
              <option>Gemini-1.5-Pro-Expert</option>
              <option>GPT-4o-WallStreet-Analyst</option>
            </select>
            <p className="text-[10px] text-slate-400 font-medium">Advanced Reasoning provides the deepest analysis of quarterly reports and macroeconomic trends.</p>
          </div>

          {/* Risk tolerance slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-[9px] font-mono text-slate-400 uppercase tracking-wider font-bold">Risk Tolerance Threshold</label>
              <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                {getRiskLabel(risk)}
              </span>
            </div>
            
            <input
              type="range"
              min="0"
              max="100"
              value={risk}
              onChange={(e) => setRisk(e.target.value)}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
            />
            
            <div className="flex justify-between font-mono text-[9px] text-slate-400 font-bold uppercase tracking-wide">
              <span>Conservative</span>
              <span>Aggressive</span>
            </div>
          </div>

          {/* Explainable AI toggle */}
          <div className="flex items-center justify-between bg-slate-50/50 p-4 border border-gray-200/50 rounded-xl">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-900">Explainable AI (XAI)</span>
              <p className="text-[10px] text-slate-500 font-medium">Force step-by-step reasoning for all predictions.</p>
            </div>
            
            <button
              onClick={() => setXai(!xai)}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-250 cursor-pointer ${
                xai ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <div 
                className={`h-4 w-4 bg-white rounded-full shadow-sm transform transition-transform duration-250 ${
                  xai ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* API Management (Col-span 5) */}
        <div className="lg:col-span-5 bg-white border border-gray-200 shadow-sm rounded-xl p-6 space-y-5">
          <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
            <Key className="w-4 h-4 text-slate-900" />
            <h4 className="text-sm font-bold text-slate-900 tracking-tight">API Management</h4>
          </div>

          {/* Key Box */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[9px] font-mono text-slate-400 uppercase tracking-wider font-bold">Production Key</label>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[8px] font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                Active
              </span>
            </div>
            
            <div className="relative flex items-center">
              <input
                type="text"
                readOnly
                value={apiKey}
                className="w-full bg-slate-50 border border-gray-200 rounded-lg py-2 pl-3 pr-20 text-xs font-mono text-slate-600 font-medium select-all"
              />
              <button
                onClick={handleCopy}
                className="absolute right-2 text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-200/50 transition-colors cursor-pointer"
                title="Copy API Key"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Gemini API Key Box */}
          <div className="space-y-1.5 border-t border-gray-100 pt-4">
            <div className="flex justify-between items-center">
              <label className="text-[9px] font-mono text-slate-400 uppercase tracking-wider font-bold">Gemini API Key</label>
              {geminiKey ? (
                <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[8px] font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                  Configured
                </span>
              ) : (
                <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[8px] font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                  Simulation Fallback
                </span>
              )}
            </div>
            
            <div className="relative flex items-center">
              <input
                type={showGemini ? "text" : "password"}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="Enter Gemini API key (gemini-1.5-flash)..."
                className="w-full bg-slate-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:outline-none rounded-lg py-2 pl-3 pr-10 text-xs font-mono text-slate-650 font-medium"
              />
              <button
                type="button"
                onClick={() => setShowGemini(!showGemini)}
                className="absolute right-2 text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-200/50 transition-colors cursor-pointer flex items-center justify-center"
                title={showGemini ? "Hide Key" : "Show Key"}
              >
                {showGemini ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Tavily API Key Box */}
          <div className="space-y-1.5 border-t border-gray-100 pt-4">
            <div className="flex justify-between items-center">
              <label className="text-[9px] font-mono text-slate-400 uppercase tracking-wider font-bold">Tavily API Key</label>
              {tavilyKey ? (
                <span className="bg-purple-50 text-purple-700 border border-purple-100 text-[8px] font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                  Configured
                </span>
              ) : (
                <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[8px] font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                  Yahoo Finance Fallback
                </span>
              )}
            </div>
            
            <div className="relative flex items-center">
              <input
                type={showTavily ? "text" : "password"}
                value={tavilyKey}
                onChange={(e) => setTavilyKey(e.target.value)}
                placeholder="Enter Tavily API key for live search..."
                className="w-full bg-slate-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:outline-none rounded-lg py-2 pl-3 pr-10 text-xs font-mono text-slate-650 font-medium"
              />
              <button
                type="button"
                onClick={() => setShowTavily(!showTavily)}
                className="absolute right-2 text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-200/50 transition-colors cursor-pointer flex items-center justify-center"
                title={showTavily ? "Hide Key" : "Show Key"}
              >
                {showTavily ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Groww API Key Box (Live Broker Feed) */}
          <div className="space-y-1.5 border-t border-gray-100 pt-4">
            <div className="flex justify-between items-center">
              <div>
                <label className="text-[9px] font-mono text-slate-400 uppercase tracking-wider font-bold">Groww API Key</label>
                <span className="text-[9px] text-slate-400 ml-1.5">(Indian Broker Feed)</span>
              </div>
              {growwKey ? (
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[8px] font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                  Live Feed Active
                </span>
              ) : (
                <span className="bg-slate-100 text-slate-600 border border-gray-200 text-[8px] font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                  NSE Realtime Feed
                </span>
              )}
            </div>
            
            <div className="relative flex items-center">
              <input
                type={showGroww ? "text" : "password"}
                value={growwKey}
                onChange={(e) => setGrowwKey(e.target.value)}
                placeholder="Enter Groww API token / key (Bearer token)..."
                className="w-full bg-slate-50 border border-gray-200 focus:bg-white focus:border-blue-500 focus:outline-none rounded-lg py-2 pl-3 pr-10 text-xs font-mono text-slate-650 font-medium"
              />
              <button
                type="button"
                onClick={() => setShowGroww(!showGroww)}
                className="absolute right-2 text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-200/50 transition-colors cursor-pointer flex items-center justify-center"
                title={showGroww ? "Hide Key" : "Show Key"}
              >
                {showGroww ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 font-medium pt-0.5">
              Connects directly to Groww Trading API for real-time NSE/BSE tick updates and live quotes.
            </p>
          </div>

          {/* Usage Meter */}
          <div className="space-y-2 border-t border-gray-100 pt-4">
            <div className="flex justify-between items-baseline font-mono text-[9px] font-bold uppercase tracking-wider">
              <span className="text-slate-400">Monthly Usage</span>
              <span className="text-slate-900">72%</span>
            </div>
            
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-gray-200/50">
              <div className="bg-slate-900 h-full w-[72%]" />
            </div>
            
            <p className="text-[10px] text-slate-400 font-mono tracking-tight text-right">
              8,640 / 12,000 Analysis Queries used.
            </p>
          </div>

          <button className="w-full bg-white border border-gray-200 hover:bg-slate-50 text-slate-750 font-mono text-[10px] font-bold py-2.5 px-4 rounded-lg transition-colors cursor-pointer shadow-sm">
            Generate New Key
          </button>
        </div>
      </div>

      {/* Bottom Status Blocks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Security Box */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 flex items-center space-x-4">
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 p-2.5 rounded-lg">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h5 className="text-xs font-extrabold text-slate-900 uppercase font-mono">Two-Factor Auth</h5>
              <span className="text-[8px] font-mono bg-emerald-50 text-emerald-700 font-bold px-1 rounded uppercase">Secure</span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-0.5">
              Enhanced protection for sensitive market research.
            </p>
          </div>
        </div>

        {/* Alerts Box */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 flex items-center space-x-4">
          <div className="bg-blue-50 border border-blue-100 text-blue-600 p-2.5 rounded-lg">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h5 className="text-xs font-extrabold text-slate-900 uppercase font-mono">Market Alerts</h5>
              <span className="text-[8px] font-mono bg-blue-50 text-blue-700 font-bold px-1 rounded uppercase">Enabled</span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-0.5">
              Real-time AI triggers on volatility shifts.
            </p>
          </div>
        </div>

        {/* Subscription Box */}
        <div className="bg-slate-950 text-white rounded-xl p-5 flex items-center justify-between shadow-sm relative overflow-hidden">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-slate-300" />
              <h5 className="text-xs font-extrabold uppercase font-mono text-slate-200">Insight Pro</h5>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              Active Institutional License.
            </p>
          </div>
          <button className="bg-white/10 hover:bg-white/20 text-white border border-white/10 font-mono text-[9px] font-bold py-1.5 px-3 rounded cursor-pointer transition-colors shrink-0">
            View License
          </button>
        </div>
      </div>

      {/* Save panel */}
      <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-150">
        {saved && <span className="text-xs font-mono text-emerald-600 font-semibold animate-pulse flex items-center gap-1">
          <Check className="w-3.5 h-3.5" />
          <span>All changes saved successfully!</span>
        </span>}
        <button className="text-xs text-slate-400 hover:text-slate-600 font-mono font-bold transition-colors cursor-pointer">
          Discard Changes
        </button>
        <button
          onClick={handleSave}
          className="bg-slate-950 hover:bg-slate-900 text-white font-mono text-[10px] font-bold py-2.5 px-6 rounded-lg transition-colors cursor-pointer border border-transparent shadow-sm"
        >
          Save All Changes
        </button>
      </div>
    </div>
  );
};
export default SettingsTab;
