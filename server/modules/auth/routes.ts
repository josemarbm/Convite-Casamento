import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { createAuthToken, extractBearerToken, verifyAuthToken } from '../../lib/auth.js';
import { hashPassword, verifyPassword } from '../../lib/passwords.js';

type AuthRoutesOptions = {
  db: PrismaClient;
  jwtSecret: string;
};

function userResponse(user: { id: number; username: string; email: string; isActive: boolean; createdAt: Date }) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    is_active: user.isActive,
    created_at: user.createdAt.toISOString(),
  };
}

export async function registerAuthRoutes(app: FastifyInstance, options: AuthRoutesOptions) {
  app.post<{ Body: { username?: string; email?: string; password?: string } }>('/api/auth/register', async (request, reply) => {
    const { username, email, password } = request.body ?? {};
    if (!username || !email || !password) {
      return reply.code(400).send({ error: 'Missing required fields' });
    }

    const existing = await options.db.user.findFirst({ where: { OR: [{ username }, { email }] } });
    if (existing) {
      return reply.code(400).send({ error: existing.username === username ? 'Username already exists' : 'Email already exists' });
    }

    const user = await options.db.user.create({
      data: { username, email, passwordHash: await hashPassword(password) },
    });

    return reply.code(201).send({ message: 'User created successfully', user: userResponse(user) });
  });

  app.post<{ Body: { username?: string; password?: string } }>('/api/auth/login', async (request, reply) => {
    const { username, password } = request.body ?? {};
    if (!username || !password) {
      return reply.code(400).send({ error: 'Username and password required' });
    }

    const user = await options.db.user.findUnique({ where: { username } });
    if (!user || !user.isActive || !(await verifyPassword(password, user.passwordHash))) {
      return reply.code(401).send({ error: 'Invalid username or password' });
    }

    const token = await createAuthToken({ id: user.id, username: user.username }, options.jwtSecret);
    return { message: 'Login successful', token, user: userResponse(user) };
  });

  app.get('/api/auth/me', async (request, reply) => {
    const token = extractBearerToken(request.headers.authorization);
    if (!token) {
      return reply.code(401).send({ error: 'Token is missing' });
    }

    try {
      const identity = await verifyAuthToken(token, options.jwtSecret);
      const user = await options.db.user.findUnique({ where: { id: identity.id } });
      if (!user || !user.isActive) {
        return reply.code(401).send({ error: 'User not found or inactive' });
      }

      return userResponse(user);
    } catch {
      return reply.code(401).send({ error: 'Invalid token' });
    }
  });
}