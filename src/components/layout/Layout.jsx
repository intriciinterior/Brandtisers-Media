import React, { useState } from 'react';
import { Menu, Eye, ArrowLeft } from 'lucide-react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function Layout({
  children,
  currentTab,
  onTabChange,
  onSearchChange,
  searchTerm,
  onSelectTask
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { user, isImpersonated, originalUser, exitImpersonate } = useAuth();
  const { success, error } = useToast();
  const [exiting, setExiting] = useState(false);

  const handleReturnToMyAccount = async () => {
    setExiting(true);
    try {
      const restored = await exitImpersonate();
      success(`Returned to your account (${restored.full_name}).`);
      onTabChange('dashboard');
    } catch (err) {
      error(err.message || 'Failed to return to original account.');
    } finally {
      setExiting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row text-slate-900 font-sans">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={onTabChange}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Impersonation Banner */}
        {isImpersonated && (
          <div className="bg-amber-400 text-slate-950 px-4 py-2.5 text-xs font-semibold flex flex-wrap items-center justify-between gap-3 border-b border-amber-500 shadow-xs z-40 sticky top-0">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-slate-950 flex-shrink-0" />
              <span>
                You are viewing <strong>{user?.full_name}</strong>’s account ({user?.role?.replace('_', ' ')})
                {originalUser && (
                  <span className="opacity-80 hidden md:inline">
                    {' '}• Logged in as: {originalUser.full_name} ({originalUser.role?.replace('_', ' ')})
                  </span>
                )}
              </span>
            </div>
            <button
              onClick={handleReturnToMyAccount}
              disabled={exiting}
              className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to My Account</span>
            </button>
          </div>
        )}

        {/* Navbar */}
        <Navbar
          onSearchChange={onSearchChange}
          searchTerm={searchTerm}
          onSelectTask={onSelectTask}
          onTabChange={onTabChange}
        />

        {/* Mobile Header Bar */}
        <div className="lg:hidden flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 rounded-xl text-slate-700 hover:bg-slate-100"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-xs font-bold text-slate-700 capitalize">
            {currentTab.replace('_', ' ')}
          </span>
          <div className="w-8" />
        </div>

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
