import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Card, Button, Input, Select, Spinner, EmptyState, Badge } from '../components/ui';

export default function Holidays() {
  const [holidays, setHolidays] = useState(null);
  const [form, setForm] = useState({ date: '', name: '', type: 'manual' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => setHolidays((await api.listHolidays()).holidays);
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.createHoliday(form);
      setForm({ date: '', name: '', type: 'manual' });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    await api.deleteHoliday(id);
    await load();
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Holidays</h1>
        <p className="text-[var(--color-text-muted)] text-sm mt-1">Holiday lectures never affect your attendance.</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="grid sm:grid-cols-4 gap-3 items-end">
          <Input label="Date" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required />
          <Input label="Name" placeholder="e.g. Diwali" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          <Select label="Type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
            <option value="manual">Manual</option>
            <option value="college">College</option>
            <option value="national">National</option>
          </Select>
          <Button type="submit" disabled={saving}>{saving ? 'Adding…' : 'Add holiday'}</Button>
        </form>
        {error && <p className="text-[var(--color-danger)] text-sm mt-3">{error}</p>}
      </Card>

      <Card>
        {holidays === null ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : holidays.length === 0 ? (
          <EmptyState title="No holidays added" hint="Add college or national holidays so they're excluded from attendance calculations." />
        ) : (
          <div className="flex flex-col divide-y divide-[var(--color-border-soft)]">
            {holidays.map((h) => (
              <div key={h._id} className="flex items-center justify-between py-3 gap-4">
                <div className="flex items-center gap-3">
                  <span className="mono-num text-sm text-[var(--color-text-muted)] w-24">{new Date(h.date).toISOString().slice(0, 10)}</span>
                  <span className="font-medium">{h.name}</span>
                  <Badge tone="neutral">{h.type}</Badge>
                </div>
                <Button variant="danger" className="!px-3 !py-1.5 text-xs" onClick={() => handleDelete(h._id)}>Remove</Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
