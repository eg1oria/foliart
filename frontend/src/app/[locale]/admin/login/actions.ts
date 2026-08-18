'use server';

import { redirect } from 'next/navigation';

import { getAdminApiHeaders } from '@/lib/adminApi';
import {
  getAdminLoginPath,
  getSafeAdminNextPath,
  isSupportedAdminLocale,
} from '@/lib/adminAuth';
import { setAdminSessionCookie, type BackendAdminUser } from '@/lib/adminAuthServer';
import { adminApiFetch, getAdminApiErrorMessage } from '@/lib/adminBackend';

function normalizeLocale(value: FormDataEntryValue | null) {
  return typeof value === 'string' && isSupportedAdminLocale(value) ? value : 'ru';
}

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

// Passwords are sent as typed: leading or trailing spaces are part of them.
function readPassword(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value : '';
}

export async function loginAdminAction(formData: FormData) {
  const locale = normalizeLocale(formData.get('locale'));
  const nextPath = getSafeAdminNextPath(locale, normalizeText(formData.get('next')));
  const username = normalizeText(formData.get('username'));
  const password = readPassword(formData.get('password'));
  const loginPath = getAdminLoginPath(locale, nextPath);

  const response = await adminApiFetch('/api/admin-users/authenticate', {
    method: 'POST',
    headers: { ...getAdminApiHeaders(), 'content-type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    // A wrong password, a locked-out login and an unreachable backend are
    // different problems for whoever is standing in front of the form.
    const message = (await getAdminApiErrorMessage(response, locale)) ?? '';
    const isOffline =
      response.headers.get('x-foliart-backend-unavailable') === '1' || response.status >= 500;
    const isLocked = message.includes('Too many failed attempts');

    redirect(`${loginPath}&error=${isOffline ? 'offline' : isLocked ? 'locked' : '1'}`);
  }

  const user = (await response.json().catch(() => null)) as BackendAdminUser | null;

  if (!user) {
    redirect(`${loginPath}&error=offline`);
  }

  await setAdminSessionCookie(user);
  redirect(nextPath);
}
