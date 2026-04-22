import MediaImage from '@/components/catalog/MediaImage';
import { Link } from '@/i18n/routing';
import { ApiError, getCategory, getProducts } from '@/lib/api';
import { formatProductCount, getCatalogCopy, parseEntityId } from '@/lib/catalog';
import { resolveMediaUrl } from '@/lib/media';
import { notFound } from 'next/navigation';
import { FiInfo } from 'react-icons/fi';

async function getCategoryPageData(categoryId: number) {
  try {
    return await Promise.all([getCategory(categoryId), getProducts(categoryId)]);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }

    throw error;
  }
}

export default async function CategoryProductsPage({
  params,
}: {
  params: Promise<{ locale: string; categoryId: string }>;
}) {
  const { locale, categoryId: rawCategoryId } = await params;
  const categoryId = parseEntityId(rawCategoryId);

  if (!categoryId) {
    notFound();
  }

  const copy = getCatalogCopy(locale);
  const [category, products] = await getCategoryPageData(categoryId);
  const categoryImage = resolveMediaUrl(category.imageUrl);

  return (
    <main>
      <div className="relative flex flex-col items-start px-90 justify-center overflow-hidden px-6 py-14 pt-60 text-center">
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

        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(7,35,28,0.88),rgba(7,35,28,0.48),rgba(7,35,28,0.7))]" />

        <div className="relative flex max-w-4xl flex-col items-start">
          <h1
            className="mb-4 font-bold text-start text-white leading-15"
            style={{
              fontSize: 50,
            }}>
            {category.name}
          </h1>
          <p className="mb-2 max-w-5xl text-base text-start text-xl text-white/70">
            {category.description}
          </p>
          <p className="mb-4 text-base font-medium text-white/82">
            {formatProductCount(products.length, locale)}
          </p>
        </div>
      </div>

      <section className="mx-auto flex w-full max-w-7xl flex-col px-6 py-12 md:px-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/catalog"
            className="inline-flex items-center rounded-full border border-[#0b5a45]/18 px-5 py-3 text-sm font-medium text-[#0b5a45] transition hover:border-[#0b5a45] hover:bg-[#0b5a45] hover:text-white">
            {copy.allCategories}
          </Link>
          <span className="text-sm uppercase tracking-[0.22em] text-[#6f857d]">
            {formatProductCount(products.length, locale)}
          </span>
        </div>

        {products.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-[#0b5a45]/25 bg-[#f7f6f1] px-8 py-16 text-center text-[#48665c]">
            {copy.emptyProducts}
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => {
              const productImage = resolveMediaUrl(product.imageUrl);

              return (
                <Link
                  key={product.id}
                  href={`/catalog/${category.id}/${product.id}`}
                  className="group flex h-full flex-col overflow-hidden bg-white transition duration-300  hover:shadow-[0_0px_20px_0px_rgba(11,62,49,0.2)]">
                  <div className="relative aspect-[4/5] bg-white">
                    <MediaImage
                      src={productImage}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      className="object-contain p-10 pb-0"
                      emptyState={
                        <div className="flex h-full w-full items-center justify-center px-8 text-center text-sm leading-6 text-[#6d6d63]">
                          {copy.productPlaceholder}
                        </div>
                      }
                    />
                  </div>

                  <div className="relative flex flex-1 flex-col overflow-hidden">
                    <div className="px-6 pb-30 pt-5 text-center">
                      <h2 className="text-[1.50rem] font-medium tracking-[0.01em] text-[#0b0b0b]">
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
      </section>
    </main>
  );
}
