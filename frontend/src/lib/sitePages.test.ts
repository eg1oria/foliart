import { describe, expect, it } from 'vitest';

import { getSitePageLocaleStates, isSitePageSlug, validateSitePageSlug } from './sitePages';

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
});
