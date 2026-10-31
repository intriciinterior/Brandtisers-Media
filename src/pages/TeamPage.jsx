import React, { useState, useEffect } from 'react';
import {
  UserPlus, Shield, User, Mail, Phone, Calendar, Trash2, Edit2,
  Eye, CheckCircle2, XCircle, Search, RefreshCw, AlertTriangle, LogIn, KeyRound
} from 'lucide-react';
import ConfirmModal from '../components/common/ConfirmModal';
import AddMemberModal from '../components/team/AddMemberModal';
import EditMemberModal from '../components/team/EditMemberModal';
import MemberProfileModal from '../components/team/MemberProfileModal';
import ResetPasswordModal from '../components/team/ResetPasswordModal';
import EmptyState from '../components/common/EmptyState';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function TeamPage({ onSelectTask, onTabChange }) {
  const { isSuperAdmin, user: currentUser, isImpersonated, impersonate } = useAuth();
  const { success, error } = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [resetPasswordMember, setResetPasswordMember] = useState(null);
  const [viewingProfileId, setViewingProfileId] = useState(null);
  const [deletingMember, setDeletingMember] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [impersonatingId, setImpersonatingId] = useState(null);

  const handleLoginAsUser = async (member) => {
    if (isImpersonated) {
      error('Nested impersonation is disabled. Please return to your account first.');
      return;
    }
    setImpersonatingId(member.id);
    try {
      await impersonate(member.id);
      success(`Now viewing ${member.full_name}'s account.`);
      if (onTabChange) onTabChange('dashboard');
    } catch (err) {
      error(err.message || 'Failed to login as user.');
    } finally {
      setImpersonatingId(null);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data.users || []);
    } catch (err) {
      error(err.message || 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggleStatus = async (user) => {
    try {
      const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await api.updateUser(user.id, { status: newStatus });
      success(`${user.full_name} status changed to ${newStatus}.`);
      loadUsers();
    } catch (err) {
      error(err.message || 'Failed to update user status.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingMember) return;
    setDeleteLoading(true);
    try {
      await api.deleteUser(deletingMember.id);
      success(`Employee ${deletingMember.full_name} removed. Historical task records preserved.`);
      setDeletingMember(null);
      loadUsers();
    } catch (err) {
      error(err.message || 'Failed to remove member.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (statusFilter !== 'ALL' && u.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      return (
        u.full_name.toLowerCase().includes(term) ||
        (u.employee_id && u.employee_id.toLowerCase().includes(term)) ||
        (u.email && u.email.toLowerCase().includes(term)) ||
        (u.designation && u.designation.toLowerCase().includes(term))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            IT Department Employees
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage engineers, staff members, workload allocation, and employee profiles.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadUsers}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
            title="Refresh Employees"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {isSuperAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add Employee</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search employee by name, ID, email..."
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Employees</option>
            <option value="INACTIVE">Inactive Employees</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading employees...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          icon={User}
          title={users.length === 0 ? "No employees added yet" : "No employees found"}
          description={
            users.length === 0
              ? "Start by adding team members to assign daily IT tasks and generate work reports."
              : "Try adjusting your search criteria."
          }
          actionLabel={isSuperAdmin ? "+ Add Employee" : undefined}
          onAction={isSuperAdmin ? () => setShowAddModal(true) : undefined}
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <table className="w-full text-left text-sm border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Employee Info</th>
                <th className="py-3.5 px-4">Employee ID</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Contact</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Workload</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((member) => {
                const isSelf = member.id === currentUser?.id;
                const isSuper = member.role === 'SUPER_ADMIN';
                const canEdit = isSuperAdmin;
                const canDelete = isSuperAdmin && !isSelf;

                return (
                  <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Member Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-2xs"
                          style={{ backgroundColor: member.avatar_color || '#3B82F6' }}
                        >
                          {member.full_name.charAt(0)}
                        </div>
                        <div>
                          <button
                            onClick={() => setViewingProfileId(member.id)}
                            className="font-bold text-slate-900 hover:text-blue-600 transition-colors text-left cursor-pointer"
                          >
                            {member.full_name}
                          </button>
                          <span className="block text-xs text-slate-500">
                            {member.designation || 'IT Staff'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Employee ID */}
                    <td className="py-3.5 px-4 font-mono text-xs font-bold text-slate-600">
                      {member.employee_id}
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          member.role === 'SUPER_ADMIN'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {member.role === 'SUPER_ADMIN' ? 'SUPER ADMIN' : 'EMPLOYEE'}
                      </span>
                    </td>

                    {/* Contact */}
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      <div>{member.email}</div>
                      {member.phone && <div className="text-slate-400">{member.phone}</div>}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => canEdit && !isSelf && handleToggleStatus(member)}
                        disabled={!canEdit || isSelf}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold transition-all ${
                          member.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                        } ${!canEdit || isSelf ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
                        title={canEdit && !isSelf ? 'Click to toggle status' : ''}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${member.status === 'ACTIVE' ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                        <span>{member.status}</span>
                      </button>
                    </td>

                    {/* Workload */}
                    <td className="py-3.5 px-4 text-xs">
                      <div className="font-semibold text-slate-800">
                        {member.active_tasks || 0} active
                      </div>
                      <div className="text-slate-400">
                        {member.completed_tasks || 0} completed
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Login as User (Super Admin on Employees) */}
                        {isSuperAdmin && !isSelf && (
                          <button
                            onClick={() => handleLoginAsUser(member)}
                            disabled={isImpersonated || impersonatingId === member.id}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs ${
                              isImpersonated
                                ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 border border-slate-200'
                                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 cursor-pointer'
                            }`}
                            title={
                              isImpersonated
                                ? 'Nested impersonation is disabled. Return to your account first.'
                                : `Login as ${member.full_name}`
                            }
                          >
                            <LogIn className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Login as User</span>
                          </button>
                        )}

                        {/* Reset Password */}
                        {isSuperAdmin && !isSelf && (
                          <button
                            onClick={() => setResetPasswordMember(member)}
                            className="p-1.5 rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                            title={`Reset Password for ${member.full_name}`}
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                        )}

                        {/* View Profile */}
                        <button
                          onClick={() => setViewingProfileId(member.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="View Employee Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Edit */}
                        {canEdit && (
                          <button
                            onClick={() => setEditingMember(member)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Edit Employee"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}

                        {/* Remove */}
                        {canDelete && (
                          <button
                            onClick={() => setDeletingMember(member)}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Remove Employee"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Employee Modal */}
      <AddMemberModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onMemberAdded={loadUsers}
      />

      {/* Edit Employee Modal */}
      <EditMemberModal
        isOpen={Boolean(editingMember)}
        onClose={() => setEditingMember(null)}
        member={editingMember}
        onMemberUpdated={loadUsers}
        isSuperAdmin={isSuperAdmin}
      />

      {/* Reset Employee Password Modal */}
      <ResetPasswordModal
        isOpen={Boolean(resetPasswordMember)}
        onClose={() => setResetPasswordMember(null)}
        member={resetPasswordMember}
        onPasswordReset={loadUsers}
      />

      {/* Employee Profile Modal */}
      <MemberProfileModal
        isOpen={Boolean(viewingProfileId)}
        onClose={() => setViewingProfileId(null)}
        memberId={viewingProfileId}
        onSelectTask={onSelectTask}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingMember)}
        onClose={() => setDeletingMember(null)}
        onConfirm={handleConfirmDelete}
        title={`Remove ${deletingMember?.full_name}?`}
        message={`Are you sure you want to remove ${deletingMember?.full_name} (${deletingMember?.employee_id})? Their historical task assignments, progress logs, and reports will be safely preserved.`}
        confirmText="Remove Employee"
        type="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
