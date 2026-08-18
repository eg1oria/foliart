'use client';

import { useActionState, useEffect, useRef } from 'react';
import { FiKey } from 'react-icons/fi';

import {
  resetAdminPasswordAction,
  type AdminUserActionState,
} from '../../../app/[locale]/admin/admins/actions';
import { ADMIN_PASSWORD_MIN_LENGTH } from '@/lib/adminPasswordRules';

import {
  adminCx,
  adminFieldClassName,
  adminHintClassName,
  adminInputClassName,
  adminLabelClassName,
  adminPrimaryButtonClassName,
} from '../adminStyles';

const initialState: AdminUserActionState = { status: 'idle' };

export default function AdminUserPasswordResetForm({
  adminId,
  locale,
}: {
  adminId: number;
  locale: string;
}) {
  const [state, formAction, pending] = useActionState(resetAdminPasswordAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const noticeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status !== 'idle') {
      noticeRef.current?.focus();
    }

    if (state.status === 'success') {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="max-w-xl space-y-5">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="adminId" value={adminId} />

      {state.status !== 'idle' ? (
        <div
          ref={noticeRef}
          tabIndex={-1}
          role={state.status === 'error' ? 'alert' : 'status'}
          className={adminCx(
            'rounded-lg border px-4 py-3 text-sm outline-none',
            state.status === 'error'
              ? 'border-red-200 bg-red-50 text-red-800 focus:ring-2 focus:ring-red-300'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800',
          )}>
          {state.message}
        </div>
      ) : null}

      <label className={adminFieldClassName}>
        <span className={adminLabelClassName}>Новый пароль</span>
        <input
          type="password"
          name="newPassword"
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
          Передайте пароль администратору лично — здесь он больше не отображается.
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

      <button
        type="submit"
        disabled={pending}
        className={adminCx(adminPrimaryButtonClassName, 'min-w-44 gap-2')}>
        <FiKey aria-hidden="true" />
        {pending ? 'Сохранение…' : 'Задать пароль'}
      </button>
    </form>
  );
}
