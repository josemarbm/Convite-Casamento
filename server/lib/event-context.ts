import type { FastifyReply, FastifyRequest } from 'fastify';
import type { PrismaClient } from '@prisma/client';

export async function requireActiveEvent(request: FastifyRequest, reply: FastifyReply, db: PrismaClient) {
  const header = request.headers['x-event-id'];
  const eventId = typeof header === 'string' ? Number(header) : NaN;
  if (!Number.isSafeInteger(eventId) || eventId < 1) {
    reply.code(400).send({ error: 'A valid X-Event-Id header is required' });
    return null;
  }

  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event || event.archivedAt) {
    reply.code(404).send({ error: 'Active event not found' });
    return null;
  }
  return event;
}