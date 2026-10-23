import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { Case, SLARule } from '../types';
import { AlertTriangle, Clock, ShieldCheck, CheckCircle2, RefreshCw, ExternalLink } from 'lucide-react';

export const AlertsDeadlinesPage: React.FC = () => {
  const [overdueCases, setOverdueCases] = useState<Case[]>([]);
  const [allCases, setAllCases] = useState<Case[]>([]);
  const [slaRules, setSlaRules] = useState<SLARule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [casesData, rulesData] = await Promise.all([
        apiRequest<Case[]>('/cases?limit=100'),
        apiRequest<SLARule[]>('/admin/sla-rules'),
      ]);

      const overdue = casesData.filter((c) => c.is_overdue);
      setOverdueCases(overdue);
      setAllCases(casesData);
      setSlaRules(rulesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const approachingCases = allCases.filter(
    (c) => !c.is_overdue && c.days_remaining !== null && c.days_remaining !== undefined && c.days_remaining >= 0 && c.days_remaining <= 5
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-md border border-gov-border shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gov-dark">Alerts & SLA Deadline Monitoring</h1>
          <p className="text-xs text-gov-muted mt-0.5">
            Automated monitoring of approaching statutory deadlines and overdue institutional cases
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded border border-slate-300 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Deadlines
        </button>
      </div>

      {/* Summary Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-red-50 border border-red-300 rounded-md">
          <div className="flex items-center justify-between text-red-700">
            <span className="text-xs font-bold uppercase tracking-wider">Overdue Cases</span>
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-2xl font-black text-red-900 mt-2">{overdueCases.length}</div>
          <p className="text-[11px] text-red-700 mt-0.5">Exceeded configured SLA duration</p>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-300 rounded-md">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-bold uppercase tracking-wider">Approaching Deadlines</span>
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-900 mt-2">{approachingCases.length}</div>
          <p className="text-[11px] text-amber-700 mt-0.5">&le; 5 days remaining before breach</p>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-300 rounded-md">
          <div className="flex items-center justify-between text-slate-700">
            <span className="text-xs font-bold uppercase tracking-wider">Configured SLA Rules</span>
            <ShieldCheck className="w-5 h-5 text-slate-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{slaRules.length}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Editable by administrators</p>
        </div>
      </div>

      {/* Overdue Cases Table */}
      <div className="bg-white rounded-md border border-gov-border shadow-sm overflow-hidden">
        <div className="p-3 bg-red-50/70 border-b border-red-200 flex items-center justify-between">
          <span className="font-bold text-xs text-red-900 uppercase tracking-wide flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-red-600" /> Overdue Cases Requiring Immediate Escalation ({overdueCases.length})
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="gov-table-header">
              <tr>
                <th className="py-2.5 px-3">Case Ref</th>
                <th className="py-2.5 px-3">Institution & Permanent ID</th>
                <th className="py-2.5 px-3">Handling Bureau</th>
                <th className="py-2.5 px-3">Assigned Officer</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Deadline Date</th>
                <th className="py-2.5 px-3 text-red-700">Overdue Duration</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {overdueCases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-400">
                    No cases are overdue past deadline.
                  </td>
                </tr>
              ) : (
                overdueCases.map((c) => (
                  <tr key={c.id} className="hover:bg-red-50/40">
                    <td className="py-2.5 px-3 font-mono font-bold text-gov-primary">{c.case_reference}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900">{c.institution_name}</div>
                      <span className="font-mono text-[10px] text-gov-secondary font-bold">{c.permanent_id}</span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-700">{c.current_bureau_code}</td>
                    <td className="py-2.5 px-3 text-slate-700">{c.current_officer_name || 'Unassigned'}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-800">
                        {c.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {c.applicable_deadline_at ? new Date(c.applicable_deadline_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-red-700">
                      {c.deadline_status_label}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Link to={`/cases/${c.id}`} className="text-gov-primary hover:underline font-semibold">
                        Expedite &rarr;
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approaching Deadlines Table */}
      <div className="bg-white rounded-md border border-gov-border shadow-sm overflow-hidden">
        <div className="p-3 bg-amber-50/60 border-b border-amber-200">
          <span className="font-bold text-xs text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-600" /> Approaching Deadlines Within 5 Days ({approachingCases.length})
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="gov-table-header">
              <tr>
                <th className="py-2.5 px-3">Case Ref</th>
                <th className="py-2.5 px-3">Institution & Perm ID</th>
                <th className="py-2.5 px-3">Bureau</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Deadline Date</th>
                <th className="py-2.5 px-3 text-amber-800">Days Remaining</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {approachingCases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400">
                    No cases with deadlines expiring in the next 5 days.
                  </td>
                </tr>
              ) : (
                approachingCases.map((c) => (
                  <tr key={c.id} className="hover:bg-amber-50/30">
                    <td className="py-2.5 px-3 font-mono font-bold text-gov-primary">{c.case_reference}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{c.institution_name}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-700">{c.current_bureau_code}</td>
                    <td className="py-2.5 px-3">{c.status}</td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {c.applicable_deadline_at ? new Date(c.applicable_deadline_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-amber-800">
                      {c.days_remaining} day(s) left
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Link to={`/cases/${c.id}`} className="text-gov-primary hover:underline font-semibold">
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

      {/* Configurable SLA Rules Table */}
      <div className="bg-white rounded-md border border-gov-border shadow-sm overflow-hidden text-xs">
        <div className="p-3 bg-slate-50 border-b border-gov-border flex items-center justify-between">
          <span className="font-bold text-slate-800 uppercase tracking-wide">
            Configured AICTE SLA & Target Disposal Rules
          </span>
          <span className="text-[11px] text-slate-500">
            Rule 6 Compliance: Only configured rules generate deadlines
          </span>
        </div>
        <table className="w-full text-left">
          <thead className="gov-table-header">
            <tr>
              <th className="py-2.5 px-3">Rule Name</th>
              <th className="py-2.5 px-3">Target Bureau</th>
              <th className="py-2.5 px-3">Grievance Category</th>
              <th className="py-2.5 px-3 text-center">Duration (Days)</th>
              <th className="py-2.5 px-3 text-center">Reminder Threshold</th>
              <th className="py-2.5 px-3 text-center">Escalation Threshold</th>
              <th className="py-2.5 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {slaRules.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="py-2.5 px-3 font-semibold text-slate-900">{r.rule_name}</td>
                <td className="py-2.5 px-3 text-slate-600">{r.bureau_name}</td>
                <td className="py-2.5 px-3 text-slate-600">{r.category_name}</td>
                <td className="py-2.5 px-3 text-center font-bold text-slate-800">{r.duration_days} days</td>
                <td className="py-2.5 px-3 text-center text-slate-600">{r.reminder_threshold_days} days prior</td>
                <td className="py-2.5 px-3 text-center text-slate-600">+{r.escalation_threshold_days} days overdue</td>
                <td className="py-2.5 px-3 text-center">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                    Active
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
