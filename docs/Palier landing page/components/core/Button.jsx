import React from 'react';
export function Button({ href = '#', variant = 'light', arrow = false, size = 'md', children, onClick }) {
  const [h, setH] = React.useState(false);
  if (variant === 'link') return <a href={href} onClick={onClick} style={{ color: 'inherit', fontSize: 16, textUnderlineOffset: 4 }}>{children}</a>;
  const light = variant === 'light';
  const bg = light ? (h ? 'var(--color-accent-100)' : '#fff') : (h ? 'var(--color-accent-700)' : 'var(--color-accent-900)');
  const fg = light ? 'var(--color-text)' : '#fff';
  const sm = size === 'sm';
  return (
    <a href={href} onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 14, padding: arrow ? '8px 8px 8px 22px' : sm ? '10px 20px' : '11px 22px', borderRadius: 'var(--radius-pill)', background: bg, color: fg, fontSize: sm ? 15 : 16, textDecoration: 'none', whiteSpace: 'nowrap', fontFamily: 'var(--font-body)' }}>
      {children}
      {arrow && <span style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: '50%', background: light ? 'var(--color-accent-900)' : '#fff', color: light ? '#fff' : 'var(--color-accent-900)' }}>↗</span>}
    </a>
  );
}
