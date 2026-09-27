import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Card, Button, Input, Select, Spinner, EmptyState, Badge } from '../components/ui';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useConfirm } from '../hooks/useConfirm';

const emptyForm = { date: '', name: '', type: 'internal' };
const emptyRangeForm = { startDate: '', endDate: '', name: '', type: 'internal' };

export default function Exams() {
  const reveal = useScrollReveal();
  const { confirm, dialog } = useConfirm();
  const [exams, setExams] = useState(null);
  const [rangeMode, setRangeMode] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [rangeForm, setRangeForm] = useState(emptyRangeForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => setExams((await api.listExams()).exams);
  useEffect(() => { load(); }, []);

  const resetForms = () => {
    setForm(emptyForm);
    setRangeForm(emptyRangeForm);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    try {
      if (editingId) {
        await api.updateExam(editingId, form);
        setMessage('Exam updated.');
      } else if (rangeMode) {
        const res = await api.createExamRange(rangeForm);
        setMessage(
          res.createdCount === 0
            ? 'No new exam dates added — every date in that range was already registered.'
            : `Added ${res.createdCount} exam date${res.createdCount === 1 ? '' : 's'}${res.skippedCount ? ` (${res.skippedCount} already existed)` : ''}.`
        );
      } else {
        await api.createExam(form);
        setMessage('Exam date added.');
      }
      resetForms();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (ex) => {
    setEditingId(ex._id);
    setRangeMode(false);
    setForm({ date: new Date(ex.date).toISOString().slice(0, 10), name: ex.name, type: ex.type });
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Remove this exam date?',
      description: 'Lectures on that date go back to being markable normally.',
      confirmLabel: 'Remove exam date',
    });
    if (!ok) return;
    await api.deleteExam(id);
    await load();
  };

  return (
    <div ref={reveal} className="flex flex-col gap-6">
      {dialog}
      <div>
        <h1 className="font-display text-2xl font-semibold">Exams</h1>
        <p className="text-[var(--color-text-muted)] text-sm mt-1">Exam-period lectures never affect your attendance, same as holidays.</p>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold">{editingId ? 'Edit exam date' : 'Add an exam date'}</h2>
          {!editingId && (
            <Button variant="ghost" className="!px-3 !py-1.5 text-xs" onClick={() => { setRangeMode((v) => !v); setError(''); }}>
              {rangeMode ? 'Single date' : 'Group (date range)'}
            </Button>
          )}
        </div>

        {rangeMode && !editingId ? (
          <form onSubmit={handleSubmit} className="grid sm:grid-cols-5 gap-3 items-end">
            <Input label="From" type="date" value={rangeForm.startDate} onChange={(e) => setRangeForm((f) => ({ ...f, startDate: e.target.value }))} required />
            <Input label="To" type="date" value={rangeForm.endDate} onChange={(e) => setRangeForm((f) => ({ ...f, endDate: e.target.value }))} required />
            <Input label="Name" placeholder="e.g. Mid-semester exams" value={rangeForm.name} onChange={(e) => setRangeForm((f) => ({ ...f, name: e.target.value }))} required />
            <Select label="Type" value={rangeForm.type} onChange={(e) => setRangeForm((f) => ({ ...f, type: e.target.value }))}>
              <option value="internal">Internal</option>
              <option value="midterm">Midterm</option>
              <option value="final">Final</option>
              <option value="other">Other</option>
            </Select>
            <Button type="submit" disabled={saving}>{saving ? 'Adding…' : 'Add all dates'}</Button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="grid sm:grid-cols-4 gap-3 items-end">
            <Input label="Date" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required />
            <Input label="Name" placeholder="e.g. DBMS final" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            <Select label="Type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              <option value="internal">Internal</option>
              <option value="midterm">Midterm</option>
              <option value="final">Final</option>
              <option value="other">Other</option>
            </Select>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Add exam date'}</Button>
              {editingId && <Button type="button" variant="ghost" onClick={resetForms}>Cancel</Button>}
            </div>
          </form>
        )}
        {error && <p className="text-[var(--color-danger)] text-sm mt-3">{error}</p>}
        {message && <p className="text-[var(--color-safe)] text-sm mt-3">{message}</p>}
      </Card>

      <Card>
        {exams === null ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : exams.length === 0 ? (
          <EmptyState title="No exam dates added" hint="Add exam periods so those days are excluded from attendance calculations." />
        ) : (
          <div className="flex flex-col divide-y divide-[var(--color-border-soft)]">
            {exams.map((ex) => (
              <div key={ex._id} className="flex items-center justify-between py-3 gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="mono-num text-sm text-[var(--color-text-muted)] w-24">{new Date(ex.date).toISOString().slice(0, 10)}</span>
                  <span className="font-medium">{ex.name}</span>
                  <Badge tone="brand">{ex.type}</Badge>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="ghost" className="!px-3 !py-1.5 text-xs" onClick={() => handleEdit(ex)}>Edit</Button>
                  <Button variant="danger" className="!px-3 !py-1.5 text-xs" onClick={() => handleDelete(ex._id)}>Remove</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
