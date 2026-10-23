import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { OverlapFlag, CaseSimple, CoordinationDecision } from '../types';
import {
  GitCompare,
  AlertTriangle,
  ShieldAlert,
  CheckCircle,
  Clock,
  ArrowRight,
  UserCheck,
  Building,
  RefreshCw,
  X,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const CoordinationWorkspacePage: React.FC = () => {
  const [overlaps, setOverlaps] = useState<OverlapFlag[]>([]);
  const [selectedOverlap, setSelectedOverlap] = useState<OverlapFlag | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDecisionModal, setShowDecisionModal] = useState(false);

  // Decision Form
  const [actionType, setActionType] = useState('CONFIRM_RELATED');
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchOverlaps = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<OverlapFlag[]>('/overlaps');
      setOverlaps(data);
      if (data.length > 0 && !selectedOverlap) {
        setSelectedOverlap(data[0]);
      } else if (selectedOverlap) {
        const updated = data.find((o) => o.id === selectedOverlap.id);
        if (updated) setSelectedOverlap(updated);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverlaps();
  }, []);

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOverlap) return;
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const updated = await apiRequest<OverlapFlag>(`/overlaps/${selectedOverlap.id}/review`, {
        method: 'POST',
        body: JSON.stringify({
          action_type: actionType,
          remarks,
        }),
      });
      setSelectedOverlap(updated);
      setShowDecisionModal(false);
      setRemarks('');
      fetchOverlaps();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record coordination decision');
    } finally {
      setSubmitting(false);
    }
  };

  const STATE_BADGES: Record<string, { label: string; color: string }> = {
    POTENTIAL_OVERLAP: { label: 'Potential Overlap', color: 'bg-red-100 text-red-800 border-red-300' },
    UNDER_REVIEW: { label: 'Under Joint Review', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    COORDINATION_REQUESTED: { label: 'Coordination Requested', color: 'bg-purple-100 text-purple-800 border-purple-300' },
    CONFIRMED_RELATED: { label: 'Confirmed Related Cases', color: 'bg-amber-100 text-amber-900 border-amber-400' },
    NOT_RELATED: { label: 'Marked Not Related', color: 'bg-slate-100 text-slate-700 border-slate-300' },
    JOINT_ACTION_IN_PROGRESS: { label: 'Joint Action In Progress', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
    COORDINATION_COMPLETED: { label: 'Coordination Completed', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    ESCALATED: { label: 'Escalated to Supervisor', color: 'bg-rose-100 text-rose-800 border-rose-400' },
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-4 rounded-md border border-gov-border shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gov-dark">Cross-Bureau Coordination Workspace</h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-gov-secondary text-white">
              SIH PS-264 Core
            </span>
          </div>
          <p className="text-xs text-gov-muted mt-0.5">
            Deterministic detection and human-supervised coordination for overlapping institutional grievances
          </p>
        </div>
        <button
          onClick={fetchOverlaps}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded border border-slate-300 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Overlaps
        </button>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left List of Overlap Flags */}
        <div className="bg-white rounded-md border border-gov-border shadow-sm flex flex-col h-[650px] overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-gov-border font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center justify-between">
            <span>Detected Institution Overlaps ({overlaps.length})</span>
          </div>
          <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
            {loading ? (
              <div className="p-6 text-center text-xs text-slate-400">Loading overlap records...</div>
            ) : overlaps.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No active cross-bureau overlaps requiring review at this time.
              </div>
            ) : (
              overlaps.map((ov) => {
                const isSelected = selectedOverlap?.id === ov.id;
                const badge = STATE_BADGES[ov.relationship_state] || {
                  label: ov.relationship_state,
                  color: 'bg-slate-100 text-slate-700',
                };
                return (
                  <div
                    key={ov.id}
                    onClick={() => setSelectedOverlap(ov)}
                    className={`p-3.5 hover:bg-slate-50 cursor-pointer transition-colors text-xs ${
                      isSelected ? 'bg-blue-50/70 border-l-4 border-gov-primary' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-mono font-bold text-gov-primary">{ov.permanent_id}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>
                    <div className="font-semibold text-slate-900 line-clamp-1">{ov.institution_name}</div>
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                      <span>Bureaus: <strong>{ov.involved_bureaus.join(' & ')}</strong></span>
                      <span>&bull;</span>
                      <span>Cases: <strong>{ov.involved_cases.length}</strong></span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Detail & Coordination Panel */}
        <div className="lg:col-span-2 space-y-5">
          {selectedOverlap ? (
            <>
              {/* REQUIRED MANDATORY PS-264 ALERT BANNER */}
              <div className="bg-red-50 border-2 border-red-500 rounded-md p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded bg-red-600 text-white shrink-0 mt-0.5">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-sm font-extrabold text-red-900 uppercase tracking-wide">
                        POTENTIAL OVERLAPPING CASES – COORDINATION REQUIRED
                      </h2>
                      <p className="text-xs text-red-800 mt-1 leading-relaxed">
                        {selectedOverlap.detection_reason}
                      </p>
                      <div className="mt-2 text-xs font-semibold text-red-900 flex items-center gap-2">
                        <span>Institution: <strong>{selectedOverlap.institution_name}</strong></span>
                        <span>&bull;</span>
                        <span className="font-mono">AICTE Permanent ID: {selectedOverlap.permanent_id}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDecisionModal(true)}
                    className="px-3.5 py-2 bg-gov-primary hover:bg-gov-dark text-white text-xs font-bold rounded shadow transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
                  >
                    Take Coordination Action &rarr;
                  </button>
                </div>
              </div>

              {/* Side-by-Side Comparison of Overlapping Cases */}
              <div className="bg-white rounded-md border border-gov-border shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Independent Active Cases ({selectedOverlap.involved_cases.length} In-flight)
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Separate original cases preserved without destructive merging
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedOverlap.involved_cases.map((c, idx) => (
                    <div
                      key={c.id}
                      className="p-4 rounded-md border border-slate-200 bg-slate-50/50 space-y-2.5 text-xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-gov-primary text-sm">{c.case_reference}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gov-secondary text-white">
                            Bureau: {c.current_bureau_name}
                          </span>
                        </div>
                        <h4 className="font-semibold text-slate-900 mt-1">{c.title}</h4>
                        <div className="text-[11px] text-slate-500 mt-2 space-y-1">
                          <div>Status: <strong className="text-slate-800">{c.status}</strong></div>
                          <div>Assigned Officer: <strong className="text-slate-800">{c.assigned_officer_name || 'Unassigned'}</strong></div>
                          <div>Priority: <strong className="text-slate-800">{c.priority}</strong></div>
                          <div>
                            Deadline:{' '}
                            <strong className={c.is_overdue ? 'text-red-700' : 'text-slate-800'}>
                              {c.applicable_deadline_at ? new Date(c.applicable_deadline_at).toLocaleDateString() : 'Deadline not configured'}
                            </strong>
                          </div>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[11px]">
                        <span className="text-slate-400">
                          Last Action: {new Date(c.last_action_at).toLocaleDateString()}
                        </span>
                        <Link
                          to={`/cases/${c.id}`}
                          className="text-gov-primary hover:underline font-semibold flex items-center gap-0.5"
                        >
                          Open Case <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Coordination Decision History */}
              <div className="bg-white rounded-md border border-gov-border shadow-sm p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Coordination Actions & Human Review Decisions Log
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Audit trail recorded
                  </span>
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  {selectedOverlap.decisions.length === 0 ? (
                    <div className="text-slate-400 py-4 text-center">
                      No coordination decisions recorded yet. Initial potential overlap awaiting human review.
                    </div>
                  ) : (
                    selectedOverlap.decisions.map((dec) => (
                      <div key={dec.id} className="py-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">
                            {dec.action_type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(dec.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-600 mt-1 text-xs">{dec.remarks}</p>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          Recorded by: <strong>{dec.performed_by_name || 'Authorized Official'}</strong>
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white p-12 text-center rounded-md border border-gov-border text-slate-400 text-xs">
              Select an institution overlap flag from the left panel to review cases.
            </div>
          )}
        </div>
      </div>

      {/* Coordination Decision Modal */}
      {showDecisionModal && selectedOverlap && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 border border-slate-300">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
                Record Cross-Bureau Coordination Decision
              </h3>
              <button onClick={() => setShowDecisionModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleDecisionSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Selected Institution & Permanent ID
                </label>
                <div className="p-2 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-800">
                  {selectedOverlap.institution_name} ({selectedOverlap.permanent_id})
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Coordination Action / Decision Type *
                </label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-2 font-medium"
                >
                  <option value="REVIEW">Review Relationship (Mark as Under Review)</option>
                  <option value="CONFIRM_RELATED">Confirm Related Cases (Coordinate joint findings)</option>
                  <option value="MARK_NOT_RELATED">Mark Not Related (Independent unrelated matters)</option>
                  <option value="REQUEST_COORDINATION">Request Joint Meeting / Scrutiny Session</option>
                  <option value="RECORD_JOINT_ACTION">Record Joint Action in Progress</option>
                  <option value="ESCALATE">Escalate to Bureau Head / Competent Authority</option>
                  <option value="COMPLETE">Coordination Completed & Finalized</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  * Note: In accordance with Rule 7, recording a relationship preserves both underlying case IDs without destructive merging.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Official Coordination Remarks / Justification *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Detail the rationale, coordination decision, consensus between Bureaus, or reasons why matters are independent..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2.5 focus:ring-1 focus:ring-gov-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowDecisionModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-gov-primary hover:bg-gov-dark text-white rounded font-semibold"
                >
                  {submitting ? 'Recording...' : 'Submit Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
