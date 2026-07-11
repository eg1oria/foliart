import { notFound } from 'next/navigation';
import { AdminPanel, AdminShell, AdminWorkspace } from '@/components/admin/AdminShell';
import ArticleDraftForm from '@/components/admin/ArticleDraftForm';
import { requireAdminSession } from '@/lib/adminAuthServer';
import { getArticlesCopy } from '@/lib/articles';
import { normalizeContentLocale } from '@/lib/contentLocales';

export default async function EditArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; articleId: string }>;
  searchParams: Promise<{ contentLocale?: string }>;
}) {
  const { locale, articleId: rawArticleId } = await params;
  await requireAdminSession(locale, `/${locale}/admin/articles/${rawArticleId}`);
  const articleId = Number(rawArticleId);
  if (!Number.isInteger(articleId) || articleId < 1) notFound();
  const { contentLocale: requestedLocale } = await searchParams;
  const contentLocale = normalizeContentLocale(requestedLocale);
  const copy = getArticlesCopy(locale);

  return (
    <AdminShell
      activeTab="articles"
      backHref="/admin/articles"
      backLabel={locale === 'ru' ? 'К списку статей' : 'Back to articles'}
      description={copy.adminSubtitle}
      contentLocale={contentLocale}
      locale={locale}
      shortcuts={[]}
      stats={[]}
      title={copy.editLabel}
    >
      <AdminWorkspace>
        <AdminPanel
          id="article-editor"
          badge={`#${articleId}`}
          title={copy.editLabel}
          description={copy.adminFormDescription}
        >
          <ArticleDraftForm
            articleId={articleId}
            contentLocale={contentLocale}
            locale={locale}
          />
        </AdminPanel>
      </AdminWorkspace>
    </AdminShell>
  );
}
