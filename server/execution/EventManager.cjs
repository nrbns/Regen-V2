const { EventEmitter } = require('events');

const EVENTS = {
  EXECUTION_STARTED: 'execution:started',
  EXECUTION_STEP: 'execution:step',
  EXECUTION_THOUGHT: 'execution:thought',
  EXECUTION_COMPLETE: 'execution:complete',
  EXECUTION_FAILED: 'execution:failed',
  SYSTEM_CONNECTED: 'system:connected',
};

class EventManager extends EventEmitter {
  constructor() {
    super();
    this.seq = 0;
  }

  emitEvent(type, payload = {}) {
    const envelope = { type, seq: ++this.seq, timestamp: Date.now(), ...payload };
    this.emit(type, envelope);
    this.emit('*', envelope);
    return envelope;
  }
}

const eventManager = new EventManager();
module.exports = { eventManager, EVENTS };
