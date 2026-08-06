import { redirect } from 'next/navigation';
import { FiEdit3, FiExternalLink, FiFileText, FiPlus } from 'react-icons/fi';

import AdminDeleteButton from '@/components/admin/AdminDeleteButton';
import {
  AdminEmptyState,
  AdminNotice,
  AdminPanel,
  AdminShell,
} from '@/components/admin/AdminShell';
import {
  adminCx,
  adminDangerButtonClassName,
  adminPrimaryButtonClassName,
  adminSecondaryButtonClassName,
} from '@/components/admin/adminStyles';
import MediaImage from '@/components/catalog/MediaImage';
import { Link } from '@/i18n/routing';
import { requireAdminSession } from '@/lib/adminAuthServer';
import { getCalendars, noStoreApiFetchOptions, type CalendarEntry } from '@/lib/api';
import { getCalendarHref, getCalendarsAdminCopy } from '@/lib/calendars';
import { normalizeContentLocale, withContentLocale } from '@/lib/contentLocales';
import { parseEntityId } from '@/lib/catalog';
import { resolveMediaUrl } from '@/lib/media';
import { richDescriptionToPlainText } from '@/lib/richDescription';

import { deleteCalendarAction } from './actions';

type AdminPageSearchParams = {
  calendar?: string;
  contentLocale?: string;
  edit?: string;
  error?: string;
  manageError?: string;
  status?: string;
};

function getImageCount(calendar: CalendarEntry) {
  return [
    calendar.imageUrl1,
    calendar.imageUrl2,
    calendar.imageUrl3,
    calendar.imageUrl4,
  ].filter((image) => image?.trim()).length;
}

