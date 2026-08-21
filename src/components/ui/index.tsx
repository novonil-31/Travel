import React from 'react';
import { CheckCircle, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import type { ToastType } from '../../types';

// ============ BUTTON ============
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  variant = 'primary', size = 'md', loading, icon, children, className = '', disabled, ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants: Record<string, string> = {
    primary: 'bg-navy-900 text-white hover:bg-navy-800 focus:ring-navy-500 shadow-sm',
    secondary: 'bg-navy-100 text-navy-900 hover:bg-navy-200 focus:ring-navy-400',
    outline: 'border-2 border-navy-300 text-navy-700 hover:bg-navy-50 focus:ring-navy-400',
    ghost: 'text-navy-600 hover:bg-navy-100 focus:ring-navy-400',
    danger: 'bg-access-red text-white hover:bg-red-700 focus:ring-red-500 shadow-sm',
    success: 'bg-access-green text-white hover:bg-emerald-700 focus:ring-emerald-500 shadow-sm',
  };
  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
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
  padding?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export function Card({ children, className = '', hover, padding = 'md', onClick }: CardProps) {
  const pads: Record<string, string> = { sm: 'p-3', md: 'p-5', lg: 'p-7' };
  return (
    <div
      className={`bg-white rounded-2xl shadow-card ${hover ? 'hover:shadow-card-hover cursor-pointer transition-shadow' : ''} ${pads[padding]} ${className}`}
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
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  className?: string;
}

export function Badge({ children, variant = 'default', size = 'sm', icon, className = '' }: BadgeProps) {
  const variants: Record<string, string> = {
    default: 'bg-navy-100 text-navy-800',
    success: 'bg-access-green-light text-emerald-800',
    warning: 'bg-access-amber-light text-amber-800',
    danger: 'bg-access-red-light text-red-800',
    info: 'bg-access-blue-light text-blue-800',
    neutral: 'bg-gray-100 text-gray-700',
  };
  const sizes: Record<string, string> = { sm: 'px-2 py-0.5 text-xs', md: 'px-3 py-1 text-sm' };
  return (
    <span className={`inline-flex items-center gap-1 font-medium rounded-full ${variants[variant]} ${sizes[size]} ${className}`}>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="fixed inset-0 bg-black/50 motion-safe:animate-fade-in" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-modal w-full ${sizes[size]} max-h-[90vh] overflow-y-auto motion-safe:animate-slide-up`}>
        {title && (
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-navy-900">{title}</h2>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Close dialog">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
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
      {label && <label htmlFor={inputId} className="block text-sm font-medium text-navy-700">{label}</label>}
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400">{icon}</div>}
        <input
          id={inputId}
          className={`w-full rounded-xl border border-navy-200 bg-white px-4 py-2.5 text-navy-900 placeholder:text-navy-400 focus:border-navy-500 focus:ring-2 focus:ring-navy-200 focus:outline-none transition-colors ${icon ? 'pl-10' : ''} ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
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
      {label && <label htmlFor={selectId} className="block text-sm font-medium text-navy-700">{label}</label>}
      <select
        id={selectId}
        className={`w-full rounded-xl border border-navy-200 bg-white px-4 py-2.5 text-navy-900 focus:border-navy-500 focus:ring-2 focus:ring-navy-200 focus:outline-none transition-colors ${className}`}
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
    <label className="flex items-center gap-3 cursor-pointer group">
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy-500 ${checked ? 'bg-navy-900' : 'bg-gray-300'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
      <div>
        <span className="text-sm font-medium text-navy-800 group-hover:text-navy-900">{label}</span>
        {description && <p className="text-xs text-navy-500">{description}</p>}
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
  const pct = Math.min(100, (value / max) * 100);
  const barColor = color || (pct >= 80 ? 'bg-access-green' : pct >= 50 ? 'bg-access-amber' : 'bg-access-red');
  const heights: Record<string, string> = { sm: 'h-1.5', md: 'h-2.5' };
  return (
    <div className="space-y-1">
      {(label || showValue) && (
        <div className="flex justify-between text-sm">
          {label && <span className="font-medium text-navy-700">{label}</span>}
          {showValue && <span className="text-navy-500">{Math.round(value)}</span>}
        </div>
      )}
      <div className={`w-full ${heights[size]} bg-gray-100 rounded-full overflow-hidden`}>
        <div className={`${heights[size]} ${barColor} rounded-full transition-all duration-700 motion-reduce:transition-none`} style={{ width: `${pct}%` }} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} />
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
    sm: { w: 48, r: 18, stroke: 3, text: 'text-sm' },
    md: { w: 80, r: 32, stroke: 4, text: 'text-xl' },
    lg: { w: 110, r: 44, stroke: 5, text: 'text-3xl' },
  };
  const d = dims[size];
  const circ = 2 * Math.PI * d.r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626';
  const ratingText = score >= 80 ? 'Highly Accessible' : score >= 50 ? 'Moderately Accessible' : 'Limited Accessibility';
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={d.w} height={d.w} className="transform -rotate-90" aria-label={`Score: ${score} out of 100`}>
        <circle cx={d.w / 2} cy={d.w / 2} r={d.r} fill="none" stroke="#f1f5f9" strokeWidth={d.stroke} />
        <circle cx={d.w / 2} cy={d.w / 2} r={d.r} fill="none" stroke={color} strokeWidth={d.stroke} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} className="transition-all duration-1000 motion-reduce:transition-none" />
        <text x={d.w / 2} y={d.w / 2} textAnchor="middle" dominantBaseline="central" fill="#102a43" className={`${d.text} font-bold`} transform={`rotate(90 ${d.w / 2} ${d.w / 2})`}>
          {score}
        </text>
      </svg>
      {showLabel && label && <span className="text-xs font-medium text-navy-600">{label}</span>}
      {showLabel && !label && <span className="text-xs text-navy-500">{ratingText}</span>}
    </div>
  );
}

// ============ SKELETON ============
interface SkeletonProps { className?: string; }

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-card p-5 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
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
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 text-navy-300">{icon}</div>
      <h3 className="text-lg font-semibold text-navy-800 mb-1">{title}</h3>
      {description && <p className="text-sm text-navy-500 max-w-sm mb-4">{description}</p>}
      {action}
    </div>
  );
}

