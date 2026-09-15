import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';
import { uiMessageLocales } from './uiMessages';

export const routing = defineRouting({
  locales: uiMessageLocales,
  defaultLocale: 'ru',
  // The middleware would otherwise send a `Link:` header on every page whose
  // `x-default` alternate is the path without a locale prefix — a URL this app
  // never serves. Google followed those headers and filed ~90 prefix-less 404s
  // in Search Console. The same alternates, with `x-default` pointing at `/ru`,
  // are already emitted as `<link rel="alternate">` tags by `buildPageMetadata`.
  alternateLinks: false,
});

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
