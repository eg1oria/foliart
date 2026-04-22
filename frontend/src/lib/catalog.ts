import type { Category, Product } from './api';

export function parseEntityId(value: string): number | null {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
}

export function parseAdvantages(value: string): string[] {
  const normalized = value.trim();
  if (!normalized) {
    return [];
  }

  try {
    const parsed = JSON.parse(normalized);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => String(item).trim())
        .filter(Boolean);
    }
  } catch {
    // Fall back to plain-text parsing below.
  }

  return normalized
    .split(/\r?\n|[;,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getCategoryProductCount(
  category: Category,
  products: Product[],
): number {
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
      title: 'Product catalog',
      subtitle: 'Choose a category to open its products.',
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
    title: 'Каталог продукции',
    subtitle: 'Выберите категорию, чтобы открыть список товаров.',
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
        'Add a product to a category with a title and image. The image will be saved in backend/images/products.',
      formTitle: 'Add product',
      formDescription:
        'This is a basic internal admin page without authentication.',
      statusCreated: 'Product created successfully.',
      categoryLabel: 'Category',
      nameLabel: 'Product name',
      imageLabel: 'Image',
      descriptionLabel: 'Short description',
      advantagesLabel: 'Advantages',
      optionalLabel: 'Optional',
      submitLabel: 'Add product',
      imageHint: 'Supported formats: JPG, PNG, WEBP up to 5 MB.',
      existingTitle: 'Current products',
      emptyState: 'There are no products in this category yet.',
      backToCatalog: 'Open catalog',
      adminPathHint: 'Use this page to keep the catalog updated quickly.',
      imagePathLabel: 'Image path',
      productCountLabel: 'products',
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
    categoryLabel: 'Категория',
    nameLabel: 'Название товара',
    imageLabel: 'Фото',
    descriptionLabel: 'Короткое описание',
    advantagesLabel: 'Преимущества',
    optionalLabel: 'Необязательно',
    submitLabel: 'Добавить товар',
    imageHint: 'Поддерживаются JPG, PNG, WEBP до 5 МБ.',
    existingTitle: 'Текущие товары',
    emptyState: 'В этой категории пока нет товаров.',
    backToCatalog: 'Открыть каталог',
    adminPathHint: 'Используйте эту страницу для быстрого наполнения каталога.',
    imagePathLabel: 'Путь к изображению',
    productCountLabel: 'товаров',
  };
}
