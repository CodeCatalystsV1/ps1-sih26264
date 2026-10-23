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
      {/* Page Header */}
      <div className="bg-white p-4 rounded-md border border-gov-border shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gov-dark">Institutions Registry</h1>
          <p className="text-xs text-gov-muted mt-0.5">
            Centralized registry of technical institutions with consolidated grievance profiles
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gov-primary hover:bg-gov-dark text-white text-xs font-semibold rounded shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Technical Institution
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-md border border-gov-border shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Institution Name, Permanent ID, or City..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-gov-primary focus:border-gov-primary"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
            <Filter className="w-3.5 h-3.5 text-slate-400" /> Region:
          </div>
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="border border-slate-300 rounded-md px-2.5 py-1.5 bg-white text-xs"
          >
            <option value="">All Regions</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Institutions Table */}
      <div className="bg-white rounded-md border border-gov-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="gov-table-header">
              <tr>
                <th className="py-3 px-4">Permanent ID</th>
                <th className="py-3 px-4">Institution Name & Location</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-3 text-center">Complaints</th>
                <th className="py-3 px-3 text-center">Active Cases</th>
                <th className="py-3 px-3 text-center">Overdue</th>
                <th className="py-3 px-3 text-center">Overlaps</th>
                <th className="py-3 px-4 text-right">Consolidated View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading technical institutions registry...
                  </td>
                </tr>
              ) : institutions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No matching institutions found
                  </td>
                </tr>
              ) : (
                institutions.map((inst) => (
                  <tr key={inst.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-gov-primary whitespace-nowrap">
                      {inst.permanent_id}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{inst.institution_name}</div>
                      <div className="text-[11px] text-slate-500">
                        {inst.city}, {inst.state} ({inst.postal_code})
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-medium">
                        {inst.institution_type}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-slate-700">
                      {inst.total_complaints}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        inst.active_cases > 0 ? 'bg-blue-100 text-blue-800' : 'text-slate-400'
                      }`}>
                        {inst.active_cases}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {inst.overdue_cases > 0 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 animate-pulse">
                          {inst.overdue_cases} Due
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {inst.potential_overlaps > 0 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-600 text-white flex items-center justify-center gap-1 mx-auto w-fit">
                          <GitCompare className="w-3 h-3" /> Flagged
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/institutions/${inst.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-gov-primary hover:text-white text-slate-700 font-semibold rounded text-xs transition-colors"
                      >
                        Profile &rarr;
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-xl w-full p-6 border border-slate-300">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
                Register Technical Institution
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    AICTE Permanent ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DEMO-AICTE-006"
                    value={formData.permanent_id}
                    onChange={(e) => setFormData({ ...formData, permanent_id: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Institution Type *
                  </label>
                  <select
                    value={formData.institution_type}
                    onChange={(e) => setFormData({ ...formData, institution_type: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
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
                  placeholder="e.g. Demonstration Institute of Technology"
                  value={formData.institution_name}
                  onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5"
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
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5"
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
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">District *</label>
                  <input
                    type="text"
                    required
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">State *</label>
                  <input
                    type="text"
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Regional Office *</label>
                  <select
                    value={formData.region_id}
                    onChange={(e) => setFormData({ ...formData, region_id: parseInt(e.target.value) })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  >
                    {regions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Postal Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono"
                  />
                </div>
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
                  {submitting ? 'Registering...' : 'Save Institution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
