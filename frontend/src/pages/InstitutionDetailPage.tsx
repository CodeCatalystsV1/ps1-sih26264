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
      {/* Consolidated Profile Header */}
      <div className="bg-white rounded-md border border-gov-border shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-lg bg-gov-primary text-white flex items-center justify-center shrink-0 shadow-inner">
              <Building className="w-8 h-8 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900">{institution.institution_name}</h1>
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-gov-secondary text-white">
                  Permanent ID: {institution.permanent_id}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> {institution.verification_status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {institution.city}, {institution.district}, {institution.state} ({institution.postal_code})
                </span>
                <span>&bull;</span>
                <span>Type: <strong>{institution.institution_type}</strong></span>
                <span>&bull;</span>
                <span>Region: <strong>{institution.region?.name || 'Regional Office'}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to={`/complaints/new?institution_id=${institution.id}`}
              className="px-3 py-1.5 bg-gov-primary hover:bg-gov-dark text-white rounded text-xs font-semibold shadow-sm transition-colors"
            >
              + Register Complaint
            </Link>
          </div>
        </div>

        {/* 4 Metric Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 block uppercase">Total Complaints</span>
            <span className="text-xl font-bold text-slate-900">{institution.total_complaints}</span>
          </div>
          <div className="p-3 bg-blue-50/50 rounded border border-blue-200">
            <span className="text-[11px] font-semibold text-blue-700 block uppercase">Active Cases</span>
            <span className="text-xl font-bold text-blue-900">{institution.active_cases}</span>
          </div>
          <div className="p-3 bg-red-50/50 rounded border border-red-200">
            <span className="text-[11px] font-semibold text-red-700 block uppercase">Overdue Cases</span>
            <span className="text-xl font-bold text-red-900">{institution.overdue_cases}</span>
          </div>
          <div className={`p-3 rounded border ${hasOverlap ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[11px] font-semibold text-amber-800 block uppercase">Cross-Bureau Overlaps</span>
            <span className={`text-xl font-bold ${hasOverlap ? 'text-amber-900 font-extrabold' : 'text-slate-400'}`}>
              {institution.potential_overlaps}
            </span>
          </div>
        </div>
      </div>

      {/* MANDATORY PS-264 OVERLAP ALERT IF PRESENT */}
      {hasOverlap && (
        <div className="bg-red-50 border-2 border-red-500 rounded-md p-4 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded bg-red-600 text-white shrink-0 mt-0.5">
                <GitCompare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-red-900 tracking-wide uppercase">
                  POTENTIAL OVERLAPPING CASES – COORDINATION REQUIRED
                </h3>
                <p className="text-xs text-red-800 mt-1 leading-relaxed">
                  Two or more active cases for verified institution <strong>{institution.institution_name}</strong> ({institution.permanent_id}) are currently being handled by differing Bureaus ({institution.involved_bureaus.join(', ')}). Coordinate with the respective handling officers before taking final administrative action.
                </p>
              </div>
            </div>
            <Link
              to="/coordination"
              className="px-3.5 py-1.5 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded shadow transition-colors shrink-0"
            >
              Open Coordination Workspace
            </Link>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="border-b border-gov-border">
        <nav className="flex space-x-6 text-xs font-semibold">
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
                className={`py-3 px-1 border-b-2 font-medium flex items-center gap-2 cursor-pointer transition-colors ${
                  isActive
                    ? 'border-gov-primary text-gov-primary font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
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
