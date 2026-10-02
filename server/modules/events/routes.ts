import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { authenticateRequest } from '../../lib/auth.js';
import { EVENT_TYPE_LABELS, EVENT_TYPES, getEventTemplatePreset, type EventType } from './presets.js';

type Scheduler = { cancelTimer: (id: number) => void };
type Options = { db: PrismaClient; jwtSecret: string; scheduler?: Scheduler };
type EventBody = {
  name?: string;
  event_type?: string;
  custom_type?: string | null;
  hosts?: string | null;
  date_time?: string | null;
  location?: string | null;
  address?: string | null;
  image_path?: string | null;
};

function eventResponse(event: { id: number; name: string; eventType: string; customType: string | null; hosts: string | null; dateTime: Date | null; location: string | null; address: string | null; imagePath: string | null; archivedAt: Date | null; createdAt: Date }) {
  const eventType = EVENT_TYPES.find((type) => type === event.eventType) ?? 'other';
  return {
    id: event.id,
    name: event.name,
    event_type: event.eventType,
    event_type_label: event.eventType === 'other' ? event.customType ?? EVENT_TYPE_LABELS.other : EVENT_TYPE_LABELS[eventType],
    custom_type: event.customType,
    hosts: event.hosts,
    date_time: event.dateTime?.toISOString() ?? null,
    location: event.location,
    address: event.address,
    image_path: event.imagePath,
    archived_at: event.archivedAt?.toISOString() ?? null,
    created_at: event.createdAt.toISOString(),
  };
}

function eventInput(body: EventBody, requireName: boolean) {
  const name = body.name?.trim();
  const eventType = body.event_type;
  if ((requireName && (!name || !eventType)) || (eventType !== undefined && !EVENT_TYPES.some((type) => type === eventType))) {
    return { error: 'A valid event name and type are required' };
  }
  if (eventType === 'other' && !body.custom_type?.trim()) return { error: 'A custom type label is required for other events' };

  let dateTime: Date | null | undefined;
  if (body.date_time !== undefined) {
    dateTime = body.date_time ? new Date(body.date_time) : null;
    if (dateTime && Number.isNaN(dateTime.getTime())) return { error: 'A valid event date and time are required' };
  }

  return {
    data: {
      ...(name === undefined ? {} : { name }),
      ...(eventType === undefined ? {} : { eventType }),
      ...(body.custom_type === undefined ? {} : { customType: body.custom_type?.trim() || null }),
      ...(body.hosts === undefined ? {} : { hosts: body.hosts?.trim() || null }),
      ...(dateTime === undefined ? {} : { dateTime }),
      ...(body.location === undefined ? {} : { location: body.location?.trim() || null }),
      ...(body.address === undefined ? {} : { address: body.address?.trim() || null }),
      ...(body.image_path === undefined ? {} : { imagePath: body.image_path?.trim() || null }),
    },
  };
}

export async function registerEventRoutes(app: FastifyInstance, options: Options) {
  app.get<{ Querystring: { archived?: string } }>('/api/events', async (request, reply) => {
    if (!await authenticateRequest(request, options.jwtSecret)) return reply.code(401).send({ error: 'Token is missing or invalid' });
    const where = request.query.archived === 'true' ? { archivedAt: { not: null } } : { archivedAt: null };
    const events = await options.db.event.findMany({ where, orderBy: { createdAt: 'asc' } });
    return events.map(eventResponse);
  });

  app.post<{ Body: EventBody }>('/api/events', async (request, reply) => {
    if (!await authenticateRequest(request, options.jwtSecret)) return reply.code(401).send({ error: 'Token is missing or invalid' });
    const input = eventInput(request.body ?? {}, true);
    if ('error' in input) return reply.code(400).send({ error: input.error });
    const eventName = input.data.name;
    if (!eventName) return reply.code(400).send({ error: 'A valid event name and type are required' });
    const eventType = (input.data.eventType ?? 'wedding') as EventType;
    const preset = getEventTemplatePreset(eventType);
    const event = await options.db.$transaction(async (transaction) => {
      const created = await transaction.event.create({ data: { ...input.data, name: eventName } });
      await transaction.messageTemplate.create({ data: { eventId: created.id, ...preset, isDefault: true } });
      return created;
    });
    return reply.code(201).send(eventResponse(event));
  });

  app.put<{ Params: { id: string }; Body: EventBody }>('/api/events/:id', async (request, reply) => {
    if (!await authenticateRequest(request, options.jwtSecret)) return reply.code(401).send({ error: 'Token is missing or invalid' });
    const id = Number(request.params.id);
    if (!Number.isInteger(id) || id < 1) return reply.code(400).send({ error: 'A valid event id is required' });
    const input = eventInput(request.body ?? {}, false);
    if ('error' in input) return reply.code(400).send({ error: input.error });
    const existing = await options.db.event.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: 'Event not found' });
    const event = await options.db.event.update({ where: { id }, data: input.data });
    return eventResponse(event);
  });

  app.post<{ Params: { id: string } }>('/api/events/:id/archive', async (request, reply) => {
    if (!await authenticateRequest(request, options.jwtSecret)) return reply.code(401).send({ error: 'Token is missing or invalid' });
    const id = Number(request.params.id);
    if (!Number.isInteger(id) || id < 1) return reply.code(400).send({ error: 'A valid event id is required' });
    const existing = await options.db.event.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: 'Event not found' });
    const pending = await options.db.scheduledSend.findMany({ where: { eventId: id, status: 'pending' }, select: { id: true } });
    const event = await options.db.$transaction(async (transaction) => {
      const archived = await transaction.event.update({ where: { id }, data: { archivedAt: new Date() } });
      await transaction.scheduledSend.updateMany({ where: { eventId: id, status: 'pending' }, data: { status: 'cancelled' } });
      return archived;
    });
    pending.forEach((scheduled) => options.scheduler?.cancelTimer(scheduled.id));
    return eventResponse(event);
  });

  app.post<{ Params: { id: string } }>('/api/events/:id/restore', async (request, reply) => {
    if (!await authenticateRequest(request, options.jwtSecret)) return reply.code(401).send({ error: 'Token is missing or invalid' });
    const id = Number(request.params.id);
    if (!Number.isInteger(id) || id < 1) return reply.code(400).send({ error: 'A valid event id is required' });
    const existing = await options.db.event.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: 'Event not found' });
    const event = await options.db.event.update({ where: { id }, data: { archivedAt: null } });
    return eventResponse(event);
  });
}