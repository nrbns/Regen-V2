/**
 * In-page selection actions — Explain / Summarize / Research (native webview).
 */

import React from 'react';

const ACCENT = '#f0a030';
const BG = '#0f1623';
const SURFACE = '#151d2e';

export type SelectionAction =
  | 'explain'
  | 'summarize'
  | 'translate'
  | 'rewrite'
  | 'factcheck'
  | 'research';

type Props = {
  text: string;
  anchor?: { x: number; y: number };
  onAction: (action: SelectionAction, text: string) => void;
  onClose: () => void;
};

const ACTIONS: { id: SelectionAction; label: string }[] = [
  { id: 'explain', label: 'Explain' },
  { id: 'summarize', label: 'Summarize' },
  { id: 'translate', label: 'Translate' },
  { id: 'rewrite', label: 'Rewrite' },
  { id: 'factcheck', label: 'Fact check' },
  { id: 'research', label: 'Research' },
];

export function PageSelectionMenu({ text, anchor, onAction, onClose }: Props) {
  const preview = text.length > 80 ? `${text.slice(0, 80)}…` : text;
  const left = anchor ? Math.min(anchor.x, window.innerWidth - 220) : window.innerWidth / 2 - 110;
  const top = anchor ? Math.min(anchor.y + 8, window.innerHeight - 120) : 120;

  return (
    <>
      <div
        role="presentation"
        style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
        onClick={onClose}
      />
      <div
        role="menu"
        style={{
          position: 'fixed',
          left,
          top,
          zIndex: 9999,
          minWidth: 200,
          padding: 8,
          borderRadius: 10,
          background: SURFACE,
          border: `1px solid ${ACCENT}44`,
          boxShadow: '0 8px 32px #00000066',
        }}
      >
        <p
          style={{
            margin: '0 0 8px',
            fontSize: 11,
            color: '#8a8884',
            lineHeight: 1.35,
          }}
          title={text}
        >
          “{preview}”
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {ACTIONS.map((a) => (
            <button
              key={a.id}
              type="button"
              role="menuitem"
              onClick={() => {
                onAction(a.id, text);
                onClose();
              }}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                background: `${ACCENT}22`,
                color: ACCENT,
                border: `1px solid ${ACCENT}55`,
                cursor: 'pointer',
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
