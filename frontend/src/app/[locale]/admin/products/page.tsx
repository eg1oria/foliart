import { redirect } from 'next/navigation';
import { FiFolder, FiPlus } from 'react-icons/fi';

import {
  AdminEmptyState,
  AdminNotice,
  AdminPanel,
  AdminShell,
} from '@/components/admin/AdminShell';
import ProductAdminList from '@/components/admin/products/ProductAdminList';
import {
  adminCx,
  adminPrimaryButtonClassName,
  adminSecondaryButtonClassName,
} from '@/components/admin/adminStyles';
import { Link } from '@/i18n/routing';
import { requireAdminSession } from '@/lib/adminAuthServer';
import { getCategories, getProducts, noStoreApiFetchOptions } from '@/lib/api';
import { normalizeContentLocale, withContentLocale } from '@/lib/contentLocales';
import { parseEntityId } from '@/lib/catalog';
import {
  normalizeProductCategoryFilter,
  normalizeProductTranslationFilter,
} from '@/lib/productAdmin';

type AdminProductsSearchParams = {
  category?: string;
  categoryFilter?: string;
  contentLocale?: string;
  edit?: string;
  error?: string;
  q?: string;
  status?: string;
  translation?: string;
};

function getStatusMessage(status?: string) {
  if (status === 'deleted') return 'Товар успешно удалён.';
  if (status === 'created') return 'Товар успешно создан.';
  return null;
}

export default async function AdminProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<AdminProductsSearchParams>;
}) {
  const { locale } = await params;
  await requireAdminSession(locale, `/${locale}/admin/products`);

  const query = await searchParams;
  const contentLocale = normalizeContentLocale(query.contentLocale);
  const legacyProductId = parseEntityId(query.edit ?? '');
  const legacyCategoryId = parseEntityId(query.category ?? '');

  if (legacyProductId) {
    redirect(
      `/${locale}/admin/products/${legacyProductId}?contentLocale=${contentLocale}`,
    );
  }

  if (legacyCategoryId) {
    redirect(
      `/${locale}/admin/products/categories/${legacyCategoryId}?contentLocale=${contentLocale}`,
    );
  }

  const [categoriesResult, productsResult] = await Promise.allSettled([
    getCategories(contentLocale, noStoreApiFetchOptions, contentLocale),
    getProducts(undefined, contentLocale, noStoreApiFetchOptions, contentLocale),
  ]);
  const categories = categoriesResult.status === 'fulfilled' ? categoriesResult.value : [];
  const products = productsResult.status === 'fulfilled' ? productsResult.value : [];
  const dataAvailable =
    categoriesResult.status === 'fulfilled' && productsResult.status === 'fulfilled';
  const missingTranslations = products.filter(
    (product) => !product.adminTranslation?.isComplete,
  ).length;
  const statusMessage = getStatusMessage(query.status);

  return (
    <AdminShell
      activeTab="products"
      backHref="/catalog"
      backLabel="Открыть каталог"
      contentLocale={contentLocale}
      description="Быстро находите товары, контролируйте переводы и открывайте отдельный редактор без перегруженных форм."
      locale={locale}
      title="Управление товарами"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-[#0b5a45]/10 bg-white px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6a7f76]">
            Всего товаров
          </p>
          <p className="mt-1 text-2xl font-semibold text-[#0b3e31]">{products.length}</p>
        </div>
        <div className="rounded-lg border border-[#0b5a45]/10 bg-white px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6a7f76]">
            Категорий
          </p>
          <p className="mt-1 text-2xl font-semibold text-[#0b3e31]">{categories.length}</p>
        </div>
        <div className="rounded-lg border border-[#0b5a45]/10 bg-white px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6a7f76]">
            Нужно заполнить {contentLocale.toUpperCase()}
          </p>
          <p className="mt-1 text-2xl font-semibold text-[#0b3e31]">{missingTranslations}</p>
        </div>
      </div>

      <AdminPanel
        className="mt-5"
        badge="Каталог"
        title="Товары"
        description="Поиск и фильтры работают мгновенно и не запрашивают каталог повторно."
        headerContent={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href={withContentLocale('/admin/products/categories', contentLocale)}
              className={adminCx(adminSecondaryButtonClassName, 'gap-2')}
            >
              <FiFolder aria-hidden="true" />
              Переводы категорий
            </Link>
            <Link
              href={withContentLocale('/admin/products/new', 'ru')}
              className={adminCx(adminPrimaryButtonClassName, 'gap-2')}
            >
              <FiPlus aria-hidden="true" />
              Добавить товар
            </Link>
          </div>
        }
      >
        <div className="space-y-4">
          {statusMessage ? <AdminNotice tone="success">{statusMessage}</AdminNotice> : null}
          {query.error ? <AdminNotice tone="error">{query.error}</AdminNotice> : null}
          {!dataAvailable ? (
            <AdminNotice tone="error">
              Не удалось загрузить каталог. Проверьте backend API и повторите попытку.
            </AdminNotice>
          ) : null}
        </div>

        {!dataAvailable ? (
          <div className="mt-5">
            <AdminEmptyState
              badge="Ошибка загрузки"
              title="Каталог временно недоступен"
              description="Обновите страницу после восстановления соединения с backend API."
            />
          </div>
        ) : products.length === 0 ? (
          <div className="mt-5">
            <AdminEmptyState
              badge="Пустой каталог"
              title="Товаров пока нет"
              description="Создайте первый товар на русском языке, затем добавьте переводы."
            />
          </div>
        ) : (
          <div className="mt-5">
            <ProductAdminList
              categories={categories}
              contentLocale={contentLocale}
              initialCategoryId={normalizeProductCategoryFilter(query.categoryFilter)}
              initialQuery={query.q ?? ''}
              initialTranslation={normalizeProductTranslationFilter(query.translation)}
              locale={locale}
              products={products}
            />
          </div>
        )}
      </AdminPanel>
    </AdminShell>
  );
}
