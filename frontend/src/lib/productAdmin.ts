import type { Category, Product } from './api';

export const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const PRODUCT_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

const productImageMimeTypeSet = new Set<string>(PRODUCT_IMAGE_MIME_TYPES);

export type ProductTranslationFilter = 'all' | 'complete' | 'missing';

export type ProductAdminFilters = {
  categoryId: number | null;
  query: string;
  translation: ProductTranslationFilter;
};

export type ProductFormField = 'categoryId' | 'name' | 'image' | 'imageEn';

export type ProductFormFieldErrors = Partial<Record<ProductFormField, string>>;

export type ProductFormValidationInput = {
  categoryId: string;
  contentLocale: string;
  image?: File | null;
  imageEn?: File | null;
  imageRequired: boolean;
  name: string;
};

function normalizeSearchValue(value: string) {
  return value.trim().toLocaleLowerCase('ru-RU');
}

export function normalizeProductTranslationFilter(
  value?: string | null,
): ProductTranslationFilter {
  return value === 'complete' || value === 'missing' ? value : 'all';
}

export function normalizeProductCategoryFilter(value?: string | null) {
  if (!value || !/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function filterAdminProducts(
  products: Product[],
  categories: Category[],
  filters: ProductAdminFilters,
) {
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const query = normalizeSearchValue(filters.query);

  return products.filter((product) => {
    if (filters.categoryId && product.categoryId !== filters.categoryId) {
      return false;
    }

    const isComplete = Boolean(product.adminTranslation?.isComplete);
    if (filters.translation === 'complete' && !isComplete) {
      return false;
    }
    if (filters.translation === 'missing' && isComplete) {
      return false;
    }

    if (!query) {
      return true;
    }

    const category = categoryById.get(product.categoryId);
    const searchableText = [
      product.name,
      product.slugSourceName,
      product.adminTranslation?.name,
      category?.name,
      category?.slugSourceName,
    ]
      .filter(Boolean)
      .join(' ');

    return normalizeSearchValue(searchableText).includes(query);
  });
}

function validateImage(file: File | null | undefined, field: ProductFormField) {
  if (!file || file.size === 0) {
    return null;
  }

  if (!productImageMimeTypeSet.has(file.type)) {
    return {
      field,
      message: 'Поддерживаются только изображения JPG, PNG и WEBP.',
    } as const;
  }

  if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
    return {
      field,
      message: 'Размер изображения не должен превышать 5 МБ.',
    } as const;
  }

  return null;
}

export function validateProductForm(input: ProductFormValidationInput) {
  const fieldErrors: ProductFormFieldErrors = {};

  if (!/^\d+$/.test(input.categoryId) || Number.parseInt(input.categoryId, 10) < 1) {
    fieldErrors.categoryId = 'Выберите категорию.';
  }

  if (!input.name.trim()) {
    fieldErrors.name = 'Введите название товара.';
  }

  if (input.imageRequired && (!input.image || input.image.size === 0)) {
    fieldErrors.image = 'Добавьте изображение для русской версии.';
  }

  if (input.contentLocale === 'ru') {
    for (const validationError of [
      validateImage(input.image, 'image'),
      validateImage(input.imageEn, 'imageEn'),
    ]) {
      if (validationError) {
        fieldErrors[validationError.field] = validationError.message;
      }
    }
  }

  return fieldErrors;
}

export function hasProductFormErrors(errors: ProductFormFieldErrors) {
  return Object.keys(errors).length > 0;
}

export function resolveProductUpdateScope(args: {
  contentLocale: string;
  currentCategoryId: number;
  submittedCategoryId: string;
}) {
  const isBaseLocale = args.contentLocale === 'ru';

  return {
    allowImageChanges: isBaseLocale,
    categoryId: isBaseLocale ? args.submittedCategoryId : String(args.currentCategoryId),
  };
}
