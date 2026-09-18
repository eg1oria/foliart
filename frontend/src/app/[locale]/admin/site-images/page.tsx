import { AdminNotice, AdminPanel, AdminShell } from '@/components/admin/AdminShell';
import SiteImagesAdminBoard from '@/components/admin/site-images/SiteImagesAdminBoard';
import { requireAdminSection } from '@/lib/adminAuthServer';
import { canManageSection } from '@/lib/adminPermissions';
import { getCategories, getProducts, getSiteImages, noStoreApiFetchOptions } from '@/lib/api';
import { getProductHref } from '@/lib/catalog';
import { siteImageKeys, type SiteImageMap } from '@/lib/siteImages';

/**
 * The specialist portrait and the fallback certificate are only rendered on a
 * product card, so their "open on site" link needs a real one. Any product
 * will do; without one the link falls back to the catalog.
 */
async function getSampleProductPath(locale: string) {
  try {
    const [categories, products] = await Promise.all([
      getCategories(locale),
      getProducts(undefined, locale),
    ]);
    const categoriesById = new Map(categories.map((category) => [category.id, category]));

    for (const product of products) {
      const category = categoriesById.get(product.categoryId);
      if (category) return getProductHref(category, product);
    }
  } catch {
    // The link is a convenience; a backend hiccup must not break the page.
  }

  return null;
}

export default async function AdminSiteImagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; key?: string; status?: string }>;
}) {
  const { locale } = await params;
  const session = await requireAdminSection(
    locale,
    'site-images',
    'view',
    `/${locale}/admin/site-images`,
  );
  const canManage = canManageSection(session, 'site-images');
  const query = await searchParams;
  const [imagesResult, productPath] = await Promise.all([
    getSiteImages(noStoreApiFetchOptions)
      .then((images) => ({ images, error: false as const }))
      .catch(() => ({ images: {} as SiteImageMap, error: true as const })),
    getSampleProductPath(locale),
  ]);
  const { images } = imagesResult;
  // Only registry keys count: a row left behind by a renamed slot must not be
  // reported as a replaced photo the admin can no longer see.
  const replacedCount = siteImageKeys.filter((key) => images[key]).length;
  const successMessage =
    query.status === 'updated'
      ? 'Изображение загружено.'
      : query.status === 'reset'
        ? 'Слот вернулся к изображению, встроенному в сайт.'
        : null;

  return (
    <AdminShell
      description="Фотографии на страницах публичного сайта."
      title="Изображения сайта"
      stats={[
        { label: 'Всего слотов', value: String(siteImageKeys.length) },
        {
          label: 'Заменено',
          value: String(replacedCount),
          hint: replacedCount ? undefined : 'Сайт показывает встроенные изображения',
        },
      ]}>
      <div className="space-y-4">
        {successMessage ? <AdminNotice tone="success">{successMessage}</AdminNotice> : null}
        {query.error ? <AdminNotice tone="error">{query.error}</AdminNotice> : null}
        {imagesResult.error ? (
          <AdminNotice tone="error">
            Не удалось загрузить список изображений. Проверьте backend API и обновите страницу — на
            сайте сейчас показываются встроенные фотографии.
          </AdminNotice>
        ) : null}

        <AdminPanel
          title="Фотографии страниц"
          description={
            canManage
              ? 'Нажмите на фото или перетащите на него новый файл, затем «Сохранить».'
              : 'Только просмотр — для замены нужен полный доступ к разделу.'
          }>
          <SiteImagesAdminBoard
            canManage={canManage}
            highlightKey={query.key}
            images={images}
            locale={locale}
            productPath={productPath}
          />
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
