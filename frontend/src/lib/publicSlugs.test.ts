import { describe, expect, it } from 'vitest';
import type { CalendarEntry, Category, Product } from './api';
import {
  findCategoryByParam,
  findProductByParam,
  getCategoryHref,
  getProductHref,
} from './catalog';
import {
  findCalendarByParam,
  getCalendarHref,
} from './calendars';

const category = (overrides: Partial<Category>): Category => ({
  id: 1,
  name: 'Монопродукты',
  nameEn: '',
  description: '',
  descriptionEn: '',
  imageUrl: '',
  productCount: 0,
  ...overrides,
});

const product = (overrides: Partial<Product>): Product => ({
  id: 1,
  categoryId: 1,
  name: 'Риза',
  nameEn: '',
  description: '',
  descriptionEn: '',
  advantages: '',
  advantagesEn: '',
  composition: '',
  compositionEn: '',
  application: '',
  applicationEn: '',
  imageUrl: '',
  imageUrlEn: '',
  ...overrides,
});

const calendar = (overrides: Partial<CalendarEntry>): CalendarEntry => ({
  id: 1,
  title: 'Кукуруза',
  titleEn: '',
  description: '',
  descriptionEn: '',
  imageUrl1: '',
  imageUrl2: '',
  imageUrl3: '',
  imageUrl4: '',
  pdfUrl: '',
  imageUrls: [],
  ...overrides,
});

describe('stored public slugs', () => {
  it('uses persisted category and product slugs in links and lookup', () => {
    const firstCategory = category({ slug: 'monoprodukty' });
    const secondCategory = category({
      id: 2,
      slug: 'monoprodukty-2',
      name: 'Монопродукты',
    });
    const firstProduct = product({ slug: 'riza' });
    const secondProduct = product({ id: 2, slug: 'riza-2' });

    expect(getCategoryHref(secondCategory)).toBe('/catalog/monoprodukty-2');
    expect(getProductHref(secondCategory, secondProduct)).toBe(
      '/catalog/monoprodukty-2/riza-2',
    );
    expect(
      findCategoryByParam([firstCategory, secondCategory], 'monoprodukty-2')
        ?.id,
    ).toBe(2);
    expect(findProductByParam([firstProduct, secondProduct], 'riza-2')?.id).toBe(
      2,
    );
  });

  it('uses the persisted calendar slug instead of the colliding title', () => {
    const entries = [
      calendar({ slug: 'kukuruza' }),
      calendar({ id: 2, slug: 'kukuruza-2' }),
    ];

    expect(getCalendarHref(entries[1])).toBe('/calendar/kukuruza-2');
    expect(findCalendarByParam(entries, 'kukuruza-2')?.id).toBe(2);
  });
});
