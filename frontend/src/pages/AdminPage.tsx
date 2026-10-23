import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { User, Role, Bureau, Region } from '../types';
import { Users, Plus, Shield, Building, MapPin, X, CheckCircle, Lock } from 'lucide-react';

export const AdminPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [bureaus, setBureaus] = useState<Bureau[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // New User Form
  const [formData, setFormData] = useState({
    display_name: '',
    email: '',
    username: '',
    password: '',
    phone: '',
    role_ids: [] as number[],
    bureau_id: undefined as number | undefined,
    region_id: undefined as number | undefined,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const [u, r, b, reg] = await Promise.all([
        apiRequest<User[]>('/admin/users'),
        apiRequest<Role[]>('/admin/roles'),
        apiRequest<Bureau[]>('/admin/bureaus'),
        apiRequest<Region[]>('/admin/regions'),
      ]);
      setUsers(u);
      setRoles(r);
      setBureaus(b);
      setRegions(reg);
      if (r.length > 0) setFormData((prev) => ({ ...prev, role_ids: [r[0].id] }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      await apiRequest('/admin/users', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setShowAddModal(false);
      setFormData({
        display_name: '',
        email: '',
        username: '',
        password: '',
        phone: '',
        role_ids: roles.length > 0 ? [roles[0].id] : [],
        bureau_id: undefined,
        region_id: undefined,
      });
      fetchUsers();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create user account');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-md border border-gov-border shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gov-dark">User Accounts & Access Control</h1>
          <p className="text-xs text-gov-muted mt-0.5">
            Manage authorized officials, assigned roles, Bureau jurisdiction, and regional office scopes
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gov-primary hover:bg-gov-dark text-white text-xs font-semibold rounded shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Create Official Account
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-md border border-gov-border shadow-sm overflow-hidden text-xs">
        <div className="p-3 bg-slate-50 border-b border-gov-border flex items-center justify-between">
          <span className="font-bold text-slate-800 uppercase tracking-wide">
            Registered Government Officials & Users ({users.length})
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="gov-table-header">
              <tr>
                <th className="py-2.5 px-3">Username</th>
                <th className="py-2.5 px-3">Official Display Name</th>
                <th className="py-2.5 px-3">Email Address</th>
                <th className="py-2.5 px-3">Assigned Role(s)</th>
                <th className="py-2.5 px-3">Bureau / Region Jurisdiction</th>
                <th className="py-2.5 px-3 text-center">Account Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading user accounts...
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-gov-primary">{u.username}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{u.display_name}</td>
                    <td className="py-2.5 px-3 text-slate-600">{u.email}</td>
                    <td className="py-2.5 px-3">
                      {u.roles?.map((r) => (
                        <span key={r.id} className="inline-block mr-1 px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-800 font-semibold border border-slate-200">
                          {r.name}
                        </span>
                      ))}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {u.bureau_assignments?.[0]?.bureau?.name ? (
                        <span>{u.bureau_assignments[0].bureau.name} ({u.bureau_assignments[0].bureau.code})</span>
                      ) : u.bureau_assignments?.[0]?.region?.name ? (
                        <span>{u.bureau_assignments[0].region.name}</span>
                      ) : (
                        <span className="text-slate-400 italic">Central / Global Access</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.account_status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {u.account_status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add User */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 border border-slate-300">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
                Create Authorized Official Account
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

            <form onSubmit={handleAddUser} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Official Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Smt. Ananya Sen"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Official Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="official@aicte.gov.in"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ananya_pgrc"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Application Role *</label>
                <select
                  value={formData.role_ids[0] || ''}
                  onChange={(e) => setFormData({ ...formData, role_ids: [parseInt(e.target.value)] })}
                  className="w-full border border-slate-300 rounded px-2.5 py-2 font-medium"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assigned Bureau / Cell</label>
                  <select
                    value={formData.bureau_id || ''}
                    onChange={(e) => setFormData({ ...formData, bureau_id: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  >
                    <option value="">None / Not Applicable</option>
                    {bureaus.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Regional Jurisdiction</label>
                  <select
                    value={formData.region_id || ''}
                    onChange={(e) => setFormData({ ...formData, region_id: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5"
                  >
                    <option value="">None / All Regions</option>
                    {regions.map((reg) => (
                      <option key={reg.id} value={reg.id}>
                        {reg.name} ({reg.code})
                      </option>
                    ))}
                  </select>
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
                  {submitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
