import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, ShieldCheck, Lock, User as UserIcon, ArrowRight, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRole = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-gov-bg flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Top Banner */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gov-dark text-amber-400 shadow-md border border-slate-700 mb-3">
          <Building2 className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-gov-dark">
          AICTE ICMS PORTAL
        </h1>
        <p className="mt-1 text-xs text-gov-muted max-w-sm mx-auto">
          AICTE Integrated Institution Complaint Monitoring and Coordination Platform
        </p>
        <span className="inline-block mt-2 text-[11px] font-semibold text-amber-800 bg-amber-100 border border-amber-300 px-3 py-0.5 rounded-full">
          SIH PS-264 Hackathon Demonstration Prototype
        </span>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-md rounded-lg sm:px-10 border border-gov-border">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Official Username or Email
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-gov-primary focus:border-gov-primary"
                  placeholder="e.g. admin or pgrc_officer"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Secure Password
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-1 focus:ring-gov-primary focus:border-gov-primary"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-md shadow-sm text-xs font-semibold text-white bg-gov-primary hover:bg-gov-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gov-primary transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In to Administrative Console'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Demonstration Accounts Quick Fill */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <span className="text-[11px] font-semibold text-slate-600 block mb-2 uppercase tracking-wide">
              Quick Demonstration Accounts:
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => handleSelectRole('admin', 'Admin@123')}
                className="p-2 text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded cursor-pointer transition-colors"
              >
                <div className="font-semibold text-slate-800">Administrator</div>
                <div className="text-[10px] text-slate-500 font-mono">admin / Admin@123</div>
              </button>
              <button
                type="button"
                onClick={() => handleSelectRole('pgrc_officer', 'Pgrc@123')}
                className="p-2 text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded cursor-pointer transition-colors"
              >
                <div className="font-semibold text-slate-800">PGRC Officer</div>
                <div className="text-[10px] text-slate-500 font-mono">pgrc_officer / Pgrc@123</div>
              </button>
              <button
                type="button"
                onClick={() => handleSelectRole('rb_officer', 'Rb@123')}
                className="p-2 text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded cursor-pointer transition-colors"
              >
                <div className="font-semibold text-slate-800">Regulation Bureau</div>
                <div className="text-[10px] text-slate-500 font-mono">rb_officer / Rb@123</div>
              </button>
              <button
                type="button"
                onClick={() => handleSelectRole('bureau_head', 'Head@123')}
                className="p-2 text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded cursor-pointer transition-colors"
              >
                <div className="font-semibold text-slate-800">Bureau Head</div>
                <div className="text-[10px] text-slate-500 font-mono">bureau_head / Head@123</div>
              </button>
              <button
                type="button"
                onClick={() => handleSelectRole('ro_northern', 'Ro@123')}
                className="p-2 text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded cursor-pointer transition-colors"
              >
                <div className="font-semibold text-slate-800">Regional Office (Kanpur)</div>
                <div className="text-[10px] text-slate-500 font-mono">ro_northern / Ro@123</div>
              </button>
              <button
                type="button"
                onClick={() => handleSelectRole('competent_authority', 'Auth@123')}
                className="p-2 text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded cursor-pointer transition-colors"
              >
                <div className="font-semibold text-slate-800">Competent Authority</div>
                <div className="text-[10px] text-slate-500 font-mono">competent_authority / Auth@123</div>
              </button>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="text-center mt-4 text-[11px] text-slate-500">
          Security protocol enforced: Passwords hashed via Bcrypt with salt &bull; JWT Auth &bull; RBAC verified
        </div>
      </div>
    </div>
  );
};