// ============ STATUS DOT ============
export function StatusDot({ status }: { status: 'online' | 'offline' | 'warning' }) {
  const colors: Record<string, string> = {
    online: 'bg-access-green',
    offline: 'bg-gray-400',
    warning: 'bg-access-amber',
  };
  return (
    <span className="relative flex h-2.5 w-2.5">
      {status === 'online' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-access-green opacity-75 motion-reduce:animate-none" />}
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
    success: <CheckCircle className="w-5 h-5 text-access-green" />,
    info: <Info className="w-5 h-5 text-access-blue" />,
    warning: <AlertTriangle className="w-5 h-5 text-access-amber" />,
    error: <XCircle className="w-5 h-5 text-access-red" />,
  };
  const borders: Record<ToastType, string> = {
    success: 'border-l-access-green',
    info: 'border-l-access-blue',
    warning: 'border-l-access-amber',
    error: 'border-l-access-red',
  };
  return (
    <div className={`flex items-center gap-3 bg-white rounded-xl shadow-elevated border-l-4 ${borders[type]} px-4 py-3 min-w-[300px] max-w-md motion-safe:animate-slide-in-right`} role="alert">
      {icons[type]}
      <span className="flex-1 text-sm text-navy-800">{message}</span>
      <button onClick={onClose} className="p-1 rounded hover:bg-gray-100" aria-label="Dismiss notification">
        <X className="w-4 h-4 text-gray-400" />
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
    <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto" role="tablist">
      {tabs.map(tab => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-navy-900 shadow-sm' : 'text-navy-500 hover:text-navy-700'}`}
        >
          {tab.label}
          {tab.count !== undefined && tab.count > 0 && (
            <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${activeTab === tab.id ? 'bg-navy-100 text-navy-700' : 'bg-gray-200 text-gray-600'}`}>
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
  const variants: Record<string, string> = {
    default: 'bg-white',
    success: 'bg-emerald-50 border-emerald-200',
    warning: 'bg-amber-50 border-amber-200',
    danger: 'bg-red-50 border-red-200',
  };
  return (
    <div className={`${variants[variant]} rounded-2xl shadow-card p-5 border border-gray-100`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-navy-50 rounded-xl text-navy-600">{icon}</div>
      </div>
      <div className="text-2xl font-bold text-navy-900">{value}</div>
      <div className="text-sm text-navy-500 mt-1">{label}</div>
    </div>
  );
}
