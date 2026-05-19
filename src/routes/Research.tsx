import React, { memo, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic } from 'lucide-react';
import { useTheme, THEMES } from '../contexts/ThemeContext';
import { useExecutionStore } from '../state/executionStore';
import { useRegenCompanion } from '../hooks/useRegenCompanion';
import { AvatarCompanion } from '../components/Avatar/AvatarCompanion';
import { CommandBar } from '../components/workspace/CommandBar';
import { TimelineLite } from '../components/workspace/TimelineLite';
import { ThoughtLite } from '../components/workspace/ThoughtLite';
import { LiveBadge } from '../components/workspace/LiveBadge';

const FILTERS = ['All sources', 'Papers', 'Web', 'Books', 'Datasets'] as const;

const TOOLS: { id: string; label: string; prompt: (q: string) => string }[] = [
  { id: 'web', label: 'Web Research', prompt: (q) => `Research on the web: ${q}` },
  { id: 'paper', label: 'Paper Analysis', prompt: (q) => `Analyze papers about: ${q}` },
  { id: 'deep', label: 'Deep Think', prompt: (q) => `Deep reasoning for: ${q}` },
  { id: 'cite', label: 'Citations', prompt: (q) => `Citations for: ${q}` },
  { id: 'fact', label: 'Fact-check', prompt: (q) => `Fact-check: ${q}` },
  { id: 'vault', label: 'Save insight', prompt: (q) => `Save insight: ${q}` },
];

function ResearchPage() {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const T = THEMES[resolvedTheme];
  const run = useExecutionStore((s) => s.run);
  const isRunning = useExecutionStore((s) => s.isRunning);
  const [activeFilter, setActiveFilter] = useState<string>(FILTERS[0]);
  const [lastQuery, setLastQuery] = useState('');
  const { listening, startListening, stopListening, voiceSupported } = useRegenCompanion();

  const runResearch = useCallback(
    (text: string) => {
      const q = text.trim();
      if (!q) return;
      setLastQuery(q);
      run(`[${activeFilter}] ${q}`);
    },
    [run, activeFilter]
  );

  const runTool = useCallback(
    (tool: (typeof TOOLS)[number]) => {
      run(tool.prompt(lastQuery || 'topic'));
    },
    [run, lastQuery]
  );

  return (
    <div className="h-full flex overflow-hidden">
      <aside
        className="flex-shrink-0 flex flex-col items-center justify-end pb-6 px-2 border-r"
        style={{ width: '30%', maxWidth: 200, borderColor: T.border }}
      >
        <AvatarCompanion mode="research" autoRevertMs={2000} />
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header
          className="flex-shrink-0 px-4 py-3 flex items-center justify-between border-b"
          style={{ borderColor: T.border }}
        >
          <div>
            <h1 className="text-sm font-semibold" style={{ color: T.text }}>
              Research
            </h1>
            <p className="text-[11px]" style={{ color: T.textDim }}>
              Multi-source · live execution
            </p>
          </div>
          <div className="flex items-center gap-2">
            {voiceSupported && (
              <button
                type="button"
                onClick={listening ? stopListening : startListening}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-md"
                style={{ background: T.cardBg, border: `1px solid ${T.border}`, color: T.textMuted }}
              >
                <Mic className="w-3 h-3" /> {listening ? 'Stop' : 'Voice'}
              </button>
            )}
            <LiveBadge />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <CommandBar onRun={runResearch} disabled={isRunning} />

          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setActiveFilter(f)}
                className="text-xs px-2.5 py-1 rounded-full"
                style={
                  activeFilter === f
                    ? { background: 'rgba(245,166,35,0.2)', color: '#F5A623', border: '1px solid rgba(245,166,35,0.4)' }
                    : { background: T.cardBg, color: T.textMuted, border: `1px solid ${T.border}` }
                }
              >
                {f}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {TOOLS.map((tool) => (
              <button
                key={tool.id}
                type="button"
                disabled={isRunning}
                onClick={() => runTool(tool)}
                className="text-left p-3 rounded-lg disabled:opacity-40 text-xs"
                style={{ background: T.cardBg, border: `1px solid ${T.border}`, color: T.text }}
              >
                {tool.label}
              </button>
            ))}
          </div>

          <TimelineLite />
          <ThoughtLite />

          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-xs underline opacity-70"
            style={{ color: T.textDim }}
          >
            ← Back to browser
          </button>
        </main>
      </div>
    </div>
  );
}

export default memo(ResearchPage);
