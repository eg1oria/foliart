import { FiEdit3, FiExternalLink, FiImage, FiPlus, FiTrash2 } from 'react-icons/fi';

import AdminDeleteButton from '@/components/admin/AdminDeleteButton';
import { AdminEmptyState, AdminNotice, AdminPanel, AdminShell } from '@/components/admin/AdminShell';
import {
  adminCx,
  adminDangerButtonClassName,
  adminPrimaryButtonClassName,
  adminSecondaryButtonClassName,
} from '@/components/admin/adminStyles';
import MediaImage from '@/components/catalog/MediaImage';
import { Link } from '@/i18n/routing';
import { requireAdminSection } from '@/lib/adminAuthServer';
import { canManageSection } from '@/lib/adminPermissions';
import { getCategories, noStoreApiFetchOptions } from '@/lib/api';
import { normalizeContentLocale, withContentLocale } from '@/lib/contentLocales';
import { getCategoryHref } from '@/lib/catalog';
import { resolveMediaUrl } from '@/lib/media';
import { richDescriptionToPlainText } from '@/lib/richDescription';

import { deleteCategoryAction } from '../actions';

function getStatusMessage(status?: string) {
  if (status === 'created') return 'Категория создана.';
  if (status === 'deleted') return 'Категория удалена.';
  return null;
}

export default async function ProductCategoriesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ contentLocale?: string; error?: string; status?: string }>;
}) {
  const { locale } = await params;
  const session = await requireAdminSection(
    locale,
    'products',
    'view',
    `/${locale}/admin/products/categories`,
  );
  const canManage = canManageSection(session, 'products');
  const query = await searchParams;
  const contentLocale = normalizeContentLocale(query.contentLocale);
  const statusMessage = getStatusMessage(query.status);
  const categoriesResult = await getCategories(
    contentLocale,
    noStoreApiFetchOptions,
    contentLocale,
  )
    .then((categories) => ({ categories, error: false as const }))
    .catch(() => ({ categories: [], error: true as const }));

  return (
    <AdminShell
      description="Добавляйте и удаляйте категории каталога, контролируйте их названия, описания и изображения."
      title="Категории каталога"
    >
      <div className="mx-auto max-w-6xl">
        {canManage ? (
          <div className="mb-4 flex justify-end">
            <Link
              href={withContentLocale('/admin/products/categories/new', 'ru')}
              className={adminCx(adminPrimaryButtonClassName, 'gap-2')}
            >
              <FiPlus aria-hidden="true" />
              Добавить категорию
            </Link>
          </div>
        ) : null}

        <AdminPanel
          badge="Категории"
          title="Структура и локализованный контент"
          description="Удалить можно только пустую категорию — товары никогда не удаляются вместе с ней."
        >
          <div className="mb-5 space-y-4 empty:mb-0">
            {statusMessage ? <AdminNotice tone="success">{statusMessage}</AdminNotice> : null}
            {query.error ? <AdminNotice tone="error">{query.error}</AdminNotice> : null}
          </div>

          {categoriesResult.error ? (
            <div className="space-y-5">
              <AdminNotice tone="error">Не удалось загрузить категории.</AdminNotice>
              <AdminEmptyState
                badge="Ошибка загрузки"
                title="Категории временно недоступны"
                description="Проверьте backend API и обновите страницу."
              />
            </div>
          ) : categoriesResult.categories.length === 0 ? (
            <AdminEmptyState
              badge="Пусто"
              title="Категорий пока нет"
              description="Добавьте первую категорию — без неё товары создать нельзя."
            />
          ) : (
            <div className="overflow-hidden rounded-lg border border-[#0b5a45]/10 bg-white">
              <div className="hidden grid-cols-[minmax(0,1fr)_140px_170px_260px] gap-4 bg-[#eef4ef] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#567068] md:grid">
                <span>Категория</span>
                <span>Товаров</span>
                <span>Статус</span>
                <span className="text-right">Действия</span>
              </div>
              <div className="divide-y divide-[#0b5a45]/8">
                {categoriesResult.categories.map((category) => {
                  const complete = Boolean(category.adminTranslation?.isComplete);
                  return (
                    <article
                      key={category.id}
                      className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1fr)_140px_170px_260px] md:items-center md:gap-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-[#0b5a45]/10 bg-white">
                          <MediaImage
                            src={resolveMediaUrl(category.imageUrl)}
                            alt=""
                            fill
                            sizes="48px"
                            className="object-contain p-1"
                            emptyState={
                              <div className="flex h-full items-center justify-center text-[#8a9a93]">
                                <FiImage aria-hidden="true" />
                              </div>
                            }
                          />
                        </div>
                        <div className="min-w-0">
                          <h2 className="font-semibold text-[#0b3e31]">{category.name}</h2>
                          <p className="mt-1 line-clamp-1 text-xs text-[#6a7f76]">
                            {richDescriptionToPlainText(category.description) ||
                              'Описание не заполнено'}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-[#567068]">{category.productCount}</p>
                      <div>
                        <span
                          className={adminCx(
                            'inline-flex rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]',
                            complete
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700',
                          )}
                        >
                          {complete ? 'Заполнено' : 'Нужно заполнить'}
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={getCategoryHref(category)}
                          locale={contentLocale as 'ru' | 'en' | 'fr' | 'es'}
                          aria-label={`Открыть категорию ${category.name}`}
                          className={adminCx(
                            adminSecondaryButtonClassName,
                            'h-9 min-h-9 w-9 px-0',
                          )}
                        >
                          <FiExternalLink aria-hidden="true" />
                        </Link>
                        {canManage ? (
                          <>
                            <Link
                              href={withContentLocale(
                                `/admin/products/categories/${category.id}`,
                                contentLocale,
                              )}
                              className={adminCx(
                                adminSecondaryButtonClassName,
                                'h-9 min-h-9 gap-1.5 px-3 text-xs',
                              )}
                            >
                              <FiEdit3 aria-hidden="true" />
                              Изменить
                            </Link>
                            {category.productCount > 0 ? (
                              <button
                                type="button"
                                disabled
                                aria-label={`Удалить категорию ${category.name}`}
                                title="В категории есть товары: перенесите их в другую категорию в карточке товара или удалите"
                                className={adminCx(
                                  adminDangerButtonClassName,
                                  'h-9 min-h-9 w-9 cursor-not-allowed px-0',
                                )}
                              >
                                <FiTrash2 aria-hidden="true" />
                              </button>
                            ) : (
                              <form action={deleteCategoryAction}>
                                <input type="hidden" name="locale" value={locale} />
                                <input
                                  type="hidden"
                                  name="contentLocale"
                                  value={contentLocale}
                                />
                                <input type="hidden" name="categoryId" value={category.id} />
                                <AdminDeleteButton
                                  className={adminCx(
                                    adminDangerButtonClassName,
                                    'h-9 min-h-9 w-9 px-0',
                                  )}
                                  confirmMessage={`Удалить категорию «${category.name}»?`}
                                  iconOnly
                                  pendingLabel="Удаление…"
                                >
                                  Удалить
                                </AdminDeleteButton>
                              </form>
                            )}
                          </>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
