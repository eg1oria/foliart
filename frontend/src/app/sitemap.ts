import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { getArticles, getCalendars, getCategories, getProducts } from '@/lib/api';
import { getArticleHref } from '@/lib/articles';
import { getCalendarHref } from '@/lib/calendars';
import { getCategoryHref, getProductHref } from '@/lib/catalog';
import { getSiteOrigin } from '@/lib/seo';

export const revalidate = 900;

const staticPublicPaths = ['/', '/about', '/about/partnery', '/articles', '/calendar', '/catalog', '/contacts', '/privacy'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteOrigin = getSiteOrigin();
  const now = new Date();

  const staticEntries = routing.locales.flatMap((locale) =>
    staticPublicPaths.map((path) => ({
      url: `${siteOrigin}${path === '/' ? `/${locale}` : `/${locale}${path}`}`,
      lastModified: now,
    })),
  );

  const dynamicEntries = await Promise.all(
    routing.locales.map(async (locale) => {
      const [categories, products, articles, calendars] = await Promise.all([
        getCategories(locale).catch(() => []),
        getProducts(undefined, locale).catch(() => []),
        getArticles(locale).catch(() => []),
        getCalendars(locale).catch(() => []),
      ]);

      const categoriesById = new Map(categories.map((category) => [category.id, category]));

      const categoryEntries = categories.map((category) => ({
        url: `${siteOrigin}/${locale}${getCategoryHref(category)}`,
        lastModified: now,
      }));

      const productEntries = products.flatMap((product) => {
        const category = categoriesById.get(product.categoryId);

        if (!category) {
          return [];
        }

        return [
          {
            url: `${siteOrigin}/${locale}${getProductHref(category, product)}`,
            lastModified: now,
          },
        ];
      });

      const articleEntries = articles.map((article) => ({
        url: `${siteOrigin}/${locale}${getArticleHref(article)}`,
        lastModified: new Date(article.publishedAt),
      }));

      const calendarEntries = calendars.map((calendar) => ({
        url: `${siteOrigin}/${locale}${getCalendarHref(calendar)}`,
        lastModified: now,
      }));

      return [...categoryEntries, ...productEntries, ...articleEntries, ...calendarEntries];
    }),
  );

  return [...staticEntries, ...dynamicEntries.flat()];
}
