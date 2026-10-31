import React from 'react';
import { AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react';
import Modal from './Modal';

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger', // danger | warning | info
  loading = false,
  children
}) {
  let Icon = AlertTriangle;
  let iconBg = 'bg-rose-100 text-rose-600';
  let confirmBtnClass = 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200';

  if (type === 'warning') {
    Icon = AlertCircle;
    iconBg = 'bg-amber-100 text-amber-600';
    confirmBtnClass = 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200';
  } else if (type === 'info') {
    Icon = HelpCircle;
    iconBg = 'bg-blue-100 text-blue-600';
    confirmBtnClass = 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200';
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="flex flex-col items-center text-center py-2">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${iconBg}`}>
          <Icon className="w-6 h-6" />
        </div>
        <p className="text-sm text-slate-600 mb-4 leading-relaxed font-normal">
          {message}
        </p>
        
        {children && <div className="w-full text-left mb-4">{children}</div>}

        <div className="flex items-center gap-3 w-full mt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${confirmBtnClass}`}
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : null}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
