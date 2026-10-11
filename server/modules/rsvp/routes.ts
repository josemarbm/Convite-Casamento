import { createHash } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { EVENT_TYPE_LABELS, EVENT_TYPES, type EventType } from '../events/presets.js';

type RsvpRoutesOptions = {
  db: PrismaClient;
};

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function rsvpResponse(guest: { name: string; rsvpStatus: string; rsvpRespondedAt: Date | null; event: { name: string; eventType: string; customType: string | null; hosts: string | null; dateTime: Date | null; location: string | null; address: string | null } | null }) {
  const event = guest.event;
  const eventType = event ? EVENT_TYPES.find((type) => type === event.eventType) ?? 'other' : null;
  return {
    name: guest.name,
    status: guest.rsvpStatus,
    responded_at: guest.rsvpRespondedAt?.toISOString() ?? null,
    event: event && eventType ? {
      name: event.name,
      event_type: event.eventType,
      event_type_label: event.eventType === 'other' ? event.customType ?? EVENT_TYPE_LABELS.other : EVENT_TYPE_LABELS[eventType as EventType],
      hosts: event.hosts,
      date_time: event.dateTime?.toISOString() ?? null,
      location: event.location,
      address: event.address,
    } : null,
  };
}

export async function registerRsvpRoutes(app: FastifyInstance, options: RsvpRoutesOptions) {
  app.get<{ Params: { token: string } }>('/api/rsvp/:token', async (request, reply) => {
    const guest = await options.db.guest.findUnique({ where: { rsvpTokenHash: tokenHash(request.params.token) }, include: { event: true } });
    if (!guest) {
      return reply.code(404).send({ error: 'Invitation not found' });
    }

    return rsvpResponse(guest);
  });

  app.post<{ Params: { token: string }; Body: { response?: string } }>('/api/rsvp/:token', async (request, reply) => {
    const response = request.body?.response;
    if (response !== 'confirmed' && response !== 'declined') {
      return reply.code(400).send({ error: 'Response must be confirmed or declined' });
    }

    const guest = await options.db.guest.findUnique({ where: { rsvpTokenHash: tokenHash(request.params.token) }, include: { event: true } });
    if (!guest) {
      return reply.code(404).send({ error: 'Invitation not found' });
    }
    if (guest.rsvpStatus !== 'pending') {
      return reply.code(409).send({ error: 'RSVP has already been answered', status: guest.rsvpStatus });
    }

    const updated = await options.db.guest.update({
      where: { id: guest.id },
      data: { rsvpStatus: response, rsvpRespondedAt: new Date() },
      include: { event: true },
    });

    return rsvpResponse(updated);
  });
}