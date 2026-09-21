import { getAdminApiHeaders } from '@/lib/adminApi';
import { getAdminSession } from '@/lib/adminAuthServer';
import { adminApiFetch } from '@/lib/adminBackend';
import { isBackupName } from '@/lib/backups';

type Context = { params: Promise<{ name: string }> };

// Long enough to stream a large archive over a slow connection.
const downloadTimeoutMs = 60 * 60_000;

export async function GET(_request: Request, context: Context) {
  const session = await getAdminSession();

  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // An archive is the whole database, admin password hashes included.
  if (!session.isSuperAdmin) {
    return Response.json({ message: 'Forbidden' }, { status: 403 });
  }

  const { name } = await context.params;

  if (!isBackupName(name)) {
    return Response.json({ message: 'Некорректное имя резервной копии.' }, { status: 400 });
  }

  const response = await adminApiFetch(
    `/api/backups/${encodeURIComponent(name)}/download`,
    { headers: getAdminApiHeaders() },
    { timeoutMs: downloadTimeoutMs },
  );

  if (!response.ok || !response.body) {
    return Response.json(
      { message: 'Не удалось скачать резервную копию.' },
      { status: response.status === 404 ? 404 : 502 },
    );
  }

  const headers = new Headers({
    'cache-control': 'no-store',
    'content-disposition': `attachment; filename="${name}"`,
    'content-type': 'application/gzip',
    'x-content-type-options': 'nosniff',
  });
  const length = response.headers.get('content-length');

  if (length) headers.set('content-length', length);

  return new Response(response.body, { headers });
}
