import { redirect } from 'next/navigation';
import { FiExternalLink, FiPlus } from 'react-icons/fi';

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
import { requireAdminSection } from '@/lib/adminAuthServer';
import { canManageSection } from '@/lib/adminPermissions';
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
  const session = await requireAdminSection(locale, 'products', 'view', `/${locale}/admin/products`);

  const query = await searchParams;
  const contentLocale = normalizeContentLocale(query.contentLocale);
  const legacyProductId = parseEntityId(query.edit ?? '');
  const legacyCategoryId = parseEntityId(query.category ?? '');

  if (legacyProductId) {
    redirect(`/${locale}/admin/products/${legacyProductId}?contentLocale=${contentLocale}`);
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
  const statusMessage = getStatusMessage(query.status);
  const canManage = canManageSection(session, 'products');

  return (
    <AdminShell
      description="Быстро находите товары, контролируйте переводы и открывайте отдельный редактор без перегруженных форм."
      title="Управление товарами">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/catalog"
          target="_blank"
          className={adminCx(adminSecondaryButtonClassName, 'gap-2')}>
          <FiExternalLink aria-hidden="true" />
          Страница каталога
        </Link>
        {canManage ? (
          <Link
            href={withContentLocale('/admin/products/new', 'ru')}
            className={adminCx(adminPrimaryButtonClassName, 'gap-2')}>
            <FiPlus aria-hidden="true" />
            Добавить товар
          </Link>
        ) : null}
      </div>

      <AdminPanel
        badge="Каталог"
        title="Товары"
        description="Поиск и фильтры работают мгновенно и не запрашивают каталог повторно.">
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
              canManage={canManage}
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
