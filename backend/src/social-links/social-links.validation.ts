import { BadRequestException } from '@nestjs/common';

export const SOCIAL_LINK_LOCALES = ['ru', 'en', 'fr', 'es'] as const;
export type SocialLinkLocale = (typeof SOCIAL_LINK_LOCALES)[number];

/**
 * Icon keys the frontend can draw. The list is mirrored in the frontend's
 * `lib/socialLinks.ts`, which maps each key to a `react-icons` component: a key
 * accepted here but missing there would render an empty badge, so the two lists
 * have to move together.
 */
export const SOCIAL_LINK_ICONS = [
  'vk',
  'ok',
  'facebook',
  'telegram',
  'instagram',
  'youtube',
  'whatsapp',
  'tiktok',
  'viber',
  'pinterest',
  'x',
] as const;
export type SocialLinkIcon = (typeof SOCIAL_LINK_ICONS)[number];

/**
 * The header draws the first few badges and hides the rest behind a dropdown,
 * so the set is no longer capped at what fits the row — this bound only keeps a
 * stuck client from writing an unbounded list.
 */
export const MAX_SOCIAL_LINKS_PER_LOCALE = 30;
export const MAX_SOCIAL_LINK_LABEL_LENGTH = 60;
export const MAX_SOCIAL_LINK_HREF_LENGTH = 500;
/** A text badge sits in the same round button as an icon; more than a handful
 * of characters overflows it, so the form is capped rather than shrunk. */
export const MAX_SOCIAL_LINK_TEXT_LENGTH = 5;

export type SocialLinkInput = {
  label: string;
  href: string;
  icon: string;
  text: string;
};

function fail(message: string): never {
  throw new BadRequestException(message);
}

function readString(value: unknown, field: string) {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value !== 'string') {
    fail(`${field} must be a string`);
  }

  return value.trim();
}

export function parseSocialLinkLocale(value: string): SocialLinkLocale {
  if (!SOCIAL_LINK_LOCALES.includes(value as SocialLinkLocale)) {
    throw new BadRequestException('Unsupported social link locale');
  }

  return value as SocialLinkLocale;
}

// Only absolute http(s) targets: the badge opens in a new tab, and anything
// else (`javascript:`, `data:`) would be a script vector on every page.
function parseHref(value: unknown) {
  const href = readString(value, 'href');

  if (!href) {
    fail('Link address is required');
  }
  if (href.length > MAX_SOCIAL_LINK_HREF_LENGTH) {
    fail('Link address is too long');
  }

  let url: URL;
  try {
    url = new URL(href);
  } catch {
    fail('Link address must be an absolute URL');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    fail('Link address must use http or https');
  }

  return href;
}

function parseLink(value: unknown): SocialLinkInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('Each social link must be an object');
  }

  const source = value as Record<string, unknown>;
  const label = readString(source.label, 'label');
  const icon = readString(source.icon, 'icon');
  const text = readString(source.text, 'text');

  if (!label) {
    fail('Link name is required');
  }
  if (label.length > MAX_SOCIAL_LINK_LABEL_LENGTH) {
    fail('Link name is too long');
  }
  if (icon && !SOCIAL_LINK_ICONS.includes(icon as SocialLinkIcon)) {
    fail('Unknown social link icon');
  }
  if (!icon && !text) {
    fail('Pick an icon or type a short text badge');
  }
  if (!icon && text.length > MAX_SOCIAL_LINK_TEXT_LENGTH) {
    fail('Text badge is too long');
  }

  return {
    label,
    href: parseHref(source.href),
    icon,
    // An icon wins over leftover text so a badge never carries both.
    text: icon ? '' : text,
  };
}

export function parseSocialLinksWriteBody(body: unknown): SocialLinkInput[] {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    fail('Request body must be a JSON object');
  }

  const links = (body as Record<string, unknown>).links;

  if (!Array.isArray(links)) {
    fail('links must be an array');
  }
  if (links.length > MAX_SOCIAL_LINKS_PER_LOCALE) {
    fail(`A language can hold at most ${MAX_SOCIAL_LINKS_PER_LOCALE} links`);
  }

  return links.map(parseLink);
}
