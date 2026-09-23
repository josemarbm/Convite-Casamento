import type { Prisma, PrismaClient } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { EvolutionClient } from '../../lib/evolution-client.js';

type Guest = Prisma.GuestGetPayload<{ include: { group: true } }>;

export function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  return digits.startsWith('55') ? digits : `55${digits}`;
}

export function renderInvitationMessage(content: string, guest: Pick<Guest, 'name'>, coupleName = '', token = '') {
  return content.replaceAll('{nome}', guest.name).replaceAll('{couple_name}', coupleName).replaceAll('{token}', token);
}

type DirectSendOptions = {
  db: PrismaClient;
  client: EvolutionClient;
  sessionId: string;
  templateId?: number;
  guestIds?: number[];
  groupId?: number | null;
  filters?: { search?: string; status?: string; group_id?: string | number };
};

export async function sendDirect(options: DirectSendOptions) {
  const template = options.templateId
    ? await options.db.messageTemplate.findUnique({ where: { id: options.templateId } })
    : await options.db.messageTemplate.findFirst({ where: { isDefault: true } });
  if (!template) throw new Error('No template found');
  if (!options.sessionId.trim()) throw new Error('Nenhuma instância ativa do WhatsApp foi configurada.');
  const coupleName = (await options.db.setting?.findUnique({ where: { key: 'couple_name' } }))?.value ?? '';

  const where: Prisma.GuestWhereInput = options.guestIds?.length
    ? { id: { in: options.guestIds } }
    : options.groupId
      ? { groupId: options.groupId }
      : {};
  const filters = options.filters ?? {};
  if (filters.search) where.OR = [{ name: { contains: filters.search } }, { phone: { contains: filters.search } }];
  if (filters.status) where.status = filters.status;
  if (filters.group_id) where.groupId = Number(filters.group_id);

  const guests = await options.db.guest.findMany({ where, include: { group: true } });
  if (!guests.length) throw new Error('No guests found');

  const results = [];
  for (const guest of guests) {
    const token = randomBytes(32).toString('base64url');
    const result = await options.client.sendText(options.sessionId, formatPhone(guest.phone), renderInvitationMessage(template.content, guest, coupleName, token));
    const success = result.success;
    await options.db.guest.update({ where: { id: guest.id }, data: { rsvpTokenHash: createHash('sha256').update(token).digest('hex'), status: success ? 'sent' : 'failed', sentAt: success ? new Date() : null } });
    results.push({ guest_id: guest.id, name: guest.name, success, ...(success ? {} : { error: result.error }) });
  }

  const successful = results.filter((result) => result.success).length;
  return { message: `Sent ${successful}/${results.length} messages`, results };
}