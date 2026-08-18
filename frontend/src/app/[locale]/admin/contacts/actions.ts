'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { redirect } from 'next/navigation';

import { getAdminApiHeaders } from '@/lib/adminApi';
import { adminApiFetch, getAdminApiErrorMessage } from '@/lib/adminBackend';
import { isSupportedAdminLocale } from '@/lib/adminAuth';
import { requireAdminSection } from '@/lib/adminAuthServer';
import { regionalContactsCacheTag } from '@/lib/api';
import {
  validateRegionalContactForm,
  type RegionalContactFormFieldErrors,
} from '@/lib/regionalContacts';

const publicLocales = ['ru', 'en', 'fr', 'es'] as const;

export type RegionalContactActionState = {
  fieldErrors?: RegionalContactFormFieldErrors;
  message?: string;
  status: 'idle' | 'error';
};

type RegionalContactPayload = {
  address: string;
  fullName: string;
  phone: string;
  region: string;
  sortOrder: string;
};

function normalizeLocale(value: FormDataEntryValue | null) {
  return typeof value === 'string' && isSupportedAdminLocale(value) ? value : 'ru';
}

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function buildListPath(locale: string, params: Record<string, string | undefined> = {}) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) searchParams.set(key, value);
  }

  const query = searchParams.toString();
  return `/${locale}/admin/contacts${query ? `?${query}` : ''}`;
}

function buildEditorPath(locale: string, contactId: string | number, status?: string) {
  const searchParams = new URLSearchParams();
  if (status) searchParams.set('status', status);
  const query = searchParams.toString();
  return `/${locale}/admin/contacts/${contactId}${query ? `?${query}` : ''}`;
}

function getFormPayload(formData: FormData): RegionalContactPayload {
  return {
    region: normalizeText(formData.get('region')),
    fullName: normalizeText(formData.get('fullName')),
    phone: normalizeText(formData.get('phone')),
    address: normalizeText(formData.get('address')),
    sortOrder: normalizeText(formData.get('sortOrder')),
  };
}

async function getActionError(response: Response, locale: string, fallback: string) {
  const message = await getAdminApiErrorMessage(response, locale);
  return message || fallback;
}

/**
 * The contact list sits on one public page per locale, and the API response
 * behind it is shared through the cache tag.
 */
function revalidateContactPages() {
  updateTag(regionalContactsCacheTag);

  for (const locale of publicLocales) {
    revalidatePath(`/${locale}/contacts`);
    revalidatePath(`/${locale}/admin/contacts`);
  }
}

function toRequestBody(values: RegionalContactPayload) {
  return JSON.stringify({
    region: values.region,
    fullName: values.fullName,
    phone: values.phone,
    address: values.address,
    ...(values.sortOrder ? { sortOrder: Number.parseInt(values.sortOrder, 10) } : {}),
  });
}

export async function createRegionalContactAction(
  _previousState: RegionalContactActionState,
  formData: FormData,
): Promise<RegionalContactActionState> {
  const locale = normalizeLocale(formData.get('locale'));
  await requireAdminSection(locale, 'contacts', 'manage');

  const values = getFormPayload(formData);
  const fieldErrors = validateRegionalContactForm(values);

  if (Object.keys(fieldErrors).length) {
    return { status: 'error', message: 'Проверьте заполненные поля.', fieldErrors };
  }

  const response = await adminApiFetch('/api/regional-contacts', {
    method: 'POST',
    headers: { ...getAdminApiHeaders(), 'Content-Type': 'application/json' },
    body: toRequestBody(values),
  });

  if (!response.ok) {
    return {
      status: 'error',
      message: await getActionError(response, locale, 'Не удалось создать контакт.'),
    };
  }

  const created = (await response.json().catch(() => null)) as { id?: number } | null;
  revalidateContactPages();

  if (created?.id) {
    redirect(buildEditorPath(locale, created.id, 'created'));
  }

  redirect(buildListPath(locale, { status: 'created' }));
}

export async function updateRegionalContactAction(
  _previousState: RegionalContactActionState,
  formData: FormData,
): Promise<RegionalContactActionState> {
  const locale = normalizeLocale(formData.get('locale'));
  await requireAdminSection(locale, 'contacts', 'manage');

  const contactId = normalizeText(formData.get('contactId'));
  if (!/^\d+$/.test(contactId)) {
    return { status: 'error', message: 'Некорректный идентификатор контакта.' };
  }

  const values = getFormPayload(formData);
  const fieldErrors = validateRegionalContactForm(values);

  if (Object.keys(fieldErrors).length) {
    return { status: 'error', message: 'Проверьте заполненные поля.', fieldErrors };
  }

  const response = await adminApiFetch(`/api/regional-contacts/${contactId}`, {
    method: 'PATCH',
    headers: { ...getAdminApiHeaders(), 'Content-Type': 'application/json' },
    body: toRequestBody(values),
  });

  if (!response.ok) {
    return {
      status: 'error',
      message: await getActionError(response, locale, 'Не удалось сохранить контакт.'),
    };
  }

  revalidateContactPages();
  revalidatePath(`/${locale}/admin/contacts/${contactId}`);
  redirect(buildEditorPath(locale, contactId, 'updated'));
}

export async function deleteRegionalContactAction(formData: FormData) {
  const locale = normalizeLocale(formData.get('locale'));
  await requireAdminSection(locale, 'contacts', 'manage');

  const contactId = normalizeText(formData.get('contactId'));

  if (!/^\d+$/.test(contactId)) {
    redirect(buildListPath(locale, { error: 'Выберите контакт для удаления.' }));
  }

  const response = await adminApiFetch(`/api/regional-contacts/${contactId}`, {
    method: 'DELETE',
    headers: getAdminApiHeaders(),
  });

  if (!response.ok) {
    redirect(
      buildListPath(locale, {
        error: await getActionError(response, locale, 'Не удалось удалить контакт.'),
      }),
    );
  }

  revalidateContactPages();
  redirect(buildListPath(locale, { status: 'deleted' }));
}
