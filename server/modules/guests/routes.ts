import type { FastifyInstance } from 'fastify';
import type { Prisma, PrismaClient } from '@prisma/client';
import { authenticateRequest } from '../../lib/auth.js';

type GuestsRoutesOptions = {
  db: PrismaClient;
  jwtSecret: string;
};

type GuestInput = {
  name?: string;
  phone?: string;
  group_id?: number | null;
};

function guestResponse(guest: Prisma.GuestGetPayload<{ include: { group: true } }>) {
  return {
    id: guest.id,
    name: guest.name,
    phone: guest.phone,
    group_id: guest.groupId,
    group_name: guest.group?.name ?? null,
    status: guest.status ?? 'pending',
    sent_at: guest.sentAt?.toISOString() ?? null,
    rsvp_status: guest.rsvpStatus,
    rsvp_responded_at: guest.rsvpRespondedAt?.toISOString() ?? null,
    created_at: guest.createdAt.toISOString(),
  };
}

export async function registerGuestsRoutes(app: FastifyInstance, options: GuestsRoutesOptions) {
  app.get<{
    Querystring: { page?: string; per_page?: string; search?: string; status?: string; rsvp_status?: string; group_id?: string };
  }>('/api/guests', async (request, reply) => {
    if (!await authenticateRequest(request, options.jwtSecret)) {
      return reply.code(401).send({ error: 'Token is missing or invalid' });
    }

    const page = Math.max(Number(request.query.page ?? 1), 1);
    const perPage = Math.min(Math.max(Number(request.query.per_page ?? 50), 1), 100);
    const where: Prisma.GuestWhereInput = {};
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
        include: { group: true },
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

    const { name, phone, group_id: groupId = null } = request.body ?? {};
    if (!name?.trim() || !phone?.trim()) {
      return reply.code(400).send({ error: 'Name and phone are required' });
    }

    const guest = await options.db.guest.create({
      data: { name: name.trim(), phone: phone.trim(), groupId },
      include: { group: true },
    });
    return reply.code(201).send(guestResponse(guest));
  });

  app.put<{ Params: { id: string }; Body: GuestInput }>('/api/guests/:id', async (request, reply) => {
    if (!await authenticateRequest(request, options.jwtSecret)) {
      return reply.code(401).send({ error: 'Token is missing or invalid' });
    }

    const { name, phone, group_id: groupId } = request.body ?? {};
    const guest = await options.db.guest.update({
      where: { id: Number(request.params.id) },
      data: { ...(name === undefined ? {} : { name: name.trim() }), ...(phone === undefined ? {} : { phone: phone.trim() }), ...(groupId === undefined ? {} : { groupId }) },
      include: { group: true },
    });
    return guestResponse(guest);
  });

  app.delete<{ Params: { id: string } }>('/api/guests/:id', async (request, reply) => {
    if (!await authenticateRequest(request, options.jwtSecret)) {
      return reply.code(401).send({ error: 'Token is missing or invalid' });
    }

    await options.db.guest.delete({ where: { id: Number(request.params.id) } });
    return reply.code(204).send();
  });
}