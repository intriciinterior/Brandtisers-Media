import React, { useState, useEffect } from 'react';
import { Plus, Upload, X, Calendar, Clock, AlertCircle, ChevronDown, ChevronUp, Zap, Check, Building2, Tag } from 'lucide-react';
import Modal from '../common/Modal';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';

export default function CreateTaskModal({ isOpen, onClose, onTaskCreated, teamMembers = [] }) {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [addAnother, setAddAnother] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Dynamic Clients & Work Types
  const [clients, setClients] = useState([]);
  const [workTypes, setWorkTypes] = useState([]);

  const todayStr = new Date().toISOString().split('T')[0];

  const initialForm = {
    client_name: '',
    title: '',
    assigned_to: '',
    task_date: todayStr,
    priority: 'MEDIUM',
    description: '',
    work_type: 'NORMAL',
    work_category: '',
    attachment_name: '',
    attachment_path: ''
  };

  const [form, setForm] = useState(initialForm);

  // Load active clients & active work types
  useEffect(() => {
    async function loadMeta() {
      try {
        const [cRes, wtRes] = await Promise.all([
          api.getClients({ status: 'ACTIVE' }),
          api.getWorkTypes({ status: 'ACTIVE' })
        ]);
        setClients(cRes.clients || []);
        setWorkTypes(wtRes.workTypes || []);
      } catch (err) {
        // ignore
      }
    }
    if (isOpen) {
      loadMeta();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      // Find default employee (role === 'EMPLOYEE' or first in list)
      const defaultMember = teamMembers.length > 0 ? teamMembers[0].id : '';
      setForm((prev) => ({
        ...initialForm,
        client_name: clients.length > 0 ? clients[0].client_name : (prev.client_name || ''),
        assigned_to: defaultMember,
        work_category: workTypes.length > 0 ? workTypes[0].name : ''
      }));
      setAddAnother(false);
      setShowMoreOptions(false);
    }
  }, [isOpen, teamMembers, clients, workTypes]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const res = await api.uploadFile(file);
      setForm((prev) => ({
        ...prev,
        attachment_name: res.fileName,
        attachment_path: res.filePath
      }));
      success(`File "${res.fileName}" attached.`);
    } catch (err) {
      error(`Attachment upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = () => {
    setForm((prev) => ({ ...prev, attachment_name: '', attachment_path: '' }));
  };

  const handleSave = async (keepOpen = false) => {
    if (!form.client_name.trim()) {
      error('Please select or enter a Client Name.');
      return;
    }
    if (!form.title.trim()) {
      error('Please enter a task title.');
      return;
    }
    if (!form.assigned_to) {
      error('Please select an employee to assign this task to.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        client_name: form.client_name.trim(),
        title: form.title.trim(),
        assigned_to: Number(form.assigned_to),
        task_date: form.task_date,
        start_time: null,
        deadline: null,
        expected_completion: null,
        priority: form.priority,
        description: form.description.trim(),
        work_type: form.work_type,
        work_category: form.work_category || (workTypes[0]?.name || 'General'),
        attachment_name: form.attachment_name || null,
        attachment_path: form.attachment_path || null
      };

      const res = await api.createTask(payload);
      success(`Task created for ${form.client_name}: ${res.task_id}!`);
      if (onTaskCreated) onTaskCreated();

      if (keepOpen) {
        setForm((prev) => ({
          ...prev,
          title: '',
          description: '',
          attachment_name: '',
          attachment_path: ''
        }));
      } else {
        onClose();
      }
    } catch (err) {
      error(err.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  // Filter employees
  const availableEmployees = teamMembers.filter((m) => m.role === 'EMPLOYEE' || m.status === 'ACTIVE');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New IT Task"
      subtitle="Assign daily work to employees under a client account"
      maxWidth="max-w-xl"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave(addAnother);
        }}
        className="space-y-4"
      >
        {/* STEP 1 — BASIC DETAILS */}
        <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
          <div className="flex items-center gap-1.5 mb-2.5">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
              1
            </span>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Basic Details (Client & Task)
            </span>
          </div>

          <div className="space-y-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Client Name <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="client_name"
                  list="client-suggestions"
                  value={form.client_name}
                  onChange={handleChange}
                  placeholder="Select client or type new name..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  required
                />
                <datalist id="client-suggestions">
                  {clients.map((c) => (
                    <option key={c.id} value={c.client_name} />
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Task Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. Website Server Backup & Disaster Recovery Sync"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                required
              />
            </div>
          </div>
        </div>

        {/* STEP 2 — ASSIGN & DATE */}
        <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
          <div className="flex items-center gap-1.5 mb-2.5">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
              2
            </span>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Assign to Employee & Date
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Assign To Employee <span className="text-rose-500">*</span>
              </label>
              <select
                name="assigned_to"
                value={form.assigned_to}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                required
              >
                <option value="">Select Employee</option>
                {availableEmployees.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.employee_id}) - {m.designation || 'Staff'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Task Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                name="task_date"
                value={form.task_date}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                required
              />
            </div>
          </div>
        </div>

        {/* STEP 3 — PRIORITY */}
        <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
          <div className="flex items-center gap-1.5 mb-2.5">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
              3
            </span>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Priority
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'LOW', label: 'Low', color: 'border-slate-300 text-slate-700 bg-white hover:bg-slate-100', active: 'border-slate-600 bg-slate-800 text-white' },
              { id: 'MEDIUM', label: 'Medium', color: 'border-blue-200 text-blue-700 bg-white hover:bg-blue-50', active: 'border-blue-600 bg-blue-600 text-white' },
              { id: 'HIGH', label: 'High', color: 'border-amber-200 text-amber-700 bg-white hover:bg-amber-50', active: 'border-amber-600 bg-amber-600 text-white' },
              { id: 'URGENT', label: 'Urgent', color: 'border-rose-200 text-rose-700 bg-white hover:bg-rose-50', active: 'border-rose-600 bg-rose-600 text-white' }
            ].map((pri) => (
              <button
                key={pri.id}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, priority: pri.id }))}
                className={`py-1.5 rounded-lg border text-xs font-bold transition-all text-center cursor-pointer ${
                  form.priority === pri.id ? pri.active : pri.color
                }`}
              >
                {pri.label}
              </button>
            ))}
          </div>
        </div>

        {/* STEP 4 — WORK CATEGORY & DESCRIPTION */}
        <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
              4
            </span>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Work Category & Instructions
            </span>
          </div>

          {workTypes.length > 0 && (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Work Category
              </label>
              <select
                name="work_category"
                value={form.work_category}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {workTypes.map((wt) => (
                  <option key={wt.id} value={wt.name}>
                    {wt.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Instructions / Description
            </label>
            <textarea
              name="description"
              rows="2"
              value={form.description}
              onChange={handleChange}
              placeholder="Instructions or steps for the employee..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
        </div>

        {/* STEP 5 — WORK TYPE (Normal Work vs Advance Work) */}
        <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
          <div className="flex items-center gap-1.5 mb-2.5">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
              5
            </span>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Schedule Type
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, work_type: 'NORMAL' }))}
              className={`p-2.5 rounded-lg border text-xs font-bold text-left transition-all cursor-pointer flex items-center justify-between ${
                form.work_type === 'NORMAL'
                  ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-2xs'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div>
                <span className="block font-bold">Normal Work</span>
                <span className="text-[10px] text-slate-500 font-normal">Standard daily scheduled task</span>
              </div>
              {form.work_type === 'NORMAL' && <Check className="w-4 h-4 text-blue-600" />}
            </button>

            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, work_type: 'ADVANCE' }))}
              className={`p-2.5 rounded-lg border text-xs font-bold text-left transition-all cursor-pointer flex items-center justify-between ${
                form.work_type === 'ADVANCE'
                  ? 'border-purple-500 bg-purple-50 text-purple-900 shadow-2xs'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div>
                <span className="flex items-center gap-1 font-bold text-purple-800">
                  <Zap className="w-3.5 h-3.5 text-purple-600" />
                  Advance Work
                </span>
                <span className="text-[10px] text-purple-600 font-normal">Planned early or future date work</span>
              </div>
              {form.work_type === 'ADVANCE' && <Check className="w-4 h-4 text-purple-700" />}
            </button>
          </div>
        </div>

        {/* Collapsible More Options (File Attachments) */}
        <div>
          <button
            type="button"
            onClick={() => setShowMoreOptions(!showMoreOptions)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold transition-colors cursor-pointer"
          >
            {showMoreOptions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>More Options {form.attachment_name ? '(1 attached)' : ''}</span>
          </button>

          {showMoreOptions && (
            <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                File Attachment
              </label>

              {form.attachment_name ? (
                <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                  <span className="font-mono text-slate-700 truncate">{form.attachment_name}</span>
                  <button
                    type="button"
                    onClick={removeAttachment}
                    className="text-rose-500 hover:text-rose-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="border border-dashed border-slate-300 rounded-lg p-3 text-center cursor-pointer hover:bg-white transition-colors block">
                  <Upload className="w-4 h-4 mx-auto text-slate-400 mb-1" />
                  <span className="text-[11px] text-slate-500 font-medium">
                    {uploading ? 'Uploading...' : 'Click to attach documentation or logs'}
                  </span>
                  <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                </label>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={loading}
              className="px-3.5 py-2 rounded-lg border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create & Add Another</span>
            </button>

            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              {loading ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>Create Task</span>
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
