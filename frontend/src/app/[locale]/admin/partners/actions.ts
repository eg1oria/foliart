'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { redirect } from 'next/navigation';

import { getAdminApiHeaders } from '@/lib/adminApi';
import { adminApiFetch, getAdminApiErrorMessage } from '@/lib/adminBackend';
import { isSupportedAdminLocale } from '@/lib/adminAuth';
import { requireAdminSection } from '@/lib/adminAuthServer';
import { partnersCacheTag } from '@/lib/api';
import { validateImageFile } from '@/lib/imageUpload';
import { validatePartnerForm, type PartnerFormFieldErrors } from '@/lib/partnerAdmin';

const publicLocales = ['ru', 'en', 'fr', 'es'] as const;

export type PartnerActionState = {
  fieldErrors?: PartnerFormFieldErrors;
  message?: string;
  status: 'idle' | 'error';
};

type PartnerFormPayload = {
  address: string;
  email: string;
  name: string;
  phones: string;
  sortOrder: string;
  website: string;
};

function normalizeLocale(value: FormDataEntryValue | null) {
  return typeof value === 'string' && isSupportedAdminLocale(value) ? value : 'ru';
}

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function getFile(value: FormDataEntryValue | null) {
  return value instanceof File && value.size > 0 ? value : null;
}

function buildListPath(locale: string, params: Record<string, string | undefined> = {}) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) searchParams.set(key, value);
  }

  const query = searchParams.toString();
  return `/${locale}/admin/partners${query ? `?${query}` : ''}`;
}

function buildEditorPath(locale: string, partnerId: string | number, status?: string) {
  const searchParams = new URLSearchParams();
  if (status) searchParams.set('status', status);
  const query = searchParams.toString();
  return `/${locale}/admin/partners/${partnerId}${query ? `?${query}` : ''}`;
}

function getPartnerFormPayload(formData: FormData): PartnerFormPayload {
  return {
    name: normalizeText(formData.get('name')),
    address: normalizeText(formData.get('address')),
    // The textarea keeps one phone per line, so only the line breaks survive
    // the trim; the backend drops the blank ones again.
    phones: (typeof formData.get('phones') === 'string'
      ? String(formData.get('phones'))
      : ''
    )
      .split(/\r?\n/)
      .map((phone) => phone.trim())
      .filter(Boolean)
      .join('\n'),
    email: normalizeText(formData.get('email')),
    website: normalizeText(formData.get('website')),
    sortOrder: normalizeText(formData.get('sortOrder')),
  };
}

function appendPartnerPayload(payload: FormData, values: PartnerFormPayload, logo: File | null) {
  payload.append('name', values.name);
  payload.append('address', values.address);
  payload.append('phones', values.phones);
  payload.append('email', values.email);
  payload.append('website', values.website);
  if (values.sortOrder) payload.append('sortOrder', values.sortOrder);
  if (logo) payload.append('logo', logo);
}

async function getActionError(response: Response, locale: string, fallback: string) {
  const message = await getAdminApiErrorMessage(response, locale);
  return message || fallback;
}

/**
 * The partner cards live on one public page in every locale, and the API
 * response behind them is shared through the cache tag.
 */
function revalidatePartnerPages() {
  updateTag(partnersCacheTag);

  for (const locale of publicLocales) {
    revalidatePath(`/${locale}/about/partnery`);
    revalidatePath(`/${locale}/admin/partners`);
  }
}

export async function createPartnerAction(
  _previousState: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const locale = normalizeLocale(formData.get('locale'));
  await requireAdminSection(locale, 'partners', 'manage');

  const values = getPartnerFormPayload(formData);
  const logo = getFile(formData.get('logo'));
  const fieldErrors = validatePartnerForm({ ...values, logoError: validateImageFile(logo) });

  if (Object.keys(fieldErrors).length) {
    return { status: 'error', message: 'Проверьте заполненные поля.', fieldErrors };
  }

  const payload = new FormData();
  appendPartnerPayload(payload, values, logo);

  const response = await adminApiFetch('/api/partners', {
    method: 'POST',
    headers: getAdminApiHeaders(),
    body: payload,
  });

  if (!response.ok) {
    return {
      status: 'error',
      message: await getActionError(response, locale, 'Не удалось создать партнёра.'),
    };
  }

  const createdPartner = (await response.json().catch(() => null)) as { id?: number } | null;
  revalidatePartnerPages();

  if (createdPartner?.id) {
    redirect(buildEditorPath(locale, createdPartner.id, 'created'));
  }

  redirect(buildListPath(locale, { status: 'created' }));
}

export async function updatePartnerAction(
  _previousState: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const locale = normalizeLocale(formData.get('locale'));
  await requireAdminSection(locale, 'partners', 'manage');

  const partnerId = normalizeText(formData.get('partnerId'));
  if (!/^\d+$/.test(partnerId)) {
    return { status: 'error', message: 'Некорректный идентификатор партнёра.' };
  }

  const values = getPartnerFormPayload(formData);
  const logo = getFile(formData.get('logo'));
  const fieldErrors = validatePartnerForm({ ...values, logoError: validateImageFile(logo) });

  if (Object.keys(fieldErrors).length) {
    return { status: 'error', message: 'Проверьте заполненные поля.', fieldErrors };
  }

  const payload = new FormData();
  appendPartnerPayload(payload, values, logo);

  const response = await adminApiFetch(`/api/partners/${partnerId}`, {
    method: 'PATCH',
    headers: getAdminApiHeaders(),
    body: payload,
  });

  if (!response.ok) {
    return {
      status: 'error',
      message: await getActionError(response, locale, 'Не удалось сохранить партнёра.'),
    };
  }

  revalidatePartnerPages();
  revalidatePath(`/${locale}/admin/partners/${partnerId}`);
  redirect(buildEditorPath(locale, partnerId, 'updated'));
}

export async function deletePartnerAction(formData: FormData) {
  const locale = normalizeLocale(formData.get('locale'));
  await requireAdminSection(locale, 'partners', 'manage');

  const partnerId = normalizeText(formData.get('partnerId'));

  if (!/^\d+$/.test(partnerId)) {
    redirect(buildListPath(locale, { error: 'Выберите партнёра для удаления.' }));
  }

  const response = await adminApiFetch(`/api/partners/${partnerId}`, {
    method: 'DELETE',
    headers: getAdminApiHeaders(),
  });

  if (!response.ok) {
    redirect(
      buildListPath(locale, {
        error: await getActionError(response, locale, 'Не удалось удалить партнёра.'),
      }),
    );
  }

  revalidatePartnerPages();
  redirect(buildListPath(locale, { status: 'deleted' }));
}
