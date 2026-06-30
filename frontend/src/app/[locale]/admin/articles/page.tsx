import {
  AdminEmptyState,
  AdminNotice,
  AdminPanel,
  AdminShell,
  AdminWorkspace,
} from '@/components/admin/AdminShell';
import AdminDeleteButton from '@/components/admin/AdminDeleteButton';
import {
  adminBadgeClassName,
  adminCx,
  adminDangerButtonClassName,
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
} from '@/components/admin/adminStyles';
import ArticleRichTextEditor from '@/components/admin/ArticleRichTextEditor';
import MediaImage from '@/components/catalog/MediaImage';
import { Link } from '@/i18n/routing';
import { requireAdminSession } from '@/lib/adminAuthServer';
import {
  formatArticleDate,
  getArticleHref,
  getArticlesCopy,
  toDateInputValue,
} from '@/lib/articles';
import { getArticles, noStoreApiFetchOptions, type Article } from '@/lib/api';
import {
  getContentLocaleLabel,
  normalizeContentLocale,
  withContentLocale,
} from '@/lib/contentLocales';
import { parseEntityId } from '@/lib/catalog';
import { resolveMediaUrl } from '@/lib/media';
import { FiEdit3, FiExternalLink } from 'react-icons/fi';

import { createArticleAction, deleteArticleAction, updateArticleAction } from './actions';

type AdminPageSearchParams = {
  article?: string;
  contentLocale?: string;
  edit?: string;
  error?: string;
  manageError?: string;
  status?: string;
};

type ArticleFormValues = Pick<
  Article,
  'title' | 'titleEn' | 'excerpt' | 'excerptEn' | 'content' | 'contentEn' | 'publishedAt'
>;

