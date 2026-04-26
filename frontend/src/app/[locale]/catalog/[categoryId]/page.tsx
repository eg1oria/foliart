import type { Metadata } from 'next';
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
import { buildBreadcrumbSchema, buildPageMetadata, stringifyJsonLd } from '@/lib/seo';
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; categoryId: string }>;
}): Promise<Metadata> {
  const { locale, categoryId: rawCategoryId } = await params;
  const copy = getCatalogCopy(locale);

  try {
    const { category } = await getCategoryPageData(rawCategoryId, locale);

    return buildPageMetadata({
      locale,
      path: getCategoryHref(category),
      title: category.name,
      description: category.description || copy.emptyProducts,
      image: resolveMediaUrl(category.imageUrl),
    });
  } catch {
    return buildPageMetadata({
      locale,
      path: '/catalog',
      title: locale === 'en' ? 'Fertilizer catalog' : 'Каталог удобрений',
      description: copy.subtitle,
      image: '/catalog-head.jpeg',
    });
  }
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
  const breadcrumbSchema = buildBreadcrumbSchema(locale, [
    { name: locale === 'en' ? 'Home' : 'Главная', path: '/' },
    { name: locale === 'en' ? 'Catalog' : 'Каталог', path: '/catalog' },
    { name: category.name, path: getCategoryHref(category) },
  ]);

  return (
    <main className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: stringifyJsonLd(breadcrumbSchema) }}
      />
      <div className="relative category-header flex flex-col items-start justify-center py-14 px-6 text-center overflow-hidden pt-30 md:pt-60">
        <MediaImage
          src={categoryImage}
          alt={category.name}
          fill
          sizes="100vw"
          className="object-cover"
          emptyState={
            <div className="h-full w-full bg-[radial-gradient(circle_at_top_left,_rgba(164,205,165,0.9),_rgba(11,90,69,1))]" />
          }
        />

        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(7,35,28,0.88),rgba(7,35,28,0.48),rgba(7,35,28,0.72))]" />

        <div className="relative z-10 max-w-3xl">
          <h1 className="mb-4 font-bold text-white text-start md:text-5xl text-3xl">
            {category.name}
          </h1>
          <p className="mb-2 text-sm text-white/90 text-start text-xl">{category.description}</p>
          <p className="mt-5 text-base font-medium text-start text-white/88">
            {formatProductCount(products.length, locale)}
          </p>
        </div>
      </div>

      <section className="category-header mx-auto w-full py-10">
        <div className="grid gap-5 min-[1000px]:grid-cols-[260px_minmax(0,1fr)] min-[1000px]:gap-16">
          <aside className="hidden min-[1000px]:sticky min-[1000px]:top-28 min-[1000px]:block min-[1000px]:self-start">
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
            <div className="grid grid-cols-2 gap-1 md:grid-cols-3">
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
                        sizes="(max-width: 767px) 50vw, 33vw"
                        className="object-contain md:p-0 p-4"
                        emptyState={
                          <div className="flex h-full w-full items-center justify-center px-8 text-center text-sm leading-6 text-[#6d6d63]">
                            {copy.productPlaceholder}
                          </div>
                        }
                      />
                    </div>

                    <div className="relative flex flex-1 flex-col overflow-hidden">
                      <div className="px-6 pb-6 pt-5 text-center min-[900px]:pb-30">
                        <h2 className="text-[1rem] md:text-[1.5rem] font-medium tracking-[0.01em] text-[#0b0b0b]">
                          {product.name}
                        </h2>
                      </div>

                      <div className="md:border-t flex flex-col items-center border-[#ece7da] md:bg-[#f8f5eb] px-6 py-5 min-[900px]:pointer-events-none min-[900px]:absolute min-[900px]:inset-x-0 min-[900px]:bottom-0 min-[900px]:translate-y-full min-[900px]:opacity-0 min-[900px]:transition min-[900px]:duration-300 min-[900px]:group-hover:translate-y-0 min-[900px]:group-hover:opacity-100">
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
