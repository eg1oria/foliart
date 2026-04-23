import AdminTabs from '@/components/admin/AdminTabs';
import MediaImage from '@/components/catalog/MediaImage';
import { Link } from '@/i18n/routing';
import { getCalendars, type CalendarEntry } from '@/lib/api';
import { getCalendarsAdminCopy } from '@/lib/calendars';
import { parseEntityId } from '@/lib/catalog';
import { resolveMediaUrl } from '@/lib/media';
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
    title: string;
    hint: string;
  }
> & {
  adminSubtitle: string;
  formDescription: string;
  imageHint: string;
  emptySlot: string;
};

function getCalendarImageSlotCopy(locale: string): CalendarImageSlotCopy {
  if (locale === 'en') {
    return {
      adminSubtitle:
        'Create calendar items and assign photos to fixed page slots for the card, hero banner, and details block.',
      formDescription:
        'Photo 1 is used for the top banner and card cover. Photo 2 is shown in the details section. Photo 3 is the large calendar preview, and photo 4 is the full background for the lower block.',
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
        title: 'Large calendar preview',
        hint: 'Shown large in the lower block of the details page.',
      },
      image4: {
        title: 'Background for the lower block',
        hint: 'Stretches across the whole lower block behind the large preview.',
      },
    };
  }

  return {
    adminSubtitle:
      'Добавляйте записи календаря и сразу раскладывайте фото по понятным слотам для карточки, баннера и блока с описанием.',
    formDescription:
      'Фото 1 используется для верхнего баннера и обложки карточки. Фото 2 показывается рядом с описанием. Фото 3 и 4 необязательные.',
    imageHint:
      'Поддерживаются JPG, PNG и WEBP до 5 МБ. Для новой записи обязательны только первые 2 фото.',
    emptySlot: 'Фото ещё не загружено.',
    image1: {
      title: 'Верхний баннер и обложка карточки',
      hint: 'Показывается в списке календаря и в шапке страницы.',
    },
    image2: {
      title: 'Фото рядом с описанием',
      hint: 'Показывается в основном блоке страницы.',
    },
    image3: {
      title: 'Дополнительное фото',
      hint: 'Необязательный запасной слот.',
    },
    image4: {
      title: 'Дополнительное фото',
      hint: 'Необязательный запасной слот.',
    },
  };
}

function getCalendarImageSlotDisplayCopy(
  locale: string,
  inputName: CalendarImageInputName,
  fallback: { title: string; hint: string },
) {
  if (inputName === 'image3') {
    return locale === 'en'
      ? {
          title: 'Large calendar preview',
          hint: 'Shown large in the lower block of the details page.',
        }
      : {
          title: 'Большая картинка календаря',
          hint: 'Показывается большой в нижнем блоке страницы.',
        };
  }

  if (inputName === 'image4') {
    return locale === 'en'
      ? {
          title: 'Background for the lower block',
          hint: 'Stretches across the whole lower block behind the large preview.',
        }
      : {
          title: 'Фон для нижнего блока',
          hint: 'Растягивается на весь блок позади большой картинки.',
        };
  }

  return fallback;
}

