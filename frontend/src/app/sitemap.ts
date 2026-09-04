import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { getArticles, getCalendars, getCategories, getProducts } from '@/lib/api';
import { getArticleHref } from '@/lib/articles';
import { getCalendarHref } from '@/lib/calendars';
import { getCategoryHref, getProductHref } from '@/lib/catalog';
import { getSiteOrigin, getLocalizedPath } from '@/lib/seo';

// Rendered per request rather than prerendered. Under ISR this route was baked
// into the image at `docker build` time, where the backend is not on the network
// yet — so every deploy shipped a sitemap holding only the static paths below
// and served it until the first revalidation, telling crawlers that every
// product, article and calendar page had disappeared. Generating on demand means
// the file can only ever be built from a live answer.
//
// `force-dynamic` implies `fetchCache = 'force-no-store'`, so the 900s cache that
// `publicApiFetchOptions` puts on these four calls does not apply here and each
// request reaches the backend. That is deliberate and cheap: only crawlers fetch
// this route, a handful of times a day.
export const dynamic = 'force-dynamic';

const staticPublicPaths = [
  '/',
  '/about',
  '/about/partnery',
  '/articles',
  '/calendar',
  '/catalog',
  '/contacts',
  '/privacy',
  '/search',
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

  // Загружаем данные только один раз для defaultLocale — hrefs одинаковые для всех локалей.
  // Ошибку намеренно не глушим: пустой ответ здесь неотличим от «раздела больше нет»,
  // и краулер получил бы 200 с sitemap, где не хватает большей части сайта. Пусть
  // лучше маршрут отдаст 5xx — поисковики просто повторят запрос позже.
  const [categories, products, articles, calendars] = await Promise.all([
    getCategories(routing.defaultLocale),
    getProducts(undefined, routing.defaultLocale),
    getArticles(routing.defaultLocale),
    getCalendars(routing.defaultLocale),
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
