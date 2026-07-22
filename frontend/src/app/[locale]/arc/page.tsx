import { getArticle, getArticles } from '@/lib/api';
import { renderArticleContent } from '@/lib/renderArticleContent';

// Страница выводит СПИСОК всех статей на французском (contentLocale = 'fr'):
// заголовок, анонс и ПОЛНЫЙ текст статьи.
//
// getArticles (список) обычно не возвращает поле content целиком — только excerpt.
// Поэтому для каждой статьи из списка дополнительно запрашивается getArticle(id),
// который отдаёт полный content.
//
// Разместите файл ВНУТРИ сегмента [locale], например:
//   app/[locale]/fr-articles/page.tsx
// (это важно — иначе будет ошибка "Missing <html> and <body> tags",
// т.к. корневой layout с <html>/<body> находится в app/[locale]/layout.tsx)

export default async function ArticlesFrenchListPage() {
  const articleSummaries = await getArticles('ru', undefined, 'ru');

  const articles = await Promise.all(
    articleSummaries.map((summary) =>
      getArticle(summary.id, 'ru', undefined, 'ru').catch(() => summary),
    ),
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 pt-50">
      <h1 className="mb-8 text-2xl font-semibold text-[#0b5a45]">Статьи</h1>

      {articles.length === 0 ? (
        <p className="italic text-[#8a978f]">Нет доступных статей на данный момент.</p>
      ) : (
        <div className="space-y-14">
          {articles.map((article) => {
            const renderedContent = renderArticleContent(
              article.contentPayload,
              article.content ?? '',
            );

            return (
              <article
                key={article.id}
                className="rounded-lg border border-[#0b5a45]/10 bg-white p-6">
                <h2 className="mb-3 text-xl font-semibold text-[#0b5a45]">{article.title}</h2>

                {article.excerpt ? <p className="mb-4 text-[#3b4a45]">{article.excerpt}</p> : null}

                {renderedContent ? (
                  <div
                    className="article-content max-w-none"
                    dangerouslySetInnerHTML={{ __html: renderedContent }}
                  />
                ) : (
                  <p className="italic text-[#8a978f]">
                    Эта статья пока не заполнена на русском языке.
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
