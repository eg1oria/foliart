import { notFound } from 'next/navigation';
import { FiArrowLeft, FiExternalLink } from 'react-icons/fi';

import {
  AdminEmptyState,
  AdminNotice,
  AdminPanel,
  AdminShell,
} from '@/components/admin/AdminShell';
import SitePageEditor from '@/components/admin/site-pages/SitePageEditor';
import SitePageSettingsForm from '@/components/admin/site-pages/SitePageSettingsForm';
import { adminCx, adminSecondaryButtonClassName } from '@/components/admin/adminStyles';
import { Link } from '@/i18n/routing';
import { requireAdminSection } from '@/lib/adminAuthServer';
import { canManageSection } from '@/lib/adminPermissions';
import { parseEntityId } from '@/lib/catalog';
import {
  contentLocales,
  getContentLocaleLabel,
  normalizeContentLocale,
  withContentLocale,
} from '@/lib/contentLocales';
import { getSitePageLocaleStates } from '@/lib/sitePages';
import { getSitePageDetails } from '@/lib/sitePagesApi';

const localeStateDots = {
  published: 'bg-emerald-500',
  draft: 'bg-amber-400',
  empty: 'bg-[#cfd8d3]',
} as const;

export default async function EditSitePagePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; pageId: string }>;
  searchParams: Promise<{ contentLocale?: string; status?: string }>;
}) {
  const { locale, pageId: rawPageId } = await params;
  const session = await requireAdminSection(
    locale,
    'site-pages',
    'view',
    `/${locale}/admin/site-pages/${rawPageId}`,
  );
  const pageId = parseEntityId(rawPageId);
  if (!pageId) notFound();

  const canManage = canManageSection(session, 'site-pages');
  const query = await searchParams;
  const contentLocale = normalizeContentLocale(query.contentLocale);
  const result = await getSitePageDetails(pageId);

  if (!result.ok && result.status === 404) {
    notFound();
  }

  const page = result.ok ? result.data : null;
  const translation = page?.translations.find((item) => item.locale === contentLocale) ?? null;
  const sourceTranslation = page?.translations.find((item) => item.locale === 'ru') ?? null;
  const states = page ? getSitePageLocaleStates(page.translations) : null;
  const title = sourceTranslation?.title || page?.slug || `Страница #${pageId}`;
  const isLive = translation?.published ?? false;

  return (
    <AdminShell
      description="HTML и тексты задаются отдельно для каждого языка — переключайте язык вкладками ниже или в шапке."
      title={title}>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/admin/site-pages" className={adminCx(adminSecondaryButtonClassName, 'gap-2')}>
            <FiArrowLeft aria-hidden="true" />
            Назад к страницам
          </Link>
          {page && isLive ? (
            <a
              href={`/${contentLocale}/${page.slug}`}
              target="_blank"
              rel="noreferrer"
              className={adminCx(adminSecondaryButtonClassName, 'gap-2')}>
              <FiExternalLink aria-hidden="true" />
              Открыть на сайте ({getContentLocaleLabel(contentLocale)})
            </a>
          ) : null}
        </div>

        {query.status === 'created' ? (
          <AdminNotice tone="success">
            Страница создана. Вставьте HTML, проверьте предпросмотр и опубликуйте нужные языки.
          </AdminNotice>
        ) : null}

        {!page || !states ? (
          <AdminPanel title="Страница">
            <div className="space-y-5">
              <AdminNotice tone="error">Не удалось загрузить страницу.</AdminNotice>
              <AdminEmptyState
                badge="Ошибка загрузки"
                title="Редактор временно недоступен"
                description="Проверьте backend API и обновите страницу."
              />
            </div>
          </AdminPanel>
        ) : (
          <>
            <AdminPanel
              title={`Содержимое · ${getContentLocaleLabel(contentLocale)}`}
              description={
                contentLocale === 'ru'
                  ? 'Русская версия. Другие языки заполняются отдельно — можно начать с копии этого HTML.'
                  : 'Эта версия показывается на сайте только по адресу своего языка.'
              }
              headerContent={
                <nav
                  aria-label="Язык версии"
                  className="flex items-center gap-0.5 rounded-lg border border-[#0b5a45]/12 bg-[#f5f8f4] p-1">
                  {contentLocales.map((item) => (
                    <Link
                      key={item}
                      href={withContentLocale(`/admin/site-pages/${page.id}`, item)}
                      scroll={false}
                      aria-current={item === contentLocale ? 'page' : undefined}
                      className={adminCx(
                        'inline-flex h-8 min-w-12 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-semibold transition',
                        item === contentLocale
                          ? 'bg-[#0b5a45] text-white'
                          : 'text-[#6a7f76] hover:bg-white hover:text-[#0b3e31]',
                      )}>
                      <span
                        aria-hidden="true"
                        className={adminCx('h-1.5 w-1.5 rounded-full', localeStateDots[states[item]])}
                      />
                      {getContentLocaleLabel(item)}
                    </Link>
                  ))}
                </nav>
              }>
              <SitePageEditor
                key={`${page.id}:${contentLocale}`}
                canManage={canManage}
                contentLocale={contentLocale}
                images={page.images}
                locale={locale}
                pageId={page.id}
                slug={page.slug}
                sourceTranslation={sourceTranslation}
                translation={translation}
              />
            </AdminPanel>

            {canManage ? (
              <AdminPanel
                tone="muted"
                title="Настройки страницы"
                description="Общие для всех языков: адрес, вид страницы и полоса под шапкой сайта.">
                <SitePageSettingsForm
                  bandColor={page.bandColor}
                  displayMode={page.displayMode}
                  locale={locale}
                  mode="edit"
                  pageId={page.id}
                  showTitle={page.showTitle}
                  slug={page.slug}
                />
              </AdminPanel>
            ) : null}
          </>
        )}
      </div>
    </AdminShell>
  );
}
