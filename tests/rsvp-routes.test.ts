import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { buildApp } from '../server/app.js';

const token = 'guest-rsvp-token';
const hash = createHash('sha256').update(token).digest('hex');

function mockDb(options: { companionLimit?: number; companions?: string[]; status?: string; failCompanionCreate?: boolean; claimCount?: number; transactionErrorCode?: string; statusAfterTransactionError?: string } = {}) {
  const event = { id: 8, name: 'Festa da Ana', eventType: 'birthday', customType: null, hosts: 'Ana', dateTime: new Date('2027-04-03T19:00:00.000Z'), location: 'Salão Azul', address: 'Rua Central, 10' };
  const guest = {
    id: 7,
    name: 'Joao Silva',
    companionLimit: options.companionLimit ?? 2,
    rsvpStatus: options.status ?? 'pending',
    rsvpRespondedAt: options.status === 'pending' || !options.status ? null : new Date('2026-09-20T10:00:00.000Z'),
    event,
  };
  const companionRows = (options.companions ?? []).map((name, index) => ({ id: index + 1, name }));
  let transactionAttempted = false;
  let statusAfterConflictReturned = false;
  const withRelations = (currentGuest: typeof guest, currentCompanions = companionRows) => ({
    ...currentGuest,
    event,
    companions: currentCompanions.map((companion) => ({ ...companion })),
  });
  const findUnique = vi.fn().mockImplementation(async () => {
    if (transactionAttempted && !statusAfterConflictReturned && options.statusAfterTransactionError) {
      statusAfterConflictReturned = true;
      return withRelations({ ...guest, rsvpStatus: options.statusAfterTransactionError });
    }
    return withRelations(guest);
  });
  const update = vi.fn().mockImplementation(async ({ data }: { data: Partial<typeof guest> }) => {
    Object.assign(guest, data);
    return withRelations(guest);
  });
  const transactionMocks = {
    guestUpdateMany: vi.fn(),
    companionDeleteMany: vi.fn(),
    companionCreateMany: vi.fn(),
  };
  const transaction = vi.fn().mockImplementation(async (callback: (tx: any) => unknown) => {
    if (options.transactionErrorCode) {
      transactionAttempted = true;
      throw Object.assign(new Error('database internals'), { code: options.transactionErrorCode });
    }
    const stagedGuest = { ...guest };
    const stagedCompanions = companionRows.map((companion) => ({ ...companion }));
    transactionMocks.guestUpdateMany = vi.fn().mockImplementation(async ({ data }: { data: Partial<typeof guest> }) => {
      const count = options.claimCount ?? 1;
      if (count === 1) {
        Object.assign(stagedGuest, data);
      }
      return { count };
    });
    transactionMocks.companionDeleteMany = vi.fn().mockImplementation(async () => {
      stagedCompanions.splice(0, stagedCompanions.length);
      return { count: 0 };
    });
    transactionMocks.companionCreateMany = vi.fn().mockImplementation(async ({ data }: { data: Array<{ guestId: number; name: string }> }) => {
      if (options.failCompanionCreate) {
        throw new Error('Companion write failed');
      }
      stagedCompanions.push(...data.map((companion, index) => ({ id: stagedCompanions.length + index + 1, name: companion.name })));
      return { count: data.length };
    });
    const result = await callback({
      guest: {
        updateMany: transactionMocks.guestUpdateMany,
        findUniqueOrThrow: vi.fn().mockImplementation(async () => withRelations(stagedGuest, stagedCompanions)),
        update: vi.fn().mockImplementation(async ({ data }: { data: Partial<typeof guest> }) => {
          Object.assign(stagedGuest, data);
          return withRelations(stagedGuest, stagedCompanions);
        }),
      },
      guestCompanion: {
        deleteMany: transactionMocks.companionDeleteMany,
        createMany: transactionMocks.companionCreateMany,
      },
    });
    Object.assign(guest, stagedGuest);
    companionRows.splice(0, companionRows.length, ...stagedCompanions);
    return result;
  });
  return {
    guest: {
      findUnique,
      update,
    },
    $transaction: transaction,
    state: { guest, companionRows, transactionMocks },
  } as never;
}

