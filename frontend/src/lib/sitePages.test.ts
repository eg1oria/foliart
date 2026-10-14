import { describe, expect, it } from 'vitest';

import {
  getSitePageLocaleStates,
  isLightSitePageBandColor,
  isSitePageSlug,
  normalizeSitePageBandColor,
  validateSitePageSlug,
} from './sitePages';

describe('site pages', () => {
  it('accepts a lowercase hyphenated address', () => {
    expect(validateSitePageSlug('spring-sale-2026')).toBeNull();
    expect(isSitePageSlug('spring-sale-2026')).toBe(true);
  });

  it('rejects addresses the URL cannot carry and taken section names', () => {
    for (const slug of ['', 'Весна', 'a b', 'a--b', '-a', 'a'.repeat(81), 'catalog', 'admin']) {
      expect(validateSitePageSlug(slug)).not.toBeNull();
    }

    expect(isSitePageSlug('wp-login.php')).toBe(false);
  });

  it('reports each language as published, draft or empty', () => {
    expect(
      getSitePageLocaleStates([
        { locale: 'ru', published: true },
        { locale: 'fr', published: false },
      ]),
    ).toEqual({ ru: 'published', en: 'empty', fr: 'draft', es: 'empty' });
  });

  it('falls back to the site navy for a missing or malformed band colour', () => {
    expect(normalizeSitePageBandColor('#2F5BE0')).toBe('#2f5be0');
    expect(normalizeSitePageBandColor('red')).toBe('#0e2438');
    expect(normalizeSitePageBandColor(undefined)).toBe('#0e2438');
  });

  it('flags band colours too light for the white header', () => {
    expect(isLightSitePageBandColor('#0e2438')).toBe(false);
    expect(isLightSitePageBandColor('#2f5be0')).toBe(false);
    expect(isLightSitePageBandColor('#ffffff')).toBe(true);
    expect(isLightSitePageBandColor('#ffd400')).toBe(true);
  });
});
