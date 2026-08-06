import { notFound } from 'next/navigation';
import { FiArrowLeft, FiExternalLink } from 'react-icons/fi';

import {
  AdminEmptyState,
  AdminNotice,
  AdminPanel,
  AdminShell,
} from '@/components/admin/AdminShell';
import CalendarAdminForm from '@/components/admin/calendars/CalendarAdminForm';
import { adminCx, adminSecondaryButtonClassName } from '@/components/admin/adminStyles';
import { Link } from '@/i18n/routing';
import { requireAdminSession } from '@/lib/adminAuthServer';
import { ApiError, getCalendar, noStoreApiFetchOptions } from '@/lib/api';
import { getCalendarHref, getCalendarsAdminCopy } from '@/lib/calendars';
import { parseEntityId } from '@/lib/catalog';
import { normalizeContentLocale, withContentLocale } from '@/lib/contentLocales';

export default async function EditCalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; calendarId: string }>;
  searchParams: Promise<{ contentLocale?: string; error?: string; status?: string }>;
}) {
  const { locale, calendarId: rawCalendarId } = await params;
  await requireAdminSession(locale, `/${locale}/admin/calendars/${rawCalendarId}`);
  const calendarId = parseEntityId(rawCalendarId);
  if (!calendarId) notFound();

  const query = await searchParams;
  const contentLocale = normalizeContentLocale(query.contentLocale);
  const calendarResult = await getCalendar(
    calendarId,
    contentLocale,
    noStoreApiFetchOptions,
    contentLocale,
  )
    .then((calendar) => ({ calendar, error: null }))
    .catch((error: unknown) => ({ calendar: null, error }));

  if (calendarResult.error instanceof ApiError && calendarResult.error.status === 404) {
    notFound();
  }

  const copy = getCalendarsAdminCopy(locale);
  const calendar = calendarResult.calendar;
  const title = calendar?.adminTranslation?.title || calendar?.title || `#${calendarId}`;
  const successMessage =
    query.status === 'created'
      ? copy.statusCreated
      : query.status === 'updated'
        ? copy.statusUpdated
        : null;

  return (
    <AdminShell
      activeTab="calendars"
      backHref={withContentLocale('/admin/calendars', contentLocale)}
      backLabel={locale === 'en' ? 'Back to calendar items' : 'К списку записей'}
      contentLocale={contentLocale}
      contentLocaleHref={`/admin/calendars/${calendarId}`}
      description={
        locale === 'en'
          ? 'Edit text and language-specific media without crowding the calendar list.'
          : 'Редактируйте текст и языковые медиа отдельно от компактного списка календарей.'
      }
      locale={locale}
      title={title}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link
            href={withContentLocale('/admin/calendars', contentLocale)}
            className={adminCx(adminSecondaryButtonClassName, 'gap-2')}>
            <FiArrowLeft aria-hidden="true" />
            {locale === 'en' ? 'Back to calendar items' : 'Назад к записям'}
          </Link>
          {calendar ? (
            <Link
              href={getCalendarHref(calendar)}
              className={adminCx(adminSecondaryButtonClassName, 'gap-2')}>
              <FiExternalLink aria-hidden="true" />
              {locale === 'en' ? 'Open on site' : 'Открыть на сайте'}
            </Link>
          ) : null}
        </div>

        <AdminPanel
          badge={contentLocale === 'ru' ? (locale === 'en' ? 'Base version' : 'Основная версия') : `${locale === 'en' ? 'Translation' : 'Перевод'} ${contentLocale.toUpperCase()}`}
          title={locale === 'en' ? 'Calendar item' : 'Запись календаря'}
          description={
            contentLocale === 'ru'
              ? locale === 'en'
                ? 'The base text and shared images are edited here.'
                : 'Здесь редактируются основной текст и общие изображения.'
              : locale === 'en'
                ? 'Changes apply only to the selected language. Shared images stay unchanged.'
                : 'Изменения применяются только к выбранному языку. Общие изображения не меняются.'
          }>
          {!calendar ? (
            <div className="space-y-5">
              <AdminNotice tone="error">
                {locale === 'en'
                  ? 'The calendar item could not be loaded. Check the backend API and try again.'
                  : 'Не удалось загрузить запись календаря. Проверьте backend API и повторите попытку.'}
              </AdminNotice>
              <AdminEmptyState
                badge={locale === 'en' ? 'Load error' : 'Ошибка загрузки'}
                title={locale === 'en' ? 'The editor is temporarily unavailable' : 'Редактор временно недоступен'}
                description={
                  locale === 'en'
                    ? 'Refresh the page after the backend connection is restored.'
                    : 'Обновите страницу после восстановления соединения с backend API.'
                }
              />
            </div>
          ) : (
            <CalendarAdminForm
              key={`${calendar.id}:${contentLocale}`}
              calendar={calendar}
              contentLocale={contentLocale}
              errorMessage={query.error}
              locale={locale}
              mode="edit"
              successMessage={successMessage}
            />
          )}
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
