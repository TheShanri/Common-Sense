import Link from 'next/link';
import { Suspense } from 'react';

import ResetPasswordForm from './reset-password-form';

function ResetPasswordFormFallback() {
  return (
    <form>
      <label htmlFor="token">Reset token</label>
      <input
        id="token"
        name="token"
        type="text"
        placeholder="Paste the token from your email"
        disabled
      />

      <label htmlFor="password">New password</label>
      <input id="password" name="password" type="password" placeholder="At least 8 characters" disabled />

      <label htmlFor="confirmPassword">Confirm new password</label>
      <input id="confirmPassword" name="confirmPassword" type="password" disabled />

      <button type="button" className="primary-button" style={{ width: '100%' }} disabled>
        Loading…
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {

  return (
    <main className="container" style={{ maxWidth: '480px' }}>
      <div className="card">
        <h1 style={{ marginBottom: '0.75rem', fontSize: '2rem' }}>Create a new password</h1>
        <p style={{ marginBottom: '1.5rem', color: '#475569' }}>
          Choose a new password for your account. For security we recommend using at least 12 characters with a mix of
          letters and numbers.
        </p>

        <Suspense fallback={<ResetPasswordFormFallback />}>
          <ResetPasswordForm />
        </Suspense>


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
