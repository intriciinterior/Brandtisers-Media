import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, RefreshCw, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import EmptyState from '../components/common/EmptyState';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';

export default function NotificationsPage({ onSelectTask, onTabChange }) {
  const { success, error } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'UNREAD'

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.getNotifications();
      setNotifications(data.notifications || []);
    } catch (err) {
      error(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      success('All notifications marked as read.');
    } catch (err) {
      error('Failed to mark all as read.');
    }
  };

  const handleMarkSingle = async (n) => {
    try {
      if (!n.is_read) {
        await api.markNotificationRead(n.id);
        setNotifications((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, is_read: 1 } : item))
        );
      }
      if (n.type === 'PASSWORD_CHANGE_REQUEST' && onTabChange) {
        onTabChange('settings');
      } else if (n.related_task_id && onSelectTask) {
        onSelectTask({ id: n.related_task_id });
      }
    } catch (err) {
      // ignore
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.is_read;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Notification Center
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Task assignments, deadline reminders, overdue escalations, and technical updates.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleMarkAllRead}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <CheckCheck className="w-4 h-4 text-blue-600" />
            <span>Mark All as Read</span>
          </button>
          <button
            onClick={loadNotifications}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-white p-3 rounded-2xl border border-slate-200">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === 'ALL'
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('UNREAD')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === 'UNREAD'
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Unread ({notifications.filter((n) => !n.is_read).length})
        </button>
      </div>

      {/* Notification List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading notifications...</p>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="You're all caught up!"
          description="There are no notifications matching your filter."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-2xs">
          {filtered.map((n) => (
            <div
              key={n.id}
              onClick={() => handleMarkSingle(n)}
              className={`p-4 transition-colors cursor-pointer hover:bg-slate-50 flex items-start justify-between gap-4 ${
                !n.is_read ? 'bg-blue-50/40' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${
                  !n.is_read ? 'bg-blue-600' : 'bg-slate-300'
                }`} />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{n.title}</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                  <span className="text-[11px] text-slate-400 mt-1.5 block">
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {n.related_task_id && (
                <div className="flex items-center gap-1 text-xs text-blue-600 font-bold hover:underline flex-shrink-0">
                  <span>View Task</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
