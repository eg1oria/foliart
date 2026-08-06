import { FiFileText, FiImage, FiSave } from 'react-icons/fi';

import {
  createCalendarAction,
  updateCalendarAction,
} from '@/app/[locale]/admin/calendars/actions';
import { AdminNotice } from '@/components/admin/AdminShell';
import RichDescriptionEditor from '@/components/admin/RichDescriptionEditor';
import MediaImage from '@/components/catalog/MediaImage';
import type { CalendarEntry } from '@/lib/api';
import { getCalendarsAdminCopy } from '@/lib/calendars';
import { resolveMediaUrl } from '@/lib/media';

import {
  adminBadgeClassName,
  adminCx,
  adminFieldClassName,
  adminFileInputClassName,
  adminHintClassName,
  adminInputClassName,
  adminLabelClassName,
  adminPrimaryButtonClassName,
} from '../adminStyles';

const calendarImageFields = [
  {
    inputName: 'image1',
    entryKey: 'imageUrl1',
    index: 1,
    createRequired: true,
  },
  {
    inputName: 'image2',
    entryKey: 'imageUrl2',
    index: 2,
    createRequired: true,
  },
  {
    inputName: 'image3',
    entryKey: 'imageUrl3',
    index: 3,
    createRequired: false,
  },
  {
    inputName: 'image4',
    entryKey: 'imageUrl4',
    index: 4,
    createRequired: false,
  },
] as const;

type CalendarImageField = (typeof calendarImageFields)[number];
type CalendarImageInputName = CalendarImageField['inputName'];

type CalendarImageSlotCopy = Record<
  CalendarImageInputName,
  {
    hint: string;
    title: string;
  }
> & {
  emptySlot: string;
  imageHint: string;
  sharedImagesHint: string;
  sharedImagesTitle: string;
};

function getCalendarImageSlotCopy(locale: string): CalendarImageSlotCopy {
  if (locale === 'en') {
    return {
      imageHint:
        'Upload JPG, PNG, or WEBP up to 5 MB. The first two photos are required for a new item.',
      emptySlot: 'No photo uploaded yet.',
      sharedImagesTitle: 'Shared calendar images',
      sharedImagesHint:
        'Photos 1, 2, and 4 are shared by every language. Switch to RU to replace them.',
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
        hint: 'Can be uploaded separately for each content language.',
      },
      image4: {
        title: 'Background for the lower block',
        hint: 'Stretches across the lower block behind the showcase image.',
      },
    };
  }

  return {
    imageHint:
      'Поддерживаются JPG, PNG и WEBP до 5 МБ. Для новой записи обязательны первые 2 фото.',
    emptySlot: 'Фото еще не загружено.',
    sharedImagesTitle: 'Общие изображения календаря',
    sharedImagesHint:
      'Фото 1, 2 и 4 используются во всех языковых версиях. Чтобы заменить их, переключитесь на RU.',
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
      hint: 'Можно загрузить отдельно для каждого языка контента.',
    },
    image4: {
      title: 'Фон нижнего блока',
      hint: 'Растягивается на весь нижний блок позади большой картинки.',
    },
  };
}

function getCalendarPdfCopy(locale: string) {
  if (locale === 'en') {
    return {
      label: 'Calendar PDF',
      hint: 'Upload a separate PDF for this content language (up to 20 MB).',
      none: 'No PDF uploaded for this language yet.',
      open: 'Open current PDF',
      replace: 'Leave the field empty to keep the current file.',
    };
  }

  return {
    label: 'PDF календаря',
    hint: 'Загрузите отдельный PDF для выбранного языка контента (до 20 МБ).',
    none: 'Для этого языка PDF еще не загружен.',
    open: 'Открыть текущий PDF',
    replace: 'Оставьте поле пустым, чтобы сохранить текущий файл.',
  };
}

function CalendarImageInput({
  copy,
  currentImage,
  field,
  imageRequired,
  locale,
}: {
  copy: CalendarImageSlotCopy;
  currentImage?: string | null;
  field: CalendarImageField;
  imageRequired: boolean;
  locale: string;
}) {
  const slotCopy = copy[field.inputName];
  const required = imageRequired && field.createRequired;

  return (
    <div className="rounded-lg border border-[#0b5a45]/10 bg-[#f7f9f6] p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6a7f76]">
            {locale === 'en' ? `Photo ${field.index}` : `Фото ${field.index}`}
          </p>
          <p className="mt-1 text-sm font-semibold text-[#0b3e31]">{slotCopy.title}</p>
        </div>
        {!required ? <span className={adminBadgeClassName}>{locale === 'en' ? 'Optional' : 'Необязательно'}</span> : null}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[112px_minmax(0,1fr)] sm:items-center">
        <div className="relative aspect-square w-full overflow-hidden rounded-md border border-[#0b5a45]/10 bg-white sm:w-28">
          <MediaImage
            src={resolveMediaUrl(currentImage)}
            alt=""
            fill
            sizes="112px"
            className="object-cover"
            emptyState={
              <div className="flex h-full flex-col items-center justify-center gap-2 px-2 text-center text-[#8a9a93]">
                <FiImage aria-hidden="true" className="text-xl" />
                <span className="text-[10px] leading-4">{copy.emptySlot}</span>
              </div>
            }
          />
        </div>
        <div className="min-w-0">
          <input
            name={field.inputName}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            required={required}
            className={adminFileInputClassName}
          />
          <p className={adminCx('mt-2', adminHintClassName)}>{slotCopy.hint}</p>
        </div>
      </div>
    </div>
  );
}

