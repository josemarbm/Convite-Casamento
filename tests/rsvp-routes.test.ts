import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { buildApp } from '../server/app.js';

const token = 'guest-rsvp-token';
const hash = createHash('sha256').update(token).digest('hex');

function mockDb() {
  const event = { id: 8, name: 'Festa da Ana', eventType: 'birthday', customType: null, hosts: 'Ana', dateTime: new Date('2027-04-03T19:00:00.000Z'), location: 'Salão Azul', address: 'Rua Central, 10' };
  const guest = {
    id: 7,
    name: 'Joao Silva',
    rsvpStatus: 'pending',
    rsvpRespondedAt: null,
    event,
  };
  return {
    guest: {
      findUnique: vi.fn().mockResolvedValue(guest),
      update: vi.fn().mockResolvedValue({ ...guest, rsvpStatus: 'confirmed', rsvpRespondedAt: new Date('2026-09-20T10:00:00.000Z') }),
    },
  } as never;
}

describe('public RSVP routes', () => {
  it('returns invitation details without JWT', async () => {
    const db = mockDb();
    const app = buildApp({ db });
    const response = await app.inject({ method: 'GET', url: `/api/rsvp/${token}` });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ name: 'Joao Silva', status: 'pending', event: { name: 'Festa da Ana', event_type: 'birthday', hosts: 'Ana', location: 'Salão Azul' } });
    expect((db as any).guest.findUnique).toHaveBeenCalledWith({ where: { rsvpTokenHash: hash }, include: { event: true } });
    await app.close();
  });

  it('updates an unanswered invitation once and rejects later changes', async () => {
    const db = mockDb() as any;
    const app = buildApp({ db });
    const confirmed = await app.inject({ method: 'POST', url: `/api/rsvp/${token}`, payload: { response: 'confirmed' } });

    expect(confirmed.statusCode).toBe(200);
    expect(confirmed.json().status).toBe('confirmed');

    db.guest.findUnique.mockResolvedValue({ id: 7, name: 'Joao Silva', rsvpStatus: 'confirmed', rsvpRespondedAt: new Date() });
    const retry = await app.inject({ method: 'POST', url: `/api/rsvp/${token}`, payload: { response: 'declined' } });

    expect(retry.statusCode).toBe(409);
    await app.close();
  });
});