import { afterEach, describe, expect, it } from 'vitest';

import { getAdminApiHeaders } from './adminApi';
import { createAdminSessionValue } from './adminAuth';

describe('admin environment configuration', () => {
  const originalSessionSecret = process.env.ADMIN_SESSION_SECRET;
  const originalApiSecret = process.env.ADMIN_API_SECRET;

  afterEach(() => {
    const restore = (name: string, value: string | undefined) => {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    };

    restore('ADMIN_SESSION_SECRET', originalSessionSecret);
    restore('ADMIN_API_SECRET', originalApiSecret);
  });

  it('requires a session secret', async () => {
    delete process.env.ADMIN_SESSION_SECRET;

    await expect(
      createAdminSessionValue({ id: 1, tokenVersion: 0, username: 'admin' }),
    ).rejects.toThrow('ADMIN_SESSION_SECRET must be set');
  });

  it('requires a dedicated backend API secret', () => {
    delete process.env.ADMIN_API_SECRET;

    expect(() => getAdminApiHeaders()).toThrow('ADMIN_API_SECRET must be set');
  });

  // The admin password no longer lives in the environment: it is hashed in the
  // database and ADMIN_PASSWORD is only read once, to create the super admin.
  it('does not read an admin password from the environment', async () => {
    const adminAuth = await import('./adminAuth');

    expect(Object.keys(adminAuth)).not.toContain('validateAdminCredentials');
  });
});
