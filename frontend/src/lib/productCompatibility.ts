import { normalizeContentLocale, type ContentLocale } from './contentLocales';

/**
 * Standard tank-mix note shown on a product card whose own note is blank for
 * the page's language. The admin editor offers it as the placeholder, so an
 * editor sees what the page will say before typing an override.
 */
const defaultCompatibilityNotes: Record<ContentLocale, string> = {
  ru: 'Препарат совместим с большинством удобрений и средств защиты. Недопустимо совместное использование в баковой смеси с препаратами меди и серы. Перед применением тест на совместимость обязателен.',
  en: 'The product is compatible with most fertilizers and crop protection products. Mixing with copper- and sulfur-based products in the same tank is not allowed. A compatibility test is required before use.',
  fr: 'Le produit est compatible avec la plupart des engrais et produits phytosanitaires. Le mélange en cuve avec des produits à base de cuivre ou de soufre est interdit. Un test de compatibilité est requis avant utilisation.',
  es: 'El producto es compatible con la mayoría de fertilizantes y productos fitosanitarios. No está permitida la mezcla en cuba con productos a base de cobre o azufre. Es obligatorio realizar un test de compatibilidad antes del uso.',
};

export function getDefaultCompatibilityNote(locale: string) {
  return defaultCompatibilityNotes[normalizeContentLocale(locale)];
}

export function getProductCompatibilityNote(
  product: { compatibility?: string | null },
  locale: string,
) {
  return product.compatibility?.trim() || getDefaultCompatibilityNote(locale);
}
