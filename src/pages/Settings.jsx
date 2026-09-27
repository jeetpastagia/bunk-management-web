import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Card, Button, Input, Select, Spinner, Badge, Switch, ProgressBar } from '../components/ui';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useConfirm } from '../hooks/useConfirm';
import { enablePushNotifications, disablePushNotifications, getStoredFcmToken, isFcmConfigured } from '../lib/notifications';

const DEFAULT_NOTIFICATION_PREFS = { attendanceWarnings: true, roomActivity: true, timetableUpdates: true };

export default function Settings() {
  const { user, setUser, refresh } = useAuth();
  const { theme, setTheme } = useTheme();
  const reveal = useScrollReveal();
  const { confirm, dialog } = useConfirm();
  const [semesters, setSemesters] = useState(null);
  const [showNewSemester, setShowNewSemester] = useState(false);
  const [form, setForm] = useState({ semesterName: '', semesterStartDate: '', semesterEndDate: '', requiredAttendancePercentage: user?.requiredAttendancePercentage || 75, reuseTimetable: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [viewingSemester, setViewingSemester] = useState(null); // the semester object whose detail modal is open
  const [semesterDetail, setSemesterDetail] = useState(null); // fetched overview for viewingSemester
  const [detailLoading, setDetailLoading] = useState(false);
  const [editingSemesterId, setEditingSemesterId] = useState(null);
  const [editSemesterForm, setEditSemesterForm] = useState(null);
  const [semesterActionError, setSemesterActionError] = useState('');
  const [pushEnabled, setPushEnabled] = useState(Boolean(getStoredFcmToken()));
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState('');
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ studentName: user?.studentName || '', mobileNumber: user?.mobileNumber || '', collegeName: user?.collegeName || '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [notifPrefBusy, setNotifPrefBusy] = useState('');
  const [thresholdValue, setThresholdValue] = useState(user?.requiredAttendancePercentage ?? 75);
  const [thresholdSaving, setThresholdSaving] = useState(false);
  const [thresholdMessage, setThresholdMessage] = useState('');
  const [prefBusy, setPrefBusy] = useState('');

  const notificationPrefs = { ...DEFAULT_NOTIFICATION_PREFS, ...user?.notificationPrefs };

  const handleNotifPrefChange = async (key, value) => {
    setNotifPrefBusy(key);
    try {
      const { user: updated } = await api.updateProfile({ notificationPrefs: { [key]: value } });
      setUser(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setNotifPrefBusy('');
    }
  };

  const handleThresholdSave = async (e) => {
    e.preventDefault();
    setThresholdSaving(true);
    setThresholdMessage('');
    try {
      await api.updateAttendanceThreshold(Number(thresholdValue));
      await refresh();
      setThresholdMessage('Attendance warning threshold updated.');
    } catch (err) {
      setThresholdMessage(err.message);
    } finally {
      setThresholdSaving(false);
    }
  };

  const handleDefaultStartPageChange = async (value) => {
    setPrefBusy('defaultStartPage');
    try {
      const { user: updated } = await api.updateProfile({ defaultStartPage: value });
      setUser(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setPrefBusy('');
    }
  };

  const handleConfirmBeforeDeleteChange = async (value) => {
    setPrefBusy('confirmBeforeDelete');
    try {
      const { user: updated } = await api.updateProfile({ confirmBeforeDelete: value });
      setUser(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setPrefBusy('');
    }
  };

  const openProfileEdit = () => {
    setProfileForm({ studentName: user?.studentName || '', mobileNumber: user?.mobileNumber || '', collegeName: user?.collegeName || '' });
    setProfileError('');
    setEditingProfile(true);
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSaving(true);
    try {
      await api.updateProfile(profileForm);
      await refresh();
      setEditingProfile(false);
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setProfileSaving(false);
    }
  };

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

  const openSemesterDetail = async (s) => {
    setViewingSemester(s);
    setSemesterDetail(null);
    setDetailLoading(true);
    try {
      const res = await api.semesterOverview(s._id);
      setSemesterDetail(res);
    } catch (err) {
      setSemesterDetail({ error: err.message });
    } finally {
      setDetailLoading(false);
    }
  };
  const closeSemesterDetail = () => {
    setViewingSemester(null);
    setSemesterDetail(null);
  };

  const openSemesterEdit = (s) => {
    setSemesterActionError('');
    setEditingSemesterId(s._id);
    setEditSemesterForm({
      name: s.name,
      startDate: new Date(s.startDate).toISOString().slice(0, 10),
      endDate: s.endDate ? new Date(s.endDate).toISOString().slice(0, 10) : '',
      requiredAttendancePercentage: s.requiredAttendancePercentage,
    });
  };
  const closeSemesterEdit = () => {
    setEditingSemesterId(null);
    setEditSemesterForm(null);
  };

  const handleSemesterEditSave = async (e) => {
    e.preventDefault();
    setSemesterActionError('');
    setSaving(true);
    try {
      await api.updateSemester(editingSemesterId, {
        name: editSemesterForm.name,
        startDate: editSemesterForm.startDate,
        endDate: editSemesterForm.endDate || null,
        requiredAttendancePercentage: Number(editSemesterForm.requiredAttendancePercentage),
      });
      await refresh(); // in case this was the active semester and the threshold changed
      await load();
      closeSemesterEdit();
    } catch (err) {
      setSemesterActionError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSemesterDelete = async (s) => {
    setSemesterActionError('');
    const ok = await confirm({
      title: `Delete "${s.name}"?`,
      description: 'This permanently removes its subjects, timetable, and attendance history. This action cannot be undone.',
      confirmLabel: 'Delete semester',
    });
    if (!ok) return;
    try {
      await api.deleteSemester(s._id);
      await load();
    } catch (err) {
      setSemesterActionError(err.message);
    }
  };

  return (
    <div ref={reveal} className="flex flex-col gap-6">
      {dialog}
      <div>
        <h1 className="font-display text-2xl font-semibold">Settings</h1>
        <p className="text-[var(--color-text-muted)] text-sm mt-1">Profile and semester management.</p>
        {error && <p className="text-[var(--color-danger)] text-sm mt-2">{error}</p>}
      </div>

      <Card>
        <h2 className="font-display font-semibold mb-1">Appearance</h2>
        <p className="text-sm text-[var(--color-text-muted)] mb-4">Applies instantly, everywhere in the app.</p>
        <div className="inline-flex rounded-xl border border-[var(--color-border)] p-1 gap-1 bg-[var(--tint-5)]">
          {[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'system', label: 'System' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                theme === opt.value
                  ? 'bg-[var(--color-brand)] text-white'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold">Profile</h2>
          <Button variant="ghost" onClick={() => (editingProfile ? setEditingProfile(false) : openProfileEdit())}>
            {editingProfile ? 'Cancel' : 'Edit'}
          </Button>
        </div>

        {editingProfile ? (
          <form onSubmit={handleProfileSave} className="flex flex-col gap-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <Input label="Student name" value={profileForm.studentName} onChange={(e) => setProfileForm((f) => ({ ...f, studentName: e.target.value }))} />
              <Input label="Mobile number" value={profileForm.mobileNumber} onChange={(e) => setProfileForm((f) => ({ ...f, mobileNumber: e.target.value }))} />
              <Input label="College" value={profileForm.collegeName} onChange={(e) => setProfileForm((f) => ({ ...f, collegeName: e.target.value }))} />
            </div>
            {profileError && <p className="text-[var(--color-danger)] text-sm">{profileError}</p>}
            <Button type="submit" disabled={profileSaving} className="self-start">{profileSaving ? 'Saving…' : 'Save changes'}</Button>
          </form>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <Field label="Student name" value={user?.studentName} />
            <Field label="College" value={user?.collegeName} />
            <Field label="Mobile number" value={user?.mobileNumber} />
            <Field label="Required attendance" value={`${user?.requiredAttendancePercentage}%`} />
          </div>
        )}
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
          <p className="text-xs text-[var(--color-text-faint)] mb-4">Push notifications aren’t configured for this deployment yet.</p>
        ) : (
          <>
            <Button variant={pushEnabled ? 'ghost' : 'primary'} onClick={handleTogglePush} disabled={pushBusy}>
              {pushBusy ? 'Working…' : pushEnabled ? 'Disable push notifications' : 'Enable push notifications'}
            </Button>
            {pushError && <p className="text-[var(--color-danger)] text-sm mt-2">{pushError}</p>}
          </>
        )}

        <div className="flex flex-col divide-y divide-[var(--color-border-soft)] mt-5 pt-1">
          <NotificationToggleRow
            label="Attendance/bunk warnings"
            hint="Lecture reminders, missed-marking nudges, and threshold warnings."
            checked={notificationPrefs.attendanceWarnings}
            busy={notifPrefBusy === 'attendanceWarnings'}
            onChange={(v) => handleNotifPrefChange('attendanceWarnings', v)}
          />
          <NotificationToggleRow
            label="Room activity notifications"
            hint="When someone joins a room you own."
            checked={notificationPrefs.roomActivity}
            busy={notifPrefBusy === 'roomActivity'}
            onChange={(v) => handleNotifPrefChange('roomActivity', v)}
          />
          <NotificationToggleRow
            label="Timetable update notifications"
            hint="When a room you're in changes its shared subjects/timetable."
            checked={notificationPrefs.timetableUpdates}
            busy={notifPrefBusy === 'timetableUpdates'}
            onChange={(v) => handleNotifPrefChange('timetableUpdates', v)}
          />
        </div>
      </Card>

      <Card>
        <h2 className="font-display font-semibold mb-4">Attendance & behavior</h2>
        <form onSubmit={handleThresholdSave} className="flex items-end gap-2 flex-wrap mb-5">
          <Input
            label="Attendance warning percentage"
            type="number"
            min={0}
            max={100}
            value={thresholdValue}
            onChange={(e) => setThresholdValue(e.target.value)}
            className="w-40"
          />
          <Button type="submit" disabled={thresholdSaving}>{thresholdSaving ? 'Saving…' : 'Save'}</Button>
        </form>
        {thresholdMessage && <p className="text-sm text-[var(--color-text-muted)] mb-5">{thresholdMessage}</p>}

        <div className="flex flex-col divide-y divide-[var(--color-border-soft)]">
          <div className="flex items-center justify-between py-3 gap-4">
            <div>
              <p className="text-sm font-medium">Default starting page</p>
              <p className="text-xs text-[var(--color-text-faint)] mt-0.5">What opens right after you log in.</p>
            </div>
            <Select
              value={user?.defaultStartPage || 'dashboard'}
              onChange={(e) => handleDefaultStartPageChange(e.target.value)}
              disabled={prefBusy === 'defaultStartPage'}
              className="!py-2 w-40"
            >
              <option value="dashboard">Dashboard</option>
              <option value="timetable">Timetable</option>
              <option value="rooms">Rooms</option>
            </Select>
          </div>
          <div className="flex items-center justify-between py-3 gap-4">
            <div>
              <p className="text-sm font-medium">Ask before deleting data</p>
              <p className="text-xs text-[var(--color-text-faint)] mt-0.5">Show a confirmation before destructive actions like deleting a subject or room.</p>
            </div>
            <Switch
              checked={user?.confirmBeforeDelete !== false}
              disabled={prefBusy === 'confirmBeforeDelete'}
              onChange={handleConfirmBeforeDeleteChange}
              label="Ask before deleting data"
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold">Semesters</h2>
          <Button variant="ghost" onClick={() => setShowNewSemester((v) => !v)}>
            {showNewSemester ? 'Cancel' : 'Start new semester'}
          </Button>
        </div>

        {showNewSemester && (
          <form onSubmit={handleArchiveAndStart} className="flex flex-col gap-3 mb-6 p-4 rounded-xl bg-[var(--tint-5)] border border-[var(--color-border)]">
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

        {semesterActionError && <p className="text-[var(--color-danger)] text-sm mb-3">{semesterActionError}</p>}

        {semesters === null ? (
          <div className="flex justify-center py-6"><Spinner /></div>
        ) : (
          <div className="flex flex-col divide-y divide-[var(--color-border-soft)]">
            {semesters.map((s) =>
              editingSemesterId === s._id ? (
                <form key={s._id} onSubmit={handleSemesterEditSave} className="flex flex-col gap-3 py-4">
                  <Input label="Semester name" value={editSemesterForm.name} onChange={(e) => setEditSemesterForm((f) => ({ ...f, name: e.target.value }))} required />
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Start date" type="date" value={editSemesterForm.startDate} onChange={(e) => setEditSemesterForm((f) => ({ ...f, startDate: e.target.value }))} required />
                    <Input label="End date (optional)" type="date" value={editSemesterForm.endDate} onChange={(e) => setEditSemesterForm((f) => ({ ...f, endDate: e.target.value }))} />
                  </div>
                  <Input label="Required attendance %" type="number" min={0} max={100} value={editSemesterForm.requiredAttendancePercentage} onChange={(e) => setEditSemesterForm((f) => ({ ...f, requiredAttendancePercentage: e.target.value }))} required className="w-40" />
                  <div className="flex gap-2">
                    <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
                    <Button type="button" variant="ghost" onClick={closeSemesterEdit}>Cancel</Button>
                  </div>
                </form>
              ) : (
                <div key={s._id} className="flex items-center justify-between py-3 gap-4 flex-wrap">
                  <button type="button" onClick={() => openSemesterDetail(s)} className="text-left flex-1 min-w-0 hover:opacity-80 transition-opacity">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-[var(--color-text-faint)]">
                      {new Date(s.startDate).toISOString().slice(0, 10)}{s.endDate ? ` – ${new Date(s.endDate).toISOString().slice(0, 10)}` : ''} · Required {s.requiredAttendancePercentage}%
                    </p>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge tone={s.status === 'active' ? 'safe' : 'neutral'}>{s.status}</Badge>
                    <Button variant="ghost" className="!px-3 !py-1.5 text-xs" onClick={() => openSemesterEdit(s)}>Edit</Button>
                    {s.status !== 'active' && (
                      <Button variant="danger" className="!px-3 !py-1.5 text-xs" onClick={() => handleSemesterDelete(s)}>Delete</Button>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </Card>

      {viewingSemester && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closeSemesterDetail}>
          <div className="glass-raised rounded-2xl p-5 w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <p className="font-display font-semibold text-lg">{viewingSemester.name}</p>
              <button onClick={closeSemesterDetail} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-sm">Close</button>
            </div>
            <p className="text-xs text-[var(--color-text-faint)] mb-5">
              {new Date(viewingSemester.startDate).toISOString().slice(0, 10)}{viewingSemester.endDate ? ` – ${new Date(viewingSemester.endDate).toISOString().slice(0, 10)}` : ''}
            </p>

            {detailLoading ? (
              <div className="flex justify-center py-10"><Spinner /></div>
            ) : semesterDetail?.error ? (
              <p className="text-[var(--color-danger)] text-sm">{semesterDetail.error}</p>
            ) : semesterDetail ? (
              <div className="flex flex-col gap-5">
                <div>
                  <div className="flex justify-between items-baseline mb-1.5">
                    <span className="text-sm text-[var(--color-text-muted)]">Overall attendance</span>
                    <span className="mono-num text-xl font-bold">{semesterDetail.overall.percentage}%</span>
                  </div>
                  <ProgressBar value={semesterDetail.overall.percentage} requiredValue={semesterDetail.requiredAttendancePercentage} />
                  <p className="text-xs text-[var(--color-text-faint)] mt-1.5">{semesterDetail.overall.attended}/{semesterDetail.overall.conducted} attended · required {semesterDetail.requiredAttendancePercentage}%</p>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Subjects</p>
                  {semesterDetail.subjects.length === 0 ? (
                    <p className="text-xs text-[var(--color-text-faint)]">No subjects were added in this semester.</p>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {semesterDetail.subjects.map((s) => (
                        <div key={s.subject.id} className="flex items-center justify-between text-sm">
                          <span className="min-w-0 truncate">{s.subject.name}</span>
                          <span className="mono-num text-[var(--color-text-muted)] shrink-0 ml-3">{s.attended}/{s.conducted} · {s.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
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

function NotificationToggleRow({ label, hint, checked, busy, onChange }) {
  return (
    <div className="flex items-center justify-between py-3 gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-[var(--color-text-faint)] mt-0.5">{hint}</p>
      </div>
      <Switch checked={checked} disabled={busy} onChange={onChange} label={label} />
    </div>
  );
}
