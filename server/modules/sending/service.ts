import type { Prisma, PrismaClient } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { EvolutionClient } from '../../lib/evolution-client.js';
import { EVENT_TYPE_LABELS, type EventType } from '../events/presets.js';

type Guest = Prisma.GuestGetPayload<{ include: { group: true } }>;
type InvitationEvent = {
  name: string;
  eventType: string;
  customType: string | null;
  hosts: string | null;
  dateTime: Date | null;
  location: string | null;
  address: string | null;
  imagePath: string | null;
};

export function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  return digits.startsWith('55') ? digits : `55${digits}`;
}

export function renderInvitationMessage(content: string, guest: Pick<Guest, 'name'>, eventOrHosts: InvitationEvent | string = '', token = '', rsvpUrl = '') {
  const event = typeof eventOrHosts === 'string' ? null : eventOrHosts;
  const hosts = event?.hosts ?? (typeof eventOrHosts === 'string' ? eventOrHosts : '');
  const eventType = event?.eventType === 'other'
    ? event.customType ?? EVENT_TYPE_LABELS.other
    : event && event.eventType in EVENT_TYPE_LABELS
      ? EVENT_TYPE_LABELS[event.eventType as EventType]
      : event?.eventType ?? '';
  const eventDate = event?.dateTime ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(event.dateTime) : '';
  const eventTime = event?.dateTime ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(event.dateTime) : '';
  const values: Record<string, string> = {
    '{nome}': guest.name,
    '{couple_name}': hosts,
    '{hosts}': hosts,
    '{token}': token,
    '{event_name}': event?.name ?? '',
    '{event_type}': eventType,
    '{event_date}': eventDate,
    '{event_time}': eventTime,
    '{event_date_time}': eventDate && eventTime ? `${eventDate} às ${eventTime}` : eventDate,
    '{event_location}': event?.location ?? '',
    '{event_address}': event?.address ?? '',
    '{rsvp_url}': rsvpUrl,
  };
  return Object.entries(values).reduce((message, [placeholder, value]) => message.replaceAll(placeholder, value), content);
}

function imageMimeType(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  return ({ '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' } as Record<string, string>)[extension] ?? 'application/octet-stream';
}

type DirectSendOptions = {
  db: PrismaClient;
  client: EvolutionClient;
  sessionId: string;
  eventId: number;
  templateId?: number;
  guestIds?: number[];
  groupId?: number | null;
  filters?: { search?: string; status?: string; exclude_status?: string; group_id?: string | number };
};

export async function sendDirect(options: DirectSendOptions) {
  const event = await options.db.event.findUnique({ where: { id: options.eventId } });
  if (!event || event.archivedAt) throw new Error('Active event not found');
  const template = options.templateId
    ? await options.db.messageTemplate.findFirst({ where: { id: options.templateId, eventId: event.id } })
    : await options.db.messageTemplate.findFirst({ where: { eventId: event.id, isDefault: true } });
  if (!template) throw new Error('No template found');
  if (!options.sessionId.trim()) throw new Error('Nenhuma instância ativa do WhatsApp foi configurada.');
  const imagePath = event.imagePath ?? '';

  const where: Prisma.GuestWhereInput = { eventId: event.id };
  if (options.guestIds?.length) where.id = { in: options.guestIds };
  if (options.groupId) where.groupId = options.groupId;
  const filters = options.filters ?? {};
  if (filters.search) where.OR = [{ name: { contains: filters.search } }, { phone: { contains: filters.search } }];
  if (filters.status || filters.exclude_status) {
    where.status = {
      ...(filters.status ? { equals: filters.status } : {}),
      ...(filters.exclude_status ? { not: filters.exclude_status } : {}),
    };
  }
  if (filters.group_id) where.groupId = Number(filters.group_id);

  const guests = await options.db.guest.findMany({ where, include: { group: true } });
  if (!guests.length) throw new Error('No guests found');
  const publicUrl = (process.env.PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '');

  const results = [];
  for (const guest of guests) {
    const token = randomBytes(32).toString('base64url');
    const message = renderInvitationMessage(template.content, guest, event, token, `${publicUrl}/rsvp/${encodeURIComponent(token)}`);
    let result;
    if (imagePath) {
      try {
        const image = (await readFile(imagePath)).toString('base64');
        result = await options.client.sendMedia(options.sessionId, formatPhone(guest.phone), image, imageMimeType(imagePath), path.basename(imagePath), message);
      } catch {
        result = await options.client.sendText(options.sessionId, formatPhone(guest.phone), message);
      }
    } else {
      result = await options.client.sendText(options.sessionId, formatPhone(guest.phone), message);
    }
    const success = result.success;
    await options.db.guest.update({ where: { id: guest.id }, data: { rsvpTokenHash: createHash('sha256').update(token).digest('hex'), status: success ? 'sent' : 'failed', sentAt: success ? new Date() : null } });
    results.push({ guest_id: guest.id, name: guest.name, success, ...(success ? {} : { error: result.error }) });
  }

  const successful = results.filter((result) => result.success).length;
  return { message: `Sent ${successful}/${results.length} messages`, results };
}