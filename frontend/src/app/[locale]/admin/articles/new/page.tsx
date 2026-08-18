import { redirect } from 'next/navigation';
import { FiArrowLeft } from 'react-icons/fi';

import { AdminPanel, AdminShell } from '@/components/admin/AdminShell';
import ArticleDraftForm from '@/components/admin/ArticleDraftForm';
import { adminCx, adminSecondaryButtonClassName } from '@/components/admin/adminStyles';
import { Link } from '@/i18n/routing';
import { requireAdminSection } from '@/lib/adminAuthServer';
import { getArticlesCopy } from '@/lib/articles';
import { normalizeContentLocale, withContentLocale } from '@/lib/contentLocales';

export default async function NewArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ contentLocale?: string; draft?: string }>;
}) {
  const { locale } = await params;
  const session = await requireAdminSection(locale, 'articles', 'manage', `/${locale}/admin/articles/new`);
  const { contentLocale: requestedLocale, draft } = await searchParams;
  const contentLocale = normalizeContentLocale(requestedLocale);
  if (contentLocale !== 'ru') {
    redirect(`/${locale}/admin/articles/new`);
  }
  const copy = getArticlesCopy(locale);

  return (
    <AdminShell
      session={session}
      activeTab="articles"
      backHref={withContentLocale('/admin/articles', contentLocale)}
      backLabel={locale === 'ru' ? 'К списку статей' : 'Back to articles'}
      description={copy.adminFormDescription}
      contentLocale={contentLocale}
      locale={locale}
      shortcuts={[]}
      stats={[]}
      title={copy.adminFormTitle}
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-4">
          <Link
            href={withContentLocale('/admin/articles', contentLocale)}
            className={adminCx(adminSecondaryButtonClassName, 'gap-2')}>
            <FiArrowLeft aria-hidden="true" />
            {locale === 'ru' ? 'Назад к статьям' : 'Back to articles'}
          </Link>
        </div>

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
      </div>
    </AdminShell>
  );
}
