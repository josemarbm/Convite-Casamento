import { describe, expect, it, vi } from 'vitest';
import { buildApp } from '../server/app.js';
import { createAuthToken } from '../server/lib/auth.js';

const group = { id: 2, name: 'Familia', description: 'Parentes', createdAt: new Date('2026-09-20T00:00:00.000Z'), _count: { guests: 3 } };
const template = { id: 4, name: 'Padrao', content: 'Oi {nome}', isDefault: true, createdAt: new Date('2026-09-20T00:00:00.000Z') };

function mockDb() {
  return {
    group: { findMany: vi.fn().mockResolvedValue([group]), create: vi.fn().mockResolvedValue(group), update: vi.fn().mockResolvedValue(group), delete: vi.fn() },
    messageTemplate: { findMany: vi.fn().mockResolvedValue([template]), findUnique: vi.fn().mockResolvedValue(template), create: vi.fn().mockResolvedValue(template), update: vi.fn().mockResolvedValue(template), delete: vi.fn() },
  } as never;
}

function transactionalTemplateDb(initialTemplates: typeof template[]) {
  const templates = initialTemplates.map((item) => ({ ...item }));
  const transactionClient = {
    messageTemplate: {
      updateMany: vi.fn(async () => {
        const defaults = templates.filter((item) => item.isDefault);
        defaults.forEach((item) => { item.isDefault = false; });
        return { count: defaults.length };
      }),
      create: vi.fn(async ({ data }: { data: { name: string; content: string; isDefault: boolean } }) => {
        const created = { ...data, id: 5, createdAt: new Date('2026-09-21T00:00:00.000Z') };
        templates.push(created);
        return created;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: number }; data: { isDefault?: boolean } }) => {
        const updated = templates.find((item) => item.id === where.id)!;
        Object.assign(updated, data);
        return updated;
      }),
    },
  };
  const db = {
    messageTemplate: transactionClient.messageTemplate,
    $transaction: vi.fn(async (callback: (client: typeof transactionClient) => Promise<unknown>) => callback(transactionClient)),
  };
  return { db, templates, transactionClient };
}

describe('groups and templates routes', () => {
  it('lists groups and templates for an authenticated user', async () => {
    const app = buildApp({ db: mockDb(), jwtSecret: 'test-secret' });
    const token = await createAuthToken({ id: 1, username: 'admin' }, 'test-secret');
    const headers = { authorization: `Bearer ${token}` };
    const groups = await app.inject({ method: 'GET', url: '/api/groups', headers });
    const templates = await app.inject({ method: 'GET', url: '/api/templates', headers });

    expect(groups.statusCode).toBe(200);
    expect(groups.json()[0]).toMatchObject({ name: 'Familia', guest_count: 3 });
    expect(templates.statusCode).toBe(200);
    expect(templates.json()[0]).toMatchObject({ name: 'Padrao', is_default: true });
    await app.close();
  });

  it('protects default templates from deletion', async () => {
    const app = buildApp({ db: mockDb(), jwtSecret: 'test-secret' });
    const token = await createAuthToken({ id: 1, username: 'admin' }, 'test-secret');
    const response = await app.inject({ method: 'DELETE', url: '/api/templates/4', headers: { authorization: `Bearer ${token}` } });

    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it('keeps only the newly created template as default', async () => {
    const previousDefault = { ...template, id: 3 };
    const { db, templates, transactionClient } = transactionalTemplateDb([previousDefault]);
    const app = buildApp({ db: db as never, jwtSecret: 'test-secret' });
    const token = await createAuthToken({ id: 1, username: 'admin' }, 'test-secret');

    const response = await app.inject({
      method: 'POST',
      url: '/api/templates',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Novo padrão', content: 'Mensagem nova', is_default: true },
    });

    expect(response.statusCode).toBe(201);
    expect(templates.filter((item) => item.isDefault).map((item) => item.id)).toEqual([5]);
    expect(transactionClient.messageTemplate.updateMany).toHaveBeenCalledWith({ where: { isDefault: true }, data: { isDefault: false } });
    await app.close();
  });

  it('keeps only the selected template as default when updating', async () => {
    const previousDefault = { ...template, id: 3 };
    const selectedTemplate = { ...template, id: 5, name: 'Template escolhido', isDefault: false };
    const { db, templates, transactionClient } = transactionalTemplateDb([previousDefault, selectedTemplate]);
    const app = buildApp({ db: db as never, jwtSecret: 'test-secret' });
    const token = await createAuthToken({ id: 1, username: 'admin' }, 'test-secret');

    const response = await app.inject({
      method: 'PUT',
      url: '/api/templates/5',
      headers: { authorization: `Bearer ${token}` },
      payload: { is_default: true },
    });

    expect(response.statusCode).toBe(200);
    expect(templates.filter((item) => item.isDefault).map((item) => item.id)).toEqual([5]);
    expect(transactionClient.messageTemplate.updateMany).toHaveBeenCalledWith({ where: { isDefault: true }, data: { isDefault: false } });
    await app.close();
  });
});