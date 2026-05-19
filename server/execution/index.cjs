const { createExecutionWebSocket } = require('./execution-websocket.cjs');

function initExecutionLayer(server) {
  return createExecutionWebSocket(server);
}

module.exports = { initExecutionLayer };
