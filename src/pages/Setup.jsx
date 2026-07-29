import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input } from '../components/ui';
import { AuthLayout } from './Login';

export default function Setup() {
  const { refresh } = useAuth();
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
