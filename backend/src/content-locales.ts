export const DEFAULT_CONTENT_LOCALE = 'ru';
export const LEGACY_ENGLISH_CONTENT_LOCALE = 'en';

const contentLocalePattern = /^[a-z]{2}(?:-[a-z0-9]{2,8})?$/i;

export function normalizeContentLocale(value?: string | null) {
  const normalized = value?.trim().toLowerCase();

  if (!normalized || !contentLocalePattern.test(normalized)) {
    return DEFAULT_CONTENT_LOCALE;
  }

  return normalized;
}

export function isDefaultContentLocale(locale: string) {
  return normalizeContentLocale(locale) === DEFAULT_CONTENT_LOCALE;
}

export function isLegacyEnglishContentLocale(locale: string) {
  return normalizeContentLocale(locale) === LEGACY_ENGLISH_CONTENT_LOCALE;
}
