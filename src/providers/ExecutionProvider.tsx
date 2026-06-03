import React from 'react';

/** Execution WS connects lazily on first research/run — avoids console spam when :4001 is down. */
export function ExecutionProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
