import { create } from 'zustand';
import {
  getExecutionClient,
  ensureExecutionWsConnected,
  type RegenEvent,
} from '../services/realtime/executionClient';
import { PERF } from '../config/performance';

export type Step = { id: string; label: string; status: 'pending' | 'running' | 'done' };
export type Thought = { id: string; content: string; ts: number };

type State = {
  connected: boolean;
  isRunning: boolean;
  prompt: string;
  taskId: string | null;
  steps: Step[];
  thoughts: Thought[];
  run: (prompt: string) => void;
  cancel: () => void;
};

let subscribed = false;

function handleEvent(e: RegenEvent) {
  const s = useExecutionStore.getState();
  if (e.type === 'execution:started') {
    useExecutionStore.setState({
      isRunning: true,
      steps: [],
      thoughts: [],
      prompt: String(e.prompt ?? ''),
      taskId: e.taskId ? String(e.taskId) : null,
    });
  } else if (e.type === 'execution:step') {
    const stepId = String(e.stepId ?? '');
    const label = String(e.label ?? '');
    const status = (e.status as Step['status']) ?? 'running';
    const steps = [...s.steps];
    const i = steps.findIndex((x) => x.id === stepId);
    const row = { id: stepId, label, status };
    if (i >= 0) steps[i] = row;
    else steps.push(row);
    useExecutionStore.setState({ steps: steps.slice(-PERF.maxTimelineItems) });
  } else if (e.type === 'execution:thought') {
    const content = String(e.content ?? '');
    useExecutionStore.setState({
      thoughts: [...s.thoughts, { id: `t-${Date.now()}`, content, ts: Date.now() }].slice(-PERF.maxThoughtItems),
    });
  } else if (e.type === 'execution:complete' || e.type === 'execution:failed') {
    useExecutionStore.setState({ isRunning: false });
  } else if (e.type === 'system:connected') {
    useExecutionStore.setState({ connected: true });
  } else if (e.type === 'system:disconnected') {
    useExecutionStore.setState({ connected: false });
  }
}

export const useExecutionStore = create<State>((set) => {
  if (!subscribed) {
    subscribed = true;
    getExecutionClient().on(handleEvent);
  }
  return {
    connected: false,
    isRunning: false,
    prompt: '',
    taskId: null,
    steps: [],
    thoughts: [],
    run: (prompt) => {
      ensureExecutionWsConnected();
      getExecutionClient().execute(prompt);
    },
    cancel: () => {
      const { taskId } = useExecutionStore.getState();
      if (taskId) getExecutionClient().cancel(taskId);
      useExecutionStore.setState({ isRunning: false });
    },
  };
});
