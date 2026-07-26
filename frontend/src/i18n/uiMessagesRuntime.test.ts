import { describe, expect, it, vi } from 'vitest';
import type { UiMessagesApiResponse } from './uiMessages';
import {
  createUiMessagesCachedLoaders,
  createUiMessagesFailureShield,
  type UiMessagesCacheFactory,
} from './uiMessagesRuntime';

const emptyResponse: UiMessagesApiResponse = {
  locale: 'ru',
  messages: null,
  revision: 0,
  updatedAt: null,
};

describe('UI messages runtime cache', () => {
  it('creates a separate 900-second cache tag for every locale', () => {
    const calls: Array<{
      keyParts: string[];
      options: { revalidate: number; tags: string[] };
    }> = [];
    const cacheFactory: UiMessagesCacheFactory = (
      callback,
      keyParts,
      options,
    ) => {
      calls.push({ keyParts, options });
      return callback;
    };
    createUiMessagesCachedLoaders(
      async (locale) => ({ ...emptyResponse, locale }),
      cacheFactory,
    );

    expect(calls).toEqual([
      {
        keyParts: ['foliart-ui-messages', 'ru'],
        options: { revalidate: 900, tags: ['ui-messages:ru'] },
      },
      {
        keyParts: ['foliart-ui-messages', 'en'],
        options: { revalidate: 900, tags: ['ui-messages:en'] },
      },
      {
        keyParts: ['foliart-ui-messages', 'fr'],
        options: { revalidate: 900, tags: ['ui-messages:fr'] },
      },
      {
        keyParts: ['foliart-ui-messages', 'es'],
        options: { revalidate: 900, tags: ['ui-messages:es'] },
      },
    ]);
  });

  it('shields repeated failures for 60 seconds', async () => {
    let now = 1_000;
    const loadRu = vi.fn().mockRejectedValue(new Error('offline'));
    const shield = createUiMessagesFailureShield(
      {
        ru: loadRu,
        en: vi.fn(),
        fr: vi.fn(),
        es: vi.fn(),
      },
      { now: () => now },
    );

    await expect(shield.get('ru')).resolves.toBeNull();
    await expect(shield.get('ru')).resolves.toBeNull();
    expect(loadRu).toHaveBeenCalledTimes(1);

    now += 60_001;
    await expect(shield.get('ru')).resolves.toBeNull();
    expect(loadRu).toHaveBeenCalledTimes(2);
  });

  it('serves last-known-good during a later backend failure', async () => {
    let now = 1_000;
    const saved: UiMessagesApiResponse = {
      ...emptyResponse,
      messages: { Home: { title: 'Saved' } },
      revision: 1,
    };
    const loadRu = vi
      .fn()
      .mockResolvedValueOnce(saved)
      .mockRejectedValueOnce(new Error('offline'));
    const shield = createUiMessagesFailureShield(
      {
        ru: loadRu,
        en: vi.fn(),
        fr: vi.fn(),
        es: vi.fn(),
      },
      { now: () => now },
    );

    await expect(shield.get('ru')).resolves.toEqual(saved);
    now += 60_001;
    await expect(shield.get('ru')).resolves.toEqual(saved);
    await expect(shield.get('ru')).resolves.toEqual(saved);
    expect(loadRu).toHaveBeenCalledTimes(2);
  });
});
