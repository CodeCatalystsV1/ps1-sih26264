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
      {/* Back button and Header */}
      <div>
        <Link to="/complaints" className="text-xs text-slate-500 hover:text-gov-primary flex items-center gap-1 mb-2 font-medium">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Complaints List
        </Link>
        <div className="bg-white p-5 rounded-md border border-gov-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-bold text-gov-primary px-2.5 py-0.5 rounded bg-blue-50 border border-blue-200">
                {complaint.complaint_reference}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                Status: {complaint.status}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                Sensitivity: {complaint.sensitivity_classification}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-2">{complaint.title}</h1>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-3">
              <span>Received: {new Date(complaint.received_at).toLocaleDateString()}</span>
              <span>&bull;</span>
              <span>Channel: {complaint.source}</span>
              <span>&bull;</span>
              <span>Complainant: {complaint.complainant_type}</span>
            </p>
          </div>

          {complaint.linked_case_reference && (
            <div className="p-3 bg-slate-50 rounded border border-slate-200 text-right shrink-0">
              <span className="text-[11px] text-slate-500 block">Linked Official Case</span>
              <span className="font-mono font-bold text-gov-primary text-sm">
                {complaint.linked_case_reference}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Grid: Complaint Details & Institution Link */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Cols: Description & Documents */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-5 rounded-md border border-gov-border shadow-sm space-y-3 text-xs">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
              Full Grievance Narrative
            </h3>
            <p className="text-slate-700 leading-relaxed whitespace-pre-line text-xs">
              {complaint.description}
            </p>
          </div>

          {/* Supporting Documents Section */}
          <div className="bg-white p-5 rounded-md border border-gov-border shadow-sm space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-800 uppercase tracking-wider">
                Attached Evidentiary Documents ({complaint.documents.length})
              </h3>
              <label className="inline-flex items-center gap-1.5 px-3 py-1 bg-gov-secondary hover:bg-gov-dark text-white rounded cursor-pointer font-semibold text-xs transition-colors">
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
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{uploadSuccess}</span>
              </div>
            )}

            <div className="divide-y divide-slate-100">
              {complaint.documents.length === 0 ? (
                <div className="text-slate-400 py-4 text-center">
                  No supporting documents uploaded yet.
                </div>
              ) : (
                complaint.documents.map((doc) => (
                  <div key={doc.id} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-gov-primary" />
                      <div>
                        <span className="font-semibold text-slate-800 block">{doc.original_filename}</span>
                        <span className="text-[10px] text-slate-400">
                          {(doc.file_size / 1024).toFixed(1)} KB &bull; Uploaded {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
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
          <div className="bg-white p-5 rounded-md border border-gov-border shadow-sm text-xs space-y-3">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
              Concerned Institution
            </h3>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded">
              <span className="font-bold text-slate-900 block text-sm">{complaint.institution_name}</span>
              <span className="font-mono text-gov-primary font-bold block mt-1">
                Permanent ID: {complaint.permanent_id}
              </span>
              <span className="text-[11px] text-slate-500 block mt-2">
                Handling Bureau: <strong>{complaint.assigned_bureau_name || 'Central Grievance Cell'}</strong>
              </span>
            </div>
            <Link
              to={`/institutions/${complaint.institution_id}`}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-gov-primary hover:bg-gov-dark text-white rounded font-semibold text-xs transition-colors"
            >
              Open Consolidated Institution Profile &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
