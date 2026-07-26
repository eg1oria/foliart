import 'server-only';

import { unstable_cache } from 'next/cache';
import {
  parseUiMessagesApiResponse,
  resolveUiMessages,
  type UiMessageLocale,
  type UiMessagesApiResponse,
} from './uiMessages';
import {
  createUiMessagesCachedLoaders,
  createUiMessagesFailureShield,
  type UiMessagesCacheFactory,
} from './uiMessagesRuntime';

const backendUrl = (process.env.BACKEND_URL ?? 'http://localhost:3001').replace(
  /\/$/,
  '',
);
const requestTimeoutMs = 1_500;

class UiMessagesFetchError extends Error {
  constructor(readonly reason: string) {
    super('UI messages could not be loaded');
  }
}

async function fetchUiMessagesDocument(locale: UiMessageLocale) {
  let response: Response;

  try {
    response = await fetch(`${backendUrl}/api/ui-messages/${locale}`, {
      cache: 'no-store',
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
  } catch (error) {
    throw new UiMessagesFetchError(
      error instanceof Error && error.name === 'TimeoutError'
        ? 'timeout'
        : 'network',
    );
  }

  if (!response.ok) {
    throw new UiMessagesFetchError(`http_${response.status}`);
  }
  const payload = await response.json().catch(() => null);
  const parsed = parseUiMessagesApiResponse(payload, locale);
  if (!parsed) throw new UiMessagesFetchError('invalid_response');
  return parsed;
}

const cachedLoaders = createUiMessagesCachedLoaders(
  fetchUiMessagesDocument,
  unstable_cache as UiMessagesCacheFactory,
);
const runtimeShield = createUiMessagesFailureShield(cachedLoaders, {
  log(locale, error) {
    console.warn('UI messages backend fallback activated', {
      locale,
      reason:
        error instanceof UiMessagesFetchError ? error.reason : 'unexpected',
    });
  },
});

export async function getStoredUiMessages(locale: UiMessageLocale) {
  return runtimeShield.get(locale);
}

export async function getEffectiveUiMessages(locale: UiMessageLocale) {
  const stored = await getStoredUiMessages(locale);
  return resolveUiMessages(locale, stored);
}

export async function getUiMessagesForAdmin(locale: UiMessageLocale) {
  const result = await fetchUiMessagesDocument(locale);
  runtimeShield.prime(locale, result);
  return result;
}

export function primeUiMessagesLastKnownGood(
  locale: UiMessageLocale,
  response: UiMessagesApiResponse,
) {
  runtimeShield.prime(locale, response);
}

export function clearUiMessagesRuntimeState(locale?: UiMessageLocale) {
  runtimeShield.clear(locale);
}
