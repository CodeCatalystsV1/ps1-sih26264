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
  Users,
  ShieldAlert,
  Sparkles,
  BookOpen,
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
    isComingSoon?: boolean;
  }

  interface NavSection {
    category: string;
    items: NavItemDef[];
  }

  const sections: NavSection[] = [
    {
      category: 'INSTITUTION & WORKSPACE',
      items: [
        {
          to: '/',
          label: 'Overview',
          icon: LayoutDashboard,
          show: !isCitizenOnly,
        },
        {
          to: '/institutions',
          label: 'Institution 360°',
          icon: Building,
          show: !isCitizenOnly,
          badge: metrics?.institutions_with_active_cases,
          badgeStyle: 'bg-slate-700/80 text-slate-200 border border-slate-600',
        },
      ],
    },
    {
      category: 'CASE & COMPLAINT WORKFLOW',
      items: [
        {
          to: '/complaints',
          label: isCitizenOnly ? 'My Grievances' : 'Complaints',
          icon: FileText,
          show: true,
          badge: metrics?.total_complaints,
          badgeStyle: 'bg-blue-900/80 text-blue-200 border border-blue-700',
        },
        {
          to: '/cases',
          label: 'Regulatory Cases',
          icon: Briefcase,
          show: !isCitizenOnly,
          badge: metrics?.pending_cases ? `${metrics.pending_cases} Active` : undefined,
          badgeStyle: 'bg-slate-700/80 text-amber-300 border border-amber-600/30',
        },
        {
          to: '/coordination',
          label: 'Coordination Hub',
          icon: GitCompare,
          show: !isCitizenOnly,
          badge: metrics?.potential_overlaps ? `${metrics.potential_overlaps} Overlap` : undefined,
          badgeStyle: 'bg-red-950 text-red-200 border border-red-500/50 font-bold',
        },
        {
          to: '/action-conflicts',
          label: 'Action Conflict Guard',
          icon: ShieldAlert,
          show: !isCitizenOnly,
          badge: 'Active Guard',
          badgeStyle: 'bg-amber-950 text-amber-200 border border-amber-500/50 font-semibold',
        },
      ],
    },
    {
      category: 'OVERSIGHT & INTELLIGENCE',
      items: [
        {
          to: '/ai-relationships',
          label: 'AI Relationship Intel',
          icon: Sparkles,
          show: !isCitizenOnly,
          badge: 'E5-Live',
          badgeStyle: 'bg-teal-950 text-teal-300 border border-teal-500/50 font-semibold',
        },
        {
          to: '/deadlines',
          label: 'Alerts & Deadlines',
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
          to: '/admin',
          label: 'Administration',
          icon: Users,
          show: isAdmin,
        },
        {
          to: '/audit',
          label: 'Audit Trail',
          icon: History,
          show: isAdmin || hasRole(['ROLE_MANAGEMENT']),
        },
      ],
    },
    {
      category: 'CASE360+ PLANNED MODULES',
      items: [
        {
          to: '#',
          label: 'Regulatory Memory',
          icon: BookOpen,
          show: !isCitizenOnly,
          isComingSoon: true,
        },
      ],
    },
  ];

  return (
    <aside className="w-68 bg-[#102A43] text-slate-300 flex flex-col shrink-0 border-r border-slate-700/80 select-none">
      {/* Sidebar Top Title */}
      <div className="px-4 py-3.5 border-b border-slate-800 bg-[#0c2033] flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
          Administrative Workspace
        </span>
        <span className="text-[10px] text-teal-300 font-mono font-semibold bg-teal-950/60 px-1.5 py-0.5 rounded border border-teal-800/40">
          Case360+
        </span>
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

                if (item.isComingSoon) {
                  return (
                    <div
                      key={item.label}
                      className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-500 rounded-md cursor-not-allowed opacity-60"
                      title="Planned for Case360+ Phase 2 / Phase 3"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon className="w-4 h-4 shrink-0 text-slate-500" />
                        <span className="truncate">{item.label}</span>
                      </div>
                      <span className="text-[9px] font-mono uppercase bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                        Soon
                      </span>
                    </div>
                  );
                }

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-all ${
                        isActive
                          ? 'bg-[#17365D] text-white shadow-xs border-l-3 border-teal-400 font-semibold'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-white" />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                          item.badgeStyle || 'bg-slate-800 text-slate-300'
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

      {/* User Session Footer */}
      <div className="p-3 border-t border-slate-800 bg-[#0c2033]">
        <div className="text-[11px] font-semibold text-white truncate">{user?.display_name || 'Authorized Official'}</div>
        <div className="text-[10px] text-teal-400 truncate mt-0.5 font-mono">
          {user?.bureau_assignments?.[0]?.bureau?.name || user?.roles?.[0]?.name || 'AICTE Officer'}
        </div>
        <div className="text-[9px] text-slate-500 mt-1">SIH PS 26264 Prototype</div>
      </div>
    </aside>
  );
};
