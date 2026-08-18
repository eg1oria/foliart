import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  adminApiFetch: vi.fn(),
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
  getCategories: vi.fn(),
  getProduct: vi.fn(),
  getProducts: vi.fn(),
  noStoreApiFetchOptions: {},
  productsCacheTag: 'products',
}));

import { deleteProductAction } from './actions';

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
