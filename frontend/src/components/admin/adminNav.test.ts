import { describe, expect, it } from 'vitest';

import {
  createAdminPermissions,
  getFirstAllowedSection,
  isAdminScreenHidden,
  type AdminSessionUser,
} from '@/lib/adminPermissions';

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
  it('shows every tab except the hidden ones to the super admin', () => {
    expect(getVisibleAdminNavItems(superAdmin)).toEqual(
      adminNavItems.filter((item) => !isAdminScreenHidden(item.key)),
    );
  });

  it('hides the site images and backups tabs even from the super admin', () => {
    const keys = getVisibleAdminNavItems(superAdmin).map((item) => item.key);

    expect(keys).not.toContain('site-images');
    expect(keys).not.toContain('backups');
  });

  it('never lands an admin on a hidden section', () => {
    expect(
      getFirstAllowedSection({
        ...editor,
        permissions: { ...createAdminPermissions('none'), 'site-images': 'manage' },
      }),
    ).toBeNull();
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
