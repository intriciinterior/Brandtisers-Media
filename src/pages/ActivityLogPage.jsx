import React, { useState, useEffect } from 'react';
import { History, RefreshCw, User, Calendar, ShieldCheck, Activity } from 'lucide-react';
import EmptyState from '../components/common/EmptyState';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';

export default function ActivityLogPage() {
  const { error } = useToast();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadActivities = async () => {
    setLoading(true);
    try {
      const data = await api.getActivities(150);
      setActivities(data.activities || []);
    } catch (err) {
      error(err.message || 'Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, []);

  const getActionBadgeColor = (action) => {
    if (action.includes('CREATED') || action.includes('ADDED')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    if (action.includes('DELETED') || action.includes('REMOVED')) {
      return 'bg-rose-100 text-rose-800 border-rose-200';
    }
    if (action.includes('COMPLETED')) {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    if (action.includes('STATUS') || action.includes('PROGRESS')) {
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const filtered = activities.filter((act) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (act.action && act.action.toLowerCase().includes(term)) ||
      (act.details && act.details.toLowerCase().includes(term)) ||
      (act.user_name && act.user_name.toLowerCase().includes(term)) ||
      (act.task_id && act.task_id.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            System & Operations Audit Trail
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable tracking log of administrative events, task updates, assignments, and completions.
          </p>
        </div>

        <button
          onClick={loadActivities}
          className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors self-start sm:self-auto"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
        </button>
      </div>

      {/* Search Input */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter audit log by action, user name, task ID, details..."
          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading audit history...</p>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={History}
          title="No activity logs found"
          description="No audit records match your query."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <table className="w-full text-left text-xs border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Activity Details</th>
                <th className="py-3 px-4">Related Item</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((act) => (
                <tr key={act.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Timestamp */}
                  <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                    {act.created_at}
                  </td>

                  {/* Actor User */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-bold"
                        style={{ backgroundColor: act.user_avatar_color || '#3B82F6' }}
                      >
                        {(act.user_name || 'U').charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">{act.user_name || 'System'}</span>
                        <span className="text-[10px] text-slate-400 block">{act.user_role?.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </td>

                  {/* Action Badge */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getActionBadgeColor(act.action)}`}>
                      {act.action}
                    </span>
                  </td>

                  {/* Details */}
                  <td className="py-3 px-4 text-slate-700 font-normal leading-relaxed">
                    {act.details}
                  </td>

                  {/* Related Item */}
                  <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                    {act.task_id ? (
                      <span className="bg-slate-100 px-2 py-0.5 rounded-md font-bold text-slate-700">
                        {act.task_id}
                      </span>
                    ) : act.related_user_name ? (
                      <span className="font-semibold text-slate-700">
                        {act.related_user_name}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
