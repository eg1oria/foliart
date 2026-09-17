'use client';

import { startTransition, useActionState, useEffect, useMemo, useRef, useState } from 'react';
import { FiArrowDown, FiArrowUp, FiPlus, FiSave, FiTrash2 } from 'react-icons/fi';

import SocialLinks from '@/components/SocialLinks';
import { getContentLocaleLabel } from '@/lib/contentLocales';
import { socialIcons } from '@/lib/socialIcons';
import {
  createEmptySocialLinkRow,
  isSocialIconKey,
  maxSocialLinkTextLength,
  maxSocialLinks,
  socialIconKeys,
  socialIconLabels,
  toSocialLinkFormRows,
  type SocialLink,
  type SocialLinkFormRow,
  type SocialLinkItem,
} from '@/lib/socialLinks';

import {
  saveSocialLinksAction,
  type SocialLinksActionState,
} from '../../../app/[locale]/admin/social-links/actions';
import {
  adminCx,
  adminDangerButtonClassName,
  adminFieldClassName,
  adminHintClassName,
  adminInputOnWhiteClassName,
  adminLabelClassName,
  adminPrimaryButtonClassName,
  adminSecondaryButtonClassName,
} from '../adminStyles';

const initialState: SocialLinksActionState = { status: 'idle' };

/** Rows are added and removed client-side, so each needs a key of its own. */
let rowKeySeed = 0;
function nextRowKey() {
  rowKeySeed += 1;
  return `new-${rowKeySeed}`;
}

function FieldError({ error, id }: { error?: string; id: string }) {
  if (!error) return null;

  return (
    <span id={id} data-field-error className="text-xs font-medium leading-5 text-red-700">
      {error}
    </span>
  );
}

/** The badges as the header would draw them, straight from the current rows. */
function toPreviewItems(rows: SocialLinkFormRow[]): SocialLinkItem[] {
  return rows
    .map((row, index): SocialLinkItem => {
      const icon = isSocialIconKey(row.icon) ? row.icon : undefined;
      const text = row.text.trim();

      return {
        id: row.key,
        label: row.label.trim() || `#${index + 1}`,
        href: row.href.trim(),
        icon,
        text: icon ? undefined : text || undefined,
      };
    })
    .filter((item) => Boolean(item.icon || item.text));
}

