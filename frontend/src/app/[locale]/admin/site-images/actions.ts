'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { redirect } from 'next/navigation';

import { getAdminApiHeaders } from '@/lib/adminApi';
import { isSupportedAdminLocale } from '@/lib/adminAuth';
import { requireAdminSection } from '@/lib/adminAuthServer';
import { adminApiFetch, getAdminApiErrorMessage } from '@/lib/adminBackend';
import { siteImagesCacheTag } from '@/lib/api';
import { isSiteImageKey, siteImageSlots, type SiteImageKey } from '@/lib/siteImages';
import { validateSiteImageFile } from '@/lib/siteImageUpload';

const publicLocales = ['ru', 'en', 'fr', 'es'] as const;

export type SiteImageActionState = {
  fieldErrors?: { file?: string };
  key?: SiteImageKey;
  message?: string;
  status: 'idle' | 'error';
};

function normalizeLocale(value: FormDataEntryValue | null) {
  return typeof value === 'string' && isSupportedAdminLocale(value) ? value : 'ru';
}

function normalizeKey(value: FormDataEntryValue | null) {
  return isSiteImageKey(value) ? value : null;
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
  return `/${locale}/admin/site-images${query ? `?${query}` : ''}`;
}

/**
 * A slot can sit on any public page — the footer and the question modal sit on
 * all of them — so the cache tag does the real work and the path list only
 * covers the top-level routes a visitor is most likely to be looking at.
 */
function revalidateSiteImagePages() {
  updateTag(siteImagesCacheTag);

  for (const locale of publicLocales) {
    revalidatePath(`/${locale}`, 'layout');
    revalidatePath(`/${locale}/admin/site-images`);
  }
}

export async function uploadSiteImageAction(
  _previousState: SiteImageActionState,
  formData: FormData,
): Promise<SiteImageActionState> {
  const locale = normalizeLocale(formData.get('locale'));
  await requireAdminSection(locale, 'site-images', 'manage');

  const key = normalizeKey(formData.get('key'));

  if (!key) {
    return { status: 'error', message: 'Неизвестный слот изображения.' };
  }

  const file = getFile(formData.get('file'));

  if (!file) {
    return {
      status: 'error',
      key,
      message: 'Выберите файл.',
      fieldErrors: { file: 'Выберите изображение JPG, PNG или WEBP.' },
    };
  }

  const fileError = validateSiteImageFile(file);

  if (fileError) {
    return {
      status: 'error',
      key,
      message: 'Проверьте выбранный файл.',
      fieldErrors: { file: fileError },
    };
  }

  const payload = new FormData();
  // Sent before the file so multer has it parsed by the time the upload lands.
  payload.append('maxDimension', String(siteImageSlots[key].maxDimension));
  payload.append('file', file);

  const response = await adminApiFetch(`/api/site-images/${key}`, {
    method: 'PUT',
    headers: getAdminApiHeaders(),
    body: payload,
  });

  if (!response.ok) {
    return {
      status: 'error',
      key,
      message:
        (await getAdminApiErrorMessage(response, locale)) || 'Не удалось загрузить изображение.',
    };
  }

  revalidateSiteImagePages();
  redirect(buildEditorPath(locale, { status: 'updated', key }));
}

export async function resetSiteImageAction(formData: FormData) {
  const locale = normalizeLocale(formData.get('locale'));
  await requireAdminSection(locale, 'site-images', 'manage');

  const key = normalizeKey(formData.get('key'));

  if (!key) {
    redirect(buildEditorPath(locale, { error: 'Неизвестный слот изображения.' }));
  }

  const response = await adminApiFetch(`/api/site-images/${key}`, {
    method: 'DELETE',
    headers: getAdminApiHeaders(),
  });

  if (!response.ok) {
    redirect(
      buildEditorPath(locale, {
        error:
          (await getAdminApiErrorMessage(response, locale)) ||
          'Не удалось вернуть исходное изображение.',
      }),
    );
  }

  revalidateSiteImagePages();
  redirect(buildEditorPath(locale, { status: 'reset', key }));
}