describe('public RSVP routes', () => {
  it('returns invitation details without JWT', async () => {
    const db = mockDb();
    const app = buildApp({ db });
    const response = await app.inject({ method: 'GET', url: `/api/rsvp/${token}` });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ name: 'Joao Silva', status: 'pending', companion_limit: 2, companions: [], event: { name: 'Festa da Ana', event_type: 'birthday', hosts: 'Ana', location: 'Salão Azul' } });
    expect((db as any).guest.findUnique).toHaveBeenCalledWith({ where: { rsvpTokenHash: hash }, include: { event: true, companions: true } });
    await app.close();
  });

  it('returns the companion limit and saved companion names', async () => {
    const db = mockDb({ companions: ['Lia', 'Noah'] }) as any;
    const app = buildApp({ db });
    const response = await app.inject({ method: 'GET', url: `/api/rsvp/${token}` });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ companion_limit: 2, companions: ['Lia', 'Noah'] });
    await app.close();
  });

  it('confirms an invitation with trimmed nonblank companion names up to its limit', async () => {
    const db = mockDb() as any;
    const app = buildApp({ db });
    const response = await app.inject({
      method: 'POST',
      url: `/api/rsvp/${token}`,
      payload: { response: 'confirmed', companions: [' Lia ', '  ', 'Noah'] },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: 'confirmed', companion_limit: 2, companions: ['Lia', 'Noah'] });
    expect(db.$transaction).toHaveBeenCalledOnce();
    expect(db.state.transactionMocks.guestUpdateMany).toHaveBeenCalledWith({
      where: { id: 7, rsvpStatus: 'pending' },
      data: expect.objectContaining({ rsvpStatus: 'confirmed' }),
    });
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
    expect(db.guest.update).not.toHaveBeenCalled();
    expect(db.state.guest.rsvpStatus).toBe('confirmed');
    expect(db.state.companionRows.map((companion: { name: string }) => companion.name)).toEqual(['Lia', 'Noah']);
    await app.close();
  });

  it('rejects a concurrent RSVP winner without changing companions', async () => {
    const db = mockDb({ companions: ['Existing'], claimCount: 0 }) as any;
    const app = buildApp({ db });
    const response = await app.inject({
      method: 'POST',
      url: `/api/rsvp/${token}`,
      payload: { response: 'confirmed', companions: ['Replacement'] },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ error: 'RSVP has already been answered' });
    expect(db.state.transactionMocks.guestUpdateMany).toHaveBeenCalledWith({
      where: { id: 7, rsvpStatus: 'pending' },
      data: expect.objectContaining({ rsvpStatus: 'confirmed' }),
    });
    expect(db.state.transactionMocks.companionDeleteMany).not.toHaveBeenCalled();
    expect(db.state.transactionMocks.companionCreateMany).not.toHaveBeenCalled();
    expect(db.state.guest.rsvpStatus).toBe('pending');
    expect(db.state.companionRows.map((companion: { name: string }) => companion.name)).toEqual(['Existing']);
    await app.close();
  });

  it('returns a retryable response when a serialization conflict leaves RSVP pending', async () => {
    const db = mockDb({ transactionErrorCode: 'P2034' }) as any;
    const app = buildApp({ db });
    const response = await app.inject({
      method: 'POST',
      url: `/api/rsvp/${token}`,
      payload: { response: 'confirmed', companions: [] },
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: 'RSVP could not be saved. Please try again.' });
    expect(response.body).not.toContain('database internals');
    await app.close();
  });

  it('returns already answered only when a serialization conflict is followed by a completed RSVP', async () => {
    const db = mockDb({ transactionErrorCode: 'P2034', statusAfterTransactionError: 'confirmed' }) as any;
    const app = buildApp({ db });
    const response = await app.inject({
      method: 'POST',
      url: `/api/rsvp/${token}`,
      payload: { response: 'confirmed', companions: [] },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ error: 'RSVP has already been answered', status: 'confirmed' });
    expect(db.guest.findUnique).toHaveBeenCalledTimes(2);
    await app.close();
  });

  it('rejects over-limit companion names without writing RSVP or companions', async () => {
    const db = mockDb({ companions: ['Existing'] }) as any;
    const app = buildApp({ db });
    const response = await app.inject({
      method: 'POST',
      url: `/api/rsvp/${token}`,
      payload: { response: 'confirmed', companions: ['One', 'Two', 'Three'] },
    });

    expect(response.statusCode).toBe(400);
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(db.guest.update).not.toHaveBeenCalled();
    expect(db.state.guest.rsvpStatus).toBe('pending');
    expect(db.state.companionRows.map((companion: { name: string }) => companion.name)).toEqual(['Existing']);
    await app.close();
  });

  it.each([
    { companions: 'Lia', description: 'a non-array value' },
    { companions: ['L'.repeat(201)], description: 'a name longer than 200 characters' },
    { companions: ['Lia', 2], description: 'a non-string name' },
  ])('rejects $description without writes', async ({ companions }) => {
    const db = mockDb({ companions: ['Existing'] }) as any;
    const app = buildApp({ db });
    const response = await app.inject({
      method: 'POST',
      url: `/api/rsvp/${token}`,
      payload: { response: 'confirmed', companions },
    });

    expect(response.statusCode).toBe(400);
    expect(db.$transaction).not.toHaveBeenCalled();
    expect(db.guest.update).not.toHaveBeenCalled();
    expect(db.state.guest.rsvpStatus).toBe('pending');
    expect(db.state.companionRows.map((companion: { name: string }) => companion.name)).toEqual(['Existing']);
    await app.close();
  });

  it('preserves the prior RSVP and companion list when a replacement transaction fails', async () => {
    const db = mockDb({ companions: ['Existing'], failCompanionCreate: true }) as any;
    const app = buildApp({ db });
    const response = await app.inject({
      method: 'POST',
      url: `/api/rsvp/${token}`,
      payload: { response: 'confirmed', companions: ['Replacement'] },
    });

    expect(response.statusCode).toBe(500);
    expect(db.$transaction).toHaveBeenCalledOnce();
    expect(db.state.guest.rsvpStatus).toBe('pending');
    expect(db.state.companionRows.map((companion: { name: string }) => companion.name)).toEqual(['Existing']);
    await app.close();
  });

  it('declines only the primary invitation and preserves saved companion names', async () => {
    const db = mockDb({ companions: ['Lia'] }) as any;
    const app = buildApp({ db });
    const response = await app.inject({
      method: 'POST',
      url: `/api/rsvp/${token}`,
      payload: { response: 'declined', companions: ['Replacement'] },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: 'declined', companions: ['Lia'] });
    expect(db.state.transactionMocks.guestUpdateMany).toHaveBeenCalledWith({
      where: { id: 7, rsvpStatus: 'pending' },
      data: expect.objectContaining({ rsvpStatus: 'declined' }),
    });
    expect(db.guest.update).not.toHaveBeenCalled();
    expect(db.$transaction).toHaveBeenCalledOnce();
    expect(db.state.companionRows.map((companion: { name: string }) => companion.name)).toEqual(['Lia']);
    await app.close();
  });

  it('preserves existing companion names when a legacy confirmation omits companions', async () => {
    const db = mockDb({ companions: ['Lia'] }) as any;
    const app = buildApp({ db });
    const response = await app.inject({ method: 'POST', url: `/api/rsvp/${token}`, payload: { response: 'confirmed' } });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: 'confirmed', companions: ['Lia'] });
    expect(db.state.transactionMocks.guestUpdateMany).toHaveBeenCalledWith({
      where: { id: 7, rsvpStatus: 'pending' },
      data: expect.objectContaining({ rsvpStatus: 'confirmed' }),
    });
    expect(db.guest.update).not.toHaveBeenCalled();
    expect(db.$transaction).toHaveBeenCalledOnce();
    expect(db.state.companionRows.map((companion: { name: string }) => companion.name)).toEqual(['Lia']);
    await app.close();
  });

  it('rejects a retry after the invitation has been answered', async () => {
    const db = mockDb() as any;
    const app = buildApp({ db });
    const firstResponse = await app.inject({ method: 'POST', url: `/api/rsvp/${token}`, payload: { response: 'confirmed' } });
    const retry = await app.inject({ method: 'POST', url: `/api/rsvp/${token}`, payload: { response: 'declined' } });

    expect(firstResponse.statusCode).toBe(200);
    expect(retry.statusCode).toBe(409);
    expect(db.state.transactionMocks.guestUpdateMany).toHaveBeenCalledOnce();
    await app.close();
  });
});