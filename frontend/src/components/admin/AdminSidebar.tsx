'use client';

import { Link } from '@/i18n/routing';
import type { AdminSessionUser } from '@/lib/adminPermissions';
import { logoutAdminAction } from '@/lib/adminSessionActions';
import { withContentLocale } from '@/lib/contentLocales';
import { getFullLogo } from '@/lib/logo';
import Image from 'next/image';
import { FiArrowUpRight, FiChevronRight, FiLogOut, FiX } from 'react-icons/fi';
import { LuPanelLeftClose } from 'react-icons/lu';

import {
  adminAccountNavItem,
  getAdminNavStrings,
  getVisibleAdminNavItems,
  type AdminNavItem,
  type AdminTabKey,
} from './adminNav';
import { adminCx } from './adminStyles';

const navLinkClassName =
  'group flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40';
const navLinkIdleClassName = 'text-white hover:bg-white/12';
const navLinkActiveClassName = 'bg-white text-[#0b3e31] shadow-[0_10px_24px_-16px_rgba(0,0,0,0.6)]';
const navGroupLabelClassName =
  'px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55';
const iconButtonClassName =
  'h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white/80 transition hover:bg-white/12 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40';
const footerLinkClassName =
  'flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white transition hover:bg-white/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40';

export function AdminSidebar({
  activeTab,
  collapsed,
  contentLocale,
  labels,
  locale,
  onNavigate,
  onToggleCollapsed,
  open,
  session,
}: {
  activeTab: AdminTabKey;
  collapsed: boolean;
  contentLocale: string;
  labels: {
    account: string;
    close: string;
    collapse: string;
    expand: string;
    navigation: string;
    openSite: string;
    sections: string;
    signOut: string;
    superAdmin: string;
  };
  locale: string;
  onNavigate: () => void;
  onToggleCollapsed: () => void;
  open: boolean;
  session: AdminSessionUser;
}) {
  const strings = getAdminNavStrings(locale);
  const items = getVisibleAdminNavItems(session);
  const accountStrings = strings[adminAccountNavItem.key];
  const AccountIcon = adminAccountNavItem.icon;
  const isAccountActive = activeTab === adminAccountNavItem.key;
  const fullLogo = getFullLogo(locale);

  // Collapsing only applies from `lg` up: below that the sidebar is a drawer,
  // which is always shown at full width.
  const collapsedRow = collapsed && 'lg:justify-center lg:gap-0 lg:px-0';
  const collapsedLabel = collapsed ? 'lg:sr-only' : undefined;
  const collapsedDecoration = collapsed && 'lg:hidden';

  const renderLink = ({ href, icon: Icon, key }: AdminNavItem) => {
    const isActive = key === activeTab;
    const { description, label } = strings[key];

    return (
      <Link
        key={key}
        href={withContentLocale(href, contentLocale)}
        aria-current={isActive ? 'page' : undefined}
        onClick={onNavigate}
        title={collapsed ? label : description}
        className={adminCx(
          navLinkClassName,
          collapsedRow,
          isActive ? navLinkActiveClassName : navLinkIdleClassName,
        )}>
        <Icon
          aria-hidden="true"
          className={adminCx(
            'h-4.5 w-4.5 shrink-0 transition',
            isActive ? 'text-[#0b5a45]' : 'text-white/80 group-hover:text-white',
          )}
        />
        <span className={adminCx('truncate', collapsedLabel)}>{label}</span>
      </Link>
    );
  };

  return (
    <aside
      aria-label={labels.navigation}
      className={adminCx(
        'fixed inset-y-0 left-0 z-50 flex w-[17rem] flex-col bg-[#0b3e31] text-white transition-transform duration-200 ease-out',
        'lg:visible lg:translate-x-0 lg:transition-[width] lg:duration-200',
        collapsed ? 'lg:w-[4.5rem]' : 'lg:w-64',
        open
          ? 'translate-x-0 shadow-[0_0_60px_-15px_rgba(11,62,49,0.55)]'
          : 'invisible -translate-x-full',
      )}>
      {/* The wordmark is a wide lockup (mark + FOLIART + tagline), so it gets a
          block of its own instead of being squeezed into a toolbar-height row.
          The collapsed rail falls back to the compact monogram. */}
      <div
        className={adminCx(
          'relative flex h-20 shrink-0 items-center justify-start border-b border-white/10 px-6',
          collapsed && 'lg:h-16 lg:justify-center lg:px-0',
        )}>
        <Image
          src={fullLogo.src}
          alt="Foliart"
          width={fullLogo.width}
          height={fullLogo.height}
          priority
          className={adminCx('h-auto w-[112px] shrink-0', collapsedDecoration)}
        />

        <button
          type="button"
          onClick={onNavigate}
          aria-label={labels.close}
          className={adminCx(iconButtonClassName, 'absolute right-3 top-1/2 -translate-y-1/2 inline-flex lg:hidden')}>
          <FiX className="h-4.5 w-4.5" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={labels.collapse}
          title={labels.collapse}
          className={adminCx(
            iconButtonClassName,
            'absolute right-3 top-1/2 -translate-y-1/2',
            collapsed ? 'hidden' : 'hidden lg:inline-flex',
          )}>
          <LuPanelLeftClose className="h-4.5 w-4.5" aria-hidden="true" />
        </button>

        {/* A 72px rail has no room for the mark and a separate control, so the
            monogram is the control that brings the panel back. */}
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={labels.expand}
          title={labels.expand}
          className={adminCx(
            'h-9 w-9 shrink-0 cursor-pointer rounded-full transition hover:ring-2 hover:ring-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
            collapsed ? 'hidden lg:block' : 'hidden',
          )}>
          <Image
            src="/logo-small.webp"
            alt="Foliart"
            width={201}
            height={200}
            priority
            className="h-9 w-9 rounded-full"
          />
        </button>
      </div>

      <nav
        aria-label={labels.sections}
        className="flex-1 overflow-y-auto px-3 py-4 [scrollbar-width:thin]">
        <p className={adminCx(navGroupLabelClassName, collapsedDecoration)}>{labels.sections}</p>
        <div className="flex flex-col gap-1">{items.map(renderLink)}</div>
      </nav>

      <div className="shrink-0 border-t border-white/10 p-3">
        <Link
          href={withContentLocale(adminAccountNavItem.href, contentLocale)}
          onClick={onNavigate}
          aria-current={isAccountActive ? 'page' : undefined}
          aria-label={`${labels.account}: ${session.username}`}
          title={collapsed ? `${labels.account}: ${session.username}` : accountStrings.description}
          className={adminCx(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
            collapsedRow,
            collapsed && 'lg:py-2',
            isAccountActive ? 'bg-white text-[#0b3e31]' : 'bg-white/10 text-white hover:bg-white/16',
          )}>
          <AccountIcon
            aria-hidden="true"
            className={adminCx(
              'h-4.5 w-4.5 shrink-0',
              isAccountActive ? 'text-[#0b5a45]' : 'text-white/80',
            )}
          />
          <span className={adminCx('min-w-0 flex-1', collapsedDecoration)}>
            <span className="block truncate text-sm font-semibold leading-tight">
              {session.username}
            </span>
            <span
              className={adminCx(
                'block truncate text-[11px] leading-tight',
                isAccountActive ? 'text-[#567068]' : 'text-white/65',
              )}>
              {session.isSuperAdmin ? labels.superAdmin : labels.account}
            </span>
          </span>
          <FiChevronRight
            aria-hidden="true"
            className={adminCx(
              'h-4 w-4 shrink-0',
              collapsedDecoration,
              isAccountActive ? 'text-[#7b9189]' : 'text-white/50',
            )}
          />
        </Link>

        <div className="mt-2 flex flex-col gap-1">
          <Link
            href="/"
            onClick={onNavigate}
            title={collapsed ? labels.openSite : undefined}
            className={adminCx(footerLinkClassName, collapsedRow)}>
            <FiArrowUpRight aria-hidden="true" className="h-4.5 w-4.5 shrink-0 text-white/80" />
            <span className={adminCx('truncate', collapsedLabel)}>{labels.openSite}</span>
          </Link>

          <form action={logoutAdminAction}>
            <input type="hidden" name="locale" value={locale} />
            <button
              type="submit"
              title={collapsed ? labels.signOut : undefined}
              className={adminCx(
                footerLinkClassName,
                collapsedRow,
                'w-full text-left hover:bg-red-500/20 hover:text-red-100',
              )}>
              <FiLogOut aria-hidden="true" className="h-4.5 w-4.5 shrink-0 text-white/80" />
              <span className={adminCx('truncate', collapsedLabel)}>{labels.signOut}</span>
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
