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
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col justify-between">
      {/* Top National Tricolor Accent */}
      <div className="h-1 tricolor-ribbon w-full" />

      {/* Official Government Masthead */}
      <div className="bg-white border-b border-gov-border py-3 px-6 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-gov-primary text-white flex items-center justify-center font-bold text-sm shadow-xs border border-gov-dark">
              AICTE
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                अखिल भारतीय तकनीकी शिक्षा परिषद &bull; शिक्षा मंत्रालय, भारत सरकार
              </div>
              <div className="text-sm font-bold text-slate-900 tracking-tight">
                All India Council for Technical Education &bull; MoE, Govt. of India
              </div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
              SIH-2024 &bull; PS-264
            </span>
          </div>
        </div>
      </div>

      {/* Main Authentication Container */}
      <div className="flex-1 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gov-dark text-amber-400 shadow-md border border-slate-700 mb-3">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            AICTE ICMS Official Portal
          </h1>
          <p className="mt-1 text-xs text-slate-600 max-w-sm mx-auto">
            Integrated Institution Complaint Monitoring and Multi-Bureau Coordination System
          </p>
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-lg">
          <div className="gov-card p-6 sm:p-8">
            <div className="border-b border-slate-100 pb-4 mb-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-gov-primary" />
                Authorized Personnel Authentication
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Enter your official administrative credentials to access the coordination console.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-md flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Official Username or Email *
                </label>
                <div className="relative rounded-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="gov-input pl-9"
                    placeholder="e.g. admin or pgrc_officer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Administrative Password *
                </label>
                <div className="relative rounded-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="gov-input pl-9 font-mono"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="gov-btn-primary w-full py-2.5 text-xs text-center justify-center flex items-center gap-2"
              >
                {loading ? 'Verifying Credentials...' : 'Authenticate & Enter System'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>

            {/* Quick Demonstration Evaluation Roles */}
            <div className="mt-6 pt-5 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  Quick Hackathon Role Selector:
                </span>
                <span className="text-[10px] text-gov-primary font-semibold">Click to pre-fill</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleSelectRole('admin', 'Admin@123')}
                  className="p-2.5 text-left bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-gov-primary rounded-md cursor-pointer transition-colors"
                >
                  <div className="font-bold text-slate-900">Administrator</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">admin / Admin@123</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectRole('pgrc_officer', 'Pgrc@123')}
                  className="p-2.5 text-left bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-gov-primary rounded-md cursor-pointer transition-colors"
                >
                  <div className="font-bold text-slate-900">PGRC Officer</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">pgrc_officer / Pgrc@123</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectRole('rb_officer', 'Rb@123')}
                  className="p-2.5 text-left bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-gov-primary rounded-md cursor-pointer transition-colors"
                >
                  <div className="font-bold text-slate-900">Regulation Bureau</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">rb_officer / Rb@123</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectRole('bureau_head', 'Head@123')}
                  className="p-2.5 text-left bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-gov-primary rounded-md cursor-pointer transition-colors"
                >
                  <div className="font-bold text-slate-900">Bureau Head</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">bureau_head / Head@123</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectRole('ro_northern', 'Ro@123')}
                  className="p-2.5 text-left bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-gov-primary rounded-md cursor-pointer transition-colors"
                >
                  <div className="font-bold text-slate-900">Regional Office</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">ro_northern / Ro@123</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectRole('competent_authority', 'Auth@123')}
                  className="p-2.5 text-left bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-gov-primary rounded-md cursor-pointer transition-colors"
                >
                  <div className="font-bold text-slate-900">Competent Authority</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">competent_authority / Auth@123</div>
                </button>
              </div>
            </div>
          </div>

          {/* Statutory Security Disclaimer */}
          <div className="text-center mt-5 text-[11px] text-slate-500 space-y-1">
            <p>Authorized Government Personnel Access Only &bull; Unauthorized access is strictly prohibited and subject to legal prosecution under the Information Technology Act, 2000.</p>
            <p className="font-mono text-[10px] text-slate-400">Security: Bcrypt Hash &bull; JWT HMAC-SHA256 &bull; Strict RBAC Protocols</p>
          </div>
        </div>
      </div>

      {/* Official Footer */}
      <footer className="bg-white border-t border-gov-border py-4 text-center text-xs text-slate-500">
        <div>&copy; {new Date().getFullYear()} All India Council for Technical Education (AICTE). All Rights Reserved.</div>
        <div className="text-[11px] text-slate-400 mt-0.5">Smart India Hackathon Prototype &bull; Problem Statement PS-264</div>
      </footer>
    </div>
  );
};
