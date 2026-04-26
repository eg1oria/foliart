import type { Metadata } from 'next';
import { routing } from '@/i18n/routing';

export const SITE_NAME = 'Foliart';
export const SITE_URL = new URL(
  process.env.SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    'https://nataliagorlach.kz',
);
export const DEFAULT_OG_IMAGE = '/hero.png';
export const GOOGLE_SITE_VERIFICATION = process.env.GOOGLE_SITE_VERIFICATION?.trim() || undefined;
export const GOOGLE_ANALYTICS_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || undefined;
export const PUBLIC_REVALIDATE_SECONDS = 900;

type SupportedLocale = (typeof routing.locales)[number];

type BuildPageMetadataArgs = {
  locale: string;
  path: string;
  title: string;
  description?: string;
  image?: string | null;
  type?: 'website' | 'article';
};

type BreadcrumbItem = {
  name: string;
  path: string;
};

function normalizePath(path: string) {
  if (!path || path === '/') {
    return '/';
  }

  const normalized = path.startsWith('/') ? path : `/${path}`;
  const withoutTrailingSlash = normalized.replace(/\/+$/, '');
  return withoutTrailingSlash || '/';
}

function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function getLocaleBrand(locale: string) {
  return locale === 'en' ? SITE_NAME : 'Фолиарт';
}

function getLocaleLegalName(locale: string) {
  return locale === 'en' ? 'Astoria LLC' : 'ООО «Астория»';
}

export function getSiteUrl() {
  return new URL(SITE_URL.toString());
}

export function getSiteOrigin() {
  return getSiteUrl().origin;
}

export function getDefaultSiteDescription(locale: string) {
  if (locale === 'en') {
    return 'Foliart develops organo-mineral fertilizer systems for farms with crop nutrition expertise and laboratory-backed agronomy support.';
  }

  return 'Фолиарт разрабатывает органо-минеральные комплексы и системы питания растений для хозяйств с лабораторным сопровождением.';
}

export function buildDocumentTitle(title: string) {
  return `${title} | ${SITE_NAME}`;
}

export function getLocalizedPath(locale: string, path = '/') {
  const normalizedPath = normalizePath(path);
  if (
    routing.locales.some(
      (item) => normalizedPath === `/${item}` || normalizedPath.startsWith(`/${item}/`),
    )
  ) {
    return normalizedPath;
  }

  return normalizedPath === '/' ? `/${locale}` : `/${locale}${normalizedPath}`;
}

export function getOpenGraphLocale(locale: string) {
  return locale === 'en' ? 'en_US' : 'ru_RU';
}

export function stripHtml(value: string) {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

export function trimDescription(value: string, maxLength = 160) {
  const normalized = stripHtml(value).replace(/\s+/g, ' ').trim();

  if (!normalized) {
    return normalized;
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  const sliced = normalized.slice(0, maxLength - 1).trim();
  const lastSpaceIndex = sliced.lastIndexOf(' ');
  const safeSlice = lastSpaceIndex > 60 ? sliced.slice(0, lastSpaceIndex).trim() : sliced;
  return `${safeSlice}…`;
}

export function resolveAbsoluteUrl(pathOrUrl?: string | null) {
  if (!pathOrUrl) {
    return null;
  }

  if (isAbsoluteUrl(pathOrUrl)) {
    return pathOrUrl;
  }

  return new URL(pathOrUrl, getSiteUrl()).toString();
}

export function getOpenGraphImages(image?: string | null) {
  const resolvedImage = resolveAbsoluteUrl(image ?? DEFAULT_OG_IMAGE);

  if (!resolvedImage) {
    return [];
  }

  return [
    {
      url: resolvedImage,
      alt: `${SITE_NAME} social preview image`,
    },
  ];
}

export function buildLocalizedAlternates(locale: string, path: string): NonNullable<Metadata['alternates']> {
  const languages = Object.fromEntries(
    routing.locales.map((item) => [item, getLocalizedPath(item, path)]),
  ) as Record<SupportedLocale, string>;

  return {
    canonical: getLocalizedPath(locale, path),
    languages: {
      ...languages,
      'x-default': getLocalizedPath(routing.defaultLocale, path),
    },
  };
}

export function buildPageMetadata({
  locale,
  path,
  title,
  description,
  image,
  type = 'website',
}: BuildPageMetadataArgs): Metadata {
  const resolvedDescription = trimDescription(description || getDefaultSiteDescription(locale));
  const fullTitle = buildDocumentTitle(title);

  return {
    title,
    description: resolvedDescription,
    alternates: buildLocalizedAlternates(locale, path),
    openGraph: {
      type,
      title: fullTitle,
      description: resolvedDescription,
      url: getLocalizedPath(locale, path),
      siteName: SITE_NAME,
      locale: getOpenGraphLocale(locale),
      alternateLocale: routing.locales
        .filter((item) => item !== locale)
        .map((item) => getOpenGraphLocale(item)),
      images: getOpenGraphImages(image),
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: resolvedDescription,
      images: getOpenGraphImages(image).map((item) => item.url),
    },
  };
}

export function buildOrganizationSchema(locale: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': resolveAbsoluteUrl('/#organization'),
    name: getLocaleBrand(locale),
    alternateName: getLocaleLegalName(locale),
    url: resolveAbsoluteUrl(getLocalizedPath(locale, '/')),
    logo: resolveAbsoluteUrl('/logo-small.webp'),
    email: 'mail@foliart.me',
    telephone: '+79184341891',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'RU',
      addressLocality: locale === 'en' ? 'Krasnodar' : 'Краснодар',
      postalCode: '350072',
      streetAddress:
        locale === 'en'
          ? 'Solnechnaya St., 10/3, office 31, floor 2'
          : 'ул. Солнечная, 10/3, помещ. № 31, этаж 2',
    },
  };
}

export function buildWebsiteSchema(locale: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': resolveAbsoluteUrl('/#website'),
    name: getLocaleBrand(locale),
    url: resolveAbsoluteUrl(getLocalizedPath(locale, '/')),
    inLanguage: locale,
    publisher: {
      '@id': resolveAbsoluteUrl('/#organization'),
    },
  };
}

export function buildBreadcrumbSchema(locale: string, items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: resolveAbsoluteUrl(getLocalizedPath(locale, item.path)),
    })),
  };
}

export function buildArticleSchema(args: {
  locale: string;
  title: string;
  description: string;
  path: string;
  image?: string | null;
  publishedAt: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: args.title,
    description: trimDescription(args.description),
    image: resolveAbsoluteUrl(args.image ?? DEFAULT_OG_IMAGE),
    datePublished: args.publishedAt,
    inLanguage: args.locale,
    mainEntityOfPage: resolveAbsoluteUrl(getLocalizedPath(args.locale, args.path)),
    author: {
      '@id': resolveAbsoluteUrl('/#organization'),
    },
    publisher: {
      '@id': resolveAbsoluteUrl('/#organization'),
    },
  };
}

export function buildProductSchema(args: {
  locale: string;
  id: number;
  name: string;
  description: string;
  path: string;
  image?: string | null;
  categoryName: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    sku: String(args.id),
    name: args.name,
    description: trimDescription(args.description),
    image: resolveAbsoluteUrl(args.image ?? DEFAULT_OG_IMAGE),
    url: resolveAbsoluteUrl(getLocalizedPath(args.locale, args.path)),
    category: args.categoryName,
    brand: {
      '@type': 'Brand',
      name: SITE_NAME,
    },
  };
}

export function stringifyJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
