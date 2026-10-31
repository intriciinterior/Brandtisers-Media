import React, { useState } from 'react';
import { KeyRound, Sparkles, Copy, Check, AlertTriangle, ShieldCheck, Lock } from 'lucide-react';
import Modal from '../common/Modal';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';

export default function ResetPasswordModal({ isOpen, onClose, member, onPasswordReset }) {
  const { success, error } = useToast();
  const [mode, setMode] = useState('generate'); // 'generate' | 'custom'
  const [customPassword, setCustomPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { temporary_password: '' }
  const [copied, setCopied] = useState(false);

  // Reset internal state when modal closes or opens
  const handleClose = () => {
    setMode('generate');
    setCustomPassword('');
    setLoading(false);
    setResult(null);
    setCopied(false);
    onClose();
  };

  const handleCopy = () => {
    if (result?.temporary_password) {
      navigator.clipboard.writeText(result.temporary_password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      success('Temporary password copied to clipboard');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!member) return;

    if (mode === 'custom' && (!customPassword || customPassword.length < 6)) {
      error('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      const payload = mode === 'generate'
        ? { generate_random: true }
        : { temporary_password: customPassword };

      const res = await api.resetUserPassword(member.id, payload);
      setResult({
        temporary_password: res.temporary_password,
        message: res.message
      });
      success(`Password reset successful for ${member.full_name}`);
      if (onPasswordReset) onPasswordReset();
    } catch (err) {
      error(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (!member) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={result ? "Password Reset Complete" : `Reset Password: ${member.full_name}`}
      subtitle={`Employee ID: ${member.employee_id} • ${member.department || 'IT Operations'}`}
      maxWidth="max-w-md"
    >
      {result ? (
        <div className="space-y-5">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-900 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            <div className="text-xs leading-relaxed">
              <span className="font-bold block text-sm text-emerald-800 mb-0.5">Temporary Password Created</span>
              The employee's password has been updated. They will be forced to change this temporary password upon their next login.
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Temporary Password (Displayed Once)
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-900 text-amber-400 font-mono text-base font-bold px-4 py-3 rounded-xl tracking-wider select-all overflow-x-auto border border-slate-800">
                {result.temporary_password}
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="px-3.5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors border border-slate-200 shrink-0 cursor-pointer"
                title="Copy Temporary Password"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-600" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <strong>Important:</strong> This password will <strong>never be shown again</strong>. Please copy and provide it directly to the employee. Existing sessions for this employee have been invalidated.
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Done & Close
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Choose Reset Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('generate')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  mode === 'generate'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs mb-1">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Generate Password</span>
                </div>
                <div className="text-[11px] text-slate-500 leading-snug">
                  Create a secure random temporary password
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('custom')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  mode === 'custom'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs mb-1">
                  <Lock className="w-4 h-4 text-blue-600" />
                  <span>Set New Password</span>
                </div>
                <div className="text-[11px] text-slate-500 leading-snug">
                  Enter a specific temporary password manually
                </div>
              </button>
            </div>
          </div>

          {mode === 'custom' && (
            <div className="space-y-1.5 animate-in fade-in duration-150">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                New Temporary Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                value={customPassword}
                onChange={(e) => setCustomPassword(e.target.value)}
                placeholder="Enter at least 6 characters"
                minLength={6}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <p className="text-[11px] text-slate-500">
                Minimum 6 characters. The employee must change this password upon their next login.
              </p>
            </div>
          )}

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 flex items-start gap-2.5">
            <KeyRound className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
            <div>
              <strong>Security Policy:</strong> Passwords are never stored in plain text. Stored hashes cannot be viewed. The generated temporary password will be presented to you once.
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <KeyRound className="w-4 h-4" />
              )}
              <span>{mode === 'generate' ? 'Generate & Reset Password' : 'Set Temporary Password'}</span>
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
