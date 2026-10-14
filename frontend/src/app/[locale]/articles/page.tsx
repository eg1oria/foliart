import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import HeroBreadcrumbs from '@/components/HeroBreadcrumbs';
import MediaImage from '@/components/catalog/MediaImage';
import { Link } from '@/i18n/routing';
import { getArticleHref, formatArticleDate } from '@/lib/articles';
import { getArticles } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/media';
import { buildBreadcrumbSchema, buildPageMetadata, stringifyJsonLd } from '@/lib/seo';
import { getSiteImage } from '@/lib/siteImagesServer';
import Image from 'next/image';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Articles' });

  return buildPageMetadata({
    locale,
    path: '/articles',
    title: t('title'),
    description: t('metaDescription'),
    image: (await getSiteImage('articles-hero')).src,
  });
}

export default async function ArticlesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const [t, tBreadcrumbs] = await Promise.all([
    getTranslations({ locale, namespace: 'Articles' }),
    getTranslations({ locale, namespace: 'Breadcrumbs' }),
  ]);
  const hero = await getSiteImage('articles-hero');
  const articles = await getArticles(locale);
  const breadcrumbSchema = buildBreadcrumbSchema(locale, [
    { name: tBreadcrumbs('home'), path: '/' },
    { name: tBreadcrumbs('articles'), path: '/articles' },
  ]);

  return (
    <main className="pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: stringifyJsonLd(breadcrumbSchema) }}
      />
      <section className="catalog-header relative flex flex-col justify-center overflow-hidden px-6 pb-16 pt-30 md:pt-60">
        <Image
          src={hero.src}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 to-transparent" />

        <div className="relative z-10 w-full">
          <div className="mb-3 md:mb-5">
            <HeroBreadcrumbs
              locale={locale}
              items={[{ label: tBreadcrumbs('articles'), href: '/articles' }]}
            />
          </div>
          <h1 className="max-w-4xl text-3xl font-bold text-white md:text-5xl">{t('title')}</h1>
        </div>
      </section>

      <section className="catalog-header py-10">
        {articles.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-[#0b5a45]/20 bg-[#f7f6f1] px-8 py-16 text-center text-base text-[#5f726b]">
            {t('emptyState')}
          </div>
        ) : (
          <div className="grid items-stretch gap-2  md:gap-x-8 md:gap-y-4 md:grid-cols-2 xl:grid-cols-4">
            {articles.map((article) => {
              const imageSrc = resolveMediaUrl(article.imageUrl);

              return (
                <div key={article.id} className="article-card-wrapper h-full">
                  <Link href={getArticleHref(article)} className="group block h-full">
                    <article className="article-card h-full w-full p-4 transition-all duration-300 ease-in-out">
                      <div className="relative aspect-[16/9] overflow-hidden bg-[#edf2ee]">
                        <MediaImage
                          src={imageSrc}
                          alt={article.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
                          className="object-cover"
                          emptyState={
                            <div className="h-full w-full bg-[linear-gradient(135deg,#dfe9df,#b1c9b3,#6d8f70)]" />
                          }
                        />
                      </div>

                      <div className="article-card-content pt-8">
                        <h2 className="article-card-title text-[1.20rem] font-semibold text-[#10283d] transition group-hover:text-[#0b5a45]">
                          {article.title}
                        </h2>
                        <p className="mt-4 text-base text-[#9a958f]">
                          {formatArticleDate(article.publishedAt, locale)}
                        </p>
                        <p className="article-card-excerpt mt-4 text-[0.875rem] leading-6 text-[#53646b] line-clamp-4 transition-all duration-300">
                          {article.excerpt}
                        </p>
                      </div>
                    </article>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
