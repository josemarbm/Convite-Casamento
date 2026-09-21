import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { authenticateRequest } from '../../lib/auth.js';

type Options = { db: PrismaClient; jwtSecret: string };

export async function registerSettingsRoutes(app: FastifyInstance, options: Options) {
  app.get('/api/settings', async (request, reply) => {
    if (!await authenticateRequest(request, options.jwtSecret)) return reply.code(401).send({ error: 'Token is missing or invalid' });
    const rows = await options.db.setting.findMany();
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  });

  app.put<{ Body: Record<string, string> }>('/api/settings', async (request, reply) => {
    if (!await authenticateRequest(request, options.jwtSecret)) return reply.code(401).send({ error: 'Token is missing or invalid' });
    const entries = Object.entries(request.body ?? {}).filter(([, value]) => typeof value === 'string');
    await options.db.$transaction(entries.map(([key, value]) => options.db.setting.upsert({ where: { key }, update: { value }, create: { key, value } })));
    return Object.fromEntries(entries);
  });
}