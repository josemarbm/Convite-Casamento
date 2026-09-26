import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { authenticateRequest } from '../../lib/auth.js';

type Options = { db: PrismaClient; jwtSecret: string };

function groupResponse(group: { id: number; name: string; description: string | null; createdAt: Date; _count?: { guests: number } }) {
  return { id: group.id, name: group.name, description: group.description, guest_count: group._count?.guests ?? 0, created_at: group.createdAt.toISOString() };
}

export async function registerGroupRoutes(app: FastifyInstance, options: Options) {
  app.get('/api/groups', async (request, reply) => {
    if (!await authenticateRequest(request, options.jwtSecret)) return reply.code(401).send({ error: 'Token is missing or invalid' });
    const groups = await options.db.group.findMany({ include: { _count: { select: { guests: true } } }, orderBy: { name: 'asc' } });
    return groups.map(groupResponse);
  });

  app.post<{ Body: { name?: string; description?: string } }>('/api/groups', async (request, reply) => {
    if (!await authenticateRequest(request, options.jwtSecret)) return reply.code(401).send({ error: 'Token is missing or invalid' });
    if (!request.body?.name?.trim()) return reply.code(400).send({ error: 'Name is required' });
    const group = await options.db.group.create({ data: { name: request.body.name.trim(), description: request.body.description?.trim() || null }, include: { _count: { select: { guests: true } } } });
    return reply.code(201).send(groupResponse(group));
  });

  app.put<{ Params: { id: string }; Body: { name?: string; description?: string } }>('/api/groups/:id', async (request, reply) => {
    if (!await authenticateRequest(request, options.jwtSecret)) return reply.code(401).send({ error: 'Token is missing or invalid' });
    const group = await options.db.group.update({ where: { id: Number(request.params.id) }, data: { ...(request.body?.name === undefined ? {} : { name: request.body.name.trim() }), ...(request.body?.description === undefined ? {} : { description: request.body.description.trim() || null }) }, include: { _count: { select: { guests: true } } } });
    return groupResponse(group);
  });

  app.delete<{ Params: { id: string } }>('/api/groups/:id', async (request, reply) => {
    if (!await authenticateRequest(request, options.jwtSecret)) return reply.code(401).send({ error: 'Token is missing or invalid' });
    await options.db.group.delete({ where: { id: Number(request.params.id) } });
    return reply.code(204).send();
  });
}