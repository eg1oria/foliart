import { AdminNotice, AdminPanel, AdminShell } from '@/components/admin/AdminShell';
import SiteImagesAdminBoard from '@/components/admin/site-images/SiteImagesAdminBoard';
import { requireAdminSection } from '@/lib/adminAuthServer';
import { canManageSection } from '@/lib/adminPermissions';
import { getSiteImages, noStoreApiFetchOptions } from '@/lib/api';
import { siteImageKeys, type SiteImageMap } from '@/lib/siteImages';

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
  const imagesResult = await getSiteImages(noStoreApiFetchOptions)
    .then((images) => ({ images, error: false as const }))
    .catch(() => ({ images: {} as SiteImageMap, error: true as const }));
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
          />
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
