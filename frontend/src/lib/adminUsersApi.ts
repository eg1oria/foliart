import 'server-only';

import { getAdminApiHeaders } from './adminApi';
import { adminApiFetch, getAdminApiErrorMessage } from './adminBackend';
import type { BackendAdminUser } from './adminAuthServer';
import type { AdminPermissions } from './adminPermissions';

export type AdminUsersResult<T> =
  | { data: T; ok: true }
  | { message: string; ok: false };

async function request<T>(
  path: string,
  init: RequestInit,
  fallbackMessage: string,
): Promise<AdminUsersResult<T>> {
  const response = await adminApiFetch(`/api/admin-users${path}`, {
    ...init,
    headers: {
      ...getAdminApiHeaders(),
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    return {
      ok: false,
      message: (await getAdminApiErrorMessage(response, 'ru')) || fallbackMessage,
    };
  }

  return { ok: true, data: (await response.json()) as T };
}

export function listAdminUsers() {
  return request<BackendAdminUser[]>(
    '',
    { method: 'GET' },
    'Не удалось загрузить список администраторов.',
  );
}

export function getAdminUser(id: number) {
  return request<BackendAdminUser>(
    `/${id}`,
    { method: 'GET' },
    'Не удалось загрузить администратора.',
  );
}

export function createAdminUser(input: {
  password: string;
  permissions: AdminPermissions;
  username: string;
}) {
  return request<BackendAdminUser>(
    '',
    { method: 'POST', body: JSON.stringify(input) },
    'Не удалось создать администратора.',
  );
}

export function updateAdminUserPermissions(id: number, permissions: AdminPermissions) {
  return request<BackendAdminUser>(
    `/${id}`,
    { method: 'PATCH', body: JSON.stringify({ permissions }) },
    'Не удалось сохранить права доступа.',
  );
}

export function setAdminUserPassword(id: number, password: string) {
  return request<BackendAdminUser>(
    `/${id}/password`,
    { method: 'PUT', body: JSON.stringify({ password }) },
    'Не удалось сменить пароль.',
  );
}

export function changeAdminUserPassword(
  id: number,
  currentPassword: string,
  newPassword: string,
) {
  return request<BackendAdminUser>(
    `/${id}/password/change`,
    { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) },
    'Не удалось сменить пароль.',
  );
}

export function deleteAdminUser(id: number) {
  return request<{ id: number }>(
    `/${id}`,
    { method: 'DELETE' },
    'Не удалось удалить администратора.',
  );
}
