'use server';

import { redirect } from 'next/navigation';

import { getAdminApiHeaders } from '@/lib/adminApi';
import { isSupportedAdminLocale } from '@/lib/adminAuth';
import { requireAdminSection } from '@/lib/adminAuthServer';
import { adminApiFetch, getAdminApiErrorMessage } from '@/lib/adminBackend';
import { getProduct, noStoreApiFetchOptions } from '@/lib/api';
import { revalidateCatalogPages } from '@/lib/catalogRevalidation';
import { normalizeContentLocale } from '@/lib/contentLocales';
import {
  PRODUCT_DOCUMENT_TITLE_MAX_LENGTH,
  validateProductDocumentFile,
} from '@/lib/productDocuments';

export type ProductDocumentActionState = {
  fieldErrors?: { file?: string; title?: string };
  message?: string;
  status: 'idle' | 'error';
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

function buildEditorPath(
  locale: string,
  productId: string,
  contentLocale: string,
  params: Record<string, string | undefined> = {},
) {
  const searchParams = new URLSearchParams({ contentLocale });

  for (const [key, value] of Object.entries(params)) {
    if (value) searchParams.set(key, value);
  }

  return `/${locale}/admin/products/${productId}?${searchParams.toString()}#documents`;
}

/**
 * The links live on the product page, which is rendered per locale from the
 * cached product API response, so the same revalidation the editor itself runs
 * is what makes an added or removed file appear in the catalog.
 */
async function revalidateProductPages(productId: string) {
  const product = await getProduct(
    Number.parseInt(productId, 10),
    undefined,
    noStoreApiFetchOptions,
  ).catch(() => null);

  if (!product) {
    return;
  }

  await revalidateCatalogPages({
    categoryId: String(product.categoryId),
    productId,
    productName: product.slugSourceName ?? product.name,
  });
}

async function requireProductAccess(formData: FormData) {
  const locale = normalizeLocale(formData.get('locale'));
  const contentLocale = normalizeContentLocale(normalizeText(formData.get('contentLocale')));
  await requireAdminSection(locale, 'products', 'manage');

  return { contentLocale, locale, productId: normalizeText(formData.get('productId')) };
}

export async function uploadProductDocumentAction(
  _previousState: ProductDocumentActionState,
  formData: FormData,
): Promise<ProductDocumentActionState> {
  const { contentLocale, locale, productId } = await requireProductAccess(formData);

  if (!/^\d+$/.test(productId)) {
    return { status: 'error', message: 'Некорректный идентификатор товара.' };
  }

  const file = getFile(formData.get('file'));
  const title = normalizeText(formData.get('title'));
  const fileError = validateProductDocumentFile(file);

  if (!file || fileError) {
    return {
      status: 'error',
      message: file ? 'Проверьте выбранный файл.' : 'Выберите файл документа.',
      fieldErrors: { file: fileError ?? 'Выберите PDF или изображение документа.' },
    };
  }

  if (title.length > PRODUCT_DOCUMENT_TITLE_MAX_LENGTH) {
    return {
      status: 'error',
      message: 'Проверьте название документа.',
      fieldErrors: {
        title: `Название не должно быть длиннее ${PRODUCT_DOCUMENT_TITLE_MAX_LENGTH} символов.`,
      },
    };
  }

  const payload = new FormData();
  payload.append('contentLocale', contentLocale);
  payload.append('title', title);
  payload.append('file', file);

  const response = await adminApiFetch(`/api/products/${productId}/documents`, {
    method: 'POST',
    headers: getAdminApiHeaders(),
    body: payload,
  });

  if (!response.ok) {
    return {
      status: 'error',
      message:
        (await getAdminApiErrorMessage(response, locale)) || 'Не удалось загрузить документ.',
    };
  }

  await revalidateProductPages(productId);
  redirect(buildEditorPath(locale, productId, contentLocale, { status: 'document-added' }));
}

export async function renameProductDocumentAction(formData: FormData) {
  const { contentLocale, locale, productId } = await requireProductAccess(formData);
  const documentId = normalizeText(formData.get('documentId'));
  const title = normalizeText(formData.get('title'));

  if (!/^\d+$/.test(productId) || !/^\d+$/.test(documentId)) {
    redirect(
      buildEditorPath(locale, productId || '0', contentLocale, {
        error: 'Некорректный идентификатор документа.',
      }),
    );
  }

  if (!title) {
    redirect(
      buildEditorPath(locale, productId, contentLocale, {
        error: 'Введите название документа.',
      }),
    );
  }

  const response = await adminApiFetch(`/api/products/${productId}/documents/${documentId}`, {
    method: 'PATCH',
    headers: { ...getAdminApiHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: title.slice(0, PRODUCT_DOCUMENT_TITLE_MAX_LENGTH) }),
  });

  if (!response.ok) {
    redirect(
      buildEditorPath(locale, productId, contentLocale, {
        error:
          (await getAdminApiErrorMessage(response, locale)) ||
          'Не удалось переименовать документ.',
      }),
    );
  }

  await revalidateProductPages(productId);
  redirect(buildEditorPath(locale, productId, contentLocale, { status: 'document-renamed' }));
}

export async function moveProductDocumentAction(formData: FormData) {
  const { contentLocale, locale, productId } = await requireProductAccess(formData);
  const documentId = normalizeText(formData.get('documentId'));
  const direction = normalizeText(formData.get('direction'));

  if (
    !/^\d+$/.test(productId) ||
    !/^\d+$/.test(documentId) ||
    (direction !== 'up' && direction !== 'down')
  ) {
    redirect(
      buildEditorPath(locale, productId || '0', contentLocale, {
        error: 'Не удалось изменить порядок документов.',
      }),
    );
  }

  const response = await adminApiFetch(`/api/products/${productId}/documents/${documentId}`, {
    method: 'PATCH',
    headers: { ...getAdminApiHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ move: direction }),
  });

  if (!response.ok) {
    redirect(
      buildEditorPath(locale, productId, contentLocale, {
        error:
          (await getAdminApiErrorMessage(response, locale)) ||
          'Не удалось изменить порядок документов.',
      }),
    );
  }

  await revalidateProductPages(productId);
  redirect(buildEditorPath(locale, productId, contentLocale, { status: 'document-moved' }));
}

export async function deleteProductDocumentAction(formData: FormData) {
  const { contentLocale, locale, productId } = await requireProductAccess(formData);
  const documentId = normalizeText(formData.get('documentId'));

  if (!/^\d+$/.test(productId) || !/^\d+$/.test(documentId)) {
    redirect(
      buildEditorPath(locale, productId || '0', contentLocale, {
        error: 'Выберите документ для удаления.',
      }),
    );
  }

  const response = await adminApiFetch(`/api/products/${productId}/documents/${documentId}`, {
    method: 'DELETE',
    headers: getAdminApiHeaders(),
  });

  if (!response.ok) {
    redirect(
      buildEditorPath(locale, productId, contentLocale, {
        error:
          (await getAdminApiErrorMessage(response, locale)) || 'Не удалось удалить документ.',
      }),
    );
  }

  await revalidateProductPages(productId);
  redirect(buildEditorPath(locale, productId, contentLocale, { status: 'document-deleted' }));
}
