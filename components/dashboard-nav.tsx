'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavLinkConfig {
  href: string;
  label: string;
}

const links: NavLinkConfig[] = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/modules', label: 'Modules' },
  { href: '/dashboard/quizzes', label: 'Quizzes' },
  { href: '/dashboard/chat', label: 'Chat' }
];

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') {
    return pathname === '/dashboard';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function DashboardNav() {
  const pathname = usePathname();
  const currentPath = pathname ?? '';

  return (
    <nav style={{ borderTop: '1px solid rgba(148, 163, 184, 0.25)', background: 'white' }}>
      <div
        className="container"
        style={{
          display: 'flex',
          gap: '0.5rem',
          paddingTop: '0.85rem',
          paddingBottom: '0.85rem',
          flexWrap: 'wrap'
        }}
      >
        {links.map((link) => {
          const active = isActive(currentPath, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                padding: '0.35rem 0.8rem',
                borderRadius: '9999px',
                fontWeight: 600,
                background: active ? '#2563eb' : 'rgba(37, 99, 235, 0.12)',
                color: active ? 'white' : '#1d4ed8',
                transition: 'background 0.2s ease'
              }}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
