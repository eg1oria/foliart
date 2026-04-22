import MediaImage from '@/components/catalog/MediaImage';
import { Link } from '@/i18n/routing';
import { ApiError, getCategory, getProduct } from '@/lib/api';
import { getCatalogCopy, parseAdvantages, parseEntityId } from '@/lib/catalog';
import { resolveMediaUrl } from '@/lib/media';
import { notFound } from 'next/navigation';

async function loadProduct(productId: number) {
  try {
    return await getProduct(productId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }

    throw error;
  }
}

async function loadCategory(categoryId: number) {
  try {
    return await getCategory(categoryId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }

    throw error;
  }
}

export default async function ProductDetailsPage({
  params,
}: {
  params: Promise<{ locale: string; categoryId: string; productId: string }>;
}) {
  const { locale, categoryId: rawCategoryId, productId: rawProductId } = await params;
  const categoryId = parseEntityId(rawCategoryId);
  const productId = parseEntityId(rawProductId);

  if (!categoryId || !productId) {
    notFound();
  }

  const copy = getCatalogCopy(locale);
  const product = await loadProduct(productId);

  if (product.categoryId !== categoryId) {
    notFound();
  }

  const category = await loadCategory(categoryId);
  const categoryImage = resolveMediaUrl(category.imageUrl);
  const productImage = resolveMediaUrl(product.imageUrl);
  const advantages = parseAdvantages(product.advantages);

  return (
    <main className="flex-1 pb-20">
      <section className="relative overflow-hidden pb-16 pt-36">
        <div className="absolute inset-0">
          <MediaImage
            src={categoryImage}
            alt={category.name}
            fill
            priority
            sizes="100vw"
            className="object-cover"
            emptyState={
              <div className="h-full w-full bg-[linear-gradient(130deg,#dbe6d8,#7da97f,#0b5a45)]" />
            }
          />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(7,35,28,0.9),rgba(7,35,28,0.55),rgba(255,255,255,0))]" />

        <div className="relative mx-auto max-w-7xl px-6 md:px-8">
          <div className="mb-10 flex flex-wrap items-center gap-3 text-sm text-white/72">
            <Link href="/catalog" className="transition hover:text-white">
              {copy.allCategories}
            </Link>
            <span>/</span>
            <Link href={`/catalog/${category.id}`} className="transition hover:text-white">
              {category.name}
            </Link>
            <span>/</span>
            <span className="text-white">{product.name}</span>
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
            <div className="rounded-[2rem] bg-white/92 p-6 shadow-[0_30px_90px_-50px_rgba(0,0,0,0.95)] backdrop-blur-sm md:p-8">
              <div className="relative mx-auto aspect-[4/5] max-w-[420px]">
                <MediaImage
                  src={productImage}
                  alt={product.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="object-contain p-4"
                  emptyState={
                    <div className="flex h-full w-full items-center justify-center rounded-[1.5rem] bg-[#f4f0e7] px-10 text-center text-sm leading-6 text-[#6d6d63]">
                      {copy.productPlaceholder}
                    </div>
                  }
                />
              </div>
            </div>

            <div className="rounded-[2rem] bg-white/92 p-8 shadow-[0_30px_90px_-50px_rgba(0,0,0,0.95)] backdrop-blur-sm md:p-10">
              <p className="mb-4 text-sm font-medium uppercase tracking-[0.28em] text-[#0b5a45]/70">
                {category.name}
              </p>
              <h1 className="mb-6 text-4xl font-semibold text-[#0b3e31] md:text-5xl">
                {product.name}
              </h1>
              <p className="text-base leading-8 text-[#425e56]">
                {product.description || copy.detailsFallback}
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href={`/catalog/${category.id}`}
                  className="inline-flex items-center rounded-full bg-[#0b5a45] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#094635]">
                  {copy.backToCategory}
                </Link>
                <Link
                  href="/catalog"
                  className="inline-flex items-center rounded-full border border-[#0b5a45]/18 px-6 py-3 text-sm font-medium text-[#0b5a45] transition hover:border-[#0b5a45] hover:bg-[#0b5a45] hover:text-white">
                  {copy.allCategories}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-10 px-6 py-12 md:px-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <article className="rounded-[2rem] border border-[#0b5a45]/10 bg-white p-8 shadow-[0_24px_70px_-52px_rgba(11,62,49,0.95)] md:p-10">
          <h2 className="mb-5 text-3xl font-semibold text-[#0b3e31]">{copy.descriptionTitle}</h2>
          <p className="text-base leading-8 text-[#425e56]">
            {product.description || copy.detailsFallback}
          </p>
        </article>

        <aside className="rounded-[2rem] border border-[#0b5a45]/10 bg-[#f7f6f1] p-8 shadow-[0_24px_70px_-52px_rgba(11,62,49,0.95)] md:p-10">
          <h2 className="mb-5 text-3xl font-semibold text-[#0b3e31]">{copy.advantagesTitle}</h2>

          {advantages.length === 0 ? (
            <p className="text-base leading-8 text-[#567068]">{copy.advantagesEmpty}</p>
          ) : (
            <ul className="space-y-4">
              {advantages.map((advantage, index) => (
                <li
                  key={`${product.id}-${index}`}
                  className="rounded-[1.3rem] bg-white px-5 py-4 text-base leading-7 text-[#425e56]">
                  {advantage}
                </li>
              ))}
            </ul>
          )}
        </aside>
      </section>
    </main>
  );
}
