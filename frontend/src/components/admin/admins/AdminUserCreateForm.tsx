'use client';

import { useActionState, useEffect, useRef } from 'react';
import { FiUserPlus } from 'react-icons/fi';

import {
  createAdminUserAction,
  type AdminUserActionState,
} from '../../../app/[locale]/admin/admins/actions';
import { Link } from '@/i18n/routing';
import { createAdminPermissions } from '@/lib/adminPermissions';
import { ADMIN_PASSWORD_MIN_LENGTH } from '@/lib/adminPasswordRules';

import {
  adminCx,
  adminFieldClassName,
  adminHintClassName,
  adminInputClassName,
  adminLabelClassName,
  adminPrimaryButtonClassName,
  adminSecondaryButtonClassName,
} from '../adminStyles';
import AdminPermissionsMatrix from './AdminPermissionsMatrix';

const initialState: AdminUserActionState = { status: 'idle' };

export default function AdminUserCreateForm({ locale }: { locale: string }) {
  const [state, formAction, pending] = useActionState(createAdminUserAction, initialState);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status === 'error') {
      errorRef.current?.focus();
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />

      {state.status === 'error' ? (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 outline-none focus:ring-2 focus:ring-red-300">
          {state.message ?? 'Не удалось создать администратора.'}
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        <label className={adminFieldClassName}>
          <span className={adminLabelClassName}>Логин</span>
          <input
            type="text"
            name="username"
            autoComplete="off"
            required
            aria-invalid={Boolean(state.fieldErrors?.username)}
            className={adminInputClassName}
          />
          {state.fieldErrors?.username ? (
            <span className="text-xs font-medium text-red-700">
              {state.fieldErrors.username}
            </span>
          ) : null}
          <span className={adminHintClassName}>Латиница, цифры, точка, дефис, подчёркивание.</span>
        </label>

        <label className={adminFieldClassName}>
          <span className={adminLabelClassName}>Пароль</span>
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={ADMIN_PASSWORD_MIN_LENGTH}
            required
            aria-invalid={Boolean(state.fieldErrors?.newPassword)}
            className={adminInputClassName}
          />
          {state.fieldErrors?.newPassword ? (
            <span className="text-xs font-medium text-red-700">
              {state.fieldErrors.newPassword}
            </span>
          ) : null}
          <span className={adminHintClassName}>
            Не короче {ADMIN_PASSWORD_MIN_LENGTH} символов.
          </span>
        </label>

        <label className={adminFieldClassName}>
          <span className={adminLabelClassName}>Повторите пароль</span>
          <input
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            minLength={ADMIN_PASSWORD_MIN_LENGTH}
            required
            aria-invalid={Boolean(state.fieldErrors?.confirmPassword)}
            className={adminInputClassName}
          />
          {state.fieldErrors?.confirmPassword ? (
            <span className="text-xs font-medium text-red-700">
              {state.fieldErrors.confirmPassword}
            </span>
          ) : null}
        </label>
      </div>

      <AdminPermissionsMatrix permissions={createAdminPermissions('none')} />

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Link href="/admin/admins" className={adminSecondaryButtonClassName}>
          Отмена
        </Link>
        <button
          type="submit"
          disabled={pending}
          className={adminCx(adminPrimaryButtonClassName, 'min-w-52 gap-2')}>
          <FiUserPlus aria-hidden="true" />
          {pending ? 'Создание…' : 'Создать администратора'}
        </button>
      </div>
    </form>
  );
}
