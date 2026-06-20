'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getAdminApiHeaders } from '@/lib/adminApi';
import { adminApiFetch, getAdminApiErrorMessage } from '@/lib/adminBackend';
import { requireAdminSession } from '@/lib/adminAuthServer';
import { normalizeContentLocale } from '@/lib/contentLocales';

const calendarLocales = ['ru', 'en', 'fr', 'es'] as const;
const imageFieldNames = ['image1', 'image2', 'image3', 'image4'] as const;
const requiredImageFieldNames = ['image1', 'image2'] as const;

type CalendarFormPayload = {
  title: string;
  description: string;
};

function buildAdminRedirectPath(
  locale: string,
  params: Record<string, string | undefined> = {},
  hash?: string,
) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const query = searchParams.toString();
  return `/${locale}/admin/calendars${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`;
}

function normalizeLocale(value: FormDataEntryValue | null) {
  return typeof value === 'string' && value ? value : 'ru';
}

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function getCalendarFormPayload(formData: FormData): CalendarFormPayload {
  return {
    title: normalizeText(formData.get('title')),
    description: normalizeText(formData.get('description')),
  };
}

function appendCalendarPayload(
  payload: FormData,
  values: CalendarFormPayload,
  contentLocale: string,
) {
  payload.append('contentLocale', contentLocale);
  payload.append('title', values.title);
  payload.append('description', values.description);
}

function hasFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}

async function revalidateCalendarAdminPages() {
  for (const locale of calendarLocales) {
    revalidatePath(`/${locale}/admin/calendars`);
  }
}

export async function createCalendarAction(formData: FormData) {
  const locale = normalizeLocale(formData.get('locale'));
  const contentLocale = normalizeContentLocale(normalizeText(formData.get('contentLocale')));
  await requireAdminSession(locale);

  if (contentLocale !== 'ru') {
    redirect(
      buildAdminRedirectPath(
        locale,
        {
          contentLocale,
          error:
            locale === 'en'
              ? 'Create the Russian version first, then add translations.'
              : 'Сначала создайте русскую версию, затем добавьте переводы.',
        },
        'create-calendar',
      ),
    );
  }

  const values = getCalendarFormPayload(formData);
  const requiredImages = requiredImageFieldNames.map((fieldName) => formData.get(fieldName));

  if (!values.title || !values.description || requiredImages.some((image) => !hasFile(image))) {
    redirect(
      buildAdminRedirectPath(
        locale,
        {
          contentLocale,
          error:
            locale === 'en'
              ? 'Fill in the title, description, and upload the first 2 photos.'
              : 'Заполните название, описание и загрузите первые 2 фото.',
        },
        'create-calendar',
      ),
    );
  }

  const payload = new FormData();
  appendCalendarPayload(payload, values, contentLocale);

  for (const fieldName of imageFieldNames) {
    const image = formData.get(fieldName);

    if (hasFile(image)) {
      payload.append(fieldName, image);
    }
  }

  const response = await adminApiFetch('/api/calendars', {
    method: 'POST',
    headers: getAdminApiHeaders(),
    body: payload,
  });

  if (!response.ok) {
    const rawMessage = await getAdminApiErrorMessage(response, locale);

    redirect(
      buildAdminRedirectPath(
        locale,
        {
          contentLocale,
          error:
            rawMessage ||
            (locale === 'en'
              ? 'Failed to create calendar item.'
              : 'Не удалось создать запись календаря.'),
        },
        'create-calendar',
      ),
    );
  }

  await revalidateCalendarAdminPages();

  redirect(
    buildAdminRedirectPath(
      locale,
      {
        contentLocale,
        status: 'created',
      },
      'create-calendar',
    ),
  );
}

export async function updateCalendarAction(formData: FormData) {
  const locale = normalizeLocale(formData.get('locale'));
  const contentLocale = normalizeContentLocale(normalizeText(formData.get('contentLocale')));
  await requireAdminSession(locale);

  const calendarId = normalizeText(formData.get('calendarId'));
  const values = getCalendarFormPayload(formData);

  if (!calendarId || !values.title || !values.description) {
    redirect(
      buildAdminRedirectPath(
        locale,
        {
          contentLocale,
          edit: calendarId,
          error:
            locale === 'en'
              ? 'Fill in the title and description.'
              : 'Заполните название и описание.',
        },
        calendarId ? `calendar-${calendarId}` : 'manage-calendars',
      ),
    );
  }

  const payload = new FormData();
  appendCalendarPayload(payload, values, contentLocale);

  for (const fieldName of imageFieldNames) {
    const image = formData.get(fieldName);

    if (hasFile(image)) {
      payload.append(fieldName, image);
    }
  }

  const response = await adminApiFetch(`/api/calendars/${calendarId}`, {
    method: 'PATCH',
    headers: getAdminApiHeaders(),
    body: payload,
  });

  if (!response.ok) {
    const rawMessage = await getAdminApiErrorMessage(response, locale);

    redirect(
      buildAdminRedirectPath(
        locale,
        {
          contentLocale,
          edit: calendarId,
          error:
            rawMessage ||
            (locale === 'en'
              ? 'Failed to update calendar item.'
              : 'Не удалось обновить запись календаря.'),
        },
        calendarId ? `calendar-${calendarId}` : 'manage-calendars',
      ),
    );
  }

  await revalidateCalendarAdminPages();

  redirect(
    buildAdminRedirectPath(
      locale,
      {
        contentLocale,
        status: 'updated',
        calendar: calendarId,
        edit: calendarId,
      },
      `calendar-${calendarId}`,
    ),
  );
}
