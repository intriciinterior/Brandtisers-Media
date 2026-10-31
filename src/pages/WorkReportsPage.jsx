import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet, Download, Send, Plus, Trash2, Calendar,
  CheckCircle2, Clock, Users, Building2, Tag, RefreshCw,
  Mail, AlertCircle, BarChart3, ChevronRight, FileText
} from 'lucide-react';
import Modal from '../components/common/Modal';
import EmptyState from '../components/common/EmptyState';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function WorkReportsPage() {
  const { user, isSuperAdmin } = useAuth();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState('daily'); // 'daily' | 'weekly' | 'monthly'
  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = new Date().toISOString().substring(0, 7);

  // Filters / Selected dates
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(todayStr);

  // Employee Selection (Super Admin can view any employee; Employee locked to self)
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(user?.id || '');

  // Work Types & Clients
  const [workTypes, setWorkTypes] = useState([]);
  const [clients, setClients] = useState([]);

  // Report Data
  const [dailyData, setDailyData] = useState(null);
  const [weeklyData, setWeeklyData] = useState(null);
  const [monthlyData, setMonthlyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savingDaily, setSavingDaily] = useState(false);

  // Editable Daily Entries form
  const [dailyEntries, setDailyEntries] = useState([
    { work_type_name: '', client_name: '', task_title: '', quantity: 1, status: 'Completed', description: '' }
  ]);
  const [dailyNotes, setDailyNotes] = useState('');

  // Email Modal State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);

  // Load Employees (for Super Admin dropdown), Work Types, Clients
  useEffect(() => {
    async function loadMeta() {
      try {
        if (isSuperAdmin) {
          const uRes = await api.getUsers({ role: 'EMPLOYEE' });
          setEmployees(uRes.users || []);
        }
        const [wtRes, clRes] = await Promise.all([
          api.getWorkTypes({ status: 'ACTIVE' }),
          api.getClients({ status: 'ACTIVE' })
        ]);
        setWorkTypes(wtRes.workTypes || []);
        setClients(clRes.clients || []);
      } catch (err) {
        // ignore
      }
    }
    loadMeta();
  }, [isSuperAdmin]);

  // Load Report Data when tab/filters change
  const fetchReportData = async () => {
    const empId = isSuperAdmin ? selectedEmployeeId : user?.id;
    if (!empId) return;

    setLoading(true);
    try {
      if (activeTab === 'daily') {
        const res = await api.getDailyWorkReport(selectedDate, empId);
        setDailyData(res);
        if (res.entries && res.entries.length > 0) {
          setDailyEntries(res.entries);
        } else {
          // Pre-populate from daily tasks if available
          if (res.daily_tasks && res.daily_tasks.length > 0) {
            setDailyEntries(
              res.daily_tasks.map(t => ({
                work_type_name: workTypes[0]?.name || 'General',
                client_name: t.client_name || '',
                task_title: t.title || '',
                quantity: 1,
                status: t.status === 'COMPLETED' ? 'Completed' : 'In Progress',
                description: `Task ${t.task_id}: ${t.title}`
              }))
            );
          } else {
            setDailyEntries([
              { work_type_name: workTypes[0]?.name || '', client_name: '', task_title: '', quantity: 1, status: 'Completed', description: '' }
            ]);
          }
        }
      } else if (activeTab === 'weekly') {
        const res = await api.getWeeklyWorkReport(startDate, endDate, empId);
        setWeeklyData(res);
      } else if (activeTab === 'monthly') {
        const res = await api.getMonthlyWorkReport(selectedMonth, empId);
        setMonthlyData(res);
      }
    } catch (err) {
      error(err.message || 'Failed to load work report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [activeTab, selectedDate, startDate, endDate, selectedMonth, selectedEmployeeId]);

  // Entry Form Handlers
  const handleAddEntry = () => {
    setDailyEntries(prev => [
      ...prev,
      {
        work_type_name: workTypes[0]?.name || '',
        client_name: clients[0]?.client_name || '',
        task_title: '',
        quantity: 1,
        status: 'Completed',
        description: ''
      }
    ]);
  };

  const handleRemoveEntry = (idx) => {
    if (dailyEntries.length === 1) {
      error('At least one entry is required in your report.');
      return;
    }
    setDailyEntries(prev => prev.filter((_, i) => i !== idx));
  };

  const handleEntryChange = (idx, field, value) => {
    setDailyEntries(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  // Calculate live total quantity
  const totalQuantity = dailyEntries.reduce((sum, e) => sum + (Math.max(0, parseInt(e.quantity, 10) || 0)), 0);

  // Save Daily Report
  const handleSaveDailyReport = async (e) => {
    if (e) e.preventDefault();
    const empId = isSuperAdmin ? selectedEmployeeId : user?.id;

    // Validate entries
    const validEntries = dailyEntries.filter(e => e.work_type_name && e.work_type_name.trim());
    if (validEntries.length === 0) {
      error('Please specify a Work Category for each entry.');
      return;
    }

    setSavingDaily(true);
    try {
      await api.saveDailyWorkReport({
        employee_id: empId,
        date: selectedDate,
        entries: validEntries,
        notes: dailyNotes
      });
      success(`Daily Work Report saved (${totalQuantity} work units)!`);
      fetchReportData();
    } catch (err) {
      error(err.message || 'Failed to save daily report');
    } finally {
      setSavingDaily(false);
    }
  };

  // Download Genuine Excel (.xlsx) File
  const handleDownloadExcel = async () => {
    const empId = isSuperAdmin ? selectedEmployeeId : user?.id;
    setDownloadingExcel(true);
    try {
      const payload = {
        employee_id: empId,
        report_type: activeTab.toUpperCase(),
        date: selectedDate,
        start_date: startDate,
        end_date: endDate,
        month: selectedMonth
      };

      const blob = await api.exportWorkReportExcel(payload);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeTab.toUpperCase()}_Work_Report_${selectedDate || selectedMonth}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      success('Excel report downloaded successfully (.xlsx)!');
    } catch (err) {
      error(err.message || 'Failed to download Excel report');
    } finally {
      setDownloadingExcel(false);
    }
  };

  // Open Email Modal
  const handleOpenEmailModal = () => {
    setEmailSubject(`${activeTab.toUpperCase()} IT Work Report - ${selectedDate || selectedMonth}`);
    setEmailMessage(`Please find attached the official ${activeTab} IT work & quantity report generated by the IT Operations Management System.`);
    setShowEmailModal(true);
  };

  // Send Report Directly by Email
  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!recipientEmail.trim()) {
      error('Recipient email address is required.');
      return;
    }

    const empId = isSuperAdmin ? selectedEmployeeId : user?.id;
    setSendingEmail(true);
    try {
      await api.sendWorkReportEmail({
        employee_id: empId,
        recipient_email: recipientEmail.trim(),
        subject: emailSubject.trim(),
        message: emailMessage.trim(),
        report_type: activeTab.toUpperCase(),
        date: selectedDate,
        start_date: startDate,
        end_date: endDate,
        month: selectedMonth
      });
      success(`Work report with Excel attachment sent to ${recipientEmail}!`);
      setShowEmailModal(false);
      setRecipientEmail('');
    } catch (err) {
      error(err.message || 'Failed to send report email');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Work & Quantity Reports (Excel)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Record daily deliverables, calculate total quantities, download native Excel (.xlsx), and email reports.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchReportData}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
            title="Refresh Report Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>

          <button
            onClick={handleDownloadExcel}
            disabled={downloadingExcel || loading}
            className="px-3.5 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs sm:text-sm font-bold shadow-2xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            title="Download real native Excel file (.xlsx)"
          >
            <Download className="w-4 h-4 text-emerald-700" />
            <span>{downloadingExcel ? 'Generating .xlsx...' : 'Download Excel (.xlsx)'}</span>
          </button>

          <button
            onClick={handleOpenEmailModal}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Send by Email</span>
          </button>
        </div>
      </div>

      {/* Report Frequency Tabs & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Frequency Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          {[
            { id: 'daily', label: 'Daily Work Report' },
            { id: 'weekly', label: 'Weekly Summary' },
            { id: 'monthly', label: 'Monthly Performance' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white text-emerald-700 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Date Controls & Super Admin Employee Selector */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Super Admin Employee Switcher */}
          {isSuperAdmin && (
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value={user.id}>{user.full_name} (Me)</option>
                {employees
                  .filter((e) => e.id !== user.id)
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.full_name} ({e.employee_id})
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Date Picker based on tab */}
          {activeTab === 'daily' && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          {activeTab === 'weekly' && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
              <span>From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1 rounded-lg border border-slate-200 text-xs bg-slate-50"
              />
              <span>To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1 rounded-lg border border-slate-200 text-xs bg-slate-50"
              />
            </div>
          )}

          {activeTab === 'monthly' && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* REPORT CONTENT BODY */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-slate-500 font-medium">Compiling work report...</p>
        </div>
      ) : activeTab === 'daily' ? (
        /* ======================== TAB 1: DAILY WORK REPORT ======================== */
        <div className="space-y-5">
          {/* KPI Summary Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Total Work Units (Quantity)
              </span>
              <div className="text-3xl font-extrabold text-emerald-600 mt-1">
                {totalQuantity}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">Sum of item quantities</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Work Entries Logged
              </span>
              <div className="text-3xl font-extrabold text-slate-900 mt-1">
                {dailyEntries.length}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">Categorized items</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider block">
                Tasks Assigned Today
              </span>
              <div className="text-3xl font-extrabold text-blue-600 mt-1">
                {dailyData?.daily_tasks?.length || 0}
              </div>
              <span className="text-[11px] text-blue-600 mt-0.5 block">Scheduled for {selectedDate}</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider block">
                Export Status
              </span>
              <div className="text-sm font-bold text-purple-900 mt-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-purple-600" />
                <span>Ready for Excel / Email</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Live XLSX buffer generator</span>
            </div>
          </div>

          {/* Daily Work Entries Table & Form */}
          <form onSubmit={handleSaveDailyReport} className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Daily Work Breakdown & Quantities
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Record what deliverables were completed today and specify the exact quantity (e.g. 5 tickets, 2 videos, 10 calls).
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddEntry}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5 text-slate-600" />
                <span>+ Add Work Entry</span>
              </button>
            </div>

            {/* Entries Table */}
            <div className="overflow-x-auto p-4">
              <table className="w-full text-left text-xs border-collapse min-w-[750px]">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <th className="py-2.5 px-3 w-40">Work Category</th>
                    <th className="py-2.5 px-3 w-44">Client</th>
                    <th className="py-2.5 px-3 w-44">Task / Scope Reference</th>
                    <th className="py-2.5 px-3 w-24 text-center">Quantity</th>
                    <th className="py-2.5 px-3 w-28">Status</th>
                    <th className="py-2.5 px-3">Notes / Description</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dailyEntries.map((entry, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      {/* Work Category */}
                      <td className="py-2.5 px-3">
                        <select
                          value={entry.work_type_name}
                          onChange={(e) => handleEntryChange(idx, 'work_type_name', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          required
                        >
                          <option value="">Select Category</option>
                          {workTypes.map((wt) => (
                            <option key={wt.id} value={wt.name}>
                              {wt.name}
                            </option>
                          ))}
                          {!workTypes.some((wt) => wt.name === entry.work_type_name) && entry.work_type_name && (
                            <option value={entry.work_type_name}>{entry.work_type_name}</option>
                          )}
                        </select>
                      </td>

                      {/* Client */}
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          list={`clients-list-${idx}`}
                          value={entry.client_name || ''}
                          onChange={(e) => handleEntryChange(idx, 'client_name', e.target.value)}
                          placeholder="Client name"
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <datalist id={`clients-list-${idx}`}>
                          {clients.map((c) => (
                            <option key={c.id} value={c.client_name} />
                          ))}
                        </datalist>
                      </td>

                      {/* Task / Scope Title */}
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={entry.task_title || ''}
                          onChange={(e) => handleEntryChange(idx, 'task_title', e.target.value)}
                          placeholder="e.g. Website server backup"
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>

                      {/* Quantity */}
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          min="0"
                          value={entry.quantity}
                          onChange={(e) => handleEntryChange(idx, 'quantity', e.target.value)}
                          className="w-20 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-center text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          required
                        />
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3">
                        <select
                          value={entry.status || 'Completed'}
                          onChange={(e) => handleEntryChange(idx, 'status', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="Completed">Completed</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Pending">Pending</option>
                          <option value="Tested">Tested</option>
                        </select>
                      </td>

                      {/* Notes / Description */}
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={entry.description || ''}
                          onChange={(e) => handleEntryChange(idx, 'description', e.target.value)}
                          placeholder="Work details, tickets resolved..."
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>

                      {/* Delete */}
                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveEntry(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Remove entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Overall Notes & Submit */}
            <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1 max-w-md">
                <input
                  type="text"
                  value={dailyNotes}
                  onChange={(e) => setDailyNotes(e.target.value)}
                  placeholder="General notes, blockers, or daily summary..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-700">
                    Total Quantity: <strong className="text-emerald-700 text-sm font-extrabold">{totalQuantity}</strong>
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={savingDaily}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{savingDaily ? 'Saving Report...' : 'Save Daily Report'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : activeTab === 'weekly' ? (
        /* ======================== TAB 2: WEEKLY SUMMARY ======================== */
        <div className="space-y-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                  Weekly Aggregated Report
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                  Period: {startDate} to {endDate}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-3xl font-extrabold text-emerald-600">
                  {weeklyData?.weekly_total || 0}
                </span>
                <span className="text-[11px] text-slate-400 block font-semibold">Total Work Units This Week</span>
              </div>
            </div>

            {/* Day Breakdown Cards */}
            <div className="mt-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                Day-Wise Volume
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                {weeklyData?.day_breakdown?.map((day) => (
                  <div key={day.date} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[11px] font-semibold text-slate-500 block">{day.date}</span>
                    <span className="text-xl font-bold text-emerald-600 block mt-1">{day.total}</span>
                    <span className="text-[10px] text-slate-400 block">{day.items?.length || 0} entries</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Weekly Detailed Entries */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">
              Weekly Work Log Entries ({weeklyData?.entries?.length || 0})
            </h4>

            {!weeklyData?.entries?.length ? (
              <p className="text-xs text-slate-400 italic text-center py-6">
                No work entries logged during this weekly range.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Client / Scope</th>
                      <th className="py-2.5 px-3 text-center">Quantity</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {weeklyData.entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-semibold text-slate-700">{entry.entry_date}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{entry.work_type_name}</td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {entry.client_name ? `${entry.client_name} - ${entry.task_title || ''}` : (entry.task_title || '—')}
                        </td>
                        <td className="py-2.5 px-3 text-center font-extrabold text-emerald-600">{entry.quantity}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {entry.status || 'Done'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{entry.description || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ======================== TAB 3: MONTHLY PERFORMANCE ======================== */
        <div className="space-y-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                  Monthly Performance Dashboard
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                  Month of {selectedMonth}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-3xl font-extrabold text-emerald-600">
                  {monthlyData?.monthly_total_work || 0}
                </span>
                <span className="text-[11px] text-slate-400 block font-semibold">Total Monthly Work Units</span>
              </div>
            </div>

            {/* Work Category Breakdown */}
            <div className="mt-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                Work Output by Category
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {monthlyData?.work_type_breakdown?.map((item) => (
                  <div key={item.name} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-xs font-bold text-slate-800 block truncate">{item.name}</span>
                    <span className="text-2xl font-black text-slate-900 block mt-1">{item.quantity}</span>
                    <span className="text-[10px] text-slate-400 block">units logged</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Monthly Task SLA Metrics */}
          {monthlyData?.task_metrics && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">
                Monthly Task Execution Summary
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Assigned</span>
                  <span className="text-xl font-bold text-slate-900 mt-1 block">{monthlyData.task_metrics.totalTasks}</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase block">Completed</span>
                  <span className="text-xl font-bold text-emerald-700 mt-1 block">{monthlyData.task_metrics.completed}</span>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                  <span className="text-[10px] font-bold text-blue-700 uppercase block">In Progress</span>
                  <span className="text-xl font-bold text-blue-700 mt-1 block">{monthlyData.task_metrics.inProgress}</span>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                  <span className="text-[10px] font-bold text-rose-700 uppercase block">Overdue</span>
                  <span className="text-xl font-bold text-rose-700 mt-1 block">{monthlyData.task_metrics.overdue}</span>
                </div>
                <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
                  <span className="text-[10px] font-bold text-purple-700 uppercase block">Advance Work</span>
                  <span className="text-xl font-bold text-purple-700 mt-1 block">{monthlyData.task_metrics.advanceWork}</span>
                </div>
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase block">Completion Rate</span>
                  <span className="text-xl font-bold text-indigo-700 mt-1 block">{monthlyData.task_metrics.completionRate}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Send by Email Modal */}
      <Modal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        title="Email Work Report (.xlsx)"
        subtitle="Directly deliver report with real Excel attachment via SMTP"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSendEmail} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Recipient Email <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="e.g. director@company.com, client@firm.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Email Subject
            </label>
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Cover Note / Message
            </label>
            <textarea
              rows={3}
              value={emailMessage}
              onChange={(e) => setEmailMessage(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <span>
              A native <strong>.xlsx</strong> spreadsheet will be automatically generated and attached to this email.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowEmailModal(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sendingEmail}
              className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              {sendingEmail ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Sending Email...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Report Email</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
