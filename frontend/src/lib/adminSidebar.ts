export const ADMIN_SIDEBAR_COOKIE = 'foliart_admin_sidebar';
export const ADMIN_SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isAdminSidebarCollapsed(value?: string | null) {
  return value === 'collapsed';
}
