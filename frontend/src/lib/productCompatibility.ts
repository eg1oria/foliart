import enMessages from '../../messages/en.json';
import esMessages from '../../messages/es.json';
import frMessages from '../../messages/fr.json';
import ruMessages from '../../messages/ru.json';
import { normalizeContentLocale, type ContentLocale } from './contentLocales';

/**
 * Standard tank-mix note shown on a product card whose own note is blank for
 * the page's language. The text lives in `Product.compatibilityDefault` so it
 * can be edited with the other site texts; the admin product editor offers the
 * bundled version as the placeholder, so an editor sees what the page will say
 * before typing an override.
 */
const bundledMessages: Record<ContentLocale, { Product: { compatibilityDefault: string } }> = {
  ru: ruMessages,
  en: enMessages,
  fr: frMessages,
  es: esMessages,
};

export function getDefaultCompatibilityNote(locale: string) {
  return bundledMessages[normalizeContentLocale(locale)].Product.compatibilityDefault;
}
