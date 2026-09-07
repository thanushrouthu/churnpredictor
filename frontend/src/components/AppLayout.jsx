import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import DashboardBackground3D from './DashboardBackground3D.jsx';

export default function AppLayout({ currentUser, onLogout }) {
  const location = useLocation();

  const getPageTitle = (path) => {
    if (path.startsWith('/tasks')) return 'Churn Evaluation Tasks';
    if (path.startsWith('/employees')) return 'Enterprise Retention Roster';
    if (path.startsWith('/analysis')) return 'Single Customer Churn Analysis';
    return 'Executive Overview';
  };

  const getPageSubtitle = (path) => {
    if (path.startsWith('/tasks')) return 'Manage high-risk subscribers, assign specialists, and execute proactive interventions.';
    if (path.startsWith('/employees')) return 'Enterprise retention roster with real-time workload distribution and department mapping.';
    if (path.startsWith('/analysis')) return 'Deep-dive inference window with XGBoost probability and local SHAP feature attributions.';
    return 'Portfolio churn health KPIs and cohort retention intelligence.';
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans flex antialiased tracking-tight relative overflow-x-hidden">
      {/* 3D Parallax Data-Mesh Background at z-0 */}
      <DashboardBackground3D />

      {/* Persistent Left-Hand Collapsible Sidebar */}
      <Sidebar currentUser={currentUser} onLogout={onLogout} />

      {/* Main App Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Top Header Bar */}
        <header className="border-b border-zinc-800/80 bg-zinc-950/75 backdrop-blur-md sticky top-0 z-20 h-16 shadow-sm flex items-center justify-between px-6 transition-all">
          <div className="flex items-center space-x-3">
            <div>
              <h1 className="text-base font-bold text-white tracking-tight leading-tight">
                {getPageTitle(location.pathname)}
              </h1>
              <p className="text-xs text-zinc-400 hidden sm:block">
                {getPageSubtitle(location.pathname)}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Monochrome System Status Badge */}
            <span className="inline-flex items-center space-x-1.5 text-xs font-medium px-2.5 py-1 bg-zinc-900/90 border border-zinc-800 text-zinc-200 rounded-full shadow-inner">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
              <span>SYS: ONLINE</span>
            </span>

            {/* Model Architecture Badge */}
            <span className="hidden md:inline-block text-xs font-medium px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-md">
              XGBoost v2.1 &bull; SHAP
            </span>
          </div>
        </header>

        {/* Dynamic Route Content Frame */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-6 lg:p-8 space-y-6">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="border-t border-zinc-800/80 bg-zinc-950/75 backdrop-blur-md py-4 px-6 text-center text-xs text-zinc-500 font-normal">
          <span>ChurnGuard Enterprise SaaS &bull; Ultra-Clean Monochrome Architecture &bull; 50+ Staff Records Linked</span>
        </footer>
      </div>
    </div>
  );
}
