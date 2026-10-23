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
      <div className="bg-white p-5 rounded-md border border-gov-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gov-dark">Official Reports & Consolidated Analytics</h1>
          <p className="text-xs text-gov-muted mt-0.5">
            Database-calculated grievance disposal statistics, regional distribution, and multi-format exports
          </p>
        </div>

        {/* Real Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded border border-slate-300 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            {exporting === 'csv' ? 'Generating CSV...' : 'Export CSV'}
          </button>

          <button
            onClick={() => handleExport('excel')}
            disabled={exporting !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded border border-emerald-300 transition-colors cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            {exporting === 'excel' ? 'Generating XLSX...' : 'Export Excel (.xlsx)'}
          </button>

          <button
            onClick={() => handleExport('pdf')}
            disabled={exporting !== null}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gov-primary hover:bg-gov-dark text-white text-xs font-semibold rounded shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5 text-amber-300" />
            {exporting === 'pdf' ? 'Compiling PDF...' : 'Export Official PDF'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gov-border">
        <nav className="flex space-x-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('bureau')}
            className={`py-3 px-1 border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'bureau'
                ? 'border-gov-primary text-gov-primary font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Building className="w-4 h-4" /> Bureau-wise Workload Report
          </button>
          <button
            onClick={() => setActiveTab('region')}
            className={`py-3 px-1 border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'region'
                ? 'border-gov-primary text-gov-primary font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <MapPin className="w-4 h-4" /> Region-wise Case Distribution
          </button>
          <button
            onClick={() => setActiveTab('ageing')}
            className={`py-3 px-1 border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'ageing'
                ? 'border-gov-primary text-gov-primary font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Clock className="w-4 h-4" /> Pending Case Ageing Breakdown
          </button>
        </nav>
      </div>

      {/* Tab 1: Bureau-wise Report */}
      {activeTab === 'bureau' && (
        <div className="bg-white rounded-md border border-gov-border shadow-sm overflow-hidden text-xs">
          <div className="p-3 bg-slate-50 border-b border-gov-border flex items-center justify-between">
            <span className="font-bold text-slate-800 uppercase tracking-wide">
              AICTE Bureau & Cell Performance Summary
            </span>
          </div>
          <table className="w-full text-left">
            <thead className="gov-table-header">
              <tr>
                <th className="py-2.5 px-3">Bureau Code</th>
                <th className="py-2.5 px-3">Bureau / Cell Name</th>
                <th className="py-2.5 px-3 text-center">Total Assigned</th>
                <th className="py-2.5 px-3 text-center">Pending Scrutiny</th>
                <th className="py-2.5 px-3 text-center">Under Process</th>
                <th className="py-2.5 px-3 text-center">Disposed</th>
                <th className="py-2.5 px-3 text-center text-red-700">Overdue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bureauWorkloads.map((b) => (
                <tr key={b.bureau_id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono font-bold text-gov-primary">{b.bureau_code}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{b.bureau_name}</td>
                  <td className="py-2.5 px-3 text-center font-bold text-slate-800">{b.total_assigned}</td>
                  <td className="py-2.5 px-3 text-center text-amber-700 font-medium">{b.pending_count}</td>
                  <td className="py-2.5 px-3 text-center text-blue-700 font-medium">{b.under_process_count}</td>
                  <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">{b.disposed_count}</td>
                  <td className="py-2.5 px-3 text-center font-bold text-red-700">
                    {b.overdue_count > 0 ? `${b.overdue_count} Overdue` : '0'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Region-wise Report */}
      {activeTab === 'region' && (
        <div className="bg-white rounded-md border border-gov-border shadow-sm overflow-hidden text-xs">
          <div className="p-3 bg-slate-50 border-b border-gov-border flex items-center justify-between">
            <span className="font-bold text-slate-800 uppercase tracking-wide">
              Regional Office Jurisdiction Report
            </span>
          </div>
          <table className="w-full text-left">
            <thead className="gov-table-header">
              <tr>
                <th className="py-2.5 px-3">Region Code</th>
                <th className="py-2.5 px-3">Regional Jurisdiction</th>
                <th className="py-2.5 px-3 text-center">Institutions</th>
                <th className="py-2.5 px-3 text-center">Complaints</th>
                <th className="py-2.5 px-3 text-center">Total Cases</th>
                <th className="py-2.5 px-3 text-center">Pending</th>
                <th className="py-2.5 px-3 text-center">Disposed</th>
                <th className="py-2.5 px-3 text-center text-red-700">Overdue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {regionWorkloads.map((r) => (
                <tr key={r.region_id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono font-bold text-gov-primary">{r.region_code}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{r.region_name}</td>
                  <td className="py-2.5 px-3 text-center font-bold text-slate-800">{r.institution_count}</td>
                  <td className="py-2.5 px-3 text-center text-slate-700">{r.complaint_count}</td>
                  <td className="py-2.5 px-3 text-center font-bold text-blue-900">{r.case_count}</td>
                  <td className="py-2.5 px-3 text-center text-amber-700">{r.pending_count}</td>
                  <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">{r.disposed_count}</td>
                  <td className="py-2.5 px-3 text-center font-bold text-red-700">{r.overdue_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Ageing Breakdown */}
      {activeTab === 'ageing' && (
        <div className="bg-white rounded-md border border-gov-border shadow-sm overflow-hidden text-xs">
          <div className="p-3 bg-slate-50 border-b border-gov-border flex items-center justify-between">
            <span className="font-bold text-slate-800 uppercase tracking-wide">
              Pending Case Ageing Duration Bands
            </span>
            <span className="text-[11px] text-slate-500 font-mono">Calculated from receipt date</span>
          </div>
          <table className="w-full text-left">
            <thead className="gov-table-header">
              <tr>
                <th className="py-2.5 px-4">Age Band</th>
                <th className="py-2.5 px-4">Administrative Severity</th>
                <th className="py-2.5 px-4 text-center">Number of Active Cases</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ageingBands.map((band, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-800">{band.band}</td>
                  <td className="py-3 px-4">
                    {idx === 0 && <span className="text-emerald-700 font-medium">Initial processing stage</span>}
                    {idx === 1 && <span className="text-blue-700 font-medium">Standard scrutiny period</span>}
                    {idx === 2 && <span className="text-amber-700 font-medium">Extended enquiry stage</span>}
                    {idx === 3 && <span className="text-red-700 font-bold">Critical delayed cases</span>}
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-base text-gov-primary">{band.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
