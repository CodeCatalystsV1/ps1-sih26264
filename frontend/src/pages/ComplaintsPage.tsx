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
      {/* Header */}
      <div className="bg-white p-4 rounded-md border border-gov-border shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gov-dark">Grievances & Complaints Management</h1>
          <p className="text-xs text-gov-muted mt-0.5">
            Register and monitor stakeholder grievances concerning AICTE-approved technical institutions
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gov-primary hover:bg-gov-dark text-white text-xs font-semibold rounded shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Register New Grievance
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-md border border-gov-border shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Complaint Reference, Title, or Details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-gov-primary focus:border-gov-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border border-slate-300 rounded-md px-2.5 py-1.5 bg-white text-xs"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="border border-slate-300 rounded-md px-2.5 py-1.5 bg-white text-xs"
          >
            <option value="">All Statuses</option>
            <option value="REGISTERED">Registered</option>
            <option value="CASE_LINKED">Official Case Linked</option>
            <option value="DISPOSED">Disposed</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-md border border-gov-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="gov-table-header">
              <tr>
                <th className="py-3 px-3">Complaint Ref</th>
                <th className="py-3 px-3">Grievance Title</th>
                <th className="py-3 px-3">Institution & Perm ID</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Complainant</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Linked Case</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading complaints database...
                  </td>
                </tr>
              ) : complaints.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No matching grievances found
                  </td>
                </tr>
              ) : (
                complaints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-gov-primary whitespace-nowrap">
                      {c.complaint_reference}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800 max-w-[200px] truncate" title={c.title}>
                      {c.title}
                    </td>
                    <td className="py-3 px-3 max-w-[180px]">
                      <div className="font-semibold text-slate-900 truncate" title={c.institution_name}>
                        {c.institution_name}
                      </div>
                      <span className="font-mono text-[10px] text-gov-secondary font-bold">
                        {c.permanent_id}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{c.category_name}</td>
                    <td className="py-3 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 font-medium text-slate-700">
                        {c.complainant_type}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700">
                      {c.linked_case_reference ? (
                        <span className="font-bold text-gov-primary">{c.linked_case_reference}</span>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <Link
                        to={`/complaints/${c.id}`}
                        className="text-xs text-gov-primary hover:underline font-semibold"
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-xl w-full p-6 border border-slate-300 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
                Register Grievance & Open Official Case
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
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
                  className="w-full border border-slate-300 rounded px-2.5 py-2 font-medium"
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
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5"
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
                  className="w-full border border-slate-300 rounded p-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: parseInt(e.target.value) })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
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
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
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
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-medium"
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
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent / Time-Sensitive</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded flex items-center gap-2">
                <input
                  type="checkbox"
                  id="create_case"
                  checked={formData.create_case_automatically}
                  onChange={(e) => setFormData({ ...formData, create_case_automatically: e.target.checked })}
                  className="rounded text-gov-primary focus:ring-gov-primary"
                />
                <label htmlFor="create_case" className="font-semibold text-blue-900 cursor-pointer">
                  Automatically open and track official Case workflow (CASE-YYYY-XXXX)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-gov-primary hover:bg-gov-dark text-white rounded font-semibold"
                >
                  {submitting ? 'Submitting...' : 'Register Grievance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
