'use client';

import { useActionState, useEffect, useRef } from 'react';
import { FiKey } from 'react-icons/fi';

import {
  resetAdminPasswordAction,
  type AdminUserActionState,
} from '@/app/[locale]/admin/admins/actions';

import { adminCx, adminPrimaryButtonClassName } from '../adminStyles';
import AdminPasswordFields from './AdminPasswordFields';

const initialState: AdminUserActionState = { status: 'idle' };

export default function AdminUserPasswordResetForm({
  adminId,
  locale,
}: {
  adminId: number;
  locale: string;
}) {
  const [state, formAction, pending] = useActionState(resetAdminPasswordAction, initialState);
  const noticeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status !== 'idle') {
      noticeRef.current?.focus();
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-5">
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

      <AdminPasswordFields
        fieldErrors={state.fieldErrors}
        hint="Передайте пароль администратору лично — здесь он больше не отображается."
        label="Новый пароль"
        name="newPassword"
      />

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
