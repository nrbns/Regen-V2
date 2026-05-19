const { v4: uuidv4 } = require('uuid');
const { eventManager, EVENTS } = require('./EventManager.cjs');

const STEPS = ['Parse intent', 'Search the web', 'Load page context', 'Reason', 'Respond'];

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function looksLikeSearch(prompt, meta) {
  if (!meta.url || meta.url === 'regen://newtab') return true;
  return /\b(search|find|look up|what is|who is|how to)\b/i.test(prompt);
}

function searchQueryFrom(prompt, meta) {
  const base = prompt.trim();
  if (meta.url && !meta.url.startsWith('regen://')) {
    try {
      const host = new URL(meta.url.startsWith('http') ? meta.url : `https://${meta.url}`).hostname;
      return `${base} site:${host}`;
    } catch {
      /* ignore */
    }
  }
  return base;
}

class ExecutionEngine {
  constructor() {
    this.runs = new Map();
  }

  async execute(sessionId, prompt, meta = {}) {
    const taskId = uuidv4();
    const run = { cancelled: false };
    this.runs.set(taskId, run);

    eventManager.emitEvent(EVENTS.EXECUTION_STARTED, {
      sessionId,
      taskId,
      prompt,
      url: meta.url || null,
    });

    let searchResults = [];

    for (let i = 0; i < STEPS.length; i++) {
      if (run.cancelled) break;
      const stepId = `s${i}`;
      const label = STEPS[i];

      eventManager.emitEvent(EVENTS.EXECUTION_STEP, {
        sessionId,
        taskId,
        stepId,
        label,
        status: 'running',
      });

      if (label === 'Search the web' && looksLikeSearch(prompt, meta)) {
        const q = searchQueryFrom(prompt, meta);
        eventManager.emitEvent(EVENTS.EXECUTION_THOUGHT, {
          sessionId,
          taskId,
          content: `Searching: ${q}`,
        });
        try {
          const { multiSourceSearch } = await import('../services/research/multiSourceSearch.js');
          searchResults = await multiSourceSearch(q, { maxResults: 6 });
          if (searchResults.length > 0) {
            const top = searchResults[0];
            eventManager.emitEvent(EVENTS.EXECUTION_THOUGHT, {
              sessionId,
              taskId,
              content: `Top: ${top.title} — ${top.url}`,
            });
          } else {
            eventManager.emitEvent(EVENTS.EXECUTION_THOUGHT, {
              sessionId,
              taskId,
              content: 'No web hits; using prompt context only.',
            });
          }
        } catch (err) {
          eventManager.emitEvent(EVENTS.EXECUTION_THOUGHT, {
            sessionId,
            taskId,
            content: `Search error: ${err.message}`,
          });
        }
      } else {
        eventManager.emitEvent(EVENTS.EXECUTION_THOUGHT, {
          sessionId,
          taskId,
          content: meta.url ? `${label} — ${meta.url}` : label,
        });
        await delay(label === 'Search the web' ? 200 : 350);
      }

      if (run.cancelled) break;

      eventManager.emitEvent(EVENTS.EXECUTION_STEP, {
        sessionId,
        taskId,
        stepId,
        label,
        status: 'done',
      });
    }

    if (!run.cancelled) {
      eventManager.emitEvent(EVENTS.EXECUTION_COMPLETE, {
        sessionId,
        taskId,
        prompt,
        resultCount: searchResults.length,
        topUrl: searchResults[0]?.url || null,
      });
    }
    this.runs.delete(taskId);
    return { taskId, results: searchResults };
  }

  cancel(taskId) {
    const run = this.runs.get(taskId);
    if (run) run.cancelled = true;
  }
}

let engine;
function getExecutionEngine() {
  if (!engine) engine = new ExecutionEngine();
  return engine;
}

module.exports = { getExecutionEngine };
