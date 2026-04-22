import AdminTabs from '@/components/admin/AdminTabs';
import ArticleRichTextEditor from '@/components/admin/ArticleRichTextEditor';
import MediaImage from '@/components/catalog/MediaImage';
import { Link } from '@/i18n/routing';
import {
  formatArticleDate,
  getArticleHref,
  getArticlesCopy,
  toDateInputValue,
} from '@/lib/articles';
import { getArticles, type Article } from '@/lib/api';
import { parseEntityId } from '@/lib/catalog';
import { resolveMediaUrl } from '@/lib/media';
import { createArticleAction, updateArticleAction } from './actions';

type AdminPageSearchParams = {
  article?: string;
  edit?: string;
  error?: string;
  status?: string;
};

type ArticleFormValues = Pick<
  Article,
  'title' | 'titleEn' | 'excerpt' | 'excerptEn' | 'content' | 'contentEn' | 'publishedAt'
>;

function ArticleFormFields({
  locale,
  copy,
  values,
  imageRequired,
}: {
  locale: string;
  copy: ReturnType<typeof getArticlesCopy>;
  values?: Partial<ArticleFormValues>;
  imageRequired: boolean;
}) {
  const primaryPlaceholder =
    locale === 'en'
      ? 'Start with an intro paragraph, then add headings and lists.'
      : 'Начните с вводного абзаца, затем добавьте подзаголовки и списки.';
  const translationPlaceholder =
    locale === 'en'
      ? 'Add the English version if you want to localize the article.'
      : 'Добавьте английскую версию, если хотите локализовать статью.';

  return (
    <>
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-[#0b3e31]">{copy.titleLabel}</span>
        <input
          name="title"
          type="text"
          required
          defaultValue={values?.title ?? ''}
          className="rounded-2xl border border-[#0b5a45]/15 bg-[#f8f7f2] px-4 py-3 text-[#0b3e31] outline-none transition placeholder:text-[#7e9088] focus:border-[#0b5a45]"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-[#0b3e31]">
          {copy.imageLabel}
          {!imageRequired ? <span className="text-[#7e9088]"> ({copy.optionalLabel})</span> : null}
        </span>
        <input
          name="image"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          required={imageRequired}
          className="rounded-2xl border border-dashed border-[#0b5a45]/20 bg-[#f8f7f2] px-4 py-3 text-sm text-[#0b3e31] file:mr-4 file:rounded-full file:border-0 file:bg-[#0b5a45] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
        />
        <span className="text-xs leading-5 text-[#6a7f76]">
          {imageRequired ? copy.imageHint : copy.replaceImageHint}
        </span>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-[#0b3e31]">{copy.publishedAtLabel}</span>
        <input
          name="publishedAt"
          type="date"
          required
          defaultValue={toDateInputValue(values?.publishedAt)}
          className="rounded-2xl border border-[#0b5a45]/15 bg-[#f8f7f2] px-4 py-3 text-[#0b3e31] outline-none transition focus:border-[#0b5a45]"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-[#0b3e31]">
          {copy.excerptLabel} <span className="text-[#7e9088]">({copy.optionalLabel})</span>
        </span>
        <textarea
          name="excerpt"
          rows={4}
          defaultValue={values?.excerpt ?? ''}
          className="rounded-2xl border border-[#0b5a45]/15 bg-[#f8f7f2] px-4 py-3 text-[#0b3e31] outline-none transition placeholder:text-[#7e9088] focus:border-[#0b5a45]"
        />
        <span className="text-xs leading-5 text-[#6a7f76]">{copy.excerptHint}</span>
      </label>

      <div className="space-y-2">
        <span className="text-sm font-medium text-[#0b3e31]">{copy.contentLabel}</span>
        <ArticleRichTextEditor
          name="content"
          locale={locale}
          defaultValue={values?.content ?? ''}
          placeholder={primaryPlaceholder}
        />
        <span className="text-xs leading-5 text-[#6a7f76]">{copy.contentHint}</span>
      </div>

      <div className="rounded-[1.6rem] border border-[#0b5a45]/10 bg-[#f7f9f6] px-5 py-5">
        <div className="mb-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0b5a45]">
            {locale === 'en' ? 'English translation' : 'Английская версия'}
          </p>
          <p className="mt-2 text-xs leading-5 text-[#6a7f76]">{copy.translationHint}</p>
        </div>

        <div className="space-y-5">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-[#0b3e31]">
              {copy.titleEnLabel} <span className="text-[#7e9088]">({copy.optionalLabel})</span>
            </span>
            <input
              name="titleEn"
              type="text"
              defaultValue={values?.titleEn ?? ''}
              className="rounded-2xl border border-[#0b5a45]/15 bg-white px-4 py-3 text-[#0b3e31] outline-none transition placeholder:text-[#7e9088] focus:border-[#0b5a45]"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-[#0b3e31]">
              {copy.excerptEnLabel} <span className="text-[#7e9088]">({copy.optionalLabel})</span>
            </span>
            <textarea
              name="excerptEn"
              rows={4}
              defaultValue={values?.excerptEn ?? ''}
              className="rounded-2xl border border-[#0b5a45]/15 bg-white px-4 py-3 text-[#0b3e31] outline-none transition placeholder:text-[#7e9088] focus:border-[#0b5a45]"
            />
          </label>

          <div className="space-y-2">
            <span className="text-sm font-medium text-[#0b3e31]">
              {copy.contentEnLabel} <span className="text-[#7e9088]">({copy.optionalLabel})</span>
            </span>
            <ArticleRichTextEditor
              name="contentEn"
              locale={locale}
              defaultValue={values?.contentEn ?? ''}
              placeholder={translationPlaceholder}
            />
          </div>
        </div>
      </div>
    </>
  );
}

export default async function AdminArticlesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<AdminPageSearchParams>;
}) {
  const { locale } = await params;
  const { article, edit, error, status } = await searchParams;
  const copy = getArticlesCopy(locale);
  const articles = await getArticles();
  const editArticleId = parseEntityId(edit ?? '');
  const statusArticleId = parseEntityId(article ?? '');
  const topLevelError = error && !editArticleId ? error : null;
  const topLevelStatus = status === 'created' ? copy.statusCreated : null;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 pb-20 pt-60 md:px-8">
      <section className="rounded-[2.5rem] bg-[linear-gradient(135deg,#0b5a45,#0a3e31)] px-8 py-10 text-white shadow-[0_30px_90px_-50px_rgba(11,62,49,1)] md:px-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-medium uppercase tracking-[0.28em] text-[#d8ead8]">
              Foliart Admin
            </p>
            <h1 className="mb-4 text-4xl font-semibold md:text-5xl">{copy.adminTitle}</h1>
            <p className="text-base leading-7 text-white/80 md:text-lg">{copy.adminSubtitle}</p>
            <AdminTabs active="articles" locale={locale} />
          </div>

          <Link
            href="/articles"
            className="inline-flex w-fit items-center rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/18">
            {copy.backToSite}
          </Link>
        </div>
      </section>

      <section className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(320px,1.05fr)]">
        <div className="rounded-[2rem] border border-[#0b5a45]/10 bg-white p-8 shadow-[0_24px_70px_-52px_rgba(11,62,49,0.95)]">
          <h2 className="text-3xl font-semibold text-[#0b3e31]">{copy.adminFormTitle}</h2>
          <p className="mt-3 text-sm leading-6 text-[#567068]">{copy.adminFormDescription}</p>

          {topLevelStatus ? (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
              {topLevelStatus}
            </div>
          ) : null}

          {topLevelError ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
              {topLevelError}
            </div>
          ) : null}

          <form action={createArticleAction} className="mt-8 space-y-6">
            <input type="hidden" name="locale" value={locale} />

            <ArticleFormFields locale={locale} copy={copy} imageRequired />

            <button
              type="submit"
              className="inline-flex items-center rounded-full bg-[#0b5a45] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#094635]">
              {copy.submitLabel}
            </button>
          </form>
        </div>

        <aside className="rounded-[2rem] border border-[#0b5a45]/10 bg-[#f7f6f1] p-8 shadow-[0_24px_70px_-52px_rgba(11,62,49,0.95)]">
          <h2 className="text-3xl font-semibold text-[#0b3e31]">{copy.adminExistingTitle}</h2>
          <p className="mt-3 text-sm leading-6 text-[#567068]">{copy.adminPathHint}</p>

          {articles.length === 0 ? (
            <p className="mt-8 text-sm text-[#6a7f76]">{copy.adminEmptyState}</p>
          ) : (
            <div className="mt-8 space-y-5">
              {articles.map((articleItem) => {
                const imageSrc = resolveMediaUrl(articleItem.imageUrl);
                const isEditing =
                  editArticleId === articleItem.id || statusArticleId === articleItem.id;

                return (
                  <div
                    key={articleItem.id}
                    className="rounded-[1.5rem] border border-[#0b5a45]/10 bg-white p-5">
                    <div className="flex items-start gap-4">
                      <div className="relative h-[92px] w-[118px] shrink-0 overflow-hidden rounded-[1.2rem] bg-[#eef3ef]">
                        <MediaImage
                          src={imageSrc}
                          alt={articleItem.title}
                          fill
                          sizes="118px"
                          className="object-cover"
                          emptyState={
                            <div className="h-full w-full bg-[linear-gradient(135deg,#dfe9df,#b1c9b3,#6d8f70)]" />
                          }
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs uppercase tracking-[0.2em] text-[#8a9b93]">
                          {formatArticleDate(articleItem.publishedAt, locale)}
                        </p>
                        <h3 className="mt-2 text-lg font-semibold leading-7 text-[#0b3e31]">
                          {articleItem.title}
                        </h3>
                        <p className="article-card-excerpt-2 mt-3 text-sm leading-6 text-[#6a7f76]">
                          {articleItem.excerpt}
                        </p>
                        <p className="mt-3 text-xs text-[#7f8f88]">
                          {copy.imagePathLabel}: {articleItem.imageUrl}
                        </p>
                      </div>

                      <Link
                        href={getArticleHref(articleItem)}
                        className="shrink-0 text-sm font-medium text-[#0b5a45] underline-offset-4 transition hover:underline">
                        {copy.openArticle}
                      </Link>
                    </div>

                    <details
                      open={isEditing}
                      className="mt-5 rounded-[1.1rem] border border-[#0b5a45]/10 bg-[#f8f7f2]">
                      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-[#0b5a45] [&::-webkit-details-marker]:hidden">
                        {copy.editLabel}
                      </summary>

                      <div className="border-t border-[#0b5a45]/10 p-4">
                        {status === 'updated' && statusArticleId === articleItem.id ? (
                          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                            {copy.statusUpdated}
                          </div>
                        ) : null}

                        {error && editArticleId === articleItem.id ? (
                          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                            {error}
                          </div>
                        ) : null}

                        <form action={updateArticleAction} className="space-y-5">
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="articleId" value={articleItem.id} />
                          <input type="hidden" name="previousTitle" value={articleItem.title} />

                          <ArticleFormFields
                            locale={locale}
                            copy={copy}
                            values={articleItem}
                            imageRequired={false}
                          />

                          <button
                            type="submit"
                            className="inline-flex items-center rounded-full bg-[#0b5a45] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#094635]">
                            {copy.updateLabel}
                          </button>
                        </form>
                      </div>
                    </details>
                  </div>
                );
              })}
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
