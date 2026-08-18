import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';

import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminSessionValue,
  getAdminLoginPath,
  readAdminSessionValue,
} from './adminAuth';
import { getAdminApiHeaders } from './adminApi';
import { adminApiFetch } from './adminBackend';
import {
  adminSectionPaths,
  getFirstAllowedSection,
  hasAdminAccessLevel,
  normalizeAdminPermissions,
  type AdminAccessLevel,
  type AdminSection,
  type AdminSessionUser,
} from './adminPermissions';

export type BackendAdminUser = {
  createdAt: string;
  id: number;
  isSuperAdmin: boolean;
  lastLoginAt: string | null;
  permissions: unknown;
  tokenVersion: number;
  username: string;
};

function getAdminCookieOptions() {
  return {
    httpOnly: true,
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  };
}

export function toAdminSessionUser(user: BackendAdminUser): AdminSessionUser {
  return {
    id: user.id,
    isSuperAdmin: user.isSuperAdmin,
    permissions: normalizeAdminPermissions(user.permissions),
    username: user.username,
  };
}

export async function fetchAdminUser(id: number) {
  const response = await adminApiFetch(`/api/admin-users/${id}`, {
    headers: getAdminApiHeaders(),
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json().catch(() => null)) as BackendAdminUser | null;
}

// The cookie only proves that *some* session was issued. The account behind it
// is re-read on every render, so a changed password, changed permissions or a
// deleted account take effect on the very next request instead of when the
// cookie expires.
export const getAdminSession = cache(async (): Promise<AdminSessionUser | null> => {
  const cookieStore = await cookies();
  const payload = await readAdminSessionValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  if (!payload) {
    return null;
  }

  const user = await fetchAdminUser(payload.sub);

  if (!user || user.tokenVersion !== payload.ver) {
    return null;
  }

  return toAdminSessionUser(user);
});

export async function isAdminAuthenticated() {
  return (await getAdminSession()) !== null;
}

export async function requireAdminSession(locale: string, nextPath?: string) {
  const session = await getAdminSession();

  if (!session) {
    redirect(getAdminLoginPath(locale, nextPath));
  }

  return session;
}

export function getAdminNoAccessPath(locale: string) {
  return `/${locale}/admin/no-access`;
}

// Where to send an admin who may not open the requested screen: the first
// section they do have, or the dead-end page when there is none.
function getAdminFallbackPath(locale: string, session: AdminSessionUser) {
  const section = getFirstAllowedSection(session);

  return section ? `/${locale}${adminSectionPaths[section]}` : getAdminNoAccessPath(locale);
}

export async function requireAdminSection(
  locale: string,
  section: AdminSection,
  level: Exclude<AdminAccessLevel, 'none'>,
  nextPath?: string,
) {
  const session = await requireAdminSession(locale, nextPath);

  if (!hasAdminAccessLevel(session, section, level)) {
    redirect(getAdminFallbackPath(locale, session));
  }

  return session;
}

export async function requireSuperAdmin(locale: string, nextPath?: string) {
  const session = await requireAdminSession(locale, nextPath);

  if (!session.isSuperAdmin) {
    redirect(getAdminFallbackPath(locale, session));
  }

  return session;
}

export async function setAdminSessionCookie(user: {
  id: number;
  tokenVersion: number;
  username: string;
}) {
  const cookieStore = await cookies();
  const sessionValue = await createAdminSessionValue(user);

  cookieStore.set(ADMIN_SESSION_COOKIE, sessionValue, getAdminCookieOptions());
}

export async function clearAdminSessionCookie() {
  const cookieStore = await cookies();

  cookieStore.set(ADMIN_SESSION_COOKIE, '', {
    ...getAdminCookieOptions(),
    maxAge: 0,
  });
}
