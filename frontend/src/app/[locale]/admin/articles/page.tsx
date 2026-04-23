import {
  AdminEmptyState,
  AdminNotice,
  AdminPanel,
  AdminShell,
  AdminWorkspace,
} from '@/components/admin/AdminShell';
import {
  adminBadgeClassName,
  adminCx,
  adminDetailsClassName,
  adminFieldClassName,
  adminFileInputClassName,
  adminHintClassName,
  adminInputClassName,
  adminInputOnWhiteClassName,
  adminLabelClassName,
  adminOptionalLabelClassName,
  adminPrimaryButtonClassName,
  adminSecondaryButtonClassName,
  adminSummaryClassName,
  adminTextareaClassName,
  adminTextareaOnWhiteClassName,
  adminTranslationCardClassName,
} from '@/components/admin/adminStyles';
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
import { FiEdit3, FiExternalLink } from 'react-icons/fi';

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
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_220px]">
        <label className={adminFieldClassName}>
          <span className={adminLabelClassName}>{copy.titleLabel}</span>
          <input
            name="title"
            type="text"
            required
            defaultValue={values?.title ?? ''}
            className={adminInputClassName}
          />
        </label>

        <label className={adminFieldClassName}>
          <span className={adminLabelClassName}>{copy.publishedAtLabel}</span>
          <input
            name="publishedAt"
            type="date"
            required
            defaultValue={toDateInputValue(values?.publishedAt)}
            className={adminInputClassName}
          />
        </label>
      </div>

      <label className={adminFieldClassName}>
        <span className={adminLabelClassName}>
          {copy.imageLabel}
          {!imageRequired ? (
            <span className={adminOptionalLabelClassName}> ({copy.optionalLabel})</span>
          ) : null}
        </span>
        <input
          name="image"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          required={imageRequired}
          className={adminFileInputClassName}
        />
        <span className={adminHintClassName}>
          {imageRequired ? copy.imageHint : copy.replaceImageHint}
        </span>
      </label>

      <label className={adminFieldClassName}>
        <span className={adminLabelClassName}>
          {copy.excerptLabel}
          <span className={adminOptionalLabelClassName}> ({copy.optionalLabel})</span>
        </span>
        <textarea
          name="excerpt"
          rows={4}
          defaultValue={values?.excerpt ?? ''}
          className={adminTextareaClassName}
        />
        <span className={adminHintClassName}>{copy.excerptHint}</span>
      </label>

      <div className="space-y-2">
        <span className={adminLabelClassName}>{copy.contentLabel}</span>
        <ArticleRichTextEditor
          name="content"
          locale={locale}
          defaultValue={values?.content ?? ''}
          placeholder={primaryPlaceholder}
        />
        <span className={adminHintClassName}>{copy.contentHint}</span>
      </div>

      <div className={adminTranslationCardClassName}>
        <div>
          <p className={adminBadgeClassName}>
            {locale === 'en' ? 'English translation' : 'Английская версия'}
          </p>
          <p className={adminCx('mt-3', adminHintClassName)}>{copy.translationHint}</p>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className={adminFieldClassName}>
            <span className={adminLabelClassName}>
              {copy.titleEnLabel}
              <span className={adminOptionalLabelClassName}> ({copy.optionalLabel})</span>
            </span>
            <input
              name="titleEn"
              type="text"
              defaultValue={values?.titleEn ?? ''}
              className={adminInputOnWhiteClassName}
            />
          </label>

          <label className={adminFieldClassName}>
            <span className={adminLabelClassName}>
              {copy.excerptEnLabel}
              <span className={adminOptionalLabelClassName}> ({copy.optionalLabel})</span>
            </span>
            <textarea
              name="excerptEn"
              rows={4}
              defaultValue={values?.excerptEn ?? ''}
              className={adminTextareaOnWhiteClassName}
            />
          </label>
        </div>

        <div className="mt-5 space-y-2">
          <span className={adminLabelClassName}>
            {copy.contentEnLabel}
            <span className={adminOptionalLabelClassName}> ({copy.optionalLabel})</span>
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
  const latestArticle = articles.reduce<Article | null>((current, articleItem) => {
    if (!current) {
      return articleItem;
    }

    return new Date(articleItem.publishedAt) > new Date(current.publishedAt)
      ? articleItem
      : current;
  }, null);
  const untranslatedArticles = articles.filter(
    (articleItem) => !articleItem.titleEn?.trim() || !articleItem.contentEn?.trim(),
  ).length;
  const createBadge = locale === 'en' ? 'Create' : 'Создание';
  const manageBadge = locale === 'en' ? 'Manage' : 'Управление';
  const openEditorLabel = locale === 'en' ? 'Open editor' : 'Открыть редактор';
  const stats = [
    {
      label: locale === 'en' ? 'Published' : 'Опубликовано',
      value: String(articles.length),
      hint:
        locale === 'en'
          ? 'Article cards already visible in the section.'
          : 'Карточки статей, которые уже доступны в разделе.',
    },
    {
      label: locale === 'en' ? 'Latest date' : 'Последняя дата',
      value: latestArticle ? formatArticleDate(latestArticle.publishedAt, locale) : '—',
      hint:
        locale === 'en'
          ? 'Most recent publication currently in the admin.'
          : 'Самая свежая публикация, которая сейчас есть в админке.',
    },
    {
      label: locale === 'en' ? 'Need EN' : 'Нужен EN',
      value: String(untranslatedArticles),
      hint:
        locale === 'en'
          ? 'Articles still missing an English title or body.'
          : 'Статьи, в которых еще не хватает английского заголовка или текста.',
    },
  ];
  const shortcuts = [
    {
      href: '#create-article',
      label: locale === 'en' ? 'Add article' : 'Добавить статью',
    },
    {
      href: '#manage-articles',
      label: locale === 'en' ? 'Browse articles' : 'Список статей',
    },
  ];

  return (
    <AdminShell
      activeTab="articles"
      backHref="/articles"
      backLabel={copy.backToSite}
      description={copy.adminSubtitle}
      locale={locale}
      shortcuts={shortcuts}
      stats={stats}
      title={copy.adminTitle}>
      <AdminWorkspace>
        <AdminPanel
          id="create-article"
          badge={createBadge}
          title={copy.adminFormTitle}
          description={copy.adminFormDescription}>
          <div className="space-y-4">
            {topLevelStatus ? <AdminNotice tone="success">{topLevelStatus}</AdminNotice> : null}
            {topLevelError ? <AdminNotice tone="error">{topLevelError}</AdminNotice> : null}
          </div>

          <form action={createArticleAction} className="mt-6 space-y-6">
            <input type="hidden" name="locale" value={locale} />

            <ArticleFormFields locale={locale} copy={copy} imageRequired />

            <div className="flex flex-col gap-3 border-t border-[#0b5a45]/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="submit"
                className={adminCx(adminPrimaryButtonClassName, 'w-full sm:w-auto')}>
                {copy.submitLabel}
              </button>
              <p className={adminHintClassName}>
                {locale === 'en'
                  ? 'Use the toolbar to add headings, lists, quotes, and links.'
                  : 'Используйте панель редактора для заголовков, списков, цитат и ссылок.'}
              </p>
            </div>
          </form>
        </AdminPanel>

        <AdminPanel
          id="manage-articles"
          badge={manageBadge}
          title={copy.adminExistingTitle}
          description={copy.adminPathHint}
          tone="muted"
          headerContent={<span className={adminBadgeClassName}>{articles.length}</span>}>
          {articles.length === 0 ? (
            <AdminEmptyState
              badge={manageBadge}
              title={locale === 'en' ? 'Articles will appear here' : 'Статьи появятся здесь'}
              description={copy.adminEmptyState}
            />
          ) : (
            <div className="space-y-5">
              {articles.map((articleItem) => {
                const imageSrc = resolveMediaUrl(articleItem.imageUrl);
                const isEditing =
                  editArticleId === articleItem.id || statusArticleId === articleItem.id;
                const hasEnglishVersion =
                  Boolean(articleItem.titleEn?.trim()) && Boolean(articleItem.contentEn?.trim());

                return (
                  <div
                    key={articleItem.id}
                    id={`article-${articleItem.id}`}
                    className="scroll-mt-32 rounded-[1.55rem] border border-[#0b5a45]/10 bg-white p-4 shadow-[0_22px_70px_-54px_rgba(11,62,49,0.9)] sm:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 gap-4">
                        <div className="relative h-[104px] w-[132px] shrink-0 overflow-hidden rounded-[1.25rem] border border-[#0b5a45]/10 bg-[#eef3ef]">
                          <MediaImage
                            src={imageSrc}
                            alt={articleItem.title}
                            fill
                            sizes="132px"
                            className="object-cover"
                            emptyState={
                              <div className="h-full w-full bg-[linear-gradient(135deg,#dfe9df,#b1c9b3,#6d8f70)]" />
                            }
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={adminBadgeClassName}>
                              {formatArticleDate(articleItem.publishedAt, locale)}
                            </span>
                            <span
                              className={adminCx(
                                'inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]',
                                hasEnglishVersion
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-amber-50 text-amber-700',
                              )}>
                              {hasEnglishVersion
                                ? locale === 'en'
                                  ? 'EN ready'
                                  : 'EN готов'
                                : locale === 'en'
                                  ? 'Needs EN'
                                  : 'Нужен EN'}
                            </span>
                          </div>

                          <h3 className="mt-3 text-xl font-semibold leading-7 text-[#0b3e31]">
                            {articleItem.title}
                          </h3>
                          {articleItem.excerpt ? (
                            <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#567068]">
                              {articleItem.excerpt}
                            </p>
                          ) : null}
                          <p className="mt-3 text-xs leading-5 text-[#7f8f88]">
                            {copy.imagePathLabel}: {articleItem.imageUrl}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row lg:flex-col lg:items-end">
                        <Link href={getArticleHref(articleItem)} className={adminSecondaryButtonClassName}>
                          <FiExternalLink className="mr-2" />
                          {copy.openArticle}
                        </Link>
                        <Link
                          href={`/admin/articles?edit=${articleItem.id}#article-${articleItem.id}`}
                          className={adminSecondaryButtonClassName}>
                          <FiEdit3 className="mr-2" />
                          {openEditorLabel}
                        </Link>
                      </div>
                    </div>

                    <details open={isEditing} className={adminCx('mt-5', adminDetailsClassName)}>
                      <summary className={adminSummaryClassName}>
                        <span>{copy.editLabel}</span>
                        <span className="text-xs font-medium text-[#6a7f76]">
                          {locale === 'en'
                            ? 'Inline article editor'
                            : 'Встроенный редактор статьи'}
                        </span>
                      </summary>

                      <div className="border-t border-[#0b5a45]/10 p-4 sm:p-5">
                        <div className="space-y-4">
                          {status === 'updated' && statusArticleId === articleItem.id ? (
                            <AdminNotice tone="success">{copy.statusUpdated}</AdminNotice>
                          ) : null}

                          {error && editArticleId === articleItem.id ? (
                            <AdminNotice tone="error">{error}</AdminNotice>
                          ) : null}
                        </div>

                        <form action={updateArticleAction} className="mt-5 space-y-6">
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
                            className={adminCx(adminPrimaryButtonClassName, 'w-full sm:w-auto')}>
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
        </AdminPanel>
      </AdminWorkspace>
    </AdminShell>
  );
}
