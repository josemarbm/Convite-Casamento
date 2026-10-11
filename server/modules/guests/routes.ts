import type { FastifyInstance } from 'fastify';
import { Prisma, type PrismaClient } from '@prisma/client';
import { authenticateRequest } from '../../lib/auth.js';
import { requireActiveEvent } from '../../lib/event-context.js';

type GuestsRoutesOptions = {
  db: PrismaClient;
  jwtSecret: string;
};

type GuestInput = {
  name?: string;
  phone?: string;
  group_id?: number | null;
  companion_limit?: number;
  companions?: string[];
};

const guestInclude = { group: true, companions: { orderBy: { id: 'asc' } } } satisfies Prisma.GuestInclude;

function guestResponse(guest: Prisma.GuestGetPayload<{ include: typeof guestInclude }>) {
  return {
    id: guest.id,
    name: guest.name,
    phone: guest.phone,
    group_id: guest.groupId,
    group_name: guest.group?.name ?? null,
    companion_limit: guest.companionLimit,
    companions: guest.companions.map((companion) => companion.name),
    status: guest.status ?? 'pending',
    sent_at: guest.sentAt?.toISOString() ?? null,
    rsvp_status: guest.rsvpStatus,
    rsvp_responded_at: guest.rsvpRespondedAt?.toISOString() ?? null,
    created_at: guest.createdAt.toISOString(),
  };
}

function normalizeCompanions(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;

  const names: string[] = [];
  for (const name of value) {
    if (typeof name !== 'string') return null;
    const normalizedName = name.trim();
    if (!normalizedName) continue;
    if (normalizedName.length > 200) return null;
    names.push(normalizedName);
  }
  return names;
}

function isValidCompanionLimit(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isInteger(value)
    && value >= 0
    && value <= 2_147_483_647;
}

