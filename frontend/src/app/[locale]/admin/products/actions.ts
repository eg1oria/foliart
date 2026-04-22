'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3001';

function buildAdminRedirectPath(
  locale: string,
  params: Record<string, string | undefined> = {},
) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const query = searchParams.toString();
  return `/${locale}/admin/products${query ? `?${query}` : ''}`;
}

function normalizeLocale(value: FormDataEntryValue | null) {
  return typeof value === 'string' && value ? value : 'ru';
}

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function createProductAction(formData: FormData) {
  const locale = normalizeLocale(formData.get('locale'));
  const categoryId = normalizeText(formData.get('categoryId'));
  const name = normalizeText(formData.get('name'));
  const description = normalizeText(formData.get('description'));
  const advantages = normalizeText(formData.get('advantages'));
  const image = formData.get('image');

  if (!categoryId || !name || !(image instanceof File) || image.size === 0) {
    redirect(
      buildAdminRedirectPath(locale, {
        error:
          locale === 'en'
            ? 'Fill in category, product name, and image.'
            : 'Заполните категорию, название товара и фото.',
      }),
    );
  }

  const payload = new FormData();
  payload.append('categoryId', categoryId);
  payload.append('name', name);
  payload.append('description', description);
  payload.append('advantages', advantages);
  payload.append('image', image);

  const response = await fetch(`${backendUrl}/api/products`, {
    method: 'POST',
    body: payload,
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as
      | { message?: string | string[] }
      | null;

    const rawMessage = Array.isArray(errorPayload?.message)
      ? errorPayload?.message.join(', ')
      : errorPayload?.message;

    redirect(
      buildAdminRedirectPath(locale, {
        error:
          rawMessage ||
          (locale === 'en'
            ? 'Failed to create product.'
            : 'Не удалось создать товар.'),
      }),
    );
  }

  revalidatePath(`/${locale}/catalog`);
  revalidatePath(`/${locale}/catalog/${categoryId}`);
  revalidatePath(`/${locale}/admin/products`);

  redirect(
    buildAdminRedirectPath(locale, {
      status: locale === 'en' ? 'created' : 'created',
    }),
  );
}