export default function SocialLinksEditor({
  adminLocale,
  canManage,
  links,
  targetLocale,
}: {
  adminLocale: string;
  canManage: boolean;
  links: SocialLink[];
  targetLocale: string;
}) {
  const initialRows = useMemo(() => toSocialLinkFormRows(links), [links]);
  const [rows, setRows] = useState<SocialLinkFormRow[]>(initialRows);
  const [state, formAction, pending] = useActionState(saveSocialLinksAction, initialState);
  const [baseline, setBaseline] = useState(initialRows);
  const submittedRows = useRef(initialRows);
  const errorRef = useRef<HTMLDivElement>(null);
  const rowErrors = state.status === 'error' ? (state.rowErrors ?? {}) : {};
  const dirty = useMemo(
    () => JSON.stringify(rows) !== JSON.stringify(baseline),
    [baseline, rows],
  );
  const previewItems = useMemo(() => toPreviewItems(rows), [rows]);

  useEffect(() => {
    if (state.status === 'error') errorRef.current?.focus();
  }, [state]);

  // A successful save makes the submitted rows the new starting point, so the
  // form stops reporting itself as dirty without a reload.
  useEffect(() => {
    if (state.status !== 'success') return;
    setBaseline(submittedRows.current);
  }, [state]);

  useEffect(() => {
    if (!dirty) return;

    const message = 'Есть несохранённые изменения. Уйти без сохранения?';
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const guardLinks = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('a[href]') : null;
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

  const updateRow = (key: string, patch: Partial<SocialLinkFormRow>) => {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  };

  const addRow = () => {
    setRows((current) =>
      current.length >= maxSocialLinks ? current : [...current, createEmptySocialLinkRow(nextRowKey())],
    );
  };

  const removeRow = (key: string) => {
    setRows((current) => current.filter((row) => row.key !== key));
  };

  // Rows are saved in the order they are listed, which is the order the header
  // draws them in.
  const moveRow = (index: number, direction: -1 | 1) => {
    setRows((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;

      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const submit = () => {
    if (!canManage || pending) return;
    submittedRows.current = rows;
    startTransition(() => {
      formAction({ adminLocale, rows, targetLocale });
    });
  };

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}>
      {state.status === 'success' ? (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {state.message ?? 'Ссылки сохранены.'}
        </div>
      ) : null}

      {state.status === 'error' ? (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 outline-none focus:ring-2 focus:ring-red-300">
          {state.message ?? 'Не удалось сохранить ссылки.'}
        </div>
      ) : null}

      <div className="rounded-lg border border-[#0b5a45]/10 bg-[#0b3e31] px-4 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
          Как это выглядит в шапке · {getContentLocaleLabel(targetLocale)}
        </p>
        <div className="mt-4 min-h-12">
          {previewItems.length ? (
            <SocialLinks ariaLabel="Предпросмотр кнопок соцсетей" links={previewItems} />
          ) : (
            <p className="text-sm text-white/60">
              Ни одной кнопки — в шапке для этого языка блок соцсетей не появится.
            </p>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#0b5a45]/18 bg-white/70 px-5 py-8 text-center">
          <h3 className="text-lg font-semibold text-[#0b3e31]">Ссылок пока нет</h3>
          <p className={adminCx('mt-2', adminHintClassName)}>
            Добавьте первую соцсеть — она появится в шапке и в полноэкранном меню для языка{' '}
            {getContentLocaleLabel(targetLocale)}.
          </p>
        </div>
      ) : null}

      <ol className="space-y-4">
        {rows.map((row, index) => {
          const errors = rowErrors[row.key] ?? {};
          const Icon = isSocialIconKey(row.icon) ? socialIcons[row.icon] : null;

          return (
            <li
              key={row.key}
              className="rounded-lg border border-[#0b5a45]/10 bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0b3e31] text-white">
                    {Icon ? (
                      <Icon size={18} aria-hidden="true" />
                    ) : (
                      <span aria-hidden="true" className="text-[12px] font-bold uppercase leading-none">
                        {row.text.trim() || '—'}
                      </span>
                    )}
                  </span>
                  <p className="text-sm font-semibold text-[#0b3e31]">
                    {row.label.trim() || `Ссылка ${index + 1}`}
                  </p>
                </div>

                {canManage ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => moveRow(index, -1)}
                      disabled={index === 0}
                      aria-label="Переместить выше"
                      className={adminCx(
                        adminSecondaryButtonClassName,
                        'h-9 min-h-9 w-9 px-0 disabled:cursor-not-allowed disabled:opacity-50',
                      )}>
                      <FiArrowUp aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveRow(index, 1)}
                      disabled={index === rows.length - 1}
                      aria-label="Переместить ниже"
                      className={adminCx(
                        adminSecondaryButtonClassName,
                        'h-9 min-h-9 w-9 px-0 disabled:cursor-not-allowed disabled:opacity-50',
                      )}>
                      <FiArrowDown aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRow(row.key)}
                      aria-label={`Удалить ссылку ${row.label.trim() || index + 1}`}
                      className={adminCx(adminDangerButtonClassName, 'h-9 min-h-9 w-9 px-0')}>
                      <FiTrash2 aria-hidden="true" />
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <label className={adminFieldClassName}>
                  <span className={adminLabelClassName}>Название сети</span>
                  <input
                    type="text"
                    value={row.label}
                    disabled={!canManage}
                    onChange={(event) => updateRow(row.key, { label: event.target.value })}
                    placeholder="VK"
                    aria-invalid={Boolean(errors.label)}
                    aria-describedby={errors.label ? `${row.key}-label-error` : undefined}
                    className={adminInputOnWhiteClassName}
                  />
                  <span className={adminHintClassName}>
                    Видно во всплывающей подсказке и читается скринридером.
                  </span>
                  <FieldError error={errors.label} id={`${row.key}-label-error`} />
                </label>

                <label className={adminFieldClassName}>
                  <span className={adminLabelClassName}>Ссылка</span>
                  <input
                    type="url"
                    inputMode="url"
                    value={row.href}
                    disabled={!canManage}
                    onChange={(event) => updateRow(row.key, { href: event.target.value })}
                    placeholder="https://vk.com/foliart"
                    aria-invalid={Boolean(errors.href)}
                    aria-describedby={errors.href ? `${row.key}-href-error` : undefined}
                    className={adminInputOnWhiteClassName}
                  />
                  <FieldError error={errors.href} id={`${row.key}-href-error`} />
                </label>

                <label className={adminFieldClassName}>
                  <span className={adminLabelClassName}>Вид кнопки</span>
                  <select
                    value={row.icon}
                    disabled={!canManage}
                    onChange={(event) => updateRow(row.key, { icon: event.target.value })}
                    className={adminInputOnWhiteClassName}>
                    <option value="">Текст вместо иконки</option>
                    {socialIconKeys.map((key) => (
                      <option key={key} value={key}>
                        {socialIconLabels[key]}
                      </option>
                    ))}
                  </select>
                  <span className={adminHintClassName}>
                    Кнопка показывает либо иконку, либо короткий текст — как «DZ» и «MAX».
                  </span>
                </label>

                <label className={adminFieldClassName}>
                  <span className={adminLabelClassName}>Текст на кнопке</span>
                  <input
                    type="text"
                    value={row.text}
                    disabled={!canManage || Boolean(row.icon)}
                    maxLength={maxSocialLinkTextLength}
                    onChange={(event) => updateRow(row.key, { text: event.target.value })}
                    placeholder="DZ"
                    aria-invalid={Boolean(errors.text)}
                    aria-describedby={errors.text ? `${row.key}-text-error` : undefined}
                    className={adminCx(
                      adminInputOnWhiteClassName,
                      'uppercase disabled:cursor-not-allowed disabled:opacity-60',
                    )}
                  />
                  <span className={adminHintClassName}>
                    До {maxSocialLinkTextLength} символов. Поле доступно, когда иконка не выбрана.
                  </span>
                  <FieldError error={errors.text} id={`${row.key}-text-error`} />
                </label>
              </div>
            </li>
          );
        })}
      </ol>

      {canManage ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#0b5a45]/10 pt-5">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={addRow}
              disabled={rows.length >= maxSocialLinks}
              className={adminCx(
                adminSecondaryButtonClassName,
                'gap-2 disabled:cursor-not-allowed disabled:opacity-50',
              )}>
              <FiPlus aria-hidden="true" />
              Добавить соцсеть
            </button>
            <span className={adminHintClassName}>
              {rows.length} из {maxSocialLinks}
              {rows.length >= maxSocialLinks ? ' — больше в шапку не помещается' : ''}
            </span>
          </div>

          <button
            type="submit"
            disabled={pending || !dirty}
            className={adminCx(
              adminPrimaryButtonClassName,
              'gap-2 disabled:cursor-not-allowed disabled:opacity-60',
            )}>
            <FiSave aria-hidden="true" />
            {pending ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      ) : null}
    </form>
  );
}
