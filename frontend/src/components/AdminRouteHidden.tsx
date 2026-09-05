'use client';

import { usePathname } from '@/i18n/routing';
import type { ReactNode } from 'react';

// Admin screens render their own chrome (sidebar + top bar), so the public
// header and footer must stay out of the way. Header hides itself; anything
// else that is public-only goes through this wrapper.
export function isAdminPathname(pathname: string) {
  return /^\/(?:[a-z]{2}\/)?admin(?:\/|$)/.test(pathname);
}

export default function AdminRouteHidden({ children }: { children: ReactNode }) {
  return isAdminPathname(usePathname()) ? null : <>{children}</>;
}
