import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  FileText,
  Briefcase,
  GitCompare,
  ShieldAlert,
  Sparkles,
  History,
  X,
  ChevronRight,
  Users,
  LogOut,
  ChevronUp,
  UserCheck,
} from 'lucide-react';
import { AicteLogo } from '../common/AicteLogo';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const { user, switchUser, logout } = useAuth();
  const navigate = useNavigate();
  const [showRoleDrawer, setShowRoleDrawer] = useState(false);

  const isCitizenOnly = user?.roles?.length === 1 && user.roles[0].code === 'ROLE_COMPLAINANT';

  // Essential navigation items only
  const navItems = [
    {
      to: '/',
      label: 'Executive Overview',
      icon: LayoutDashboard,
      show: !isCitizenOnly,
    },
    {
      to: '/institutions',
      label: 'Institution 360°',
      icon: Building2,
      show: !isCitizenOnly,
    },
    {
      to: '/complaints',
      label: isCitizenOnly ? 'My Grievances' : 'Complaints & Grievances',
      icon: FileText,
      show: true,
    },
    {
      to: '/cases',
      label: 'Regulatory Cases',
      icon: Briefcase,
      show: !isCitizenOnly,
    },
    {
      to: '/coordination',
      label: 'Coordination Hub',
      icon: GitCompare,
      show: !isCitizenOnly,
    },
    {
      to: '/action-conflicts',
      label: 'Action Conflict Guard',
      icon: ShieldAlert,
      show: !isCitizenOnly,
    },
    {
      to: '/ai-relationships',
      label: 'AI Relationship Intel',
      icon: Sparkles,
      show: !isCitizenOnly,
      isAI: true,
    },
    {
      to: '/audit',
      label: 'Audit Trail',
      icon: History,
      show: !isCitizenOnly,
    },
  ];

  const demoAccounts = [
    { role: 'System Admin', name: 'Dr. Rajesh Kumar', username: 'admin', pass: 'Admin@123', tag: 'Central HQ' },
    { role: 'PGRC Officer', name: 'Shri Arvind Sharma', username: 'pgrc_officer', pass: 'Pgrc@123', tag: 'PGRC Cell' },
    { role: 'Regulation Officer', name: 'Smt. Sunita Verma', username: 'rb_officer', pass: 'Rb@123', tag: 'Regulation' },
    { role: 'Bureau Head', name: 'Dr. Vikramaditya Rao', username: 'bureau_head', pass: 'Head@123', tag: 'Senior Mgmt' },
    { role: 'Regional Officer', name: 'Er. Manoj Tiwari', username: 'ro_northern', pass: 'Ro@123', tag: 'NRO Kanpur' },
    { role: 'Competent Authority', name: 'Member Secretary AICTE', username: 'competent_authority', pass: 'Auth@123', tag: 'Executive' },
    { role: 'Complainant', name: 'Rahul S. (Student)', username: 'complainant_user', pass: 'Citizen@123', tag: 'Citizen' },
  ];

  const handleRoleSelect = async (username: string, pass: string) => {
    await switchUser(username, pass);
    setShowRoleDrawer(false);
    navigate('/');
  };

  return (
    <>
      <aside
        id="sidebar-navigation"
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#0B2545] text-slate-200 flex flex-col shrink-0 border-r border-[#1E3A8A] select-none transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-modal' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="px-5 py-4 border-b border-[#1E3A8A] bg-[#07182E] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AicteLogo size={36} />
            <div>
              <div className="text-xs font-bold text-white tracking-wide uppercase leading-tight">
                Case360+ Workspace
              </div>
              <div className="text-[10px] text-amber-400 font-mono font-medium">
                AICTE Official Portal
              </div>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Essential Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold text-amber-400/90 uppercase tracking-widest">
            Core Modules
          </div>

          {navItems.filter(item => item.show).map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => onClose && onClose()}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 text-xs font-medium rounded-lg transition-all group ${
                    isActive
                      ? 'bg-royal-main text-white shadow-soft font-semibold border-l-4 border-amber-400'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <div className="flex items-center gap-3 truncate">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      item.isAI ? 'text-amber-300' : 'text-blue-300 group-hover:text-white'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-blue-300/30 group-hover:text-white/70 transition-colors" />
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Section: Officer Profile & Role Persona Switcher */}
        <div className="p-3.5 border-t border-[#1E3A8A] bg-[#07182E] relative">
          {/* Persona Switcher Drawer Popup */}
          {showRoleDrawer && (
            <div className="absolute bottom-full left-2 right-2 mb-2 bg-[#0B2545] border-2 border-amber-400/80 rounded-xl p-3 shadow-modal z-50 animate-fade-in text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-blue-900/60 mb-2">
                <span className="font-bold text-amber-300 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <Users className="w-3 h-3 text-amber-400" />
                  Select Role Persona
                </span>
                <button
                  onClick={() => setShowRoleDrawer(false)}
                  className="text-slate-400 hover:text-white cursor-pointer px-1 text-sm font-bold"
                >
                  &times;
                </button>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {demoAccounts.map((acc) => {
                  const isActive = user?.username === acc.username;
                  return (
                    <button
                      key={acc.username}
                      onClick={() => handleRoleSelect(acc.username, acc.pass)}
                      className={`w-full text-left p-2 rounded-lg transition-all border cursor-pointer ${
                        isActive
                          ? 'bg-royal-main border-amber-400 text-white font-semibold'
                          : 'bg-[#0F2E5A]/60 hover:bg-[#1E3A8A] border-blue-900/40 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] leading-tight">
                        <span className="font-bold truncate">{acc.role}</span>
                        <span className="text-[9px] font-mono text-amber-300">{acc.tag}</span>
                      </div>
                      <div className="text-[10px] text-slate-300 truncate mt-0.5">{acc.name}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Connected Officer Session Card */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#1E3A8A] border border-amber-400 text-amber-300 font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                <UserCheck className="w-4 h-4 text-amber-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate">
                  {user?.display_name || 'Authorized Official'}
                </div>
                <div className="text-[10px] text-amber-400/90 truncate font-mono">
                  {user?.bureau_assignments?.[0]?.bureau?.name || user?.roles?.[0]?.name || 'Officer'}
                </div>
              </div>
            </div>

            <button
              onClick={() => logout()}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/10 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Switch Role Persona Toggle Button */}
          <button
            onClick={() => setShowRoleDrawer(!showRoleDrawer)}
            className="mt-2.5 w-full py-1.5 px-2.5 rounded-lg bg-[#1E3A8A]/60 hover:bg-[#1E3A8A] text-amber-300 border border-amber-400/40 text-[11px] font-semibold flex items-center justify-between transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              Switch Role Persona
            </span>
            <ChevronUp className={`w-3.5 h-3.5 transition-transform ${showRoleDrawer ? '' : 'rotate-180'}`} />
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
