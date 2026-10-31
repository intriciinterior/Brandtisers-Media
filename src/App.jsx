import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useToast } from './context/ToastContext';
import { api } from './api/client';

import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import MemberDashboard from './pages/MemberDashboard';
import MemberMonthlyPage from './pages/MemberMonthlyPage';
import TodaysTasksPage from './pages/TodaysTasksPage';
import AllTasksPage from './pages/AllTasksPage';
import ClientsPage from './pages/ClientsPage';
import TeamPage from './pages/TeamPage';
import WorkTypesPage from './pages/WorkTypesPage';
import WorkReportsPage from './pages/WorkReportsPage';
import ReportsPage from './pages/ReportsPage';
import NotificationsPage from './pages/NotificationsPage';
import ActivityLogPage from './pages/ActivityLogPage';
import SettingsPage from './pages/SettingsPage';

// Modals
import CreateTaskModal from './components/tasks/CreateTaskModal';
import EditTaskModal from './components/tasks/EditTaskModal';
import QuickUpdateModal from './components/tasks/QuickUpdateModal';
import CompleteTaskModal from './components/tasks/CompleteTaskModal';
import TaskDetailsModal from './components/tasks/TaskDetailsModal';
import ConfirmModal from './components/common/ConfirmModal';
import ForcePasswordChangeModal from './components/auth/ForcePasswordChangeModal';

