import React, { useState, useEffect } from 'react';
import {
  Calendar, CheckCircle2, Clock, PlayCircle, Award,
  Filter, RefreshCw, Zap
} from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';
import PriorityBadge from '../components/common/PriorityBadge';
import EmptyState from '../components/common/EmptyState';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';

export default function MemberMonthlyPage({ currentUser, onOpenTaskDetails, onQuickUpdate }) {
  const { error } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().substring(0, 7)); // 'YYYY-MM'
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState(null);

  // Available month choices for selector (last 6 months)
  const monthOptions = (() => {
    const opts = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = d.toISOString().substring(0, 7);
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      opts.push({ value: val, label });
    }
    return opts;
  })();

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getMyMonthlyTasks(selectedMonth, statusFilter);
      setMonthlyData(res);
    } catch (err) {
      error(err.message || 'Failed to load monthly work history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth, statusFilter]);

  const summary = monthlyData?.summary || {
    month: 'This Month',
    totalTasks: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
    advanceWorkCompleted: 0,
    completionRate: 0
  };

  const tasks = monthlyData?.tasks || [];

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '-';
    try {
      const d = new Date(timeStr);
      if (isNaN(d.getTime())) return timeStr;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return timeStr;
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              Employee Record
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-medium text-slate-700">{currentUser?.full_name}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
            My Monthly Work
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review your personal completed tasks, progress milestones, and advance work history.
          </p>
        </div>

        {/* Controls: Month Selector & Refresh */}
        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <button
            onClick={loadData}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Refresh monthly data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Requirement 10: Simple Employee Monthly Summary */}
      <div className="bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
            {summary.month?.toUpperCase()} SUMMARY
          </span>
          <span className="text-xs font-semibold text-blue-600">
            {summary.completionRate}% Completion Rate
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {/* Total Work */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total Work
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {summary.totalTasks}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Assigned this month</span>
          </div>

          {/* Completed */}
          <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-200">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
              Completed
            </span>
            <div className="text-2xl font-bold text-emerald-600 mt-1">
              {summary.completed}
            </div>
            <span className="text-[11px] text-emerald-700 mt-0.5 block">Closed successfully</span>
          </div>

          {/* In Progress */}
          <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-200">
            <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider block">
              In Progress
            </span>
            <div className="text-2xl font-bold text-blue-600 mt-1">
              {summary.inProgress}
            </div>
            <span className="text-[11px] text-blue-700 mt-0.5 block">Under execution</span>
          </div>

          {/* Pending */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
              Pending
            </span>
            <div className="text-2xl font-bold text-slate-700 mt-1">
              {summary.pending}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Awaiting start</span>
          </div>

          {/* Advance Work Completed (Requirement 9 & 10) */}
          <div className="p-3 rounded-lg bg-purple-50/50 border border-purple-200">
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-purple-600" />
              <span className="text-[11px] font-semibold text-purple-800 uppercase tracking-wider block">
                Advance Work
              </span>
            </div>
            <div className="text-2xl font-bold text-purple-700 mt-1">
              {summary.advanceWorkCompleted}
            </div>
            <span className="text-[11px] text-purple-700 mt-0.5 block">Ahead of schedule</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 text-xs">
        <span className="font-bold text-slate-800">
          Work History ({tasks.length} tasks)
        </span>

        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2 py-1 rounded-md border border-slate-200 text-xs text-slate-700 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed Only</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="PENDING">Pending</option>
          </select>
        </div>
      </div>

      {/* Requirement 4: List Table: Date | Client | Task | Status | Progress | Completed At */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl border border-slate-200">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-xs text-slate-500">Loading work history...</p>
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          title="No tasks recorded for this month"
          description={`No work items found for ${summary.month} matching your filter.`}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3 whitespace-nowrap">Date</th>
                  <th className="py-2.5 px-3">Client</th>
                  <th className="py-2.5 px-3">Task</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Work Type</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Status</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Progress</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Completed At</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                    onClick={() => onOpenTaskDetails && onOpenTaskDetails(t)}
                  >
                    {/* Date */}
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-600 whitespace-nowrap">
                      {formatDate(t.task_date)}
                    </td>

                    {/* Client Name (Prominent) */}
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-slate-900 block leading-tight">
                        {t.client_name || 'ABC Technologies'}
                      </span>
                    </td>

                    {/* Task Title */}
                    <td className="py-2.5 px-3">
                      <span className="text-slate-800 font-medium block">
                        {t.title}
                      </span>
                      <span className="text-[10px] text-slate-600 font-mono">
                        {t.task_id}
                      </span>
                    </td>

                    {/* Work Type (Normal vs Advance Work) */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {t.work_type === 'ADVANCE' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          <Zap className="w-2.5 h-2.5" />
                          ADVANCE WORK
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-medium">
                          Normal
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <StatusBadge status={t.status} />
                    </td>

                    {/* Progress % */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              t.status === 'COMPLETED'
                                ? 'bg-emerald-500'
                                : t.progress > 0
                                ? 'bg-blue-600'
                                : 'bg-slate-300'
                            }`}
                            style={{ width: `${t.progress}%` }}
                          />
                        </div>
                        <span className="font-mono font-semibold text-slate-700">
                          {t.progress}%
                        </span>
                      </div>
                    </td>

                    {/* Completed At */}
                    <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                      {t.status === 'COMPLETED' ? (
                        <span className="text-emerald-700 font-semibold">
                          {formatTime(t.completed_at)}
                        </span>
                      ) : (
                        <span className="text-slate-600">
                          Due {formatTime(t.deadline)}
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td
                      className="py-2.5 px-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {t.status !== 'COMPLETED' ? (
                        <button
                          onClick={() => onQuickUpdate && onQuickUpdate(t)}
                          className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          Update
                        </button>
                      ) : (
                        <button
                          onClick={() => onOpenTaskDetails && onOpenTaskDetails(t)}
                          className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 text-slate-600 text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
