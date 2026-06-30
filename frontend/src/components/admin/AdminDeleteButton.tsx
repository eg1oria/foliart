'use client';

import { useFormStatus } from 'react-dom';
import { FiTrash2 } from 'react-icons/fi';

type AdminDeleteButtonProps = {
  children: string;
  className: string;
  confirmMessage: string;
  pendingLabel: string;
};

export default function AdminDeleteButton({
  children,
  className,
  confirmMessage,
  pendingLabel,
}: AdminDeleteButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      <FiTrash2 className="mr-1" aria-hidden="true" />
      {pending ? pendingLabel : children}
    </button>
  );
}
