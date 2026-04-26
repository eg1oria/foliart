import type { Metadata } from 'next';
import MediaImage from '@/components/catalog/MediaImage';
import { Link } from '@/i18n/routing';
import { getCategories, getProducts } from '@/lib/api';
import {
  formatProductCount,
  getCatalogCopy,
  getCategoryHref,
  getCategoryProductCount,
} from '@/lib/catalog';
import { resolveMediaUrl } from '@/lib/media';
import { buildPageMetadata } from '@/lib/seo';
import Image from 'next/image';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const copy = getCatalogCopy(locale);

  return buildPageMetadata({
    locale,
    path: '/catalog',
    title: locale === 'en' ? 'Fertilizer catalog' : 'Каталог удобрений',
    description: copy.subtitle,
    image: '/catalog-head.jpeg',
  });
}

export default async function CatalogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const copy = getCatalogCopy(locale);
  const [categories, products] = await Promise.all([
    getCategories(locale),
    getProducts(undefined, locale),
  ]);

  return (
    <main>
      <div className="catalog-header relative flex flex-col items-start justify-center overflow-hidden px-6 py-14 pt-30 md:pt-60 text-center">
        <Image src="/catalog-head.jpeg" alt="" fill sizes="100vw" className="object-cover -z-10" />
        <div className="absolute inset-0 bg-black/50 -z-10" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-30 bg-gradient-to-b from-black/60 via-black/40 to-transparent" />
        <div className="relative z-10">
          <h1 className="font-bold text-3xl md:text-5xl text-white mb-4 text-start">
            {copy.title}
          </h1>
          <p className="text-base text-lg md:text-xl text-start text-white/85 mb-2">
            {copy.subtitle}
          </p>
        </div>
      </div>

      {categories.length === 0 ? (
        <section className="border border-dashed border-[#0b5a45]/25 bg-[#f7f6f1] px-8 py-16 text-center text-[#48665c]">
          {copy.emptyCategories}
        </section>
      ) : (
        <section className="catalog-grid grid mt-20 mb-20 auto-rows-[240px] gap-5 grid-cols-1 md:grid-cols-2 min-[1100px]:grid-cols-3">
          {categories.map((category, index) => {
            const categoryProducts = products.filter(
              (product) => product.categoryId === category.id,
            );
            const productCount = getCategoryProductCount(category, categoryProducts);
            const imageSrc = resolveMediaUrl(category.imageUrl);

            return (
              <Link
                key={category.id}
                href={getCategoryHref(category)}
                className="group relative overflow-hidden bg-[#e7efe9] shadow-[0_24px_60px_-40px_rgba(11,62,49,0.9)]">
                <div className="absolute inset-0">
                  <MediaImage
                    src={imageSrc}
                    alt={category.name}
                    fill
                    priority={index === 0}
                    sizes="(max-width: 768px) 100vw, (max-width: 1100px) 50vw, 33vw"
                    className="object-cover transition duration-500 group-hover:scale-[1.04]"
                    emptyState={
                      <div className="flex h-full w-full items-end bg-[radial-gradient(circle_at_top,_rgba(164,205,165,0.95),_rgba(11,90,69,1))] p-8" />
                    }
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent transition duration-300 group-hover:from-black/78" />
                <div className="relative flex h-full flex-col justify-end p-6 text-white md:p-7">
                  <p className="mb-2 text-xs font-medium uppercase tracking-[0.24em] text-white/70">
                    {copy.categoryBadge}
                  </p>
                  <h2 className="max-w-xl text-xl font-semibold leading-tight md:text-2xl min-[900px]:text-3xl">
                    {' '}
                    {category.name}
                  </h2>
                  <div className="mt-4 flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
                    {' '}
                    <span className="text-base text-white/82">
                      {formatProductCount(productCount, locale)}
                    </span>
                    <span className="bg-[#074031] block w-full md:w-auto text-center rounded-full px-4 py-2 text-sm font-medium">
                      {' '}
                      {copy.openCategory}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </main>
  );
}
