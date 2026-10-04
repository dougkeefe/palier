import React from 'react';
export function NavPill({ items = [] }) {
  const [hv, setHv] = React.useState(-1);
  return (
    <nav style={{ display: 'inline-flex', gap: 4, padding: 5, borderRadius: 'var(--radius-pill)', background: 'var(--glass-fill)', backdropFilter: 'var(--blur-glass)', fontSize: 15, fontFamily: 'var(--font-body)' }}>
      {items.map((it, i) => (
        <a key={i} href={it.href} onMouseEnter={() => setHv(i)} onMouseLeave={() => setHv(-1)}
          style={{ padding: '8px 18px', borderRadius: 'var(--radius-pill)', textDecoration: 'none', background: it.active ? '#fff' : hv === i ? 'var(--glass-fill-hover)' : 'transparent', color: it.active ? 'var(--color-text)' : '#fff' }}>{it.label}</a>
      ))}
    </nav>
  );
}
