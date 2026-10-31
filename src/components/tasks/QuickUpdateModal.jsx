import React, { useState, useEffect } from 'react';
import { Send, Clock, Check, TrendingUp, Zap } from 'lucide-react';
import Modal from '../common/Modal';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';

export default function QuickUpdateModal({ isOpen, onClose, task, onUpdated }) {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState('IN_PROGRESS');
  const [progress, setProgress] = useState(0);
  const [expectedCompletion, setExpectedCompletion] = useState('');
  const [workUpdate, setWorkUpdate] = useState('');

  useEffect(() => {
    if (task && isOpen) {
      setStatus(task.status || 'IN_PROGRESS');
      setProgress(task.progress || 0);
      setExpectedCompletion(task.expected_completion || '');
      setWorkUpdate('');
    }
  }, [task, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!workUpdate.trim()) {
      error('Please enter what you have completed.');
      return;
    }

    setLoading(true);
    try {
      // 1. If status changed, update status
      if (status !== task.status) {
        await api.updateTaskStatus(task.id, status);
      }

      // 2. Submit progress, ETA, and work update log
      await api.addTaskUpdate(task.id, {
        progress: Number(progress),
        expected_completion: expectedCompletion || null,
        work_update: workUpdate.trim()
      });

      success(`Work update saved for ${task.client_name || 'task'} (${progress}%)!`);
      onClose();
      if (onUpdated) onUpdated();
    } catch (err) {
      error(err.message || 'Failed to save update.');
    } finally {
      setLoading(false);
    }
  };

  if (!task) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Task Work Update"
      subtitle="Log your daily progress and deliverables"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Requirement 8: CLIENT */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            CLIENT
          </span>
          <span className="text-sm font-extrabold text-slate-900 block mt-0.5">
            {task.client_name || 'ABC Technologies'}
          </span>
        </div>

        {/* Requirement 8: TASK */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              TASK
            </span>
            {task.work_type === 'ADVANCE' && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                <Zap className="w-2.5 h-2.5" />
                ADVANCE WORK
              </span>
            )}
          </div>
          <span className="text-sm font-bold text-slate-800 block mt-0.5">
            {task.title}
          </span>
          <span className="text-[10px] font-mono text-slate-500">
            {task.task_id}
          </span>
        </div>

        {/* Requirement 8: STATUS */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
            STATUS
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'ACCEPTED', label: 'Accepted', color: 'bg-slate-100 text-slate-700 hover:bg-slate-200', active: 'bg-slate-800 text-white font-bold' },
              { id: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100', active: 'bg-blue-600 text-white font-bold' },
              { id: 'COMPLETED', label: 'Completed', color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100', active: 'bg-emerald-600 text-white font-bold' }
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setStatus(s.id);
                  if (s.id === 'COMPLETED') setProgress(100);
                }}
                className={`py-2 px-2 rounded-lg border text-xs transition-all text-center cursor-pointer ${
                  status === s.id ? s.active : s.color
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Requirement 8: PROGRESS [ 65% ] */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              PROGRESS
            </label>
            <span className="text-sm font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-mono">
              [ {progress}% ]
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
          />

          <div className="flex items-center justify-between gap-1 mt-1.5">
            {[0, 25, 50, 65, 80, 100].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setProgress(v)}
                className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                  progress === v ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {v}%
              </button>
            ))}
          </div>
        </div>

        {/* Requirement 8: EXPECTED COMPLETION [ 4:30 PM ] */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
            EXPECTED COMPLETION (ETA)
          </label>
          <input
            type="text"
            value={expectedCompletion}
            onChange={(e) => setExpectedCompletion(e.target.value)}
            placeholder="e.g. 4:30 PM, or 2026-10-07T16:30"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>

        {/* Requirement 8: WORK UPDATE [ What have you completed? ] */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
            WORK UPDATE
          </label>
          <textarea
            rows="3"
            value={workUpdate}
            onChange={(e) => setWorkUpdate(e.target.value)}
            placeholder="What have you completed?"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            required
          />
        </div>

        {/* Requirement 8: [ SAVE UPDATE ] */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            {loading ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>SAVE UPDATE</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
