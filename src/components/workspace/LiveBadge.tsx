import React, { memo } from 'react';
import { useExecutionStore } from '../../state/executionStore';
export const LiveBadge = memo(function LiveBadge() {
  const connected = useExecutionStore((s) => s.connected);
  return <span className="text-[10px] px-2 py-0.5 rounded" style={{ color: connected ? '#4ade80' : '#94a3b8', background: connected ? 'rgba(34,197,94,0.12)' : 'rgba(148,163,184,0.1)' }}>{connected ? 'LIVE' : 'OFFLINE'}</span>;
});
