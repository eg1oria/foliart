import { Link } from '@/i18n/routing';
import type { ReactNode } from 'react';
import { FiArrowUpRight, FiChevronRight } from 'react-icons/fi';
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
  description,
  locale,
  shortcuts = [],
  title,
}: {
  activeTab: 'products' | 'articles' | 'calendars';
  backHref: string;
  backLabel: string;
  children: ReactNode;
  description: string;
  locale: string;
  shortcuts?: AdminShortcut[];
  stats?: AdminStat[];
  title: string;
}) {
  const shortcutsTitle =
    locale === 'en'
      ? 'Quick actions'
      : '\u0411\u044b\u0441\u0442\u0440\u044b\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044f';

  return (
    <main className="relative mx-auto flex w-full max-w-[96rem] flex-1 flex-col px-4 pb-16 pt-50 sm:px-6 sm:pb-20 lg:px-8 lg:pt-54">
      <div className="pointer-events-none absolute inset-x-0 top-24 -z-10 h-80 bg-[radial-gradient(circle_at_top,rgba(11,90,69,0.18),transparent_68%)] blur-3xl" />

      <section className="overflow-hidden rounded-[2.2rem] border border-[#0b5a45]/10 bg-[linear-gradient(135deg,#0b5a45,#0a3e31_55%,#082b23)] px-5 py-6 text-white shadow-[0_35px_120px_-65px_rgba(11,62,49,1)] sm:px-8 sm:py-8 lg:px-10 lg:py-10">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#d8ead8]">
                <LuPanelTop className="text-sm" />
                Foliart Admin
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
              {title}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/78 sm:text-base lg:text-lg">
              {description}
            </p>

            <AdminTabs active={activeTab} locale={locale} />
          </div>

          <div className="flex w-full flex-col gap-3 xl:w-auto xl:min-w-[270px] xl:items-end">
            <Link href={backHref} className={adminGhostLinkClassName}>
              <span>{backLabel}</span>
              <FiArrowUpRight className="ml-2" />
            </Link>

            {shortcuts.length > 0 ? (
              <div className="w-full rounded-[1.5rem] border border-white/12 bg-white/8 p-4 backdrop-blur-sm xl:max-w-[320px]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#d8ead8]">
                  {shortcutsTitle}
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  {shortcuts.map((shortcut) => (
                    <Link
                      key={shortcut.href}
                      href={shortcut.href}
                      className="inline-flex items-center justify-between rounded-[1rem] border border-white/10 bg-white/8 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/14">
                      <span>{shortcut.label}</span>
                      <FiChevronRight className="shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {children}
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
        'mt-8 grid gap-6 xl:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)]',
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
        'rounded-[1.9rem] border p-5 shadow-[0_28px_90px_-64px_rgba(11,62,49,0.95)] sm:p-6 lg:p-8',
        tone === 'default' ? 'border-[#0b5a45]/10 bg-white' : 'border-[#0b5a45]/10 bg-[#f7f6f1]',
        className,
      )}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          {badge ? <p className={adminBadgeClassName}>{badge}</p> : null}
          <h2 className="mt-3 text-2xl font-semibold text-[#0b3e31] sm:text-[2rem]">{title}</h2>
          {description ? (
            <p className={adminCx('mt-3', adminMutedTextClassName)}>{description}</p>
          ) : null}
        </div>

        {headerContent ? <div className="shrink-0">{headerContent}</div> : null}
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
        'rounded-[1.2rem] border px-4 py-3 text-sm leading-6',
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
    <div className="rounded-[1.5rem] border border-dashed border-[#0b5a45]/18 bg-white/70 px-5 py-8 text-center sm:px-8">
      {badge ? <p className={adminBadgeClassName}>{badge}</p> : null}
      <h3 className="mt-4 text-lg font-semibold text-[#0b3e31]">{title}</h3>
      <p className={adminCx('mt-2', adminMutedTextClassName)}>{description}</p>
    </div>
  );
}
