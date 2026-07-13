import { notFound } from 'next/navigation';
import { FiArrowLeft } from 'react-icons/fi';

import { AdminEmptyState, AdminNotice, AdminPanel, AdminShell } from '@/components/admin/AdminShell';
import ProductAdminForm from '@/components/admin/products/ProductAdminForm';
import { adminCx, adminSecondaryButtonClassName } from '@/components/admin/adminStyles';
import { Link } from '@/i18n/routing';
import { requireAdminSession } from '@/lib/adminAuthServer';
import {
  ApiError,
  getCategories,
  getProduct,
  noStoreApiFetchOptions,
} from '@/lib/api';
import { normalizeContentLocale, withContentLocale } from '@/lib/contentLocales';
import { getProductHref, parseEntityId } from '@/lib/catalog';

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; productId: string }>;
  searchParams: Promise<{ contentLocale?: string; status?: string }>;
}) {
  const { locale, productId: rawProductId } = await params;
  await requireAdminSession(locale, `/${locale}/admin/products/${rawProductId}`);
  const productId = parseEntityId(rawProductId);
  if (!productId) notFound();

  const query = await searchParams;
  const contentLocale = normalizeContentLocale(query.contentLocale);
  const [productResult, categoriesResult] = await Promise.allSettled([
    getProduct(productId, contentLocale, noStoreApiFetchOptions, contentLocale),
    getCategories(contentLocale, noStoreApiFetchOptions, contentLocale),
  ]);

  if (
    productResult.status === 'rejected' &&
    productResult.reason instanceof ApiError &&
    productResult.reason.status === 404
  ) {
    notFound();
  }

  const product = productResult.status === 'fulfilled' ? productResult.value : null;
  const categories = categoriesResult.status === 'fulfilled' ? categoriesResult.value : [];
  const category = product
    ? categories.find((item) => item.id === product.categoryId)
    : undefined;
  const successMessage =
    query.status === 'created'
      ? 'Товар создан. Теперь можно добавить переводы.'
      : query.status === 'updated'
        ? 'Изменения сохранены.'
        : null;

  return (
    <AdminShell
      activeTab="products"
      backHref={withContentLocale('/admin/products', contentLocale)}
      backLabel="К списку товаров"
      contentLocale={contentLocale}
      contentLocaleHref={`/admin/products/${productId}`}
      description="Редактируйте базовую карточку и переводы отдельно, не затрагивая данные других языков."
      locale={locale}
      title={product ? product.name : `Товар #${productId}`}
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link
            href={withContentLocale('/admin/products', contentLocale)}
            className={adminCx(adminSecondaryButtonClassName, 'gap-2')}
          >
            <FiArrowLeft aria-hidden="true" />
            Назад к товарам
          </Link>
          <span className="rounded-md border border-[#0b5a45]/10 bg-white px-3 py-2 text-xs font-semibold text-[#567068]">
            ID {productId} · {contentLocale.toUpperCase()}
          </span>
        </div>

        <AdminPanel
          badge={contentLocale === 'ru' ? 'Основная версия' : 'Перевод'}
          title={contentLocale === 'ru' ? 'Карточка товара' : `Перевод ${contentLocale.toUpperCase()}`}
          description={
            contentLocale === 'ru'
              ? 'Здесь изменяются общие параметры, категория и изображения.'
              : 'Категория и изображения доступны только для просмотра и не будут изменены.'
          }
        >
          {!product || categoriesResult.status === 'rejected' ? (
            <div className="space-y-5">
              <AdminNotice tone="error">
                Не удалось загрузить данные товара. Проверьте backend API и повторите попытку.
              </AdminNotice>
              <AdminEmptyState
                badge="Ошибка загрузки"
                title="Редактор временно недоступен"
                description="Введённые данные не изменялись. Обновите страницу после восстановления соединения."
              />
            </div>
          ) : (
            <ProductAdminForm
              key={`${product.id}:${contentLocale}`}
              categories={categories}
              contentLocale={contentLocale}
              locale={locale}
              mode="edit"
              product={product}
              publicHref={category ? getProductHref(category, product) : undefined}
              successMessage={successMessage}
            />
          )}
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
