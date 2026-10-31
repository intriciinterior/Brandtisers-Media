import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar, Download, Printer, BarChart3, TrendingUp,
  CheckCircle2, Clock, AlertCircle, PlayCircle, Users, Award, Building2, Zap
} from 'lucide-react';
import ProgressBar from '../components/common/ProgressBar';
import PriorityBadge from '../components/common/PriorityBadge';
import StatusBadge from '../components/common/StatusBadge';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { getTaskScheduleStatus } from '../utils/scheduleStatus';

export default function ReportsPage({ onSelectTask }) {
  const { error, success } = useToast();

  const [reportType, setReportType] = useState('daily'); // 'daily' | 'weekly' | 'monthly' | 'overdue'
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().substring(0, 7));
  const [clientFilter, setClientFilter] = useState('ALL');

  // Admin Monthly Data Dashboard Filters (Requirement 6 & 11)
  const [monthlyEmployeeFilter, setMonthlyEmployeeFilter] = useState('ALL');
  const [monthlyStatusFilter, setMonthlyStatusFilter] = useState('ALL');
  const [monthlyDateFilter, setMonthlyDateFilter] = useState('ALL');

  const [dailyData, setDailyData] = useState(null);
  const [weeklyData, setWeeklyData] = useState(null);
  const [monthlyData, setMonthlyData] = useState(null);
  const [loading, setLoading] = useState(false);

  const defaultClients = ['ABC Technologies', 'XYZ Pvt Ltd', 'FinCorp Global', 'Apex HealthTech', 'CloudNexus Systems', 'Global Logistics Ltd'];

  const formatTime = (isoStr) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch {
      return isoStr;
    }
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  const fetchDaily = async () => {
    setLoading(true);
    try {
      const data = await api.getDailyReport(selectedDate, clientFilter);
      setDailyData(data);
    } catch (err) {
      error(err.message || 'Failed to fetch daily report');
    } finally {
      setLoading(false);
    }
  };

  const fetchWeekly = async () => {
    setLoading(true);
    try {
      const data = await api.getWeeklyReport(clientFilter);
      setWeeklyData(data);
    } catch (err) {
      error(err.message || 'Failed to fetch weekly report');
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthly = async () => {
    setLoading(true);
    try {
      const data = await api.getMonthlyReport(
        selectedMonth,
        clientFilter,
        monthlyEmployeeFilter,
        monthlyStatusFilter,
        monthlyDateFilter
      );
      setMonthlyData(data);
    } catch (err) {
      error(err.message || 'Failed to fetch monthly report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (reportType === 'daily' || reportType === 'overdue') {
      fetchDaily();
    } else if (reportType === 'weekly') {
      fetchWeekly();
    } else if (reportType === 'monthly') {
      fetchMonthly();
    }
  }, [reportType, selectedDate, selectedMonth, clientFilter, monthlyEmployeeFilter, monthlyStatusFilter, monthlyDateFilter]);

  const handleExportCsv = () => {
    const url = api.getExportCsvUrl(reportType === 'daily' ? selectedDate : '', clientFilter);
    window.open(url, '_blank');
    success('Generating CSV report with database data...');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            IT Operations Reports & Performance Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Client-wise auditing, technician productivity, and SLA completion summaries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Print or Save as PDF"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Report Type Tabs & Filters Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-white p-3 rounded-xl border border-slate-200">
        {/* Type selector */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 flex-wrap">
          {[
            { id: 'daily', label: 'Daily Report' },
            { id: 'weekly', label: 'Weekly Report' },
            { id: 'monthly', label: 'Monthly Report' },
            { id: 'overdue', label: 'Overdue Audit' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setReportType(tab.id)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                reportType === tab.id
                  ? 'bg-white text-blue-600 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Client & Date Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Client Filter (Requirement #11: Filter reports by Client) */}
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">All Clients</option>
            {defaultClients.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Date Picker for Daily / Overdue */}
          {reportType === 'daily' || reportType === 'overdue' ? (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-2 py-1 rounded-md border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          ) : reportType === 'monthly' ? (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-2 py-1 rounded-md border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* Report Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-slate-200">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-xs text-slate-500">Generating report...</p>
        </div>
      ) : reportType === 'daily' ? (
        /* DAILY REPORT */
        <div className="space-y-4">
          {/* Top Summary Banner */}
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Daily Report</span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  Report Date: {selectedDate} {clientFilter !== 'ALL' && `• Client: ${clientFilter}`}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold text-slate-900">
                  {dailyData?.summary?.completionRate ?? 0}%
                </span>
                <span className="text-[10px] text-slate-400 block">Shift Completion</span>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 text-center">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-semibold text-slate-500 uppercase block">Total Tasks</span>
                <span className="text-lg font-bold text-slate-900 mt-0.5 block">{dailyData?.summary?.totalTasks ?? 0}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] font-semibold text-emerald-700 uppercase block">Completed</span>
                <span className="text-lg font-bold text-emerald-700 mt-0.5 block">{dailyData?.summary?.completed ?? 0}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200">
                <span className="text-[10px] font-semibold text-blue-700 uppercase block">In Progress</span>
                <span className="text-lg font-bold text-blue-700 mt-0.5 block">{dailyData?.summary?.inProgress ?? 0}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-semibold text-slate-700 uppercase block">Pending</span>
                <span className="text-lg font-bold text-slate-700 mt-0.5 block">{dailyData?.summary?.pending ?? 0}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200">
                <span className="text-[10px] font-semibold text-rose-700 uppercase block">Overdue</span>
                <span className="text-lg font-bold text-rose-700 mt-0.5 block">{dailyData?.summary?.overdue ?? 0}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200">
                <span className="text-[10px] font-semibold text-indigo-700 uppercase block">Avg Progress</span>
                <span className="text-lg font-bold text-indigo-700 mt-0.5 block">{dailyData?.summary?.averageProgress ?? 0}%</span>
              </div>
            </div>
          </div>

          {/* Client-Wise Breakdown (Requirement #11: Exact Client-Wise Table) */}
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-1.5 mb-3 pb-2 border-b border-slate-100">
              <Building2 className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Client-Wise Task Breakdown
              </h3>
            </div>

            {!dailyData?.clientBreakdown?.length ? (
              <p className="text-xs text-slate-400 italic text-center py-4">
                No client records available for this date.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[650px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Client Name</th>
                      <th className="py-2.5 px-3 text-center">Total Tasks</th>
                      <th className="py-2.5 px-3 text-center">Completed</th>
                      <th className="py-2.5 px-3 text-center">In Progress</th>
                      <th className="py-2.5 px-3 text-center">Pending</th>
                      <th className="py-2.5 px-3 text-right">Completion Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dailyData.clientBreakdown.map((c) => (
                      <tr key={c.client_name} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {c.client_name}
                        </td>
                        <td className="py-2.5 px-3 text-center font-semibold text-slate-800">{c.total}</td>
                        <td className="py-2.5 px-3 text-center font-semibold text-emerald-600">{c.completed}</td>
                        <td className="py-2.5 px-3 text-center font-semibold text-blue-600">{c.in_progress}</td>
                        <td className="py-2.5 px-3 text-center font-semibold text-slate-600">{c.pending}</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                            {c.completion_rate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Team Member-Wise Daily Breakdown */}
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">
              Team Member-Wise Daily Breakdown
            </h3>

            {!dailyData?.memberBreakdown?.length ? (
              <p className="text-xs text-slate-400 italic text-center py-4">
                No assignments recorded for this date.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Team Member</th>
                      <th className="py-2.5 px-3 text-center">Assigned</th>
                      <th className="py-2.5 px-3 text-center">Completed</th>
                      <th className="py-2.5 px-3 text-center">In Progress</th>
                      <th className="py-2.5 px-3 text-center">Pending</th>
                      <th className="py-2.5 px-3 text-center">Overdue</th>
                      <th className="py-2.5 px-3 w-32">Average Progress</th>
                      <th className="py-2.5 px-3 text-right">Completion Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dailyData.memberBreakdown.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                              style={{ backgroundColor: m.avatar_color || '#3B82F6' }}
                            >
                              {m.name.charAt(0)}
                            </div>
                            <span className="font-semibold text-slate-800">{m.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-medium text-slate-800">{m.assigned}</td>
                        <td className="py-2.5 px-3 text-center font-medium text-emerald-600">{m.completed}</td>
                        <td className="py-2.5 px-3 text-center font-medium text-blue-600">{m.in_progress}</td>
                        <td className="py-2.5 px-3 text-center font-medium text-slate-600">{m.pending}</td>
                        <td className="py-2.5 px-3 text-center font-medium text-rose-600">{m.overdue}</td>
                        <td className="py-2.5 px-3">
                          <ProgressBar progress={m.average_progress} showLabel={true} size="xs" />
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                          {m.completion_rate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Individual Tasks List with Client Name */}
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">
              Tasks Assigned on {selectedDate} ({dailyData?.tasks?.length || 0})
            </h3>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {dailyData?.tasks?.map((t) => (
                <div
                  key={t.id}
                  onClick={() => onSelectTask && onSelectTask(t)}
                  className="p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-bold text-slate-900 block leading-tight">
                      {t.client_name || 'ABC Technologies'}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-[10px] text-slate-400">{t.task_id}</span>
                      <span className="text-slate-700 font-medium truncate">{t.title}</span>
                      <span className="text-slate-400">({t.member_name})</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <PriorityBadge priority={t.priority} size="xs" />
                    <StatusBadge
                      status={t.status}
                      scheduleStatus={getTaskScheduleStatus(t)}
                      size="xs"
                    />
                    <span className="font-bold text-blue-600">{t.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : reportType === 'weekly' ? (
        /* WEEKLY REPORT */
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Weekly Overview</span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  7-Day Performance ({weeklyData?.startDate} to {weeklyData?.endDate}) {clientFilter !== 'ALL' && `• Client: ${clientFilter}`}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold text-emerald-600">
                  {weeklyData?.weeklyRate ?? 0}%
                </span>
                <span className="text-[10px] text-slate-400 block font-medium">Weekly Completion</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
              {weeklyData?.dayStats?.map((day) => (
                <div key={day.date} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">{day.dayName}</span>
                  <span className="text-xs font-semibold text-slate-700 block mt-0.5">{day.date.slice(5)}</span>
                  <span className="text-base font-bold text-slate-900 block mt-1">{day.total} Tasks</span>
                  <span className="text-[11px] font-semibold text-emerald-600 block">{day.rate}% Done</span>
                </div>
              ))}
            </div>
          </div>

          {/* Client Breakdown in Weekly */}
          {weeklyData?.clientBreakdown && weeklyData.clientBreakdown.length > 0 && (
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
                Client Summary for the Week
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {weeklyData.clientBreakdown.map((c) => (
                  <div key={c.client_name} className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                    <span className="font-bold text-slate-900 text-xs block">{c.client_name}</span>
                    <div className="text-xs text-slate-600 mt-1 flex justify-between">
                      <span>Total Tasks: <strong>{c.total}</strong></span>
                      <span>Completed: <strong className="text-emerald-600">{c.completed}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : reportType === 'monthly' ? (
        /* MONTHLY REPORT: ADMIN MONTHLY DATA DASHBOARD (Requirements 6 & 11) */
        <div className="space-y-4">
          {/* Top Banner & KPI Summary Cards */}
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                  Admin Monthly Data Dashboard
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {monthlyData?.monthLabel || selectedMonth} Overview {clientFilter !== 'ALL' && `• Client: ${clientFilter}`}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-xl font-bold text-blue-600">
                    {monthlyData?.overallCompletion ?? monthlyData?.rate ?? 0}%
                  </span>
                  <span className="text-[10px] text-slate-400 block font-medium">Department Completion</span>
                </div>
              </div>
            </div>

            {/* Top KPI Cards (Req 6 & 11) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 text-center">
              {/* Total Employees */}
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-semibold text-slate-500 uppercase block">Total Employees</span>
                <span className="text-lg font-bold text-slate-900 mt-0.5 block">{monthlyData?.totalEmployees ?? 0}</span>
                <span className="text-[10px] text-slate-400">Department</span>
              </div>

              {/* Total Tasks */}
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-semibold text-slate-500 uppercase block">Total Tasks</span>
                <span className="text-lg font-bold text-slate-900 mt-0.5 block">{monthlyData?.totalTeamTasks ?? 0}</span>
                <span className="text-[10px] text-slate-400">Scheduled</span>
              </div>

              {/* Completed */}
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] font-semibold text-emerald-700 uppercase block">Completed</span>
                <span className="text-lg font-bold text-emerald-700 mt-0.5 block">{monthlyData?.completedMonthly ?? 0}</span>
                <span className="text-[10px] text-emerald-600">Closed</span>
              </div>

              {/* In Progress */}
              <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200">
                <span className="text-[10px] font-semibold text-blue-700 uppercase block">In Progress</span>
                <span className="text-lg font-bold text-blue-700 mt-0.5 block">{monthlyData?.inProgressMonthly ?? 0}</span>
                <span className="text-[10px] text-blue-600">Active</span>
              </div>

              {/* Pending */}
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-semibold text-slate-700 uppercase block">Pending</span>
                <span className="text-lg font-bold text-slate-700 mt-0.5 block">{monthlyData?.pendingMonthly ?? 0}</span>
                <span className="text-[10px] text-slate-500">Queued</span>
              </div>

              {/* Overdue */}
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200">
                <span className="text-[10px] font-semibold text-rose-700 uppercase block">Overdue</span>
                <span className="text-lg font-bold text-rose-700 mt-0.5 block">{monthlyData?.overdueMonthly ?? 0}</span>
                <span className="text-[10px] text-rose-600">Breached SLA</span>
              </div>

              {/* Advance Completed */}
              <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200">
                <span className="text-[10px] font-semibold text-purple-700 uppercase block">Advance Done</span>
                <span className="text-lg font-bold text-purple-700 mt-0.5 block">{monthlyData?.advanceCompletedMonthly ?? 0}</span>
                <span className="text-[10px] text-purple-600">Ahead of date</span>
              </div>

              {/* Overall Completion % */}
              <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200">
                <span className="text-[10px] font-semibold text-indigo-700 uppercase block">Completion %</span>
                <span className="text-lg font-bold text-indigo-700 mt-0.5 block">{monthlyData?.overallCompletion ?? monthlyData?.rate ?? 0}%</span>
                <span className="text-[10px] text-indigo-600">Department</span>
              </div>
            </div>
          </div>

          {/* Employee-Wise Monthly Performance Table (Requirement 6 & 11) */}
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Employee-Wise Monthly Performance
                </h3>
              </div>
              {monthlyEmployeeFilter !== 'ALL' && (
                <button
                  onClick={() => setMonthlyEmployeeFilter('ALL')}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer underline"
                >
                  Clear Employee Filter
                </button>
              )}
            </div>

            {!monthlyData?.employeeBreakdown?.length ? (
              <p className="text-xs text-slate-400 italic text-center py-4">
                No active employee records found.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Employee</th>
                      <th className="py-2.5 px-3 text-center">Assigned</th>
                      <th className="py-2.5 px-3 text-center">Completed</th>
                      <th className="py-2.5 px-3 text-center">In Progress</th>
                      <th className="py-2.5 px-3 text-center">Pending</th>
                      <th className="py-2.5 px-3 text-center">Overdue</th>
                      <th className="py-2.5 px-3 text-center">Advance Completed</th>
                      <th className="py-2.5 px-3 text-right">Completion %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {monthlyData.employeeBreakdown.map((m) => {
                      const isSelected = monthlyEmployeeFilter === String(m.id);
                      return (
                        <tr
                          key={m.id}
                          onClick={() => setMonthlyEmployeeFilter(isSelected ? 'ALL' : String(m.id))}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-50/80 font-medium'
                              : 'hover:bg-slate-50/70'
                          }`}
                          title="Click to filter task records below by this employee"
                        >
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                                style={{ backgroundColor: m.avatar_color || '#3B82F6' }}
                              >
                                {m.name.charAt(0)}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block leading-tight">{m.name}</span>
                                <span className="text-[10px] text-slate-400">{m.employee_id} • {m.designation || 'IT Team Member'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-800">{m.assigned}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-emerald-600">{m.completed}</td>
                          <td className="py-2.5 px-3 text-center font-medium text-blue-600">{m.in_progress}</td>
                          <td className="py-2.5 px-3 text-center font-medium text-slate-600">{m.pending}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-rose-600">{m.overdue}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700">
                              <Zap className="w-3 h-3" />
                              {m.advance_completed}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                <div
                                  className="h-full bg-emerald-500 rounded-full"
                                  style={{ width: `${m.completion_rate}%` }}
                                />
                              </div>
                              <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                                {m.completion_rate}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Monthly Tasks Detailed Table & Filters */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Monthly Tasks Records ({monthlyData?.tasks?.length || 0} tasks)
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Detailed breakdown of all work items assigned during {monthlyData?.monthLabel || selectedMonth}.
                </p>
              </div>

              {/* Filters toolbar for monthly tasks */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Employee Filter */}
                <select
                  value={monthlyEmployeeFilter}
                  onChange={(e) => setMonthlyEmployeeFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">All Employees</option>
                  {monthlyData?.employeeBreakdown?.map((m) => (
                    <option key={m.id} value={String(m.id)}>
                      {m.name}
                    </option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={monthlyStatusFilter}
                  onChange={(e) => setMonthlyStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="ACCEPTED">Accepted</option>
                  <option value="PENDING">Pending</option>
                  <option value="OVERDUE">Overdue</option>
                </select>

                {/* Date within Month */}
                <input
                  type="date"
                  value={monthlyDateFilter === 'ALL' ? '' : monthlyDateFilter}
                  onChange={(e) => setMonthlyDateFilter(e.target.value || 'ALL')}
                  placeholder="Filter by date"
                  className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />

                {(monthlyEmployeeFilter !== 'ALL' || monthlyStatusFilter !== 'ALL' || monthlyDateFilter !== 'ALL') && (
                  <button
                    onClick={() => {
                      setMonthlyEmployeeFilter('ALL');
                      setMonthlyStatusFilter('ALL');
                      setMonthlyDateFilter('ALL');
                    }}
                    className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Task list table */}
            {!monthlyData?.tasks?.length ? (
              <p className="text-xs text-slate-400 italic text-center py-8">
                No task records found matching the active monthly filters.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Client</th>
                      <th className="py-2.5 px-3">Task</th>
                      <th className="py-2.5 px-3">Assigned To</th>
                      <th className="py-2.5 px-3">Work Type</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Progress</th>
                      <th className="py-2.5 px-3 text-right">Completed At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {monthlyData.tasks.map((t) => (
                      <tr
                        key={t.id}
                        onClick={() => onSelectTask && onSelectTask(t)}
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                      >
                        <td className="py-2.5 px-3 font-semibold text-slate-700 whitespace-nowrap">
                          {formatDateDisplay(t.task_date)}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                          {t.client_name || 'ABC Technologies'}
                        </td>
                        <td className="py-2.5 px-3 min-w-[180px]">
                          <span className="font-medium text-slate-800 block truncate">{t.title}</span>
                          <span className="font-mono text-[10px] text-slate-400">{t.task_id}</span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-700 whitespace-nowrap">
                          {t.member_name || '—'}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {t.work_type === 'ADVANCE' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              <Zap className="w-2.5 h-2.5" />
                              ADVANCE WORK
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500 font-medium">Normal</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <StatusBadge
                            status={t.status}
                            scheduleStatus={getTaskScheduleStatus(t)}
                            size="xs"
                          />
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  t.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-blue-600'
                                }`}
                                style={{ width: `${t.progress}%` }}
                              />
                            </div>
                            <span className="font-mono font-semibold text-slate-700">{t.progress}%</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600 whitespace-nowrap">
                          {t.status === 'COMPLETED' ? (
                            <span className="text-emerald-700 font-semibold">{formatTime(t.completed_at)}</span>
                          ) : (
                            <span className="text-slate-400">Due {formatTime(t.deadline)}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Client Breakdown in Monthly */}
          {monthlyData?.clientBreakdown && monthlyData.clientBreakdown.length > 0 && (
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
                Client Summary for {monthlyData?.monthLabel || selectedMonth}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {monthlyData.clientBreakdown.map((c) => (
                  <div key={c.client_name} className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                    <span className="font-bold text-slate-900 text-xs block">{c.client_name}</span>
                    <div className="text-xs text-slate-600 mt-1 flex justify-between">
                      <span>Total Tasks: <strong>{c.total}</strong></span>
                      <span>Completed: <strong className="text-emerald-600">{c.completed}</strong></span>
                      <span className="text-slate-500 font-medium">({c.completion_rate}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* OVERDUE REPORT */
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <h3 className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>Overdue Task Audit ({dailyData?.tasks?.filter(t => t.is_overdue).length || 0})</span>
          </h3>

          <div className="space-y-2">
            {dailyData?.tasks?.filter(t => t.is_overdue).length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-6">
                No overdue tasks detected for {selectedDate}. All SLA commitments are on track!
              </p>
            ) : (
              dailyData?.tasks?.filter(t => t.is_overdue).map((t) => (
                <div
                  key={t.id}
                  onClick={() => onSelectTask && onSelectTask(t)}
                  className="p-3 rounded-lg border border-rose-200 bg-rose-50/20 hover:bg-rose-50/40 transition-colors cursor-pointer flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900 block leading-tight">
                      {t.client_name || 'ABC Technologies'}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-rose-700 font-bold">{t.task_id}</span>
                      <span className="font-medium text-slate-700">{t.title}</span>
                      <span className="text-slate-400">({t.member_name})</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="font-bold text-rose-600 text-xs block">{t.progress}% Progress</span>
                    <span className="text-[10px] text-rose-500 font-medium">Overdue</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
