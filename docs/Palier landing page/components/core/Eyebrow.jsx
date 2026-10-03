import React from 'react';
export function Eyebrow({ children }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-neutral-700)', fontFamily: 'var(--font-body)' }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-text)' }} />{children}</span>;
}
