import { describe, expect, it, vi } from 'vitest';
import { buildApp } from '../server/app.js';
import { createAuthToken } from '../server/lib/auth.js';

const guest = {
  id: 10,
  eventId: 8,
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
    event: { findUnique: vi.fn().mockResolvedValue({ id: 8, archivedAt: null }) },
    group: { findFirst: vi.fn().mockResolvedValue({ id: 2, eventId: 8 }) },
    guest: {
      findMany: vi.fn().mockResolvedValue([guest]),
      findFirst: vi.fn().mockResolvedValue(guest),
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
      headers: { authorization: `Bearer ${token}`, 'x-event-id': '8' },
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

  it('requires an active event and scopes guest queries to it', async () => {
    const db = mockDb() as any;
    const app = buildApp({ db, jwtSecret: 'test-secret' });
    const token = await createAuthToken({ id: 1, username: 'admin' }, 'test-secret');
    const response = await app.inject({
      method: 'GET',
      url: '/api/guests',
      headers: { authorization: `Bearer ${token}`, 'x-event-id': '8' },
    });

    expect(response.statusCode).toBe(200);
    expect(db.guest.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { eventId: 8 } }));
    expect(db.guest.count).toHaveBeenCalledWith({ where: { eventId: 8 } });
    await app.close();
  });

  it('rejects guest requests without an active event context', async () => {
    const app = buildApp({ db: mockDb(), jwtSecret: 'test-secret' });
    const token = await createAuthToken({ id: 1, username: 'admin' }, 'test-secret');
    const response = await app.inject({ method: 'GET', url: '/api/guests', headers: { authorization: `Bearer ${token}` } });

    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it('does not allow assigning a group from another event', async () => {
    const db = mockDb() as any;
    db.group.findFirst.mockResolvedValue(null);
    const app = buildApp({ db, jwtSecret: 'test-secret' });
    const token = await createAuthToken({ id: 1, username: 'admin' }, 'test-secret');
    const response = await app.inject({
      method: 'POST',
      url: '/api/guests',
      headers: { authorization: `Bearer ${token}`, 'x-event-id': '8' },
      payload: { name: 'João', phone: '55119999', group_id: 90 },
    });

    expect(response.statusCode).toBe(400);
    expect(db.guest.create).not.toHaveBeenCalled();
    await app.close();
  });

  it('does not allow editing a guest from another event', async () => {
    const db = mockDb() as any;
    db.guest.findFirst.mockResolvedValue(null);
    const app = buildApp({ db, jwtSecret: 'test-secret' });
    const token = await createAuthToken({ id: 1, username: 'admin' }, 'test-secret');
    const response = await app.inject({
      method: 'PUT',
      url: '/api/guests/90',
      headers: { authorization: `Bearer ${token}`, 'x-event-id': '8' },
      payload: { name: 'João' },
    });

    expect(response.statusCode).toBe(404);
    expect(db.guest.update).not.toHaveBeenCalled();
    await app.close();
  });
});