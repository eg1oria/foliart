'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCategories, getProducts } from '@/lib/api';
import { getCategoryHref, getProductHref } from '@/lib/catalog';

const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3001';
const catalogLocales = ['ru', 'en'] as const;

type ProductFormPayload = {
  categoryId: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  advantages: string;
  advantagesEn: string;
  composition: string;
  compositionEn: string;
  application: string;
  applicationEn: string;
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
  return `/${locale}/admin/products${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`;
}

function normalizeLocale(value: FormDataEntryValue | null) {
  return typeof value === 'string' && value ? value : 'ru';
}

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function getProductFormPayload(formData: FormData): ProductFormPayload {
  return {
    categoryId: normalizeText(formData.get('categoryId')),
    name: normalizeText(formData.get('name')),
    nameEn: normalizeText(formData.get('nameEn')),
    description: normalizeText(formData.get('description')),
    descriptionEn: normalizeText(formData.get('descriptionEn')),
    advantages: normalizeText(formData.get('advantages')),
    advantagesEn: normalizeText(formData.get('advantagesEn')),
    composition: normalizeText(formData.get('composition')),
    compositionEn: normalizeText(formData.get('compositionEn')),
    application: normalizeText(formData.get('application')),
    applicationEn: normalizeText(formData.get('applicationEn')),
  };
}

function appendProductPayload(payload: FormData, values: ProductFormPayload) {
  payload.append('categoryId', values.categoryId);
  payload.append('name', values.name);
  payload.append('nameEn', values.nameEn);
  payload.append('description', values.description);
  payload.append('descriptionEn', values.descriptionEn);
  payload.append('advantages', values.advantages);
  payload.append('advantagesEn', values.advantagesEn);
  payload.append('composition', values.composition);
  payload.append('compositionEn', values.compositionEn);
  payload.append('application', values.application);
  payload.append('applicationEn', values.applicationEn);
}

async function getRequestErrorMessage(response: Response) {
  const errorPayload = (await response.json().catch(() => null)) as
    | { message?: string | string[] }
    | null;

  return Array.isArray(errorPayload?.message)
    ? errorPayload.message.join(', ')
    : errorPayload?.message;
}

async function revalidateCatalogPages(args: {
  categoryId: string;
  productName: string;
  previousCategoryId?: string;
  previousName?: string;
}) {
  const { categoryId, productName, previousCategoryId, previousName } = args;
  const categories = await getCategories().catch(() => []);

  for (const locale of catalogLocales) {
    revalidatePath(`/${locale}/catalog`);
    revalidatePath(`/${locale}/admin/products`);

    const nextCategory = categories.find(
      (item) => item.id === Number.parseInt(categoryId, 10),
    );
    const prevCategory = previousCategoryId
      ? categories.find((item) => item.id === Number.parseInt(previousCategoryId, 10))
      : null;

    if (nextCategory) {
      revalidatePath(`/${locale}${getCategoryHref(nextCategory)}`);
      revalidatePath(`/${locale}${getProductHref(nextCategory, { name: productName })}`);
    }

    if (prevCategory) {
      revalidatePath(`/${locale}${getCategoryHref(prevCategory)}`);

      if (previousName) {
        revalidatePath(`/${locale}${getProductHref(prevCategory, { name: previousName })}`);
      }
    }
  }
}

async function revalidateCategoryTranslationPages(categoryId: string) {
  const categories = await getCategories().catch(() => []);
  const category = categories.find((item) => item.id === Number.parseInt(categoryId, 10));

  if (!category) {
    return;
  }

  const products = await getProducts(category.id).catch(() => []);

  revalidatePath('/en/catalog');
  revalidatePath('/en/admin/products');
  revalidatePath(`/en${getCategoryHref(category)}`);

  for (const product of products) {
    revalidatePath(`/en${getProductHref(category, product)}`);
  }
}

