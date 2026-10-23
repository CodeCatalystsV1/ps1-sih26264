import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { Complaint, Document } from '../types';
import {
  FileText,
  Building,
  Briefcase,
  Upload,
  Calendar,
  Shield,
  FileCheck,
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';

export const ComplaintDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const fetchComplaint = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<Complaint>(`/complaints/${id}`);
      setComplaint(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load complaint');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaint();
  }, [id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setUploadSuccess(null);
    try {
      await apiRequest(`/complaints/${id}/documents`, {
        method: 'POST',
        body: formData,
      });
      setUploadSuccess(`File "${file.name}" uploaded successfully.`);
      fetchComplaint();
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-400">Loading complaint details...</div>;
  }

  if (error || !complaint) {
    return <div className="p-6 bg-red-50 text-red-700 rounded border border-red-200">{error || 'Complaint not found'}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <Link to="/" className="hover:text-gov-primary">Dashboard</Link>
        <span>&rsaquo;</span>
        <Link to="/complaints" className="hover:text-gov-primary">Grievances & Complaints</Link>
        <span>&rsaquo;</span>
        <span className="text-slate-800 font-semibold">{complaint.complaint_reference}</span>
      </div>

      {/* Grievance Header Banner */}
      <div className="gov-card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-gov-primary px-2.5 py-0.5 rounded bg-blue-50 border border-blue-200">
                {complaint.complaint_reference}
              </span>
              <span className="gov-badge gov-badge-info">
                Status: {complaint.status}
              </span>
              <span className="gov-badge gov-badge-neutral">
                Sensitivity: {complaint.sensitivity_classification}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gov-dark mt-2.5">{complaint.title}</h1>
            <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-3 flex-wrap">
              <span>Receipt Date: <strong>{new Date(complaint.received_at).toLocaleDateString()}</strong></span>
              <span>&bull;</span>
              <span>Submission Channel: <strong>{complaint.source}</strong></span>
              <span>&bull;</span>
              <span>Complainant Category: <strong>{complaint.complainant_type}</strong></span>
            </p>
          </div>

          {complaint.linked_case_reference && (
            <div className="p-3.5 bg-slate-50 rounded-md border border-gov-border text-left md:text-right shrink-0">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Linked Official Case
              </span>
              <span className="font-mono font-bold text-gov-primary text-base block mt-0.5">
                {complaint.linked_case_reference}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Grid: Complaint Details & Institution Link */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Description & Documents */}
        <div className="lg:col-span-2 space-y-6">
          <div className="gov-card p-5 space-y-3 text-xs">
            <h3 className="font-bold text-gov-dark uppercase tracking-wider border-b border-gov-border pb-2 text-xs">
              Full Grievance Narrative
            </h3>
            <p className="text-gov-text leading-relaxed whitespace-pre-line text-xs font-sans">
              {complaint.description}
            </p>
          </div>

          {/* Supporting Documents Section */}
          <div className="gov-card p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gov-border pb-3">
              <h3 className="font-bold text-gov-dark uppercase tracking-wider text-xs">
                Attached Evidentiary Documents ({complaint.documents.length})
              </h3>
              <label className="gov-btn gov-btn-secondary text-xs">
                <Upload className="w-3.5 h-3.5" />
                <span>{uploading ? 'Uploading...' : 'Upload Document'}</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  accept=".pdf,.png,.jpg,.jpeg,.docx"
                />
              </label>
            </div>

            {uploadSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{uploadSuccess}</span>
              </div>
            )}

            <div className="divide-y divide-slate-100">
              {complaint.documents.length === 0 ? (
                <div className="text-slate-400 py-6 text-center text-xs">
                  No supporting documents uploaded yet.
                </div>
              ) : (
                complaint.documents.map((doc) => (
                  <div key={doc.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded bg-slate-100 text-gov-primary">
                        <FileCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-semibold text-slate-800 block text-xs">{doc.original_filename}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {(doc.file_size / 1024).toFixed(1)} KB &bull; Uploaded {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      {doc.content_type.split('/').pop()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Associated Institution Profile Link */}
        <div className="space-y-6">
          <div className="gov-card p-5 text-xs space-y-4">
            <h3 className="font-bold text-gov-dark uppercase tracking-wider border-b border-gov-border pb-2 text-xs">
              Concerned Institution
            </h3>
            <div className="p-3.5 bg-slate-50 border border-gov-border rounded-md space-y-2">
              <span className="font-bold text-gov-dark block text-sm leading-snug">
                {complaint.institution_name}
              </span>
              <span className="font-mono text-gov-secondary font-bold text-xs block">
                Permanent ID: {complaint.permanent_id}
              </span>
              <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                Handling Bureau: <strong className="text-slate-700">{complaint.assigned_bureau_name || 'Central Grievance Cell'}</strong>
              </div>
            </div>

            <Link
              to={`/institutions/${complaint.institution_id}`}
              className="gov-btn gov-btn-primary w-full"
            >
              <span>View Institution Dossier &rarr;</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
