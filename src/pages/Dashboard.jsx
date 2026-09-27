import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Card, Badge, Spinner, Button, ProgressBar } from '../components/ui';
import { useScrollReveal } from '../hooks/useScrollReveal';

const STATUS_META = {
  attended: { label: 'Attended', tone: 'safe' },
  bunked: { label: 'Bunked', tone: 'danger' },
  holiday: { label: 'Holiday', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  extra: { label: 'Extra', tone: 'brand' },
  pending: { label: 'Pending', tone: 'neutral' },
  exam: { label: 'Exam', tone: 'neutral' },
};

const TODAY_LABEL = new Date().toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [subjectCount, setSubjectCount] = useState(null);
  const [insights, setInsights] = useState([]);
  const [error, setError] = useState('');
  const [marking, setMarking] = useState(null);
  const reveal = useScrollReveal();

  const load = async () => {
    try {
      const [overview, insightsRes, subjectsRes] = await Promise.all([
        api.overview(),
        api.insights().catch(() => ({ insights: [] })),
        api.listSubjects().catch(() => ({ subjects: [] })),
      ]);
      setData(overview);
      setInsights(insightsRes.insights || []);
      setSubjectCount(subjectsRes.subjects?.length ?? 0);
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

  const { overall, requiredAttendancePercentage, safeBunksRemaining, today, danger, monthlyDanger } = data;
  const firstName = user?.studentName?.split(' ')[0] || 'Student';

  const pieData = [
    { name: 'Attended', value: overall.attended, color: 'var(--color-safe)' },
    { name: 'Bunked', value: overall.bunked, color: 'var(--color-danger)' },
  ].filter((d) => d.value > 0);

  return (
    <div ref={reveal} className="flex flex-col gap-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Welcome back, {firstName} 👋</h1>
          <p className="text-[var(--color-text-muted)] text-base mt-1.5">Stay on track, manage your classes and never worry about attendance again.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium">{TODAY_LABEL}</p>
            <p className="text-xs text-[var(--color-text-faint)]">Have a productive day!</p>
          </div>
          <Link to="/subjects"><Button className="whitespace-nowrap">+ Add Subject</Button></Link>
        </div>
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

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BookIcon} label="Total Subjects" value={subjectCount} sub="This semester" />
        <StatCard icon={CalendarIcon} label="Classes Today" value={today.lectures.length} sub={`${today.summary.attended} attended so far`} />
        <StatCard icon={GaugeIcon} label="Overall Attendance" value={`${overall.percentage}%`} sub={`${overall.attended}/${overall.conducted} conducted`} progress={overall.percentage} requiredValue={requiredAttendancePercentage} />
        <StatCard icon={ClockIcon} label="Safe Bunks Left" value={Number.isFinite(safeBunksRemaining) ? safeBunksRemaining : '∞'} sub="Across all subjects" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <Card tilt className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold">Today's Classes</h2>
            <Link to="/attendance" className="text-xs text-[var(--color-brand)] hover:underline">View All →</Link>
          </div>
          {today.lectures.length === 0 ? (
            <p className="text-[var(--color-text-muted)] text-sm">No lectures scheduled today.</p>
          ) : (
            <div className="flex flex-col divide-y divide-[var(--color-border-soft)]">
              {today.lectures.map((l) => {
                const meta = STATUS_META[l.status] || STATUS_META.pending;
                return (
                  <div key={l._id} className="flex items-center justify-between py-3 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-1.5 h-6 rounded-full shrink-0" style={{ background: `var(--color-${meta.tone === 'neutral' ? 'text-faint' : meta.tone})` }} />
                      <div className="min-w-0">
                        <p className="font-medium truncate text-sm">{l.subject?.name || 'Subject'}</p>
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

        <Card tilt className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold">Attendance Overview</h2>
            <span className="text-xs text-[var(--color-text-faint)]">Overall</span>
          </div>
          {pieData.length === 0 ? (
            <p className="text-[var(--color-text-muted)] text-sm">No lectures marked yet.</p>
          ) : (
            <div className="flex items-center gap-5">
              <div className="relative w-32 h-32 shrink-0">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" innerRadius="70%" outerRadius="100%" paddingAngle={2} stroke="none">
                      {pieData.map((d) => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="mono-num text-xl font-bold">{overall.percentage}%</span>
                  <span className="text-[10px] text-[var(--color-text-faint)]">Overall</span>
                </div>
              </div>
              <div className="flex flex-col gap-2.5 text-sm">
                <LegendRow color="var(--color-safe)" label="Attended" value={overall.attended} />
                <LegendRow color="var(--color-danger)" label="Bunked" value={overall.bunked} />
                <LegendRow color="var(--color-text-faint)" label="Total Classes" value={overall.conducted} />
              </div>
            </div>
          )}
        </Card>

        <Card tilt className="lg:col-span-1">
          <h2 className="font-display font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <QuickAction to="/timetable" icon={CalendarIcon} label="Generate Timetable" />
            <QuickAction to="/rooms" icon={RoomIcon} label="Join Study Room" />
            <QuickAction to="/tools" icon={BoltIcon} label="Calculate Attendance" />
            <QuickAction to="/analytics" icon={ChartIcon} label="View Reports" />
          </div>
        </Card>
      </div>

      {insights.length > 0 && (
        <Card>
          <h2 className="font-display font-semibold mb-4">Smart insights</h2>
          <ul className="flex flex-col gap-2.5">
            {insights.map((msg, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <span className="text-[var(--color-brand)] mt-0.5">◆</span>
                <span className="text-[var(--color-text-muted)]">{msg}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, progress, requiredValue }) {
  return (
    <Card tilt className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-xl bg-[var(--tint-8)] flex items-center justify-center text-[var(--color-brand)]">
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div>
        <p className="text-xs text-[var(--color-text-muted)] font-medium">{label}</p>
        <p className="mono-num text-2xl font-bold mt-1">{value}</p>
      </div>
      {progress !== undefined ? (
        <ProgressBar value={progress} requiredValue={requiredValue} />
      ) : (
        <p className="text-xs text-[var(--color-text-faint)]">{sub}</p>
      )}
      {progress !== undefined && <p className="text-xs text-[var(--color-text-faint)] -mt-1.5">{sub}</p>}
    </Card>
  );
}

function LegendRow({ color, label, value }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
      <span className="text-[var(--color-text-muted)]">{label}</span>
      <span className="mono-num font-semibold ml-auto pl-4">{value}</span>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-[var(--tint-5)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-center transition-colors"
    >
      <Icon className="w-5 h-5 text-[var(--color-brand)]" />
      <span className="text-xs font-medium leading-tight">{label}</span>
    </Link>
  );
}

function BookIcon(props) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z"/><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20"/></svg>; }
function CalendarIcon(props) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M8 3v4M16 3v4M3 10h18" strokeLinecap="round"/></svg>; }
function GaugeIcon(props) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><path d="M4 14a8 8 0 1 1 16 0" strokeLinecap="round"/><path d="M12 14l4-4" strokeLinecap="round"/><circle cx="12" cy="14" r="1.3" fill="currentColor" stroke="none"/></svg>; }
function ClockIcon(props) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function BoltIcon(props) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" strokeLinejoin="round"/></svg>; }
function ChartIcon(props) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><path d="M4 20V10M12 20V4M20 20v-7" strokeLinecap="round"/></svg>; }
function RoomIcon(props) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><path d="M17 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="7" r="3.5"/><path d="M20.5 20v-2a4 4 0 0 0-3-3.87M14.5 3.3a3.5 3.5 0 0 1 0 6.7" strokeLinecap="round"/></svg>; }
