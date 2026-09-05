'use client';

import {
  ADMIN_SIDEBAR_COOKIE,
  ADMIN_SIDEBAR_COOKIE_MAX_AGE,
} from '@/lib/adminSidebar';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type AdminSidebarState = {
  collapsed: boolean;
  toggleCollapsed: () => void;
};

const AdminSidebarContext = createContext<AdminSidebarState>({
  collapsed: false,
  toggleCollapsed: () => {},
});

// The collapsed state arrives from a cookie read on the server, so the first
// paint already has the right width instead of snapping after hydration.
export function AdminSidebarStateProvider({
  children,
  initialCollapsed,
}: {
  children: ReactNode;
  initialCollapsed: boolean;
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      document.cookie = `${ADMIN_SIDEBAR_COOKIE}=${next ? 'collapsed' : 'expanded'}; path=/; max-age=${ADMIN_SIDEBAR_COOKIE_MAX_AGE}; samesite=lax`;

      return next;
    });
  }, []);

  const value = useMemo(() => ({ collapsed, toggleCollapsed }), [collapsed, toggleCollapsed]);

  return <AdminSidebarContext.Provider value={value}>{children}</AdminSidebarContext.Provider>;
}

export function useAdminSidebarState() {
  return useContext(AdminSidebarContext);
}
