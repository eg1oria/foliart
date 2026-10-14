import { FiEdit3, FiExternalLink, FiMaximize, FiPlus, FiSidebar } from 'react-icons/fi';

import AdminDeleteButton from '@/components/admin/AdminDeleteButton';
import {
  AdminEmptyState,
  AdminNotice,
  AdminPanel,
  AdminShell,
} from '@/components/admin/AdminShell';
import {
  adminCx,
  adminDangerButtonClassName,
  adminPrimaryButtonClassName,
  adminSecondaryButtonClassName,
} from '@/components/admin/adminStyles';
import { Link } from '@/i18n/routing';
import { requireAdminSection } from '@/lib/adminAuthServer';
import { canManageSection } from '@/lib/adminPermissions';
import { contentLocales, getContentLocaleLabel, withContentLocale } from '@/lib/contentLocales';
import { getSitePageLocaleStates, type SitePageLocaleState } from '@/lib/sitePages';
import { listSitePages } from '@/lib/sitePagesApi';

import { deleteSitePageAction } from './actions';

const localeStateClassNames: Record<SitePageLocaleState, string> = {
  published: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  draft: 'border-amber-200 bg-amber-50 text-amber-800',
  empty: 'border-[#0b5a45]/10 bg-white text-[#a3b2ab]',
};

const localeStateLabels: Record<SitePageLocaleState, string> = {
  published: 'опубликована',
  draft: 'черновик',
  empty: 'не заполнена',
};

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Moscow',
});

export default async function AdminSitePagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; status?: string }>;
}) {
  const { locale } = await params;
  const session = await requireAdminSection(
    locale,
    'site-pages',
    'view',
    `/${locale}/admin/site-pages`,
  );
  const canManage = canManageSection(session, 'site-pages');
  const query = await searchParams;
  const result = await listSitePages();
  const successMessage = query.status === 'deleted' ? 'Страница удалена.' : null;

  return (
    <AdminShell
      description="Новые страницы сайта из вашего HTML — у каждой свой адрес и отдельная версия для каждого языка."
      title="Страницы">
      <div className="mx-auto max-w-6xl">
        {canManage ? (
          <div className="mb-4 flex justify-end">
            <Link href="/admin/site-pages/new" className={adminCx(adminPrimaryButtonClassName, 'gap-2')}>
              <FiPlus aria-hidden="true" />
              Создать страницу
            </Link>
          </div>
        ) : null}

        {successMessage ? <AdminNotice tone="success">{successMessage}</AdminNotice> : null}
        {query.error ? <AdminNotice tone="error">{query.error}</AdminNotice> : null}

        <AdminPanel
          className="mt-4"
          title="Все страницы"
          description="Язык виден на сайте, только когда его версия опубликована. Остальные адреса отвечают «страница не найдена».">
          {!result.ok ? (
            <div className="space-y-5">
              <AdminNotice tone="error">Не удалось загрузить страницы.</AdminNotice>
              <AdminEmptyState
                badge="Ошибка загрузки"
                title="Список временно недоступен"
                description="Проверьте backend API и обновите страницу."
              />
            </div>
          ) : result.data.length === 0 ? (
            <AdminEmptyState
              badge="Пусто"
              title="Страниц пока нет"
              description="Создайте страницу, вставьте HTML и опубликуйте — она откроется по своему адресу на сайте."
            />
          ) : (
            <div className="overflow-hidden rounded-lg border border-[#0b5a45]/10 bg-white">
              <div className="hidden grid-cols-[minmax(0,1fr)_184px_104px_184px] gap-4 bg-[#eef4ef] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#567068] md:grid">
                <span>Страница</span>
                <span>Языки</span>
                <span>Изменена</span>
                <span className="text-right">Действия</span>
              </div>
              <div className="divide-y divide-[#0b5a45]/8">
                {result.data.map((page) => {
                  const states = getSitePageLocaleStates(page.translations);
                  const title =
                    page.translations.find((item) => item.locale === 'ru')?.title ||
                    page.translations.find((item) => item.title)?.title ||
                    'Без заголовка';
                  const liveLocale = contentLocales.find((item) => states[item] === 'published');
                  const ModeIcon = page.displayMode === 'fullscreen' ? FiMaximize : FiSidebar;

                  return (
                    <article
                      key={page.id}
                      className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1fr)_184px_104px_184px] md:items-center md:gap-4">
                      <div className="min-w-0">
                        <h2 className="truncate font-semibold text-[#0b3e31]">{title}</h2>
                        <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-[#6a7f76]">
                          <ModeIcon
                            aria-label={page.displayMode === 'fullscreen' ? 'На весь экран' : 'Внутри сайта'}
                            className="shrink-0"
                          />
                          <code className="truncate">/{'{язык}'}/{page.slug}</code>
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {contentLocales.map((item) => (
                          <Link
                            key={item}
                            href={withContentLocale(`/admin/site-pages/${page.id}`, item)}
                            title={`${getContentLocaleLabel(item)}: ${localeStateLabels[states[item]]}`}
                            className={adminCx(
                              'inline-flex h-7 min-w-10 items-center justify-center rounded-md border px-2 text-[11px] font-semibold transition hover:opacity-80',
                              localeStateClassNames[states[item]],
                            )}>
                            {getContentLocaleLabel(item)}
                          </Link>
                        ))}
                      </div>

                      <p className="text-sm text-[#567068]">
                        {dateFormatter.format(new Date(page.updatedAt))}
                      </p>

                      <div className="flex items-center justify-end gap-2">
                        {liveLocale ? (
                          <a
                            href={`/${liveLocale}/${page.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Открыть на сайте"
                            className={adminCx(adminSecondaryButtonClassName, 'h-9 min-h-9 w-9 px-0')}>
                            <FiExternalLink aria-hidden="true" />
                          </a>
                        ) : null}
                        <Link
                          href={withContentLocale(`/admin/site-pages/${page.id}`, 'ru')}
                          className={adminCx(adminSecondaryButtonClassName, 'h-9 min-h-9 gap-1.5 px-3 text-xs')}>
                          <FiEdit3 aria-hidden="true" />
                          {canManage ? 'Изменить' : 'Открыть'}
                        </Link>
                        {canManage ? (
                          <form action={deleteSitePageAction}>
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="pageId" value={page.id} />
                            <AdminDeleteButton
                              className={adminCx(adminDangerButtonClassName, 'h-9 min-h-9 w-9 px-0')}
                              confirmMessage={`Удалить страницу «${title}» на всех языках вместе с её изображениями?`}
                              iconOnly
                              pendingLabel="Удаление…">
                              Удалить
                            </AdminDeleteButton>
                          </form>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
