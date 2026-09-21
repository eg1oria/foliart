'use client';

import { useActionState, useEffect, useId, useRef, useState } from 'react';
import { FiAlertTriangle, FiCheckCircle, FiLoader, FiRotateCcw, FiX } from 'react-icons/fi';

import {
  restoreBackupAction,
  type RestoreBackupActionState,
} from '@/app/[locale]/admin/backups/actions';
import {
  formatBackupDate,
  RESTORE_CONFIRMATION_WORD,
  type BackupRestoreStatus,
  type LastRestore,
} from '@/lib/backups';

import { AdminNotice } from '../AdminShell';
import {
  adminCx,
  adminHintClassName,
  adminInputOnWhiteClassName,
  adminLabelClassName,
  adminPrimaryButtonClassName,
  adminSecondaryButtonClassName,
} from '../adminStyles';

type WaitState =
  | { phase: 'waiting' }
  | { phase: 'done'; relogin: boolean; result: LastRestore }
  | { phase: 'timeout' };

// Solid red on purpose: this is the one button in the panel that rewrites the
// whole site. Spelled out instead of layered over the outlined danger button,
// whose white background would win the cascade.
const confirmButtonClassName =
  'inline-flex min-h-10 min-w-0 cursor-pointer items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30 disabled:cursor-not-allowed disabled:bg-red-300';

const pollIntervalMs = 2_000;
const pollTimeoutMs = 5 * 60_000;

/**
 * Polls until the restarted backend reports the result of *this* restore,
 * recognised by the `requestedAt` stamp the backend handed back when it
 * accepted the request.
 */
