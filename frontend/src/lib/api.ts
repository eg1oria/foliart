import { PUBLIC_REVALIDATE_SECONDS } from './seo';

export type AdminTranslationBase = {
  hasTranslation: boolean;
  isComplete: boolean;
  locale: string;
};

export type CategoryAdminTranslation = AdminTranslationBase & {
  name: string;
  description: string;
};

export type ProductAdminTranslation = AdminTranslationBase & {
  name: string;
  description: string;
  advantages: string;
  composition: string;
  application: string;
};

export type ArticleAdminTranslation = AdminTranslationBase & {
  title: string;
  excerpt: string;
  content: string;
};

export type CalendarAdminTranslation = AdminTranslationBase & {
  title: string;
  description: string;
};

export type Category = {
  id: number;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  imageUrl: string;
  productCount: number;
  slugSourceName?: string;
  adminTranslation?: CategoryAdminTranslation;
};

export type Product = {
  id: number;
  categoryId: number;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  advantages: string;
  advantagesEn: string;
  composition: string;
  compositionEn: string;
  application: string;
  applicationEn: string;
  imageUrl: string;
  imageUrlEn: string;
  slugSourceName?: string;
  adminTranslation?: ProductAdminTranslation;
};

export type Article = {
  id: number;
  title: string;
  titleEn: string;
  excerpt: string;
  excerptEn: string;
  content: string;
  contentEn: string;
  imageUrl: string;
  publishedAt: string;
  viewCount: number;
  slugSourceTitle?: string;
  adminTranslation?: ArticleAdminTranslation;
};

export type CalendarEntry = {
  id: number;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  imageUrl1: string;
  imageUrl2: string;
  imageUrl3: string;
  imageUrl4: string;
  imageUrls: string[];
  slugSourceTitle?: string;
  adminTranslation?: CalendarAdminTranslation;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const baseUrl = process.env.BACKEND_URL ?? 'http://localhost:3001';
export type ApiFetchOptions = RequestInit & {
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
};

export const publicApiFetchOptions: ApiFetchOptions = {
  next: {
    revalidate: PUBLIC_REVALIDATE_SECONDS,
  },
};

export const noStoreApiFetchOptions: ApiFetchOptions = {
  cache: 'no-store',
};

function resolveFetchOptions(fetchOptions?: ApiFetchOptions): ApiFetchOptions {
  return fetchOptions ?? publicApiFetchOptions;
}

async function fetchJson<T>(path: string, fetchOptions?: ApiFetchOptions): Promise<T> {
  let res: Response;

  try {
    res = await fetch(`${baseUrl}${path}`, resolveFetchOptions(fetchOptions));
  } catch {
    throw new ApiError(`Failed to fetch ${path}`, 503);
  }

  if (!res.ok) {
    throw new ApiError(`Failed to fetch ${path}`, res.status);
  }

  return res.json() as Promise<T>;
}

function appendSearchParam(path: string, name: string, value?: string) {
  if (!value) {
    return path;
  }

  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}${name}=${encodeURIComponent(value)}`;
}

function buildLocalizedPath(path: string, locale?: string, contentLocale?: string) {
  const localizedPath = appendSearchParam(path, 'locale', locale);
  return appendSearchParam(localizedPath, 'contentLocale', contentLocale);
}

export async function getCategories(
  locale?: string,
  fetchOptions?: ApiFetchOptions,
  contentLocale?: string,
): Promise<Category[]> {
  return fetchJson<Category[]>(
    buildLocalizedPath('/api/categories', locale, contentLocale),
    fetchOptions,
  );
}

export async function getCategory(
  categoryId: number,
  locale?: string,
  fetchOptions?: ApiFetchOptions,
  contentLocale?: string,
): Promise<Category> {
  return fetchJson<Category>(
    buildLocalizedPath(`/api/categories/${categoryId}`, locale, contentLocale),
    fetchOptions,
  );
}

export async function getProducts(
  categoryId?: number,
  locale?: string,
  fetchOptions?: ApiFetchOptions,
  contentLocale?: string,
): Promise<Product[]> {
  const path = categoryId ? `/api/products?categoryId=${categoryId}` : '/api/products';
  const url = `${baseUrl}${buildLocalizedPath(path, locale, contentLocale)}`;
  let res: Response;

  try {
    res = await fetch(url, resolveFetchOptions(fetchOptions));
  } catch {
    throw new ApiError('Failed to fetch products', 503);
  }

  if (!res.ok) {
    throw new ApiError('Failed to fetch products', res.status);
  }
  return (await res.json()) as Product[];
}

export async function getProduct(
  productId: number,
  locale?: string,
  fetchOptions?: ApiFetchOptions,
  contentLocale?: string,
): Promise<Product> {
  return fetchJson<Product>(
    buildLocalizedPath(`/api/products/${productId}`, locale, contentLocale),
    fetchOptions,
  );
}

export async function getArticles(
  locale?: string,
  fetchOptions?: ApiFetchOptions,
  contentLocale?: string,
): Promise<Article[]> {
  return fetchJson<Article[]>(
    buildLocalizedPath('/api/articles', locale, contentLocale),
    fetchOptions,
  );
}

export async function getArticle(
  articleId: number,
  locale?: string,
  fetchOptions?: ApiFetchOptions,
  contentLocale?: string,
): Promise<Article> {
  return fetchJson<Article>(
    buildLocalizedPath(`/api/articles/${articleId}`, locale, contentLocale),
    fetchOptions,
  );
}

export async function getCalendars(
  locale?: string,
  fetchOptions?: ApiFetchOptions,
  contentLocale?: string,
): Promise<CalendarEntry[]> {
  return fetchJson<CalendarEntry[]>(
    buildLocalizedPath('/api/calendars', locale, contentLocale),
    fetchOptions,
  );
}

export async function getCalendar(
  calendarId: number,
  locale?: string,
  fetchOptions?: ApiFetchOptions,
  contentLocale?: string,
): Promise<CalendarEntry> {
  return fetchJson<CalendarEntry>(
    buildLocalizedPath(`/api/calendars/${calendarId}`, locale, contentLocale),
    fetchOptions,
  );
}
