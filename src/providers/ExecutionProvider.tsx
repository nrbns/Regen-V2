import React, { useEffect } from 'react';
import { getExecutionClient } from '../services/realtime/executionClient';
import { getApiBaseUrl } from '../lib/env';

export function ExecutionProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/ping`, { signal: AbortSignal.timeout(3000) });
        if (!cancelled && res.ok) getExecutionClient().connect();
      } catch {
        /* API offline — skip execution WS */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return <>{children}</>;
}
