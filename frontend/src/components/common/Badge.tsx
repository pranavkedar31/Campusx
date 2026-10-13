import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'cyan' | 'blue' | 'emerald' | 'amber' | 'rose' | 'slate' | 'purple';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'cyan',
  size = 'sm',
}) => {
  const styles = {
    cyan: 'bg-cyan-950/80 text-cyan-400 border-cyan-800/80',
    blue: 'bg-blue-950/80 text-blue-400 border-blue-800/80',
    emerald: 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80',
    amber: 'bg-amber-950/80 text-amber-400 border-amber-800/80',
    rose: 'bg-rose-950/80 text-rose-400 border-rose-800/80',
    slate: 'bg-slate-800 text-slate-300 border-slate-700',
    purple: 'bg-purple-950/80 text-purple-400 border-purple-800/80',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-full border ${styles[variant]} ${sizes[size]}`}
    >
      {children}
    </span>
  );
};
