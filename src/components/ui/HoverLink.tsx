'use client';

import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';

interface HoverLinkProps {
  href: string;
  style?: CSSProperties;
  hoverBg?: string;
  children: ReactNode;
}

export function HoverLink({ href, style, hoverBg = 'rgba(255,255,255,0.03)', children }: HoverLinkProps) {
  return (
    <Link
      href={href}
      style={style}
      onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {children}
    </Link>
  );
}
