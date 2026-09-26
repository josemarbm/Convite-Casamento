import { describe, expect, it, vi } from 'vitest';
import { buildApp } from '../server/app.js';
import { createAuthToken } from '../server/lib/auth.js';

const group = { id: 2, name: 'Familia', description: 'Parentes', createdAt: new Date('2026-09-20T00:00:00.000Z'), _count: { guests: 3 } };
const template = { id: 4, name: 'Padrao', content: 'Oi {nome}', isDefault: true, createdAt: new Date('2026-09-20T00:00:00.000Z') };

function mockDb() {
  return {
    group: { findMany: vi.fn().mockResolvedValue([group]), create: vi.fn().mockResolvedValue(group), update: vi.fn().mockResolvedValue(group), delete: vi.fn() },
    messageTemplate: { findMany: vi.fn().mockResolvedValue([template]), findUnique: vi.fn().mockResolvedValue(template), create: vi.fn().mockResolvedValue(template), update: vi.fn().mockResolvedValue(template), delete: vi.fn() },
  } as never;
}

describe('groups and templates routes', () => {
  it('lists groups and templates for an authenticated user', async () => {
    const app = buildApp({ db: mockDb(), jwtSecret: 'test-secret' });
    const token = await createAuthToken({ id: 1, username: 'admin' }, 'test-secret');
    const headers = { authorization: `Bearer ${token}` };
    const groups = await app.inject({ method: 'GET', url: '/api/groups', headers });
    const templates = await app.inject({ method: 'GET', url: '/api/templates', headers });

    expect(groups.statusCode).toBe(200);
    expect(groups.json()[0]).toMatchObject({ name: 'Familia', guest_count: 3 });
    expect(templates.statusCode).toBe(200);
    expect(templates.json()[0]).toMatchObject({ name: 'Padrao', is_default: true });
    await app.close();
  });

  it('protects default templates from deletion', async () => {
    const app = buildApp({ db: mockDb(), jwtSecret: 'test-secret' });
    const token = await createAuthToken({ id: 1, username: 'admin' }, 'test-secret');
    const response = await app.inject({ method: 'DELETE', url: '/api/templates/4', headers: { authorization: `Bearer ${token}` } });

    expect(response.statusCode).toBe(400);
    await app.close();
  });
});