import { describe, expect, it, vi } from 'vitest';
import { buildApp } from '../server/app.js';
import { createAuthToken } from '../server/lib/auth.js';

function createDb() {
  const event = {
    id: 8,
    name: 'Festa da Ana',
    eventType: 'birthday',
    customType: null,
    hosts: 'Ana',
    dateTime: new Date('2027-04-03T19:00:00.000Z'),
    location: 'Salão Azul',
    address: 'Rua Central, 10',
    imagePath: null,
    archivedAt: null,
    createdAt: new Date('2026-10-02T00:00:00.000Z'),
  };
  const db = {
    event: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ ...event, ...data })),
      findMany: vi.fn().mockResolvedValue([event]),
      findUnique: vi.fn().mockResolvedValue(event),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ ...event, ...data })),
    },
    messageTemplate: { create: vi.fn().mockResolvedValue({ id: 14 }) },
    scheduledSend: {
      findMany: vi.fn().mockResolvedValue([{ id: 21 }]),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    $transaction: vi.fn(async (callback: (client: typeof db) => Promise<unknown>) => callback(db)),
  };
  return db;
}

async function adminHeaders() {
  const token = await createAuthToken({ id: 1, username: 'admin' }, 'test-secret');
  return { authorization: `Bearer ${token}` };
}

describe('event routes', () => {
  it('creates a typed event and its default message preset', async () => {
    const db = createDb();
    const app = buildApp({ db: db as never, jwtSecret: 'test-secret' });
    const response = await app.inject({
      method: 'POST',
      url: '/api/events',
      headers: await adminHeaders(),
      payload: { name: 'Festa da Ana', event_type: 'birthday', hosts: 'Ana', date_time: '2027-04-03T19:00:00.000Z', location: 'Salão Azul', address: 'Rua Central, 10' },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ name: 'Festa da Ana', event_type: 'birthday', event_type_label: 'Aniversário' });
    expect(db.messageTemplate.create).toHaveBeenCalledWith({ data: expect.objectContaining({ eventId: 8, isDefault: true, name: 'Convite de aniversário' }) });
    await app.close();
  });

  it('requires a custom label for the other event type', async () => {
    const app = buildApp({ db: createDb() as never, jwtSecret: 'test-secret' });
    const response = await app.inject({ method: 'POST', url: '/api/events', headers: await adminHeaders(), payload: { name: 'Evento', event_type: 'other' } });

    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it('requires an event type when creating an event', async () => {
    const app = buildApp({ db: createDb() as never, jwtSecret: 'test-secret' });
    const response = await app.inject({ method: 'POST', url: '/api/events', headers: await adminHeaders(), payload: { name: 'Evento sem tipo' } });

    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it('archives an event and cancels its pending scheduled sends', async () => {
    const db = createDb();
    const cancelTimer = vi.fn();
    const app = buildApp({ db: db as never, jwtSecret: 'test-secret', scheduler: { scheduleSend: vi.fn(), cancelTimer } });
    const response = await app.inject({ method: 'POST', url: '/api/events/8/archive', headers: await adminHeaders() });

    expect(response.statusCode).toBe(200);
    expect(db.scheduledSend.updateMany).toHaveBeenCalledWith({ where: { eventId: 8, status: 'pending' }, data: { status: 'cancelled' } });
    expect(cancelTimer).toHaveBeenCalledWith(21);
    await app.close();
  });
});