'use client';

import { useActionState, useEffect, useRef } from 'react';
import { FiSave } from 'react-icons/fi';

import {
  changeOwnPasswordAction,
  type AdminPasswordActionState,
} from '../../../app/[locale]/admin/account/actions';
import {
  adminCx,
  adminFieldClassName,
  adminHintClassName,
  adminInputClassName,
  adminLabelClassName,
  adminPrimaryButtonClassName,
} from '../adminStyles';

const initialState: AdminPasswordActionState = { status: 'idle' };

export default function AdminPasswordForm({ locale }: { locale: string }) {
  const [state, formAction, pending] = useActionState(changeOwnPasswordAction, initialState);
  const errorRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === 'error') {
      errorRef.current?.focus();
    }

    if (state.status === 'success') {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="max-w-xl space-y-5">
      <input type="hidden" name="locale" value={locale} />

      {state.status === 'success' ? (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {state.message ?? 'Пароль изменён.'}
        </div>
      ) : null}
      {state.status === 'error' ? (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 outline-none focus:ring-2 focus:ring-red-300">
          {state.message ?? 'Не удалось сменить пароль.'}
        </div>
      ) : null}

      <label className={adminFieldClassName}>
        <span className={adminLabelClassName}>Текущий пароль</span>
        <input
          type="password"
          name="currentPassword"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(state.fieldErrors?.currentPassword)}
          className={adminInputClassName}
        />
        {state.fieldErrors?.currentPassword ? (
          <span className="text-xs font-medium text-red-700">
            {state.fieldErrors.currentPassword}
          </span>
        ) : null}
      </label>

      <label className={adminFieldClassName}>
        <span className={adminLabelClassName}>Новый пароль</span>
        <input
          type="password"
          name="newPassword"
          autoComplete="new-password"
          minLength={10}
          required
          aria-invalid={Boolean(state.fieldErrors?.newPassword)}
          className={adminInputClassName}
        />
        {state.fieldErrors?.newPassword ? (
          <span className="text-xs font-medium text-red-700">
            {state.fieldErrors.newPassword}
          </span>
        ) : null}
        <span className={adminHintClassName}>Не короче 10 символов.</span>
      </label>

      <label className={adminFieldClassName}>
        <span className={adminLabelClassName}>Повторите новый пароль</span>
        <input
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          minLength={10}
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
        <FiSave aria-hidden="true" />
        {pending ? 'Сохранение…' : 'Сменить пароль'}
      </button>
    </form>
  );
}
