import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Bell, LogOut, User as UserIcon, ShieldAlert, CheckCircle, ChevronDown, Building2 } from 'lucide-react';
import { apiRequest } from '../../api/client';
import { AppNotification } from '../../types';

export const Header: React.FC = () => {
  const { user, logout, switchUser } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);

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

  const quickSwitch = async (username: string, pass: string) => {
    await switchUser(username, pass);
    setShowRoleSwitcher(false);
    navigate('/');
  };

  return (
    <header className="bg-gov-dark text-white border-b border-slate-700 sticky top-0 z-40 shadow-sm">
      {/* Top Prototype Notice Banner */}
      <div className="bg-amber-600/90 text-amber-50 text-[11px] font-medium px-4 py-1 flex items-center justify-between tracking-wide">
        <div className="flex items-center gap-1.5">
          <span className="bg-white/20 px-1.5 py-0.2 rounded text-[10px] font-bold uppercase">SIH Prototype</span>
          <span>SIH-2026 Problem Statement PS-264 Demonstration System — Fictional Prototype Data</span>
        </div>
        <button
          onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
          className="underline hover:text-white flex items-center gap-1 font-semibold cursor-pointer"
        >
          Switch Demo Official Account <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      {/* Quick Demo Switcher Dropdown Bar */}
      {showRoleSwitcher && (
        <div className="bg-slate-900 border-b border-slate-700 px-4 py-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Quick Login Switcher:</span>
          <button onClick={() => quickSwitch('admin', 'Admin@123')} className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded border border-slate-600">
            👑 System Administrator
          </button>
          <button onClick={() => quickSwitch('pgrc_officer', 'Pgrc@123')} className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded border border-slate-600">
            ⚖️ PGRC Officer
          </button>
          <button onClick={() => quickSwitch('rb_officer', 'Rb@123')} className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded border border-slate-600">
            📜 Regulation Bureau Off
          </button>
          <button onClick={() => quickSwitch('bureau_head', 'Head@123')} className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded border border-slate-600">
            👔 Bureau Head
          </button>
          <button onClick={() => quickSwitch('ro_northern', 'Ro@123')} className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded border border-slate-600">
            📍 Regional Office (Kanpur)
          </button>
          <button onClick={() => quickSwitch('competent_authority', 'Auth@123')} className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded border border-slate-600">
            📊 Competent Authority
          </button>
          <button onClick={() => quickSwitch('complainant_user', 'Citizen@123')} className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded border border-slate-600">
            👤 Citizen Complainant
          </button>
        </div>
      )}

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-gov-primary border border-slate-500/50 flex items-center justify-center text-white shadow-inner">
            <Building2 className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-white">AICTE ICMS</span>
              <span className="text-[11px] bg-gov-secondary text-slate-200 px-1.5 py-0.5 rounded font-mono">PS-264</span>
            </div>
            <p className="text-[11px] text-slate-300 font-normal hidden sm:block">
              Integrated Institution Complaint Monitoring & Coordination Platform
            </p>
          </div>
        </div>

        {/* Right: Actions & User Info */}
        <div className="flex items-center gap-4">
          {/* Notifications Center */}
          <div className="relative">
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="p-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white relative transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-gov-danger text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifMenu && (
              <div className="absolute right-0 mt-2 w-84 sm:w-96 bg-white text-slate-800 rounded-md shadow-xl border border-slate-200 z-50 overflow-hidden">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-semibold text-xs text-slate-700 uppercase tracking-wider">
                    Notifications ({unreadCount} unread)
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-gov-primary hover:underline font-medium"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">No notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleMarkAsRead(n.id)}
                        className={`p-3 hover:bg-slate-50 cursor-pointer text-xs ${
                          !n.is_read ? 'bg-blue-50/50 font-medium' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={`font-semibold ${!n.is_read ? 'text-gov-primary' : 'text-slate-700'}`}>
                            {n.title}
                          </span>
                          {!n.is_read && <span className="w-2 h-2 rounded-full bg-blue-600 mt-1 shrink-0" />}
                        </div>
                        <p className="text-slate-600 text-[11px] mt-1 line-clamp-2">{n.message}</p>
                        <span className="text-[10px] text-slate-400 mt-1.5 block">
                          {new Date(n.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-2 bg-slate-50 border-t border-slate-200 text-center">
                  <Link
                    to="/deadlines"
                    onClick={() => setShowNotifMenu(false)}
                    className="text-xs text-gov-secondary hover:underline font-medium"
                  >
                    View Alerts & Deadlines Center
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-800 text-left transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gov-secondary flex items-center justify-center font-semibold text-xs border border-slate-500">
                {user?.display_name?.charAt(0) || 'U'}
              </div>
              <div className="hidden md:block">
                <div className="text-xs font-semibold text-white leading-tight">{user?.display_name}</div>
                <div className="text-[10px] text-slate-300 leading-tight">
                  {user?.roles?.[0]?.name || 'Authorized Official'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* User Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white text-slate-800 rounded-md shadow-xl border border-slate-200 z-50 py-1">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-900">{user?.display_name}</p>
                  <p className="text-[11px] text-slate-500">{user?.email}</p>
                  <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
                    {user?.roles?.[0]?.code}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
