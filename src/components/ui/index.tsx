import React from 'react';
import { CheckCircle, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import type { ToastType } from '../../types';

// ============ BUTTON ============
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'glow';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  variant = 'primary', size = 'md', loading, icon, children, className = '', disabled, ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center font-semibold rounded-2xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-950 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] select-none';
  const variants: Record<string, string> = {
    primary: 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-dark-950 hover:from-emerald-400 hover:to-teal-400 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 focus:ring-emerald-400',
    secondary: 'bg-white/10 hover:bg-white/15 text-white border border-white/15 backdrop-blur-md focus:ring-cyan-400',
    outline: 'border border-white/20 hover:border-emerald-400/60 bg-dark-900/40 hover:bg-emerald-500/10 text-slate-200 hover:text-emerald-300 focus:ring-emerald-400 backdrop-blur-md',
    ghost: 'text-slate-300 hover:text-white hover:bg-white/10 focus:ring-slate-400',
    danger: 'bg-gradient-to-r from-red-600 to-rose-700 text-white hover:from-red-500 hover:to-rose-600 shadow-lg shadow-red-500/25 hover:shadow-red-500/40 focus:ring-red-400',
    success: 'bg-gradient-to-r from-teal-500 to-emerald-600 text-dark-950 font-bold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 focus:ring-emerald-400',
    glow: 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:from-cyan-400 hover:to-blue-500 focus:ring-cyan-400',
  };
  const sizes: Record<string, string> = {
    sm: 'px-3.5 py-1.5 text-xs gap-1.5',
    md: 'px-5 py-2.5 text-sm gap-2',
    lg: 'px-7 py-3.5 text-base gap-2.5',
  };
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} disabled={disabled || loading} {...props}>
      {loading ? <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" /> : icon}
      {children}
    </button>
  );
}

// ============ CARD ============
interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg' | 'none';
  onClick?: () => void;
}

export function Card({ children, className = '', hover, padding = 'md', onClick }: CardProps) {
  const pads: Record<string, string> = { none: 'p-0', sm: 'p-3.5', md: 'p-5 md:p-6', lg: 'p-6 md:p-8' };
  return (
    <div
      className={`bg-dark-850/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-xl ${hover ? 'hover:border-emerald-500/40 hover:bg-dark-800/90 hover:shadow-glow-green hover:-translate-y-0.5 cursor-pointer transition-all duration-300' : ''} ${pads[padding]} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    >
      {children}
    </div>
  );
}

// ============ BADGE ============
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'glow';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  className?: string;
}

export function Badge({ children, variant = 'default', size = 'sm', icon, className = '' }: BadgeProps) {
  const variants: Record<string, string> = {
    default: 'bg-white/10 text-slate-200 border-white/15',
    success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-sm shadow-emerald-500/10',
    warning: 'bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-sm shadow-amber-500/10',
    danger: 'bg-red-500/15 text-red-300 border-red-500/30 shadow-sm shadow-red-500/10',
    info: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 shadow-sm shadow-cyan-500/10',
    neutral: 'bg-slate-800/60 text-slate-300 border-slate-700/50',
    glow: 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-300 border-emerald-400/40 shadow-glow-green',
  };
  const sizes: Record<string, string> = { sm: 'px-2.5 py-0.5 text-xs', md: 'px-3.5 py-1 text-xs md:text-sm' };
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full border backdrop-blur-md ${variants[variant]} ${sizes[size]} ${className}`}>
      {icon}{children}
    </span>
  );
}