export default async function AdminCalendarsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<AdminPageSearchParams>;
}) {
  const { locale } = await params;
  await requireAdminSession(locale, `/${locale}/admin/calendars`);

  const query = await searchParams;
  const contentLocale = normalizeContentLocale(query.contentLocale);
  const copy = getCalendarsAdminCopy(locale);
  const editCalendarId = parseEntityId(query.edit ?? '');
  const statusCalendarId = parseEntityId(query.calendar ?? '');
  const legacyEditorId = editCalendarId ?? (query.status === 'updated' ? statusCalendarId : null);

  if (legacyEditorId) {
    const editorParams = new URLSearchParams({ contentLocale });
    if (query.error) editorParams.set('error', query.error);
    if (query.status === 'updated') editorParams.set('status', 'updated');
    redirect(`/${locale}/admin/calendars/${legacyEditorId}?${editorParams.toString()}`);
  }

  const calendars = await getCalendars(contentLocale, noStoreApiFetchOptions, contentLocale);
  const successMessage =
    query.status === 'created'
      ? copy.statusCreated
      : query.status === 'deleted'
        ? locale === 'en'
          ? 'Calendar item deleted successfully.'
          : 'Запись календаря удалена.'
        : null;
  const manageBadge = locale === 'en' ? 'Manage' : 'Управление';
  const addLabel = locale === 'en' ? 'Add calendar item' : 'Добавить запись';
  const editLabel = locale === 'en' ? 'Edit' : 'Изменить';
  const deleteLabel = locale === 'en' ? 'Delete' : 'Удалить';
  const deletingLabel = locale === 'en' ? 'Deleting...' : 'Удаление...';

  const renderTranslationBadge = (calendar: CalendarEntry) => {
    const complete = Boolean(calendar.adminTranslation?.isComplete);

    return (
      <span
        className={adminCx(
          'inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]',
          complete ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700',
        )}>
        {complete
          ? `${contentLocale.toUpperCase()} · ${locale === 'en' ? 'ready' : 'готово'}`
          : `${contentLocale.toUpperCase()} · ${locale === 'en' ? 'missing' : 'не заполнено'}`}
      </span>
    );
  };

  const renderMediaStatus = (calendar: CalendarEntry) => {
    const imageCount = getImageCount(calendar);
    const hasPdf = Boolean(calendar.adminTranslation?.pdfUrl?.trim());

    return (
      <div className="text-sm text-[#567068]">
        <p>{locale === 'en' ? `${imageCount}/4 photos` : `${imageCount}/4 фото`}</p>
        <p
          className={adminCx(
            'mt-1 inline-flex items-center gap-1 text-xs',
            hasPdf ? 'text-[#0b5a45]' : 'text-[#8a9a93]',
          )}>
          <FiFileText aria-hidden="true" />
          {hasPdf
            ? locale === 'en'
              ? 'PDF ready'
              : 'PDF загружен'
            : locale === 'en'
              ? 'No PDF'
              : 'Без PDF'}
        </p>
      </div>
    );
  };

  const renderActions = (calendar: CalendarEntry) => (
    <div className="flex items-center justify-end gap-1.5">
      <Link
        href={getCalendarHref(calendar)}
        aria-label={
          locale === 'en'
            ? `Open ${calendar.title} on the site`
            : `Открыть запись «${calendar.title}» на сайте`
        }
        className={adminCx(adminSecondaryButtonClassName, 'h-9 min-h-9 w-9 px-0')}>
        <FiExternalLink aria-hidden="true" />
      </Link>
      <Link
        href={withContentLocale(`/admin/calendars/${calendar.id}`, contentLocale)}
        className={adminCx(adminSecondaryButtonClassName, 'h-9 min-h-9 gap-1.5 px-3 text-xs')}>
        <FiEdit3 aria-hidden="true" />
        {editLabel}
      </Link>
      <form action={deleteCalendarAction}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="contentLocale" value={contentLocale} />
        <input type="hidden" name="calendarId" value={calendar.id} />
        <input
          type="hidden"
          name="calendarTitle"
          value={calendar.slugSourceTitle ?? calendar.title}
        />
        <AdminDeleteButton
          className={adminCx(adminDangerButtonClassName, 'h-9 min-h-9 w-9 px-0')}
          confirmMessage={
            locale === 'en'
              ? `Delete calendar item "${calendar.title}"? This cannot be undone.`
              : `Удалить запись календаря «${calendar.title}»? Это действие нельзя отменить.`
          }
          iconOnly
          pendingLabel={deletingLabel}>
          {deleteLabel}
        </AdminDeleteButton>
      </form>
    </div>
  );

  return (
    <AdminShell
      activeTab="calendars"
      backHref="/calendar"
      backLabel={copy.backToSite}
      contentLocale={contentLocale}
      description={
        locale === 'en'
          ? 'Browse calendar entries in a compact list and open a separate editor for content and media.'
          : 'Просматривайте записи компактным списком и открывайте отдельный редактор для текста и медиа.'
      }
      locale={locale}
      title={copy.adminTitle}>
      <AdminPanel
        id="manage-calendars"
        badge={manageBadge}
        title={copy.existingTitle}
        description={
          locale === 'en'
            ? 'The list shows translation, gallery, and PDF readiness for the selected content language.'
            : 'В списке видны состояние перевода, галереи и PDF для выбранного языка контента.'
        }
        tone="muted"
        headerContent={
          <Link
            href={withContentLocale('/admin/calendars/new', 'ru')}
            className={adminCx(adminPrimaryButtonClassName, 'gap-2')}>
            <FiPlus aria-hidden="true" />
            {addLabel}
          </Link>
        }>
        {successMessage ? (
          <div className="mb-5">
            <AdminNotice tone="success">{successMessage}</AdminNotice>
          </div>
        ) : null}
        {query.error ? (
          <div className="mb-5">
            <AdminNotice tone="error">{query.error}</AdminNotice>
          </div>
        ) : null}
        {query.manageError ? (
          <div className="mb-5">
            <AdminNotice tone="error">{query.manageError}</AdminNotice>
          </div>
        ) : null}

        {calendars.length === 0 ? (
          <AdminEmptyState
            badge={manageBadge}
            title={locale === 'en' ? 'Calendar entries will appear here' : 'Записи появятся здесь'}
            description={copy.emptyState}
          />
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-lg border border-[#0b5a45]/10 bg-white md:block">
              <table className="w-full table-fixed border-collapse text-left">
                <thead className="bg-[#eef4ef] text-[11px] font-semibold uppercase tracking-[0.12em] text-[#567068]">
                  <tr>
                    <th className="w-[45%] px-4 py-3">
                      {locale === 'en' ? 'Calendar item' : 'Запись календаря'}
                    </th>
                    <th className="w-[16%] px-4 py-3">{locale === 'en' ? 'Media' : 'Медиа'}</th>
                    <th className="w-[17%] px-4 py-3">
                      {locale === 'en' ? 'Translation' : 'Перевод'}
                    </th>
                    <th className="w-[22%] px-4 py-3 text-right">
                      {locale === 'en' ? 'Actions' : 'Действия'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0b5a45]/8">
                  {calendars.map((calendar) => (
                    <tr
                      key={calendar.id}
                      id={`calendar-${calendar.id}`}
                      className="scroll-mt-6 transition hover:bg-[#fbfcfa]">
                      <td className="px-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-[#0b5a45]/10 bg-[#f7f9f6]">
                            <MediaImage
                              src={resolveMediaUrl(calendar.imageUrl1)}
                              alt=""
                              fill
                              sizes="48px"
                              className="object-cover"
                              emptyState={
                                <div className="h-full w-full bg-[linear-gradient(135deg,#dfe9df,#b1c9b3,#6d8f70)]" />
                              }
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-[#0b3e31]">{calendar.title}</p>
                            <p className="mt-0.5 truncate text-xs text-[#6a7f76]">
                              {richDescriptionToPlainText(calendar.description) ||
                                (locale === 'en'
                                  ? 'Description is not filled in'
                                  : 'Описание не заполнено')}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{renderMediaStatus(calendar)}</td>
                      <td className="px-4 py-3">{renderTranslationBadge(calendar)}</td>
                      <td className="px-4 py-3">{renderActions(calendar)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 md:hidden">
              {calendars.map((calendar) => (
                <article
                  key={calendar.id}
                  id={`calendar-mobile-${calendar.id}`}
                  className="rounded-lg border border-[#0b5a45]/10 bg-white p-4 shadow-[0_14px_35px_-32px_rgba(11,62,49,0.75)]">
                  <div className="flex min-w-0 gap-3">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-[#0b5a45]/10 bg-[#f7f9f6]">
                      <MediaImage
                        src={resolveMediaUrl(calendar.imageUrl1)}
                        alt=""
                        fill
                        sizes="64px"
                        className="object-cover"
                        emptyState={
                          <div className="h-full w-full bg-[linear-gradient(135deg,#dfe9df,#b1c9b3,#6d8f70)]" />
                        }
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 font-semibold text-[#0b3e31]">{calendar.title}</h3>
                      <div className="mt-1">{renderMediaStatus(calendar)}</div>
                      <div className="mt-2">{renderTranslationBadge(calendar)}</div>
                    </div>
                  </div>
                  <div className="mt-4 border-t border-[#0b5a45]/8 pt-3">
                    {renderActions(calendar)}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </AdminPanel>
    </AdminShell>
  );
}
