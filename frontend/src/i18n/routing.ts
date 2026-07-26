import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';
import { uiMessageLocales } from './uiMessages';

export const routing = defineRouting({
  locales: uiMessageLocales,
  defaultLocale: 'ru',
});

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
