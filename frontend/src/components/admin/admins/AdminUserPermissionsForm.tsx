'use client';

import { useActionState, useEffect, useRef } from 'react';
import { FiSave } from 'react-icons/fi';

import {
  updateAdminPermissionsAction,
  type AdminUserActionState,
} from '../../../app/[locale]/admin/admins/actions';
import type { AdminPermissions } from '@/lib/adminPermissions';

import { adminCx, adminPrimaryButtonClassName } from '../adminStyles';
import AdminPermissionsMatrix from './AdminPermissionsMatrix';

const initialState: AdminUserActionState = { status: 'idle' };

export default function AdminUserPermissionsForm({
  adminId,
  locale,
  permissions,
}: {
  adminId: number;
  locale: string;
  permissions: AdminPermissions;
}) {
  const [state, formAction, pending] = useActionState(
    updateAdminPermissionsAction,
    initialState,
  );
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

      <AdminPermissionsMatrix permissions={permissions} />

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className={adminCx(adminPrimaryButtonClassName, 'min-w-44 gap-2')}>
          <FiSave aria-hidden="true" />
          {pending ? 'Сохранение…' : 'Сохранить права'}
        </button>
      </div>
    </form>
  );
}
