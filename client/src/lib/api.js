import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('opsmind_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const streamChat = async ({ question, sessionId, onMeta, onToken, onDone, onError }) => {
  const token = localStorage.getItem('opsmind_token');
  const response = await fetch(`${API_BASE}/chat/ask/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ question, sessionId })
  });

  if (!response.ok || !response.body) {
    throw new Error('Failed to stream response');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let eventBoundary = buffer.indexOf('\n\n');
    while (eventBoundary !== -1) {
      const rawEvent = buffer.slice(0, eventBoundary);
      buffer = buffer.slice(eventBoundary + 2);

      const eventLine = rawEvent.split('\n').find((line) => line.startsWith('event:'));
      const dataLine = rawEvent.split('\n').find((line) => line.startsWith('data:'));
      if (eventLine && dataLine) {
        const event = eventLine.replace('event:', '').trim();
        const data = JSON.parse(dataLine.replace('data:', '').trim());
        if (event === 'meta') onMeta?.(data);
        if (event === 'token') onToken?.(data.token);
        if (event === 'done') onDone?.(data);
      }

      eventBoundary = buffer.indexOf('\n\n');
    }
  }

  onError?.(null);
};

