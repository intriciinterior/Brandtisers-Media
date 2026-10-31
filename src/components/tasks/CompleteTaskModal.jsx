import React, { useState } from 'react';
import { CheckCircle2, Award, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import Modal from '../common/Modal';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';

export default function CompleteTaskModal({ isOpen, onClose, task, onCompleted }) {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');

  const handleConfirm = async (e) => {
    e.preventDefault();
    if (!task) return;

    setLoading(true);
    try {
      await api.completeTask(task.id, {
        completion_summary: summary.trim() || 'Work completed and verified successfully.'
      });

      // Trigger celebratory confetti
      try {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch (err) {
        // non-fatal if confetti fails
      }

      success(`Task ${task.task_id} completed successfully!`);
      onClose();
      if (onCompleted) onCompleted();
    } catch (err) {
      error(err.message || 'Failed to complete task.');
    } finally {
      setLoading(false);
    }
  };

  if (!task) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Complete Task Confirmation"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleConfirm} className="space-y-4 text-center">
        {/* Big icon */}
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div>
          <h4 className="text-base font-bold text-slate-900 mb-1">
            Are you sure this task is completed?
          </h4>
          <p className="text-xs text-slate-500 font-mono">
            {task.task_id}: {task.title}
          </p>
        </div>

        <div className="text-left bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Final Work Summary / Resolution Notes
          </label>
          <textarea
            rows="3"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="e.g. Server backup completed and verified successfully. All 42GB archives synced to disaster recovery S3 bucket."
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            autoFocus
          />
          <p className="text-[11px] text-slate-400 mt-1">
            This will record progress as 100%, set status to COMPLETED, and timestamp the completion.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>Confirm & Complete</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
