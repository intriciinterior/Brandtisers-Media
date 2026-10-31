import React, { useState, useEffect } from 'react';
import {
  Tag, Plus, Search, Edit2, Trash2, CheckCircle2, XCircle,
  RefreshCw, Check, ArrowUpDown, Palette
} from 'lucide-react';
import Modal from '../components/common/Modal';
import ConfirmModal from '../components/common/ConfirmModal';
import EmptyState from '../components/common/EmptyState';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function WorkTypesPage() {
  const { isSuperAdmin } = useAuth();
  const { success, error } = useToast();

  const [workTypes, setWorkTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [deletingType, setDeletingType] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const colorPresets = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
    '#8B5CF6', '#EC4899', '#06B6D4', '#6366F1'
  ];

  const initialForm = {
    name: '',
    description: '',
    color: '#3B82F6',
    display_order: 0,
    status: 'ACTIVE'
  };
  const [form, setForm] = useState(initialForm);

  const loadWorkTypes = async () => {
    setLoading(true);
    try {
      const data = await api.getWorkTypes();
      setWorkTypes(data.workTypes || []);
    } catch (err) {
      error(err.message || 'Failed to load work types');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkTypes();
  }, []);

  const handleOpenAdd = () => {
    setForm({
      ...initialForm,
      display_order: workTypes.length + 1
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (wt) => {
    setEditingType(wt);
    setForm({
      name: wt.name || '',
      description: wt.description || '',
      color: wt.color || '#3B82F6',
      display_order: wt.display_order ?? 0,
      status: wt.status || 'ACTIVE'
    });
  };

  const handleSaveWorkType = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      error('Work Category Name is required');
      return;
    }

    setSubmitting(true);
    try {
      if (editingType) {
        await api.updateWorkType(editingType.id, form);
        success(`Work category "${form.name}" updated!`);
        setEditingType(null);
      } else {
        await api.createWorkType(form);
        success(`Work category "${form.name}" added!`);
        setShowAddModal(false);
      }
      setForm(initialForm);
      loadWorkTypes();
    } catch (err) {
      error(err.message || 'Failed to save work category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (wt) => {
    try {
      const newStatus = wt.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await api.updateWorkType(wt.id, { status: newStatus });
      success(`Work category "${wt.name}" marked as ${newStatus}.`);
      loadWorkTypes();
    } catch (err) {
      error(err.message || 'Failed to update status');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingType) return;
    setDeleteLoading(true);
    try {
      await api.deleteWorkType(deletingType.id);
      success(`Work category "${deletingType.name}" removed.`);
      setDeletingType(null);
      loadWorkTypes();
    } catch (err) {
      error(err.message || 'Failed to delete work category');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredWorkTypes = workTypes.filter((wt) => {
    if (statusFilter !== 'ALL' && wt.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      return (
        wt.name.toLowerCase().includes(term) ||
        (wt.description && wt.description.toLowerCase().includes(term))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-md shadow-purple-500/20">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Work Category Management
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Customize the work types handled by your IT department (e.g. Website, Support, Testing, Design, DevOps).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadWorkTypes}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-600' : ''}`} />
          </button>

          {isSuperAdmin && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-purple-500/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Work Category</span>
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
            placeholder="Search work categories..."
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Categories</option>
            <option value="INACTIVE">Inactive Categories</option>
          </select>
        </div>
      </div>

      {/* Work Types Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading work categories...</p>
        </div>
      ) : filteredWorkTypes.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="No work categories configured"
          description="Create categories your IT department works on so employees can tag tasks and daily reports."
          actionLabel={isSuperAdmin ? "+ Add Work Category" : undefined}
          onAction={isSuperAdmin ? handleOpenAdd : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWorkTypes.map((wt) => (
            <div
              key={wt.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full ring-2 ring-white shadow-xs"
                      style={{ backgroundColor: wt.color || '#3B82F6' }}
                    />
                    <h3 className="font-bold text-slate-900 text-sm">{wt.name}</h3>
                  </div>

                  <button
                    onClick={() => isSuperAdmin && handleToggleStatus(wt)}
                    disabled={!isSuperAdmin}
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-all ${
                      wt.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    } ${!isSuperAdmin ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <span>{wt.status}</span>
                  </button>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed min-h-[32px]">
                  {wt.description || 'Standard IT department deliverable and task domain.'}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-xs text-slate-400">
                <span>Display Order: #{wt.display_order ?? 0}</span>

                {isSuperAdmin && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(wt)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Edit Category"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingType(wt)}
                      className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete Category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={showAddModal || Boolean(editingType)}
        onClose={() => {
          setShowAddModal(false);
          setEditingType(null);
        }}
        title={editingType ? `Edit Category: ${editingType.name}` : 'Add Work Category'}
        subtitle="Configure department tasks category for reporting and task assignments"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveWorkType} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Category Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Graphic Design, Testing, Cloud Backup"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Description / Scope
            </label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Description of activities under this category..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Badge Color
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {colorPresets.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                    form.color === c ? 'scale-125 ring-2 ring-purple-600 ring-offset-2' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="w-7 h-7 rounded-lg border border-slate-300 cursor-pointer p-0"
                title="Custom color"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Display Order
              </label>
              <input
                type="number"
                value={form.display_order}
                onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setShowAddModal(false);
                setEditingType(null);
              }}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editingType ? 'Update Category' : 'Add Category'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingType)}
        onClose={() => setDeletingType(null)}
        onConfirm={handleConfirmDelete}
        title={`Delete Category "${deletingType?.name}"?`}
        message="Are you sure you want to remove this work category? Existing tasks with this tag will retain their historical logs."
        confirmText="Delete Category"
        type="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
