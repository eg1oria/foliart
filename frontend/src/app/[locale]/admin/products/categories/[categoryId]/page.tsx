import { notFound } from 'next/navigation';
import { FiArrowLeft } from 'react-icons/fi';

import { AdminEmptyState, AdminNotice, AdminPanel, AdminShell } from '@/components/admin/AdminShell';
import CategoryTranslationForm from '@/components/admin/products/CategoryTranslationForm';
import { adminCx, adminSecondaryButtonClassName } from '@/components/admin/adminStyles';
import { Link } from '@/i18n/routing';
import { requireAdminSession } from '@/lib/adminAuthServer';
import { ApiError, getCategory, noStoreApiFetchOptions } from '@/lib/api';
import { normalizeContentLocale, withContentLocale } from '@/lib/contentLocales';
import { getCategoryHref, parseEntityId } from '@/lib/catalog';

export default async function EditProductCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ categoryId: string; locale: string }>;
  searchParams: Promise<{ contentLocale?: string; status?: string }>;
}) {
  const { categoryId: rawCategoryId, locale } = await params;
  await requireAdminSession(
    locale,
    `/${locale}/admin/products/categories/${rawCategoryId}`,
  );
  const categoryId = parseEntityId(rawCategoryId);
  if (!categoryId) notFound();

  const query = await searchParams;
  const contentLocale = normalizeContentLocale(query.contentLocale);
  const categoryResult = await getCategory(
    categoryId,
    contentLocale,
    noStoreApiFetchOptions,
    contentLocale,
  )
    .then((category) => ({ category, error: null }))
    .catch((error: unknown) => ({ category: null, error }));

  if (categoryResult.error instanceof ApiError && categoryResult.error.status === 404) {
    notFound();
  }

  return (
    <AdminShell
      activeTab="products"
      backHref={withContentLocale('/admin/products/categories', contentLocale)}
      backLabel="К категориям"
      contentLocale={contentLocale}
      contentLocaleHref={`/admin/products/categories/${categoryId}`}
      description="Изменения применяются только к выбранному языку и не затрагивают товары категории."
      locale={locale}
      title={categoryResult.category?.name ?? `Категория #${categoryId}`}
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-4">
          <Link
            href={withContentLocale('/admin/products/categories', contentLocale)}
            className={adminCx(adminSecondaryButtonClassName, 'gap-2')}
          >
            <FiArrowLeft aria-hidden="true" />
            Назад к категориям
          </Link>
        </div>

        <AdminPanel
          badge={`Категория #${categoryId}`}
          title={`Контент ${contentLocale.toUpperCase()}`}
          description="Название и описание используются в каталоге выбранного языка."
        >
          {!categoryResult.category ? (
            <div className="space-y-5">
              <AdminNotice tone="error">Не удалось загрузить категорию.</AdminNotice>
              <AdminEmptyState
                badge="Ошибка загрузки"
                title="Редактор временно недоступен"
                description="Проверьте backend API и обновите страницу."
              />
            </div>
          ) : (
            <CategoryTranslationForm
              key={`${categoryResult.category.id}:${contentLocale}`}
              category={categoryResult.category}
              contentLocale={contentLocale}
              locale={locale}
              publicHref={getCategoryHref(categoryResult.category)}
              successMessage={query.status === 'updated' ? 'Категория сохранена.' : null}
            />
          )}
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
