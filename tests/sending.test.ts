import { describe, expect, it, vi } from 'vitest';
import { sendDirect, formatPhone, renderInvitationMessage } from '../server/modules/sending/service.js';

const guest = { id: 1, name: 'Maria', phone: '(11) 99999-9999', groupId: null, status: 'pending', sentAt: null, rsvpStatus: 'pending', rsvpRespondedAt: null, createdAt: new Date(), group: null };

describe('sending service', () => {
  it('normalizes Brazilian and US phone numbers', () => {
    expect(formatPhone('(11) 99999-9999')).toBe('5511999999999');
    expect(formatPhone('4155551212')).toBe('+14155551212');
  });

  it('renders guest and couple placeholders before sending', async () => {
     expect(renderInvitationMessage('Oi {nome}, com carinho, {couple_name}: {token}', guest, 'Gabriela & Josemar', 'guest-token')).toBe('Oi Maria, com carinho, Gabriela & Josemar: guest-token');
  });

  it('renders and sends messages while updating guest status', async () => {
    const db = {
      messageTemplate: { findFirst: vi.fn().mockResolvedValue({ id: 3, content: 'Oi {nome}, com carinho, {couple_name}: {token}' }) },
      setting: { findUnique: vi.fn().mockResolvedValue({ key: 'couple_name', value: 'Gabriela & Josemar' }) },
      guest: { findMany: vi.fn().mockResolvedValue([guest]), update: vi.fn().mockResolvedValue(guest) },
    } as never;
    const client = { sendText: vi.fn().mockResolvedValue({ success: true, statusCode: 201, data: {} }) } as never;

    const result = await sendDirect({ db, client, sessionId: 'casamento2026' });

    expect(renderInvitationMessage('Oi {nome}', guest, 'Gabriela & Josemar')).toBe('Oi Maria');
    expect(result).toMatchObject({ message: 'Sent 1/1 messages', results: [{ guest_id: 1, success: true }] });
    expect((client as any).sendText).toHaveBeenCalledWith('casamento2026', '5511999999999', expect.stringMatching(/^Oi Maria, com carinho, Gabriela & Josemar: [A-Za-z0-9_-]+$/));
    expect((db as any).guest.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ rsvpTokenHash: expect.stringMatching(/^[a-f0-9]{64}$/), status: 'sent' }) }));
  });
});