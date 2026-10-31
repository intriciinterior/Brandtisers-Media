import React, { useState, useEffect } from 'react';
import {
  Clock, Calendar, User, FileText, CheckCircle2, MessageSquare,
  History, Download, Edit2, Trash2, AlertTriangle, ArrowRight, Check, Zap
} from 'lucide-react';
import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import PriorityBadge from '../common/PriorityBadge';
import ProgressBar from '../common/ProgressBar';
import { getTaskScheduleStatus } from '../../utils/scheduleStatus';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';

export default function TaskDetailsModal({
  isOpen,
  onClose,
  taskId,
  onEdit,
  onDelete,
  onQuickUpdate,
  onAccept,
  onComplete,
  userRole,
  currentUserId
}) {
  const { success, error } = useToast();
  const [taskData, setTaskData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('updates'); // 'updates' | 'history'

  const loadDetails = async () => {
    if (!taskId) return;
    setLoading(true);
    try {
      const data = await api.getTaskById(taskId);
      setTaskData(data);
    } catch (err) {
      error(err.message || 'Failed to load task details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && taskId) {
      loadDetails();
    } else {
      setTaskData(null);
    }
  }, [isOpen, taskId]);

  if (!isOpen) return null;

  const task = taskData?.task;
  const updates = taskData?.updates || [];
  const activities = taskData?.activities || [];

  const isAssignee = task && task.assigned_to === currentUserId;
  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const isAdmin = userRole === 'ADMIN' || isSuperAdmin;
  const isPending = task && task.status === 'PENDING';
  const isInProgress = task && (task.status === 'IN_PROGRESS' || task.status === 'ACCEPTED');
  const isCompleted = task && task.status === 'COMPLETED';

  const formatDateTime = (dtStr) => {
    if (!dtStr) return '—';
    try {
      const d = new Date(dtStr);
      if (isNaN(d.getTime())) return dtStr;
      return `${d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`;
    } catch {
      return dtStr;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={task ? `${task.task_id} Details` : 'Task Details'}
      maxWidth="max-w-3xl"
    >
      {loading || !task ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading task data...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header Section */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                {task.task_id}
              </span>
              <PriorityBadge priority={task.priority} size="md" />
              <StatusBadge
                status={task.status}
                isOverdue={task.is_overdue}
                isEtaMissed={task.is_eta_missed}
                scheduleStatus={getTaskScheduleStatus(task)}
                size="md"
              />
              {task.work_type === 'ADVANCE' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  <Zap className="w-3.5 h-3.5" />
                  ADVANCE WORK
                </span>
              )}
            </div>

            {/* Overdue Banner if active */}
            {task.is_overdue && !isCompleted && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-100 text-rose-800 text-xs font-bold border border-rose-200 animate-pulse">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>OVERDUE DEADLINE MISSED</span>
              </div>
            )}
          </div>

          {/* Client Name & Task Title (Requirement #1 & #9: Client Name clearly visible BEFORE task title) */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-0.5">
              Client: {task.client_name || 'ABC Technologies'}
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 leading-tight mb-2">
              {task.title}
            </h2>
            {task.description ? (
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                {task.description}
              </p>
            ) : (
              <p className="text-xs text-slate-400 italic">No description provided.</p>
            )}
          </div>

          {/* Progress Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <ProgressBar progress={task.progress} size="lg" />
          </div>

          {/* Assignee & Creator Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Assigned To */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Assigned Team Member
              </span>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-xs"
                  style={{ backgroundColor: task.assignee_avatar_color || '#3B82F6' }}
                >
                  {(task.assignee_name || 'U').charAt(0)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{task.assignee_name || 'Unassigned'}</h4>
                  <p className="text-xs text-slate-500">{task.assignee_designation || 'IT Staff'} • {task.assignee_employee_id}</p>
                </div>
              </div>
            </div>

            {/* Created By */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Created & Assigned By
              </span>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold shadow-xs">
                  {(task.creator_name || 'A').charAt(0)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{task.creator_name || 'Administrator'}</h4>
                  <p className="text-xs text-slate-500">{task.creator_designation || 'IT Admin'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Schedule / Time Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-400 block font-semibold mb-0.5">Task Date</span>
              <span className="font-bold text-slate-800">{task.task_date}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold mb-0.5">Start Time</span>
              <span className="font-bold text-slate-800">{task.start_time ? formatDateTime(task.start_time) : 'Not specified'}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold mb-0.5">Deadline</span>
              <span className={`font-bold ${task.is_overdue ? 'text-rose-600' : 'text-slate-800'}`}>
                {task.deadline ? formatDateTime(task.deadline) : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-semibold mb-0.5">Expected Completion</span>
              <span className={`font-bold ${task.is_eta_missed ? 'text-amber-600' : 'text-slate-800'}`}>
                {task.expected_completion ? formatDateTime(task.expected_completion) : 'Not specified'}
              </span>
            </div>
          </div>

          {/* Instructions if present */}
          {task.additional_instructions && (
            <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200 text-xs">
              <span className="font-bold text-blue-900 block mb-1">Additional Instructions / SOP:</span>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{task.additional_instructions}</p>
            </div>
          )}

          {/* Completion summary if completed */}
          {isCompleted && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950">
              <div className="flex items-center gap-2 font-bold text-emerald-800 mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Task Completed at {formatDateTime(task.completed_at)}</span>
              </div>
              <p className="mt-1 leading-relaxed text-emerald-900">
                <strong>Resolution Summary:</strong> {task.completion_summary || 'Completed successfully.'}
              </p>
            </div>
          )}

          {/* Attachment */}
          {task.attachment_name && (
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-medium text-slate-700">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Attached: {task.attachment_name}</span>
              </div>
              {task.attachment_path && (
                <a
                  href={task.attachment_path}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold flex items-center gap-1 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              )}
            </div>
          )}

          {/* Tabbed Activity / Work Updates Section */}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-2 mb-3">
              <button
                onClick={() => setActiveTab('updates')}
                className={`flex items-center gap-2 pb-2 text-xs font-bold transition-colors border-b-2 -mb-2.5 ${
                  activeTab === 'updates'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Work Updates ({updates.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 pb-2 text-xs font-bold transition-colors border-b-2 -mb-2.5 ${
                  activeTab === 'history'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Full Activity History ({activities.length})</span>
              </button>
            </div>

            {/* Updates list */}
            {activeTab === 'updates' && (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {updates.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">No work updates logged yet.</p>
                ) : (
                  updates.map((up) => (
                    <div key={up.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-800">{up.author_name}</span>
                        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                          <span>Progress: <strong className="text-blue-600">{up.progress}%</strong></span>
                          <span>•</span>
                          <span>{formatDateTime(up.created_at)}</span>
                        </div>
                      </div>
                      <p className="text-slate-700 leading-relaxed font-normal whitespace-pre-wrap">{up.work_update}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* History timeline */}
            {activeTab === 'history' && (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {activities.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">No activity history recorded.</p>
                ) : (
                  activities.map((act) => (
                    <div key={act.id} className="flex items-start gap-2.5 text-xs text-slate-700 p-2 rounded-lg hover:bg-slate-50">
                      <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                      <div className="flex-1">
                        <span className="font-semibold text-slate-900">{act.actor_name || 'System'}: </span>
                        <span>{act.description}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 whitespace-nowrap">{formatDateTime(act.created_at)}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
            {/* Delete button (Super Admin only) */}
            <div>
              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onDelete) onDelete(task);
                  }}
                  className="px-3 py-2 text-xs font-semibold rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Task</span>
                </button>
              )}
            </div>

            {/* Workflow & Edit Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onEdit) onEdit(task);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Edit Details</span>
                </button>
              )}

              {/* Team member workflow buttons */}
              {isAssignee && task.status !== 'COMPLETED' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onQuickUpdate) onQuickUpdate(task);
                    }}
                    className="px-3.5 py-2 text-xs font-bold rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Quick Update</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onComplete) onComplete(task);
                    }}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Mark as Completed</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
