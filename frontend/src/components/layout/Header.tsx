import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Bell,
  LogOut,
  ChevronDown,
  Menu,
  CheckCircle2,
  Shield,
  UserCheck,
} from 'lucide-react';
import { apiRequest } from '../../api/client';
import { AppNotification } from '../../types';
import { AicteLogo } from '../common/AicteLogo';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getPageTitle = (pathname: string): { title: string; category: string } => {
    if (pathname === '/') return { title: 'Executive Overview', category: 'Dashboard' };
    if (pathname.startsWith('/institutions')) return { title: 'Institution 360° Profiles', category: 'Registry' };
    if (pathname.startsWith('/complaints')) return { title: 'Complaints & Grievances', category: 'Workflow' };
    if (pathname.startsWith('/cases')) return { title: 'Regulatory Cases', category: 'Proceedings' };
    if (pathname.startsWith('/coordination')) return { title: 'Coordination Hub', category: 'Inter-Bureau' };
    if (pathname.startsWith('/action-conflicts')) return { title: 'Action Conflict Guard', category: 'Oversight' };
    if (pathname.startsWith('/ai-relationships')) return { title: 'AI Relationship Intel', category: 'Neural Engine' };
    if (pathname.startsWith('/audit')) return { title: 'Audit Trail', category: 'Compliance' };
    return { title: 'Administrative Workspace', category: 'AICTE' };
  };

  const currentRouteMeta = getPageTitle(location.pathname);

  const fetchNotifications = async () => {
    try {
      const data = await apiRequest<AppNotification[]>('/notifications?limit=10');
      setNotifications(data);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAsRead = async (id: number) => {
    try {
      await apiRequest(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {
      // Ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiRequest('/notifications/read-all', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // Ignore
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-soft select-none">
      {/* Refined Gold & Navy Accent Line at Top */}
      <div className="h-1 bg-gradient-to-r from-[#0B2545] via-[#2563EB] to-[#F59E0B]" />

      {/* Main Single Masthead Header */}
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-18 py-2 flex items-center justify-between">
        {/* Left Side: Mobile Hamburger + Official AICTE Logo + Branding */}
        <div className="flex items-center gap-3.5">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5 text-royal-main" />
          </button>

          <Link to="/" className="flex items-center gap-3 group">
            <AicteLogo size={46} className="transition-transform group-hover:scale-105" />
            <div className="border-l border-slate-200 pl-3">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-none">
                All India Council for Technical Education
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-[#0B2545] leading-tight">
                  Case360+
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 font-mono">
                  National Portal
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-medium leading-none hidden sm:block mt-0.5">
                Ministry of Education &bull; Government of India
              </div>
            </div>
          </Link>
        </div>

        {/* Center: Current Workspace Location Badge */}
        <div className="hidden xl:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-50 border border-slate-200/80">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
            {currentRouteMeta.category}
          </span>
          <span className="text-slate-300">&bull;</span>
          <span className="text-xs font-bold text-slate-800">
            {currentRouteMeta.title}
          </span>
        </div>

        {/* Right Side: Notifications & Officer Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notifications Center */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifMenu(!showNotifMenu);
                setShowUserMenu(false);
              }}
              className="p-2 rounded-lg hover:bg-blue-50 text-slate-600 hover:text-royal-main relative transition-colors border border-slate-200/80 cursor-pointer"
              title="Notifications"
              id="notifications-button"
            >
              <Bell className="w-5 h-5 text-royal-main" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifMenu && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white text-slate-800 rounded-xl shadow-modal border border-slate-200 z-50 overflow-hidden animate-fade-in">
                <div className="px-4 py-3 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-royal-navy uppercase tracking-wider">
                    <Bell className="w-3.5 h-3.5 text-royal-main" />
                    <span>Regulatory Alerts ({unreadCount} unread)</span>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-royal-main hover:text-royal-deep font-semibold hover:underline cursor-pointer"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      No pending regulatory notifications
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleMarkAsRead(n.id)}
                        className={`p-3.5 hover:bg-slate-50 cursor-pointer text-xs transition-colors ${
                          !n.is_read ? 'bg-blue-50/40 font-medium' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={`font-semibold ${!n.is_read ? 'text-royal-main' : 'text-slate-800'}`}>
                            {n.title}
                          </span>
                          {!n.is_read && <span className="w-2 h-2 rounded-full bg-royal-main mt-1 shrink-0" />}
                        </div>
                        <p className="text-slate-600 text-[11px] mt-1 leading-relaxed line-clamp-2">{n.message}</p>
                        <span className="text-[10px] text-slate-400 mt-1.5 block font-mono">
                          {new Date(n.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                  <Link
                    to="/cases"
                    onClick={() => setShowNotifMenu(false)}
                    className="text-xs text-royal-main hover:text-royal-deep font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    <span>View All Active Regulatory Cases &rarr;</span>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Officer Profile Badge & Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifMenu(false);
              }}
              className="flex items-center gap-2.5 p-1.5 pr-3 rounded-lg hover:bg-slate-50 border border-slate-200 text-left transition-all cursor-pointer bg-white"
              id="user-profile-menu-toggle"
            >
              {/* Professional Officer Avatar Badge with Gold Accent */}
              <div className="w-9 h-9 rounded-full bg-[#0B2545] border-2 border-[#F59E0B] text-amber-300 font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
                <UserCheck className="w-4 h-4 text-amber-400" />
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-bold text-slate-900 leading-tight">
                  {user?.display_name || 'Authorized Official'}
                </div>
                <div className="text-[10px] text-royal-deep font-medium leading-tight">
                  {user?.bureau_assignments?.[0]?.bureau?.name || user?.roles?.[0]?.name || 'Central Officer'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Profile Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white text-slate-800 rounded-xl shadow-modal border border-slate-200 z-50 py-1 overflow-hidden animate-fade-in">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                  <p className="text-xs font-bold text-slate-900">{user?.display_name}</p>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{user?.email}</p>
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-royal-main font-mono font-semibold border border-blue-200">
                      {user?.roles?.[0]?.code}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-mono font-semibold border border-amber-200">
                      {user?.bureau_assignments?.[0]?.bureau?.code || 'Central HQ'}
                    </span>
                  </div>
                </div>

                <div className="px-3 py-2 text-[11px] text-slate-600 border-b border-slate-100 space-y-1.5">
                  <div className="flex justify-between px-1">
                    <span>Account Status:</span>
                    <span className="font-semibold text-emerald-600 inline-flex items-center gap-1 capitalize">
                      <CheckCircle2 className="w-3 h-3" />
                      {user?.account_status || 'Active'}
                    </span>
                  </div>
                  <div className="flex justify-between px-1">
                    <span>Jurisdiction:</span>
                    <span className="font-semibold text-slate-800 truncate max-w-[150px]">
                      {user?.bureau_assignments?.[0]?.bureau?.name || 'Headquarters'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-semibold cursor-pointer transition-colors"
                  id="sign-out-button"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out from Administrative Session
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
