import type { Metadata } from 'next';
import ContactModalTrigger from '@/components/ContactModalTrigger';
import MediaImage from '@/components/catalog/MediaImage';
import SpecialistSection from '@/components/catalog/SpecialistSection';
import { Link } from '@/i18n/routing';
import { getCategories, getProducts } from '@/lib/api';
import {
  findCategoryByParam,
  findProductByParam,
  getCatalogCopy,
  getCategoryHref,
  getCategorySlug,
  getProductHref,
  getProductSlug,
  parseAdvantages,
  parseApplication,
  parseComposition,
} from '@/lib/catalog';
import { resolveMediaUrl } from '@/lib/media';
import {
  buildBreadcrumbSchema,
  buildPageMetadata,
  buildProductSchema,
  stringifyJsonLd,
} from '@/lib/seo';
import { notFound, redirect } from 'next/navigation';
import { FiChevronDown } from 'react-icons/fi';
import { GrDocumentText } from 'react-icons/gr';
import { TbArrowBackUp } from 'react-icons/tb';

async function getProductPageData(categoryParam: string, productParam: string, locale: string) {
  const categories = await getCategories(locale);
  const category = findCategoryByParam(categories, categoryParam);

  if (!category) {
    notFound();
  }

  const products = await getProducts(category.id, locale);
  const product = findProductByParam(products, productParam);

  if (!product) {
    notFound();
  }

  return { category, product };
}

function getTextBlocks(value: string): string[] {
  return value
    .split(/\r?\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; categoryId: string; productId: string }>;
}): Promise<Metadata> {
  const { locale, categoryId: rawCategoryId, productId: rawProductId } = await params;
  const copy = getCatalogCopy(locale);

  try {
    const { category, product } = await getProductPageData(rawCategoryId, rawProductId, locale);

    return buildPageMetadata({
      locale,
      path: getProductHref(category, product),
      title: product.name,
      description: product.description || category.description || copy.detailsFallback,
      image: resolveMediaUrl(product.imageUrl),
    });
  } catch {
    return buildPageMetadata({
      locale,
      path: '/catalog',
      title: locale === 'en' ? 'Fertilizer catalog' : 'Каталог удобрений',
      description: copy.subtitle,
      image: '/catalog-head.webp',
    });
  }
}

