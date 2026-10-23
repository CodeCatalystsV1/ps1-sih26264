import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gov-bg">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-3 px-6 text-xs text-center flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-300">AICTE ICMS Platform</span>
          <span>— Smart India Hackathon Prototype (Problem Statement PS-264)</span>
        </div>
        <div className="text-[11px] text-slate-400">
          Integrated Institution Complaint Monitoring and Coordination System &bull; Confidential &bull; For Authorized Evaluators Only
        </div>
      </footer>
    </div>
  );
};
