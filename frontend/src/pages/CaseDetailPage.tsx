import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { CaseDetail, Bureau, User } from '../types';
import {
  Briefcase,
  Building,
  User as UserIcon,
  Clock,
  ArrowRightLeft,
  CheckCircle,
  FileText,
  AlertTriangle,
  GitCompare,
  ArrowLeft,
  X,
  History,
  ShieldCheck,
  Send,
  Calendar,
} from 'lucide-react';

export const CaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [caseItem, setCaseItem] = useState<CaseDetail | null>(null);
  const [bureaus, setBureaus] = useState<Bureau[]>([]);
  const [officers, setOfficers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Form states
  const [newStatus, setNewStatus] = useState('Under Verification');
  const [statusRemarks, setStatusRemarks] = useState('');
  const [nextActionNote, setNextActionNote] = useState('');

  const [actionType, setActionType] = useState('SCRUTINY_NOTE');
  const [actionDetails, setActionDetails] = useState('');

  const [assignOfficerId, setAssignOfficerId] = useState<number>(2);
  const [assignReason, setAssignReason] = useState('');

  const [transferBureauId, setTransferBureauId] = useState<number>(2);
  const [transferReason, setTransferReason] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchCase = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<CaseDetail>(`/cases/${id}`);
      setCaseItem(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load case');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCase();
    apiRequest<Bureau[]>('/admin/bureaus').then(setBureaus).catch(() => {});
    apiRequest<User[]>('/admin/users').then(setOfficers).catch(() => {});
  }, [id]);

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setSubmitting(true);
    try {
      await apiRequest(`/cases/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({
          new_status: newStatus,
          remarks: statusRemarks,
          next_action: nextActionNote,
        }),
      });
      setShowStatusModal(false);
      setStatusRemarks('');
      setNextActionNote('');
      fetchCase();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update status');
    } finally {
      setSubmitting(false);
    }
  };

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setSubmitting(true);
    try {
      await apiRequest(`/cases/${id}/actions`, {
        method: 'POST',
        body: JSON.stringify({
          action_type: actionType,
          action_details: actionDetails,
          next_action: nextActionNote,
        }),
      });
      setShowActionModal(false);
      setActionDetails('');
      setNextActionNote('');
      fetchCase();
    } catch (err: any) {
      setActionError(err.message || 'Failed to record action');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setSubmitting(true);
    try {
      await apiRequest(`/cases/${id}/assignments`, {
        method: 'POST',
        body: JSON.stringify({
          officer_id: assignOfficerId,
          reason: assignReason,
        }),
      });
      setShowAssignModal(false);
      setAssignReason('');
      fetchCase();
    } catch (err: any) {
      setActionError(err.message || 'Failed to assign officer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setSubmitting(true);
    try {
      await apiRequest(`/cases/${id}/transfers`, {
        method: 'POST',
        body: JSON.stringify({
          to_bureau_id: transferBureauId,
          transfer_reason: transferReason,
        }),
      });
      setShowTransferModal(false);
      setTransferReason('');
      fetchCase();
    } catch (err: any) {
      setActionError(err.message || 'Failed to transfer case');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 font-medium">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gov-primary mb-3"></div>
        <p>Loading statutory case dossier...</p>
      </div>
    );
  }

  if (error || !caseItem) {
    return (
      <div className="p-6 bg-red-50 text-red-800 rounded-lg border border-red-200">
        <h3 className="font-bold text-sm">Error Loading Case Record</h3>
        <p className="text-xs mt-1">{error || 'Case record not found in system repository.'}</p>
        <Link to="/cases" className="mt-3 inline-block text-xs font-semibold text-gov-primary hover:underline">
          &larr; Return to Case Registry
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Formal Administrative Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <Link to="/" className="hover:text-gov-primary transition-colors">Portal Home</Link>
        <span className="text-slate-400">/</span>
        <Link to="/cases" className="hover:text-gov-primary transition-colors">Case Dossiers</Link>
        <span className="text-slate-400">/</span>
        <span className="text-slate-800 font-semibold font-mono">{caseItem.case_reference}</span>
      </nav>

      {/* Case Header Card */}
      <div className="gov-card p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-gov-primary px-2.5 py-1 rounded bg-blue-50 border border-blue-200">
                {caseItem.case_reference}
              </span>
              <span className="gov-badge-info font-medium">
                Handling Bureau: <strong>{caseItem.current_bureau_name}</strong>
              </span>
              <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
                caseItem.status.toLowerCase().includes('closed') || caseItem.status.toLowerCase().includes('disposed')
                  ? 'gov-badge-success'
                  : caseItem.status.toLowerCase().includes('notice') || caseItem.status.toLowerCase().includes('review')
                  ? 'gov-badge-warning'
                  : 'gov-badge-neutral'
              }`}>
                Status: {caseItem.status}
              </span>
              <span className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase ${
                caseItem.priority === 'URGENT' ? 'gov-badge-danger' : 'gov-badge-neutral'
              }`}>
                Priority: {caseItem.priority}
              </span>
              {caseItem.has_potential_overlap && (
                <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-amber-500 text-white flex items-center gap-1 shadow-xs">
                  <GitCompare className="w-3.5 h-3.5" /> Overlap Detected
                </span>
              )}
            </div>
            
            <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">{caseItem.title}</h1>
            
            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>Institution: <strong className="text-slate-800">{caseItem.institution_name}</strong></span>
              </span>
              <span className="text-slate-300">&bull;</span>
              <span className="font-mono">Permanent ID: <strong className="text-slate-800">{caseItem.permanent_id}</strong></span>
              <span className="text-slate-300">&bull;</span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Received: <strong>{new Date(caseItem.received_at).toLocaleDateString()}</strong></span>
              </span>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
            <button
              onClick={() => setShowStatusModal(true)}
              className="gov-btn-primary text-xs"
            >
              Update Status
            </button>
            <button
              onClick={() => setShowActionModal(true)}
              className="gov-btn-secondary text-xs"
            >
              Add Action Note
            </button>
            <button
              onClick={() => setShowAssignModal(true)}
              className="gov-btn-secondary text-xs"
            >
              Assign Officer
            </button>
            <button
              onClick={() => setShowTransferModal(true)}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-md font-semibold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" /> Transfer Bureau
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Details & Workflow History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Case Summary, Current Action, Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Action / Next Steps Box */}
          <div className="gov-card p-5 space-y-4">
            <div className="gov-card-header pb-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-gov-primary" />
                Current Handling Stage & Next Actions
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">Last Recorded Action</span>
                <p className="font-semibold text-slate-900 text-sm mt-1">{caseItem.last_action || 'Case registered and initialized'}</p>
                <span className="text-[11px] text-slate-500 block font-mono">
                  Timestamp: {new Date(caseItem.last_action_at).toLocaleString()}
                </span>
              </div>
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-md space-y-1">
                <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wide block">Next Required Administrative Step</span>
                <p className="font-semibold text-blue-950 text-sm mt-1">
                  {caseItem.next_action || 'Grievance verification & competent bureau assignment'}
                </p>
                <span className="text-[11px] text-blue-700 block">
                  Assigned Officer: <strong>{caseItem.current_officer_name || 'Unallocated / In Registry'}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Chronological Workflow History */}
          <div className="gov-card p-5 space-y-4">
            <div className="gov-card-header flex items-center justify-between pb-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <History className="w-4 h-4 text-gov-primary" />
                Chronological Workflow History ({caseItem.workflow_history.length})
              </h3>
              <span className="text-[11px] text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Immutable Statutory Audit Trail
              </span>
            </div>

            <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {caseItem.workflow_history.map((wf) => (
                <div key={wf.id} className="relative">
                  <div className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full bg-gov-primary border-2 border-white shadow-xs" />
                  <div className="bg-slate-50/80 p-3.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-xs tracking-tight">
                        {wf.action_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(wf.created_at).toLocaleString()}
                      </span>
                    </div>
                    {wf.new_value && (
                      <div className="text-xs text-gov-primary font-semibold mt-1">
                        Transitioned to: <span className="underline decoration-slate-300">{wf.new_value}</span>
                      </div>
                    )}
                    {wf.remarks && (
                      <p className="text-slate-700 mt-2 text-xs leading-relaxed whitespace-pre-line bg-white p-2.5 rounded border border-slate-200/80">
                        {wf.remarks}
                      </p>
                    )}
                    <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-2">
                      <UserIcon className="w-3 h-3 text-slate-400" />
                      <span>Action Official: <strong className="text-slate-700">{wf.performed_by_name || 'Competent Authority'}</strong></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Historical Inter-Bureau Transfers */}
          {caseItem.transfers.length > 0 && (
            <div className="gov-card p-5 space-y-4">
              <div className="gov-card-header pb-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-gov-primary" />
                  Inter-Bureau Jurisdiction Transfers ({caseItem.transfers.length})
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {caseItem.transfers.map((t) => (
                  <div key={t.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between font-semibold text-xs text-slate-900">
                      <span className="flex items-center gap-2">
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-medium border border-slate-200">{t.from_bureau_name}</span>
                        <span className="text-slate-400">&rarr;</span>
                        <span className="bg-indigo-50 text-indigo-900 px-2 py-0.5 rounded font-medium border border-indigo-200">{t.to_bureau_name}</span>
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(t.transferred_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-700 text-xs mt-2 bg-slate-50 p-2 rounded border border-slate-200">
                      <strong>Transfer Rationale:</strong> {t.transfer_reason}
                    </p>
                    <div className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-3">
                      <span>Initiator: <strong className="text-slate-700">{t.initiated_by_name || 'Bureau Head'}</strong></span>
                      <span>&bull;</span>
                      <span>Acknowledgment Status: <strong className="text-slate-700">{t.receiving_status}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Institution Details, Deadlines, Related Cases */}
        <div className="space-y-6">
          {/* SLA Deadline Box */}
          <div className="gov-card p-5 space-y-3">
            <div className="gov-card-header pb-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gov-primary" />
                Statutory SLA Timeline
              </h3>
            </div>
            <div className={`p-4 rounded-md border ${
              caseItem.is_overdue
                ? 'bg-red-50 border-red-200 text-red-900'
                : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">Applicable Deadline:</span>
              <span className={`text-lg font-bold block mt-1 font-mono ${
                caseItem.is_overdue ? 'text-red-700' : 'text-slate-900'
              }`}>
                {caseItem.applicable_deadline_at
                  ? new Date(caseItem.applicable_deadline_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })
                  : 'Deadline not configured'}
              </span>
              <div className="mt-3">
                <span className={`inline-block px-2.5 py-1 rounded text-xs font-bold ${
                  caseItem.is_overdue ? 'bg-red-200 text-red-900' : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                }`}>
                  {caseItem.deadline_status_label}
                </span>
              </div>
            </div>
          </div>

          {/* Institutional Dossier Link */}
          <div className="gov-card p-5 space-y-3">
            <div className="gov-card-header pb-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Building className="w-4 h-4 text-gov-primary" />
                Institutional Dossier
              </h3>
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md space-y-1">
              <span className="font-bold text-slate-900 text-sm block">{caseItem.institution_name}</span>
              <span className="font-mono text-xs text-gov-primary font-bold block">
                Permanent ID: {caseItem.permanent_id}
              </span>
              <span className="text-xs text-slate-600 block mt-1">
                Regional Jurisdiction: <strong>{caseItem.institution_region || 'HQ / Central'}</strong>
              </span>
            </div>
            <Link
              to={`/institutions/${caseItem.institution_id}`}
              className="gov-btn-primary w-full text-xs text-center justify-center flex items-center gap-1.5"
            >
              Open Consolidated Institution Profile &rarr;
            </Link>
          </div>

          {/* Related Cases for Same Institution */}
          {caseItem.related_cases && caseItem.related_cases.length > 0 && (
            <div className="gov-card p-5 space-y-3">
              <div className="gov-card-header pb-2">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center justify-between">
                  <span>Cross-Bureau Cases</span>
                  <span className="gov-badge-neutral">{caseItem.related_cases.length}</span>
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {caseItem.related_cases.map((rc) => (
                  <div key={rc.id} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-gov-primary">{rc.case_reference}</span>
                      <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium border border-slate-200">
                        {rc.current_bureau_name}
                      </span>
                    </div>
                    <span className="text-xs text-slate-800 font-medium line-clamp-1 mt-1 block">
                      {rc.title}
                    </span>
                    <div className="mt-1.5 flex items-center justify-between text-xs">
                      <span className="text-slate-500 text-[11px]">Status: {rc.status}</span>
                      <Link to={`/cases/${rc.id}`} className="text-gov-primary hover:underline font-semibold text-[11px]">
                        Inspect Dossier &rarr;
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal 1: Update Status */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="gov-modal max-w-lg w-full p-6 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-gov-primary" />
                Update Statutory Case Status
              </h3>
              <button onClick={() => setShowStatusModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            {actionError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-md">
                {actionError}
              </div>
            )}
            <form onSubmit={handleStatusSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Administrative Status *</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="gov-select"
                >
                  <option value="Acknowledged">Acknowledged</option>
                  <option value="Under Scrutiny">Under Scrutiny</option>
                  <option value="Assigned">Assigned</option>
                  <option value="Institution Notice Issued">Institution Notice Issued</option>
                  <option value="Awaiting Response">Awaiting Response</option>
                  <option value="Under Verification">Under Verification</option>
                  <option value="Committee Review">Committee Review</option>
                  <option value="Action Taken">Action Taken</option>
                  <option value="Disposed">Disposed / Resolved</option>
                  <option value="Closed – Action Taken">Closed – Action Taken</option>
                  <option value="Closed – No Action Required">Closed – No Action Required</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Official Justification / Status Remarks *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Record official findings, committee decisions, or notice reference..."
                  value={statusRemarks}
                  onChange={(e) => setStatusRemarks(e.target.value)}
                  className="gov-input"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Next Action Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Schedule hearing before Standing Inquiry Committee"
                  value={nextActionNote}
                  onChange={(e) => setNextActionNote(e.target.value)}
                  className="gov-input"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="gov-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="gov-btn-primary"
                >
                  {submitting ? 'Updating Status...' : 'Commit Status Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Add Action Note */}
      {showActionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="gov-modal max-w-lg w-full p-6 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <FileText className="w-4 h-4 text-gov-primary" />
                Record Administrative Action Note
              </h3>
              <button onClick={() => setShowActionModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            {actionError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-md">
                {actionError}
              </div>
            )}
            <form onSubmit={handleActionSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Action Category *</label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="gov-select"
                >
                  <option value="SCRUTINY_NOTE">Scrutiny Note</option>
                  <option value="EVIDENCE_VERIFIED">Evidence Verified</option>
                  <option value="HEARING_CONDUCTED">Hearing Conducted</option>
                  <option value="NOTICE_ISSUED">Statutory Notice Issued</option>
                  <option value="INSTITUTION_EXPLANATION_RECEIVED">Institution Explanation Received</option>
                  <option value="COMMITTEE_RECOMMENDATION">Committee Recommendation</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Action Record Details *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Record summary of action taken by official or committee..."
                  value={actionDetails}
                  onChange={(e) => setActionDetails(e.target.value)}
                  className="gov-input"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowActionModal(false)}
                  className="gov-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="gov-btn-primary"
                >
                  {submitting ? 'Recording Note...' : 'Record Action Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Assign Officer */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="gov-modal max-w-lg w-full p-6 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-gov-primary" />
                Assign / Reassign Case Officer
              </h3>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            {actionError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-md">
                {actionError}
              </div>
            )}
            <form onSubmit={handleAssignSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Eligible Handling Officer *</label>
                <select
                  value={assignOfficerId}
                  onChange={(e) => setAssignOfficerId(parseInt(e.target.value))}
                  className="gov-select"
                >
                  {officers.map((off) => (
                    <option key={off.id} value={off.id}>
                      {off.display_name} ({off.roles?.[0]?.name || 'Desk Officer'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Assignment Order / Statutory Directive *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Specify task scope, investigative directives, or reasons for reallocation..."
                  value={assignReason}
                  onChange={(e) => setAssignReason(e.target.value)}
                  className="gov-input"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="gov-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="gov-btn-primary"
                >
                  {submitting ? 'Assigning Officer...' : 'Issue Assignment Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Inter-Bureau Transfer */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="gov-modal max-w-lg w-full p-6 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-indigo-700" />
                Inter-Bureau Statutory Transfer
              </h3>
              <button onClick={() => setShowTransferModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            {actionError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-md">
                {actionError}
              </div>
            )}
            <form onSubmit={handleTransferSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Destination AICTE Bureau / Cell *
                </label>
                <select
                  value={transferBureauId}
                  onChange={(e) => setTransferBureauId(parseInt(e.target.value))}
                  className="gov-select"
                >
                  {bureaus
                    .filter((b) => b.id !== caseItem.current_bureau_id)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Transfer Rationale / Statutory Jurisdiction Justification *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Explain why this matter falls under the statutory mandate of the destination Bureau..."
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="gov-input"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="gov-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="gov-btn-primary bg-indigo-700 hover:bg-indigo-800"
                >
                  {submitting ? 'Transferring Case...' : 'Authorize Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
