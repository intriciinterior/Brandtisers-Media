import React, { useState, useEffect, useMemo } from 'react';
import { Plus, LayoutGrid, Table as TableIcon, RefreshCw, Filter, CheckCircle2 } from 'lucide-react';
import TaskCard from '../components/tasks/TaskCard';
import TaskTable from '../components/tasks/TaskTable';
import EmptyState from '../components/common/EmptyState';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';

export default function TodaysTasksPage({
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
  const { error } = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table'); // Clean table default
  const [clientFilter, setClientFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [assignedToFilter, setAssignedToFilter] = useState('ALL');
  const [teamMembers, setTeamMembers] = useState([]);

  const todayStr = new Date().toISOString().split('T')[0];

  const loadData = async () => {
    setLoading(true);
    try {
      const tasksRes = await api.getTasks({
        date: todayStr,
        client: clientFilter,
        status: statusFilter,
        priority: priorityFilter,
        assignedTo: assignedToFilter,
        search: searchTerm
      });
      setTasks(tasksRes.tasks || []);

      if (userRole !== 'TEAM_MEMBER') {
        const usersRes = await api.getUsers();
        setTeamMembers(usersRes.users || []);
      }
    } catch (err) {
      error(err.message || "Failed to load today's tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clientFilter, statusFilter, priorityFilter, assignedToFilter, searchTerm]);

  const clientOptions = useMemo(() => {
    const defaultClients = ['ABC Technologies', 'XYZ Pvt Ltd', 'FinCorp Global', 'Apex HealthTech', 'CloudNexus Systems', 'Global Logistics Ltd'];
    const currentClients = tasks.map(t => t.client_name).filter(Boolean);
    return Array.from(new Set([...defaultClients, ...currentClients])).sort();
  }, [tasks]);

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Today's Technical Queue
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Client-wise execution backlog and commitments for {todayStr}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Refresh"
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-white p-3 rounded-xl border border-slate-200">
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

          {/* Assignee Filter (Admins only) */}
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

      {/* Task Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl border border-slate-200">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-xs text-slate-500">Loading today's queue...</p>
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          title="No tasks match your filters"
          description="Try broadening your client, status, or technician filters."
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
