import {
  AdminEmptyState,
  AdminNotice,
  AdminPanel,
  AdminShell,
} from '@/components/admin/AdminShell';
import AdminDeleteButton from '@/components/admin/AdminDeleteButton';
import {
  adminCx,
  adminDangerButtonClassName,
  adminPrimaryButtonClassName,
  adminSecondaryButtonClassName,
} from '@/components/admin/adminStyles';
import ArticleDraftResumeList from '@/components/admin/ArticleDraftResumeList';
import MediaImage from '@/components/catalog/MediaImage';
import { Link } from '@/i18n/routing';
import { requireAdminSection } from '@/lib/adminAuthServer';
import { canManageSection } from '@/lib/adminPermissions';
import { formatArticleDate, getArticleHref, getArticlesCopy } from '@/lib/articles';
import { getArticles, noStoreApiFetchOptions, type Article } from '@/lib/api';
import {
  getContentLocaleLabel,
  normalizeContentLocale,
  withContentLocale,
} from '@/lib/contentLocales';
import { parseEntityId } from '@/lib/catalog';
import { resolveMediaUrl } from '@/lib/media';
import { FiEdit3, FiExternalLink, FiPlus } from 'react-icons/fi';

import { deleteArticleAction } from './actions';

type AdminPageSearchParams = {
  article?: string;
  contentLocale?: string;
  edit?: string;
  error?: string;
  manageError?: string;
  status?: string;
};

