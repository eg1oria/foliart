import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  adminApiFetch: vi.fn(),
  getAdminApiErrorMessage: vi.fn(),
  redirect: vi.fn(),
  requireAdminSection: vi.fn(),
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
  updateTag: mocks.updateTag,
}));
vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}));
vi.mock('@/lib/adminApi', () => ({
  getAdminApiHeaders: () => ({ 'x-admin-secret': 'server-secret' }),
}));
vi.mock('@/lib/adminBackend', () => ({
  adminApiFetch: mocks.adminApiFetch,
  getAdminApiErrorMessage: mocks.getAdminApiErrorMessage,
}));
vi.mock('@/lib/adminAuthServer', () => ({
  requireAdminSection: mocks.requireAdminSection,
}));
// `@/lib/api` pulls in the next-intl navigation helpers through `@/lib/seo`,
// which do not resolve outside the Next build; only the cache tag is needed.
vi.mock('@/lib/api', () => ({
  siteImagesCacheTag: 'site-images',
}));

import {
  resetSiteImageAction,
  uploadSiteImageAction,
  type SiteImageActionState,
} from './actions';

const idle: SiteImageActionState = { status: 'idle' };

// The real `redirect` throws to unwind the action; a mock that returns would let
// the tests walk into code the framework never reaches.
class RedirectError extends Error {
  constructor(readonly path: string) {
    super('NEXT_REDIRECT');
  }
}

async function captureRedirect(action: Promise<unknown>) {
  try {
    await action;
  } catch (error) {
    if (error instanceof RedirectError) return error.path;
    throw error;
  }

  throw new Error('Expected the action to redirect');
}

function createFormData(entries: Record<string, string | File>) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(entries)) {
    formData.append(key, value);
  }

  return formData;
}

function createImageFile(bytes = 1024, type = 'image/png') {
  return new File([new Uint8Array(bytes)], 'photo.png', { type });
}

describe('Site image Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation((path: string) => {
      throw new RedirectError(path);
    });
    mocks.requireAdminSection.mockResolvedValue({
      id: 1,
      isSuperAdmin: true,
      permissions: {},
      username: 'root',
    });
    mocks.getAdminApiErrorMessage.mockResolvedValue('Backend error');
  });

  it('checks the admin session, forwards the slot max dimension and invalidates', async () => {
    mocks.adminApiFetch.mockResolvedValue(Response.json({}));

    await expect(
      captureRedirect(
        uploadSiteImageAction(
          idle,
          createFormData({ locale: 'ru', key: 'home-hero', file: createImageFile() }),
        ),
      ),
    ).resolves.toBe('/ru/admin/site-images?status=updated&key=home-hero');

    expect(mocks.requireAdminSection).toHaveBeenCalledWith('ru', 'site-images', 'manage');

    const [path, init] = mocks.adminApiFetch.mock.calls[0] as [string, RequestInit];
    expect(path).toBe('/api/site-images/home-hero');
    expect(init.method).toBe('PUT');
    expect((init.body as FormData).get('maxDimension')).toBe('1920');

    expect(mocks.updateTag).toHaveBeenCalledWith('site-images');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/ru', 'layout');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/en', 'layout');
  });

  it('refuses a key that is not in the slot registry', async () => {
    await expect(
      uploadSiteImageAction(
        idle,
        createFormData({ locale: 'ru', key: 'home-hero-2', file: createImageFile() }),
      ),
    ).resolves.toMatchObject({ status: 'error' });

    expect(mocks.adminApiFetch).not.toHaveBeenCalled();
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });

  it('rejects an unsupported file type before contacting the backend', async () => {
    const result = await uploadSiteImageAction(
      idle,
      createFormData({
        locale: 'ru',
        key: 'home-hero',
        file: new File([new Uint8Array(16)], 'doc.pdf', { type: 'application/pdf' }),
      }),
    );

    expect(result.status).toBe('error');
    expect(result.fieldErrors?.file).toBeTruthy();
    expect(mocks.adminApiFetch).not.toHaveBeenCalled();
  });

  it('rejects a file over the 5 MB ceiling before contacting the backend', async () => {
    const result = await uploadSiteImageAction(
      idle,
      createFormData({
        locale: 'ru',
        key: 'home-hero',
        file: createImageFile(5 * 1024 * 1024 + 1),
      }),
    );

    expect(result.status).toBe('error');
    expect(result.fieldErrors?.file).toBeTruthy();
    expect(mocks.adminApiFetch).not.toHaveBeenCalled();
  });

  it('does not invalidate after an unsuccessful backend response', async () => {
    mocks.adminApiFetch.mockResolvedValue(Response.json({ message: 'failed' }, { status: 500 }));

    await expect(
      uploadSiteImageAction(
        idle,
        createFormData({ locale: 'ru', key: 'home-hero', file: createImageFile() }),
      ),
    ).resolves.toMatchObject({ status: 'error', key: 'home-hero' });

    expect(mocks.updateTag).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it('invalidates after a successful reset', async () => {
    mocks.adminApiFetch.mockResolvedValue(Response.json({}));

    await expect(
      captureRedirect(resetSiteImageAction(createFormData({ locale: 'ru', key: 'contact-modal' }))),
    ).resolves.toBe('/ru/admin/site-images?status=reset&key=contact-modal');

    expect(mocks.requireAdminSection).toHaveBeenCalledWith('ru', 'site-images', 'manage');
    expect(mocks.adminApiFetch).toHaveBeenCalledWith(
      '/api/site-images/contact-modal',
      expect.objectContaining({ method: 'DELETE' }),
    );
    expect(mocks.updateTag).toHaveBeenCalledWith('site-images');
  });

  it('reports the backend message instead of resetting on a failed delete', async () => {
    mocks.adminApiFetch.mockResolvedValue(Response.json({ message: 'nope' }, { status: 500 }));

    await expect(
      captureRedirect(resetSiteImageAction(createFormData({ locale: 'ru', key: 'contact-modal' }))),
    ).resolves.toBe('/ru/admin/site-images?error=Backend+error');

    expect(mocks.updateTag).not.toHaveBeenCalled();
  });
});
