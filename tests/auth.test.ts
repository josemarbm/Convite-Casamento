import { describe, expect, it } from 'vitest';
import { createAuthToken, extractBearerToken, verifyAuthToken } from '../server/lib/auth.js';
import { hashPassword, verifyPassword } from '../server/lib/passwords.js';

const secret = 'test-secret';

describe('authentication helpers', () => {
  it('hashes and verifies passwords', async () => {
    const hash = await hashPassword('admin123');

    await expect(verifyPassword('admin123', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong', hash)).resolves.toBe(false);
  });

  it('creates and verifies a user token', async () => {
    const token = await createAuthToken({ id: 42, username: 'admin' }, secret);

    await expect(verifyAuthToken(token, secret)).resolves.toEqual({ id: 42, username: 'admin' });
  });

  it('rejects malformed authorization headers', () => {
    expect(extractBearerToken(undefined)).toBeNull();
    expect(extractBearerToken('Basic abc')).toBeNull();
    expect(extractBearerToken('Bearer token')).toBe('token');
  });
});