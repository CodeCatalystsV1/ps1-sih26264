import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { AuditLog } from '../types';
import { History, Search, Filter, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';

export const AuditTrailPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [actionFilter, setActionFilter] = useState('');
  const [recordFilter, setRecordFilter] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (actionFilter) params.append('action_type', actionFilter);
      if (recordFilter) params.append('record_type', recordFilter);
      if (outcomeFilter) params.append('outcome', outcomeFilter);

      const data = await apiRequest<AuditLog[]>(`/audit?${params.toString()}`);
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, recordFilter, outcomeFilter]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-md border border-gov-border shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gov-dark">System Security & Audit Trail</h1>
          <p className="text-xs text-gov-muted mt-0.5">
            Immutable log of all user authentications, status changes, bureau transfers, and coordination decisions
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-md border border-gov-border shadow-sm flex flex-wrap items-center gap-3 text-xs">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="border border-slate-300 rounded px-2.5 py-1.5 bg-white"
        >
          <option value="">All Action Types</option>
          <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
          <option value="LOGIN_FAILED">LOGIN_FAILED</option>
          <option value="COMPLAINT_REGISTERED">COMPLAINT_REGISTERED</option>
          <option value="CASE_STATUS_UPDATED">CASE_STATUS_UPDATED</option>
          <option value="CASE_ASSIGNED">CASE_ASSIGNED</option>
          <option value="CASE_TRANSFERRED">CASE_TRANSFERRED</option>
          <option value="OVERLAP_FLAG_CREATED">OVERLAP_FLAG_CREATED</option>
          <option value="OVERLAP_REVIEW">OVERLAP_REVIEW</option>
          <option value="EXPORT_REPORT">EXPORT_REPORT</option>
        </select>

        <select
          value={recordFilter}
          onChange={(e) => setRecordFilter(e.target.value)}
          className="border border-slate-300 rounded px-2.5 py-1.5 bg-white"
        >
          <option value="">All Record Types</option>
          <option value="User">User</option>
          <option value="Institution">Institution</option>
          <option value="Complaint">Complaint</option>
          <option value="Case">Case</option>
          <option value="OverlapFlag">OverlapFlag</option>
          <option value="Report">Report</option>
        </select>

        <select
          value={outcomeFilter}
          onChange={(e) => setOutcomeFilter(e.target.value)}
          className="border border-slate-300 rounded px-2.5 py-1.5 bg-white"
        >
          <option value="">All Outcomes</option>
          <option value="SUCCESS">SUCCESS</option>
          <option value="FAILURE">FAILURE</option>
          <option value="DENIED">DENIED</option>
        </select>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-md border border-gov-border shadow-sm overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="gov-table-header">
              <tr>
                <th className="py-2.5 px-3">Timestamp (UTC)</th>
                <th className="py-2.5 px-3">Actor / User</th>
                <th className="py-2.5 px-3">Action Type</th>
                <th className="py-2.5 px-3">Target Entity</th>
                <th className="py-2.5 px-3">Record ID</th>
                <th className="py-2.5 px-3">Outcome</th>
                <th className="py-2.5 px-3">Metadata Context</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                    No matching audit log records found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toISOString().replace('T', ' ').slice(0, 19)}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800 font-sans">
                      {log.user_name || 'System'}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-gov-primary">{log.action_type}</td>
                    <td className="py-2.5 px-3 text-slate-600 font-sans">{log.record_type}</td>
                    <td className="py-2.5 px-3 text-slate-700">{log.record_id || '-'}</td>
                    <td className="py-2.5 px-3 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.outcome === 'SUCCESS'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {log.outcome}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 max-w-[280px] truncate" title={log.metadata_json || ''}>
                      {log.metadata_json || '-'}
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
