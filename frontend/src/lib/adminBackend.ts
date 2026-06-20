import 'server-only';

const backendUrl = (process.env.BACKEND_URL ?? 'http://localhost:3001').replace(/\/$/, '');
const adminRequestTimeoutMs = 30_000;

export async function adminApiFetch(path: string, init: RequestInit) {
  try {
    return await fetch(`${backendUrl}${path}`, {
      ...init,
      cache: 'no-store',
      signal: AbortSignal.timeout(adminRequestTimeoutMs),
    });
  } catch {
    return Response.json(
      { message: 'Backend API is unavailable' },
      {
        status: 503,
        headers: { 'x-foliart-backend-unavailable': '1' },
      },
    );
  }
}

export async function getAdminApiErrorMessage(response: Response, locale: string) {
  if (response.headers.get('x-foliart-backend-unavailable') === '1') {
    return locale === 'en'
      ? 'The server is unavailable. Please try again.'
      : 'Сервер недоступен. Повторите попытку.';
  }

  const errorPayload = (await response.json().catch(() => null)) as {
    message?: string | string[];
  } | null;

  return Array.isArray(errorPayload?.message)
    ? errorPayload.message.join(', ')
    : errorPayload?.message;
}
