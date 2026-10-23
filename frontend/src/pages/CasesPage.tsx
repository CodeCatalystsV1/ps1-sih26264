import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { Case, Bureau } from '../types';
import { Briefcase, Search, Filter, AlertTriangle, GitCompare, ExternalLink, RefreshCw } from 'lucide-react';

export const CasesPage: React.FC = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [bureaus, setBureaus] = useState<Bureau[]>([]);
  const [search, setSearch] = useState('');
  const [selectedBureau, setSelectedBureau] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [filterOverdue, setFilterOverdue] = useState(false);
  const [filterOverlap, setFilterOverlap] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedBureau) params.append('bureau_id', selectedBureau);
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedPriority) params.append('priority', selectedPriority);
      if (filterOverdue) params.append('is_overdue', 'true');
      if (filterOverlap) params.append('has_overlap', 'true');

      const data = await apiRequest<Case[]>(`/cases?${params.toString()}`);
      setCases(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    apiRequest<Bureau[]>('/admin/bureaus').then(setBureaus).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchCases, 250);
    return () => clearTimeout(timer);
  }, [search, selectedBureau, selectedStatus, selectedPriority, filterOverdue, filterOverlap]);

  return (
    <div className="space-y-6">
      {/* Page Header Banner */}
      <div className="gov-card p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gov-secondary"></span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest font-mono">
              CASE WORKFLOW ENGINE
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gov-dark mt-1">
            Official Grievance Cases
          </h1>
          <p className="text-xs text-gov-muted mt-1">
            Active and resolved official grievance workflow records across AICTE regulatory and grievance bureaus
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="gov-card p-4 flex flex-col lg:flex-row items-center justify-between gap-4 text-xs">
        <div className="relative w-full lg:w-96">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Case Ref, Title, Institution, or Permanent ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="gov-input pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-between lg:justify-end">
          <select
            value={selectedBureau}
            onChange={(e) => setSelectedBureau(e.target.value)}
            className="gov-select"
          >
            <option value="">All Bureaus</option>
            {bureaus.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} — {b.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="gov-select"
          >
            <option value="">All Statuses</option>
            <option value="Received">Received</option>
            <option value="Acknowledged">Acknowledged</option>
            <option value="Under Scrutiny">Under Scrutiny</option>
            <option value="Assigned">Assigned</option>
            <option value="Under Verification">Under Verification</option>
            <option value="Committee Review">Committee Review</option>
            <option value="Disposed">Disposed</option>
            <option value="Transferred">Transferred</option>
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="gov-select"
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>

          {/* Quick Toggles */}
          <button
            type="button"
            onClick={() => setFilterOverdue(!filterOverdue)}
            className={`px-3 py-2 rounded-md border text-xs font-semibold cursor-pointer transition-all shadow-xs ${
              filterOverdue
                ? 'bg-red-700 text-white border-red-800'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-gov-border'
            }`}
          >
            Overdue Only
          </button>

          <button
            type="button"
            onClick={() => setFilterOverlap(!filterOverlap)}
            className={`px-3 py-2 rounded-md border text-xs font-semibold cursor-pointer transition-all shadow-xs ${
              filterOverlap
                ? 'bg-rose-700 text-white border-rose-800'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-gov-border'
            }`}
          >
            Overlaps Only
          </button>

          <span className="text-[11px] font-mono text-slate-400 border-l border-slate-200 pl-3 hidden sm:inline">
            {cases.length} Records
          </span>
        </div>
      </div>

      {/* Cases Table */}
      <div className="gov-table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="gov-table-header">
              <tr>
                <th className="py-3 px-3.5 min-w-[140px]">Case Ref</th>
                <th className="py-3 px-3.5 min-w-[240px]">Institution & Perm ID</th>
                <th className="py-3 px-3.5 min-w-[110px]">Bureau</th>
                <th className="py-3 px-3.5 min-w-[160px]">Handling Officer</th>
                <th className="py-3 px-3.5 min-w-[130px]">Status</th>
                <th className="py-3 px-3.5 min-w-[100px]">Priority</th>
                <th className="py-3 px-3.5 min-w-[140px]">Deadline Status</th>
                <th className="py-3 px-3.5 text-center min-w-[110px]">Coordination</th>
                <th className="py-3 px-3.5 text-right min-w-[90px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Loading cases database...
                  </td>
                </tr>
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No matching cases found
                  </td>
                </tr>
              ) : (
                cases.map((c) => (
                  <tr key={c.id} className="gov-table-row">
                    <td className="py-3 px-3.5 font-mono font-bold text-gov-primary whitespace-nowrap">
                      {c.case_reference}
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="font-semibold text-slate-900 truncate max-w-[230px]" title={c.institution_name}>
                        {c.institution_name}
                      </div>
                      <span className="font-mono text-[10px] text-gov-secondary font-bold">
                        {c.permanent_id}
                      </span>
                    </td>
                    <td className="py-3 px-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {c.current_bureau_code}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-slate-800 font-medium">
                      {c.current_officer_name || <span className="text-slate-400 italic">Unassigned</span>}
                    </td>
                    <td className="py-3 px-3.5">
                      <span className="gov-badge gov-badge-info">
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.priority === 'URGENT'
                          ? 'bg-red-100 text-red-800 border border-red-300'
                          : c.priority === 'HIGH'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {c.priority}
                      </span>
                    </td>
                    <td className="py-3 px-3.5">
                      <span className={`text-[11px] font-medium ${
                        c.is_overdue ? 'text-red-700 font-bold' : 'text-slate-600'
                      }`}>
                        {c.deadline_status_label}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      {c.has_potential_overlap ? (
                        <span className="gov-badge gov-badge-overlap mx-auto">
                          <GitCompare className="w-3 h-3" /> Overlap
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-right whitespace-nowrap">
                      <Link
                        to={`/cases/${c.id}`}
                        className="text-xs text-gov-primary hover:text-gov-secondary font-semibold hover:underline"
                      >
                        Manage &rarr;
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
