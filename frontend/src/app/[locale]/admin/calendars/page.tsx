import {
  AdminEmptyState,
  AdminNotice,
  AdminPanel,
  AdminShell,
  AdminWorkspace,
} from '@/components/admin/AdminShell';
import {
  adminBadgeClassName,
  adminCx,
  adminDetailsClassName,
  adminFieldClassName,
  adminFileInputClassName,
  adminHintClassName,
  adminInputClassName,
  adminInputOnWhiteClassName,
  adminLabelClassName,
  adminOptionalLabelClassName,
  adminPrimaryButtonClassName,
  adminSecondaryButtonClassName,
  adminSummaryClassName,
  adminTextareaClassName,
  adminTextareaOnWhiteClassName,
  adminTranslationCardClassName,
} from '@/components/admin/adminStyles';
import MediaImage from '@/components/catalog/MediaImage';
import { Link } from '@/i18n/routing';
import { getCalendars, noStoreApiFetchOptions, type CalendarEntry } from '@/lib/api';
import { getCalendarHref, getCalendarsAdminCopy, getCalendarsCopy } from '@/lib/calendars';
import { parseEntityId } from '@/lib/catalog';
import { resolveMediaUrl } from '@/lib/media';
import { FiEdit3, FiExternalLink } from 'react-icons/fi';

import { createCalendarAction, updateCalendarAction } from './actions';

type AdminPageSearchParams = {
  calendar?: string;
  edit?: string;
  error?: string;
  status?: string;
};

type CalendarFormValues = Pick<CalendarEntry, 'title' | 'titleEn' | 'description' | 'descriptionEn'>;

const calendarImageFields = [
  { inputName: 'image1', entryKey: 'imageUrl1', index: 1, createRequired: true },
  { inputName: 'image2', entryKey: 'imageUrl2', index: 2, createRequired: true },
  { inputName: 'image3', entryKey: 'imageUrl3', index: 3, createRequired: false },
  { inputName: 'image4', entryKey: 'imageUrl4', index: 4, createRequired: false },
] as const;

type CalendarImageInputName = (typeof calendarImageFields)[number]['inputName'];

type CalendarImageSlotCopy = Record<
  CalendarImageInputName,
  {
    hint: string;
    title: string;
  }
> & {
  adminSubtitle: string;
  emptySlot: string;
  formDescription: string;
  imageHint: string;
};

function getCalendarImageSlotCopy(locale: string): CalendarImageSlotCopy {
  if (locale === 'en') {
    return {
      adminSubtitle:
        'Create crop calendar items and keep every image in the right slot for the card, hero, details, and lower showcase block.',
      formDescription:
        'Photo 1 is used for the top banner and card cover. Photo 2 is shown beside the description. Photo 3 is the large showcase image, and photo 4 is the background for the lower block.',
      imageHint:
        'Upload JPG, PNG, or WEBP up to 5 MB. The first two photos are required for a new item.',
      emptySlot: 'No photo uploaded yet.',
      image1: {
        title: 'Top banner and card cover',
        hint: 'Shown in the calendar list and at the top of the details page.',
      },
      image2: {
        title: 'Photo beside the description',
        hint: 'Shown in the main content block of the details page.',
      },
      image3: {
        title: 'Large showcase image',
        hint: 'Displayed large in the lower block of the crop page.',
      },
      image4: {
        title: 'Background for the lower block',
        hint: 'Stretches across the lower block behind the large showcase image.',
      },
    };
  }

  return {
    adminSubtitle:
      'Добавляйте записи календаря и раскладывайте фото по понятным слотам для карточки, шапки, блока с описанием и нижнего акцентного блока.',
    formDescription:
      'Фото 1 используется для верхнего баннера и обложки карточки. Фото 2 показывается рядом с описанием. Фото 3 — большая акцентная картинка, а фото 4 идет на фон нижнего блока.',
    imageHint:
      'Поддерживаются JPG, PNG и WEBP до 5 МБ. Для новой записи обязательны только первые 2 фото.',
    emptySlot: 'Фото еще не загружено.',
    image1: {
      title: 'Верхний баннер и обложка карточки',
      hint: 'Показывается в списке календаря и в шапке страницы культуры.',
    },
    image2: {
      title: 'Фото рядом с описанием',
      hint: 'Показывается в основном контентном блоке страницы культуры.',
    },
    image3: {
      title: 'Большая акцентная картинка',
      hint: 'Отображается крупно в нижнем блоке страницы культуры.',
    },
    image4: {
      title: 'Фон нижнего блока',
      hint: 'Растягивается на весь нижний блок позади большой картинки.',
    },
  };
}

