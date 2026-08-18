import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createAdminUser: vi.fn(),
  deleteAdminUser: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  requireSuperAdmin: vi.fn(),
  revalidatePath: vi.fn(),
  setAdminUserPassword: vi.fn(),
  updateAdminUserPermissions: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('@/lib/adminAuthServer', () => ({ requireSuperAdmin: mocks.requireSuperAdmin }));
vi.mock('@/lib/adminUsersApi', () => ({
  createAdminUser: mocks.createAdminUser,
  deleteAdminUser: mocks.deleteAdminUser,
  setAdminUserPassword: mocks.setAdminUserPassword,
  updateAdminUserPermissions: mocks.updateAdminUserPermissions,
}));

import {
  createAdminUserAction,
  deleteAdminUserAction,
  resetAdminPasswordAction,
  updateAdminPermissionsAction,
  type AdminUserActionState,
} from './actions';

const idle: AdminUserActionState = { status: 'idle' };

function formData(entries: Record<string, string>) {
  const data = new FormData();

  for (const [key, value] of Object.entries(entries)) {
    data.set(key, value);
  }

  return data;
}

describe('admin users Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSuperAdmin.mockResolvedValue({
      id: 1,
      isSuperAdmin: true,
      permissions: {
        products: 'manage',
        articles: 'manage',
        calendars: 'manage',
        messages: 'manage',
      },
      username: 'root',
    });
  });

  it('refuses every action to an admin who is not the super admin', async () => {
    mocks.requireSuperAdmin.mockRejectedValue(new Error('REDIRECT:/ru/admin/products'));

    await expect(
      createAdminUserAction(idle, formData({ locale: 'ru', username: 'editor' })),
    ).rejects.toThrow('REDIRECT');
    await expect(
      updateAdminPermissionsAction(idle, formData({ locale: 'ru', adminId: '2' })),
    ).rejects.toThrow('REDIRECT');
    await expect(
      resetAdminPasswordAction(idle, formData({ locale: 'ru', adminId: '2' })),
    ).rejects.toThrow('REDIRECT');
    await expect(
      deleteAdminUserAction(formData({ locale: 'ru', adminId: '2' })),
    ).rejects.toThrow('REDIRECT');

    expect(mocks.createAdminUser).not.toHaveBeenCalled();
    expect(mocks.updateAdminUserPermissions).not.toHaveBeenCalled();
    expect(mocks.setAdminUserPassword).not.toHaveBeenCalled();
    expect(mocks.deleteAdminUser).not.toHaveBeenCalled();
  });

  it('creates an admin with the posted permission levels', async () => {
    mocks.createAdminUser.mockResolvedValue({ ok: true, data: { id: 2 } });

    await expect(
      createAdminUserAction(
        idle,
        formData({
          locale: 'ru',
          username: '  Editor  ',
          password: 'long-enough-password',
          confirmPassword: 'long-enough-password',
          permission_products: 'manage',
          permission_articles: 'view',
        }),
      ),
    ).rejects.toThrow('REDIRECT:/ru/admin/admins?status=created');

    expect(mocks.createAdminUser).toHaveBeenCalledWith({
      username: 'editor',
      password: 'long-enough-password',
      permissions: {
        products: 'manage',
        articles: 'view',
        calendars: 'none',
        messages: 'none',
      },
    });
  });

  it('rejects a bad login and mismatched passwords before calling the backend', async () => {
    const state = await createAdminUserAction(
      idle,
      formData({
        locale: 'ru',
        username: 'Ходжа Насреддин',
        password: 'long-enough-password',
        confirmPassword: 'another-password',
      }),
    );

    expect(state.status).toBe('error');
    expect(state.fieldErrors).toHaveProperty('username');
    expect(state.fieldErrors).toHaveProperty('confirmPassword');
    expect(mocks.createAdminUser).not.toHaveBeenCalled();
  });

  it('reports a duplicate login in Russian', async () => {
    mocks.createAdminUser.mockResolvedValue({
      ok: false,
      message: 'An admin with this login already exists',
    });

    const state = await createAdminUserAction(
      idle,
      formData({
        locale: 'ru',
        username: 'editor',
        password: 'long-enough-password',
        confirmPassword: 'long-enough-password',
      }),
    );

    expect(state).toEqual({
      status: 'error',
      message: 'Администратор с таким логином уже существует.',
    });
  });

  it('treats an unchecked section as no access', async () => {
    mocks.updateAdminUserPermissions.mockResolvedValue({ ok: true, data: { id: 2 } });

    const state = await updateAdminPermissionsAction(
      idle,
      formData({ locale: 'ru', adminId: '2', permission_calendars: 'view' }),
    );

    expect(mocks.updateAdminUserPermissions).toHaveBeenCalledWith(2, {
      products: 'none',
      articles: 'none',
      calendars: 'view',
      messages: 'none',
    });
    expect(state.status).toBe('success');
  });

  it('validates a reset password before sending it', async () => {
    const state = await resetAdminPasswordAction(
      idle,
      formData({ locale: 'ru', adminId: '2', newPassword: 'short', confirmPassword: 'short' }),
    );

    expect(state.status).toBe('error');
    expect(state.fieldErrors).toHaveProperty('newPassword');
    expect(mocks.setAdminUserPassword).not.toHaveBeenCalled();
  });
});
