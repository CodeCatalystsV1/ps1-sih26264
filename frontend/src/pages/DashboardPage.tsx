import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client';
import {
  DashboardMetrics,
  StatusDistribution,
  BureauWorkload,
  OverlapFlag,
  Case,
  WorkflowHistory,
} from '../types';
import {
  Building2,
  Briefcase,
  GitCompare,
  AlertTriangle,
  RotateCw,
  Clock,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Shield,
  Layers,
  Activity,
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
  const [overlaps, setOverlaps] = useState<OverlapFlag[]>([]);
  const [overdueCases, setOverdueCases] = useState<Case[]>([]);
  const [recentActivities, setRecentActivities] = useState<WorkflowHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [m, s, b, o, c, r] = await Promise.all([
        apiRequest<DashboardMetrics>('/reports/dashboard'),
        apiRequest<StatusDistribution[]>('/reports/status-distribution'),
        apiRequest<BureauWorkload[]>('/reports/bureau-workload'),
        apiRequest<OverlapFlag[]>('/overlaps'),
        apiRequest<Case[]>('/cases?is_overdue=true&limit=6'),
        apiRequest<WorkflowHistory[]>('/reports/recent-activity?limit=7'),
      ]);

      setMetrics(m);
      setStatusDist(s);
      setBureauWorkloads(b);
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

  // Section A: 6 Executive Overview Indicators using real backend API metrics
  const activeCasesCount = (metrics?.pending_cases ?? 0) + (metrics?.cases_under_process ?? 0);
  const pendingCoordinationCount = overlaps.filter(
    (o) => o.relationship_state === 'POTENTIAL_OVERLAP' || o.relationship_state === 'COORDINATION_REQUESTED'
  ).length;

  const executiveKpis = [
    {
      title: 'Total Institutions',
      value: metrics?.institutions_with_active_cases ?? 0,
      icon: Building2,
      subtitle: `${metrics?.institutions_with_active_cases ?? 0} with active regulatory dockets`,
      link: '/institutions',
      badgeColor: 'text-[#17365D]',
      bgColor: 'bg-blue-50/70',
      borderColor: 'border-blue-200/80',
    },
    {
      title: 'Active Cases',
      value: activeCasesCount,
      icon: Briefcase,
      subtitle: `${metrics?.cases_under_process ?? 0} in formal inquiry / verification`,
      link: '/cases',
      badgeColor: 'text-indigo-800',
      bgColor: 'bg-indigo-50/70',
      borderColor: 'border-indigo-200/80',
    },
    {
      title: 'Potential Overlaps',
      value: metrics?.potential_overlaps ?? 0,
      icon: GitCompare,
      subtitle: 'Simultaneous cross-bureau inquiries',
      link: '/coordination',
      badgeColor: 'text-red-700',
      bgColor: 'bg-red-50/80',
      borderColor: 'border-red-300',
    },
    {
      title: 'Pending Coordination',
      value: pendingCoordinationCount,
      icon: RotateCw,
      subtitle: 'Awaiting joint review & alignment',
      link: '/coordination',
      badgeColor: 'text-amber-800',
      bgColor: 'bg-amber-50/80',
      borderColor: 'border-amber-300',
    },
    {
      title: 'Overdue Cases',
      value: metrics?.overdue_cases ?? 0,
      icon: AlertTriangle,
      subtitle: 'Exceeded statutory disposal SLA',
      link: '/deadlines',
      badgeColor: 'text-rose-800',
      bgColor: 'bg-rose-50/80',
      borderColor: 'border-rose-300',
    },
    {
      title: 'Cases Requiring Attention',
      value: (metrics?.overdue_cases ?? 0) + (metrics?.potential_overlaps ?? 0),
      icon: Clock,
      subtitle: 'Overdue items + pending overlaps',
      link: '/deadlines',
      badgeColor: 'text-teal-900',
      bgColor: 'bg-teal-50/80',
      borderColor: 'border-teal-300',
    },
  ];

  // Colors for Recharts Bureau workload
  const bureauColors: Record<string, string> = {
    PGRC: '#17365D',
    RB: '#0D9488',
    AB: '#B45309',
    FB: '#4338CA',
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded border border-teal-200 font-mono uppercase tracking-wider">
              AICTE Case360+ Executive Portal &bull; SIH PS 26264
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1.5 tracking-tight">
            Institutional Complaint Monitoring & Multi-Bureau Coordination
          </h1>
          <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
            Centralized institution-centric view across Public Grievance Redressal Cell (PGRC), Regulation Bureau (RB), and Regional Offices. Proactively detects cross-bureau inquiry overlaps, flags SLA deadlines, and facilitates coordinated administrative actions.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-600' : ''}`} />
            <span>Refresh Live Data</span>
          </button>
          <Link
            to="/coordination"
            className="px-3.5 py-2 bg-[#102A43] hover:bg-[#17365D] text-white text-xs font-semibold rounded-md shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <GitCompare className="w-3.5 h-3.5 text-teal-400" />
            <span>Coordination Hub</span>
          </Link>
        </div>
      </div>

      {/* SECTION A — Executive Overview (6 Real Backend Metric Cards) */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#17365D]" />
            Section A: Executive Overview & Key Administrative Indicators
          </h2>
          <span className="text-[11px] text-slate-500 font-mono">Real database aggregations</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {executiveKpis.map((kpi, idx) => {
            const Icon = kpi.icon;
            return (
              <Link
                key={idx}
                to={kpi.link}
                className={`p-4 rounded-lg border ${kpi.borderColor} ${kpi.bgColor} hover:shadow-md transition-all group flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-700 truncate">{kpi.title}</span>
                    <Icon className={`w-4 h-4 ${kpi.badgeColor} shrink-0`} />
                  </div>
                  <div className={`text-2xl font-extrabold ${kpi.badgeColor} tracking-tight`}>
                    {loading ? '...' : kpi.value}
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200/60 text-[10px] text-slate-600 flex items-center justify-between">
                  <span className="truncate pr-1">{kpi.subtitle}</span>
                  <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* SECTION B — Cross-Bureau Intelligence Table */}
      <section className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-red-600" />
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Section B: Cross-Bureau Intelligence — Active & Potential Overlaps
              </h2>
              <p className="text-[11px] text-slate-500">
                AICTE Permanent ID verification detects simultaneous active cases across differing Bureaus
              </p>
            </div>
          </div>
          <Link
            to="/coordination"
            className="text-xs font-semibold text-[#17365D] hover:underline flex items-center gap-1"
          >
            Open Full Workspace <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold">
              <tr>
                <th className="py-2.5 px-4 text-left">Institution Name</th>
                <th className="py-2.5 px-4 text-left">AICTE Permanent ID</th>
                <th className="py-2.5 px-4 text-left">Involved Bureaus</th>
                <th className="py-2.5 px-4 text-center">Active Cases</th>
                <th className="py-2.5 px-4 text-left">Overlap Status</th>
                <th className="py-2.5 px-4 text-left">Assigned Reviewer</th>
                <th className="py-2.5 px-4 text-right">Review Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {overlaps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-slate-500">
                    No active cross-bureau overlaps currently detected.
                  </td>
                </tr>
              ) : (
                overlaps.map((flag) => {
                  const caseCount = flag.involved_cases?.length ?? 2;
                  return (
                    <tr key={flag.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <Link
                          to={`/institutions/${flag.institution_id}`}
                          className="hover:text-[#17365D] hover:underline"
                        >
                          {flag.institution_name || `Institution #${flag.institution_id}`}
                        </Link>
                        <div className="text-[10px] text-slate-500 font-normal">
                          {flag.institution_state} &bull; {flag.institution_region}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-700">
                        {flag.permanent_id || 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {flag.involved_bureaus && flag.involved_bureaus.length > 0 ? (
                            flag.involved_bureaus.map((bName: string, bi: number) => (
                              <span
                                key={bi}
                                className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-300"
                              >
                                {bName}
                              </span>
                            ))
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                              PGRC + Regulation Bureau
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800">
                          {caseCount}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                            flag.relationship_state === 'POTENTIAL_OVERLAP'
                              ? 'bg-red-50 text-red-800 border border-red-200'
                              : flag.relationship_state === 'CONFIRMED_RELATED'
                              ? 'bg-purple-50 text-purple-800 border border-purple-200'
                              : flag.relationship_state === 'COORDINATION_REQUESTED'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {flag.relationship_state.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {flag.reviewed_by_name || flag.coordination_owner_name || (
                          <span className="text-slate-400 italic">Unassigned (HQ Pool)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to="/coordination"
                          className="px-2.5 py-1 text-[11px] font-semibold text-white bg-[#102A43] hover:bg-[#17365D] rounded transition-colors inline-flex items-center gap-1 shadow-2xs"
                        >
                          Coordinate <ArrowRight className="w-3 h-3 text-teal-400" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION C & SECTION D: Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION C — Bureau Workload */}
        <section className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-teal-700" />
                Section C: Bureau Workload & Pending Docket Distribution
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Comparison of active inquiry load across AICTE administrative bureaus
              </p>
            </div>
            <Link to="/cases" className="text-xs font-semibold text-[#17365D] hover:underline">
              View All Cases &rarr;
            </Link>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bureauWorkloads} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="bureau_code"
                  tick={{ fontSize: 11, fill: '#475569' }}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} />
                <Tooltip
                  formatter={(val: any) => [`${val} Cases`, 'Workload']}
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '11px',
                    border: 'none',
                  }}
                />
                <Bar dataKey="total_assigned" name="Assigned Cases" radius={[4, 4, 0, 0]}>
                  {bureauWorkloads.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={bureauColors[entry.bureau_code] || '#17365D'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-center">
            {bureauWorkloads.map((b) => (
              <div key={b.bureau_id} className="p-2 bg-slate-50 rounded border border-slate-200">
                <div className="text-[10px] font-bold text-slate-500 uppercase">{b.bureau_code}</div>
                <div className="text-sm font-extrabold text-slate-900 mt-0.5">{b.total_assigned} Total</div>
                <div className="text-[9px] text-slate-500">{b.pending_count} Pending</div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION D — Case Status Monitoring */}
        <section className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-[#17365D]" />
                Section D: Case Status Monitoring & Lifecycle Progression
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Official grievance dockets distributed by regulatory processing stage
              </p>
            </div>
            <Link to="/reports" className="text-xs font-semibold text-[#17365D] hover:underline">
              Detailed Analytics &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 bg-blue-50/80 rounded-md border border-blue-200">
              <div className="text-[10px] font-bold uppercase text-blue-900">New Intake / Received</div>
              <div className="text-xl font-extrabold text-blue-950 mt-1">
                {statusDist.find((s) => s.status === 'Received')?.count ?? 0}
              </div>
              <div className="text-[10px] text-blue-700 mt-0.5">Initial registration & scrutiny</div>
            </div>
            <div className="p-3 bg-teal-50/80 rounded-md border border-teal-200">
              <div className="text-[10px] font-bold uppercase text-teal-900">Under Investigation / Verification</div>
              <div className="text-xl font-extrabold text-teal-950 mt-1">
                {(statusDist.find((s) => s.status === 'Under Verification')?.count ?? 0) +
                  (statusDist.find((s) => s.status === 'Under Scrutiny')?.count ?? 0)}
              </div>
              <div className="text-[10px] text-teal-700 mt-0.5">Institution response verification</div>
            </div>
            <div className="p-3 bg-amber-50/80 rounded-md border border-amber-200">
              <div className="text-[10px] font-bold uppercase text-amber-900">Pending Coordination</div>
              <div className="text-xl font-extrabold text-amber-950 mt-1">
                {pendingCoordinationCount}
              </div>
              <div className="text-[10px] text-amber-700 mt-0.5">Cross-bureau committee review</div>
            </div>
            <div className="p-3 bg-emerald-50/80 rounded-md border border-emerald-200">
              <div className="text-[10px] font-bold uppercase text-emerald-900">Disposed / Resolved</div>
              <div className="text-xl font-extrabold text-emerald-950 mt-1">
                {metrics?.disposed_cases ?? 0}
              </div>
              <div className="text-[10px] text-emerald-700 mt-0.5">Action taken / closure orders</div>
            </div>
          </div>

          {/* Overdue statutory cases quick alert */}
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-md flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
              <div>
                <span className="text-xs font-bold text-rose-900">
                  {metrics?.overdue_cases ?? 0} Cases Currently Overdue Past Configured SLA
                </span>
                <p className="text-[10px] text-rose-700">Immediate supervisor intervention recommended</p>
              </div>
            </div>
            <Link
              to="/deadlines"
              className="px-2.5 py-1 text-[11px] font-semibold text-rose-900 bg-rose-100 hover:bg-rose-200 rounded transition-colors"
            >
              Inspect &rarr;
            </Link>
          </div>
        </section>
      </div>

      {/* SECTION E — Recent Workflow Activity */}
      <section className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#17365D]" />
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Section E: Recent Audit Activity & Inter-Bureau Workflow Stream
              </h2>
              <p className="text-[11px] text-slate-500">
                Live, immutable event log from database workflow history and audit records
              </p>
            </div>
          </div>
          <Link to="/audit" className="text-xs font-semibold text-[#17365D] hover:underline">
            Full Audit Trail &rarr;
          </Link>
        </div>

        <div className="space-y-2.5">
          {recentActivities.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs">No recent activity recorded yet.</div>
          ) : (
            recentActivities.map((act) => (
              <div
                key={act.id}
                className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-md border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors"
              >
                <div className="flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-teal-600 mt-1.5 shrink-0"></span>
                  <div>
                    <span className="font-bold text-slate-900">{act.action_type.replace(/_/g, ' ')}</span>
                    <span className="text-slate-600 mx-1.5">&bull;</span>
                    <span className="text-slate-700">{act.remarks || 'Administrative action logged'}</span>
                    {act.previous_value && act.new_value && (
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {act.previous_value} &rarr; <span className="text-teal-700 font-semibold">{act.new_value}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0 text-[10px] text-slate-500 sm:self-center font-mono">
                  <div>{act.performed_by_name || 'System Scheduler'}</div>
                  <div>{new Date(act.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};
