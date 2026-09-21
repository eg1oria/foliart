'use client';

import { useFormStatus } from 'react-dom';
import { FiLoader, FiPlus } from 'react-icons/fi';

import { adminCx, adminPrimaryButtonClassName } from '../adminStyles';

export default function BackupCreateButton({ disabled = false }: { disabled?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={adminCx(
        adminPrimaryButtonClassName,
        'gap-2 disabled:cursor-not-allowed disabled:opacity-60',
      )}>
      {pending ? (
        <FiLoader className="animate-spin" aria-hidden="true" />
      ) : (
        <FiPlus aria-hidden="true" />
      )}
      {pending ? 'Создаётся… это может занять минуту' : 'Создать резервную копию'}
    </button>
  );
}
