import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { authenticateRequest } from '../../lib/auth.js';
import { EvolutionClient } from '../../lib/evolution-client.js';
import { sendDirect } from './service.js';

type Options = { db: PrismaClient; jwtSecret: string; client: EvolutionClient; scheduler?: { scheduleSend: (id: number, time: Date) => void; cancelTimer: (id: number) => void } };

export async function registerSendingRoutes(app: FastifyInstance, options: Options) {
  async function sessionId() {
    return (await options.db.setting.findUnique({ where: { key: 'evolution_session_id' } }))?.value ?? process.env.EVOLUTION_SESSION_ID ?? '';
  }

  app.post<{ Body: { template_id?: number; guest_ids?: number[]; group_id?: number; filters?: { search?: string; status?: string; group_id?: string | number } } }>('/api/send/direct', async (request, reply) => {
    if (!await authenticateRequest(request, options.jwtSecret)) return reply.code(401).send({ error: 'Token is missing or invalid' });
    try {
      return await sendDirect({ db: options.db, client: options.client, sessionId: await sessionId(), templateId: request.body?.template_id, guestIds: request.body?.guest_ids, groupId: request.body?.group_id, filters: request.body?.filters });
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : 'Send failed' });
    }
  });

  app.post<{ Body: { template_id: number; group_id?: number | null; guest_ids?: number[]; scheduled_time: string } }>('/api/send/schedule', async (request, reply) => {
    if (!await authenticateRequest(request, options.jwtSecret)) return reply.code(401).send({ error: 'Token is missing or invalid' });
    const scheduledTime = new Date(request.body?.scheduled_time ?? '');
    if (!request.body?.template_id || Number.isNaN(scheduledTime.getTime()) || scheduledTime <= new Date()) return reply.code(400).send({ error: 'A future scheduled time and template are required' });
    const scheduled = await options.db.scheduledSend.create({ data: { templateId: request.body.template_id, groupId: request.body.group_id ?? null, guestIds: JSON.stringify(request.body.guest_ids ?? []), scheduledTime } });
    options.scheduler?.scheduleSend(scheduled.id, scheduled.scheduledTime);
    return reply.code(201).send({ id: scheduled.id, scheduled_time: scheduled.scheduledTime.toISOString(), status: scheduled.status });
  });

  app.get('/api/send/scheduled', async (request, reply) => {
    if (!await authenticateRequest(request, options.jwtSecret)) return reply.code(401).send({ error: 'Token is missing or invalid' });
    const sends = await options.db.scheduledSend.findMany({ orderBy: { scheduledTime: 'asc' }, include: { template: true, group: true } });
    return sends.map((send) => ({ id: send.id, template_id: send.templateId, template_name: send.template.name, group_id: send.groupId, group_name: send.group?.name ?? null, scheduled_time: send.scheduledTime.toISOString(), status: send.status }));
  });

  app.delete<{ Params: { id: string } }>('/api/send/scheduled/:id', async (request, reply) => {
    if (!await authenticateRequest(request, options.jwtSecret)) return reply.code(401).send({ error: 'Token is missing or invalid' });
    const scheduled = await options.db.scheduledSend.update({ where: { id: Number(request.params.id) }, data: { status: 'cancelled' } });
    options.scheduler?.cancelTimer(scheduled.id);
    return { id: scheduled.id, status: scheduled.status };
  });
}