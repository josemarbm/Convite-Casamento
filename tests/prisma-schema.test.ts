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
});