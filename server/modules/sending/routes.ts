import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { authenticateRequest } from '../../lib/auth.js';
import { EvolutionClient } from '../../lib/evolution-client.js';
import { requireActiveEvent } from '../../lib/event-context.js';
import { sendDirect } from './service.js';

type Options = { db: PrismaClient; jwtSecret: string; client: EvolutionClient; scheduler?: { scheduleSend: (id: number, time: Date) => void; cancelTimer: (id: number) => void } };

export async function registerSendingRoutes(app: FastifyInstance, options: Options) {
  async function sessionId() {
    return (await options.db.setting.findUnique({ where: { key: 'evolution_session_id' } }))?.value ?? process.env.EVOLUTION_SESSION_ID ?? '';
  }

  app.post<{ Body: { template_id?: number; guest_ids?: number[]; group_id?: number; filters?: { search?: string; status?: string; group_id?: string | number } } }>('/api/send/direct', async (request, reply) => {
    if (!await authenticateRequest(request, options.jwtSecret)) return reply.code(401).send({ error: 'Token is missing or invalid' });
    const event = await requireActiveEvent(request, reply, options.db);
    if (!event) return;
    try {
      return await sendDirect({ db: options.db, client: options.client, sessionId: await sessionId(), eventId: event.id, templateId: request.body?.template_id, guestIds: request.body?.guest_ids, groupId: request.body?.group_id, filters: request.body?.filters });
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : 'Send failed' });
    }
  });

  app.post<{ Body: { template_id: number; group_id?: number | null; guest_ids?: number[]; scheduled_time: string } }>('/api/send/schedule', async (request, reply) => {
    if (!await authenticateRequest(request, options.jwtSecret)) return reply.code(401).send({ error: 'Token is missing or invalid' });
    const event = await requireActiveEvent(request, reply, options.db);
    if (!event) return;
    const scheduledTime = new Date(request.body?.scheduled_time ?? '');
    if (!request.body?.template_id || Number.isNaN(scheduledTime.getTime()) || scheduledTime <= new Date()) return reply.code(400).send({ error: 'A future scheduled time and template are required' });
    const template = await options.db.messageTemplate.findFirst({ where: { id: request.body.template_id, eventId: event.id } });
    if (!template) return reply.code(400).send({ error: 'Template does not belong to the active event' });
    if (request.body.group_id && !await options.db.group.findFirst({ where: { id: request.body.group_id, eventId: event.id } })) return reply.code(400).send({ error: 'Group does not belong to the active event' });
    const guestIds = [...new Set(request.body.guest_ids ?? [])];
    if (guestIds.length && await options.db.guest.count({ where: { eventId: event.id, id: { in: guestIds } } }) !== guestIds.length) return reply.code(400).send({ error: 'Guests must belong to the active event' });
    const scheduled = await options.db.scheduledSend.create({ data: { eventId: event.id, templateId: request.body.template_id, groupId: request.body.group_id ?? null, guestIds: JSON.stringify(guestIds), scheduledTime } });
    options.scheduler?.scheduleSend(scheduled.id, scheduled.scheduledTime);
    return reply.code(201).send({ id: scheduled.id, scheduled_time: scheduled.scheduledTime.toISOString(), status: scheduled.status });
  });

  app.get('/api/send/scheduled', async (request, reply) => {
    if (!await authenticateRequest(request, options.jwtSecret)) return reply.code(401).send({ error: 'Token is missing or invalid' });
    const event = await requireActiveEvent(request, reply, options.db);
    if (!event) return;
    const sends = await options.db.scheduledSend.findMany({ where: { eventId: event.id }, orderBy: { scheduledTime: 'asc' }, include: { template: true, group: true } });
    return sends.map((send) => ({ id: send.id, template_id: send.templateId, template_name: send.template.name, group_id: send.groupId, group_name: send.group?.name ?? null, scheduled_time: send.scheduledTime.toISOString(), status: send.status }));
  });

  app.delete<{ Params: { id: string } }>('/api/send/scheduled/:id', async (request, reply) => {
    if (!await authenticateRequest(request, options.jwtSecret)) return reply.code(401).send({ error: 'Token is missing or invalid' });
    const event = await requireActiveEvent(request, reply, options.db);
    if (!event) return;
    const existing = await options.db.scheduledSend.findFirst({ where: { id: Number(request.params.id), eventId: event.id } });
    if (!existing) return reply.code(404).send({ error: 'Scheduled send not found in the active event' });
    const scheduled = await options.db.scheduledSend.update({ where: { id: existing.id }, data: { status: 'cancelled' } });
    options.scheduler?.cancelTimer(scheduled.id);
    return { id: scheduled.id, status: scheduled.status };
  });
}