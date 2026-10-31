import React, { useState, useEffect } from 'react';
import {
  Building2, Plus, Search, Edit2, Trash2, CheckCircle2, XCircle,
  RefreshCw, Mail, Phone, MapPin, FileText, Check, AlertCircle, ListTodo
} from 'lucide-react';
import Modal from '../components/common/Modal';
import ConfirmModal from '../components/common/ConfirmModal';
import EmptyState from '../components/common/EmptyState';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function ClientsPage({ onTabChange }) {
  const { isSuperAdmin } = useAuth();
  const { success, error } = useToast();

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [deletingClient, setDeletingClient] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const initialForm = {
    client_name: '',
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    status: 'ACTIVE'
  };
  const [form, setForm] = useState(initialForm);

  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await api.getClients();
      setClients(data.clients || []);
    } catch (err) {
      error(err.message || 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const handleOpenAdd = () => {
    setForm(initialForm);
    setShowAddModal(true);
  };

  const handleOpenEdit = (client) => {
    setEditingClient(client);
    setForm({
      client_name: client.client_name || '',
      company_name: client.company_name || '',
      contact_person: client.contact_person || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      notes: client.notes || '',
      status: client.status || 'ACTIVE'
    });
  };

  const handleSaveClient = async (e) => {
    e.preventDefault();
    if (!form.client_name.trim()) {
      error('Client Name is required');
      return;
    }

    setSubmitting(true);
    try {
      if (editingClient) {
        await api.updateClient(editingClient.id, form);
        success(`Client "${form.client_name}" updated successfully!`);
        setEditingClient(null);
      } else {
        await api.createClient(form);
        success(`Client "${form.client_name}" added successfully!`);
        setShowAddModal(false);
      }
      setForm(initialForm);
      loadClients();
    } catch (err) {
      error(err.message || 'Failed to save client');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (client) => {
    try {
      const newStatus = client.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await api.updateClient(client.id, { status: newStatus });
      success(`Client "${client.client_name}" marked as ${newStatus}.`);
      loadClients();
    } catch (err) {
      error(err.message || 'Failed to update client status');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingClient) return;
    setDeleteLoading(true);
    try {
      await api.deleteClient(deletingClient.id);
      success(`Client "${deletingClient.client_name}" removed.`);
      setDeletingClient(null);
      loadClients();
    } catch (err) {
      error(err.message || 'Failed to delete client');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredClients = clients.filter((c) => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      return (
        c.client_name.toLowerCase().includes(term) ||
        (c.company_name && c.company_name.toLowerCase().includes(term)) ||
        (c.contact_person && c.contact_person.toLowerCase().includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term)) ||
        (c.phone && c.phone.toLowerCase().includes(term))
      );
    }
    return true;
  });

  const activeCount = clients.filter((c) => c.status === 'ACTIVE').length;
  const totalTasksCount = clients.reduce((sum, c) => sum + (c.task_count || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Client Management
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Add and maintain IT clients. Every daily task is connected to a dynamic client account.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadClients}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
            title="Refresh Clients"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {isSuperAdmin && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add New Client</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Total Clients
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{clients.length}</div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Configured in database</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
            Active Clients
          </span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{activeCount}</div>
          <span className="text-[11px] text-emerald-600 mt-0.5 block">Available for tasks</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Inactive Clients
          </span>
          <div className="text-2xl font-bold text-slate-600 mt-1">{clients.length - activeCount}</div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Deactivated accounts</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider block">
            Total Tasks Logged
          </span>
          <div className="text-2xl font-bold text-blue-600 mt-1">{totalTasksCount}</div>
          <span className="text-[11px] text-blue-600 mt-0.5 block">Across all clients</span>
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
            placeholder="Search by client name, contact, email..."
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
            <option value="ACTIVE">Active Clients</option>
            <option value="INACTIVE">Inactive Clients</option>
          </select>
        </div>
      </div>

      {/* Clients Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading client accounts...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={clients.length === 0 ? "No clients added yet" : "No matching clients found"}
          description={
            clients.length === 0
              ? "Start by adding your first client. All IT daily tasks will be assigned under configured clients."
              : "Try adjusting your search query or status filter."
          }
          actionLabel={isSuperAdmin ? "+ Add New Client" : undefined}
          onAction={isSuperAdmin ? handleOpenAdd : undefined}
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <table className="w-full text-left text-sm border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Client Name</th>
                <th className="py-3.5 px-4">Contact Person</th>
                <th className="py-3.5 px-4">Contact Details</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Tasks Linked</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Client Name */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-extrabold text-xs shadow-2xs">
                        {client.client_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block leading-tight">
                          {client.client_name}
                        </span>
                        {client.company_name && client.company_name !== client.client_name && (
                          <span className="text-xs text-slate-500 block">
                            {client.company_name}
                          </span>
                        )}
                        {client.address && (
                          <span className="text-[11px] text-slate-400 block truncate max-w-xs">
                            {client.address}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Contact Person */}
                  <td className="py-3.5 px-4 text-xs font-medium text-slate-700">
                    {client.contact_person || '—'}
                  </td>

                  {/* Contact Details */}
                  <td className="py-3.5 px-4 text-xs text-slate-600">
                    {client.email && (
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-1.5 text-slate-500 mt-0.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {!client.email && !client.phone && <span className="text-slate-400">—</span>}
                  </td>

                  {/* Status Toggle */}
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => isSuperAdmin && handleToggleStatus(client)}
                      disabled={!isSuperAdmin}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold transition-all ${
                        client.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      } ${!isSuperAdmin ? 'cursor-default' : 'cursor-pointer'}`}
                      title={isSuperAdmin ? 'Click to toggle status' : ''}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${client.status === 'ACTIVE' ? 'bg-emerald-600' : 'bg-slate-400'}`} />
                      <span>{client.status}</span>
                    </button>
                  </td>

                  {/* Tasks Linked */}
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs">
                      <ListTodo className="w-3.5 h-3.5" />
                      <span>{client.task_count || 0} tasks</span>
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    {isSuperAdmin && (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(client)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Edit Client"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setDeletingClient(client)}
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Client"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Client Modal */}
      <Modal
        isOpen={showAddModal || Boolean(editingClient)}
        onClose={() => {
          setShowAddModal(false);
          setEditingClient(null);
        }}
        title={editingClient ? `Edit Client: ${editingClient.client_name}` : 'Add New Client'}
        subtitle="Manage client details for task allocation and reporting"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSaveClient} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Client Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.client_name}
              onChange={(e) => setForm({ ...form, client_name: e.target.value })}
              placeholder="e.g. ABC Technologies"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={form.company_name}
                onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                placeholder="e.g. ABC Technologies Pvt Ltd"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Contact Person
              </label>
              <input
                type="text"
                value={form.contact_person}
                onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                placeholder="e.g. John Doe (IT Director)"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Contact Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="client@company.com"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Contact Phone
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Address / Location
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="e.g. Sector 62, Noida, India"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Notes / Scope Summary
            </label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Server maintenance, daily backup, SLA parameters..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="ACTIVE">ACTIVE (Available in Task Forms)</option>
              <option value="INACTIVE">INACTIVE (Hidden from New Tasks)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setShowAddModal(false);
                setEditingClient(null);
              }}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editingClient ? 'Update Client' : 'Add Client'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Client Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingClient)}
        onClose={() => setDeletingClient(null)}
        onConfirm={handleConfirmDelete}
        title={`Delete Client ${deletingClient?.client_name}?`}
        message={
          deletingClient?.task_count > 0
            ? `Warning: This client has ${deletingClient.task_count} associated task(s). Deleting will remove or unlink associated task references. We recommend setting status to INACTIVE instead.`
            : `Are you sure you want to permanently delete "${deletingClient?.client_name}"?`
        }
        confirmText="Delete Client"
        type="danger"
        loading={deleteLoading}
      />
    </div>
  );
}
