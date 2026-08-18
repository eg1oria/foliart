import { FiArrowLeft } from 'react-icons/fi';

import { AdminPanel, AdminShell } from '@/components/admin/AdminShell';
import RegionalContactAdminForm from '@/components/admin/contacts/RegionalContactAdminForm';
import { adminCx, adminSecondaryButtonClassName } from '@/components/admin/adminStyles';
import { Link } from '@/i18n/routing';
import { requireAdminSection } from '@/lib/adminAuthServer';

export default async function NewRegionalContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await requireAdminSection(
    locale,
    'contacts',
    'manage',
    `/${locale}/admin/contacts/new`,
  );

  return (
    <AdminShell
      session={session}
      activeTab="contacts"
      backHref="/admin/contacts"
      backLabel="К списку контактов"
      contentLocale="ru"
      contentLocaleHref="/admin/contacts"
      contentLocaleHint="Список контактов одинаков для всех языков сайта."
      description="Заполните только то, что нужно показать: пустые поля в список не попадут."
      locale={locale}
      title="Новый контакт">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4">
          <Link href="/admin/contacts" className={adminCx(adminSecondaryButtonClassName, 'gap-2')}>
            <FiArrowLeft aria-hidden="true" />
            Назад к контактам
          </Link>
        </div>

        <AdminPanel
          badge="Создание"
          title="Контакт в регионе"
          description="Обязательно только наименование региона — ФИО, телефон и адрес можно добавить позже."
        >
          <RegionalContactAdminForm locale={locale} mode="create" />
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
