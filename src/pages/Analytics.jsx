import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { api } from '../api/client';
import { Card, Spinner, ProgressBar, Badge } from '../components/ui';

export default function Analytics() {
  const [tab, setTab] = useState('subjects');
  const [subjects, setSubjects] = useState(null);
  const [faculty, setFaculty] = useState(null);

  useEffect(() => {
    api.subjectAnalytics().then((r) => setSubjects(r.subjects));
    api.facultyAnalytics().then((r) => setFaculty(r));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Analytics</h1>
        <p className="text-[var(--color-text-muted)] text-sm mt-1">Subject and faculty attendance breakdown.</p>
      </div>

      <div className="flex gap-2">
        <TabButton active={tab === 'subjects'} onClick={() => setTab('subjects')}>Subjects</TabButton>
        <TabButton active={tab === 'faculty'} onClick={() => setTab('faculty')}>Faculty</TabButton>
      </div>

      {tab === 'subjects' ? (
        !subjects ? <div className="flex justify-center py-16"><Spinner size={32} /></div> : <SubjectsView subjects={subjects} />
      ) : !faculty ? (
        <div className="flex justify-center py-16"><Spinner size={32} /></div>
      ) : (
        <FacultyView data={faculty} />
      )}
    </div>
  );
}

function TabButton({ active, children, ...props }) {
  return (
    <button
      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${active ? 'bg-[var(--color-brand)] text-white' : 'bg-white/5 text-[var(--color-text-muted)] hover:bg-white/10'}`}
      {...props}
    >
      {children}
    </button>
  );
}

function SubjectsView({ subjects }) {
  if (subjects.length === 0) return <Card><p className="text-[var(--color-text-muted)] text-sm">No subjects yet.</p></Card>;

  const chartData = subjects.map((s) => ({ name: s.subject.name, percentage: s.percentage }));

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <h2 className="font-display font-semibold mb-4">Attendance by subject</h2>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#8A90A3', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
              <YAxis tick={{ fill: '#8A90A3', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: '#171C27', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="percentage" radius={[6, 6, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.percentage < 75 ? '#FF5C6C' : d.percentage < 83 ? '#F2B84B' : '#3ECF8E'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {subjects.map((s) => (
          <Card key={s.subject.id}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-medium">{s.subject.name}</p>
                <p className="text-xs text-[var(--color-text-faint)]">{s.subject.facultyName}</p>
              </div>
              <span className="mono-num text-xl font-bold">{s.percentage}%</span>
            </div>
            <ProgressBar value={s.percentage} />
            <div className="flex justify-between text-xs text-[var(--color-text-muted)] mt-2.5">
              <span>{s.attended}/{s.conducted} attended</span>
              <span>{Number.isFinite(s.safeBunksRemaining) ? `${s.safeBunksRemaining} safe bunks` : `${s.lecturesNeeded} needed`}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function FacultyView({ data }) {
  if (!data.faculty || data.faculty.length === 0) return <Card><p className="text-[var(--color-text-muted)] text-sm">No faculty data yet.</p></Card>;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <p className="text-xs text-[var(--color-text-muted)] font-medium mb-1">Most attended faculty</p>
          <p className="font-display font-semibold text-lg">{data.mostAttended?.facultyName}</p>
          <p className="mono-num text-[var(--color-safe)] text-2xl font-bold mt-1">{data.mostAttended?.percentage}%</p>
        </Card>
        <Card>
          <p className="text-xs text-[var(--color-text-muted)] font-medium mb-1">Most bunked faculty</p>
          <p className="font-display font-semibold text-lg">{data.mostBunked?.facultyName}</p>
          <p className="mono-num text-[var(--color-danger)] text-2xl font-bold mt-1">{data.mostBunked?.bunked} bunks</p>
        </Card>
      </div>

      <Card>
        <h2 className="font-display font-semibold mb-4">Faculty ranking</h2>
        <div className="flex flex-col divide-y divide-[var(--color-border-soft)]">
          {data.faculty.map((f, i) => (
            <div key={f.facultyName} className="flex items-center justify-between py-3 gap-4">
              <div className="flex items-center gap-3">
                <span className="mono-num text-xs text-[var(--color-text-faint)] w-5">{i + 1}</span>
                <span className="font-medium">{f.facultyName}</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={f.percentage < 75 ? 'danger' : f.percentage < 83 ? 'risky' : 'safe'}>{f.percentage}%</Badge>
                <span className="text-xs text-[var(--color-text-faint)] mono-num w-16 text-right">{f.attended}/{f.conducted}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
