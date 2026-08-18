import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  adminApiFetch: vi.fn(),
  getCategories: vi.fn(),
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
  getProduct: vi.fn(),
  getProducts: vi.fn(),
  noStoreApiFetchOptions: {},
  productsCacheTag: 'products',
}));

import { deleteProductAction, updateCategoryTranslationAction } from './actions';

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
