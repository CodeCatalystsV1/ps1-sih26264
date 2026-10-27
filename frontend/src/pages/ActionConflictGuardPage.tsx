import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { actionsApi, apiRequest } from '../api/client';
import { ActionConflict, RegulatoryAction, CaseSimple, ActionValidationResponse } from '../types';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  Plus,
  RefreshCw,
  Building,
  FileText,
  UserCheck,
  Search,
  ExternalLink,
  Info,
  X,
  Sparkles,
  GitCompare,
  Check,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const ActionConflictGuardPage: React.FC = () => {
  const { user, hasRole, isAdmin } = useAuth();
  const isSupervisor = isAdmin || hasRole(['ROLE_SUPERVISOR', 'ROLE_BUREAU_HEAD', 'ROLE_DIRECTOR', 'ROLE_MEMBER_SECRETARY']);

  const [conflicts, setConflicts] = useState<ActionConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'COORDINATING' | 'RESOLVED'>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Selected conflict for resolution modal
  const [selectedConflict, setSelectedConflict] = useState<ActionConflict | null>(null);
  const [resolutionType, setResolutionType] = useState<string>('REQUEST_COORDINATION');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolutionError, setResolutionError] = useState<string | null>(null);

  // Propose Action Modal
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [cases, setCases] = useState<CaseSimple[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<number | ''>('');
  const [actionType, setActionType] = useState('INSPECTION');
  const [subjectCategory, setSubjectCategory] = useState('LAB_INFRASTRUCTURE');
  const [actionTitle, setActionTitle] = useState('');
  const [actionDescription, setActionDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ActionValidationResponse | null>(null);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [createActionError, setCreateActionError] = useState<string | null>(null);
  const [createActionSuccess, setCreateActionSuccess] = useState<string | null>(null);

  const fetchConflicts = async () => {
    setLoading(true);
    try {
      const data = await actionsApi.listConflicts();
      setConflicts(data);
    } catch (err) {
      console.error('Failed to load action conflicts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCases = async () => {
    try {
      const data = await apiRequest<CaseSimple[]>('/cases?limit=50');
      setCases(data);
    } catch (err) {
      console.error('Failed to fetch cases:', err);
    }
  };

  useEffect(() => {
    fetchConflicts();
    fetchCases();
  }, []);

  // Filter conflicts
  const filteredConflicts = conflicts.filter((c) => {
    // Tab filter
    if (activeTab === 'PENDING' && c.status !== 'PENDING_REVIEW') return false;
    if (activeTab === 'COORDINATING' && c.status !== 'COORDINATION_REQUESTED') return false;
    if (activeTab === 'RESOLVED' && !c.status.startsWith('RESOLVED') && c.status !== 'DISMISSED_FALSE_POSITIVE') return false;

    // Severity filter
    if (severityFilter !== 'ALL' && c.severity !== severityFilter) return false;

    // Search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchInst = c.institution_name?.toLowerCase().includes(term) || c.institution_permanent_id?.toLowerCase().includes(term);
      const matchProp = c.proposed_action?.title.toLowerCase().includes(term) || c.proposed_action?.action_type.toLowerCase().includes(term);
      const matchExpl = c.explanation?.toLowerCase().includes(term);
      return matchInst || matchProp || matchExpl;
    }

    return true;
  });

  // Metrics
  const pendingCount = conflicts.filter((c) => c.status === 'PENDING_REVIEW').length;
  const highSeverityCount = conflicts.filter((c) => c.severity === 'HIGH' && c.status === 'PENDING_REVIEW').length;
  const coordinatingCount = conflicts.filter((c) => c.status === 'COORDINATION_REQUESTED').length;
  const resolvedCount = conflicts.filter((c) => c.status.startsWith('RESOLVED') || c.status === 'DISMISSED_FALSE_POSITIVE').length;

  const handlePreCheckConflict = async () => {
    if (!selectedCaseId) {
      setCreateActionError('Please select an active regulatory case first.');
      return;
    }
    setCreateActionError(null);
    setValidating(true);
    try {
      const res = await actionsApi.validate({
        case_id: Number(selectedCaseId),
        action_type: actionType,
        title: actionTitle || `${actionType} for selected case`,
        description: actionDescription || 'Regulatory verification check',
        subject_category: subjectCategory,
        scheduled_date: scheduledDate ? new Date(scheduledDate).toISOString() : undefined,
      });
      setValidationResult(res);
    } catch (err: any) {
      setCreateActionError(err.message || 'Validation failed');
    } finally {
      setValidating(false);
    }
  };

  const handleCreateAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId) {
      setCreateActionError('Please select a regulatory case.');
      return;
    }
    if (!actionTitle.trim()) {
      setCreateActionError('Please provide an action title.');
      return;
    }
    setCreateActionError(null);
    setCreateActionSuccess(null);
    setSubmittingAction(true);

    try {
      const res = await actionsApi.create({
        case_id: Number(selectedCaseId),
        action_type: actionType,
        title: actionTitle,
        description: actionDescription,
        subject_category: subjectCategory,
        scheduled_date: scheduledDate ? new Date(scheduledDate).toISOString() : undefined,
      });

      if (res.status === 'PENDING_CONFLICT_REVIEW') {
        setCreateActionSuccess(`Regulatory Action created with ${res.active_conflicts_count || 1} potential conflict(s). Held under PENDING_CONFLICT_REVIEW for human authorization.`);
      } else {
        setCreateActionSuccess(`Regulatory Action registered successfully with status: ${res.status}.`);
      }

      fetchConflicts();
      setTimeout(() => {
        setShowProposeModal(false);
        setCreateActionSuccess(null);
        setValidationResult(null);
        setActionTitle('');
        setActionDescription('');
        setScheduledDate('');
      }, 1800);
    } catch (err: any) {
      setCreateActionError(err.message || 'Failed to submit action.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleResolveConflict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConflict) return;
    setResolutionError(null);
    setResolving(true);

    try {
      await actionsApi.resolveConflict(selectedConflict.id, {
        resolution_type: resolutionType,
        resolution_notes: resolutionNotes,
      });

      setSelectedConflict(null);
      setResolutionNotes('');
      fetchConflicts();
    } catch (err: any) {
      setResolutionError(err.message || 'Conflict resolution failed.');
    } finally {
      setResolving(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-300">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
            HIGH WARNING
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
            MEDIUM WARNING
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-royal-main border border-blue-200">
            LOW NOTICE
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_REVIEW':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">Needs Review</span>;
      case 'COORDINATION_REQUESTED':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-royal-main border border-blue-200">Coordination Requested</span>;
      case 'RESOLVED_AUTHORIZED_OVERRIDE':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-800 border border-purple-200">Supervisor Override</span>;
      case 'RESOLVED_COORDINATED':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">Coordinated</span>;
      case 'DISMISSED_FALSE_POSITIVE':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">Dismissed</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Action Conflict Guard
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-royal-main border border-blue-200 font-mono font-medium">
                  Phase 2 Active Guard
                </span>
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                Pre-execution regulatory action conflict evaluation, human supervisor oversight & cross-bureau coordination.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => fetchConflicts()}
            disabled={loading}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-royal-main' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowProposeModal(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-royal-main hover:bg-royal-deep rounded-lg shadow-soft flex items-center gap-1.5 transition-all cursor-pointer hover:shadow-elevated"
            id="propose-action-btn"
          >
            <Plus className="w-4 h-4 text-sky-200" />
            <span>Propose Regulatory Action</span>
          </button>
        </div>
      </div>

      {/* Coordination Hub Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <Link
          to="/coordination"
          className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-royal-main hover:bg-blue-50 border border-slate-200 flex items-center gap-2 transition-colors bg-white shadow-2xs"
        >
          <GitCompare className="w-4 h-4 text-royal-main" />
          <span>Case Overlaps (Institutional Dockets)</span>
        </Link>
        <Link
          to="/action-conflicts"
          className="px-4 py-2 rounded-lg text-xs font-bold bg-royal-main text-white border border-royal-main flex items-center gap-2 shadow-soft"
        >
          <ShieldAlert className="w-4 h-4 text-sky-200" />
          <span>Action Conflict Guard (Pre-Execution Warnings)</span>
          <span className="px-2 py-0.5 rounded-full bg-blue-900/60 text-white text-[10px] font-mono border border-blue-400/40">
            {conflicts.length} Active
          </span>
        </Link>
      </div>

      {/* Summary KPI Cards with Card Interactive Lift */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Reviews */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-soft card-interactive">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pending Reviews</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-800">{pendingCount}</span>
            <span className="text-[11px] text-slate-500">held for decision</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500">Awaiting human officer or supervisor review</div>
        </div>

        {/* High Severity Warnings */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-soft card-interactive">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-600 uppercase tracking-wider">High-Severity Warnings</span>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-700">{highSeverityCount}</span>
            <span className="text-[11px] text-rose-600">critical overlaps</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500">Same institute, category & 30d window</div>
        </div>

        {/* Coordinating */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-soft card-interactive">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Joint Coordination</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-royal-main border border-blue-200">
              <GitCompare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-royal-deep">{coordinatingCount}</span>
            <span className="text-[11px] text-slate-500">active channels</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500">Cross-bureau committee consultation</div>
        </div>

        {/* Resolved Conflicts */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-soft card-interactive">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Resolved Conflicts</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700">{resolvedCount}</span>
            <span className="text-[11px] text-slate-500">audited decisions</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500">Supervisory override or coordinated disposition</div>
        </div>
      </div>

      {/* Table Section with Tabs & Filters */}
      <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-soft">
        {/* Tabs and Search Bar */}
        <div className="p-4 border-b border-slate-200/90 flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-50/70">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-royal-main text-white shadow-soft'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              All Warnings ({conflicts.length})
            </button>
            <button
              onClick={() => setActiveTab('PENDING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'PENDING'
                  ? 'bg-amber-600 text-white shadow-soft'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              Pending Review ({pendingCount})
            </button>
            <button
              onClick={() => setActiveTab('COORDINATING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'COORDINATING'
                  ? 'bg-royal-deep text-white shadow-soft'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              Coordinating ({coordinatingCount})
            </button>
            <button
              onClick={() => setActiveTab('RESOLVED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'RESOLVED'
                  ? 'bg-emerald-600 text-white shadow-soft'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              Resolved ({resolvedCount})
            </button>
          </div>

          {/* Filters and Search */}
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-white border border-slate-300 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-royal-main"
            >
              <option value="ALL">All Severities</option>
              <option value="HIGH">High Severity Only</option>
              <option value="MEDIUM">Medium Severity Only</option>
              <option value="LOW">Low Notice Only</option>
            </select>

            <div className="relative flex-1 md:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search institution, title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-300 text-slate-800 placeholder-slate-400 text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-royal-main"
              />
            </div>
          </div>
        </div>

        {/* Conflict Warnings Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-bold text-[11px]">
                <th className="py-3 px-4">Institution / Code</th>
                <th className="py-3 px-4">Proposed Action</th>
                <th className="py-3 px-4">Conflicting Action</th>
                <th className="py-3 px-4">Bureaus Involved</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Review State</th>
                <th className="py-3 px-4">Detected</th>
                <th className="py-3 px-4 text-right">Oversight Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-royal-main mb-2" />
                    Loading action conflicts and compliance schedules...
                  </td>
                </tr>
              ) : filteredConflicts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <ShieldAlert className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                    <p className="font-semibold text-slate-700">No action conflicts matching current filter</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      The Action Conflict Guard monitors all regulatory actions across Bureaus.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredConflicts.map((c) => {
                  const propBureau = c.proposed_action?.bureau_code || 'PROPOSED';
                  const existBureau = c.existing_action?.bureau_code || 'EXISTING';

                  return (
                    <tr key={c.id} className="hover:bg-blue-50/40 transition-colors">
                      {/* Institution */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {c.institution_name || `Institute #${c.institution_id}`}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {c.institution_permanent_id || 'ID Pending'}
                        </div>
                      </td>

                      {/* Proposed Action */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-royal-main border border-blue-200 font-mono text-[10px] font-semibold">
                            {c.proposed_action?.action_type || 'PROPOSED'}
                          </span>
                          <span className="font-medium text-slate-800 truncate" title={c.proposed_action?.title}>
                            {c.proposed_action?.title || `Action #${c.proposed_action_id}`}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Category: <span className="text-slate-700 font-medium">{c.proposed_action?.subject_category}</span>
                        </div>
                      </td>

                      {/* Conflicting Action */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 font-mono text-[10px] font-semibold">
                            {c.existing_action?.action_type || 'EXISTING'}
                          </span>
                          <span className="font-medium text-slate-800 truncate" title={c.existing_action?.title}>
                            {c.existing_action?.title || `Action #${c.existing_action_id}`}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Scheduled: <span className="text-slate-700">{c.existing_action?.scheduled_date ? new Date(c.existing_action.scheduled_date).toLocaleDateString() : 'Active/Open'}</span>
                        </div>
                      </td>

                      {/* Bureaus Involved */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-[11px] font-mono">
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-royal-deep font-bold border border-blue-200">
                            {propBureau}
                          </span>
                          <span className="text-slate-400">&harr;</span>
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold border border-amber-200">
                            {existBureau}
                          </span>
                        </div>
                      </td>

                      {/* Severity */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getSeverityBadge(c.severity)}
                      </td>

                      {/* Review State */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStatusBadge(c.status)}
                      </td>

                      {/* Date Detected */}
                      <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap font-mono">
                        {new Date(c.detected_at).toLocaleDateString()}
                      </td>

                      {/* Oversight Action */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedConflict(c);
                            setResolutionNotes('');
                            setResolutionError(null);
                            setResolutionType('REQUEST_COORDINATION');
                          }}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-royal-main hover:bg-royal-deep text-white shadow-xs transition-all inline-flex items-center gap-1 cursor-pointer"
                        >
                          Review & Act
                          <ArrowRight className="w-3 h-3 text-sky-200" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RESOLUTION MODAL */}
      {selectedConflict && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-modal overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                  <ShieldAlert className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Action Conflict Oversight Review</h3>
                  <p className="text-xs text-slate-500">Conflict #{selectedConflict.id} &bull; {selectedConflict.institution_name}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedConflict(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Explanation Card */}
            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900">Guard Rule Match</span>
                {getSeverityBadge(selectedConflict.severity)}
              </div>
              <p className="text-xs text-amber-950 leading-relaxed font-medium">
                {selectedConflict.explanation}
              </p>
              <div className="text-[11px] text-amber-800 pt-1 border-t border-amber-200/60 font-mono">
                Conflict Rule: {selectedConflict.conflict_type}
              </div>
            </div>

            {/* Side-by-Side Action Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* Proposed Action */}
              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-royal-main">
                  Newly Proposed Action
                </div>
                <div className="font-bold text-slate-900">{selectedConflict.proposed_action?.title}</div>
                <div className="text-slate-600">
                  Bureau: <span className="text-slate-800 font-semibold">{selectedConflict.proposed_action?.bureau_code}</span>
                </div>
                <div className="text-slate-600">
                  Type: <span className="text-royal-deep font-mono font-medium">{selectedConflict.proposed_action?.action_type}</span>
                </div>
                <div className="text-slate-600">
                  Subject: <span className="text-slate-800">{selectedConflict.proposed_action?.subject_category}</span>
                </div>
                <div className="text-slate-600">
                  Date: <span className="text-slate-800">{selectedConflict.proposed_action?.scheduled_date ? new Date(selectedConflict.proposed_action.scheduled_date).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>

              {/* Conflicting Action */}
              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                  Existing Registered Action
                </div>
                <div className="font-bold text-slate-900">{selectedConflict.existing_action?.title}</div>
                <div className="text-slate-600">
                  Bureau: <span className="text-slate-800 font-semibold">{selectedConflict.existing_action?.bureau_code}</span>
                </div>
                <div className="text-slate-600">
                  Type: <span className="text-amber-900 font-mono font-medium">{selectedConflict.existing_action?.action_type}</span>
                </div>
                <div className="text-slate-600">
                  Subject: <span className="text-slate-800">{selectedConflict.existing_action?.subject_category}</span>
                </div>
                <div className="text-slate-600">
                  Date: <span className="text-slate-800">{selectedConflict.existing_action?.scheduled_date ? new Date(selectedConflict.existing_action.scheduled_date).toLocaleDateString() : 'Active/Open'}</span>
                </div>
              </div>
            </div>

            {/* Resolution Form */}
            <form onSubmit={handleResolveConflict} className="space-y-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Resolution Decision Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {/* Option 1: Coordination */}
                  <label className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                    resolutionType === 'REQUEST_COORDINATION'
                      ? 'bg-blue-50 border-royal-main text-royal-deep shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="resType"
                      value="REQUEST_COORDINATION"
                      checked={resolutionType === 'REQUEST_COORDINATION'}
                      onChange={() => setResolutionType('REQUEST_COORDINATION')}
                      className="mt-0.5 text-royal-main"
                    />
                    <div>
                      <div className="font-bold text-slate-900">Request Coordination</div>
                      <div className="text-[10px] text-slate-500">Initiate joint bureau alignment on this action</div>
                    </div>
                  </label>

                  {/* Option 2: Supervisor Override */}
                  <label className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                    !isSupervisor
                      ? 'opacity-50 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400'
                      : resolutionType === 'PROCEED_WITH_JUSTIFICATION'
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-900 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="resType"
                      value="PROCEED_WITH_JUSTIFICATION"
                      disabled={!isSupervisor}
                      checked={resolutionType === 'PROCEED_WITH_JUSTIFICATION'}
                      onChange={() => setResolutionType('PROCEED_WITH_JUSTIFICATION')}
                      className="mt-0.5 text-emerald-600"
                    />
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-1">
                        Supervisor Override
                        <span className="text-[9px] px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full font-mono">Supervisor</span>
                      </div>
                      <div className="text-[10px] text-slate-500">Exercise administrative discretion to proceed</div>
                    </div>
                  </label>

                  {/* Option 3: Dismiss False Positive */}
                  <label className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                    resolutionType === 'DISMISS_FALSE_POSITIVE'
                      ? 'bg-purple-50 border-purple-600 text-purple-900 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="resType"
                      value="DISMISS_FALSE_POSITIVE"
                      checked={resolutionType === 'DISMISS_FALSE_POSITIVE'}
                      onChange={() => setResolutionType('DISMISS_FALSE_POSITIVE')}
                      className="mt-0.5 text-purple-600"
                    />
                    <div>
                      <div className="font-bold text-slate-900">Dismiss False Positive</div>
                      <div className="text-[10px] text-slate-500">Actions are materially non-conflicting</div>
                    </div>
                  </label>

                  {/* Option 4: Revise Action */}
                  <label className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                    resolutionType === 'REVISE_ACTION'
                      ? 'bg-sky-50 border-royal-main text-royal-deep shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}>
                    <input
                      type="radio"
                      name="resType"
                      value="REVISE_ACTION"
                      checked={resolutionType === 'REVISE_ACTION'}
                      onChange={() => setResolutionType('REVISE_ACTION')}
                      className="mt-0.5 text-royal-main"
                    />
                    <div>
                      <div className="font-bold text-slate-900">Revise Action</div>
                      <div className="text-[10px] text-slate-500">Return to proposing officer for schedule adjustment</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Justification Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official Review Justification Notes
                  {(resolutionType === 'PROCEED_WITH_JUSTIFICATION' || resolutionType === 'DISMISS_FALSE_POSITIVE') && (
                    <span className="text-rose-600 ml-1 font-normal">(Required, min 10 characters)</span>
                  )}
                </label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder={
                    resolutionType === 'PROCEED_WITH_JUSTIFICATION'
                      ? 'Specify supervisory rationale explaining why this action is authorized notwithstanding the detected conflict...'
                      : 'Enter administrative reason and guidance for this decision...'
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-royal-main/20 focus:border-royal-main"
                />
              </div>

              {resolutionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  {resolutionError}
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedConflict(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-royal-main hover:bg-royal-deep rounded-lg shadow-soft flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {resolving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  Confirm Resolution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROPOSE REGULATORY ACTION MODAL */}
      {showProposeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-modal overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-lg bg-blue-50 text-royal-main border border-blue-200">
                  <Plus className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Propose New Regulatory Action</h3>
                  <p className="text-xs text-slate-500">Integrated pre-execution conflict analysis engine</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowProposeModal(false);
                  setValidationResult(null);
                  setCreateActionError(null);
                }}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAction} className="space-y-4">
              {/* Case Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Regulatory Case <span className="text-rose-600">*</span>
                </label>
                <select
                  value={selectedCaseId}
                  onChange={(e) => {
                    setSelectedCaseId(e.target.value ? Number(e.target.value) : '');
                    setValidationResult(null);
                  }}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-royal-main/20 focus:border-royal-main"
                  required
                >
                  <option value="">Select an active regulatory case...</option>
                  {cases.map((cs) => (
                    <option key={cs.id} value={cs.id}>
                      {cs.case_reference} &mdash; {cs.title} ({cs.current_bureau_name || 'BUREAU'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Type & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Action Type <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={actionType}
                    onChange={(e) => {
                      setActionType(e.target.value);
                      setValidationResult(null);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-royal-main/20 focus:border-royal-main"
                  >
                    <option value="INSPECTION">INSPECTION</option>
                    <option value="SHOW_CAUSE_NOTICE">SHOW_CAUSE_NOTICE</option>
                    <option value="DOCUMENT_REQUEST">DOCUMENT_REQUEST</option>
                    <option value="COMPLIANCE_REVIEW">COMPLIANCE_REVIEW</option>
                    <option value="HEARING">HEARING</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Regulatory Subject Category <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={subjectCategory}
                    onChange={(e) => {
                      setSubjectCategory(e.target.value);
                      setValidationResult(null);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-royal-main/20 focus:border-royal-main"
                  >
                    <option value="LAB_INFRASTRUCTURE">LAB_INFRASTRUCTURE</option>
                    <option value="STAFF_QUALIFICATION">STAFF_QUALIFICATION</option>
                    <option value="ADMISSION_NORMS">ADMISSION_NORMS</option>
                    <option value="FINANCIAL_ACCOUNTS">FINANCIAL_ACCOUNTS</option>
                    <option value="AFFILIATION_NORMS">AFFILIATION_NORMS</option>
                    <option value="EXAM_PROCESS">EXAM_PROCESS</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Action Title <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={actionTitle}
                  onChange={(e) => setActionTitle(e.target.value)}
                  placeholder="e.g. On-Site Laboratory Infrastructure Verification"
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-royal-main/20 focus:border-royal-main"
                  required
                />
              </div>

              {/* Description & Scheduled Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Description / Scope</label>
                  <input
                    type="text"
                    value={actionDescription}
                    onChange={(e) => setActionDescription(e.target.value)}
                    placeholder="Details of verification, parameters inspected..."
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-royal-main/20 focus:border-royal-main"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Planned Date</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => {
                      setScheduledDate(e.target.value);
                      setValidationResult(null);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-royal-main/20 focus:border-royal-main"
                  />
                </div>
              </div>

              {/* Pre-Check Conflict Guard Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handlePreCheckConflict}
                  disabled={validating || !selectedCaseId}
                  className="w-full py-2.5 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-royal-main text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles className={`w-4 h-4 text-royal-main ${validating ? 'animate-spin' : ''}`} />
                  {validating ? 'Evaluating Action Against Active Bureau Schedules...' : 'Check Potential Conflicts Before Submission'}
                </button>
              </div>

              {/* Pre-check Results Card */}
              {validationResult && (
                <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                  validationResult.has_conflicts
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                }`}>
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5">
                      {validationResult.has_conflicts ? (
                        <>
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          Conflict Guard Warning: {validationResult.conflict_count} Potential Conflict(s) Detected!
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          Pre-check Clear: No immediate conflicts detected.
                        </>
                      )}
                    </span>
                    {validationResult.highest_severity && getSeverityBadge(validationResult.highest_severity)}
                  </div>

                  {validationResult.potential_conflicts.map((item, idx) => (
                    <div key={idx} className="p-2.5 bg-white rounded-lg border border-amber-200 text-[11px] text-slate-700 space-y-1">
                      <div className="font-semibold text-amber-900">
                        {item.existing_bureau_code}: {item.existing_action_title} ({item.existing_action_type})
                      </div>
                      <div className="text-slate-600">{item.explanation}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Error and Success alerts */}
              {createActionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  {createActionError}
                </div>
              )}

              {createActionSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                  {createActionSuccess}
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProposeModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-4 py-2 text-xs font-semibold text-white bg-royal-main hover:bg-royal-deep rounded-lg shadow-soft flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submittingAction ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Submit Regulatory Action
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionConflictGuardPage;