function SharedCalendarImages({
  calendar,
  copy,
}: {
  calendar: CalendarEntry;
  copy: CalendarImageSlotCopy;
}) {
  const sharedFields = calendarImageFields.filter((field) => field.inputName !== 'image3');

  return (
    <div className="rounded-lg border border-[#0b5a45]/10 bg-[#f7f9f6] p-4">
      <p className={adminLabelClassName}>{copy.sharedImagesTitle}</p>
      <p className={adminCx('mt-2', adminHintClassName)}>{copy.sharedImagesHint}</p>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {sharedFields.map((field) => (
          <div key={field.inputName} className="min-w-0">
            <div className="relative aspect-square overflow-hidden rounded-md border border-[#0b5a45]/10 bg-white">
              <MediaImage
                src={resolveMediaUrl(calendar[field.entryKey])}
                alt=""
                fill
                sizes="160px"
                className="object-cover"
                emptyState={
                  <div className="flex h-full items-center justify-center text-[#8a9a93]">
                    <FiImage aria-hidden="true" />
                  </div>
                }
              />
            </div>
            <p className="mt-2 truncate text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6a7f76]">
              {field.index}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CalendarAdminForm({
  calendar,
  contentLocale,
  errorMessage,
  locale,
  mode,
  successMessage,
}: {
  calendar?: CalendarEntry;
  contentLocale: string;
  errorMessage?: string | null;
  locale: string;
  mode: 'create' | 'edit';
  successMessage?: string | null;
}) {
  const copy = getCalendarsAdminCopy(locale);
  const imageCopy = getCalendarImageSlotCopy(locale);
  const pdfCopy = getCalendarPdfCopy(locale);
  const isBaseLocale = contentLocale === 'ru';
  const translation = calendar?.adminTranslation;
  const defaultTitle = translation?.title ?? (isBaseLocale ? calendar?.title : '') ?? '';
  const defaultDescription =
    translation?.description ?? (isBaseLocale ? calendar?.description : '') ?? '';
  const currentPdf = isBaseLocale ? calendar?.pdfUrl : translation?.pdfUrl;
  const currentPdfHref = resolveMediaUrl(currentPdf);
  const editableImageFields =
    mode === 'edit' && !isBaseLocale
      ? calendarImageFields.filter((field) => field.inputName === 'image3')
      : calendarImageFields;
  const action = mode === 'create' ? createCalendarAction : updateCalendarAction;

  const getCurrentImage = (field: CalendarImageField) => {
    if (!calendar) return null;
    if (field.inputName === 'image3' && !isBaseLocale) {
      return translation?.imageUrl3 ?? null;
    }
    return calendar[field.entryKey];
  };

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="contentLocale" value={contentLocale} />
      {calendar ? <input type="hidden" name="calendarId" value={calendar.id} /> : null}

      {successMessage ? <AdminNotice tone="success">{successMessage}</AdminNotice> : null}
      {errorMessage ? <AdminNotice tone="error">{errorMessage}</AdminNotice> : null}

      <label className={adminFieldClassName}>
        <span className={adminLabelClassName}>{copy.titleLabel}</span>
        <input
          name="title"
          type="text"
          required
          defaultValue={defaultTitle}
          placeholder={
            contentLocale === 'en' ? 'For example, winter wheat' : 'Например, озимая пшеница'
          }
          className={adminInputClassName}
        />
      </label>

      <div className={adminFieldClassName}>
        <span className={adminLabelClassName}>{copy.descriptionLabel}</span>
        <RichDescriptionEditor
          defaultValue={defaultDescription}
          label={copy.descriptionLabel}
          placeholder={copy.descriptionLabel}
          required
        />
      </div>

      <div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className={adminLabelClassName}>{locale === 'en' ? 'Images' : 'Изображения'}</p>
            <p className={adminCx('mt-1', adminHintClassName)}>{imageCopy.imageHint}</p>
          </div>
          <span className={adminBadgeClassName}>{contentLocale.toUpperCase()}</span>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {editableImageFields.map((field) => (
            <CalendarImageInput
              key={field.inputName}
              copy={imageCopy}
              currentImage={getCurrentImage(field)}
              field={field}
              imageRequired={mode === 'create'}
              locale={locale}
            />
          ))}
        </div>
      </div>

      {mode === 'edit' && !isBaseLocale && calendar ? (
        <SharedCalendarImages calendar={calendar} copy={imageCopy} />
      ) : null}

      <div className="rounded-lg border border-[#0b5a45]/10 bg-[#f7f9f6] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={adminLabelClassName}>{pdfCopy.label}</p>
            <p className={adminCx('mt-2', adminHintClassName)}>{pdfCopy.hint}</p>
          </div>
          <span className={adminBadgeClassName}>{contentLocale.toUpperCase()}</span>
        </div>

        {currentPdfHref ? (
          <a
            href={currentPdfHref}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#0b5a45] underline underline-offset-2">
            <FiFileText aria-hidden="true" />
            {pdfCopy.open}
          </a>
        ) : (
          <p className="mt-3 text-sm text-[#6a7f76]">{pdfCopy.none}</p>
        )}

        <input
          name="pdf"
          type="file"
          accept="application/pdf"
          className={adminCx('mt-4', adminFileInputClassName)}
        />
        <p className={adminCx('mt-2', adminHintClassName)}>{pdfCopy.replace}</p>
      </div>

      <div className="flex justify-end border-t border-[#0b5a45]/10 pt-6">
        <button type="submit" className={adminCx(adminPrimaryButtonClassName, 'w-full gap-2 sm:w-auto')}>
          <FiSave aria-hidden="true" />
          {mode === 'create' ? copy.submitLabel : copy.updateLabel}
        </button>
      </div>
    </form>
  );
}
