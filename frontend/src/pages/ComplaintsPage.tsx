import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { Complaint, ComplaintCategory, Institution, Bureau } from '../types';
import { FileText, Search, Filter, Plus, ExternalLink, X, Building, CheckCircle } from 'lucide-react';

export const ComplaintsPage: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [categories, setCategories] = useState<ComplaintCategory[]>([]);
  const [bureaus, setBureaus] = useState<Bureau[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    institution_id: 1,
    category_id: 1,
    complainant_type: 'STUDENT',
    source: 'PORTAL',
    sensitivity_classification: 'NORMAL',
    assigned_bureau_id: 1,
    create_case_automatically: true,
    priority: 'MEDIUM',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedCategory) params.append('category_id', selectedCategory);
      if (selectedStatus) params.append('status', selectedStatus);

      const data = await apiRequest<Complaint[]>(`/complaints?${params.toString()}`);
      setComplaints(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([
      apiRequest<ComplaintCategory[]>('/complaints/categories'),
      apiRequest<Bureau[]>('/admin/bureaus'),
      apiRequest<Institution[]>('/institutions?limit=100'),
    ]).then(([cats, burs, insts]) => {
      setCategories(cats);
      setBureaus(burs);
      setInstitutions(insts);
      if (cats.length > 0) setFormData((prev) => ({ ...prev, category_id: cats[0].id }));
      if (burs.length > 0) setFormData((prev) => ({ ...prev, assigned_bureau_id: burs[0].id }));
      if (insts.length > 0) setFormData((prev) => ({ ...prev, institution_id: insts[0].id }));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchComplaints, 250);
    return () => clearTimeout(timer);
  }, [search, selectedCategory, selectedStatus]);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await apiRequest('/complaints', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setShowAddModal(false);
      setFormData({
        title: '',
        description: '',
        institution_id: institutions[0]?.id || 1,
        category_id: categories[0]?.id || 1,
        complainant_type: 'STUDENT',
        source: 'PORTAL',
        sensitivity_classification: 'NORMAL',
        assigned_bureau_id: bureaus[0]?.id || 1,
        create_case_automatically: true,
        priority: 'MEDIUM',
      });
      fetchComplaints();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit complaint');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header Banner */}
      <div className="gov-card p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gov-info"></span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest font-mono">
              GRIEVANCE REGISTRY
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gov-dark mt-1">
            Grievances & Complaints Redressal
          </h1>
          <p className="text-xs text-gov-muted mt-1">
            Formal intake, docketing, and monitoring of institutional grievances submitted to AICTE
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="gov-btn gov-btn-primary self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Grievance</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="gov-card p-4 flex flex-col lg:flex-row items-center justify-between gap-4 text-xs">
        <div className="relative w-full lg:w-96">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Complaint Reference, Title, or Details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="gov-input pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="gov-select"
          >
            <option value="">All Grievance Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="gov-select"
          >
            <option value="">All Docket Statuses</option>
            <option value="REGISTERED">REGISTERED</option>
            <option value="CASE_LINKED">CASE_LINKED (Official Case Opened)</option>
            <option value="DISPOSED">DISPOSED (Resolved)</option>
            <option value="REJECTED">REJECTED</option>
          </select>

          <span className="text-[11px] font-mono text-slate-400 border-l border-slate-200 pl-3 hidden sm:inline">
            {complaints.length} Records
          </span>
        </div>
      </div>

      {/* Complaints Table */}
      <div className="gov-table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="gov-table-header">
              <tr>
                <th className="py-3 px-3.5 min-w-[140px]">Complaint Ref</th>
                <th className="py-3 px-3.5 min-w-[260px]">Grievance Subject</th>
                <th className="py-3 px-3.5 min-w-[220px]">Institution & Perm ID</th>
                <th className="py-3 px-3.5 min-w-[160px]">Category</th>
                <th className="py-3 px-3.5 min-w-[110px]">Complainant</th>
                <th className="py-3 px-3.5 min-w-[120px]">Status</th>
                <th className="py-3 px-3.5 min-w-[130px]">Linked Case</th>
                <th className="py-3 px-3.5 text-right min-w-[90px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading grievance records...
                  </td>
                </tr>
              ) : complaints.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No matching grievances found in registry
                  </td>
                </tr>
              ) : (
                complaints.map((c) => (
                  <tr key={c.id} className="gov-table-row">
                    <td className="py-3 px-3.5 font-mono font-bold text-gov-primary whitespace-nowrap">
                      {c.complaint_reference}
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="font-semibold text-slate-900 leading-snug line-clamp-1" title={c.title}>
                        {c.title}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                        Received: {new Date(c.received_at).toLocaleDateString()} &bull; Via {c.source}
                      </span>
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="font-medium text-slate-900 truncate max-w-[210px]" title={c.institution_name}>
                        {c.institution_name}
                      </div>
                      <span className="font-mono text-[10px] text-gov-secondary font-bold">
                        {c.permanent_id}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-slate-700">
                      <span className="truncate max-w-[150px] block" title={c.category_name}>
                        {c.category_name}
                      </span>
                    </td>
                    <td className="py-3 px-3.5">
                      <span className="gov-badge gov-badge-neutral font-medium">
                        {c.complainant_type}
                      </span>
                    </td>
                    <td className="py-3 px-3.5">
                      <span className={`gov-badge ${
                        c.status === 'CASE_LINKED'
                          ? 'gov-badge-info'
                          : c.status === 'DISPOSED'
                          ? 'gov-badge-success'
                          : 'gov-badge-neutral'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 font-mono text-xs">
                      {c.linked_case_reference ? (
                        <span className="font-bold text-gov-primary bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {c.linked_case_reference}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-right whitespace-nowrap">
                      <Link
                        to={`/complaints/${c.id}`}
                        className="text-xs text-gov-primary hover:text-gov-secondary font-semibold hover:underline"
                      >
                        Details &rarr;
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Register Grievance */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-lg shadow-gov-modal max-w-xl w-full p-6 border border-gov-border max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gov-border">
              <div>
                <h3 className="font-bold text-sm text-gov-dark uppercase tracking-wider">
                  Register Grievance & Open Official Case
                </h3>
                <p className="text-[11px] text-gov-muted mt-0.5">
                  Formal Stakeholder Complaint Submission Docket
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Target Technical Institution *
                </label>
                <select
                  required
                  value={formData.institution_id}
                  onChange={(e) => setFormData({ ...formData, institution_id: parseInt(e.target.value) })}
                  className="gov-select w-full"
                >
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.institution_name} ({inst.permanent_id}) — {inst.city}, {inst.state}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Grievance Subject / Title *</label>
                <input
                  type="text"
                  required
                  minLength={5}
                  placeholder="Concise summary of the grievance..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="gov-input"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Detailed Grievance Narrative *
                </label>
                <textarea
                  required
                  rows={4}
                  minLength={15}
                  placeholder="Provide complete facts, dates, affected parties, and specific institutional violations..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="gov-input font-sans leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: parseInt(e.target.value) })}
                    className="gov-select w-full"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Complainant Type *</label>
                  <select
                    value={formData.complainant_type}
                    onChange={(e) => setFormData({ ...formData, complainant_type: e.target.value })}
                    className="gov-select w-full"
                  >
                    <option value="STUDENT">Student</option>
                    <option value="FACULTY">Faculty Member</option>
                    <option value="STAFF">Staff Member</option>
                    <option value="PARENT">Parent / Guardian</option>
                    <option value="CITIZEN">Concerned Citizen</option>
                    <option value="ANONYMOUS">Whistleblower / Anonymous</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Initial Handling Bureau *</label>
                  <select
                    value={formData.assigned_bureau_id}
                    onChange={(e) => setFormData({ ...formData, assigned_bureau_id: parseInt(e.target.value) })}
                    className="gov-select w-full font-medium"
                  >
                    {bureaus.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority Classification *</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="gov-select w-full"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent / Time-Sensitive</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-md flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="create_case"
                  checked={formData.create_case_automatically}
                  onChange={(e) => setFormData({ ...formData, create_case_automatically: e.target.checked })}
                  className="rounded text-gov-primary focus:ring-gov-primary cursor-pointer"
                />
                <label htmlFor="create_case" className="font-semibold text-gov-dark cursor-pointer text-xs">
                  Automatically open and track official Case workflow (CASE-YYYY-XXXX)
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-gov-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="gov-btn gov-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="gov-btn gov-btn-primary"
                >
                  {submitting ? 'Docketing...' : 'Register Grievance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
