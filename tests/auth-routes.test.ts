import { describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import { buildApp } from '../server/app.js';

const user = {
  id: 1,
  username: 'admin',
  email: 'admin@casamento.com',
  passwordHash: bcrypt.hashSync('admin123', 4),
  isActive: true,
  createdAt: new Date('2026-09-20T00:00:00.000Z'),
};

function mockDb() {
  return {
    user: {
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(user),
      create: vi.fn().mockResolvedValue(user),
    },
  } as never;
}

describe('authentication routes', () => {
  it('rejects protected identity requests without a token', async () => {
    const app = buildApp({ db: mockDb(), jwtSecret: 'test-secret' });
    const response = await app.inject({ method: 'GET', url: '/api/auth/me' });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'Token is missing' });
    await app.close();
  });

  it('logs in an active user and returns a JWT', async () => {
    const app = buildApp({ db: mockDb(), jwtSecret: 'test-secret' });
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'admin', password: 'admin123' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ message: 'Login successful', user: { username: 'admin' } });
    expect(response.json().token).toEqual(expect.any(String));
    await app.close();
  });
});