'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { FiMaximize, FiPlus, FiSave, FiSidebar } from 'react-icons/fi';

import {
  createSitePageAction,
  type SitePageActionState,
  updateSitePageSettingsAction,
} from '../../../app/[locale]/admin/site-pages/actions';
import { slugify } from '@/lib/catalog';
import type { SitePageDisplayMode } from '@/lib/sitePages';

import {
  adminCx,
  adminFieldClassName,
  adminHintClassName,
  adminInputClassName,
  adminLabelClassName,
  adminPrimaryButtonClassName,
} from '../adminStyles';

const initialState: SitePageActionState = { status: 'idle' };

const displayModeOptions: Array<{
  description: string;
  icon: typeof FiSidebar;
  label: string;
  value: SitePageDisplayMode;
}> = [
  {
    value: 'embedded',
    label: 'Внутри сайта',
    description:
      'Шапка и подвал сайта остаются, под шапкой — заголовок страницы, ниже ваш HTML. Высота подстраивается сама; избегайте блоков высотой 100vh.',
    icon: FiSidebar,
  },
  {
    value: 'fullscreen',
    label: 'На весь экран',
    description:
      'Ваш HTML занимает всё окно браузера, без шапки и подвала сайта, — как отдельный лендинг.',
    icon: FiMaximize,
  },
];

// An address typed in Russian or with spaces is turned into the latin form the
// URL needs; a value that is already valid is left exactly as typed.
function normalizeSlugInput(value: string) {
  const trimmed = value.trim().toLowerCase();
  return /^[a-z0-9-]*$/.test(trimmed) ? trimmed.replace(/-+/g, '-') : slugify(trimmed);
}

export default function SitePageSettingsForm({
  displayMode = 'embedded',
  locale,
  mode,
  pageId,
  slug = '',
}: {
  displayMode?: SitePageDisplayMode;
  locale: string;
  mode: 'create' | 'edit';
  pageId?: number;
  slug?: string;
}) {
  const action = mode === 'create' ? createSitePageAction : updateSitePageSettingsAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [slugValue, setSlugValue] = useState(slug);
  const errorRef = useRef<HTMLDivElement>(null);
  const slugError = state.fieldErrors?.slug;

  useEffect(() => {
    if (state.status === 'error') {
      errorRef.current?.focus();
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      {pageId ? <input type="hidden" name="pageId" value={pageId} /> : null}

      {state.status === 'error' ? (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 outline-none focus:ring-2 focus:ring-red-300">
          {state.message ?? 'Не удалось сохранить страницу.'}
        </div>
      ) : null}
      {state.status === 'success' && state.message ? (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {state.message}
        </div>
      ) : null}

      <label className={adminFieldClassName}>
        <span className={adminLabelClassName}>Адрес страницы</span>
        <div
          className={adminCx(
            'flex min-w-0 items-stretch overflow-hidden rounded-lg border bg-[#f8f7f2] focus-within:border-[#0b5a45] focus-within:ring-2 focus-within:ring-[#0b5a45]/10',
            slugError ? 'border-red-300' : 'border-[#0b5a45]/14',
          )}>
          <span className="flex shrink-0 items-center border-r border-[#0b5a45]/10 bg-[#eef4ef] px-3 font-mono text-sm text-[#567068]">
            /ru/
          </span>
          <input
            type="text"
            name="slug"
            required
            value={slugValue}
            onChange={(event) => setSlugValue(event.target.value)}
            onBlur={(event) => setSlugValue(normalizeSlugInput(event.target.value))}
            placeholder="vesennyaya-akciya"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={Boolean(slugError)}
            aria-describedby="site-page-slug-hint"
            className={adminCx(
              adminInputClassName,
              'rounded-none border-0 bg-transparent font-mono focus:ring-0',
            )}
          />
        </div>
        {slugError ? (
          <span className="text-xs font-medium leading-5 text-red-700">{slugError}</span>
        ) : null}
        <span id="site-page-slug-hint" className={adminHintClassName}>
          Один адрес для всех языков: /ru/…, /en/…, /fr/…, /es/…. Можно ввести по-русски — при
          выходе из поля адрес переведётся в латиницу. Смена адреса у опубликованной страницы
          ломает старые ссылки на неё.
        </span>
      </label>

      <fieldset className="space-y-3">
        <legend className={adminLabelClassName}>Как показывать страницу</legend>
        <div className="mt-2.5 grid gap-3 md:grid-cols-2">
          {displayModeOptions.map((option) => {
            const Icon = option.icon;

            return (
              <label
                key={option.value}
                className="flex cursor-pointer gap-3 rounded-lg border border-[#0b5a45]/14 bg-white p-4 transition hover:border-[#0b5a45]/30 has-[:checked]:border-[#0b5a45] has-[:checked]:bg-[#eef4ef]">
                <input
                  type="radio"
                  name="displayMode"
                  value={option.value}
                  defaultChecked={displayMode === option.value}
                  className="mt-1 h-4 w-4 shrink-0 accent-[#0b5a45]"
                />
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-semibold text-[#0b3e31]">
                    <Icon aria-hidden="true" />
                    {option.label}
                  </span>
                  <span className={adminCx('mt-1.5 block', adminHintClassName)}>
                    {option.description}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className={adminCx(adminPrimaryButtonClassName, 'gap-2 disabled:opacity-60')}>
          {mode === 'create' ? <FiPlus aria-hidden="true" /> : <FiSave aria-hidden="true" />}
          {pending
            ? 'Сохранение…'
            : mode === 'create'
              ? 'Создать страницу'
              : 'Сохранить настройки'}
        </button>
      </div>
    </form>
  );
}
