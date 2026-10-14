'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { FiMaximize, FiPlus, FiSave, FiSidebar } from 'react-icons/fi';

import {
  createSitePageAction,
  type SitePageActionState,
  updateSitePageSettingsAction,
} from '../../../app/[locale]/admin/site-pages/actions';
import { slugify } from '@/lib/catalog';
import {
  defaultSitePageBandColor,
  isLightSitePageBandColor,
  normalizeSitePageBandColor,
  sitePageBandColorPattern,
  type SitePageDisplayMode,
} from '@/lib/sitePages';

import {
  adminCx,
  adminFieldClassName,
  adminHintClassName,
  adminInputClassName,
  adminLabelClassName,
  adminPrimaryButtonClassName,
} from '../adminStyles';

const initialState: SitePageActionState = { status: 'idle' };

const bandColorPresets = [
  { value: defaultSitePageBandColor, label: 'Тёмно-синий сайта' },
  { value: '#0b3e31', label: 'Тёмно-зелёный' },
  { value: '#111111', label: 'Чёрный' },
];

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
  bandColor = defaultSitePageBandColor,
  displayMode = 'embedded',
  locale,
  mode,
  pageId,
  showTitle = true,
  slug = '',
}: {
  bandColor?: string;
  displayMode?: SitePageDisplayMode;
  locale: string;
  mode: 'create' | 'edit';
  pageId?: number;
  showTitle?: boolean;
  slug?: string;
}) {
  const action = mode === 'create' ? createSitePageAction : updateSitePageSettingsAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [slugValue, setSlugValue] = useState(slug);
  const [modeValue, setModeValue] = useState<SitePageDisplayMode>(displayMode);
  const [showTitleValue, setShowTitleValue] = useState(showTitle);
  const [bandColorValue, setBandColorValue] = useState(normalizeSitePageBandColor(bandColor));
  // What is typed in the hex field; only a complete colour reaches the band.
  const [bandColorText, setBandColorText] = useState(bandColorValue);
  const bandIsLight = isLightSitePageBandColor(bandColorValue);
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
                  checked={modeValue === option.value}
                  onChange={() => setModeValue(option.value)}
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

      <input type="hidden" name="showTitle" value={showTitleValue ? 'true' : 'false'} />
      <input type="hidden" name="bandColor" value={bandColorValue} />

      {modeValue === 'embedded' ? (
        <fieldset className="space-y-3 rounded-lg border border-[#0b5a45]/10 bg-white p-4">
          <legend className={adminCx(adminLabelClassName, 'px-1')}>Полоса под шапкой сайта</legend>
          <p className={adminHintClassName}>
            Белая шапка сайта лежит поверх страницы, поэтому под ней всегда есть полоса — чтобы меню
            было видно. Подберите её цвет под первый экран вашего HTML, и шва не будет заметно.
          </p>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
            <div className="space-y-4">
              <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm font-semibold text-[#0b3e31]">
                <input
                  type="checkbox"
                  checked={showTitleValue}
                  onChange={(event) => setShowTitleValue(event.target.checked)}
                  className="h-4 w-4 accent-[#0b5a45]"
                />
                Показывать заголовок страницы на полосе
              </label>
              <p className={adminCx('-mt-2', adminHintClassName)}>
                Без заголовка полоса становится узкой — ровно по высоте меню. Если в вашем HTML есть
                свой заголовок, отключите.
              </p>

              <div className="space-y-2">
                <span className={adminLabelClassName}>Цвет полосы</span>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="color"
                    value={bandColorValue}
                    onChange={(event) => {
                      setBandColorValue(event.target.value);
                      setBandColorText(event.target.value);
                    }}
                    aria-label="Выбрать цвет полосы"
                    className="h-10 w-12 cursor-pointer rounded-lg border border-[#0b5a45]/14 bg-white p-1"
                  />
                  <input
                    type="text"
                    value={bandColorText}
                    onChange={(event) => {
                      const value = event.target.value.trim();
                      setBandColorText(value);
                      if (sitePageBandColorPattern.test(value)) {
                        setBandColorValue(value.toLowerCase());
                      }
                    }}
                    onBlur={() => setBandColorText(bandColorValue)}
                    maxLength={7}
                    spellCheck={false}
                    aria-label="Цвет полосы в формате #RRGGBB"
                    className={adminCx(adminInputClassName, 'max-w-28 font-mono')}
                  />
                  {bandColorPresets.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      title={preset.label}
                      aria-label={preset.label}
                      aria-pressed={bandColorValue === preset.value}
                      onClick={() => {
                        setBandColorValue(preset.value);
                        setBandColorText(preset.value);
                      }}
                      className={adminCx(
                        'h-8 w-8 cursor-pointer rounded-full border-2 transition',
                        bandColorValue === preset.value
                          ? 'border-[#0b5a45] ring-2 ring-[#0b5a45]/20'
                          : 'border-white shadow-[0_0_0_1px_rgba(11,90,69,0.2)]',
                      )}
                      style={{ backgroundColor: preset.value }}
                    />
                  ))}
                </div>
                <p className={adminHintClassName}>
                  Можно вставить код цвета из вашего HTML, например #2f5be0.
                </p>
                {bandIsLight ? (
                  <p className="text-xs font-medium leading-5 text-amber-700">
                    Светлый цвет: белые меню и логотип сайта на нём будут плохо видны.
                  </p>
                ) : null}
              </div>
            </div>

            <div aria-hidden="true" className="self-start overflow-hidden rounded-lg border border-[#0b5a45]/10">
              <div className="px-4 pb-3 pt-3" style={{ backgroundColor: bandColorValue }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">Фолиарт</span>
                  <span className="flex gap-1">
                    {[0, 1, 2].map((item) => (
                      <span key={item} className="h-3 w-3 rounded-full border border-white/70" />
                    ))}
                  </span>
                </div>
                <div className="mt-3 flex gap-3 border-b border-white/40 pb-1.5">
                  {[0, 1, 2, 3].map((item) => (
                    <span key={item} className="h-1.5 w-8 rounded bg-white/80" />
                  ))}
                </div>
                {showTitleValue ? (
                  <p className="mt-4 text-lg font-bold leading-tight text-white">Заголовок страницы</p>
                ) : null}
              </div>
              <div className="flex h-12 items-center justify-center bg-[repeating-linear-gradient(45deg,#f1f4f1_0_8px,#fff_8px_16px)] text-[11px] font-semibold text-[#7e9088]">
                ваш HTML
              </div>
            </div>
          </div>
        </fieldset>
      ) : null}

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
