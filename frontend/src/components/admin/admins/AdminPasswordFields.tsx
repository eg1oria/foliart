'use client';

import { useEffect, useState } from 'react';
import { FiCheck, FiCopy, FiEye, FiEyeOff, FiRefreshCw } from 'react-icons/fi';

import { generateAdminPassword, validateNewPassword } from '@/lib/adminPasswordRules';

import {
  adminCx,
  adminFieldClassName,
  adminHintClassName,
  adminInputClassName,
  adminLabelClassName,
  adminSecondaryButtonClassName,
} from '../adminStyles';

const errorTextClassName = 'text-xs font-medium text-red-700';

// The password is never readable again once it is saved, so the whole flow —
// generate, look at it, copy it — has to fit into this one block. Both fields
// are controlled: React resets uncontrolled inputs after a Server Action, which
// would otherwise wipe the password whenever the form comes back with an error.
export default function AdminPasswordFields({
  confirmName = 'confirmPassword',
  fieldErrors,
  hint,
  label = 'Пароль',
  name = 'password',
}: {
  confirmName?: string;
  fieldErrors?: Record<string, string>;
  hint?: string;
  label?: string;
  name?: string;
}) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  // Remembers which submit the fields were edited after, so a message from the
  // backend disappears once the value under it changes; the next submit brings
  // a new object and with it a new message.
  const [dismissedErrors, setDismissedErrors] = useState<
    Record<string, string> | undefined
  >(undefined);

  useEffect(() => {
    if (copyState === 'idle') {
      return;
    }

    const timer = window.setTimeout(() => setCopyState('idle'), 4000);

    return () => window.clearTimeout(timer);
  }, [copyState]);

  const submittedErrors = dismissedErrors === fieldErrors ? undefined : fieldErrors;
  const liveErrors = validateNewPassword(password, confirmPassword);
  const passwordError =
    (password ? liveErrors.newPassword : undefined) ?? submittedErrors?.newPassword;
  const confirmError =
    (confirmPassword ? liveErrors.confirmPassword : undefined) ?? submittedErrors?.confirmPassword;

  function updatePassword(value: string) {
    setPassword(value);
    setDismissedErrors(fieldErrors);
    setCopyState('idle');
  }

  function updateConfirmPassword(value: string) {
    setConfirmPassword(value);
    setDismissedErrors(fieldErrors);
  }

  function generate() {
    const generated = generateAdminPassword();

    setPassword(generated);
    setConfirmPassword(generated);
    setDismissedErrors(fieldErrors);
    setRevealed(true);
    setCopyState('idle');
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(password);
      setCopyState('copied');
    } catch {
      // Clipboard access is denied outside a secure context; showing the
      // password is then the only way to hand it over.
      setRevealed(true);
      setCopyState('failed');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={generate}
          className={adminCx(adminSecondaryButtonClassName, 'h-9 min-h-9 gap-1.5 px-3 text-xs')}>
          <FiRefreshCw aria-hidden="true" />
          Сгенерировать пароль
        </button>
        <button
          type="button"
          onClick={copy}
          disabled={!password}
          className={adminCx(
            adminSecondaryButtonClassName,
            'h-9 min-h-9 gap-1.5 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-60',
          )}>
          {copyState === 'copied' ? <FiCheck aria-hidden="true" /> : <FiCopy aria-hidden="true" />}
          {copyState === 'copied' ? 'Скопировано' : 'Скопировать'}
        </button>
        <button
          type="button"
          onClick={() => setRevealed((value) => !value)}
          aria-pressed={revealed}
          className={adminCx(adminSecondaryButtonClassName, 'h-9 min-h-9 gap-1.5 px-3 text-xs')}>
          {revealed ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
          {revealed ? 'Скрыть' : 'Показать'}
        </button>
      </div>

      {copyState === 'failed' ? (
        <p className={adminCx(adminHintClassName, 'text-amber-800')}>
          Браузер не дал доступ к буферу обмена — пароль показан, скопируйте его вручную.
        </p>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={adminFieldClassName}>
          <span className={adminLabelClassName}>{label}</span>
          <input
            type={revealed ? 'text' : 'password'}
            name={name}
            value={password}
            onChange={(event) => updatePassword(event.target.value)}
            autoComplete="new-password"
            spellCheck={false}
            required
            aria-invalid={Boolean(passwordError)}
            className={adminCx(adminInputClassName, 'font-mono')}
          />
          {passwordError ? <span className={errorTextClassName}>{passwordError}</span> : null}
        </label>

        <label className={adminFieldClassName}>
          <span className={adminLabelClassName}>Повторите пароль</span>
          <input
            type={revealed ? 'text' : 'password'}
            name={confirmName}
            value={confirmPassword}
            onChange={(event) => updateConfirmPassword(event.target.value)}
            autoComplete="new-password"
            spellCheck={false}
            required
            aria-invalid={Boolean(confirmError)}
            className={adminCx(adminInputClassName, 'font-mono')}
          />
          {confirmError ? <span className={errorTextClassName}>{confirmError}</span> : null}
        </label>
      </div>

      {hint ? <p className={adminHintClassName}>{hint}</p> : null}
    </div>
  );
}
