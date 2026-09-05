'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { FiUserPlus } from 'react-icons/fi';

import {
  createAdminUserAction,
  type AdminUserActionState,
} from '@/app/[locale]/admin/admins/actions';
import { Link } from '@/i18n/routing';
import {
  ADMIN_USERNAME_RULE_HINT,
  ADMIN_USERNAME_TAKEN_MESSAGE,
  getAdminUsernameFormatError,
  isAdminUsernameTaken,
  normalizeAdminUsername,
} from '@/lib/adminAccountRules';
import { createAdminPermissions } from '@/lib/adminPermissions';

import {
  adminCx,
  adminFieldClassName,
  adminHintClassName,
  adminInputClassName,
  adminLabelClassName,
  adminPrimaryButtonClassName,
  adminSecondaryButtonClassName,
} from '../adminStyles';
import AdminPasswordFields from './AdminPasswordFields';
import AdminPermissionsMatrix from './AdminPermissionsMatrix';

const initialState: AdminUserActionState = { status: 'idle' };

export default function AdminUserCreateForm({
  locale,
  takenUsernames = [],
}: {
  locale: string;
  takenUsernames?: string[];
}) {
  const [state, formAction, pending] = useActionState(createAdminUserAction, initialState);
  const [username, setUsername] = useState('');
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [permissions, setPermissions] = useState(() => createAdminPermissions('none'));
  // Remembers which action result the login was edited after, so the error the
  // backend returned stops being shown as soon as the field is touched, while
  // the next result brings its own error back.
  const [dismissedState, setDismissedState] = useState<AdminUserActionState | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status === 'error') {
      errorRef.current?.focus();
    }
  }, [state]);

  const submittedError =
    dismissedState === state ? undefined : state.fieldErrors?.username;

  // A busy login is worth reporting on the first keystroke that completes it;
  // the shape of a half-typed login is not, so that error waits for the blur.
  const usernameError = username
    ? (isAdminUsernameTaken(username, takenUsernames) ? ADMIN_USERNAME_TAKEN_MESSAGE : null) ??
      (usernameTouched ? getAdminUsernameFormatError(username) : null)
    : null;

  return (
    <form action={formAction} className="space-y-6">
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

      <label className={adminCx(adminFieldClassName, 'max-w-md')}>
        <span className={adminLabelClassName}>Логин</span>
        <input
          type="text"
          name="username"
          value={username}
          onChange={(event) => {
            setUsername(event.target.value);
            setDismissedState(state);
          }}
          onBlur={(event) => {
            setUsername(normalizeAdminUsername(event.target.value));
            setUsernameTouched(true);
          }}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          required
          aria-invalid={Boolean(usernameError ?? submittedError)}
          className={adminInputClassName}
        />
        {usernameError ?? submittedError ? (
          <span className="text-xs font-medium text-red-700">
            {usernameError ?? submittedError}
          </span>
        ) : (
          <span className={adminHintClassName}>{ADMIN_USERNAME_RULE_HINT}</span>
        )}
      </label>

      <AdminPasswordFields
        fieldErrors={state.fieldErrors}
        hint="Длина и состав пароля не ограничены. Пароль сохраняется только в виде хеша — покажите или скопируйте его сейчас, позже посмотреть будет нельзя."
      />

      <AdminPermissionsMatrix onChange={setPermissions} permissions={permissions} />

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Link href="/admin/admins" className={adminSecondaryButtonClassName}>
          Отмена
        </Link>
        <button
          type="submit"
          disabled={pending || Boolean(usernameError)}
          className={adminCx(
            adminPrimaryButtonClassName,
            'min-w-52 gap-2 disabled:cursor-not-allowed disabled:opacity-60',
          )}>
          <FiUserPlus aria-hidden="true" />
          {pending ? 'Создание…' : 'Создать администратора'}
        </button>
      </div>
    </form>
  );
}
