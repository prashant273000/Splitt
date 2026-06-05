const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function openEventStream(handlers) {
  const url = `${BASE}/api/v1/events`;
  const source = new EventSource(url, { withCredentials: true });

  for (const [event, handler] of Object.entries(handlers)) {
    source.addEventListener(event, (e) => {
      try {
        handler(JSON.parse(e.data));
      } catch (err) {
        console.error(`SSE handler error for ${event}:`, err);
      }
    });
  }

  return () => source.close();
}
