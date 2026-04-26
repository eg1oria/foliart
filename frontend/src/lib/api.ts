import { PUBLIC_REVALIDATE_SECONDS } from './seo';

export type Category = {
  id: number;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  imageUrl: string;
  productCount: number;
  slugSourceName?: string;
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
  slugSourceName?: string;
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

function buildLocalizedPath(path: string, locale?: string) {
  if (!locale) {
    return path;
  }

  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}locale=${encodeURIComponent(locale)}`;
}

export async function getCategories(
  locale?: string,
  fetchOptions?: ApiFetchOptions,
): Promise<Category[]> {
  return fetchJson<Category[]>(buildLocalizedPath('/api/categories', locale), fetchOptions);
}

export async function getCategory(
  categoryId: number,
  locale?: string,
  fetchOptions?: ApiFetchOptions,
): Promise<Category> {
  return fetchJson<Category>(
    buildLocalizedPath(`/api/categories/${categoryId}`, locale),
    fetchOptions,
  );
}

export async function getProducts(
  categoryId?: number,
  locale?: string,
  fetchOptions?: ApiFetchOptions,
): Promise<Product[]> {
  const path = categoryId ? `/api/products?categoryId=${categoryId}` : '/api/products';
  const url = `${baseUrl}${buildLocalizedPath(path, locale)}`;
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
): Promise<Product> {
  return fetchJson<Product>(buildLocalizedPath(`/api/products/${productId}`, locale), fetchOptions);
}

export async function getArticles(
  locale?: string,
  fetchOptions?: ApiFetchOptions,
): Promise<Article[]> {
  return fetchJson<Article[]>(buildLocalizedPath('/api/articles', locale), fetchOptions);
}

export async function getArticle(
  articleId: number,
  locale?: string,
  fetchOptions?: ApiFetchOptions,
): Promise<Article> {
  return fetchJson<Article>(
    buildLocalizedPath(`/api/articles/${articleId}`, locale),
    fetchOptions,
  );
}

export async function getCalendars(
  locale?: string,
  fetchOptions?: ApiFetchOptions,
): Promise<CalendarEntry[]> {
  return fetchJson<CalendarEntry[]>(buildLocalizedPath('/api/calendars', locale), fetchOptions);
}

export async function getCalendar(
  calendarId: number,
  locale?: string,
  fetchOptions?: ApiFetchOptions,
): Promise<CalendarEntry> {
  return fetchJson<CalendarEntry>(
    buildLocalizedPath(`/api/calendars/${calendarId}`, locale),
    fetchOptions,
  );
}
