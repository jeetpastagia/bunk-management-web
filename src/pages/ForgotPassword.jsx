import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Card, Button, Input } from '../components/ui';
import { AuthLayout } from './Login';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState('request'); // 'request' | 'reset'
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const requestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.requestOtp(mobileNumber);
      setMessage(res.message);
      setStep('reset');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.resetPassword({ mobileNumber, otp, newPassword });
      navigate('/login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Card raised className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-semibold mb-1">Reset password</h1>
        <p className="text-[var(--color-text-muted)] text-sm mb-6">
          {step === 'request' ? "We'll send a one-time code to your mobile number." : 'Enter the OTP you received and a new password.'}
        </p>

        {step === 'request' ? (
          <form onSubmit={requestOtp} className="flex flex-col gap-4">
            <Input label="Mobile number" type="tel" placeholder="9876543210" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} required />
            {error && <p className="text-[var(--color-danger)] text-sm">{error}</p>}
            <Button type="submit" disabled={loading}>{loading ? 'Sending…' : 'Send OTP'}</Button>
          </form>
        ) : (
          <form onSubmit={resetPassword} className="flex flex-col gap-4">
            {message && <p className="text-[var(--color-safe)] text-sm">{message}</p>}
            <Input label="OTP" inputMode="numeric" maxLength={6} placeholder="6-digit code" value={otp} onChange={(e) => setOtp(e.target.value)} required />
            <Input label="New password" type="password" placeholder="At least 6 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
            {error && <p className="text-[var(--color-danger)] text-sm">{error}</p>}
            <Button type="submit" disabled={loading}>{loading ? 'Resetting…' : 'Reset password'}</Button>
          </form>
        )}

        <p className="text-center text-sm text-[var(--color-text-muted)] mt-6">
          <Link to="/login" className="text-[var(--color-brand-soft)] hover:underline">Back to login</Link>
        </p>
      </Card>
    </AuthLayout>
  );
}
