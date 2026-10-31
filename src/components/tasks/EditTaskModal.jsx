import React, { useState, useEffect } from 'react';
import { Save, Upload, X } from 'lucide-react';
import Modal from '../common/Modal';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';

export default function EditTaskModal({ isOpen, onClose, task, onTaskUpdated, teamMembers = [] }) {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    client_name: '',
    title: '',
    description: '',
    assigned_to: '',
    priority: 'MEDIUM',
    work_type: 'NORMAL',
    task_date: '',
    start_time: '',
    deadline: '',
    expected_completion: '',
    additional_instructions: '',
    attachment_name: '',
    attachment_path: ''
  });

  useEffect(() => {
    if (task && isOpen) {
      setForm({
        client_name: task.client_name || '',
        title: task.title || '',
        description: task.description || '',
        assigned_to: task.assigned_to || '',
        priority: task.priority || 'MEDIUM',
        work_type: task.work_type || 'NORMAL',
        task_date: task.task_date || '',
        start_time: task.start_time || '',
        deadline: task.deadline || '',
        expected_completion: task.expected_completion || '',
        additional_instructions: task.additional_instructions || '',
        attachment_name: task.attachment_name || '',
        attachment_path: task.attachment_path || ''
      });
    }
  }, [task, isOpen]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.client_name?.trim()) {
      error('Client Name is required.');
      return;
    }
    if (!form.title.trim()) {
      error('Task title is required.');
      return;
    }

    setLoading(true);
    try {
      await api.updateTask(task.id, {
        ...form,
        assigned_to: Number(form.assigned_to)
      });
      success(`Task ${task.task_id} updated successfully!`);
      onClose();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      error(err.message || 'Failed to update task.');
    } finally {
      setLoading(false);
    }
  };

  if (!task) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Task: ${task.task_id}`}
      subtitle="Modify task assignment, priority, timeline, or specifications"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Client Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            name="client_name"
            value={form.client_name}
            onChange={handleChange}
            placeholder="e.g. ABC Technologies"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Task Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Detailed Description
          </label>
          <textarea
            name="description"
            rows="3"
            value={form.description}
            onChange={handleChange}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Assign To <span className="text-rose-500">*</span>
            </label>
            <select
              name="assigned_to"
              value={form.assigned_to}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              required
            >
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name} ({m.designation || 'IT Staff'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Priority
            </label>
            <select
              name="priority"
              value={form.priority}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent (Immediate Attention)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Work Type
            </label>
            <select
              name="work_type"
              value={form.work_type}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
            >
              <option value="NORMAL">Normal Work (Standard)</option>
              <option value="ADVANCE">Advance Work (Ahead/Future)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Task Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              name="task_date"
              value={form.task_date}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Start Time
            </label>
            <input
              type="datetime-local"
              name="start_time"
              value={form.start_time}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Deadline
            </label>
            <input
              type="datetime-local"
              name="deadline"
              value={form.deadline}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Expected Completion Time (ETA)
            </label>
            <input
              type="datetime-local"
              name="expected_completion"
              value={form.expected_completion}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Additional Instructions
          </label>
          <textarea
            name="additional_instructions"
            rows="2"
            value={form.additional_instructions}
            onChange={handleChange}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md transition-all flex items-center gap-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Save Changes</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
