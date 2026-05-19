import React, { memo, useEffect, useState } from 'react';
import { companionDebug, type CompanionDebugState } from '../../lib/companion/companionDebug';

export const CompanionDebugPanel = memo(function CompanionDebugPanel() {
  const [open, setOpen] = useState(false);
  const [snap, setSnap] = useState<CompanionDebugState>(companionDebug.getState());

  useEffect(() => {
    return companionDebug.subscribe(() => setSnap({ ...companionDebug.getState() }));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open || !(performance as Performance & { memory?: { usedJSHeapSize: number } }).memory) return;
    const id = setInterval(() => {
      const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
      if (mem) companionDebug.patch({ memoryMb: Math.round(mem.usedJSHeapSize / 1048576) });
    }, 2000);
    return () => clearInterval(id);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed bottom-8 left-4 z-[9999] w-80 max-h-64 overflow-auto rounded-lg p-3 text-[10px] font-mono shadow-2xl"
      style={{ background: '#111', border: '1px solid #333', color: '#aaa' }}
    >
      <div className="flex justify-between mb-2 text-white">
        <span>Companion debug</span>
        <button type="button" onClick={() => setOpen(false)} className="text-[#888]">
          ×
        </button>
      </div>
      <pre className="whitespace-pre-wrap">
        {`emotion: ${snap.emotion}
voice: ${snap.voiceListening ? 'listening' : 'off'}
vision capture: ${snap.visionLastCapture ? new Date(snap.visionLastCapture).toLocaleTimeString() : '—'}
vision: ${snap.visionLastAnalysis || '—'}
llm: ${snap.llmModel} (${snap.llmLatencyMs ?? '—'}ms, ${snap.tokensPerSec ?? '—'} tok/s)
memory: ${snap.memoryMb ?? '—'} MB`}
      </pre>
      <div className="mt-2 border-t border-[#333] pt-1 max-h-24 overflow-y-auto">
        {snap.logs.slice(-12).map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
});

