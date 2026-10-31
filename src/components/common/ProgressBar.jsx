import React from 'react';

export default function ProgressBar({ progress = 0, showLabel = true, size = 'md', className = '' }) {
  const clamped = Math.min(100, Math.max(0, Number(progress) || 0));

  let barColor = 'bg-blue-600';
  let textColor = 'text-blue-700';

  if (clamped >= 100) {
    barColor = 'bg-emerald-600';
    textColor = 'text-emerald-700';
  } else if (clamped >= 75) {
    barColor = 'bg-teal-600';
    textColor = 'text-teal-700';
  } else if (clamped >= 40) {
    barColor = 'bg-blue-600';
    textColor = 'text-blue-700';
  } else if (clamped > 0) {
    barColor = 'bg-amber-500';
    textColor = 'text-amber-700';
  } else {
    barColor = 'bg-slate-300';
    textColor = 'text-slate-500';
  }

  const heightClasses = size === 'xs' ? 'h-1.5' : size === 'sm' ? 'h-2' : size === 'lg' ? 'h-4' : 'h-2.5';

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center text-xs font-semibold mb-1 text-slate-600">
          <span>Progress</span>
          <span className={textColor}>{clamped}%</span>
        </div>
      )}
      <div className={`w-full bg-slate-200/80 rounded-full overflow-hidden ${heightClasses}`}>
        <div
          className={`${heightClasses} ${barColor} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
