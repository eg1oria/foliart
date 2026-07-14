import { afterEach, describe, expect, it } from 'vitest';

import { getAdminApiHeaders } from './adminApi';
import {
  createAdminSessionValue,
  validateAdminCredentials,
} from './adminAuth';

describe('admin environment configuration', () => {
  const originalPassword = process.env.ADMIN_PASSWORD;
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

    restore('ADMIN_PASSWORD', originalPassword);
    restore('ADMIN_SESSION_SECRET', originalSessionSecret);
    restore('ADMIN_API_SECRET', originalApiSecret);
  });

  it('does not fall back to a built-in admin password', () => {
    delete process.env.ADMIN_PASSWORD;

    expect(() => validateAdminCredentials('admin', 'anything')).toThrow(
      'ADMIN_PASSWORD must be set',
    );
  });

  it('requires a session secret distinct from the password setting', async () => {
    process.env.ADMIN_PASSWORD = 'configured-password';
    delete process.env.ADMIN_SESSION_SECRET;

    await expect(createAdminSessionValue()).rejects.toThrow(
      'ADMIN_SESSION_SECRET must be set',
    );
  });

  it('requires a dedicated backend API secret', () => {
    process.env.ADMIN_PASSWORD = 'configured-password';
    delete process.env.ADMIN_API_SECRET;

    expect(() => getAdminApiHeaders()).toThrow(
      'ADMIN_API_SECRET must be set',
    );
  });
});
