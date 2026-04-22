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
const defaultFetchOptions = {
  cache: 'no-store' as const,
};

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, defaultFetchOptions);
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

export async function getCategories(locale?: string): Promise<Category[]> {
  return fetchJson<Category[]>(buildLocalizedPath('/api/categories', locale));
}

export async function getCategory(categoryId: number, locale?: string): Promise<Category> {
  return fetchJson<Category>(buildLocalizedPath(`/api/categories/${categoryId}`, locale));
}

export async function getProducts(categoryId?: number, locale?: string): Promise<Product[]> {
  const path = categoryId ? `/api/products?categoryId=${categoryId}` : '/api/products';
  const url = `${baseUrl}${buildLocalizedPath(path, locale)}`;
  const res = await fetch(url, defaultFetchOptions);
  if (!res.ok) {
    throw new ApiError('Failed to fetch products', res.status);
  }
  return res.json();
}

export async function getProduct(productId: number, locale?: string): Promise<Product> {
  return fetchJson<Product>(buildLocalizedPath(`/api/products/${productId}`, locale));
}

export async function getArticles(locale?: string): Promise<Article[]> {
  return fetchJson<Article[]>(buildLocalizedPath('/api/articles', locale));
}

export async function getArticle(articleId: number, locale?: string): Promise<Article> {
  return fetchJson<Article>(buildLocalizedPath(`/api/articles/${articleId}`, locale));
}