export async function createProductAction(formData: FormData) {
  const locale = normalizeLocale(formData.get('locale'));
  const values = getProductFormPayload(formData);
  const image = formData.get('image');

  if (!values.categoryId || !values.name || !(image instanceof File) || image.size === 0) {
    redirect(
      buildAdminRedirectPath(locale, {
        error:
          locale === 'en'
            ? 'Fill in category, product name, and image.'
            : 'Заполните категорию, название товара и фото.',
      }, 'create-product'),
    );
  }

  const payload = new FormData();
  appendProductPayload(payload, values);
  payload.append('image', image);

  const response = await fetch(`${backendUrl}/api/products`, {
    method: 'POST',
    body: payload,
    cache: 'no-store',
  });

  if (!response.ok) {
    const rawMessage = await getRequestErrorMessage(response);

    redirect(
      buildAdminRedirectPath(locale, {
        error:
          rawMessage ||
          (locale === 'en' ? 'Failed to create product.' : 'Не удалось создать товар.'),
      }, 'create-product'),
    );
  }

  await revalidateCatalogPages({
    categoryId: values.categoryId,
    productName: values.name,
  });

  redirect(
    buildAdminRedirectPath(locale, {
      status: 'created',
    }, 'create-product'),
  );
}

export async function updateProductAction(formData: FormData) {
  const locale = normalizeLocale(formData.get('locale'));
  const productId = normalizeText(formData.get('productId'));
  const previousCategoryId = normalizeText(formData.get('previousCategoryId'));
  const previousName = normalizeText(formData.get('previousName'));
  const values = getProductFormPayload(formData);
  const image = formData.get('image');

  if (!productId || !values.categoryId || !values.name) {
    redirect(
      buildAdminRedirectPath(locale, {
        edit: productId,
        error:
          locale === 'en'
            ? 'Fill in category and product name.'
            : 'Заполните категорию и название товара.',
      }, productId ? `product-${productId}` : 'manage-products'),
    );
  }

  const payload = new FormData();
  appendProductPayload(payload, values);

  if (image instanceof File && image.size > 0) {
    payload.append('image', image);
  }

  const response = await fetch(`${backendUrl}/api/products/${productId}`, {
    method: 'PATCH',
    body: payload,
    cache: 'no-store',
  });

  if (!response.ok) {
    const rawMessage = await getRequestErrorMessage(response);

    redirect(
      buildAdminRedirectPath(locale, {
        edit: productId,
        error:
          rawMessage ||
          (locale === 'en' ? 'Failed to update product.' : 'Не удалось обновить товар.'),
      }, productId ? `product-${productId}` : 'manage-products'),
    );
  }

  await revalidateCatalogPages({
    categoryId: values.categoryId,
    productName: values.name,
    previousCategoryId,
    previousName,
  });

  redirect(
    buildAdminRedirectPath(locale, {
      status: 'updated',
      product: productId,
      edit: productId,
    }, `product-${productId}`),
  );
}

export async function updateCategoryTranslationAction(formData: FormData) {
  const locale = normalizeLocale(formData.get('locale'));
  const categoryId = normalizeText(formData.get('categoryId'));
  const nameEn = normalizeText(formData.get('nameEn'));
  const descriptionEn = normalizeText(formData.get('descriptionEn'));

  if (!categoryId) {
    redirect(
      buildAdminRedirectPath(locale, {
        categoryError:
          locale === 'en' ? 'Select a category.' : 'Выберите категорию для перевода.',
      }, 'manage-products'),
    );
  }

  const response = await fetch(`${backendUrl}/api/categories/${categoryId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      nameEn,
      descriptionEn,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const rawMessage = await getRequestErrorMessage(response);

    redirect(
      buildAdminRedirectPath(locale, {
        category: categoryId,
        categoryError:
          rawMessage ||
          (locale === 'en'
            ? 'Failed to update category translation.'
            : 'Не удалось обновить перевод категории.'),
      }, `category-${categoryId}`),
    );
  }

  await revalidateCategoryTranslationPages(categoryId);

  redirect(
    buildAdminRedirectPath(locale, {
      category: categoryId,
      categoryStatus: 'updated',
    }, `category-${categoryId}`),
  );
}
