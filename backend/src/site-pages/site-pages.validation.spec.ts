import { BadRequestException } from '@nestjs/common';
import {
  MAX_SITE_PAGE_HTML_BYTES,
  parseSitePageLocale,
  parseSitePageSettingsBody,
  parseSitePageSlug,
  parseSitePageTranslationBody,
} from './site-pages.validation';

describe('site page validation', () => {
  it('accepts a lowercase hyphenated address', () => {
    expect(parseSitePageSlug('  Spring-Sale-2026 ')).toBe('spring-sale-2026');
  });

  it('rejects addresses the URL cannot carry as is', () => {
    for (const value of ['', 'весна', 'a b', 'a--b', '-a', 'a/b', 'a.html']) {
      expect(() => parseSitePageSlug(value)).toThrow(BadRequestException);
    }
  });

  it('rejects the names of existing site sections', () => {
    for (const value of ['catalog', 'articles', 'admin', 'page-frame']) {
      expect(() => parseSitePageSlug(value)).toThrow(BadRequestException);
    }
  });

  it('caps the address length', () => {
    expect(() => parseSitePageSlug('a'.repeat(81))).toThrow(
      BadRequestException,
    );
  });

  it('falls back to the embedded mode and the navy band with a title', () => {
    expect(parseSitePageSettingsBody({ slug: 'promo' })).toEqual({
      slug: 'promo',
      displayMode: 'embedded',
      showTitle: true,
      bandColor: '#0e2438',
    });
    expect(
      parseSitePageSettingsBody({
        slug: 'promo',
        displayMode: 'fullscreen',
        showTitle: 'false',
        bandColor: '#2F5BE0',
      }),
    ).toEqual({
      slug: 'promo',
      displayMode: 'fullscreen',
      showTitle: false,
      bandColor: '#2f5be0',
    });
  });

  it('only accepts a six-digit hex band colour', () => {
    for (const bandColor of ['blue', '#fff', '#12345g', 'url(x)']) {
      expect(() =>
        parseSitePageSettingsBody({ slug: 'promo', bandColor }),
      ).toThrow(BadRequestException);
    }
  });

  it('only accepts the content locales', () => {
    expect(parseSitePageLocale('FR')).toBe('fr');
    expect(() => parseSitePageLocale('de')).toThrow(BadRequestException);
  });

  it('keeps the HTML byte for byte and reads the checkbox', () => {
    const html = '  <div>\n  <script>run()</script>\n</div>\n';

    expect(
      parseSitePageTranslationBody({
        title: ' Promo ',
        description: ' line one\n line two ',
        html,
        published: 'on',
      }),
    ).toEqual({
      title: 'Promo',
      description: 'line one line two',
      html,
      published: true,
    });
  });

  it('saves an unpublished draft without a title', () => {
    expect(parseSitePageTranslationBody({ html: '<p>draft</p>' })).toEqual({
      title: '',
      description: '',
      html: '<p>draft</p>',
      published: false,
    });
  });

  it('refuses to publish an empty page', () => {
    expect(() =>
      parseSitePageTranslationBody({
        title: 'Promo',
        html: '  ',
        published: 'true',
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      parseSitePageTranslationBody({ html: '<p>x</p>', published: 'true' }),
    ).toThrow(BadRequestException);
  });

  it('caps the HTML size', () => {
    expect(() =>
      parseSitePageTranslationBody({
        html: 'x'.repeat(MAX_SITE_PAGE_HTML_BYTES + 1),
      }),
    ).toThrow(BadRequestException);
  });
});
