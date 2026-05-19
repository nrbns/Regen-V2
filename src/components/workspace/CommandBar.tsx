import React, { memo, useState, useCallback } from 'react';
import { Send } from 'lucide-react';
import { useTheme, THEMES } from '../../contexts/ThemeContext';

type Props = { onRun: (q: string) => void; disabled?: boolean; placeholder?: string };

export const CommandBar = memo(function CommandBar({ onRun, disabled, placeholder }: Props) {
  const { resolvedTheme } = useTheme();
  const T = THEMES[resolvedTheme];
  const [q, setQ] = useState('');

  const submit = useCallback(() => {
    const t = q.trim();
    if (!t || disabled) return;
    onRun(t);
    setQ('');
  }, [q, disabled, onRun]);

  return (
    <div
      className="flex items-center gap-2 rounded-lg px-3 py-2"
      style={{ background: T.inputBg, border: `1px solid ${T.inputBorder}` }}
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        disabled={disabled}
        placeholder={placeholder ?? 'Research, summarize, automate…'}
        className="flex-1 bg-transparent outline-none text-sm"
        style={{ color: T.text }}
      />
      <button
        type="button"
        onClick={submit}
        disabled={disabled || !q.trim()}
        className="rounded-md p-1.5 disabled:opacity-40"
        style={{ background: T.accent }}
      >
        <Send className="w-3.5 h-3.5 text-white" />
      </button>
    </div>
  );
});
