import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Card, Badge, Spinner, Button } from '../components/ui';
import BunkGauge from '../components/BunkGauge';

const STATUS_META = {
  attended: { label: 'Attended', tone: 'safe' },
  bunked: { label: 'Bunked', tone: 'danger' },
  holiday: { label: 'Holiday', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  extra: { label: 'Extra', tone: 'brand' },
  pending: { label: 'Pending', tone: 'neutral' },
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [insights, setInsights] = useState([]);
  const [error, setError] = useState('');
  const [marking, setMarking] = useState(null);

  const load = async () => {
    try {
      const [overview, insightsRes] = await Promise.all([api.overview(), api.insights().catch(() => ({ insights: [] }))]);
      setData(overview);
      setInsights(insightsRes.insights || []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const mark = async (id, status) => {
    setMarking(id);
    try {
      await api.markLecture(id, status);
      await load();
    } finally {
      setMarking(null);
    }
  };

  if (error) return <Card className="text-[var(--color-danger)]">{error}</Card>;
  if (!data) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;

  const { overall, monthly, requiredAttendancePercentage, safeBunksRemaining, lecturesNeededForTarget, today, danger, monthlyDanger } = data;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Dashboard</h1>
        <p className="text-[var(--color-text-muted)] text-sm mt-1">Your attendance, at a glance.</p>
      </div>

      {danger && (
        <Card className="border-[var(--color-danger)]/40 bg-[var(--color-danger)]/8">
          <p className="font-semibold text-[var(--color-danger)]">Overall attendance is below {requiredAttendancePercentage}%</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Attend upcoming lectures to avoid warning letters.</p>
        </Card>
      )}
      {!danger && monthlyDanger && (
        <Card className="border-[var(--color-risky)]/40 bg-[var(--color-risky)]/8">
          <p className="font-semibold text-[var(--color-risky)]">Monthly attendance has dropped below {requiredAttendancePercentage}%</p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Attend upcoming lectures to avoid warning letters.</p>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <Card raised className="lg:col-span-1 flex flex-col items-center justify-center py-8">
          <BunkGauge percentage={overall.percentage} requiredPercentage={requiredAttendancePercentage} size={230} label="Overall attendance" sub={`${overall.attended}/${overall.conducted}`} />
        </Card>

        <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
          <StatCard label="Monthly attendance" value={`${monthly.percentage}%`} sub={`${monthly.attended}/${monthly.conducted} lectures`} tone={monthly.percentage < requiredAttendancePercentage ? 'danger' : 'safe'} />
          <StatCard label="Safe bunks remaining" value={Number.isFinite(safeBunksRemaining) ? safeBunksRemaining : '∞'} sub="before dropping below target" tone="brand" />
          <StatCard label="Lectures needed" value={Number.isFinite(lecturesNeededForTarget) ? lecturesNeededForTarget : '—'} sub={`to reach ${requiredAttendancePercentage}%`} tone="risky" />
          <StatCard label="Today's lectures" value={today.lectures.length} sub={`${today.summary.attended} attended so far`} tone="neutral" />
        </div>
      </div>

      <Card>
        <h2 className="font-display font-semibold mb-4">Today's lectures</h2>
        {today.lectures.length === 0 ? (
          <p className="text-[var(--color-text-muted)] text-sm">No lectures scheduled today.</p>
        ) : (
          <div className="flex flex-col divide-y divide-[var(--color-border-soft)]">
            {today.lectures.map((l) => {
              const meta = STATUS_META[l.status];
              return (
                <div key={l._id} className="flex items-center justify-between py-3 gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="mono-num text-xs text-[var(--color-text-faint)] w-6">#{l.lectureNumber}</span>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{l.subject?.name || 'Subject'}</p>
                      <p className="text-xs text-[var(--color-text-faint)] truncate">{l.subject?.facultyName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    {l.status === 'pending' && (
                      <>
                        <Button variant="ghost" className="!px-2.5 !py-1.5 text-xs" disabled={marking === l._id} onClick={() => mark(l._id, 'attended')}>
                          Attended
                        </Button>
                        <Button variant="danger" className="!px-2.5 !py-1.5 text-xs" disabled={marking === l._id} onClick={() => mark(l._id, 'bunked')}>
                          Bunked
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {insights.length > 0 && (
        <Card>
          <h2 className="font-display font-semibold mb-4">Smart insights</h2>
          <ul className="flex flex-col gap-2.5">
            {insights.map((msg, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <span className="text-[var(--color-amber)] mt-0.5">◆</span>
                <span className="text-[var(--color-text-muted)]">{msg}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, tone }) {
  const toneColor = { safe: 'var(--color-safe)', danger: 'var(--color-danger)', risky: 'var(--color-risky)', brand: 'var(--color-brand-soft)', neutral: 'var(--color-text)' }[tone];
  return (
    <Card className="flex flex-col justify-between">
      <p className="text-xs text-[var(--color-text-muted)] font-medium">{label}</p>
      <p className="mono-num text-3xl font-bold mt-2" style={{ color: toneColor }}>{value}</p>
      <p className="text-xs text-[var(--color-text-faint)] mt-1">{sub}</p>
    </Card>
  );
}
