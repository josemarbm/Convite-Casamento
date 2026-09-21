import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { authenticateRequest } from '../../lib/auth.js';
import { EvolutionClient } from '../../lib/evolution-client.js';

type Options = { db: PrismaClient; jwtSecret: string; client: EvolutionClient };

function instanceName(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  const source = (item.instance && typeof item.instance === 'object' ? item.instance : item) as Record<string, unknown>;
  return { name: source.instanceName ?? source.name ?? item.instanceName, status: source.status ?? source.state ?? item.status ?? 'unknown', owner: source.owner ?? source.ownerJid ?? item.owner };
}

async function protectedRoute(request: FastifyRequest, secret: string) {
  return authenticateRequest(request, secret);
}

export async function registerEvolutionRoutes(app: FastifyInstance, options: Options) {
  app.get('/api/evolution/instances', async (request, reply) => {
    if (!await protectedRoute(request, options.jwtSecret)) return reply.code(401).send({ error: 'Token is missing or invalid' });
    const result = await options.client.listInstances();
    if (!result.success) return reply.code(502).send({ error: result.error });
    const active = (await options.db.setting.findUnique({ where: { key: 'evolution_session_id' } }))?.value;
    const instances = (Array.isArray(result.data) ? result.data : []).map(instanceName).filter((item): item is NonNullable<ReturnType<typeof instanceName>> => Boolean(item?.name)).map((item) => ({ ...item, active: item.name === active }));
    return { instances };
  });

  app.post<{ Body: { name?: string } }>('/api/evolution/instances', async (request, reply) => {
    if (!await protectedRoute(request, options.jwtSecret)) return reply.code(401).send({ error: 'Token is missing or invalid' });
    const name = request.body?.name?.trim() ?? '';
    if (!/^[a-z0-9]+$/.test(name)) return reply.code(400).send({ error: 'Invalid instance name' });
    const result = await options.client.createInstance(name);
    if (!result.success) return reply.code(502).send({ error: result.error });
    return reply.code(201).send({ instance: result.data });
  });

  for (const [method, suffix, action] of [
    ['get', 'connection', (client: EvolutionClient, name: string) => client.getConnection(name)],
    ['get', 'qr', (client: EvolutionClient, name: string) => client.getQrCode(name)],
    ['delete', 'logout', (client: EvolutionClient, name: string) => client.logoutInstance(name)],
    ['delete', '', (client: EvolutionClient, name: string) => client.deleteInstance(name)],
  ] as const) {
    app[method](`/api/evolution/instances/:name${suffix ? `/${suffix}` : ''}`, async (request: any, reply: any) => {
      if (!await protectedRoute(request, options.jwtSecret)) return reply.code(401).send({ error: 'Token is missing or invalid' });
      const result = await action(options.client, request.params.name);
      if (!result.success) return reply.code(502).send({ error: result.error });
      return { data: result.data };
    });
  }

  app.post<{ Params: { name: string } }>('/api/evolution/instances/:name/activate', async (request, reply) => {
    if (!await protectedRoute(request, options.jwtSecret)) return reply.code(401).send({ error: 'Token is missing or invalid' });
    await options.db.setting.upsert({ where: { key: 'evolution_session_id' }, update: { value: request.params.name }, create: { key: 'evolution_session_id', value: request.params.name } });
    return { message: 'Evolution instance activated', name: request.params.name };
  });
}