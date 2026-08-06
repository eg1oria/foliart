import { notFound } from 'next/navigation';
import { FiArrowLeft } from 'react-icons/fi';

import { AdminPanel, AdminShell } from '@/components/admin/AdminShell';
import ArticleDraftForm from '@/components/admin/ArticleDraftForm';
import { adminCx, adminSecondaryButtonClassName } from '@/components/admin/adminStyles';
import { Link } from '@/i18n/routing';
import { requireAdminSession } from '@/lib/adminAuthServer';
import { getArticlesCopy } from '@/lib/articles';
import { normalizeContentLocale, withContentLocale } from '@/lib/contentLocales';

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
      backHref={withContentLocale('/admin/articles', contentLocale)}
      backLabel={locale === 'ru' ? 'К списку статей' : 'Back to articles'}
      description={copy.adminSubtitle}
      contentLocale={contentLocale}
      locale={locale}
      shortcuts={[]}
      stats={[]}
      title={copy.editLabel}
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
          badge={`#${articleId}`}
          title={copy.editLabel}
          description={copy.adminFormDescription}
        >
          <ArticleDraftForm
            key={`${articleId}:${contentLocale}`}
            articleId={articleId}
            contentLocale={contentLocale}
            locale={locale}
          />
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
