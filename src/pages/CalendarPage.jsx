import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Card, Spinner } from '../components/ui';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const COLOR_MAP = {
  green: 'var(--color-safe)',
  red: 'var(--color-danger)',
  grey: 'var(--chart-track)',
  blue: 'var(--color-brand)',
};

export default function CalendarPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [days, setDays] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setDays(null);
    api.calendar(month, year).then((res) => setDays(res.days));
  }, [month, year]);

  const changeMonth = (delta) => {
    let m = month + delta;
    let y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setMonth(m);
    setYear(y);
    setSelected(null);
  };

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const byDate = Object.fromEntries((days || []).map((d) => [d.date, d]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Calendar</h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-1">Tap a date to see that day's lecture history.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => changeMonth(-1)} className="w-8 h-8 rounded-lg bg-[var(--tint-6)] hover:bg-[var(--tint-10)] flex items-center justify-center">‹</button>
          <span className="font-display font-medium w-36 text-center">{MONTH_NAMES[month - 1]} {year}</span>
          <button onClick={() => changeMonth(1)} className="w-8 h-8 rounded-lg bg-[var(--tint-6)] hover:bg-[var(--tint-10)] flex items-center justify-center">›</button>
        </div>
      </div>

      <div className="flex gap-4 text-xs text-[var(--color-text-muted)]">
        <Legend color={COLOR_MAP.green} label="Attended" />
        <Legend color={COLOR_MAP.red} label="Bunked" />
        <Legend color={COLOR_MAP.grey} label="Holiday" />
        <Legend color={COLOR_MAP.blue} label="Today" />
      </div>

      <Card>
        {!days ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} className="text-center text-xs text-[var(--color-text-faint)] font-medium pb-1">{d}</div>
            ))}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const info = byDate[iso];
              const color = info ? COLOR_MAP[info.color] : 'transparent';
              return (
                <button
                  key={day}
                  onClick={() => setSelected(info || { date: iso, conducted: 0, attended: 0, bunked: 0 })}
                  className="aspect-square rounded-xl flex flex-col items-center justify-center gap-1 border border-[var(--color-border-soft)] hover:border-[var(--color-brand)]/50 transition-colors"
                  style={{ background: info ? `color-mix(in srgb, ${color} 16%, transparent)` : 'transparent' }}
                >
                  <span className="mono-num text-sm">{day}</span>
                  {info && <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />}
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {selected && (
        <Card>
          <h2 className="font-display font-semibold mb-2">{selected.date}</h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            {selected.conducted} conducted · {selected.attended} attended · {selected.bunked} bunked
            {selected.conducted > 0 && ` · ${selected.percentage}%`}
          </p>
        </Card>
      )}
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
      {label}
    </div>
  );
}
