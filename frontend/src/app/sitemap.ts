import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { getArticles, getCalendars, getCategories, getProducts } from '@/lib/api';
import { getArticleHref } from '@/lib/articles';
import { getCalendarHref } from '@/lib/calendars';
import { getCategoryHref, getProductHref } from '@/lib/catalog';
import { getSiteOrigin, getLocalizedPath } from '@/lib/seo';

export const revalidate = 900;

const staticPublicPaths = [
  '/',
  '/about',
  '/about/partnery',
  '/articles',
  '/calendar',
  '/catalog',
  '/contacts',
  '/privacy',
];

function buildAlternates(path: string, siteOrigin: string) {
  return {
    languages: Object.fromEntries(
      routing.locales.map((locale) => [locale, `${siteOrigin}${getLocalizedPath(locale, path)}`]),
    ),
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteOrigin = getSiteOrigin();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = staticPublicPaths.map((path) => ({
    url: `${siteOrigin}${getLocalizedPath(routing.defaultLocale, path)}`,
    lastModified: now,
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1.0 : 0.7,
    alternates: buildAlternates(path, siteOrigin),
  }));

  // Загружаем данные только один раз для defaultLocale — hrefs одинаковые для всех локалей
  const [categories, products, articles, calendars] = await Promise.all([
    getCategories(routing.defaultLocale).catch(() => []),
    getProducts(undefined, routing.defaultLocale).catch(() => []),
    getArticles(routing.defaultLocale).catch(() => []),
    getCalendars(routing.defaultLocale).catch(() => []),
  ]);

  const categoriesById = new Map(categories.map((c) => [c.id, c]));

  const categoryEntries: MetadataRoute.Sitemap = categories.map((category) => {
    const path = getCategoryHref(category);
    return {
      url: `${siteOrigin}${getLocalizedPath(routing.defaultLocale, path)}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
      alternates: buildAlternates(path, siteOrigin),
    };
  });

  const productEntries: MetadataRoute.Sitemap = products.flatMap((product) => {
    const category = categoriesById.get(product.categoryId);
    if (!category) return [];
    const path = getProductHref(category, product);
    return [
      {
        url: `${siteOrigin}${getLocalizedPath(routing.defaultLocale, path)}`,
        lastModified: now,
        changeFrequency: 'monthly' as const,
        priority: 0.8,
        alternates: buildAlternates(path, siteOrigin),
      },
    ];
  });

  const articleEntries: MetadataRoute.Sitemap = articles.map((article) => {
    const path = getArticleHref(article);
    return {
      url: `${siteOrigin}${getLocalizedPath(routing.defaultLocale, path)}`,
      lastModified: new Date(article.publishedAt),
      changeFrequency: 'yearly',
      priority: 0.6,
      alternates: buildAlternates(path, siteOrigin),
    };
  });

  const calendarEntries: MetadataRoute.Sitemap = calendars.map((calendar) => {
    const path = getCalendarHref(calendar);
    return {
      url: `${siteOrigin}${getLocalizedPath(routing.defaultLocale, path)}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
      alternates: buildAlternates(path, siteOrigin),
    };
  });

  return [
    ...staticEntries,
    ...categoryEntries,
    ...productEntries,
    ...articleEntries,
    ...calendarEntries,
  ];
}
