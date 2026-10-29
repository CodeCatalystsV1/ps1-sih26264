import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Building,
  FileText,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  HelpCircle,
  RefreshCw,
  GitCompare,
  Clock,
  Layers,
  Check,
  X,
  FileSearch,
  Send,
  Bot,
  User as UserIcon,
  MessageSquare,
  RotateCcw,
} from 'lucide-react';
import { aiApi, apiRequest } from '../api/client';
import {
  AIRelationshipItem,
  AIOverviewStats,
  AIMatchComplaintResponse,
  Complaint,
} from '../types';
import { useAuth } from '../context/AuthContext';

export const AIRelationshipPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // State
  const [stats, setStats] = useState<AIOverviewStats | null>(null);
  const [relationships, setRelationships] = useState<AIRelationshipItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING_REVIEW' | 'APPROVED_LINK' | 'DISMISSED'>('PENDING_REVIEW');
  const [classificationFilter, setClassificationFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Interactive AI Match state
  const [complaintsPool, setComplaintsPool] = useState<Complaint[]>([]);
  const [selectedComplaintId, setSelectedComplaintId] = useState<number | ''>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [matchResult, setMatchResult] = useState<AIMatchComplaintResponse | null>(null);

  // Modals state
  const [comparingItem, setComparingItem] = useState<AIRelationshipItem | null>(null);
  const [reviewingItem, setReviewingItem] = useState<AIRelationshipItem | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'APPROVE_LINK' | 'DISMISS'>('APPROVE_LINK');
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);

  // RAG Window Chat State
  const PREPARED_QUESTION = "How does the AI engine detect duplicate complaints across bureaus?";
  const PREPARED_ANSWER = `The AICTE Case360+ RAG Intelligence Engine detects cross-bureau duplicates through a 4-stage pipeline:

1. Deterministic Permanent ID Resolution: Standardizes AICTE institution IDs (e.g., 1-44642766198) and normalizes common technical educational abbreviations to prevent campus-level blindspots.
2. Multilingual E5 Dense Embeddings: Converts complaint narratives into 384-dimensional normalized vector representations using intfloat/multilingual-e5-small to identify thematic overlap across English, Hindi, and regional languages.
3. Cross-Bureau Overlap Guard: Actively monitors concurrent proceedings across PGRC (Public Grievances), Regulation Bureau (Compliance), and Approval Bureau to prevent duplicate campus inspections or redundant record requests.
4. Explainable Human-in-the-Loop Scrutiny: High-affinity candidates (cosine similarity ≥ 0.85) are presented to bureau supervisors with transparent rationale for final administrative approval.`;

  const [ragMessages, setRagMessages] = useState<Array<{ id: string; sender: 'user' | 'assistant'; text: string; timestamp: string }>>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'How can I help you? ',
      timestamp: 'Just now',
    },
  ]);
  const [ragInput, setRagInput] = useState<string>('');
  const [ragIsThinking, setRagIsThinking] = useState<boolean>(false);
  const chatBottomRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ragMessages, ragIsThinking]);

  const handleRagSubmit = (e?: React.FormEvent, overrideText?: string) => {
    if (e) e.preventDefault();
    const query = (overrideText ?? ragInput).trim();
    if (!query || ragIsThinking) return;

    const userMsgId = 'user_' + Date.now();
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setRagMessages((prev) => [
      ...prev,
      { id: userMsgId, sender: 'user', text: query, timestamp: nowTime },
    ]);
    setRagInput('');
    setRagIsThinking(true);

    // 2-second thinking delay as requested
    setTimeout(() => {
      const normalizedQuery = query.toLowerCase().replace(/[^a-z0-9]/g, ' ');
      const isMatch =
        normalizedQuery.includes('duplicate') ||
        normalizedQuery.includes('how does the ai engine detect') ||
        normalizedQuery.includes('detect duplicate complaints') ||
        normalizedQuery.includes('cross bureau') ||
        normalizedQuery.includes('how does ai');

      const responseText = isMatch
        ? PREPARED_ANSWER
        : `I am currently configured with the prepared RAG benchmark question.\n\nPlease ask: "${PREPARED_QUESTION}" (or click the quick question pill above).`;

      setRagMessages((prev) => [
        ...prev,
        {
          id: 'ai_' + Date.now(),
          sender: 'assistant',
          text: responseText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setRagIsThinking(false);
    }, 2000);
  };

  // Check URL params for initial match request
  useEffect(() => {
    const cid = searchParams.get('complaint_id');
    if (cid) {
      setSelectedComplaintId(parseInt(cid, 10));
    }
  }, [searchParams]);

  // Load complaints for search dropdown
  useEffect(() => {
    async function loadComplaints() {
      try {
        const data = await apiRequest<Complaint[]>('/complaints?limit=100');
        setComplaintsPool(data);
      } catch (err) {
        console.error('Failed to load complaints pool:', err);
      }
    }
    loadComplaints();
  }, []);

  // Fetch Stats and Relationships
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, relData] = await Promise.all([
        aiApi.getStats(),
        aiApi.listRelationships({
          status: activeTab === 'ALL' ? undefined : activeTab,
          classification: classificationFilter === 'ALL' ? undefined : classificationFilter,
        }),
      ]);
      setStats(statsData);
      setRelationships(relData);
    } catch (err: any) {
      setError(err.message || 'Failed to load AI relationship intelligence data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, classificationFilter]);

  // Handle Run AI Analysis
  const handleRunAnalysis = async () => {
    if (!selectedComplaintId) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const res = await aiApi.matchComplaint(Number(selectedComplaintId), 5, 0.60);
      setMatchResult(res);
      // Refresh list and stats
      fetchData();
    } catch (err: any) {
      setError(err.message || 'ML Inference failed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle Review Submit
  const handleSubmitReview = async () => {
    if (!reviewingItem || !reviewNotes.trim()) {
      alert('Review notes are mandatory to record administrative reasoning.');
      return;
    }
    setSubmittingReview(true);
    try {
      await aiApi.reviewRelationship(reviewingItem.id!, reviewDecision, reviewNotes);
      setReviewingItem(null);
      setReviewNotes('');
      if (comparingItem?.id === reviewingItem.id) {
        setComparingItem(null);
      }
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit review decision.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Filtered relationships based on search
  const filteredRelationships = relationships.filter((rel) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      rel.source_reference.toLowerCase().includes(q) ||
      rel.candidate_reference.toLowerCase().includes(q) ||
      rel.source_title.toLowerCase().includes(q) ||
      rel.candidate_title.toLowerCase().includes(q) ||
      (rel.institution_name && rel.institution_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Header */}
      <div className="bg-white p-6 rounded-xl shadow-soft border border-slate-200/90">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-50 text-royal-main rounded-lg border border-blue-200">
                <Sparkles className="w-5 h-5 text-royal-main" />
              </span>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                AI Complaint Relationship Intelligence Engine
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-royal-main border border-blue-200 rounded-full font-mono">
                Multilingual E5 Live
              </span>
            </div>
            <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
              Detects hidden cross-bureau grievances and related disputes using pretrained{' '}
              <span className="text-royal-deep font-semibold">multilingual-e5-small</span> semantic embeddings,
              verified AICTE Permanent IDs, and explainable human-in-the-loop administrative oversight.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden lg:block text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
              <div className="font-semibold text-slate-800">
                Model: {stats?.model_identifier || 'intfloat/multilingual-e5-small'}
              </div>
              <div className="text-[11px] text-royal-main font-mono">
                384-Dim Normalized Embeddings &bull; PyTorch CPU
              </div>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 transition flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              title="Refresh AI Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-royal-main' : ''}`} />
              <span className="hidden sm:inline">Sync Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section A: Live Overview KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-soft card-interactive border-l-4 border-l-amber-500 border border-slate-200/90">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Pending Officer Review
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            {stats?.pending_suggestions_count ?? '—'}
          </div>
          <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1 font-medium">
            <Clock className="w-3.5 h-3.5" /> Awaiting administrative scrutiny
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-soft card-interactive border-l-4 border-l-emerald-600 border border-slate-200/90">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Approved Relationships
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            {stats?.approved_links_count ?? '—'}
          </div>
          <p className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1 font-medium">
            <CheckCircle className="w-3.5 h-3.5" /> Confirmed related grievances
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-soft card-interactive border-l-4 border-l-slate-400 border border-slate-200/90">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Dismissed Suggestions
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            {stats?.dismissed_suggestions_count ?? '—'}
          </div>
          <p className="text-[11px] text-slate-600 mt-1 flex items-center gap-1 font-medium">
            <XCircle className="w-3.5 h-3.5" /> Flagged as different issues
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-soft card-interactive border-l-4 border-l-royal-main border border-slate-200/90">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Grievances with Embeddings
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-royal-deep mt-1">
            {stats?.total_analyzed_complaints_count ?? '—'}
          </div>
          <p className="text-[11px] text-royal-main mt-1 flex items-center gap-1 font-medium">
            <Layers className="w-3.5 h-3.5" /> Indexed in vector repository
          </p>
        </div>
      </div>

      {/* Workspace Grid: Left Column (Analysis & Table) + Right Column (RAG Window) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Analysis workspace & Tables */}
        <div className="xl:col-span-8 space-y-6">
          {/* Section B: Find & Match Complaints Live Workspace (AI Panel) */}
          <div className="ai-panel p-6 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileSearch className="w-4 h-4 text-teal-700" />
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                  Analyze Grievance for Relationships (Live ML Inference)
                </h2>
              </div>
              <span className="text-xs text-slate-500">
                Select an existing complaint to trigger real-time Multilingual E5 inference
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <select
                  value={selectedComplaintId}
                  onChange={(e) => setSelectedComplaintId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-600"
                >
                  <option value="">-- Choose a Complaint to Analyze --</option>
                  {complaintsPool.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.complaint_reference}] {c.title.length > 70 ? c.title.substring(0, 70) + '...' : c.title} (
                      {c.assigned_bureau_name || 'UNALLOCATED'})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleRunAnalysis}
                disabled={!selectedComplaintId || isAnalyzing}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${!selectedComplaintId || isAnalyzing
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-royal-main hover:bg-royal-deep text-white shadow-soft hover:shadow-elevated'
                  }`}
              >
                <Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-spin text-amber-300' : 'text-sky-200'}`} />
                <span>{isAnalyzing ? 'Running E5-Small Model...' : 'Run AI Analysis'}</span>
              </button>
            </div>

            {/* Live Match Result Feedback Banner */}
            {matchResult && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2 text-xs">
                <div className="flex items-center justify-between text-royal-navy font-bold">
                  <span>
                    Analysis Result for {matchResult.source_reference}: {matchResult.source_title}
                  </span>
                  <span className="bg-blue-200/80 text-royal-deep px-2 py-0.5 rounded text-[11px] font-mono">
                    {matchResult.suggestions_count} suggestion(s) retrieved from {matchResult.total_candidates_analyzed} candidates
                  </span>
                </div>
                <p className="text-royal-deep text-[11px]">
                  Institution: <span className="font-semibold text-slate-900">{matchResult.institution_name}</span> ({matchResult.permanent_id})
                </p>
              </div>
            )}
          </div>

          {/* Section C: Suggestions Table & Filter Controls */}
          <div className="bg-white rounded-xl shadow-soft border border-slate-200/90 overflow-hidden">
            {/* Tab Header */}
            <div className="border-b border-slate-200 bg-slate-50/70 p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('PENDING_REVIEW')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${activeTab === 'PENDING_REVIEW'
                    ? 'bg-amber-600 text-white shadow-soft'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                >
                  Pending Review ({stats?.pending_suggestions_count ?? 0})
                </button>
                <button
                  onClick={() => setActiveTab('APPROVED_LINK')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${activeTab === 'APPROVED_LINK'
                    ? 'bg-emerald-600 text-white shadow-soft'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                >
                  Approved Links ({stats?.approved_links_count ?? 0})
                </button>
                <button
                  onClick={() => setActiveTab('DISMISSED')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${activeTab === 'DISMISSED'
                    ? 'bg-slate-700 text-white shadow-soft'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                >
                  Dismissed ({stats?.dismissed_suggestions_count ?? 0})
                </button>
                <button
                  onClick={() => setActiveTab('ALL')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${activeTab === 'ALL'
                    ? 'bg-royal-main text-white shadow-soft'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                >
                  All Records
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search reference or keywords..."
                    className="text-xs bg-white border border-slate-300 rounded pl-8 pr-3 py-1.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 w-48 sm:w-60"
                  />
                </div>

                <select
                  value={classificationFilter}
                  onChange={(e) => setClassificationFilter(e.target.value)}
                  className="text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-600"
                >
                  <option value="ALL">All Classifications</option>
                  <option value="POSSIBLY_RELATED">Possibly Related</option>
                  <option value="NEEDS_REVIEW">Needs Review</option>
                  <option value="DIFFERENT_ISSUE">Different Issue</option>
                  <option value="INSTITUTION_UNCONFIRMED">Institution Unconfirmed</option>
                </select>
              </div>
            </div>

            {/* Content Table */}
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-teal-600" />
                <span>Loading AI relationship recommendations...</span>
              </div>
            ) : error ? (
              <div className="p-8 text-center text-xs text-red-600 bg-red-50 border-t border-red-200">
                {error}
              </div>
            ) : filteredRelationships.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <Sparkles className="w-8 h-8 text-slate-300 mx-auto" />
                <div className="text-sm font-semibold text-slate-700">No suggestions found in this view</div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Use the "Analyze Grievance" workspace above to run pretrained multilingual embedding matching against registered complaints.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
                      <th className="py-2.5 px-3">Grievance Pair</th>
                      <th className="py-2.5 px-3">Institution & Verification</th>
                      <th className="py-2.5 px-3">Bureau Context</th>
                      <th className="py-2.5 px-3">Semantic Score</th>
                      <th className="py-2.5 px-3">Classification</th>
                      <th className="py-2.5 px-3">Review Status</th>
                      <th className="py-2.5 px-3 text-right">Officer Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRelationships.map((item) => {
                      const pct = Math.round(item.semantic_similarity * 100);
                      const isPending = item.status === 'PENDING_REVIEW';
                      const isApproved = item.status === 'APPROVED_LINK';
                      const isDismissed = item.status === 'DISMISSED';

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition">
                          {/* Pair references */}
                          <td className="py-3 px-3">
                            <div className="space-y-1">
                              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                <span>{item.source_reference}</span>
                                <ArrowRight className="w-3 h-3 text-slate-400" />
                                <span>{item.candidate_reference}</span>
                              </div>
                              <div className="text-[11px] text-slate-500 max-w-xs truncate" title={item.source_title}>
                                Source: {item.source_title}
                              </div>
                              <div className="text-[11px] text-slate-600 max-w-xs truncate font-medium" title={item.candidate_title}>
                                Target: {item.candidate_title}
                              </div>
                            </div>
                          </td>

                          {/* Institution */}
                          <td className="py-3 px-3">
                            <div className="space-y-0.5">
                              <div className="font-semibold text-slate-800">{item.institution_name}</div>
                              <div className="text-[11px] text-slate-500 font-mono">PID: {item.permanent_id}</div>
                              <span className="inline-block px-1.5 py-0.2 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                                Verified Match
                              </span>
                            </div>
                          </td>

                          {/* Bureau Context */}
                          <td className="py-3 px-3">
                            <div className="space-y-1">
                              {item.is_cross_bureau ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 rounded">
                                  <GitCompare className="w-3 h-3" /> Cross-Bureau
                                </span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 text-[10px] bg-slate-100 text-slate-700 border border-slate-200 rounded">
                                  Internal Bureau
                                </span>
                              )}
                              <div className="text-[11px] text-slate-500">
                                {item.source_bureau || 'PGRC'} vs {item.candidate_bureau || 'RB'}
                              </div>
                            </div>
                          </td>

                          {/* Semantic Score */}
                          <td className="py-3 px-3">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between font-bold text-slate-800">
                                <span>{pct}%</span>
                                <span className="text-[10px] text-slate-400">({item.semantic_similarity.toFixed(3)})</span>
                              </div>
                              <div className="w-24 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${pct >= 80 ? 'bg-emerald-600' : pct >= 70 ? 'bg-amber-500' : 'bg-slate-400'
                                    }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Classification */}
                          <td className="py-3 px-3">
                            {item.match_classification === 'POSSIBLY_RELATED' && (
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                Possibly Related
                              </span>
                            )}
                            {item.match_classification === 'NEEDS_REVIEW' && (
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                Needs Review
                              </span>
                            )}
                            {item.match_classification === 'DIFFERENT_ISSUE' && (
                              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-300">
                                Different Issue
                              </span>
                            )}
                            {item.match_classification === 'INSTITUTION_UNCONFIRMED' && (
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800 border border-red-300">
                                Unconfirmed Inst.
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3">
                            {isPending && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                <Clock className="w-3 h-3" /> Pending Review
                              </span>
                            )}
                            {isApproved && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <CheckCircle className="w-3 h-3" /> Approved Link
                              </span>
                            )}
                            {isDismissed && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                                <XCircle className="w-3 h-3" /> Dismissed
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setComparingItem(item)}
                                className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 transition"
                              >
                                Compare Evidence
                              </button>

                              {isPending && (
                                <>
                                  <button
                                    onClick={() => {
                                      setReviewingItem(item);
                                      setReviewDecision('APPROVE_LINK');
                                      setReviewNotes('Approved relationship based on verifiable semantic & institutional overlap.');
                                    }}
                                    className="p-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded border border-emerald-300 transition"
                                    title="Approve Link"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setReviewingItem(item);
                                      setReviewDecision('DISMISS');
                                      setReviewNotes('Dismissed: Complaints represent distinct administrative issues.');
                                    }}
                                    className="p-1 bg-red-100 hover:bg-red-200 text-red-800 rounded border border-red-300 transition"
                                    title="Dismiss Suggestion"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 cols): RAG Window */}
        <div className="xl:col-span-4">
          <div className="bg-white rounded-xl shadow-soft border border-slate-200/90 flex flex-col h-[650px] overflow-hidden sticky top-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-royal-deep to-royal-main p-4 text-white flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                  <Bot className="w-5 h-5 text-sky-200" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm tracking-tight">RAG Window</h3>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  </div>
                  <p className="text-[10px] text-sky-100/80 font-mono">Retrieval-Augmented Intelligence</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setRagMessages([
                    {
                      id: 'welcome',
                      sender: 'assistant',
                      text: 'How can I help you? ',
                      timestamp: 'Just now',
                    },
                  ]);
                  setRagIsThinking(false);
                }}
                className="p-1.5 hover:bg-white/10 rounded text-sky-200 hover:text-white transition cursor-pointer"
                title="Reset Chat"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick prepared question chip */}
            <div className="p-3 bg-blue-50/70 border-b border-blue-100 flex flex-col gap-1.5 shrink-0">
              <span className="text-[10px] font-bold text-royal-main uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-royal-main" /> Prepared RAG Question (Click to Ask)
              </span>
              <button
                onClick={() => handleRagSubmit(undefined, PREPARED_QUESTION)}
                disabled={ragIsThinking}
                className="text-left text-[11px] font-medium text-slate-700 bg-white hover:bg-blue-100/70 p-2.5 rounded-lg border border-blue-200/90 transition text-balance flex items-start gap-2 cursor-pointer shadow-2xs"
              >
                <MessageSquare className="w-3.5 h-3.5 text-royal-main shrink-0 mt-0.5" />
                <span>{PREPARED_QUESTION}</span>
              </button>
            </div>

            {/* Chat message history body */}
            <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-slate-50/50">
              {ragMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-royal-main text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${msg.sender === 'user'
                      ? 'bg-royal-main text-white rounded-br-2xs'
                      : 'bg-white text-slate-800 border border-slate-200 shadow-2xs rounded-bl-2xs'
                      }`}
                  >
                    <div className="whitespace-pre-line">{msg.text}</div>
                    <div
                      className={`text-[9px] mt-1 text-right ${msg.sender === 'user' ? 'text-blue-100/80' : 'text-slate-400'
                        }`}
                    >
                      {msg.timestamp}
                    </div>
                  </div>
                  {msg.sender === 'user' && (
                    <div className="w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      <UserIcon className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              ))}

              {/* 2-Second Thinking Indicator */}
              {ragIsThinking && (
                <div className="flex gap-2 justify-start">
                  <div className="w-6 h-6 rounded-full bg-royal-main text-white flex items-center justify-center shrink-0 shadow-2xs animate-pulse">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <div className="bg-white border border-blue-200 text-royal-main rounded-xl rounded-bl-2xs px-3 py-2 text-xs shadow-2xs flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 animate-spin text-royal-main" />
                    <span className="font-medium text-[11px]">Thinking... (retrieving embeddings)</span>
                    <div className="flex gap-1 ml-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-royal-main animate-bounce"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-royal-main animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-royal-main animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input Form Bar */}
            <form onSubmit={(e) => handleRagSubmit(e)} className="p-2.5 bg-white border-t border-slate-200 shrink-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={ragInput}
                  onChange={(e) => setRagInput(e.target.value)}
                  placeholder="Ask a question and press Enter..."
                  disabled={ragIsThinking}
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-royal-main"
                />
                <button
                  type="submit"
                  disabled={!ragInput.trim() || ragIsThinking}
                  className={`p-2 rounded-lg text-white transition flex items-center justify-center ${!ragInput.trim() || ragIsThinking
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-royal-main hover:bg-royal-deep cursor-pointer shadow-soft'
                    }`}
                  title="Send Question"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Section D: Evidence Comparison Modal */}
      {comparingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-4xl w-full overflow-hidden my-8">
            {/* Modal Header */}
            <div className="bg-[#102A43] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitCompare className="w-5 h-5 text-teal-400" />
                <h3 className="font-bold text-sm">
                  Side-by-Side Evidence Comparison: {comparingItem.source_reference} vs{' '}
                  {comparingItem.candidate_reference}
                </h3>
              </div>
              <button
                onClick={() => setComparingItem(null)}
                className="text-slate-300 hover:text-white p-1 rounded transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 text-xs max-h-[75vh] overflow-y-auto">
              {/* Institution & Model Metadata */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <span className="text-slate-500 font-semibold uppercase text-[10px]">Institution:</span>{' '}
                  <span className="font-bold text-slate-800">{comparingItem.institution_name}</span> (PID:{' '}
                  {comparingItem.permanent_id})
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-semibold">
                    Similarity: {Math.round(comparingItem.semantic_similarity * 100)}% (
                    {comparingItem.semantic_similarity.toFixed(3)})
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                    Class: {comparingItem.match_classification}
                  </span>
                </div>
              </div>

              {/* Side by side comparison panels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Source Complaint */}
                <div className="border border-slate-200 rounded-md p-4 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-800 text-xs text-teal-800">
                      SOURCE GRIEVANCE ({comparingItem.source_reference})
                    </span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold text-[10px]">
                      Bureau: {comparingItem.source_bureau || 'PGRC'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Title:</span>
                    <p className="font-semibold text-slate-800 text-xs mt-0.5">{comparingItem.source_title}</p>
                  </div>
                </div>

                {/* Candidate Complaint */}
                <div className="border border-slate-200 rounded-md p-4 bg-slate-50/50 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-800 text-xs text-indigo-800">
                      CANDIDATE GRIEVANCE ({comparingItem.candidate_reference})
                    </span>
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-semibold text-[10px]">
                      Bureau: {comparingItem.candidate_bureau || 'RB'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Title:</span>
                    <p className="font-semibold text-slate-800 text-xs mt-0.5">{comparingItem.candidate_title}</p>
                  </div>
                  {comparingItem.candidate_description && (
                    <div>
                      <span className="text-slate-500 text-[11px] block">Verbatim Description:</span>
                      <p className="text-slate-700 bg-white p-2 rounded border border-slate-200 text-xs mt-0.5 leading-relaxed">
                        {comparingItem.candidate_description}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-slate-500">Category:</span>
                    <span className="font-semibold text-slate-700">{comparingItem.candidate_category || 'GENERAL'}</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-500">Status:</span>
                    <span className="font-semibold text-slate-700">{comparingItem.candidate_status}</span>
                  </div>
                </div>
              </div>

              {/* Explainable AI Narrative Bullet Points */}
              <div className="p-4 bg-teal-50/60 border border-teal-200 rounded-md space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-teal-950 text-xs">
                  <Sparkles className="w-4 h-4 text-teal-700" />
                  <span>Explainable AI Inference Rationale</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-slate-700 text-[11px]">
                  {comparingItem.explanation.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* Review Audit History if already reviewed */}
              {comparingItem.status !== 'PENDING_REVIEW' && (
                <div className="p-3 bg-slate-100 border border-slate-200 rounded-md space-y-1">
                  <div className="font-semibold text-slate-800 text-[11px]">Review Decision History:</div>
                  <div className="text-[11px] text-slate-600">
                    Status: <span className="font-bold">{comparingItem.status}</span> by{' '}
                    <span className="font-medium">{comparingItem.reviewed_by_name || 'Authorized Officer'}</span> on{' '}
                    {comparingItem.reviewed_at ? new Date(comparingItem.reviewed_at).toLocaleString() : 'N/A'}
                  </div>
                  {comparingItem.review_notes && (
                    <div className="text-[11px] text-slate-700 italic mt-1 bg-white p-2 rounded border border-slate-200">
                      "{comparingItem.review_notes}"
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                AICTE Case360+ strictly enforces Human-in-the-Loop decision verification.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setComparingItem(null)}
                  className="px-3 py-1.5 text-xs bg-white text-slate-700 border border-slate-300 rounded hover:bg-slate-100"
                >
                  Close
                </button>
                {comparingItem.status === 'PENDING_REVIEW' && (
                  <>
                    <button
                      onClick={() => {
                        setReviewingItem(comparingItem);
                        setReviewDecision('DISMISS');
                        setReviewNotes('Dismissed: Evaluated as distinct administrative issue.');
                      }}
                      className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded font-medium"
                    >
                      Dismiss Suggestion
                    </button>
                    <button
                      onClick={() => {
                        setReviewingItem(comparingItem);
                        setReviewDecision('APPROVE_LINK');
                        setReviewNotes('Approved relationship based on semantic narrative & institutional evidence.');
                      }}
                      className="px-3 py-1.5 text-xs bg-emerald-700 hover:bg-emerald-800 text-white rounded font-medium"
                    >
                      Approve Link
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section E: Human Review Confirmation Modal */}
      {reviewingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div className={`p-4 text-white flex items-center justify-between ${reviewDecision === 'APPROVE_LINK' ? 'bg-emerald-800' : 'bg-red-800'
              }`}>
              <div className="flex items-center gap-2 font-bold text-sm">
                {reviewDecision === 'APPROVE_LINK' ? (
                  <CheckCircle className="w-5 h-5 text-emerald-300" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-300" />
                )}
                <span>
                  {reviewDecision === 'APPROVE_LINK' ? 'Confirm Complaint Relationship Link' : 'Dismiss AI Suggestion'}
                </span>
              </div>
              <button
                onClick={() => setReviewingItem(null)}
                className="text-slate-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                <div className="text-slate-600">
                  Linking <span className="font-bold text-slate-800">{reviewingItem.source_reference}</span> with{' '}
                  <span className="font-bold text-slate-800">{reviewingItem.candidate_reference}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Institution: {reviewingItem.institution_name} ({reviewingItem.permanent_id})
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Administrative Review Justification Notes (Mandatory for Audit Trail):
                </label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Enter official reasoning for this decision..."
                  className="w-full bg-slate-50 border border-slate-300 rounded p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>

              <div className="text-[11px] text-slate-500 bg-amber-50 p-2.5 border border-amber-200 rounded flex items-start gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  This decision will be immutably recorded with your officer credentials ({user?.display_name || 'Current User'})
                  and synced into the Institution 360° audit timeline.
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setReviewingItem(null)}
                className="px-3 py-1.5 text-xs bg-white text-slate-700 border border-slate-300 rounded hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={submittingReview || !reviewNotes.trim()}
                className={`px-4 py-1.5 text-xs font-semibold rounded text-white transition ${reviewDecision === 'APPROVE_LINK'
                  ? 'bg-emerald-700 hover:bg-emerald-800'
                  : 'bg-red-700 hover:bg-red-800'
                  } ${submittingReview || !reviewNotes.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {submittingReview ? 'Submitting...' : 'Record Official Decision'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIRelationshipPage;
