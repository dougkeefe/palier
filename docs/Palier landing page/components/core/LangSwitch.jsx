import React from 'react';
export function LangSwitch({ value = 'en', onChange }) {
  return (
    <div role="group" aria-label="Language / Langue" style={{ display: 'inline-flex', gap: 2, padding: 3, borderRadius: 'var(--radius-pill)', background: 'var(--glass-fill)' }}>
      {['en', 'fr'].map(l => (
        <button key={l} type="button" aria-pressed={value === l} onClick={() => onChange && onChange(l)}
          style={{ font: 'inherit', fontSize: 13, padding: '5px 12px', border: 0, borderRadius: 'var(--radius-pill)', cursor: 'pointer', background: value === l ? '#fff' : 'transparent', color: value === l ? 'var(--color-text)' : '#fff' }}>{l.toUpperCase()}</button>
      ))}
    </div>
  );
}
