import React, { useState, useEffect } from 'react';
import {
  CheckCircle2, Clock, AlertCircle, PlayCircle, Mail, Phone,
  Calendar, Briefcase, Award, TrendingUp, MessageSquare, ExternalLink
} from 'lucide-react';
import Modal from '../common/Modal';
import ProgressBar from '../common/ProgressBar';
import StatusBadge from '../common/StatusBadge';
import PriorityBadge from '../common/PriorityBadge';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';

export default function MemberProfileModal({ isOpen, onClose, memberId, onSelectTask }) {
  const { error } = useToast();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      if (!memberId || !isOpen) return;
      setLoading(true);
      try {
        const data = await api.getUserById(memberId);
        setProfileData(data);
      } catch (err) {
        error(err.message || 'Failed to load member profile');
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [memberId, isOpen]);

  if (!isOpen) return null;

  const user = profileData?.user;
  const stats = profileData?.stats || {};
  const todayTasks = profileData?.todayTasks || [];
  const recentUpdates = profileData?.recentUpdates || [];
  const recentTasks = profileData?.recentTasks || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={user ? `${user.full_name}'s Performance Profile` : 'Member Profile'}
      maxWidth="max-w-3xl"
    >
      {loading || !user ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading profile statistics...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Banner Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-md flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-md border-2 border-white/20"
                style={{ backgroundColor: user.avatar_color || '#3B82F6' }}
              >
                {user.full_name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">{user.full_name}</h2>
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-white/20 text-white">
                    {user.employee_id}
                  </span>
                </div>
                <p className="text-sm text-slate-300 mt-0.5">{user.designation} • {user.department}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{user.email}</span>
                  {user.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{user.phone}</span>}
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                user.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {user.status}
              </span>
              <p className="text-[11px] text-slate-400 mt-1">Joined: {user.joining_date || 'N/A'}</p>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              Today's Performance Breakdown
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200">
                <span className="text-[11px] font-bold text-blue-600 block uppercase">Active Tasks</span>
                <span className="text-2xl font-extrabold text-blue-950 mt-1 block">{stats.activeTasks || 0}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <span className="text-[11px] font-bold text-emerald-600 block uppercase">Completed Today</span>
                <span className="text-2xl font-extrabold text-emerald-950 mt-1 block">{stats.completedToday || 0}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 block uppercase">Pending</span>
                <span className="text-2xl font-extrabold text-slate-800 mt-1 block">{stats.pendingToday || 0}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200">
                <span className="text-[11px] font-bold text-rose-600 block uppercase">Overdue</span>
                <span className="text-2xl font-extrabold text-rose-950 mt-1 block">{stats.overdueToday || 0}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 col-span-2 sm:col-span-1">
                <span className="text-[11px] font-bold text-indigo-600 block uppercase">Today's Comp. Rate</span>
                <span className="text-2xl font-extrabold text-indigo-950 mt-1 block">{stats.todayCompletionRate || 0}%</span>
              </div>
            </div>
          </div>

          {/* Overall Progress Bar */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex justify-between items-center mb-1 text-xs font-semibold text-slate-700">
              <span>Today's Average Progress</span>
              <span className="text-blue-600 font-bold">{stats.todayAvgProgress || 0}%</span>
            </div>
            <ProgressBar progress={stats.todayAvgProgress || 0} showLabel={false} size="md" />
          </div>

          {/* Today's Tasks Assigned */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Tasks Assigned Today ({todayTasks.length})
            </h3>
            {todayTasks.length === 0 ? (
              <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                No tasks assigned for today.
              </p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {todayTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      onClose();
                      if (onSelectTask) onSelectTask(t);
                    }}
                    className="p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-bold text-slate-600 px-2 py-0.5 bg-slate-100 rounded-md">
                        {t.task_id}
                      </span>
                      <span className="font-semibold text-slate-900 truncate">{t.title}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <PriorityBadge priority={t.priority} size="xs" />
                      <StatusBadge status={t.status} size="xs" />
                      <span className="font-bold text-blue-600">{t.progress}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Work Updates */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Recent Work Activity Notes ({recentUpdates.length})
            </h3>
            {recentUpdates.length === 0 ? (
              <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                No recent activity updates found.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {recentUpdates.map((u) => (
                  <div key={u.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div className="flex justify-between items-center text-slate-400 text-[11px] mb-1">
                      <span className="font-bold text-slate-700">{u.task_id}: {u.task_title}</span>
                      <span>{new Date(u.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Progress {u.progress}%</span>
                    </div>
                    <p className="text-slate-800 leading-relaxed font-normal">{u.work_update}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Close Profile
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
