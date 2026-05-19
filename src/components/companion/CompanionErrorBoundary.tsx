import React, { Component, type ReactNode } from 'react';
import { companionDebug } from '../../lib/companion/companionDebug';

type Props = { children: ReactNode; name?: string };
type State = { failed: boolean };

/** Silent boundary — logs only, never blocks the shell UI. */
export class CompanionErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    companionDebug.log(`${this.props.name || 'companion'}: ${error.message}`);
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}
