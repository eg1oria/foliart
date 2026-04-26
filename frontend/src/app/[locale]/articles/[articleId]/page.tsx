import type { Metadata } from 'next';
import MediaImage from '@/components/catalog/MediaImage';
import { Link } from '@/i18n/routing';
import {
  findArticleByParam,
  formatArticleDate,
  getArticleHref,
  getArticleSlug,
  getArticlesCopy,
} from '@/lib/articles';
import { getArticles } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/media';
import {
  buildArticleSchema,
  buildBreadcrumbSchema,
  buildPageMetadata,
  stringifyJsonLd,
  stripHtml,
} from '@/lib/seo';
import { notFound, redirect } from 'next/navigation';
import { FiArrowLeft, FiEye } from 'react-icons/fi';
import ArticleViewCounter from './view-counter';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; articleId: string }>;
}): Promise<Metadata> {
  const { locale, articleId: rawArticleId } = await params;
  const copy = getArticlesCopy(locale);
  const articles = await getArticles(locale).catch(() => []);
  const article = findArticleByParam(articles, rawArticleId);

  if (!article) {
    return buildPageMetadata({
      locale,
      path: '/articles',
      title: locale === 'en' ? 'Useful articles' : 'Полезные статьи',
      description:
        locale === 'en'
          ? 'Useful articles about plant nutrition, stress recovery, and fertilizer systems from Foliart specialists.'
          : 'Полезные статьи о питании растений, восстановлении после стресса и системах удобрения от специалистов Фолиарт.',
      image: '/articles-head.webp',
    });
  }

  return buildPageMetadata({
    locale,
    path: getArticleHref(article),
    title: article.title,
    description: article.excerpt || stripHtml(article.content) || copy.detailsEmpty,
    image: resolveMediaUrl(article.imageUrl),
    type: 'article',
  });
}

export default async function ArticleDetailsPage({
  params,
}: {
  params: Promise<{ locale: string; articleId: string }>;
}) {
  const { locale, articleId: rawArticleId } = await params;
  const copy = getArticlesCopy(locale);
  const articles = await getArticles(locale);
  const article = findArticleByParam(articles, rawArticleId);

  if (!article) {
    notFound();
  }

  if (rawArticleId !== getArticleSlug(article)) {
    redirect(`/${locale}${getArticleHref(article)}`);
  }

  const relatedArticles = articles.filter((item) => item.id !== article.id).slice(0, 2);
  const imageSrc = resolveMediaUrl(article.imageUrl);
  const breadcrumbSchema = buildBreadcrumbSchema(locale, [
    { name: locale === 'en' ? 'Home' : 'Главная', path: '/' },
    { name: locale === 'en' ? 'Articles' : 'Статьи', path: '/articles' },
    { name: article.title, path: getArticleHref(article) },
  ]);
  const articleSchema = buildArticleSchema({
    locale,
    title: article.title,
    description: article.excerpt || stripHtml(article.content) || copy.detailsEmpty,
    path: getArticleHref(article),
    image: imageSrc,
    publishedAt: article.publishedAt,
  });

  return (
    <main className="bg-white pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: stringifyJsonLd(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: stringifyJsonLd(breadcrumbSchema) }}
      />
      <section className="catalog-header relative flex flex-col justify-center overflow-hidden px-6 pb-16 pt-30 md:pt-60">
        <div className="absolute inset-0">
          <MediaImage
            src={imageSrc}
            alt={article.title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
            emptyState={
              <div className="h-full w-full bg-[linear-gradient(135deg,#dde7df,#adc4af,#77957a)]" />
            }
          />
        </div>
        <div className="absolute inset-0 bg-black/55" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 to-transparent" />

        <div className="relative z-10 max-w-5xl">
          <h1 className="max-w-5xl text-3xl font-bold leading-[1.18] text-white md:text-4xl">
            {article.title}
          </h1>
        </div>
      </section>

      <section className="catalog-header py-14">
        <div className="grid gap-14 min-[1000px]:grid-cols-[minmax(0,1fr)_300px]">
          <article>
            <div className="mb-8 flex flex-wrap items-center gap-6 text-[1rem] text-[#b0a59c] border-b border-[#e6e8ea] pb-6">
              <span>{formatArticleDate(article.publishedAt, locale)}</span>
              <span className="inline-flex items-center gap-2">
                <FiEye className="text-[#6e7378]" />
                <ArticleViewCounter articleId={article.id} initialCount={article.viewCount} />
              </span>
            </div>

            <div
              className="article-content max-w-none"
              dangerouslySetInnerHTML={{
                __html: article.content || `<p>${copy.detailsEmpty}</p>`,
              }}
            />
          </article>

          <aside className="min-[1000px]:pt-2">
            <div className="min-[1000px]:sticky min-[1000px]:top-32">
              <Link
                href="/articles"
                className="inline-flex items-center gap-3 text-[1.03rem] text-[#908c87] transition hover:text-[#0b5a45]">
                <FiArrowLeft className="shrink-0" />
                {copy.backToArticles}
              </Link>

              <div className="mt-6 border-t border-[#e6e8ea] pt-8">
                <h2 className="text-lg font-medium text-[#0e2438]">{copy.relatedTitle}</h2>

                {relatedArticles.length === 0 ? (
                  <p className="mt-4 text-sm leading-6 text-[#768287]">{copy.relatedEmpty}</p>
                ) : (
                  <div className="mt-8 grid gap-6 md:max-[999px]:grid-cols-2">
                    {relatedArticles.map((relatedArticle) => {
                      const relatedImageSrc = resolveMediaUrl(relatedArticle.imageUrl);

                      return (
                        <Link
                          key={relatedArticle.id}
                          href={getArticleHref(relatedArticle)}
                          className="group block overflow-hidden bg-[#eff3ef]">
                          <article className="relative aspect-[10/8]">
                            <MediaImage
                              src={relatedImageSrc}
                              alt={relatedArticle.title}
                              fill
                              sizes="300px"
                              className="object-cover transition duration-500 group-hover:scale-[1.04]"
                              emptyState={
                                <div className="h-full w-full bg-[linear-gradient(135deg,#dfe9df,#b1c9b3,#6d8f70)]" />
                              }
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/18 to-transparent" />
                            <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                              <p className="text-sm text-white/76">
                                {formatArticleDate(relatedArticle.publishedAt, locale)}
                              </p>
                              <h3 className="mt-2 text-[1rem] font-semibold leading-5">
                                {relatedArticle.title}
                              </h3>
                            </div>
                          </article>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
