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
      <div className="gov-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              System Security & Statutory Audit Trail
            </h1>
            <p className="text-xs text-slate-600">
              Immutable statutory record of all authentications, case transitions, bureau reallocations, and coordination rulings.
            </p>
          </div>
          <span className="gov-badge-neutral font-mono text-xs self-start sm:self-auto">
            Tamper-Evident Ledger
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="gov-card p-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="w-full sm:w-auto flex-1 min-w-[200px]">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="gov-select"
            >
              <option value="">All Action Categories</option>
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
          </div>

          <div className="w-full sm:w-auto flex-1 min-w-[180px]">
            <select
              value={recordFilter}
              onChange={(e) => setRecordFilter(e.target.value)}
              className="gov-select"
            >
              <option value="">All Record Entities</option>
              <option value="User">User</option>
              <option value="Institution">Institution</option>
              <option value="Complaint">Complaint</option>
              <option value="Case">Case</option>
              <option value="OverlapFlag">OverlapFlag</option>
              <option value="Report">Report</option>
            </select>
          </div>

          <div className="w-full sm:w-auto min-w-[160px]">
            <select
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value)}
              className="gov-select"
            >
              <option value="">All Outcomes</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILURE">FAILURE</option>
              <option value="DENIED">DENIED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="gov-card overflow-hidden">
        <div className="gov-card-header p-4 bg-slate-50/80 border-b border-gov-border flex items-center justify-between">
          <span className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-gov-primary" />
            Audit Ledger ({logs.length} Events)
          </span>
          <span className="text-[11px] text-slate-500 font-mono">UTC Event Synchronization</span>
        </div>
        <div className="gov-table-container">
          <table className="gov-table">
            <thead>
              <tr className="gov-table-header">
                <th className="min-w-[170px]">Timestamp (UTC)</th>
                <th className="min-w-[150px]">Actor / Official</th>
                <th className="min-w-[190px]">Action Category</th>
                <th className="min-w-[130px]">Target Entity</th>
                <th className="min-w-[110px]">Record ID</th>
                <th className="min-w-[110px]">Audit Outcome</th>
                <th className="min-w-[300px]">Contextual Metadata</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[11px]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-gov-primary mb-2"></div>
                    <p>Retrieving immutable audit logs...</p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                    No matching audit log records found for selected filter criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="gov-table-row">
                    <td className="text-slate-600 whitespace-nowrap">
                      {new Date(log.created_at).toISOString().replace('T', ' ').slice(0, 19)}
                    </td>
                    <td className="font-semibold text-slate-900 font-sans text-xs">
                      {log.user_name || 'System / Daemon'}
                    </td>
                    <td className="font-bold text-gov-primary">{log.action_type}</td>
                    <td className="text-slate-700 font-sans text-xs">{log.record_type}</td>
                    <td className="text-slate-600">{log.record_id || '-'}</td>
                    <td className="font-sans">
                      <span className={log.outcome === 'SUCCESS' ? 'gov-badge-success' : 'gov-badge-danger'}>
                        {log.outcome}
                      </span>
                    </td>
                    <td className="text-slate-600 font-mono text-[11px] max-w-[350px] truncate" title={log.metadata_json || ''}>
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
