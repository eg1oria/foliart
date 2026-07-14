import { redirect } from 'next/navigation';
import { AdminPanel, AdminShell, AdminWorkspace } from '@/components/admin/AdminShell';
import ArticleDraftForm from '@/components/admin/ArticleDraftForm';
import { requireAdminSession } from '@/lib/adminAuthServer';
import { getArticlesCopy } from '@/lib/articles';
import { normalizeContentLocale } from '@/lib/contentLocales';

export default async function NewArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ contentLocale?: string; draft?: string }>;
}) {
  const { locale } = await params;
  await requireAdminSession(locale, `/${locale}/admin/articles/new`);
  const { contentLocale: requestedLocale, draft } = await searchParams;
  const contentLocale = normalizeContentLocale(requestedLocale);
  if (contentLocale !== 'ru') {
    redirect(`/${locale}/admin/articles/new`);
  }
  const copy = getArticlesCopy(locale);

  return (
    <AdminShell
      activeTab="articles"
      backHref="/admin/articles"
      backLabel={locale === 'ru' ? 'К списку статей' : 'Back to articles'}
      description={copy.adminFormDescription}
      contentLocale={contentLocale}
      locale={locale}
      shortcuts={[]}
      stats={[]}
      title={copy.adminFormTitle}
    >
      <AdminWorkspace>
        <AdminPanel
          id="article-editor"
          badge={locale === 'ru' ? 'Черновик' : 'Draft'}
          title={copy.adminFormTitle}
          description={copy.adminFormDescription}
        >
          <ArticleDraftForm
            contentLocale={contentLocale}
            draftId={draft}
            locale={locale}
          />
        </AdminPanel>
      </AdminWorkspace>
    </AdminShell>
  );
}
