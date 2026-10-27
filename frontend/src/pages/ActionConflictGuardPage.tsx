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
  Check
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
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-950/80 text-red-200 border border-red-700/60 animate-pulse">HIGH WARNING</span>;
      case 'MEDIUM':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-200 border border-amber-700/60">MEDIUM WARNING</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-950/80 text-blue-200 border border-blue-800/60">LOW NOTICE</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_REVIEW':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-950/90 text-amber-300 border border-amber-600/50">Needs Review</span>;
      case 'COORDINATION_REQUESTED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-950/90 text-blue-300 border border-blue-600/50">Coordination Requested</span>;
      case 'RESOLVED_AUTHORIZED_OVERRIDE':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950/90 text-emerald-300 border border-emerald-600/50">Supervisor Override</span>;
      case 'RESOLVED_COORDINATED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-950/90 text-teal-300 border border-teal-600/50">Coordinated</span>;
      case 'DISMISSED_FALSE_POSITIVE':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">Dismissed</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-300">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Title and Propose Action Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-amber-950/80 text-amber-400 border border-amber-800/60">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Action Conflict Guard
                <span className="text-xs px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800 font-mono font-medium">
                  Phase 2 Engine
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Pre-execution regulatory action conflict evaluation, human supervisor oversight & cross-bureau coordination.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchConflicts()}
            disabled={loading}
            className="px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowProposeModal(true)}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Propose Regulatory Action
          </button>
        </div>
      </div>

      {/* Coordination Hub Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-700/60 pb-1">
        <Link
          to="/coordination"
          className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent hover:border-slate-700 flex items-center gap-2 transition-colors"
        >
          <GitCompare className="w-4 h-4 text-teal-400" />
          <span>Case Overlaps (Institutional Dockets)</span>
        </Link>
        <Link
          to="/action-conflicts"
          className="px-4 py-2 rounded-lg text-xs font-bold bg-[#102A43] text-amber-300 border border-amber-500/50 flex items-center gap-2 shadow-sm"
        >
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span>Action Conflict Guard (Pre-Execution Warnings)</span>
          <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 text-[10px] font-mono border border-amber-800/40">
            {conflicts.length} Active
          </span>
        </Link>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Reviews */}
        <div className="bg-[#102A43] border border-slate-700/80 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Pending Reviews</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-300 font-mono">{pendingCount}</span>
            <span className="text-[11px] text-slate-400">held for decision</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500">Awaiting human officer or supervisor review</div>
        </div>

        {/* High Severity Warnings */}
        <div className="bg-[#102A43] border border-red-900/40 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-red-300">High-Severity Warnings</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-red-400 font-mono">{highSeverityCount}</span>
            <span className="text-[11px] text-red-300/80">critical overlaps</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500">Same institute, category & 30d window</div>
        </div>

        {/* Coordinating */}
        <div className="bg-[#102A43] border border-slate-700/80 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Joint Coordination</span>
            <GitCompare className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-300 font-mono">{coordinatingCount}</span>
            <span className="text-[11px] text-slate-400">active channels</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500">Cross-bureau committee consultation</div>
        </div>

        {/* Resolved Conflicts */}
        <div className="bg-[#102A43] border border-slate-700/80 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Resolved Conflicts</span>
            <CheckCircle className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-teal-300 font-mono">{resolvedCount}</span>
            <span className="text-[11px] text-slate-400">audited decisions</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500">Supervisory override or coordinated disposition</div>
        </div>
      </div>

      {/* Table Section with Tabs & Filters */}
      <div className="bg-[#102A43] border border-slate-700/80 rounded-xl overflow-hidden shadow-sm">
        {/* Tabs and Search Bar */}
        <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 bg-[#0c2033]">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'ALL'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              All Potential Warnings ({conflicts.length})
            </button>
            <button
              onClick={() => setActiveTab('PENDING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'PENDING'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Pending Review ({pendingCount})
            </button>
            <button
              onClick={() => setActiveTab('COORDINATING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'COORDINATING'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Coordinating ({coordinatingCount})
            </button>
            <button
              onClick={() => setActiveTab('RESOLVED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'RESOLVED'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
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
              className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-teal-500"
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
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Conflict Warnings Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
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
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-teal-400 mb-2" />
                    Loading action conflicts and compliance schedules...
                  </td>
                </tr>
              ) : filteredConflicts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <ShieldAlert className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                    <p className="font-medium text-slate-300">No action conflicts matching current filter</p>
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
                    <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Institution */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">
                          {c.institution_name || `Institute #${c.institution_id}`}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {c.institution_permanent_id || 'ID Pending'}
                        </div>
                      </td>

                      {/* Proposed Action */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/40 font-mono text-[10px]">
                            {c.proposed_action?.action_type || 'PROPOSED'}
                          </span>
                          <span className="font-medium text-slate-200 truncate" title={c.proposed_action?.title}>
                            {c.proposed_action?.title || `Action #${c.proposed_action_id}`}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Category: <span className="text-slate-300">{c.proposed_action?.subject_category}</span>
                        </div>
                      </td>

                      {/* Conflicting Action */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/40 font-mono text-[10px]">
                            {c.existing_action?.action_type || 'EXISTING'}
                          </span>
                          <span className="font-medium text-slate-300 truncate" title={c.existing_action?.title}>
                            {c.existing_action?.title || `Action #${c.existing_action_id}`}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Scheduled: <span className="text-slate-300">{c.existing_action?.scheduled_date ? new Date(c.existing_action.scheduled_date).toLocaleDateString() : 'Active/Open'}</span>
                        </div>
                      </td>

                      {/* Bureaus Involved */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-[11px] font-mono">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-teal-300 font-bold border border-slate-700">
                            {propBureau}
                          </span>
                          <span className="text-slate-500">↔</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-bold border border-slate-700">
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
                      <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
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
                          className="px-2.5 py-1.5 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors inline-flex items-center gap-1"
                        >
                          Review & Act
                          <ArrowRight className="w-3 h-3 text-teal-400" />
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
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#102A43] border border-slate-700 rounded-xl max-w-2xl w-full p-6 space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-950/80 text-amber-400 border border-amber-800/60">
                  <ShieldAlert className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">Action Conflict Oversight Review</h3>
                  <p className="text-xs text-slate-400">Conflict #{selectedConflict.id} • {selectedConflict.institution_name}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedConflict(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Explanation Card */}
            <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Guard Rule Match</span>
                {getSeverityBadge(selectedConflict.severity)}
              </div>
              <p className="text-xs text-amber-200 leading-relaxed font-medium">
                {selectedConflict.explanation}
              </p>
              <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                Conflict Type: <span className="font-mono text-teal-300">{selectedConflict.conflict_type}</span>
              </div>
            </div>

            {/* Side-by-Side Action Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* Proposed Action */}
              <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-800/40 space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                  Newly Proposed Action
                </div>
                <div className="font-semibold text-white">{selectedConflict.proposed_action?.title}</div>
                <div className="text-slate-400">
                  Bureau: <span className="text-slate-200 font-semibold">{selectedConflict.proposed_action?.bureau_code}</span>
                </div>
                <div className="text-slate-400">
                  Type: <span className="text-slate-200 font-mono">{selectedConflict.proposed_action?.action_type}</span>
                </div>
                <div className="text-slate-400">
                  Subject: <span className="text-slate-200">{selectedConflict.proposed_action?.subject_category}</span>
                </div>
                <div className="text-slate-400">
                  Date: <span className="text-slate-200">{selectedConflict.proposed_action?.scheduled_date ? new Date(selectedConflict.proposed_action.scheduled_date).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>

              {/* Conflicting Action */}
              <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/40 space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  Existing Registered Action
                </div>
                <div className="font-semibold text-white">{selectedConflict.existing_action?.title}</div>
                <div className="text-slate-400">
                  Bureau: <span className="text-slate-200 font-semibold">{selectedConflict.existing_action?.bureau_code}</span>
                </div>
                <div className="text-slate-400">
                  Type: <span className="text-slate-200 font-mono">{selectedConflict.existing_action?.action_type}</span>
                </div>
                <div className="text-slate-400">
                  Subject: <span className="text-slate-200">{selectedConflict.existing_action?.subject_category}</span>
                </div>
                <div className="text-slate-400">
                  Date: <span className="text-slate-200">{selectedConflict.existing_action?.scheduled_date ? new Date(selectedConflict.existing_action.scheduled_date).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Resolution Form */}
            <form onSubmit={handleResolveConflict} className="space-y-4 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Resolution Decision Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {/* Option 1: Coordination */}
                  <label className={`p-2.5 rounded-lg border cursor-pointer transition-colors flex items-start gap-2 ${
                    resolutionType === 'REQUEST_COORDINATION'
                      ? 'bg-blue-950/70 border-blue-500 text-blue-200'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}>
                    <input
                      type="radio"
                      name="resType"
                      value="REQUEST_COORDINATION"
                      checked={resolutionType === 'REQUEST_COORDINATION'}
                      onChange={() => setResolutionType('REQUEST_COORDINATION')}
                      className="mt-0.5 text-blue-500"
                    />
                    <div>
                      <div className="font-semibold">Request Coordination</div>
                      <div className="text-[10px] text-slate-400">Initiate joint bureau alignment on this action</div>
                    </div>
                  </label>

                  {/* Option 2: Supervisor Override */}
                  <label className={`p-2.5 rounded-lg border cursor-pointer transition-colors flex items-start gap-2 ${
                    !isSupervisor
                      ? 'opacity-50 cursor-not-allowed bg-slate-800 border-slate-700 text-slate-500'
                      : resolutionType === 'PROCEED_WITH_JUSTIFICATION'
                      ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}>
                    <input
                      type="radio"
                      name="resType"
                      value="PROCEED_WITH_JUSTIFICATION"
                      disabled={!isSupervisor}
                      checked={resolutionType === 'PROCEED_WITH_JUSTIFICATION'}
                      onChange={() => setResolutionType('PROCEED_WITH_JUSTIFICATION')}
                      className="mt-0.5 text-emerald-500"
                    />
                    <div>
                      <div className="font-semibold flex items-center gap-1">
                        Supervisor Override
                        <span className="text-[9px] px-1 bg-amber-900/60 text-amber-300 rounded font-mono">Supervisor Only</span>
                      </div>
                      <div className="text-[10px] text-slate-400">Exercise administrative discretion to proceed</div>
                    </div>
                  </label>

                  {/* Option 3: Dismiss False Positive */}
                  <label className={`p-2.5 rounded-lg border cursor-pointer transition-colors flex items-start gap-2 ${
                    resolutionType === 'DISMISS_FALSE_POSITIVE'
                      ? 'bg-purple-950/70 border-purple-500 text-purple-200'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}>
                    <input
                      type="radio"
                      name="resType"
                      value="DISMISS_FALSE_POSITIVE"
                      checked={resolutionType === 'DISMISS_FALSE_POSITIVE'}
                      onChange={() => setResolutionType('DISMISS_FALSE_POSITIVE')}
                      className="mt-0.5 text-purple-500"
                    />
                    <div>
                      <div className="font-semibold">Dismiss False Positive</div>
                      <div className="text-[10px] text-slate-400">Actions are materially non-conflicting</div>
                    </div>
                  </label>

                  {/* Option 4: Revise Action */}
                  <label className={`p-2.5 rounded-lg border cursor-pointer transition-colors flex items-start gap-2 ${
                    resolutionType === 'REVISE_ACTION'
                      ? 'bg-teal-950/70 border-teal-500 text-teal-200'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}>
                    <input
                      type="radio"
                      name="resType"
                      value="REVISE_ACTION"
                      checked={resolutionType === 'REVISE_ACTION'}
                      onChange={() => setResolutionType('REVISE_ACTION')}
                      className="mt-0.5 text-teal-500"
                    />
                    <div>
                      <div className="font-semibold">Revise Action</div>
                      <div className="text-[10px] text-slate-400">Return to proposing officer for schedule adjustment</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Justification Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Official Review Justification Notes
                  {(resolutionType === 'PROCEED_WITH_JUSTIFICATION' || resolutionType === 'DISMISS_FALSE_POSITIVE') && (
                    <span className="text-red-400 ml-1 font-normal">(Required, min 10 characters)</span>
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
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              {resolutionError && (
                <div className="p-2.5 bg-red-950/80 border border-red-700 text-red-200 text-xs rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  {resolutionError}
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedConflict(null)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
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
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#102A43] border border-slate-700 rounded-xl max-w-2xl w-full p-6 space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-teal-950 text-teal-400 border border-teal-800/60">
                  <Plus className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">Propose New Regulatory Action</h3>
                  <p className="text-xs text-slate-400">Integrated pre-execution conflict analysis engine</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowProposeModal(false);
                  setValidationResult(null);
                  setCreateActionError(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAction} className="space-y-4">
              {/* Case Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Target Regulatory Case <span className="text-red-400">*</span>
                </label>
                <select
                  value={selectedCaseId}
                  onChange={(e) => {
                    setSelectedCaseId(e.target.value ? Number(e.target.value) : '');
                    setValidationResult(null);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg p-2.5 focus:outline-none focus:border-teal-500"
                  required
                >
                  <option value="">Select an active regulatory case...</option>
                  {cases.map((cs) => (
                    <option key={cs.id} value={cs.id}>
                      {cs.case_reference} — {cs.title} ({cs.current_bureau_name || 'BUREAU'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Type & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Action Type <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={actionType}
                    onChange={(e) => {
                      setActionType(e.target.value);
                      setValidationResult(null);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-teal-500"
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
                  <label className="block font-semibold text-slate-300 mb-1">
                    Regulatory Subject Category <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={subjectCategory}
                    onChange={(e) => {
                      setSubjectCategory(e.target.value);
                      setValidationResult(null);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-teal-500"
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
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Action Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={actionTitle}
                  onChange={(e) => setActionTitle(e.target.value)}
                  placeholder="e.g. On-Site Laboratory Infrastructure Verification"
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg p-2.5 focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              {/* Description & Scheduled Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-300 mb-1">Description / Scope</label>
                  <input
                    type="text"
                    value={actionDescription}
                    onChange={(e) => setActionDescription(e.target.value)}
                    placeholder="Details of verification, parameters inspected..."
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Planned Date</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => {
                      setScheduledDate(e.target.value);
                      setValidationResult(null);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Pre-Check Conflict Guard Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handlePreCheckConflict}
                  disabled={validating || !selectedCaseId}
                  className="w-full py-2.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Sparkles className={`w-4 h-4 text-amber-400 ${validating ? 'animate-spin' : ''}`} />
                  {validating ? 'Evaluating Action Against Active Bureau Schedules...' : 'Check Potential Conflicts Before Submission'}
                </button>
              </div>

              {/* Pre-check Results Card */}
              {validationResult && (
                <div className={`p-3.5 rounded-lg border text-xs space-y-2 ${
                  validationResult.has_conflicts
                    ? 'bg-amber-950/60 border-amber-700 text-amber-200'
                    : 'bg-emerald-950/60 border-emerald-700 text-emerald-200'
                }`}>
                  <div className="flex items-center justify-between font-semibold">
                    <span className="flex items-center gap-1.5">
                      {validationResult.has_conflicts ? (
                        <>
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                          Conflict Guard Warning: {validationResult.conflict_count} Potential Conflict(s) Detected!
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          Pre-check Clear: No immediate conflicts detected.
                        </>
                      )}
                    </span>
                    {validationResult.highest_severity && getSeverityBadge(validationResult.highest_severity)}
                  </div>

                  {validationResult.potential_conflicts.map((item, idx) => (
                    <div key={idx} className="p-2 bg-slate-900/80 rounded border border-slate-800 text-[11px] text-slate-300 space-y-1">
                      <div className="font-semibold text-amber-300">
                        {item.existing_bureau_code}: {item.existing_action_title} ({item.existing_action_type})
                      </div>
                      <div className="text-slate-400">{item.explanation}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Error and Success alerts */}
              {createActionError && (
                <div className="p-3 bg-red-950/80 border border-red-700 text-red-200 text-xs rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  {createActionError}
                </div>
              )}

              {createActionSuccess && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-700 text-emerald-200 text-xs rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                  {createActionSuccess}
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowProposeModal(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
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
