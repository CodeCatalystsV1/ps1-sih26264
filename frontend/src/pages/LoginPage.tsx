import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  ShieldCheck,
  Lock,
  User as UserIcon,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Scale,
  GitCompare,
  FileCheck2,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const isDevMode = import.meta.env.DEV || true; // Visible during development & SIH prototype evaluation

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please provide both username/email and administrative password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(username.trim(), password);
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
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col justify-between selection:bg-gov-primary selection:text-white">
      {/* Top National Tricolor Subtle Ribbon */}
      <div className="h-1 tricolor-ribbon w-full" />

      {/* Official Government Masthead */}
      <header className="bg-white border-b border-slate-200 py-3 px-4 sm:px-8 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-[#102A43] text-white flex items-center justify-center font-extrabold text-sm shadow-xs border border-slate-700">
              AICTE
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                अखिल भारतीय तकनीकी शिक्षा परिषद &bull; शिक्षा मंत्रालय, भारत सरकार
              </div>
              <div className="text-sm font-bold text-slate-900 tracking-tight">
                All India Council for Technical Education &bull; MoE, Govt. of India
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-medium text-slate-700 bg-slate-100 px-3 py-1 rounded-md border border-slate-300">
              SIH 2026 &bull; PS 26264
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center mb-6">
          <div className="inline-flex items-center justify-center w-13 h-13 rounded-xl bg-[#102A43] text-teal-400 shadow-sm border border-slate-700 mb-3">
            <Building2 className="w-7 h-7 text-teal-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            AICTE Case360+
          </h1>
          <h2 className="text-sm font-semibold text-[#17365D] mt-1">
            Unified Institution Complaint Intelligence & Coordination Platform
          </h2>
          <p className="mt-2 text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
            Monitor institution-related complaints, identify cross-Bureau overlaps, and coordinate regulatory case actions.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="max-w-xl mx-auto w-full grid grid-cols-3 gap-2.5 mb-6 text-center text-[11px]">
          <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-2xs">
            <GitCompare className="w-4 h-4 mx-auto text-[#17365D] mb-1" />
            <span className="font-semibold text-slate-800 block">Cross-Bureau Overlaps</span>
            <span className="text-[10px] text-slate-500">Dual inquiry warnings</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-2xs">
            <Scale className="w-4 h-4 mx-auto text-teal-700 mb-1" />
            <span className="font-semibold text-slate-800 block">Conflict Prevention</span>
            <span className="text-[10px] text-slate-500">Notice & inspection guard</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-2.5 shadow-2xs">
            <FileCheck2 className="w-4 h-4 mx-auto text-emerald-700 mb-1" />
            <span className="font-semibold text-slate-800 block">Institution 360°</span>
            <span className="text-[10px] text-slate-500">Single consolidated dossier</span>
          </div>
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-lg">
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 sm:p-8">
            <div className="border-b border-slate-100 pb-4 mb-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#17365D]" />
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
                  Official Username or Email <span className="text-red-500">*</span>
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
                    className="w-full pl-9 pr-3 py-2 text-xs text-slate-800 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#17365D] focus:border-[#17365D]"
                    placeholder="e.g. admin or pgrc_officer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Administrative Password <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 text-xs text-slate-800 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#17365D] focus:border-[#17365D] font-mono"
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-[#102A43] hover:bg-[#17365D] active:bg-[#0c2033] rounded-md transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-60"
              >
                {loading ? 'Verifying Credentials...' : 'Authenticate & Enter Case360+'}
                {!loading && <ArrowRight className="w-4 h-4 text-teal-400" />}
              </button>
            </form>

            {/* DEMO Evaluation Persona Quick Selector */}
            {isDevMode && (
              <div className="mt-6 pt-5 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-600"></span>
                    Evaluation Persona Selector (DEMO):
                  </span>
                  <span className="text-[10px] text-[#17365D] font-semibold">Click to pre-fill</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleSelectRole('admin', 'Admin@123')}
                    className="p-2.5 text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-400 rounded-md cursor-pointer transition-colors"
                  >
                    <div className="font-bold text-slate-900">Administrator</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">admin (Full System)</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectRole('pgrc_officer', 'Pgrc@123')}
                    className="p-2.5 text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-400 rounded-md cursor-pointer transition-colors"
                  >
                    <div className="font-bold text-slate-900">PGRC Officer</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">pgrc_officer (Grievance)</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectRole('rb_officer', 'Rb@123')}
                    className="p-2.5 text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-400 rounded-md cursor-pointer transition-colors"
                  >
                    <div className="font-bold text-slate-900">Regulation Bureau</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">rb_officer (Compliance)</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectRole('bureau_head', 'Head@123')}
                    className="p-2.5 text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-400 rounded-md cursor-pointer transition-colors"
                  >
                    <div className="font-bold text-slate-900">Bureau Head</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">bureau_head (Supervisor)</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectRole('ro_northern', 'Ro@123')}
                    className="p-2.5 text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-400 rounded-md cursor-pointer transition-colors"
                  >
                    <div className="font-bold text-slate-900">Regional Office</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">ro_northern (Kanpur)</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectRole('competent_authority', 'Auth@123')}
                    className="p-2.5 text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-400 rounded-md cursor-pointer transition-colors"
                  >
                    <div className="font-bold text-slate-900">Competent Authority</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">competent_authority (MS)</div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Prototype Notice */}
          <div className="text-center mt-5 text-[11px] text-slate-500 space-y-1">
            <p>
              Smart India Hackathon Prototype &bull; Problem Statement PS 26264 &bull; Designed for Evaluation Only.
            </p>
            <p className="font-mono text-[10px] text-slate-400">
              Not officially deployed or operated by AICTE &bull; Direct Bcrypt Hashing &bull; JWT HMAC-SHA256 &bull; Backend RBAC
            </p>
          </div>
        </div>
      </main>

      {/* Official Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-500">
        <div>&copy; {new Date().getFullYear()} All India Council for Technical Education (AICTE). All Rights Reserved.</div>
        <div className="text-[11px] text-slate-400 mt-0.5">
          AICTE Case360+ &bull; Smart India Hackathon Prototype PS 26264
        </div>
      </footer>
    </div>
  );
};
