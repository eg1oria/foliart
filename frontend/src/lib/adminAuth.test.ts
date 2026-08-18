import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createAdminSessionValue,
  readAdminSessionValue,
  verifyAdminSessionValue,
} from './adminAuth';

const user = { id: 7, tokenVersion: 3, username: 'editor' };

function encodePayload(payload: unknown) {
  return btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

describe('admin session cookie', () => {
  const originalSecret = process.env.ADMIN_SESSION_SECRET;

  beforeEach(() => {
    process.env.ADMIN_SESSION_SECRET = 'test-session-secret';
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.ADMIN_SESSION_SECRET;
    } else {
      process.env.ADMIN_SESSION_SECRET = originalSecret;
    }
  });

  it('round-trips the account behind the session', async () => {
    const value = await createAdminSessionValue(user);

    expect(await readAdminSessionValue(value)).toMatchObject({
      sub: 7,
      usr: 'editor',
      v: 2,
      ver: 3,
    });
  });

  it('rejects a tampered payload', async () => {
    const value = await createAdminSessionValue(user);
    const [payload, signature] = value.split('.');
    const forged = `${encodePayload({ exp: 9999999999, sub: 1, usr: 'root', v: 2, ver: 0 })}.${signature}`;

    expect(payload).not.toBe('');
    expect(await readAdminSessionValue(forged)).toBeNull();
  });

  it('rejects the legacy payload shape', async () => {
    process.env.ADMIN_SESSION_SECRET = 'test-session-secret';
    const legacyPayload = encodePayload({ exp: 9999999999, login: 'admin' });
    const signed = await createAdminSessionValue(user);
    const [, signature] = signed.split('.');

    expect(await verifyAdminSessionValue(`${legacyPayload}.${signature}`)).toBe(false);
  });

  it('rejects an expired cookie', async () => {
    const expired = { ...user };
    const value = await createAdminSessionValue(expired);
    const [, signature] = value.split('.');
    const stalePayload = encodePayload({ exp: 1, sub: 7, usr: 'editor', v: 2, ver: 3 });

    expect(await readAdminSessionValue(`${stalePayload}.${signature}`)).toBeNull();
  });

  it('rejects a missing or malformed cookie', async () => {
    expect(await readAdminSessionValue()).toBeNull();
    expect(await readAdminSessionValue('not-a-token')).toBeNull();
    expect(await readAdminSessionValue('a.b.c')).toBeNull();
  });
});
