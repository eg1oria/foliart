import MediaImage from '@/components/catalog/MediaImage';
import { Link } from '@/i18n/routing';
import { getArticleHref, getArticlesCopy, formatArticleDate } from '@/lib/articles';
import { getArticles } from '@/lib/api';
import { resolveMediaUrl } from '@/lib/media';
import Image from 'next/image';

export default async function ArticlesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const copy = getArticlesCopy(locale);
  const articles = await getArticles(locale);

  return (
    <main className="pb-24">
      <section className="catalog-header relative flex flex-col justify-center overflow-hidden px-6 pb-16 pt-30 md:pt-60">
        <Image src="/articles-head.webp" alt="" fill className="object-cover" />
        <div className="absolute inset-0 bg-black/55" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 to-transparent" />

        <h1 className="relative z-10 max-w-4xl text-3xl font-bold text-white md:text-5xl">
          {copy.title}
        </h1>
      </section>

      <section className="catalog-header py-10">
        {articles.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-[#0b5a45]/20 bg-[#f7f6f1] px-8 py-16 text-center text-base text-[#5f726b]">
            {copy.emptyState}
          </div>
        ) : (
          <div className="grid items-stretch gap-2  md:gap-x-10 md:gap-y-16 md:grid-cols-2 xl:grid-cols-4">
            {articles.map((article) => {
              const imageSrc = resolveMediaUrl(article.imageUrl);

              return (
                <Link
                  key={article.id}
                  href={getArticleHref(article)}
                  className="group flex h-full p-4 transition-transform transition-shadow duration-300 ease-in-out group-hover:scale-102 group-hover:shadow-lg">
                  <article className="article-card w-full ">
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
                      <p className="mt-3 text-base text-[#9a958f]">
                        {formatArticleDate(article.publishedAt, locale)}
                      </p>
                      <p className="article-card-excerpt mt-5 text-[0.875rem] leading-6 text-[#53646b]">
                        {article.excerpt}
                      </p>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
