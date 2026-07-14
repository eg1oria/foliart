import { getAdminApiSecret } from './admin-api.guard';

describe('getAdminApiSecret', () => {
  const originalApiSecret = process.env.ADMIN_API_SECRET;
  const originalAdminPassword = process.env.ADMIN_PASSWORD;

  afterEach(() => {
    if (originalApiSecret === undefined) {
      delete process.env.ADMIN_API_SECRET;
    } else {
      process.env.ADMIN_API_SECRET = originalApiSecret;
    }
    if (originalAdminPassword === undefined) {
      delete process.env.ADMIN_PASSWORD;
    } else {
      process.env.ADMIN_PASSWORD = originalAdminPassword;
    }
  });

  it('requires a dedicated API secret', () => {
    delete process.env.ADMIN_API_SECRET;
    process.env.ADMIN_PASSWORD = 'unrelated-admin-password';

    expect(() => getAdminApiSecret()).toThrow('ADMIN_API_SECRET must be set');
  });

  it('returns the configured API secret', () => {
    process.env.ADMIN_API_SECRET = 'configured-api-secret';

    expect(getAdminApiSecret()).toBe('configured-api-secret');
  });
});
