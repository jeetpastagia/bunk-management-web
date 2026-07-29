import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Input } from '../components/ui';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(mobileNumber, password);
      navigate(user.setupCompleted ? '/' : '/setup');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Card raised className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-semibold mb-1">Welcome back</h1>
        <p className="text-[var(--color-text-muted)] text-sm mb-6">Log in to keep tracking your attendance.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Mobile number"
            type="tel"
            placeholder="9876543210"
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-[var(--color-danger)] text-sm">{error}</p>}
          <div className="flex justify-end -mt-2">
            <Link to="/forgot-password" className="text-xs text-[var(--color-brand-soft)] hover:underline">
              Forgot password?
            </Link>
          </div>
          <Button type="submit" disabled={loading} className="mt-1">
            {loading ? 'Logging in…' : 'Log in'}
          </Button>
        </form>

        <p className="text-center text-sm text-[var(--color-text-muted)] mt-6">
          New here? <Link to="/signup" className="text-[var(--color-brand-soft)] hover:underline">Create an account</Link>
        </p>
      </Card>
    </AuthLayout>
  );
}

export function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="mb-8 flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-brand)] flex items-center justify-center font-display font-bold text-white text-lg">B</div>
        <div>
          <div className="font-display font-semibold text-lg leading-tight">Bunk Manager</div>
          <div className="text-[11px] text-[var(--color-text-faint)] tracking-wide">TRACK SMART · BUNK SMARTER · STAY ABOVE 75%</div>
        </div>
      </div>
      {children}
    </div>
  );
}
