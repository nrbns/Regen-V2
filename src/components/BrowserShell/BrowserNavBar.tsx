import React from 'react';

const ACCENT = '#f0a030';
const BG = '#0f1623';
const BORDER = '#ffffff14';

interface BrowserNavBarProps {
  urlInput: string;
  onUrlInputChange: (value: string) => void;
  onNavigate: () => void;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  /** Disables back/forward/reload only (URL bar stays usable on new tab). */
  historyDisabled?: boolean;
}

const navBtnStyle = (enabled: boolean): React.CSSProperties => ({
  width: 34,
  height: 34,
  borderRadius: 8,
  fontSize: 16,
  flexShrink: 0,
  cursor: enabled ? 'pointer' : 'default',
  opacity: enabled ? 1 : 0.35,
  color: enabled ? '#f0eeea' : '#8a8884',
  background: 'transparent',
  border: `1px solid ${enabled ? BORDER : 'transparent'}`,
});

export function BrowserNavBar({
  urlInput,
  onUrlInputChange,
  onNavigate,
  onBack,
  onForward,
  onReload,
  canGoBack,
  canGoForward,
  historyDisabled,
}: BrowserNavBarProps) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <button
        type="button"
        title="Back (Alt+←)"
        disabled={!canGoBack || historyDisabled}
        onClick={onBack}
        style={navBtnStyle(canGoBack && !historyDisabled)}
      >
        ←
      </button>
      <button
        type="button"
        title="Forward (Alt+→)"
        disabled={!canGoForward || historyDisabled}
        onClick={onForward}
        style={navBtnStyle(canGoForward && !historyDisabled)}
      >
        →
      </button>
      <button
        type="button"
        title="Reload (Ctrl+R)"
        disabled={historyDisabled}
        onClick={onReload}
        style={navBtnStyle(!historyDisabled)}
      >
        ↻
      </button>
      <input
        value={urlInput}
        onChange={(e) => onUrlInputChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onNavigate();
        }}
        placeholder="Search or type a URL — press Enter"
        style={{
          flex: 1,
          height: 34,
          padding: '0 12px',
          borderRadius: 8,
          background: BG,
          border: `1px solid ${ACCENT}33`,
          color: '#f0eeea',
          fontSize: 13,
        }}
      />
      <button
        type="button"
        onClick={onNavigate}
        style={{
          height: 34,
          padding: '0 16px',
          borderRadius: 8,
          background: ACCENT,
          color: BG,
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Go
      </button>
    </div>
  );
}
