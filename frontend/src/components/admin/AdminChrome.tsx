'use client';

import { Link, usePathname } from '@/i18n/routing';
import type { AdminSessionUser } from '@/lib/adminPermissions';
import {
  contentLocales,
  getContentLocaleLabel,
  normalizeContentLocale,
} from '@/lib/contentLocales';
import { useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { FiMenu } from 'react-icons/fi';

import { AdminSidebar } from './AdminSidebar';
import { useAdminSidebarState } from './AdminSidebarState';
import { getActiveAdminTab, getAdminNavStrings } from './adminNav';
import { adminCx } from './adminStyles';

const i18n: Record<string, Record<string, string>> = {
  en: {
    closeMenu: 'Close menu',
    collapseSidebar: 'Collapse sidebar',
    expandSidebar: 'Expand sidebar',
    inputLanguage: 'Input language',
    inputLanguageHint: 'Forms save text for the selected language.',
    navigation: 'Admin navigation',
    openMenu: 'Open menu',
    openSite: 'Open site',
    profile: 'Profile',
    sections: 'Sections',
    signOut: 'Sign out',
    superAdmin: 'Super admin',
    translationLanguage: 'Translation language',
    translationLanguageHint: 'Pick the language whose messages you want to edit.',
  },
  ru: {
    closeMenu: 'Закрыть меню',
    collapseSidebar: 'Свернуть панель',
    expandSidebar: 'Развернуть панель',
    inputLanguage: 'Язык полей',
    inputLanguageHint: 'Формы сохраняют текст для выбранного языка.',
    navigation: 'Навигация админки',
    openMenu: 'Открыть меню',
    openSite: 'Открыть сайт',
    profile: 'Профиль',
    sections: 'Разделы',
    signOut: 'Выйти',
    superAdmin: 'Супер-админ',
    translationLanguage: 'Язык перевода',
    translationLanguageHint: 'Выберите язык, сообщения которого нужно изменить.',
  },
};

function t(locale: string, key: string): string {
  return i18n[locale]?.[key] ?? i18n['en'][key] ?? key;
}

// Login and the no-access dead end are admin routes without a panel: they get
// no sidebar, so the chrome steps aside for them.
const chromelessPaths = ['/admin/login', '/admin/no-access'];

export function AdminChrome({
  children,
  locale,
  session,
}: {
  children: ReactNode;
  locale: string;
  session: AdminSessionUser | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = getActiveAdminTab(pathname);

  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const { collapsed, toggleCollapsed } = useAdminSidebarState();

  // The drawer only exists below `lg`; keep it from leaking into the desktop
  // layout (and from locking scroll) when the viewport grows.
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)');
    const handleChange = (event: MediaQueryListEvent) => {
      if (event.matches) setMenuOpen(false);
    };

    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  if (!session || !activeTab || chromelessPaths.includes(pathname)) {
    return <>{children}</>;
  }

  const contentLocale = normalizeContentLocale(searchParams.get('contentLocale'));
  const isMessages = activeTab === 'messages';
  const localeSwitcherTitle = t(locale, isMessages ? 'translationLanguage' : 'inputLanguage');
  const localeSwitcherHint = t(
    locale,
    isMessages ? 'translationLanguageHint' : 'inputLanguageHint',
  );
  const sectionLabel = getAdminNavStrings(locale)[activeTab].label;

  // Switching the content language keeps you on the current screen, filters and
  // all, instead of bouncing back to the section root.
  const contentLocaleHref = (target: string) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('contentLocale', target);

    return `${pathname}?${nextParams.toString()}`;
  };

  return (
    <div className="min-h-screen bg-[#f3f5f1] text-[#0b3e31]">
      <AdminSidebar
        activeTab={activeTab}
        collapsed={collapsed}
        contentLocale={contentLocale}
        labels={{
          account: t(locale, 'profile'),
          close: t(locale, 'closeMenu'),
          collapse: t(locale, 'collapseSidebar'),
          expand: t(locale, 'expandSidebar'),
          navigation: t(locale, 'navigation'),
          openSite: t(locale, 'openSite'),
          sections: t(locale, 'sections'),
          signOut: t(locale, 'signOut'),
          superAdmin: t(locale, 'superAdmin'),
        }}
        locale={locale}
        onNavigate={closeMenu}
        onToggleCollapsed={toggleCollapsed}
        open={menuOpen}
        session={session}
      />

      <div
        aria-hidden="true"
        onClick={closeMenu}
        className={adminCx(
          'fixed inset-0 z-40 bg-[#0b3e31]/35 backdrop-blur-[2px] transition-opacity duration-200 lg:hidden',
          menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      <div
        className={adminCx(
          'flex min-h-screen flex-col transition-[padding] duration-200',
          collapsed ? 'lg:pl-[4.5rem]' : 'lg:pl-64',
        )}>
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-[#0b5a45]/10 bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label={t(locale, 'openMenu')}
            aria-expanded={menuOpen}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#0b5a45]/12 text-[#0b3e31] transition hover:bg-[#eef4ef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b5a45]/25 lg:hidden">
            <FiMenu className="h-4.5 w-4.5" aria-hidden="true" />
          </button>

          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[#0b3e31]">
            {sectionLabel}
          </p>

          <div className="flex shrink-0 items-center gap-2.5">
            <span className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-[#93a69d] md:inline">
              {localeSwitcherTitle}
            </span>
            <div
              role="group"
              aria-label={localeSwitcherTitle}
              title={localeSwitcherHint}
              className="flex items-center gap-0.5 rounded-lg border border-[#0b5a45]/12 bg-[#f5f8f4] p-1">
              {contentLocales.map((item) => {
                const isActive = item === contentLocale;

                return (
                  <Link
                    key={item}
                    href={contentLocaleHref(item)}
                    data-admin-locale-link
                    scroll={false}
                    aria-current={isActive ? 'true' : undefined}
                    className={adminCx(
                      'inline-flex h-8 min-w-9 items-center justify-center rounded-md px-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b5a45]/25',
                      isActive
                        ? 'bg-[#0b5a45] text-white'
                        : 'text-[#6a7f76] hover:bg-white hover:text-[#0b3e31]',
                    )}>
                    {getContentLocaleLabel(item)}
                  </Link>
                );
              })}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 pb-14 pt-6 sm:px-6 lg:px-8 lg:pt-8">
          {children}
        </main>
      </div>
    </div>
  );
}
