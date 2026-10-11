import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const schema = readFileSync(new URL('../prisma/schema.prisma', import.meta.url), 'utf8');

describe('Prisma schema', () => {
  it('maps the existing application tables', () => {
    for (const table of ['users', 'guests', 'groups', 'message_templates', 'scheduled_sends', 'settings']) {
      expect(schema).toContain(`@@map("${table}")`);
    }
  });

  it('preserves RSVP fields on guests', () => {
    expect(schema).toContain('rsvpTokenHash');
    expect(schema).toContain('rsvpStatus');
    expect(schema).toContain('rsvpRespondedAt');
  });

  it('models named companions as dependent guest records', () => {
    const guestModel = schema.match(/model Guest \{([\s\S]*?)\n\}/)?.[1] ?? '';
    const companionModel = schema.match(/model GuestCompanion \{([\s\S]*?)\n\}/)?.[1] ?? '';

    expect(guestModel).toMatch(/companionLimit\s+Int\s+@default\(0\)\s+@map\("companion_limit"\)/);
    expect(guestModel).toMatch(/companions\s+GuestCompanion\[\]/);
    expect(companionModel).not.toBe('');
    expect(companionModel).toMatch(/id\s+Int\s+@id\s+@default\(autoincrement\(\)\)/);
    expect(companionModel).toMatch(/guestId\s+Int\s+@map\("guest_id"\)/);
    expect(companionModel).toMatch(/name\s+String\s+@db\.VarChar\(200\)/);
    expect(companionModel).toMatch(/guest\s+Guest\s+@relation\(fields: \[guestId\], references: \[id\], onDelete: Cascade\)/);
    expect(companionModel).toMatch(/@@index\(\[guestId\]\)/);
    expect(companionModel).toMatch(/@@map\("guest_companions"\)/);
  });

  it('models events and keeps existing resources assignable during backfill', () => {
    expect(schema).toMatch(/model Event \{[\s\S]*?@@map\("events"\)/);
    for (const model of ['Guest', 'Group', 'MessageTemplate', 'ScheduledSend']) {
      expect(schema).toMatch(new RegExp(`model ${model} \\{[\\s\\S]*?eventId\\s+Int\\?`));
    }
  });
});