import type { SiteImageKey, SiteImageMap } from './siteImages';
import { siteImageSlots } from './siteImages';

const absoluteUrlPattern = /^https?:\/\//i;
const frontendPublicPrefixes = ['catalog-categories/'] as const;
const catalogCategoryLegacyImagePattern =
  /^\/?catalog-categories\/(1|4|5|6)\.(?:jpe?g|png|webp)$/i;
const catalogCategoryImageMap: Record<string, string> = {
  '1': 'category1',
  '5': 'category2',
  '6': 'category3',
  '4': 'category4',
};

export type ResolvedSiteImage = {
  src: string;
  /** Only set once a file has been uploaded for the slot. */
  width: number | null;
  height: number | null;
};

/**
 * A slot with no upload renders the file bundled in `public/`, byte for byte
 * what the site showed before the admin section existed. `width`/`height` are
 * null in that case: the call site keeps its own literals, and only a stored
 * file — which may well have a different ratio — overrides them.
 */
export function resolveSiteImage(images: SiteImageMap, key: SiteImageKey): ResolvedSiteImage {
  const slot = siteImageSlots[key];
  const stored = images[key];
  const storedUrl = stored ? resolveMediaUrl(stored.imageUrl) : null;

  if (!storedUrl) {
    return { src: slot.default, width: null, height: null };
  }

  return {
    src: storedUrl,
    width: stored?.width || null,
    height: stored?.height || null,
  };
}

export function resolveMediaUrl(path?: string | null): string | null {
  const value = path?.trim();
  if (!value) {
    return null;
  }

  if (absoluteUrlPattern.test(value)) {
    return value;
  }

  const normalized = value
    .replace(/\\/g, '/')
    .replace(/^backend\//, '')
    .replace(/^\/+/, '/');
  const catalogCategoryImage = normalized.replace(
    catalogCategoryLegacyImagePattern,
    (_match, categoryId: string) =>
      `/catalog-categories/${catalogCategoryImageMap[categoryId]}.webp`,
  );

  if (
    frontendPublicPrefixes.some(
      (prefix) =>
        catalogCategoryImage === `/${prefix.slice(0, -1)}` ||
        catalogCategoryImage.startsWith(`/${prefix}`) ||
        catalogCategoryImage.startsWith(prefix),
    )
  ) {
    return catalogCategoryImage.startsWith('/')
      ? catalogCategoryImage
      : `/${catalogCategoryImage}`;
  }

  if (catalogCategoryImage.startsWith('/media/')) {
    return catalogCategoryImage;
  }

  if (catalogCategoryImage.startsWith('/images/')) {
    return `/media/${catalogCategoryImage.slice('/images/'.length)}`;
  }

  if (catalogCategoryImage.startsWith('images/')) {
    return `/media/${catalogCategoryImage.slice('images/'.length)}`;
  }

  if (catalogCategoryImage.startsWith('/')) {
    return catalogCategoryImage;
  }

  return `/media/${catalogCategoryImage}`;
}
