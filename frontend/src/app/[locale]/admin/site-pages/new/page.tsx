import { FiArrowLeft } from 'react-icons/fi';

import { AdminPanel, AdminShell } from '@/components/admin/AdminShell';
import SitePageSettingsForm from '@/components/admin/site-pages/SitePageSettingsForm';
import { adminCx, adminSecondaryButtonClassName } from '@/components/admin/adminStyles';
import { Link } from '@/i18n/routing';
import { requireAdminSection } from '@/lib/adminAuthServer';

export default async function NewSitePagePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdminSection(locale, 'site-pages', 'manage', `/${locale}/admin/site-pages/new`);

  return (
    <AdminShell
      description="Сначала задайте адрес и вид страницы — HTML для каждого языка добавляется на следующем шаге."
      title="Новая страница">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4">
          <Link href="/admin/site-pages" className={adminCx(adminSecondaryButtonClassName, 'gap-2')}>
            <FiArrowLeft aria-hidden="true" />
            Назад к страницам
          </Link>
        </div>

        <AdminPanel
          badge="Создание"
          title="Адрес и вид страницы"
          description="Новая страница не видна на сайте, пока вы не опубликуете хотя бы один язык.">
          <SitePageSettingsForm locale={locale} mode="create" />
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
