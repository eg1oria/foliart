import { FiArrowLeft, FiEdit3, FiExternalLink } from 'react-icons/fi';

import { AdminEmptyState, AdminNotice, AdminPanel, AdminShell } from '@/components/admin/AdminShell';
import {
  adminCx,
  adminSecondaryButtonClassName,
} from '@/components/admin/adminStyles';
import { Link } from '@/i18n/routing';
import { requireAdminSession } from '@/lib/adminAuthServer';
import { getCategories, noStoreApiFetchOptions } from '@/lib/api';
import { normalizeContentLocale, withContentLocale } from '@/lib/contentLocales';
import { getCategoryHref } from '@/lib/catalog';

export default async function ProductCategoriesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ contentLocale?: string }>;
}) {
  const { locale } = await params;
  await requireAdminSession(locale, `/${locale}/admin/products/categories`);
  const query = await searchParams;
  const contentLocale = normalizeContentLocale(query.contentLocale);
  const categoriesResult = await getCategories(
    contentLocale,
    noStoreApiFetchOptions,
    contentLocale,
  )
    .then((categories) => ({ categories, error: false as const }))
    .catch(() => ({ categories: [], error: true as const }));
  const missingTranslations = categoriesResult.categories.filter(
    (category) => !category.adminTranslation?.isComplete,
  ).length;

  return (
    <AdminShell
      activeTab="products"
      backHref={withContentLocale('/admin/products', contentLocale)}
      backLabel="К списку товаров"
      contentLocale={contentLocale}
      contentLocaleHref="/admin/products/categories"
      description="Контролируйте названия и описания категорий для каждого языка без изменения их структуры."
      locale={locale}
      title="Переводы категорий"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link
            href={withContentLocale('/admin/products', contentLocale)}
            className={adminCx(adminSecondaryButtonClassName, 'gap-2')}
          >
            <FiArrowLeft aria-hidden="true" />
            Назад к товарам
          </Link>
          <span className="rounded-md border border-[#0b5a45]/10 bg-white px-3 py-2 text-xs font-semibold text-[#567068]">
            Не заполнено: {missingTranslations} · {contentLocale.toUpperCase()}
          </span>
        </div>

        <AdminPanel
          badge="Категории"
          title="Локализованный контент"
          description="Создание и удаление категорий здесь недоступно; изменяются только название и описание."
        >
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
              description="Категории появятся после добавления в основной каталог."
            />
          ) : (
            <div className="overflow-hidden rounded-lg border border-[#0b5a45]/10 bg-white">
              <div className="hidden grid-cols-[minmax(0,1fr)_140px_170px_220px] gap-4 bg-[#eef4ef] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#567068] md:grid">
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
                      className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1fr)_140px_170px_220px] md:items-center md:gap-4"
                    >
                      <div className="min-w-0">
                        <h2 className="font-semibold text-[#0b3e31]">{category.name}</h2>
                        <p className="mt-1 line-clamp-1 text-xs text-[#6a7f76]">
                          {category.description || 'Описание не заполнено'}
                        </p>
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
