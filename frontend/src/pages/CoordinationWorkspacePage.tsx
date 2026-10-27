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
      <div className="gov-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Cross-Bureau Coordination Workspace
              </h1>
              <span className="gov-badge-info font-bold uppercase tracking-wider text-[10px]">
                SIH PS-264 Flagship
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Deterministic institutional overlap detection and supervised inter-bureau coordination workspace.
            </p>
          </div>
          <button
            onClick={fetchOverlaps}
            disabled={loading}
            className="gov-btn-secondary text-xs flex items-center gap-2 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Overlaps</span>
          </button>
        </div>
      </div>

      {/* Coordination Hub Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-700/60 pb-1">
        <Link
          to="/coordination"
          className="px-4 py-2 rounded-lg text-xs font-bold bg-[#102A43] text-teal-300 border border-teal-500/50 flex items-center gap-2 shadow-sm"
        >
          <GitCompare className="w-4 h-4 text-teal-400" />
          <span>Case Overlaps (Institutional Dockets)</span>
          <span className="px-1.5 py-0.5 rounded bg-teal-950 text-teal-300 text-[10px] font-mono">
            {overlaps.length}
          </span>
        </Link>
        <Link
          to="/action-conflicts"
          className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent hover:border-slate-700 flex items-center gap-2 transition-colors"
        >
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span>Action Conflict Guard (Pre-Execution Warnings)</span>
          <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 text-[10px] font-mono border border-amber-800/40">
            Phase 2
          </span>
        </Link>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left List of Overlap Flags */}
        <div className="gov-card flex flex-col h-[700px] overflow-hidden">
          <div className="gov-card-header p-4 bg-slate-50/80 border-b border-gov-border flex items-center justify-between">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-gov-primary" />
              Detected Overlaps
            </span>
            <span className="gov-badge-neutral font-bold">{overlaps.length} Active</span>
          </div>
          
          <div className="divide-y divide-slate-100 overflow-y-auto flex-1 p-1">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-gov-primary mb-2"></div>
                <p>Scanning institutional dockets...</p>
              </div>
            ) : overlaps.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No active cross-bureau institutional overlaps requiring adjudication.
              </div>
            ) : (
              overlaps.map((ov) => {
                const isSelected = selectedOverlap?.id === ov.id;
                const badge = STATE_BADGES[ov.relationship_state] || {
                  label: ov.relationship_state,
                  color: 'bg-slate-100 text-slate-700 border-slate-300',
                };
                return (
                  <div
                    key={ov.id}
                    onClick={() => setSelectedOverlap(ov)}
                    className={`p-3.5 rounded-md hover:bg-slate-50 cursor-pointer transition-all text-xs mb-1 ${
                      isSelected
                        ? 'bg-blue-50/80 border border-gov-primary shadow-xs'
                        : 'border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="font-mono font-bold text-gov-primary text-[11px] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        {ov.permanent_id}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.color}`}>
                        {badge.label}
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 line-clamp-1 text-xs">{ov.institution_name}</div>
                    <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5 flex-wrap">
                      <span>Bureaus: <strong className="text-slate-700">{ov.involved_bureaus.join(' & ')}</strong></span>
                      <span>&bull;</span>
                      <span>Cases: <strong className="text-slate-700">{ov.involved_cases.length}</strong></span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Detail & Coordination Panel */}
        <div className="lg:col-span-2 space-y-6">
          {selectedOverlap ? (
            <>
              {/* MANDATORY PS-264 STATUTORY OVERLAP ADVISORY BANNER */}
              <div className="p-5 rounded-lg border-2 border-amber-500 bg-amber-50/70 shadow-xs">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-md bg-amber-600 text-white shrink-0 mt-0.5 shadow-xs">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-200 text-amber-900 rounded">
                          STATUTORY ADVISORY &bull; PS-264
                        </span>
                        <span className="text-xs font-mono font-bold text-amber-950">
                          {selectedOverlap.permanent_id}
                        </span>
                      </div>
                      <h2 className="text-sm font-bold text-amber-950 tracking-tight">
                        POTENTIAL OVERLAPPING CASES — MANDATORY INTER-BUREAU COORDINATION
                      </h2>
                      <p className="text-xs text-amber-900 leading-relaxed">
                        {selectedOverlap.detection_reason}
                      </p>
                      <div className="pt-1 text-xs text-amber-950 font-medium flex items-center gap-2">
                        <span>Target Institution: <strong>{selectedOverlap.institution_name}</strong></span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDecisionModal(true)}
                    className="gov-btn-primary shrink-0 text-xs flex items-center gap-1.5 self-end sm:self-center"
                  >
                    <span>Record Joint Decision</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Side-by-Side Comparison of Overlapping Cases */}
              <div className="gov-card p-5 space-y-4">
                <div className="gov-card-header flex items-center justify-between pb-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gov-primary" />
                    Independent Active Case Files ({selectedOverlap.involved_cases.length} Concurrently Handled)
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Preserved under separate dockets without destructive merging
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedOverlap.involved_cases.map((c) => (
                    <div
                      key={c.id}
                      className="p-4 rounded-lg border border-slate-200 bg-slate-50/70 space-y-3 text-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-gov-primary text-xs bg-white px-2 py-0.5 rounded border border-slate-200">
                            {c.case_reference}
                          </span>
                          <span className="gov-badge-info font-bold">
                            {c.current_bureau_name}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm leading-snug">{c.title}</h4>
                        
                        <div className="p-2.5 bg-white rounded border border-slate-200 space-y-1.5 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Current Status:</span>
                            <span className="font-semibold text-slate-800">{c.status}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Assigned Officer:</span>
                            <span className="font-semibold text-slate-800">{c.assigned_officer_name || 'Desk Registry'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">SLA Deadline:</span>
                            <span className={`font-mono font-bold ${c.is_overdue ? 'text-red-700' : 'text-slate-800'}`}>
                              {c.applicable_deadline_at ? new Date(c.applicable_deadline_at).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[11px]">
                        <span className="text-slate-400 font-mono">
                          Last Updated: {new Date(c.last_action_at).toLocaleDateString()}
                        </span>
                        <Link
                          to={`/cases/${c.id}`}
                          className="gov-btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1 font-semibold"
                        >
                          <span>Inspect Dossier</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Coordination Decision History */}
              <div className="gov-card p-5 space-y-3">
                <div className="gov-card-header flex items-center justify-between pb-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gov-primary" />
                    Coordination Actions & Inter-Bureau Adjudication Log
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    Statutory Coordination Audit
                  </span>
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  {selectedOverlap.decisions.length === 0 ? (
                    <div className="text-slate-500 py-6 text-center text-xs">
                      No formal coordination rulings recorded yet. Potential overlap awaiting inter-bureau joint review.
                    </div>
                  ) : (
                    selectedOverlap.decisions.map((dec) => (
                      <div key={dec.id} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="font-bold text-slate-900 text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {dec.action_type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {new Date(dec.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-700 mt-2 text-xs leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-200">
                          {dec.remarks}
                        </p>
                        <div className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-2">
                          <UserCheck className="w-3 h-3 text-slate-400" />
                          <span>Adjudicated by: <strong className="text-slate-700">{dec.performed_by_name || 'Designated Bureau Coordinator'}</strong></span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="gov-card p-12 text-center text-slate-500 text-xs">
              Select an institutional overlap from the registry on the left to inspect case dossiers.
            </div>
          )}
        </div>
      </div>

      {/* Coordination Decision Modal */}
      {showDecisionModal && selectedOverlap && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="gov-modal max-w-lg w-full p-6 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-gov-primary" />
                Record Cross-Bureau Coordination Decision
              </h3>
              <button onClick={() => setShowDecisionModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-md">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleDecisionSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Target Institution & AICTE Permanent ID
                </label>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-900 text-xs">
                  {selectedOverlap.institution_name} <span className="font-mono text-gov-primary font-bold">({selectedOverlap.permanent_id})</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Coordination Action / Adjudication Category *
                </label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="gov-select"
                >
                  <option value="REVIEW">Review Relationship (Mark as Under Joint Review)</option>
                  <option value="CONFIRM_RELATED">Confirm Related Cases (Coordinate joint findings)</option>
                  <option value="MARK_NOT_RELATED">Mark Not Related (Independent unrelated matters)</option>
                  <option value="REQUEST_COORDINATION">Request Joint Meeting / Scrutiny Session</option>
                  <option value="RECORD_JOINT_ACTION">Record Joint Action in Progress</option>
                  <option value="ESCALATE">Escalate to Bureau Head / Competent Authority</option>
                  <option value="COMPLETE">Coordination Completed & Finalized</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  * Note: In accordance with statutory protocols, recording a coordination relationship preserves both underlying case IDs without destructive merging.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Official Coordination Rationale / Joint Finding *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Detail the rationale, joint consensus between Bureaus, or reasons why matters are verified independent..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="gov-input"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowDecisionModal(false)}
                  className="gov-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="gov-btn-primary"
                >
                  {submitting ? 'Recording Decision...' : 'Commit Coordination Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
