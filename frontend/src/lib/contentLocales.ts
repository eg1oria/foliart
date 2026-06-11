export const contentLocales = ['ru', 'en', 'fr', 'es'] as const;
export const defaultContentLocale = 'ru';

export type ContentLocale = (typeof contentLocales)[number];

export function normalizeContentLocale(value?: string | null): ContentLocale {
  return contentLocales.includes(value as ContentLocale)
    ? (value as ContentLocale)
    : defaultContentLocale;
}

export function getContentLocaleLabel(locale: string) {
  return normalizeContentLocale(locale).toUpperCase();
}

export function withContentLocale(href: string, contentLocale: string) {
  const [pathWithQuery, hash] = href.split('#');
  const [path, query = ''] = pathWithQuery.split('?');
  const searchParams = new URLSearchParams(query);
  searchParams.set('contentLocale', normalizeContentLocale(contentLocale));
  const nextQuery = searchParams.toString();

  return `${path}${nextQuery ? `?${nextQuery}` : ''}${hash ? `#${hash}` : ''}`;
}
