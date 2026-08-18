import { FiArrowLeft } from 'react-icons/fi';

import { AdminPanel, AdminShell } from '@/components/admin/AdminShell';
import PartnerAdminForm from '@/components/admin/partners/PartnerAdminForm';
import { adminCx, adminSecondaryButtonClassName } from '@/components/admin/adminStyles';
import { Link } from '@/i18n/routing';
import { requireAdminSection } from '@/lib/adminAuthServer';

export default async function NewPartnerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await requireAdminSection(
    locale,
    'partners',
    'manage',
    `/${locale}/admin/partners/new`,
  );

  return (
    <AdminShell
      session={session}
      activeTab="partners"
      backHref="/admin/partners"
      backLabel="К списку партнёров"
      contentLocale="ru"
      contentLocaleHref="/admin/partners"
      contentLocaleHint="Карточки партнёров одинаковы для всех языков сайта."
      description="Заполните только то, что нужно показать: пустые поля в карточку не попадут."
      locale={locale}
      title="Новый партнёр">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4">
          <Link
            href="/admin/partners"
            className={adminCx(adminSecondaryButtonClassName, 'gap-2')}>
            <FiArrowLeft aria-hidden="true" />
            Назад к партнёрам
          </Link>
        </div>

        <AdminPanel
          badge="Создание"
          title="Карточка партнёра"
          description="Обязательно только наименование — логотип, адрес, телефоны, e-mail и сайт можно добавить позже."
        >
          <PartnerAdminForm locale={locale} mode="create" />
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
