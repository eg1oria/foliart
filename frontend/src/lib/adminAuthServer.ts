import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminSessionValue,
  getAdminLoginPath,
  verifyAdminSessionValue,
} from './adminAuth';

function getAdminCookieOptions() {
  return {
    httpOnly: true,
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  };
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  return verifyAdminSessionValue(sessionValue);
}

export async function requireAdminSession(locale: string, nextPath?: string) {
  if (await isAdminAuthenticated()) {
    return;
  }

  redirect(getAdminLoginPath(locale, nextPath));
}

export async function setAdminSessionCookie() {
  const cookieStore = await cookies();
  const sessionValue = await createAdminSessionValue();

  cookieStore.set(ADMIN_SESSION_COOKIE, sessionValue, getAdminCookieOptions());
}

export async function clearAdminSessionCookie() {
  const cookieStore = await cookies();

  cookieStore.set(ADMIN_SESSION_COOKIE, '', {
    ...getAdminCookieOptions(),
    maxAge: 0,
  });
}
