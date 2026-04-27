import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

import { routing } from './i18n/routing';
import {
  ADMIN_SESSION_COOKIE,
  getDefaultAdminPath,
  getLocaleFromAdminPath,
  getSafeAdminNextPath,
  isAdminLoginPath,
  isAdminPath,
  verifyAdminSessionValue,
} from './lib/adminAuth';

const intlMiddleware = createMiddleware(routing);

function getRequestPath(request: NextRequest) {
  return `${request.nextUrl.pathname}${request.nextUrl.search}`;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isAdminPath(pathname)) {
    return intlMiddleware(request);
  }

  const locale = getLocaleFromAdminPath(pathname) ?? routing.defaultLocale;
  const sessionValue = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const isAuthenticated = await verifyAdminSessionValue(sessionValue);

  if (isAdminLoginPath(pathname)) {
    if (!isAuthenticated) {
      return intlMiddleware(request);
    }

    const nextPath = getSafeAdminNextPath(
      locale,
      request.nextUrl.searchParams.get('next') ?? getDefaultAdminPath(locale),
    );

    return NextResponse.redirect(new URL(nextPath, request.url));
  }

  if (!isAuthenticated) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `/${locale}/admin/login`;
    redirectUrl.search = '';
    redirectUrl.searchParams.set('next', getRequestPath(request));

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete(ADMIN_SESSION_COOKIE);

    return response;
  }

  return intlMiddleware(request);
}

export default proxy;

export const config = {
  matcher: ['/', '/(ru|en)/:path*'],
};
