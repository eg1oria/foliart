import { FiArrowLeft } from 'react-icons/fi';

import { AdminEmptyState, AdminNotice, AdminPanel, AdminShell } from '@/components/admin/AdminShell';
import ProductAdminForm from '@/components/admin/products/ProductAdminForm';
import { adminCx, adminSecondaryButtonClassName } from '@/components/admin/adminStyles';
import { Link } from '@/i18n/routing';
import { requireAdminSession } from '@/lib/adminAuthServer';
import { getCategories, noStoreApiFetchOptions } from '@/lib/api';
import { withContentLocale } from '@/lib/contentLocales';

export default async function NewProductPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdminSession(locale, `/${locale}/admin/products/new`);
  const categoriesResult = await getCategories('ru', noStoreApiFetchOptions, 'ru')
    .then((categories) => ({ categories, error: false as const }))
    .catch(() => ({ categories: [], error: true as const }));

  return (
    <AdminShell
      activeTab="products"
      backHref={withContentLocale('/admin/products', 'ru')}
      backLabel="К списку товаров"
      contentLocale="ru"
      contentLocaleHref="/admin/products"
      description="Создайте базовую русскую карточку. Переводы добавляются после первого сохранения."
      locale={locale}
      title="Новый товар"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-4">
          <Link
            href={withContentLocale('/admin/products', 'ru')}
            className={adminCx(adminSecondaryButtonClassName, 'gap-2')}
          >
            <FiArrowLeft aria-hidden="true" />
            Назад к товарам
          </Link>
        </div>

        <AdminPanel
          badge="Создание"
          title="Основная карточка товара"
          description="Название, категория и русское изображение обязательны. Остальные поля можно дополнить позже."
        >
          {categoriesResult.error ? (
            <div className="space-y-5">
              <AdminNotice tone="error">
                Не удалось загрузить категории. Создание товара временно недоступно.
              </AdminNotice>
              <AdminEmptyState
                badge="Backend недоступен"
                title="Категории не загрузились"
                description="Восстановите соединение с backend API и обновите страницу."
              />
            </div>
          ) : categoriesResult.categories.length === 0 ? (
            <AdminEmptyState
              badge="Нет категорий"
              title="Нельзя создать товар"
              description="Для товара нужна существующая категория. Добавление категорий не входит в этот редактор."
            />
          ) : (
            <ProductAdminForm
              categories={categoriesResult.categories}
              contentLocale="ru"
              locale={locale}
              mode="create"
            />
          )}
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
