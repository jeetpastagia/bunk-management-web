import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Card, Button, Badge, Spinner, Input } from '../components/ui';

const STATUS_META = {
  attended: { label: 'Attended', tone: 'safe', icon: '✅' },
  bunked: { label: 'Bunked', tone: 'danger', icon: '❌' },
  holiday: { label: 'Holiday', tone: 'neutral', icon: '📅' },
  cancelled: { label: 'Cancelled', tone: 'neutral', icon: '🚫' },
  extra: { label: 'Extra', tone: 'brand', icon: '🏫' },
  pending: { label: 'Pending', tone: 'neutral', icon: '' },
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function Attendance() {
  const [date, setDate] = useState(todayISO());
  const [lectures, setLectures] = useState(null);
  const [marking, setMarking] = useState(null);
  const [error, setError] = useState('');

  const load = async (d) => {
    setLectures(null);
    setError('');
    try {
      const res = await api.getDayLectures(d);
      setLectures(res.lectures);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load(date);
  }, [date]);

  const mark = async (id, status) => {
    setMarking(id);
    try {
      await api.markLecture(id, status);
      await load(date);
    } finally {
      setMarking(null);
    }
  };

  const markWholeDay = async (status) => {
    await api.markDay(date, status);
    await load(date);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Mark attendance</h1>
        <p className="text-[var(--color-text-muted)] text-sm mt-1">Attendance is tracked lecture-wise, never day-wise.</p>
      </div>

      <Card className="flex items-center gap-4 flex-wrap">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={todayISO()} className="w-auto" />
        <div className="flex gap-2 ml-auto">
          <Button variant="ghost" onClick={() => markWholeDay('attended')}>Mark whole day attended</Button>
          <Button variant="danger" onClick={() => markWholeDay('bunked')}>Mark whole day bunked</Button>
        </div>
      </Card>

      <Card>
        {error && <p className="text-[var(--color-danger)] text-sm">{error}</p>}
        {!lectures && !error ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : lectures && lectures.length === 0 ? (
          <p className="text-[var(--color-text-muted)] text-sm text-center py-6">No lectures scheduled on this date.</p>
        ) : (
          <div className="flex flex-col divide-y divide-[var(--color-border-soft)]">
            {lectures?.map((l) => {
              const meta = STATUS_META[l.status];
              return (
                <div key={l._id} className="flex items-center justify-between py-3.5 gap-4 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="mono-num text-xs text-[var(--color-text-faint)] w-6">#{l.lectureNumber}</span>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{l.subject?.name}</p>
                      <p className="text-xs text-[var(--color-text-faint)] truncate">{l.subject?.facultyName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge tone={meta.tone}>{meta.icon} {meta.label}</Badge>
                    <Button variant="ghost" className="!px-2.5 !py-1.5 text-xs" disabled={marking === l._id} onClick={() => mark(l._id, 'attended')}>Attended</Button>
                    <Button variant="danger" className="!px-2.5 !py-1.5 text-xs" disabled={marking === l._id} onClick={() => mark(l._id, 'bunked')}>Bunked</Button>
                    <Button variant="ghost" className="!px-2.5 !py-1.5 text-xs" disabled={marking === l._id} onClick={() => mark(l._id, 'cancelled')}>Cancelled</Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
