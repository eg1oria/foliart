import {
  getUiMessagesTag,
  uiMessageLocales,
  type UiMessageLocale,
  type UiMessagesApiResponse,
} from './uiMessages';

export type UiMessagesCachedLoader = () => Promise<UiMessagesApiResponse>;
export type UiMessagesCacheFactory = (
  callback: UiMessagesCachedLoader,
  keyParts: string[],
  options: { revalidate: number; tags: string[] },
) => UiMessagesCachedLoader;

export function createUiMessagesCachedLoaders(
  load: (locale: UiMessageLocale) => Promise<UiMessagesApiResponse>,
  cacheFactory: UiMessagesCacheFactory,
) {
  return Object.fromEntries(
    uiMessageLocales.map((locale) => [
      locale,
      cacheFactory(
        () => load(locale),
        ['foliart-ui-messages', locale],
        {
          revalidate: 900,
          tags: [getUiMessagesTag(locale)],
        },
      ),
    ]),
  ) as Record<UiMessageLocale, UiMessagesCachedLoader>;
}

export function createUiMessagesFailureShield(
  loaders: Record<UiMessageLocale, UiMessagesCachedLoader>,
  options: {
    cooldownMs?: number;
    log?: (locale: UiMessageLocale, error: unknown) => void;
    now?: () => number;
  } = {},
) {
  const cooldownMs = options.cooldownMs ?? 60_000;
  const now = options.now ?? Date.now;
  const lastKnownGood = new Map<UiMessageLocale, UiMessagesApiResponse>();
  const retryAfter = new Map<UiMessageLocale, number>();

  return {
    async get(locale: UiMessageLocale) {
      if ((retryAfter.get(locale) ?? 0) > now()) {
        return lastKnownGood.get(locale) ?? null;
      }
      try {
        const result = await loaders[locale]();
        lastKnownGood.set(locale, result);
        retryAfter.delete(locale);
        return result;
      } catch (error) {
        retryAfter.set(locale, now() + cooldownMs);
        options.log?.(locale, error);
        return lastKnownGood.get(locale) ?? null;
      }
    },
    prime(locale: UiMessageLocale, response: UiMessagesApiResponse) {
      lastKnownGood.set(locale, response);
      retryAfter.delete(locale);
    },
    clear(locale?: UiMessageLocale) {
      if (locale) {
        lastKnownGood.delete(locale);
        retryAfter.delete(locale);
      } else {
        lastKnownGood.clear();
        retryAfter.clear();
      }
    },
  };
}
