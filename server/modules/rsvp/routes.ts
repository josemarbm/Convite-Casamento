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

function rsvpResponse(guest: { name: string; companionLimit: number; companions: { name: string }[]; rsvpStatus: string; rsvpRespondedAt: Date | null; event: { name: string; eventType: string; customType: string | null; hosts: string | null; dateTime: Date | null; location: string | null; address: string | null } | null }) {
  const event = guest.event;
  const eventType = event ? EVENT_TYPES.find((type) => type === event.eventType) ?? 'other' : null;
  return {
    name: guest.name,
    status: guest.rsvpStatus,
    responded_at: guest.rsvpRespondedAt?.toISOString() ?? null,
    companion_limit: guest.companionLimit,
    companions: guest.companions.map((companion) => companion.name),
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
    const guest = await options.db.guest.findUnique({ where: { rsvpTokenHash: tokenHash(request.params.token) }, include: { event: true, companions: true } });
    if (!guest) {
      return reply.code(404).send({ error: 'Invitation not found' });
    }

    return rsvpResponse(guest);
  });

  app.post<{ Params: { token: string }; Body: { response?: string; companions?: unknown } }>('/api/rsvp/:token', async (request, reply) => {
    const response = request.body?.response;
    if (response !== 'confirmed' && response !== 'declined') {
      return reply.code(400).send({ error: 'Response must be confirmed or declined' });
    }

    const guest = await options.db.guest.findUnique({ where: { rsvpTokenHash: tokenHash(request.params.token) }, include: { event: true, companions: true } });
    if (!guest) {
      return reply.code(404).send({ error: 'Invitation not found' });
    }
    if (guest.rsvpStatus !== 'pending') {
      return reply.code(409).send({ error: 'RSVP has already been answered', status: guest.rsvpStatus });
    }

    const hasCompanions = request.body?.companions !== undefined;
    let companions: string[] = [];
    if (hasCompanions) {
      if (!Array.isArray(request.body.companions) || request.body.companions.some((name) => typeof name !== 'string')) {
        return reply.code(400).send({ error: 'Companions must be an array of names' });
      }

      companions = request.body.companions.map((name) => name.trim()).filter(Boolean);
      if (companions.some((name) => name.length > 200)) {
        return reply.code(400).send({ error: 'Companion names must be at most 200 characters' });
      }
      if (companions.length > guest.companionLimit) {
        return reply.code(400).send({ error: 'Companion limit exceeded' });
      }
    }

    const data = { rsvpStatus: response, rsvpRespondedAt: new Date() };
    const include = { event: true, companions: true };
    let updated;
    try {
      updated = await options.db.$transaction(async (tx) => {
        const claim = await tx.guest.updateMany({
          where: { id: guest.id, rsvpStatus: 'pending' },
          data,
        });
        if (claim.count !== 1) {
          return null;
        }

        if (response === 'confirmed' && hasCompanions) {
          await tx.guestCompanion.deleteMany({ where: { guestId: guest.id } });
          if (companions.length > 0) {
            await tx.guestCompanion.createMany({ data: companions.map((name) => ({ guestId: guest.id, name })) });
          }
        }

        return tx.guest.findUniqueOrThrow({ where: { id: guest.id }, include });
      }, { isolationLevel: 'Serializable' });
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2034') {
        const current = await options.db.guest.findUnique({
          where: { rsvpTokenHash: tokenHash(request.params.token) },
          select: { rsvpStatus: true },
        });
        if (!current) return reply.code(404).send({ error: 'Invitation not found' });
        if (current.rsvpStatus !== 'pending') {
          return reply.code(409).send({ error: 'RSVP has already been answered', status: current.rsvpStatus });
        }
        return reply.code(503).send({ error: 'RSVP could not be saved. Please try again.' });
      }
      throw error;
    }

    if (!updated) {
      return reply.code(409).send({ error: 'RSVP has already been answered' });
    }

    return rsvpResponse(updated);
  });
}