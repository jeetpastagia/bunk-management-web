import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input, Spinner, Badge } from '../components/ui';
import { enablePushNotifications, disablePushNotifications, getStoredFcmToken, isFcmConfigured } from '../lib/notifications';

export default function Settings() {
  const { user, refresh } = useAuth();
  const [semesters, setSemesters] = useState(null);
  const [showNewSemester, setShowNewSemester] = useState(false);
  const [form, setForm] = useState({ semesterName: '', semesterStartDate: '', semesterEndDate: '', requiredAttendancePercentage: user?.requiredAttendancePercentage || 75, reuseTimetable: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pushEnabled, setPushEnabled] = useState(Boolean(getStoredFcmToken()));
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState('');

  const handleTogglePush = async () => {
    setPushBusy(true);
    setPushError('');
    try {
      if (pushEnabled) {
        await disablePushNotifications();
        setPushEnabled(false);
      } else {
        const ok = await enablePushNotifications();
        if (!ok) setPushError('Permission denied or push isn’t supported in this browser.');
        setPushEnabled(ok);
      }
    } catch (err) {
      setPushError(err.message);
    } finally {
      setPushBusy(false);
    }
  };

  const load = async () => setSemesters((await api.listSemesters()).semesters);
  useEffect(() => { load(); }, []);

  const handleArchiveAndStart = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.startNewSemester({ ...form, requiredAttendancePercentage: Number(form.requiredAttendancePercentage), semesterEndDate: form.semesterEndDate || undefined });
      await refresh();
      await load();
      setShowNewSemester(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Settings</h1>
        <p className="text-[var(--color-text-muted)] text-sm mt-1">Profile and semester management.</p>
      </div>

      <Card>
        <h2 className="font-display font-semibold mb-4">Profile</h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <Field label="Student name" value={user?.studentName} />
          <Field label="College" value={user?.collegeName} />
          <Field label="Mobile number" value={user?.mobileNumber} />
          <Field label="Required attendance" value={`${user?.requiredAttendancePercentage}%`} />
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display font-semibold">Notifications</h2>
          <Badge tone={pushEnabled ? 'safe' : 'neutral'}>{pushEnabled ? 'Enabled' : 'Disabled'}</Badge>
        </div>
        <p className="text-sm text-[var(--color-text-muted)] mb-4">
          Lecture reminders, attendance nudges, and 75%-threshold warnings, delivered as push notifications.
        </p>
        {!isFcmConfigured() ? (
          <p className="text-xs text-[var(--color-text-faint)]">Push notifications aren’t configured for this deployment yet.</p>
        ) : (
          <>
            <Button variant={pushEnabled ? 'ghost' : 'primary'} onClick={handleTogglePush} disabled={pushBusy}>
              {pushBusy ? 'Working…' : pushEnabled ? 'Disable push notifications' : 'Enable push notifications'}
            </Button>
            {pushError && <p className="text-[var(--color-danger)] text-sm mt-2">{pushError}</p>}
          </>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold">Semesters</h2>
          <Button variant="ghost" onClick={() => setShowNewSemester((v) => !v)}>
            {showNewSemester ? 'Cancel' : 'Start new semester'}
          </Button>
        </div>

        {showNewSemester && (
          <form onSubmit={handleArchiveAndStart} className="flex flex-col gap-3 mb-6 p-4 rounded-xl bg-white/5 border border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-text-muted)]">This archives your current semester (keeping its reports) and starts fresh.</p>
            <Input label="New semester name" value={form.semesterName} onChange={(e) => setForm((f) => ({ ...f, semesterName: e.target.value }))} required />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Start date" type="date" value={form.semesterStartDate} onChange={(e) => setForm((f) => ({ ...f, semesterStartDate: e.target.value }))} required />
              <Input label="End date (optional)" type="date" value={form.semesterEndDate} onChange={(e) => setForm((f) => ({ ...f, semesterEndDate: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
              <input type="checkbox" checked={form.reuseTimetable} onChange={(e) => setForm((f) => ({ ...f, reuseTimetable: e.target.checked }))} />
              Reuse subjects and timetable from the current semester
            </label>
            {error && <p className="text-[var(--color-danger)] text-sm">{error}</p>}
            <Button type="submit" disabled={saving} className="self-start">{saving ? 'Starting…' : 'Archive & start new semester'}</Button>
          </form>
        )}

        {semesters === null ? (
          <div className="flex justify-center py-6"><Spinner /></div>
        ) : (
          <div className="flex flex-col divide-y divide-[var(--color-border-soft)]">
            {semesters.map((s) => (
              <div key={s._id} className="flex items-center justify-between py-3 gap-4">
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-[var(--color-text-faint)]">
                    {new Date(s.startDate).toISOString().slice(0, 10)}{s.endDate ? ` – ${new Date(s.endDate).toISOString().slice(0, 10)}` : ''}
                  </p>
                </div>
                <Badge tone={s.status === 'active' ? 'safe' : 'neutral'}>{s.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-[var(--color-text-muted)] mb-1">{label}</p>
      <p className="font-medium">{value || '—'}</p>
    </div>
  );
}
