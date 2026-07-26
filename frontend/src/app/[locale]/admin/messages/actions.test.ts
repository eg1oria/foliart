import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getBundledUiMessages } from '@/i18n/uiMessages';

const mocks = vi.hoisted(() => ({
  adminApiFetch: vi.fn(),
  getAdminApiErrorMessage: vi.fn(),
  prime: vi.fn(),
  requireAdminSession: vi.fn(),
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
  updateTag: mocks.updateTag,
}));
vi.mock('@/lib/adminApi', () => ({
  getAdminApiHeaders: () => ({ 'x-admin-secret': 'server-secret' }),
}));
vi.mock('@/lib/adminBackend', () => ({
  adminApiFetch: mocks.adminApiFetch,
  getAdminApiErrorMessage: mocks.getAdminApiErrorMessage,
}));
vi.mock('@/lib/adminAuthServer', () => ({
  requireAdminSession: mocks.requireAdminSession,
}));
vi.mock('@/i18n/uiMessagesServer', () => ({
  primeUiMessagesLastKnownGood: mocks.prime,
}));

import {
  resetUiMessagesAction,
  saveUiMessagesAction,
  type UiMessagesActionState,
} from './actions';

const idle: UiMessagesActionState = { status: 'idle' };

function successResponse(
  locale: 'ru' | 'en' = 'ru',
  messages: unknown = getBundledUiMessages(locale),
) {
  return Response.json({
    locale,
    messages,
    revision: 1,
    updatedAt: '2026-07-26T12:00:00.000Z',
  });
}

describe('UI messages Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdminSession.mockResolvedValue(undefined);
    mocks.getAdminApiErrorMessage.mockResolvedValue('Backend error');
  });

  it('checks the admin session and invalidates only the edited locale after save', async () => {
    mocks.adminApiFetch.mockResolvedValue(successResponse('en'));

    await expect(
      saveUiMessagesAction(idle, {
        adminLocale: 'ru',
        expectedRevision: 0,
        messages: getBundledUiMessages('en'),
        targetLocale: 'en',
      }),
    ).resolves.toMatchObject({ status: 'success', revision: 1 });

    expect(mocks.requireAdminSession).toHaveBeenCalledWith('ru');
    expect(mocks.updateTag).toHaveBeenCalledWith('ui-messages:en');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/en', 'layout');
    expect(mocks.prime).toHaveBeenCalledTimes(1);
  });

  it.each([
    new Response(null, { status: 409 }),
    Response.json({ message: 'failed' }, { status: 500 }),
  ])('does not invalidate after an unsuccessful backend response', async (response) => {
    mocks.adminApiFetch.mockResolvedValue(response);

    const result = await saveUiMessagesAction(idle, {
      adminLocale: 'ru',
      expectedRevision: 0,
      messages: getBundledUiMessages('ru'),
      targetLocale: 'ru',
    });

    expect(['conflict', 'error']).toContain(result.status);
    expect(mocks.updateTag).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(mocks.prime).not.toHaveBeenCalled();
  });

  it('returns key-specific ICU errors without contacting backend', async () => {
    const messages = structuredClone(getBundledUiMessages('ru'));
    const privacy = messages.Privacy as {
      sections: { general: { items: string[] } };
    };
    privacy.sections.general.items[1] =
      'Ссылка <unknown>https://foliart.me</unknown>';

    const result = await saveUiMessagesAction(idle, {
      adminLocale: 'ru',
      expectedRevision: 0,
      messages,
      targetLocale: 'ru',
    });

    expect(result.status).toBe('error');
    expect(result.fieldErrors).toHaveProperty(
      JSON.stringify(['Privacy', 'sections', 'general', 'items', 1]),
    );
    expect(mocks.adminApiFetch).not.toHaveBeenCalled();
  });

  it('invalidates after a successful protected reset', async () => {
    mocks.adminApiFetch.mockResolvedValue(successResponse('ru', null));

    await expect(
      resetUiMessagesAction(idle, {
        adminLocale: 'ru',
        expectedRevision: 0,
        targetLocale: 'ru',
      }),
    ).resolves.toMatchObject({ status: 'success', revision: 1 });

    expect(mocks.updateTag).toHaveBeenCalledWith('ui-messages:ru');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/ru', 'layout');
  });
});
