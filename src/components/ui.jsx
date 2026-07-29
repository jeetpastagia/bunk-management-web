export function Card({ children, className = '', raised = false }) {
  return <div className={`${raised ? 'glass-raised' : 'glass'} rounded-2xl p-5 ${className}`}>{children}</div>;
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  const variants = {
    primary: 'bg-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] text-white',
    ghost: 'bg-white/5 hover:bg-white/10 text-[var(--color-text)] border border-[var(--color-border)]',
    danger: 'bg-[var(--color-danger)]/15 hover:bg-[var(--color-danger)]/25 text-[var(--color-danger)] border border-[var(--color-danger)]/30',
  };
  return (
    <button
      className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
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
        className={`bg-white/5 border rounded-xl px-3.5 py-2.5 outline-none placeholder:text-[var(--color-text-faint)] transition-colors ${
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

export function Badge({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-white/8 text-[var(--color-text-muted)]',
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
    <div className="h-1.5 w-full rounded-full bg-white/8 overflow-hidden relative">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: tone }}
      />
      <div
        className="absolute top-0 bottom-0 w-px bg-white/30"
        style={{ left: `${Math.min(100, requiredValue)}%` }}
        title={`Required: ${requiredValue}%`}
      />
    </div>
  );
}

export function Spinner({ size = 20 }) {
  return (
    <div
      className="animate-spin rounded-full border-2 border-white/15 border-t-[var(--color-brand)]"
      style={{ width: size, height: size }}
    />
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
