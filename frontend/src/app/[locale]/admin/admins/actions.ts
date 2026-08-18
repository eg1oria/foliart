'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { isSupportedAdminLocale } from '@/lib/adminAuth';
import { requireSuperAdmin } from '@/lib/adminAuthServer';
import {
  adminSections,
  isAdminAccessLevel,
  type AdminAccessLevel,
  type AdminPermissions,
} from '@/lib/adminPermissions';
import { validateNewPassword } from '@/lib/adminPasswordRules';
import {
  createAdminUser,
  deleteAdminUser,
  setAdminUserPassword,
  updateAdminUserPermissions,
} from '@/lib/adminUsersApi';

export type AdminUserActionState = {
  fieldErrors?: Record<string, string>;
  message?: string;
  status: 'idle' | 'success' | 'error';
};

const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,30}[a-z0-9])$/;

function normalizeLocale(value: FormDataEntryValue | null) {
  return typeof value === 'string' && isSupportedAdminLocale(value) ? value : 'ru';
}

function readText(formData: FormData, name: string) {
  const value = formData.get(name);

  return typeof value === 'string' ? value : '';
}

function readAdminId(formData: FormData) {
  const id = Number(readText(formData, 'adminId'));

  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// The matrix posts one radio per section, so a missing field means the level
// was never offered and must not silently become anything but `none`.
function readPermissions(formData: FormData): AdminPermissions {
  return adminSections.reduce<AdminPermissions>((accumulator, section) => {
    const value = formData.get(`permission_${section}`);
    accumulator[section] = isAdminAccessLevel(value) ? (value as AdminAccessLevel) : 'none';

    return accumulator;
  }, {} as AdminPermissions);
}

function refreshAdmins(locale: string) {
  revalidatePath(`/${locale}/admin/admins`);
}

export async function createAdminUserAction(
  _previousState: AdminUserActionState,
  formData: FormData,
): Promise<AdminUserActionState> {
  const locale = normalizeLocale(formData.get('locale'));
  await requireSuperAdmin(locale);

  const username = readText(formData, 'username').trim().toLowerCase();
  const password = readText(formData, 'password');
  const fieldErrors = validateNewPassword(password, readText(formData, 'confirmPassword'));

  if (!USERNAME_PATTERN.test(username)) {
    fieldErrors.username =
      'Логин: 3–32 символа, латиница, цифры, точка, дефис или подчёркивание.';
  }

  if (Object.keys(fieldErrors).length) {
    return { status: 'error', fieldErrors, message: 'Проверьте поля формы.' };
  }

  const result = await createAdminUser({
    username,
    password,
    permissions: readPermissions(formData),
  });

  if (!result.ok) {
    return {
      status: 'error',
      message: result.message.includes('already exists')
        ? 'Администратор с таким логином уже существует.'
        : result.message,
    };
  }

  refreshAdmins(locale);
  redirect(`/${locale}/admin/admins?status=created`);
}

export async function updateAdminPermissionsAction(
  _previousState: AdminUserActionState,
  formData: FormData,
): Promise<AdminUserActionState> {
  const locale = normalizeLocale(formData.get('locale'));
  await requireSuperAdmin(locale);

  const adminId = readAdminId(formData);

  if (!adminId) {
    return { status: 'error', message: 'Администратор не найден.' };
  }

  const result = await updateAdminUserPermissions(adminId, readPermissions(formData));

  if (!result.ok) {
    return { status: 'error', message: result.message };
  }

  refreshAdmins(locale);

  return {
    status: 'success',
    message: 'Права сохранены. Активные сессии этого администратора закрыты.',
  };
}

export async function resetAdminPasswordAction(
  _previousState: AdminUserActionState,
  formData: FormData,
): Promise<AdminUserActionState> {
  const locale = normalizeLocale(formData.get('locale'));
  await requireSuperAdmin(locale);

  const adminId = readAdminId(formData);

  if (!adminId) {
    return { status: 'error', message: 'Администратор не найден.' };
  }

  const password = readText(formData, 'newPassword');
  const fieldErrors = validateNewPassword(password, readText(formData, 'confirmPassword'));

  if (Object.keys(fieldErrors).length) {
    return { status: 'error', fieldErrors, message: 'Проверьте поля формы.' };
  }

  const result = await setAdminUserPassword(adminId, password);

  if (!result.ok) {
    return { status: 'error', message: result.message };
  }

  refreshAdmins(locale);

  return { status: 'success', message: 'Пароль изменён, прежние сессии закрыты.' };
}

export async function deleteAdminUserAction(formData: FormData) {
  const locale = normalizeLocale(formData.get('locale'));
  await requireSuperAdmin(locale);

  const adminId = readAdminId(formData);

  if (!adminId) {
    redirect(`/${locale}/admin/admins?error=notfound`);
  }

  const result = await deleteAdminUser(adminId);

  if (!result.ok) {
    redirect(`/${locale}/admin/admins?error=${encodeURIComponent(result.message)}`);
  }

  refreshAdmins(locale);
  redirect(`/${locale}/admin/admins?status=deleted`);
}
