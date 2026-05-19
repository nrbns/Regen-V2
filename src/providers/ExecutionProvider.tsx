import React, { useEffect } from 'react';
import { getExecutionClient } from '../services/realtime/executionClient';

export function ExecutionProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    getExecutionClient().connect();
  }, []);
  return <>{children}</>;
}
