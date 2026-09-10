'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { redirect } from 'next/navigation';

import { getAdminApiHeaders } from '@/lib/adminApi';
import { isSupportedAdminLocale } from '@/lib/adminAuth';
import { requireAdminSection } from '@/lib/adminAuthServer';
import { adminApiFetch, getAdminApiErrorMessage } from '@/lib/adminBackend';
import { certificatesCacheTag, CONFORMITY_CERTIFICATE_SLUG } from '@/lib/api';
import { validateCertificateFile } from '@/lib/certificateUpload';

const publicLocales = ['ru', 'en', 'fr', 'es'] as const;

export type CertificateActionState = {
  fieldErrors?: { file?: string };
  message?: string;
  status: 'idle' | 'error';
};

function normalizeLocale(value: FormDataEntryValue | null) {
  return typeof value === 'string' && isSupportedAdminLocale(value) ? value : 'ru';
}

function getFile(value: FormDataEntryValue | null) {
  return value instanceof File && value.size > 0 ? value : null;
}

function buildEditorPath(locale: string, params: Record<string, string | undefined> = {}) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) searchParams.set(key, value);
  }

  const query = searchParams.toString();
  return `/${locale}/admin/certificates${query ? `?${query}` : ''}`;
}

/**
 * Every product page links the certificate, so the cache tag — not a list of
 * paths nobody can enumerate without walking the whole catalog — is what drops
 * those renders.
 */
function revalidateCertificatePages() {
  updateTag(certificatesCacheTag);

  for (const locale of publicLocales) {
    revalidatePath(`/${locale}/catalog`);
    revalidatePath(`/${locale}/admin/certificates`);
  }
}

export async function uploadCertificateAction(
  _previousState: CertificateActionState,
  formData: FormData,
): Promise<CertificateActionState> {
  const locale = normalizeLocale(formData.get('locale'));
  await requireAdminSection(locale, 'certificates', 'manage');

  const file = getFile(formData.get('file'));

  if (!file) {
    return {
      status: 'error',
      message: 'Выберите файл сертификата.',
      fieldErrors: { file: 'Выберите PDF или изображение сертификата.' },
    };
  }

  const fileError = validateCertificateFile(file);

  if (fileError) {
    return { status: 'error', message: 'Проверьте выбранный файл.', fieldErrors: { file: fileError } };
  }

  const payload = new FormData();
  payload.append('file', file);

  const response = await adminApiFetch(`/api/certificates/${CONFORMITY_CERTIFICATE_SLUG}`, {
    method: 'PUT',
    headers: getAdminApiHeaders(),
    body: payload,
  });

  if (!response.ok) {
    return {
      status: 'error',
      message:
        (await getAdminApiErrorMessage(response, locale)) || 'Не удалось загрузить сертификат.',
    };
  }

  revalidateCertificatePages();
  redirect(buildEditorPath(locale, { status: 'updated' }));
}

export async function deleteCertificateAction(formData: FormData) {
  const locale = normalizeLocale(formData.get('locale'));
  await requireAdminSection(locale, 'certificates', 'manage');

  const response = await adminApiFetch(`/api/certificates/${CONFORMITY_CERTIFICATE_SLUG}`, {
    method: 'DELETE',
    headers: getAdminApiHeaders(),
  });

  if (!response.ok) {
    redirect(
      buildEditorPath(locale, {
        error:
          (await getAdminApiErrorMessage(response, locale)) || 'Не удалось удалить сертификат.',
      }),
    );
  }

  revalidateCertificatePages();
  redirect(buildEditorPath(locale, { status: 'deleted' }));
}
