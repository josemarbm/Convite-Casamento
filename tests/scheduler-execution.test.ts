import { describe, expect, it, vi } from 'vitest';
import { SchedulerService } from '../server/modules/scheduler/service.js';

describe('SchedulerService', () => {
  it('marks overdue pending sends as failed', async () => {
    const db = {
      scheduledSend: {
        findMany: vi.fn().mockResolvedValue([{ id: 1, scheduledTime: new Date(Date.now() - 1000), status: 'pending' }]),
        update: vi.fn().mockResolvedValue({}),
      },
    } as never;
    const scheduler = new SchedulerService({ db, client: {} as never, sessionId: async () => '' });

    await scheduler.loadPendingSchedules();

    expect((db as any).scheduledSend.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { status: 'failed' } });
    scheduler.shutdown();
  });

  it('executes a pending send and persists completion', async () => {
    const db = {
      scheduledSend: {
        findUnique: vi.fn().mockResolvedValue({ id: 2, status: 'pending', templateId: 3, groupId: null, guestIds: '[7]' }),
        update: vi.fn().mockResolvedValue({}),
      },
      messageTemplate: { findUnique: vi.fn().mockResolvedValue({ id: 3, content: 'Oi {nome}' }) },
      guest: { findMany: vi.fn().mockResolvedValue([{ id: 7, name: 'Maria', phone: '5511', group: null }]), update: vi.fn().mockResolvedValue({}) },
    } as never;
    const client = { sendText: vi.fn().mockResolvedValue({ success: true, statusCode: 201, data: {} }) } as never;
    const scheduler = new SchedulerService({ db, client, sessionId: async () => 'casamento2026' });

    await scheduler.execute(2);

    expect((db as any).scheduledSend.update).toHaveBeenCalledWith({ where: { id: 2 }, data: expect.objectContaining({ status: 'completed' }) });
    scheduler.shutdown();
  });
});