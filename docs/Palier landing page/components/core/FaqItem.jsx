import React from 'react';
export function FaqItem({ question, open, defaultOpen = false, onToggle, children }) {
  const [own, setOwn] = React.useState(defaultOpen);
  const isOpen = open !== undefined ? open : own;
  return (
    <div style={{ borderRadius: 'var(--radius-md)', background: isOpen ? 'var(--color-accent-100)' : 'var(--color-neutral-100)', padding: '4px 24px', fontFamily: 'var(--font-body)' }}>
      <button type="button" aria-expanded={isOpen} onClick={() => { setOwn(!own); onToggle && onToggle(); }}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, background: 'none', border: 0, padding: '18px 0', font: 'inherit', fontSize: 18, fontWeight: 600, color: 'var(--color-text)', textAlign: 'left', cursor: 'pointer' }}>
        <span>{question}</span><span aria-hidden="true" style={{ fontSize: 22, fontWeight: 400 }}>{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && <p style={{ margin: 0, padding: '0 0 20px', fontSize: 16, lineHeight: 1.65, color: 'var(--color-neutral-800)', maxWidth: '68ch' }}>{children}</p>}
    </div>
  );
}
