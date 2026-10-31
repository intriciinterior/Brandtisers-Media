import React, { useState, useEffect } from 'react';
import { Server, Eye, EyeOff, Lock, User, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';

export default function LoginPage() {
  const { login } = useAuth();
  const { success, error } = useToast();

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState([]);

  useEffect(() => {
    async function loadDemos() {
      try {
        const res = await api.getDemoAccounts();
        setDemoAccounts(res.accounts || []);
      } catch (err) {
        // ignore
      }
    }
    loadDemos();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginId || !password) {
      error('Please enter both username/email and password.');
      return;
    }

    setLoading(true);
    try {
      const user = await login(loginId, password);
      success(`Welcome back, ${user.full_name}!`);
    } catch (err) {
      error(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (acc) => {
    setLoginId(acc.username);
    setPassword(acc.defaultPassword);
  };

  const handleQuickLogin = async (acc) => {
    setLoginId(acc.username);
    setPassword(acc.defaultPassword);
    setLoading(true);
    try {
      const user = await login(acc.username, acc.defaultPassword);
      success(`Logged in as ${user.full_name} (${user.role})!`);
    } catch (err) {
      error(err.message || 'Quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Icon */}
        <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/30 mb-4">
          <Server className="w-8 h-8" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          ITOps<span className="text-blue-500">Track</span>
        </h2>
        <p className="mt-1.5 text-xs text-slate-400 font-medium">
          IT Department Daily Task Management & Work Tracking
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Main Card */}
        <div className="bg-slate-800/90 backdrop-blur-md border border-slate-700/80 py-8 px-6 sm:px-8 shadow-2xl rounded-3xl">
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email / Username */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Email or Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="superadmin or rahul@itdept.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => alert('Demo Passwords:\n- Super Admin & Admin: admin123\n- Team Members: member123\n\nYou can also click any of the 1-Click Demo buttons below!')}
                  className="text-[11px] text-blue-400 hover:text-blue-300 font-medium"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-600/30 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : null}
              <span>Sign In to Dashboard</span>
            </button>
          </form>

          {/* 1-Click Demo Quick Login Section */}
          <div className="mt-6 pt-6 border-t border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                1-Click Demo Accounts
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded-full">
                Instant Access
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => handleQuickLogin(acc)}
                  className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-700/80 border border-slate-700/80 text-left transition-colors flex items-center gap-2 group cursor-pointer"
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                    style={{ backgroundColor: acc.avatar_color || '#3B82F6' }}
                  >
                    {acc.full_name.charAt(0)}
                  </div>
                  <div className="truncate">
                    <span className="block text-xs font-bold text-slate-200 group-hover:text-white truncate">
                      {acc.full_name}
                    </span>
                    <span className="block text-[10px] text-slate-400 truncate">
                      {acc.role.replace('_', ' ')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Persistence notice */}
        <p className="mt-4 text-center text-xs text-slate-500">
          Persistent SQLite Database • Role-Based Access Control • Daily Work Tracking
        </p>
      </div>
    </div>
  );
}
