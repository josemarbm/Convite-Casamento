const TOKEN_KEY = 'auth_token';

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

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
  const token = localStorage.getItem(TOKEN_KEY);
  const form = new FormData();
  form.append('file', file);
  const response = await fetch(`/api${path}`, { method: 'POST', body: form, headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, body?.error ?? 'Upload failed');
  return body;
}

export async function downloadGuests() {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch('/api/guests/export', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) throw new ApiError(response.status, 'Export failed');
  return response.blob();
}