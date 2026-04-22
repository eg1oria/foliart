const absoluteUrlPattern = /^https?:\/\//i;
const frontendPublicPrefixes = ['catalog-categories/'] as const;

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

  if (
    frontendPublicPrefixes.some(
      (prefix) =>
        normalized === `/${prefix.slice(0, -1)}` ||
        normalized.startsWith(`/${prefix}`) ||
        normalized.startsWith(prefix),
    )
  ) {
    return normalized.startsWith('/') ? normalized : `/${normalized}`;
  }

  if (normalized.startsWith('/media/')) {
    return normalized;
  }

  if (normalized.startsWith('/images/')) {
    return `/media/${normalized.slice('/images/'.length)}`;
  }

  if (normalized.startsWith('images/')) {
    return `/media/${normalized.slice('images/'.length)}`;
  }

  if (normalized.startsWith('/')) {
    return normalized;
  }

  return `/media/${normalized}`;
}
