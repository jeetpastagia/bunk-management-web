import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';
import { Card, Button, Spinner, Select } from '../components/ui';
import { runTimetableOcr, buildGridFromWords, matchSubjectName } from '../lib/timetableOcr';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_LABELS = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat' };
const MAX_LECTURES = 8;

export default function Timetable() {
  const [subjects, setSubjects] = useState([]);
  const [grid, setGrid] = useState({}); // `${day}-${lectureNumber}` -> subjectId
  const [weekly, setWeekly] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      const [subjectsRes, timetableRes] = await Promise.all([api.listSubjects(), api.getTimetable()]);
      setSubjects(subjectsRes.subjects);
      const g = {};
      for (const slot of timetableRes.slots) {
        g[`${slot.day}-${slot.lectureNumber}`] = slot.subject._id || slot.subject;
      }
      setGrid(g);
      setLoading(false);
    })();
  }, []);

  const lectureNumbers = useMemo(() => Array.from({ length: MAX_LECTURES }, (_, i) => i + 1), []);

  const setCell = (day, lectureNumber, subjectId) => {
    setGrid((g) => {
      const next = { ...g };
      const key = `${day}-${lectureNumber}`;
      if (!subjectId) delete next[key];
      else next[key] = subjectId;
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const slots = Object.entries(grid).map(([key, subject]) => {
        const [day, lectureNumber] = key.split('-');
        return { day, lectureNumber: Number(lectureNumber), subject };
      });
      await api.setTimetable(slots);
      const weeklyRes = await api.weeklyAnalysis();
      setWeekly(weeklyRes);
      setMessage('Timetable saved.');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    setOcrBusy(true);
    setOcrResult(null);
    setMessage('');
    try {
      const { words } = await runTimetableOcr(file);
      const { cells } = buildGridFromWords(words);

      let matched = 0;
      let unmatched = 0;
      setGrid((g) => {
        const next = { ...g };
        for (const [key, text] of Object.entries(cells)) {
          const subjectId = matchSubjectName(text, subjects);
          if (subjectId) {
            next[key] = subjectId;
            matched += 1;
          } else {
            unmatched += 1;
          }
        }
        return next;
      });
      setOcrResult({ matched, unmatched, total: matched + unmatched });
    } catch (err) {
      setMessage(`Couldn't read that image: ${err.message}`);
    } finally {
      setOcrBusy(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size={32} /></div>;

  if (subjects.length === 0) {
    return (
      <Card>
        <p className="font-display font-semibold mb-1">Add subjects first</p>
        <p className="text-[var(--color-text-muted)] text-sm">You need at least one subject before building a timetable.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Timetable</h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-1">Assign a subject to each lecture slot.</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          <Button variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={ocrBusy}>
            {ocrBusy ? 'Reading image…' : 'Upload timetable photo'}
          </Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save timetable'}</Button>
        </div>
      </div>

      {ocrBusy && (
        <Card className="flex items-center gap-3">
          <Spinner size={18} />
          <p className="text-sm text-[var(--color-text-muted)]">Reading your timetable photo — this runs right in your browser and can take a few seconds.</p>
        </Card>
      )}

      {ocrResult && (
        <Card className="border-[var(--color-brand)]/30 bg-[var(--color-brand)]/8">
          <p className="text-sm">
            Filled in <span className="font-semibold">{ocrResult.matched}</span> of {ocrResult.total} detected slot(s) automatically.
            {ocrResult.unmatched > 0 && ` ${ocrResult.unmatched} slot(s) were detected but couldn't be matched to a subject — check the grid below and fill in any gaps or corrections.`}
            {' '}Always double-check before saving — photo OCR isn't perfect.
          </p>
        </Card>
      )}

      {message && <p className="text-sm text-[var(--color-brand-soft)]">{message}</p>}

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr>
              <th className="text-left text-xs font-medium text-[var(--color-text-faint)] pb-3 pr-3 w-20">Lecture</th>
              {DAYS.map((d) => (
                <th key={d} className="text-left text-xs font-medium text-[var(--color-text-faint)] pb-3 px-1.5">{DAY_LABELS[d]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lectureNumbers.map((n) => (
              <tr key={n}>
                <td className="mono-num text-sm text-[var(--color-text-muted)] pr-3 py-1.5">#{n}</td>
                {DAYS.map((day) => (
                  <td key={day} className="px-1.5 py-1.5">
                    <Select
                      value={grid[`${day}-${n}`] || ''}
                      onChange={(e) => setCell(day, n, e.target.value)}
                      className="!py-2 !px-2.5 text-xs w-full min-w-28"
                    >
                      <option value="">—</option>
                      {subjects.map((s) => (
                        <option key={s._id} value={s._id}>{s.name}</option>
                      ))}
                    </Select>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {weekly && (
        <Card>
          <h2 className="font-display font-semibold mb-4">Weekly analysis</h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-3">{weekly.totalWeeklyLectures} lectures per week, total</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(weekly.subjectWise).map(([name, count]) => (
              <span key={name} className="px-3 py-1.5 rounded-full bg-white/6 text-sm">
                <span className="font-medium">{name}</span> <span className="mono-num text-[var(--color-text-muted)]">× {count}</span>
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
