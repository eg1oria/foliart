import { revalidatePath, updateTag } from 'next/cache';

import {
  categoriesCacheTag,
  getCategories,
  noStoreApiFetchOptions,
  productsCacheTag,
} from './api';
import { getCategoryHref, getProductHref } from './catalog';

export const catalogLocales = ['ru', 'en', 'fr', 'es'] as const;

/**
 * Paths only cover the routes we can name here, and every catalog page is
 * rendered per locale, so the tags are what actually drop the cached API
 * responses shared by `/catalog`, the sitemap and the search index. Both tags
 * go together: moving a product changes category product counts, and renaming
 * a category changes the product pages that quote it.
 */
export function updateCatalogTags() {
  updateTag(categoriesCacheTag);
  updateTag(productsCacheTag);
}

export async function revalidateCatalogPages(args: {
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
