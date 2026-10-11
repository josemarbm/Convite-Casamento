import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { authenticateRequest } from '../../lib/auth.js';
import { requireActiveEvent } from '../../lib/event-context.js';

type Options = { db: PrismaClient; jwtSecret: string };

function groupResponse(group: { id: number; name: string; description: string | null; createdAt: Date; _count?: { guests: number } }) {
  return { id: group.id, name: group.name, description: group.description, guest_count: group._count?.guests ?? 0, created_at: group.createdAt.toISOString() };
}

export async function registerGroupRoutes(app: FastifyInstance, options: Options) {
  app.get('/api/groups', async (request, reply) => {
    if (!await authenticateRequest(request, options.jwtSecret)) return reply.code(401).send({ error: 'Token is missing or invalid' });
    const event = await requireActiveEvent(request, reply, options.db);
    if (!event) return;
    const groups = await options.db.group.findMany({ where: { eventId: event.id }, include: { _count: { select: { guests: true } } }, orderBy: { name: 'asc' } });
    return groups.map(groupResponse);
  });

  app.post<{ Body: { name?: string; description?: string } }>('/api/groups', async (request, reply) => {
    if (!await authenticateRequest(request, options.jwtSecret)) return reply.code(401).send({ error: 'Token is missing or invalid' });
    const event = await requireActiveEvent(request, reply, options.db);
    if (!event) return;
    if (!request.body?.name?.trim()) return reply.code(400).send({ error: 'Name is required' });
    const group = await options.db.group.create({ data: { eventId: event.id, name: request.body.name.trim(), description: request.body.description?.trim() || null }, include: { _count: { select: { guests: true } } } });
    return reply.code(201).send(groupResponse(group));
  });

  app.put<{ Params: { id: string }; Body: { name?: string; description?: string } }>('/api/groups/:id', async (request, reply) => {
    if (!await authenticateRequest(request, options.jwtSecret)) return reply.code(401).send({ error: 'Token is missing or invalid' });
    const event = await requireActiveEvent(request, reply, options.db);
    if (!event) return;
    const id = Number(request.params.id);
    const existing = await options.db.group.findFirst({ where: { id, eventId: event.id } });
    if (!existing) return reply.code(404).send({ error: 'Group not found in the active event' });
    const group = await options.db.group.update({ where: { id }, data: { ...(request.body?.name === undefined ? {} : { name: request.body.name.trim() }), ...(request.body?.description === undefined ? {} : { description: request.body.description.trim() || null }) }, include: { _count: { select: { guests: true } } } });
    return groupResponse(group);
  });

  app.delete<{ Params: { id: string } }>('/api/groups/:id', async (request, reply) => {
    if (!await authenticateRequest(request, options.jwtSecret)) return reply.code(401).send({ error: 'Token is missing or invalid' });
    const event = await requireActiveEvent(request, reply, options.db);
    if (!event) return;
    const existing = await options.db.group.findFirst({ where: { id: Number(request.params.id), eventId: event.id } });
    if (!existing) return reply.code(404).send({ error: 'Group not found in the active event' });
    await options.db.group.delete({ where: { id: existing.id } });
    return reply.code(204).send();
  });
}