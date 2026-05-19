import React, { memo } from 'react';
import { useTheme, THEMES } from '../../contexts/ThemeContext';
const ACTIONS = [
  { label: 'Competitors', cmd: 'Find best AI browser competitors' },
  { label: 'Summarize', cmd: '/summarize active tab' },
  { label: 'Research', cmd: 'Research AI startups' },
];
export const QuickActions = memo(function QuickActions({ onRun, disabled }: { onRun: (c: string) => void; disabled?: boolean }) {
  const { resolvedTheme } = useTheme();
  const T = THEMES[resolvedTheme];
  return (
    <div className="flex flex-wrap gap-1.5">
      {ACTIONS.map((a) => (
        <button key={a.cmd} type="button" disabled={disabled} onClick={() => onRun(a.cmd)} className="text-xs px-2.5 py-1 rounded-md disabled:opacity-40" style={{ background: T.cardBg, border: `1px solid ${T.border}`, color: T.textMuted }}>{a.label}</button>
      ))}
    </div>
  );
});
