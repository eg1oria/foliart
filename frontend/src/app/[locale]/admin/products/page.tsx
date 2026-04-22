import MediaImage from '@/components/catalog/MediaImage';
import { Link } from '@/i18n/routing';
import { getCategories, getProducts } from '@/lib/api';
import {
  formatProductCount,
  getCatalogAdminCopy,
  getCatalogCopy,
} from '@/lib/catalog';
import { resolveMediaUrl } from '@/lib/media';
import { createProductAction } from './actions';

type AdminPageSearchParams = {
  error?: string;
  status?: string;
};

export default async function AdminProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<AdminPageSearchParams>;
}) {
  const { locale } = await params;
  const { error, status } = await searchParams;
  const adminCopy = getCatalogAdminCopy(locale);
  const catalogCopy = getCatalogCopy(locale);
  const [categories, products] = await Promise.all([getCategories(), getProducts()]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 pb-20 pt-36 md:px-8">
      <section className="rounded-[2.5rem] bg-[linear-gradient(135deg,#0b5a45,#0a3e31)] px-8 py-10 text-white shadow-[0_30px_90px_-50px_rgba(11,62,49,1)] md:px-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-medium uppercase tracking-[0.28em] text-[#d8ead8]">
              Foliart Admin
            </p>
            <h1 className="mb-4 text-4xl font-semibold md:text-5xl">
              {adminCopy.title}
            </h1>
            <p className="text-base leading-7 text-white/80 md:text-lg">
              {adminCopy.subtitle}
            </p>
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
          <h2 className="text-3xl font-semibold text-[#0b3e31]">
            {adminCopy.formTitle}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#567068]">
            {adminCopy.formDescription}
          </p>

          {status === 'created' ? (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
              {adminCopy.statusCreated}
            </div>
          ) : null}

          {error ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
              {error}
            </div>
          ) : null}

          <form action={createProductAction} className="mt-8 space-y-6">
            <input type="hidden" name="locale" value={locale} />

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-[#0b3e31]">
                {adminCopy.categoryLabel}
              </span>
              <select
                name="categoryId"
                required
                className="rounded-2xl border border-[#0b5a45]/15 bg-[#f8f7f2] px-4 py-3 text-[#0b3e31] outline-none transition focus:border-[#0b5a45]">
                <option value="">
                  {locale === 'en' ? 'Select category' : 'Выберите категорию'}
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-[#0b3e31]">
                {adminCopy.nameLabel}
              </span>
              <input
                name="name"
                type="text"
                required
                placeholder={
                  locale === 'en' ? 'For example, Med-88' : 'Например, Медь-88'
                }
                className="rounded-2xl border border-[#0b5a45]/15 bg-[#f8f7f2] px-4 py-3 text-[#0b3e31] outline-none transition placeholder:text-[#7e9088] focus:border-[#0b5a45]"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-[#0b3e31]">
                {adminCopy.imageLabel}
              </span>
              <input
                name="image"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                required
                className="rounded-2xl border border-dashed border-[#0b5a45]/20 bg-[#f8f7f2] px-4 py-3 text-sm text-[#0b3e31] file:mr-4 file:rounded-full file:border-0 file:bg-[#0b5a45] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
              />
              <span className="text-xs leading-5 text-[#6a7f76]">
                {adminCopy.imageHint}
              </span>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-[#0b3e31]">
                {adminCopy.descriptionLabel}{' '}
                <span className="text-[#7e9088]">
                  ({adminCopy.optionalLabel})
                </span>
              </span>
              <textarea
                name="description"
                rows={4}
                className="rounded-2xl border border-[#0b5a45]/15 bg-[#f8f7f2] px-4 py-3 text-[#0b3e31] outline-none transition placeholder:text-[#7e9088] focus:border-[#0b5a45]"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-[#0b3e31]">
                {adminCopy.advantagesLabel}{' '}
                <span className="text-[#7e9088]">
                  ({adminCopy.optionalLabel})
                </span>
              </span>
              <textarea
                name="advantages"
                rows={4}
                placeholder={
                  locale === 'en'
                    ? 'One per line or separated by commas'
                    : 'По одному в строке или через запятую'
                }
                className="rounded-2xl border border-[#0b5a45]/15 bg-[#f8f7f2] px-4 py-3 text-[#0b3e31] outline-none transition placeholder:text-[#7e9088] focus:border-[#0b5a45]"
              />
            </label>

            <button
              type="submit"
              className="inline-flex items-center rounded-full bg-[#0b5a45] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#094635]">
              {adminCopy.submitLabel}
            </button>
          </form>
        </div>

        <aside className="rounded-[2rem] border border-[#0b5a45]/10 bg-[#f7f6f1] p-8 shadow-[0_24px_70px_-52px_rgba(11,62,49,0.95)]">
          <h2 className="text-3xl font-semibold text-[#0b3e31]">
            {adminCopy.existingTitle}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#567068]">
            {adminCopy.adminPathHint}
          </p>

          <div className="mt-8 space-y-5">
            {categories.map((category) => {
              const categoryProducts = products.filter(
                (product) => product.categoryId === category.id,
              );

              return (
                <div
                  key={category.id}
                  className="rounded-[1.5rem] border border-[#0b5a45]/10 bg-white p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-[#0b3e31]">
                        {category.name}
                      </h3>
                      <p className="mt-2 text-sm text-[#6a7f76]">
                        {formatProductCount(categoryProducts.length, locale)}
                      </p>
                    </div>

                    <Link
                      href={`/catalog/${category.id}`}
                      className="text-sm font-medium text-[#0b5a45] underline-offset-4 transition hover:underline">
                      {catalogCopy.openCategory}
                    </Link>
                  </div>

                  {categoryProducts.length === 0 ? (
                    <p className="mt-4 text-sm text-[#6a7f76]">
                      {adminCopy.emptyState}
                    </p>
                  ) : (
                    <div className="mt-5 space-y-3">
                      {categoryProducts.map((product) => {
                        const imageSrc = resolveMediaUrl(product.imageUrl);

                        return (
                          <div
                            key={product.id}
                            className="flex items-center gap-4 rounded-[1.25rem] bg-[#f8f7f2] p-3">
                            <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-2xl bg-white">
                              <MediaImage
                                src={imageSrc}
                                alt={product.name}
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
                                {product.name}
                              </p>
                              <p className="mt-1 truncate text-xs text-[#6a7f76]">
                                {adminCopy.imagePathLabel}: {product.imageUrl}
                              </p>
                            </div>
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
