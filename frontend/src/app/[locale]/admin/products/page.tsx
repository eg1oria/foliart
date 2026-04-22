import AdminTabs from '@/components/admin/AdminTabs';
import MediaImage from '@/components/catalog/MediaImage';
import { Link } from '@/i18n/routing';
import { getCategories, getProducts, type Product } from '@/lib/api';
import {
  formatProductCount,
  getCatalogAdminCopy,
  getCatalogCopy,
  getCategoryHref,
  getProductHref,
  parseEntityId,
} from '@/lib/catalog';
import { resolveMediaUrl } from '@/lib/media';
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
  return (
    <>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-[#0b3e31]">{adminCopy.categoryLabel}</span>
        <select
          name="categoryId"
          required
          defaultValue={values?.categoryId ? String(values.categoryId) : ''}
          className="rounded-2xl border border-[#0b5a45]/15 bg-[#f8f7f2] px-4 py-3 text-[#0b3e31] outline-none transition focus:border-[#0b5a45]">
          <option value="">{locale === 'en' ? 'Select category' : 'Выберите категорию'}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-[#0b3e31]">{adminCopy.nameLabel}</span>
        <input
          name="name"
          type="text"
          required
          defaultValue={values?.name ?? ''}
          placeholder={locale === 'en' ? 'For example, Copper-88' : 'Например, Медь-88'}
          className="rounded-2xl border border-[#0b5a45]/15 bg-[#f8f7f2] px-4 py-3 text-[#0b3e31] outline-none transition placeholder:text-[#7e9088] focus:border-[#0b5a45]"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-[#0b3e31]">
          {adminCopy.imageLabel}
          {!imageRequired ? (
            <span className="text-[#7e9088]"> ({adminCopy.optionalLabel})</span>
          ) : null}
        </span>
        <input
          name="image"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          required={imageRequired}
          className="rounded-2xl border border-dashed border-[#0b5a45]/20 bg-[#f8f7f2] px-4 py-3 text-sm text-[#0b3e31] file:mr-4 file:rounded-full file:border-0 file:bg-[#0b5a45] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
        />
        <span className="text-xs leading-5 text-[#6a7f76]">
          {imageRequired ? adminCopy.imageHint : adminCopy.replaceImageHint}
        </span>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-[#0b3e31]">
          {adminCopy.descriptionLabel}{' '}
          <span className="text-[#7e9088]">({adminCopy.optionalLabel})</span>
        </span>
        <textarea
          name="description"
          rows={4}
          defaultValue={values?.description ?? ''}
          className="rounded-2xl border border-[#0b5a45]/15 bg-[#f8f7f2] px-4 py-3 text-[#0b3e31] outline-none transition placeholder:text-[#7e9088] focus:border-[#0b5a45]"
        />
      </label>

      <div className="rounded-[1.6rem] border border-[#0b5a45]/10 bg-[#f7f9f6] px-5 py-5">
        <div className="mb-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0b5a45]">
            {locale === 'en' ? 'English translation' : 'Английский перевод'}
          </p>
          <p className="mt-2 text-xs leading-5 text-[#6a7f76]">
            {locale === 'en'
              ? 'Leave fields empty if you want the English catalog to fall back to Russian.'
              : 'Если поле пустое, в английском каталоге останется русский текст.'}
          </p>
        </div>

        <div className="space-y-5">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-[#0b3e31]">
              {locale === 'en' ? 'Product name in English' : 'Название товара на английском'}{' '}
              <span className="text-[#7e9088]">({adminCopy.optionalLabel})</span>
            </span>
            <input
              name="nameEn"
              type="text"
              defaultValue={values?.nameEn ?? ''}
              placeholder={locale === 'en' ? 'For example, Copper-88' : 'Например, Copper-88'}
              className="rounded-2xl border border-[#0b5a45]/15 bg-white px-4 py-3 text-[#0b3e31] outline-none transition placeholder:text-[#7e9088] focus:border-[#0b5a45]"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-[#0b3e31]">
              {locale === 'en' ? 'Description in English' : 'Описание на английском'}{' '}
              <span className="text-[#7e9088]">({adminCopy.optionalLabel})</span>
            </span>
            <textarea
              name="descriptionEn"
              rows={4}
              defaultValue={values?.descriptionEn ?? ''}
              className="rounded-2xl border border-[#0b5a45]/15 bg-white px-4 py-3 text-[#0b3e31] outline-none transition placeholder:text-[#7e9088] focus:border-[#0b5a45]"
            />
          </label>
        </div>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-[#0b3e31]">
          {adminCopy.compositionLabel}{' '}
          <span className="text-[#7e9088]">({adminCopy.optionalLabel})</span>
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
          className="rounded-2xl border border-[#0b5a45]/15 bg-[#f8f7f2] px-4 py-3 text-[#0b3e31] outline-none transition placeholder:text-[#7e9088] focus:border-[#0b5a45]"
        />
        <span className="text-xs leading-5 text-[#6a7f76]">{adminCopy.compositionHint}</span>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-[#0b3e31]">
          {locale === 'en' ? 'Composition in English' : 'Состав на английском'}{' '}
          <span className="text-[#7e9088]">({adminCopy.optionalLabel})</span>
        </span>
        <textarea
          name="compositionEn"
          rows={5}
          defaultValue={values?.compositionEn ?? ''}
          placeholder={'Nitrogen | 20 g/l\nPhosphorus | 60 g/l\nPotassium | 60 g/l'}
          className="rounded-2xl border border-[#0b5a45]/15 bg-[#f8f7f2] px-4 py-3 text-[#0b3e31] outline-none transition placeholder:text-[#7e9088] focus:border-[#0b5a45]"
        />
        <span className="text-xs leading-5 text-[#6a7f76]">
          {locale === 'en'
            ? 'One component per line in English.'
            : 'По одному компоненту в строке на английском языке.'}
        </span>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-[#0b3e31]">
          {adminCopy.advantagesLabel}{' '}
          <span className="text-[#7e9088]">({adminCopy.optionalLabel})</span>
        </span>
        <textarea
          name="advantages"
          rows={5}
          defaultValue={values?.advantages ?? ''}
          placeholder={
            locale === 'en' ? 'One advantage per line' : 'По одному преимуществу в строке'
          }
          className="rounded-2xl border border-[#0b5a45]/15 bg-[#f8f7f2] px-4 py-3 text-[#0b3e31] outline-none transition placeholder:text-[#7e9088] focus:border-[#0b5a45]"
        />
        <span className="text-xs leading-5 text-[#6a7f76]">
          {locale === 'en'
            ? 'Write each advantage on a new line. Commas inside the sentence are preserved.'
            : 'Пишите каждое преимущество с новой строки. Запятые внутри фразы сохраняются.'}
        </span>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-[#0b3e31]">
          {locale === 'en' ? 'Advantages in English' : 'Преимущества на английском'}{' '}
          <span className="text-[#7e9088]">({adminCopy.optionalLabel})</span>
        </span>
        <textarea
          name="advantagesEn"
          rows={5}
          defaultValue={values?.advantagesEn ?? ''}
          placeholder={
            locale === 'en'
              ? 'One advantage per line'
              : 'По одному преимуществу в строке на английском'
          }
          className="rounded-2xl border border-[#0b5a45]/15 bg-[#f8f7f2] px-4 py-3 text-[#0b3e31] outline-none transition placeholder:text-[#7e9088] focus:border-[#0b5a45]"
        />
        <span className="text-xs leading-5 text-[#6a7f76]">
          {locale === 'en'
            ? 'These values are shown on the English product page.'
            : 'Эти значения будут показаны в английской версии карточки товара.'}
        </span>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-[#0b3e31]">
          {adminCopy.applicationLabel}{' '}
          <span className="text-[#7e9088]">({adminCopy.optionalLabel})</span>
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
          className="rounded-2xl border border-[#0b5a45]/15 bg-[#f8f7f2] px-4 py-3 text-[#0b3e31] outline-none transition placeholder:text-[#7e9088] focus:border-[#0b5a45]"
        />
        <span className="text-xs leading-5 text-[#6a7f76]">{adminCopy.applicationHint}</span>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-[#0b3e31]">
          {locale === 'en' ? 'Application guide in English' : 'Регламент применения на английском'}{' '}
          <span className="text-[#7e9088]">({adminCopy.optionalLabel})</span>
        </span>
        <textarea
          name="applicationEn"
          rows={8}
          defaultValue={values?.applicationEn ?? ''}
          placeholder={
            'Grapes, apple, pear:\n1 l/ha for spray volume up to 600 l/ha\n1.5 l/ha for 700-1000 l/ha\n\nBerries:\n1 l/ha for spray volume up to 500 l/ha'
          }
          className="rounded-2xl border border-[#0b5a45]/15 bg-[#f8f7f2] px-4 py-3 text-[#0b3e31] outline-none transition placeholder:text-[#7e9088] focus:border-[#0b5a45]"
        />
        <span className="text-xs leading-5 text-[#6a7f76]">
          {locale === 'en'
            ? 'Separate cards with an empty line. First line is the title.'
            : 'Разделяйте карточки пустой строкой. Первая строка — заголовок.'}
        </span>
      </label>
    </>
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
  const { category, categoryError, categoryStatus, edit, error, product, status } =
    await searchParams;
  const adminCopy = getCatalogAdminCopy(locale);
  const catalogCopy = getCatalogCopy(locale);
  const [categories, products] = await Promise.all([getCategories(), getProducts()]);
  const activeCategoryId = parseEntityId(category ?? '');
  const editProductId = parseEntityId(edit ?? '');
  const statusProductId = parseEntityId(product ?? '');
  const topLevelError = error && !editProductId ? error : null;
  const topLevelStatus = status === 'created' ? adminCopy.statusCreated : null;
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

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 pb-20 pt-60 md:px-8">
      <section className="rounded-[2.5rem] bg-[linear-gradient(135deg,#0b5a45,#0a3e31)] px-8 py-10 text-white shadow-[0_30px_90px_-50px_rgba(11,62,49,1)] md:px-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-medium uppercase tracking-[0.28em] text-[#d8ead8]">
              Foliart Admin
            </p>
            <h1 className="mb-4 text-4xl font-semibold md:text-5xl">{adminCopy.title}</h1>
            <p className="text-base leading-7 text-white/80 md:text-lg">{adminCopy.subtitle}</p>
            <AdminTabs active="products" locale={locale} />
          </div>

          <Link
            href="/catalog"
            className="inline-flex w-fit items-center rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/18">
            {adminCopy.backToCatalog}
          </Link>
        </div>
      </section>

      <section className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,1.05fr)]">
        <div className="rounded-[2rem] border border-[#0b5a45]/10 bg-white p-8 shadow-[0_24px_70px_-52px_rgba(11,62,49,0.95)]">
          <h2 className="text-3xl font-semibold text-[#0b3e31]">{adminCopy.formTitle}</h2>
          <p className="mt-3 text-sm leading-6 text-[#567068]">{adminCopy.formDescription}</p>

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

          <form action={createProductAction} className="mt-8 space-y-6">
            <input type="hidden" name="locale" value={locale} />

            <ProductFormFields
              locale={locale}
              adminCopy={adminCopy}
              categories={categories}
              imageRequired
            />

            <button
              type="submit"
              className="inline-flex items-center rounded-full bg-[#0b5a45] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#094635]">
              {adminCopy.submitLabel}
            </button>
          </form>
        </div>

        <aside className="rounded-[2rem] border border-[#0b5a45]/10 bg-[#f7f6f1] p-8 shadow-[0_24px_70px_-52px_rgba(11,62,49,0.95)]">
          <h2 className="text-3xl font-semibold text-[#0b3e31]">{adminCopy.existingTitle}</h2>
          <p className="mt-3 text-sm leading-6 text-[#567068]">{adminCopy.adminPathHint}</p>

          <div className="mt-8 space-y-5">
            {categories.map((category) => {
              const categoryProducts = products.filter(
                (productItem) => productItem.categoryId === category.id,
              );
              const isCategoryEditing = activeCategoryId === category.id;

              return (
                <div
                  key={category.id}
                  className="rounded-[1.5rem] border border-[#0b5a45]/10 bg-white p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-[#0b3e31]">{category.name}</h3>
                      <p className="mt-2 text-sm text-[#6a7f76]">
                        {formatProductCount(categoryProducts.length, locale)}
                      </p>
                    </div>

                    <Link
                      href={getCategoryHref(category)}
                      className="text-sm font-medium text-[#0b5a45] underline-offset-4 transition hover:underline">
                      {catalogCopy.openCategory}
                    </Link>
                  </div>

                  <details
                    open={isCategoryEditing}
                    className="mt-5 rounded-[1.1rem] border border-[#0b5a45]/10 bg-[#f8f7f2]">
                    <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-[#0b5a45] [&::-webkit-details-marker]:hidden">
                      {categoryTranslationTitle}
                    </summary>

                    <div className="border-t border-[#0b5a45]/10 p-4">
                      <p className="mb-4 text-xs leading-5 text-[#6a7f76]">{categoryTranslationHint}</p>

                      {categoryStatusMessage && isCategoryEditing ? (
                        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                          {categoryStatusMessage}
                        </div>
                      ) : null}

                      {categoryError && isCategoryEditing ? (
                        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                          {categoryError}
                        </div>
                      ) : null}

                      <form action={updateCategoryTranslationAction} className="space-y-4">
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="categoryId" value={category.id} />

                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-[#0b3e31]">
                            {categoryNameEnLabel}
                          </span>
                          <input
                            name="nameEn"
                            type="text"
                            defaultValue={category.nameEn ?? ''}
                            className="rounded-2xl border border-[#0b5a45]/15 bg-white px-4 py-3 text-[#0b3e31] outline-none transition placeholder:text-[#7e9088] focus:border-[#0b5a45]"
                          />
                        </label>

                        <label className="flex flex-col gap-2">
                          <span className="text-sm font-medium text-[#0b3e31]">
                            {categoryDescriptionEnLabel}
                          </span>
                          <textarea
                            name="descriptionEn"
                            rows={3}
                            defaultValue={category.descriptionEn ?? ''}
                            className="rounded-2xl border border-[#0b5a45]/15 bg-white px-4 py-3 text-[#0b3e31] outline-none transition placeholder:text-[#7e9088] focus:border-[#0b5a45]"
                          />
                        </label>

                        <button
                          type="submit"
                          className="inline-flex items-center rounded-full bg-[#0b5a45] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#094635]">
                          {saveCategoryTranslationLabel}
                        </button>
                      </form>
                    </div>
                  </details>

                  {categoryProducts.length === 0 ? (
                    <p className="mt-4 text-sm text-[#6a7f76]">{adminCopy.emptyState}</p>
                  ) : (
                    <div className="mt-5 space-y-3">
                      {categoryProducts.map((productItem) => {
                        const imageSrc = resolveMediaUrl(productItem.imageUrl);
                        const isEditing =
                          editProductId === productItem.id || statusProductId === productItem.id;

                        return (
                          <div
                            key={productItem.id}
                            className="rounded-[1.25rem] border border-[#0b5a45]/10 bg-[#f8f7f2] p-3">
                            <div className="flex items-center gap-4">
                              <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-2xl bg-white">
                                <MediaImage
                                  src={imageSrc}
                                  alt={productItem.name}
                                  fill
                                  sizes="72px"
                                  className="object-contain p-2"
                                  emptyState={
                                    <div className="flex h-full w-full items-center justify-center text-[10px] text-[#6a7f76]">
                                      IMG
                                    </div>
                                  }
                                />
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-[#0b3e31]">
                                  {productItem.name}
                                </p>
                                <p className="mt-1 truncate text-xs text-[#6a7f76]">
                                  {adminCopy.imagePathLabel}: {productItem.imageUrl}
                                </p>
                              </div>

                              <div className="flex shrink-0 flex-col items-end gap-2">
                                <Link
                                  href={getProductHref(category, productItem)}
                                  className="text-sm font-medium text-[#0b5a45] underline-offset-4 transition hover:underline">
                                  {adminCopy.openProduct}
                                </Link>
                              </div>
                            </div>

                            <details
                              open={isEditing}
                              className="mt-4 rounded-[1.1rem] border border-[#0b5a45]/10 bg-white">
                              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-[#0b5a45] [&::-webkit-details-marker]:hidden">
                                {adminCopy.editLabel}
                              </summary>

                              <div className="border-t border-[#0b5a45]/10 p-4">
                                {status === 'updated' && statusProductId === productItem.id ? (
                                  <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                                    {adminCopy.statusUpdated}
                                  </div>
                                ) : null}

                                {error && editProductId === productItem.id ? (
                                  <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                                    {error}
                                  </div>
                                ) : null}

                                <form action={updateProductAction} className="space-y-5">
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
                                    className="inline-flex items-center rounded-full bg-[#0b5a45] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#094635]">
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
        </aside>
      </section>
    </main>
  );
}
