import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Bell, LogOut, ChevronDown, Building2, Shield, Users, Clock } from 'lucide-react';
import { apiRequest } from '../../api/client';
import { AppNotification } from '../../types';

export const Header: React.FC = () => {
  const { user, logout, switchUser } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

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

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, []);

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

  const demoAccounts = [
    { role: 'System Administrator', name: 'Dr. Rajesh Kumar', username: 'admin', pass: 'Admin@123', tag: 'HQ Central' },
    { role: 'PGRC Officer', name: 'Shri Arvind Sharma', username: 'pgrc_officer', pass: 'Pgrc@123', tag: 'PGRC Bureau' },
    { role: 'Regulation Bureau Off', name: 'Smt. Sunita Verma', username: 'rb_officer', pass: 'Rb@123', tag: 'Regulation' },
    { role: 'Bureau Head', name: 'Dr. Vikramaditya Rao', username: 'bureau_head', pass: 'Head@123', tag: 'Senior Mgmt' },
    { role: 'Regional Office Officer', name: 'Er. Manoj Tiwari', username: 'ro_northern', pass: 'Ro@123', tag: 'RO Northern' },
    { role: 'Competent Authority', name: 'Member Secretary AICTE', username: 'competent_authority', pass: 'Auth@123', tag: 'Executive' },
    { role: 'Citizen Complainant', name: 'Rahul S. (Student)', username: 'complainant_user', pass: 'Citizen@123', tag: 'Stakeholder' },
  ];

  return (
    <header className="bg-gov-dark text-white border-b border-slate-700/80 sticky top-0 z-40 shadow-md">
      {/* Subtle National Tricolor Ribbon at Top Edge */}
      <div className="tricolor-ribbon" />

      {/* Institutional Administrative Utility Bar */}
      <div className="bg-[#0b1d30] text-slate-300 text-[11px] px-4 sm:px-8 py-1.5 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2 tracking-wide text-slate-400">
          <span className="font-semibold text-slate-200">भारत सरकार | Government of India</span>
          <span className="text-slate-600 hidden sm:inline">&bull;</span>
          <span className="hidden sm:inline text-slate-300">शिक्षा मंत्रालय | Ministry of Education</span>
          <span className="text-slate-600 hidden md:inline">&bull;</span>
          <span className="hidden md:inline bg-teal-900/80 text-teal-200 px-2 py-0.5 rounded text-[10px] font-mono border border-teal-500/30">
            SIH 2026 &bull; PS 26264
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{currentTime || 'New Delhi, IST'}</span>
          </div>

          <button
            onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-medium transition-colors cursor-pointer"
          >
            <Users className="w-3 h-3 text-teal-400" />
            <span>Evaluation Role Switcher</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showRoleSwitcher ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Role Switcher Drawer */}
      {showRoleSwitcher && (
        <div className="bg-[#0e243a] border-b border-slate-700 px-4 sm:px-8 py-3 shadow-inner">
          <div className="w-full max-w-[1600px] mx-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Shield className="w-3.5 h-3.5 text-teal-400" />
                Select Role Persona for Prototype Evaluation (PS 26264)
              </span>
              <button
                onClick={() => setShowRoleSwitcher(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close &times;
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.username}
                  onClick={() => quickSwitch(acc.username, acc.pass)}
                  className={`p-2 rounded text-left transition-all border ${
                    user?.username === acc.username
                      ? 'bg-gov-primary border-teal-400 text-white shadow'
                      : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="text-[11px] font-bold truncate leading-tight">{acc.role}</div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">{acc.name}</div>
                  <div className="mt-1 flex items-center justify-between text-[9px] font-mono text-slate-400">
                    <span className="text-teal-400/90">{acc.tag}</span>
                    {user?.username === acc.username && (
                      <span className="text-emerald-400 font-bold font-sans">Active</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Header Masthead */}
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-18 py-2 flex items-center justify-between">
        {/* Left: Branding & Institutional Identity */}
        <Link to="/" className="flex items-center gap-3.5 group">
          <div className="w-11 h-11 rounded-md bg-gradient-to-br from-[#17365D] to-[#102A43] border border-teal-500/40 flex items-center justify-center text-white shadow-sm shrink-0">
            <Building2 className="w-6 h-6 text-teal-400" />
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-300 tracking-wide leading-tight">
              अखिल भारतीय तकनीकी शिक्षा परिषद &bull; AICTE
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-white leading-none">
                AICTE Case360+
              </span>
              <span className="text-[10px] font-semibold bg-teal-800/80 text-teal-100 px-2 py-0.5 rounded border border-teal-600 font-mono tracking-wider">
                PS 26264
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-normal leading-tight hidden lg:block mt-0.5">
              Intelligent Cross-Bureau Complaint Monitoring & Coordination
            </p>
          </div>
        </Link>

        {/* Right: Actions, Notifications & Profile */}
        <div className="flex items-center gap-3">
          {/* Notifications Center */}
          <div className="relative">
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="p-2 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white relative transition-colors border border-transparent hover:border-slate-700 cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-gov-danger text-white rounded-full text-[10px] font-bold flex items-center justify-center ring-2 ring-gov-dark">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifMenu && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white text-gov-text rounded-md shadow-gov-modal border border-gov-border z-50 overflow-hidden animate-fade-in">
                <div className="px-4 py-3 bg-slate-50 border-b border-gov-border flex items-center justify-between">
                  <span className="font-bold text-xs text-gov-dark uppercase tracking-wider">
                    Notifications ({unreadCount} unread)
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-gov-primary hover:text-gov-secondary font-semibold hover:underline cursor-pointer"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">No active notifications</div>
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
                          <span className={`font-semibold ${!n.is_read ? 'text-gov-primary' : 'text-slate-800'}`}>
                            {n.title}
                          </span>
                          {!n.is_read && <span className="w-2 h-2 rounded-full bg-blue-600 mt-1 shrink-0" />}
                        </div>
                        <p className="text-slate-600 text-[11px] mt-1 leading-relaxed line-clamp-2">{n.message}</p>
                        <span className="text-[10px] text-slate-400 mt-1.5 block font-mono">
                          {new Date(n.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-2.5 bg-slate-50 border-t border-gov-border text-center">
                  <Link
                    to="/deadlines"
                    onClick={() => setShowNotifMenu(false)}
                    className="text-xs text-gov-secondary hover:text-gov-primary font-semibold hover:underline"
                  >
                    View All Deadlines & Alerts &rarr;
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-md hover:bg-slate-800 text-left transition-colors border border-transparent hover:border-slate-700 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-md bg-gradient-to-tr from-gov-secondary to-gov-primary flex items-center justify-center font-bold text-xs text-white border border-slate-600 shadow-sm">
                {user?.display_name?.charAt(0) || 'U'}
              </div>
              <div className="hidden md:block">
                <div className="text-xs font-bold text-white leading-tight">{user?.display_name}</div>
                <div className="text-[10px] text-slate-300 leading-tight">
                  {user?.roles?.[0]?.name || 'Authorized Official'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* User Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white text-gov-text rounded-md shadow-gov-modal border border-gov-border z-50 py-1">
                <div className="px-3.5 py-3 border-b border-slate-100 bg-slate-50">
                  <p className="text-xs font-bold text-gov-dark">{user?.display_name}</p>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{user?.email}</p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-gov-primary/10 text-gov-primary font-mono font-semibold border border-gov-primary/20">
                      {user?.roles?.[0]?.code}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono">
                      {user?.bureau_assignments?.[0]?.bureau?.code || 'Central'}
                    </span>
                  </div>
                </div>

                <div className="px-2 py-1.5 text-[11px] text-slate-600 border-b border-slate-100 space-y-1">
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Account Status:</span>
                    <span className="font-semibold text-emerald-700 capitalize">{user?.account_status || 'Active'}</span>
                  </div>
                  <div className="flex justify-between px-2 py-0.5">
                    <span>Jurisdiction:</span>
                    <span className="font-semibold text-slate-800">{user?.bureau_assignments?.[0]?.bureau?.name || 'Central Head Office'}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full text-left px-3.5 py-2.5 text-xs text-gov-danger hover:bg-red-50 flex items-center gap-2 font-semibold cursor-pointer transition-colors"
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

