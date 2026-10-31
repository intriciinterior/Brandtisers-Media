import React from 'react';
import { Calendar, Clock, AlertTriangle, ArrowRight, CheckCircle2, MessageSquare, User, FileText, Zap } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import PriorityBadge from '../common/PriorityBadge';
import ProgressBar from '../common/ProgressBar';
import { getTaskScheduleStatus } from '../../utils/scheduleStatus';

export default function TaskCard({
  task,
  onOpenDetails,
  onQuickUpdate,
  onAccept,
  onComplete,
  onEdit,
  userRole,
  currentUserId
}) {
  const isAssignee = task.assigned_to === currentUserId;
  const isPending = task.status === 'PENDING';
  const isInProgress = task.status === 'IN_PROGRESS' || task.status === 'ACCEPTED';
  const isCompleted = task.status === 'COMPLETED';
  const schedStatus = getTaskScheduleStatus(task);

  const formatTime = (dtStr) => {
    if (!dtStr) return '—';
    try {
      const d = new Date(dtStr);
      if (isNaN(d.getTime())) return dtStr;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return dtStr;
    }
  };

  return (
    <div
      onClick={() => onOpenDetails && onOpenDetails(task)}
      className={`group relative bg-white rounded-xl border transition-all duration-150 hover:shadow-sm cursor-pointer p-4 flex flex-col justify-between ${
        task.is_overdue
          ? 'border-rose-300 bg-rose-50/20'
          : schedStatus === 'AHEAD_OF_SCHEDULE'
          ? 'border-emerald-300/80 hover:border-emerald-400'
          : 'border-slate-200 hover:border-blue-300'
      }`}
    >
      <div>
        {/* Top bar: ID, Priority, Status */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
              {task.task_id}
            </span>
            <PriorityBadge priority={task.priority} size="xs" />
          </div>
          <StatusBadge
            status={task.status}
            isOverdue={task.is_overdue}
            isEtaMissed={task.is_eta_missed}
            scheduleStatus={schedStatus}
            size="xs"
          />
        </div>

        {/* Client Name (Prominent & Clear) */}
        <div className="mb-1">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className="text-xs font-bold text-slate-900 tracking-tight block">
              {task.client_name || 'ABC Technologies'}
            </span>
            {task.work_type === 'ADVANCE' && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                <Zap className="w-2.5 h-2.5" />
                ADVANCE WORK
              </span>
            )}
          </div>
          {/* Task Title */}
          <h3 className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors line-clamp-1 leading-snug">
            {task.title}
          </h3>
        </div>

        {/* Short description */}
        {task.description && (
          <p className="text-xs text-slate-600 line-clamp-2 mb-3 leading-relaxed">
            {task.description}
          </p>
        )}

        {/* Assignee & Date */}
        <div className="flex items-center justify-between gap-2 py-2 text-xs text-slate-500 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
              style={{ backgroundColor: task.assignee_avatar_color || '#3B82F6' }}
            >
              {(task.assignee_name || 'U').charAt(0)}
            </div>
            <span className="font-medium text-slate-700 truncate max-w-[120px]">
              {task.assignee_name || 'Unassigned'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-slate-600 font-mono text-[11px]">
            <Calendar className="w-3 h-3" />
            <span>{task.task_date}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-2.5">
          <ProgressBar progress={task.progress} showLabel={true} size="xs" />
        </div>

        {/* Schedule Grid: Deadline & Expected Completion */}
        <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-slate-50 text-xs border border-slate-100 mb-2">
          <div>
            <span className="text-slate-600 block text-[10px] font-medium uppercase tracking-wider">Deadline</span>
            <span className={`text-xs font-medium flex items-center gap-1 ${task.is_overdue ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>
              <Clock className="w-3 h-3 text-slate-400" />
              {formatTime(task.deadline)}
            </span>
          </div>
          <div>
            <span className="text-slate-600 block text-[10px] font-medium uppercase tracking-wider">Expected Completion</span>
            <span className={`text-xs font-medium flex items-center gap-1 ${task.is_eta_missed ? 'text-amber-600 font-bold' : 'text-slate-700'}`}>
              <Clock className="w-3 h-3 text-slate-400" />
              {formatTime(task.expected_completion)}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
        <span className="text-[11px] text-slate-600">
          {task.updates_count > 0 ? `${task.updates_count} updates` : 'No updates yet'}
        </span>

        <div className="flex items-center gap-1">
          {userRole === 'TEAM_MEMBER' && isAssignee && task.status !== 'COMPLETED' && (
            <>
              <button
                onClick={() => onQuickUpdate && onQuickUpdate(task)}
                className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
              >
                Update
              </button>
              <button
                onClick={() => onComplete && onComplete(task)}
                title="Mark Completed"
                className="p-1 text-xs font-semibold rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {userRole !== 'TEAM_MEMBER' && (
            <button
              onClick={() => onEdit && onEdit(task)}
              title="Edit Task"
              className="p-1 rounded text-slate-600 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
