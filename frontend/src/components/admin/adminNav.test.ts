import { describe, expect, it } from 'vitest';

import { createAdminPermissions, type AdminSessionUser } from '@/lib/adminPermissions';

import { getActiveAdminTab, getVisibleAdminNavItems } from './adminNav';

const superAdmin: AdminSessionUser = {
  id: 1,
  isSuperAdmin: true,
  permissions: createAdminPermissions('manage'),
  username: 'root',
};

describe('admin navigation', () => {
  it('keeps a hidden section out of the sidebar', () => {
    expect(getVisibleAdminNavItems(superAdmin).map((item) => item.key)).not.toContain('site-images');
  });

  /**
   * `AdminChrome` drops the sidebar entirely when a route resolves to no tab,
   * so a hidden section still has to be matchable by its own path.
   */
  it('still resolves the hidden section from its route', () => {
    expect(getActiveAdminTab('/admin/site-images')).toBe('site-images');
    expect(getActiveAdminTab('/admin/site-images/anything')).toBe('site-images');
  });

  it('resolves every visible section from its own route', () => {
    for (const item of getVisibleAdminNavItems(superAdmin)) {
      expect(getActiveAdminTab(item.href)).toBe(item.key);
    }
  });

  it('reports no tab for a route outside the panel', () => {
    expect(getActiveAdminTab('/admin/login')).toBeNull();
  });
});
