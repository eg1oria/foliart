'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getAdminApiHeaders } from '@/lib/adminApi';
import { adminApiFetch, getAdminApiErrorMessage } from '@/lib/adminBackend';
import { requireAdminSession } from '@/lib/adminAuthServer';
import { getCategories, getProducts, noStoreApiFetchOptions } from '@/lib/api';
import { normalizeContentLocale } from '@/lib/contentLocales';
import { getCategoryHref, getProductHref } from '@/lib/catalog';

const catalogLocales = ['ru', 'en', 'fr', 'es'] as const;

type ProductFormPayload = {
  categoryId: string;
  name: string;
  description: string;
  advantages: string;
  composition: string;
  application: string;
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
    description: normalizeText(formData.get('description')),
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

async function revalidateCatalogPages(args: {
  categoryId: string;
  productName: string;
  previousCategoryId?: string;
  previousName?: string;
}) {
  const { categoryId, productName, previousCategoryId, previousName } = args;
  const categories = await getCategories(undefined, noStoreApiFetchOptions).catch(() => []);

  for (const locale of catalogLocales) {
    revalidatePath(`/${locale}/catalog`);
    revalidatePath(`/${locale}/admin/products`);

    const nextCategory = categories.find((item) => item.id === Number.parseInt(categoryId, 10));
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

async function revalidateCategoryPages(categoryId: string) {
  const categories = await getCategories(undefined, noStoreApiFetchOptions).catch(() => []);
  const category = categories.find((item) => item.id === Number.parseInt(categoryId, 10));

  if (!category) {
    return;
  }

  const products = await getProducts(category.id, undefined, noStoreApiFetchOptions).catch(
    () => [],
  );

  for (const locale of catalogLocales) {
    revalidatePath(`/${locale}/catalog`);
    revalidatePath(`/${locale}/admin/products`);
    revalidatePath(`/${locale}${getCategoryHref(category)}`);

    for (const product of products) {
      revalidatePath(`/${locale}${getProductHref(category, product)}`);
    }
  }
}

export async function createProductAction(formData: FormData) {
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
        'create-product',
      ),
    );
  }

  const values = getProductFormPayload(formData);
  const image = formData.get('image');
  const imageEn = formData.get('imageEn');

  if (!values.categoryId || !values.name || !(image instanceof File) || image.size === 0) {
    redirect(
      buildAdminRedirectPath(
        locale,
        {
          contentLocale,
          error:
            locale === 'en'
              ? 'Fill in category, product name, and image.'
              : 'Заполните категорию, название товара и фото.',
        },
        'create-product',
      ),
    );
  }

  const payload = new FormData();
  appendProductPayload(payload, values, contentLocale);
  payload.append('image', image);
  if (imageEn instanceof File && imageEn.size > 0) {
    payload.append('imageEn', imageEn);
  }

  const response = await adminApiFetch('/api/products', {
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
            (locale === 'en' ? 'Failed to create product.' : 'Не удалось создать товар.'),
        },
        'create-product',
      ),
    );
  }

  await revalidateCatalogPages({
    categoryId: values.categoryId,
    productName: values.name,
  });

  redirect(
    buildAdminRedirectPath(
      locale,
      {
        contentLocale,
        status: 'created',
      },
      'create-product',
    ),
  );
}

export async function updateProductAction(formData: FormData) {
  const locale = normalizeLocale(formData.get('locale'));
  const contentLocale = normalizeContentLocale(normalizeText(formData.get('contentLocale')));
  await requireAdminSession(locale);

  const productId = normalizeText(formData.get('productId'));
  const previousCategoryId = normalizeText(formData.get('previousCategoryId'));
  const previousName = normalizeText(formData.get('previousName'));
  const values = getProductFormPayload(formData);
  const image = formData.get('image');
  const imageEn = formData.get('imageEn');

  if (!productId || !values.categoryId || !values.name) {
    redirect(
      buildAdminRedirectPath(
        locale,
        {
          contentLocale,
          edit: productId,
          error:
            locale === 'en'
              ? 'Fill in category and product name.'
              : 'Заполните категорию и название товара.',
        },
        productId ? `product-${productId}` : 'manage-products',
      ),
    );
  }

  const payload = new FormData();
  appendProductPayload(payload, values, contentLocale);

  if (image instanceof File && image.size > 0) {
    payload.append('image', image);
  }
  if (imageEn instanceof File && imageEn.size > 0) {
    payload.append('imageEn', imageEn);
  }

  const response = await adminApiFetch(`/api/products/${productId}`, {
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
          edit: productId,
          error:
            rawMessage ||
            (locale === 'en' ? 'Failed to update product.' : 'Не удалось обновить товар.'),
        },
        productId ? `product-${productId}` : 'manage-products',
      ),
    );
  }

  await revalidateCatalogPages({
    categoryId: values.categoryId,
    productName: contentLocale === 'ru' ? values.name : previousName || values.name,
    previousCategoryId,
    previousName,
  });

  redirect(
    buildAdminRedirectPath(
      locale,
      {
        contentLocale,
        status: 'updated',
        product: productId,
        edit: productId,
      },
      `product-${productId}`,
    ),
  );
}

export async function updateCategoryTranslationAction(formData: FormData) {
  const locale = normalizeLocale(formData.get('locale'));
  const contentLocale = normalizeContentLocale(normalizeText(formData.get('contentLocale')));
  await requireAdminSession(locale);

  const categoryId = normalizeText(formData.get('categoryId'));
  const name = normalizeText(formData.get('name'));
  const description = normalizeText(formData.get('description'));

  if (!categoryId) {
    redirect(
      buildAdminRedirectPath(
        locale,
        {
          contentLocale,
          categoryError:
            locale === 'en' ? 'Select a category.' : 'Выберите категорию для перевода.',
        },
        'manage-products',
      ),
    );
  }

  const response = await adminApiFetch(`/api/categories/${categoryId}`, {
    method: 'PATCH',
    headers: {
      ...getAdminApiHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contentLocale,
      name,
      description,
    }),
  });

  if (!response.ok) {
    const rawMessage = await getAdminApiErrorMessage(response, locale);

    redirect(
      buildAdminRedirectPath(
        locale,
        {
          contentLocale,
          category: categoryId,
          categoryError:
            rawMessage ||
            (locale === 'en'
              ? 'Failed to update category translation.'
              : 'Не удалось обновить перевод категории.'),
        },
        `category-${categoryId}`,
      ),
    );
  }

  await revalidateCategoryPages(categoryId);

  redirect(
    buildAdminRedirectPath(
      locale,
      {
        contentLocale,
        category: categoryId,
        categoryStatus: 'updated',
      },
      `category-${categoryId}`,
    ),
  );
}
