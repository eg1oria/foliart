import type { CalendarEntry, Category, Product } from './api';
import { getProductHref, parseEntityId, slugify } from './catalog';

type TitledPublicEntity = {
  title: string;
  slug?: string | null;
  slugSourceTitle?: string | null;
};

function getSlugSourceTitle<T extends TitledPublicEntity>(item: T) {
  return item.slugSourceTitle?.trim() || item.title;
}

function getSlugCandidates<T extends TitledPublicEntity>(item: T) {
  const storedSlug = item.slug?.trim();
  if (storedSlug) {
    return [storedSlug];
  }

  return Array.from(new Set([getSlugSourceTitle(item), item.title].map((value) => slugify(value))));
}

export function getCalendarSlug(
  entry: Pick<CalendarEntry, 'title' | 'slug' | 'slugSourceTitle'>,
) {
  return entry.slug?.trim() || slugify(getSlugSourceTitle(entry));
}

export function getCalendarHref(
  entry: Pick<CalendarEntry, 'title' | 'slug' | 'slugSourceTitle'>,
) {
  return `/calendar/${getCalendarSlug(entry)}`;
}

export function getCalendarImages(
  entry: Pick<CalendarEntry, 'imageUrl1' | 'imageUrl2' | 'imageUrl3' | 'imageUrl4' | 'imageUrls'>,
) {
  const candidates =
    entry.imageUrls?.length > 0
      ? entry.imageUrls
      : [entry.imageUrl1, entry.imageUrl2, entry.imageUrl3, entry.imageUrl4];

  return candidates.map((item) => item?.trim()).filter(Boolean) as string[];
}

export function getCalendarImageSlots(
  entry: Pick<CalendarEntry, 'imageUrl1' | 'imageUrl2' | 'imageUrl3' | 'imageUrl4' | 'imageUrls'>,
) {
  const images = getCalendarImages(entry);

  return {
    heroImage: images[0] ?? null,
    detailsImage: images[1] ?? images[0] ?? null,
    showcaseImage: images[2] ?? null,
    showcaseBackgroundImage: images[3] ?? images[2] ?? images[1] ?? images[0] ?? null,
  };
}

/** The catalog products linked to a calendar, in its own order. */
export function getCalendarProducts(
  entry: Pick<CalendarEntry, 'productIds'>,
  products: Product[],
  categories: Category[],
) {
  const productsById = new Map(products.map((product) => [product.id, product]));
  const categoriesById = new Map(categories.map((category) => [category.id, category]));

  return (entry.productIds ?? []).flatMap((productId) => {
    const product = productsById.get(productId);
    const category = product ? categoriesById.get(product.categoryId) : undefined;

    if (!product || !category) {
      return [];
    }

    return [
      {
        id: product.id,
        href: getProductHref(category, product),
        name: product.name,
        categoryName: category.name,
        imageUrl: product.imageUrl,
      },
    ];
  });
}

export function findCalendarByParam(entries: CalendarEntry[], value: string) {
  const parsedId = parseEntityId(value);

  if (parsedId) {
    return entries.find((entry) => entry.id === parsedId) ?? null;
  }

  const slug = slugify(value);
  return entries.find((entry) => getSlugCandidates(entry).includes(slug)) ?? null;
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

  if (locale === 'fr') {
    return {
      adminTitle: 'Éditeur de calendrier',
      adminSubtitle:
        'Ajoutez des cultures au calendrier avec un titre, une description et quatre photos pour chaque page.',
      adminFormTitle: 'Ajouter une entrée au calendrier',
      adminFormDescription:
        "Utilisez une entrée par culture. Les 4 photos sont obligatoires lors de la création d'une nouvelle entrée.",
      existingTitle: 'Entrées actuelles du calendrier',
      emptyState: 'Aucune entrée dans le calendrier pour l/instant.',
      statusCreated: 'Entrée du calendrier ajoutée avec succès.',
      statusUpdated: 'Entrée du calendrier mise à jour avec succès.',
      titleLabel: 'Titre',
      titleEnLabel: 'Titre en anglais',
      descriptionLabel: 'Description',
      descriptionEnLabel: 'Description en anglais',
      imageLabelPrefix: 'Photo',
      imageHint: "Formats acceptés : JPG, PNG et WEBP jusqu'à 5 Mo chacun.",
      replaceImageHint: 'Laissez un champ image vide pour conserver la photo actuelle.',
      translationSectionTitle: 'Version anglaise',
      translationHint:
        'Laissez les champs anglais vides si la version anglaise du site doit utiliser le texte russe.',
      optionalLabel: 'Facultatif',
      submitLabel: 'Ajouter une entrée',
      updateLabel: 'Enregistrer les modifications',
      editLabel: "Modifier l'entrée",
      backToSite: 'Vers le site',
      imagePathLabel: "Chemin de l'image",
    };
  }

  if (locale === 'es') {
    return {
      adminTitle: 'Editor de calendario',
      adminSubtitle:
        'Añada cultivos al calendario con un título, descripción y cuatro fotos para cada página.',
      adminFormTitle: 'Añadir entrada al calendario',
      adminFormDescription:
        'Use una entrada por cultivo. Las 4 fotos son obligatorias al crear una nueva entrada.',
      existingTitle: 'Entradas actuales del calendario',
      emptyState: 'Aún no hay entradas en el calendario.',
      statusCreated: 'Entrada del calendario creada correctamente.',
      statusUpdated: 'Entrada del calendario actualizada correctamente.',
      titleLabel: 'Título',
      titleEnLabel: 'Título en español',
      descriptionLabel: 'Descripción',
      descriptionEnLabel: 'Descripción en español',
      imageLabelPrefix: 'Foto',
      imageHint: 'Formatos admitidos: JPG, PNG y WEBP hasta 5 MB cada uno.',
      replaceImageHint: 'Deje cualquier campo de imagen vacío para conservar la foto actual.',
      translationSectionTitle: 'Versión en español',
      translationHint:
        'Deje los campos en español vacíos si la versión española del sitio debe usar el texto ruso.',
      optionalLabel: 'Opcional',
      submitLabel: 'Añadir entrada',
      updateLabel: 'Guardar cambios',
      editLabel: 'Editar entrada',
      backToSite: 'Ir al sitio',
      imagePathLabel: 'Ruta de la imagen',
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
