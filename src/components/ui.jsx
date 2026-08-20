export function Card({ children, className = '', raised = false }) {
  return <div className={`${raised ? 'glass-raised' : 'glass'} rounded-2xl p-5 transition-colors duration-200 ${className}`}>{children}</div>;
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  const variants = {
    primary: 'bg-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] text-white',
    ghost: 'bg-[var(--tint-5)] hover:bg-[var(--tint-10)] text-[var(--color-text)] border border-[var(--color-border)]',
    danger: 'bg-[var(--color-danger)]/15 hover:bg-[var(--color-danger)]/25 text-[var(--color-danger)] border border-[var(--color-danger)]/30',
  };
  return (
    <button
      className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ label, error, className = '', ...props }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      {label && <span className="text-[var(--color-text-muted)] font-medium">{label}</span>}
      <input
        className={`bg-[var(--tint-5)] border rounded-xl px-3.5 py-2.5 outline-none placeholder:text-[var(--color-text-faint)] transition-colors ${
          error ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)] focus:border-[var(--color-brand)]'
        } ${className}`}
        {...props}
      />
      {error && <span className="text-[var(--color-danger)] text-xs">{error}</span>}
    </label>
  );
}

export function Select({ label, className = '', children, ...props }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      {label && <span className="text-[var(--color-text-muted)] font-medium">{label}</span>}
      <select
        className={`bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 outline-none focus:border-[var(--color-brand)] ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function Switch({ checked, onChange, disabled = false, label }) {
  const el = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`relative w-10 h-6 rounded-full shrink-0 transition-colors duration-150 ${
        checked ? 'bg-[var(--color-brand)]' : 'bg-[var(--tint-12)]'
      } disabled:opacity-40`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-150 ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
  return el;
}

export function Badge({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-[var(--tint-8)] text-[var(--color-text-muted)]',
    safe: 'bg-[var(--color-safe)]/15 text-[var(--color-safe)]',
    risky: 'bg-[var(--color-risky)]/15 text-[var(--color-risky)]',
    danger: 'bg-[var(--color-danger)]/15 text-[var(--color-danger)]',
    brand: 'bg-[var(--color-brand)]/15 text-[var(--color-brand-soft)]',
  };
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function ProgressBar({ value, requiredValue = 75 }) {
  const tone = value < requiredValue ? 'var(--color-danger)' : value < requiredValue + 8 ? 'var(--color-risky)' : 'var(--color-safe)';
  return (
    <div className="h-1.5 w-full rounded-full bg-[var(--tint-8)] overflow-hidden relative">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: tone }}
      />
      <div
        className="absolute top-0 bottom-0 w-px bg-[var(--tint-30)]"
        style={{ left: `${Math.min(100, requiredValue)}%` }}
        title={`Required: ${requiredValue}%`}
      />
    </div>
  );
}

export function Spinner({ size = 20 }) {
  return (
    <div
      className="animate-spin rounded-full border-2 border-[var(--tint-15)] border-t-[var(--color-brand)]"
      style={{ width: size, height: size }}
    />
  );
}

/**
 * Confirmation dialog matching this app's glass/card visual language, for
 * destructive actions — replaces browser confirm()/alert() so it can
 * respect Settings > "Ask before deleting data" and stay on-brand.
 */
export function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = true, busy = false, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onCancel}>
      <div className="glass-raised rounded-2xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <p className="font-display font-semibold mb-1.5">{title}</p>
        {description && <p className="text-sm text-[var(--color-text-muted)] mb-5">{description}</p>}
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>{cancelLabel}</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ title, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 gap-2">
      <p className="font-display font-semibold text-lg">{title}</p>
      {hint && <p className="text-[var(--color-text-muted)] text-sm max-w-sm">{hint}</p>}
      {action}
    </div>
  );
}