export default function App() {
  const { user, company, loading, isSuperAdmin, isEmployee } = useAuth();
  const { success, error } = useToast();

  const [currentTab, setCurrentTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);

  // Modals state
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedTaskDetailsId, setSelectedTaskDetailsId] = useState(null);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [taskToQuickUpdate, setTaskToQuickUpdate] = useState(null);
  const [taskToComplete, setTaskToComplete] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [deleteTaskLoading, setDeleteTaskLoading] = useState(false);

  // Key to force refresh task lists when modifications happen
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  // Fetch team members list for modal dropdowns
  const fetchTeamMembers = async () => {
    if (!user || user.role !== 'SUPER_ADMIN') return;
    try {
      const res = await api.getUsers();
      setTeamMembers(res.users || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (user && user.role === 'SUPER_ADMIN') {
      fetchTeamMembers();
    }
  }, [user, refreshKey]);

  // Handle accepting a task (PENDING -> ACCEPTED / IN_PROGRESS)
  const handleAcceptTask = async (task) => {
    try {
      await api.updateTaskStatus(task.id, 'ACCEPTED');
      success(`Task ${task.task_id} accepted.`);
      triggerRefresh();
    } catch (err) {
      error(err.message || 'Failed to accept task');
    }
  };

  // Handle deleting a task (Super Admin only)
  const handleConfirmDeleteTask = async () => {
    if (!taskToDelete) return;
    setDeleteTaskLoading(true);
    try {
      await api.deleteTask(taskToDelete.id);
      success(`Task ${taskToDelete.task_id} deleted.`);
      setTaskToDelete(null);
      setSelectedTaskDetailsId(null);
      triggerRefresh();
    } catch (err) {
      error(err.message || 'Failed to delete task');
    } finally {
      setDeleteTaskLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold tracking-tight">Initializing IT Operations Workspace...</h2>
        <p className="text-xs text-slate-400 mt-1">Connecting to SQLite persistent database</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  // Active view routing
  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return isEmployee ? (
          <MemberDashboard
            key={refreshKey}
            currentUser={user}
            onOpenTaskDetails={(t) => setSelectedTaskDetailsId(t.id)}
            onQuickUpdate={(t) => setTaskToQuickUpdate(t)}
            onAcceptTask={handleAcceptTask}
            onCompleteTask={(t) => setTaskToComplete(t)}
            searchTerm={searchTerm}
          />
        ) : (
          <AdminDashboard
            key={refreshKey}
            onOpenCreateTask={() => setShowCreateTask(true)}
            onOpenTaskDetails={(t) => setSelectedTaskDetailsId(t.id)}
            onOpenEditTask={(t) => setTaskToEdit(t)}
            userRole={user.role}
            currentUserId={user.id}
            searchTerm={searchTerm}
          />
        );

      case 'todays_tasks':
        return (
          <TodaysTasksPage
            key={refreshKey}
            onOpenCreateTask={() => setShowCreateTask(true)}
            onOpenTaskDetails={(t) => setSelectedTaskDetailsId(t.id)}
            onOpenEditTask={(t) => setTaskToEdit(t)}
            onQuickUpdate={(t) => setTaskToQuickUpdate(t)}
            onAcceptTask={handleAcceptTask}
            onCompleteTask={(t) => setTaskToComplete(t)}
            userRole={user.role}
            currentUserId={user.id}
            searchTerm={searchTerm}
          />
        );

      case 'all_tasks':
        return (
          <AllTasksPage
            key={refreshKey}
            onOpenCreateTask={() => setShowCreateTask(true)}
            onOpenTaskDetails={(t) => setSelectedTaskDetailsId(t.id)}
            onOpenEditTask={(t) => setTaskToEdit(t)}
            onQuickUpdate={(t) => setTaskToQuickUpdate(t)}
            onAcceptTask={handleAcceptTask}
            onCompleteTask={(t) => setTaskToComplete(t)}
            userRole={user.role}
            currentUserId={user.id}
            searchTerm={searchTerm}
          />
        );

      case 'clients':
        return isSuperAdmin ? (
          <ClientsPage
            key={refreshKey}
            onTabChange={setCurrentTab}
          />
        ) : (
          <MemberDashboard currentUser={user} />
        );

      case 'team':
        return isSuperAdmin ? (
          <TeamPage
            key={refreshKey}
            onSelectTask={(t) => setSelectedTaskDetailsId(t.id)}
            onTabChange={setCurrentTab}
          />
        ) : (
          <MemberDashboard currentUser={user} />
        );

      case 'work_types':
        return isSuperAdmin ? (
          <WorkTypesPage key={refreshKey} />
        ) : (
          <MemberDashboard currentUser={user} />
        );

      case 'work_reports':
        return (
          <WorkReportsPage key={refreshKey} />
        );

      case 'my_monthly_work':
        return (
          <MemberMonthlyPage
            key={refreshKey}
            currentUser={user}
            onOpenTaskDetails={(t) => setSelectedTaskDetailsId(t.id)}
            onQuickUpdate={(t) => setTaskToQuickUpdate(t)}
          />
        );

      case 'reports':
        return isSuperAdmin ? (
          <ReportsPage
            key={refreshKey}
            onSelectTask={(t) => setSelectedTaskDetailsId(t.id)}
          />
        ) : (
          <MemberMonthlyPage
            key={refreshKey}
            currentUser={user}
            onOpenTaskDetails={(t) => setSelectedTaskDetailsId(t.id)}
            onQuickUpdate={(t) => setTaskToQuickUpdate(t)}
          />
        );

      case 'notifications':
        return (
          <NotificationsPage
            key={refreshKey}
            onSelectTask={(t) => setSelectedTaskDetailsId(t.id)}
            onTabChange={setCurrentTab}
          />
        );

      case 'activity':
        return isSuperAdmin ? <ActivityLogPage key={refreshKey} /> : <div />;

      case 'settings':
        return isSuperAdmin ? <SettingsPage key={refreshKey} /> : <div />;

      default:
        return <div>Tab not found</div>;
    }
  };

  return (
    <Layout
      currentTab={currentTab}
      onTabChange={setCurrentTab}
      onSearchChange={setSearchTerm}
      searchTerm={searchTerm}
      onSelectTask={(t) => setSelectedTaskDetailsId(t.id)}
    >
      {renderContent()}

      {/* Global Create Task Modal */}
      <CreateTaskModal
        isOpen={showCreateTask}
        onClose={() => setShowCreateTask(false)}
        onTaskCreated={() => {
          triggerRefresh();
        }}
        teamMembers={teamMembers}
      />

      {/* Global Edit Task Modal */}
      <EditTaskModal
        isOpen={Boolean(taskToEdit)}
        onClose={() => setTaskToEdit(null)}
        task={taskToEdit}
        onTaskUpdated={() => {
          triggerRefresh();
        }}
        teamMembers={teamMembers}
      />

      {/* Global Quick Update Modal */}
      <QuickUpdateModal
        isOpen={Boolean(taskToQuickUpdate)}
        onClose={() => setTaskToQuickUpdate(null)}
        task={taskToQuickUpdate}
        onUpdated={() => {
          triggerRefresh();
        }}
      />

      {/* Global Complete Task Modal */}
      <CompleteTaskModal
        isOpen={Boolean(taskToComplete)}
        onClose={() => setTaskToComplete(null)}
        task={taskToComplete}
        onCompleted={() => {
          triggerRefresh();
        }}
      />

      {/* Global Task Details Modal */}
      <TaskDetailsModal
        isOpen={Boolean(selectedTaskDetailsId)}
        onClose={() => setSelectedTaskDetailsId(null)}
        taskId={selectedTaskDetailsId}
        onEdit={(t) => setTaskToEdit(t)}
        onDelete={(t) => setTaskToDelete(t)}
        onQuickUpdate={(t) => setTaskToQuickUpdate(t)}
        onAccept={handleAcceptTask}
        onComplete={(t) => setTaskToComplete(t)}
        userRole={user.role}
        currentUserId={user.id}
      />

      {/* Confirm Delete Task Modal (Super Admin only) */}
      <ConfirmModal
        isOpen={Boolean(taskToDelete)}
        onClose={() => setTaskToDelete(null)}
        onConfirm={handleConfirmDeleteTask}
        title={`Delete Task ${taskToDelete?.task_id}?`}
        message={`Are you sure you want to permanently delete task "${taskToDelete?.title}"? All associated progress updates and logs will be removed.`}
        confirmText="Delete Task"
        type="danger"
        loading={deleteTaskLoading}
      />

      {/* Mandatory Password Change Modal on Login */}
      <ForcePasswordChangeModal isOpen={Boolean(user?.must_change_password)} />
    </Layout>
  );
}
