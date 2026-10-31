import React from 'react';
import { Clock, Eye, Edit2, CheckCircle2, PlayCircle, Zap } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import PriorityBadge from '../common/PriorityBadge';
import ProgressBar from '../common/ProgressBar';
import { getTaskScheduleStatus } from '../../utils/scheduleStatus';

export default function TaskTable({
  tasks,
  onOpenDetails,
  onQuickUpdate,
  onAccept,
  onComplete,
  onEdit,
  userRole,
  currentUserId
}) {
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

  if (!tasks || tasks.length === 0) {
    return null;
  }

  return (
    <div>
      {/* Desktop View: Clean, Minimal Table Layout */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200/90 bg-white">
        <table className="w-full text-left text-xs border-collapse min-w-[960px]">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4 w-44">Client</th>
              <th className="py-3 px-4">Task</th>
              <th className="py-3 px-4 w-36">Assigned To</th>
              <th className="py-3 px-3 w-24">Priority</th>
              <th className="py-3 px-3 w-28">Progress</th>
              <th className="py-3 px-3 w-36">Status</th>
              <th className="py-3 px-3 w-28">Deadline</th>
              <th className="py-3 px-3 w-28">ETA</th>
              <th className="py-3 px-4 text-right w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tasks.map((task) => {
              const isAssignee = task.assigned_to === currentUserId;
              const isPending = task.status === 'PENDING';
              const isInProgress = task.status === 'IN_PROGRESS' || task.status === 'ACCEPTED';
              const schedStatus = getTaskScheduleStatus(task);

              return (
                <tr
                  key={task.id}
                  onClick={() => onOpenDetails && onOpenDetails(task)}
                  className={`hover:bg-slate-50/70 transition-colors cursor-pointer group ${
                    task.is_overdue
                      ? 'bg-rose-50/25'
                      : schedStatus === 'AHEAD_OF_SCHEDULE'
                      ? 'bg-emerald-50/15'
                      : ''
                  }`}
                >
                  {/* 1. Client Name (Prominent & Easy to Scan) */}
                  <td className="py-3 px-4 align-middle">
                    <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors block truncate max-w-[160px]" title={task.client_name}>
                      {task.client_name || 'ABC Technologies'}
                    </span>
                  </td>

                  {/* 2. Task (Title + subtle task_id + Advance Work badge) */}
                  <td className="py-3 px-4 align-middle">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-slate-800 font-medium line-clamp-1 max-w-sm" title={task.title}>
                          {task.title}
                        </span>
                        {task.work_type === 'ADVANCE' && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            <Zap className="w-2.5 h-2.5" />
                            ADVANCE WORK
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[10px] text-slate-600">
                        {task.task_id}
                      </span>
                    </div>
                  </td>

                  {/* 3. Assigned To */}
                  <td className="py-3 px-4 align-middle">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                        style={{ backgroundColor: task.assignee_avatar_color || '#3B82F6' }}
                      >
                        {(task.assignee_name || 'U').charAt(0)}
                      </div>
                      <span className="text-slate-700 font-medium text-xs truncate max-w-[110px]">
                        {task.assignee_name || 'Unassigned'}
                      </span>
                    </div>
                  </td>

                  {/* 4. Priority */}
                  <td className="py-3 px-3 align-middle">
                    <PriorityBadge priority={task.priority} size="xs" />
                  </td>

                  {/* 5. Progress */}
                  <td className="py-3 px-3 align-middle">
                    <ProgressBar progress={task.progress} showLabel={true} size="xs" />
                  </td>

                  {/* 6. Status (includes Ahead of Schedule / Behind Schedule) */}
                  <td className="py-3 px-3 align-middle">
                    <StatusBadge
                      status={task.status}
                      isOverdue={task.is_overdue}
                      isEtaMissed={task.is_eta_missed}
                      scheduleStatus={schedStatus}
                      size="xs"
                    />
                  </td>

                  {/* 7. Deadline */}
                  <td className="py-3 px-3 whitespace-nowrap align-middle">
                    <span className={`text-xs flex items-center gap-1 ${task.is_overdue ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>
                      <Clock className="w-3 h-3 text-slate-400" />
                      {formatTime(task.deadline)}
                    </span>
                  </td>

                  {/* 8. ETA */}
                  <td className="py-3 px-3 whitespace-nowrap align-middle">
                    <span className={`text-xs flex items-center gap-1 ${task.is_eta_missed ? 'text-amber-600 font-semibold' : 'text-slate-600'}`}>
                      <Clock className="w-3 h-3 text-slate-400" />
                      {formatTime(task.expected_completion)}
                    </span>
                  </td>

                  {/* 9. Actions */}
                  <td className="py-3 px-4 text-right whitespace-nowrap align-middle" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onOpenDetails && onOpenDetails(task)}
                        title="View Details"
                        className="p-1 rounded text-slate-600 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {userRole === 'TEAM_MEMBER' && isAssignee && task.status !== 'COMPLETED' && (
                        <>
                          <button
                            onClick={() => onQuickUpdate && onQuickUpdate(task)}
                            className="px-1.5 py-0.5 text-[11px] font-semibold rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                          >
                            Update
                          </button>
                          <button
                            onClick={() => onComplete && onComplete(task)}
                            title="Mark Completed"
                            className="p-1 text-[11px] font-semibold rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
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
                          <Edit2 className="w-3.5 h-3.5" />
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

      {/* Mobile View: Clean, Compact Responsive Cards */}
      <div className="md:hidden space-y-2.5">
        {tasks.map((task) => {
          const isAssignee = task.assigned_to === currentUserId;
          const isPending = task.status === 'PENDING';
          const isInProgress = task.status === 'IN_PROGRESS' || task.status === 'ACCEPTED';
          const schedStatus = getTaskScheduleStatus(task);

          return (
            <div
              key={task.id}
              onClick={() => onOpenDetails && onOpenDetails(task)}
              className={`p-3.5 rounded-xl border bg-white transition-all cursor-pointer ${
                task.is_overdue
                  ? 'border-rose-300 bg-rose-50/20'
                  : 'border-slate-200 hover:border-blue-300'
              }`}
            >
              {/* Client Name prominent first */}
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-slate-900 block leading-tight">
                      {task.client_name || 'ABC Technologies'}
                    </span>
                    {task.work_type === 'ADVANCE' && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        <Zap className="w-2.5 h-2.5" />
                        ADVANCE WORK
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium text-slate-600 line-clamp-1 mt-0.5">
                    {task.title}
                  </span>
                </div>
                <StatusBadge
                  status={task.status}
                  isOverdue={task.is_overdue}
                  isEtaMissed={task.is_eta_missed}
                  scheduleStatus={schedStatus}
                  size="xs"
                />
              </div>

              {/* Progress & Meta */}
              <div className="mt-2.5 space-y-2">
                <ProgressBar progress={task.progress} showLabel={true} size="xs" />

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                  <span className="truncate max-w-[130px]">
                    Assigned: <strong className="text-slate-700 font-medium">{task.assignee_name || 'Unassigned'}</strong>
                  </span>
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-slate-400" />
                    Due: {formatTime(task.deadline)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
