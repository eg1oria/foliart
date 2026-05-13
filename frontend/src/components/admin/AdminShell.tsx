import { Link } from '@/i18n/routing';
import { logoutAdminAction } from '@/lib/adminSessionActions';
import {
  contentLocales,
  getContentLocaleLabel,
  normalizeContentLocale,
  withContentLocale,
} from '@/lib/contentLocales';
import type { ReactNode } from 'react';
import { FiArrowUpRight, FiChevronRight, FiLogOut } from 'react-icons/fi';
import { LuPanelTop } from 'react-icons/lu';

import AdminTabs from './AdminTabs';
import {
  adminBadgeClassName,
  adminCx,
  adminGhostLinkClassName,
  adminMutedTextClassName,
} from './adminStyles';

type AdminStat = {
  hint?: string;
  label: string;
  value: string;
};

type AdminShortcut = {
  href: string;
  label: string;
};

export function AdminShell({
  activeTab,
  backHref,
  backLabel,
  children,
  contentLocale,
  description,
  locale,
  shortcuts = [],
  stats = [],
  title,
}: {
  activeTab: 'products' | 'articles' | 'calendars';
  backHref: string;
  backLabel: string;
  children: ReactNode;
  contentLocale: string;
  description: string;
  locale: string;
  shortcuts?: AdminShortcut[];
  stats?: AdminStat[];
  title: string;
}) {
  const safeContentLocale = normalizeContentLocale(contentLocale);
  const shortcutsTitle =
    locale === 'en'
      ? 'Quick actions'
      : '\u0411\u044b\u0441\u0442\u0440\u044b\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f';
  const signOutLabel = locale === 'en' ? 'Sign out' : '\u0412\u044b\u0439\u0442\u0438';
  const contentLanguageTitle =
    locale === 'en' ? 'Input language' : '\u042f\u0437\u044b\u043a \u043f\u043e\u043b\u0435\u0439';
  const contentLanguageHint =
    locale === 'en'
      ? 'Forms save text for the selected language.'
      : '\u0424\u043e\u0440\u043c\u044b \u0441\u043e\u0445\u0440\u0430\u043d\u044f\u044e\u0442 \u0442\u0435\u043a\u0441\u0442 \u0434\u043b\u044f \u0432\u044b\u0431\u0440\u0430\u043d\u043d\u043e\u0433\u043e \u044f\u0437\u044b\u043a\u0430.';
  const currentAdminHref = `/admin/${activeTab}`;

  return (
    <main className="relative min-h-screen bg-[#f3f5f1] pt-24 text-[#0b3e31] sm:pt-28 md:pt-52">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[#0b5a45] sm:h-28 md:h-52" />

      <section className="relative border-y border-[#0b5a45]/10 bg-white shadow-[0_14px_45px_-36px_rgba(11,62,49,0.75)]">
        <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 max-w-4xl flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-md border border-[#0b5a45]/12 bg-[#eef4ef] px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0b5a45]">
                  <LuPanelTop className="text-sm" />
                  Foliart Admin
                </span>
              </div>

              <h1 className="mt-3 text-2xl font-semibold leading-tight text-[#0b3e31] sm:text-3xl lg:text-4xl">
                {title}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#567068] sm:text-base sm:leading-7">
                {description}
              </p>

              <AdminTabs active={activeTab} contentLocale={safeContentLocale} locale={locale} />
            </div>

            <div className="flex w-full min-w-0 flex-col gap-3 xl:w-[360px] xl:shrink-0">
              <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
                <Link
                  href={backHref}
                  className={adminCx(adminGhostLinkClassName, 'w-full gap-2')}>
                  <span>{backLabel}</span>
                  <FiArrowUpRight className="shrink-0" />
                </Link>

                <form action={logoutAdminAction} className="contents">
                  <input type="hidden" name="locale" value={locale} />
                  <button
                    type="submit"
                    className={adminCx(adminGhostLinkClassName, 'w-full gap-2')}>
                    <span>{signOutLabel}</span>
                    <FiLogOut className="shrink-0" />
                  </button>
                </form>
              </div>

              {shortcuts.length > 0 ? (
                <div className="w-full rounded-lg border border-[#0b5a45]/10 bg-[#f7f9f6] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6a7f76]">
                    {shortcutsTitle}
                  </p>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
                    {shortcuts.map((shortcut) => (
                      <Link
                        key={shortcut.href}
                        href={shortcut.href}
                        className="inline-flex min-h-10 min-w-0 items-center justify-between gap-2 rounded-lg border border-[#0b5a45]/10 bg-white px-3 py-2 text-sm font-semibold text-[#0b3e31] transition hover:border-[#0b5a45]/25 hover:bg-[#eef4ef]">
                        <span>{shortcut.label}</span>
                        <FiChevronRight className="shrink-0" />
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="w-full rounded-lg border border-[#0b5a45]/10 bg-[#f7f9f6] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6a7f76]">
                  {contentLanguageTitle}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {contentLocales.map((item) => {
                    const isActive = item === safeContentLocale;

                    return (
                      <Link
                        key={item}
                        href={withContentLocale(currentAdminHref, item)}
                        className={adminCx(
                          'inline-flex min-h-10 items-center justify-center rounded-lg border px-3 py-2 text-sm font-semibold transition',
                          isActive
                            ? 'border-[#0b5a45] bg-[#0b5a45] text-white'
                            : 'border-[#0b5a45]/10 bg-white text-[#0b3e31] hover:border-[#0b5a45]/25 hover:bg-[#eef4ef]',
                        )}>
                        {getContentLocaleLabel(item)}
                      </Link>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs leading-5 text-[#6a7f76]">{contentLanguageHint}</p>
              </div>
            </div>
          </div>

          {stats.length > 0 ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="min-w-0 rounded-lg border border-[#0b5a45]/10 bg-[#f8faf7] p-4">
                  <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6a7f76]">
                    {stat.label}
                  </p>
                  <p className="mt-2 break-words text-2xl font-semibold leading-none text-[#0b3e31]">
                    {stat.value}
                  </p>
                  {stat.hint ? (
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#6a7f76]">
                      {stat.hint}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {children}
      </div>
    </main>
  );
}

export function AdminWorkspace({
  children,
  reverseOnDesktop = false,
}: {
  children: ReactNode;
  reverseOnDesktop?: boolean;
}) {
  return (
    <section
      className={adminCx(
        'grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)]',
        reverseOnDesktop && 'xl:[&>*:first-child]:order-2 xl:[&>*:last-child]:order-1',
      )}>
      {children}
    </section>
  );
}

export function AdminPanel({
  badge,
  children,
  className,
  description,
  headerContent,
  id,
  title,
  tone = 'default',
}: {
  badge?: string;
  children: ReactNode;
  className?: string;
  description?: string;
  headerContent?: ReactNode;
  id?: string;
  title: string;
  tone?: 'default' | 'muted';
}) {
  return (
    <section
      id={id}
      className={adminCx(
        'min-w-0 rounded-lg border p-4 shadow-[0_18px_45px_-38px_rgba(11,62,49,0.8)] sm:p-5 lg:p-6',
        tone === 'default' ? 'border-[#0b5a45]/10 bg-white' : 'border-[#0b5a45]/10 bg-[#fbfaf6]',
        className,
      )}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 max-w-3xl">
          {badge ? <p className={adminBadgeClassName}>{badge}</p> : null}
          <h2 className="mt-3 text-xl font-semibold leading-tight text-[#0b3e31] sm:text-2xl">
            {title}
          </h2>
          {description ? (
            <p className={adminCx('mt-3', adminMutedTextClassName)}>{description}</p>
          ) : null}
        </div>

        {headerContent ? <div className="min-w-0 shrink-0">{headerContent}</div> : null}
      </div>

      <div className="mt-6">{children}</div>
    </section>
  );
}

export function AdminNotice({
  children,
  tone,
}: {
  children: ReactNode;
  tone: 'success' | 'error';
}) {
  return (
    <div
      className={adminCx(
        'rounded-lg border px-4 py-3 text-sm leading-6',
        tone === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-rose-200 bg-rose-50 text-rose-800',
      )}>
      {children}
    </div>
  );
}

export function AdminEmptyState({
  badge,
  description,
  title,
}: {
  badge?: string;
  description: string;
  title: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-[#0b5a45]/18 bg-white/70 px-5 py-8 text-center sm:px-8">
      {badge ? <p className={adminBadgeClassName}>{badge}</p> : null}
      <h3 className="mt-4 text-lg font-semibold text-[#0b3e31]">{title}</h3>
      <p className={adminCx('mt-2', adminMutedTextClassName)}>{description}</p>
    </div>
  );
}
