'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { FiExternalLink, FiSave } from 'react-icons/fi';

import {
  type CategoryActionState,
  updateCategoryTranslationAction,
} from '../../../app/[locale]/admin/products/actions';
import { Link } from '@/i18n/routing';
import RichDescriptionEditor from '@/components/admin/RichDescriptionEditor';
import type { Category } from '@/lib/api';
import { getContentLocaleLabel, withContentLocale } from '@/lib/contentLocales';

import {
  adminCx,
  adminFieldClassName,
  adminHintClassName,
  adminInputClassName,
  adminLabelClassName,
  adminPrimaryButtonClassName,
  adminSecondaryButtonClassName,
} from '../adminStyles';

const initialState: CategoryActionState = { status: 'idle' };

export default function CategoryTranslationForm({
  category,
  contentLocale,
  locale,
  publicHref,
  successMessage,
}: {
  category: Category;
  contentLocale: string;
  locale: string;
  publicHref: string;
  successMessage?: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    updateCategoryTranslationAction,
    initialState,
  );
  const [dirty, setDirty] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const translation = category.adminTranslation;
  const isBaseLocale = contentLocale === 'ru';
  const defaultName = translation?.name ?? (isBaseLocale ? category.name : '');
  const defaultDescription =
    translation?.description ?? (isBaseLocale ? category.description : '');

  useEffect(() => {
    if (state.status === 'error') {
      errorRef.current?.focus();
    }
  }, [state]);

  useEffect(() => {
    if (!dirty) return;

    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const guardLinks = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!target || window.confirm('Есть несохранённые изменения. Уйти без сохранения?')) return;
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

  return (
    <form
      action={formAction}
      className="space-y-5"
      onChange={() => setDirty(true)}
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="contentLocale" value={contentLocale} />
      <input type="hidden" name="categoryId" value={category.id} />

      {successMessage ? (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {successMessage}
        </div>
      ) : null}
      {state.status === 'error' ? (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 outline-none focus:ring-2 focus:ring-red-300"
        >
          {state.message ?? 'Не удалось сохранить категорию.'}
        </div>
      ) : null}

      <section className="rounded-lg border border-[#0b5a45]/10 bg-white p-4 sm:p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0b5a45]">
          Контент {getContentLocaleLabel(contentLocale)}
        </p>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <label className={adminFieldClassName}>
            <span className={adminLabelClassName}>Название категории</span>
            <input
              type="text"
              name="name"
              required={isBaseLocale}
              defaultValue={defaultName}
              aria-invalid={Boolean(state.fieldErrors?.name)}
              aria-describedby={state.fieldErrors?.name ? 'category-name-error' : undefined}
              className={adminInputClassName}
            />
            {state.fieldErrors?.name ? (
              <span id="category-name-error" className="text-xs font-medium text-red-700">
                {state.fieldErrors.name}
              </span>
            ) : null}
            {!isBaseLocale ? (
              <span className={adminHintClassName}>
                Пустое значение включает русский текст как резервный.
              </span>
            ) : null}
          </label>

          <div className={adminFieldClassName}>
            <span className={adminLabelClassName}>Описание категории</span>
            <RichDescriptionEditor
              defaultValue={defaultDescription}
              label="Описание категории"
              onContentChange={() => setDirty(true)}
              placeholder="Введите описание категории"
            />
            {!isBaseLocale ? (
              <span className={adminHintClassName}>
                Перевод считается заполненным, когда указаны название и описание.
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <div className="sticky bottom-4 z-30 rounded-xl border border-[#0b5a45]/15 bg-white/95 p-3 shadow-[0_18px_45px_-20px_rgba(11,62,49,0.35)] backdrop-blur sm:p-4">
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href={withContentLocale('/admin/products/categories', contentLocale)}
              className={adminSecondaryButtonClassName}
            >
              Отмена
            </Link>
            <Link
              href={publicHref}
              locale={contentLocale as 'ru' | 'en' | 'fr' | 'es'}
              target="_blank"
              className={adminCx(adminSecondaryButtonClassName, 'gap-2')}
            >
              <FiExternalLink aria-hidden="true" />
              Открыть категорию
            </Link>
          </div>
          <button
            type="submit"
            disabled={pending}
            className={adminCx(adminPrimaryButtonClassName, 'min-w-44 gap-2')}
          >
            <FiSave aria-hidden="true" />
            {pending ? 'Сохранение…' : 'Сохранить категорию'}
          </button>
        </div>
      </div>
    </form>
  );
}
