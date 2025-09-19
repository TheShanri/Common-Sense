'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialToken = searchParams.get('token') ?? '';

  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!token.trim()) {
      setError('Paste the reset token from your email to continue.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), password })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? 'We could not reset your password.');
      }

      setSuccessMessage('Password updated. Redirecting you to the dashboard…');
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1200);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'We could not reset your password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container" style={{ maxWidth: '480px' }}>
      <div className="card">
        <h1 style={{ marginBottom: '0.75rem', fontSize: '2rem' }}>Create a new password</h1>
        <p style={{ marginBottom: '1.5rem', color: '#475569' }}>
          Choose a new password for your account. For security we recommend using at least 12 characters with a mix of letters
          and numbers.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="token">Reset token</label>
          <input
            id="token"
            name="token"
            type="text"
            placeholder="Paste the token from your email"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            required
          />

          <label htmlFor="password">New password</label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />

          <label htmlFor="confirmPassword">Confirm new password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            minLength={8}
            required
          />

          {error ? <div style={{ color: '#b91c1c', marginBottom: '1rem', fontWeight: 600 }}>{error}</div> : null}
          {successMessage ? (
            <div
              style={{
                background: 'rgba(37, 99, 235, 0.1)',
                borderRadius: '0.75rem',
                padding: '0.75rem 1rem',
                color: '#1d4ed8',
                marginBottom: '1rem'
              }}
            >
              {successMessage}
            </div>
          ) : null}

          <button type="submit" className="primary-button" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', color: '#475569' }}>
          Changed your mind?{' '}
          <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>
            Return to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
