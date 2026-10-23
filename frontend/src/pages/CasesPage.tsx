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
      {/* Header */}
      <div className="bg-white p-4 rounded-md border border-gov-border shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gov-dark">Official Cases Management</h1>
          <p className="text-xs text-gov-muted mt-0.5">
            Active and resolved official grievance workflow records across AICTE Bureaus
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-md border border-gov-border shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Case Ref, Title, Institution, or Permanent ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-gov-primary focus:border-gov-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedBureau}
            onChange={(e) => setSelectedBureau(e.target.value)}
            className="border border-slate-300 rounded-md px-2.5 py-1.5 bg-white text-xs"
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
            className="border border-slate-300 rounded-md px-2.5 py-1.5 bg-white text-xs"
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
            className="border border-slate-300 rounded-md px-2.5 py-1.5 bg-white text-xs"
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
            className={`px-2.5 py-1.5 rounded border text-xs font-semibold cursor-pointer transition-colors ${
              filterOverdue
                ? 'bg-red-600 text-white border-red-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
          >
            Overdue Only
          </button>

          <button
            type="button"
            onClick={() => setFilterOverlap(!filterOverlap)}
            className={`px-2.5 py-1.5 rounded border text-xs font-semibold cursor-pointer transition-colors ${
              filterOverlap
                ? 'bg-rose-600 text-white border-rose-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
          >
            Overlaps Only
          </button>
        </div>
      </div>

      {/* Cases Table */}
      <div className="bg-white rounded-md border border-gov-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="gov-table-header">
              <tr>
                <th className="py-3 px-3">Case Ref</th>
                <th className="py-3 px-3">Institution & Perm ID</th>
                <th className="py-3 px-3">Current Bureau</th>
                <th className="py-3 px-3">Handling Officer</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Priority</th>
                <th className="py-3 px-3">Deadline Status</th>
                <th className="py-3 px-3 text-center">Coordination</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Loading cases database...
                  </td>
                </tr>
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No matching cases found
                  </td>
                </tr>
              ) : (
                cases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-gov-primary whitespace-nowrap">
                      {c.case_reference}
                    </td>
                    <td className="py-3 px-3 max-w-[190px]">
                      <div className="font-semibold text-slate-900 truncate" title={c.institution_name}>
                        {c.institution_name}
                      </div>
                      <span className="font-mono text-[10px] text-gov-secondary font-bold">
                        {c.permanent_id}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {c.current_bureau_code}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-medium">
                      {c.current_officer_name || 'Unassigned'}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.priority === 'URGENT' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {c.priority}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-[11px] font-medium ${
                        c.is_overdue ? 'text-red-700 font-bold' : 'text-slate-600'
                      }`}>
                        {c.deadline_status_label}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {c.has_potential_overlap ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-red-600 text-white flex items-center justify-center gap-1 mx-auto w-fit">
                          <GitCompare className="w-3 h-3" /> Overlap
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <Link
                        to={`/cases/${c.id}`}
                        className="text-xs text-gov-primary hover:underline font-semibold"
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
