import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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

function timeOfDayGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  if (hour < 21) return 'Good Evening';
  return 'Good Night';
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [subjectCount, setSubjectCount] = useState(null);
  const [insights, setInsights] = useState([]);
  const [trend, setTrend] = useState([]);
  const [subjectStats, setSubjectStats] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState('');
  const [marking, setMarking] = useState(null);
  const reveal = useScrollReveal();

  const load = async () => {
    try {
      const [overview, insightsRes, subjectsRes, trendRes, subjectAnalyticsRes, notificationsRes] = await Promise.all([
        api.overview(),
        api.insights().catch(() => ({ insights: [] })),
        api.listSubjects().catch(() => ({ subjects: [] })),
        api.weeklyTrend().catch(() => ({ days: [] })),
        api.subjectAnalytics().catch(() => ({ subjects: [] })),
        api.listNotifications({ limit: 4 }).catch(() => ({ notifications: [] })),
      ]);
      setData(overview);
      setInsights(insightsRes.insights || []);
      setSubjectCount(subjectsRes.subjects?.length ?? 0);
      setTrend(trendRes.days || []);
      setSubjectStats(subjectAnalyticsRes.subjects || []);
      setNotifications(notificationsRes.notifications || []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Patches the clicked lecture's badge instantly (no wait), then only
  // refreshes the real aggregate numbers via overview() in the background —
  // previously this called load(), which re-ran overview + insights +
  // subjects (3 endpoints, including the semester-end achievability scan)
  // for what should be a single-row status change, and showed nothing
  // changing until all three came back.
  const mark = async (id, status) => {
    setMarking(id);
    try {
      await api.markLecture(id, status);
      setData((prev) => prev && ({
        ...prev,
        today: { ...prev.today, lectures: prev.today.lectures.map((l) => (l._id === id ? { ...l, status } : l)) },
      }));
      const overview = await api.overview();
      setData(overview);
    } catch (err) {
      setError(err.message);
    } finally {
      setMarking(null);
    }
  };

  if (error) return <Card className="text-[var(--color-danger)]">{error}</Card>;
  if (!data) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;

  const { overall, monthly, requiredAttendancePercentage, safeBunksRemaining, today, danger, monthlyDanger, semesterEndInfo } = data;
  const firstName = user?.studentName?.split(' ')[0] || 'Student';

  const pieData = [
    { name: 'Attended', value: overall.attended, color: 'var(--color-safe)' },
    { name: 'Bunked', value: overall.bunked, color: 'var(--color-danger)' },
  ].filter((d) => d.value > 0);

  return (
    <div ref={reveal} className="flex flex-col gap-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">{timeOfDayGreeting()}, {firstName}!</h1>
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

      {semesterEndInfo && !semesterEndInfo.ended && !semesterEndInfo.achievable && (
        <Card className="border-[var(--color-danger)]/40 bg-[var(--color-danger)]/8">
          <p className="font-semibold text-[var(--color-danger)]">
            Reaching {requiredAttendancePercentage}% by your semester end date ({new Date(semesterEndInfo.endDate).toISOString().slice(0, 10)}) is no longer mathematically possible
          </p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Only {semesterEndInfo.remainingLectures} lecture(s) remain — attending every one still only reaches {semesterEndInfo.bestPossiblePercentage}%. See Smart Tools for the full breakdown.
          </p>
        </Card>
      )}
      {semesterEndInfo && !semesterEndInfo.ended && semesterEndInfo.achievable && semesterEndInfo.bestPossiblePercentage - requiredAttendancePercentage < 3 && (
        <Card className="border-[var(--color-risky)]/40 bg-[var(--color-risky)]/8">
          <p className="font-semibold text-[var(--color-risky)]">
            Cutting it close: {requiredAttendancePercentage}% by {new Date(semesterEndInfo.endDate).toISOString().slice(0, 10)} is only reachable if you attend every remaining lecture
          </p>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {semesterEndInfo.remainingLectures} lecture(s) left this term, best case {semesterEndInfo.bestPossiblePercentage}% — missing even one puts the target out of reach.
          </p>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={BookIcon} label="Total Subjects" value={subjectCount} sub="This semester" />
        <StatCard icon={CalendarIcon} label="Classes Today" value={today.lectures.length} sub={`${today.summary.attended} attended so far`} />
        <StatCard icon={GaugeIcon} label="Overall Attendance" value={`${overall.percentage}%`} sub={`${overall.attended}/${overall.conducted} conducted`} progress={overall.percentage} requiredValue={requiredAttendancePercentage} />
        <StatCard icon={TrendIcon} label="Monthly Attendance" value={`${monthly.percentage}%`} sub={`${monthly.attended}/${monthly.conducted} this month`} progress={monthly.percentage} requiredValue={requiredAttendancePercentage} />
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
                <AttendanceDonut segments={pieData} />
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

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold">Weekly Attendance Trend</h2>
            <span className="text-xs text-[var(--color-text-faint)]">Cumulative, last 7 days</span>
          </div>
          <WeeklyTrendChart days={trend} requiredPct={requiredAttendancePercentage} />
        </Card>

        <Card className="lg:col-span-1 flex flex-col items-center">
          <h2 className="font-display font-semibold self-start mb-2">Bunk Risk</h2>
          <BunkRiskGauge percentage={overall.percentage} requiredPct={requiredAttendancePercentage} />
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold">Subject-wise Attendance</h2>
            <Link to="/analytics" className="text-xs text-[var(--color-brand)] hover:underline">View All →</Link>
          </div>
          {subjectStats.length === 0 ? (
            <p className="text-[var(--color-text-muted)] text-sm">No subjects yet.</p>
          ) : (
            <div className="flex flex-col gap-3.5">
              {subjectStats.slice(0, 5).map((s) => (
                <div key={s.subject.id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium truncate">{s.subject.name}</span>
                    <span className="mono-num text-xs text-[var(--color-text-faint)] shrink-0 ml-2">{s.percentage}%</span>
                  </div>
                  <ProgressBar value={s.percentage} requiredValue={requiredAttendancePercentage} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold">Recent Notifications</h2>
          </div>
          {notifications.length === 0 ? (
            <p className="text-[var(--color-text-muted)] text-sm">No notifications yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-[var(--color-border-soft)]">
              {notifications.map((n) => (
                <div key={n._id} className="py-2.5 first:pt-0 last:pb-0">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{n.body}</p>
                  <p className="text-[10px] text-[var(--color-text-faint)] mt-1">{timeAgo(n.sentAt)}</p>
                </div>
              ))}
            </div>
          )}
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

/**
 * A tiny hand-rolled SVG donut (stroke-dasharray technique) instead of
 * pulling in recharts just for two arcs — Dashboard is the default landing
 * page for most users, and recharts' chart engine is a genuinely large
 * chunk (~270KB) that Analytics still needs for its bar charts, but
 * Dashboard doesn't need to pay that cost on every first load just to draw
 * a 2-segment ring.
 */
function AttendanceDonut({ segments }) {
  const size = 128;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, d) => sum + d.value, 0) || 1;

  let cumulative = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--chart-track)" strokeWidth={strokeWidth} />
      {segments.map((d) => {
        const fraction = d.value / total;
        const dash = fraction * circumference;
        const offset = -cumulative * circumference;
        cumulative += fraction;
        return (
          <circle
            key={d.name}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={d.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

function timeAgo(dateString) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * Hand-rolled SVG line chart (no recharts — see AttendanceDonut's note above
 * on why Dashboard avoids that dependency) plotting weekly-trend's cumulative
 * percentage-as-of-each-day, with a dashed reference line at the required %.
 */
function WeeklyTrendChart({ days, requiredPct }) {
  if (!days || days.length < 2) {
    return <p className="text-[var(--color-text-muted)] text-sm py-8 text-center">Not enough data yet — check back after a few more days.</p>;
  }

  const width = 560;
  const height = 180;
  const padX = 28;
  const padTop = 14;
  const padBottom = 24;
  const plotW = width - padX * 2;
  const plotH = height - padTop - padBottom;

  const x = (i) => padX + (i / (days.length - 1)) * plotW;
  const y = (pct) => padTop + (1 - Math.min(100, Math.max(0, pct)) / 100) * plotH;

  const linePath = days.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.percentage)}`).join(' ');
  const areaPath = `${linePath} L ${x(days.length - 1)} ${padTop + plotH} L ${x(0)} ${padTop + plotH} Z`;
  const requiredY = y(requiredPct);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="none">
      <line x1={padX} x2={width - padX} y1={requiredY} y2={requiredY} stroke="var(--color-risky)" strokeWidth="1.5" strokeDasharray="5 4" />
      <text x={width - padX} y={requiredY - 6} textAnchor="end" fontSize="10" fill="var(--color-risky)">{requiredPct}% required</text>
      <path d={areaPath} fill="var(--color-brand)" opacity="0.08" stroke="none" />
      <path d={linePath} fill="none" stroke="var(--color-brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {days.map((d, i) => (
        <circle key={d.date} cx={x(i)} cy={y(d.percentage)} r="3.5" fill="var(--color-surface)" stroke="var(--color-brand)" strokeWidth="2" />
      ))}
      {days.map((d, i) => (
        <text key={d.date} x={x(i)} y={height - 4} textAnchor="middle" fontSize="10" fill="var(--chart-tick)">
          {new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' })}
        </text>
      ))}
    </svg>
  );
}

/**
 * Semicircular risk gauge: the arc is split into danger/risky/safe zones at
 * the same requiredPct/+5 cushion used everywhere else (ProgressBar,
 * Analytics, Tools), with a needle pointing at the current overall %.
 * "Risk" is framed as the inverse of attendance health — low % = high risk.
 */
function BunkRiskGauge({ percentage, requiredPct }) {
  const cx = 100;
  const cy = 100;
  const r = 72;
  const circumference = Math.PI * r;
  const dangerEnd = Math.min(100, requiredPct);
  const riskyEnd = Math.min(100, requiredPct + 5);

  const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const dangerLen = (dangerEnd / 100) * circumference;
  const riskyLen = ((riskyEnd - dangerEnd) / 100) * circumference;
  const safeLen = circumference - dangerLen - riskyLen;

  const clamped = Math.min(100, Math.max(0, percentage));
  const angle = Math.PI * (1 - clamped / 100);
  const needleX = cx + (r - 6) * Math.cos(angle);
  const needleY = cy - (r - 6) * Math.sin(angle);

  const level = percentage < requiredPct ? 'High' : percentage < requiredPct + 5 ? 'Medium' : 'Low';
  const levelColor = level === 'High' ? 'var(--color-danger)' : level === 'Medium' ? 'var(--color-risky)' : 'var(--color-safe)';

  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 200 115" className="w-full max-w-[220px]">
        <path d={arcPath} fill="none" stroke="var(--color-danger)" strokeWidth="14" strokeDasharray={`${dangerLen} ${circumference - dangerLen}`} />
        <path d={arcPath} fill="none" stroke="var(--color-risky)" strokeWidth="14" strokeDasharray={`${riskyLen} ${circumference - riskyLen}`} strokeDashoffset={-dangerLen} />
        <path d={arcPath} fill="none" stroke="var(--color-safe)" strokeWidth="14" strokeDasharray={`${safeLen} ${circumference - safeLen}`} strokeDashoffset={-(dangerLen + riskyLen)} />
        <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke="var(--color-text)" strokeWidth="3" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="5" fill="var(--color-text)" />
      </svg>
      <p className="mono-num text-2xl font-bold -mt-4" style={{ color: levelColor }}>{level} Risk</p>
      <p className="text-xs text-[var(--color-text-faint)]">Overall attendance {percentage}%</p>
    </div>
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
function TrendIcon(props) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><path d="M3 17 9 11l4 4 8-8" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 7h6v6" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function BoltIcon(props) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" strokeLinejoin="round"/></svg>; }
function ChartIcon(props) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><path d="M4 20V10M12 20V4M20 20v-7" strokeLinecap="round"/></svg>; }
function RoomIcon(props) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}><path d="M17 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="7" r="3.5"/><path d="M20.5 20v-2a4 4 0 0 0-3-3.87M14.5 3.3a3.5 3.5 0 0 1 0 6.7" strokeLinecap="round"/></svg>; }
