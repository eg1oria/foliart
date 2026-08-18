'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { redirect } from 'next/navigation';

import { getAdminApiHeaders } from '@/lib/adminApi';
import { adminApiFetch, getAdminApiErrorMessage } from '@/lib/adminBackend';
import { isSupportedAdminLocale } from '@/lib/adminAuth';
import { requireAdminSection } from '@/lib/adminAuthServer';
import {
  categoriesCacheTag,
  getCategories,
  getProduct,
  getProducts,
  noStoreApiFetchOptions,
  productsCacheTag,
} from '@/lib/api';
import { normalizeContentLocale } from '@/lib/contentLocales';
import { validateImageFile } from '@/lib/imageUpload';
import { sanitizeRichDescription } from '@/lib/renderRichDescription';
import { getCategoryHref, getProductHref } from '@/lib/catalog';
import {
  hasProductFormErrors,
  resolveProductUpdateScope,
  type ProductFormFieldErrors,
  validateProductForm,
} from '@/lib/productAdmin';

const catalogLocales = ['ru', 'en', 'fr', 'es'] as const;

type ProductFormPayload = {
  application: string;
  advantages: string;
  categoryId: string;
  composition: string;
  description: string;
  name: string;
};

export type ProductActionState = {
  fieldErrors?: ProductFormFieldErrors;
  message?: string;
  status: 'idle' | 'error';
};

export type CategoryActionState = {
  fieldErrors?: {
    image?: string;
    name?: string;
  };
  message?: string;
  status: 'idle' | 'error';
};

