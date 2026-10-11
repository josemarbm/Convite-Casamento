import { describe, expect, it, vi } from 'vitest';
import { buildApp } from '../server/app.js';
import { createAuthToken } from '../server/lib/auth.js';

const guest = {
  id: 10,
  eventId: 8,
  name: 'Maria Silva',
  phone: '5511999999999',
  groupId: null,
  companionLimit: 0,
  companions: [],
  status: 'pending',
  sentAt: null,
  rsvpStatus: 'pending',
  rsvpRespondedAt: null,
  createdAt: new Date('2026-09-20T00:00:00.000Z'),
  group: null,
};

function mockDb() {
  const transactionGuest = {
    findFirst: vi.fn().mockResolvedValue(guest),
    create: vi.fn().mockResolvedValue(guest),
    update: vi.fn().mockResolvedValue(guest),
  };
  const transactionGroup = { findFirst: vi.fn().mockResolvedValue({ id: 2, eventId: 8 }) };

  return {
    event: { findUnique: vi.fn().mockResolvedValue({ id: 8, archivedAt: null }) },
    group: { findFirst: vi.fn().mockResolvedValue({ id: 2, eventId: 8 }) },
    $transaction: vi.fn(async (callback: (tx: any) => unknown) => callback({ guest: transactionGuest, group: transactionGroup })),
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
      guests: [{ id: 10, name: 'Maria Silva', rsvp_status: 'pending', companion_limit: 0, companions: [] }],
    });
    await app.close();
  });

  it('returns a zero companion limit and no companions by default', async () => {
    const db = mockDb() as any;
    const createGuest = vi.fn().mockResolvedValue(guest);
    db.$transaction.mockImplementationOnce(async (callback: (tx: any) => unknown) => callback({ guest: { create: createGuest } }));
    const app = buildApp({ db, jwtSecret: 'test-secret' });
    const token = await createAuthToken({ id: 1, username: 'admin' }, 'test-secret');
    const response = await app.inject({
      method: 'POST',
      url: '/api/guests',
      headers: { authorization: `Bearer ${token}`, 'x-event-id': '8' },
      payload: { name: 'João', phone: '55119999' },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ companion_limit: 0, companions: [] });
    expect(createGuest).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ companionLimit: 0 }),
      include: { group: true, companions: { orderBy: { id: 'asc' } } },
    }));
    await app.close();
  });

  it('creates normalized companion names when the list is at its limit', async () => {
    const db = mockDb() as any;
    const createGuest = vi.fn().mockResolvedValue({ ...guest, companionLimit: 2, companions: [{ name: 'Ana' }, { name: 'Bia' }] });
    db.$transaction.mockImplementationOnce(async (callback: (tx: any) => unknown) => callback({
      guest: { create: createGuest },
    }));
    const app = buildApp({ db, jwtSecret: 'test-secret' });
    const token = await createAuthToken({ id: 1, username: 'admin' }, 'test-secret');
    const response = await app.inject({
      method: 'POST',
      url: '/api/guests',
      headers: { authorization: `Bearer ${token}`, 'x-event-id': '8' },
      payload: { name: 'João', phone: '55119999', companion_limit: 2, companions: [' Ana ', '', 'Bia '] },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ companion_limit: 2, companions: ['Ana', 'Bia'] });
    expect(db.$transaction).toHaveBeenCalledOnce();
    expect(createGuest).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        companionLimit: 2,
        companions: { create: [{ name: 'Ana' }, { name: 'Bia' }] },
      }),
    }));
    await app.close();
  });

  it('drops whitespace-only companion names even when the raw value exceeds 200 characters', async () => {
    const db = mockDb() as any;
    const createGuest = vi.fn().mockResolvedValue(guest);
    db.$transaction.mockImplementationOnce(async (callback: (tx: any) => unknown) => callback({
      guest: { create: createGuest },
    }));
    const app = buildApp({ db, jwtSecret: 'test-secret' });
    const token = await createAuthToken({ id: 1, username: 'admin' }, 'test-secret');
    const response = await app.inject({
      method: 'POST',
      url: '/api/guests',
      headers: { authorization: `Bearer ${token}`, 'x-event-id': '8' },
      payload: { name: 'João', phone: '55119999', companion_limit: 0, companions: [' '.repeat(201)] },
    });

    expect(response.statusCode).toBe(201);
    expect(createGuest).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.not.objectContaining({ companions: expect.anything() }),
    }));
    await app.close();
  });

  it('accepts a padded companion name when its trimmed length is exactly 200 characters', async () => {
    const db = mockDb() as any;
    const trimmedName = 'x'.repeat(200);
    const createGuest = vi.fn().mockResolvedValue({ ...guest, companionLimit: 1, companions: [{ name: trimmedName }] });
    db.$transaction.mockImplementationOnce(async (callback: (tx: any) => unknown) => callback({
      guest: { create: createGuest },
    }));
    const app = buildApp({ db, jwtSecret: 'test-secret' });
    const token = await createAuthToken({ id: 1, username: 'admin' }, 'test-secret');
    const response = await app.inject({
      method: 'POST',
      url: '/api/guests',
      headers: { authorization: `Bearer ${token}`, 'x-event-id': '8' },
      payload: { name: 'João', phone: '55119999', companion_limit: 1, companions: [` ${trimmedName} `] },
    });

    expect(response.statusCode).toBe(201);
    expect(createGuest).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ companions: { create: [{ name: trimmedName }] } }),
    }));
    await app.close();
  });

  it('rejects a companion list above its limit', async () => {
    const db = mockDb() as any;
    const app = buildApp({ db, jwtSecret: 'test-secret' });
    const token = await createAuthToken({ id: 1, username: 'admin' }, 'test-secret');
    const response = await app.inject({
      method: 'POST',
      url: '/api/guests',
      headers: { authorization: `Bearer ${token}`, 'x-event-id': '8' },
      payload: { name: 'João', phone: '55119999', companion_limit: 1, companions: ['Ana', 'Bia'] },
    });

    expect(response.statusCode).toBe(400);
    expect(db.$transaction).not.toHaveBeenCalled();
    await app.close();
  });

  it.each([-1, 1.5, 'not-a-number'])(
    'rejects invalid companion limits (%s)',
    async (companionLimit) => {
      const db = mockDb() as any;
      const app = buildApp({ db, jwtSecret: 'test-secret' });
      const token = await createAuthToken({ id: 1, username: 'admin' }, 'test-secret');
      const response = await app.inject({
        method: 'POST',
        url: '/api/guests',
        headers: { authorization: `Bearer ${token}`, 'x-event-id': '8' },
        payload: { name: 'João', phone: '55119999', companion_limit: companionLimit },
      });

      expect(response.statusCode).toBe(400);
      expect(db.$transaction).not.toHaveBeenCalled();
      await app.close();
    },
  );

  it.each([123, 'x'.repeat(201)])('rejects invalid companion names', async (name) => {
    const db = mockDb() as any;
    const app = buildApp({ db, jwtSecret: 'test-secret' });
    const token = await createAuthToken({ id: 1, username: 'admin' }, 'test-secret');
    const response = await app.inject({
      method: 'POST',
      url: '/api/guests',
      headers: { authorization: `Bearer ${token}`, 'x-event-id': '8' },
      payload: { name: 'João', phone: '55119999', companion_limit: 1, companions: [name] },
    });

    expect(response.statusCode).toBe(400);
    expect(db.$transaction).not.toHaveBeenCalled();
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
    expect(db.guest.findMany).toHaveBeenCalledWith(expect.objectContaining({
      include: { group: true, companions: { orderBy: { id: 'asc' } } },
    }));
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
    expect(db.$transaction).not.toHaveBeenCalled();
    await app.close();
  });

  it('does not allow editing a guest from another event', async () => {
    const db = mockDb() as any;
    const findGuest = vi.fn().mockResolvedValue(null);
    const updateGuest = vi.fn();
    db.$transaction.mockImplementationOnce(async (callback: (tx: any) => unknown) => callback({
      guest: { findFirst: findGuest, update: updateGuest },
      group: { findFirst: vi.fn() },
    }));
    const app = buildApp({ db, jwtSecret: 'test-secret' });
    const token = await createAuthToken({ id: 1, username: 'admin' }, 'test-secret');
    const response = await app.inject({
      method: 'PUT',
      url: '/api/guests/90',
      headers: { authorization: `Bearer ${token}`, 'x-event-id': '8' },
      payload: { name: 'João' },
    });

    expect(response.statusCode).toBe(404);
    expect(findGuest).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 90, eventId: 8 } }));
    expect(updateGuest).not.toHaveBeenCalled();
    await app.close();
  });

  it('looks up and validates updates in a Serializable transaction', async () => {
    const db = mockDb() as any;
    const findGuest = vi.fn().mockResolvedValue({ ...guest, companionLimit: 2, companions: [{ id: 21, name: 'Ana' }] });
    const findGroup = vi.fn().mockResolvedValue({ id: 2, eventId: 8 });
    const updateGuest = vi.fn().mockResolvedValue({ ...guest, companionLimit: 2, companions: [{ id: 21, name: 'Ana' }] });
    db.$transaction.mockImplementationOnce(async (callback: (tx: any) => unknown) => callback({
      guest: { findFirst: findGuest, update: updateGuest },
      group: { findFirst: findGroup },
    }));
    const app = buildApp({ db, jwtSecret: 'test-secret' });
    const token = await createAuthToken({ id: 1, username: 'admin' }, 'test-secret');
    const response = await app.inject({
      method: 'PUT',
      url: '/api/guests/10',
      headers: { authorization: `Bearer ${token}`, 'x-event-id': '8' },
      payload: { name: 'Maria updated', group_id: 2 },
    });

    expect(response.statusCode).toBe(200);
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
    expect(db.guest.findFirst).not.toHaveBeenCalled();
    expect(db.group.findFirst).not.toHaveBeenCalled();
    expect(findGuest).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 10, eventId: 8 },
      include: { companions: { orderBy: { id: 'asc' } } },
    }));
    expect(findGroup).toHaveBeenCalledWith({ where: { id: 2, eventId: 8 } });
    expect(updateGuest).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ companionLimit: 2 }),
    }));
    await app.close();
  });

  it('does not update when the guest is missing from the active event', async () => {
    const db = mockDb() as any;
    const updateGuest = vi.fn();
    db.$transaction.mockImplementationOnce(async (callback: (tx: any) => unknown) => callback({
      guest: { findFirst: vi.fn().mockResolvedValue(null), update: updateGuest },
      group: { findFirst: vi.fn() },
    }));
    const app = buildApp({ db, jwtSecret: 'test-secret' });
    const token = await createAuthToken({ id: 1, username: 'admin' }, 'test-secret');
    const response = await app.inject({
      method: 'PUT',
      url: '/api/guests/90',
      headers: { authorization: `Bearer ${token}`, 'x-event-id': '8' },
      payload: { name: 'João' },
    });

    expect(response.statusCode).toBe(404);
    expect(updateGuest).not.toHaveBeenCalled();
    await app.close();
  });

  it('returns 409 when a Serializable update conflicts', async () => {
    const db = mockDb() as any;
    db.$transaction.mockRejectedValueOnce(Object.assign(new Error('serialization conflict'), { code: 'P2034' }));
    const app = buildApp({ db, jwtSecret: 'test-secret' });
    const token = await createAuthToken({ id: 1, username: 'admin' }, 'test-secret');
    const response = await app.inject({
      method: 'PUT',
      url: '/api/guests/10',
      headers: { authorization: `Bearer ${token}`, 'x-event-id': '8' },
      payload: { name: 'Maria updated' },
    });

    expect(response.statusCode).toBe(409);
    await app.close();
  });

  it('preserves companion values when companion fields are omitted from an update', async () => {
    const storedGuest = { ...guest, companionLimit: 2, companions: [{ name: 'Ana' }] };
    const db = mockDb() as any;
    const findGuest = vi.fn().mockResolvedValue(storedGuest);
    const updateGuest = vi.fn().mockResolvedValue(storedGuest);
    db.$transaction.mockImplementationOnce(async (callback: (tx: any) => unknown) => callback({
      guest: { findFirst: findGuest, update: updateGuest },
      group: { findFirst: vi.fn() },
    }));
    const app = buildApp({ db, jwtSecret: 'test-secret' });
    const token = await createAuthToken({ id: 1, username: 'admin' }, 'test-secret');
    const response = await app.inject({
      method: 'PUT',
      url: '/api/guests/10',
      headers: { authorization: `Bearer ${token}`, 'x-event-id': '8' },
      payload: { name: 'Maria updated' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ companion_limit: 2, companions: ['Ana'] });
    expect(findGuest).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 10, eventId: 8 } }));
    expect(db.$transaction).toHaveBeenCalledOnce();
    expect(updateGuest).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ companionLimit: 2 }),
    }));
    expect(updateGuest.mock.calls[0][0].data).not.toHaveProperty('companions');
    await app.close();
  });

  it('replaces companion names atomically when names are supplied on update', async () => {
    const db = mockDb() as any;
    const updateGuest = vi.fn().mockResolvedValue({ ...guest, companionLimit: 2, companions: [{ name: 'Bia' }] });
    db.$transaction.mockImplementationOnce(async (callback: (tx: any) => unknown) => callback({
      guest: { findFirst: vi.fn().mockResolvedValue(guest), update: updateGuest },
      group: { findFirst: vi.fn() },
    }));
    const app = buildApp({ db, jwtSecret: 'test-secret' });
    const token = await createAuthToken({ id: 1, username: 'admin' }, 'test-secret');
    const response = await app.inject({
      method: 'PUT',
      url: '/api/guests/10',
      headers: { authorization: `Bearer ${token}`, 'x-event-id': '8' },
      payload: { companion_limit: 2, companions: [' Bia ', ''] },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ companion_limit: 2, companions: ['Bia'] });
    expect(db.$transaction).toHaveBeenCalledOnce();
    expect(updateGuest).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 10 },
      data: expect.objectContaining({
        companionLimit: 2,
        companions: { deleteMany: {}, create: [{ name: 'Bia' }] },
      }),
      include: { group: true, companions: { orderBy: { id: 'asc' } } },
    }));
    await app.close();
  });

  it('rejects reducing a companion limit below the retained list size', async () => {
    const db = mockDb() as any;
    const updateGuest = vi.fn();
    db.$transaction.mockImplementationOnce(async (callback: (tx: any) => unknown) => callback({
      guest: {
        findFirst: vi.fn().mockResolvedValue({ ...guest, companionLimit: 2, companions: [{ name: 'Ana' }, { name: 'Bia' }] }),
        update: updateGuest,
      },
      group: { findFirst: vi.fn() },
    }));
    const app = buildApp({ db, jwtSecret: 'test-secret' });
    const token = await createAuthToken({ id: 1, username: 'admin' }, 'test-secret');
    const response = await app.inject({
      method: 'PUT',
      url: '/api/guests/10',
      headers: { authorization: `Bearer ${token}`, 'x-event-id': '8' },
      payload: { companion_limit: 1 },
    });

    expect(response.statusCode).toBe(400);
    expect(db.$transaction).toHaveBeenCalledOnce();
    expect(updateGuest).not.toHaveBeenCalled();
    await app.close();
  });

  it('rejects replacement companions above the stored limit when the limit is omitted', async () => {
    const db = mockDb() as any;
    const updateGuest = vi.fn();
    db.$transaction.mockImplementationOnce(async (callback: (tx: any) => unknown) => callback({
      guest: {
        findFirst: vi.fn().mockResolvedValue({ ...guest, companionLimit: 1, companions: [{ name: 'Ana' }] }),
        update: updateGuest,
      },
      group: { findFirst: vi.fn() },
    }));
    const app = buildApp({ db, jwtSecret: 'test-secret' });
    const token = await createAuthToken({ id: 1, username: 'admin' }, 'test-secret');
    const response = await app.inject({
      method: 'PUT',
      url: '/api/guests/10',
      headers: { authorization: `Bearer ${token}`, 'x-event-id': '8' },
      payload: { companions: ['Bia', 'Clara'] },
    });

    expect(response.statusCode).toBe(400);
    expect(updateGuest).not.toHaveBeenCalled();
    await app.close();
  });
});