// ============ MODAL ============
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null;
  const sizes: Record<string, string> = {
    sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl',
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="fixed inset-0 bg-dark-950/80 backdrop-blur-md transition-opacity animate-fade-in" onClick={onClose} />
      <div className={`relative bg-dark-900 border border-white/15 rounded-t-3xl sm:rounded-3xl shadow-modal w-full ${sizes[size]} max-h-[90vh] overflow-y-auto animate-slide-up z-10`}>
        {/* Mobile handle indicator */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-white/20 rounded-full" />
        </div>
        {title && (
          <div className="flex items-center justify-between p-5 border-b border-white/10">
            <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
            <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors" aria-label="Close dialog">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="p-5 md:p-6 text-slate-200">{children}</div>
      </div>
    </div>
  );
}

// ============ INPUT ============
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function Input({ label, error, icon, className = '', id, ...props }: InputProps) {
  const inputId = id || `input-${label?.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="space-y-1.5">
      {label && <label htmlFor={inputId} className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">{label}</label>}
      <div className="relative">
        {icon && <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>}
        <input
          id={inputId}
          className={`w-full rounded-2xl border border-white/15 bg-dark-950/70 px-4 py-3 text-white placeholder:text-slate-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 focus:outline-none transition-all ${icon ? 'pl-11' : ''} ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-400/20' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-400" role="alert">{error}</p>}
    </div>
  );
}

// ============ SELECT ============
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, className = '', id, ...props }: SelectProps) {
  const selectId = id || `select-${label?.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="space-y-1.5">
      {label && <label htmlFor={selectId} className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">{label}</label>}
      <select
        id={selectId}
        className={`w-full rounded-2xl border border-white/15 bg-dark-950/80 px-4 py-3 text-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 focus:outline-none transition-all ${className}`}
        {...props}
      >
        {options.map(o => <option key={o.value} value={o.value} className="bg-dark-900 text-white">{o.label}</option>)}
      </select>
    </div>
  );
}

// ============ TOGGLE ============
interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
}

export function Toggle({ label, checked, onChange, description }: ToggleProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-950 focus:ring-emerald-400 ${checked ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-glow-green' : 'bg-slate-700'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-md ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
      <div>
        <span className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">{label}</span>
        {description && <p className="text-xs text-slate-400">{description}</p>}
      </div>
    </label>
  );
}

// ============ PROGRESS BAR ============
interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  color?: string;
  showValue?: boolean;
  size?: 'sm' | 'md';
}

export function ProgressBar({ value, max = 100, label, color, showValue = true, size = 'md' }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const barColor = color || (pct >= 80 ? 'bg-gradient-to-r from-emerald-400 to-teal-400 shadow-glow-green' : pct >= 50 ? 'bg-gradient-to-r from-amber-400 to-orange-400' : 'bg-gradient-to-r from-red-500 to-rose-500');
  const heights: Record<string, string> = { sm: 'h-1.5', md: 'h-2.5' };
  return (
    <div className="space-y-1.5">
      {(label || showValue) && (
        <div className="flex justify-between text-xs font-semibold">
          {label && <span className="text-slate-300">{label}</span>}
          {showValue && <span className="text-emerald-400">{Math.round(value)}%</span>}
        </div>
      )}
      <div className={`w-full ${heights[size]} bg-dark-950 rounded-full overflow-hidden border border-white/10 p-0.5`}>
        <div className={`h-full ${barColor} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} />
      </div>
    </div>
  );
}

// ============ RADIAL SCORE ============
interface RadialScoreProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  showLabel?: boolean;
}

export function RadialScore({ score, size = 'md', label, showLabel = true }: RadialScoreProps) {
  const dims: Record<string, { w: number; r: number; stroke: number; text: string }> = {
    sm: { w: 48, r: 18, stroke: 3.5, text: 'text-xs' },
    md: { w: 84, r: 34, stroke: 5, text: 'text-2xl' },
    lg: { w: 120, r: 48, stroke: 7, text: 'text-4xl' },
  };
  const d = dims[size];
  const circ = 2 * Math.PI * d.r;
  const offset = circ - (Math.min(100, Math.max(0, score)) / 100) * circ;
  const gradientId = `radial-score-${score}-${size}-${Math.random().toString(36).slice(2, 6)}`;
  const colorStop1 = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  const colorStop2 = score >= 80 ? '#06b6d4' : score >= 50 ? '#ea580c' : '#b91c1c';
  const glowClass = score >= 80 ? 'drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' : score >= 50 ? 'drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]';
  const ratingText = score >= 80 ? 'Best Match' : score >= 50 ? 'Moderate' : 'Limited';

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`relative flex items-center justify-center ${glowClass}`}>
        <svg width={d.w} height={d.w} className="transform -rotate-90">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colorStop1} />
              <stop offset="100%" stopColor={colorStop2} />
            </linearGradient>
          </defs>
          <circle cx={d.w / 2} cy={d.w / 2} r={d.r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={d.stroke} />
          <circle
            cx={d.w / 2} cy={d.w / 2} r={d.r} fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={d.stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className={`${d.text} font-black text-white tracking-tighter leading-none`}>
            {score}
          </span>
          {size === 'lg' && <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-1">Score</span>}
        </div>
      </div>
      {showLabel && label && <span className="text-xs font-semibold text-slate-300">{label}</span>}
      {showLabel && !label && <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">{ratingText}</span>}
    </div>
  );
}

// ============ SKELETON ============
interface SkeletonProps { className?: string; }

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse bg-white/10 rounded-2xl ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-dark-850 border border-white/10 rounded-3xl p-6 space-y-4">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>
    </div>
  );
}

