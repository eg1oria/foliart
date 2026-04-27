'use server';

import { redirect } from 'next/navigation';

import { getAdminLoginPath, isSupportedAdminLocale } from './adminAuth';
import { clearAdminSessionCookie } from './adminAuthServer';

function normalizeLocale(value: FormDataEntryValue | null) {
  return typeof value === 'string' && isSupportedAdminLocale(value) ? value : 'ru';
}

export async function logoutAdminAction(formData: FormData) {
  const locale = normalizeLocale(formData.get('locale'));

  await clearAdminSessionCookie();
  redirect(getAdminLoginPath(locale));
}
