'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { redirect } from 'next/navigation';

import { getAdminApiHeaders } from '@/lib/adminApi';
import { adminApiFetch, getAdminApiErrorMessage } from '@/lib/adminBackend';
import { isSupportedAdminLocale } from '@/lib/adminAuth';
import { requireAdminSection } from '@/lib/adminAuthServer';
import { sitePagesCacheTag } from '@/lib/api';
import { contentLocales, normalizeContentLocale } from '@/lib/contentLocales';
import { validateImageFile } from '@/lib/imageUpload';
import {
  maxSitePageDescriptionLength,
  maxSitePageHtmlBytes,
  maxSitePageTitleLength,
  normalizeSitePageBandColor,
  normalizeSitePageDisplayMode,
  validateSitePageSlug,
} from '@/lib/sitePages';

export type SitePageFieldErrors = Partial<Record<'slug' | 'title' | 'description' | 'html', string>>;

export type SitePageActionState = {
  fieldErrors?: SitePageFieldErrors;
  message?: string;
  status: 'idle' | 'error' | 'success';
  /** Bumped on every successful save so the form can tell two saves apart. */
  savedAt?: number;
};

function normalizeLocale(value: FormDataEntryValue | null) {
  return typeof value === 'string' && isSupportedAdminLocale(value) ? value : 'ru';
}

function readText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function readPageId(formData: FormData) {
  const value = readText(formData, 'pageId');
  return /^\d+$/.test(value) ? value : null;
}

function buildListPath(locale: string, params: Record<string, string | undefined> = {}) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) searchParams.set(key, value);
  }

  const query = searchParams.toString();
  return `/${locale}/admin/site-pages${query ? `?${query}` : ''}`;
}

function buildEditorPath(
  locale: string,
  pageId: string | number,
  params: Record<string, string | undefined> = {},
) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) searchParams.set(key, value);
  }

  const query = searchParams.toString();
  return `/${locale}/admin/site-pages/${pageId}${query ? `?${query}` : ''}`;
}

async function getActionError(response: Response, locale: string, fallback: string) {
  if (response.status === 409) {
    return 'Страница с таким адресом уже есть. Выберите другой адрес.';
  }

  return (await getAdminApiErrorMessage(response, locale)) || fallback;
}

/**
 * The page answers on every language under the same address, and its frame
 * route reads the same tagged API response.
 */
function revalidateSitePage(locale: string, slugs: Array<string | undefined>) {
  updateTag(sitePagesCacheTag);

  for (const slug of new Set(slugs.filter(Boolean))) {
    for (const contentLocale of contentLocales) {
      revalidatePath(`/${contentLocale}/${slug}`);
    }
  }

  revalidatePath(`/${locale}/admin/site-pages`);
}

function settingsPayload(formData: FormData) {
  const slug = readText(formData, 'slug').toLowerCase();
  const displayMode = normalizeSitePageDisplayMode(readText(formData, 'displayMode'));
  const payload = new FormData();
  payload.append('slug', slug);
  payload.append('displayMode', displayMode);
  payload.append('showTitle', readText(formData, 'showTitle') === 'false' ? 'false' : 'true');
  payload.append('bandColor', normalizeSitePageBandColor(readText(formData, 'bandColor')));

  return { slug, payload };
}

export async function createSitePageAction(
  _previousState: SitePageActionState,
  formData: FormData,
): Promise<SitePageActionState> {
  const locale = normalizeLocale(formData.get('locale'));
  await requireAdminSection(locale, 'site-pages', 'manage');

  const { slug, payload } = settingsPayload(formData);
  const slugError = validateSitePageSlug(slug);

  if (slugError) {
    return { status: 'error', message: 'Проверьте адрес страницы.', fieldErrors: { slug: slugError } };
  }

  const response = await adminApiFetch('/api/site-pages', {
    method: 'POST',
    headers: getAdminApiHeaders(),
    body: payload,
  });

  if (!response.ok) {
    return {
      status: 'error',
      message: await getActionError(response, locale, 'Не удалось создать страницу.'),
    };
  }

  const created = (await response.json().catch(() => null)) as { id?: number } | null;
  revalidateSitePage(locale, [slug]);

  if (created?.id) {
    redirect(buildEditorPath(locale, created.id, { status: 'created', contentLocale: 'ru' }));
  }

  redirect(buildListPath(locale, { status: 'created' }));
}

