import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Crosshair,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Zap,
} from 'lucide-react';
import BloomButton from './BloomButton.jsx';

export default function Sidebar({ currentUser, onLogout }) {
  const [collapsed, setCollapsed] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );
  const location = useLocation();

  const isItemActive = (to) => {
    if (to === '/overview' || to === '/dashboard') {
      return location.pathname === '/overview' || location.pathname === '/dashboard' || location.pathname === '/';
    }
    if (to.startsWith('/analysis')) {
      return location.pathname.startsWith('/analysis');
    }
    return location.pathname.startsWith(to);
  };

  const navItems = [
    {
      to: '/overview',
      label: 'Overview',
      icon: LayoutDashboard,
    },
    {
      to: '/tasks',
      label: 'Task Queue',
      icon: ClipboardList,
    },
    {
      to: '/employees',
      label: 'Employee Roster',
      icon: Users,
    },
    {
      to: '/analysis/1',
      label: 'Churn Analysis',
      icon: Crosshair,
    },
  ];

  return (
    <aside
      id="enterprise-sidebar"
      className={`relative z-30 flex flex-col bg-zinc-950/90 backdrop-blur-md text-zinc-300 border-r border-zinc-800/90 transition-all duration-300 ease-in-out select-none flex-shrink-0 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 border-b border-zinc-800/90 flex items-center justify-between px-4 bg-zinc-950/95">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-9 h-9 bg-white text-zinc-950 rounded-lg flex items-center justify-center font-bold shadow-sm flex-shrink-0">
            <Zap className="w-5 h-5 fill-zinc-950 text-zinc-950" />
          </div>
          {!collapsed && (
            <div className="truncate">
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-sm tracking-tight text-white leading-none">
                  ChurnGuard
                </span>
                <span className="text-[10px] px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono rounded">
                  SaaS
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 tracking-normal mt-0.5 font-normal">
                Monochrome Enterprise
              </p>
            </div>
          )}
        </div>

        {/* Toggle Collapse Button with Bloom Effect */}
        <motion.button
          id="btn-toggle-sidebar"
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          whileTap={{ scale: 0.95, boxShadow: '0px 0px 20px 4px rgba(255, 255, 255, 0.4)' }}
          whileHover={{ scale: 1.05 }}
          className="p-1.5 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-md transition-colors cursor-pointer"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </motion.button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-5 px-3 space-y-1.5 overflow-y-auto">
        <div className="px-2 mb-2">
          {!collapsed ? (
            <span className="text-[10px] uppercase font-semibold tracking-wider text-zinc-500">
              Workspace Views
            </span>
          ) : (
            <div className="h-[1px] bg-zinc-800 my-1" />
          )}
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              data-bloom="secondary"
              className={`group flex items-center space-x-3 px-3 py-2.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                active
                  ? 'bg-white text-zinc-950 font-semibold shadow-sm border border-white/90'
                  : 'text-zinc-300 hover:text-white hover:bg-zinc-900/80 border border-transparent'
              } ${collapsed ? 'justify-center px-0' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={`w-4 h-4 flex-shrink-0 transition-colors ${
                  active ? 'text-zinc-950' : 'text-zinc-400 group-hover:text-zinc-100'
                }`}
              />
              {!collapsed && (
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors ${
                        active
                          ? 'bg-zinc-900 text-zinc-100'
                          : 'bg-zinc-900 border border-zinc-800 text-zinc-300 group-hover:text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Sidebar Footer: User Profile & Logout */}
      <div className="p-3 border-t border-zinc-800/90 bg-zinc-950/95 space-y-2">
        <div
          className={`flex items-center space-x-2.5 p-2 bg-zinc-900/70 border border-zinc-800/80 rounded-lg ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <div className="w-7 h-7 bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 overflow-hidden">
            {currentUser?.avatar_url ? (
              <img src={currentUser.avatar_url} alt={currentUser.name} className="w-full h-full object-cover" />
            ) : (
              currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'A'
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1 text-left">
              <div className="text-xs font-semibold text-zinc-100 truncate leading-tight">
                {currentUser?.name || 'Enterprise Analyst'}
              </div>
              <div className="text-[11px] text-zinc-400 truncate leading-tight font-normal">
                {currentUser?.email || 'demo.analyst@company.com'}
              </div>
            </div>
          )}
        </div>

        <BloomButton
          id="btn-sidebar-logout"
          variant="secondary"
          onClick={onLogout}
          className={`w-full py-2 px-2.5 text-xs font-medium rounded-lg flex items-center justify-center space-x-2 ${
            collapsed ? 'px-0' : ''
          }`}
          title="Sign Out"
        >
          <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </BloomButton>
      </div>
    </aside>
  );
}
