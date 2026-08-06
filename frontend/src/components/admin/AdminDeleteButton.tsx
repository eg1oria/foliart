'use client';

import { useFormStatus } from 'react-dom';
import { FiTrash2 } from 'react-icons/fi';

type AdminDeleteButtonProps = {
  children: string;
  className: string;
  confirmMessage: string;
  iconOnly?: boolean;
  pendingLabel: string;
};

export default function AdminDeleteButton({
  children,
  className,
  confirmMessage,
  iconOnly = false,
  pendingLabel,
}: AdminDeleteButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      aria-label={iconOnly ? (pending ? pendingLabel : children) : undefined}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      <FiTrash2 className={iconOnly ? undefined : 'mr-1'} aria-hidden="true" />
      <span className={iconOnly ? 'sr-only' : undefined}>
        {pending ? pendingLabel : children}
      </span>
    </button>
  );
}
