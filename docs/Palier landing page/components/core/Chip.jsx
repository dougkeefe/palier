import React from 'react';
export function Chip({ tone = 'glass', children }) {
  const bg = tone === 'tint' ? 'rgba(255,255,255,.7)' : tone === 'dark' ? 'var(--glass-fill-strong)' : 'var(--glass-fill)';
  return <span style={{ display: 'inline-block', padding: '7px 14px', borderRadius: 'var(--radius-pill)', background: bg, backdropFilter: tone === 'glass' ? 'blur(8px)' : undefined, fontSize: 13, letterSpacing: '.01em', fontFamily: 'var(--font-body)' }}>{children}</span>;
}
