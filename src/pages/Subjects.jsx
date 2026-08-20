import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Card, Button, Input, Spinner, EmptyState } from '../components/ui';
import { useConfirm } from '../hooks/useConfirm';

const emptyForm = { name: '', code: '', facultyName: '', credits: '', weeklyLectureCount: '' };

export default function Subjects() {
  const { confirm, dialog } = useConfirm();
  const [subjects, setSubjects] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [bulkText, setBulkText] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [backfillId, setBackfillId] = useState(null);
  const [backfillCount, setBackfillCount] = useState('');
  const [backfillBusy, setBackfillBusy] = useState(false);
  const [backfillResult, setBackfillResult] = useState(null);

  const load = async (q) => {
    const res = await api.listSubjects(q);
    setSubjects(res.subjects);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    await load(search);
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        code: form.code || undefined,
        facultyName: form.facultyName || undefined,
        credits: form.credits ? Number(form.credits) : undefined,
        weeklyLectureCount: form.weeklyLectureCount ? Number(form.weeklyLectureCount) : 0,
      };
      if (editingId) {
        await api.updateSubject(editingId, payload);
      } else {
        await api.createSubject(payload);
      }
      resetForm();
      await load(search);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (s) => {
    setEditingId(s._id);
    setForm({ name: s.name, code: s.code || '', facultyName: s.facultyName || '', credits: s.credits ?? '', weeklyLectureCount: s.weeklyLectureCount ?? '' });
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Delete this subject?',
      description: 'This also removes its timetable slots and attendance records. This action cannot be undone.',
      confirmLabel: 'Delete subject',
    });
    if (!ok) return;
    await api.deleteSubject(id);
    await load(search);
  };

  const openBackfill = (id) => {
    setBackfillId(id);
    setBackfillCount('');
    setBackfillResult(null);
  };

  const handleBackfill = async (e) => {
    e.preventDefault();
    setBackfillBusy(true);
    setError('');
    try {
      const result = await api.backfillBunks(backfillId, Number(backfillCount));
      setBackfillResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setBackfillBusy(false);
    }
  };

  // Bulk add: one subject per line as "Name, Code, Faculty, Credits, WeeklyCount"
  const handleBulk = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const rows = bulkText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .map((line) => {
          const [name, code, facultyName, credits, weeklyLectureCount] = line.split(',').map((p) => p?.trim());
          return {
            name,
            code: code || undefined,
            facultyName: facultyName || undefined,
            credits: credits ? Number(credits) : undefined,
            weeklyLectureCount: weeklyLectureCount ? Number(weeklyLectureCount) : 0,
          };
        });
      await api.bulkCreateSubjects(rows);
      setBulkText('');
      setShowBulk(false);
      await load(search);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {dialog}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Subjects</h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-1">Manage this semester's subjects.</p>
        </div>
        <Button variant="ghost" onClick={() => setShowBulk((v) => !v)}>{showBulk ? 'Close bulk add' : 'Bulk add'}</Button>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 max-w-sm">
        <Input placeholder="Search subjects or faculty…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button type="submit" variant="ghost">Search</Button>
      </form>

      {showBulk && (
        <Card>
          <h2 className="font-display font-semibold mb-2">Bulk add subjects</h2>
          <p className="text-xs text-[var(--color-text-muted)] mb-3">One subject per line: Name, Code, Faculty, Credits, Weekly lectures</p>
          <form onSubmit={handleBulk} className="flex flex-col gap-3">
            <textarea
              className="bg-[var(--tint-5)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 outline-none focus:border-[var(--color-brand)] font-mono text-sm min-h-32"
              placeholder={'DBMS, DB301, Dr. Rao, 4, 4\nJava, CS204, Prof. Iyer, 3, 5'}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              required
            />
            <Button type="submit" disabled={saving} className="self-start">{saving ? 'Adding…' : 'Add all'}</Button>
          </form>
        </Card>
      )}

      <Card>
        <h2 className="font-display font-semibold mb-4">{editingId ? 'Edit subject' : 'Add a subject'}</h2>
        <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <Input label="Name" value={form.name} onChange={set('name')} required />
          <Input label="Code (optional)" value={form.code} onChange={set('code')} />
          <Input label="Faculty" value={form.facultyName} onChange={set('facultyName')} />
          <Input label="Credits (optional)" type="number" min={0} value={form.credits} onChange={set('credits')} />
          <Input label="Weekly lectures" type="number" min={0} value={form.weeklyLectureCount} onChange={set('weeklyLectureCount')} />
          <div className="sm:col-span-2 lg:col-span-5 flex gap-2">
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Add subject'}</Button>
            {editingId && <Button type="button" variant="ghost" onClick={resetForm}>Cancel</Button>}
          </div>
        </form>
        {error && <p className="text-[var(--color-danger)] text-sm mt-3">{error}</p>}
      </Card>

      <Card>
        {subjects === null ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : subjects.length === 0 ? (
          <EmptyState title="No subjects yet" hint="Add your first subject above, or bulk add several at once." />
        ) : (
          <div className="flex flex-col divide-y divide-[var(--color-border-soft)]">
            {subjects.map((s) => (
              <div key={s._id} className="py-3">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-medium">{s.name} {s.code && <span className="text-[var(--color-text-faint)] font-normal">· {s.code}</span>}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{s.facultyName || 'No faculty set'} {s.weeklyLectureCount ? `· ${s.weeklyLectureCount}/week` : ''}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="ghost" className="!px-3 !py-1.5 text-xs" onClick={() => openBackfill(backfillId === s._id ? null : s._id)}>
                      {backfillId === s._id ? 'Close' : 'Backfill bunks'}
                    </Button>
                    <Button variant="ghost" className="!px-3 !py-1.5 text-xs" onClick={() => handleEdit(s)}>Edit</Button>
                    <Button variant="danger" className="!px-3 !py-1.5 text-xs" onClick={() => handleDelete(s._id)}>Delete</Button>
                  </div>
                </div>

                {backfillId === s._id && (
                  <div className="mt-3 p-4 rounded-xl bg-[var(--tint-5)] border border-[var(--color-border)]">
                    <p className="text-xs text-[var(--color-text-muted)] mb-3">
                      Don't remember which exact days you bunked {s.name}? Just enter how many lectures you bunked so far —
                      every other past lecture for this subject (since the semester started) will be marked attended automatically.
                    </p>
                    <form onSubmit={handleBackfill} className="flex items-end gap-2 flex-wrap">
                      <Input
                        label="Lectures bunked"
                        type="number"
                        min={0}
                        value={backfillCount}
                        onChange={(e) => setBackfillCount(e.target.value)}
                        required
                        className="w-32"
                      />
                      <Button type="submit" disabled={backfillBusy} className="!px-3 !py-2.5 text-sm">
                        {backfillBusy ? 'Applying…' : 'Apply'}
                      </Button>
                    </form>
                    {backfillResult && (
                      <p className="text-xs text-[var(--color-safe)] mt-3">
                        Done — {backfillResult.totalResolved} past lecture(s) resolved: {backfillResult.bunked} bunked, {backfillResult.attended} attended.
                        {backfillResult.clamped && ` (You entered more bunks than lectures found, so it was capped at ${backfillResult.bunked}.)`}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
