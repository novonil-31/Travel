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
  const base = 'inline-flex items-center justify-center font-bold rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] select-none';
  const variants: Record<string, string> = {
    primary: 'bg-black hover:bg-neutral-800 text-white shadow-sm',
    secondary: 'bg-neutral-100 hover:bg-neutral-200 text-neutral-900',
    outline: 'border border-neutral-300 hover:bg-neutral-50 text-neutral-900',
    ghost: 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    glow: 'bg-black hover:bg-neutral-800 text-white shadow-sm',
  };
  const sizes: Record<string, string> = {
    sm: 'px-3.5 py-2 text-xs gap-1.5',
    md: 'px-5 py-3 text-sm gap-2',
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
  const pads: Record<string, string> = { none: 'p-0', sm: 'p-4', md: 'p-6', lg: 'p-8' };
  return (
    <div
      className={`bg-white border border-neutral-200 rounded-2xl shadow-sm ${hover ? 'hover:border-neutral-400 hover:shadow-md cursor-pointer transition-all duration-200' : ''} ${pads[padding]} ${className}`}
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
    default: 'bg-neutral-100 text-neutral-800 border-neutral-200',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold',
    warning: 'bg-amber-50 text-amber-800 border-amber-200 font-semibold',
    danger: 'bg-red-50 text-red-800 border-red-200 font-semibold',
    info: 'bg-blue-50 text-blue-800 border-blue-200 font-semibold',
    neutral: 'bg-neutral-100 text-neutral-700 border-neutral-200',
    glow: 'bg-neutral-900 text-white border-neutral-900 font-semibold',
  };
  const sizes: Record<string, string> = { sm: 'px-2.5 py-1 text-xs', md: 'px-3.5 py-1.5 text-xs sm:text-sm' };
  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-lg border ${variants[variant]} ${sizes[size]} ${className}`}>
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
      <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />
      <div className={`relative bg-white rounded-t-2xl sm:rounded-2xl shadow-uber-modal w-full ${sizes[size]} max-h-[90vh] overflow-y-auto z-10`}>
        {/* Mobile handle indicator */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-12 h-1 bg-neutral-300 rounded-full" />
        </div>
        {title && (
          <div className="flex items-center justify-between p-5 border-b border-neutral-200">
            <h2 className="text-lg font-bold text-neutral-900 tracking-tight">{title}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors" aria-label="Close dialog">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="p-6 text-neutral-800">{children}</div>
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
      {label && <label htmlFor={inputId} className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">{label}</label>}
      <div className="relative">
        {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none">{icon}</div>}
        <input
          id={inputId}
          className={`w-full rounded-xl bg-neutral-100 hover:bg-neutral-200/70 focus:bg-white border border-transparent focus:border-black px-4 py-3.5 text-neutral-900 font-medium placeholder:text-neutral-400 transition-all focus:outline-none focus:ring-0 ${icon ? 'pl-11' : ''} ${error ? 'border-red-500 bg-red-50' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-600 font-medium" role="alert">{error}</p>}
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
      {label && <label htmlFor={selectId} className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">{label}</label>}
      <select
        id={selectId}
        className={`w-full rounded-xl bg-neutral-100 hover:bg-neutral-200/70 focus:bg-white border border-transparent focus:border-black px-4 py-3.5 text-neutral-900 font-medium focus:outline-none transition-all cursor-pointer ${className}`}
        {...props}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
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
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black ${checked ? 'bg-black' : 'bg-neutral-300'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 shadow-sm ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
      <div>
        <span className="text-sm font-semibold text-neutral-900">{label}</span>
        {description && <p className="text-xs text-neutral-500">{description}</p>}
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
  const barColor = color || (pct >= 80 ? 'bg-emerald-600' : pct >= 50 ? 'bg-amber-500' : 'bg-red-600');
  const heights: Record<string, string> = { sm: 'h-1.5', md: 'h-2' };
  return (
    <div className="space-y-1">
      {(label || showValue) && (
        <div className="flex justify-between text-xs font-semibold">
          {label && <span className="text-neutral-600">{label}</span>}
          {showValue && <span className="text-neutral-900 font-bold">{Math.round(value)}%</span>}
        </div>
      )}
      <div className={`w-full ${heights[size]} bg-neutral-200 rounded-full overflow-hidden`}>
        <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} />
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
    sm: { w: 40, r: 16, stroke: 3, text: 'text-xs' },
    md: { w: 68, r: 28, stroke: 4.5, text: 'text-xl' },
    lg: { w: 96, r: 40, stroke: 6, text: 'text-3xl' },
  };
  const d = dims[size];
  const circ = 2 * Math.PI * d.r;
  const offset = circ - (Math.min(100, Math.max(0, score)) / 100) * circ;
  const strokeColor = score >= 80 ? '#0e8345' : score >= 50 ? '#f38b00' : '#e11900';
  const ratingText = score >= 80 ? 'Best Match' : score >= 50 ? 'Moderate' : 'Limited';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative flex items-center justify-center">
        <svg width={d.w} height={d.w} className="transform -rotate-90">
          <circle cx={d.w / 2} cy={d.w / 2} r={d.r} fill="none" stroke="#e5e5e5" strokeWidth={d.stroke} />
          <circle
            cx={d.w / 2} cy={d.w / 2} r={d.r} fill="none"
            stroke={strokeColor}
            strokeWidth={d.stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className={`${d.text} font-black text-neutral-900 tracking-tight leading-none`}>
            {score}
          </span>
        </div>
      </div>
      {showLabel && label && <span className="text-xs font-semibold text-neutral-600">{label}</span>}
      {showLabel && !label && <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">{ratingText}</span>}
    </div>
  );
}

// ============ SKELETON ============
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-neutral-200 rounded-xl ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-4">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
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
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-700 mb-3">
        {icon}
      </div>
      <h3 className="text-base font-bold text-neutral-900 mb-1">{title}</h3>
      {description && <p className="text-xs text-neutral-500 max-w-sm mb-5">{description}</p>}
      {action}
    </div>
  );
}

// ============ STATUS DOT ============
export function StatusDot({ status }: { status: 'online' | 'offline' | 'warning' }) {
  const colors: Record<string, string> = {
    online: 'bg-emerald-600',
    offline: 'bg-neutral-400',
    warning: 'bg-amber-500',
  };
  return (
    <span className="relative flex h-2 w-2">
      {status === 'online' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
      <span className={`relative inline-flex rounded-full h-2 w-2 ${colors[status]}`} />
    </span>
  );
}

// ============ TOAST ITEM ============
interface ToastItemProps {
  type: ToastType;
  message: string;
  onClose: () => void;
}

export function ToastItem({ type, message, onClose }: ToastItemProps) {
  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-600 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
    error: <XCircle className="w-5 h-5 text-red-600 shrink-0" />,
  };
  return (
    <div className="flex items-center gap-3 bg-white border border-neutral-200 rounded-xl px-4 py-3.5 min-w-[280px] max-w-md shadow-uber-elevated z-50" role="alert">
      {icons[type]}
      <span className="flex-1 text-xs font-semibold text-neutral-800">{message}</span>
      <button onClick={onClose} className="p-1 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100" aria-label="Dismiss">
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
    <div className="flex gap-1 bg-neutral-100 p-1 rounded-xl overflow-x-auto no-scrollbar" role="tablist">
      {tabs.map(tab => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-black shadow-sm' : 'text-neutral-600 hover:text-black'}`}
        >
          {tab.label}
          {tab.count !== undefined && tab.count > 0 && (
            <span className={`ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full ${activeTab === tab.id ? 'bg-neutral-100 text-black' : 'bg-neutral-200 text-neutral-700'}`}>
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

export function MetricCard({ icon, label, value }: MetricCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="p-2 bg-neutral-100 rounded-xl text-neutral-800">{icon}</div>
      </div>
      <div className="text-2xl font-black text-neutral-900 tracking-tight">{value}</div>
      <div className="text-xs font-medium text-neutral-500 mt-0.5">{label}</div>
    </div>
  );
}
