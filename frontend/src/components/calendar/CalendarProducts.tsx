import { FiArrowUpRight } from 'react-icons/fi';

import MediaImage from '@/components/catalog/MediaImage';
import { Link } from '@/i18n/routing';
import { resolveMediaUrl } from '@/lib/media';

export type CalendarProductItem = {
  id: number;
  href: string;
  name: string;
  categoryName: string;
  imageUrl: string;
};

export default function CalendarProducts({
  catalogLabel,
  products,
  title,
}: {
  catalogLabel: string;
  products: CalendarProductItem[];
  title: string;
}) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section className="catalog-header py-12 md:py-20">
      <div className="flex items-baseline justify-between gap-6 border-b border-[#0b5a45]/15 pb-4">
        <h2 className="text-2xl text-[#0b3e31] md:text-3xl">{title}</h2>
        <Link
          href="/catalog"
          className="inline-flex shrink-0 items-center gap-1 text-sm text-[#0b5a45] transition hover:text-[#013a2e]">
          {catalogLabel}
          <FiArrowUpRight aria-hidden="true" />
        </Link>
      </div>

      <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 min-[551px]:grid-cols-3 md:gap-x-6 lg:grid-cols-4 xl:grid-cols-5">
        {products.map((product) => (
          <li key={product.id}>
            <Link href={product.href} className="group block">
              <div className="relative aspect-square overflow-hidden rounded-2xl border border-[#0b5a45]/10 bg-white transition duration-300 group-hover:border-[#0b5a45]/35">
                {/* The product shots carry a wide transparent margin of their own. */}
                <MediaImage
                  src={resolveMediaUrl(product.imageUrl)}
                  alt={product.name}
                  fill
                  sizes="(max-width: 550px) 50vw, (max-width: 1023px) 33vw, 20vw"
                  className="scale-110 object-contain transition duration-300 group-hover:scale-[1.16]"
                />
              </div>
              <h3 className="mt-4 text-base leading-snug text-[#10283d] transition group-hover:text-[#0b5a45] md:text-lg">
                {product.name}
              </h3>
              <p className="mt-1 text-xs leading-5 text-[#6a7f76]">{product.categoryName}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
