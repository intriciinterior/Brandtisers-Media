import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar, Search, Filter, Download, Plus, LayoutGrid, Table as TableIcon,
  RefreshCw, CheckCircle2, ArrowUpDown
} from 'lucide-react';
import TaskCard from '../components/tasks/TaskCard';
import TaskTable from '../components/tasks/TaskTable';
import EmptyState from '../components/common/EmptyState';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';

export default function AllTasksPage({
  onOpenCreateTask,
  onOpenTaskDetails,
  onOpenEditTask,
  onQuickUpdate,
  onAcceptTask,
  onCompleteTask,
  userRole,
  currentUserId,
  searchTerm
}) {
  const { error, success } = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table');
  const [clientFilter, setClientFilter] = useState('ALL');
  const [datePreset, setDatePreset] = useState('all');
  const [customDate, setCustomDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [assignedToFilter, setAssignedToFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');
  const [teamMembers, setTeamMembers] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {
        datePreset: customDate ? undefined : datePreset,
        date: customDate || undefined,
        client: clientFilter,
        status: statusFilter,
        priority: priorityFilter,
        assignedTo: assignedToFilter,
        search: searchTerm,
        sort: sortBy
      };

      const [tasksRes, usersRes] = await Promise.all([
        api.getTasks(params),
        userRole !== 'TEAM_MEMBER' ? api.getUsers() : Promise.resolve({ users: [] })
      ]);

      setTasks(tasksRes.tasks || []);
      if (usersRes.users) setTeamMembers(usersRes.users);
    } catch (err) {
      error(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clientFilter, datePreset, customDate, statusFilter, priorityFilter, assignedToFilter, sortBy, searchTerm]);

  const clientOptions = useMemo(() => {
    const defaultClients = ['ABC Technologies', 'XYZ Pvt Ltd', 'FinCorp Global', 'Apex HealthTech', 'CloudNexus Systems', 'Global Logistics Ltd'];
    const currentClients = tasks.map(t => t.client_name).filter(Boolean);
    return Array.from(new Set([...defaultClients, ...currentClients])).sort();
  }, [tasks]);

  const handleExportCsv = () => {
    const exportDate = customDate || (datePreset === 'today' ? new Date().toISOString().split('T')[0] : '');
    const url = api.getExportCsvUrl(exportDate, clientFilter);
    window.open(url, '_blank');
    success('Exporting task database to CSV...');
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            All Tasks & Historical Archive
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Filter by client accounts, dates, technician assignments, and completion states.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Download CSV report"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={loadData}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {userRole !== 'TEAM_MEMBER' && (
            <button
              onClick={onOpenCreateTask}
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-2.5 bg-white p-3.5 rounded-xl border border-slate-200">
        {/* Date presets row */}
        <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-100">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Time:</span>
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'this_week', label: 'This Week' },
              { id: 'this_month', label: 'This Month' }
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setDatePreset(p.id);
                  setCustomDate('');
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  datePreset === p.id && !customDate
                    ? 'bg-blue-600 text-white shadow-2xs font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={customDate}
              onChange={(e) => {
                setCustomDate(e.target.value);
                setDatePreset('custom');
              }}
              className="px-2 py-1 rounded-md border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Filter controls row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
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

            {/* Assignee Filter */}
            {userRole !== 'TEAM_MEMBER' && (
              <select
                value={assignedToFilter}
                onChange={(e) => setAssignedToFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">All Team Members</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.employee_id})
                  </option>
                ))}
              </select>
            )}

            {/* Sort Order */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="newest">Newest First</option>
              <option value="deadline_asc">Deadline (Earliest First)</option>
              <option value="priority_desc">Priority (Highest First)</option>
            </select>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <span className="text-xs text-slate-600 font-medium">({tasks.length} tasks)</span>
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
      </div>

      {/* Task Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl border border-slate-200">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-xs text-slate-500">Querying database...</p>
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          title="No tasks found"
          description="Try broadening your client, date range, or assignee filters."
          actionLabel="+ Create Task"
          onAction={onOpenCreateTask}
        />
      ) : viewMode === 'table' ? (
        <TaskTable
          tasks={tasks}
          onOpenDetails={onOpenTaskDetails}
          onQuickUpdate={onQuickUpdate}
          onAccept={onAcceptTask}
          onComplete={onCompleteTask}
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
              onQuickUpdate={onQuickUpdate}
              onAccept={onAcceptTask}
              onComplete={onCompleteTask}
              onEdit={onOpenEditTask}
              userRole={userRole}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
