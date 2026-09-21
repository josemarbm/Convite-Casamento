import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { authenticateRequest } from '../../lib/auth.js';

type Options = { db: PrismaClient; jwtSecret: string };

function templateResponse(template: { id: number; name: string; content: string; isDefault: boolean | null; createdAt: Date }) {
  return { id: template.id, name: template.name, content: template.content, is_default: template.isDefault ?? false, created_at: template.createdAt.toISOString() };
}

export async function registerTemplateRoutes(app: FastifyInstance, options: Options) {
  app.get('/api/templates', async (request, reply) => {
    if (!await authenticateRequest(request, options.jwtSecret)) return reply.code(401).send({ error: 'Token is missing or invalid' });
    const templates = await options.db.messageTemplate.findMany({ orderBy: { createdAt: 'desc' } });
    return templates.map(templateResponse);
  });

  app.post<{ Body: { name?: string; content?: string; is_default?: boolean } }>('/api/templates', async (request, reply) => {
    if (!await authenticateRequest(request, options.jwtSecret)) return reply.code(401).send({ error: 'Token is missing or invalid' });
    const { name, content, is_default: isDefault = false } = request.body ?? {};
    if (!name?.trim() || !content?.trim()) return reply.code(400).send({ error: 'Name and content are required' });
    const template = await options.db.messageTemplate.create({ data: { name: name.trim(), content, isDefault } });
    return reply.code(201).send(templateResponse(template));
  });

  app.put<{ Params: { id: string }; Body: { name?: string; content?: string; is_default?: boolean } }>('/api/templates/:id', async (request, reply) => {
    if (!await authenticateRequest(request, options.jwtSecret)) return reply.code(401).send({ error: 'Token is missing or invalid' });
    const body = request.body ?? {};
    const template = await options.db.messageTemplate.update({ where: { id: Number(request.params.id) }, data: { ...(body.name === undefined ? {} : { name: body.name.trim() }), ...(body.content === undefined ? {} : { content: body.content }), ...(body.is_default === undefined ? {} : { isDefault: body.is_default }) } });
    return templateResponse(template);
  });

  app.delete<{ Params: { id: string } }>('/api/templates/:id', async (request, reply) => {
    if (!await authenticateRequest(request, options.jwtSecret)) return reply.code(401).send({ error: 'Token is missing or invalid' });
    const template = await options.db.messageTemplate.findUnique({ where: { id: Number(request.params.id) } });
    if (template?.isDefault) return reply.code(400).send({ error: 'Cannot delete the default template' });
    await options.db.messageTemplate.delete({ where: { id: Number(request.params.id) } });
    return reply.code(204).send();
  });
}