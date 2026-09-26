import { createHash } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';

type RsvpRoutesOptions = {
  db: PrismaClient;
};

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function rsvpResponse(guest: { name: string; rsvpStatus: string; rsvpRespondedAt: Date | null }) {
  return {
    name: guest.name,
    status: guest.rsvpStatus,
    responded_at: guest.rsvpRespondedAt?.toISOString() ?? null,
  };
}

export async function registerRsvpRoutes(app: FastifyInstance, options: RsvpRoutesOptions) {
  app.get<{ Params: { token: string } }>('/api/rsvp/:token', async (request, reply) => {
    const guest = await options.db.guest.findUnique({ where: { rsvpTokenHash: tokenHash(request.params.token) } });
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

    const guest = await options.db.guest.findUnique({ where: { rsvpTokenHash: tokenHash(request.params.token) } });
    if (!guest) {
      return reply.code(404).send({ error: 'Invitation not found' });
    }
    if (guest.rsvpStatus !== 'pending') {
      return reply.code(409).send({ error: 'RSVP has already been answered', status: guest.rsvpStatus });
    }

    const updated = await options.db.guest.update({
      where: { id: guest.id },
      data: { rsvpStatus: response, rsvpRespondedAt: new Date() },
    });

    return rsvpResponse(updated);
  });
}