import type { ReactNode } from 'react';
import Link from 'next/link';
import LogoutButton from '@/components/logout-button';
import { requireUser } from '@/lib/session';

export default async function DashboardLayout({
  children
}: {
  children: ReactNode;
}) {
  const user = await requireUser();

  return (
    <div>
      <header
        style={{
          background: 'white',
          borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
          position: 'sticky',
          top: 0,
          zIndex: 20
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '1.25rem',
            paddingBottom: '1.25rem'
          }}
        >
          <Link href="/dashboard" style={{ fontWeight: 700, fontSize: '1.2rem' }}>
            Common Sense Exchange
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ color: '#475569', fontSize: '0.95rem' }}>Hello, {user.username}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
