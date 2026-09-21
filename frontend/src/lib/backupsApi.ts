import 'server-only';

import { getAdminApiHeaders } from './adminApi';
import { adminApiFetch, getAdminApiErrorMessage } from './adminBackend';
import type { BackupSummary, BackupsOverview } from './backups';

export type BackupsResult<T> = { data: T; ok: true } | { message: string; ok: false };

// Archiving the whole site and staging a restore take longer than an ordinary
// admin request.
const slowOperationTimeoutMs = 5 * 60_000;

async function request<T>(
  path: string,
  init: RequestInit,
  fallbackMessage: string,
  timeoutMs?: number,
): Promise<BackupsResult<T>> {
  const response = await adminApiFetch(
    `/api/backups${path}`,
    { ...init, headers: { ...getAdminApiHeaders(), ...init.headers } },
    { timeoutMs },
  );

  if (!response.ok) {
    return {
      ok: false,
      message: (await getAdminApiErrorMessage(response, 'ru')) || fallbackMessage,
    };
  }

  if (response.status === 204) {
    return { ok: true, data: undefined as T };
  }

  return { ok: true, data: (await response.json()) as T };
}

export function listBackups() {
  return request<BackupsOverview>(
    '',
    { method: 'GET' },
    'Не удалось загрузить список резервных копий.',
  );
}

export function createBackup() {
  return request<BackupSummary>(
    '',
    { method: 'POST' },
    'Не удалось создать резервную копию.',
    slowOperationTimeoutMs,
  );
}

export function deleteBackup(name: string) {
  return request<void>(
    `/${encodeURIComponent(name)}`,
    { method: 'DELETE' },
    'Не удалось удалить резервную копию.',
  );
}

export function restoreBackup(name: string) {
  return request<{ requestedAt: string; safetyBackup: string }>(
    `/${encodeURIComponent(name)}/restore`,
    { method: 'POST' },
    'Не удалось запустить восстановление.',
    slowOperationTimeoutMs,
  );
}
