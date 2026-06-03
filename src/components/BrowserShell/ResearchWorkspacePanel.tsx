/**
 * In-shell research workspace — Ctrl+K "Research …" or selection → Research.
 */

import React, { memo, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExecutionStore } from '../../state/executionStore';
import { CommandBar } from '../workspace/CommandBar';
import { TimelineLite } from '../workspace/TimelineLite';
import { ThoughtLite } from '../workspace/ThoughtLite';
import { LiveBadge } from '../workspace/LiveBadge';
import { ensureExecutionWsConnected } from '../../services/realtime/executionClient';

const BG = '#0f1623';
const ACCENT = '#f0a030';
const SURFACE = '#151d2e';
const BORDER = '#ffffff14';

type Props = {
  open: boolean;
  initialQuery?: string;
  onClose: () => void;
};

export const ResearchWorkspacePanel = memo(function ResearchWorkspacePanel({
  open,
  initialQuery = '',
  onClose,
}: Props) {
  const navigate = useNavigate();
  const run = useExecutionStore((s) => s.run);
  const isRunning = useExecutionStore((s) => s.isRunning);
  const [seed, setSeed] = useState('');

  useEffect(() => {
    if (open) {
      ensureExecutionWsConnected();
      if (initialQuery) setSeed(initialQuery);
    }
  }, [open, initialQuery]);

  const runResearch = useCallback(
    (text: string) => {
      const q = text.trim();
      if (!q) return;
      run(`[Research] ${q}`);
    },
    [run]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal
      aria-label="Research workspace"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(640px, 96vw)',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          background: SURFACE,
          border: `1px solid ${ACCENT}44`,
          borderRadius: 14,
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#f0eeea' }}>
              Research workspace
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#8a8884' }}>
              Search → Understand → Decide → Execute
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LiveBadge />
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: `1px solid ${BORDER}`,
                borderRadius: 6,
                color: '#8a8884',
                padding: '4px 10px',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              Esc
            </button>
          </div>
        </header>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
          <CommandBar
            onRun={runResearch}
            disabled={isRunning}
            placeholder={seed ? `Research: ${seed}` : 'Research a topic, paper, or claim…'}
          />
          {seed && !isRunning && (
            <button
              type="button"
              onClick={() => runResearch(seed)}
              style={{
                alignSelf: 'flex-start',
                padding: '6px 12px',
                borderRadius: 6,
                border: `1px solid ${ACCENT}55`,
                background: `${ACCENT}18`,
                color: ACCENT,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Run: {seed.slice(0, 80)}
              {seed.length > 80 ? '…' : ''}
            </button>
          )}
          <ThoughtLite />
          <TimelineLite />
        </div>

        <footer
          style={{
            padding: '10px 16px',
            borderTop: `1px solid ${BORDER}`,
            display: 'flex',
            justifyContent: 'space-between',
            gap: 8,
            background: BG,
          }}
        >
          <span style={{ fontSize: 10, color: '#8a8884' }}>Ctrl+K · Research from palette or selection</span>
          <button
            type="button"
            onClick={() => navigate('/research')}
            style={{
              background: 'transparent',
              border: 'none',
              color: ACCENT,
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            Open full research page →
          </button>
        </footer>
      </div>
    </div>
  );
});
