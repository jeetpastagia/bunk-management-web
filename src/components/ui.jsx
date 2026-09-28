import { useEffect, useRef, useState } from 'react';
import { usePointerTilt } from '../hooks/usePointerTilt';
import { useMagneticHover } from '../hooks/useMagneticHover';

/** Pass `tilt` to opt a card into the mouse-driven 3D tilt effect (desktop/hover-capable devices only, off under reduced-motion). */
export function Card({ children, className = '', raised = false, tilt = false, ...props }) {
  const tiltRef = usePointerTilt({ max: 6, lift: 4, disabled: !tilt });
  return (
    <div ref={tiltRef} className={`${raised ? 'glass-raised' : 'glass'} rounded-2xl p-5 transition-colors duration-200 ${tilt ? 'tilt-card' : ''} ${className}`} {...props}>
      {children}
    </div>
  );
}

/**
 * Primary-variant buttons get a subtle magnetic pull toward the pointer
 * plus a brand-colored glow by default (they're consistently this app's
 * main per-screen CTA — Save/Create/Join/Log in — so it reads as premium
 * rather than noisy). Small/secondary actions (ghost/danger, used for
 * dense inline row actions like Edit/Delete/Attended/Bunked) stay as
 * plain, precise click targets. Override with the `magnetic` prop.
 */
export function Button({ children, variant = 'primary', className = '', magnetic, disabled, ...props }) {
  const variants = {
    primary: 'bg-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] text-white btn-glow',
    ghost: 'bg-[var(--tint-5)] hover:bg-[var(--tint-10)] text-[var(--color-text)] border border-[var(--color-border)]',
    danger: 'bg-[var(--color-danger)]/15 hover:bg-[var(--color-danger)]/25 text-[var(--color-danger)] border border-[var(--color-danger)]/30',
  };
  const wantsMagnetic = magnetic ?? variant === 'primary';
  const magneticRef = useMagneticHover({ strength: 0.2, max: 6, disabled: !wantsMagnetic || disabled });

  return (
    <button
      ref={magneticRef}
      disabled={disabled}
      className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ label, error, className = '', ...props }) {
  // type="date" is rendered by our own DatePicker instead of the native
  // <input type="date">, whose calendar popup is drawn by the OS/browser
  // itself — no CSS (border-radius, fonts, colors, the blue selected-day
  // highlight) can reach into it, on any platform. Same value/onChange(e)
  // API as before (onChange still receives something shaped like a native
  // event, e.target.value still an ISO yyyy-mm-dd string) so every existing
  // call site works unchanged.
  if (props.type === 'date') {
    const { type: _type, value, onChange, min, max, disabled, required, ...rest } = props;
    return (
      <label className="flex flex-col gap-1.5 text-base">
        {label && <span className="text-[var(--color-text-muted)] font-medium">{label}</span>}
        <DatePicker value={value} onChange={onChange} min={min} max={max} disabled={disabled} required={required} className={className} {...rest} />
        {error && <span className="text-[var(--color-danger)] text-xs">{error}</span>}
      </label>
    );
  }

  return (
    <label className="flex flex-col gap-1.5 text-base">
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

function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function fromISO(s) {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function sameDay(a, b) {
  return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const gridStart = new Date(year, month, 1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}
const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/** Fully custom, themeable calendar dropdown replacing native <input type="date">. */
function DatePicker({ value, onChange, min, max, disabled, className = '' }) {
  const [open, setOpen] = useState(false);
  const selected = fromISO(value);
  const [viewDate, setViewDate] = useState(() => selected || new Date());
  const containerRef = useRef(null);

  useEffect(() => {
    if (selected) setViewDate(selected);
  }, [value]);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const minDate = min ? fromISO(min) : null;
  const maxDate = max ? fromISO(max) : null;
  const isOutOfRange = (d) => (minDate && d < minDate) || (maxDate && d > maxDate);

  const emit = (v) => onChange?.({ target: { value: v } });
  const select = (d) => {
    if (isOutOfRange(d)) return;
    emit(toISO(d));
    setOpen(false);
  };
  const clear = () => {
    emit('');
    setOpen(false);
  };
  const goToday = () => {
    const t = new Date();
    if (isOutOfRange(t)) {
      setViewDate(t);
      return;
    }
    select(t);
  };

  const days = buildMonthGrid(viewDate.getFullYear(), viewDate.getMonth());
  const monthLabel = viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const today = new Date();

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 bg-[var(--tint-5)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-left outline-none focus:border-[var(--color-brand)] transition-colors disabled:opacity-40 disabled:pointer-events-none"
      >
        <span className={selected ? '' : 'text-[var(--color-text-faint)]'}>
          {selected ? selected.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : 'Select date'}
        </span>
        <CalendarGlyph className="w-4 h-4 text-[var(--color-text-faint)] shrink-0" />
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-72 glass-raised rounded-2xl p-3.5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--tint-8)] text-[var(--color-text-muted)] transition-colors"
            >
              <ChevronGlyph className="w-4 h-4 rotate-180" />
            </button>
            <span className="font-display font-semibold text-sm">{monthLabel}</span>
            <button
              type="button"
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--tint-8)] text-[var(--color-text-muted)] transition-colors"
            >
              <ChevronGlyph className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAY_LABELS.map((d) => (
              <span key={d} className="text-[10px] font-medium text-[var(--color-text-faint)] text-center py-1">{d}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const outOfMonth = d.getMonth() !== viewDate.getMonth();
              const outOfRange = isOutOfRange(d);
              const isSelected = sameDay(d, selected);
              const isToday = sameDay(d, today);
              return (
                <button
                  key={toISO(d)}
                  type="button"
                  disabled={outOfRange}
                  onClick={() => select(d)}
                  className={`h-8 rounded-lg text-xs font-medium mono-num transition-colors ${
                    isSelected
                      ? 'bg-[var(--color-brand)] text-white'
                      : isToday
                      ? 'border border-[var(--color-brand)] text-[var(--color-brand)]'
                      : outOfMonth
                      ? 'text-[var(--color-text-faint)] hover:bg-[var(--tint-8)]'
                      : 'text-[var(--color-text)] hover:bg-[var(--tint-8)]'
                  } ${outOfRange ? 'opacity-30 pointer-events-none' : ''}`}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--color-border-soft)]">
            <button type="button" onClick={clear} className="text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">Clear</button>
            <button type="button" onClick={goToday} className="text-xs font-medium text-[var(--color-brand)] hover:underline">Today</button>
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarGlyph(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M8 3v4M16 3v4M3 10h18" strokeLinecap="round" />
    </svg>
  );
}
function ChevronGlyph(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Select({ label, className = '', children, ...props }) {
  return (
    <label className="flex flex-col gap-1.5 text-base">
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
  // +5 matches attendanceEngine.classify()'s "risky" cushion on the backend — kept identical so a subject never reads as one color on Analytics and another on the Dashboard.
  const tone = value < requiredValue ? 'var(--color-danger)' : value < requiredValue + 5 ? 'var(--color-risky)' : 'var(--color-safe)';
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
