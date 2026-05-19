const { WebSocketServer } = require('ws');
const { eventManager, EVENTS } = require('./EventManager.cjs');
const { getExecutionEngine } = require('./ExecutionEngine.cjs');

function createExecutionWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws/execution' });
  const clients = new Set();

  eventManager.on('*', (envelope) => {
    const msg = JSON.stringify(envelope);
    for (const ws of clients) {
      if (ws.readyState === 1) ws.send(msg);
    }
  });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '/', 'http://localhost');
    const sessionId = url.searchParams.get('sessionId') || `s-${Date.now()}`;
    clients.add(ws);

    eventManager.emitEvent(EVENTS.SYSTEM_CONNECTED, { sessionId, message: 'live' });

    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        if (data.type === 'execute' && data.prompt) {
          getExecutionEngine().execute(sessionId, data.prompt, {
            url: data.url || null,
            tabId: data.tabId || null,
          });
        } else if (data.type === 'execution:cancel' && data.taskId) {
          getExecutionEngine().cancel(data.taskId);
        }
      } catch {
        /* ignore */
      }
    });

    ws.on('close', () => clients.delete(ws));
  });

  return wss;
}

module.exports = { createExecutionWebSocket };
