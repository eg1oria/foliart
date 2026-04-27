const DEFAULT_ADMIN_API_SECRET = 'foliart-admin-api-secret-2026';

export function getAdminApiHeaders() {
  return {
    'x-admin-secret':
      process.env.ADMIN_API_SECRET ??
      process.env.ADMIN_PASSWORD ??
      DEFAULT_ADMIN_API_SECRET,
  };
}
