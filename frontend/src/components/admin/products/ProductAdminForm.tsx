'use client';

import { useActionState, useEffect, useMemo, useRef, useState } from 'react';
import { FiExternalLink, FiImage, FiSave } from 'react-icons/fi';

import {
  createProductAction,
  type ProductActionState,
  updateProductAction,
} from '../../../app/[locale]/admin/products/actions';
import MediaImage from '@/components/catalog/MediaImage';
import RichDescriptionEditor from '@/components/admin/RichDescriptionEditor';
import { Link } from '@/i18n/routing';
import type { Category, Product } from '@/lib/api';
import { getContentLocaleLabel, withContentLocale } from '@/lib/contentLocales';
import { resolveMediaUrl } from '@/lib/media';
import {
  PRODUCT_IMAGE_MAX_BYTES,
  PRODUCT_IMAGE_MIME_TYPES,
  type ProductFormFieldErrors,
} from '@/lib/productAdmin';

import {
  adminCx,
  adminFieldClassName,
  adminFileInputClassName,
  adminHintClassName,
  adminInputClassName,
  adminLabelClassName,
  adminPrimaryButtonClassName,
  adminSecondaryButtonClassName,
  adminTextareaClassName,
} from '../adminStyles';

type ProductAdminFormProps = {
  categories: Category[];
  contentLocale: string;
  locale: string;
  mode: 'create' | 'edit';
  product?: Product;
  publicHref?: string;
  successMessage?: string | null;
};

const initialState: ProductActionState = { status: 'idle' };
const supportedLocale = (value: string) => value as 'ru' | 'en' | 'fr' | 'es';

function FieldError({ error, id }: { error?: string; id: string }) {
  if (!error) return null;
  return (
    <span id={id} data-field-error className="text-xs font-medium leading-5 text-red-700">
      {error}
    </span>
  );
}

