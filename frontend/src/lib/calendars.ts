import type { CalendarEntry } from './api';
import { parseEntityId, slugify } from './catalog';

function getSlugSourceTitle<T extends { title: string; slugSourceTitle?: string | null }>(item: T) {
  return item.slugSourceTitle?.trim() || item.title;
}

function getSlugCandidates<T extends { title: string; slugSourceTitle?: string | null }>(item: T) {
  return Array.from(new Set([getSlugSourceTitle(item), item.title].map((value) => slugify(value))));
}

export function getCalendarSlug(entry: Pick<CalendarEntry, 'title' | 'slugSourceTitle'>) {
  return slugify(getSlugSourceTitle(entry));
}

export function getCalendarHref(entry: Pick<CalendarEntry, 'title' | 'slugSourceTitle'>) {
  return `/calendar/${getCalendarSlug(entry)}`;
}

export function getCalendarImages(
  entry: Pick<
    CalendarEntry,
    'imageUrl1' | 'imageUrl2' | 'imageUrl3' | 'imageUrl4' | 'imageUrls'
  >,
) {
  const candidates =
    entry.imageUrls?.length > 0
      ? entry.imageUrls
      : [entry.imageUrl1, entry.imageUrl2, entry.imageUrl3, entry.imageUrl4];

  return candidates.map((item) => item?.trim()).filter(Boolean) as string[];
}

export function getCalendarImageSlots(
  entry: Pick<
    CalendarEntry,
    'imageUrl1' | 'imageUrl2' | 'imageUrl3' | 'imageUrl4' | 'imageUrls'
  >,
) {
  const images = getCalendarImages(entry);

  return {
    heroImage: images[0] ?? null,
    detailsImage: images[1] ?? images[0] ?? null,
    showcaseImage: images[2] ?? null,
    showcaseBackgroundImage: images[3] ?? images[2] ?? images[1] ?? images[0] ?? null,
  };
}

export function findCalendarByParam(entries: CalendarEntry[], value: string) {
  const parsedId = parseEntityId(value);

  if (parsedId) {
    return entries.find((entry) => entry.id === parsedId) ?? null;
  }

  const slug = slugify(value);
  return entries.find((entry) => getSlugCandidates(entry).includes(slug)) ?? null;
}

export function getCalendarsCopy(locale: string) {
  if (locale === 'en') {
    return {
      title: 'Agricultural Calendar',
      subtitle:
        'Crop pages with descriptions and four supporting photos for each agricultural entry.',
      emptyState: 'Calendar items will appear here after they are added in the admin panel.',
      openEntry: 'Open page',
      detailsEmpty: 'The description for this crop will be added soon.',
      backToCalendar: 'Back to calendar',
      galleryTitle: 'Crop gallery',
      relatedTitle: 'Other crops',
      relatedEmpty: 'More calendar items will appear soon.',
      heroEyebrow: 'Foliart Calendar',
      listEyebrow: 'Crop directory',
    };
  }

  return {
    title: 'Сельскохозяйственный календарь',
    subtitle:
      'Страницы культур с описанием и четырьмя фотографиями для каждой записи календаря.',
    emptyState: 'Записи календаря появятся здесь после добавления в админке.',
    openEntry: 'Открыть страницу',
    detailsEmpty: 'Описание для этой культуры будет добавлено позже.',
    backToCalendar: 'Назад к календарю',
    galleryTitle: 'Галерея культуры',
    relatedTitle: 'Другие культуры',
    relatedEmpty: 'Скоро здесь появятся новые записи календаря.',
    heroEyebrow: 'Календарь Foliart',
    listEyebrow: 'Каталог культур',
  };
}

export function getCalendarsAdminCopy(locale: string) {
  if (locale === 'en') {
    return {
      adminTitle: 'Calendar editor',
      adminSubtitle:
        'Create crop calendar items with a title, description, and four photos for each page.',
      adminFormTitle: 'Add calendar item',
      adminFormDescription:
        'Use one entry per crop. All four images are required when creating a new item.',
      existingTitle: 'Current calendar items',
      emptyState: 'There are no calendar items yet.',
      statusCreated: 'Calendar item created successfully.',
      statusUpdated: 'Calendar item updated successfully.',
      titleLabel: 'Title',
      titleEnLabel: 'Title in English',
      descriptionLabel: 'Description',
      descriptionEnLabel: 'Description in English',
      imageLabelPrefix: 'Photo',
      imageHint: 'Supported formats: JPG, PNG, WEBP up to 5 MB each.',
      replaceImageHint: 'Leave any image field empty to keep the current photo.',
      translationSectionTitle: 'English translation',
      translationHint:
        'Leave the English fields empty if the English site should reuse the Russian text.',
      optionalLabel: 'Optional',
      submitLabel: 'Add calendar item',
      updateLabel: 'Save changes',
      editLabel: 'Edit item',
      backToSite: 'Open site',
      imagePathLabel: 'Image path',
    };
  }

  return {
    adminTitle: 'Редактор календаря',
    adminSubtitle:
      'Добавляйте культуры для календаря с названием, описанием и четырьмя фотографиями для каждой страницы.',
    adminFormTitle: 'Добавить запись календаря',
    adminFormDescription:
      'Используйте одну запись на одну культуру. При создании новой записи все 4 фото обязательны.',
    existingTitle: 'Текущие записи календаря',
    emptyState: 'Записей календаря пока нет.',
    statusCreated: 'Запись календаря успешно добавлена.',
    statusUpdated: 'Запись календаря успешно обновлена.',
    titleLabel: 'Название',
    titleEnLabel: 'Название на английском',
    descriptionLabel: 'Описание',
    descriptionEnLabel: 'Описание на английском',
    imageLabelPrefix: 'Фото',
    imageHint: 'Поддерживаются JPG, PNG и WEBP до 5 МБ каждое.',
    replaceImageHint: 'Оставьте любое поле изображения пустым, чтобы сохранить текущее фото.',
    translationSectionTitle: 'Английская версия',
    translationHint:
      'Оставьте английские поля пустыми, если в английской версии сайта должен использоваться русский текст.',
    optionalLabel: 'Необязательно',
    submitLabel: 'Добавить запись',
    updateLabel: 'Сохранить изменения',
    editLabel: 'Редактировать запись',
    backToSite: 'На сайт',
    imagePathLabel: 'Путь к изображению',
  };
}
