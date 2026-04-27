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
import { requireAdminSession } from '@/lib/adminAuthServer';
import { getCategories, getProducts, noStoreApiFetchOptions, type Product } from '@/lib/api';
import {
  formatProductCount,
  getCatalogAdminCopy,
  getCatalogCopy,
  getCategoryHref,
  getProductHref,
  parseEntityId,
} from '@/lib/catalog';
import { resolveMediaUrl } from '@/lib/media';
import { FiEdit3, FiExternalLink, FiGlobe } from 'react-icons/fi';

import {
  createProductAction,
  updateCategoryTranslationAction,
  updateProductAction,
} from './actions';

type AdminPageSearchParams = {
  category?: string;
  categoryError?: string;
  categoryStatus?: string;
  edit?: string;
  error?: string;
  product?: string;
  status?: string;
};

type ProductFormValues = Pick<
  Product,
  | 'categoryId'
  | 'name'
  | 'nameEn'
  | 'description'
  | 'descriptionEn'
  | 'advantages'
  | 'advantagesEn'
  | 'composition'
  | 'compositionEn'
  | 'application'
  | 'applicationEn'
>;

function ProductFormFields({
  locale,
  adminCopy,
  categories,
  values,
  imageRequired,
}: {
  locale: string;
  adminCopy: ReturnType<typeof getCatalogAdminCopy>;
  categories: Awaited<ReturnType<typeof getCategories>>;
  values?: Partial<ProductFormValues>;
  imageRequired: boolean;
}) {
  const translationSectionTitle =
    locale === 'en' ? 'English translation' : 'Английская версия';
  const translationSectionHint =
    locale === 'en'
      ? 'Leave fields empty if you want the English catalog to fall back to Russian.'
      : 'Оставьте поля пустыми, если в английской версии каталога должен использоваться русский текст.';
  const nameEnLabel =
    locale === 'en' ? 'Product name in English' : 'Название товара на английском';
  const descriptionEnLabel =
    locale === 'en' ? 'Description in English' : 'Описание на английском';
  const compositionEnLabel =
    locale === 'en' ? 'Composition in English' : 'Состав на английском';
  const compositionEnHint =
    locale === 'en'
      ? 'One component per line in English.'
      : 'По одному компоненту в строке на английском языке.';
  const advantagesEnLabel =
    locale === 'en' ? 'Advantages in English' : 'Преимущества на английском';
  const advantagesEnHint =
    locale === 'en'
      ? 'These values are shown on the English product page.'
      : 'Эти значения будут показаны в английской версии карточки товара.';
  const applicationEnLabel =
    locale === 'en'
      ? 'Application guide in English'
      : 'Регламент применения на английском';
  const applicationEnHint =
    locale === 'en'
      ? 'Separate cards with an empty line. First line is the title.'
      : 'Разделяйте карточки пустой строкой. Первая строка — заголовок.';

  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <label className={adminFieldClassName}>
          <span className={adminLabelClassName}>{adminCopy.categoryLabel}</span>
          <select
            name="categoryId"
            required
            defaultValue={values?.categoryId ? String(values.categoryId) : ''}
            className={adminCx(adminInputClassName, 'appearance-none')}>
            <option value="">{locale === 'en' ? 'Select category' : 'Выберите категорию'}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className={adminFieldClassName}>
          <span className={adminLabelClassName}>{adminCopy.nameLabel}</span>
          <input
            name="name"
            type="text"
            required
            defaultValue={values?.name ?? ''}
            placeholder={locale === 'en' ? 'For example, Copper-88' : 'Например, Медь-88'}
            className={adminInputClassName}
          />
        </label>
      </div>

      <label className={adminFieldClassName}>
        <span className={adminLabelClassName}>
          {adminCopy.imageLabel}
          {!imageRequired ? (
            <span className={adminOptionalLabelClassName}> ({adminCopy.optionalLabel})</span>
          ) : null}
        </span>
        <input
          name="image"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          required={imageRequired}
          className={adminFileInputClassName}
        />
        <span className={adminHintClassName}>
          {imageRequired ? adminCopy.imageHint : adminCopy.replaceImageHint}
        </span>
      </label>

      <label className={adminFieldClassName}>
        <span className={adminLabelClassName}>
          {adminCopy.descriptionLabel}
          <span className={adminOptionalLabelClassName}> ({adminCopy.optionalLabel})</span>
        </span>
        <textarea
          name="description"
          rows={4}
          defaultValue={values?.description ?? ''}
          className={adminTextareaClassName}
        />
      </label>

      <div className={adminTranslationCardClassName}>
        <div>
          <p className={adminBadgeClassName}>{translationSectionTitle}</p>
          <p className={adminCx('mt-3', adminHintClassName)}>{translationSectionHint}</p>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className={adminFieldClassName}>
            <span className={adminLabelClassName}>
              {nameEnLabel}
              <span className={adminOptionalLabelClassName}> ({adminCopy.optionalLabel})</span>
            </span>
            <input
              name="nameEn"
              type="text"
              defaultValue={values?.nameEn ?? ''}
              placeholder={locale === 'en' ? 'For example, Copper-88' : 'Например, Copper-88'}
              className={adminInputOnWhiteClassName}
            />
          </label>

          <label className={adminFieldClassName}>
            <span className={adminLabelClassName}>
              {descriptionEnLabel}
              <span className={adminOptionalLabelClassName}> ({adminCopy.optionalLabel})</span>
            </span>
            <textarea
              name="descriptionEn"
              rows={4}
              defaultValue={values?.descriptionEn ?? ''}
              className={adminTextareaOnWhiteClassName}
            />
          </label>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <label className={adminFieldClassName}>
          <span className={adminLabelClassName}>
            {adminCopy.compositionLabel}
            <span className={adminOptionalLabelClassName}> ({adminCopy.optionalLabel})</span>
          </span>
          <textarea
            name="composition"
            rows={5}
            defaultValue={values?.composition ?? ''}
            placeholder={
              locale === 'en'
                ? 'Nitrogen | 20 g/l\nPhosphorus | 60 g/l\nPotassium | 60 g/l'
                : 'Азот | 20 г/л\nФосфор | 60 г/л\nКалий | 60 г/л'
            }
            className={adminTextareaClassName}
          />
          <span className={adminHintClassName}>{adminCopy.compositionHint}</span>
        </label>

        <label className={adminFieldClassName}>
          <span className={adminLabelClassName}>
            {compositionEnLabel}
            <span className={adminOptionalLabelClassName}> ({adminCopy.optionalLabel})</span>
          </span>
          <textarea
            name="compositionEn"
            rows={5}
            defaultValue={values?.compositionEn ?? ''}
            placeholder={'Nitrogen | 20 g/l\nPhosphorus | 60 g/l\nPotassium | 60 g/l'}
            className={adminTextareaClassName}
          />
          <span className={adminHintClassName}>{compositionEnHint}</span>
        </label>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <label className={adminFieldClassName}>
          <span className={adminLabelClassName}>
            {adminCopy.advantagesLabel}
            <span className={adminOptionalLabelClassName}> ({adminCopy.optionalLabel})</span>
          </span>
          <textarea
            name="advantages"
            rows={5}
            defaultValue={values?.advantages ?? ''}
            placeholder={
              locale === 'en' ? 'One advantage per line' : 'По одному преимуществу в строке'
            }
            className={adminTextareaClassName}
          />
          <span className={adminHintClassName}>
            {locale === 'en'
              ? 'Write each advantage on a new line. Commas inside the sentence are preserved.'
              : 'Пишите каждое преимущество с новой строки. Запятые внутри фразы сохраняются.'}
          </span>
        </label>

        <label className={adminFieldClassName}>
          <span className={adminLabelClassName}>
            {advantagesEnLabel}
            <span className={adminOptionalLabelClassName}> ({adminCopy.optionalLabel})</span>
          </span>
          <textarea
            name="advantagesEn"
            rows={5}
            defaultValue={values?.advantagesEn ?? ''}
            placeholder={locale === 'en' ? 'One advantage per line' : 'По одному пункту в строке'}
            className={adminTextareaClassName}
          />
          <span className={adminHintClassName}>{advantagesEnHint}</span>
        </label>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <label className={adminFieldClassName}>
          <span className={adminLabelClassName}>
            {adminCopy.applicationLabel}
            <span className={adminOptionalLabelClassName}> ({adminCopy.optionalLabel})</span>
          </span>
          <textarea
            name="application"
            rows={8}
            defaultValue={values?.application ?? ''}
            placeholder={
              locale === 'en'
                ? 'Grapes, apple, pear:\n1 l/ha for spray volume up to 600 l/ha\n1.5 l/ha for 700-1000 l/ha\n\nBerries:\n1 l/ha for spray volume up to 500 l/ha'
                : 'Виноград, яблоня, груша:\n1 л/га при объеме рабочей жидкости до 600 л/га\n1,5 л/га при объеме рабочей жидкости 700-1000 л/га\n\nЯгодники:\n1 л/га при объеме рабочей жидкости до 500 л/га'
            }
            className={adminTextareaClassName}
          />
          <span className={adminHintClassName}>{adminCopy.applicationHint}</span>
        </label>

        <label className={adminFieldClassName}>
          <span className={adminLabelClassName}>
            {applicationEnLabel}
            <span className={adminOptionalLabelClassName}> ({adminCopy.optionalLabel})</span>
          </span>
          <textarea
            name="applicationEn"
            rows={8}
            defaultValue={values?.applicationEn ?? ''}
            placeholder={
              'Grapes, apple, pear:\n1 l/ha for spray volume up to 600 l/ha\n1.5 l/ha for 700-1000 l/ha\n\nBerries:\n1 l/ha for spray volume up to 500 l/ha'
            }
            className={adminTextareaClassName}
          />
          <span className={adminHintClassName}>{applicationEnHint}</span>
        </label>
      </div>
    </div>
  );
}

