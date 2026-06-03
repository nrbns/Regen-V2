#!/usr/bin/env node
/**
 * Dedicated execution WebSocket — avoids conflicts with redix-server on :4000.
 * ws://127.0.0.1:4001/ws/execution
 */
const http = require('http');
const { createExecutionWebSocket } = require('./execution-websocket.cjs');

const PORT = Number(process.env.EXECUTION_WS_PORT || 4001);
const HOST = process.env.EXECUTION_WS_HOST || '127.0.0.1';

const server = http.createServer((req, res) => {
  const path = (req.url || '').split('?')[0];
  if (path === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: true,
        service: 'regen-execution-ws',
        port: PORT,
      })
    );
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Regen execution WebSocket — connect to /ws/execution');
});

createExecutionWebSocket(server);

server.listen(PORT, HOST, () => {
  console.log(`[execution-ws] ws://${HOST}:${PORT}/ws/execution`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`[execution-ws] Port ${PORT} already in use — assuming another instance is running`);
    process.exit(0);
  }
  console.error('[execution-ws] failed:', err);
  process.exit(1);
});
