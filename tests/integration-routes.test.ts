import { describe, expect, it, vi } from 'vitest';
import { buildApp } from '../server/app.js';
import { createAuthToken } from '../server/lib/auth.js';

function mockDb() {
  return {
    setting: {
      findMany: vi.fn().mockResolvedValue([{ key: 'couple_name', value: 'Gabriela & Josemar' }]),
      findUnique: vi.fn().mockResolvedValue({ key: 'evolution_session_id', value: 'casamento2026' }),
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  } as never;
}

function authHeaders() {
  return createAuthToken({ id: 1, username: 'admin' }, 'test-secret').then((token) => ({ authorization: `Bearer ${token}` }));
}

describe('settings and Evolution routes', () => {
  it('returns settings and marks the active Evolution instance', async () => {
    const db = mockDb();
    const client = {
      listInstances: vi.fn().mockResolvedValue({ success: true, statusCode: 200, data: [{ instance: { instanceName: 'casamento2026', status: 'open' } }] }),
      createInstance: vi.fn(),
    } as never;
    const app = buildApp({ db, jwtSecret: 'test-secret', evolutionClient: client });
    const headers = await authHeaders();
    const settings = await app.inject({ method: 'GET', url: '/api/settings', headers });
    const instances = await app.inject({ method: 'GET', url: '/api/evolution/instances', headers });

    expect(settings.json()).toEqual({ couple_name: 'Gabriela & Josemar' });
    expect(instances.json().instances[0]).toMatchObject({ name: 'casamento2026', status: 'open', active: true });
    await app.close();
  });

  it('rejects invalid instance names before calling Evolution', async () => {
    const client = { createInstance: vi.fn() } as never;
    const app = buildApp({ db: mockDb(), jwtSecret: 'test-secret', evolutionClient: client });
    const headers = await authHeaders();
    const response = await app.inject({ method: 'POST', url: '/api/evolution/instances', headers, payload: { name: 'Nome inválido' } });

    expect(response.statusCode).toBe(400);
    expect((client as any).createInstance).not.toHaveBeenCalled();
    await app.close();
  });
});