function buildAdminListPath(
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

function buildProductEditorPath(
  locale: string,
  productId: string | number,
  contentLocale: string,
  status?: string,
) {
  const searchParams = new URLSearchParams({ contentLocale });
  if (status) searchParams.set('status', status);
  return `/${locale}/admin/products/${productId}?${searchParams.toString()}`;
}

function buildCategoryEditorPath(
  locale: string,
  categoryId: string | number,
  contentLocale: string,
  status?: string,
) {
  const searchParams = new URLSearchParams({ contentLocale });
  if (status) searchParams.set('status', status);
  return `/${locale}/admin/products/categories/${categoryId}?${searchParams.toString()}`;
}

function normalizeLocale(value: FormDataEntryValue | null) {
  return typeof value === 'string' && isSupportedAdminLocale(value) ? value : 'ru';
}

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function getFile(value: FormDataEntryValue | null) {
  return value instanceof File && value.size > 0 ? value : null;
}

function getProductFormPayload(formData: FormData): ProductFormPayload {
  return {
    categoryId: normalizeText(formData.get('categoryId')),
    name: normalizeText(formData.get('name')),
    description: sanitizeRichDescription(normalizeText(formData.get('description'))),
    advantages: normalizeText(formData.get('advantages')),
    composition: normalizeText(formData.get('composition')),
    application: normalizeText(formData.get('application')),
  };
}

function appendProductPayload(
  payload: FormData,
  values: ProductFormPayload,
  contentLocale: string,
) {
  payload.append('contentLocale', contentLocale);
  payload.append('categoryId', values.categoryId);
  payload.append('name', values.name);
  payload.append('description', values.description);
  payload.append('advantages', values.advantages);
  payload.append('composition', values.composition);
  payload.append('application', values.application);
}

async function getActionError(response: Response, locale: string, fallback: string) {
  const message = await getAdminApiErrorMessage(response, locale);
  return message || fallback;
}

/**
 * Paths only cover the routes we can name here, and every catalog page is
 * rendered per locale, so the tags are what actually drop the cached API
 * responses shared by `/catalog`, the sitemap and the search index. Both tags
 * go together: moving a product changes category product counts, and renaming
 * a category changes the product pages that quote it.
 */
function updateCatalogTags() {
  updateTag(categoriesCacheTag);
  updateTag(productsCacheTag);
}

async function revalidateCatalogPages(args: {
  categoryId: string;
  previousCategoryId?: string;
  previousName?: string;
  productId?: string | number;
  productName: string;
}) {
  const { categoryId, productName, previousCategoryId, previousName, productId } = args;
  const categories = await getCategories(undefined, noStoreApiFetchOptions).catch(() => []);

  updateCatalogTags();

  for (const locale of catalogLocales) {
    revalidatePath(`/${locale}/catalog`);
    revalidatePath(`/${locale}/admin/products`);

    if (productId) {
      revalidatePath(`/${locale}/admin/products/${productId}`);
    }

    const nextCategory = categories.find((item) => item.id === Number.parseInt(categoryId, 10));
    const previousCategory = previousCategoryId
      ? categories.find((item) => item.id === Number.parseInt(previousCategoryId, 10))
      : null;

    if (nextCategory) {
      revalidatePath(`/${locale}${getCategoryHref(nextCategory)}`);
      revalidatePath(`/${locale}${getProductHref(nextCategory, { name: productName })}`);
    }

    if (previousCategory) {
      revalidatePath(`/${locale}${getCategoryHref(previousCategory)}`);

      if (previousName) {
        revalidatePath(`/${locale}${getProductHref(previousCategory, { name: previousName })}`);
      }
    }
  }
}

async function revalidateCategoryPages(categoryId: string) {
  const categories = await getCategories(undefined, noStoreApiFetchOptions).catch(() => []);
  const category = categories.find((item) => item.id === Number.parseInt(categoryId, 10));

  updateCatalogTags();

  if (!category) {
    return;
  }

  const products = await getProducts(category.id, undefined, noStoreApiFetchOptions).catch(
    () => [],
  );

  for (const locale of catalogLocales) {
    revalidatePath(`/${locale}/catalog`);
    revalidatePath(`/${locale}/admin/products`);
    revalidatePath(`/${locale}/admin/products/categories`);
    revalidatePath(`/${locale}/admin/products/categories/${categoryId}`);
    revalidatePath(`/${locale}${getCategoryHref(category)}`);

    for (const product of products) {
      revalidatePath(`/${locale}${getProductHref(category, product)}`);
    }
  }
}

export async function createProductAction(
  _previousState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const locale = normalizeLocale(formData.get('locale'));
  const contentLocale = normalizeContentLocale(normalizeText(formData.get('contentLocale')));
  await requireAdminSection(locale, 'products', 'manage');

  if (contentLocale !== 'ru') {
    return {
      status: 'error',
      message: 'Новые товары создаются только на русском языке.',
    };
  }

  const values = getProductFormPayload(formData);
  const image = getFile(formData.get('image'));
  const imageEn = getFile(formData.get('imageEn'));
  const fieldErrors = validateProductForm({
    categoryId: values.categoryId,
    contentLocale,
    image,
    imageEn,
    imageRequired: true,
    name: values.name,
  });

  if (hasProductFormErrors(fieldErrors)) {
    return {
      status: 'error',
      message: 'Проверьте обязательные поля.',
      fieldErrors,
    };
  }

  const payload = new FormData();
  appendProductPayload(payload, values, contentLocale);
  payload.append('image', image as File);
  if (imageEn) payload.append('imageEn', imageEn);

  const response = await adminApiFetch('/api/products', {
    method: 'POST',
    headers: getAdminApiHeaders(),
    body: payload,
  });

  if (!response.ok) {
    return {
      status: 'error',
      message: await getActionError(response, locale, 'Не удалось создать товар.'),
    };
  }

  const createdProduct = (await response.json().catch(() => null)) as { id?: number } | null;
  await revalidateCatalogPages({
    categoryId: values.categoryId,
    productId: createdProduct?.id,
    productName: values.name,
  });

  if (createdProduct?.id) {
    redirect(buildProductEditorPath(locale, createdProduct.id, contentLocale, 'created'));
  }

  redirect(buildAdminListPath(locale, { contentLocale, status: 'created' }));
}

export async function updateProductAction(
  _previousState: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const locale = normalizeLocale(formData.get('locale'));
  const contentLocale = normalizeContentLocale(normalizeText(formData.get('contentLocale')));
  await requireAdminSection(locale, 'products', 'manage');

  const productId = normalizeText(formData.get('productId'));
  if (!/^\d+$/.test(productId)) {
    return { status: 'error', message: 'Некорректный идентификатор товара.' };
  }

  const currentProduct = await getProduct(
    Number.parseInt(productId, 10),
    undefined,
    noStoreApiFetchOptions,
  ).catch(() => null);

  if (!currentProduct) {
    return { status: 'error', message: 'Не удалось загрузить текущие данные товара.' };
  }

  const submittedValues = getProductFormPayload(formData);
  const updateScope = resolveProductUpdateScope({
    contentLocale,
    currentCategoryId: currentProduct.categoryId,
    submittedCategoryId: submittedValues.categoryId,
  });
  const values: ProductFormPayload = {
    ...submittedValues,
    categoryId: updateScope.categoryId,
  };
  const image = updateScope.allowImageChanges ? getFile(formData.get('image')) : null;
  const imageEn = updateScope.allowImageChanges ? getFile(formData.get('imageEn')) : null;
  const fieldErrors = validateProductForm({
    categoryId: values.categoryId,
    contentLocale,
    image,
    imageEn,
    imageRequired: false,
    name: values.name,
  });

  if (hasProductFormErrors(fieldErrors)) {
    return {
      status: 'error',
      message: 'Проверьте обязательные поля.',
      fieldErrors,
    };
  }

  const payload = new FormData();
  appendProductPayload(payload, values, contentLocale);
  if (image) payload.append('image', image);
  if (imageEn) payload.append('imageEn', imageEn);

  const response = await adminApiFetch(`/api/products/${productId}`, {
    method: 'PATCH',
    headers: getAdminApiHeaders(),
    body: payload,
  });

  if (!response.ok) {
    return {
      status: 'error',
      message: await getActionError(response, locale, 'Не удалось сохранить товар.'),
    };
  }

  const previousName = currentProduct.slugSourceName ?? currentProduct.name;
  await revalidateCatalogPages({
    categoryId: values.categoryId,
    previousCategoryId: String(currentProduct.categoryId),
    previousName,
    productId,
    productName: contentLocale === 'ru' ? values.name : previousName,
  });

  redirect(buildProductEditorPath(locale, productId, contentLocale, 'updated'));
}

export async function deleteProductAction(formData: FormData) {
  const locale = normalizeLocale(formData.get('locale'));
  const contentLocale = normalizeContentLocale(normalizeText(formData.get('contentLocale')));
  await requireAdminSection(locale, 'products', 'manage');

  const productId = normalizeText(formData.get('productId'));
  const fallbackCategoryId = normalizeText(formData.get('categoryId'));
  const fallbackProductName = normalizeText(formData.get('productName'));

  if (!/^\d+$/.test(productId)) {
    redirect(buildAdminListPath(locale, { contentLocale, error: 'Выберите товар для удаления.' }));
  }

  const currentProduct = await getProduct(
    Number.parseInt(productId, 10),
    undefined,
    noStoreApiFetchOptions,
  ).catch(() => null);
  const categoryId = currentProduct ? String(currentProduct.categoryId) : fallbackCategoryId;
  const productName = currentProduct?.slugSourceName ?? currentProduct?.name ?? fallbackProductName;

  if (!categoryId || !productName) {
    redirect(buildAdminListPath(locale, { contentLocale, error: 'Товар не найден.' }));
  }

  const response = await adminApiFetch(`/api/products/${productId}`, {
    method: 'DELETE',
    headers: getAdminApiHeaders(),
  });

  if (!response.ok) {
    redirect(
      buildAdminListPath(locale, {
        contentLocale,
        error: await getActionError(response, locale, 'Не удалось удалить товар.'),
      }),
    );
  }

  await revalidateCatalogPages({ categoryId, productName, productId });
  redirect(buildAdminListPath(locale, { contentLocale, status: 'deleted' }));
}

export async function updateCategoryTranslationAction(
  _previousState: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const locale = normalizeLocale(formData.get('locale'));
  const contentLocale = normalizeContentLocale(normalizeText(formData.get('contentLocale')));
  await requireAdminSection(locale, 'products', 'manage');

  const categoryId = normalizeText(formData.get('categoryId'));
  const name = normalizeText(formData.get('name'));
  const description = sanitizeRichDescription(normalizeText(formData.get('description')));
  // The image is shared by every language, so only the RU editor may replace
  // it; the other editors render it read-only and send no file at all.
  const image = contentLocale === 'ru' ? getFile(formData.get('image')) : null;

  if (!/^\d+$/.test(categoryId)) {
    return { status: 'error', message: 'Некорректный идентификатор категории.' };
  }

  const imageError = validateImageFile(image);

  if ((contentLocale === 'ru' && !name) || imageError) {
    return {
      status: 'error',
      message: 'Проверьте обязательные поля.',
      fieldErrors: {
        ...(contentLocale === 'ru' && !name
          ? { name: 'Введите название категории.' }
          : {}),
        ...(imageError ? { image: imageError } : {}),
      },
    };
  }

  // Multipart, and with the text fields first: the backend names the stored
  // file after the category name it has already parsed off the stream.
  const payload = new FormData();
  payload.append('contentLocale', contentLocale);
  payload.append('name', name);
  payload.append('description', description);
  if (image) payload.append('image', image);

  const response = await adminApiFetch(`/api/categories/${categoryId}`, {
    method: 'PATCH',
    headers: getAdminApiHeaders(),
    body: payload,
  });

  if (!response.ok) {
    return {
      status: 'error',
      message: await getActionError(response, locale, 'Не удалось сохранить категорию.'),
    };
  }

  await revalidateCategoryPages(categoryId);
  redirect(buildCategoryEditorPath(locale, categoryId, contentLocale, 'updated'));
}
