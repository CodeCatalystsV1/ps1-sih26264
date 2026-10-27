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
  Sparkles,
  Shield,
  CheckCircle,
} from 'lucide-react';
import { AicteLogo } from '../components/common/AicteLogo';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const isDevMode = import.meta.env.DEV || true; // Visible during development & prototype evaluation

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
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Top National Tricolor Subtle Ribbon */}
      <div className="tricolor-ribbon" />

      {/* Official Government Masthead */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AicteLogo size={44} />
            <div className="border-l border-slate-200 pl-3">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-none">
                Ministry of Education &bull; Government of India
              </div>
              <div className="text-xs sm:text-sm font-bold text-[#0B2545] tracking-tight mt-0.5">
                All India Council for Technical Education (AICTE)
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 shadow-xs">
              National Regulatory Portal
            </span>
          </div>
        </div>
      </header>

      {/* Main Two-Column Hero / Auth Container */}
      <main className="flex-1 flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Brand Identity & Feature Showcase (Desktop 7 cols) */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>AICTE Case360+ Enterprise Platform</span>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
                Unified Institution Complaint Intelligence &{' '}
                <span className="text-blue-600 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  Coordination Hub
                </span>
              </h1>
              <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Consolidated 360° grievance tracking across AICTE Bureaus, real-time Action Conflict Guard, and Multilingual AI Relationship Intelligence.
              </p>
            </div>

            {/* Feature Highlights Grid with Floating & Soft Shadow Accents */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
              {/* Feature 1 */}
              <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-soft card-interactive text-left">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5 border border-blue-100">
                  <GitCompare className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-800 text-xs">Cross-Bureau Coordination</h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Detect dual inquiry overlaps between PGRC and Regulation Bureaus.
                </p>
              </div>

              {/* Feature 2 (Gentle Floating Accent) */}
              <div className="bg-white border border-blue-200/90 rounded-xl p-4 shadow-soft animate-gentle-float text-left bg-gradient-to-br from-white to-blue-50/50">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5 border border-emerald-100">
                  <Scale className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-800 text-xs">Action Conflict Guard</h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Prevent contradictory show-cause notices & redundant inspections.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-soft card-interactive text-left">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2.5 border border-indigo-100">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-800 text-xs">Multilingual AI Intel</h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Multilingual E5 semantic engine links grievances across languages.
                </p>
              </div>
            </div>

            {/* Institutional Security Badge */}
            <div className="inline-flex items-center gap-2 text-xs text-slate-500 pt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Role-Based Access Control &bull; Tamper-Evident Audit Trail &bull; Real-Time Cross-Bureau Oversight</span>
            </div>
          </div>

          {/* Right Column: Elevated Login Card (Desktop 5 cols) */}
          <div className="lg:col-span-5 w-full">
            <div className="bg-white rounded-2xl shadow-elevated border border-slate-200/80 p-6 sm:p-8 backdrop-blur-sm">
              <div className="border-b border-slate-100 pb-4 mb-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    Administrative Console
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    Secure Session
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Authenticate with authorized officer credentials to proceed.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg flex items-center gap-2 animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{error}</span>
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Official Username or Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative rounded-lg">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-xs text-slate-800 bg-slate-50/50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                      placeholder="e.g. admin or pgrc_officer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Administrative Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative rounded-lg">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 text-xs text-slate-800 bg-slate-50/50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition font-mono"
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
                  className="w-full py-2.5 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 active:scale-[0.99]"
                >
                  {loading ? 'Verifying Credentials...' : 'Sign In to Case360+'}
                  {!loading && <ArrowRight className="w-4 h-4 text-blue-200" />}
                </button>
              </form>

              {/* DEMO Evaluation Persona Quick Selector */}
              {isDevMode && (
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                      Evaluation Persona Selector (DEMO):
                    </span>
                    <span className="text-[10px] text-blue-600 font-semibold">Click to load</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleSelectRole('admin', 'Admin@123')}
                      className={`p-2 text-left rounded-lg border transition ${
                        username === 'admin'
                          ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="font-bold">Administrator</div>
                      <div className="text-[10px] text-slate-500 font-mono">admin (Full System)</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectRole('pgrc_officer', 'Pgrc@123')}
                      className={`p-2 text-left rounded-lg border transition ${
                        username === 'pgrc_officer'
                          ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="font-bold">PGRC Officer</div>
                      <div className="text-[10px] text-slate-500 font-mono">pgrc_officer (Grievance)</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectRole('rb_officer', 'Rb@123')}
                      className={`p-2 text-left rounded-lg border transition ${
                        username === 'rb_officer'
                          ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="font-bold">Regulation Bureau</div>
                      <div className="text-[10px] text-slate-500 font-mono">rb_officer (Compliance)</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectRole('bureau_head', 'Head@123')}
                      className={`p-2 text-left rounded-lg border transition ${
                        username === 'bureau_head'
                          ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="font-bold">Bureau Head</div>
                      <div className="text-[10px] text-slate-500 font-mono">bureau_head (Supervisor)</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectRole('ro_northern', 'Ro@123')}
                      className={`p-2 text-left rounded-lg border transition ${
                        username === 'ro_northern'
                          ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="font-bold">Regional Office</div>
                      <div className="text-[10px] text-slate-500 font-mono">ro_northern (Kanpur)</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectRole('competent_authority', 'Auth@123')}
                      className={`p-2 text-left rounded-lg border transition ${
                        username === 'competent_authority'
                          ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="font-bold">Competent Authority</div>
                      <div className="text-[10px] text-slate-500 font-mono">competent_authority</div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Official Government Footer */}
      <footer className="bg-white border-t border-slate-200 py-3.5 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>&copy; {new Date().getFullYear()} All India Council for Technical Education (AICTE). All Rights Reserved.</div>
          <div className="text-[11px] text-slate-400 font-mono">
            AICTE Case360+ &bull; National Regulatory Platform &bull; Enterprise Edition
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LoginPage;
