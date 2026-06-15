// ── Reusable UI primitives ──────────────────────────────────────────────────

import { type ReactNode, forwardRef } from 'react';

// ─── Button ─────────────────────────────────────────────────────────────────

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type BtnSize = 'sm' | 'md' | 'lg';

const BTN: Record<BtnVariant, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
  secondary: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 shadow-sm',
  ghost: 'text-gray-500 hover:text-gray-900 hover:bg-gray-100',
  danger: 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200',
};
const BTN_SIZE: Record<BtnSize, string> = {
  sm: 'px-2.5 py-1.5 text-xs gap-1.5 rounded-lg',
  md: 'px-3.5 py-2 text-sm gap-2 rounded-xl',
  lg: 'px-5 py-2.5 text-sm gap-2 rounded-xl',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant; size?: BtnSize; icon?: ReactNode; loading?: boolean;
}
export function Button({ variant = 'secondary', size = 'md', icon, loading, children, className = '', disabled, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${BTN[variant]} ${BTN_SIZE[size]} ${className}`}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}

function Spinner() {
  return <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>;
}

// ─── Badge ──────────────────────────────────────────────────────────────────

type BadgeVariant = 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'purple';
const BADGE: Record<BadgeVariant, string> = {
  gray: 'bg-gray-100 text-gray-600',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  purple: 'bg-purple-100 text-purple-700',
};
interface BadgeProps { children: ReactNode; variant?: BadgeVariant; dot?: boolean; className?: string }
export function Badge({ children, variant = 'gray', dot, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${BADGE[variant]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${variant === 'gray' ? 'bg-gray-400' : variant === 'blue' ? 'bg-blue-500' : variant === 'green' ? 'bg-emerald-500' : variant === 'amber' ? 'bg-amber-500' : variant === 'red' ? 'bg-red-500' : 'bg-purple-500'}`} />}
      {children}
    </span>
  );
}

// ─── Card ───────────────────────────────────────────────────────────────────

interface CardProps { children: ReactNode; className?: string; padding?: boolean; onClick?: () => void }
export function Card({ children, className = '', padding = true, onClick }: CardProps) {
  return (
    <div onClick={onClick} className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${padding ? 'p-5' : ''} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className}`}>
      {children}
    </div>
  );
}

// ─── Modal ──────────────────────────────────────────────────────────────────

interface ModalProps { open: boolean; onClose: () => void; title: string; children: ReactNode; width?: string }
export function Modal({ open, onClose, title, children, width = 'max-w-lg' }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${width} flex flex-col max-h-[90vh]`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Input ──────────────────────────────────────────────────────────────────

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }>(
  ({ label, error, className = '', ...rest }, ref) => (
    <div className="w-full">
      {label && <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>}
      <input ref={ref} {...rest} className={`w-full border ${error ? 'border-red-400' : 'border-gray-200'} rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ${error ? 'focus:ring-red-400' : 'focus:ring-blue-500'} transition-shadow ${className}`} />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
);
Input.displayName = 'Input';

// ─── Textarea ───────────────────────────────────────────────────────────────

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }>(
  ({ label, className = '', ...rest }, ref) => (
    <div className="w-full">
      {label && <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>}
      <textarea ref={ref} {...rest} className={`w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-shadow ${className}`} />
    </div>
  )
);
Textarea.displayName = 'Textarea';

// ─── Select ─────────────────────────────────────────────────────────────────

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; options: { value: string; label: string }[] }>(
  ({ label, options, className = '', ...rest }, ref) => (
    <div className="w-full">
      {label && <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>}
      <select ref={ref} {...rest} className={`w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-shadow ${className}`}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
);
Select.displayName = 'Select';

// ─── ProgressBar ────────────────────────────────────────────────────────────

interface ProgressBarProps { value: number; color?: string; height?: string; showLabel?: boolean }
export function ProgressBar({ value, color = '#2563eb', height = 'h-1.5', showLabel = false }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 bg-gray-100 rounded-full overflow-hidden ${height}`}>
        <div className={`${height} rounded-full transition-all duration-500 ease-out`} style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      {showLabel && <span className="text-xs font-bold tabular-nums" style={{ color }}>{pct}%</span>}
    </div>
  );
}

// ─── Stat ───────────────────────────────────────────────────────────────────

interface StatProps { label: string; value: string | number; sub?: string; icon?: ReactNode; accent?: string }
export function Stat({ label, value, sub, icon, accent = '#2563eb' }: StatProps) {
  return (
    <Card className="flex items-center gap-4">
      {icon && <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${accent}18`, color: accent }}>{icon}</div>}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-black text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </Card>
  );
}

// ─── EmptyState ─────────────────────────────────────────────────────────────

interface EmptyStateProps { icon: ReactNode; title: string; description?: string; action?: ReactNode }
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-gray-300 mb-4">{icon}</div>
      <p className="text-sm font-semibold text-gray-600">{title}</p>
      {description && <p className="text-xs text-gray-400 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── SectionHeader ──────────────────────────────────────────────────────────

interface SectionHeaderProps { title: string; description?: string; actions?: ReactNode }
export function SectionHeader({ title, description, actions }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}

// ─── Divider ────────────────────────────────────────────────────────────────

export function Divider({ className = '' }: { className?: string }) {
  return <hr className={`border-gray-100 ${className}`} />;
}
