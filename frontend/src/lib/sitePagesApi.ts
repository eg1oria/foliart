import 'server-only';

import { getAdminApiHeaders } from './adminApi';
import { adminApiFetch } from './adminBackend';
import type { SitePageDetails, SitePageListItem } from './sitePages';

export type SitePagesResult<T> = { data: T; ok: true } | { ok: false; status: number };

// The admin endpoints sit behind the backend's admin secret, so they go through
// the server-side admin fetch rather than the public, cached `lib/api.ts`.
async function request<T>(path: string): Promise<SitePagesResult<T>> {
  const response = await adminApiFetch(`/api/site-pages${path}`, {
    method: 'GET',
    headers: getAdminApiHeaders(),
  });

  if (!response.ok) {
    return { ok: false, status: response.status };
  }

  return { ok: true, data: (await response.json()) as T };
}

export function listSitePages() {
  return request<SitePageListItem[]>('');
}

export function getSitePageDetails(id: number) {
  return request<SitePageDetails>(`/${id}`);
}