function getCalendarFormDescription(locale: string) {
  return locale === 'en'
    ? 'Photo 1 is used for the top banner and card cover. Photo 2 is shown in the details section. Photo 3 is the large calendar preview, and photo 4 is the full background for the lower block.'
    : 'Фото 1 используется для верхнего баннера и обложки карточки. Фото 2 показывается рядом с описанием. Фото 3 показывается большим в нижнем блоке, а Фото 4 идет на фон всего этого блока.';
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
    <>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-[#0b3e31]">{copy.titleLabel}</span>
        <input
          name="title"
          type="text"
          required
          defaultValue={values?.title ?? ''}
          className="rounded-2xl border border-[#0b5a45]/15 bg-[#f8f7f2] px-4 py-3 text-[#0b3e31] outline-none transition placeholder:text-[#7e9088] focus:border-[#0b5a45]"
        />
      </label>

      <div className="space-y-3">
        <div className="grid gap-4 md:grid-cols-2">
          {calendarImageFields.map((field) => {
            const isRequired = imageRequired ? field.createRequired : false;
            const slotCopy = getCalendarImageSlotDisplayCopy(
              locale,
              field.inputName,
              imageSlotCopy[field.inputName],
            );

            return (
              <label key={field.inputName} className="flex flex-col gap-2">
                <span className="text-sm font-medium text-[#0b3e31]">
                  {copy.imageLabelPrefix} {field.index}
                  {!isRequired ? (
                    <span className="text-[#7e9088]"> ({copy.optionalLabel})</span>
                  ) : null}
                </span>
                <span className="text-xs leading-5 text-[#6a7f76]">{slotCopy.title}</span>
                <input
                  name={field.inputName}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  required={isRequired}
                  className="rounded-2xl border border-dashed border-[#0b5a45]/20 bg-[#f8f7f2] px-4 py-3 text-sm text-[#0b3e31] file:mr-4 file:rounded-full file:border-0 file:bg-[#0b5a45] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
                />
                <span className="text-xs leading-5 text-[#7f8f88]">{slotCopy.hint}</span>
              </label>
            );
          })}
        </div>
        <p className="text-xs leading-5 text-[#6a7f76]">
          {imageRequired ? imageSlotCopy.imageHint : copy.replaceImageHint}
        </p>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-[#0b3e31]">{copy.descriptionLabel}</span>
        <textarea
          name="description"
          rows={6}
          required
          defaultValue={values?.description ?? ''}
          className="rounded-2xl border border-[#0b5a45]/15 bg-[#f8f7f2] px-4 py-3 text-[#0b3e31] outline-none transition placeholder:text-[#7e9088] focus:border-[#0b5a45]"
        />
      </label>

      <div className="rounded-[1.6rem] border border-[#0b5a45]/10 bg-[#f7f9f6] px-5 py-5">
        <div className="mb-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0b5a45]">
            {copy.translationSectionTitle}
          </p>
          <p className="mt-2 text-xs leading-5 text-[#6a7f76]">{copy.translationHint}</p>
        </div>

        <div className="space-y-5">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-[#0b3e31]">
              {copy.titleEnLabel} <span className="text-[#7e9088]">({copy.optionalLabel})</span>
            </span>
            <input
              name="titleEn"
              type="text"
              defaultValue={values?.titleEn ?? ''}
              className="rounded-2xl border border-[#0b5a45]/15 bg-white px-4 py-3 text-[#0b3e31] outline-none transition placeholder:text-[#7e9088] focus:border-[#0b5a45]"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-[#0b3e31]">
              {copy.descriptionEnLabel}{' '}
              <span className="text-[#7e9088]">({copy.optionalLabel})</span>
            </span>
            <textarea
              name="descriptionEn"
              rows={6}
              defaultValue={values?.descriptionEn ?? ''}
              className="rounded-2xl border border-[#0b5a45]/15 bg-white px-4 py-3 text-[#0b3e31] outline-none transition placeholder:text-[#7e9088] focus:border-[#0b5a45]"
            />
          </label>
        </div>
      </div>
    </>
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
  const imageSlotCopy = getCalendarImageSlotCopy(locale);
  const formDescription = getCalendarFormDescription(locale);
  const calendars = await getCalendars();
  const editCalendarId = parseEntityId(edit ?? '');
  const statusCalendarId = parseEntityId(calendar ?? '');
  const topLevelError = error && !editCalendarId ? error : null;
  const topLevelStatus = status === 'created' ? copy.statusCreated : null;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 pb-20 pt-60 md:px-8">
      <section className="rounded-[2.5rem] bg-[linear-gradient(135deg,#0b5a45,#0a3e31)] px-8 py-10 text-white shadow-[0_30px_90px_-50px_rgba(11,62,49,1)] md:px-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-medium uppercase tracking-[0.28em] text-[#d8ead8]">
              Foliart Admin
            </p>
            <h1 className="mb-4 text-4xl font-semibold md:text-5xl">{copy.adminTitle}</h1>
            <p className="text-base leading-7 text-white/80 md:text-lg">
              {imageSlotCopy.adminSubtitle}
            </p>
            <AdminTabs active="calendars" locale={locale} />
          </div>

          <Link
            href="/"
            className="inline-flex w-fit items-center rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/18">
            {copy.backToSite}
          </Link>
        </div>
      </section>

      <section className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,1.05fr)]">
        <div className="rounded-[2rem] border border-[#0b5a45]/10 bg-white p-8 shadow-[0_24px_70px_-52px_rgba(11,62,49,0.95)]">
          <h2 className="text-3xl font-semibold text-[#0b3e31]">{copy.adminFormTitle}</h2>
          <p className="mt-3 text-sm leading-6 text-[#567068]">{formDescription}</p>

          {topLevelStatus ? (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
              {topLevelStatus}
            </div>
          ) : null}

          {topLevelError ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
              {topLevelError}
            </div>
          ) : null}

          <form action={createCalendarAction} className="mt-8 space-y-6">
            <input type="hidden" name="locale" value={locale} />

            <CalendarFormFields copy={copy} locale={locale} imageRequired />

            <button
              type="submit"
              className="inline-flex items-center rounded-full bg-[#0b5a45] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#094635]">
              {copy.submitLabel}
            </button>
          </form>
        </div>

        <aside className="rounded-[2rem] border border-[#0b5a45]/10 bg-[#f7f6f1] p-8 shadow-[0_24px_70px_-52px_rgba(11,62,49,0.95)]">
          <h2 className="text-3xl font-semibold text-[#0b3e31]">{copy.existingTitle}</h2>

          {calendars.length === 0 ? (
            <p className="mt-8 text-sm text-[#6a7f76]">{copy.emptyState}</p>
          ) : (
            <div className="mt-8 space-y-5">
              {calendars.map((calendarItem) => {
                const isEditing =
                  editCalendarId === calendarItem.id || statusCalendarId === calendarItem.id;

                return (
                  <div
                    key={calendarItem.id}
                    className="rounded-[1.5rem] border border-[#0b5a45]/10 bg-white p-5">
                    <div className="grid gap-5 lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)]">
                      <div className="grid grid-cols-2 gap-3">
                        {calendarImageFields.map((field) => {
                          const imagePath = calendarItem[field.entryKey]?.trim();
                          const imageSrc = resolveMediaUrl(imagePath);
                          const slotCopy = getCalendarImageSlotDisplayCopy(
                            locale,
                            field.inputName,
                            imageSlotCopy[field.inputName],
                          );

                          return (
                            <div
                              key={`${calendarItem.id}-${field.inputName}`}
                              className="overflow-hidden rounded-[1.1rem] border border-[#0b5a45]/10 bg-[#eef3ef]">
                              <div className="relative aspect-[1.18] overflow-hidden">
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

                      <div className="min-w-0">
                        <h3 className="text-xl font-semibold text-[#0b3e31]">{calendarItem.title}</h3>
                        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#567068]">
                          {calendarItem.description}
                        </p>

                        <div className="mt-4 grid gap-2 text-xs text-[#7f8f88] sm:grid-cols-2">
                          {calendarImageFields.map((field) => {
                            const imagePath = calendarItem[field.entryKey]?.trim();
                            const slotCopy = getCalendarImageSlotDisplayCopy(
                              locale,
                              field.inputName,
                              imageSlotCopy[field.inputName],
                            );

                            return (
                              <p key={`${calendarItem.id}-path-${field.inputName}`}>
                                {copy.imagePathLabel} {field.index} ({slotCopy.title}):{' '}
                                {imagePath || '-'}
                              </p>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <details
                      open={isEditing}
                      className="mt-5 rounded-[1.1rem] border border-[#0b5a45]/10 bg-[#f8f7f2]">
                      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-[#0b5a45] [&::-webkit-details-marker]:hidden">
                        {copy.editLabel}
                      </summary>

                      <div className="border-t border-[#0b5a45]/10 p-4">
                        {status === 'updated' && statusCalendarId === calendarItem.id ? (
                          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                            {copy.statusUpdated}
                          </div>
                        ) : null}

                        {error && editCalendarId === calendarItem.id ? (
                          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                            {error}
                          </div>
                        ) : null}

                        <form action={updateCalendarAction} className="space-y-5">
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
                            className="inline-flex items-center rounded-full bg-[#0b5a45] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#094635]">
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
        </aside>
      </section>
    </main>
  );
}
