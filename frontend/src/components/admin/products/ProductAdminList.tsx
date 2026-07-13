'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { FiEdit3, FiExternalLink, FiSearch, FiTrash2, FiX } from 'react-icons/fi';

import { deleteProductAction } from '../../../app/[locale]/admin/products/actions';
import { Link } from '../../../i18n/routing';
import type { Category, Product } from '../../../lib/api';
import { withContentLocale } from '../../../lib/contentLocales';
import { getProductHref } from '../../../lib/catalog';
import { resolveMediaUrl } from '../../../lib/media';
import { richDescriptionToPlainText } from '../../../lib/richDescription';
import {
  filterAdminProducts,
  type ProductTranslationFilter,
} from '../../../lib/productAdmin';
import MediaImage from '../../catalog/MediaImage';

import {
  adminCx,
  adminDangerButtonClassName,
  adminInputClassName,
  adminSecondaryButtonClassName,
} from '../adminStyles';

type ProductAdminListProps = {
  categories: Category[];
  contentLocale: string;
  initialCategoryId: number | null;
  initialQuery: string;
  initialTranslation: ProductTranslationFilter;
  locale: string;
  products: Product[];
};

function TranslationBadge({ complete, locale }: { complete: boolean; locale: string }) {
  return (
    <span
      className={adminCx(
        'inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]',
        complete ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700',
      )}
    >
      {complete ? `${locale.toUpperCase()} · готово` : `${locale.toUpperCase()} · не заполнено`}
    </span>
  );
}

function DeleteDialogButtons({ onCancel }: { onCancel: () => void }) {
  const { pending } = useFormStatus();

  return (
    <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button
        type="button"
        disabled={pending}
        onClick={onCancel}
        className={adminSecondaryButtonClassName}
      >
        Отмена
      </button>
      <button
        type="submit"
        disabled={pending}
        className={adminCx(adminDangerButtonClassName, 'min-w-36')}
      >
        <FiTrash2 aria-hidden="true" className="mr-2" />
        {pending ? 'Удаление…' : 'Удалить товар'}
      </button>
    </div>
  );
}

function ProductDeleteDialog({
  category,
  contentLocale,
  locale,
  onClose,
  product,
}: {
  category?: Category;
  contentLocale: string;
  locale: string;
  onClose: () => void;
  product: Product | null;
}) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!product) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cancelButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, product]);

  if (!product) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#062d24]/55 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-product-title"
        aria-describedby="delete-product-description"
        className="w-full max-w-md rounded-xl border border-red-100 bg-white p-5 shadow-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-600">
              Необратимое действие
            </p>
            <h2 id="delete-product-title" className="mt-2 text-xl font-semibold text-[#0b3e31]">
              Удалить «{product.name}»?
            </h2>
          </div>
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[#567068] transition hover:bg-[#eef4ef] hover:text-[#0b3e31]"
          >
            <FiX aria-hidden="true" />
          </button>
        </div>

        <p id="delete-product-description" className="mt-4 text-sm leading-6 text-[#567068]">
          Товар будет удалён из категории «{category?.name ?? 'Без категории'}» вместе со всеми
          переводами и загруженными изображениями. Восстановить его автоматически не получится.
        </p>

        <form action={deleteProductAction}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="contentLocale" value={contentLocale} />
          <input type="hidden" name="productId" value={product.id} />
          <input type="hidden" name="categoryId" value={product.categoryId} />
          <input
            type="hidden"
            name="productName"
            value={product.slugSourceName ?? product.name}
          />
          <DeleteDialogButtons onCancel={onClose} />
        </form>
      </section>
    </div>
  );
}

