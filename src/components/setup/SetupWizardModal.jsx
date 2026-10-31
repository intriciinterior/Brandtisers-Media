import React, { useState } from 'react';
import {
  Building2, User, Sparkles, CheckCircle2, Globe, Mail, Phone,
  MapPin, Clock, ShieldCheck, ArrowRight, Plus, X
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function SetupWizardModal({ isOpen, onClose }) {
  const { setCompany, refreshUser } = useAuth();
  const { success, error } = useToast();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [tagline, setTagline] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [timeZone, setTimeZone] = useState('Asia/Kolkata');

  // Super Admin Profile State
  const [adminName, setAdminName] = useState('Super Administrator');
  const [adminEmail, setAdminEmail] = useState('admin@company.com');
  const [adminMobile, setAdminMobile] = useState('');
  const [adminUsername, setAdminUsername] = useState('superadmin');
  const [newPassword, setNewPassword] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');

  // Initial Work Types
  const [selectedWorkTypes, setSelectedWorkTypes] = useState([
    'Website',
    'Development',
    'Client Support',
    'Testing',
    'Graphic Design',
    'Video Editing'
  ]);
  const [customWorkType, setCustomWorkType] = useState('');

  const availableWorkTypes = [
    'Website',
    'Development',
    'Client Support',
    'Testing',
    'Graphic Design',
    'Video Editing',
    'Social Media',
    'SEO',
    'AI Work',
    'Network / Hardware',
    'Database Administration',
    'Server Management'
  ];

  if (!isOpen) return null;

  const toggleWorkType = (wt) => {
    if (selectedWorkTypes.includes(wt)) {
      setSelectedWorkTypes(selectedWorkTypes.filter(item => item !== wt));
    } else {
      setSelectedWorkTypes([...selectedWorkTypes, wt]);
    }
  };

  const handleAddCustomWorkType = () => {
    if (customWorkType.trim() && !selectedWorkTypes.includes(customWorkType.trim())) {
      setSelectedWorkTypes([...selectedWorkTypes, customWorkType.trim()]);
      setCustomWorkType('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!companyName.trim()) {
      error('Company Name is required to set up your workspace.');
      setStep(1);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        company_name: companyName.trim(),
        logo_url: logoUrl.trim(),
        tagline: tagline.trim(),
        company_email: companyEmail.trim(),
        company_phone: companyPhone.trim(),
        company_address: companyAddress.trim(),
        website: website.trim(),
        time_zone: timeZone.trim(),
        admin_name: adminName.trim(),
        admin_email: adminEmail.trim(),
        admin_mobile: adminMobile.trim(),
        admin_username: adminUsername.trim(),
        new_password: newPassword.trim(),
        profile_photo: profilePhoto.trim(),
        initial_work_types: selectedWorkTypes
      };

      const res = await api.initialSetup(payload);
      setCompany(res.company);
      await refreshUser();
      success(`System configured successfully for ${res.company.company_name}!`);
      if (onClose) onClose();
    } catch (err) {
      error(err.message || 'Failed to complete setup');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white backdrop-blur-xs shadow-xs">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                Initial System Setup Wizard
              </h2>
              <p className="text-xs text-blue-100">
                Configure your IT organization branding and initial settings.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-white/20 rounded-full">
            Step {step} of 3
          </span>
        </div>

        {/* Step Progress Indicators */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 py-2.5 gap-4 text-xs font-semibold select-none">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`flex items-center gap-1.5 transition-colors ${step === 1 ? 'text-blue-600 font-bold' : 'text-slate-500'}`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step === 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>1</span>
            Company Information
          </button>
          <span className="text-slate-300">/</span>
          <button
            type="button"
            onClick={() => {
              if (!companyName.trim()) {
                error('Please enter Company Name first');
                return;
              }
              setStep(2);
            }}
            className={`flex items-center gap-1.5 transition-colors ${step === 2 ? 'text-blue-600 font-bold' : 'text-slate-500'}`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step === 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>2</span>
            Super Admin Profile
          </button>
          <span className="text-slate-300">/</span>
          <button
            type="button"
            onClick={() => {
              if (!companyName.trim()) {
                error('Please enter Company Name first');
                return;
              }
              setStep(3);
            }}
            className={`flex items-center gap-1.5 transition-colors ${step === 3 ? 'text-blue-600 font-bold' : 'text-slate-500'}`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step === 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>3</span>
            Work Categories
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* STEP 1: COMPANY INFORMATION */}
          {step === 1 && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              <div className="bg-blue-50/60 p-3 rounded-lg border border-blue-100 text-xs text-blue-800">
                Enter your genuine company details. These will automatically appear across the dashboard, reports, login screen, and generated Excel files.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Company Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. BrandTisers IT Operations"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Company Tagline / Subtitle
                  </label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="e.g. Enterprise Technology & Deliverables"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Company Logo URL
                  </label>
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Official Email Address
                  </label>
                  <input
                    type="email"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    placeholder="contact@company.com"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Official Phone / Hotline
                  </label>
                  <input
                    type="tel"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Website Address
                  </label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://www.company.com"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Operational Time Zone
                  </label>
                  <select
                    value={timeZone}
                    onChange={(e) => setTimeZone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Office Address
                </label>
                <textarea
                  rows={2}
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  placeholder="Headquarters address line..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white resize-none"
                />
              </div>
            </div>
          )}

          {/* STEP 2: SUPER ADMIN PROFILE */}
          {step === 2 && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              <div className="bg-indigo-50/60 p-3 rounded-lg border border-indigo-100 text-xs text-indigo-800">
                Update your Super Administrator credentials. You will use these details to log in and manage the department.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Super Admin Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Admin Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Admin Username <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={adminMobile}
                    onChange={(e) => setAdminMobile(e.target.value)}
                    placeholder="+91 98765 00000"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Change Password (Optional)
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Leave blank to keep admin123"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Profile Photo URL
                  </label>
                  <input
                    type="text"
                    value={profilePhoto}
                    onChange={(e) => setProfilePhoto(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: INITIAL WORK TYPES */}
          {step === 3 && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-100 text-xs text-emerald-800">
                Select the work categories your IT team handles, or add custom ones. You can edit, add, or delete any work category anytime in <strong>Settings → Work Types</strong>.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Select Work Categories ({selectedWorkTypes.length} selected):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {availableWorkTypes.map(wt => {
                    const isChecked = selectedWorkTypes.includes(wt);
                    return (
                      <button
                        key={wt}
                        type="button"
                        onClick={() => toggleWorkType(wt)}
                        className={`p-2 rounded-lg border text-xs font-medium text-left flex items-center justify-between transition-colors cursor-pointer ${
                          isChecked
                            ? 'bg-blue-50 border-blue-400 text-blue-800 font-bold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span>{wt}</span>
                        {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Add Custom Work Type */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Add Custom Work Category:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customWorkType}
                    onChange={(e) => setCustomWorkType(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomWorkType();
                      }
                    }}
                    placeholder="e.g. AI Video Editing, DevOps, Cloud Migration..."
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomWorkType}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
              >
                Back
              </button>
            ) : (
              <span className="text-[11px] text-slate-600 font-medium">
                Mandatory First-Time Setup
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1 && !companyName.trim()) {
                    error('Please enter Company Name to proceed.');
                    return;
                  }
                  setStep(step + 1);
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <span>Continue to Step {step + 1}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{submitting ? 'Configuring System...' : 'Save Configuration & Launch IT Operations'}</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
