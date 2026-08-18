import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

import { routing } from './i18n/routing';
import {
  ADMIN_SESSION_COOKIE,
  getCanonicalAdminPath,
  getLocaleFromAdminPath,
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

  // The admin UI only exists in Russian, but `/<locale>/admin/*` resolves for
  // every routed locale. Send those to the canonical `ru` path so a single set
  // of routes carries the session check.
  const canonicalPath = getCanonicalAdminPath(pathname);

  if (canonicalPath) {
    const canonicalUrl = request.nextUrl.clone();
    canonicalUrl.pathname = canonicalPath;

    return NextResponse.redirect(canonicalUrl);
  }

  const locale = getLocaleFromAdminPath(pathname) ?? routing.defaultLocale;
  // Middleware can only tell that a cookie is well-formed and unexpired; which
  // sections the admin behind it may open is decided in the server components
  // and server actions, where the account can actually be read.
  const sessionValue = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const isAuthenticated = await verifyAdminSessionValue(sessionValue);

  // The login page decides for itself whether to bounce an already signed-in
  // admin into the panel, because only it can check the account behind the
  // cookie. Redirecting here on the weaker cookie-shape check would ping-pong
  // with the page whenever a session is revoked but its cookie is still valid.
  if (isAdminLoginPath(pathname)) {
    return intlMiddleware(request);
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
  matcher: ['/', '/(ru|en|fr|es)/:path*'],
};
