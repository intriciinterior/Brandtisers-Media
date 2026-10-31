import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2, Clock, PlayCircle, AlertCircle, AlertTriangle,
  Plus, LayoutGrid, Table as TableIcon, Calendar, Filter, RefreshCw,
  TrendingUp, ArrowRight, User, Users, Building2, Sparkles, Zap
} from 'lucide-react';
import ProgressBar from '../components/common/ProgressBar';
import TaskCard from '../components/tasks/TaskCard';
import TaskTable from '../components/tasks/TaskTable';
import EmptyState from '../components/common/EmptyState';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { getTaskScheduleStatus } from '../utils/scheduleStatus';

export default function AdminDashboard({
  onOpenCreateTask,
  onOpenTaskDetails,
  onOpenEditTask,
  userRole,
  currentUserId,
  searchTerm
}) {
  const { error } = useToast();
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [dailyData, setDailyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table'); // Default clean table layout
  const [clientFilter, setClientFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [workTypeFilter, setWorkTypeFilter] = useState('ALL');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('ALL');

  const todayStr = new Date().toISOString().split('T')[0];
  const formattedToday = useMemo(() => {
    return new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).toUpperCase();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsData, tasksData, dailyReport] = await Promise.all([
        api.getTaskStats(todayStr),
        api.getTasks({
          date: todayStr,
          client: clientFilter,
          status: statusFilter,
          priority: priorityFilter,
          work_type: workTypeFilter,
          assignedTo: selectedEmployeeId !== 'ALL' ? selectedEmployeeId : undefined,
          search: searchTerm
        }),
        api.getDailyReport(todayStr, clientFilter)
      ]);
      setStats(statsData);
      setTasks(tasksData.tasks || []);
      setDailyData(dailyReport);
    } catch (err) {
      error(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [clientFilter, statusFilter, priorityFilter, workTypeFilter, selectedEmployeeId, searchTerm]);

  // Ahead of schedule count
  const aheadOfScheduleCount = useMemo(() => {
    return tasks.filter(t => getTaskScheduleStatus(t)?.isAhead).length;
  }, [tasks]);

  // Dynamic client list from tasks
  const clientOptions = useMemo(() => {
    const defaultClients = ['ABC Technologies', 'XYZ Pvt Ltd', 'FinCorp Global', 'Apex HealthTech', 'CloudNexus Systems', 'Global Logistics Ltd'];
    const currentClients = tasks.map(t => t.client_name).filter(Boolean);
    return Array.from(new Set([...defaultClients, ...currentClients])).sort();
  }, [tasks]);

  // Selected employee name helper
  const selectedEmployeeName = useMemo(() => {
    if (selectedEmployeeId === 'ALL') return null;
    const member = dailyData?.memberBreakdown?.find(m => String(m.id) === String(selectedEmployeeId));
    return member ? member.name : null;
  }, [dailyData, selectedEmployeeId]);

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Top Header: TODAY — 7 OCTOBER 2026 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              TODAY — {formattedToday}
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Live Operations
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time daily work execution, employee workload, and department progress.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadDashboardData}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Refresh dashboard"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
          <button
            onClick={onOpenCreateTask}
            className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Quick Daily Task</span>
          </button>
        </div>
      </div>

      {/* Team Overview Cards: Total Employees, Tasks, Completed, In Progress, Pending, Overdue, Ahead of Schedule */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Team Overview
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            Overall Completion: <strong className="text-slate-800">{stats?.completionRate ?? 0}%</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {/* 1. Total Employees */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total Employees
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {dailyData?.memberBreakdown?.length ?? 0}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Active team</span>
          </div>

          {/* 2. Total Tasks Today */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total Tasks
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {stats?.totalTasks ?? 0}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Scheduled today</span>
          </div>

          {/* 3. Completed */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 hover:border-emerald-300 transition-colors">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
              Completed
            </span>
            <div className="text-2xl font-bold text-emerald-600 mt-1">
              {stats?.completed ?? 0}
            </div>
            <span className="text-[11px] text-emerald-700 mt-0.5 block">Deliverables closed</span>
          </div>

          {/* 4. In Progress */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors">
            <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider block">
              In Progress
            </span>
            <div className="text-2xl font-bold text-blue-600 mt-1">
              {stats?.inProgress ?? 0}
            </div>
            <span className="text-[11px] text-blue-700 mt-0.5 block">Active execution</span>
          </div>

          {/* 5. Pending */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
            <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider block">
              Pending
            </span>
            <div className="text-2xl font-bold text-slate-700 mt-1">
              {stats?.pending ?? 0}
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Awaiting start</span>
          </div>

          {/* 6. Overdue */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 hover:border-rose-300 transition-colors">
            <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block">
              Overdue
            </span>
            <div className="text-2xl font-bold text-rose-600 mt-1">
              {stats?.overdue ?? 0}
            </div>
            <span className="text-[11px] text-rose-700 mt-0.5 block">Passed deadline</span>
          </div>

          {/* 7. Ahead of Schedule */}
          <div className="bg-white p-3 rounded-xl border border-purple-200 hover:border-purple-300 transition-colors">
            <span className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider block">
              Ahead Schedule
            </span>
            <div className="text-2xl font-bold text-purple-600 mt-1">
              {aheadOfScheduleCount}
            </div>
            <span className="text-[11px] text-purple-700 mt-0.5 block">Pacing faster</span>
          </div>
        </div>
      </div>

      {/* EMPLOYEE WORK Section (Requirement 14) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              EMPLOYEE WORK
            </h2>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              — Click any employee card to filter their assigned tasks
            </span>
          </div>
          {selectedEmployeeId !== 'ALL' && (
            <button
              onClick={() => setSelectedEmployeeId('ALL')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer underline"
            >
              Show All Employees
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {dailyData?.memberBreakdown?.map((member) => {
            const isSelected = selectedEmployeeId === String(member.id);
            return (
              <div
                key={member.id}
                onClick={() => setSelectedEmployeeId(isSelected ? 'ALL' : String(member.id))}
                className={`p-3 rounded-xl border transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ backgroundColor: member.avatar_color || '#3B82F6' }}
                    >
                      {member.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 block truncate">
                        {member.name}
                      </span>
                      <span className="text-[10px] text-slate-500 block truncate">
                        {member.designation || 'IT Team Member'}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-900 shrink-0 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {member.assigned} Tasks
                  </span>
                </div>

                {/* Subtitle breakdown line e.g. "5 Completed • 2 In Progress • 1 Pending" */}
                <div className="mt-2.5 pt-2 border-t border-slate-200 text-[11px] text-slate-600 font-medium flex items-center justify-between">
                  <span className="text-emerald-700 font-semibold">{member.completed} Completed</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-blue-700 font-semibold">{member.in_progress} In Progress</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-700 font-semibold">{member.pending} Pending</span>
                </div>

                <div className="mt-2">
                  <ProgressBar progress={member.completion_rate} size="xs" showLabel={false} />
                  <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                    <span>Closure Rate</span>
                    <span className="font-bold text-slate-700">{member.completion_rate}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Needs Attention Alert Strip (Prioritized per Requirement #8) */}
      {stats?.needsAttention && stats.needsAttention.length > 0 && (
        <div className="bg-white p-4 rounded-xl border border-rose-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-rose-700">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider">
                Needs Attention ({stats.needsAttention.length} tasks)
              </h3>
            </div>
            <span className="text-[11px] text-rose-700 font-medium">Requires immediate oversight</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {stats.needsAttention.slice(0, 3).map((t) => (
              <div
                key={t.id}
                onClick={() => onOpenTaskDetails && onOpenTaskDetails(t)}
                className="p-2.5 rounded-lg border border-rose-200 bg-rose-50/20 hover:bg-rose-50/40 transition-colors cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <span className="text-xs font-bold text-slate-900 block leading-tight">
                    {t.client_name || 'ABC Technologies'}
                  </span>
                  <span className="text-xs text-slate-700 font-medium line-clamp-1 mt-0.5">
                    {t.title}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-rose-600 font-medium mt-1.5 pt-1 border-t border-rose-100">
                  <span>{t.assignee_name}</span>
                  <span className="font-semibold">{t.is_overdue ? 'Overdue Deadline' : 'ETA Missed'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Section: Today's Tasks */}
      <div className="space-y-3">
        {/* Controls Bar: Search, Employee Filter, Client Filter, Work Type, Status Filter, Priority Filter, View Mode */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white p-3 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">
              {selectedEmployeeName ? `${selectedEmployeeName}'s Tasks` : "Today's Tasks"}
            </h2>
            <span className="text-xs text-slate-600 font-medium">({tasks.length} tasks)</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Employee Filter */}
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Employees</option>
              {dailyData?.memberBreakdown?.map((m) => (
                <option key={m.id} value={String(m.id)}>
                  {m.name}
                </option>
              ))}
            </select>

            {/* Client Filter (Requirement #3) */}
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Clients</option>
              {clientOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* Work Type Filter (Normal vs Advance Work) */}
            <select
              value={workTypeFilter}
              onChange={(e) => setWorkTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Work Types</option>
              <option value="NORMAL">Normal Work</option>
              <option value="ADVANCE">Advance Work</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="AHEAD_OF_SCHEDULE">Ahead of Schedule</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="PENDING">Pending</option>
              <option value="COMPLETED">Completed</option>
              <option value="OVERDUE">Overdue</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            {/* View Switcher: Table (default) vs Grid Cards */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1 rounded text-xs transition-colors ${
                  viewMode === 'table' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Table Layout (Recommended)"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1 rounded text-xs transition-colors ${
                  viewMode === 'grid' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Cards Layout"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Task Table / Cards Display */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl border border-slate-200">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-xs text-slate-500">Loading tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState
            title="No tasks found"
            description="No tasks match the active filters or search terms."
            actionLabel="+ Create Task"
            onAction={onOpenCreateTask}
          />
        ) : viewMode === 'table' ? (
          <TaskTable
            tasks={tasks}
            onOpenDetails={onOpenTaskDetails}
            onEdit={onOpenEditTask}
            userRole={userRole}
            currentUserId={currentUserId}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onOpenDetails={onOpenTaskDetails}
                onEdit={onOpenEditTask}
                userRole={userRole}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