export async function updateSitePageSettingsAction(
  _previousState: SitePageActionState,
  formData: FormData,
): Promise<SitePageActionState> {
  const locale = normalizeLocale(formData.get('locale'));
  await requireAdminSection(locale, 'site-pages', 'manage');

  const pageId = readPageId(formData);
  if (!pageId) {
    return { status: 'error', message: 'Некорректный идентификатор страницы.' };
  }

  const { slug, payload } = settingsPayload(formData);
  const slugError = validateSitePageSlug(slug);

  if (slugError) {
    return { status: 'error', message: 'Проверьте адрес страницы.', fieldErrors: { slug: slugError } };
  }

  const response = await adminApiFetch(`/api/site-pages/${pageId}`, {
    method: 'PATCH',
    headers: getAdminApiHeaders(),
    body: payload,
  });

  if (!response.ok) {
    return {
      status: 'error',
      message: await getActionError(response, locale, 'Не удалось сохранить настройки.'),
    };
  }

  const updated = (await response.json().catch(() => null)) as { previousSlug?: string } | null;
  revalidateSitePage(locale, [slug, updated?.previousSlug]);
  revalidatePath(`/${locale}/admin/site-pages/${pageId}`);

  return { status: 'success', message: 'Настройки страницы сохранены.', savedAt: Date.now() };
}

export async function saveSitePageTranslationAction(
  _previousState: SitePageActionState,
  formData: FormData,
): Promise<SitePageActionState> {
  const locale = normalizeLocale(formData.get('locale'));
  await requireAdminSection(locale, 'site-pages', 'manage');

  const pageId = readPageId(formData);
  if (!pageId) {
    return { status: 'error', message: 'Некорректный идентификатор страницы.' };
  }

  const contentLocale = normalizeContentLocale(readText(formData, 'contentLocale'));
  const title = readText(formData, 'title');
  const description = readText(formData, 'description').replace(/\s+/g, ' ');
  const rawHtml = formData.get('html');
  const html = typeof rawHtml === 'string' ? rawHtml : '';
  const published = formData.get('published') === 'on';
  const fieldErrors: SitePageFieldErrors = {};

  if (title.length > maxSitePageTitleLength) {
    fieldErrors.title = `Заголовок — не длиннее ${maxSitePageTitleLength} символов.`;
  } else if (published && !title) {
    fieldErrors.title = 'Чтобы опубликовать страницу, укажите заголовок.';
  }

  if (description.length > maxSitePageDescriptionLength) {
    fieldErrors.description = `Описание — не длиннее ${maxSitePageDescriptionLength} символов.`;
  }

  if (Buffer.byteLength(html, 'utf8') > maxSitePageHtmlBytes) {
    fieldErrors.html =
      'HTML больше 2 МБ. Вынесите картинки из кода (base64) в загруженные изображения.';
  } else if (published && !html.trim()) {
    fieldErrors.html = 'Чтобы опубликовать страницу, вставьте HTML.';
  }

  if (Object.keys(fieldErrors).length) {
    return { status: 'error', message: 'Проверьте заполненные поля.', fieldErrors };
  }

  const payload = new FormData();
  payload.append('title', title);
  payload.append('description', description);
  payload.append('html', html);
  payload.append('published', published ? 'true' : 'false');

  const response = await adminApiFetch(`/api/site-pages/${pageId}/translations/${contentLocale}`, {
    method: 'PUT',
    headers: getAdminApiHeaders(),
    body: payload,
  });

  if (!response.ok) {
    return {
      status: 'error',
      message: await getActionError(response, locale, 'Не удалось сохранить страницу.'),
    };
  }

  const saved = (await response.json().catch(() => null)) as { slug?: string } | null;
  revalidateSitePage(locale, [saved?.slug]);
  revalidatePath(`/${locale}/admin/site-pages/${pageId}`);

  return {
    status: 'success',
    message: published
      ? `Сохранено. Версия ${contentLocale.toUpperCase()} опубликована на сайте.`
      : `Сохранено как черновик. Версия ${contentLocale.toUpperCase()} на сайте не показывается.`,
    savedAt: Date.now(),
  };
}

