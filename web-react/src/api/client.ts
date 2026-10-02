const TOKEN_KEY = 'auth_token';
export const ACTIVE_EVENT_KEY = 'active_event_id';

function setRequestHeaders(headers: Headers) {
  const token = localStorage.getItem(TOKEN_KEY);
  const eventId = localStorage.getItem(ACTIVE_EVENT_KEY);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (eventId) headers.set('X-Event-Id', eventId);
  return headers;
}

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}) {
  const headers = setRequestHeaders(new Headers(options.headers));
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const response = await fetch(`/api${path}`, { ...options, headers });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) localStorage.removeItem(TOKEN_KEY);
    throw new ApiError(response.status, body?.error ?? 'Request failed');
  }
  return body as T;
}

export function saveSession(token: string, user: unknown) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem('user', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('user');
}

export function hasSession() {
  return Boolean(localStorage.getItem(TOKEN_KEY));
}

export async function uploadFile(path: string, file: File) {
  const form = new FormData();
  form.append('file', file);
  const response = await fetch(`/api${path}`, { method: 'POST', body: form, headers: setRequestHeaders(new Headers()) });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, body?.error ?? 'Upload failed');
  return body;
}

export async function downloadGuests() {
  const response = await fetch('/api/guests/export', { headers: setRequestHeaders(new Headers()) });
  if (!response.ok) throw new ApiError(response.status, 'Export failed');
  return response.blob();
}