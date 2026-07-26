'use client';

import {
  startTransition,
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter } from '@/i18n/routing';
import {
  flattenUiMessages,
  rebuildUiMessages,
  type UiMessageDocument,
  type UiMessageLocale,
} from '@/i18n/uiMessages';
import {
  resetUiMessagesAction,
  saveUiMessagesAction,
  type UiMessagesActionState,
} from '@/app/[locale]/admin/messages/actions';
import {
  adminCx,
  adminDangerButtonClassName,
  adminInputOnWhiteClassName,
  adminPrimaryButtonClassName,
  adminSecondaryButtonClassName,
  adminTextareaOnWhiteClassName,
} from './adminStyles';
import { FiAlertTriangle, FiRefreshCw, FiSave, FiSearch } from 'react-icons/fi';

const initialUiMessagesActionState: UiMessagesActionState = {
  status: 'idle',
};

function createValueMap(messages: UiMessageDocument) {
  return Object.fromEntries(
    flattenUiMessages(messages).map((entry) => [entry.id, entry.value]),
  );
}

function formatUpdatedAt(value: string | null) {
  if (!value) return 'ещё не сохранялись';
  return value.replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
}

export default function UiMessagesEditor({
  adminLocale,
  bundledMessages,
  hasOverride: initialHasOverride,
  initialMessages,
  revision: initialRevision,
  russianMessages,
  targetLocale,
  updatedAt: initialUpdatedAt,
}: {
  adminLocale: string;
  bundledMessages: UiMessageDocument;
  hasOverride: boolean;
  initialMessages: UiMessageDocument;
  revision: number;
  russianMessages: UiMessageDocument;
  targetLocale: UiMessageLocale;
  updatedAt: string | null;
}) {
  const router = useRouter();
  const entries = useMemo(
    () => flattenUiMessages(initialMessages),
    [initialMessages],
  );
  const russianValues = useMemo(
    () => createValueMap(russianMessages),
    [russianMessages],
  );
  const bundledValues = useMemo(
    () => createValueMap(bundledMessages),
    [bundledMessages],
  );
  const [values, setValues] = useState(() => createValueMap(initialMessages));
  const [baseline, setBaseline] = useState(() =>
    createValueMap(initialMessages),
  );
  const [revision, setRevision] = useState(initialRevision);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const [hasOverride, setHasOverride] = useState(initialHasOverride);
  const [query, setQuery] = useState('');
  const [section, setSection] = useState('all');
  const [lastOperation, setLastOperation] = useState<'save' | 'reset'>('save');
  const [saveState, saveAction, savePending] = useActionState(
    saveUiMessagesAction,
    initialUiMessagesActionState,
  );
  const [resetState, resetAction, resetPending] = useActionState(
    resetUiMessagesAction,
    initialUiMessagesActionState,
  );
  const submitLock = useRef(false);
  const submittedValues = useRef(values);
  const pending = savePending || resetPending;
  const actionState = lastOperation === 'save' ? saveState : resetState;

  const dirty = useMemo(
    () => entries.some((entry) => values[entry.id] !== baseline[entry.id]),
    [baseline, entries, values],
  );
  const sections = useMemo(
    () => Array.from(new Set(entries.map((entry) => entry.section))).sort(),
    [entries],
  );
  const missingCount = useMemo(
    () => entries.filter((entry) => !values[entry.id]?.trim()).length,
    [entries, values],
  );
  const visibleEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (section !== 'all' && entry.section !== section) return false;
      if (!normalizedQuery) return true;
      return [
        entry.key,
        russianValues[entry.id] ?? '',
        values[entry.id] ?? '',
      ].some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [entries, query, russianValues, section, values]);

  useEffect(() => {
    if (!pending) submitLock.current = false;
  }, [pending]);

  useEffect(() => {
    if (
      saveState.status !== 'success' ||
      saveState.revision === undefined
    ) {
      return;
    }
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setBaseline({ ...submittedValues.current });
      setRevision(saveState.revision as number);
      setUpdatedAt(saveState.updatedAt ?? null);
      setHasOverride(true);
    });
    return () => {
      active = false;
    };
  }, [saveState]);

  useEffect(() => {
    if (
      resetState.status !== 'success' ||
      resetState.revision === undefined
    ) {
      return;
    }
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const nextValues = { ...bundledValues };
      setValues(nextValues);
      setBaseline(nextValues);
      setRevision(resetState.revision as number);
      setUpdatedAt(resetState.updatedAt ?? null);
      setHasOverride(false);
    });
    return () => {
      active = false;
    };
  }, [bundledValues, resetState]);

  useEffect(() => {
    if (
      actionState.status !== 'error' ||
      !actionState.fieldErrors ||
      Object.keys(actionState.fieldErrors).length === 0
    ) {
      return;
    }
    let active = true;
    const firstInvalidId = entries.find((entry) =>
      Object.prototype.hasOwnProperty.call(actionState.fieldErrors, entry.id),
    )?.id;
    let timer: number | undefined;
    queueMicrotask(() => {
      if (!active) return;
      setQuery('');
      setSection('all');
      timer = window.setTimeout(() => {
        const index = entries.findIndex(
          (entry) => entry.id === firstInvalidId,
        );
        if (index >= 0) {
          document.getElementById(`ui-message-value-${index}`)?.focus();
        }
      }, 0);
    });
    return () => {
      active = false;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [actionState, entries]);

  useEffect(() => {
    if (!dirty) return;
    const message =
      'Есть несохранённые изменения. Уйти со страницы без сохранения?';
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const guardLinks = (event: MouseEvent) => {
      const target =
        event.target instanceof Element
          ? event.target.closest('a[href]')
          : null;
      if (!target || window.confirm(message)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', guardLinks, true);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('click', guardLinks, true);
    };
  }, [dirty]);

  const submitSave = () => {
    if (!dirty || pending || submitLock.current) return;
    submitLock.current = true;
    setLastOperation('save');
    const messages = rebuildUiMessages(
      bundledMessages,
      values,
    ) as UiMessageDocument;
    submittedValues.current = { ...values };
    startTransition(() => {
      saveAction({
        adminLocale,
        expectedRevision: revision,
        messages,
        targetLocale,
      });
    });
  };

  const submitReset = () => {
    if (
      pending ||
      submitLock.current ||
      !window.confirm(
        `Сбросить ${targetLocale.toUpperCase()} к встроенной версии? Несохранённые изменения будут потеряны.`,
      )
    ) {
      return;
    }
    submitLock.current = true;
    setLastOperation('reset');
    startTransition(() => {
      resetAction({
        adminLocale,
        expectedRevision: revision,
        targetLocale,
      });
    });
  };

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        submitSave();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-[#0b5a45]/10 bg-[#f7f9f6] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6a7f76]">
            Строк
          </p>
          <p className="mt-1 text-2xl font-semibold text-[#0b3e31]">
            {entries.length}
          </p>
        </div>
        <div className="rounded-lg border border-[#0b5a45]/10 bg-[#f7f9f6] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6a7f76]">
            Пустых значений
          </p>
          <p className="mt-1 text-2xl font-semibold text-[#0b3e31]">
            {missingCount}
          </p>
        </div>
        <div className="rounded-lg border border-[#0b5a45]/10 bg-[#f7f9f6] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6a7f76]">
            Revision
          </p>
          <p className="mt-1 text-2xl font-semibold text-[#0b3e31]">
            {revision}
          </p>
          <p className="mt-1 text-[11px] text-[#6a7f76]">
            {formatUpdatedAt(updatedAt)}
          </p>
        </div>
      </div>

      <div className="sticky top-2 z-20 rounded-xl border border-[#0b5a45]/12 bg-white/95 p-3 shadow-sm backdrop-blur sm:p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-end">
          <label className="relative block">
            <span className="mb-2 block text-sm font-semibold text-[#0b3e31]">
              Поиск
            </span>
            <FiSearch
              aria-hidden="true"
              className="pointer-events-none absolute bottom-3.5 left-3.5 text-[#6a7f76]"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ключ, русский текст или перевод"
              className={adminCx(adminInputOnWhiteClassName, 'pl-10')}
            />
          </label>
          <label>
            <span className="mb-2 block text-sm font-semibold text-[#0b3e31]">
              Раздел
            </span>
            <select
              value={section}
              onChange={(event) => setSection(event.target.value)}
              className={adminInputOnWhiteClassName}
            >
              <option value="all">Все разделы</option>
              {sections.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <div className="text-sm text-[#567068] lg:pb-3">
            Показано {visibleEntries.length} из {entries.length}
          </div>
        </div>
      </div>

      <div aria-live="polite">
        {pending ? (
          <div
            role="status"
            className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800"
          >
            Сохранение…
          </div>
        ) : (actionState.status === 'error' ||
            actionState.status === 'conflict') &&
          actionState.message ? (
          <div
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{actionState.message}</span>
              {actionState.status === 'conflict' ? (
                <button
                  type="button"
                  className={adminSecondaryButtonClassName}
                  onClick={() => router.refresh()}
                >
                  <FiRefreshCw aria-hidden="true" className="mr-2" />
                  Загрузить актуальную версию
                </button>
              ) : null}
            </div>
          </div>
        ) : dirty ? (
          <div
            role="status"
            className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            <FiAlertTriangle aria-hidden="true" />
            Есть несохранённые изменения.
          </div>
        ) : actionState.status !== 'idle' && actionState.message ? (
          <div
            role="status"
            className={adminCx(
              'rounded-lg border px-4 py-3 text-sm leading-6',
              'border-emerald-200 bg-emerald-50 text-emerald-800',
            )}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{actionState.message}</span>
            </div>
          </div>
        ) : null}
      </div>

      <fieldset disabled={pending} className="min-w-0 space-y-4">
        <legend className="sr-only">
          Строки перевода {targetLocale.toUpperCase()}
        </legend>
        {visibleEntries.map((entry) => {
          const index = entries.findIndex((item) => item.id === entry.id);
          const inputId = `ui-message-value-${index}`;
          const error = actionState.fieldErrors?.[entry.id];
          const value = values[entry.id] ?? '';
          const useTextarea = value.length > 120 || value.includes('\n');
          const inputClassName = adminCx(
            useTextarea
              ? adminTextareaOnWhiteClassName
              : adminInputOnWhiteClassName,
            error && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10',
          );
          const sharedProps = {
            id: inputId,
            value,
            'aria-invalid': Boolean(error),
            'aria-describedby': error ? `${inputId}-error` : undefined,
            onChange: (
              event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
            ) =>
              setValues((current) => ({
                ...current,
                [entry.id]: event.target.value,
              })),
            className: inputClassName,
          };

          return (
            <article
              key={entry.id}
              className="overflow-hidden rounded-xl border border-[#0b5a45]/10 bg-white shadow-[0_12px_35px_-32px_rgba(11,62,49,0.8)]"
            >
              <div className="border-b border-[#0b5a45]/10 bg-[#f7f9f6] px-4 py-3 sm:px-5">
                <code className="break-all text-xs text-[#567068]">
                  {entry.key}
                </code>
              </div>
              <div className="grid md:grid-cols-2">
                <div className="border-[#0b5a45]/10 px-4 py-4 md:border-r sm:px-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6a7f76]">
                    {targetLocale === 'ru'
                      ? 'Встроенный русский оригинал'
                      : 'Русский оригинал'}
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#0b3e31]">
                    {targetLocale === 'ru'
                      ? bundledValues[entry.id]
                      : russianValues[entry.id]}
                  </p>
                </div>
                <label className="block bg-white px-4 py-4 sm:px-5">
                  <span className="mb-2 block text-sm font-semibold text-[#0b3e31]">
                    {targetLocale.toUpperCase()}
                  </span>
                  {useTextarea ? (
                    <textarea {...sharedProps} rows={Math.min(10, Math.max(3, value.split('\n').length + 1))} />
                  ) : (
                    <input {...sharedProps} type="text" />
                  )}
                  {error ? (
                    <span
                      id={`${inputId}-error`}
                      className="mt-2 block text-sm text-rose-700"
                    >
                      {error}
                    </span>
                  ) : null}
                </label>
              </div>
            </article>
          );
        })}
      </fieldset>

      {visibleEntries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#0b5a45]/20 px-5 py-10 text-center text-sm text-[#567068]">
          По заданным фильтрам строки не найдены.
        </div>
      ) : null}

      <div className="sticky bottom-3 z-20 flex flex-col gap-3 rounded-xl border border-[#0b5a45]/12 bg-white/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[#567068]">
          {dirty
            ? 'Изменения ещё не опубликованы.'
            : hasOverride
              ? 'Сохранённая версия совпадает с формой.'
              : 'Используется встроенная версия.'}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={pending || !hasOverride}
            onClick={submitReset}
            className={adminDangerButtonClassName}
          >
            Сбросить язык
          </button>
          <button
            type="submit"
            disabled={!dirty || pending}
            className={adminCx(
              adminPrimaryButtonClassName,
              'gap-2 disabled:cursor-not-allowed disabled:opacity-60',
            )}
          >
            <FiSave aria-hidden="true" />
            {pending && lastOperation === 'save'
              ? 'Сохранение…'
              : 'Сохранить изменения'}
          </button>
        </div>
      </div>
    </form>
  );
}