function ProductImageInput({
  error,
  initialSrc,
  label,
  name,
  required,
}: {
  error?: string;
  initialSrc?: string | null;
  label: string;
  name: 'image' | 'imageEn';
  required?: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const errorId = `${name}-error`;

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  return (
    <label className={adminFieldClassName}>
      <span className={adminLabelClassName}>{label}</span>
      <div className="grid gap-3 rounded-lg border border-[#0b5a45]/10 bg-[#f7f9f6] p-3 sm:grid-cols-[112px_minmax(0,1fr)] sm:items-center">
        <div className="relative aspect-square w-full overflow-hidden rounded-md border border-[#0b5a45]/10 bg-white sm:w-28">
          <MediaImage
            src={previewUrl ?? initialSrc}
            alt=""
            fill
            unoptimized={Boolean(previewUrl)}
            sizes="112px"
            className="object-contain p-2"
            emptyState={
              <div className="flex h-full items-center justify-center text-[#8a9a93]">
                <FiImage aria-hidden="true" className="text-2xl" />
              </div>
            }
          />
        </div>
        <div className="min-w-0">
          <input
            type="file"
            name={name}
            required={required}
            accept={PRODUCT_IMAGE_MIME_TYPES.join(',')}
            aria-invalid={Boolean(error || clientError)}
            aria-describedby={error || clientError ? errorId : undefined}
            className={adminFileInputClassName}
            onChange={(event) => {
              const nextFile = event.target.files?.[0] ?? null;
              let nextError: string | null = null;

              if (nextFile && !PRODUCT_IMAGE_MIME_TYPES.includes(
                nextFile.type as (typeof PRODUCT_IMAGE_MIME_TYPES)[number],
              )) {
                nextError = 'Поддерживаются только изображения JPG, PNG и WEBP.';
              } else if (nextFile && nextFile.size > PRODUCT_IMAGE_MAX_BYTES) {
                nextError = 'Размер изображения не должен превышать 5 МБ.';
              }

              event.target.setCustomValidity(nextError ?? '');
              setClientError(nextError);
              setFile(nextFile);
            }}
          />
          <p className={adminCx('mt-2', adminHintClassName)}>
            JPG, PNG или WEBP, не более 5 МБ. Новое изображение заменит текущее после сохранения.
          </p>
          <FieldError error={clientError ?? error} id={errorId} />
        </div>
      </div>
    </label>
  );
}

function ReadonlyImage({ label, src }: { label: string; src?: string | null }) {
  return (
    <div className="rounded-lg border border-[#0b5a45]/10 bg-[#f7f9f6] p-3">
      <p className="text-xs font-semibold text-[#0b3e31]">{label}</p>
      <div className="relative mt-3 aspect-[4/3] overflow-hidden rounded-md border border-[#0b5a45]/10 bg-white">
        <MediaImage
          src={src}
          alt=""
          fill
          sizes="240px"
          className="object-contain p-3"
          emptyState={
            <div className="flex h-full items-center justify-center text-sm text-[#8a9a93]">
              Не загружено
            </div>
          }
        />
      </div>
    </div>
  );
}

export default function ProductAdminForm({
  categories,
  contentLocale,
  locale,
  mode,
  product,
  publicHref,
  successMessage,
}: ProductAdminFormProps) {
  const action = mode === 'create' ? createProductAction : updateProductAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [dirty, setDirty] = useState(false);
  const errorNoticeRef = useRef<HTMLDivElement>(null);
  const translation = product?.adminTranslation;
  const isBaseLocale = contentLocale === 'ru';
  const fieldErrors: ProductFormFieldErrors = state.fieldErrors ?? {};
  const defaultName = translation?.name ?? (isBaseLocale ? product?.name : '') ?? '';
  const defaultDescription =
    translation?.description ?? (isBaseLocale ? product?.description : '') ?? '';
  const defaultAdvantages =
    translation?.advantages ?? (isBaseLocale ? product?.advantages : '') ?? '';
  const defaultComposition =
    translation?.composition ?? (isBaseLocale ? product?.composition : '') ?? '';
  const defaultApplication =
    translation?.application ?? (isBaseLocale ? product?.application : '') ?? '';
  const category = product
    ? categories.find((item) => item.id === product.categoryId)
    : undefined;

  useEffect(() => {
    if (state.status === 'error') {
      errorNoticeRef.current?.focus();
    }
  }, [state]);

  useEffect(() => {
    if (!dirty) return;

    const message = 'Есть несохранённые изменения. Уйти со страницы без сохранения?';
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

  if (mode === 'edit' && !product) {
    return null;
  }

  return (
    <form
      action={formAction}
      className="space-y-5"
      onChange={() => setDirty(true)}
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="contentLocale" value={contentLocale} />
      {product ? <input type="hidden" name="productId" value={product.id} /> : null}

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
          ref={errorNoticeRef}
          tabIndex={-1}
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 outline-none focus:ring-2 focus:ring-red-300"
        >
          {state.message ?? 'Не удалось сохранить изменения.'}
        </div>
      ) : null}

      <section className="rounded-lg border border-[#0b5a45]/10 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0b5a45]">
              Основные данные
            </p>
            <h2 className="mt-2 text-lg font-semibold text-[#0b3e31]">
              {mode === 'create'
                ? 'Новый товар'
                : `${getContentLocaleLabel(contentLocale)}-версия товара`}
            </h2>
          </div>
          {!isBaseLocale ? (
            <span className="rounded-md bg-[#eef4ef] px-2.5 py-1 text-xs font-semibold text-[#0b5a45]">
              Категория и изображения защищены
            </span>
          ) : null}
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {isBaseLocale ? (
            <label className={adminFieldClassName}>
              <span className={adminLabelClassName}>Категория</span>
              <select
                name="categoryId"
                required
                defaultValue={product ? String(product.categoryId) : ''}
                aria-invalid={Boolean(fieldErrors.categoryId)}
                aria-describedby={fieldErrors.categoryId ? 'categoryId-error' : undefined}
                className={adminCx(adminInputClassName, 'appearance-none')}
              >
                <option value="">Выберите категорию</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <FieldError error={fieldErrors.categoryId} id="categoryId-error" />
            </label>
          ) : (
            <div className={adminFieldClassName}>
              <span className={adminLabelClassName}>Категория</span>
              <div className="flex min-h-11 items-center rounded-lg border border-[#0b5a45]/10 bg-[#f1f4f1] px-3.5 py-2.5 text-sm text-[#567068]">
                {category?.name ?? `Категория #${product?.categoryId}`}
              </div>
              <input type="hidden" name="categoryId" value={product?.categoryId} />
            </div>
          )}

          <label className={adminFieldClassName}>
            <span className={adminLabelClassName}>
              Название товара ({getContentLocaleLabel(contentLocale)})
            </span>
            <input
              type="text"
              name="name"
              required
              defaultValue={defaultName}
              placeholder={isBaseLocale ? 'Например, Медь-88' : 'Введите перевод названия'}
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? 'name-error' : undefined}
              className={adminInputClassName}
            />
            <FieldError error={fieldErrors.name} id="name-error" />
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-[#0b5a45]/10 bg-white p-4 sm:p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0b5a45]">
          Контент карточки
        </p>
        <div className="mt-5 space-y-5">
          <div className={adminFieldClassName}>
            <span className={adminLabelClassName}>Короткое описание</span>
            <RichDescriptionEditor
              defaultValue={defaultDescription}
              label="Короткое описание"
              onContentChange={() => setDirty(true)}
              placeholder="Введите описание товара"
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <label className={adminFieldClassName}>
              <span className={adminLabelClassName}>Состав</span>
              <textarea
                name="composition"
                rows={7}
                defaultValue={defaultComposition}
                placeholder="Азот | 20 г/л&#10;Фосфор | 60 г/л"
                className={adminTextareaClassName}
              />
              <span className={adminHintClassName}>
                Один компонент на строку в формате «Название | значение».
              </span>
            </label>

            <label className={adminFieldClassName}>
              <span className={adminLabelClassName}>Преимущества</span>
              <textarea
                name="advantages"
                rows={7}
                defaultValue={defaultAdvantages}
                placeholder="Обычный текст без маркера&#10;• Преимущество с точкой"
                className={adminTextareaClassName}
              />
              <span className={adminHintClassName}>
                Каждую запись начинайте с новой строки. Для точки в начале используйте «•», «-» или
                «*»; обычный текст оставляйте без маркера.
              </span>
            </label>
          </div>

          <label className={adminFieldClassName}>
            <span className={adminLabelClassName}>Регламент применения</span>
            <textarea
              name="application"
              rows={10}
              defaultValue={defaultApplication}
              placeholder="Культура:&#10;Рекомендация по применению&#10;&#10;Следующая культура:&#10;Рекомендация"
              className={adminTextareaClassName}
            />
            <span className={adminHintClassName}>
              Разделяйте карточки пустой строкой: первая строка — заголовок, остальные — рекомендация.
            </span>
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-[#0b5a45]/10 bg-white p-4 sm:p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0b5a45]">
          Изображения
        </p>
        {isBaseLocale ? (
          <div className="mt-5 max-w-2xl">
            <ProductImageInput
              name="image"
              label="Изображение товара для всех языков"
              required={mode === 'create'}
              initialSrc={resolveMediaUrl(product?.imageUrl)}
              error={fieldErrors.image}
            />
          </div>
        ) : (
          <div className="mt-5">
            <p className="text-sm leading-6 text-[#567068]">
              Во всех языках используется изображение из русской версии. Изменить его можно только
              в RU-редакторе.
            </p>
            <div className="mt-4 max-w-sm">
              <ReadonlyImage
                label="Общее изображение (RU)"
                src={resolveMediaUrl(product?.imageUrl)}
              />
            </div>
          </div>
        )}
      </section>

      <div className="sticky bottom-4 z-30 rounded-xl border border-[#0b5a45]/15 bg-white/95 p-3 shadow-[0_18px_45px_-20px_rgba(11,62,49,0.35)] backdrop-blur sm:p-4">
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href={withContentLocale('/admin/products', contentLocale)}
              className={adminSecondaryButtonClassName}
            >
              Отмена
            </Link>
            {publicHref ? (
              <Link
                href={publicHref}
                locale={supportedLocale(contentLocale)}
                target="_blank"
                className={adminCx(adminSecondaryButtonClassName, 'gap-2')}
              >
                <FiExternalLink aria-hidden="true" />
                Открыть в каталоге
              </Link>
            ) : null}
          </div>
          <button
            type="submit"
            disabled={pending}
            className={adminCx(adminPrimaryButtonClassName, 'min-w-44 gap-2')}
          >
            <FiSave aria-hidden="true" />
            {pending ? 'Сохранение…' : mode === 'create' ? 'Создать товар' : 'Сохранить изменения'}
          </button>
        </div>
      </div>
    </form>
  );
}
