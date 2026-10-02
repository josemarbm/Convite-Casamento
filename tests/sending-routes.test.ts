import { describe, expect, it, vi } from 'vitest';
import { buildApp } from '../server/app.js';
import { createAuthToken } from '../server/lib/auth.js';

const event = { id: 8, name: 'Festa da Ana', eventType: 'birthday', customType: null, hosts: 'Ana', dateTime: null, location: null, address: null, imagePath: null, archivedAt: null };
const guest = { id: 2, eventId: 8, name: 'João', phone: '55119999', groupId: null, group: null };

function mockDb() {
  return {
    event: { findUnique: vi.fn().mockResolvedValue(event) },
    setting: { findUnique: vi.fn().mockResolvedValue({ value: 'whatsapp-session' }) },
    messageTemplate: { findFirst: vi.fn().mockResolvedValue({ id: 14, content: 'Olá {nome} - {event_name}' }) },
    group: { findFirst: vi.fn().mockResolvedValue({ id: 3, eventId: 8 }) },
    guest: {
      count: vi.fn().mockResolvedValue(1),
      findMany: vi.fn().mockResolvedValue([guest]),
      update: vi.fn().mockResolvedValue(guest),
    },
    scheduledSend: {
      create: vi.fn().mockResolvedValue({ id: 21, scheduledTime: new Date(Date.now() + 60_000), status: 'pending' }),
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue({ id: 21, eventId: 8 }),
      update: vi.fn().mockResolvedValue({ id: 21, status: 'cancelled' }),
    },
  };
}

async function headers(includeEvent = true) {
  const token = await createAuthToken({ id: 1, username: 'admin' }, 'test-secret');
  return { authorization: `Bearer ${token}`, ...(includeEvent ? { 'x-event-id': '8' } : {}) };
}

describe('event-scoped send routes', () => {
  it('rejects direct sends without an event context', async () => {
    const db = mockDb();
    const app = buildApp({ db: db as never, jwtSecret: 'test-secret', evolutionClient: { sendText: vi.fn() } as never });
    const response = await app.inject({ method: 'POST', url: '/api/send/direct', headers: await headers(false), payload: {} });

    expect(response.statusCode).toBe(400);
    expect(db.guest.findMany).not.toHaveBeenCalled();
    await app.close();
  });

  it('passes the selected event to direct sends and schedule creation', async () => {
    const db = mockDb();
    const sendText = vi.fn().mockResolvedValue({ success: true, statusCode: 201, data: {} });
    const scheduleSend = vi.fn();
    const app = buildApp({ db: db as never, jwtSecret: 'test-secret', evolutionClient: { sendText } as never, scheduler: { scheduleSend, cancelTimer: vi.fn() } });
    const requestHeaders = await headers();

    const direct = await app.inject({ method: 'POST', url: '/api/send/direct', headers: requestHeaders, payload: {} });
    const scheduledTime = new Date(Date.now() + 60_000).toISOString();
    const scheduled = await app.inject({
      method: 'POST',
      url: '/api/send/schedule',
      headers: requestHeaders,
      payload: { template_id: 14, group_id: 3, guest_ids: [2], scheduled_time: scheduledTime },
    });

    expect(direct.statusCode).toBe(200);
    expect(db.guest.findMany).toHaveBeenCalledWith({ where: { eventId: 8 }, include: { group: true } });
    expect(scheduled.statusCode).toBe(201);
    expect(db.scheduledSend.create).toHaveBeenCalledWith({ data: expect.objectContaining({ eventId: 8, templateId: 14, groupId: 3, guestIds: '[2]' }) });
    expect(scheduleSend).toHaveBeenCalledWith(21, expect.any(Date));
    await app.close();
  });
});