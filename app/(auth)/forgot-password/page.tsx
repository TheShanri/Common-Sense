'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setResetUrl(null);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? 'We could not process that request.');
      }

      setSuccessMessage(payload.message ?? 'Check your inbox for the reset link.');
      setResetUrl(payload.resetUrl ?? null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'We could not process that request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container" style={{ maxWidth: '480px' }}>
      <div className="card">
        <h1 style={{ marginBottom: '0.75rem', fontSize: '2rem' }}>Reset your password</h1>
        <p style={{ marginBottom: '1.5rem', color: '#475569' }}>
          Enter the email you used to create your account. We will send a link that lets you set a new password.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
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
              <div>{successMessage}</div>
              {resetUrl ? (
                <div style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  Test in development: <Link href={resetUrl} style={{ color: 'var(--accent)', fontWeight: 600 }}>Open reset link</Link>
                </div>
              ) : null}
            </div>
          ) : null}

          <button type="submit" className="primary-button" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Sending link…' : 'Email me a reset link'}
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', color: '#475569' }}>
          Remembered your password?{' '}
          <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>
            Return to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
