import 'server-only';

import {
  getArticles,
  getCalendars,
  getCategories,
  getProducts,
  type Article,
  type CalendarEntry,
  type Category,
  type Product,
} from './api';
import { getArticleHref } from './articles';
import { getCalendarHref, getCalendarImages } from './calendars';
import { getCategoryHref, getProductHref } from './catalog';
import { resolveMediaUrl } from './media';
import type { SearchDocument, SearchIndexPayload } from './search';
import { getStaticSearchDocuments } from './searchPages';
import { trimDescription } from './seo';

const summaryLength = 150;
const keywordLength = 120;

function toSummary(value?: string | null) {
  const summary = trimDescription(value ?? '', summaryLength);
  return summary || undefined;
}

function toKeywords(values: Array<string | null | undefined>) {
  const keywords = values
    .map((value) => trimDescription(value ?? '', keywordLength))
    .filter((value): value is string => Boolean(value));

  return keywords.length > 0 ? keywords : undefined;
}

function buildCategoryDocument(category: Category): SearchDocument {
  return {
    id: `category:${category.id}`,
    type: 'category',
    title: category.name,
    href: getCategoryHref(category),
    description: toSummary(category.description),
    image: resolveMediaUrl(category.imageUrl),
  };
}

function buildProductDocument(product: Product, category: Category): SearchDocument {
  return {
    id: `product:${product.id}`,
    type: 'product',
    title: product.name,
    href: getProductHref(category, product),
    description: toSummary(product.description),
    context: category.name,
    image: resolveMediaUrl(product.imageUrl),
    // Composition carries the element names people actually type ("Zn", "бор").
    keywords: toKeywords([category.name, product.composition]),
  };
}

function buildArticleDocument(article: Article): SearchDocument {
  return {
    id: `article:${article.id}`,
    type: 'article',
    title: article.title,
    href: getArticleHref(article),
    description: toSummary(article.excerpt),
    image: resolveMediaUrl(article.imageUrl),
    date: article.publishedAt,
  };
}

function buildCalendarDocument(calendar: CalendarEntry): SearchDocument {
  return {
    id: `calendar:${calendar.id}`,
    type: 'calendar',
    title: calendar.title,
    href: getCalendarHref(calendar),
    description: toSummary(calendar.description),
    image: resolveMediaUrl(getCalendarImages(calendar)[0]),
  };
}

/**
 * Collects every publicly reachable page into one flat list. The whole payload
 * is small enough (tens of documents) to be searched in memory, both on the
 * server for `/search` and in the browser for the header suggestions.
 */
export async function getSearchIndex(locale: string): Promise<SearchIndexPayload> {
  const [categories, products, articles, calendars] = await Promise.all([
    getCategories(locale).catch(() => [] as Category[]),
    getProducts(undefined, locale).catch(() => [] as Product[]),
    getArticles(locale).catch(() => [] as Article[]),
    getCalendars(locale).catch(() => [] as CalendarEntry[]),
  ]);

  const categoriesById = new Map(categories.map((category) => [category.id, category]));

  const documents: SearchDocument[] = [
    ...products.flatMap((product) => {
      const category = categoriesById.get(product.categoryId);
      return category ? [buildProductDocument(product, category)] : [];
    }),
    ...categories.map(buildCategoryDocument),
    ...articles.map(buildArticleDocument),
    ...calendars.map(buildCalendarDocument),
    ...getStaticSearchDocuments(locale),
  ];

  return { locale, documents };
}
