export const ADMIN_SESSION_COOKIE = 'foliart_admin_session';
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

const DEFAULT_ADMIN_USERNAME = 'admin';
const SUPPORTED_ADMIN_LOCALES = ['ru'] as const;
const DEFAULT_ADMIN_LOCALE = 'ru';

type AdminLocale = (typeof SUPPORTED_ADMIN_LOCALES)[number];

type AdminSessionPayload = {
  exp: number;
  login: string;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function getAdminUsername() {
  return process.env.ADMIN_USERNAME ?? process.env.ADMIN_LOGIN ?? DEFAULT_ADMIN_USERNAME;
}

function getAdminPassword() {
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    throw new Error('ADMIN_PASSWORD must be set');
  }

  return password;
}

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

export function validateAdminCredentials(username: string, password: string) {
  return (
    constantTimeEqual(username, getAdminUsername()) &&
    constantTimeEqual(password, getAdminPassword())
  );
}

export async function createAdminSessionValue() {
  const payload = stringToBase64Url(
    JSON.stringify({
      exp: getCurrentUnixTime() + ADMIN_SESSION_MAX_AGE_SECONDS,
      login: getAdminUsername(),
    } satisfies AdminSessionPayload),
  );
  const signature = await signAdminValue(payload);

  return `${payload}.${signature}`;
}

export async function verifyAdminSessionValue(value?: string) {
  if (!value) {
    return false;
  }

  const [payload, signature, extra] = value.split('.');

  if (!payload || !signature || extra) {
    return false;
  }

  const expectedSignature = await signAdminValue(payload);

  if (!constantTimeEqual(signature, expectedSignature)) {
    return false;
  }

  try {
    const parsed = JSON.parse(base64UrlToString(payload)) as Partial<AdminSessionPayload>;

    return (
      typeof parsed.exp === 'number' &&
      parsed.exp > getCurrentUnixTime() &&
      parsed.login === getAdminUsername()
    );
  } catch {
    return false;
  }
}