export default async function AdminArticlesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<AdminPageSearchParams>;
}) {
  const { locale } = await params;
  const session = await requireAdminSection(locale, 'articles', 'view', `/${locale}/admin/articles`);

  const {
    contentLocale: contentLocaleParam,
    edit,
    error,
    manageError,
    status,
  } = await searchParams;
  const contentLocale = normalizeContentLocale(contentLocaleParam);
  const contentLocaleLabel = getContentLocaleLabel(contentLocale);
  const copy = getArticlesCopy(locale);
  const articles = await getArticles(contentLocale, noStoreApiFetchOptions, contentLocale);
  const editArticleId = parseEntityId(edit ?? '');
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
  const manageBadge = locale === 'en' ? 'Manage' : 'Управление';
  const canManage = canManageSection(session, 'articles');
  const openEditorLabel = locale === 'en' ? 'Open editor' : 'Добавить статью';
  const editLabel = locale === 'en' ? 'Edit' : 'Изменить';
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
      href: withContentLocale('/admin/articles/new', 'ru'),
      label: locale === 'en' ? 'Add article' : 'Добавить статью',
    },
    {
      href: '#manage-articles',
      label: locale === 'en' ? 'Browse articles' : 'Список статей',
    },
  ];
  const renderTranslationBadge = (articleItem: Article) => {
    const complete = Boolean(articleItem.adminTranslation?.isComplete);

    return (
      <span
        className={adminCx(
          'inline-flex items-center rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]',
          complete ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700',
        )}>
        {complete
          ? `${contentLocale.toUpperCase()} · ${locale === 'en' ? 'ready' : 'готово'}`
          : `${contentLocale.toUpperCase()} · ${locale === 'en' ? 'missing' : 'не заполнено'}`}
      </span>
    );
  };
  const renderActions = (articleItem: Article) => (
    <div className="flex items-center justify-end gap-1.5">
      <Link
        href={getArticleHref(articleItem)}
        aria-label={
          locale === 'en'
            ? `Open ${articleItem.title} on the site`
            : `Открыть статью «${articleItem.title}» на сайте`
        }
        className={adminCx(adminSecondaryButtonClassName, 'h-9 min-h-9 w-9 px-0')}>
        <FiExternalLink aria-hidden="true" />
      </Link>
      {canManage ? (
        <>
          <Link
            href={withContentLocale(`/admin/articles/${articleItem.id}`, contentLocale)}
            className={adminCx(adminSecondaryButtonClassName, 'h-9 min-h-9 gap-1.5 px-3 text-xs')}>
            <FiEdit3 aria-hidden="true" />
            {editLabel}
          </Link>
          <form action={deleteArticleAction}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="contentLocale" value={contentLocale} />
            <input type="hidden" name="articleId" value={articleItem.id} />
            <input
              type="hidden"
              name="articleTitle"
              value={articleItem.slugSourceTitle ?? articleItem.title}
            />
            <AdminDeleteButton
              className={adminCx(adminDangerButtonClassName, 'h-9 min-h-9 w-9 px-0')}
              confirmMessage={
                locale === 'en'
                  ? `Delete article "${articleItem.title}"? This cannot be undone.`
                  : `Удалить статью «${articleItem.title}»? Это действие нельзя отменить.`
              }
              iconOnly
              pendingLabel={deletingLabel}>
              {deleteLabel}
            </AdminDeleteButton>
          </form>
        </>
      ) : null}
    </div>
  );

  return (
    <AdminShell
      session={session}
      activeTab="articles"
      backHref="/articles"
      backLabel={copy.backToSite}
      description={copy.adminSubtitle}
      contentLocale={contentLocale}
      locale={locale}
      shortcuts={shortcuts}
      stats={stats}
      title={copy.adminTitle}>
      <div>
        <AdminPanel
          id="manage-articles"
          badge={manageBadge}
          title={copy.adminExistingTitle}
          description={copy.adminPathHint}
          tone="muted"
          headerContent={
            canManage ? (
              <Link
                href={withContentLocale('/admin/articles/new', 'ru')}
                className={adminCx(adminPrimaryButtonClassName, 'gap-2')}>
                <FiPlus aria-hidden="true" />
                {openEditorLabel}
              </Link>
            ) : null
          }>
          {canManage && contentLocale === 'ru' ? (
            <ArticleDraftResumeList contentLocale={contentLocale} locale={locale} />
          ) : null}
          {topLevelStatus ? (
            <div className="mb-5">
              <AdminNotice tone="success">{topLevelStatus}</AdminNotice>
            </div>
          ) : null}
          {topLevelError ? (
            <div className="mb-5">
              <AdminNotice tone="error">{topLevelError}</AdminNotice>
            </div>
          ) : null}
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
            <>
              <div className="hidden overflow-hidden rounded-lg border border-[#0b5a45]/10 bg-white md:block">
                <table className="w-full table-fixed border-collapse text-left">
                  <thead className="bg-[#eef4ef] text-[11px] font-semibold uppercase tracking-[0.12em] text-[#567068]">
                    <tr>
                      <th className="w-[45%] px-4 py-3">
                        {locale === 'en' ? 'Article' : 'Статья'}
                      </th>
                      <th className="w-[16%] px-4 py-3">{locale === 'en' ? 'Date' : 'Дата'}</th>
                      <th className="w-[17%] px-4 py-3">
                        {locale === 'en' ? 'Translation' : 'Перевод'}
                      </th>
                      <th className="w-[22%] px-4 py-3 text-right">
                        {locale === 'en' ? 'Actions' : 'Действия'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0b5a45]/8">
                    {articles.map((articleItem) => (
                      <tr
                        key={articleItem.id}
                        id={`article-${articleItem.id}`}
                        className="scroll-mt-6 transition hover:bg-[#fbfcfa]">
                        <td className="px-4 py-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-[#0b5a45]/10 bg-[#f7f9f6]">
                              <MediaImage
                                src={resolveMediaUrl(articleItem.imageUrl)}
                                alt=""
                                fill
                                sizes="48px"
                                className="object-cover"
                                emptyState={
                                  <div className="h-full w-full bg-[linear-gradient(135deg,#dfe9df,#b1c9b3,#6d8f70)]" />
                                }
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-[#0b3e31]">
                                {articleItem.title}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-[#6a7f76]">
                                {articleItem.excerpt ||
                                  (locale === 'en'
                                    ? 'Excerpt is not filled in'
                                    : 'Описание не заполнено')}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#567068]">
                          {formatArticleDate(articleItem.publishedAt, locale)}
                        </td>
                        <td className="px-4 py-3">{renderTranslationBadge(articleItem)}</td>
                        <td className="px-4 py-3">{renderActions(articleItem)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 md:hidden">
                {articles.map((articleItem) => (
                  <article
                    key={articleItem.id}
                    id={`article-mobile-${articleItem.id}`}
                    className="rounded-lg border border-[#0b5a45]/10 bg-white p-4 shadow-[0_14px_35px_-32px_rgba(11,62,49,0.75)]">
                    <div className="flex min-w-0 gap-3">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-[#0b5a45]/10 bg-[#f7f9f6]">
                        <MediaImage
                          src={resolveMediaUrl(articleItem.imageUrl)}
                          alt=""
                          fill
                          sizes="64px"
                          className="object-cover"
                          emptyState={
                            <div className="h-full w-full bg-[linear-gradient(135deg,#dfe9df,#b1c9b3,#6d8f70)]" />
                          }
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 font-semibold text-[#0b3e31]">
                          {articleItem.title}
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-[#6a7f76]">
                          {formatArticleDate(articleItem.publishedAt, locale)}
                        </p>
                        <div className="mt-2">{renderTranslationBadge(articleItem)}</div>
                      </div>
                    </div>
                    <div className="mt-4 border-t border-[#0b5a45]/8 pt-3">
                      {renderActions(articleItem)}
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
