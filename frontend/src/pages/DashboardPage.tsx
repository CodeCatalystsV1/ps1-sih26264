import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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

  const activeCasesCount = (metrics?.pending_cases ?? 0) + (metrics?.cases_under_process ?? 0);
  const pendingCoordinationCount = overlaps.filter(
    (o) => o.relationship_state === 'POTENTIAL_OVERLAP' || o.relationship_state === 'COORDINATION_REQUESTED'
  ).length;

  // 4 Core Executive KPI Indicators
  const executiveKpis = [
    {
      title: 'Total Institutions',
      value: metrics?.institutions_with_active_cases ?? 0,
      icon: Building2,
      subtitle: 'Monitored across AICTE bureaus',
      link: '/institutions',
      iconBg: 'bg-blue-50 text-royal-main border-blue-200',
      valueColor: 'text-royal-navy',
    },
    {
      title: 'Active Cases',
      value: activeCasesCount,
      icon: Briefcase,
      subtitle: `${metrics?.cases_under_process ?? 0} in active verification`,
      link: '/cases',
      iconBg: 'bg-indigo-50 text-royal-deep border-indigo-200',
      valueColor: 'text-royal-navy',
    },
    {
      title: 'Cross-Bureau Overlaps',
      value: metrics?.potential_overlaps ?? 0,
      icon: GitCompare,
      subtitle: `${pendingCoordinationCount} pending inter-bureau review`,
      link: '/coordination',
      iconBg: 'bg-amber-50 text-amber-700 border-amber-200',
      valueColor: 'text-amber-800',
    },
    {
      title: 'Statutory SLA Overdue',
      value: metrics?.overdue_cases ?? 0,
      icon: AlertTriangle,
      subtitle: 'Requires immediate attention',
      link: '/deadlines',
      iconBg: 'bg-rose-50 text-rose-600 border-rose-200',
      valueColor: 'text-rose-700',
    },
  ];

  // Recharts color palette
  const bureauColors: Record<string, string> = {
    PGRC: '#2563EB', // Royal Blue
    RB: '#1E40AF',   // Deep Blue
    AB: '#0D9488',   // Teal
    FB: '#475569',   // Slate
  };

  return (
    <div className="space-y-6">
      {/* Executive Masthead Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-royal-main bg-blue-50 px-3 py-1 rounded-full border border-blue-200 font-mono uppercase tracking-wider inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-royal-main animate-pulse" />
              AICTE Case360+ Executive Portal
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2 tracking-tight">
            Institutional Complaint Monitoring & Multi-Bureau Coordination
          </h1>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Real-time oversight unifying Public Grievance Redressal Cell (PGRC), Regulation Bureau (RB), and Regional Offices. Proactively detects conflicting actions and aligns regulatory dispositions.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            id="refresh-dashboard-btn"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-royal-main' : 'text-slate-500'}`} />
            <span>Refresh</span>
          </button>
          <Link
            to="/coordination"
            className="px-4 py-2 bg-royal-main hover:bg-royal-deep text-white text-xs font-semibold rounded-lg shadow-soft flex items-center gap-1.5 transition-all hover:shadow-elevated"
            id="open-coordination-btn"
          >
            <GitCompare className="w-4 h-4 text-sky-200" />
            <span>Coordination Hub</span>
          </Link>
        </div>
      </div>

      {/* 4 Core KPI Cards */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {executiveKpis.map((kpi, idx) => {
            const Icon = kpi.icon;
            return (
              <Link
                key={idx}
                to={kpi.link}
                className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-soft card-interactive flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-600 truncate pr-1">{kpi.title}</span>
                    <div className={`p-2 rounded-lg border ${kpi.iconBg} shrink-0`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <div className={`text-3xl font-extrabold ${kpi.valueColor} tracking-tight`}>
                    {loading ? '...' : kpi.value}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                  <span className="truncate pr-1">{kpi.subtitle}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-royal-main group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Active Cross-Bureau Overlaps Table */}
      <section className="bg-white rounded-xl border border-slate-200/90 shadow-soft overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200/90 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-royal-main">
              <GitCompare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Active Cross-Bureau Overlaps
              </h2>
              <p className="text-[11px] text-slate-500">
                Simultaneous proceedings across differing AICTE bureaus detected for verified institutions
              </p>
            </div>
          </div>
          <Link
            to="/coordination"
            className="text-xs font-semibold text-royal-main hover:text-royal-deep hover:underline inline-flex items-center gap-1 shrink-0"
          >
            <span>Open Coordination Hub</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50/80 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-5 text-left">Institution Name</th>
                <th className="py-3 px-4 text-left">Permanent ID</th>
                <th className="py-3 px-4 text-left">Involved Bureaus</th>
                <th className="py-3 px-4 text-center">Active Cases</th>
                <th className="py-3 px-4 text-left">Overlap Status</th>
                <th className="py-3 px-4 text-left">Assigned Reviewer</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {overlaps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    No active cross-bureau overlaps currently detected.
                  </td>
                </tr>
              ) : (
                overlaps.map((flag) => {
                  const caseCount = flag.involved_cases?.length ?? 2;
                  return (
                    <tr key={flag.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-3.5 px-5 font-semibold text-slate-900">
                        <Link
                          to={`/institutions/${flag.institution_id}`}
                          className="hover:text-royal-main hover:underline transition-colors"
                        >
                          {flag.institution_name || `Institution #${flag.institution_id}`}
                        </Link>
                        <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                          {flag.institution_state} &bull; {flag.institution_region}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                        {flag.permanent_id || 'N/A'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {flag.involved_bureaus && flag.involved_bureaus.length > 0 ? (
                            flag.involved_bureaus.map((bName: string, bi: number) => (
                              <span
                                key={bi}
                                className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-royal-deep border border-blue-200"
                              >
                                {bName}
                              </span>
                            ))
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                              PGRC + Regulation Bureau
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          {caseCount} Active
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                            flag.relationship_state === 'POTENTIAL_OVERLAP'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : flag.relationship_state === 'CONFIRMED_RELATED'
                              ? 'bg-blue-50 text-royal-deep border border-blue-200'
                              : flag.relationship_state === 'COORDINATION_REQUESTED'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {flag.relationship_state.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {flag.reviewed_by_name || flag.coordination_owner_name || (
                          <span className="text-slate-400 italic">Unassigned (HQ Pool)</span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <Link
                          to="/coordination"
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-royal-main hover:bg-royal-deep rounded-lg transition-all inline-flex items-center gap-1 shadow-xs hover:shadow-soft"
                        >
                          <span>Coordinate</span>
                          <ArrowRight className="w-3 h-3 text-sky-200" />
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

      {/* Visualizations Grid: Bureau Workload & Case Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bureau Workload Chart */}
        <section className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-soft">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-royal-main" />
                <span>Bureau Workload Distribution</span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Active dockets assigned across AICTE administrative cells
              </p>
            </div>
            <Link to="/cases" className="text-xs font-semibold text-royal-main hover:underline">
              View Cases &rarr;
            </Link>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bureauWorkloads} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EFF6FF" />
                <XAxis
                  dataKey="bureau_code"
                  tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} />
                <Tooltip
                  formatter={(val: any) => [`${val} Cases`, 'Workload']}
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '11px',
                    border: '1px solid #1E40AF',
                    boxShadow: '0 10px 25px rgba(37,99,235,0.2)',
                  }}
                />
                <Bar dataKey="total_assigned" name="Assigned Cases" radius={[6, 6, 0, 0]}>
                  {bureauWorkloads.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={bureauColors[entry.bureau_code] || '#2563EB'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-100 text-center">
            {bureauWorkloads.map((b) => (
              <div key={b.bureau_id} className="p-2.5 bg-slate-50/80 rounded-lg border border-slate-200">
                <div className="text-[10px] font-bold text-slate-500 uppercase">{b.bureau_code}</div>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">{b.total_assigned} Total</div>
                <div className="text-[10px] text-royal-main font-medium">{b.pending_count} Active</div>
              </div>
            ))}
          </div>
        </section>

        {/* Case Status Lifecycle */}
        <section className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-soft">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-royal-main" />
                <span>Case Status Lifecycle</span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Official grievance dockets distributed by regulatory processing stage
              </p>
            </div>
            <Link to="/reports" className="text-xs font-semibold text-royal-main hover:underline">
              Detailed Analytics &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200/80">
              <div className="text-[10px] font-bold uppercase text-royal-navy">New Intake / Received</div>
              <div className="text-2xl font-extrabold text-royal-deep mt-1">
                {statusDist.find((s) => s.status === 'Received')?.count ?? 0}
              </div>
              <div className="text-[10px] text-royal-main mt-0.5">Initial scrutiny & logging</div>
            </div>

            <div className="p-3.5 bg-sky-50/60 rounded-xl border border-sky-200/80">
              <div className="text-[10px] font-bold uppercase text-sky-900">Under Investigation</div>
              <div className="text-2xl font-extrabold text-sky-950 mt-1">
                {(statusDist.find((s) => s.status === 'Under Verification')?.count ?? 0) +
                  (statusDist.find((s) => s.status === 'Under Scrutiny')?.count ?? 0)}
              </div>
              <div className="text-[10px] text-sky-700 mt-0.5">Active inquiry & inspection</div>
            </div>

            <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/80">
              <div className="text-[10px] font-bold uppercase text-amber-900">Pending Coordination</div>
              <div className="text-2xl font-extrabold text-amber-950 mt-1">
                {pendingCoordinationCount}
              </div>
              <div className="text-[10px] text-amber-700 mt-0.5">Inter-bureau review</div>
            </div>

            <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200/80">
              <div className="text-[10px] font-bold uppercase text-emerald-900">Disposed / Resolved</div>
              <div className="text-2xl font-extrabold text-emerald-950 mt-1">
                {metrics?.disposed_cases ?? 0}
              </div>
              <div className="text-[10px] text-emerald-700 mt-0.5">Final order issued</div>
            </div>
          </div>

          {/* Overdue Alert Banner */}
          <div className="p-3.5 bg-rose-50/80 border border-rose-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
                <AlertTriangle className="w-4 h-4 shrink-0" />
              </div>
              <div>
                <span className="text-xs font-bold text-rose-900">
                  {metrics?.overdue_cases ?? 0} Cases Currently Overdue Past Statutory SLA
                </span>
                <p className="text-[10px] text-rose-700">Immediate supervisory review recommended</p>
              </div>
            </div>
            <Link
              to="/deadlines"
              className="px-3 py-1.5 text-xs font-semibold text-rose-800 bg-rose-100 hover:bg-rose-200 rounded-lg transition-colors shrink-0"
            >
              Inspect &rarr;
            </Link>
          </div>
        </section>
      </div>

      {/* Recent Regulatory Activity Timeline */}
      <section className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-soft">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50 text-royal-main border border-blue-200">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Recent Regulatory Activity
              </h2>
              <p className="text-[11px] text-slate-500">
                Event sequence captured across case transitions and officer reviews
              </p>
            </div>
          </div>
          <Link to="/audit" className="text-xs font-semibold text-royal-main hover:underline">
            Audit Trail &rarr;
          </Link>
        </div>

        <div className="space-y-3">
          {recentActivities.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">No recent activity recorded yet.</div>
          ) : (
            recentActivities.map((act) => (
              <div
                key={act.id}
                className="p-3.5 bg-slate-50/70 hover:bg-blue-50/30 rounded-xl border border-slate-200/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-royal-main mt-1 shrink-0 ring-4 ring-blue-100" />
                  <div>
                    <span className="font-bold text-slate-900">{act.action_type.replace(/_/g, ' ')}</span>
                    <span className="text-slate-400 mx-2">&bull;</span>
                    <span className="text-slate-700">{act.remarks || 'Administrative action logged'}</span>
                    {act.previous_value && act.new_value && (
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {act.previous_value} &rarr; <span className="text-royal-main font-semibold">{act.new_value}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0 text-[10px] text-slate-500 sm:self-center font-mono">
                  <div className="font-semibold text-slate-700">{act.performed_by_name || 'System Scheduler'}</div>
                  <div className="text-slate-400">
                    {new Date(act.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