export async function deleteSitePageAction(formData: FormData) {
  const locale = normalizeLocale(formData.get('locale'));
  await requireAdminSection(locale, 'site-pages', 'manage');

  const pageId = readPageId(formData);
  if (!pageId) {
    redirect(buildListPath(locale, { error: 'Выберите страницу для удаления.' }));
  }

  const response = await adminApiFetch(`/api/site-pages/${pageId}`, {
    method: 'DELETE',
    headers: getAdminApiHeaders(),
  });

  if (!response.ok) {
    redirect(
      buildListPath(locale, {
        error: await getActionError(response, locale, 'Не удалось удалить страницу.'),
      }),
    );
  }

  const deleted = (await response.json().catch(() => null)) as { slug?: string } | null;
  revalidateSitePage(locale, [deleted?.slug]);
  redirect(buildListPath(locale, { status: 'deleted' }));
}

export async function uploadSitePageImageAction(
  _previousState: SitePageActionState,
  formData: FormData,
): Promise<SitePageActionState> {
  const locale = normalizeLocale(formData.get('locale'));
  await requireAdminSection(locale, 'site-pages', 'manage');

  const pageId = readPageId(formData);
  if (!pageId) {
    return { status: 'error', message: 'Некорректный идентификатор страницы.' };
  }

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { status: 'error', message: 'Выберите изображение.' };
  }

  const fileError = validateImageFile(file);
  if (fileError) {
    return { status: 'error', message: fileError };
  }

  const payload = new FormData();
  payload.append('file', file);

  const response = await adminApiFetch(`/api/site-pages/${pageId}/images`, {
    method: 'POST',
    headers: getAdminApiHeaders(),
    body: payload,
  });

  if (!response.ok) {
    return {
      status: 'error',
      message: await getActionError(response, locale, 'Не удалось загрузить изображение.'),
    };
  }

  revalidatePath(`/${locale}/admin/site-pages/${pageId}`);

  return { status: 'success', message: 'Изображение загружено.', savedAt: Date.now() };
}

// Neither image action redirects: the editor next to the panel may hold unsaved
// HTML, and a navigation would throw it away. Revalidating the editor path is
// enough for the panel to receive the new list.
export async function deleteSitePageImageAction(
  _previousState: SitePageActionState,
  formData: FormData,
): Promise<SitePageActionState> {
  const locale = normalizeLocale(formData.get('locale'));
  await requireAdminSection(locale, 'site-pages', 'manage');

  const pageId = readPageId(formData);
  const imageId = readText(formData, 'imageId');

  if (!pageId || !/^\d+$/.test(imageId)) {
    return { status: 'error', message: 'Некорректное изображение.' };
  }

  const response = await adminApiFetch(`/api/site-pages/${pageId}/images/${imageId}`, {
    method: 'DELETE',
    headers: getAdminApiHeaders(),
  });

  if (!response.ok) {
    return {
      status: 'error',
      message: await getActionError(response, locale, 'Не удалось удалить изображение.'),
    };
  }

  revalidatePath(`/${locale}/admin/site-pages/${pageId}`);

  return { status: 'success', message: 'Изображение удалено.', savedAt: Date.now() };
}
