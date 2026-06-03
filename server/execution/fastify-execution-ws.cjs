const { eventManager, EVENTS } = require('./EventManager.cjs');
const { getExecutionEngine } = require('./ExecutionEngine.cjs');

const clients = new Set();

eventManager.on('*', (envelope) => {
  const msg = JSON.stringify(envelope);
  for (const ws of clients) {
    if (ws.readyState === 1) ws.send(msg);
  }
});

/**
 * Register /ws/execution via @fastify/websocket (works with Fastify's HTTP stack).
 */
function resolveWsSocket(connection) {
  if (!connection) return null;
  if (typeof connection.send === 'function' && typeof connection.on === 'function') {
    return connection;
  }
  if (connection.socket && typeof connection.socket.send === 'function') {
    return connection.socket;
  }
  return null;
}

function registerExecutionWebSocket(fastify) {
  // @fastify/websocket: first arg may be WebSocket or { socket } depending on version.
  fastify.get('/ws/execution', { websocket: true }, (connection, request) => {
    const ws = resolveWsSocket(connection);
    if (!ws) return;
    const url = new URL(request.url || '/ws/execution', 'http://127.0.0.1');
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
    ws.on('error', () => clients.delete(ws));
  });
}

module.exports = { registerExecutionWebSocket };
