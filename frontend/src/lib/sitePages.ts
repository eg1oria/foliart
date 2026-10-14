import { contentLocales, type ContentLocale } from './contentLocales';

export const sitePageDisplayModes = ['embedded', 'fullscreen'] as const;
export type SitePageDisplayMode = (typeof sitePageDisplayModes)[number];

/** The site's navy — what the band under the header shows by default. */
export const defaultSitePageBandColor = '#0e2438';
export const sitePageBandColorPattern = /^#[0-9a-f]{6}$/i;

export const maxSitePageSlugLength = 80;
export const maxSitePageTitleLength = 200;
export const recommendedSitePageDescriptionLength = 160;
export const maxSitePageDescriptionLength = 500;
export const maxSitePageHtmlBytes = 2 * 1024 * 1024;

export const sitePageSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Mirrors `RESERVED_SITE_PAGE_SLUGS` in the backend: a page under one of the
 * site's own section names could never be opened, the section wins the route.
 */
export const reservedSitePageSlugs: readonly string[] = [
  'about',
  'admin',
  'admin-api',
  'api',
  'articles',
  'calendar',
  'catalog',
  'contacts',
  'habits',
  'healthz',
  'images',
  'lang',
  'media',
  'page-frame',
  'privacy',
  'robots',
  'search',
  'search-index',
  'sitemap',
];

/** What the public page and the frame route get for one published language. */
export type PublishedSitePage = {
  slug: string;
  displayMode: SitePageDisplayMode;
  showTitle: boolean;
  bandColor: string;
  locale: ContentLocale;
  title: string;
  description: string;
  html: string;
  updatedAt: string;
  publishedLocales: ContentLocale[];
};

export type PublishedSitePageSummary = {
  slug: string;
  locales: ContentLocale[];
  updatedAt: string | null;
};

export type SitePageTranslation = {
  locale: ContentLocale;
  title: string;
  description: string;
  html: string;
  published: boolean;
  updatedAt: string;
};

export type SitePageImage = {
  id: number;
  imageUrl: string;
  originalName: string;
  width: number;
  height: number;
  byteSize: number;
  createdAt: string;
};

export type SitePageListItem = {
  id: number;
  slug: string;
  displayMode: SitePageDisplayMode;
  showTitle: boolean;
  bandColor: string;
  createdAt: string;
  updatedAt: string;
  translations: Array<Pick<SitePageTranslation, 'locale' | 'title' | 'published' | 'updatedAt'>>;
};

export type SitePageDetails = Omit<SitePageListItem, 'translations'> & {
  translations: SitePageTranslation[];
  images: SitePageImage[];
};

export type SitePageLocaleState = 'published' | 'draft' | 'empty';

export function isSitePageSlug(value: string) {
  return value.length <= maxSitePageSlugLength && sitePageSlugPattern.test(value);
}

export function normalizeSitePageDisplayMode(value: unknown): SitePageDisplayMode {
  return sitePageDisplayModes.includes(value as SitePageDisplayMode)
    ? (value as SitePageDisplayMode)
    : 'embedded';
}

/** Russian message for the admin form, or `null` when the address is fine. */
export function validateSitePageSlug(slug: string) {
  if (!slug) {
    return 'Укажите адрес страницы.';
  }

  if (slug.length > maxSitePageSlugLength) {
    return `Адрес — не длиннее ${maxSitePageSlugLength} символов.`;
  }

  if (!sitePageSlugPattern.test(slug)) {
    return 'Только латинские буквы, цифры и одиночные дефисы, например «vesennyaya-akciya».';
  }

  if (reservedSitePageSlugs.includes(slug)) {
    return `Адрес «${slug}» уже занят разделом сайта.`;
  }

  return null;
}

/** The stored colour when it is a valid hex, the site's navy otherwise. */
export function normalizeSitePageBandColor(value: unknown) {
  return typeof value === 'string' && sitePageBandColorPattern.test(value.trim())
    ? value.trim().toLowerCase()
    : defaultSitePageBandColor;
}

/**
 * The site header is drawn in white over the band, so a light band would hide
 * it. Relative luminance per WCAG: above 0.3, white text falls below 3:1.
 */
export function isLightSitePageBandColor(color: string) {
  const hex = normalizeSitePageBandColor(color).slice(1);
  const [r, g, b] = [0, 2, 4].map((index) => {
    const channel = Number.parseInt(hex.slice(index, index + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.3;
}

export function getSitePageHref(slug: string) {
  return `/${slug}`;
}

export function getSitePageFramePath(locale: string, slug: string) {
  return `/page-frame/${locale}/${slug}`;
}

export function getSitePageLocaleStates(
  translations: ReadonlyArray<Pick<SitePageTranslation, 'locale' | 'published'>>,
): Record<ContentLocale, SitePageLocaleState> {
  return Object.fromEntries(
    contentLocales.map((locale) => {
      const translation = translations.find((item) => item.locale === locale);
      return [locale, translation ? (translation.published ? 'published' : 'draft') : 'empty'];
    }),
  ) as Record<ContentLocale, SitePageLocaleState>;
}
