'use server';

import { isSupportedAdminLocale } from '@/lib/adminAuth';
import {
  requireAdminSession,
  setAdminSessionCookie,
  type BackendAdminUser,
} from '@/lib/adminAuthServer';
import { validateNewPassword } from '@/lib/adminPasswordRules';
import { changeAdminUserPassword } from '@/lib/adminUsersApi';

export type AdminPasswordActionState = {
  fieldErrors?: Record<string, string>;
  message?: string;
  status: 'idle' | 'success' | 'error';
};

function normalizeLocale(value: FormDataEntryValue | null) {
  return typeof value === 'string' && isSupportedAdminLocale(value) ? value : 'ru';
}

function readPassword(formData: FormData, name: string) {
  const value = formData.get(name);

  return typeof value === 'string' ? value : '';
}

export async function changeOwnPasswordAction(
  _previousState: AdminPasswordActionState,
  formData: FormData,
): Promise<AdminPasswordActionState> {
  const locale = normalizeLocale(formData.get('locale'));
  const session = await requireAdminSession(locale);
  const currentPassword = readPassword(formData, 'currentPassword');
  const newPassword = readPassword(formData, 'newPassword');
  const fieldErrors = validateNewPassword(
    newPassword,
    readPassword(formData, 'confirmPassword'),
  );

  if (!currentPassword) {
    fieldErrors.currentPassword = 'Введите текущий пароль.';
  }

  if (currentPassword && currentPassword === newPassword) {
    fieldErrors.newPassword = 'Новый пароль должен отличаться от текущего.';
  }

  if (Object.keys(fieldErrors).length) {
    return { status: 'error', fieldErrors, message: 'Проверьте поля формы.' };
  }

  const result = await changeAdminUserPassword(session.id, currentPassword, newPassword);

  if (!result.ok) {
    return {
      status: 'error',
      message: result.message.includes('Current password is incorrect')
        ? 'Текущий пароль указан неверно.'
        : result.message,
    };
  }

  // Changing the password bumps the token version, which retires every cookie
  // issued before it. Re-issuing here keeps this tab signed in while every
  // other session of the same account is dropped.
  await setAdminSessionCookie(result.data satisfies BackendAdminUser);

  return { status: 'success', message: 'Пароль изменён.' };
}
