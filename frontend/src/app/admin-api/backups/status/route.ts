import { cookies } from 'next/headers';

import { getAdminApiHeaders } from '@/lib/adminApi';
import { ADMIN_SESSION_COOKIE, verifyAdminSessionValue } from '@/lib/adminAuth';
import { getAdminSession } from '@/lib/adminAuthServer';
import { adminApiFetch } from '@/lib/adminBackend';
import { revalidateSiteAfterRestore } from '@/lib/backupRestoreRevalidation';
import type { BackupRestoreStatus, BackupsOverview } from '@/lib/backups';

const noStore = { 'cache-control': 'no-store' };

function reply(status: BackupRestoreStatus) {
  return Response.json(status, { headers: noStore });
}

/**
 * Polled by the restore dialog while the backend restarts. The restored
 * database may not know the admin who started the restore (or may hold an older
 * password), so only the cookie's signature is required here; whether the
 * account still exists is reported as `relogin` instead of a 401.
 */
export async function GET() {
  const cookieStore = await cookies();

  if (!(await verifyAdminSessionValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value))) {
    return Response.json({ message: 'Unauthorized' }, { status: 401, headers: noStore });
  }

  const response = await adminApiFetch(
    '/api/backups',
    { headers: getAdminApiHeaders() },
    { timeoutMs: 5_000 },
  );

  if (!response.ok) {
    return reply({ state: 'restarting' });
  }

  const overview = (await response.json().catch(() => null)) as BackupsOverview | null;

  // The old process answers until it exits.
  if (!overview || overview.busy === 'restore') {
    return reply({ state: 'restarting' });
  }

  revalidateSiteAfterRestore(overview.lastRestore);

  const session = await getAdminSession();

  return reply({
    lastRestore: overview.lastRestore,
    state: session?.isSuperAdmin ? 'ready' : 'relogin',
  });
}
