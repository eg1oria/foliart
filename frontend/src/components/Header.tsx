'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';
import { useEffect, useState, useTransition } from 'react';
import { BsTelephoneInbound } from 'react-icons/bs';
import { FiChevronDown } from 'react-icons/fi';
import { RxHamburgerMenu } from 'react-icons/rx';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';
import FullscreenMenu from './FullScreenMenu';

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
  const t = useTranslations('Header');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const localeOptions: LocaleOption[] = ['ru', 'en'];

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
      href: '',
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

  const phoneBadgeClassName =
    'flex items-center justify-center rounded-full text-white transition-colors hover:bg-[#074031]/80';
  const mobileActionButtonClassName =
    'flex h-10 w-10 items-center justify-center rounded-full bg-[#074031] text-white transition-colors hover:bg-[#074031]/80 sm:h-11 sm:w-11';

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
    <Image src={'/logo-small.webp'} alt="Logo" width={201} height={200} className={className} />
  );

  const renderFullLogo = (width: number, className: string) => (
    <Image src={'/logo5.PNG'} alt="Logo" width={width} height={30} className={className} />
  );

  return (
    <>
      <header
        className="absolute top-0 left-0 z-50 flex w-full flex-col gap-6 px-8 pt-4 pb-0 sm:px-6 md:gap-12 md:px-12 md:pt-6 xl:px-90 min-[1570px]:px-70"
        style={{ backgroundColor: 'rgba(7,64,49, 0.1)' }}>
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 md:hidden">
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
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

            <div className={`${phoneBadgeClassName} p-3`} style={{ backgroundColor: '#074031' }}>
              <BsTelephoneInbound size={22} />
            </div>
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
                    onClick={() => setIsMenuOpen(true)}
                    aria-label="Open menu"
                    className="text-white text-sm hover:text-white/80 transition-colors flex items-center cursor-pointer bg-transparent border-0 p-4 px-2">
                    {item.name}
                  </button>
                ) : (
                  <>
                    <Link
                      href={item.href}
                      className={`inline-flex items-center gap-1 text-white text-sm hover:text-white/80 transition-colors py-5 px-4 ${item.children ? 'hover:bg-[#074031]' : ''}`}>
                      {typeof item.name === 'string' ? item.name.toUpperCase() : item.name}
                      {item.children && <FiChevronDown size={14} className="mt-0.5" />}
                    </Link>
                    {item.children && (
                      <ul className="absolute left-0 top-full bg-white shadow-md min-w-[180px] invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 z-50">
                        {item.children.map((child, childIdx) => (
                          <li
                            key={childIdx}
                            className="border border-b-gray-200 border-b-1 hover:border-b-gray-900">
                            <Link
                              href={child.href}
                              className="block px-4 py-4 text-gray-700 hover:bg-gray-200 text-ls transition-colors">
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
            onClick={() => setIsMenuOpen(true)}
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
              onClick={() => setIsMenuOpen(true)}
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
            <div className={`${phoneBadgeClassName} p-3`} style={{ backgroundColor: '#074031' }}>
              <BsTelephoneInbound size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen menu */}
      <FullscreenMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        catalogChildren={catalogChildren}
        calendarChildren={calendarChildren}
      />
    </>
  );
}
