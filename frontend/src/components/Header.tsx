'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState, useTransition } from 'react';
import { BsTelephoneInbound } from 'react-icons/bs';
import { FiChevronDown } from 'react-icons/fi';
import { RxHamburgerMenu } from 'react-icons/rx';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import { formatProductCount } from '@/lib/catalog';
import { useLocale, useTranslations } from 'next-intl';

const FullscreenMenu = dynamic(() => import('./FullScreenMenu'), {
  ssr: false,
});

type LocaleOption = 'ru' | 'en';

type HeaderChildItem = {
  name: string;
  href: string;
  image?: string;
  count?: number;
};

type HeaderNavItem = {
  id: string;
  name: string | ReactNode;
  href: string;
  children?: HeaderChildItem[];
};

type HeaderProps = {
  catalogChildren?: HeaderChildItem[];
  calendarChildren?: HeaderChildItem[];
};

export default function Header({ catalogChildren = [], calendarChildren = [] }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasOpenedMenu, setHasOpenedMenu] = useState(false);
  const [activeDesktopMenu, setActiveDesktopMenu] = useState<string | null>(null);
  const desktopMenuCloseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t = useTranslations('Header');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const localeOptions: LocaleOption[] = ['ru', 'en'];

  const openMenu = () => {
    setHasOpenedMenu(true);
    setIsMenuOpen(true);
  };

  const clearDesktopMenuClose = () => {
    if (desktopMenuCloseTimeout.current) {
      clearTimeout(desktopMenuCloseTimeout.current);
      desktopMenuCloseTimeout.current = null;
    }
  };

  const scheduleDesktopMenuClose = () => {
    clearDesktopMenuClose();
    desktopMenuCloseTimeout.current = setTimeout(() => {
      setActiveDesktopMenu(null);
      desktopMenuCloseTimeout.current = null;
    }, 90);
  };

  const changeLocale = (nextLocale: LocaleOption) => {
    if (nextLocale === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale, scroll: false });
    });
  };

  const navItems: HeaderNavItem[] = [
    {
      id: 'menu',
      name: <RxHamburgerMenu size={26} color="white" />,
      href: '#',
    },
    {
      id: 'home',
      name: t('home'),
      href: '/',
    },
    {
      id: 'catalog',
      name: t('catalog'),
      href: '/catalog',
      children: catalogChildren.length > 0 ? catalogChildren : undefined,
    },
    {
      id: 'about',
      name: t('about'),
      href: '/about',
      children: [{ name: t('partners'), href: '/about/partnery' }],
    },
    {
      id: 'articles',
      name: t('articles'),
      href: '/articles',
    },
    {
      id: 'calendar',
      name: t('calendar'),
      href: '/calendar',
      children: calendarChildren.length > 0 ? calendarChildren : undefined,
    },
    {
      id: 'contacts',
      name: t('contacts'),
      href: '/contacts',
    },
  ];

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 100) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    handleScroll();

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    return () => {
      if (desktopMenuCloseTimeout.current) {
        clearTimeout(desktopMenuCloseTimeout.current);
      }
    };
  }, []);

  const phoneBadgeClassName =
    'flex items-center justify-center rounded-full text-white transition-colors hover:bg-[#074031]/80';
  const mobileActionButtonClassName =
    'flex h-10 w-10 items-center justify-center rounded-full bg-[#074031] text-white transition-colors hover:bg-[#074031]/80 sm:h-11 sm:w-11';
  const hasCatalogMegaMenu = catalogChildren.length > 0;

  const renderDesktopLocaleSwitcher = () => (
    <div className="relative group z-[100] cursor-pointer">
      <div className="flex flex-row items-center gap-1 p-2 text-[15px] text-white/85 uppercase transition-colors hover:text-white">
        {locale}
        <FiChevronDown size={14} className="mt-0.5" />
      </div>
      <ul className="absolute left-1/2 top-full z-[100] mt-0 min-w-[70px] -translate-x-1/2 rounded-sm border border-gray-100 bg-white opacity-0 shadow-xl invisible transition-all duration-200 group-hover:visible group-hover:opacity-100">
        {localeOptions.map((localeOption, index) => (
          <li
            key={localeOption}
            className={`${index === 0 ? 'border-b border-gray-200' : ''} transition-colors hover:bg-gray-100`}>
            <button
              type="button"
              onClick={() => changeLocale(localeOption)}
              disabled={isPending}
              className={`block w-full cursor-pointer px-4 py-2 text-center text-sm ${
                locale === localeOption ? 'font-bold text-[#074031]' : 'text-gray-700'
              }`}>
              {localeOption.toUpperCase()}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  const renderMobileLocaleSwitcher = () => (
    <div className="flex items-center rounded-sm border border-white/20 p-1">
      {localeOptions.map((localeOption) => {
        const isActive = locale === localeOption;

        return (
          <button
            key={localeOption}
            type="button"
            onClick={() => changeLocale(localeOption)}
            disabled={isPending}
            aria-pressed={isActive}
            className={`rounded-sm px-2 py-1 text-[10px] font-semibold uppercase transition-colors sm:px-3 sm:text-xs ${
              isActive ? 'bg-white text-[#074031]' : 'text-white/75 hover:text-white'
            }`}>
            {localeOption.toUpperCase()}
          </button>
        );
      })}
    </div>
  );

  const renderCompactLogo = (className: string) => (
    <Link href="/" aria-label={t('home')} className={`block ${className}`}>
      <Image
        src={'/logo-small.webp'}
        alt="Foliart logo"
        width={201}
        height={200}
        className="h-auto w-full"
      />
    </Link>
  );

  const renderFullLogo = (width: number, className: string) => (
    <Link href="/" aria-label={t('home')} className={className}>
      <Image src={'/logo5.PNG'} alt="Foliart logo" width={width} height={30} className="h-auto w-full" />
    </Link>
  );

  return (
    <>
      <header
        className="absolute top-0 left-0 z-50 flex w-full flex-col gap-6 px-8 pt-4 pb-0 sm:px-6 md:gap-12 md:px-12 md:pt-6 xl:px-90 min-[1570px]:px-70"
        style={{ backgroundColor: 'rgba(7,64,49, 0.1)' }}>
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 md:hidden">
          <button
            type="button"
            onClick={openMenu}
            aria-label="Open menu"
            className={mobileActionButtonClassName}>
            <RxHamburgerMenu size={20} />
          </button>

          {renderCompactLogo('h-auto w-11 justify-self-center sm:w-12')}

          <div className="flex items-center justify-end">{renderMobileLocaleSwitcher()}</div>
        </div>

        <div className="hidden items-center justify-between md:flex">
          {renderCompactLogo('h-auto w-14 lg:hidden')}
          {renderFullLogo(135, 'hidden h-auto lg:block lg:w-[135px]')}
          <div className="flex items-center gap-9">
            {renderDesktopLocaleSwitcher()}

            <Link
              href="/contacts"
              aria-label={t('contacts')}
              className={`${phoneBadgeClassName} p-3`}
              style={{ backgroundColor: '#074031' }}>
              <BsTelephoneInbound size={22} />
            </Link>
          </div>
        </div>

        <nav className="hidden border-b-3 border-white/20 md:block">
          <ul className="flex items-center justify-between mt-4 md:mt-0 hidden md:flex">
            {navItems.map((item, idx) => (
              <li
                key={idx}
                className={`relative group border-b-4 border-transparent -mb-1 ${
                  typeof item.name === 'string' ? 'hover:border-[#074031]' : ''
                } ${item.id === 'contacts' ? 'max-[1450px]:hidden' : ''} ${
                  item.id === 'calendar' ? 'max-[1050px]:hidden' : ''
                } transition-colors`}>
                {item.href === '#' ? (
                  <button
                    type="button"
                    onClick={openMenu}
                    aria-label="Open menu"
                    className="text-white text-sm hover:text-white/80 transition-colors flex items-center cursor-pointer bg-transparent border-0 p-4 px-2">
                    {item.name}
                  </button>
                ) : (
                  <>
                    <Link
                      href={item.href}
                      onMouseEnter={() => {
                        clearDesktopMenuClose();
                        setActiveDesktopMenu(
                          item.id === 'catalog' && hasCatalogMegaMenu ? item.id : null,
                        );
                      }}
                      onFocus={() => {
                        clearDesktopMenuClose();
                        setActiveDesktopMenu(
                          item.id === 'catalog' && hasCatalogMegaMenu ? item.id : null,
                        );
                      }}
                      onMouseLeave={() => {
                        if (item.id === 'catalog') {
                          scheduleDesktopMenuClose();
                        }
                      }}
                      onBlur={() => {
                        if (item.id === 'catalog') {
                          setActiveDesktopMenu(null);
                        }
                      }}
                      className={`inline-flex items-center gap-1 text-white text-sm hover:text-white/80 transition-colors py-5 px-4 ${
                        item.children ? 'hover:bg-[#074031]' : ''
                      } ${activeDesktopMenu === item.id ? 'bg-[#074031]' : ''}`}>
                      {typeof item.name === 'string' ? item.name.toUpperCase() : item.name}
                      {item.children && <FiChevronDown size={14} className="mt-0.5" />}
                    </Link>
                    {item.children && item.id !== 'catalog' && (
                      <ul className="absolute left-0 top-full bg-white shadow-md min-w-[180px] invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 z-50">
                        {item.children.map((child, childIdx) => (
                          <li
                            key={childIdx}
                            className="border-b border-gray-200 bg-white transition-colors hover:border-black last:border-b-0">
                            <Link
                              href={child.href}
                              className="block px-4 py-4 text-gray-700 bg-white text-ls transition-colors hover:text-[#074031]">
                              {child.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {hasCatalogMegaMenu && (
          <div
            onMouseEnter={() => {
              clearDesktopMenuClose();
              setActiveDesktopMenu('catalog');
            }}
            onMouseLeave={scheduleDesktopMenuClose}
            className={`absolute left-0 top-full z-40 hidden w-full bg-white shadow-[0_18px_34px_-24px_rgba(0,0,0,0.45)] transition-all duration-200 md:block ${
              activeDesktopMenu === 'catalog'
                ? 'visible translate-y-0 opacity-100'
                : 'invisible -translate-y-1 opacity-0'
            }`}>
            <div className="header-catalog py-10 pb-12">
              <div className="grid gap-x-10 gap-y-7 md:grid-cols-2 lg:grid-cols-4 xl:gap-x-16">
                {catalogChildren.map((item) => (
                  <Link
                    key={`${item.href}-${item.name}`}
                    href={item.href}
                    onClick={() => setActiveDesktopMenu(null)}
                    className="group flex items-start gap-5">
                    <div className="relative h-18 w-18 flex-shrink-0 overflow-hidden rounded-full bg-[#eef3ef] shadow-[0_10px_24px_-18px_rgba(0,0,0,0.8)]">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="72px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.85),rgba(120,154,135,0.95))]" />
                      )}
                    </div>
                    <div className="max-w-[15rem]">
                      <p className="text-lg leading-6 text-[#111] transition-colors group-hover:text-[#4685d4]">
                        {item.name}
                      </p>
                      {item.count !== undefined && (
                        <p className="mt-1.5 text-sm text-[#8b8b8b]">
                          {formatProductCount(item.count, locale)}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Sticky header on scroll */}
      <div
        className={`fixed top-0 left-0 z-50 w-full px-4 py-3 transition-all duration-300 sm:px-6 md:px-8 md:py-2 xl:px-90 ${
          isScrolled ? 'translate-y-0 opacity-100 visible' : '-translate-y-full opacity-0 invisible'
        }`}
        style={{
          backgroundColor: '#4d4d4de7',
        }}>
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 md:hidden">
          <button
            type="button"
            onClick={openMenu}
            aria-label="Open menu"
            className={mobileActionButtonClassName}>
            <RxHamburgerMenu size={20} />
          </button>
          {renderCompactLogo('h-auto w-11 justify-self-center sm:w-12')}
          <div className="flex items-center justify-end">{renderMobileLocaleSwitcher()}</div>
        </div>

        <div className="hidden items-center justify-between md:flex">
          <div className="flex items-center gap-9">
            <button
              type="button"
              onClick={openMenu}
              aria-label="Open menu"
              className={`${phoneBadgeClassName} p-3`}
              style={{ backgroundColor: '#074031' }}>
              <RxHamburgerMenu size={22} />
            </button>

            {renderCompactLogo('h-auto w-12 lg:hidden')}
            {renderFullLogo(110, 'hidden h-auto lg:block lg:w-[110px]')}
          </div>

          <div className="flex items-center gap-9">
            {renderDesktopLocaleSwitcher()}
            <Link
              href="/contacts"
              aria-label={t('contacts')}
              className={`${phoneBadgeClassName} p-3`}
              style={{ backgroundColor: '#074031' }}>
              <BsTelephoneInbound size={22} />
            </Link>
          </div>
        </div>
      </div>

      {/* Fullscreen menu */}
      {hasOpenedMenu ? (
        <FullscreenMenu
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          catalogChildren={catalogChildren}
          calendarChildren={calendarChildren}
        />
      ) : null}
    </>
  );
}
