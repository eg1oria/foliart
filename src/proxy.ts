import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// TODO: вернуть next-intl когда будет поддержка Next.js 16
// import createMiddleware from 'next-intl/middleware';
// import { routing } from './i18n/routing';
// export const proxy = createMiddleware(routing);
// export default proxy;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/ru', request.url));
  }
}

export default proxy;

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
};
