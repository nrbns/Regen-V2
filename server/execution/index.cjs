const { createExecutionWebSocket } = require('./execution-websocket.cjs');
const { registerExecutionWebSocket } = require('./fastify-execution-ws.cjs');

/** Legacy: raw ws.Server on Node http.Server */
function initExecutionLayer(server) {
  return createExecutionWebSocket(server);
}

module.exports = { initExecutionLayer, registerExecutionWebSocket };
