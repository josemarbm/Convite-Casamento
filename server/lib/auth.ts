import { SignJWT, jwtVerify } from 'jose';
import type { FastifyRequest } from 'fastify';

export type AuthUser = {
  id: number;
  username: string;
};

export function createAuthToken(user: AuthUser, secret: string) {
  return new SignJWT({ username: user.username })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(new TextEncoder().encode(secret));
}

export async function verifyAuthToken(token: string, secret: string): Promise<AuthUser> {
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
    algorithms: ['HS256'],
  });

  const id = Number(payload.sub);
  if (!Number.isInteger(id) || typeof payload.username !== 'string') {
    throw new Error('Invalid token payload');
  }

  return { id, username: payload.username };
}

export function extractBearerToken(header: string | undefined) {
  if (!header?.startsWith('Bearer ')) {
    return null;
  }

  const token = header.slice('Bearer '.length).trim();
  return token || null;
}

export async function authenticateRequest(request: FastifyRequest, secret: string) {
  const token = extractBearerToken(request.headers.authorization);
  if (!token) {
    return null;
  }

  try {
    return await verifyAuthToken(token, secret);
  } catch {
    return null;
  }
}