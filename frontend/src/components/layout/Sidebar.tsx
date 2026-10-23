import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Building,
  FileText,
  Briefcase,
  GitCompare,
  AlertTriangle,
  BarChart3,
  History,
  ShieldCheck,
  Users,
  Settings,
} from 'lucide-react';
import { apiRequest } from '../../api/client';
import { DashboardMetrics } from '../../types';

export const Sidebar: React.FC = () => {
  const { user, hasRole, isAdmin } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

  useEffect(() => {
    async function fetchBadge() {
      try {
        const data = await apiRequest<DashboardMetrics>('/reports/dashboard');
        setMetrics(data);
      } catch {
        // ignore
      }
    }
    fetchBadge();
  }, []);

  const isCitizenOnly = user?.roles?.length === 1 && user.roles[0].code === 'ROLE_COMPLAINANT';

  const navItems = [
    {
      to: '/',
      label: 'Overview Dashboard',
      icon: LayoutDashboard,
      show: !isCitizenOnly,
    },
    {
      to: '/institutions',
      label: 'Institutions Registry',
      icon: Building,
      show: !isCitizenOnly,
      badge: metrics?.institutions_with_active_cases,
      badgeColor: 'bg-slate-700 text-slate-200',
    },
    {
      to: '/complaints',
      label: isCitizenOnly ? 'My Grievances' : 'Complaints',
      icon: FileText,
      show: true,
      badge: metrics?.total_complaints,
      badgeColor: 'bg-blue-900 text-blue-200',
    },
    {
      to: '/cases',
      label: 'Official Cases',
      icon: Briefcase,
      show: !isCitizenOnly,
      badge: metrics?.pending_cases ? `${metrics.pending_cases} P` : undefined,
      badgeColor: 'bg-amber-900 text-amber-200',
    },
    {
      to: '/coordination',
      label: 'Cross-Bureau Coordination',
      icon: GitCompare,
      show: !isCitizenOnly,
      badge: metrics?.potential_overlaps ? `${metrics.potential_overlaps} Overlap` : undefined,
      badgeColor: 'bg-red-900 text-red-200 animate-pulse font-bold',
    },
    {
      to: '/deadlines',
      label: 'Alerts & Deadlines',
      icon: AlertTriangle,
      show: !isCitizenOnly,
      badge: metrics?.overdue_cases ? `${metrics.overdue_cases} Due` : undefined,
      badgeColor: 'bg-amber-800 text-amber-100',
    },
    {
      to: '/reports',
      label: 'Reports & Analytics',
      icon: BarChart3,
      show: !isCitizenOnly,
    },
    {
      to: '/audit',
      label: 'System Audit Trail',
      icon: History,
      show: isAdmin || hasRole(['ROLE_MANAGEMENT']),
    },
    {
      to: '/admin',
      label: 'Administration & Users',
      icon: Users,
      show: isAdmin,
    },
  ];

  return (
    <aside className="w-64 bg-gov-dark text-slate-300 flex flex-col shrink-0 border-r border-slate-700 select-none">
      <div className="p-4 border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-400">
        Administrative Navigation
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems
          .filter((item) => item.show)
          .map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-gov-primary text-white border-l-4 border-amber-400 shadow-sm'
                      : 'hover:bg-slate-800 hover:text-white text-slate-300'
                  }`
                }
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-white" />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-mono tracking-tight shrink-0 ${
                      item.badgeColor || 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
      </nav>

      {/* Bureau Info footer */}
      <div className="p-3.5 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
        <div className="flex items-center justify-between">
          <span>Active Jurisdiction:</span>
          <span className="font-semibold text-slate-200">
            {user?.bureau_assignments?.[0]?.bureau?.code || 'Central Registry'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Security Protocol:</span>
          <span className="text-emerald-400 flex items-center gap-1 font-mono text-[10px]">
            <ShieldCheck className="w-3 h-3" /> RBAC Enforced
          </span>
        </div>
      </div>
    </aside>
  );
};
