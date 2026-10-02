import { describe, expect, it, vi } from 'vitest';
import { backfillLegacyEvent } from '../prisma/backfill-events.js';

describe('legacy event backfill', () => {
  it('creates the wedding event from legacy settings and assigns unscoped records', async () => {
    const event = { id: 8, name: 'Casamento Joana & Pedro', eventType: 'wedding', hosts: 'Joana & Pedro', imagePath: '/uploads/invitation.jpg' };
    const db = {
      setting: { findUnique: vi.fn(async ({ where }: { where: { key: string } }) => ({ value: where.key === 'couple_name' ? 'Joana & Pedro' : '/uploads/invitation.jpg' })) },
      event: { upsert: vi.fn().mockResolvedValue(event) },
      guest: { updateMany: vi.fn().mockResolvedValue({ count: 2 }) },
      group: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      messageTemplate: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findFirst: vi.fn().mockResolvedValue({ id: 12, isDefault: true }),
      },
      scheduledSend: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
    };

    await backfillLegacyEvent(db as never);

    expect(db.event.upsert).toHaveBeenCalledWith({
      where: { systemKey: 'legacy-wedding' },
      update: {},
      create: expect.objectContaining({ name: 'Casamento Joana & Pedro', eventType: 'wedding', hosts: 'Joana & Pedro', imagePath: '/uploads/invitation.jpg' }),
    });
    for (const model of [db.guest, db.group, db.messageTemplate, db.scheduledSend]) {
      expect(model.updateMany).toHaveBeenCalledWith({ where: { eventId: null }, data: { eventId: event.id } });
    }
    expect(db.messageTemplate.findFirst).toHaveBeenCalledWith({ where: { eventId: event.id, isDefault: true }, orderBy: { id: 'asc' } });
    expect(db.messageTemplate.updateMany).toHaveBeenCalledWith({
      where: { eventId: event.id, isDefault: true, id: { not: 12 } },
      data: { isDefault: false },
    });
  });

  it('creates a default wedding template when the legacy event has no templates', async () => {
    const event = { id: 8, name: 'Casamento Joana & Pedro', eventType: 'wedding', hosts: 'Joana & Pedro', imagePath: null };
    const db = {
      setting: { findUnique: vi.fn().mockResolvedValue(null) },
      event: { upsert: vi.fn().mockResolvedValue(event) },
      guest: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      group: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      messageTemplate: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 1 }),
      },
      scheduledSend: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
    };

    await backfillLegacyEvent(db as never);

    expect(db.messageTemplate.findFirst).toHaveBeenNthCalledWith(2, { where: { eventId: event.id }, orderBy: { id: 'asc' } });
    expect(db.messageTemplate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ eventId: event.id, name: 'Convite de casamento', isDefault: true }),
    });
  });
});