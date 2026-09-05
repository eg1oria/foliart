import { AdminChrome } from '@/components/admin/AdminChrome';
import { AdminSidebarStateProvider } from '@/components/admin/AdminSidebarState';
import { getAdminSession } from '@/lib/adminAuthServer';
import { ADMIN_SIDEBAR_COOKIE, isAdminSidebarCollapsed } from '@/lib/adminSidebar';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

// The sidebar lives in the layout rather than in each page so it survives route
// transitions: a page-level `loading.tsx` swaps the page slot only, and the
// panel stays put instead of blinking out with the content.
export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [session, cookieStore] = await Promise.all([getAdminSession(), cookies()]);
  const collapsed = isAdminSidebarCollapsed(cookieStore.get(ADMIN_SIDEBAR_COOKIE)?.value);

  return (
    <AdminSidebarStateProvider initialCollapsed={collapsed}>
      <AdminChrome locale={locale} session={session}>
        {children}
      </AdminChrome>
    </AdminSidebarStateProvider>
  );
}
