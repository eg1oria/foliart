import type { Category, Product } from './api';

const cyrillicToLatinMap: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
  і: 'i',
  ї: 'yi',
  є: 'ye',
  ґ: 'g',
};

function decodeRouteParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function parseEntityId(value: string): number | null {
  const normalized = decodeRouteParam(value).trim();
  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
}

function slugify(value: string): string {
  const normalized = decodeRouteParam(value)
    .trim()
    .toLowerCase()
    .split('')
    .map((char) => cyrillicToLatinMap[char] ?? char)
    .join('')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]+/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'item';
}

function getSlugSourceName<T extends { name: string; slugSourceName?: string | null }>(item: T) {
  return item.slugSourceName?.trim() || item.name;
}

function getSlugCandidates<T extends { name: string; slugSourceName?: string | null }>(item: T) {
  return Array.from(new Set([getSlugSourceName(item), item.name].map((value) => slugify(value))));
}

export function getCategorySlug(category: Pick<Category, 'name' | 'slugSourceName'>): string {
  return slugify(getSlugSourceName(category));
}

export function getProductSlug(product: Pick<Product, 'name' | 'slugSourceName'>): string {
  return slugify(getSlugSourceName(product));
}

export function getCategoryHref(category: Pick<Category, 'name' | 'slugSourceName'>): string {
  return `/catalog/${getCategorySlug(category)}`;
}

export function getProductHref(
  category: Pick<Category, 'name' | 'slugSourceName'>,
  product: Pick<Product, 'name' | 'slugSourceName'>,
): string {
  return `${getCategoryHref(category)}/${getProductSlug(product)}`;
}

export function findCategoryByParam(categories: Category[], value: string): Category | null {
  const parsedId = parseEntityId(value);

  if (parsedId) {
    return categories.find((category) => category.id === parsedId) ?? null;
  }

  const slug = slugify(value);
  return (
    categories.find((category) => getSlugCandidates(category).includes(slug)) ?? null
  );
}

export function findProductByParam(products: Product[], value: string): Product | null {
  const parsedId = parseEntityId(value);

  if (parsedId) {
    return products.find((product) => product.id === parsedId) ?? null;
  }

  const slug = slugify(value);
  return products.find((product) => getSlugCandidates(product).includes(slug)) ?? null;
}

export function parseAdvantages(value: string): string[] {
  const normalized = value.trim();
  if (!normalized) {
    return [];
  }

  try {
    const parsed = JSON.parse(normalized);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    // Fall back to plain-text parsing below.
  }

  return normalized
    .split(/\r?\n+/)
    .map((item) => item.trim().replace(/^[\u2022\u25CF\u00B7\u25AA*\-]+\s*/, ''))
    .filter(Boolean);
}

export type CompositionItem = {
  label: string;
  value: string;
};

export type ApplicationItem = {
  title: string;
  description: string;
};

export function parseComposition(value: string): CompositionItem[] {
  const normalized = value.trim();
  if (!normalized) {
    return [];
  }

  try {
    const parsed = JSON.parse(normalized);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => {
          if (typeof item === 'string') {
            return { label: item.trim(), value: '' };
          }

          if (!item || typeof item !== 'object') {
            return null;
          }

          const label =
            'label' in item ? String(item.label).trim() : String(item.name ?? '').trim();
          const itemValue =
            'value' in item ? String(item.value).trim() : String(item.amount ?? '').trim();

          if (!label) {
            return null;
          }

          return {
            label,
            value: itemValue,
          };
        })
        .filter((item): item is CompositionItem => Boolean(item));
    }
  } catch {
    // Fall back to plain-text parsing below.
  }

  return normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = ['|', '-', ':'].find((item) => line.includes(item));
      if (!separator) {
        return { label: line, value: '' };
      }

      const [label, ...rest] = line.split(separator);
      return {
        label: label.trim(),
        value: rest.join(separator).trim(),
      };
    })
    .filter((item) => item.label);
}

export function parseApplication(value: string): ApplicationItem[] {
  const normalized = value.trim();
  if (!normalized) {
    return [];
  }

  try {
    const parsed = JSON.parse(normalized);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => {
          if (!item || typeof item !== 'object') {
            return null;
          }

          const title = String(item.title ?? '').trim();
          const description = String(item.description ?? '').trim();

          if (!title) {
            return null;
          }

          return { title, description };
        })
        .filter((item): item is ApplicationItem => Boolean(item));
    }
  } catch {
    // Fall back to plain-text parsing below.
  }

  return normalized
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length === 0) {
        return null;
      }

      if (lines.length === 1 && lines[0].includes('|')) {
        const [title, ...rest] = lines[0].split('|');
        return {
          title: title.trim(),
          description: rest.join('|').trim(),
        };
      }

      return {
        title: lines[0],
        description: lines.slice(1).join('\n').trim(),
      };
    })
    .filter((item): item is ApplicationItem => Boolean(item?.title));
}

export function getCategoryProductCount(category: Category, products: Product[]): number {
  return products.length > 0 ? products.length : category.productCount;
}

