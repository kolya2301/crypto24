'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Props {
  initial: string;
  locale: string;
}

export function MobileUserMenu({ initial, locale }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push(`/${locale}/login`);
      router.refresh();
    }
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: 32, height: 32, borderRadius: '50%',
          background: open ? 'rgba(59,130,246,0.35)' : 'rgba(59,130,246,0.2)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: '#60a5fa',
          WebkitTapHighlightColor: 'transparent',
          transition: 'background 0.15s',
          flexShrink: 0,
        }}
        aria-label="User menu"
      >
        {initial}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 180, zIndex: 200,
          background: '#0e1929',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 14,
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}>
          <Link
            href={`/${locale}/profile`}
            onClick={() => setOpen(false)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 16px',
              color: '#e2e8f0', fontSize: 14, fontWeight: 500,
              textDecoration: 'none',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ fontSize: 16 }}>⚙️</span>
            {locale === 'he' ? 'הגדרות חשבון' : 'Настройки'}
          </Link>

          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 16px', width: '100%',
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: '#f87171', fontSize: 14, fontWeight: 500,
              textAlign: 'left', transition: 'background 0.12s',
              WebkitTapHighlightColor: 'transparent',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ fontSize: 16 }}>🚪</span>
            {locale === 'he' ? 'יציאה' : 'Выйти'}
          </button>
        </div>
      )}
    </div>
  );
}