export default async function AdminProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<AdminPageSearchParams>;
}) {
  const { locale } = await params;
  await requireAdminSession(locale, `/${locale}/admin/products`);

  const { category, categoryError, categoryStatus, edit, error, product, status } =
    await searchParams;
  const adminCopy = getCatalogAdminCopy(locale);
  const catalogCopy = getCatalogCopy(locale);
  const [categories, products] = await Promise.all([
    getCategories(undefined, noStoreApiFetchOptions),
    getProducts(undefined, undefined, noStoreApiFetchOptions),
  ]);
  const activeCategoryId = parseEntityId(category ?? '');
  const editProductId = parseEntityId(edit ?? '');
  const statusProductId = parseEntityId(product ?? '');
  const topLevelError = error && !editProductId ? error : null;
  const topLevelStatus = status === 'created' ? adminCopy.statusCreated : null;
  const untranslatedCategories = categories.filter(
    (categoryItem) => !categoryItem.nameEn?.trim() || !categoryItem.descriptionEn?.trim(),
  ).length;
  const untranslatedProducts = products.filter((productItem) => !productItem.nameEn?.trim()).length;
  const categoryTranslationTitle =
    locale === 'en' ? 'Category translation' : 'Перевод категории';
  const categoryTranslationHint =
    locale === 'en'
      ? 'These values are used on the English catalog pages. URLs remain stable.'
      : 'Эти значения используются в английском каталоге. URL при этом не меняются.';
  const categoryNameEnLabel =
    locale === 'en' ? 'Category name in English' : 'Название категории на английском';
  const categoryDescriptionEnLabel =
    locale === 'en' ? 'Category description in English' : 'Описание категории на английском';
  const saveCategoryTranslationLabel =
    locale === 'en' ? 'Save category translation' : 'Сохранить перевод категории';
  const categoryStatusMessage =
    categoryStatus === 'updated'
      ? locale === 'en'
        ? 'Category translation updated successfully.'
        : 'Перевод категории успешно обновлен.'
      : null;
  const createBadge = locale === 'en' ? 'Create' : 'Создание';
  const manageBadge = locale === 'en' ? 'Manage' : 'Управление';
  const emptyManageTitle =
    locale === 'en' ? 'Categories will appear here' : 'Категории появятся здесь';
  const openEditorLabel = locale === 'en' ? 'Open editor' : 'Открыть редактор';
  const editCategoryLabel =
    locale === 'en' ? 'Open translation form' : 'Открыть форму перевода';
  const stats = [
    {
      label: locale === 'en' ? 'Categories' : 'Категории',
      value: String(categories.length),
      hint:
        locale === 'en'
          ? 'Catalog sections available for products.'
          : 'Разделы каталога, доступные для товаров.',
    },
    {
      label: locale === 'en' ? 'Products' : 'Товары',
      value: String(products.length),
      hint:
        locale === 'en'
          ? 'All product cards currently in the catalog.'
          : 'Все карточки товаров, которые уже есть в каталоге.',
    },
    {
      label: locale === 'en' ? 'Need EN' : 'Нужен EN',
      value: String(untranslatedProducts),
      hint:
        locale === 'en'
          ? 'Products still using Russian fallback in English.'
          : 'Товары, которые еще используют русский fallback в английской версии.',
    },
    {
      label: locale === 'en' ? 'Category EN' : 'EN категорий',
      value: String(untranslatedCategories),
      hint:
        locale === 'en'
          ? 'Categories still missing English data.'
          : 'Категории, в которых еще не хватает английских полей.',
    },
  ];
  const shortcuts = [
    {
      href: '#create-product',
      label: locale === 'en' ? 'Add product' : 'Добавить товар',
    },
    {
      href: '#manage-products',
      label: locale === 'en' ? 'Browse products' : 'Список товаров',
    },
  ];

  return (
    <AdminShell
      activeTab="products"
      backHref="/catalog"
      backLabel={adminCopy.backToCatalog}
      description={adminCopy.subtitle}
      locale={locale}
      shortcuts={shortcuts}
      stats={stats}
      title={adminCopy.title}>
      <AdminWorkspace>
        <AdminPanel
          id="create-product"
          badge={createBadge}
          title={adminCopy.formTitle}
          description={adminCopy.formDescription}>
          <div className="space-y-4">
            {topLevelStatus ? <AdminNotice tone="success">{topLevelStatus}</AdminNotice> : null}
            {topLevelError ? <AdminNotice tone="error">{topLevelError}</AdminNotice> : null}
          </div>

          <form action={createProductAction} className="mt-6 space-y-6">
            <input type="hidden" name="locale" value={locale} />

            <ProductFormFields
              locale={locale}
              adminCopy={adminCopy}
              categories={categories}
              imageRequired
            />

            <div className="flex flex-col gap-3 border-t border-[#0b5a45]/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="submit"
                className={adminCx(adminPrimaryButtonClassName, 'w-full sm:w-auto')}>
                {adminCopy.submitLabel}
              </button>
              <p className={adminHintClassName}>
                {locale === 'en'
                  ? 'The uploaded image will be stored in backend/images/products.'
                  : 'Загруженное изображение будет сохранено в backend/images/products.'}
              </p>
            </div>
          </form>
        </AdminPanel>

        <AdminPanel
          id="manage-products"
          badge={manageBadge}
          title={adminCopy.existingTitle}
          description={adminCopy.adminPathHint}
          tone="muted"
          headerContent={
            <span className={adminBadgeClassName}>
              {products.length} {adminCopy.productCountLabel}
            </span>
          }>
          {categories.length === 0 ? (
            <AdminEmptyState
              badge={manageBadge}
              title={emptyManageTitle}
              description={adminCopy.emptyState}
            />
          ) : (
            <div className="space-y-5">
              {categories.map((categoryItem) => {
                const categoryProducts = products.filter(
                  (productItem) => productItem.categoryId === categoryItem.id,
                );
                const isCategoryEditing = activeCategoryId === categoryItem.id;
                const hasTranslation =
                  Boolean(categoryItem.nameEn?.trim()) && Boolean(categoryItem.descriptionEn?.trim());

                return (
                  <div
                    key={categoryItem.id}
                    id={`category-${categoryItem.id}`}
                    className="scroll-mt-32 rounded-[1.6rem] border border-[#0b5a45]/10 bg-white p-4 shadow-[0_20px_60px_-48px_rgba(11,62,49,0.9)] sm:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-semibold text-[#0b3e31]">
                            {categoryItem.name}
                          </h3>
                          <span className={adminBadgeClassName}>
                            {formatProductCount(categoryProducts.length, locale)}
                          </span>
                          <span
                            className={adminCx(
                              'inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]',
                              hasTranslation
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700',
                            )}>
                            {hasTranslation
                              ? locale === 'en'
                                ? 'EN ready'
                                : 'EN готов'
                              : locale === 'en'
                                ? 'Needs EN'
                                : 'Нужен EN'}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-[#567068]">
                          {categoryTranslationHint}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Link href={getCategoryHref(categoryItem)} className={adminSecondaryButtonClassName}>
                          <FiExternalLink className="mr-2" />
                          {catalogCopy.openCategory}
                        </Link>
                        <Link
                          href={`/admin/products?category=${categoryItem.id}#category-${categoryItem.id}`}
                          className={adminSecondaryButtonClassName}>
                          <FiGlobe className="mr-2" />
                          {editCategoryLabel}
                        </Link>
                      </div>
                    </div>

                    <details open={isCategoryEditing} className={adminCx('mt-5', adminDetailsClassName)}>
                      <summary className={adminSummaryClassName}>
                        <span>{categoryTranslationTitle}</span>
                        <span className="text-xs font-medium text-[#6a7f76]">
                          {locale === 'en'
                            ? 'English catalog fields'
                            : 'Поля для английского каталога'}
                        </span>
                      </summary>

                      <div className="border-t border-[#0b5a45]/10 p-4 sm:p-5">
                        <div className="space-y-4">
                          {categoryStatusMessage && isCategoryEditing ? (
                            <AdminNotice tone="success">{categoryStatusMessage}</AdminNotice>
                          ) : null}

                          {categoryError && isCategoryEditing ? (
                            <AdminNotice tone="error">{categoryError}</AdminNotice>
                          ) : null}
                        </div>

                        <form action={updateCategoryTranslationAction} className="mt-5 space-y-5">
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="categoryId" value={categoryItem.id} />

                          <div className="grid gap-5 md:grid-cols-2">
                            <label className={adminFieldClassName}>
                              <span className={adminLabelClassName}>{categoryNameEnLabel}</span>
                              <input
                                name="nameEn"
                                type="text"
                                defaultValue={categoryItem.nameEn ?? ''}
                                className={adminInputOnWhiteClassName}
                              />
                            </label>

                            <label className={adminFieldClassName}>
                              <span className={adminLabelClassName}>
                                {categoryDescriptionEnLabel}
                              </span>
                              <textarea
                                name="descriptionEn"
                                rows={3}
                                defaultValue={categoryItem.descriptionEn ?? ''}
                                className={adminTextareaOnWhiteClassName}
                              />
                            </label>
                          </div>

                          <button
                            type="submit"
                            className={adminCx(adminPrimaryButtonClassName, 'w-full sm:w-auto')}>
                            {saveCategoryTranslationLabel}
                          </button>
                        </form>
                      </div>
                    </details>

                    {categoryProducts.length === 0 ? (
                      <div className="mt-5 rounded-[1.3rem] border border-dashed border-[#0b5a45]/16 bg-[#f8f7f2] px-4 py-5 text-sm text-[#6a7f76]">
                        {adminCopy.emptyState}
                      </div>
                    ) : (
                      <div className="mt-5 space-y-3">
                        {categoryProducts.map((productItem) => {
                          const imageSrc = resolveMediaUrl(productItem.imageUrl);
                          const isEditing =
                            editProductId === productItem.id || statusProductId === productItem.id;

                          return (
                            <div
                              key={productItem.id}
                              id={`product-${productItem.id}`}
                              className="scroll-mt-32 rounded-[1.35rem] border border-[#0b5a45]/10 bg-[#f8f7f2] p-4">
                              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="flex min-w-0 gap-4">
                                  <div className="relative h-[86px] w-[86px] shrink-0 overflow-hidden rounded-[1.25rem] border border-[#0b5a45]/10 bg-white">
                                    <MediaImage
                                      src={imageSrc}
                                      alt={productItem.name}
                                      fill
                                      sizes="86px"
                                      className="object-contain p-2"
                                      emptyState={
                                        <div className="flex h-full w-full items-center justify-center text-[10px] text-[#6a7f76]">
                                          IMG
                                        </div>
                                      }
                                    />
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="text-base font-semibold text-[#0b3e31]">
                                        {productItem.name}
                                      </p>
                                      {!productItem.nameEn?.trim() ? (
                                        <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                                          {locale === 'en' ? 'Needs EN' : 'Нужен EN'}
                                        </span>
                                      ) : null}
                                    </div>

                                    {productItem.description ? (
                                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#567068]">
                                        {productItem.description}
                                      </p>
                                    ) : null}

                                    <p className="mt-3 text-xs leading-5 text-[#7f8f88]">
                                      {adminCopy.imagePathLabel}: {productItem.imageUrl}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex flex-col gap-2 sm:flex-row lg:flex-col lg:items-end">
                                  <Link
                                    href={getProductHref(categoryItem, productItem)}
                                    className={adminSecondaryButtonClassName}>
                                    <FiExternalLink className="mr-2" />
                                    {adminCopy.openProduct}
                                  </Link>
                                  <Link
                                    href={`/admin/products?edit=${productItem.id}#product-${productItem.id}`}
                                    className={adminSecondaryButtonClassName}>
                                    <FiEdit3 className="mr-2" />
                                    {openEditorLabel}
                                  </Link>
                                </div>
                              </div>

                              <details open={isEditing} className={adminCx('mt-4', adminDetailsClassName)}>
                                <summary className={adminSummaryClassName}>
                                  <span>{adminCopy.editLabel}</span>
                                  <span className="text-xs font-medium text-[#6a7f76]">
                                    {locale === 'en'
                                      ? 'Inline product editor'
                                      : 'Встроенный редактор товара'}
                                  </span>
                                </summary>

                                <div className="border-t border-[#0b5a45]/10 p-4 sm:p-5">
                                  <div className="space-y-4">
                                    {status === 'updated' && statusProductId === productItem.id ? (
                                      <AdminNotice tone="success">
                                        {adminCopy.statusUpdated}
                                      </AdminNotice>
                                    ) : null}

                                    {error && editProductId === productItem.id ? (
                                      <AdminNotice tone="error">{error}</AdminNotice>
                                    ) : null}
                                  </div>

                                  <form action={updateProductAction} className="mt-5 space-y-6">
                                    <input type="hidden" name="locale" value={locale} />
                                    <input type="hidden" name="productId" value={productItem.id} />
                                    <input
                                      type="hidden"
                                      name="previousCategoryId"
                                      value={productItem.categoryId}
                                    />
                                    <input
                                      type="hidden"
                                      name="previousName"
                                      value={productItem.name}
                                    />

                                    <ProductFormFields
                                      locale={locale}
                                      adminCopy={adminCopy}
                                      categories={categories}
                                      values={productItem}
                                      imageRequired={false}
                                    />

                                    <button
                                      type="submit"
                                      className={adminCx(
                                        adminPrimaryButtonClassName,
                                        'w-full sm:w-auto',
                                      )}>
                                      {adminCopy.updateLabel}
                                    </button>
                                  </form>
                                </div>
                              </details>
                            </div>
                          );
                        })}
                      </div>
                    )}
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
