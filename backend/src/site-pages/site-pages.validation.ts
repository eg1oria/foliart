import { BadRequestException } from '@nestjs/common';
import {
  SUPPORTED_CONTENT_LOCALES,
  type ContentLocale,
} from '../content-locales';

export const SITE_PAGE_DISPLAY_MODES = ['embedded', 'fullscreen'] as const;
export type SitePageDisplayMode = (typeof SITE_PAGE_DISPLAY_MODES)[number];

/** The band colour pages get unless the admin picks another — the site's navy. */
export const DEFAULT_SITE_PAGE_BAND_COLOR = '#0e2438';
const bandColorPattern = /^#[0-9a-f]{6}$/;

export const MAX_SITE_PAGE_SLUG_LENGTH = 80;
export const MAX_SITE_PAGE_TITLE_LENGTH = 200;
export const MAX_SITE_PAGE_DESCRIPTION_LENGTH = 500;
/** A landing page with inline styles and scripts; images belong in uploads. */
export const MAX_SITE_PAGE_HTML_BYTES = 2 * 1024 * 1024;

export const sitePageSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * A page lives at `/<locale>/<slug>`, next to the site's own sections. The
 * router would serve the section first, so a page under one of these names
 * could never be opened. The list is mirrored in the frontend's
 * `lib/sitePages.ts`.
 */
export const RESERVED_SITE_PAGE_SLUGS: readonly string[] = [
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

export type SitePageSettingsInput = {
  slug: string;
  displayMode: SitePageDisplayMode;
  showTitle: boolean;
  bandColor: string;
};

export type SitePageTranslationInput = {
  title: string;
  description: string;
  html: string;
  published: boolean;
};

function fail(message: string): never {
  throw new BadRequestException(message);
}

function readString(value: unknown, field: string) {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value !== 'string') {
    fail(`${field} must be a string`);
  }

  return value;
}

function readBody(body: unknown) {
  return body && typeof body === 'object' && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : {};
}

export function parseSitePageLocale(value: unknown): ContentLocale {
  const locale = typeof value === 'string' ? value.trim().toLowerCase() : '';

  if (!SUPPORTED_CONTENT_LOCALES.includes(locale as ContentLocale)) {
    fail('Unsupported locale');
  }

  return locale as ContentLocale;
}

export function parseSitePageSlug(value: unknown) {
  const slug = readString(value, 'slug').trim().toLowerCase();

  if (!slug) {
    fail('Page address is required');
  }

  if (slug.length > MAX_SITE_PAGE_SLUG_LENGTH) {
    fail(
      `Page address must be at most ${MAX_SITE_PAGE_SLUG_LENGTH} characters`,
    );
  }

  if (!sitePageSlugPattern.test(slug)) {
    fail(
      'Page address may only contain latin letters, digits and single hyphens',
    );
  }

  if (RESERVED_SITE_PAGE_SLUGS.includes(slug)) {
    fail(`The address "${slug}" is already used by the site`);
  }

  return slug;
}

function readFlag(value: unknown, field: string, fallback: boolean) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return ['true', 'on', '1'].includes(readString(value, field).trim());
}

export function parseSitePageSettingsBody(
  body: unknown,
): SitePageSettingsInput {
  const source = readBody(body);
  const displayMode = readString(source.displayMode, 'displayMode').trim();
  const bandColor = readString(source.bandColor, 'bandColor')
    .trim()
    .toLowerCase();

  if (bandColor && !bandColorPattern.test(bandColor)) {
    fail('Band colour must be a hex colour like #0e2438');
  }

  return {
    slug: parseSitePageSlug(source.slug),
    displayMode: SITE_PAGE_DISPLAY_MODES.includes(
      displayMode as SitePageDisplayMode,
    )
      ? (displayMode as SitePageDisplayMode)
      : 'embedded',
    // A client that does not know about the band keeps today's look.
    showTitle: readFlag(source.showTitle, 'showTitle', true),
    bandColor: bandColor || DEFAULT_SITE_PAGE_BAND_COLOR,
  };
}

export function parseSitePageTranslationBody(
  body: unknown,
): SitePageTranslationInput {
  const source = readBody(body);
  const title = readString(source.title, 'title').trim();
  const description = readString(source.description, 'description')
    .replace(/\s+/g, ' ')
    .trim();
  const html = readString(source.html, 'html');
  const published = ['true', 'on', '1'].includes(
    readString(source.published, 'published').trim(),
  );

  if (title.length > MAX_SITE_PAGE_TITLE_LENGTH) {
    fail(`Title must be at most ${MAX_SITE_PAGE_TITLE_LENGTH} characters`);
  }

  if (description.length > MAX_SITE_PAGE_DESCRIPTION_LENGTH) {
    fail(
      `Description must be at most ${MAX_SITE_PAGE_DESCRIPTION_LENGTH} characters`,
    );
  }

  if (Buffer.byteLength(html, 'utf8') > MAX_SITE_PAGE_HTML_BYTES) {
    fail('HTML must be no larger than 2 MB');
  }

  if (published && (!title || !html.trim())) {
    fail('A published page needs a title and HTML');
  }

  return { title, description, html, published };
}
