import { describe, expect, it } from 'vitest';

import {
  canManageSection,
  canViewSection,
  createAdminPermissions,
  getFirstAllowedSection,
  getVisibleAdminSections,
  normalizeAdminPermissions,
  type AdminSessionUser,
} from './adminPermissions';

function session(overrides: Partial<AdminSessionUser> = {}): AdminSessionUser {
  return {
    id: 1,
    isSuperAdmin: false,
    permissions: createAdminPermissions('none'),
    username: 'editor',
    ...overrides,
  };
}

describe('admin permissions', () => {
  it('fills missing sections with no access and drops unknown keys', () => {
    expect(normalizeAdminPermissions({ products: 'manage', secrets: 'manage' })).toEqual({
      products: 'manage',
      articles: 'none',
      calendars: 'none',
      partners: 'none',
      contacts: 'none',
      messages: 'none',
    });
  });

  it('treats a non-object document as no access at all', () => {
    for (const value of [null, undefined, 'manage', ['manage'], 42]) {
      expect(normalizeAdminPermissions(value)).toEqual(createAdminPermissions('none'));
    }
  });

  it('separates viewing from managing', () => {
    const user = session({
      permissions: normalizeAdminPermissions({ products: 'view', articles: 'manage' }),
    });

    expect(canViewSection(user, 'products')).toBe(true);
    expect(canManageSection(user, 'products')).toBe(false);
    expect(canManageSection(user, 'articles')).toBe(true);
    expect(canViewSection(user, 'calendars')).toBe(false);
  });

  it('gives the super admin every section regardless of the stored document', () => {
    const superAdmin = session({ isSuperAdmin: true });

    expect(getVisibleAdminSections(superAdmin)).toEqual([
      'products',
      'articles',
      'calendars',
      'partners',
      'contacts',
      'messages',
    ]);
    expect(canManageSection(superAdmin, 'messages')).toBe(true);
  });

  it('reports the first section an admin may open', () => {
    expect(
      getFirstAllowedSection(
        session({ permissions: normalizeAdminPermissions({ calendars: 'view' }) }),
      ),
    ).toBe('calendars');
    expect(getFirstAllowedSection(session())).toBeNull();
  });
});
