import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input } from '../components/ui';
import { AuthLayout } from './Login';

export default function Setup() {
  const { refresh, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    studentName: '',
    collegeName: '',
    semesterName: '',
    semesterStartDate: '',
    semesterEndDate: '',
    requiredAttendancePercentage: 75,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // The account signup just created is still signed in at this point — a
  // plain navigate('/login') would just bounce right back here (an
  // authenticated-but-not-set-up user is always redirected to /setup), so
  // this needs an actual logout first for "back to login" to make sense.
  const handleBack = async () => {
    await logout();
    navigate('/login');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.completeSetup({
        ...form,
        requiredAttendancePercentage: Number(form.requiredAttendancePercentage),
        semesterEndDate: form.semesterEndDate || undefined,
      });
      await refresh();
      navigate('/subjects');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Card raised className="w-full max-w-md">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors mb-4"
        >
          <BackIcon className="w-4 h-4" /> Back to login
        </button>
        <h1 className="font-display text-2xl font-semibold mb-1">Let's set things up</h1>
        <p className="text-[var(--color-text-muted)] text-sm mb-6">
          The semester start date is required — every attendance calculation is built from it.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Student name" value={form.studentName} onChange={set('studentName')} required />
          <Input label="College name" value={form.collegeName} onChange={set('collegeName')} required />
          <Input label="Semester name" placeholder="e.g. Semester 5" value={form.semesterName} onChange={set('semesterName')} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Semester start date" type="date" value={form.semesterStartDate} onChange={set('semesterStartDate')} required />
            <Input label="Semester end date (optional)" type="date" value={form.semesterEndDate} onChange={set('semesterEndDate')} />
          </div>
          <Input
            label="Required attendance %"
            type="number"
            min={0}
            max={100}
            value={form.requiredAttendancePercentage}
            onChange={set('requiredAttendancePercentage')}
          />
          {error && <p className="text-[var(--color-danger)] text-sm">{error}</p>}
          <Button type="submit" disabled={loading} className="mt-1">
            {loading ? 'Setting up…' : 'Continue to subjects'}
          </Button>
        </form>
      </Card>
    </AuthLayout>
  );
}

function BackIcon(props) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
