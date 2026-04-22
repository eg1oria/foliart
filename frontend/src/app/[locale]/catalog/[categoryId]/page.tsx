import CategoryDropdown from '@/components/catalog/CategoryDropdown';
import MediaImage from '@/components/catalog/MediaImage';
import { Link } from '@/i18n/routing';
import { getCategories, getProducts } from '@/lib/api';
import {
  findCategoryByParam,
  formatProductCount,
  getCatalogCopy,
  getProductHref,
  getCategoryHref,
  getCategorySlug,
} from '@/lib/catalog';
import { resolveMediaUrl } from '@/lib/media';
import { notFound, redirect } from 'next/navigation';
import { FiInfo } from 'react-icons/fi';

async function getCategoryPageData(categoryParam: string, locale: string) {
  const [categories, allProducts] = await Promise.all([
    getCategories(locale),
    getProducts(undefined, locale),
  ]);
  const category = findCategoryByParam(categories, categoryParam);

  if (!category) {
    notFound();
  }

  const products = allProducts.filter((product) => product.categoryId === category.id);
  return { allProducts, categories, category, products };
}

export default async function CategoryProductsPage({
  params,
}: {
  params: Promise<{ locale: string; categoryId: string }>;
}) {
  const { locale, categoryId: rawCategoryId } = await params;
  const copy = getCatalogCopy(locale);
  const pageCopy =
    locale === 'en'
      ? {
          backLevel: 'Up one level',
          otherCategories: 'Other categories',
        }
      : {
          backLevel: 'На уровень выше',
          otherCategories: 'Другие категории',
        };
  const { allProducts, categories, category, products } = await getCategoryPageData(
    rawCategoryId,
    locale,
  );

  if (rawCategoryId !== getCategorySlug(category)) {
    redirect(`/${locale}${getCategoryHref(category)}`);
  }

  const categoryImage = resolveMediaUrl(category.imageUrl);
  const productCountByCategory = allProducts.reduce((accumulator, product) => {
    accumulator.set(product.categoryId, (accumulator.get(product.categoryId) ?? 0) + 1);
    return accumulator;
  }, new Map<number, number>());

  const categoryMenuItems = [category, ...categories.filter((item) => item.id !== category.id)].map(
    (item) => ({
      count: productCountByCategory.get(item.id) ?? item.productCount,
      href: getCategoryHref(item),
      id: item.id,
      isCurrent: item.id === category.id,
      name: item.name,
    }),
  );

  return (
    <main className="bg-white">
      <div className="relative flex flex-col items-start px-90 justify-center py-14 px-6 text-center overflow-hidden pt-60">
        <MediaImage
          src={categoryImage}
          alt={category.name}
          fill
          className="object-cover"
          emptyState={
            <div className="h-full w-full bg-[radial-gradient(circle_at_top_left,_rgba(164,205,165,0.9),_rgba(11,90,69,1))]" />
          }
        />

        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(7,35,28,0.88),rgba(7,35,28,0.48),rgba(7,35,28,0.72))]" />

        <div className="relative z-10 max-w-3xl">
          <h1 className="mb-4 font-bold text-white text-start" style={{ fontSize: 45 }}>
            {category.name}
          </h1>
          <p className="mb-2 text-sm text-white/90 text-start text-xl">{category.description}</p>
          <p className="mt-5 text-base font-medium text-start text-white/88">
            {formatProductCount(products.length, locale)}
          </p>
        </div>
      </div>

      <section className="mx-auto w-full  py-10 px-90">
        <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)] xl:gap-16">
          <aside className="xl:sticky xl:top-28 xl:self-start">
            <CategoryDropdown
              label={pageCopy.otherCategories}
              items={categoryMenuItems}
              backLabel={pageCopy.backLevel}
              backHref="/catalog"
            />
          </aside>

          {products.length === 0 ? (
            <div className="flex min-h-[360px] items-center justify-center rounded-[2rem] border border-dashed border-[#0b5a45]/20 bg-[#f7f6f1] px-8 py-16 text-center text-[#48665c]">
              {copy.emptyProducts}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-1 lg:grid-cols-3">
              {products.map((product) => {
                const productImage = resolveMediaUrl(product.imageUrl);

                return (
                  <Link
                    key={product.id}
                    href={getProductHref(category, product)}
                    className="group flex h-full flex-col bg-white transition duration-300 hover:shadow-[0_0px_20px_0px_rgba(11,62,49,0.2)]">
                    <div className="relative aspect-[4/5] bg-white">
                      <MediaImage
                        src={productImage}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        className="object-contain"
                        emptyState={
                          <div className="flex h-full w-full items-center justify-center px-8 text-center text-sm leading-6 text-[#6d6d63]">
                            {copy.productPlaceholder}
                          </div>
                        }
                      />
                    </div>

                    <div className="relative flex flex-1 flex-col overflow-hidden">
                      <div className="px-6 pb-30 pt-5 text-center">
                        <h2 className="text-[1.5rem] font-medium tracking-[0.01em] text-[#0b0b0b]">
                          {product.name}
                        </h2>
                      </div>

                      <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full border-t border-[#ece7da] bg-[#f8f5eb] px-6 py-5 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                        <span className="inline-flex items-center gap-2 text-base text-[#337ab7]">
                          <FiInfo size={14} className="shrink-0 text-[#0b3e31]" />
                          <span>{copy.learnMore}</span>
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
