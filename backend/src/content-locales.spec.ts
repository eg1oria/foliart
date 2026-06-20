import {
  isSupportedContentLocale,
  normalizeContentLocale,
} from './content-locales';

describe('content locales', () => {
  it.each(['ru', 'en', 'fr', 'es'])('supports %s', (locale) => {
    expect(isSupportedContentLocale(locale)).toBe(true);
  });

  it('rejects unsupported write locales while preserving the public fallback', () => {
    expect(isSupportedContentLocale('de')).toBe(false);
    expect(isSupportedContentLocale('invalid-locale')).toBe(false);
    expect(normalizeContentLocale('invalid-locale')).toBe('ru');
  });
});