export async function registerGuestsRoutes(app: FastifyInstance, options: GuestsRoutesOptions) {
  app.get<{
    Querystring: { page?: string; per_page?: string; search?: string; status?: string; rsvp_status?: string; group_id?: string };
  }>('/api/guests', async (request, reply) => {
    if (!await authenticateRequest(request, options.jwtSecret)) {
      return reply.code(401).send({ error: 'Token is missing or invalid' });
    }
    const event = await requireActiveEvent(request, reply, options.db);
    if (!event) return;

    const page = Math.max(Number(request.query.page ?? 1), 1);
    const perPage = Math.min(Math.max(Number(request.query.per_page ?? 50), 1), 100);
    const where: Prisma.GuestWhereInput = { eventId: event.id };
    const search = request.query.search?.trim();

    if (search) {
      where.OR = [{ name: { contains: search } }, { phone: { contains: search } }];
    }
    if (request.query.status) where.status = request.query.status;
    if (request.query.rsvp_status) where.rsvpStatus = request.query.rsvp_status;
    if (request.query.group_id) where.groupId = Number(request.query.group_id);

    const [guests, total] = await Promise.all([
      options.db.guest.findMany({
        where,
        include: guestInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      options.db.guest.count({ where }),
    ]);

    return { guests: guests.map(guestResponse), total, page, per_page: perPage, pages: Math.ceil(total / perPage) };
  });

  app.post<{ Body: GuestInput }>('/api/guests', async (request, reply) => {
    if (!await authenticateRequest(request, options.jwtSecret)) {
      return reply.code(401).send({ error: 'Token is missing or invalid' });
    }
    const event = await requireActiveEvent(request, reply, options.db);
    if (!event) return;

    const {
      name,
      phone,
      group_id: groupId = null,
      companion_limit: requestedCompanionLimit,
      companions: requestedCompanions,
    } = request.body ?? {};
    if (!name?.trim() || !phone?.trim()) {
      return reply.code(400).send({ error: 'Name and phone are required' });
    }
    const companionLimit = requestedCompanionLimit === undefined ? 0 : requestedCompanionLimit;
    const companionNames = requestedCompanions === undefined ? [] : normalizeCompanions(requestedCompanions);
    if (!isValidCompanionLimit(companionLimit) || companionNames === null || companionNames.length > companionLimit) {
      return reply.code(400).send({ error: 'Invalid companion limit or names' });
    }
    if (groupId !== null && !await options.db.group.findFirst({ where: { id: groupId, eventId: event.id } })) {
      return reply.code(400).send({ error: 'Group does not belong to the active event' });
    }

    const guest = await options.db.$transaction((tx) => tx.guest.create({
      data: {
        eventId: event.id,
        name: name.trim(),
        phone: phone.trim(),
        groupId,
        companionLimit,
        ...(companionNames.length ? { companions: { create: companionNames.map((companionName) => ({ name: companionName })) } } : {}),
      },
      include: guestInclude,
    }));
    return reply.code(201).send(guestResponse(guest));
  });

  app.put<{ Params: { id: string }; Body: GuestInput }>('/api/guests/:id', async (request, reply) => {
    if (!await authenticateRequest(request, options.jwtSecret)) {
      return reply.code(401).send({ error: 'Token is missing or invalid' });
    }
    const event = await requireActiveEvent(request, reply, options.db);
    if (!event) return;

    const {
      name,
      phone,
      group_id: groupId,
      companion_limit: requestedCompanionLimit,
      companions: requestedCompanions,
    } = request.body ?? {};
    try {
      const result = await options.db.$transaction(async (tx) => {
        const existing = await tx.guest.findFirst({
          where: { id: Number(request.params.id), eventId: event.id },
          include: { companions: { orderBy: { id: 'asc' } } },
        });
        if (!existing) return { kind: 'not-found' as const };

        const companionLimit = requestedCompanionLimit === undefined ? existing.companionLimit : requestedCompanionLimit;
        const companionNames = requestedCompanions === undefined
          ? existing.companions.map((companion) => companion.name)
          : normalizeCompanions(requestedCompanions);
        if (!isValidCompanionLimit(companionLimit) || companionNames === null || companionNames.length > companionLimit) {
          return { kind: 'invalid-companions' as const };
        }
        if (groupId !== undefined && groupId !== null && !await tx.group.findFirst({ where: { id: groupId, eventId: event.id } })) {
          return { kind: 'invalid-group' as const };
        }

        const updatedGuest = await tx.guest.update({
          where: { id: existing.id },
          data: {
            ...(name === undefined ? {} : { name: name.trim() }),
            ...(phone === undefined ? {} : { phone: phone.trim() }),
            ...(groupId === undefined ? {} : { groupId }),
            companionLimit,
            ...(requestedCompanions === undefined ? {} : {
              companions: {
                deleteMany: {},
                ...(companionNames.length ? { create: companionNames.map((companionName) => ({ name: companionName })) } : {}),
              },
            }),
          },
          include: guestInclude,
        });
        return { kind: 'updated' as const, guest: updatedGuest };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

      if (result.kind === 'not-found') return reply.code(404).send({ error: 'Guest not found in the active event' });
      if (result.kind === 'invalid-companions') return reply.code(400).send({ error: 'Invalid companion limit or names' });
      if (result.kind === 'invalid-group') return reply.code(400).send({ error: 'Group does not belong to the active event' });
      return guestResponse(result.guest);
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2034') {
        return reply.code(409).send({ error: 'Guest was updated concurrently; refresh and retry' });
      }
      throw error;
    }
  });

  app.delete<{ Params: { id: string } }>('/api/guests/:id', async (request, reply) => {
    if (!await authenticateRequest(request, options.jwtSecret)) {
      return reply.code(401).send({ error: 'Token is missing or invalid' });
    }

    const event = await requireActiveEvent(request, reply, options.db);
    if (!event) return;
    const existing = await options.db.guest.findFirst({ where: { id: Number(request.params.id), eventId: event.id } });
    if (!existing) return reply.code(404).send({ error: 'Guest not found in the active event' });
    await options.db.guest.delete({ where: { id: existing.id } });
    return reply.code(204).send();
  });
}