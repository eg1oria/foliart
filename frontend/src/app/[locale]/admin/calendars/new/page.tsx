import { redirect } from 'next/navigation';
import { FiArrowLeft } from 'react-icons/fi';

import { AdminPanel, AdminShell } from '@/components/admin/AdminShell';
import CalendarAdminForm from '@/components/admin/calendars/CalendarAdminForm';
import { adminCx, adminSecondaryButtonClassName } from '@/components/admin/adminStyles';
import { Link } from '@/i18n/routing';
import { requireAdminSection } from '@/lib/adminAuthServer';
import { getCalendarsAdminCopy } from '@/lib/calendars';
import { normalizeContentLocale, withContentLocale } from '@/lib/contentLocales';

export default async function NewCalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ contentLocale?: string; error?: string }>;
}) {
  const { locale } = await params;
  const session = await requireAdminSection(locale, 'calendars', 'manage', `/${locale}/admin/calendars/new`);

  const query = await searchParams;
  const contentLocale = normalizeContentLocale(query.contentLocale);
  if (contentLocale !== 'ru') {
    redirect(`/${locale}/admin/calendars/new`);
  }

  const copy = getCalendarsAdminCopy(locale);

  return (
    <AdminShell
      session={session}
      activeTab="calendars"
      backHref={withContentLocale('/admin/calendars', 'ru')}
      backLabel={locale === 'en' ? 'Back to calendar items' : 'К списку записей'}
      contentLocale="ru"
      contentLocaleHref="/admin/calendars"
      description={
        locale === 'en'
          ? 'Create the base Russian calendar item. Translations can be added after the first save.'
          : 'Создайте основную русскую запись. Переводы можно добавить после первого сохранения.'
      }
      locale={locale}
      title={copy.adminFormTitle}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-4">
          <Link
            href={withContentLocale('/admin/calendars', 'ru')}
            className={adminCx(adminSecondaryButtonClassName, 'gap-2')}>
            <FiArrowLeft aria-hidden="true" />
            {locale === 'en' ? 'Back to calendar items' : 'Назад к записям'}
          </Link>
        </div>

        <AdminPanel
          badge={locale === 'en' ? 'Create' : 'Создание'}
          title={copy.adminFormTitle}
          description={
            locale === 'en'
              ? 'The title, description, and first two images are required. The other media can be added later.'
              : 'Название, описание и первые два изображения обязательны. Остальные медиа можно добавить позже.'
          }>
          <CalendarAdminForm
            contentLocale="ru"
            errorMessage={query.error}
            locale={locale}
            mode="create"
          />
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
