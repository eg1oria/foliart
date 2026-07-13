import { describe, expect, it } from 'vitest';

import type { Category, Product } from './api';
import {
  filterAdminProducts,
  normalizeProductCategoryFilter,
  normalizeProductTranslationFilter,
  PRODUCT_IMAGE_MAX_BYTES,
  resolveProductUpdateScope,
  validateProductForm,
} from './productAdmin';

const categories: Category[] = [
  {
    id: 1,
    name: 'Монопродукты',
    nameEn: 'Single products',
    description: 'Описание',
    descriptionEn: 'Description',
    imageUrl: 'category.webp',
    productCount: 1,
    slugSourceName: 'Монопродукты',
    adminTranslation: {
      locale: 'en',
      hasTranslation: true,
      isComplete: true,
      name: 'Single products',
      description: 'Description',
    },
  },
  {
    id: 2,
    name: 'Комплексные препараты',
    nameEn: 'Complex products',
    description: 'Описание',
    descriptionEn: 'Description',
    imageUrl: 'category-2.webp',
    productCount: 1,
    slugSourceName: 'Комплексные препараты',
  },
];

function createProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    categoryId: 1,
    name: 'Copper 88',
    nameEn: 'Copper 88',
    description: 'Description',
    descriptionEn: 'Description',
    advantages: 'Advantage',
    advantagesEn: 'Advantage',
    composition: 'Copper | 88%',
    compositionEn: 'Copper | 88%',
    application: 'Guide',
    applicationEn: 'Guide',
    imageUrl: 'products/copper.webp',
    imageUrlEn: 'products/copper-international.webp',
    slugSourceName: 'Медь 88',
    adminTranslation: {
      locale: 'en',
      hasTranslation: true,
      isComplete: true,
      name: 'Copper 88',
      description: 'Description',
      advantages: 'Advantage',
      composition: 'Copper | 88%',
      application: 'Guide',
    },
    ...overrides,
  };
}

describe('product admin filters', () => {
  const products = [
    createProduct(),
    createProduct({
      id: 2,
      categoryId: 2,
      name: 'Риза',
      slugSourceName: 'Риза',
      adminTranslation: {
        locale: 'en',
        hasTranslation: false,
        isComplete: false,
        name: '',
        description: '',
        advantages: '',
        composition: '',
        application: '',
      },
    }),
  ];

  it('searches localized, base, and category names case-insensitively', () => {
    expect(
      filterAdminProducts(products, categories, {
        categoryId: null,
        query: 'медь',
        translation: 'all',
      }).map((product) => product.id),
    ).toEqual([1]);

    expect(
      filterAdminProducts(products, categories, {
        categoryId: null,
        query: 'КОМПЛЕКСНЫЕ',
        translation: 'all',
      }).map((product) => product.id),
    ).toEqual([2]);
  });

  it('combines category and translation filters', () => {
    expect(
      filterAdminProducts(products, categories, {
        categoryId: 2,
        query: '',
        translation: 'missing',
      }).map((product) => product.id),
    ).toEqual([2]);

    expect(
      filterAdminProducts(products, categories, {
        categoryId: 2,
        query: '',
        translation: 'complete',
      }),
    ).toEqual([]);
  });

  it('normalizes invalid URL filters safely', () => {
    expect(normalizeProductCategoryFilter('2')).toBe(2);
    expect(normalizeProductCategoryFilter('../2')).toBeNull();
    expect(normalizeProductTranslationFilter('missing')).toBe('missing');
    expect(normalizeProductTranslationFilter('unknown')).toBe('all');
  });
});

describe('product admin validation and mutation scope', () => {
  it('requires category, name, and base image when creating', () => {
    expect(
      validateProductForm({
        categoryId: '',
        contentLocale: 'ru',
        image: null,
        imageRequired: true,
        name: ' ',
      }),
    ).toEqual({
      categoryId: 'Выберите категорию.',
      image: 'Добавьте изображение для русской версии.',
      name: 'Введите название товара.',
    });
  });

  it('rejects unsupported and oversized images', () => {
    const unsupported = new File(['pdf'], 'file.pdf', { type: 'application/pdf' });
    const oversized = new File(['image'], 'large.webp', { type: 'image/webp' });
    Object.defineProperty(oversized, 'size', { value: PRODUCT_IMAGE_MAX_BYTES + 1 });

    expect(
      validateProductForm({
        categoryId: '1',
        contentLocale: 'ru',
        image: unsupported,
        imageEn: oversized,
        imageRequired: false,
        name: 'Товар',
      }),
    ).toMatchObject({
      image: 'Поддерживаются только изображения JPG, PNG и WEBP.',
      imageEn: 'Размер изображения не должен превышать 5 МБ.',
    });
  });

  it('locks category and images for EN, FR, and ES updates', () => {
    for (const contentLocale of ['en', 'fr', 'es']) {
      expect(
        resolveProductUpdateScope({
          contentLocale,
          currentCategoryId: 4,
          submittedCategoryId: '999',
        }),
      ).toEqual({
        allowImageChanges: false,
        categoryId: '4',
      });
    }
  });

  it('allows base RU updates to change shared product fields', () => {
    expect(
      resolveProductUpdateScope({
        contentLocale: 'ru',
        currentCategoryId: 4,
        submittedCategoryId: '2',
      }),
    ).toEqual({
      allowImageChanges: true,
      categoryId: '2',
    });
  });
});
