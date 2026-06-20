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
    title:
      locale === 'ru'
        ? 'Каталог удобрений'
        : locale === 'fr'
          ? 'Catalogue des engrais'
          : locale === 'es'
            ? 'Catálogo de fertilizantes'
            : 'Fertilizer catalog',
    description: copy.subtitle,
    image: '/catalog-head.webp',
  });
}

export default async function CatalogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const copy = getCatalogCopy(locale);
  const categoryCta =
    locale === 'ru'
      ? 'Посмотреть каталог'
      : locale === 'fr'
        ? 'Voir le catalogue'
        : locale === 'es'
          ? 'Ver catálogo'
          : 'View catalog';
  const [categories, products] = await Promise.all([
    getCategories(locale),
    getProducts(undefined, locale),
  ]);

  return (
    <main>
      <div className="catalog-header relative flex flex-col items-start justify-center overflow-hidden px-6 py-14 pt-30 md:pt-60 text-center">
        <Image
          src="/catalog-head.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover -z-10"
        />
        <div className="absolute inset-0 bg-black/50 -z-10" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-30 bg-gradient-to-b from-black/60 via-black/40 to-transparent" />
        <div className="relative z-10">
          <h1 className="font-bold text-3xl md:text-5xl text-white mb-4 text-start">
            {copy.title}
          </h1>
          <p className="mb-2 text-start text-lg text-white/85 md:text-xl">{copy.subtitle}</p>
        </div>
      </div>

      {categories.length === 0 ? (
        <section className="border border-dashed border-[#0b5a45]/25 bg-[#f7f6f1] px-8 py-16 text-center text-[#48665c]">
          {copy.emptyCategories}
        </section>
      ) : (
        <section className="catalog-grid mt-12 mb-16 grid auto-rows-[220px] grid-cols-1 gap-2.5 md:mt-16 md:mb-20 md:auto-rows-[250px] min-[1000px]:mt-20 min-[900px]:auto-rows-[250px] min-[900px]:grid-cols-4">
          {categories.map((category, index) => {
            const categoryProducts = products.filter(
              (product) => product.categoryId === category.id,
            );
            const productCount = getCategoryProductCount(category, categoryProducts);
            const imageSrc = resolveMediaUrl(category.imageUrl);
            const isWideCard = index === 0 || index === 3;
            const desktopPlacementClassName =
              index === 0
                ? 'min-[900px]:col-span-2 min-[900px]:col-start-1'
                : index === 3
                  ? 'min-[900px]:col-span-2 min-[900px]:col-start-1'
                  : '';
            const cardClassName = [
              'group relative overflow-hidden bg-[#e7efe9] outline-none focus-visible:ring-2 focus-visible:ring-[#00664f] focus-visible:ring-offset-4',
              desktopPlacementClassName,
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <Link
                key={category.id}
                href={getCategoryHref(category)}
                aria-label={`${category.name}: ${categoryCta}`}
                className={cardClassName}
              >
                <div className="absolute inset-0">
                  <MediaImage
                    src={imageSrc}
                    alt={category.name}
                    fill
                    priority={index === 0}
                    sizes={
                      isWideCard
                        ? '(max-width: 999px) 100vw, 50vw'
                        : '(max-width: 999px) 100vw, 25vw'
                    }
                    className="object-cover transition duration-700 ease-out group-hover:scale-[1.04] group-focus-visible:scale-[1.04]"
                    emptyState={
                      <div className="flex h-full w-full items-end bg-[radial-gradient(circle_at_top,_rgba(164,205,165,0.95),_rgba(11,90,69,1))] p-8" />
                    }
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/22 to-transparent transition duration-500 group-hover:from-black/84 group-hover:via-black/38 group-focus-visible:from-black/84 group-focus-visible:via-black/38" />
                <div className="absolute inset-x-0 bottom-0 z-10 p-6 text-white md:p-7">
                  <div className="max-w-[34rem] transition-transform duration-500 ease-out group-hover:-translate-y-24 group-focus-visible:-translate-y-24 min-[1000px]:group-hover:-translate-y-[7.5rem] min-[1000px]:group-focus-visible:-translate-y-[7.5rem]">
                    <h2 className="text-xl font-bold leading-tight md:text-2xl">{category.name}</h2>
                    <span className="mt-1.5 block text-base font-medium text-white">
                      {formatProductCount(productCount, locale)}
                    </span>
                  </div>
                  <span className="absolute bottom-6 left-6 inline-flex translate-y-[calc(100%+1.5rem)] items-center justify-center rounded-full bg-[#074031] px-6 py-3.5 text-sm text-white opacity-0 shadow-[0_16px_28px_-18px_rgba(0,0,0,0.85)] transition-all duration-500 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 md:bottom-7 md:left-7 md:px-7">
                    {categoryCta}
                  </span>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </main>
  );
}
