const absoluteUrlPattern = /^https?:\/\//i;
const frontendPublicPrefixes = ['catalog-categories/'] as const;
const catalogCategoryLegacyImagePattern =
  /^\/?(catalog-categories\/(?:1|4|5|6))\.(?:jpe?g|png)$/i;

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
    '/$1.webp',
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
