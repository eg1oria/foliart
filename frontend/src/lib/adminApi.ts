export function getAdminApiHeaders() {
  const secret = process.env.ADMIN_API_SECRET;

  if (!secret) {
    throw new Error('ADMIN_API_SECRET must be set');
  }

  return {
    'x-admin-secret': secret,
  };
}
