'use server';

import { redirect } from 'next/navigation';

import {
  getAdminLoginPath,
  getSafeAdminNextPath,
  isSupportedAdminLocale,
  validateAdminCredentials,
} from '@/lib/adminAuth';
import { setAdminSessionCookie } from '@/lib/adminAuthServer';

function normalizeLocale(value: FormDataEntryValue | null) {
  return typeof value === 'string' && isSupportedAdminLocale(value) ? value : 'ru';
}

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function loginAdminAction(formData: FormData) {
  const locale = normalizeLocale(formData.get('locale'));
  const nextPath = getSafeAdminNextPath(locale, normalizeText(formData.get('next')));
  const username = normalizeText(formData.get('username'));
  const password = normalizeText(formData.get('password'));

  if (!validateAdminCredentials(username, password)) {
    redirect(`${getAdminLoginPath(locale, nextPath)}&error=1`);
  }

  await setAdminSessionCookie();
  redirect(nextPath);
}
