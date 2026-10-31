import React, { useState } from 'react';
import { KeyRound, ShieldAlert, CheckCircle, LogOut } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function ForcePasswordChangeModal({ isOpen }) {
  const { user, refreshUser, logout } = useAuth();
  const { success, error } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentPassword) {
      error('Please enter your current temporary password');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      error('New password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      error('New password and confirmation do not match');
      return;
    }

    if (newPassword === currentPassword) {
      error('New password must be different from your temporary password');
      return;
    }

    setLoading(true);
    try {
      const res = await api.changePassword(currentPassword, newPassword, confirmPassword);
      success(res.message || 'Password updated successfully! Welcome to your account.');
      await refreshUser();
    } catch (err) {
      error(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-6 text-white text-center relative">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <ShieldAlert className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">
            Password Update Required
          </h2>
          <p className="text-xs text-amber-100 mt-1 max-w-xs mx-auto">
            Your password was recently reset by the administrator. Please set a new personal password to continue.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600">
            <strong>Logged in as:</strong> {user?.full_name} ({user?.employee_id || user?.email})
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Current (Temporary) Password <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter the temporary password"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              New Permanent Password <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              minLength={6}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Confirm New Password <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => confirmPassword !== e.target.value && setConfirmPassword(e.target.value)}
              placeholder="Re-enter your new password"
              minLength={6}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
            />
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <KeyRound className="w-4 h-4" />
              )}
              <span>Set Permanent Password & Continue</span>
            </button>

            <button
              type="button"
              onClick={logout}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
