export const DEFAULT_CONTENT_LOCALE = 'ru';
export const LEGACY_ENGLISH_CONTENT_LOCALE = 'en';
export const SUPPORTED_CONTENT_LOCALES = ['ru', 'en', 'fr', 'es'] as const;

export type ContentLocale = (typeof SUPPORTED_CONTENT_LOCALES)[number];

const contentLocalePattern = /^[a-z]{2}(?:-[a-z0-9]{2,8})?$/i;

export function normalizeContentLocale(value?: string | null) {
  const normalized = value?.trim().toLowerCase();

  if (!normalized || !contentLocalePattern.test(normalized)) {
    return DEFAULT_CONTENT_LOCALE;
  }

  return normalized;
}

export function isSupportedContentLocale(
  value?: string | null,
): value is ContentLocale {
  const normalized = value?.trim().toLowerCase();

  return SUPPORTED_CONTENT_LOCALES.includes(normalized as ContentLocale);
}

export function isDefaultContentLocale(locale: string) {
  return normalizeContentLocale(locale) === DEFAULT_CONTENT_LOCALE;
}

export function isLegacyEnglishContentLocale(locale: string) {
  return normalizeContentLocale(locale) === LEGACY_ENGLISH_CONTENT_LOCALE;
}
