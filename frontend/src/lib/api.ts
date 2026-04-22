export type Category = {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  productCount: number;
};

export type Product = {
  id: number;
  categoryId: number;
  name: string;
  description: string;
  advantages: string;
  imageUrl: string;
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

export async function getCategories(): Promise<Category[]> {
  return fetchJson<Category[]>('/api/categories');
}

export async function getCategory(categoryId: number): Promise<Category> {
  return fetchJson<Category>(`/api/categories/${categoryId}`);
}

export async function getProducts(categoryId?: number): Promise<Product[]> {
  const url = categoryId
    ? `${baseUrl}/api/products?categoryId=${categoryId}`
    : `${baseUrl}/api/products`;
  const res = await fetch(url, defaultFetchOptions);
  if (!res.ok) {
    throw new ApiError('Failed to fetch products', res.status);
  }
  return res.json();
}

export async function getProduct(productId: number): Promise<Product> {
  return fetchJson<Product>(`/api/products/${productId}`);
}
