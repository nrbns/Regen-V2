import React, { memo } from 'react';
import { useExecutionStore } from '../../state/executionStore';
import { useTheme, THEMES } from '../../contexts/ThemeContext';

export const TimelineLite = memo(function TimelineLite() {
  const { resolvedTheme } = useTheme();
  const T = THEMES[resolvedTheme];
  const steps = useExecutionStore((s) => s.steps);
  const prompt = useExecutionStore((s) => s.prompt);
  const isRunning = useExecutionStore((s) => s.isRunning);
  const cancel = useExecutionStore((s) => s.cancel);
  if (!steps.length && !isRunning) return null;
  return (
    <section className="rounded-lg p-3 text-sm" style={{ background: T.cardBg, border: `1px solid ${T.border}` }}>
      <div className="flex justify-between mb-2">
        <span className="text-[10px] uppercase font-semibold" style={{ color: T.accent }}>Live execution</span>
        {isRunning && <button type="button" onClick={cancel} className="text-[10px]" style={{ color: T.textDim }}>Cancel</button>}
      </div>
      {prompt && <p className="text-xs mb-2 truncate" style={{ color: T.textMuted }}>{prompt}</p>}
      <ul className="space-y-1">
        {steps.map((s) => (
          <li key={s.id} className="flex gap-2 text-xs" style={{ color: T.textMuted }}>
            <span>{s.status === 'done' ? '?' : s.status === 'running' ? '?' : '?'}</span>
            <span style={{ color: s.status === 'running' ? T.text : T.textMuted }}>{s.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
});
