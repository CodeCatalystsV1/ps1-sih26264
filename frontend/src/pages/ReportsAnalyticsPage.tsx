import React, { useState, useEffect } from 'react';
import { apiRequest, getAuthToken } from '../api/client';
import { BureauWorkload, RegionWorkload, AgeingBand } from '../types';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  Building,
  MapPin,
  Clock,
  RefreshCw,
  CheckCircle,
} from 'lucide-react';

export const ReportsAnalyticsPage: React.FC = () => {
  const [bureauWorkloads, setBureauWorkloads] = useState<BureauWorkload[]>([]);
  const [regionWorkloads, setRegionWorkloads] = useState<RegionWorkload[]>([]);
  const [ageingBands, setAgeingBands] = useState<AgeingBand[]>([]);
  const [activeTab, setActiveTab] = useState<'bureau' | 'region' | 'ageing'>('bureau');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [bw, rw, ab] = await Promise.all([
        apiRequest<BureauWorkload[]>('/reports/bureau-workload'),
        apiRequest<RegionWorkload[]>('/reports/regional'),
        apiRequest<AgeingBand[]>('/reports/ageing'),
      ]);
      setBureauWorkloads(bw);
      setRegionWorkloads(rw);
      setAgeingBands(ab);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    setExporting(format);
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/reports/export?format=${format}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Export generation failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = format === 'excel' ? 'xlsx' : format;
      a.download = `aicte_icms_official_report_${new Date().toISOString().slice(0, 10)}.${ext}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || 'Export failed');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Export Controls */}
      <div className="gov-card p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Official Institutional Reports & Analytics
            </h1>
            <p className="text-xs text-slate-600">
              Database-calculated institutional grievance statistics, bureau disposal metrics, and formal statutory export downloads.
            </p>
          </div>

          {/* Real Export Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleExport('csv')}
              disabled={exporting !== null}
              className="gov-btn-secondary text-xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>{exporting === 'csv' ? 'Generating...' : 'Export CSV'}</span>
            </button>

            <button
              onClick={() => handleExport('excel')}
              disabled={exporting !== null}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-semibold rounded-md border border-emerald-300 shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>{exporting === 'excel' ? 'Generating...' : 'Export Excel (.xlsx)'}</span>
            </button>

            <button
              onClick={() => handleExport('pdf')}
              disabled={exporting !== null}
              className="gov-btn-primary text-xs flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-amber-300" />
              <span>{exporting === 'pdf' ? 'Compiling PDF...' : 'Export Official PDF'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Institutional Folder Tabs */}
      <div className="border-b border-gov-border">
        <nav className="flex space-x-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('bureau')}
            className={`py-2.5 px-4 rounded-t-md border-t border-x transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'bureau'
                ? 'bg-white border-gov-border text-gov-primary border-b-2 border-b-white -mb-px'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <Building className="w-4 h-4 text-gov-primary" />
            <span>Bureau-wise Workload Report</span>
          </button>
          <button
            onClick={() => setActiveTab('region')}
            className={`py-2.5 px-4 rounded-t-md border-t border-x transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'region'
                ? 'bg-white border-gov-border text-gov-primary border-b-2 border-b-white -mb-px'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <MapPin className="w-4 h-4 text-gov-primary" />
            <span>Regional Office Distribution</span>
          </button>
          <button
            onClick={() => setActiveTab('ageing')}
            className={`py-2.5 px-4 rounded-t-md border-t border-x transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'ageing'
                ? 'bg-white border-gov-border text-gov-primary border-b-2 border-b-white -mb-px'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
            }`}
          >
            <Clock className="w-4 h-4 text-gov-primary" />
            <span>Pending Case Ageing Breakdown</span>
          </button>
        </nav>
      </div>

      {/* Tab 1: Bureau-wise Report */}
      {activeTab === 'bureau' && (
        <div className="gov-card overflow-hidden">
          <div className="gov-card-header p-4 bg-slate-50/80 border-b border-gov-border flex items-center justify-between">
            <span className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Building className="w-4 h-4 text-gov-primary" />
              AICTE Bureau & Cell Performance Summary
            </span>
            <span className="text-[11px] text-slate-500 font-mono">Consolidated Database Metrics</span>
          </div>
          <div className="gov-table-container">
            <table className="gov-table">
              <thead>
                <tr className="gov-table-header">
                  <th className="min-w-[120px]">Bureau Code</th>
                  <th className="min-w-[220px]">Bureau / Statutory Cell</th>
                  <th className="min-w-[120px] text-center">Total Assigned</th>
                  <th className="min-w-[130px] text-center">Pending Scrutiny</th>
                  <th className="min-w-[130px] text-center">Under Process</th>
                  <th className="min-w-[120px] text-center">Disposed</th>
                  <th className="min-w-[120px] text-center text-red-700">Overdue</th>
                </tr>
              </thead>
              <tbody>
                {bureauWorkloads.map((b) => (
                  <tr key={b.bureau_id} className="gov-table-row">
                    <td className="font-mono font-bold text-gov-primary text-xs">{b.bureau_code}</td>
                    <td className="font-semibold text-slate-900 text-xs">{b.bureau_name}</td>
                    <td className="text-center font-bold text-slate-900 text-xs font-mono">{b.total_assigned}</td>
                    <td className="text-center text-amber-800 font-semibold text-xs font-mono">{b.pending_count}</td>
                    <td className="text-center text-blue-800 font-semibold text-xs font-mono">{b.under_process_count}</td>
                    <td className="text-center text-emerald-800 font-bold text-xs font-mono">{b.disposed_count}</td>
                    <td className="text-center font-bold font-mono text-xs">
                      {b.overdue_count > 0 ? (
                        <span className="gov-badge-danger">{b.overdue_count} Overdue</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Region-wise Report */}
      {activeTab === 'region' && (
        <div className="gov-card overflow-hidden">
          <div className="gov-card-header p-4 bg-slate-50/80 border-b border-gov-border flex items-center justify-between">
            <span className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gov-primary" />
              Regional Office Jurisdiction Report
            </span>
            <span className="text-[11px] text-slate-500 font-mono">Territorial Distribution</span>
          </div>
          <div className="gov-table-container">
            <table className="gov-table">
              <thead>
                <tr className="gov-table-header">
                  <th className="min-w-[120px]">Region Code</th>
                  <th className="min-w-[200px]">Regional Jurisdiction</th>
                  <th className="min-w-[120px] text-center">Institutions</th>
                  <th className="min-w-[120px] text-center">Complaints</th>
                  <th className="min-w-[120px] text-center">Total Cases</th>
                  <th className="min-w-[110px] text-center">Pending</th>
                  <th className="min-w-[110px] text-center">Disposed</th>
                  <th className="min-w-[110px] text-center text-red-700">Overdue</th>
                </tr>
              </thead>
              <tbody>
                {regionWorkloads.map((r) => (
                  <tr key={r.region_id} className="gov-table-row">
                    <td className="font-mono font-bold text-gov-primary text-xs">{r.region_code}</td>
                    <td className="font-semibold text-slate-900 text-xs">{r.region_name}</td>
                    <td className="text-center font-bold text-slate-800 text-xs font-mono">{r.institution_count}</td>
                    <td className="text-center text-slate-700 text-xs font-mono">{r.complaint_count}</td>
                    <td className="text-center font-bold text-blue-900 text-xs font-mono">{r.case_count}</td>
                    <td className="text-center text-amber-800 font-semibold text-xs font-mono">{r.pending_count}</td>
                    <td className="text-center text-emerald-800 font-bold text-xs font-mono">{r.disposed_count}</td>
                    <td className="text-center font-bold font-mono text-xs">
                      {r.overdue_count > 0 ? (
                        <span className="gov-badge-danger">{r.overdue_count}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Ageing Breakdown */}
      {activeTab === 'ageing' && (
        <div className="gov-card overflow-hidden">
          <div className="gov-card-header p-4 bg-slate-50/80 border-b border-gov-border flex items-center justify-between">
            <span className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-gov-primary" />
              Pending Case Ageing Duration Bands
            </span>
            <span className="text-[11px] text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              Calculated from original receipt timestamp
            </span>
          </div>
          <div className="gov-table-container">
            <table className="gov-table">
              <thead>
                <tr className="gov-table-header">
                  <th className="min-w-[180px]">Ageing Bracket</th>
                  <th className="min-w-[260px]">Administrative Severity</th>
                  <th className="min-w-[160px] text-center">Active Docket Cases</th>
                </tr>
              </thead>
              <tbody>
                {ageingBands.map((band, idx) => (
                  <tr key={idx} className="gov-table-row">
                    <td className="font-bold text-slate-900 text-xs font-mono">{band.band}</td>
                    <td className="text-xs">
                      {idx === 0 && <span className="gov-badge-success">Initial verification & scrutiny stage</span>}
                      {idx === 1 && <span className="gov-badge-info">Standard inquiry & institutional response</span>}
                      {idx === 2 && <span className="gov-badge-warning">Extended committee evaluation</span>}
                      {idx === 3 && <span className="gov-badge-danger font-bold">Critical statutory delay — requires escalation</span>}
                    </td>
                    <td className="text-center font-bold text-sm text-gov-primary font-mono">{band.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
