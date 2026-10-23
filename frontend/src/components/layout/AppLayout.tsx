import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Shield, ExternalLink } from 'lucide-react';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gov-bg">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-gov-bg">
          <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Official Government Administrative Portal Footer */}
      <footer className="bg-gov-dark text-slate-300 border-t border-slate-700/80 py-3.5 px-4 sm:px-8 text-xs shrink-0 select-none">
        <div className="w-full max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
          <div className="flex items-center gap-2.5 flex-wrap justify-center md:justify-start">
            <span className="font-semibold text-white tracking-wide">
              अखिल भारतीय तकनीकी शिक्षा परिषद (AICTE)
            </span>
            <span className="text-slate-500 hidden sm:inline">&bull;</span>
            <span className="text-slate-300 font-medium">
              Ministry of Education, Government of India
            </span>
            <span className="text-slate-500 hidden sm:inline">&bull;</span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700 font-mono">
              PS-264 Demonstration
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400 flex-wrap justify-center md:justify-end">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Official Administrative Interface</span>
            </span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="text-slate-400 font-mono">v2.4-PROTOTYPE</span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="text-slate-400">Strictly for Evaluation Purposes</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

