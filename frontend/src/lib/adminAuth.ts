export const ADMIN_SESSION_COOKIE = 'foliart_admin_session';
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

const SUPPORTED_ADMIN_LOCALES = ['ru'] as const;
const DEFAULT_ADMIN_LOCALE = 'ru';

type AdminLocale = (typeof SUPPORTED_ADMIN_LOCALES)[number];

// `v` is the payload format. Bumping it invalidates every cookie issued by the
// previous shape, which is what retires the single env-based admin identity.
const ADMIN_SESSION_VERSION = 2;

export type AdminSessionPayload = {
  exp: number;
  sub: number;
  usr: string;
  v: number;
  ver: number;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function getAdminSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret) {
    throw new Error('ADMIN_SESSION_SECRET must be set');
  }

  return secret;
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function stringToBase64Url(value: string) {
  return bytesToBase64Url(encoder.encode(value));
}

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binary = atob(padded);

  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function base64UrlToString(value: string) {
  return decoder.decode(base64UrlToBytes(value));
}

function constantTimeEqual(left: string, right: string) {
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const maxLength = Math.max(leftBytes.length, rightBytes.length);
  let diff = leftBytes.length ^ rightBytes.length;

  for (let index = 0; index < maxLength; index += 1) {
    diff |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return diff === 0;
}

async function signAdminValue(value: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(getAdminSessionSecret()),
    {
      name: 'HMAC',
      hash: 'SHA-256',
    },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));

  return bytesToBase64Url(new Uint8Array(signature));
}

function getCurrentUnixTime() {
  return Math.floor(Date.now() / 1000);
}

export function isSupportedAdminLocale(value: string): value is AdminLocale {
  return SUPPORTED_ADMIN_LOCALES.includes(value as AdminLocale);
}

// Admin paths are matched for *any* locale segment, not just the supported
// ones. The admin UI itself is Russian-only, but every `/<locale>/admin/*`
// route exists in the app, so middleware has to gate all of them; anything
// outside SUPPORTED_ADMIN_LOCALES is redirected to its `ru` equivalent.
const ADMIN_PATH_PATTERN = /^\/([^/]+)\/admin(?:\/|$)/;
const ADMIN_LOGIN_PATH_PATTERN = /^\/[^/]+\/admin\/login(?:\/|$)/;

export function getAdminPathLocale(pathname: string) {
  const [, locale] = pathname.match(ADMIN_PATH_PATTERN) ?? [];

  return locale ?? null;
}

export function getLocaleFromAdminPath(pathname: string) {
  const locale = getAdminPathLocale(pathname);

  return locale && isSupportedAdminLocale(locale) ? locale : null;
}

export function isAdminPath(pathname: string) {
  return ADMIN_PATH_PATTERN.test(pathname);
}

export function isAdminLoginPath(pathname: string) {
  return ADMIN_LOGIN_PATH_PATTERN.test(pathname);
}

// Rewrites `/en/admin/products` to `/ru/admin/products`, leaving already
// canonical paths untouched.
export function getCanonicalAdminPath(pathname: string) {
  const locale = getAdminPathLocale(pathname);

  if (!locale || isSupportedAdminLocale(locale)) {
    return null;
  }

  return pathname.replace(`/${locale}/admin`, `/${DEFAULT_ADMIN_LOCALE}/admin`);
}

export function getDefaultAdminPath(locale: string) {
  return `/${isSupportedAdminLocale(locale) ? locale : DEFAULT_ADMIN_LOCALE}/admin/products`;
}

export function getAdminLoginPath(locale: string, nextPath?: string) {
  const safeLocale = isSupportedAdminLocale(locale) ? locale : DEFAULT_ADMIN_LOCALE;
  const searchParams = new URLSearchParams();

  if (nextPath) {
    searchParams.set('next', nextPath);
  }

  const query = searchParams.toString();

  return `/${safeLocale}/admin/login${query ? `?${query}` : ''}`;
}

export function getSafeAdminNextPath(locale: string, value?: string | null) {
  const defaultPath = getDefaultAdminPath(locale);

  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return defaultPath;
  }

  try {
    const url = new URL(value, 'https://foliart.local');

    if (url.origin !== 'https://foliart.local') {
      return defaultPath;
    }

    if (!isAdminPath(url.pathname) || isAdminLoginPath(url.pathname)) {
      return defaultPath;
    }

    const pathLocale = getLocaleFromAdminPath(url.pathname);

    if (pathLocale !== locale) {
      return defaultPath;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return defaultPath;
  }
}

export async function createAdminSessionValue(user: {
  id: number;
  tokenVersion: number;
  username: string;
}) {
  const payload = stringToBase64Url(
    JSON.stringify({
      exp: getCurrentUnixTime() + ADMIN_SESSION_MAX_AGE_SECONDS,
      sub: user.id,
      usr: user.username,
      v: ADMIN_SESSION_VERSION,
      ver: user.tokenVersion,
    } satisfies AdminSessionPayload),
  );
  const signature = await signAdminValue(payload);

  return `${payload}.${signature}`;
}

// Signature and expiry only: this runs in middleware, where there is no way to
// reach the database. Whether the admin still exists, still has that token
// version and may open the requested section is decided server-side.
export async function readAdminSessionValue(
  value?: string,
): Promise<AdminSessionPayload | null> {
  if (!value) {
    return null;
  }

  const [payload, signature, extra] = value.split('.');

  if (!payload || !signature || extra) {
    return null;
  }

  const expectedSignature = await signAdminValue(payload);

  if (!constantTimeEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    const parsed = JSON.parse(base64UrlToString(payload)) as Partial<AdminSessionPayload>;

    if (
      parsed.v !== ADMIN_SESSION_VERSION ||
      typeof parsed.exp !== 'number' ||
      parsed.exp <= getCurrentUnixTime() ||
      typeof parsed.sub !== 'number' ||
      !Number.isSafeInteger(parsed.sub) ||
      parsed.sub <= 0 ||
      typeof parsed.usr !== 'string' ||
      typeof parsed.ver !== 'number' ||
      !Number.isSafeInteger(parsed.ver)
    ) {
      return null;
    }

    return {
      exp: parsed.exp,
      sub: parsed.sub,
      usr: parsed.usr,
      v: parsed.v,
      ver: parsed.ver,
    };
  } catch {
    return null;
  }
}

export async function verifyAdminSessionValue(value?: string) {
  return (await readAdminSessionValue(value)) !== null;
}
