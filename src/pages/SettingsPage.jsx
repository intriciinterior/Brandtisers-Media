import React, { useState, useEffect } from 'react';
import {
  Settings, Building2, User, Mail, Shield, Save, CheckCircle2,
  Send, Database, Clock, Globe, Phone, MapPin, Eye, EyeOff, Sparkles,
  Edit2, X, KeyRound, Check, XCircle, AlertTriangle, ShieldCheck, RefreshCw, History, Lock
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/common/Modal';

export default function SettingsPage() {
  const { setCompany: updateCompanyContext, refreshUser } = useAuth();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState('company'); // 'company' | 'profile' | 'email' | 'security'
  const [loading, setLoading] = useState(true);

  // 1. Company Branding Form
  const [companyForm, setCompanyForm] = useState({
    company_name: '',
    tagline: '',
    logo_url: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    time_zone: 'Asia/Kolkata'
  });
  const [savedCompanyForm, setSavedCompanyForm] = useState(null);
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);

  // 2. Super Admin Profile Form
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    username: '',
    password: '',
    avatar_color: '#3B82F6'
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // 3. Email (SMTP) Configuration Form
  const [emailForm, setEmailForm] = useState({
    smtp_host: '',
    smtp_port: 587,
    smtp_secure: 0,
    smtp_user: '',
    smtp_pass: '',
    smtp_from: '',
    smtp_from_name: ''
  });
  const [savingEmail, setSavingEmail] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 4. Password Security & Approval Requests
  const [passwordRequests, setPasswordRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestFilter, setRequestFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
  const [actionInProgressId, setActionInProgressId] = useState(null);
  const [rejectingRequest, setRejectingRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [securityAuditLogs, setSecurityAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Load all settings
  const loadAllSettings = async () => {
    setLoading(true);
    try {
      const [compRes, profRes, emailRes] = await Promise.all([
        api.getCompanySettings(),
        api.getAdminProfile().catch(() => ({ profile: {} })),
        api.getEmailSettings().catch(() => ({ emailConfig: {} }))
      ]);

      if (compRes) {
        const loadedCompany = {
          company_name: compRes.company_name || '',
          tagline: compRes.tagline || '',
          logo_url: compRes.logo_url || '',
          email: compRes.email || '',
          phone: compRes.phone || '',
          address: compRes.address || '',
          website: compRes.website || '',
          time_zone: compRes.time_zone || 'Asia/Kolkata'
        };
        setCompanyForm(loadedCompany);
        setSavedCompanyForm(loadedCompany);
      }

      if (profRes.profile) {
        setProfileForm({
          full_name: profRes.profile.full_name || '',
          email: profRes.profile.email || '',
          phone: profRes.profile.phone || '',
          username: profRes.profile.username || '',
          password: '',
          avatar_color: profRes.profile.avatar_color || '#3B82F6'
        });
      }

      if (emailRes.emailConfig) {
        setEmailForm({
          smtp_host: emailRes.emailConfig.smtp_host || '',
          smtp_port: emailRes.emailConfig.smtp_port || 587,
          smtp_secure: emailRes.emailConfig.smtp_secure ? 1 : 0,
          smtp_user: emailRes.emailConfig.smtp_user || '',
          smtp_pass: emailRes.emailConfig.smtp_pass || '',
          smtp_from: emailRes.emailConfig.smtp_from || '',
          smtp_from_name: emailRes.emailConfig.smtp_from_name || ''
        });
      }

      await Promise.all([
        loadPasswordRequests(),
        loadSecurityAuditLogs()
      ]);
    } catch (err) {
      error(err.message || 'Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  const loadPasswordRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await api.getPasswordRequests();
      setPasswordRequests(res.requests || []);
    } catch (err) {
      console.error('Failed to load password requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const loadSecurityAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const res = await api.getActivityLogs(60);
      const filtered = (res.activities || []).filter(
        (a) => a.action && a.action.startsWith('PASSWORD_')
      );
      setSecurityAuditLogs(filtered);
    } catch (err) {
      console.error('Failed to load security audit:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleApproveRequest = async (req) => {
    setActionInProgressId(req.id);
    try {
      const res = await api.approvePasswordRequest(req.id);
      success(res.message || `Password change approved for ${req.full_name}.`);
      await loadPasswordRequests();
      await loadSecurityAuditLogs();
    } catch (err) {
      error(err.message || 'Failed to approve password change request');
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleRejectConfirm = async (e) => {
    if (e) e.preventDefault();
    if (!rejectingRequest) return;
    setActionInProgressId(rejectingRequest.id);
    try {
      const res = await api.rejectPasswordRequest(rejectingRequest.id, rejectionReason.trim());
      success(res.message || `Password change rejected for ${rejectingRequest.full_name}.`);
      setRejectingRequest(null);
      setRejectionReason('');
      await loadPasswordRequests();
      await loadSecurityAuditLogs();
    } catch (err) {
      error(err.message || 'Failed to reject password change request');
    } finally {
      setActionInProgressId(null);
    }
  };

  useEffect(() => {
    loadAllSettings();
  }, []);

  // Cancel Company Editing
  const handleCancelCompany = () => {
    if (savedCompanyForm) {
      setCompanyForm({ ...savedCompanyForm });
    }
    setIsEditingCompany(false);
  };

  // Save Company Branding
  const handleSaveCompany = async (e) => {
    e.preventDefault();
    setSavingCompany(true);
    try {
      const res = await api.updateCompanySettings(companyForm);
      updateCompanyContext(res.company);
      const updated = {
        company_name: res.company?.company_name ?? companyForm.company_name,
        tagline: res.company?.tagline ?? companyForm.tagline,
        logo_url: res.company?.logo_url ?? companyForm.logo_url,
        email: res.company?.email ?? companyForm.email,
        phone: res.company?.phone ?? companyForm.phone,
        address: res.company?.address ?? companyForm.address,
        website: res.company?.website ?? companyForm.website,
        time_zone: res.company?.time_zone ?? companyForm.time_zone
      };
      setCompanyForm(updated);
      setSavedCompanyForm(updated);
      setIsEditingCompany(false);
      success('Company details and branding updated successfully!');
    } catch (err) {
      error(err.message || 'Failed to update company settings');
    } finally {
      setSavingCompany(false);
    }
  };

  // Save Super Admin Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profileForm.full_name.trim() || !profileForm.email.trim()) {
      error('Full Name and Email are required.');
      return;
    }
    setSavingProfile(true);
    try {
      const payload = { ...profileForm };
      if (!payload.password) delete payload.password;
      await api.updateAdminProfile(payload);
      await refreshUser();
      success('Super Admin profile updated!');
      setProfileForm(prev => ({ ...prev, password: '' }));
    } catch (err) {
      error(err.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  // Save Email Configuration
  const handleSaveEmail = async (e) => {
    e.preventDefault();
    setSavingEmail(true);
    try {
      await api.updateEmailSettings(emailForm);
      success('SMTP email configuration saved!');
    } catch (err) {
      error(err.message || 'Failed to save email settings');
    } finally {
      setSavingEmail(false);
    }
  };

  // Send Test Email
  const handleTestEmail = async () => {
    if (!testRecipient.trim()) {
      error('Please enter a recipient email address for testing.');
      return;
    }
    setTestingEmail(true);
    try {
      const res = await api.testEmail(testRecipient.trim());
      success(res.message || `Test email dispatched to ${testRecipient}!`);
    } catch (err) {
      error(err.message || 'Failed to dispatch test email');
    } finally {
      setTestingEmail(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-md shadow-purple-500/20">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              System Settings & Configuration
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Super Admin panel to update company identity, administrator credentials, and SMTP email services.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Configurable Without Code</span>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 max-w-fit">
        <button
          onClick={() => setActiveTab('company')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'company'
              ? 'bg-white text-blue-600 shadow-2xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Company Identity</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-white text-purple-600 shadow-2xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Super Admin Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('email')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'email'
              ? 'bg-white text-emerald-600 shadow-2xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Email & SMTP</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'security'
              ? 'bg-white text-amber-600 shadow-2xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Security & Approvals</span>
          {passwordRequests.filter(r => r.status === 'PENDING').length > 0 && (
            <span className="bg-amber-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full leading-none">
              {passwordRequests.filter(r => r.status === 'PENDING').length}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-slate-500 font-medium">Loading system configurations...</p>
        </div>
      ) : activeTab === 'company' ? (
        /* ======================== TAB 1: COMPANY BRANDING ======================== */
        <form onSubmit={handleSaveCompany} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>Company Information & Branding</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                These details dynamically appear on your dashboard, reports, login screen, and generated Excel files.
              </p>
            </div>
            {!isEditingCompany && (
              <button
                type="button"
                onClick={() => setIsEditingCompany(true)}
                className="self-start sm:self-auto px-4 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Company Name
              </label>
              <input
                type="text"
                disabled={!isEditingCompany}
                value={companyForm.company_name}
                onChange={(e) => setCompanyForm({ ...companyForm, company_name: e.target.value })}
                placeholder="e.g. BrandTisers IT Operations"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all ${
                  !isEditingCompany
                    ? 'bg-slate-50 border-slate-200 text-slate-700 cursor-default'
                    : 'bg-white border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tagline / Department Subtitle
              </label>
              <input
                type="text"
                disabled={!isEditingCompany}
                value={companyForm.tagline}
                onChange={(e) => setCompanyForm({ ...companyForm, tagline: e.target.value })}
                placeholder="e.g. Enterprise Technology Hub"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all ${
                  !isEditingCompany
                    ? 'bg-slate-50 border-slate-200 text-slate-700 cursor-default'
                    : 'bg-white border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Official Company Email
              </label>
              <input
                type="email"
                disabled={!isEditingCompany}
                value={companyForm.email}
                onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                placeholder="contact@company.com"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all ${
                  !isEditingCompany
                    ? 'bg-slate-50 border-slate-200 text-slate-700 cursor-default'
                    : 'bg-white border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Official Contact Phone
              </label>
              <input
                type="tel"
                disabled={!isEditingCompany}
                value={companyForm.phone}
                onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all ${
                  !isEditingCompany
                    ? 'bg-slate-50 border-slate-200 text-slate-700 cursor-default'
                    : 'bg-white border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Website URL
              </label>
              <input
                type="url"
                disabled={!isEditingCompany}
                value={companyForm.website}
                onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                placeholder="https://company.com"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all ${
                  !isEditingCompany
                    ? 'bg-slate-50 border-slate-200 text-slate-700 cursor-default'
                    : 'bg-white border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Time Zone
              </label>
              <select
                disabled={!isEditingCompany}
                value={companyForm.time_zone}
                onChange={(e) => setCompanyForm({ ...companyForm, time_zone: e.target.value })}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all bg-white ${
                  !isEditingCompany
                    ? 'bg-slate-50 border-slate-200 text-slate-700 cursor-default'
                    : 'border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500'
                }`}
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                <option value="UTC">UTC (Coordinated Universal Time)</option>
                <option value="America/New_York">America/New York (EST/EDT)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST +4:00)</option>
                <option value="Asia/Singapore">Asia/Singapore (SGT +8:00)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Logo Image URL (Optional)
            </label>
            <input
              type="text"
              disabled={!isEditingCompany}
              value={companyForm.logo_url}
              onChange={(e) => setCompanyForm({ ...companyForm, logo_url: e.target.value })}
              placeholder="https://example.com/logo.png"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all ${
                !isEditingCompany
                  ? 'bg-slate-50 border-slate-200 text-slate-700 cursor-default'
                  : 'bg-white border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Headquarters / Office Address
            </label>
            <textarea
              rows={2}
              disabled={!isEditingCompany}
              value={companyForm.address}
              onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
              placeholder="Headquarters address line..."
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-all resize-none ${
                !isEditingCompany
                  ? 'bg-slate-50 border-slate-200 text-slate-700 cursor-default'
                  : 'bg-white border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500'
              }`}
            />
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            {!isEditingCompany ? (
              <button
                type="button"
                onClick={() => setIsEditingCompany(true)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Edit2 className="w-4 h-4" />
                <span>Edit</span>
              </button>
            ) : (
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleCancelCompany}
                  disabled={savingCompany}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
                <button
                  type="submit"
                  disabled={savingCompany}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingCompany ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
            )}
          </div>
        </form>
      ) : activeTab === 'profile' ? (
        /* ======================== TAB 2: SUPER ADMIN PROFILE ======================== */
        <form onSubmit={handleSaveProfile} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-purple-600" />
              <span>Super Administrator Credentials</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage your personal credentials, contact email, and login password.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={profileForm.full_name}
                onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Admin Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Login Username
              </label>
              <input
                type="text"
                required
                value={profileForm.username}
                onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                placeholder="+91 98765 00000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              New Password (Optional)
            </label>
            <input
              type="password"
              value={profileForm.password}
              onChange={(e) => setProfileForm({ ...profileForm, password: e.target.value })}
              placeholder="Leave blank to keep your current password"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={savingProfile}
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-purple-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingProfile ? 'Saving...' : 'Update Admin Profile'}</span>
            </button>
          </div>
        </form>
      ) : activeTab === 'email' ? (
        /* ======================== TAB 3: EMAIL (SMTP) SETTINGS ======================== */
        <div className="space-y-6">
          <form onSubmit={handleSaveEmail} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-600" />
                <span>SMTP Email Server Configuration</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure your SMTP server so the application can directly send Excel reports to clients and managers.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  SMTP Host Server
                </label>
                <input
                  type="text"
                  value={emailForm.smtp_host}
                  onChange={(e) => setEmailForm({ ...emailForm, smtp_host: e.target.value })}
                  placeholder="smtp.gmail.com or mail.yourdomain.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  SMTP Port
                </label>
                <input
                  type="number"
                  value={emailForm.smtp_port}
                  onChange={(e) => setEmailForm({ ...emailForm, smtp_port: Number(e.target.value) })}
                  placeholder="587 or 465"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  SMTP Username / Email
                </label>
                <input
                  type="text"
                  value={emailForm.smtp_user}
                  onChange={(e) => setEmailForm({ ...emailForm, smtp_user: e.target.value })}
                  placeholder="notifications@yourdomain.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="relative">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  SMTP Password / App Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={emailForm.smtp_pass}
                  onChange={(e) => setEmailForm({ ...emailForm, smtp_pass: e.target.value })}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-8 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Sender "From" Address
                </label>
                <input
                  type="email"
                  value={emailForm.smtp_from}
                  onChange={(e) => setEmailForm({ ...emailForm, smtp_from: e.target.value })}
                  placeholder="reports@yourdomain.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Sender Display Name
                </label>
                <input
                  type="text"
                  value={emailForm.smtp_from_name}
                  onChange={(e) => setEmailForm({ ...emailForm, smtp_from_name: e.target.value })}
                  placeholder="IT Operations Reports"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={Boolean(emailForm.smtp_secure)}
                onChange={(e) => setEmailForm({ ...emailForm, smtp_secure: e.target.checked ? 1 : 0 })}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs font-semibold text-slate-700">
                Use Secure Connection (SSL/TLS - typically Port 465)
              </span>
            </label>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="submit"
                disabled={savingEmail}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingEmail ? 'Saving...' : 'Save SMTP Settings'}</span>
              </button>
            </div>
          </form>

          {/* Test Email Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-600" />
              <span>Verify SMTP Configuration (Send Test Email)</span>
            </h4>
            <p className="text-xs text-slate-500">
              Test your email server connection and ensure deliverability before emailing client reports.
            </p>

            <div className="flex gap-3 max-w-md">
              <input
                type="email"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                placeholder="your.email@domain.com"
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleTestEmail}
                disabled={testingEmail}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {testingEmail ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Send Test</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ======================== TAB 4: SECURITY & PASSWORD REQUESTS ======================== */
        <div className="space-y-6">
          {/* Security Overview Info Card */}
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Password & Access Security Governance
                </h3>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  Employee password changes require administrator review and approval. All stored credentials are encrypted with one-way salted bcrypt hashing. Plain-text passwords are never stored, logged, or visible.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                loadPasswordRequests();
                loadSecurityAuditLogs();
              }}
              className="px-3.5 py-2 rounded-xl border border-amber-300 bg-white hover:bg-amber-50 text-amber-900 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingRequests ? 'animate-spin text-amber-600' : ''}`} />
              <span>Refresh Queue</span>
            </button>
          </div>

          {/* 1. PASSWORD REQUESTS TABLE (Settings -> Security -> Password Requests) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-600" />
                  <span>Password Change Requests</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Approve or reject employee requested password changes. Approved requests activate the new password hash immediately.
                </p>
              </div>

              {/* Status filter chips */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setRequestFilter('ALL')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    requestFilter === 'ALL'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({passwordRequests.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRequestFilter('PENDING')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    requestFilter === 'PENDING'
                      ? 'bg-white text-amber-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pending ({passwordRequests.filter(r => r.status === 'PENDING').length})
                </button>
                <button
                  type="button"
                  onClick={() => setRequestFilter('APPROVED')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    requestFilter === 'APPROVED'
                      ? 'bg-white text-emerald-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Approved ({passwordRequests.filter(r => r.status === 'APPROVED').length})
                </button>
                <button
                  type="button"
                  onClick={() => setRequestFilter('REJECTED')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    requestFilter === 'REJECTED'
                      ? 'bg-white text-rose-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Rejected ({passwordRequests.filter(r => r.status === 'REJECTED').length})
                </button>
              </div>
            </div>

            {loadingRequests ? (
              <div className="py-12 flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mb-2" />
                <span className="text-xs text-slate-500 font-medium">Loading password requests...</span>
              </div>
            ) : passwordRequests.filter(r => requestFilter === 'ALL' || r.status === requestFilter).length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs italic">
                No password change requests found matching this filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse min-w-[750px]">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4">Employee</th>
                      <th className="py-3.5 px-4">Employee ID</th>
                      <th className="py-3.5 px-4">Requested On</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {passwordRequests
                      .filter(r => requestFilter === 'ALL' || r.status === requestFilter)
                      .map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Employee */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-2xs shrink-0"
                                style={{ backgroundColor: req.avatar_color || '#3B82F6' }}
                              >
                                {req.full_name?.charAt(0) || 'E'}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block leading-tight">
                                  {req.full_name}
                                </span>
                                <span className="text-[11px] text-slate-500 block">
                                  {req.email}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Employee ID */}
                          <td className="py-3.5 px-4 font-mono text-xs font-bold text-slate-700">
                            {req.employee_id}
                          </td>

                          {/* Requested On */}
                          <td className="py-3.5 px-4 text-xs text-slate-600">
                            <div className="font-medium text-slate-800">
                              {new Date(req.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            {req.status === 'PENDING' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                                <span>Pending Approval</span>
                              </span>
                            )}
                            {req.status === 'APPROVED' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Approved</span>
                              </span>
                            )}
                            {req.status === 'REJECTED' && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                <span>Rejected</span>
                              </span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            {req.status === 'PENDING' ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleApproveRequest(req)}
                                  disabled={actionInProgressId === req.id}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                  title="Approve Password Change"
                                >
                                  {actionInProgressId === req.id ? (
                                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5" />
                                  )}
                                  <span>Approve</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setRejectingRequest(req)}
                                  disabled={actionInProgressId === req.id}
                                  className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/70 text-rose-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                  title="Reject Password Change"
                                >
                                  <X className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Reject</span>
                                </button>
                              </div>
                            ) : req.status === 'APPROVED' ? (
                              <div className="text-right">
                                <span className="text-xs font-semibold text-slate-700 block">
                                  Reviewed by {req.reviewer_name || 'Super Admin'}
                                </span>
                                <span className="text-[10px] text-slate-400 block">
                                  {req.reviewed_at ? new Date(req.reviewed_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                              </div>
                            ) : (
                              <div className="text-right">
                                <span className="text-xs font-semibold text-rose-700 block">
                                  {req.rejection_reason ? `Reason: ${req.rejection_reason}` : 'Rejected'}
                                </span>
                                <span className="text-[10px] text-slate-400 block">
                                  {req.reviewed_at ? new Date(req.reviewed_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 2. ACTIVITY LOG (Requirement 7) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3">
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-600" />
                  <span>Password Security Audit Trail</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Immutable record of all password reset actions, requests, approvals, and rejections.
                </p>
              </div>
            </div>

            {loadingAudit ? (
              <div className="py-10 flex flex-col items-center justify-center">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
                <span className="text-xs text-slate-500">Loading audit log...</span>
              </div>
            ) : securityAuditLogs.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs italic">
                No password audit entries recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Target Employee / Details</th>
                      <th className="py-3 px-4">Reviewed / Initiated By</th>
                      <th className="py-3 px-4 text-right">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {securityAuditLogs.map((log) => {
                      let badge = 'bg-slate-100 text-slate-700';
                      let actionLabel = log.action;
                      if (log.action === 'PASSWORD_RESET_ADMIN') {
                        badge = 'bg-amber-100 text-amber-800 border border-amber-200';
                        actionLabel = 'Admin Password Reset';
                      } else if (log.action === 'PASSWORD_CHANGE_REQUEST_CREATED') {
                        badge = 'bg-blue-100 text-blue-800 border border-blue-200';
                        actionLabel = 'Change Request Created';
                      } else if (log.action === 'PASSWORD_CHANGE_APPROVED') {
                        badge = 'bg-emerald-100 text-emerald-800 border border-emerald-200';
                        actionLabel = 'Change Request Approved';
                      } else if (log.action === 'PASSWORD_CHANGE_REJECTED') {
                        badge = 'bg-rose-100 text-rose-800 border border-rose-200';
                        actionLabel = 'Change Request Rejected';
                      }

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${badge}`}>
                              {actionLabel}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-700 font-medium">
                            {log.details}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {log.user_name ? `${log.user_name} (${log.user_role?.replace('_', ' ') || 'Staff'})` : 'System'}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-500 font-mono">
                            {new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject Password Request Modal */}
      <Modal
        isOpen={Boolean(rejectingRequest)}
        onClose={() => {
          setRejectingRequest(null);
          setRejectionReason('');
        }}
        title={`Reject Password Request: ${rejectingRequest?.full_name}`}
        subtitle={`Employee ID: ${rejectingRequest?.employee_id}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleRejectConfirm} className="space-y-4">
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
            <div>
              <strong>Rejection Notice:</strong> Rejecting this request will keep the employee's current password unchanged. The employee will be notified with the reason you provide below.
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Rejection Reason (Optional)
            </label>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Please verify identity with your manager, or use corporate VPN..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setRejectingRequest(null);
                setRejectionReason('');
              }}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionInProgressId === rejectingRequest?.id}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {actionInProgressId === rejectingRequest?.id ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <X className="w-3.5 h-3.5" />
              )}
              <span>Confirm Rejection</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
