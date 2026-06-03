/**
 * Selection AI menu — native webview (Tauri) + iframe (window.getSelection).
 */

import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { shouldRunNativeWebviewCommands } from '../lib/browser/tabWebviewSync';
import { withBrowseProfile } from '../lib/browser/browserWebviewInvoke';
import type { SelectionAction } from '../components/BrowserShell/PageSelectionMenu';

type SelectionState = {
  text: string;
  anchor: { x: number; y: number };
};

function readDomSelection(): string {
  const sel = window.getSelection();
  return sel?.toString().trim() ?? '';
}

export function usePageSelectionMenu(activeTabId: string | null) {
  const [selection, setSelection] = useState<SelectionState | null>(null);

  const showSelection = useCallback((text: string, x: number, y: number) => {
    if (text.length < 2) return;
    setSelection({
      text,
      anchor: {
        x: Math.min(Math.max(x, 12), window.innerWidth - 220),
        y: Math.min(Math.max(y, 12), window.innerHeight - 140),
      },
    });
  }, []);

  const captureSelection = useCallback(
    async (x?: number, y?: number) => {
      const ax = x ?? window.innerWidth / 2;
      const ay = y ?? window.innerHeight / 2;

      if (shouldRunNativeWebviewCommands() && activeTabId) {
        try {
          const text = await invoke<string>(
            'browser_webview_get_selection',
            withBrowseProfile({ tabId: activeTabId })
          );
          const trimmed = text?.trim();
          if (trimmed) {
            showSelection(trimmed, ax, ay);
            return;
          }
        } catch {
          /* fall through */
        }
      }

      const dom = readDomSelection();
      if (dom) showSelection(dom, ax, ay);
    },
    [activeTabId, showSelection]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'a' || !e.shiftKey || !(e.ctrlKey || e.metaKey)) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      e.preventDefault();
      void captureSelection();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [captureSelection]);

  useEffect(() => {
    const onMouseUp = (e: MouseEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const pane = document.getElementById('regen-browser-content-pane');
      if (!pane?.contains(e.target as Node)) return;
      window.setTimeout(() => {
        void captureSelection(e.clientX, e.clientY);
      }, 80);
    };
    window.addEventListener('mouseup', onMouseUp);
    return () => window.removeEventListener('mouseup', onMouseUp);
  }, [captureSelection]);

  const close = useCallback(() => setSelection(null), []);

  return { selection, close, captureSelection };
}

export function selectionPrompt(action: SelectionAction, text: string): string {
  switch (action) {
    case 'explain':
      return `Explain this clearly for a non-expert:\n\n"${text}"`;
    case 'summarize':
      return `Summarize this in bullet points:\n\n"${text}"`;
    case 'translate':
      return `Translate to English (keep meaning):\n\n"${text}"`;
    case 'rewrite':
      return `Rewrite this to be clearer and more professional:\n\n"${text}"`;
    case 'factcheck':
      return `Fact-check these claims and note what is uncertain:\n\n"${text}"`;
    case 'research':
      return `Research this topic and list key sources and takeaways:\n\n"${text}"`;
    default:
      return text;
  }
}
