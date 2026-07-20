import type { Metadata } from 'next';
import ContactModalTrigger from '@/components/ContactModalTrigger';
import HeroBreadcrumbs, { getBreadcrumbCopy } from '@/components/HeroBreadcrumbs';
import CompositionList from '@/components/catalog/CompositionList';
import MediaImage from '@/components/catalog/MediaImage';
import ProductImageLightbox from '@/components/catalog/ProductImageLightbox';
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
  parseAdvantageItems,
  parseApplication,
  parseComposition,
} from '@/lib/catalog';
import { resolveMediaUrl } from '@/lib/media';
import { renderRichDescription } from '@/lib/renderRichDescription';
import { richDescriptionToPlainText } from '@/lib/richDescription';
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
      description:
        richDescriptionToPlainText(product.description) ||
        richDescriptionToPlainText(category.description) ||
        copy.detailsFallback,
      image: resolveMediaUrl(product.imageUrl),
    });
  } catch {
    return buildPageMetadata({
      locale,
      path: '/catalog',
      title:
        locale === 'ru'
          ? 'Каталог удобрений'
          : locale === 'es'
            ? 'Catálogo de fertilizantes'
            : 'Fertilizer catalog',
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
  const breadcrumbCopy = getBreadcrumbCopy(locale);
  const { category, product } = await getProductPageData(rawCategoryId, rawProductId, locale);

  if (rawCategoryId !== getCategorySlug(category) || rawProductId !== getProductSlug(product)) {
    redirect(`/${locale}${getProductHref(category, product)}`);
  }

  const categoryImage = resolveMediaUrl(category.imageUrl);
  const productImage = resolveMediaUrl(product.imageUrl);
  const certificateImage = resolveMediaUrl('images/sertificate.webp');
  const certificateLabel =
    locale === 'ru'
      ? 'Сертификат соответствия'
      : locale === 'fr'
        ? 'Certificat de conformité'
        : locale === 'es'
          ? 'Certificado de conformidad'
          : 'Certificate of conformity';
  const compositionItems = parseComposition(product.composition);
  const advantages = parseAdvantageItems(product.advantages);
  const applicationItems = parseApplication(product.application);
  const overviewSource = product.description || category.description || copy.detailsFallback;
  const overviewHtml = renderRichDescription(overviewSource);
  const overviewText = richDescriptionToPlainText(overviewHtml);
  const pageCopy =
    locale === 'ru'
      ? {
          sectionsLabel: 'Разделы товара',
          compositionTitle: 'Состав',
          compositionEmpty:
            'Подробная информация о составе будет добавлена в карточку товара позже.',
          applicationTitle: 'Регламент применения',
          applicationEmpty: 'Рекомендации по срокам, нормам и фазам внесения добавим позже.',
          specialistTitle: 'Помощь специалиста',
          advantagesLabel: `Преимущества ${product.name}`,
        }
      : locale === 'fr'
        ? {
            sectionsLabel: 'Sections du produit',
            compositionTitle: 'Composition',
            compositionEmpty:
              'Les informations détaillées sur la composition seront ajoutées ultérieurement.',
            applicationTitle: "Guide d'application",
            applicationEmpty:
              'Les recommandations sur les délais, doses et stades de croissance seront ajoutées ultérieurement.',
            specialistTitle: "Aide d'un spécialiste",
            advantagesLabel: `Avantages de ${product.name}`,
          }
        : locale === 'es'
          ? {
              sectionsLabel: 'Secciones del producto',
              compositionTitle: 'Composición',
              compositionEmpty:
                'La información detallada sobre la composición se añadirá a esta ficha de producto más adelante.',
              applicationTitle: 'Guía de aplicación',
              applicationEmpty:
                'Las recomendaciones sobre plazos, dosis y fases de crecimiento se añadirán más adelante.',
              specialistTitle: 'Ayuda de un especialista',
              advantagesLabel: `Ventajas de ${product.name}`,
            }
          : {
              sectionsLabel: 'Product sections',
              compositionTitle: 'Composition',
              compositionEmpty:
                'Detailed composition information will be added to this product card later.',
              applicationTitle: 'Application guide',
              applicationEmpty:
                'Recommendations on timing, dosage, and growth stage will be added later.',
              specialistTitle: 'Specialist help',
              advantagesLabel: `Advantages of ${product.name}`,
            };
  const sectionLinks = [
    { id: 'description', label: copy.descriptionTitle },
    { id: 'composition', label: pageCopy.compositionTitle },
    ...(advantages.length > 0
      ? [{ id: 'advantages', label: pageCopy.advantagesLabel }]
      : []),
    { id: 'application', label: pageCopy.applicationTitle },
    { id: 'specialist', label: pageCopy.specialistTitle },
  ];
  const askQuestionLabel =
    locale === 'ru'
      ? 'Задать вопрос'
      : locale === 'fr'
        ? 'Poser une question'
        : locale === 'es'
          ? 'Hacer una pregunta'
          : 'Ask a question';
  const compatibilityNote =
    locale === 'ru'
      ? 'Препарат совместим с большинством удобрений и средств защиты. Недопустимо совместное использование в баковой смеси с препаратами меди и серы. Перед применением тест на совместимость обязателен.'
      : locale === 'fr'
        ? 'Le produit est compatible avec la plupart des engrais et produits phytosanitaires. Le mélange en cuve avec des produits à base de cuivre ou de soufre est interdit. Un test de compatibilité est requis avant utilisation.'
        : locale === 'es'
          ? 'El producto es compatible con la mayoría de fertilizantes y productos fitosanitarios. No está permitida la mezcla en cuba con productos a base de cobre o azufre. Es obligatorio realizar un test de compatibilidad antes del uso.'
          : 'The product is compatible with most fertilizers and crop protection products. Mixing with copper- and sulfur-based products in the same tank is not allowed. A compatibility test is required before use.';
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
    { name: breadcrumbCopy.home, path: '/' },
    { name: breadcrumbCopy.catalog, path: '/catalog' },
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
          sizes="100vw"
          className="object-cover"
          emptyState={
            <div className="h-full w-full bg-[linear-gradient(130deg,#dbe6d8,#7da97f,#0b5a45)]" />
          }
        />
        <div className="absolute inset-0 bg-black/45" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/55 to-transparent" />

        <div className="relative z-10 w-full">
          <div className="mb-3 md:mb-5">
            <HeroBreadcrumbs
              locale={locale}
              items={[
                { label: breadcrumbCopy.catalog, href: '/catalog' },
                { label: category.name, href: getCategoryHref(category) },
              ]}
            />
          </div>
          <h1 className="text-start text-3xl font-bold text-white md:text-[40px]">
            {product.name}
          </h1>
        </div>
      </div>

      <section className="site-gutter py-2 md:py-12">
        <div className="grid gap-6 gap-y-16 md:gap-x-20 lg:grid-cols-[230px_minmax(360px,1.1fr)_minmax(320px,1.1fr)]">
          {' '}
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
          <div className="order-1 relative flex min-h-[420px] items-start justify-center lg:order-2 lg:min-h-[520px]">
            <div className="absolute bottom-9 h-10 w-[58%] rounded-full bg-black/10 blur-2xl" />
            <div className="relative aspect-[4/5] w-full max-w-[430px]">
              <ProductImageLightbox
                src={productImage}
                alt={product.name}
                productName={product.name}
                locale={locale}
                sizes="(max-width: 1024px) 100vw, 34vw"
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
            <div
              className="rich-description text-base leading-5 text-[#243238]"
              dangerouslySetInnerHTML={{ __html: overviewHtml }}
            />
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
                  <CompositionList
                    items={compositionItems}
                    locale={locale}
                    productId={product.id}
                  />
                )}

                {certificateLink}
              </div>
            </article>

            {advantages.length > 0 && (
              <article
                id="advantages"
                className="scroll-mt-32 border-t border-[#e7eaec] pt-10">
                <h2 className="text-2xl text-[#0b3e31]">{pageCopy.advantagesLabel}</h2>

                <ul className="mt-8 space-y-1">
                  {advantages.map((advantage, index) => (
                    <li
                      key={`${product.id}-advantage-${index}`}
                      className="flex gap-3 text-lg leading-8 text-[#243238]">
                      {advantage.hasMarker && (
                        <span className="mt-3 h-1 w-1 shrink-0 rounded-full bg-[#0b5a45]" />
                      )}
                      <span className="text-sm">{advantage.text}</span>
                    </li>
                  ))}
                </ul>
              </article>
            )}

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
