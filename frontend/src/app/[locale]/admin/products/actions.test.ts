import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  adminApiFetch: vi.fn(),
  getCategories: vi.fn(),
  getCategory: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  requireAdminSection: vi.fn(),
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
  updateTag: mocks.updateTag,
}));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('@/lib/adminApi', () => ({
  getAdminApiHeaders: () => ({ 'x-admin-secret': 'server-secret' }),
}));
vi.mock('@/lib/adminBackend', () => ({
  adminApiFetch: mocks.adminApiFetch,
  getAdminApiErrorMessage: vi.fn(),
}));
vi.mock('@/lib/adminAuthServer', () => ({
  requireAdminSection: mocks.requireAdminSection,
}));
vi.mock('@/lib/renderRichDescription', () => ({
  sanitizeRichDescription: (value: string) => value,
}));
vi.mock('@/lib/api', () => ({
  categoriesCacheTag: 'categories',
  getCategories: mocks.getCategories,
  getCategory: mocks.getCategory,
  getProduct: vi.fn(),
  getProducts: vi.fn(),
  noStoreApiFetchOptions: {},
  productsCacheTag: 'products',
}));

import {
  createCategoryAction,
  deleteCategoryAction,
  deleteProductAction,
  updateCategoryTranslationAction,
} from './actions';

function formData(entries: Record<string, string>) {
  const data = new FormData();

  for (const [key, value] of Object.entries(entries)) {
    data.set(key, value);
  }

  return data;
}

describe('product Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Hiding a button is cosmetic; the section guard is what actually stops a
  // read-only admin, so it has to run before anything reaches the backend.
  it('asks for manage access before touching the backend', async () => {
    mocks.requireAdminSection.mockRejectedValue(new Error('REDIRECT:/ru/admin/products'));

    await expect(
      deleteProductAction(formData({ locale: 'ru', productId: '1' })),
    ).rejects.toThrow('REDIRECT');

    expect(mocks.requireAdminSection).toHaveBeenCalledWith('ru', 'products', 'manage');
    expect(mocks.adminApiFetch).not.toHaveBeenCalled();
  });
});

describe('category Server Actions', () => {
  const image = new File(['image-bytes'], 'category.webp', { type: 'image/webp' });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdminSection.mockResolvedValue({});
    mocks.getCategories.mockResolvedValue([]);
    mocks.adminApiFetch.mockResolvedValue({ ok: true });
  });

  it('uploads a replacement image as multipart from the RU editor', async () => {
    const data = formData({
      locale: 'ru',
      contentLocale: 'ru',
      categoryId: '3',
      name: 'Монопродукты',
      description: 'Описание',
    });
    data.set('image', image);

    await expect(
      updateCategoryTranslationAction({ status: 'idle' }, data),
    ).rejects.toThrow('REDIRECT');

    const [path, init] = mocks.adminApiFetch.mock.calls[0] as [string, RequestInit];
    expect(path).toBe('/api/categories/3');
    expect(init.method).toBe('PATCH');
    const payload = init.body as FormData;
    expect(payload.get('name')).toBe('Монопродукты');
    expect(payload.get('image')).toBe(image);
  });

  it('rejects an image the backend would refuse', async () => {
    const data = formData({
      locale: 'ru',
      contentLocale: 'ru',
      categoryId: '3',
      name: 'Монопродукты',
    });
    data.set('image', new File(['pdf-bytes'], 'category.pdf', { type: 'application/pdf' }));

    await expect(updateCategoryTranslationAction({ status: 'idle' }, data)).resolves.toEqual(
      expect.objectContaining({
        status: 'error',
        fieldErrors: { image: expect.any(String) },
      }),
    );
    expect(mocks.adminApiFetch).not.toHaveBeenCalled();
  });

  // The image is shared by every language, so a translation editor must not be
  // able to swap it out from under the other locales.
  it('ignores an image submitted from a translation editor', async () => {
    const data = formData({
      locale: 'ru',
      contentLocale: 'en',
      categoryId: '3',
      name: 'Single products',
    });
    data.set('image', image);

    await expect(
      updateCategoryTranslationAction({ status: 'idle' }, data),
    ).rejects.toThrow('REDIRECT');

    const [, init] = mocks.adminApiFetch.mock.calls[0] as [string, RequestInit];
    expect((init.body as FormData).get('image')).toBeNull();
  });
});

describe('category create and delete Server Actions', () => {
  const image = new File(['image-bytes'], 'category.webp', { type: 'image/webp' });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdminSection.mockResolvedValue({});
    mocks.getCategories.mockResolvedValue([]);
    mocks.adminApiFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 12, slug: 'biopreparaty' }),
    });
  });

  it('creates a category as Russian multipart and opens its editor', async () => {
    const data = formData({
      locale: 'ru',
      contentLocale: 'ru',
      name: 'Биопрепараты',
      description: 'Описание',
    });
    data.set('image', image);

    await expect(createCategoryAction({ status: 'idle' }, data)).rejects.toThrow(
      'REDIRECT:/ru/admin/products/categories/12?contentLocale=ru&status=created',
    );

    const [path, init] = mocks.adminApiFetch.mock.calls[0] as [string, RequestInit];
    expect(path).toBe('/api/categories');
    expect(init.method).toBe('POST');
    const payload = init.body as FormData;
    expect(payload.get('contentLocale')).toBe('ru');
    expect(payload.get('name')).toBe('Биопрепараты');
    expect(payload.get('image')).toBe(image);
  });

  it('requires a category name before calling the backend', async () => {
    await expect(
      createCategoryAction({ status: 'idle' }, formData({ locale: 'ru', name: '   ' })),
    ).resolves.toEqual(
      expect.objectContaining({
        status: 'error',
        fieldErrors: { name: expect.any(String) },
      }),
    );
    expect(mocks.adminApiFetch).not.toHaveBeenCalled();
  });

  // The whole point of the delete guard: a populated category must never be
  // dropped, because its products would go with it.
  it('refuses to delete a category that still holds products', async () => {
    mocks.getCategory.mockResolvedValue({ id: 3, name: 'Монопродукты', productCount: 4 });

    await expect(
      deleteCategoryAction(formData({ locale: 'ru', contentLocale: 'ru', categoryId: '3' })),
    ).rejects.toThrow('REDIRECT');

    expect(mocks.adminApiFetch).not.toHaveBeenCalled();
  });

  it('deletes an empty category', async () => {
    mocks.getCategory.mockResolvedValue({
      id: 3,
      name: 'Монопродукты',
      slug: 'monoprodukty',
      productCount: 0,
    });

    await expect(
      deleteCategoryAction(formData({ locale: 'ru', contentLocale: 'ru', categoryId: '3' })),
    ).rejects.toThrow('REDIRECT:/ru/admin/products/categories?contentLocale=ru&status=deleted');

    const [path, init] = mocks.adminApiFetch.mock.calls[0] as [string, RequestInit];
    expect(path).toBe('/api/categories/3');
    expect(init.method).toBe('DELETE');
  });
});
