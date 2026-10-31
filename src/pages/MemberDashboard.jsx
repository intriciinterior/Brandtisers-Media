import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2, Clock, PlayCircle, AlertCircle, RefreshCw,
  Table as TableIcon, LayoutGrid, Coffee, Filter
} from 'lucide-react';
import TaskCard from '../components/tasks/TaskCard';
import TaskTable from '../components/tasks/TaskTable';
import ProgressBar from '../components/common/ProgressBar';
import EmptyState from '../components/common/EmptyState';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { getTaskScheduleStatus } from '../utils/scheduleStatus';

export default function MemberDashboard({
  currentUser,
  onOpenTaskDetails,
  onQuickUpdate,
  onAcceptTask,
  onCompleteTask,
  searchTerm
}) {
  const { error } = useToast();
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table'); // Clean table layout by default
  const [clientFilter, setClientFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const todayStr = new Date().toISOString().split('T')[0];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, tasksData] = await Promise.all([
        api.getTaskStats(todayStr),
        api.getTasks({
          date: todayStr,
          client: clientFilter,
          status: statusFilter,
          search: searchTerm
        })
      ]);
      setStats(statsData);
      setTasks(tasksData.tasks || []);
    } catch (err) {
      error(err.message || 'Failed to load member tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clientFilter, statusFilter, searchTerm]);

  const clientOptions = useMemo(() => {
    const defaultClients = ['ABC Technologies', 'XYZ Pvt Ltd', 'FinCorp Global', 'Apex HealthTech', 'CloudNexus Systems', 'Global Logistics Ltd'];
    const currentClients = tasks.map(t => t.client_name).filter(Boolean);
    return Array.from(new Set([...defaultClients, ...currentClients])).sort();
  }, [tasks]);

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Clean, Light Top Banner (Requirement 2: EMPLOYEE MORNING LOGIN) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-blue-600 block mb-0.5">
            {getGreeting().toUpperCase()}, {currentUser?.full_name?.toUpperCase() || 'RAHUL'}
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Today's Work
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Tasks assigned to you for {todayStr}. Track deadlines, update progress, and log completion ETAs.
          </p>
        </div>

        <button
          onClick={loadData}
          className="self-start sm:self-center p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Clean, Compact Summary Metric Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Total Assigned */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Total Assigned
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {stats?.totalTasks ?? 0}
          </div>
          <span className="text-[11px] text-slate-600 mt-0.5 block">Your daily tasks</span>
        </div>

        {/* Completed */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
            Completed
          </span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            {stats?.completed ?? 0}
          </div>
          <span className="text-[11px] text-emerald-700 mt-0.5 block">{stats?.completionRate ?? 0}% closed</span>
        </div>

        {/* In Progress */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider block">
            In Progress
          </span>
          <div className="text-2xl font-bold text-blue-600 mt-1">
            {stats?.inProgress ?? 0}
          </div>
          <span className="text-[11px] text-blue-700 mt-0.5 block">Active work</span>
        </div>

        {/* Pending */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider block">
            Pending
          </span>
          <div className="text-2xl font-bold text-slate-700 mt-1">
            {stats?.pending ?? 0}
          </div>
          <span className="text-[11px] text-slate-600 mt-0.5 block">Pending work</span>
        </div>

        {/* Overdue */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
          <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block">
            Overdue
          </span>
          <div className="text-2xl font-bold text-rose-600 mt-1">
            {stats?.overdue ?? 0}
          </div>
          <span className="text-[11px] text-rose-700 mt-0.5 block">Past deadline</span>
        </div>
      </div>

      {/* Main Task List / Table Section (Client-First View: Requirement #10) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white p-3 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">Today's Tasks</h2>
            <span className="text-xs text-slate-600 font-medium">({tasks.length} assigned)</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Client Filter */}
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

            {/* Quick Status Filter */}
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

            {/* View Switcher: Table vs Cards */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1 rounded text-xs transition-colors ${
                  viewMode === 'table' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Table Layout"
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

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl border border-slate-200">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-xs text-slate-500">Loading your tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState
            title="No tasks assigned for today"
            description="You are caught up! When an Admin assigns new work, it will appear here immediately."
          />
        ) : viewMode === 'table' ? (
          <TaskTable
            tasks={tasks}
            onOpenDetails={onOpenTaskDetails}
            onQuickUpdate={onQuickUpdate}
            onAccept={onAcceptTask}
            onComplete={onCompleteTask}
            userRole="TEAM_MEMBER"
            currentUserId={currentUser?.id}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onOpenDetails={onOpenTaskDetails}
                onQuickUpdate={onQuickUpdate}
                onAccept={onAcceptTask}
                onComplete={onCompleteTask}
                userRole="TEAM_MEMBER"
                currentUserId={currentUser?.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