export default async function ProductDetailsPage({
  params,
}: {
  params: Promise<{ locale: string; categoryId: string; productId: string }>;
}) {
  const { locale, categoryId: rawCategoryId, productId: rawProductId } = await params;
  const copy = getCatalogCopy(locale);
  const { category, product } = await getProductPageData(rawCategoryId, rawProductId, locale);

  if (rawCategoryId !== getCategorySlug(category) || rawProductId !== getProductSlug(product)) {
    redirect(`/${locale}${getProductHref(category, product)}`);
  }

  const categoryImage = resolveMediaUrl(category.imageUrl);
  const productImage = resolveMediaUrl(product.imageUrl);
  const certificateImage = resolveMediaUrl('images/sertificate.webp');
  const certificateLabel =
    locale === 'en' ? 'Certificate of conformity' : 'Сертификат соответствия';
  const compositionItems = parseComposition(product.composition);
  const advantages = parseAdvantages(product.advantages);
  const applicationItems = parseApplication(product.application);
  const productText = product.description.trim();
  const categoryText = category.description.trim();
  const overviewText = productText || categoryText || copy.detailsFallback;
  const overviewBlocks = getTextBlocks(overviewText);
  const summaryBlocks = overviewBlocks.slice(0, 2);
  const pageCopy =
    locale === 'en'
      ? {
          sectionsLabel: 'Product sections',
          compositionTitle: 'Composition',
          compositionEmpty:
            'Detailed composition information will be added to this product card later.',
          applicationTitle: 'Application guide',
          applicationEmpty:
            'Recommendations on timing, dosage, and growth stage will be added later.',
          specialistTitle: 'Specialist help',
          advantagesLabel: `Advantages of ${product.name}`,
        }
      : {
          sectionsLabel: 'Разделы товара',
          compositionTitle: 'Состав',
          compositionEmpty:
            'Подробная информация о составе будет добавлена в карточку товара позже.',
          applicationTitle: 'Регламент применения',
          applicationEmpty: 'Рекомендации по срокам, нормам и фазам внесения добавим позже.',
          specialistTitle: 'Помощь специалиста',
          advantagesLabel: `Преимущества ${product.name}`,
        };
  const sectionLinks = [
    { id: 'description', label: copy.descriptionTitle },
    { id: 'composition', label: pageCopy.compositionTitle },
    { id: 'advantages', label: pageCopy.advantagesLabel },
    { id: 'application', label: pageCopy.applicationTitle },
    { id: 'specialist', label: pageCopy.specialistTitle },
  ];
  const askQuestionLabel = locale === 'en' ? 'Ask a question' : 'Задать вопрос';
  const compatibilityNote =
    locale === 'en'
      ? 'The product is compatible with most fertilizers and crop protection products. Mixing with copper- and sulfur-based products in the same tank is not allowed. A compatibility test is required before use.'
      : 'Препарат совместим с большинством удобрений и средств защиты. Недопустимо совместное использование в баковой смеси с препаратами меди и серы. Перед применением тест на совместимость обязателен.';
  const certificateLink = certificateImage ? (
    <a
      href={certificateImage}
      target="_blank"
      rel="noreferrer"
      className="group inline-flex w-fit items-center gap-4 self-start xl:pt-2">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-[#f45734] text-white shadow-[0_18px_30px_-22px_rgba(244,87,52,0.9)] transition group-hover:scale-[1.04]">
        <GrDocumentText className="text-[1.4rem]" />
      </span>
      <span className="text-[1rem] text-[#3b76f6] transition group-hover:text-[#0b5a45]">
        {certificateLabel}
      </span>
    </a>
  ) : null;
  const productPath = getProductHref(category, product);
  const breadcrumbSchema = buildBreadcrumbSchema(locale, [
    { name: locale === 'en' ? 'Home' : 'Главная', path: '/' },
    { name: locale === 'en' ? 'Catalog' : 'Каталог', path: '/catalog' },
    { name: category.name, path: getCategoryHref(category) },
    { name: product.name, path: productPath },
  ]);
  const productSchema = buildProductSchema({
    locale,
    id: product.id,
    name: product.name,
    description: overviewText,
    path: productPath,
    image: productImage,
    categoryName: category.name,
  });

  return (
    <main className="flex-1 bg-white pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: stringifyJsonLd(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: stringifyJsonLd(breadcrumbSchema) }}
      />
      <div className="catalog-header relative flex flex-col items-center justify-center py-14 text-center overflow-hidden pt-30 md:pt-60">
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
        <div className="absolute inset-0 bg-black/45" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/55 to-transparent" />

        <h1 className="relative z-10 text-[40px] font-bold text-white">{product.name}</h1>
      </div>

      <section className="px-6 py-2 md:py-12 xl:px-90">
        <div className="grid gap-6 md:gap-x-12 gap-y-16 lg:grid-cols-[230px_minmax(340px,1fr)_minmax(280px,360px)]">
          <aside className="hidden order-3 min-[1000px]:block lg:order-1 lg:row-span-2 lg:self-stretch">
            <div className="lg:h-full">
              <nav
                aria-label={pageCopy.sectionsLabel}
                className="pl-3 lg:sticky lg:top-32 lg:border-l-3 lg:border-[#d9dcdf]">
                <ul className="flex flex-col">
                  {sectionLinks.map((section) => (
                    <li key={section.id} className="border-b border-[#eceef0]">
                      <a
                        href={`#${section.id}`}
                        className="block py-4 text-[1rem] leading-snug text-[#4685d4] transition hover:text-[#0b5a45]">
                        {section.label}
                      </a>
                    </li>
                  ))}
                  <li className="pt-5">
                    <Link
                      href={getCategoryHref(category)}
                      className="inline-flex items-center gap-2 text-base text-[#8a8e91] transition hover:text-[#0b5a45]">
                      <TbArrowBackUp className="shrink-0" />
                      {copy.backToCategory}
                    </Link>
                  </li>
                </ul>
              </nav>
            </div>
          </aside>

          <div className="order-1 relative flex min-h-[420px] items-center justify-center lg:order-2 lg:min-h-[520px]">
            <div className="absolute bottom-9 h-10 w-[58%] rounded-full bg-black/10 blur-2xl" />
            <div className="relative aspect-[4/5] w-full max-w-[430px]">
              <MediaImage
                src={productImage}
                alt={product.name}
                fill
                sizes="(max-width: 1024px) 100vw, 34vw"
                className="object-contain drop-shadow-[0_28px_34px_rgba(0,0,0,0.12)]"
                emptyState={
                  <div className="flex h-full w-full items-center justify-center rounded-[1.75rem] bg-[#f4f0e7] px-10 text-center text-sm leading-6 text-[#6d6d63]">
                    {copy.productPlaceholder}
                  </div>
                }
              />
            </div>
          </div>

          <div
            id="description"
            className="order-2 min-[1000px]:max-w-full  scroll-mt-32 lg:order-3">
            <div className="space-y-4 text-sm leading-7 text-[#243238]">
              {summaryBlocks.map((block, index) => (
                <p key={`${product.id}-summary-${index}`}>{block}</p>
              ))}
            </div>
            <a
              href="#composition"
              className="mt-6 inline-flex items-center gap-2 text-sm text-[#3b76f6] transition hover:text-[#0b5a45]">
              <span>{copy.learnMore}</span>
              <FiChevronDown size={16} className="shrink-0" />
            </a>

            <div className="mt-10 flex flex-col items-start gap-8">
              <ContactModalTrigger
                modalType="question"
                className="w-full inline-flex min-h-[50px] items-center justify-center rounded-full bg-[#0b5a45] px-9 py-3 text-[1.05rem] font-medium text-white transition hover:bg-[#094635]">
                {askQuestionLabel}
              </ContactModalTrigger>

              <p className="text-[0.90rem] leading-6 text-[#a8a49b] italic">{compatibilityNote}</p>
            </div>
          </div>

          <div className="order-4 flex flex-col gap-14 lg:col-[2/4]">
            <article id="composition" className="scroll-mt-32 pt-10">
              <div className="flex items-center gap-5">
                <h2 className="shrink-0 text-2xl text-[#0b3e31]">{pageCopy.compositionTitle}</h2>
              </div>

              <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-start">
                {compositionItems.length === 0 ? (
                  <p className="max-w-3xl text-lg leading-8 text-[#55676d]">
                    {pageCopy.compositionEmpty}
                  </p>
                ) : (
                  <ul className="space-y-4">
                    {compositionItems.map((item, index) => (
                      <li
                        key={`${product.id}-composition-${index}`}
                        className="flex items-end gap-4 text-[1.05rem] leading-6 text-[#4b5563]">
                        <span className="shrink-0 max-w-[45%] break-words">{item.label}</span>
                        <span className="mb-[0.32rem] h-px min-w-4 flex-1 bg-[radial-gradient(circle,_#9ca3af_1px,_transparent_1.2px)] bg-[length:6px_1px] bg-repeat-x" />
                        <span className="shrink-0 font-semibold text-[#374151]">
                          {item.value || '-'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {certificateLink}
              </div>
            </article>

            <article id="advantages" className="scroll-mt-32 border-t border-[#e7eaec] pt-10">
              <h2 className="text-2xl text-[#0b3e31]">{pageCopy.advantagesLabel}</h2>

              {advantages.length === 0 ? (
                <p className="mt-6 max-w-3xl text-lg leading-8 text-[#55676d]">
                  {copy.advantagesEmpty}
                </p>
              ) : (
                <ul className="mt-8 space-y-1">
                  {advantages.map((advantage, index) => (
                    <li
                      key={`${product.id}-advantage-${index}`}
                      className="flex gap-3 text-lg leading-8 text-[#243238]">
                      {index !== 0 && (
                        <span className="mt-3 h-1 w-1 shrink-0 rounded-full bg-[#0b5a45]" />
                      )}
                      <span className="text-sm">{advantage}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article id="application" className="scroll-mt-32 border-t border-[#e7eaec] pt-10">
              <h2 className="text-2xl text-[#0b3e31]">{pageCopy.applicationTitle}</h2>

              {applicationItems.length === 0 ? (
                <p className="mt-6 max-w-3xl text-lg leading-8 text-[#55676d]">
                  {pageCopy.applicationEmpty}
                </p>
              ) : (
                <div className="mt-8 grid gap-6 md:grid-cols-2">
                  {applicationItems.map((item, index) => (
                    <article
                      key={`${product.id}-application-${index}`}
                      className="border-4 border border-[#edf1f4] bg-[#fbfcfd] px-8 py-9">
                      <h3 className="text-[1.15rem] font-medium leading-8 text-[#4685d4]">
                        {item.title}
                      </h3>
                      <p className="mt-7 whitespace-pre-line text-sm leading-8 text-[#243238]">
                        {item.description}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </article>

            <article id="specialist" className="scroll-mt-32 border-t border-[#e7eaec] pt-10">
              <SpecialistSection />
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
