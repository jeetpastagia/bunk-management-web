import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Card, Button, Badge, Spinner, Input } from '../components/ui';
import { useScrollReveal } from '../hooks/useScrollReveal';

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

/** First day of the month containing the given ISO date — used as `min` so the whole start month is browsable/selectable, not just from the exact start day onward, while still blocking navigation to earlier months. */
function startOfMonthISO(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export default function Attendance() {
  const reveal = useScrollReveal();
  const [date, setDate] = useState(todayISO());
  const [lectures, setLectures] = useState(null);
  const [marking, setMarking] = useState(null);
  const [error, setError] = useState('');
  const [activeSemester, setActiveSemester] = useState(null);

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

  useEffect(() => {
    api.listSemesters()
      .then((res) => setActiveSemester(res.semesters?.find((s) => s.status === 'active') || null))
      .catch(() => {});
  }, []);

  // Patches just the one changed lecture in place instead of calling
  // load(date) — which set lectures to null first and flashed the whole
  // list + a full-page spinner for what should be a single-row update.
  // markLecture's response already has everything needed; no need to
  // re-fetch the whole day just to reflect one status change.
  const mark = async (id, status) => {
    setMarking(id);
    try {
      const { lecture } = await api.markLecture(id, status);
      setLectures((prev) => prev.map((l) => (l._id === id ? { ...l, status: lecture.status, markedAt: lecture.markedAt } : l)));
    } catch (err) {
      setError(err.message);
    } finally {
      setMarking(null);
    }
  };

  const markWholeDay = async (status) => {
    setError('');
    try {
      const { lectures: updated } = await api.markDay(date, status);
      setLectures(updated);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div ref={reveal} className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-xl font-semibold">Mark attendance</h1>
        <p className="text-[var(--color-text-muted)] text-sm mt-0.5">Attendance is tracked lecture-wise, never day-wise.</p>
      </div>

      <Card className="!p-4 flex items-center gap-4 flex-wrap">
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          min={activeSemester ? startOfMonthISO(activeSemester.startDate) : undefined}
          max={todayISO()}
          markStart={activeSemester?.startDate?.slice(0, 10)}
          markEnd={activeSemester?.endDate?.slice(0, 10)}
          className="w-auto"
        />
        <div className="flex gap-2 ml-auto">
          <Button variant="ghost" onClick={() => markWholeDay('attended')}>Mark whole day attended</Button>
          <Button variant="danger" onClick={() => markWholeDay('bunked')}>Mark whole day bunked</Button>
        </div>
      </Card>

      <Card className="!p-4">
        {error && <p className="text-[var(--color-danger)] text-sm">{error}</p>}
        {!lectures && !error ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : lectures && lectures.length === 0 ? (
          <p className="text-[var(--color-text-muted)] text-sm text-center py-6">No lectures scheduled on this date.</p>
        ) : (
          // Capped + internally scrollable so a full day's timetable never
          // pushes the date picker/whole-day buttons off-screen or forces
          // the whole page to scroll — only this list does, once it's
          // taller than roughly half the viewport.
          <div className="flex flex-col divide-y divide-[var(--color-border-soft)] max-h-[55vh] overflow-y-auto pr-1">
            {lectures?.map((l) => {
              const meta = STATUS_META[l.status];
              return (
                <div key={l._id} className="flex items-center justify-between py-2 gap-4 flex-wrap">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="mono-num text-xs text-[var(--color-text-faint)] w-5">#{l.lectureNumber}</span>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate leading-tight">{l.subject?.name}</p>
                      <p className="text-[11px] text-[var(--color-text-faint)] truncate leading-tight">{l.subject?.facultyName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge tone={meta.tone}>{meta.icon} {meta.label}</Badge>
                    <Button variant="ghost" className="!px-2 !py-1 text-xs" disabled={marking === l._id} onClick={() => mark(l._id, 'attended')}>Attended</Button>
                    <Button variant="danger" className="!px-2 !py-1 text-xs" disabled={marking === l._id} onClick={() => mark(l._id, 'bunked')}>Bunked</Button>
                    <Button variant="ghost" className="!px-2 !py-1 text-xs" disabled={marking === l._id} onClick={() => mark(l._id, 'cancelled')}>Cancelled</Button>
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
