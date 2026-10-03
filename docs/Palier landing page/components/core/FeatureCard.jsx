import React from 'react';
import { Chip } from './Chip';
export function FeatureCard({ tone = 'tint', title, chip, image, children }) {
  const photo = tone === 'photo';
  const bg = photo ? 'var(--overlay-card), url(' + image + ') center/cover' : tone === 'deep' ? 'var(--color-accent-800)' : 'var(--color-accent-100)';
  return (
    <div style={{ minHeight: 420, borderRadius: 'var(--radius-lg)', padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: bg, color: tone === 'tint' ? 'var(--color-text)' : '#fff', fontFamily: 'var(--font-body)' }}>
      <div>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 500, fontSize: 28, lineHeight: 1.1, letterSpacing: '-.015em', margin: 0 }}>{title}</h3>
        <p style={{ margin: '12px 0 0', fontSize: 16, lineHeight: 1.55, maxWidth: '30ch', color: tone === 'tint' ? 'var(--color-neutral-800)' : tone === 'deep' ? 'var(--text-on-deep)' : '#fff' }}>{children}</p>
      </div>
      {chip && <div><Chip tone={tone === 'tint' ? 'tint' : 'dark'}>{chip}</Chip></div>}
    </div>
  );
}
