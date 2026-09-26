import { describe, expect, it, vi } from 'vitest';
import { buildApp } from '../server/app.js';
import { createAuthToken } from '../server/lib/auth.js';

const guest = {
  id: 10,
  name: 'Maria Silva',
  phone: '5511999999999',
  groupId: null,
  status: 'pending',
  sentAt: null,
  rsvpStatus: 'pending',
  rsvpRespondedAt: null,
  createdAt: new Date('2026-09-20T00:00:00.000Z'),
  group: null,
};

function mockDb() {
  return {
    guest: {
      findMany: vi.fn().mockResolvedValue([guest]),
      count: vi.fn().mockResolvedValue(1),
      create: vi.fn().mockResolvedValue(guest),
      update: vi.fn().mockResolvedValue(guest),
      delete: vi.fn().mockResolvedValue(guest),
    },
  } as never;
}

describe('guest routes', () => {
  it('requires authentication', async () => {
    const app = buildApp({ db: mockDb(), jwtSecret: 'test-secret' });
    const response = await app.inject({ method: 'GET', url: '/api/guests' });

    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it('lists guests with pagination metadata', async () => {
    const app = buildApp({ db: mockDb(), jwtSecret: 'test-secret' });
    const token = await createAuthToken({ id: 1, username: 'admin' }, 'test-secret');
    const response = await app.inject({
      method: 'GET',
      url: '/api/guests?page=1&per_page=20&search=Maria',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      total: 1,
      page: 1,
      per_page: 20,
      pages: 1,
      guests: [{ id: 10, name: 'Maria Silva', rsvp_status: 'pending' }],
    });
    await app.close();
  });
});