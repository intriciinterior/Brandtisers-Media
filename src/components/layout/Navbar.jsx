import React, { useState, useEffect, useRef } from 'react';
import {
  Bell, Search, User, LogOut, KeyRound, CheckCheck,
  ChevronDown, Server, Clock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import Modal from '../common/Modal';

export default function Navbar({ onSearchChange, searchTerm, onSelectTask, onTabChange }) {
  const { user, logout, company } = useAuth();
  const { success, error } = useToast();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Change password modal state
  const [showPassModal, setShowPassModal] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [pendingRequestInfo, setPendingRequestInfo] = useState(null);

  // Check pending password request for employees
  useEffect(() => {
    if (showPassModal && user?.role === 'EMPLOYEE') {
      api.getPasswordRequestStatus()
        .then((res) => {
          if (res && res.has_pending) {
            setPendingRequestInfo(res.request);
          } else {
            setPendingRequestInfo(null);
          }
        })
        .catch(() => {});
    }
  }, [showPassModal, user]);

  const notifRef = useRef(null);
  const userRef = useRef(null);

  // Load notifications
  const fetchNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      // Silently catch in polling
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  // Close popups on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifDropdown(false);
      }
      if (userRef.current && !userRef.current.contains(e.target)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      success('All notifications marked as read.');
    } catch (err) {
      error('Failed to mark notifications as read.');
    }
  };

  const handleNotificationClick = async (notif) => {
    try {
      if (!notif.is_read) {
        await api.markNotificationRead(notif.id);
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: 1 } : n))
        );
      }
      setShowNotifDropdown(false);
      if (notif.type === 'PASSWORD_CHANGE_REQUEST' && onTabChange) {
        onTabChange('settings');
      } else if (notif.related_task_id && onSelectTask) {
        onSelectTask({ id: notif.related_task_id });
      }
    } catch (err) {
      // ignore
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPass || !newPass || !confirmPass) {
      error('Please fill in all password fields.');
      return;
    }
    if (newPass.length < 6) {
      error('New password must be at least 6 characters long.');
      return;
    }
    if (newPass !== confirmPass) {
      error('New password and confirm password do not match.');
      return;
    }
    if (newPass === currentPass) {
      error('New password must be different from current password.');
      return;
    }

    setPassLoading(true);
    try {
      const res = await api.changePassword(currentPass, newPass, confirmPass);
      if (res.status === 'PENDING') {
        success(res.message || 'Your password change request has been sent for approval.');
      } else {
        success(res.message || 'Password changed successfully.');
      }
      setShowPassModal(false);
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
    } catch (err) {
      error(err.message || 'Failed to change password');
    } finally {
      setPassLoading(false);
    }
  };

  const todayFormatted = new Date().toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-2.5">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Branding & Search */}
        <div className="flex items-center gap-4 flex-1 max-w-lg">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Server className="w-5 h-5" />
            </div>
            <div className="hidden sm:block min-w-0">
              <span className="font-extrabold text-slate-900 tracking-tight text-sm block leading-none truncate max-w-[160px]">
                {company?.company_name || 'IT Operations'}
              </span>
              <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase block truncate max-w-[160px] mt-0.5">
                {company?.tagline || 'Task & Work Hub'}
              </span>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm || ''}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              placeholder="Search tasks by title, client, ID, employee..."
              className="w-full pl-9 pr-3.5 py-1.5 bg-slate-100 hover:bg-slate-200/70 focus:bg-white rounded-xl text-xs border border-transparent focus:border-blue-400 focus:outline-none transition-all placeholder:text-slate-400 text-slate-800"
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Active Date Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>{todayFormatted}</span>
          </div>

          {/* In-App Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center ring-2 ring-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifDropdown && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="bg-rose-100 text-rose-700 text-[11px] font-extrabold px-2 py-0.5 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Mark all read</span>
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 italic">
                      You're all caught up! No notifications.
                    </div>
                  ) : (
                    notifications.slice(0, 15).map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`p-3.5 transition-colors cursor-pointer hover:bg-slate-50 ${
                          !n.is_read ? 'bg-blue-50/40 font-medium' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h5 className="text-xs font-bold text-slate-900">{n.title}</h5>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          <div className="relative" ref={userRef}>
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 p-1 pl-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-xs shrink-0"
                style={{ backgroundColor: user?.avatar_color || '#3B82F6' }}
              >
                {user?.full_name ? user.full_name.charAt(0) : 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <span className="text-xs font-bold text-slate-900 block leading-tight truncate max-w-[120px]">
                  {user?.full_name || 'User'}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 block leading-none">
                  {user?.role === 'SUPER_ADMIN' ? 'SUPER ADMIN' : 'EMPLOYEE'}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-900 block">{user?.full_name}</span>
                  <span className="text-[11px] text-slate-500 block truncate">{user?.email}</span>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold">
                    {user?.role === 'SUPER_ADMIN' ? 'SUPER ADMIN' : 'EMPLOYEE'}
                  </span>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      setShowPassModal(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4 text-slate-400" />
                    <span>Change Password</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition-colors mt-1 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <Modal
        isOpen={showPassModal}
        onClose={() => {
          setShowPassModal(false);
          setCurrentPass('');
          setNewPass('');
          setConfirmPass('');
        }}
        title={user?.role === 'EMPLOYEE' ? "Request Password Change" : "Change Account Password"}
        subtitle={user?.role === 'EMPLOYEE' ? "Requires Super Administrator approval before taking effect" : undefined}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          {user?.role === 'EMPLOYEE' && (
            <div>
              {pendingRequestInfo ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-800">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Pending Request in Review</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    You submitted a password change request on <strong>{new Date(pendingRequestInfo.created_at).toLocaleDateString()}</strong>. Submitting a new request now will overwrite your previous pending request.
                  </p>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900">
                  <p className="text-[11px] leading-relaxed">
                    <strong>Security Policy:</strong> For employee accounts, password updates create a <strong>Password Change Request</strong>. Once reviewed and approved by the Super Administrator, your new password will be activated.
                  </p>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Current Password <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              placeholder="Enter current password"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              New Password <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Confirm New Password <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength={6}
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setShowPassModal(false);
                setCurrentPass('');
                setNewPass('');
                setConfirmPass('');
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={passLoading}
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-md shadow-blue-500/20 cursor-pointer"
            >
              {passLoading
                ? 'Submitting...'
                : user?.role === 'EMPLOYEE'
                ? 'Submit Change Request'
                : 'Update Password'}
            </button>
          </div>
        </form>
      </Modal>
    </header>
  );
}
