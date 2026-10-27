import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Shield } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-gov-bg">
      <Header onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Sidebar Backdrop */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar Component */}
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-gov-bg min-w-0">
          <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Official AICTE Portal Footer */}
      <footer className="bg-[#0F172A] text-slate-300 border-t border-slate-800 py-3.5 px-4 sm:px-8 text-xs shrink-0 select-none">
        <div className="w-full max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
          <div className="flex items-center gap-2.5 flex-wrap justify-center md:justify-start">
            <span className="font-semibold text-white tracking-wide">
              All India Council for Technical Education (AICTE)
            </span>
            <span className="text-slate-600 hidden sm:inline">&bull;</span>
            <span className="text-slate-300 font-medium">
              Ministry of Education, Government of India
            </span>
            <span className="text-slate-600 hidden sm:inline">&bull;</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] bg-blue-950/80 text-blue-200 border border-blue-800/60 font-mono">
              AICTE Case360+ Platform
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400 flex-wrap justify-center md:justify-end">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Shield className="w-3.5 h-3.5 text-royal-light" />
              <span>Official Regulatory Workspace</span>
            </span>
            <span className="text-slate-700 hidden sm:inline">|</span>
            <span className="text-slate-400 font-mono">v3.0-ROYAL</span>
            <span className="text-slate-700 hidden sm:inline">|</span>
            <span className="text-slate-400">Production Evaluation Build</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