export default function ProductAdminList({
  categories,
  contentLocale,
  initialCategoryId,
  initialQuery,
  initialTranslation,
  locale,
  products,
}: ProductAdminListProps) {
  const [query, setQuery] = useState(initialQuery);
  const [categoryId, setCategoryId] = useState<number | null>(initialCategoryId);
  const [translation, setTranslation] =
    useState<ProductTranslationFilter>(initialTranslation);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const filteredProducts = useMemo(
    () => filterAdminProducts(products, categories, { categoryId, query, translation }),
    [categories, categoryId, products, query, translation],
  );

  useEffect(() => {
    const url = new URL(window.location.href);
    if (query.trim()) url.searchParams.set('q', query.trim());
    else url.searchParams.delete('q');
    if (categoryId) url.searchParams.set('categoryFilter', String(categoryId));
    else url.searchParams.delete('categoryFilter');
    if (translation !== 'all') url.searchParams.set('translation', translation);
    else url.searchParams.delete('translation');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }, [categoryId, query, translation]);

  const resetFilters = () => {
    setQuery('');
    setCategoryId(null);
    setTranslation('all');
  };

  const renderActions = (product: Product, category: Category | undefined) => (
    <div className="flex items-center justify-end gap-1.5">
      {category ? (
        <Link
          href={getProductHref(category, product)}
          locale={contentLocale as 'ru' | 'en' | 'fr' | 'es'}
          aria-label={`Открыть ${product.name} в каталоге`}
          className={adminCx(adminSecondaryButtonClassName, 'h-9 min-h-9 w-9 px-0')}
        >
          <FiExternalLink aria-hidden="true" />
        </Link>
      ) : null}
      <Link
        href={withContentLocale(`/admin/products/${product.id}`, contentLocale)}
        className={adminCx(adminSecondaryButtonClassName, 'h-9 min-h-9 gap-1.5 px-3 text-xs')}
      >
        <FiEdit3 aria-hidden="true" />
        Изменить
      </Link>
      <button
        type="button"
        onClick={() => setProductToDelete(product)}
        aria-label={`Удалить ${product.name}`}
        className={adminCx(adminDangerButtonClassName, 'h-9 min-h-9 w-9 px-0')}
      >
        <FiTrash2 aria-hidden="true" />
      </button>
    </div>
  );

  return (
    <>
      <div className="rounded-lg border border-[#0b5a45]/10 bg-[#f7f9f6] p-3 sm:p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_220px_auto]">
          <label className="relative block">
            <span className="sr-only">Поиск товаров</span>
            <FiSearch
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6a7f76]"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Название товара или категории"
              className={adminCx(adminInputClassName, 'pl-10')}
            />
          </label>

          <label>
            <span className="sr-only">Фильтр по категории</span>
            <select
              value={categoryId ?? ''}
              onChange={(event) =>
                setCategoryId(event.target.value ? Number.parseInt(event.target.value, 10) : null)
              }
              className={adminCx(adminInputClassName, 'appearance-none')}
            >
              <option value="">Все категории</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="sr-only">Фильтр по переводу</span>
            <select
              value={translation}
              onChange={(event) =>
                setTranslation(event.target.value as ProductTranslationFilter)
              }
              className={adminCx(adminInputClassName, 'appearance-none')}
            >
              <option value="all">Все статусы {contentLocale.toUpperCase()}</option>
              <option value="complete">Перевод заполнен</option>
              <option value="missing">Нужно заполнить</option>
            </select>
          </label>

          <button
            type="button"
            onClick={resetFilters}
            disabled={!query && !categoryId && translation === 'all'}
            className={adminCx(
              adminSecondaryButtonClassName,
              'px-4 disabled:cursor-not-allowed disabled:opacity-45',
            )}
          >
            Сбросить
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-sm text-[#567068]">
        <p aria-live="polite">
          Показано <span className="font-semibold text-[#0b3e31]">{filteredProducts.length}</span>{' '}
          из {products.length}
        </p>
        <p className="hidden sm:block">Язык контента: {contentLocale.toUpperCase()}</p>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-[#0b5a45]/18 bg-white px-5 py-12 text-center">
          <p className="font-semibold text-[#0b3e31]">По выбранным условиям товаров нет</p>
          <p className="mt-2 text-sm text-[#6a7f76]">Измените запрос или сбросьте фильтры.</p>
          <button
            type="button"
            onClick={resetFilters}
            className={adminCx(adminSecondaryButtonClassName, 'mt-5')}
          >
            Сбросить фильтры
          </button>
        </div>
      ) : (
        <>
          <div className="mt-4 hidden overflow-hidden rounded-lg border border-[#0b5a45]/10 bg-white md:block">
            <table className="w-full table-fixed border-collapse text-left">
              <thead className="bg-[#eef4ef] text-[11px] font-semibold uppercase tracking-[0.12em] text-[#567068]">
                <tr>
                  <th className="w-[42%] px-4 py-3">Товар</th>
                  <th className="w-[20%] px-4 py-3">Категория</th>
                  <th className="w-[16%] px-4 py-3">Перевод</th>
                  <th className="w-[22%] px-4 py-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0b5a45]/8">
                {filteredProducts.map((product) => {
                  const category = categoryById.get(product.categoryId);
                  return (
                    <tr key={product.id} className="transition hover:bg-[#fbfcfa]">
                      <td className="px-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-[#0b5a45]/10 bg-[#f7f9f6]">
                            <MediaImage
                              src={resolveMediaUrl(product.imageUrl)}
                              alt=""
                              fill
                              sizes="48px"
                              className="object-contain p-1"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-[#0b3e31]">{product.name}</p>
                            {product.description ? (
                              <p className="mt-0.5 truncate text-xs text-[#6a7f76]">
                                {richDescriptionToPlainText(product.description)}
                              </p>
                            ) : (
                              <p className="mt-0.5 text-xs text-[#8a9a93]">Описание не заполнено</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#567068]">
                        <span className="line-clamp-2">{category?.name ?? 'Неизвестная категория'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <TranslationBadge
                          complete={Boolean(product.adminTranslation?.isComplete)}
                          locale={contentLocale}
                        />
                      </td>
                      <td className="px-4 py-3">{renderActions(product, category)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 space-y-3 md:hidden">
            {filteredProducts.map((product) => {
              const category = categoryById.get(product.categoryId);
              return (
                <article
                  key={product.id}
                  className="rounded-lg border border-[#0b5a45]/10 bg-white p-4 shadow-[0_14px_35px_-32px_rgba(11,62,49,0.75)]"
                >
                  <div className="flex min-w-0 gap-3">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-[#0b5a45]/10 bg-[#f7f9f6]">
                      <MediaImage
                        src={resolveMediaUrl(product.imageUrl)}
                        alt=""
                        fill
                        sizes="64px"
                        className="object-contain p-1"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-[#0b3e31]">{product.name}</h3>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#6a7f76]">
                        {category?.name ?? 'Неизвестная категория'}
                      </p>
                      <div className="mt-2">
                        <TranslationBadge
                          complete={Boolean(product.adminTranslation?.isComplete)}
                          locale={contentLocale}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 border-t border-[#0b5a45]/8 pt-3">
                    {renderActions(product, category)}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      <ProductDeleteDialog
        product={productToDelete}
        category={productToDelete ? categoryById.get(productToDelete.categoryId) : undefined}
        contentLocale={contentLocale}
        locale={locale}
        onClose={() => setProductToDelete(null)}
      />
    </>
  );
}
