import React, { memo } from 'react';
import { useExecutionStore } from '../../state/executionStore';
import { useTheme, THEMES } from '../../contexts/ThemeContext';

export const ThoughtLite = memo(function ThoughtLite() {
  const { resolvedTheme } = useTheme();
  const T = THEMES[resolvedTheme];
  const thoughts = useExecutionStore((s) => s.thoughts);
  if (!thoughts.length) return null;
  return (
    <div className="rounded-lg p-2 max-h-24 overflow-y-auto text-xs space-y-1" style={{ background: T.cardBg, border: `1px solid ${T.border}` }}>
      {thoughts.slice(-8).map((t) => <p key={t.id} style={{ color: T.textMuted }}>{t.content}</p>)}
    </div>
  );
});
