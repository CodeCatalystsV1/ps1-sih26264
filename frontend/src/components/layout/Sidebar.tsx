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

  interface NavItemDef {
    to: string;
    label: string;
    icon: any;
    show: boolean;
    badge?: string | number;
    badgeStyle?: string;
  }

  interface NavSection {
    category: string;
    items: NavItemDef[];
  }

  const sections: NavSection[] = [
    {
      category: 'CORE MONITORING',
      items: [
        {
          to: '/',
          label: 'Executive Dashboard',
          icon: LayoutDashboard,
          show: !isCitizenOnly,
        },
        {
          to: '/institutions',
          label: 'Institutions Registry',
          icon: Building,
          show: !isCitizenOnly,
          badge: metrics?.institutions_with_active_cases,
          badgeStyle: 'bg-slate-700/80 text-slate-200 border border-slate-600',
        },
      ],
    },
    {
      category: 'GRIEVANCE & CASE MANAGEMENT',
      items: [
        {
          to: '/complaints',
          label: isCitizenOnly ? 'My Grievances' : 'Complaints & Inquiries',
          icon: FileText,
          show: true,
          badge: metrics?.total_complaints,
          badgeStyle: 'bg-blue-900/80 text-blue-200 border border-blue-700',
        },
        {
          to: '/cases',
          label: 'Official Grievance Cases',
          icon: Briefcase,
          show: !isCitizenOnly,
          badge: metrics?.pending_cases ? `${metrics.pending_cases} Active` : undefined,
          badgeStyle: 'bg-slate-700/80 text-amber-300 border border-amber-600/30',
        },
        {
          to: '/coordination',
          label: 'Cross-Bureau Coordination',
          icon: GitCompare,
          show: !isCitizenOnly,
          badge: metrics?.potential_overlaps ? `${metrics.potential_overlaps} Overlap` : undefined,
          badgeStyle: 'bg-red-950 text-red-200 border border-red-500/50 font-bold',
        },
      ],
    },
    {
      category: 'STATUTORY OVERSIGHT',
      items: [
        {
          to: '/deadlines',
          label: 'Alerts & SLA Deadlines',
          icon: AlertTriangle,
          show: !isCitizenOnly,
          badge: metrics?.overdue_cases ? `${metrics.overdue_cases} Due` : undefined,
          badgeStyle: 'bg-amber-950 text-amber-200 border border-amber-500/40 font-semibold',
        },
        {
          to: '/reports',
          label: 'Reports & Analytics',
          icon: BarChart3,
          show: !isCitizenOnly,
        },
      ],
    },
    {
      category: 'SYSTEM ADMINISTRATION',
      items: [
        {
          to: '/audit',
          label: 'Security & Audit Trail',
          icon: History,
          show: isAdmin || hasRole(['ROLE_MANAGEMENT']),
        },
        {
          to: '/admin',
          label: 'Access Control & Users',
          icon: Users,
          show: isAdmin,
        },
      ],
    },
  ];

  return (
    <aside className="w-72 bg-gov-dark text-slate-300 flex flex-col shrink-0 border-r border-slate-700/80 select-none">
      {/* Sidebar Header */}
      <div className="px-4 py-3.5 border-b border-slate-800 bg-[#0c2033] flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
          Administrative Workspace
        </span>
        <span className="text-[10px] text-slate-400 font-mono">v2.4</span>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
        {sections.map((section, idx) => {
          const visibleItems = section.items.filter((item) => item.show);
          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className="space-y-1">
              <div className="px-3 pt-1 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {section.category}
              </div>

              {visibleItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-[#1b3f68] text-white border-l-4 border-amber-400 shadow-sm font-semibold'
                          : 'hover:bg-slate-800 hover:text-white text-slate-300'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className="w-4 h-4 shrink-0 text-slate-400" />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge !== undefined && item.badge !== null && item.badge !== 0 && (
                      <span
                        className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-mono tracking-tight shrink-0 ${
                          item.badgeStyle || 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Bureau Info & Session Protocol Box */}
      <div className="p-3.5 bg-[#0b1d30] border-t border-slate-800 text-[11px] text-slate-400 space-y-1.5 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Bureau Jurisdiction:</span>
          <span className="font-semibold text-slate-200">
            {user?.bureau_assignments?.[0]?.bureau?.code || 'Central'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Security Protocol:</span>
          <span className="text-emerald-400 flex items-center gap-1 font-mono text-[10px]">
            <ShieldCheck className="w-3.5 h-3.5" /> RBAC Enforced
          </span>
        </div>
      </div>
    </aside>
  );
};

