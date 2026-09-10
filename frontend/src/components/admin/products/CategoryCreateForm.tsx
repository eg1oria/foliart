'use client';

import { useActionState, useEffect, useRef } from 'react';
import { FiPlus } from 'react-icons/fi';

import {
  type CategoryActionState,
  createCategoryAction,
} from '../../../app/[locale]/admin/products/actions';
import { Link } from '@/i18n/routing';
import AdminImageInput from '@/components/admin/AdminImageInput';
import RichDescriptionEditor from '@/components/admin/RichDescriptionEditor';
import { withContentLocale } from '@/lib/contentLocales';

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

export default function CategoryCreateForm({ locale }: { locale: string }) {
  const [state, formAction, pending] = useActionState(createCategoryAction, initialState);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status === 'error') {
      errorRef.current?.focus();
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="contentLocale" value="ru" />

      {state.status === 'error' ? (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 outline-none focus:ring-2 focus:ring-red-300"
        >
          {state.message ?? 'Не удалось создать категорию.'}
        </div>
      ) : null}

      <section className="rounded-lg border border-[#0b5a45]/10 bg-white p-4 sm:p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0b5a45]">
          Контент RU
        </p>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <label className={adminFieldClassName}>
            <span className={adminLabelClassName}>Название категории</span>
            <input
              type="text"
              name="name"
              required
              aria-invalid={Boolean(state.fieldErrors?.name)}
              aria-describedby={
                state.fieldErrors?.name ? 'new-category-name-error' : undefined
              }
              className={adminInputClassName}
            />
            {state.fieldErrors?.name ? (
              <span id="new-category-name-error" className="text-xs font-medium text-red-700">
                {state.fieldErrors.name}
              </span>
            ) : null}
            <span className={adminHintClassName}>
              Адрес категории в каталоге строится из русского названия и потом не меняется.
            </span>
          </label>

          <div className={adminFieldClassName}>
            <span className={adminLabelClassName}>Описание категории</span>
            <RichDescriptionEditor
              defaultValue=""
              label="Описание категории"
              placeholder="Введите описание категории"
            />
            <span className={adminHintClassName}>
              Переводы на другие языки добавляются после создания.
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[#0b5a45]/10 bg-white p-4 sm:p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0b5a45]">
          Изображение
        </p>
        <div className="mt-5 max-w-2xl">
          <AdminImageInput
            name="image"
            label="Изображение категории для всех языков"
            error={state.fieldErrors?.image}
          />
          <p className={adminCx(adminHintClassName, 'mt-2')}>
            Необязательно: без изображения карточка каталога показывает заливку, картинку можно
            загрузить позже.
          </p>
        </div>
      </section>

      <div className="sticky bottom-4 z-30 rounded-xl border border-[#0b5a45]/15 bg-white/95 p-3 shadow-[0_18px_45px_-20px_rgba(11,62,49,0.35)] backdrop-blur sm:p-4">
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={withContentLocale('/admin/products/categories', 'ru')}
            className={adminSecondaryButtonClassName}
          >
            Отмена
          </Link>
          <button
            type="submit"
            disabled={pending}
            className={adminCx(adminPrimaryButtonClassName, 'min-w-44 gap-2')}
          >
            <FiPlus aria-hidden="true" />
            {pending ? 'Создание…' : 'Создать категорию'}
          </button>
        </div>
      </div>
    </form>
  );
}
