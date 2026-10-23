import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client';
import {
  DashboardMetrics,
  StatusDistribution,
  BureauWorkload,
  AgeingBand,
  OverlapFlag,
  Case,
  WorkflowHistory,
} from '../types';
import {
  FileText,
  Clock,
  RotateCw,
  CheckCircle2,
  ArrowRightLeft,
  AlertTriangle,
  GitCompare,
  Building,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [statusDist, setStatusDist] = useState<StatusDistribution[]>([]);
  const [bureauWorkloads, setBureauWorkloads] = useState<BureauWorkload[]>([]);
  const [ageingBands, setAgeingBands] = useState<AgeingBand[]>([]);
  const [overlaps, setOverlaps] = useState<OverlapFlag[]>([]);
  const [overdueCases, setOverdueCases] = useState<Case[]>([]);
  const [recentActivities, setRecentActivities] = useState<WorkflowHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [m, s, b, a, o, c, r] = await Promise.all([
        apiRequest<DashboardMetrics>('/reports/dashboard'),
        apiRequest<StatusDistribution[]>('/reports/status-distribution'),
        apiRequest<BureauWorkload[]>('/reports/bureau-workload'),
        apiRequest<AgeingBand[]>('/reports/ageing'),
        apiRequest<OverlapFlag[]>('/overlaps?state=POTENTIAL_OVERLAP'),
        apiRequest<Case[]>('/cases?is_overdue=true&limit=5'),
        apiRequest<WorkflowHistory[]>('/reports/recent-activity?limit=6'),
      ]);

      setMetrics(m);
      setStatusDist(s);
      setBureauWorkloads(b);
      setAgeingBands(a);
      setOverlaps(o);
      setOverdueCases(c);
      setRecentActivities(r);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const metricCards = [
    {
      title: 'Total Complaints',
      value: metrics?.total_complaints ?? 0,
      icon: FileText,
      subtitle: 'All-time registered grievances',
      color: 'border-l-blue-600 text-blue-700',
      link: '/complaints',
    },
    {
      title: 'Pending Cases',
      value: metrics?.pending_cases ?? 0,
      icon: Clock,
      subtitle: 'Awaiting officer scrutiny & assignment',
      color: 'border-l-amber-500 text-amber-700',
      link: '/cases?status=Received',
    },
    {
      title: 'Cases Under Process',
      value: metrics?.cases_under_process ?? 0,
      icon: RotateCw,
      subtitle: 'Notices issued & under verification',
      color: 'border-l-indigo-600 text-indigo-700',
      link: '/cases?status=Under%20Verification',
    },
    {
      title: 'Disposed Cases',
      value: metrics?.disposed_cases ?? 0,
      icon: CheckCircle2,
      subtitle: 'Successfully resolved & closed',
      color: 'border-l-emerald-600 text-emerald-700',
      link: '/cases?status=Disposed',
    },
    {
      title: 'Transferred Cases',
      value: metrics?.transferred_cases ?? 0,
      icon: ArrowRightLeft,
      subtitle: 'Inter-bureau transfers',
      color: 'border-l-purple-600 text-purple-700',
      link: '/cases?status=Transferred',
    },
    {
      title: 'Overdue Cases',
      value: metrics?.overdue_cases ?? 0,
      icon: AlertTriangle,
      subtitle: 'Exceeded configured SLA deadline',
      color: 'border-l-red-600 text-red-700',
      link: '/deadlines',
    },
    {
      title: 'Potential Overlaps',
      value: metrics?.potential_overlaps ?? 0,
      icon: GitCompare,
      subtitle: 'Cross-bureau coordination required',
      color: 'border-l-rose-600 text-rose-700 font-bold',
      link: '/coordination',
    },
    {
      title: 'Active Institutions',
      value: metrics?.institutions_with_active_cases ?? 0,
      icon: Building,
      subtitle: 'Institutions with active cases',
      color: 'border-l-slate-600 text-slate-800',
      link: '/institutions',
    },
  ];

  const STATUS_COLORS: Record<string, string> = {
    Received: '#64748B',
    Acknowledged: '#3B82F6',
    'Under Scrutiny': '#6366F1',
    Assigned: '#8B5CF6',
    'Institution Notice Issued': '#F59E0B',
    'Awaiting Response': '#D97706',
    'Under Verification': '#2563EB',
    'Committee Review': '#9333EA',
    'Action Taken': '#059669',
    Disposed: '#16A34A',
    Transferred: '#7C3AED',
    Escalated: '#DC2626',
    Reopened: '#EA580C',
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-md border border-gov-border shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gov-dark">Executive Monitoring Dashboard</h1>
          <p className="text-xs text-gov-muted mt-0.5">
            AICTE Centralized Institution Grievance Status & Cross-Bureau Overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded border border-slate-300 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Metrics
          </button>
          <Link
            to="/complaints/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gov-primary hover:bg-gov-dark text-white text-xs font-semibold rounded shadow-sm transition-colors"
          >
            + Register Grievance
          </Link>
        </div>
      </div>

      {/* MANDATORY PS-264 OVERLAP ALERT BANNER */}
      {metrics && metrics.potential_overlaps > 0 && (
        <div className="bg-red-50 border-2 border-red-500 rounded-md p-4 shadow-sm animate-fade-in">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded bg-red-600 text-white shrink-0 mt-0.5">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-red-900 tracking-wide uppercase">
                  POTENTIAL OVERLAPPING CASES – COORDINATION REQUIRED
                </h3>
                <p className="text-xs text-red-800 mt-1 leading-relaxed">
                  The deterministic overlap engine has identified <strong>{metrics.potential_overlaps} institution(s)</strong> with multiple active cases being processed independently across different Bureaus (such as PGRC and Regulation Bureau). Review is required to coordinate actions and prevent duplicate or conflicting statutory decisions.
                </p>
                {overlaps.length > 0 && (
                  <div className="mt-2 text-xs text-red-900 font-medium">
                    Flagged: <span className="font-bold underline">{overlaps[0].institution_name}</span> ({overlaps[0].permanent_id}) &bull; Bureaus: {overlaps[0].involved_bureaus.join(', ')}
                  </div>
                )}
              </div>
            </div>
            <Link
              to="/coordination"
              className="px-3.5 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded shadow transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              Open Coordination Workspace <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* 8 Summary Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metricCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Link
              key={idx}
              to={card.link}
              className={`bg-white p-4 rounded-md border border-gov-border border-l-4 shadow-sm hover:shadow transition-shadow group ${card.color}`}
            >
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{card.title}</span>
                <Icon className="w-4 h-4 text-slate-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold tracking-tight text-slate-900">{card.value}</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 transition-colors" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1 truncate">{card.subtitle}</p>
            </Link>
          );
        })}
      </div>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Case Status Distribution */}
        <div className="bg-white p-4 rounded-md border border-gov-border shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Case Status Lifecycle
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">Real-time</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusDist} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="status"
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                  tick={{ fontSize: 9, fill: '#64748B' }}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1E293B', color: '#fff', borderRadius: '4px', fontSize: '11px' }}
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {statusDist.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || '#17365D'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Bureau Workload */}
        <div className="bg-white p-4 rounded-md border border-gov-border shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Workload by Bureau / Cell
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">Assigned</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bureauWorkloads} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="bureau_code" tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1E293B', color: '#fff', borderRadius: '4px', fontSize: '11px' }}
                />
                <Bar dataKey="total_assigned" fill="#245A81" name="Assigned Cases" radius={[3, 3, 0, 0]} />
                <Bar dataKey="overdue_count" fill="#DC2626" name="Overdue" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Pending Case Ageing */}
        <div className="bg-white p-4 rounded-md border border-gov-border shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Pending Case Ageing Analysis
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">Age in Days</span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageingBands} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="band" tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1E293B', color: '#fff', borderRadius: '4px', fontSize: '11px' }}
                />
                <Bar dataKey="count" fill="#168C8C" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Actionable Bottom Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Table 1: Overdue Cases & Approaching Deadlines */}
        <div className="bg-white rounded-md border border-gov-border shadow-sm overflow-hidden flex flex-col">
          <div className="p-3.5 bg-slate-50 border-b border-gov-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Overdue & High Priority Cases ({overdueCases.length})
              </h3>
            </div>
            <Link to="/deadlines" className="text-xs text-gov-primary hover:underline font-semibold">
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="gov-table-header">
                <tr>
                  <th className="py-2.5 px-3">Case Ref</th>
                  <th className="py-2.5 px-3">Institution</th>
                  <th className="py-2.5 px-3">Bureau</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overdueCases.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No overdue cases at present
                    </td>
                  </tr>
                ) : (
                  overdueCases.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-semibold text-gov-primary">
                        {c.case_reference}
                      </td>
                      <td className="py-2.5 px-3 truncate max-w-[140px] text-slate-800" title={c.institution_name}>
                        {c.institution_name}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 font-mono text-slate-700">
                          {c.current_bureau_code}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-800">
                          Overdue
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <Link
                          to={`/cases/${c.id}`}
                          className="text-xs text-gov-primary hover:underline font-semibold"
                        >
                          Review &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: Recent Official Workflow Activity */}
        <div className="bg-white rounded-md border border-gov-border shadow-sm overflow-hidden flex flex-col">
          <div className="p-3.5 bg-slate-50 border-b border-gov-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gov-primary" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Recent Official Workflow Activity
              </h3>
            </div>
            <Link to="/audit" className="text-xs text-gov-primary hover:underline font-semibold">
              Audit Logs
            </Link>
          </div>
          <div className="p-3 divide-y divide-slate-100 max-h-72 overflow-y-auto text-xs">
            {recentActivities.length === 0 ? (
              <div className="text-center text-slate-400 py-6">No recent activities recorded</div>
            ) : (
              recentActivities.map((act) => (
                <div key={act.id} className="py-2 flex items-start justify-between gap-3">
                  <div>
                    <span className="font-semibold text-slate-800 block">
                      {act.action_type.replace(/_/g, ' ')}
                    </span>
                    <p className="text-slate-500 text-[11px] line-clamp-1 mt-0.5">{act.remarks}</p>
                    <span className="text-[10px] text-slate-400 font-mono">
                      By {act.performed_by_name || 'System'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0 mt-0.5">
                    {new Date(act.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
