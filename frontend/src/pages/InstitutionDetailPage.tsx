import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { InstitutionDetail, CaseSimple, ComplaintSimple } from '../types';
import {
  Building,
  MapPin,
  Mail,
  Phone,
  ShieldCheck,
  AlertTriangle,
  GitCompare,
  FileText,
  Briefcase,
  Layers,
  ChevronRight,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

export const InstitutionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [institution, setInstitution] = useState<InstitutionDetail | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'complaints' | 'cases' | 'bureaus' | 'overlaps'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<InstitutionDetail>(`/institutions/${id}`);
      setInstitution(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load institution profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [id]);

  if (loading) {
    return (
      <div className="bg-white p-12 text-center rounded-md border border-gov-border text-slate-400">
        Loading consolidated institution profile...
      </div>
    );
  }

  if (error || !institution) {
    return (
      <div className="bg-red-50 p-6 rounded-md border border-red-200 text-red-700 text-xs">
        {error || 'Institution not found'}
      </div>
    );
  }

  const hasOverlap = institution.overlap_flags && institution.overlap_flags.length > 0;

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <Link to="/" className="hover:text-gov-primary">Dashboard</Link>
        <span>&rsaquo;</span>
        <Link to="/institutions" className="hover:text-gov-primary">Institutions Registry</Link>
        <span>&rsaquo;</span>
        <span className="text-slate-800 font-semibold">{institution.permanent_id}</span>
      </div>

      {/* Consolidated Profile Header */}
      <div className="gov-card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gov-border pb-5">
          <div className="flex items-start gap-4">
            <div className="w-13 h-13 rounded-md bg-gradient-to-br from-gov-primary to-gov-dark text-white flex items-center justify-center shrink-0 shadow-sm border border-slate-600">
              <Building className="w-7 h-7 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-gov-dark">{institution.institution_name}</h1>
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-gov-secondary text-white shadow-xs">
                  {institution.permanent_id}
                </span>
                <span className="gov-badge gov-badge-success">
                  <ShieldCheck className="w-3.5 h-3.5" /> {institution.verification_status}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1.5 flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1 text-slate-700 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {institution.city}, {institution.district}, {institution.state} &bull; PIN: {institution.postal_code}
                </span>
                <span className="text-slate-300">&bull;</span>
                <span>Category: <strong className="text-slate-800">{institution.institution_type}</strong></span>
                <span className="text-slate-300">&bull;</span>
                <span>Jurisdiction: <strong className="text-slate-800">{institution.region?.name || 'Central Head Office'}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              to={`/complaints/new?institution_id=${institution.id}`}
              className="gov-btn gov-btn-primary"
            >
              <span>+ Register Complaint</span>
            </Link>
          </div>
        </div>

        {/* 4 Metric Summary Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-5">
          <div className="p-3.5 bg-slate-50 rounded-md border border-gov-border">
            <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">Total Complaints</span>
            <span className="text-2xl font-bold text-gov-dark font-mono mt-1 block">{institution.total_complaints}</span>
            <span className="text-[10px] text-slate-400">All-time received</span>
          </div>
          <div className="p-3.5 bg-blue-50/50 rounded-md border border-blue-200">
            <span className="text-[11px] font-bold text-gov-info block uppercase tracking-wider">Active Cases</span>
            <span className="text-2xl font-bold text-gov-primary font-mono mt-1 block">{institution.active_cases}</span>
            <span className="text-[10px] text-blue-600/80">Under formal inquiry</span>
          </div>
          <div className="p-3.5 bg-red-50/50 rounded-md border border-red-200">
            <span className="text-[11px] font-bold text-gov-danger block uppercase tracking-wider">Overdue SLA</span>
            <span className="text-2xl font-bold text-red-900 font-mono mt-1 block">{institution.overdue_cases}</span>
            <span className="text-[10px] text-red-600/80">Exceeded statutory limit</span>
          </div>
          <div className={`p-3.5 rounded-md border ${hasOverlap ? 'bg-rose-50/70 border-rose-300' : 'bg-slate-50 border-gov-border'}`}>
            <span className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider">Overlap Advisories</span>
            <span className={`text-2xl font-bold font-mono mt-1 block ${hasOverlap ? 'text-red-900 font-extrabold' : 'text-slate-400'}`}>
              {institution.potential_overlaps}
            </span>
            <span className="text-[10px] text-slate-500">Cross-bureau coordination</span>
          </div>
        </div>
      </div>

      {/* MANDATORY PS-264 OVERLAP ALERT IF PRESENT */}
      {hasOverlap && (
        <div className="bg-red-50/90 border border-red-300 rounded-md p-4.5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-md bg-red-700 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <GitCompare className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <span className="font-bold text-xs uppercase tracking-wider text-red-900 font-mono">
                  STATUTORY ADVISORY &bull; PS-264
                </span>
                <h3 className="text-sm font-bold text-red-950 mt-0.5">
                  Potential Overlapping Proceedings Detected Across Bureaus
                </h3>
                <p className="text-xs text-red-800 mt-1 leading-relaxed">
                  Multiple active cases for verified institution <strong>{institution.institution_name}</strong> ({institution.permanent_id}) are being processed simultaneously by differing Bureaus ({institution.involved_bureaus.join(', ')}). Coordinate with respective handling officers before issuing final statutory orders.
                </p>
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

      {/* Tabs Navigation */}
      <div className="border-b border-gov-border bg-white rounded-t-md px-3">
        <nav className="flex space-x-4 text-xs font-semibold overflow-x-auto">
          {[
            { id: 'overview', label: 'Consolidated Overview', icon: Layers },
            { id: 'complaints', label: `Complaint History (${institution.complaints.length})`, icon: FileText },
            { id: 'cases', label: `Active Official Cases (${institution.cases.length})`, icon: Briefcase },
            { id: 'bureaus', label: `Bureau Involvement (${institution.involved_bureaus.length})`, icon: Building },
            { id: 'overlaps', label: `Overlap Alerts (${institution.overlap_flags.length})`, icon: GitCompare },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-2 border-b-2 font-medium flex items-center gap-2 cursor-pointer transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-gov-primary text-gov-primary font-bold'
                    : 'border-transparent text-slate-500 hover:text-gov-primary hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-md border border-gov-border shadow-sm space-y-4 text-xs">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
              Institutional Profile Details
            </h3>
            <div className="grid grid-cols-2 gap-3 text-slate-600">
              <div>
                <span className="text-slate-400 block text-[11px]">AICTE Permanent ID</span>
                <span className="font-mono font-bold text-slate-900">{institution.permanent_id}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Institution Status</span>
                <span className="font-semibold text-emerald-700">{institution.record_status}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Official Email</span>
                <span className="text-slate-800">{institution.contact_email || 'Not provided'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Official Phone</span>
                <span className="text-slate-800">{institution.contact_phone || 'Not provided'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block text-[11px]">Registered Campus Address</span>
                <span className="text-slate-800">{institution.address}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-md border border-gov-border shadow-sm space-y-4 text-xs">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
              Cross-Bureau Grievance Summary
            </h3>
            <div className="space-y-3">
              <div>
                <span className="text-slate-500 text-[11px] block">Involved Bureaus & Cells:</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {institution.involved_bureaus.length === 0 ? (
                    <span className="text-slate-400">None</span>
                  ) : (
                    institution.involved_bureaus.map((b, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300 font-semibold text-slate-700 text-[11px]">
                        {b}
                      </span>
                    ))
                  )}
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-500 text-[11px] block">Coordination Status:</span>
                {hasOverlap ? (
                  <span className="text-red-700 font-bold block mt-0.5">
                    Action required: Cases currently distributed across multiple bureaus.
                  </span>
                ) : (
                  <span className="text-emerald-700 font-semibold block mt-0.5">
                    No active cross-bureau conflicts detected.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Complaint History */}
      {activeTab === 'complaints' && (
        <div className="bg-white rounded-md border border-gov-border shadow-sm overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-gov-border font-bold text-xs text-slate-800 uppercase">
            All Grievances Registered Against This Institution ({institution.complaints.length})
          </div>
          <table className="w-full text-left text-xs">
            <thead className="gov-table-header">
              <tr>
                <th className="py-2.5 px-3">Complaint Ref</th>
                <th className="py-2.5 px-3">Grievance Title</th>
                <th className="py-2.5 px-3">Complainant Type</th>
                <th className="py-2.5 px-3">Submission Channel</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Received Date</th>
                <th className="py-2.5 px-3 text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {institution.complaints.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400">
                    No complaints registered for this institution
                  </td>
                </tr>
              ) : (
                institution.complaints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-gov-primary">{c.complaint_reference}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{c.title}</td>
                    <td className="py-2.5 px-3">{c.complainant_type}</td>
                    <td className="py-2.5 px-3">{c.source}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-semibold">
                        {c.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">{new Date(c.received_at).toLocaleDateString()}</td>
                    <td className="py-2.5 px-3 text-right">
                      <Link to={`/complaints/${c.id}`} className="text-gov-primary hover:underline font-semibold">
                        Details &rarr;
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Active Cases */}
      {activeTab === 'cases' && (
        <div className="bg-white rounded-md border border-gov-border shadow-sm overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-gov-border font-bold text-xs text-slate-800 uppercase">
            Official Workflow Cases ({institution.cases.length})
          </div>
          <table className="w-full text-left text-xs">
            <thead className="gov-table-header">
              <tr>
                <th className="py-2.5 px-3">Case Ref</th>
                <th className="py-2.5 px-3">Case Title</th>
                <th className="py-2.5 px-3">Handling Bureau</th>
                <th className="py-2.5 px-3">Assigned Officer</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">Deadline</th>
                <th className="py-2.5 px-3 text-right">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {institution.cases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-400">
                    No official cases opened for this institution
                  </td>
                </tr>
              ) : (
                institution.cases.map((cs) => (
                  <tr key={cs.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-gov-primary">{cs.case_reference}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{cs.title}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-700">{cs.current_bureau_name}</td>
                    <td className="py-2.5 px-3 text-slate-600">{cs.assigned_officer_name || 'Unassigned'}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                        {cs.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        cs.priority === 'URGENT' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {cs.priority}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {cs.applicable_deadline_at ? new Date(cs.applicable_deadline_at).toLocaleDateString() : 'Deadline not configured'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Link to={`/cases/${cs.id}`} className="text-gov-primary hover:underline font-semibold">
                        Action &rarr;
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 4: Bureau Involvement */}
      {activeTab === 'bureaus' && (
        <div className="bg-white p-5 rounded-md border border-gov-border shadow-sm text-xs space-y-4">
          <h3 className="font-bold text-slate-800 uppercase tracking-wider">
            All AICTE Bureaus Associated With This Technical Institution
          </h3>
          <p className="text-slate-500">
            PS-264 solves the coordination gap by displaying all Bureaus currently or historically taking regulatory or grievance redressal action for this institution:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {institution.involved_bureaus.map((b, i) => (
              <div key={i} className="p-3 bg-slate-50 rounded border border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-800">{b}</span>
                <span className="text-[11px] text-gov-secondary font-medium">Handling Records</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Overlap Alerts */}
      {activeTab === 'overlaps' && (
        <div className="bg-white p-5 rounded-md border border-gov-border shadow-sm text-xs space-y-4">
          <h3 className="font-bold text-slate-800 uppercase tracking-wider">
            Cross-Bureau Overlap Flags
          </h3>
          {institution.overlap_flags.length === 0 ? (
            <div className="text-center text-slate-400 py-6">
              No cross-bureau overlap alerts recorded for this institution.
            </div>
          ) : (
            institution.overlap_flags.map((flag) => (
              <div key={flag.id} className="p-4 bg-red-50 border border-red-300 rounded-md space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-red-900 text-xs">
                    POTENTIAL OVERLAPPING CASES – COORDINATION REQUIRED
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-200 text-red-900">
                    State: {flag.relationship_state}
                  </span>
                </div>
                <p className="text-slate-700 text-xs">{flag.detection_reason}</p>
                <div className="pt-2 flex justify-end">
                  <Link
                    to="/coordination"
                    className="px-3 py-1.5 bg-gov-primary hover:bg-gov-dark text-white rounded font-semibold text-xs"
                  >
                    Open Coordination Decisions
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
