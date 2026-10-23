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
      <div className="gov-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              User Accounts & Role-Based Access Control (RBAC)
            </h1>
            <p className="text-xs text-slate-600">
              Manage authorized AICTE officials, bureau assignments, regional jurisdiction scopes, and administrative privileges.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="gov-btn-primary text-xs flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create Official Account</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="gov-card overflow-hidden">
        <div className="gov-card-header p-4 bg-slate-50/80 border-b border-gov-border flex items-center justify-between">
          <span className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-gov-primary" />
            Registered Official Directory ({users.length} Authorized Accounts)
          </span>
          <span className="text-[11px] text-slate-500 font-mono">Government Protocol Compliance</span>
        </div>
        <div className="gov-table-container">
          <table className="gov-table">
            <thead>
              <tr className="gov-table-header">
                <th className="min-w-[140px]">Username</th>
                <th className="min-w-[190px]">Official Display Name</th>
                <th className="min-w-[200px]">Email Address</th>
                <th className="min-w-[170px]">Assigned Role(s)</th>
                <th className="min-w-[220px]">Bureau / Region Jurisdiction</th>
                <th className="min-w-[120px] text-center">Account Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-medium">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-gov-primary mb-2"></div>
                    <p>Loading authorized accounts directory...</p>
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="gov-table-row">
                    <td className="font-mono font-bold text-gov-primary text-xs">{u.username}</td>
                    <td className="font-semibold text-slate-900 text-xs">{u.display_name}</td>
                    <td className="text-slate-600 font-mono text-xs">{u.email}</td>
                    <td>
                      {u.roles?.map((r) => (
                        <span key={r.id} className="gov-badge-info mr-1 text-[10px] font-semibold">
                          {r.name}
                        </span>
                      ))}
                    </td>
                    <td className="text-slate-700 text-xs">
                      {u.bureau_assignments?.[0]?.bureau?.name ? (
                        <span className="font-medium text-slate-900">{u.bureau_assignments[0].bureau.name} <span className="font-mono text-slate-500 font-normal">({u.bureau_assignments[0].bureau.code})</span></span>
                      ) : u.bureau_assignments?.[0]?.region?.name ? (
                        <span className="font-medium text-slate-900">{u.bureau_assignments[0].region.name}</span>
                      ) : (
                        <span className="text-slate-500 italic">Central / All Bureaus</span>
                      )}
                    </td>
                    <td className="text-center">
                      <span className={u.account_status === 'ACTIVE' ? 'gov-badge-success text-[10px]' : 'gov-badge-danger text-[10px]'}>
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="gov-modal max-w-lg w-full p-6 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Shield className="w-4 h-4 text-gov-primary" />
                Create Authorized Official Account
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-md">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddUser} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Official Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Smt. Ananya Sen"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  className="gov-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Official Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="official@aicte-india.org"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="gov-input"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Username / ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ananya_pgrc"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="gov-input font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Initial Temporary Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="gov-input font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Statutory Application Role *</label>
                <select
                  value={formData.role_ids[0] || ''}
                  onChange={(e) => setFormData({ ...formData, role_ids: [parseInt(e.target.value)] })}
                  className="gov-select"
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
                  <label className="block font-bold text-slate-700 mb-1">Assigned Bureau / Cell</label>
                  <select
                    value={formData.bureau_id || ''}
                    onChange={(e) => setFormData({ ...formData, bureau_id: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="gov-select"
                  >
                    <option value="">None / Not Bureau-Specific</option>
                    {bureaus.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Regional Jurisdiction</label>
                  <select
                    value={formData.region_id || ''}
                    onChange={(e) => setFormData({ ...formData, region_id: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="gov-select"
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
                  className="gov-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="gov-btn-primary"
                >
                  {submitting ? 'Creating Account...' : 'Register Official Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