function CalendarFormFields({
  copy,
  locale,
  values,
  imageRequired,
}: {
  copy: ReturnType<typeof getCalendarsAdminCopy>;
  locale: string;
  values?: Partial<CalendarFormValues>;
  imageRequired: boolean;
}) {
  const imageSlotCopy = getCalendarImageSlotCopy(locale);

  return (
    <div className="space-y-5">
      <label className={adminFieldClassName}>
        <span className={adminLabelClassName}>{copy.titleLabel}</span>
        <input
          name="title"
          type="text"
          required
          defaultValue={values?.title ?? ''}
          className={adminInputClassName}
        />
      </label>

      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {calendarImageFields.map((field) => {
            const isRequired = imageRequired ? field.createRequired : false;
            const slotCopy = imageSlotCopy[field.inputName];

            return (
              <div
                key={field.inputName}
                className="rounded-[1.35rem] border border-[#0b5a45]/10 bg-[#f8f7f2] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className={adminLabelClassName}>
                      {copy.imageLabelPrefix} {field.index}
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-[#0b3e31]">
                      {slotCopy.title}
                    </p>
                  </div>

                  {!isRequired ? (
                    <span className={adminBadgeClassName}>{copy.optionalLabel}</span>
                  ) : null}
                </div>

                <p className={adminCx('mt-2', adminHintClassName)}>{slotCopy.hint}</p>

                <input
                  name={field.inputName}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  required={isRequired}
                  className={adminCx('mt-4', adminFileInputClassName)}
                />
              </div>
            );
          })}
        </div>

        <p className={adminHintClassName}>
          {imageRequired ? imageSlotCopy.imageHint : copy.replaceImageHint}
        </p>
      </div>

      <label className={adminFieldClassName}>
        <span className={adminLabelClassName}>{copy.descriptionLabel}</span>
        <textarea
          name="description"
          rows={6}
          required
          defaultValue={values?.description ?? ''}
          className={adminTextareaClassName}
        />
      </label>

      <div className={adminTranslationCardClassName}>
        <div>
          <p className={adminBadgeClassName}>{copy.translationSectionTitle}</p>
          <p className={adminCx('mt-3', adminHintClassName)}>{copy.translationHint}</p>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className={adminFieldClassName}>
            <span className={adminLabelClassName}>
              {copy.titleEnLabel}
              <span className={adminOptionalLabelClassName}> ({copy.optionalLabel})</span>
            </span>
            <input
              name="titleEn"
              type="text"
              defaultValue={values?.titleEn ?? ''}
              className={adminInputOnWhiteClassName}
            />
          </label>

          <label className={adminFieldClassName}>
            <span className={adminLabelClassName}>
              {copy.descriptionEnLabel}
              <span className={adminOptionalLabelClassName}> ({copy.optionalLabel})</span>
            </span>
            <textarea
              name="descriptionEn"
              rows={6}
              defaultValue={values?.descriptionEn ?? ''}
              className={adminTextareaOnWhiteClassName}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

export default async function AdminCalendarsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<AdminPageSearchParams>;
}) {
  const { locale } = await params;
  const { calendar, edit, error, status } = await searchParams;
  const copy = getCalendarsAdminCopy(locale);
  const publicCopy = getCalendarsCopy(locale);
  const imageSlotCopy = getCalendarImageSlotCopy(locale);
  const calendars = await getCalendars(undefined, noStoreApiFetchOptions);
  const editCalendarId = parseEntityId(edit ?? '');
  const statusCalendarId = parseEntityId(calendar ?? '');
  const topLevelError = error && !editCalendarId ? error : null;
  const topLevelStatus = status === 'created' ? copy.statusCreated : null;
  const completeGalleryCount = calendars.filter(
    (calendarItem) =>
      calendarItem.imageUrl1?.trim() &&
      calendarItem.imageUrl2?.trim() &&
      calendarItem.imageUrl3?.trim() &&
      calendarItem.imageUrl4?.trim(),
  ).length;
  const requiredPhotosReadyCount = calendars.filter(
    (calendarItem) => calendarItem.imageUrl1?.trim() && calendarItem.imageUrl2?.trim(),
  ).length;
  const untranslatedCalendars = calendars.filter(
    (calendarItem) => !calendarItem.titleEn?.trim() || !calendarItem.descriptionEn?.trim(),
  ).length;
  const createBadge = locale === 'en' ? 'Create' : 'Создание';
  const manageBadge = locale === 'en' ? 'Manage' : 'Управление';
  const openEditorLabel = locale === 'en' ? 'Open editor' : 'Открыть редактор';
  const stats = [
    {
      label: locale === 'en' ? 'Entries' : 'Записи',
      value: String(calendars.length),
      hint:
        locale === 'en'
          ? 'Crop pages currently available in the calendar.'
          : 'Страницы культур, которые сейчас доступны в календаре.',
    },
    {
      label: locale === 'en' ? 'Required photos' : 'Обязательные фото',
      value: String(requiredPhotosReadyCount),
      hint:
        locale === 'en'
          ? 'Entries that already have the first two required images.'
          : 'Записи, в которых уже есть первые два обязательных изображения.',
    },
    {
      label: locale === 'en' ? 'Full gallery' : 'Полная галерея',
      value: String(completeGalleryCount),
      hint:
        locale === 'en'
          ? 'Entries with all four image slots filled.'
          : 'Записи, в которых заполнены все четыре фотослота.',
    },
    {
      label: locale === 'en' ? 'Need EN' : 'Нужен EN',
      value: String(untranslatedCalendars),
      hint:
        locale === 'en'
          ? 'Entries still missing English title or description.'
          : 'Записи, в которых еще не хватает английского названия или описания.',
    },
  ];
  const shortcuts = [
    {
      href: '#create-calendar',
      label: locale === 'en' ? 'Add entry' : 'Добавить запись',
    },
    {
      href: '#manage-calendars',
      label: locale === 'en' ? 'Browse entries' : 'Список записей',
    },
  ];

  return (
    <AdminShell
      activeTab="calendars"
      backHref="/calendar"
      backLabel={copy.backToSite}
      description={imageSlotCopy.adminSubtitle}
      locale={locale}
      shortcuts={shortcuts}
      stats={stats}
      title={copy.adminTitle}>
      <AdminWorkspace>
        <AdminPanel
          id="create-calendar"
          badge={createBadge}
          title={copy.adminFormTitle}
          description={imageSlotCopy.formDescription}>
          <div className="space-y-4">
            {topLevelStatus ? <AdminNotice tone="success">{topLevelStatus}</AdminNotice> : null}
            {topLevelError ? <AdminNotice tone="error">{topLevelError}</AdminNotice> : null}
          </div>

          <form action={createCalendarAction} className="mt-6 space-y-6">
            <input type="hidden" name="locale" value={locale} />

            <CalendarFormFields copy={copy} locale={locale} imageRequired />

            <div className="flex flex-col gap-3 border-t border-[#0b5a45]/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="submit"
                className={adminCx(adminPrimaryButtonClassName, 'w-full sm:w-auto')}>
                {copy.submitLabel}
              </button>
              <p className={adminHintClassName}>{imageSlotCopy.imageHint}</p>
            </div>
          </form>
        </AdminPanel>

        <AdminPanel
          id="manage-calendars"
          badge={manageBadge}
          title={copy.existingTitle}
          description={imageSlotCopy.formDescription}
          tone="muted"
          headerContent={<span className={adminBadgeClassName}>{calendars.length}</span>}>
          {calendars.length === 0 ? (
            <AdminEmptyState
              badge={manageBadge}
              title={locale === 'en' ? 'Calendar entries will appear here' : 'Записи появятся здесь'}
              description={copy.emptyState}
            />
          ) : (
            <div className="space-y-5">
              {calendars.map((calendarItem) => {
                const isEditing =
                  editCalendarId === calendarItem.id || statusCalendarId === calendarItem.id;
                const hasEnglishVersion =
                  Boolean(calendarItem.titleEn?.trim()) &&
                  Boolean(calendarItem.descriptionEn?.trim());

                return (
                  <div
                    key={calendarItem.id}
                    id={`calendar-${calendarItem.id}`}
                    className="scroll-mt-32 rounded-[1.55rem] border border-[#0b5a45]/10 bg-white p-4 shadow-[0_22px_70px_-54px_rgba(11,62,49,0.9)] sm:p-5">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div className="grid grid-cols-2 gap-3 sm:max-w-[360px]">
                        {calendarImageFields.map((field) => {
                          const imagePath = calendarItem[field.entryKey]?.trim();
                          const imageSrc = resolveMediaUrl(imagePath);
                          const slotCopy = imageSlotCopy[field.inputName];

                          return (
                            <div
                              key={`${calendarItem.id}-${field.inputName}`}
                              className="overflow-hidden rounded-[1.15rem] border border-[#0b5a45]/10 bg-[#eef3ef]">
                              <div className="relative aspect-[1.12] overflow-hidden">
                                {imagePath ? (
                                  <MediaImage
                                    src={imageSrc}
                                    alt={`${calendarItem.title} ${field.index}`}
                                    fill
                                    sizes="(max-width: 1024px) 50vw, 160px"
                                    className="object-cover"
                                    emptyState={
                                      <div className="h-full w-full bg-[linear-gradient(135deg,#dfe9df,#b1c9b3,#6d8f70)]" />
                                    }
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center px-4 text-center text-xs leading-5 text-[#6a7f76]">
                                    {imageSlotCopy.emptySlot}
                                  </div>
                                )}
                              </div>

                              <div className="border-t border-[#0b5a45]/10 px-3 py-3">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6d826e]">
                                  {copy.imageLabelPrefix} {field.index}
                                </p>
                                <p className="mt-1 text-xs font-medium leading-5 text-[#0b3e31]">
                                  {slotCopy.title}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-semibold text-[#0b3e31]">{calendarItem.title}</h3>
                          <span
                            className={adminCx(
                              'inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]',
                              hasEnglishVersion
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700',
                            )}>
                            {hasEnglishVersion
                              ? locale === 'en'
                                ? 'EN ready'
                                : 'EN готов'
                              : locale === 'en'
                                ? 'Needs EN'
                                : 'Нужен EN'}
                          </span>
                        </div>

                        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#567068]">
                          {calendarItem.description}
                        </p>

                        <div className="mt-4 grid gap-2 text-xs leading-5 text-[#7f8f88] sm:grid-cols-2">
                          {calendarImageFields.map((field) => {
                            const imagePath = calendarItem[field.entryKey]?.trim();
                            const slotCopy = imageSlotCopy[field.inputName];

                            return (
                              <p key={`${calendarItem.id}-path-${field.inputName}`}>
                                {copy.imagePathLabel} {field.index} ({slotCopy.title}):{' '}
                                {imagePath || '-'}
                              </p>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row xl:flex-col xl:items-end">
                        <Link href={getCalendarHref(calendarItem)} className={adminSecondaryButtonClassName}>
                          <FiExternalLink className="mr-2" />
                          {publicCopy.openEntry}
                        </Link>
                        <Link
                          href={`/admin/calendars?edit=${calendarItem.id}#calendar-${calendarItem.id}`}
                          className={adminSecondaryButtonClassName}>
                          <FiEdit3 className="mr-2" />
                          {openEditorLabel}
                        </Link>
                      </div>
                    </div>

                    <details open={isEditing} className={adminCx('mt-5', adminDetailsClassName)}>
                      <summary className={adminSummaryClassName}>
                        <span>{copy.editLabel}</span>
                        <span className="text-xs font-medium text-[#6a7f76]">
                          {locale === 'en'
                            ? 'Inline calendar editor'
                            : 'Встроенный редактор записи'}
                        </span>
                      </summary>

                      <div className="border-t border-[#0b5a45]/10 p-4 sm:p-5">
                        <div className="space-y-4">
                          {status === 'updated' && statusCalendarId === calendarItem.id ? (
                            <AdminNotice tone="success">{copy.statusUpdated}</AdminNotice>
                          ) : null}

                          {error && editCalendarId === calendarItem.id ? (
                            <AdminNotice tone="error">{error}</AdminNotice>
                          ) : null}
                        </div>

                        <form action={updateCalendarAction} className="mt-5 space-y-6">
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="calendarId" value={calendarItem.id} />

                          <CalendarFormFields
                            copy={copy}
                            locale={locale}
                            values={calendarItem}
                            imageRequired={false}
                          />

                          <button
                            type="submit"
                            className={adminCx(adminPrimaryButtonClassName, 'w-full sm:w-auto')}>
                            {copy.updateLabel}
                          </button>
                        </form>
                      </div>
                    </details>
                  </div>
                );
              })}
            </div>
          )}
        </AdminPanel>
      </AdminWorkspace>
    </AdminShell>
  );
}
