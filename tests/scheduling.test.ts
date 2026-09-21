import { describe, expect, it, vi } from 'vitest';
import { buildApp } from '../server/app.js';
import { createAuthToken } from '../server/lib/auth.js';

describe('scheduled sending routes', () => {
  it('persists a future scheduled send and supports cancellation', async () => {
    const scheduled = { id: 8, templateId: 2, groupId: null, guestIds: '[]', scheduledTime: new Date(Date.now() + 86400000), status: 'pending' };
    const db = {
      setting: { findUnique: vi.fn().mockResolvedValue({ value: 'casamento2026' }) },
      scheduledSend: { create: vi.fn().mockResolvedValue(scheduled), update: vi.fn().mockResolvedValue({ ...scheduled, status: 'cancelled' }), findMany: vi.fn() },
    } as never;
    const scheduler = { scheduleSend: vi.fn(), cancelTimer: vi.fn() };
    const app = buildApp({ db, jwtSecret: 'test-secret', scheduler });
    const token = await createAuthToken({ id: 1, username: 'admin' }, 'test-secret');
    const headers = { authorization: `Bearer ${token}` };
    const create = await app.inject({ method: 'POST', url: '/api/send/schedule', headers, payload: { template_id: 2, scheduled_time: new Date(Date.now() + 86400000).toISOString(), guest_ids: [1] } });
    const cancel = await app.inject({ method: 'DELETE', url: '/api/send/scheduled/8', headers });

    expect(create.statusCode).toBe(201);
    expect(create.json()).toMatchObject({ id: 8, status: 'pending' });
    expect(scheduler.scheduleSend).toHaveBeenCalledWith(8, scheduled.scheduledTime);
    expect(cancel.statusCode).toBe(200);
    expect(cancel.json()).toEqual({ id: 8, status: 'cancelled' });
    expect(scheduler.cancelTimer).toHaveBeenCalledWith(8);
    await app.close();
  });
});