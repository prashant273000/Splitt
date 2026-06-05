// In-memory SSE store keyed by userId — single instance only; replace with Redis pub/sub for multi-instance deploys.
class SSEManager {
  constructor() {
    this.clients = new Map();
  }

  add(userId, res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    res.write(': connected\n\n');

    this.clients.set(userId, res);

    res.on('close', () => {
      if (this.clients.get(userId) === res) {
        this.clients.delete(userId);
      }
    });
  }

  send(userId, event, data) {
    const res = this.clients.get(userId);
    if (!res) return;
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  broadcast(userIds, event, data) {
    for (const id of userIds) {
      this.send(id, event, data);
    }
  }
}

const sseManager = new SSEManager();
module.exports = { sseManager };
