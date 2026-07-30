import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input } from '../components/ui';
import { AuthLayout } from './Login';
import GoogleSignInButton from '../components/GoogleSignInButton';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [studentName, setStudentName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(identifier, password, studentName);
      navigate('/setup');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Card raised className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-semibold mb-1">Create your account</h1>
        <p className="text-[var(--color-text-muted)] text-sm mb-6">Start tracking lecture-wise attendance in minutes.</p>

        {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
          <>
            <GoogleSignInButton onError={setError} />
            <div className="flex items-center gap-3 my-5">
              <div className="h-px flex-1 bg-[var(--color-border)]" />
              <span className="text-xs text-[var(--color-text-faint)]">or</span>
              <div className="h-px flex-1 bg-[var(--color-border)]" />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Your name" placeholder="e.g. Aditi Sharma" value={studentName} onChange={(e) => setStudentName(e.target.value)} required />
          <Input label="Email or mobile number" placeholder="you@example.com or 9876543210" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
          <Input
            label="Password"
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          {error && <p className="text-[var(--color-danger)] text-sm">{error}</p>}
          <Button type="submit" disabled={loading} className="mt-1">
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="text-center text-sm text-[var(--color-text-muted)] mt-6">
          Already have an account? <Link to="/login" className="text-[var(--color-brand-soft)] hover:underline">Log in</Link>
        </p>
      </Card>
    </AuthLayout>
  );
}
