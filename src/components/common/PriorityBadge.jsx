import React from 'react';
import { Flame, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';

export default function PriorityBadge({ priority, size = 'sm' }) {
  const sizeClasses = size === 'xs' ? 'text-xs px-2 py-0.5' : size === 'md' ? 'text-sm px-3 py-1' : 'text-xs px-2.5 py-0.5';

  switch (priority) {
    case 'URGENT':
      return (
        <span className={`inline-flex items-center gap-1 font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-300 ring-1 ring-rose-500/20 shadow-xs ${sizeClasses}`}>
          <Flame className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
          <span>URGENT</span>
        </span>
      );

    case 'HIGH':
      return (
        <span className={`inline-flex items-center gap-1 font-semibold rounded-full bg-orange-50 text-orange-700 border border-orange-300 ${sizeClasses}`}>
          <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
          <span>High</span>
        </span>
      );

    case 'MEDIUM':
      return (
        <span className={`inline-flex items-center gap-1 font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-300 ${sizeClasses}`}>
          <ArrowUp className="w-3.5 h-3.5 text-amber-600" />
          <span>Medium</span>
        </span>
      );

    case 'LOW':
    default:
      return (
        <span className={`inline-flex items-center gap-1 font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-200 ${sizeClasses}`}>
          <ArrowDown className="w-3.5 h-3.5 text-slate-500" />
          <span>Low</span>
        </span>
      );
  }
}
