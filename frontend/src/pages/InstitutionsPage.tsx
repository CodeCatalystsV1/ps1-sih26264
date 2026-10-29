import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { Institution, Region } from '../types';
import { Building, Search, Filter, Plus, ShieldCheck, AlertCircle, GitCompare, ExternalLink, X } from 'lucide-react';

export const InstitutionsPage: React.FC = () => {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [search, setSearch] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Institution Form
  const [formData, setFormData] = useState({
    permanent_id: '',
    institution_name: '',
    institution_type: 'Engineering & Technology',
    address: '',
    city: '',
    district: '',
    state: '',
    region_id: 1,
    postal_code: '',
    contact_email: '',
    contact_phone: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchInstitutions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedRegion) params.append('region_id', selectedRegion);

      const data = await apiRequest<Institution[]>(`/institutions?${params.toString()}`);
      setInstitutions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    apiRequest<Region[]>('/admin/regions')
      .then(setRegions)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchInstitutions, 250);
    return () => clearTimeout(timer);
  }, [search, selectedRegion]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await apiRequest('/institutions', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setShowAddModal(false);
      setFormData({
        permanent_id: '',
        institution_name: '',
        institution_type: 'Engineering & Technology',
        address: '',
        city: '',
        district: '',
        state: '',
        region_id: 1,
        postal_code: '',
        contact_email: '',
        contact_phone: '',
      });
      fetchInstitutions();
    } catch (err: any) {
      setFormError(err.message || 'Failed to register institution');
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
            <span className="w-2 h-2 rounded-full bg-gov-secondary"></span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest font-mono">
              REGISTRY & DIRECTORY
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gov-dark mt-1">
            Technical Institutions Registry
          </h1>
          <p className="text-xs text-gov-muted mt-1">
            Consolidated directory of AICTE-approved institutions with active grievance dockets and cross-bureau flags
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="gov-btn gov-btn-primary self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>Add Technical Institution</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="gov-card p-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Institution Name, Permanent ID, or City..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="gov-input pl-9"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Regional Office:</span>
          </div>
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="gov-select min-w-[180px]"
          >
            <option value="">All Regional Jurisdictions</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.code})
              </option>
            ))}
          </select>

          <span className="text-[11px] font-mono text-slate-400 border-l border-slate-200 pl-3 hidden sm:inline">
            {institutions.length} Recorded
          </span>
        </div>
      </div>

      {/* Institutions Table */}
      <div className="gov-table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="gov-table-header">
              <tr>
                <th className="py-3 px-4 min-w-[140px]">Permanent ID</th>
                <th className="py-3 px-4 min-w-[280px]">Institution Name & Location</th>
                <th className="py-3 px-4 min-w-[160px]">Category Type</th>
                <th className="py-3 px-3 text-center min-w-[90px]">Complaints</th>
                <th className="py-3 px-3 text-center min-w-[100px]">Active Cases</th>
                <th className="py-3 px-3 text-center min-w-[90px]">SLA Overdue</th>
                <th className="py-3 px-3 text-center min-w-[110px]">Coordination</th>
                <th className="py-3 px-4 text-right min-w-[120px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading technical institutions registry...
                  </td>
                </tr>
              ) : institutions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No matching institutions found in registry
                  </td>
                </tr>
              ) : (
                institutions.map((inst) => (
                  <tr key={inst.id} className="gov-table-row">
                    <td className="py-3 px-4 font-mono font-bold text-gov-primary whitespace-nowrap">
                      {inst.permanent_id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 leading-snug">{inst.institution_name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {inst.city}, {inst.state} &bull; Pin: {inst.postal_code}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="gov-badge gov-badge-neutral font-medium">
                        {inst.institution_type}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-slate-700">
                      {inst.total_complaints}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        inst.active_cases > 0 ? 'bg-blue-100 text-gov-primary' : 'text-slate-400'
                      }`}>
                        {inst.active_cases}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {inst.overdue_cases > 0 ? (
                        <span className="gov-badge gov-badge-danger">
                          {inst.overdue_cases} Due
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {inst.potential_overlaps > 0 ? (
                        <span className="gov-badge gov-badge-overlap">
                          <GitCompare className="w-3 h-3" /> Flagged
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <Link
                        to={`/institutions/${inst.id}`}
                        className="text-xs text-gov-primary hover:text-gov-secondary font-semibold hover:underline"
                      >
                        View Dossier &rarr;
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Technical Institution */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-lg shadow-gov-modal max-w-xl w-full p-6 border border-gov-border">
            <div className="flex items-center justify-between pb-3 border-b border-gov-border">
              <div>
                <h3 className="font-bold text-sm text-gov-dark uppercase tracking-wider">
                  Register Technical Institution
                </h3>
                <p className="text-[11px] text-gov-muted mt-0.5">
                  AICTE Central Institutional Directory Record Entry
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    AICTE Permanent ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1-44642766198"
                    value={formData.permanent_id}
                    onChange={(e) => setFormData({ ...formData, permanent_id: e.target.value })}
                    className="gov-input font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Institution Type *
                  </label>
                  <select
                    value={formData.institution_type}
                    onChange={(e) => setFormData({ ...formData, institution_type: e.target.value })}
                    className="gov-select w-full"
                  >
                    <option value="Engineering & Technology">Engineering & Technology</option>
                    <option value="Management">Management</option>
                    <option value="Pharmacy">Pharmacy</option>
                    <option value="Polytechnic">Polytechnic</option>
                    <option value="Architecture & Planning">Architecture & Planning</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Institution Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Demonstration Institute of Technology & Science"
                  value={formData.institution_name}
                  onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
                  className="gov-input"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Campus Address *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Street address / campus location"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="gov-input"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="gov-input"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">District *</label>
                  <input
                    type="text"
                    required
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    className="gov-input"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">State *</label>
                  <input
                    type="text"
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="gov-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Regional Office *</label>
                  <select
                    value={formData.region_id}
                    onChange={(e) => setFormData({ ...formData, region_id: parseInt(e.target.value) })}
                    className="gov-select w-full"
                  >
                    {regions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Postal Code (PIN) *</label>
                  <input
                    type="text"
                    required
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    className="gov-input font-mono"
                  />
                </div>
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
                  {submitting ? 'Registering...' : 'Save & Register Institution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