export function formatProductCount(count: number, locale: string): string {
  if (locale === 'en') {
    return count === 1 ? '1 product' : `${count} products`;
  }

  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return `${count} товар`;
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} товара`;
  }

  return `${count} товаров`;
}

export function getCatalogCopy(locale: string) {
  if (locale === 'en') {
    return {
      title: 'Fertilizer Catalog',
      subtitle: 'We know how to take care of your plants',
      categoryBadge: 'Category',
      openCategory: 'Open category',
      allCategories: 'All categories',
      learnMore: 'Learn more',
      emptyCategories: 'Categories will appear here after they are added.',
      emptyProducts: 'There are no products in this category yet.',
      productPlaceholder: 'Product photo will be added soon.',
      backToCategory: 'Back to products',
      descriptionTitle: 'Description',
      advantagesTitle: 'Advantages',
      advantagesEmpty: 'Advantages will be added later.',
      detailsFallback: 'Detailed product information will be added later.',
      routeMismatch: 'This product belongs to another category.',
    };
  }

  return {
    title: 'Каталог удобрений',
    subtitle: 'Мы знаем как позаботиться о ваших растениях',
    categoryBadge: 'Категория',
    openCategory: 'Открыть категорию',
    allCategories: 'Все категории',
    learnMore: 'Узнать больше',
    emptyCategories: 'Категории появятся здесь после добавления в базу.',
    emptyProducts: 'В этой категории пока нет товаров.',
    productPlaceholder: 'Фото товара появится после загрузки в backend/images.',
    backToCategory: 'К списку товаров',
    descriptionTitle: 'Описание',
    advantagesTitle: 'Преимущества',
    advantagesEmpty: 'Преимущества будут добавлены позже.',
    detailsFallback: 'Подробное описание товара будет добавлено позже.',
    routeMismatch: 'Этот товар относится к другой категории.',
  };
}

export function getCatalogAdminCopy(locale: string) {
  if (locale === 'en') {
    return {
      title: 'Catalog mini admin',
      subtitle:
        'Add products to categories with a title and image. The image will be saved in backend/images/products.',
      formTitle: 'Add product',
      formDescription: 'This is a basic internal admin page without authentication.',
      statusCreated: 'Product created successfully.',
      statusUpdated: 'Product updated successfully.',
      categoryLabel: 'Category',
      nameLabel: 'Product name',
      imageLabel: 'Image',
      descriptionLabel: 'Short description',
      translationSectionTitle: 'English translation',
      translationSectionHint:
        'Leave fields empty if you want the English catalog to fall back to Russian.',
      categoryNameEnLabel: 'Category name in English',
      categoryDescriptionEnLabel: 'Category description in English',
      categoryTranslationsTitle: 'Category translations',
      categoryTranslationsHint:
        'These translations are used on the English catalog pages. URLs remain stable.',
      categoryUpdateLabel: 'Save category translation',
      categoryStatusUpdated: 'Category translation updated successfully.',
      compositionLabel: 'Composition',
      applicationLabel: 'Application guide',
      advantagesLabel: 'Advantages',
      optionalLabel: 'Optional',
      submitLabel: 'Add product',
      updateLabel: 'Save changes',
      editLabel: 'Edit product',
      imageHint: 'Supported formats: JPG, PNG, WEBP up to 5 MB.',
      replaceImageHint: 'Leave empty to keep the current image.',
      compositionHint: 'One item per line: Nitrogen | 20 g/l',
      applicationHint:
        'Separate cards with an empty line. First line is the title, next lines are the recommendation.',
      existingTitle: 'Current products',
      emptyState: 'There are no products in this category yet.',
      backToCatalog: 'Open catalog',
      adminPathHint: 'Use this page to keep the catalog updated quickly.',
      imagePathLabel: 'Image path',
      productCountLabel: 'products',
      openProduct: 'Open product',
    };
  }

  return {
    title: 'Мини-админка каталога',
    subtitle:
      'Добавляйте товары в категории по названию и фото. Изображение будет сохраняться в backend/images/products.',
    formTitle: 'Добавить товар',
    formDescription:
      'Это базовая внутренняя страница без авторизации, только для быстрого наполнения каталога.',
    statusCreated: 'Товар успешно добавлен.',
    statusUpdated: 'Товар успешно обновлен.',
    categoryLabel: 'Категория',
    nameLabel: 'Название товара',
    imageLabel: 'Фото',
    descriptionLabel: 'Короткое описание',
    compositionLabel: 'Состав',
    applicationLabel: 'Регламент применения',
    advantagesLabel: 'Преимущества',
    optionalLabel: 'Необязательно',
    submitLabel: 'Добавить товар',
    updateLabel: 'Сохранить изменения',
    editLabel: 'Редактировать товар',
    imageHint: 'Поддерживаются JPG, PNG, WEBP до 5 МБ.',
    replaceImageHint: 'Оставьте поле пустым, чтобы сохранить текущее фото.',
    compositionHint: 'По одному компоненту в строке: Азот | 20 г/л',
    applicationHint:
      'Разделяйте карточки пустой строкой. Первая строка - заголовок, далее текст рекомендации.',
    existingTitle: 'Текущие товары',
    emptyState: 'В этой категории пока нет товаров.',
    backToCatalog: 'Открыть каталог',
    adminPathHint: 'Используйте эту страницу для быстрого наполнения каталога.',
    imagePathLabel: 'Путь к изображению',
    productCountLabel: 'товаров',
    openProduct: 'Открыть товар',
  };
}