function ArticleFormFields({
  contentLocale,
  locale,
  copy,
  values,
  imageRequired,
}: {
  contentLocale: string;
  locale: string;
  copy: ReturnType<typeof getArticlesCopy>;
  values?: Partial<ArticleFormValues>;
  imageRequired: boolean;
}) {
  const primaryPlaceholder =
    contentLocale === 'en'
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

      <div className="hidden">
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
  await requireAdminSession(locale, `/${locale}/admin/articles`);

  const { article, contentLocale: contentLocaleParam, edit, error, manageError, status } =
    await searchParams;
  const contentLocale = normalizeContentLocale(contentLocaleParam);
  const contentLocaleLabel = getContentLocaleLabel(contentLocale);
  const copy = getArticlesCopy(locale);
  const articles = await getArticles(contentLocale, noStoreApiFetchOptions, contentLocale);
  const editArticleId = parseEntityId(edit ?? '');
  const statusArticleId = parseEntityId(article ?? '');
  const topLevelError = error && !editArticleId ? error : null;
  const managePanelError = manageError ?? null;
  const deletedStatusMessage =
    locale === 'en' ? 'Article deleted successfully.' : 'Статья успешно удалена.';
  const topLevelStatus = status === 'created' ? copy.statusCreated : null;
  const manageStatus = status === 'deleted' ? deletedStatusMessage : null;
  const latestArticle = articles.reduce<Article | null>((current, articleItem) => {
    if (!current) {
      return articleItem;
    }

    return new Date(articleItem.publishedAt) > new Date(current.publishedAt)
      ? articleItem
      : current;
  }, null);
  const untranslatedArticles = articles.filter(
    (articleItem) => !articleItem.adminTranslation?.isComplete,
  ).length;
  const createBadge = locale === 'en' ? 'Create' : 'Создание';
  const manageBadge = locale === 'en' ? 'Manage' : 'Управление';
  const openEditorLabel = locale === 'en' ? 'Open editor' : 'Открыть редактор';
  const deleteLabel = locale === 'en' ? 'Delete' : 'Удалить';
  const deletingLabel = locale === 'en' ? 'Deleting...' : 'Удаление...';
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
      label: locale === 'en' ? `Need ${contentLocaleLabel}` : `Нужен ${contentLocaleLabel}`,
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
      contentLocale={contentLocale}
      locale={locale}
      shortcuts={shortcuts}
      stats={stats}
      title={copy.adminTitle}
    >
      <AdminWorkspace>
        <AdminPanel
          id="create-article"
          badge={createBadge}
          title={copy.adminFormTitle}
          description={copy.adminFormDescription}
        >
          <div className="space-y-4">
            {topLevelStatus ? <AdminNotice tone="success">{topLevelStatus}</AdminNotice> : null}
            {topLevelError ? <AdminNotice tone="error">{topLevelError}</AdminNotice> : null}
          </div>

          {contentLocale === 'ru' ? (
            <form action={createArticleAction} className="mt-6 space-y-6">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="contentLocale" value={contentLocale} />

              <ArticleFormFields
                contentLocale={contentLocale}
                locale={locale}
                copy={copy}
                imageRequired
              />

              <div className="flex flex-col gap-3 border-t border-[#0b5a45]/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="submit"
                  className={adminCx(adminPrimaryButtonClassName, 'w-full sm:w-auto')}
                >
                  {copy.submitLabel}
                </button>
                <p className={adminHintClassName}>
                  {locale === 'en'
                    ? 'Use the toolbar to add headings, lists, quotes, and links.'
                    : 'Используйте панель редактора для заголовков, списков, цитат и ссылок.'}
                </p>
              </div>
            </form>
          ) : (
            <div className="mt-6">
              <AdminEmptyState
                badge={contentLocaleLabel}
                title={
                  locale === 'en'
                    ? 'Create the Russian article first'
                    : 'Сначала создайте статью на русском языке'
                }
                description={
                  locale === 'en'
                    ? 'Switch to RU to create the base article, then return here to add its translation.'
                    : 'Переключитесь на RU, создайте основную статью, затем вернитесь сюда и добавьте перевод.'
                }
              />
            </div>
          )}
        </AdminPanel>

        <AdminPanel
          id="manage-articles"
          badge={manageBadge}
          title={copy.adminExistingTitle}
          description={copy.adminPathHint}
          tone="muted"
          headerContent={<span className={adminBadgeClassName}>{articles.length}</span>}
        >
          {manageStatus ? (
            <div className="mb-5">
              <AdminNotice tone="success">{manageStatus}</AdminNotice>
            </div>
          ) : null}
          {managePanelError ? (
            <div className="mb-5">
              <AdminNotice tone="error">{managePanelError}</AdminNotice>
            </div>
          ) : null}
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
                const hasContentTranslation = Boolean(articleItem.adminTranslation?.isComplete);

                return (
                  <div
                    key={articleItem.id}
                    id={`article-${articleItem.id}`}
                    className="scroll-mt-6 rounded-lg border border-[#0b5a45]/10 bg-white p-4 shadow-[0_12px_40px_-30px_rgba(11,62,49,0.8)] sm:p-5"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                      <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-md border border-[#0b5a45]/10 bg-[#eef3ef] sm:h-[90px] sm:w-[116px]">
                        <MediaImage
                          src={imageSrc}
                          alt={articleItem.title}
                          fill
                          sizes="(max-width: 640px) calc(100vw - 4rem), 116px"
                          className="object-cover"
                          emptyState={
                            <div className="h-full w-full bg-[linear-gradient(135deg,#dfe9df,#b1c9b3,#6d8f70)]" />
                          }
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={adminBadgeClassName}>
                              {formatArticleDate(articleItem.publishedAt, locale)}
                            </span>
                            <span
                              className={adminCx(
                                'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]',
                                hasContentTranslation
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-amber-50 text-amber-700',
                              )}
                            >
                              {hasContentTranslation
                                ? `${contentLocaleLabel} ✓`
                                : locale === 'en'
                                  ? `Needs ${contentLocaleLabel}`
                                  : `Нужен ${contentLocaleLabel}`}
                            </span>
                          </div>

                          <div className="grid w-full grid-cols-[2.5rem_minmax(0,1fr)] gap-1.5 sm:w-auto sm:flex sm:shrink-0">
                            <Link
                              href={getArticleHref(articleItem)}
                              className={adminCx(
                                adminSecondaryButtonClassName,
                                'min-h-8 px-2.5 py-1.5 text-xs',
                              )}
                            >
                              <FiExternalLink />
                            </Link>
                            <Link
                              href={withContentLocale(
                                `/admin/articles?edit=${articleItem.id}#article-${articleItem.id}`,
                                contentLocale,
                              )}
                              className={adminCx(
                                adminSecondaryButtonClassName,
                                'min-h-8 px-2.5 py-1.5 text-xs',
                              )}
                            >
                              <FiEdit3 className="mr-1" />
                              {openEditorLabel}
                            </Link>
                            <form
                              action={deleteArticleAction}
                              className="col-span-2 sm:col-span-1"
                            >
                              <input type="hidden" name="locale" value={locale} />
                              <input type="hidden" name="contentLocale" value={contentLocale} />
                              <input type="hidden" name="articleId" value={articleItem.id} />
                              <input
                                type="hidden"
                                name="articleTitle"
                                value={articleItem.slugSourceTitle ?? articleItem.title}
                              />
                              <AdminDeleteButton
                                className={adminCx(
                                  adminDangerButtonClassName,
                                  'min-h-8 w-full px-2.5 py-1.5 text-xs sm:w-auto',
                                )}
                                confirmMessage={
                                  locale === 'en'
                                    ? `Delete article "${articleItem.title}"? This cannot be undone.`
                                    : `Удалить статью «${articleItem.title}»? Это действие нельзя отменить.`
                                }
                                pendingLabel={deletingLabel}
                              >
                                {deleteLabel}
                              </AdminDeleteButton>
                            </form>
                          </div>
                        </div>

                        <h3 className="mt-2 text-sm font-semibold leading-6 text-[#0b3e31] sm:text-base sm:leading-7">
                          {articleItem.title}
                        </h3>
                        {articleItem.excerpt ? (
                          <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-[#567068] sm:text-sm sm:leading-6">
                            {articleItem.excerpt}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <details open={isEditing} className={adminCx('mt-5', adminDetailsClassName)}>
                      <summary className={adminSummaryClassName}>
                        <span>{copy.editLabel}</span>
                        <span className="text-xs font-medium text-[#6a7f76]">
                          {locale === 'en' ? 'Inline article editor' : 'Встроенный редактор статьи'}
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
                          <input type="hidden" name="contentLocale" value={contentLocale} />
                          <input type="hidden" name="articleId" value={articleItem.id} />
                          <input
                            type="hidden"
                            name="previousTitle"
                            value={articleItem.slugSourceTitle ?? articleItem.title}
                          />

                          <ArticleFormFields
                            contentLocale={contentLocale}
                            locale={locale}
                            copy={copy}
                            values={{
                              title: articleItem.adminTranslation?.title ?? '',
                              excerpt: articleItem.adminTranslation?.excerpt ?? '',
                              content: articleItem.adminTranslation?.content ?? '',
                              publishedAt: articleItem.publishedAt,
                            }}
                            imageRequired={false}
                          />

                          <button
                            type="submit"
                            className={adminCx(adminPrimaryButtonClassName, 'w-full sm:w-auto')}
                          >
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
