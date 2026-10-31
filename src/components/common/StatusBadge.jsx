import React from 'react';
import { Clock, CheckCircle2, PlayCircle, AlertCircle, AlertTriangle, TrendingUp } from 'lucide-react';

export default function StatusBadge({ status, isOverdue, isEtaMissed, scheduleStatus, size = 'sm' }) {
  const sizeClasses = size === 'xs'
    ? 'text-[11px] px-2 py-0.5'
    : size === 'md'
    ? 'text-xs px-2.5 py-1'
    : 'text-xs px-2 py-0.5';

  if (isOverdue && status !== 'COMPLETED') {
    return (
      <span className={`inline-flex items-center gap-1 font-semibold rounded-md bg-rose-50 text-rose-700 border border-rose-200 ${sizeClasses}`}>
        <AlertCircle className="w-3 h-3 text-rose-600" />
        <span>Overdue</span>
      </span>
    );
  }

  // Ahead of Schedule smart status
  if (scheduleStatus === 'AHEAD_OF_SCHEDULE' || status === 'AHEAD_OF_SCHEDULE') {
    return (
      <span className={`inline-flex items-center gap-1 font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 ${sizeClasses}`}>
        <TrendingUp className="w-3 h-3 text-emerald-600" />
        <span>Ahead of Schedule</span>
      </span>
    );
  }

  // Behind Schedule / At Risk smart status
  if (scheduleStatus === 'BEHIND_SCHEDULE' || status === 'BEHIND_SCHEDULE' || status === 'AT_RISK') {
    return (
      <span className={`inline-flex items-center gap-1 font-semibold rounded-md bg-amber-50 text-amber-700 border border-amber-200 ${sizeClasses}`}>
        <AlertTriangle className="w-3 h-3 text-amber-600" />
        <span>Behind Schedule</span>
      </span>
    );
  }

  if (isEtaMissed && status !== 'COMPLETED') {
    return (
      <span className={`inline-flex items-center gap-1 font-semibold rounded-md bg-amber-50 text-amber-700 border border-amber-200 ${sizeClasses}`}>
        <AlertTriangle className="w-3 h-3 text-amber-600" />
        <span>ETA Missed</span>
      </span>
    );
  }

  switch (status) {
    case 'COMPLETED':
      return (
        <span className={`inline-flex items-center gap-1 font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 ${sizeClasses}`}>
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>Completed</span>
        </span>
      );

    case 'IN_PROGRESS':
      return (
        <span className={`inline-flex items-center gap-1 font-medium rounded-md bg-blue-50 text-blue-700 border border-blue-200 ${sizeClasses}`}>
          <PlayCircle className="w-3 h-3 text-blue-600" />
          <span>In Progress</span>
        </span>
      );

    case 'ACCEPTED':
      return (
        <span className={`inline-flex items-center gap-1 font-medium rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 ${sizeClasses}`}>
          <CheckCircle2 className="w-3 h-3 text-indigo-600" />
          <span>Accepted</span>
        </span>
      );

    case 'PENDING':
    default:
      return (
        <span className={`inline-flex items-center gap-1 font-medium rounded-md bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses}`}>
          <Clock className="w-3 h-3 text-slate-500" />
          <span>Pending</span>
        </span>
      );
  }
}
