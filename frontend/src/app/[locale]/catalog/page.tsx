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
import Image from 'next/image';

const layoutVariants = ['md:col-span-2', '', 'md:col-span-2', ''] as const;

export default async function CatalogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const copy = getCatalogCopy(locale);
  const [categories, products] = await Promise.all([getCategories(locale), getProducts(undefined, locale)]);

  return (
    <section>
      <div className="relative flex flex-col items-start px-90 justify-center overflow-hidden px-6 py-14 pt-60 text-center">
        <Image src="/catalog-head.jpeg" alt="" fill className="object-cover -z-10" />
        <div className="absolute inset-0 bg-black/50 -z-10" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-30 bg-gradient-to-b from-black/60 via-black/40 to-transparent" />
        <div className="relative z-10">
          <h1
            className="font-bold text-white mb-4"
            style={{
              fontSize: 55,
            }}>
            {copy.title}
          </h1>
          <p
            className="text-base text-xl text-start
           text-white/70  mb-2">
            {copy.subtitle}
          </p>
        </div>
      </div>

      {categories.length === 0 ? (
        <section className=" px-90 rounded-[2rem] border border-dashed border-[#0b5a45]/25 bg-[#f7f6f1] px-8 py-16 text-center text-[#48665c]">
          {copy.emptyCategories}
        </section>
      ) : (
        <section className="grid px-90 mt-20 mb-20 auto-rows-[240px] gap-5 md:grid-cols-3">
          {categories.map((category, index) => {
            const categoryProducts = products.filter(
              (product) => product.categoryId === category.id,
            );
            const productCount = getCategoryProductCount(category, categoryProducts);
            const imageSrc = resolveMediaUrl(category.imageUrl);
            const layoutClassName = layoutVariants[index] ?? 'md:col-span-1 md:row-span-1';

            return (
              <Link
                key={category.id}
                href={getCategoryHref(category)}
                className={`group relative overflow-hidden bg-[#e7efe9] shadow-[0_24px_60px_-40px_rgba(11,62,49,0.9)] ${layoutClassName}`}>
                <div className="absolute inset-0">
                  <MediaImage
                    src={imageSrc}
                    alt={category.name}
                    fill
                    priority={index === 0}
                    sizes="(max-width: 768px) 100vw, 33vw"
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
                  <h2 className="max-w-xl text-2xl font-semibold leading-tight md:text-3xl">
                    {category.name}
                  </h2>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="text-base text-white/82">
                      {formatProductCount(productCount, locale)}
                    </span>
                    <span className="rounded-full border border-white/25 bg-white/12 px-4 py-2 text-sm font-medium backdrop-blur-sm">
                      {copy.openCategory}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </section>
  );
}