// ============ EMPTY STATE ============
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400 mb-4 shadow-glow-green animate-float">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-white mb-1.5">{title}</h3>
      {description && <p className="text-sm text-slate-400 max-w-sm mb-6">{description}</p>}
      {action}
    </div>
  );
}

// ============ STATUS DOT ============
export function StatusDot({ status }: { status: 'online' | 'offline' | 'warning' }) {
  const colors: Record<string, string> = {
    online: 'bg-emerald-400 shadow-glow-green',
    offline: 'bg-slate-500',
    warning: 'bg-amber-400 shadow-glow-amber',
  };
  return (
    <span className="relative flex h-2.5 w-2.5">
      {status === 'online' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${colors[status]}`} />
    </span>
  );
}

// ============ TOAST DISPLAY ============
interface ToastItemProps {
  type: ToastType;
  message: string;
  onClose: () => void;
}

export function ToastItem({ type, message, onClose }: ToastItemProps) {
  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />,
    info: <Info className="w-5 h-5 text-cyan-400 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    error: <XCircle className="w-5 h-5 text-rose-400 shrink-0" />,
  };
  const borders: Record<ToastType, string> = {
    success: 'border-emerald-500/40 shadow-glow-green',
    info: 'border-cyan-500/40 shadow-glow-cyan',
    warning: 'border-amber-500/40 shadow-glow-amber',
    error: 'border-rose-500/40 shadow-glow-red',
  };
  return (
    <div className={`flex items-center gap-3 bg-dark-900/95 backdrop-blur-2xl border ${borders[type]} rounded-2xl px-4 py-3.5 min-w-[300px] max-w-md shadow-2xl animate-slide-in-right z-50`} role="alert">
      {icons[type]}
      <span className="flex-1 text-sm font-medium text-slate-100">{message}</span>
      <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10" aria-label="Dismiss notification">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ============ TABS ============
interface TabsProps {
  tabs: { id: string; label: string; count?: number }[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export function Tabs({ tabs, activeTab, onTabChange }: TabsProps) {
  return (
    <div className="flex gap-1.5 bg-dark-950/80 border border-white/10 rounded-2xl p-1.5 overflow-x-auto no-scrollbar" role="tablist">
      {tabs.map(tab => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 text-xs md:text-sm font-semibold rounded-xl transition-all duration-200 whitespace-nowrap ${activeTab === tab.id ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-dark-950 shadow-md shadow-emerald-500/20 font-bold' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          {tab.label}
          {tab.count !== undefined && tab.count > 0 && (
            <span className={`ml-2 px-1.5 py-0.5 text-[10px] rounded-full ${activeTab === tab.id ? 'bg-dark-950/30 text-dark-950' : 'bg-white/10 text-slate-300'}`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ============ METRIC CARD ============
interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function MetricCard({ icon, label, value, variant = 'default' }: MetricCardProps) {
  const borders: Record<string, string> = {
    default: 'border-white/10 hover:border-cyan-500/30',
    success: 'border-emerald-500/30 shadow-glow-green',
    warning: 'border-amber-500/30 shadow-glow-amber',
    danger: 'border-rose-500/30 shadow-glow-red',
  };
  return (
    <div className={`bg-dark-850/80 backdrop-blur-xl rounded-3xl p-5 border ${borders[variant]} transition-all duration-300 hover:-translate-y-0.5`}>
      <div className="flex items-center justify-between mb-3">
        <div className="p-2.5 bg-white/5 rounded-2xl text-emerald-400 border border-white/10">{icon}</div>
      </div>
      <div className="text-2xl md:text-3xl font-black text-white tracking-tight">{value}</div>
      <div className="text-xs font-semibold text-slate-400 mt-1">{label}</div>
    </div>
  );
}
