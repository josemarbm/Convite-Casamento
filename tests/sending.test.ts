import { describe, expect, it, vi } from 'vitest';
import { sendDirect, formatPhone, renderInvitationMessage } from '../server/modules/sending/service.js';

const guest = { id: 1, name: 'Maria', phone: '(11) 99999-9999', groupId: null, status: 'pending', sentAt: null, rsvpStatus: 'pending', rsvpRespondedAt: null, createdAt: new Date(), group: null };

describe('sending service', () => {
  it('normalizes Brazilian and US phone numbers', () => {
    expect(formatPhone('(11) 99999-9999')).toBe('5511999999999');
    expect(formatPhone('4155551212')).toBe('+14155551212');
  });

  it('renders and sends messages while updating guest status', async () => {
    const db = {
      messageTemplate: { findFirst: vi.fn().mockResolvedValue({ id: 3, content: 'Oi {nome}' }) },
      guest: { findMany: vi.fn().mockResolvedValue([guest]), update: vi.fn().mockResolvedValue(guest) },
    } as never;
    const client = { sendText: vi.fn().mockResolvedValue({ success: true, statusCode: 201, data: {} }) } as never;

    const result = await sendDirect({ db, client, sessionId: 'casamento2026' });

    expect(renderInvitationMessage('Oi {nome}', guest)).toBe('Oi Maria');
    expect(result).toMatchObject({ message: 'Sent 1/1 messages', results: [{ guest_id: 1, success: true }] });
    expect((client as any).sendText).toHaveBeenCalledWith('casamento2026', '5511999999999', 'Oi Maria');
    expect((db as any).guest.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'sent' }) }));
  });
});