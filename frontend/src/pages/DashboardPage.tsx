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
  Shield,
  Layers,
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
  Legend,
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
      subtitle: 'All grievances received & cataloged',
      link: '/complaints',
      accentColor: 'text-[#17365D]',
      bgColor: 'bg-blue-50/50',
    },
    {
      title: 'Pending In Scrutiny',
      value: metrics?.pending_cases ?? 0,
      icon: Clock,
      subtitle: 'Awaiting officer scrutiny & assignment',
      link: '/cases?status=Received',
      accentColor: 'text-[#B7791F]',
      bgColor: 'bg-amber-50/50',
    },
    {
      title: 'Cases Under Process',
      value: metrics?.cases_under_process ?? 0,
      icon: RotateCw,
      subtitle: 'Active inquiry & notice verification',
      link: '/cases?status=Under%20Verification',
      accentColor: 'text-[#245A81]',
      bgColor: 'bg-sky-50/50',
    },
    {
      title: 'Disposed / Resolved',
      value: metrics?.disposed_cases ?? 0,
      icon: CheckCircle2,
      subtitle: 'Final statutory orders passed',
      link: '/cases?status=Disposed',
      accentColor: 'text-[#218653]',
      bgColor: 'bg-emerald-50/50',
    },
    {
      title: 'Inter-Bureau Transfers',
      value: metrics?.transferred_cases ?? 0,
      icon: ArrowRightLeft,
      subtitle: 'Jurisdiction reassignments executed',
      link: '/cases?status=Transferred',
      accentColor: 'text-[#168C8C]',
      bgColor: 'bg-teal-50/50',
    },
    {
      title: 'Overdue SLA Cases',
      value: metrics?.overdue_cases ?? 0,
      icon: AlertTriangle,
      subtitle: 'Breached configured statutory SLA',
      link: '/deadlines',
      accentColor: 'text-[#C0392B]',
      bgColor: 'bg-rose-50/50',
      isCritical: (metrics?.overdue_cases ?? 0) > 0,
    },
    {
      title: 'Potential Overlaps',
      value: metrics?.potential_overlaps ?? 0,
      icon: GitCompare,
      subtitle: 'Parallel active bureau proceedings',
      link: '/coordination',
      accentColor: 'text-[#C0392B]',
      bgColor: 'bg-red-50/50',
      isCritical: (metrics?.potential_overlaps ?? 0) > 0,
    },
    {
      title: 'Active Institutions',
      value: metrics?.institutions_with_active_cases ?? 0,
      icon: Building,
      subtitle: 'Approved institutes under current inquiry',
      link: '/institutions',
      accentColor: 'text-slate-700',
      bgColor: 'bg-slate-50',
    },
  ];

  const STATUS_COLORS: Record<string, string> = {
    Received: '#64748B',
    Acknowledged: '#2874A6',
    'Under Scrutiny': '#17365D',
    Assigned: '#245A81',
    'Institution Notice Issued': '#B7791F',
    'Awaiting Response': '#D97706',
    'Under Verification': '#168C8C',
    'Committee Review': '#5B21B6',
    'Action Taken': '#218653',
    Disposed: '#15803D',
    Transferred: '#0284C7',
    Escalated: '#C0392B',
  };

  return (
    <div className="space-y-6">
      {/* Page Header Banner */}
      <div className="gov-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                AICTE ICMS EXECUTIVE PORTAL
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gov-dark mt-1">
              Executive Grievance Monitoring & Coordination
            </h1>
            <p className="text-xs text-gov-muted mt-1 max-w-3xl">
              Centralized administrative visibility into institution grievances, bureau workloads, statutory SLA compliance, and cross-bureau overlap detection across all AICTE regional jurisdictions.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="gov-btn gov-btn-secondary"
              title="Refresh all metrics from the database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Metrics</span>
            </button>
            <Link
              to="/complaints/new"
              className="gov-btn gov-btn-primary"
            >
              <span>+ Register New Grievance</span>
            </Link>
          </div>
        </div>
      </div>

      {/* MANDATORY SIH PS-264 STATUTORY OVERLAP ADVISORY BANNER */}
      {metrics && metrics.potential_overlaps > 0 && (
        <div className="bg-red-50/90 border border-red-300 rounded-md p-4.5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-md bg-red-700 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <ShieldAlert className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-xs uppercase tracking-wider text-red-900 font-mono">
                    STATUTORY ADVISORY &bull; PS-264
                  </span>
                  <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-red-700 text-white">
                    {metrics.potential_overlaps} Overlap Detected
                  </span>
                </div>
                <h3 className="text-sm font-bold text-red-950 mt-1">
                  Potential Inter-Bureau Overlapping Cases Requiring Formal Coordination
                </h3>
                <p className="text-xs text-red-800 mt-1 leading-relaxed max-w-4xl">
                  The deterministic overlap engine detected multiple active cases being processed independently across different Bureaus (such as PGRC and Regulation Bureau) for the same approved institution. Action is required to avoid duplicated inquiries and conflicting statutory directives.
                </p>
                {overlaps.length > 0 && (
                  <div className="mt-2.5 flex items-center gap-2 text-xs text-red-900 flex-wrap">
                    <span className="font-semibold text-slate-700">Flagged Institution:</span>
                    <span className="font-bold underline text-red-900">{overlaps[0].institution_name}</span>
                    <span className="font-mono text-[11px] text-slate-600">({overlaps[0].permanent_id})</span>
                    <span className="text-slate-400">&bull;</span>
                    <span className="text-slate-700">Involved Bureaus:</span>
                    <span className="font-semibold text-red-900">{overlaps[0].involved_bureaus.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>

            <Link
              to="/coordination"
              className="gov-btn gov-btn-danger shrink-0 whitespace-nowrap self-start md:self-center"
            >
              <span>Open Coordination Workspace</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* 8 Primary Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metricCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Link
              key={idx}
              to={card.link}
              className={`gov-card p-4 hover:border-gov-primary/50 transition-all group flex flex-col justify-between ${
                card.isCritical ? 'border-red-300 bg-red-50/20' : ''
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    {card.title}
                  </span>
                  <div className={`p-1.5 rounded-md ${card.bgColor} ${card.accentColor}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>

                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl font-bold tracking-tight text-gov-dark font-mono">
                    {card.value}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-gov-primary transition-colors" />
                </div>
              </div>

              <p className="text-[11px] text-slate-500 mt-2.5 pt-2 border-t border-slate-100 leading-tight">
                {card.subtitle}
              </p>
            </Link>
          );
        })}
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Case Status Lifecycle */}
        <div className="gov-card flex flex-col">
          <div className="gov-card-header">
            <span className="font-bold text-gov-dark uppercase tracking-wider text-[11px]">
              Case Status Lifecycle Distribution
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Real-time</span>
          </div>
          <div className="p-4 flex-1 flex flex-col justify-between">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusDist} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E9EFF5" />
                  <XAxis
                    dataKey="status"
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                    tick={{ fontSize: 9, fill: '#475569' }}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#102A43',
                      borderColor: '#17365D',
                      color: '#FFFFFF',
                      borderRadius: '4px',
                      fontSize: '11px',
                    }}
                  />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                    {statusDist.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || '#17365D'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="text-[11px] text-slate-500 text-center border-t border-slate-100 pt-2 mt-2">
              Distribution across active grievance workflow stages
            </div>
          </div>
        </div>

        {/* Chart 2: Bureau Workload */}
        <div className="gov-card flex flex-col">
          <div className="gov-card-header">
            <span className="font-bold text-gov-dark uppercase tracking-wider text-[11px]">
              Workload by Bureau / Operating Cell
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Assigned vs Overdue</span>
          </div>
          <div className="p-4 flex-1 flex flex-col justify-between">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bureauWorkloads} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E9EFF5" />
                  <XAxis dataKey="bureau_code" tick={{ fontSize: 10, fill: '#475569' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#102A43',
                      borderColor: '#17365D',
                      color: '#FFFFFF',
                      borderRadius: '4px',
                      fontSize: '11px',
                    }}
                  />
                  <Bar dataKey="total_assigned" fill="#17365D" name="Assigned Cases" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="overdue_count" fill="#C0392B" name="Overdue" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-4 text-[11px] text-slate-600 border-t border-slate-100 pt-2 mt-2">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#17365D]"></span> Active Assigned
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#C0392B]"></span> Overdue SLA
              </span>
            </div>
          </div>
        </div>

        {/* Chart 3: Pending Case Ageing */}
        <div className="gov-card flex flex-col">
          <div className="gov-card-header">
            <span className="font-bold text-gov-dark uppercase tracking-wider text-[11px]">
              Pending Case Ageing Analysis
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Age in Days</span>
          </div>
          <div className="p-4 flex-1 flex flex-col justify-between">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageingBands} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E9EFF5" />
                  <XAxis dataKey="band" tick={{ fontSize: 10, fill: '#475569' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748B' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#102A43',
                      borderColor: '#17365D',
                      color: '#FFFFFF',
                      borderRadius: '4px',
                      fontSize: '11px',
                    }}
                  />
                  <Bar dataKey="count" fill="#168C8C" name="Cases" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="text-[11px] text-slate-500 text-center border-t border-slate-100 pt-2 mt-2">
              Case duration distribution from initial receipt
            </div>
          </div>
        </div>
      </div>

      {/* Actionable Administrative Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Table 1: Overdue Cases Requiring Attention */}
        <div className="gov-table-container flex flex-col">
          <div className="gov-card-header">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-gov-danger" />
              <span className="font-bold text-gov-dark uppercase tracking-wider text-[11px]">
                Overdue Cases Requiring Immediate Escalation ({overdueCases.length})
              </span>
            </div>
            <Link to="/deadlines" className="text-xs text-gov-primary hover:text-gov-secondary font-semibold hover:underline">
              View All Deadlines &rarr;
            </Link>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="gov-table-header">
                <tr>
                  <th className="py-2.5 px-3">Case Ref</th>
                  <th className="py-2.5 px-3">Institution Name</th>
                  <th className="py-2.5 px-3">Bureau</th>
                  <th className="py-2.5 px-3">SLA Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overdueCases.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No overdue cases at present
                    </td>
                  </tr>
                ) : (
                  overdueCases.map((c) => (
                    <tr key={c.id} className="gov-table-row">
                      <td className="py-2.5 px-3 font-mono font-bold text-gov-primary whitespace-nowrap">
                        {c.case_reference}
                      </td>
                      <td className="py-2.5 px-3 text-slate-800 font-medium">
                        <div className="truncate max-w-[200px]" title={c.institution_name}>
                          {c.institution_name}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">{c.permanent_id}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 font-mono font-semibold text-slate-700 border border-slate-200">
                          {c.current_bureau_code}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="gov-badge gov-badge-danger">
                          Overdue
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
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

        {/* Table 2: Recent Official Workflow Activity Log */}
        <div className="gov-table-container flex flex-col">
          <div className="gov-card-header">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gov-primary" />
              <span className="font-bold text-gov-dark uppercase tracking-wider text-[11px]">
                Recent Official Workflow Actions
              </span>
            </div>
            <Link to="/audit" className="text-xs text-gov-primary hover:text-gov-secondary font-semibold hover:underline">
              View Audit Logs &rarr;
            </Link>
          </div>

          <div className="p-3 divide-y divide-slate-100 max-h-80 overflow-y-auto text-xs">
            {recentActivities.length === 0 ? (
              <div className="text-center text-slate-400 py-8">No recent workflow activity recorded</div>
            ) : (
              recentActivities.map((act) => (
                <div key={act.id} className="py-2.5 flex items-start justify-between gap-3 hover:bg-slate-50/60 px-1 rounded transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 capitalize text-xs">
                        {act.action_type.toLowerCase().replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-0.5 line-clamp-1 leading-relaxed">
                      {act.remarks || 'Standard workflow transition recorded'}
                    </p>
                    <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                      <span>Action by:</span>
                      <span className="font-medium text-slate-700">{act.performed_by_name || 'Authorized Official'}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap shrink-0 mt-0.5">
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