function useRestoreProgress(requestedAt: string | null) {
  const [state, setState] = useState<WaitState>({ phase: 'waiting' });

  useEffect(() => {
    if (!requestedAt) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = Date.now() + pollTimeoutMs;

    async function poll() {
      try {
        const response = await fetch('/admin-api/backups/status', { cache: 'no-store' });

        if (response.ok) {
          const status = (await response.json()) as BackupRestoreStatus;

          if (
            status.state !== 'restarting' &&
            status.lastRestore?.requestedAt === requestedAt
          ) {
            if (!cancelled) {
              setState({
                phase: 'done',
                relogin: status.state === 'relogin',
                result: status.lastRestore,
              });
            }
            return;
          }
        }
      } catch {
        // The backend or the proxy is still restarting; keep waiting.
      }

      if (cancelled) return;

      if (Date.now() > deadline) {
        setState({ phase: 'timeout' });
        return;
      }

      timer = setTimeout(poll, pollIntervalMs);
    }

    timer = setTimeout(poll, pollIntervalMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [requestedAt]);

  return state;
}

export default function BackupRestoreDialog({
  backup,
  className,
  locale,
}: {
  backup: { createdAt: string; name: string };
  className?: string;
  locale: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // The page renders every backup twice (table and mobile cards).
  const titleId = useId();
  const [confirmation, setConfirmation] = useState('');
  const [state, formAction, pending] = useActionState<RestoreBackupActionState, FormData>(
    restoreBackupAction,
    { status: 'idle' },
  );
  const started = state.status === 'started';
  const progress = useRestoreProgress(started ? state.requestedAt : null);
  const locked = pending || (started && progress.phase === 'waiting');
  const confirmed = confirmation.trim().toUpperCase() === RESTORE_CONFIRMATION_WORD;
  const backupDate = formatBackupDate(backup.createdAt);

  function close() {
    if (!locked) dialogRef.current?.close();
  }

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => {
          setConfirmation('');
          dialogRef.current?.showModal();
        }}>
        <FiRotateCcw className="mr-1" aria-hidden="true" />
        Восстановить
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl border border-[#0b5a45]/10 bg-white p-0 text-[#0b3e31] shadow-2xl backdrop:bg-[#0b3e31]/45"
        onCancel={(event) => {
          // Esc must not hide the progress of a restore that is running.
          if (locked) event.preventDefault();
        }}>
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <h2
              id={titleId}
              className="text-lg font-semibold leading-tight sm:text-xl">
              Восстановить сайт из копии от {backupDate}?
            </h2>
            {locked ? null : (
              <button
                type="button"
                onClick={close}
                aria-label="Закрыть"
                className="rounded-md p-1 text-[#567068] transition hover:bg-[#eef4ef]">
                <FiX aria-hidden="true" />
              </button>
            )}
          </div>

          {started ? (
            <RestoreProgress
              locale={locale}
              progress={progress}
              safetyBackup={state.safetyBackup}
            />
          ) : (
            <form action={formAction} className="mt-4 space-y-4">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="name" value={backup.name} />

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                <p className="flex items-center gap-2 font-semibold">
                  <FiAlertTriangle aria-hidden="true" />
                  Это действие заменит все данные сайта
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>
                    Товары, статьи, календарь, партнёры, контакты, переводы, изображения и
                    администраторы вернутся к состоянию на {backupDate}.
                  </li>
                  <li>Всё, что изменили после этого момента, пропадёт.</li>
                  <li>Сайт будет недоступен примерно полминуты, пока сервер перезапускается.</li>
                  <li>
                    Перед восстановлением автоматически сохранится копия текущего состояния — через
                    неё можно будет всё вернуть.
                  </li>
                  <li>
                    Если с тех пор менялись пароли или администраторы, войти придётся с данными,
                    которые действовали на момент копии.
                  </li>
                </ul>
              </div>

              <label className="flex flex-col gap-2">
                <span className={adminLabelClassName}>
                  Чтобы подтвердить, введите слово «{RESTORE_CONFIRMATION_WORD}»
                </span>
                <input
                  name="confirmation"
                  autoComplete="off"
                  spellCheck={false}
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  className={adminInputOnWhiteClassName}
                  disabled={pending}
                />
              </label>

              {state.status === 'error' ? (
                <AdminNotice tone="error">{state.message}</AdminNotice>
              ) : null}
              {pending ? (
                <p className={adminHintClassName}>
                  Проверяем архив и сохраняем копию текущего состояния — не закрывайте страницу.
                </p>
              ) : null}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={close}
                  disabled={pending}
                  className={adminCx(adminSecondaryButtonClassName, 'disabled:opacity-60')}>
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={!confirmed || pending}
                  className={confirmButtonClassName}>
                  {pending ? <FiLoader className="animate-spin" aria-hidden="true" /> : null}
                  {pending ? 'Подготовка…' : 'Восстановить'}
                </button>
              </div>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}

function RestoreProgress({
  locale,
  progress,
  safetyBackup,
}: {
  locale: string;
  progress: WaitState;
  safetyBackup: string;
}) {
  const backupsPath = `/${locale}/admin/backups`;

  if (progress.phase === 'waiting') {
    return (
      <div className="mt-5 space-y-3 text-sm leading-6" role="status">
        <p className="flex items-center gap-2 font-semibold">
          <FiLoader className="animate-spin" aria-hidden="true" />
          Сайт перезапускается и восстанавливает данные…
        </p>
        <p className="text-[#567068]">
          Обычно это занимает до минуты. Не закрывайте страницу. Копия прежнего состояния
          сохранена как «{safetyBackup}».
        </p>
      </div>
    );
  }

  if (progress.phase === 'timeout') {
    return (
      <div className="mt-5 space-y-4">
        <AdminNotice tone="error">
          Сервер не ответил за 5 минут. Попробуйте обновить страницу; если сайт не открывается,
          сообщите разработчику. Копия прежнего состояния: «{safetyBackup}».
        </AdminNotice>
        <a href={backupsPath} className={adminPrimaryButtonClassName}>
          Обновить страницу
        </a>
      </div>
    );
  }

  if (progress.result.status === 'failed') {
    return (
      <div className="mt-5 space-y-4">
        <AdminNotice tone="error">
          Восстановление не удалось: {progress.result.message ?? 'неизвестная ошибка'}. Сообщите
          разработчику. Копия прежнего состояния: «{safetyBackup}».
        </AdminNotice>
        <a href={backupsPath} className={adminPrimaryButtonClassName}>
          Обновить страницу
        </a>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
        <FiCheckCircle aria-hidden="true" />
        Данные восстановлены, сайт снова работает.
      </p>
      {progress.relogin ? (
        <p className="text-sm leading-6 text-[#567068]">
          В восстановленной базе ваша учётная запись другая — войдите заново с данными, которые
          действовали на момент копии.
        </p>
      ) : null}
      <a
        href={progress.relogin ? `/${locale}/admin/login?next=${encodeURIComponent(backupsPath)}` : backupsPath}
        className={adminPrimaryButtonClassName}>
        {progress.relogin ? 'Войти заново' : 'Обновить страницу'}
      </a>
    </div>
  );
}
