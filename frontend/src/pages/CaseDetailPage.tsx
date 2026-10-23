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
    return <div className="p-12 text-center text-slate-400">Loading case file...</div>;
  }

  if (error || !caseItem) {
    return <div className="p-6 bg-red-50 text-red-700 rounded border border-red-200">{error || 'Case not found'}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Back link & Header */}
      <div>
        <Link to="/cases" className="text-xs text-slate-500 hover:text-gov-primary flex items-center gap-1 mb-2 font-medium">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Cases List
        </Link>
        <div className="bg-white p-5 rounded-md border border-gov-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-base font-bold text-gov-primary px-2.5 py-0.5 rounded bg-blue-50 border border-blue-200">
                {caseItem.case_reference}
              </span>
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-gov-secondary text-white">
                Handling Bureau: {caseItem.current_bureau_name}
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                Status: {caseItem.status}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                caseItem.priority === 'URGENT' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'
              }`}>
                Priority: {caseItem.priority}
              </span>
              {caseItem.has_potential_overlap && (
                <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-red-600 text-white flex items-center gap-1">
                  <GitCompare className="w-3.5 h-3.5" /> Overlap Detected
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-2">{caseItem.title}</h1>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-3">
              <span>Institution: <strong>{caseItem.institution_name}</strong></span>
              <span>&bull;</span>
              <span className="font-mono">Permanent ID: <strong>{caseItem.permanent_id}</strong></span>
              <span>&bull;</span>
              <span>Received: {new Date(caseItem.received_at).toLocaleDateString()}</span>
            </p>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setShowStatusModal(true)}
              className="px-3 py-1.5 bg-gov-primary hover:bg-gov-dark text-white rounded text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              Update Status
            </button>
            <button
              onClick={() => setShowActionModal(true)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold border border-slate-300 transition-colors cursor-pointer"
            >
              Add Action Note
            </button>
            <button
              onClick={() => setShowAssignModal(true)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold border border-slate-300 transition-colors cursor-pointer"
            >
              Assign Officer
            </button>
            <button
              onClick={() => setShowTransferModal(true)}
              className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded text-xs font-semibold border border-purple-300 transition-colors cursor-pointer flex items-center gap-1"
            >
              <ArrowRightLeft className="w-3 h-3" /> Transfer Bureau
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Details & Workflow History */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Case Summary, Current Action, Transfers */}
        <div className="md:col-span-2 space-y-6">
          {/* Action / Next Steps Box */}
          <div className="bg-white p-5 rounded-md border border-gov-border shadow-sm space-y-3 text-xs">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
              Current Handling Stage & Next Actions
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                <span className="text-[11px] font-semibold text-slate-500 uppercase block">Last Recorded Action</span>
                <p className="font-medium text-slate-800 mt-1">{caseItem.last_action || 'Case opened'}</p>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Date: {new Date(caseItem.last_action_at).toLocaleString()}
                </span>
              </div>
              <div className="p-3 bg-blue-50/50 border border-blue-200 rounded">
                <span className="text-[11px] font-semibold text-blue-700 uppercase block">Next Required Action</span>
                <p className="font-medium text-blue-900 mt-1">
                  {caseItem.next_action || 'Officer allocation & grievance verification'}
                </p>
                <span className="text-[10px] text-blue-600/80 mt-1 block">
                  Assigned Officer: {caseItem.current_officer_name || 'Unallocated'}
                </span>
              </div>
            </div>
          </div>

          {/* Chronological Workflow History */}
          <div className="bg-white p-5 rounded-md border border-gov-border shadow-sm space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-4 h-4 text-gov-primary" />
                Chronological Workflow History ({caseItem.workflow_history.length})
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">Immutable audit trail</span>
            </div>

            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {caseItem.workflow_history.map((wf) => (
                <div key={wf.id} className="relative">
                  <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-gov-primary border-2 border-white shadow-xs" />
                  <div className="bg-slate-50/70 p-3 rounded border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-xs">
                        {wf.action_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(wf.created_at).toLocaleString()}
                      </span>
                    </div>
                    {wf.new_value && (
                      <div className="text-[11px] text-gov-secondary font-semibold mt-0.5">
                        Transitioned to: {wf.new_value}
                      </div>
                    )}
                    {wf.remarks && (
                      <p className="text-slate-600 mt-1 text-xs whitespace-pre-line">{wf.remarks}</p>
                    )}
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Recorded by: <strong>{wf.performed_by_name || 'Authorized Official'}</strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Historical Inter-Bureau Transfers */}
          {caseItem.transfers.length > 0 && (
            <div className="bg-white p-5 rounded-md border border-gov-border shadow-sm space-y-3 text-xs">
              <h3 className="font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                Inter-Bureau Transfer Records ({caseItem.transfers.length})
              </h3>
              <div className="divide-y divide-slate-100">
                {caseItem.transfers.map((t) => (
                  <div key={t.id} className="py-2.5">
                    <div className="flex items-center justify-between font-semibold text-slate-800">
                      <span>
                        {t.from_bureau_name} &rarr; {t.to_bureau_name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(t.transferred_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-1">Reason: {t.transfer_reason}</p>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Initiated by: {t.initiated_by_name || 'Supervisor'} &bull; Status: {t.receiving_status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Institution Details, Deadlines, Related Cases */}
        <div className="space-y-6">
          {/* Deadline Box */}
          <div className="bg-white p-5 rounded-md border border-gov-border shadow-sm text-xs space-y-3">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
              SLA Deadline Monitoring
            </h3>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded">
              <span className="text-slate-500 text-[11px] block">Applicable Deadline:</span>
              <span className={`text-base font-bold block mt-1 ${
                caseItem.is_overdue ? 'text-red-700' : 'text-slate-800'
              }`}>
                {caseItem.applicable_deadline_at
                  ? new Date(caseItem.applicable_deadline_at).toLocaleDateString()
                  : 'Deadline not configured'}
              </span>
              <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-semibold ${
                caseItem.is_overdue ? 'bg-red-100 text-red-800' : 'bg-slate-200 text-slate-700'
              }`}>
                {caseItem.deadline_status_label}
              </span>
            </div>
          </div>

          {/* Institution Link */}
          <div className="bg-white p-5 rounded-md border border-gov-border shadow-sm text-xs space-y-3">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
              Institutional Context
            </h3>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded">
              <span className="font-bold text-slate-900 block">{caseItem.institution_name}</span>
              <span className="font-mono text-gov-primary font-bold block mt-1">
                Permanent ID: {caseItem.permanent_id}
              </span>
              <span className="text-[11px] text-slate-500 block mt-2">
                Region: {caseItem.institution_region || 'N/A'}
              </span>
            </div>
            <Link
              to={`/institutions/${caseItem.institution_id}`}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-gov-primary hover:bg-gov-dark text-white rounded font-semibold text-xs transition-colors"
            >
              Open Consolidated Institution Profile &rarr;
            </Link>
          </div>

          {/* Related Cases for Same Institution */}
          {caseItem.related_cases && caseItem.related_cases.length > 0 && (
            <div className="bg-white p-5 rounded-md border border-gov-border shadow-sm text-xs space-y-3">
              <h3 className="font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                Other Cases for This Institution ({caseItem.related_cases.length})
              </h3>
              <div className="divide-y divide-slate-100">
                {caseItem.related_cases.map((rc) => (
                  <div key={rc.id} className="py-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-gov-primary">{rc.case_reference}</span>
                      <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                        {rc.current_bureau_name}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-700 font-medium line-clamp-1 mt-0.5">
                      {rc.title}
                    </span>
                    <div className="mt-1 flex items-center justify-between text-[10px]">
                      <span className="text-slate-500">Status: {rc.status}</span>
                      <Link to={`/cases/${rc.id}`} className="text-gov-primary hover:underline font-semibold">
                        View &rarr;
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 border border-slate-300">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
                Update Case Status
              </h3>
              <button onClick={() => setShowStatusModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            {actionError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
                {actionError}
              </div>
            )}
            <form onSubmit={handleStatusSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Status *</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-2 font-medium"
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
                <label className="block font-semibold text-slate-700 mb-1">
                  Official Justification / Status Remarks *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="State the official findings, committee decision, or notice reference..."
                  value={statusRemarks}
                  onChange={(e) => setStatusRemarks(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Next Action Note</label>
                <input
                  type="text"
                  placeholder="Optional next step description..."
                  value={nextActionNote}
                  onChange={(e) => setNextActionNote(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-gov-primary hover:bg-gov-dark text-white rounded font-semibold"
                >
                  {submitting ? 'Updating...' : 'Save Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Add Action Note */}
      {showActionModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 border border-slate-300">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
                Record Administrative Action Note
              </h3>
              <button onClick={() => setShowActionModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            {actionError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
                {actionError}
              </div>
            )}
            <form onSubmit={handleActionSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Action Category *</label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-2 font-medium"
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
                <label className="block font-semibold text-slate-700 mb-1">Action Details *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Record summary of action taken by official..."
                  value={actionDetails}
                  onChange={(e) => setActionDetails(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowActionModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-gov-primary hover:bg-gov-dark text-white rounded font-semibold"
                >
                  {submitting ? 'Recording...' : 'Record Action'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Assign Officer */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 border border-slate-300">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
                Assign / Reassign Case Officer
              </h3>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            {actionError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
                {actionError}
              </div>
            )}
            <form onSubmit={handleAssignSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Eligible Handling Officer *</label>
                <select
                  value={assignOfficerId}
                  onChange={(e) => setAssignOfficerId(parseInt(e.target.value))}
                  className="w-full border border-slate-300 rounded px-2.5 py-2 font-medium"
                >
                  {officers.map((off) => (
                    <option key={off.id} value={off.id}>
                      {off.display_name} ({off.roles?.[0]?.name || 'Officer'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Assignment Reason / Directive *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Specify task scope or justification for assignment..."
                  value={assignReason}
                  onChange={(e) => setAssignReason(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-gov-primary hover:bg-gov-dark text-white rounded font-semibold"
                >
                  {submitting ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Inter-Bureau Transfer */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 border border-slate-300">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
                Inter-Bureau Case Transfer
              </h3>
              <button onClick={() => setShowTransferModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            {actionError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
                {actionError}
              </div>
            )}
            <form onSubmit={handleTransferSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Destination AICTE Bureau / Cell *
                </label>
                <select
                  value={transferBureauId}
                  onChange={(e) => setTransferBureauId(parseInt(e.target.value))}
                  className="w-full border border-slate-300 rounded px-2.5 py-2 font-medium"
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
                <label className="block font-semibold text-slate-700 mb-1">
                  Transfer Rationale / Statutory Jurisdiction Justification *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Explain why this matter falls under the statutory mandate of the destination Bureau..."
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded font-semibold"
                >
                  {submitting ? 'Transferring...' : 'Execute Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
