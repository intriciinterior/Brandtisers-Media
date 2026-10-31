import React from 'react';
import {
  LayoutDashboard, CheckSquare, ListTodo, Users, BarChart3,
  Bell, History, Settings, ChevronRight, ShieldCheck, Database,
  Building2, Tag, FileSpreadsheet
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ currentTab, onTabChange, isMobileOpen, onCloseMobile }) {
  const { user, isSuperAdmin, isEmployee, company } = useAuth();

  const employeeNavItems = [
    {
      id: 'dashboard',
      label: "Today's Work",
      icon: CheckSquare
    },
    {
      id: 'my_monthly_work',
      label: 'My Monthly Work',
      icon: BarChart3
    },
    {
      id: 'work_reports',
      label: 'Submit Work Report',
      icon: FileSpreadsheet
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell
    }
  ];

  const adminNavItems = [
    {
      id: 'dashboard',
      label: 'Daily Dashboard',
      icon: LayoutDashboard
    },
    {
      id: 'todays_tasks',
      label: "Today's Tasks",
      icon: CheckSquare
    },
    {
      id: 'all_tasks',
      label: 'All Tasks & History',
      icon: ListTodo
    },
    {
      id: 'clients',
      label: 'Client Accounts',
      icon: Building2
    },
    {
      id: 'team',
      label: 'IT Employees',
      icon: Users
    },
    {
      id: 'work_types',
      label: 'Work Categories',
      icon: Tag
    },
    {
      id: 'work_reports',
      label: 'Work Reports (Excel)',
      icon: FileSpreadsheet
    },
    {
      id: 'reports',
      label: 'Analytics & Audits',
      icon: BarChart3
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell
    },
    {
      id: 'activity',
      label: 'Activity Audit Log',
      icon: History
    },
    {
      id: 'settings',
      label: 'System Settings',
      icon: Settings
    }
  ];

  const visibleItems = isEmployee ? employeeNavItems : adminNavItems;

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex-1 overflow-y-auto">
          {/* Header Brand */}
          <div className="p-5 flex items-center gap-3 border-b border-slate-800">
            {company?.logo_url ? (
              <img
                src={company.logo_url}
                alt="Logo"
                className="w-10 h-10 rounded-xl object-contain bg-white/10 p-1"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-extrabold text-white text-sm tracking-tight leading-tight truncate">
                {company?.company_name || 'IT Operations'}
              </h1>
              <p className="text-[10px] font-semibold text-slate-400 truncate">
                {company?.tagline || 'Task & Work Hub'}
              </p>
            </div>
          </div>

          {/* Current User Role Pill */}
          <div className="mx-4 my-3 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
            <div className="flex items-center gap-2.5">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ backgroundColor: user?.avatar_color || '#3B82F6' }}
              >
                {user?.full_name ? user.full_name.charAt(0) : 'U'}
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-bold text-white truncate">
                  {user?.full_name}
                </span>
                <span className="block text-[10px] font-semibold text-blue-400 truncate">
                  {user?.role === 'SUPER_ADMIN' ? 'SUPER ADMIN' : 'EMPLOYEE'}
                </span>
              </div>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="p-3 space-y-1">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-extrabold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/80" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer info: persistent DB status */}
        <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500 shrink-0">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px]">Database Persistent (SQLite)</span>
          </div>
          <p className="text-slate-500 truncate">{company?.company_name || 'IT Operations Hub'}</p>
        </div>
      </aside>
    </>
  );
}
