import { describe, expect, it } from 'vitest';

import { createAdminPermissions, type AdminSessionUser } from '@/lib/adminPermissions';

import { adminNavItems, getActiveAdminTab, getVisibleAdminNavItems } from './adminNav';

const superAdmin: AdminSessionUser = {
  id: 1,
  isSuperAdmin: true,
  permissions: createAdminPermissions('manage'),
  username: 'root',
};

const editor: AdminSessionUser = {
  id: 2,
  isSuperAdmin: false,
  permissions: createAdminPermissions('manage'),
  username: 'editor',
};

describe('admin navigation', () => {
  it('shows every tab to the super admin', () => {
    expect(getVisibleAdminNavItems(superAdmin)).toEqual(adminNavItems);
  });

  it('shows the site images tab to whoever can view the section', () => {
    expect(getVisibleAdminNavItems(editor).map((item) => item.key)).toContain('site-images');
    expect(
      getVisibleAdminNavItems({
        ...editor,
        permissions: { ...editor.permissions, 'site-images': 'none' },
      }).map((item) => item.key),
    ).not.toContain('site-images');
  });

  it('keeps the admins and backups tabs to the super admin', () => {
    const keys = getVisibleAdminNavItems(editor).map((item) => item.key);

    expect(keys).not.toContain('admins');
    expect(keys).not.toContain('backups');
  });

  it('resolves every visible section from its own route', () => {
    for (const item of getVisibleAdminNavItems(superAdmin)) {
      expect(getActiveAdminTab(item.href)).toBe(item.key);
    }
  });

  it('resolves nested routes to the section they belong to', () => {
    expect(getActiveAdminTab('/admin/site-images/anything')).toBe('site-images');
    expect(getActiveAdminTab('/admin/products/categories/new')).toBe('productCategories');
  });

  it('reports no tab for a route outside the panel', () => {
    expect(getActiveAdminTab('/admin/login')).toBeNull();
  });
});
